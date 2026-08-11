import React, { useState, useEffect } from "react";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";
import { downloadDocumentPdf } from "../utils/downloadDocument";

interface MessageRecord {
  id: string;
  phoneNumber: string;
  messageText: string;
  status: string; // PENDENTE, ENVIADO, ENTREGUE, LIDO, FALHOU
  errorDetail: string | null;
  createdAt: string;
}

interface OSWhatsAppPanelProps {
  orderId: string;
  clientPhone: string;
  clientName: string;
  osNumber: string;
  deviceModel: string;
  deviceBrand: string;
  totalCost: number;
  onPrintPDF?: () => void;
}

export default function OSWhatsAppPanel({
  orderId,
  clientPhone,
  clientName,
  osNumber,
  deviceModel,
  deviceBrand,
  totalCost,
  onPrintPDF
}: OSWhatsAppPanelProps) {
  const [history, setHistory] = useState<MessageRecord[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Guarda de alterações não salvas (composição de mensagem WhatsApp)
  useUnsavedChangesGuard(messageText.trim() !== "");
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchHistory = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const token = localStorage.getItem("mgv_token");
      const res = await fetch(`/api/whatsapp/history/${orderId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setHistory(await res.json());
      } else {
        setErrorMsg("Falha ao carregar histórico de mensagens.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro de comunicação ao buscar histórico.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [orderId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    setIsSending(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("mgv_token");
      const res = await fetch("/api/whatsapp/send-manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ orderId, messageText: messageText.trim() })
      });

      if (res.ok) {
        setMessageText("");
        setSuccessMsg("Mensagem agendada para envio com sucesso!");
        setTimeout(() => setSuccessMsg(""), 3000);
        // Recarrega o histórico após 2 segundos para dar tempo do simulador assíncrono rodar e atualizar o status
        setTimeout(fetchHistory, 2000);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Falha ao enviar mensagem manual.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro de comunicação ao enviar WhatsApp.");
    } finally {
      setIsSending(false);
    }
  };

  // Templates rápidos para preenchimento ágil no frontend
  const loadTemplate = (templateKey: string) => {
    const firstName = clientName.split(" ")[0];
    const formattedTotal = totalCost.toFixed(2).replace(".", ",");
    const linkPortal = `http://192.168.15.18:3000/acompanhar?numero=${osNumber}&cpfCnpj=CPF_DO_CLIENTE`; 

    const templates: Record<string, string> = {
      orcamento: `Olá, ${firstName}! O orçamento para a manutenção do seu equipamento ${deviceModel} está pronto. O valor total é de R$ ${formattedTotal}. Acesse para aprovar online: ${linkPortal}`,
      aguardando_peca: `Olá, ${firstName}! A Ordem de Serviço ${osNumber} do seu equipamento ${deviceModel} foi atualizada para: Aguardando Peças de Reposição.`,
      em_manutencao: `Olá, ${firstName}! Informamos que o reparo do seu equipamento ${deviceModel} (OS ${osNumber}) foi iniciado pelo nosso laboratório técnico.`,
      retirada: `Olá, ${firstName}! Ótimas notícias! O seu equipamento ${deviceModel} (OS ${osNumber}) está pronto para retirada. Aguardamos você em nossa oficina!`,
      finalizado: `Olá, ${firstName}! A Ordem de Serviço ${osNumber} do seu equipamento ${deviceModel} foi faturada e concluída com sucesso. Obrigado pela preferência!`
    };

    if (templates[templateKey]) {
      setMessageText(templates[templateKey]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDENTE":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "ENVIADO":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "FALHOU":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-slate-150 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-5 anim-fadein text-xs">
      <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-4 shadow-sm">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center space-x-1.5">
          <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">chat</span>
          <span>Notificações e Comunicação com o Cliente</span>
        </h4>

        {errorMsg && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg text-[11px] text-red-700 font-semibold border border-red-200/30">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-lg text-[11px] text-emerald-700 font-semibold border border-emerald-200/30">
            {successMsg}
          </div>
        )}

        {/* Templates rápidos */}
        <div>
          <span className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Carregar Template Rápido:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => loadTemplate("orcamento")}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold border border-slate-200 transition active:scale-95"
            >
              Orçamento Pronto
            </button>
            <button
              type="button"
              onClick={() => loadTemplate("aguardando_peca")}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold border border-slate-200 transition active:scale-95"
            >
              Aguardando Peça
            </button>
            <button
              type="button"
              onClick={() => loadTemplate("em_manutencao")}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold border border-slate-200 transition active:scale-95"
            >
              Iniciar Reparo
            </button>
            <button
              type="button"
              onClick={() => loadTemplate("retirada")}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold border border-slate-200 transition active:scale-95"
            >
              Pronto para Retirada
            </button>
            <button
              type="button"
              onClick={() => loadTemplate("finalizado")}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold border border-slate-200 transition active:scale-95"
            >
              OS Concluída
            </button>
          </div>
        </div>

        {/* Orçamento em PDF */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Documento de Orçamento em PDF</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Salve e envie manualmente o arquivo PDF detalhado do orçamento para o cliente.</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              // PDF real gerado no servidor (orcamento); fallback para o fluxo de impressão existente.
              const ok = await downloadDocumentPdf(
                "orcamento",
                orderId,
                `${clientName} - ${osNumber} - Orçamento`,
                new Date().toISOString()
              );
              if (!ok) {
                if (onPrintPDF) onPrintPDF();
                else window.print();
              }
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg transition shrink-0 flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
            Salvar Orçamento em PDF
          </button>
        </div>

        {/* Campo de envio */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
            Mensagem personalizada para WhatsApp (Destinatário: {clientPhone})
          </label>
          <div className="flex gap-2">
            <textarea
              rows={3}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Digite a mensagem para o cliente..."
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 focus:outline-none transition"
            />
            <button
              type="button"
              disabled={isSending || !messageText.trim()}
              onClick={handleSend}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider px-4 rounded-lg transition shrink-0 flex items-center justify-center gap-1 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
              Enviar
            </button>
          </div>
        </div>

        {/* Histórico */}
        <div>
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Histórico de Comunicações da OS</span>
            <button
              type="button"
              onClick={fetchHistory}
              className="text-[10px] text-indigo-650 hover:underline flex items-center gap-0.5"
            >
              <span className="material-symbols-outlined text-[12px]">refresh</span> Atualizar
            </button>
          </div>

          {isLoading ? (
            <p className="text-slate-400 italic text-center py-4">Carregando histórico de mensagens...</p>
          ) : history.length === 0 ? (
            <p className="text-slate-400 italic text-center py-4">Nenhuma mensagem enviada para esta OS.</p>
          ) : (
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {history.map((record) => (
                <div key={record.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-slate-450">
                    <span className="font-mono">{new Date(record.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
                    <span className={`px-2 py-0.5 font-bold rounded-full border ${getStatusBadge(record.status)}`}>
                      {record.status}
                    </span>
                  </div>
                  <p className="text-slate-800 whitespace-pre-wrap mt-1 leading-relaxed bg-white/40 p-2.5 rounded-lg border border-slate-100">
                    {record.messageText}
                  </p>
                  {record.errorDetail && (
                    <p className="text-[10px] text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded-lg font-mono">
                      <strong>Erro:</strong> {record.errorDetail}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
