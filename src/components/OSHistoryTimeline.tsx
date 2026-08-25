import React, { useState, useEffect } from "react";
import { OSHistoryItem, UserRole } from "../types";

interface OSHistoryTimelineProps {
  orderId: string;
  osNumber: string;
  userRole?: UserRole | string;
}

export const OSHistoryTimeline: React.FC<OSHistoryTimelineProps> = ({
  orderId,
  osNumber,
  userRole
}) => {
  const [history, setHistory] = useState<OSHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch(`/api/ordens-servico/${orderId}/history`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error("Erro ao carregar linha do tempo da OS.");
      }
      const data = await res.json();
      setHistory(data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Não foi possível carregar o histórico.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchHistory();
    }
  }, [orderId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch(`/api/ordens-servico/${orderId}/history/note`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ note: newNote.trim() })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao adicionar observação.");
      }

      const updatedHistory = await res.json();
      setHistory(updatedHistory);
      setNewNote("");
    } catch (err: any) {
      alert(err.message || "Erro ao salvar observação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case "CREATED":
        return {
          icon: "add_circle",
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          label: "Abertura da OS"
        };
      case "STATUS_CHANGE":
        return {
          icon: "sync_alt",
          bg: "bg-purple-50 text-purple-700 border-purple-200",
          label: "Movimentação de Fase"
        };
      case "TECHNICIAN_ASSIGNED":
        return {
          icon: "engineering",
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          label: "Técnico Responsável"
        };
      case "DIAGNOSTIC_UPDATED":
        return {
          icon: "description",
          bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
          label: "Diagnóstico Técnico"
        };
      case "PARTS_UPDATED":
        return {
          icon: "handyman",
          bg: "bg-teal-50 text-teal-700 border-teal-200",
          label: "Peças & Serviços"
        };
      case "NOTE_ADDED":
        return {
          icon: "sticky_note_2",
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          label: "Nota Interna"
        };
      case "STRESS_TEST_STARTED":
        return {
          icon: "timer",
          bg: "bg-cyan-50 text-cyan-700 border-cyan-200",
          label: "Teste de Estresse"
        };
      case "CLOSED":
        return {
          icon: "check_circle",
          bg: "bg-emerald-100 text-emerald-800 border-emerald-300",
          label: "Encerramento"
        };
      default:
        return {
          icon: "history",
          bg: "bg-slate-50 text-slate-700 border-slate-200",
          label: "Ação Registrada"
        };
    }
  };

  const formatDateTime = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="space-y-6">
      {/* Campo de Adição de Nota / Observação Interna */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleAddNote} className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-indigo-600">rate_review</span>
              Adicionar Nota / Observação de Bancada
            </label>
            <span className="text-[10px] text-slate-400 font-semibold">
              Visível apenas internamente para a equipe
            </span>
          </div>

          <textarea
            rows={2}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Digite uma observação de andamento (ex: Placa encaminhada para limpeza ultrassônica, aguardando resposta de orçamento pelo WhatsApp...)"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition resize-y"
          />

          <div className="flex justify-between items-center pt-1">
            <button
              type="button"
              onClick={fetchHistory}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition"
              title="Atualizar histórico"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Atualizar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !newNote.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
              {isSubmitting ? "Gravando..." : "Gravar Nota"}
            </button>
          </div>
        </form>
      </div>

      {/* Lista / Timeline de Eventos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-slate-500">timeline</span>
            Linha do Tempo de Movimentações ({history.length})
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">
            {osNumber}
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <span className="material-symbols-outlined text-3xl animate-spin text-indigo-500">sync</span>
            <p className="text-xs font-medium">Carregando histórico da OS...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchHistory}
              className="underline font-bold hover:text-red-900"
            >
              Tentar novamente
            </button>
          </div>
        ) : history.length === 0 ? (
          <div className="py-12 bg-white rounded-2xl border border-dashed border-slate-250 flex flex-col items-center justify-center text-center p-6 space-y-2">
            <span className="material-symbols-outlined text-4xl text-slate-300">history_edu</span>
            <p className="text-xs font-bold text-slate-600">Nenhum evento registrado ainda</p>
            <p className="text-[11px] text-slate-400 max-w-sm">
              As alterações de status, atribuição de técnico e observações adicionadas aparecerão aqui em ordem cronológica.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {history.map((item) => {
              const badge = getActionBadge(item.actionType);
              return (
                <div key={item.id} className="relative group">
                  {/* Ponto / Ícone da Timeline */}
                  <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center shadow-xs">
                    <div className="w-2 h-2 rounded-full bg-indigo-600" />
                  </div>

                  {/* Card do Evento */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition duration-150 space-y-2 select-text">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.bg}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {badge.icon}
                          </span>
                          {badge.label}
                        </span>

                        <span className="text-[11px] font-bold text-slate-800">
                          {item.userName || "Sistema"}
                        </span>

                        {item.userRole && (
                          <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {item.userRole}
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                        {formatDateTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OSHistoryTimeline;
