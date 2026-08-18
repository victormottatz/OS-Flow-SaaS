/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";

import DocumentShell from "./DocumentShell";
import { resolveTemplateForOS, DOCUMENT_TEMPLATES, DocumentTemplate } from "../config/documents.config";
import { usePrintDocument } from "../hooks/usePrintDocument";
import { downloadDocumentPdf } from "../utils/downloadDocument";

const DEFAULT_ENTRADA_CHECKLIST: ChecklistItem[] = [
  { id: "tela", label: "Tela / Display", status: "NA", observacao: "" },
  { id: "teclado", label: "Touchscreen / Teclado", status: "NA", observacao: "" },
  { id: "camera", label: "Câmera(s)", status: "NA", observacao: "" },
  { id: "botoes", label: "Botões físicos (ligar, volume)", status: "NA", observacao: "" },
  { id: "porta_carga", label: "Porta de carregamento", status: "NA", observacao: "" },
  { id: "carcaca", label: "Carcaça / Tampa traseira", status: "NA", observacao: "" },
  { id: "bateria", label: "Bateria / Nível de carga", status: "NA", observacao: "" },
  { id: "carregador", label: "Adaptador / Carregador entregue", status: "NA", observacao: "" },
  { id: "umidade", label: "Alta umidade / Corrosão", status: "NA", observacao: "" },
  { id: "queda", label: "Sinais de queda ou impacto", status: "NA", observacao: "" },
  { id: "temperatura", label: "Temperatura anormal", status: "NA", observacao: "" },
  { id: "acessorios_extra", label: "Acessórios entregues junto", status: "NA", observacao: "" },
  { id: "garantia", label: "Selo de garantia intacto", status: "NA", observacao: "" }
];

// Baseline dos campos semeados do modal de edição de OS: a guarda de alterações
// não salvas só dispara quando o usuário realmente muda algo em relação ao que
// foi carregado (evita falso positivo ao apenas abrir o modal).
const captureEditBaseline = (src: any, saidaDefault: ChecklistItem[]) =>
  JSON.stringify({
    diagnostic: src.diagnostic || "",
    laudoMacro: src.laudoMacro || "",
    discount: src.discount || 0,
    parts: (src.usedParts || []).map((p: any) => `${p.partId || p.id}:${p.quantity}`),
    checklist: (src.checklistEntrada?.length ? src.checklistEntrada : DEFAULT_ENTRADA_CHECKLIST).map(
      (i: ChecklistItem) => `${i.id}:${i.status}:${i.observacao || ""}`
    ),
    photos: (src.laudoFotos || []).length,
    saida: (src.checklistSaida?.length ? src.checklistSaida : saidaDefault).map(
      (i: ChecklistItem) => `${i.id}:${i.status}:${i.observacao || ""}`
    )
  });
import { useFeatureFlags } from "../contexts/FeatureFlagContext";
import { OrdemServico, OSStatus, Part, UsedPart, UserRole, Client, Device, ChecklistItem, EntradaFoto, AvulsoCategory } from "../types";
import OSWhatsAppPanel from "./OSWhatsAppPanel";
import TagSelector from "./TagSelector";
import { matchOS, SearchScope } from "../utils/searchUtils";
import { validateFiscalData } from "../services/nfeService";


interface KanbanBoardProps {
  ordensServico: OrdemServico[];
  parts: Part[];
  userRole: UserRole;
  isOffline: boolean;
  onRefresh: () => void;
  onNavigateToBlingPanel: () => void;
  limit: number | "all";
  onLimitChange: (limit: number | "all") => void;
  countsByStatus: Record<string, number>;
}

const TECNICO_COLUMNS: { id: OSStatus; name: string; color: string; desc: string }[] = [
  { id: "AGUARDANDO_AVALIACAO", name: "Aguardando Avaliação", color: "border-t-slate-400 bg-slate-500/10", desc: "Equipamento em triagem inicial" },
  { id: "AGUARDANDO_AUTORIZACAO", name: "Aguardando Autorização", color: "border-t-blue-500 bg-blue-50/10", desc: "Orçamento pronto p/ aprovação" },
  { id: "AGUARDANDO_PECA", name: "Aguardando Peça", color: "border-t-amber-500 bg-amber-50/10", desc: "Fora de estoque local" },
  { id: "EM_MANUTENCAO", name: "Em Manutenção", color: "border-t-purple-500 bg-purple-50/10", desc: "Conserto ativo na bancada" },
];

const RECEPCAO_COLUMNS: { id: OSStatus; name: string; color: string; desc: string }[] = [
  { id: "PRONTO_RETIRADA", name: "Pronto p/ Retirada", color: "border-t-teal-500 bg-teal-50/10", desc: "Reparo efetuado" },
  { id: "PAGO_PRONTO_RETIRADA", name: "Pago Pronto p/ Retirada", color: "border-t-cyan-500 bg-cyan-50/10", desc: "Pago e pronto para busca" },
  { id: "FINALIZADO", name: "Entregue / Finalizado", color: "border-t-emerald-500 bg-emerald-50/10", desc: "Equipamento já entregue" },
];

const getOSCardBorders = (status: OSStatus) => {
  switch (status) {
    case "AGUARDANDO_AVALIACAO": return "border-l-4 border-l-slate-400";
    case "AGUARDANDO_AUTORIZACAO": return "border-l-4 border-l-blue-500";
    case "AGUARDANDO_PECA": return "border-l-4 border-l-amber-500";
    case "EM_MANUTENCAO": return "border-l-4 border-l-purple-500";
    case "PRONTO_RETIRADA": return "border-l-4 border-l-teal-500";
    case "PAGO_PRONTO_RETIRADA": return "border-l-4 border-l-cyan-500";
    case "FINALIZADO": return "border-l-4 border-l-emerald-500";
    default: return "border-l-4 border-l-slate-400";
  }
};

const KanbanCard = React.memo(({
  os,
  hasRecurrence,
  onDragStart,
  onDragEnd,
  onClick,
  isSelectMode,
  isSelected,
  onSelectToggle
}: {
  os: OrdemServico;
  hasRecurrence?: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onClick: (os: OrdemServico) => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onSelectToggle?: (e: React.MouseEvent, id: string) => void;
}) => {
  const total = os.totalCost !== undefined && os.totalCost !== null && os.totalCost > 0
    ? os.totalCost
    : Math.max(0, (os.usedParts?.filter(i => i.category !== "SERVICO").reduce((s, i) => s + (i.price * i.quantity), 0) || 0) + (os.laborCost || 0) - (os.discount || 0));

  // Calcular status do teste de estresse
  const getStressTestBadge = () => {
    if (!os.stressTestStartedAt) return null;
    const limit = (import.meta as any).env.DEV ? 10 * 1000 : 30 * 60 * 1000;
    const elapsed = Date.now() - new Date(os.stressTestStartedAt).getTime();
    const isFinished = elapsed >= limit;
    if (isFinished) {
      return (
        <span className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded-lg flex items-center font-bold gap-0.5 shadow-xs">
          <span className="material-symbols-outlined text-[11px]">check_circle</span> Estresse OK
        </span>
      );
    } else {
      return (
        <span className="text-[9px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded-lg flex items-center font-bold gap-0.5 animate-pulse shadow-xs">
          <span className="material-symbols-outlined text-[11px] animate-spin">sync</span> Sob Estresse
        </span>
      );
    }
  };

  const stressBadge = getStressTestBadge();

  return (
    <div 
      draggable={!isSelectMode} 
      onDragStart={(e) => onDragStart(e, os.id)} 
      onDragEnd={onDragEnd}
      onClick={(e) => {
        if (isSelectMode) {
          e.stopPropagation();
          onSelectToggle?.(e, os.id);
        } else {
          onClick(os);
        }
      }} 
      className={`bg-white rounded-2xl border p-3.5 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.01] flex flex-col space-y-2 select-text ${
        isSelected ? "border-l-4 border-rose-500 bg-rose-50/5 ring-2 ring-rose-500/20" : getOSCardBorders(os.status)
      }`}
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-100 pb-1.5">
        <div className="flex items-center gap-1.5">
          {isSelectMode && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              onClick={(e) => e.stopPropagation()}
              className="w-3.5 h-3.5 rounded border-slate-350 text-rose-600 focus:ring-rose-500 cursor-pointer"
            />
          )}
          <span className="text-[9px] font-bold font-mono text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md shadow-xs">
            {os.osNumber}
          </span>
          {os.tags && os.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {os.tags.map((tag: any) => (
                <span 
                  key={tag.id} 
                  className="text-[8px] font-bold px-1 py-0.5 rounded-md shadow-sm border text-white"
                  style={{ backgroundColor: tag.colorHex, borderColor: tag.colorHex }}
                  title={`Etiqueta: ${tag.name}`}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {stressBadge}
          {hasRecurrence && (
            <span 
              className="text-[8px] bg-rose-50 border border-rose-200 text-rose-700 px-1 py-0.5 rounded-lg flex items-center font-bold gap-0.5 shadow-xs" 
              title={os.recurrentAlert ? `Alerta de Falha Crônica: Retornou ${os.recurrentAlert.count} vezes em 90 dias (${os.recurrentAlert.previousOsNumbers.join(", ")})` : "Recorrência: > 2 OS em 90 dias"}
            >
              <span className="material-symbols-outlined text-[10px]">warning</span> Recorrente
            </span>
          )}
          {[13, 16, 18, 23].includes(os.statusCode) && (
            <span className="text-[8px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-1 py-0.5 rounded-lg flex items-center font-bold gap-0.5 shadow-xs">
              <span className="material-symbols-outlined text-[10px]">verified_user</span> Garantia
            </span>
          )}
          {os.warrantyNotice && (
            <span
              className="text-[8px] bg-teal-50 border border-teal-200 text-teal-700 px-1 py-0.5 rounded-lg flex items-center font-bold gap-0.5 shadow-xs"
              title={`Em garantia de 90 dias: OS #${os.warrantyNotice.osNumber} — sai em ${new Date(os.warrantyNotice.originalExitDate).toLocaleDateString("pt-BR")}, vence em ${new Date(os.warrantyNotice.warrantyExpiresAt).toLocaleDateString("pt-BR")}`}
            >
              <span className="material-symbols-outlined text-[10px]">verified</span> Garantia 90d
            </span>
          )}
          {[15, 17].includes(os.statusCode) && (
            <span className="text-[8px] bg-amber-50 border border-amber-200 text-amber-700 px-1 py-0.5 rounded-lg flex items-center font-bold gap-0.5 shadow-xs animate-pulse">
              <span className="material-symbols-outlined text-[10px]">payments</span> Pago Pendente
            </span>
          )}
          {os.statusCode === 9 && (
            <span className="text-[8px] bg-slate-100 border border-slate-350 text-slate-700 px-1 py-0.5 rounded-lg flex items-center font-bold gap-0.5 shadow-xs">
              <span className="material-symbols-outlined text-[10px]">cancel</span> Sem Conserto
            </span>
          )}
          {os.statusCode === 25 && (
            <span className="text-[8px] bg-blue-50 border border-blue-200 text-blue-700 px-1 py-0.5 rounded-lg flex items-center font-bold gap-0.5 shadow-xs">
              <span className="material-symbols-outlined text-[10px]">fact_check</span> Conferência
            </span>
          )}
        </div>
      </div>

      {/* Client Section */}
      <div className="flex justify-between items-center gap-2">
        <h4 className="font-extrabold text-slate-900 text-xs truncate">
          {(os as any).client?.name}
        </h4>
        <p className="text-[9px] text-slate-400 font-mono shrink-0">
          {(os as any).client?.phone || "S/ Tel"}
        </p>
      </div>

      {/* Equipment Section */}
      <div className="bg-slate-50/50 p-1.5 rounded-xl border border-slate-150 text-[10px] space-y-0.5">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[12px] text-slate-400">devices</span>
          <span className="font-bold text-slate-800 truncate">
            {(os as any).device?.type} {(os as any).device?.brand} - {(os as any).device?.model}
          </span>
        </div>
        <div className="pl-4 text-[9px] text-slate-500 font-mono flex items-center justify-between">
          <span>Série: <strong className="bg-slate-150/70 px-1 py-0.2 rounded">{(os as any).device?.serialNumber || "Sem Série"}</strong></span>
        </div>
        
        {/* Nova Visualização do benchLocation para a Recepção e Técnicos */}
        {(os as any).benchLocation && (
          <div className="pl-4 mt-1.5 pt-1.5 border-t border-slate-200/60 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[11px] text-rose-500 shrink-0">pin_drop</span>
            <span className="font-extrabold text-[10px] text-rose-700 uppercase tracking-widest break-words leading-tight">
              LOCAL: {(os as any).benchLocation}
            </span>
          </div>
        )}
      </div>

      {/* Symptom/Defect Section */}
      {os.reportedDefect && (
        <div className="text-[9px] text-slate-650 bg-slate-50/30 px-2 py-1 border border-slate-150/50 rounded-lg italic font-semibold line-clamp-1 leading-relaxed">
          Defeito: "{os.reportedDefect}"
        </div>
      )}

      {/* Technical Diagnosis Section */}
      {os.diagnostic && (
        <div className="text-[9px] text-indigo-750 bg-indigo-50/20 px-2 py-1 border border-indigo-100/50 rounded-lg italic font-mono font-bold line-clamp-1 leading-relaxed">
          Laudo: {os.diagnostic}
        </div>
      )}

      {/* Footer Row */}
      <div className="border-t border-slate-150 pt-2 flex justify-between items-center text-[9px]">
        <div className="flex items-center gap-1 text-slate-400 font-semibold">
          <span className="material-symbols-outlined text-[11px]">calendar_today</span>
          <span>{new Date(os.createdAt).toLocaleDateString()}</span>
        </div>
        <span className="text-slate-900 font-extrabold text-[11px] bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 shadow-xs">
          R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}, (prevProps, nextProps) => 
  prevProps.os === nextProps.os && 
  prevProps.hasRecurrence === nextProps.hasRecurrence && 
  prevProps.isSelectMode === nextProps.isSelectMode && 
  prevProps.isSelected === nextProps.isSelected
);

// Componente auxiliar para o timer do teste de estresse
interface StressTestWidgetProps {
  os: OrdemServico;
  onStartStress: () => Promise<void>;
}

const StressTestWidget: React.FC<StressTestWidgetProps> = ({ os, onStartStress }) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!os.stressTestStartedAt) {
      setTimeLeft(null);
      return;
    }

    const limit = ((import.meta as any).env.DEV)
      ? 10 * 1000       // 10s em desenvolvimento
      : 30 * 60 * 1000; // 30min em produção

    const calculateTimeLeft = () => {
      const startedTime = new Date(os.stressTestStartedAt!).getTime();
      const elapsed = Date.now() - startedTime;
      const remaining = limit - elapsed;
      return remaining > 0 ? remaining : 0;
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [os.stressTestStartedAt]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await onStartStress();
    } catch (err) {
      // erro tratado no pai
    } finally {
      setIsStarting(false);
    }
  };

  if (!os.stressTestStartedAt) {
    return (
      <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 select-text transition hover:border-indigo-500/50">
        <div className="flex items-center space-x-3">
          <span className="material-symbols-outlined text-[20px] text-indigo-400 animate-pulse">timer</span>
          <div>
            <h4 className="font-bold text-xs text-white">Protocolo de Garantia e Eficácia MGV</h4>
            <p className="text-[10px] text-slate-350">É obrigatório executar o teste de estresse de 30min antes de finalizar.</p>
          </div>
        </div>
        <button
          type="button"
          disabled={isStarting}
          onClick={handleStart}
          className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-[10px] font-bold hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-900/20 active:scale-95 transition-all disabled:opacity-50 shrink-0"
        >
          {isStarting ? "Iniciando..." : "Iniciar Teste de Estresse"}
        </button>
      </div>
    );
  }

  const isFinished = timeLeft === 0;
  const startedDate = new Date(os.stressTestStartedAt!);
  const limit = ((import.meta as any).env.DEV) ? 10 * 1000 : 30 * 60 * 1000;
  const apiUrl = (import.meta as any).env.VITE_API_URL || "http://localhost:3000";
  const expectedEndDate = new Date(startedDate.getTime() + limit);

  const formatHM = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className={`p-4 rounded-xl border select-text transition ${
      isFinished 
        ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-100" 
        : "bg-indigo-950/40 border-indigo-500/30 text-indigo-100"
    }`}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-2.5">
          <div className="flex items-center space-x-3">
            <span className={`material-symbols-outlined text-[20px] ${
              isFinished ? "text-emerald-400" : "text-indigo-400 animate-spin"
            }`}>
              {isFinished ? "check_circle" : "sync"}
            </span>
            <div>
              <h4 className="font-bold text-xs text-white">
                {isFinished ? "Teste de Estresse Concluído!" : "Teste de Estresse em Execução"}
              </h4>
              <p className="text-[10px] text-slate-350">
                {isFinished 
                  ? "Conformidade de garantia atestada com sucesso." 
                  : "Equipamento sob teste de carga na bancada."}
              </p>
            </div>
          </div>
          
          <div className="font-mono text-sm font-extrabold flex items-center gap-1.5 shrink-0 bg-slate-900/80 px-3 py-1 rounded-xl border border-slate-800">
            {!isFinished && timeLeft !== null ? (
              <>
                <span className="text-[9px] text-indigo-400 uppercase font-sans tracking-wider mr-1">Faltam</span>
                <span className="text-white text-xs animate-pulse">{formatTime(timeLeft)}</span>
              </>
            ) : (
              <span className="text-emerald-400 text-xs font-sans tracking-wide uppercase">✓ Liberado</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] text-slate-300 font-semibold">
          <div>
            <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Iniciado por:</span>
            <span className="text-slate-200 font-bold">{os.stressTestStartedBy || "Técnico"}</span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Início:</span>
            <span className="text-slate-250 font-bold font-mono">{formatHM(startedDate)}</span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Término Previsto:</span>
            <span className="text-slate-250 font-bold font-mono">{formatHM(expectedEndDate)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function KanbanBoard({ 
  ordensServico, 
  parts, 
  userRole, 
  isOffline, 
  onRefresh,
  onNavigateToBlingPanel,
  limit,
  onLimitChange,
  countsByStatus
}: KanbanBoardProps) {
  console.log("[KanbanBoard] countsByStatus recebido:", countsByStatus);
  const loadingMoreRef = React.useRef(false);

  // Auto-scroll horizontal durante drag de card (Kanban)
  const boardScrollRef = React.useRef<HTMLDivElement>(null);
  const autoScrollDirRef = React.useRef<0 | -1 | 1>(0);
  const autoScrollSpeedRef = React.useRef(0);
  const autoScrollRafRef = React.useRef<number | null>(null);

  const AUTO_SCROLL_EDGE_PX = 80;      // Largura da zona de gatilho nas bordas (px)
  const AUTO_SCROLL_MAX_SPEED = 22;    // Velocidade máxima de rolagem (px/frame)

  const stopAutoScroll = () => {
    autoScrollDirRef.current = 0;
    autoScrollSpeedRef.current = 0;
    if (autoScrollRafRef.current != null) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  };

  const startAutoScroll = () => {
    if (autoScrollRafRef.current != null) return;
    const step = () => {
      autoScrollRafRef.current = null;
      const el = boardScrollRef.current;
      const dir = autoScrollDirRef.current;
      if (el && dir !== 0) {
        el.scrollLeft += dir * autoScrollSpeedRef.current;
        autoScrollRafRef.current = requestAnimationFrame(step);
      }
    };
    autoScrollRafRef.current = requestAnimationFrame(step);
  };

  const handleBoardDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = boardScrollRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    // Ignora a rolagem horizontal se o mouse estiver verticalmente fora do container do Kanban
    if (e.clientY < rect.top || e.clientY > rect.bottom) {
      stopAutoScroll();
      return;
    }

    const left = e.clientX - rect.left;
    const right = rect.right - e.clientX;

    let dir: 0 | -1 | 1 = 0;
    let speed = 0;
    if (left < AUTO_SCROLL_EDGE_PX && el.scrollLeft > 0) {
      dir = -1;
      speed = Math.max(4, Math.round((1 - left / AUTO_SCROLL_EDGE_PX) * AUTO_SCROLL_MAX_SPEED));
    } else if (right < AUTO_SCROLL_EDGE_PX && el.scrollLeft < el.scrollWidth - el.clientWidth - 1) {
      dir = 1;
      speed = Math.max(4, Math.round((1 - right / AUTO_SCROLL_EDGE_PX) * AUTO_SCROLL_MAX_SPEED));
    }
    autoScrollDirRef.current = dir;
    autoScrollSpeedRef.current = speed;
    startAutoScroll();
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    stopAutoScroll();
  };

  const handleColumnScroll = (e: React.UIEvent<HTMLDivElement>, status: OSStatus | string) => {
    const target = e.currentTarget;
    const threshold = 50; // pixels antes de atingir o fundo
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight <= threshold;

    if (isAtBottom && !loadingMoreRef.current) {
      const isFin = viewMode === "financeiro";
      const totalInStatus = isFin ? (countsByStatus["FINALIZADO"] || 0) : (countsByStatus[status] || 0);
      const currentLoadedInStatus = isFin 
        ? ordensServico.filter(o => o.status === "FINALIZADO").length
        : ordensServico.filter(o => o.status === status).length;

      if (currentLoadedInStatus < totalInStatus && limit !== "all") {
        loadingMoreRef.current = true;
        const currentLimit = typeof limit === "number" ? limit : 100;
        onLimitChange(currentLimit + 100); // Incrementa o limite para buscar mais itens no banco
        
        setTimeout(() => {
          loadingMoreRef.current = false;
        }, 1200); // Debounce de 1.2 segundos para requisição
      }
    }
  };
  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<"laudo" | "pecas" | "entrada" | "saida">("laudo");
  
  // Alternância de Visões segmentadas
  const [viewMode, setViewMode] = useState<"tecnico" | "recepcao" | "financeiro">(() => {
    if (userRole === "ATTENDANT") return "recepcao";
    if (userRole === "FINANCIAL") return "financeiro";
    return "tecnico";
  });

  const FINANCIAL_COLUMNS: { id: string; name: string; color: string; desc: string }[] = [
    { id: "PENDENTE", name: "A Faturar", color: "border-t-indigo-400 bg-indigo-500/10", desc: "OSs pendentes de faturamento/pagamento" },
    { id: "CREDIARIO", name: "Crediário", color: "border-t-amber-500 bg-amber-50/10", desc: "Contas de crediário a receber" },
    { id: "PAGAR_DEPOIS", name: "Pagar Depois", color: "border-t-purple-500 bg-purple-50/10", desc: "Acordo de pagamento posterior" },
    { id: "PAGO", name: "Pago", color: "border-t-emerald-500 bg-emerald-50/10", desc: "OSs devidamente faturadas e quitadas" },
    { id: "INADIMPLENTE", name: "Inadimplentes", color: "border-t-rose-500 bg-rose-50/10", desc: "OSs sem registro de pagamento" }
  ];

  // Selection states for batch deletions
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmMsg = `Atenção: Deseja realmente excluir permanentemente (Soft Delete) as ${selectedIds.length} Ordens de Serviço selecionadas?\n\nEsta ação removerá as OSs do Kanban e dos relatórios de forma definitiva.`;
    if (!window.confirm(confirmMsg)) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const response = await fetch("/api/ordens-servico/batch", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ids: selectedIds })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`${data.count} Ordens de Serviço excluídas com sucesso!`);
        setSelectedIds([]);
        setIsSelectMode(false);
        onRefresh();
      } else {
        const err = await response.json();
        alert(err.error || "Erro ao excluir ordens de serviço.");
      }
    } catch (err: any) {
      alert("Erro de comunicação: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [searchScope, setSearchScope] = useState<SearchScope>("all");
  const [isSearching, setIsSearching] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<OrdemServico[] | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Checklist de Saída & Categorias
  const [deviceCategories, setDeviceCategories] = useState<{ id: string; name: string; defaultChecklist: ChecklistItem[] }[]>([]);
  const [editChecklistSaida, setEditChecklistSaida] = useState<ChecklistItem[]>([]);
  const [isEditingSaida, setIsEditingSaida] = useState(false);

  // Opção A: quando a finalização (por arrasto ou pelo botão de status) é bloqueada pelo
  // checklist de saída, guardamos o destino pendente para continuar a transição assim que
  // o checklist for salvo.
  const [pendingFinalize, setPendingFinalize] = useState<{ osId: string; targetStatus: OSStatus } | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem("mgv_token") || "";
        const res = await fetch("/api/devices/categories", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setDeviceCategories(data);
        }
      } catch (err) {
        console.error("Erro ao carregar categorias:", err);
      }
    };
    fetchCategories();
  }, []);

  // Cancela o loop de auto-scroll caso o componente seja desmontado durante um drag
  useEffect(() => () => stopAutoScroll(), []);

  // Checklist & Photos states in modal
  const [isEditingEntrada, setIsEditingEntrada] = useState(false);
  const [editChecklist, setEditChecklist] = useState<ChecklistItem[]>([]);
  const [editPhotos, setEditPhotos] = useState<EntradaFoto[]>([]);
  const [editAccessoriesLeft, setEditAccessoriesLeft] = useState("");
  const [editPhysicalState, setEditPhysicalState] = useState("");
  const [lightboxPhoto, setLightboxPhoto] = useState<EntradaFoto | null>(null);

  // Print state
  const [activePrintOS, setActivePrintOS] = useState<OrdemServico | null>(null);
  const [activePrintTemplate, setActivePrintTemplate] = useState<DocumentTemplate | null>(null);

  const printDocument = usePrintDocument();

  const handlePrintRecibo = async (os: OrdemServico) => {
    const template = resolveTemplateForOS(os);
    // PDF real gerado no servidor (data de emissão = agora, como no recibo impresso);
    // fallback para a impressão via navegador se o servidor falhar.
    const ok = await downloadDocumentPdf(
      template.id,
      os.id,
      `${template.nomeArquivo}-${os.osNumber}`,
      new Date().toISOString()
    );
    if (!ok) {
      setActivePrintOS(os);
      setActivePrintTemplate(template);
      printDocument(`${template.nomeArquivo}-${os.osNumber}`);
    }
  };

  const handlePrintTermo = async (os: OrdemServico) => {
    const template = DOCUMENT_TEMPLATES.termo;
    // PDF real gerado no servidor; fallback para a impressão via navegador se falhar.
    const ok = await downloadDocumentPdf(
      template.id,
      os.id,
      `${template.nomeArquivo}-${os.osNumber}`
    );
    if (!ok) {
      setActivePrintOS(os);
      setActivePrintTemplate(template);
      printDocument(`${template.nomeArquivo}-${os.osNumber}`);
    }
  };

  // Form states
  const [diagnostic, setDiagnostic] = useState("");
  const [laudoMacro, setLaudoMacro] = useState("");
  const [discount, setDiscount] = useState(0);
  const [benchLocation, setBenchLocation] = useState("");
  const [returnMethod, setReturnMethod] = useState("");
  const [packagingCleaned, setPackagingCleaned] = useState(false);
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [closingOS, setClosingOS] = useState<OrdemServico | null>(null);
  const [paymentModalOS, setPaymentModalOS] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [paymentDetails, setPaymentDetails] = useState<{ method: string; amount: number }[]>([]);
  const [paymentAmountInput, setPaymentAmountInput] = useState("");
  const [invoiceType, setInvoiceType] = useState("nenhum");
  const [showFiscalFixModal, setShowFiscalFixModal] = useState(false);
  const [fiscalFixClient, setFiscalFixClient] = useState<any | null>(null);
  const [fiscalFixData, setFiscalFixData] = useState<any>({
    name: "",
    cpfCnpj: "",
    stateInscription: "",
    address: "",
    city: "",
    state: "",
    zipCode: ""
  });
  const [fiscalFixErrors, setFiscalFixErrors] = useState<string[]>([]);
  const [fiscalFixWarnings, setFiscalFixWarnings] = useState<string[]>([]);
  const [fiscalFixPendingOSId, setFiscalFixPendingOSId] = useState<string>("");
  const [fiscalFixPendingStatus, setFiscalFixPendingStatus] = useState<OSStatus | null>(null);
  const [fiscalFixLoading, setFiscalFixLoading] = useState(false);

  const handleCepSearch = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      alert("CEP deve possuir 8 dígitos.");
      return;
    }
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFiscalFixData((prev: any) => ({
          ...prev,
          address: data.logradouro ? `${data.logradouro}, ` : prev.address,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
          zipCode: cepValue
        }));
      } else {
        alert("CEP não encontrado.");
      }
    } catch (err) {
      console.error("Erro ao buscar CEP:", err);
      alert("Erro ao buscar CEP na rede.");
    }
  };

  const handleSaveFiscalFix = async () => {
    if (!fiscalFixClient) return;
    setFiscalFixLoading(true);
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch(`/api/clients/${fiscalFixClient.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: fiscalFixData.name,
          cpfCnpj: fiscalFixData.cpfCnpj,
          stateInscription: fiscalFixData.stateInscription,
          address: fiscalFixData.address,
          city: fiscalFixData.city,
          state: fiscalFixData.state,
          zipCode: fiscalFixData.zipCode
        })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || "Erro ao salvar dados do cliente.");
      } else {
        const updatedClientData = await res.json();
        ordensServico.forEach((os: any) => {
          if (os.clientId === fiscalFixClient.id) {
            os.client = {
              ...os.client,
              ...updatedClientData
            };
          }
        });
        setShowFiscalFixModal(false);
        if (fiscalFixPendingOSId && fiscalFixPendingStatus) {
          // skipChecklistGate: para chegar à correção fiscal o gate do checklist já foi
          // superado; evita que a listagem obsoleta reabra o gate.
          handleStatusChangeBtn(fiscalFixPendingOSId, fiscalFixPendingStatus, { skipChecklistGate: true });
        }
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setFiscalFixLoading(false);
    }
  };

  const [showSemReparoModal, setShowSemReparoModal] = useState(false);
  const [semReparoOS, setSemReparoOS] = useState<OrdemServico | null>(null);
  const [selectedClosingReason, setSelectedClosingReason] = useState<any>('ORCAMENTO_RECUSADO');
  const [semReparoNotifyWhatsapp, setSemReparoNotifyWhatsapp] = useState(true);
  const [selectedParts, setSelectedParts] = useState<UsedPart[]>([]);
  const [tempPartId, setTempPartId] = useState("");
  const [tempPartQty, setTempPartQty] = useState(1);
  
  // Modal de busca de peças do estoque
  const [isPartSearchModalOpen, setIsPartSearchModalOpen] = useState(false);
  const [partSearchQuery, setPartSearchQuery] = useState("");
  const [partSearchCategory, setPartSearchCategory] = useState("");
  const [selectedPartsInModal, setSelectedPartsInModal] = useState<Record<string, { quantity: number; selected: boolean }>>({});
  const [apiPartsList, setApiPartsList] = useState<Part[]>([]);
  const [isSearchingParts, setIsSearchingParts] = useState(false);
  const [apiCategories, setApiCategories] = useState<string[]>([]);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const { isFeatureEnabled } = useFeatureFlags();

  // Onboarding de Dispositivo Legado (Lazy Loading) - Sprint 3
  const [onboardingOS, setOnboardingOS] = useState<OrdemServico | null>(null);
  const [onboardingDevice, setOnboardingDevice] = useState<any | null>(null);
  const [onboardingTargetStatus, setOnboardingTargetStatus] = useState<OSStatus | null>(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // Form Fields - Onboarding
  const [onbType, setOnbType] = useState("Ultrassom (Fisio/Estética)");
  const [onbExtraType, setOnbExtraType] = useState("");
  const [onbBrand, setOnbBrand] = useState("");
  const [onbModel, setOnbModel] = useState("");
  const [onbSerial, setOnbSerial] = useState("");
  const [onbDesc, setOnbDesc] = useState("");
  const [onbErrorMsg, setOnbErrorMsg] = useState("");
  const [onbSuccessMsg, setOnbSuccessMsg] = useState("");
  const [onbLoading, setOnbLoading] = useState(false);
  
  // Calcular métricas de rentabilidade para o modal de fechamento se ele estiver aberto
  const isVirtualProfitAvailable = closingOS?.profitValue !== undefined && closingOS?.profitValue !== null;

  const closingProfitVal = closingOS 
    ? (isVirtualProfitAvailable 
        ? closingOS.profitValue! 
        : (closingOS.totalCost - ((closingOS.usedParts?.reduce((sum, item) => sum + ((item.costSnapshot || 0) * item.quantity), 0) || 0) + ((closingOS.technicianLaborHours || 0) * (closingOS.technicianHourlyRate || 0)))))
    : 0;

  const closingOpsCostVal = closingOS
    ? (isVirtualProfitAvailable
        ? (closingOS.totalCost - closingOS.profitValue!)
        : ((closingOS.usedParts?.reduce((sum, item) => sum + ((item.costSnapshot || 0) * item.quantity), 0) || 0) + ((closingOS.technicianLaborHours || 0) * (closingOS.technicianHourlyRate || 0))))
    : 0;

  const closingProfitMarginPercentVal = closingOS
    ? (isVirtualProfitAvailable
        ? closingOS.profitMarginPercent!
        : (closingOS.totalCost > 0 ? (closingProfitVal / closingOS.totalCost) * 100 : 0))
    : 0;

  const closingHasZeroCost = closingOS
    ? (isVirtualProfitAvailable
        ? closingOS.hasZeroCostParts
        : closingOS.usedParts?.some(p => !p.costSnapshot))
    : false;

  const isAvulsoEnabled = isFeatureEnabled("OS_MANUAL_ITEMS");

  const [isAddingAvulso, setIsAddingAvulso] = useState(false);
  const [avulsoCategory, setAvulsoCategory] = useState<AvulsoCategory>("PECA");
  const [avulsoName, setAvulsoName] = useState("");
  const [avulsoQty, setAvulsoQty] = useState(1);
  const [avulsoPrice, setAvulsoPrice] = useState(0);
  const [avulsoCost, setAvulsoCost] = useState(0);
  const [avulsoObs, setAvulsoObs] = useState("");

  // --- Guarda de alterações não salvas (beforeunload) ---
  const editModalBaselineRef = useRef<string>("");

  const kanbanEditDirty =
    showEditModal &&
    (editModalBaselineRef.current === "" ||
      JSON.stringify({
        diagnostic,
        laudoMacro,
        discount,
        parts: selectedParts.map((p) => `${(p as any).partId || (p as any).id}:${p.quantity}`),
        checklist: editChecklist.map((i) => `${i.id}:${i.status}:${i.observacao || ""}`),
        photos: editPhotos.length,
        saida: editChecklistSaida.map((i) => `${i.id}:${i.status}:${i.observacao || ""}`)
      }) !== editModalBaselineRef.current ||
      isAddingAvulso ||
      avulsoName.trim() !== "" ||
      avulsoObs.trim() !== "" ||
      isEditingEntrada ||
      isEditingSaida);

  const onboardingDirty =
    showOnboardingModal &&
    (onbExtraType.trim() !== "" ||
      onbBrand.trim() !== "" ||
      onbModel.trim() !== "" ||
      onbSerial.trim() !== "" ||
      onbDesc.trim() !== "");

  // Modal de correção de dados fiscais do cliente (recepção antes do faturamento)
  const fiscalFixDirty =
    showFiscalFixModal &&
    (fiscalFixData.name?.trim() !== "" ||
      fiscalFixData.cpfCnpj?.trim() !== "" ||
      fiscalFixData.stateInscription?.trim() !== "" ||
      fiscalFixData.address?.trim() !== "" ||
      fiscalFixData.city?.trim() !== "" ||
      fiscalFixData.state?.trim() !== "" ||
      fiscalFixData.zipCode?.trim() !== "");

  useUnsavedChangesGuard(kanbanEditDirty);
  useUnsavedChangesGuard(onboardingDirty);
  useUnsavedChangesGuard(fiscalFixDirty);

  const handleStartStressTest = async () => {
    if (!selectedOS || isOffline) return;
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch(`/api/ordens-servico/${selectedOS.id}/start-stress`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error || "Erro ao iniciar teste de estresse.");
      } else {
        const updatedOS = await res.json();
        setSelectedOS(updatedOS);
        setSuccessMsg("Teste de estresse de garantia iniciado com sucesso!");
        setTimeout(() => setSuccessMsg(""), 3000);
        onRefresh();
      }
    } catch (err: any) {
      setErrorMsg("Falha ao comunicar com o servidor: " + err.message);
    }
  };

  const handleSaveChecklistSaida = async () => {
    if (!selectedOS) return;
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch(`/api/ordens-servico/${selectedOS.id}/checklist-saida`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ checklistSaida: editChecklistSaida })
      });
      if (res.ok) {
        const data = await res.json();
        setSuccessMsg("Checklist de saída salvo com sucesso!");
        setTimeout(() => setSuccessMsg(""), 3000);
        setSelectedOS({ ...selectedOS, checklistSaida: data.checklistSaida });
        setIsEditingSaida(false);
        onRefresh();

        // Opção A: se o arrasto para FINALIZADO foi bloqueado pelo checklist, continua a
        // transição reaproveitando a sequência do botão de status (validação fiscal → sem
        // reparo → lucro → PUT /status → fiscal/Bling), sem o usuário precisar repetir a ação.
        if (pendingFinalize && pendingFinalize.osId === selectedOS.id) {
          const { osId, targetStatus } = pendingFinalize;
          setPendingFinalize(null);
          // skipChecklistGate: o checklist acabou de ser salvo; a listagem ainda está
          // obsoleta e não deve reabrir o gate (evita loop).
          await handleStatusChangeBtn(osId, targetStatus, { skipChecklistGate: true });
          setShowEditModal(false);
        }
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Erro ao salvar checklist de saída.");
      }
    } catch (err: any) {
      setErrorMsg("Erro ao salvar checklist de saída: " + err.message);
    }
  };

  const openOSDetails = (os: OrdemServico) => {
    // Abrir os detalhes limpa qualquer finalização pendente de um arrasto anterior
    // (evita retomar uma transição que o usuário já desistiu).
    setPendingFinalize(null);

    // Scroll automatically to column center when opening OS
    const colElement = document.getElementById(`kanban-col-${os.status}`);
    if (colElement) {
      colElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    
    setSelectedOS(os);
    setDiagnostic(os.diagnostic || "");
    setLaudoMacro(os.laudoMacro || "");
    setDiscount(os.discount || 0);
    setBenchLocation((os as any).benchLocation || "");
    setReturnMethod((os as any).returnMethod || "");
    setPackagingCleaned((os as any).packagingCleaned || false);
    setEditTagIds(((os as any).tags || []).map((t: any) => t.id));
    setSelectedParts(os.usedParts || []);
    setEditChecklist(os.checklistEntrada && os.checklistEntrada.length > 0 ? os.checklistEntrada : DEFAULT_ENTRADA_CHECKLIST);
    setEditPhotos(os.laudoFotos || []);
    setEditAccessoriesLeft(os.accessoriesLeft || "");
    setEditPhysicalState(os.physicalState || "");
    setIsEditingEntrada(false);

    // Carregar detalhes completos (com fotos Base64) em background
    const loadFullDetails = async () => {
      try {
        const token = localStorage.getItem("mgv_token") || "";
        const res = await fetch(`/api/ordens-servico/${os.id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const fullOS = await res.json();
          setSelectedOS(fullOS);
          setEditPhotos(fullOS.laudoFotos || []);
          setSelectedParts(fullOS.usedParts || []);
          setDiscount(fullOS.discount || 0);
          setDiagnostic(fullOS.diagnostic || "");
          setLaudoMacro(fullOS.laudoMacro || "");
          setBenchLocation((fullOS as any).benchLocation || "");
          setReturnMethod((fullOS as any).returnMethod || "");
          setPackagingCleaned((fullOS as any).packagingCleaned || false);
          setEditTagIds((fullOS.tags || []).map((t: any) => t.id));
          setEditAccessoriesLeft(fullOS.accessoriesLeft || "");
          setEditPhysicalState(fullOS.physicalState || "");
          onRefresh();
        }
      } catch (err) {
        console.error("Erro ao carregar detalhes completos da OS:", err);
      }
    };
    loadFullDetails();

    // Inicialização do Checklist de Saída por Categoria
    const devType = (os as any).device?.type || "";
    const matchedCat = deviceCategories.find(c => c.name.toLowerCase() === devType.toLowerCase());
    const defaultSaida = matchedCat ? matchedCat.defaultChecklist : [
      { id: "geral", label: "Funcionamento Geral do Equipamento", status: "NA", observacao: "" },
      { id: "limpeza", label: "Limpeza Física Externa", status: "NA", observacao: "" },
      { id: "seguranca", label: "Lacre de Segurança Aplicado", status: "NA", observacao: "" }
    ];
    setEditChecklistSaida(os.checklistSaida && os.checklistSaida.length > 0 ? os.checklistSaida : defaultSaida);
    setIsEditingSaida(false);

    setModalTab("laudo");
    setErrorMsg("");
    setSuccessMsg("");
    setShowEditModal(true);

    // Baseline da guarda de alterações não salvas (não disparar ao apenas abrir)
    editModalBaselineRef.current = captureEditBaseline(os, defaultSaida);
  };

  const handleModalPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (editPhotos.length + files.length > 6) {
      alert("Limite de 6 fotos por Ordem de Serviço atingido.");
      return;
    }

    (Array.from(files) as File[]).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const targetWidth = 800;
          const targetHeight = Math.round((img.height * targetWidth) / img.width);
          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
            setEditPhotos((prev) => [
              ...prev,
              {
                id: `foto-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                dataUrl,
                legenda: "",
                capturedAt: new Date().toISOString()
              }
            ]);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveLaudoFotos = async () => {
    if (isOffline || !selectedOS) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const response = await fetch(`/api/ordens-servico/${selectedOS.id}/laudo-fotos`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          checklistEntrada: editChecklist, 
          laudoFotos: editPhotos,
          accessoriesLeft: editAccessoriesLeft,
          physicalState: editPhysicalState
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao gravar laudo de entrada.");
      }
      
      setSuccessMsg("Checklist e fotos de entrada gravados com sucesso!");
      onRefresh();
      
      setSelectedOS({
        ...selectedOS,
        checklistEntrada: editChecklist,
        laudoFotos: editPhotos,
        accessoriesLeft: editAccessoriesLeft,
        physicalState: editPhysicalState
      });
      setIsEditingEntrada(false);
      setTimeout(() => setSuccessMsg(""), 1200);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };


  // Gate do checklist de saída, compartilhado entre o arrasto e o botão de status:
  // só bloqueia quando o checklist ainda NÃO foi salvo e o faturamento está pendente.
  const needsChecklistSaidaGate = (os: OrdemServico) =>
    !(Array.isArray(os.checklistSaida) && os.checklistSaida.length > 0) &&
    (!os.billingStatus || os.billingStatus === "PENDENTE" || os.billingStatus === "REJEITADO");

  // OS coberta por garantia — etiqueta automática "Em Garantia" injetada pelo backend
  // (MGV 90 dias ou garantia do aparelho). Em garantia → sem cobrança.
  const isWarrantyOS = (os: any) =>
    Array.isArray(os?.tags) && (os.tags as any[]).some((t: any) => t.name === "Em Garantia");

  // OS aberta no modal de pagamento + flag de garantia (derivado do card atual)
  const getPaymentOS = (id: string) => ordensServico.find(o => o.id === id);
  const isPaymentWarranty = (id: string) => isWarrantyOS(getPaymentOS(id));

  // Abre a aba "Saída" em modo de edição e guarda o destino pendente (FINALIZADO).
  const openChecklistGate = (os: OrdemServico) => {
    setPendingFinalize({ osId: os.id, targetStatus: "FINALIZADO" });
    setSelectedOS(os);
    setEditTagIds(((os as any).tags || []).map((t: any) => t.id));
    setModalTab("saida");
    setIsEditingSaida(true);
    setShowEditModal(true);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (isOffline) { e.preventDefault(); return; }
    setDraggingId(id);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const executeStatusTransition = async (id: string, newStatus: string, opts?: { skipChecklistGate?: boolean }) => {
    if (isOffline) return false;

    // Se estivermos no modo financeiro, atualizamos o status financeiro da OS
    if (viewMode === "financeiro") {
      try {
        const token = localStorage.getItem("mgv_token") || "";
        const response = await fetch(`/api/ordens-servico/${id}/financial-status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ financialStatus: newStatus })
        });
        if (!response.ok) {
          const errData = await response.json();
          alert(errData.error || "Erro ao atualizar status financeiro.");
          return false;
        } else {
          onRefresh();
          return true;
        }
      } catch (err: any) {
        alert(err.message);
        return false;
      }
    }

    const osToMove = ordensServico.find(o => o.id === id);
    if (!osToMove) return false;

    // Gate 1: Checklist de Saída
    // O gate do checklist só bloqueia quando o checklist ainda NÃO foi salvo (needsChecklistSaidaGate).
    if (newStatus === "FINALIZADO" && !opts?.skipChecklistGate && needsChecklistSaidaGate(osToMove)) {
      openChecklistGate(osToMove);
      return false;
    }

    // Gate 2: Validação Fiscal de Cliente (pulada em OS cobertas por garantia ou sem custo — sem cobrança/nota fiscal)
    const getOSTotalVal = (os: any) => {
      if (os.totalCost !== undefined && os.totalCost !== null) return os.totalCost;
      const partsCost = os.usedParts?.filter((i: any) => i.category !== "SERVICO").reduce((s: number, i: any) => s + (i.price * i.quantity), 0) || 0;
      const labor = os.laborCost || 0;
      const disc = os.discount || 0;
      return Math.max(0, partsCost + labor - disc);
    };
    const isWarranty = isWarrantyOS(osToMove) || osToMove.warrantyType !== "NENHUMA";
    const osTotal = getOSTotalVal(osToMove);
    if (newStatus === "FINALIZADO" && !isWarranty && osTotal > 0) {
      const isNfc = invoiceType === "nfce";
      const validation = validateFiscalData(osToMove, osToMove.client, parts, { isNfc });
      if (!validation.isValid) {
        setFiscalFixPendingOSId(id);
        setFiscalFixPendingStatus(newStatus as OSStatus);
        setFiscalFixClient(osToMove.client);
        setFiscalFixData({
          name: osToMove.client.name || "",
          cpfCnpj: osToMove.client.cpfCnpj || "",
          stateInscription: osToMove.client.stateInscription || osToMove.client.rg || "",
          address: osToMove.client.address || "",
          city: osToMove.client.city || "",
          state: osToMove.client.state || "",
          zipCode: osToMove.client.zipCode || ""
        });
        setFiscalFixErrors(validation.errors);
        setFiscalFixWarnings(validation.warnings);
        setShowFiscalFixModal(true);
        return false;
      }
    }

    // Gate 3: Encerramento Sem Reparo (Orçamento Recusado / Sem Conserto)
    const isOrigemSemReparo = osToMove.status === "AGUARDANDO_AVALIACAO" || osToMove.status === "AGUARDANDO_AUTORIZACAO";
    if ((newStatus === "FINALIZADO" || newStatus === "PRONTO_RETIRADA") && isOrigemSemReparo) {
      setSemReparoOS(osToMove);
      setSelectedClosingReason('ORCAMENTO_RECUSADO');
      setSemReparoNotifyWhatsapp(true);
      setShowSemReparoModal(true);
      return false;
    }

    // Gate 4: Cálculo de Rentabilidade (Apenas OWNER)
    const isProfitEnabled = isFeatureEnabled("OS_PROFITABILITY_CALC");
    if (newStatus === "FINALIZADO" && userRole === UserRole.OWNER && isProfitEnabled) {
      setClosingOS(osToMove);
      return false;
    }

    // Transição Principal: Atualização do Banco de Dados via API e Gate 5 (Onboarding Base Instalada)
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const response = await fetch(`/api/ordens-servico/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        if (errData.code === "DEVICE_INCOMPLETE") {
          setOnboardingOS(osToMove);
          setOnboardingDevice(errData.device);
          setOnboardingTargetStatus(newStatus as OSStatus);
          setOnbType(errData.device.type || "Ultrassom (Fisio/Estética)");
          setOnbBrand(errData.device.brand === "Indefinido" ? "" : errData.device.brand);
          setOnbModel(errData.device.model === "Indefinido" ? "" : errData.device.model);
          setOnbSerial(errData.device.serialNumber === "Sem Série" ? "" : errData.device.serialNumber);
          setOnbDesc(errData.device.description === "Sem observações." ? "" : errData.device.description);
          setOnbErrorMsg("");
          setOnbSuccessMsg("");
          setShowOnboardingModal(true);
          return false;
        } else {
          alert(errData.error || "Erro ao alterar status da OS.");
          return false;
        }
      } else {
        onRefresh();
        return true;
      }
    } catch (err: any) {
      alert(err.message);
      return false;
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (!draggingId || isOffline) return;

    await executeStatusTransition(draggingId, targetStatus);
    
    setDraggingId(null);
    stopAutoScroll();
  };

  const handleStatusChangeBtn = async (id: string, newStatus: OSStatus, opts?: { skipChecklistGate?: boolean }) => {
    await executeStatusTransition(id, newStatus, opts);
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnbErrorMsg("");
    setOnbSuccessMsg("");
    setOnbLoading(true);

    if (isOffline) {
      setOnbErrorMsg("O sistema está offline.");
      setOnbLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("mgv_token") || "";
      const devRes = await fetch(`/api/devices/${onboardingDevice.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          type: onbExtraType.trim() ? `${onbType} / ${onbExtraType.trim()}` : onbType,
          brand: onbBrand,
          model: onbModel,
          serialNumber: onbSerial,
          description: onbDesc
        })
      });

      const devData = await devRes.json();
      if (!devRes.ok) {
        throw new Error(devData.error || "Erro ao atualizar dados do equipamento na base instalada.");
      }

      setOnbSuccessMsg("Equipamento convertido para Base Instalada com sucesso!");

      if (onboardingOS && onboardingTargetStatus) {
        const statusRes = await fetch(`/api/ordens-servico/${onboardingOS.id}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ status: onboardingTargetStatus })
        });

        const statusData = await statusRes.json();
        if (!statusRes.ok) {
          throw new Error(statusData.error || "Erro ao concluir a mudança de status da OS.");
        }
      }

      onRefresh();

      setTimeout(() => {
        setShowOnboardingModal(false);
        setOnboardingOS(null);
        setOnboardingDevice(null);
        setOnboardingTargetStatus(null);
        setOnbSuccessMsg("");
      }, 1000);
    } catch (err: any) {
      setOnbErrorMsg(err.message || "Erro inesperado no onboarding.");
    } finally {
      setOnbLoading(false);
    }
  };

  const handleAddPartToOS = () => {
    if (!tempPartId) return;
    const part = parts.find(p => p.id === tempPartId);
    if (!part || part.stock < tempPartQty) return;
    const existsIdx = selectedParts.findIndex(item => item.partId === tempPartId && !item.isAvulso);
    if (existsIdx !== -1) {
      const updated = [...selectedParts];
      updated[existsIdx].quantity += Number(tempPartQty);
      setSelectedParts(updated);
    } else {
      setSelectedParts([...selectedParts, {
        partId: part.id,
        name: part.name,
        quantity: Number(tempPartQty),
        price: part.price,
        costSnapshot: part.cost,
        serialNumber: ""
      }]);
    }
    setTempPartId("");
    setTempPartQty(1);
  };

  const handleOpenPartSearchModal = async () => {
    // Inicializar o objeto temporário de seleção com as peças já selecionadas atualmente na OS
    const initialSelection: Record<string, { quantity: number; selected: boolean }> = {};
    selectedParts.forEach(p => {
      if (p.partId && !p.isAvulso) {
        initialSelection[p.partId] = {
          quantity: p.quantity,
          selected: true
        };
      }
    });
    setSelectedPartsInModal(initialSelection);
    setPartSearchQuery("");
    setPartSearchCategory("");
    setIsPartSearchModalOpen(true);
    setIsSearchingParts(true);

    try {
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch("/api/parts?limit=1000", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const resultData = await res.json();
        const loadedParts = resultData.data || [];
        setApiPartsList(loadedParts);
        // Extrai categorias de todas as peças carregadas da API
        const cats = Array.from(new Set(loadedParts.map((p: any) => p.category || "Sem Categoria"))) as string[];
        setApiCategories(cats);
      }
    } catch (err) {
      console.error("Erro ao carregar peças para o modal:", err);
    } finally {
      setIsSearchingParts(false);
    }
  };

  const handleConfirmModalParts = () => {
    const newSelectedParts = [...selectedParts.filter(p => p.isAvulso)]; // Mantém itens avulsos intactos

    // Iterar pelas peças selecionadas na modal e construir a lista final
    Object.entries(selectedPartsInModal).forEach(([partId, info]) => {
      const selection = info as { selected: boolean; quantity: number };
      if (selection.selected && selection.quantity > 0) {
        const part = apiPartsList.find(p => p.id === partId) || parts.find(p => p.id === partId);
        if (part) {
          // Garante que respeita o limite de estoque disponível
          const finalQty = Math.min(selection.quantity, part.stock);
          if (finalQty > 0) {
            newSelectedParts.push({
              partId: part.id,
              name: part.name,
              quantity: finalQty,
              price: part.price,
              costSnapshot: part.cost,
              serialNumber: selectedParts.find(sp => sp.partId === partId)?.serialNumber || ""
            });
          }
        }
      }
    });

    setSelectedParts(newSelectedParts);
    setIsPartSearchModalOpen(false);
  };

  const handleAddAvulsoToOS = (e: React.FormEvent) => {
    e.preventDefault();
    if (!avulsoName.trim() || avulsoQty < 1 || avulsoPrice < 0) return;

    setSelectedParts([...selectedParts, {
      id: `avulso-${Date.now()}`,
      isAvulso: true,
      category: avulsoCategory,
      name: avulsoName.trim(),
      quantity: avulsoQty,
      price: avulsoPrice,
      costSnapshot: avulsoCost,
      observation: avulsoObs
    }]);

    setAvulsoName("");
    setAvulsoQty(1);
    setAvulsoPrice(0);
    setAvulsoCost(0);
    setAvulsoObs("");
    setIsAddingAvulso(false);
  };

  const handlePromoteToStock = async (item: UsedPart) => {
    if (!confirm(`Deseja cadastrar "${item.name}" definitivamente no estoque?`)) return;
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch("/api/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          name: item.name,
          code: `AV-${Date.now().toString().slice(-6)}`,
          stock: 0,
          cost: item.costSnapshot || 0,
          price: item.price,
          requiresSerial: false
        })
      });
      if (res.ok) {
         alert("Produto criado no estoque com sucesso! Você já poderá selecioná-lo nas próximas OS.");
         onRefresh();
      } else {
         const err = await res.json();
         alert(err.error || "Erro ao criar item no estoque.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de comunicação ao criar produto.");
    }
  };

  const handleRemovePartFromOS = (partIdOrId: string) => setSelectedParts(selectedParts.filter(item => item.partId !== partIdOrId && item.id !== partIdOrId));

  const computedPartsCost = selectedParts
    .filter(p => p.category !== "SERVICO")
    .reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const computedLaborCost = selectedParts
    .filter(p => p.category === "SERVICO")
    .reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const computedTotal = Math.max(0, computedPartsCost + computedLaborCost - Number(discount));

  const handleSaveOSDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline || !selectedOS) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const response = await fetch(`/api/ordens-servico/${selectedOS.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ diagnostic, laudoMacro, usedParts: selectedParts, discount, benchLocation, returnMethod, packagingCleaned, tagIds: editTagIds })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao gravar.");
      }
      setSuccessMsg("Laudo pericial e peças salvas com sucesso!");
      onRefresh();
      setTimeout(() => { setShowEditModal(false); setSuccessMsg(""); }, 1200);
    } catch (err: any) { setErrorMsg(err.message); } finally { setLoading(false); }
  };

  const handleDeleteOS = async () => {
    if (!selectedOS || isOffline || userRole !== UserRole.OWNER) return;
    if (!confirm("Confirmar exclusão lógica?")) return;
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const response = await fetch(`/api/ordens-servico/${selectedOS.id}`, { 
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "x-user-role": userRole
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Não foi possível excluir");
      }
      setShowEditModal(false);
      onRefresh();
    } catch (err: any) { alert(err.message); }
  };

  const handleAdvancedSearch = async () => {
    if (searchTerm.trim().length < 2) return;
    setIsSearching(true);
    try {
      const token = localStorage.getItem("mgv_token");
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}&type=OS`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // O endpoint search retorna resultados heterogêneos na estrutura { results: [...] } ou diretamente a array de OS.
        // Vamos extrair apenas os resultados do tipo OS.
        const osResults = data.filter((item: any) => item.type === "OS").map((item: any) => item.data as OrdemServico);
        setGlobalSearchResults(osResults.length > 0 ? osResults : []);
      }
    } catch (err) {
      console.error("Erro na busca avançada:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const localFilteredOS = ordensServico.filter(os => matchOS(os, searchTerm, searchScope));

  const dataSource = globalSearchResults !== null ? globalSearchResults : localFilteredOS;
  const canUseAdvancedSearch = ["OWNER", "ADMIN", "ATTENDANT", "TECHNICIAN", "EDITOR", "SUPERVISOR", "FINANCIAL"].includes(userRole);


  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
      {isOffline && (
        <div className="bg-red-950/60 border border-red-500 rounded-xl p-3 text-red-200 text-xs flex items-center space-x-2 animate-pulse shadow-inner">
          <span className="material-symbols-outlined text-[16px] text-red-400 shrink-0">warning</span>
          <span><strong>ALERTA:</strong> Conexão offline ativa. Movimentação bloqueada.</span>
        </div>
      )}

      {/* Search Bar with Scope Dropdown Selector */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm relative z-10">
        <div className="flex-1 relative w-full group flex flex-col sm:flex-row items-center gap-2">
          <div className="relative w-full flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (globalSearchResults !== null) setGlobalSearchResults(null);
              }}
              placeholder={
                searchScope === "osNumber" ? "Filtrar por número da OS (ex: 0042)..." :
                searchScope === "name" ? "Filtrar por nome do cliente..." :
                searchScope === "phone" ? "Filtrar por número ou dígitos do telefone..." :
                searchScope === "document" ? "Filtrar por CPF ou CNPJ..." :
                searchScope === "address" ? "Filtrar por endereço ou bairro..." :
                searchScope === "device" ? "Filtrar por marca, modelo ou nº de série do equipamento..." :
                "Pesquisar OS, Cliente ou Equipamento (Filtro Instantâneo)..."
              }
              className="w-full pl-12 pr-10 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button 
                type="button" 
                onClick={() => { setSearchTerm(""); setGlobalSearchResults(null); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full p-1 transition"
              >
                <span className="material-symbols-outlined text-[16px] block">close</span>
              </button>
            )}
          </div>

          <select
            value={searchScope}
            onChange={(e) => setSearchScope(e.target.value as SearchScope)}
            className="w-full sm:w-auto px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shrink-0 cursor-pointer shadow-xs"
          >
            <option value="all">🔍 Todos os Campos</option>
            <option value="osNumber">📋 Nº da OS</option>
            <option value="name">👤 Nome do Cliente</option>
            <option value="phone">📞 Telefone</option>
            <option value="document">📄 CPF / CNPJ</option>
            <option value="address">📍 Endereço</option>
            <option value="device">💻 Equipamento / Série</option>
          </select>
        </div>
        
        {canUseAdvancedSearch && searchTerm.length >= 2 && globalSearchResults === null && (
          <button
            onClick={handleAdvancedSearch}
            disabled={isSearching}
            className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isSearching ? (
              <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">travel_explore</span>
            )}
            {isSearching ? "Buscando..." : "Busca Avançada (Global)"}
          </button>
        )}



        <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden md:inline">Ordenação:</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
            className="w-full sm:w-auto px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer font-semibold"
          >
            <option value="desc">📅 Mais Recentes Primeiro</option>
            <option value="asc">📅 Mais Antigas Primeiro</option>
          </select>
        </div>

        {userRole === UserRole.OWNER && (
          <button
            type="button"
            onClick={() => {
              setIsSelectMode(!isSelectMode);
              setSelectedIds([]);
            }}
            className={`w-full sm:w-auto px-4 py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border cursor-pointer select-none ${
              isSelectMode 
                ? "bg-rose-600 border-rose-700 text-white shadow-md shadow-rose-900/10 hover:bg-rose-700" 
                : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{isSelectMode ? "cancel" : "delete_sweep"}</span>
            <span>{isSelectMode ? "Sair da Seleção" : "Limpeza (Excluir em Lote)"}</span>
          </button>
        )}
      </div>

      {/* Seletor de Visão Consolidada do Gestor */}
      {(userRole === "OWNER" || userRole === "ADMIN") && (
        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50 max-w-xl shadow-sm">
          <button
            onClick={() => setViewMode("tecnico")}
            className={`flex-1 py-2.5 px-4 text-[11px] font-extrabold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === "tecnico"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">build</span>
            <span>Fluxo Técnico</span>
          </button>
          <button
            onClick={() => setViewMode("recepcao")}
            className={`flex-1 py-2.5 px-4 text-[11px] font-extrabold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === "recepcao"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">storefront</span>
            <span>Recepção (Handoff)</span>
          </button>
          <button
            onClick={() => setViewMode("financeiro")}
            className={`flex-1 py-2.5 px-4 text-[11px] font-extrabold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === "financeiro"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">payments</span>
            <span>Financeiro</span>
          </button>
        </div>
      )}
      {(userRole !== "OWNER" && userRole !== "ADMIN") && (
        <div className="flex bg-slate-100/80 p-3 rounded-2xl border border-slate-200/50 shadow-sm items-center gap-2">
          <span className="material-symbols-outlined text-indigo-500 text-xl">
            {viewMode === "tecnico" ? "build" : viewMode === "recepcao" ? "front_desk" : "payments"}
          </span>
          <span className="font-extrabold text-slate-700 text-sm">
            Seu Painel: {viewMode === "tecnico" ? "Fluxo Técnico" : viewMode === "recepcao" ? "Recepção e Handoff" : "Financeiro"}
          </span>
        </div>
      )}

      {globalSearchResults !== null && (
        <div className="bg-indigo-50/80 border border-indigo-200/60 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3 text-indigo-800">
            <span className="material-symbols-outlined text-indigo-500 text-2xl">travel_explore</span>
            <div>
              <p className="font-bold text-sm">Exibindo Resultados da Pesquisa Global</p>
              <p className="text-xs text-indigo-600/80">Foram encontrados {globalSearchResults.length} registros no banco de dados para "{searchTerm}".</p>
            </div>
          </div>
          <button
            onClick={() => { setSearchTerm(""); setGlobalSearchResults(null); }}
            className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">close</span> Limpar Pesquisa
          </button>
        </div>
      )}

      {isSelectMode && (
        <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs anim-slideup select-none mb-4">
          <div className="flex items-center gap-2.5 text-rose-800">
            <span className="material-symbols-outlined text-rose-500 text-xl">delete_sweep</span>
            <div>
              <p className="font-bold text-xs text-rose-900">Modo de Seleção e Exclusão em Lote Ativo</p>
              <p className="text-[10px] text-rose-700/80">Selecione os cards de testes que deseja excluir. <strong>{selectedIds.length}</strong> selecionados.</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                const allIds = dataSource.map(o => o.id);
                setSelectedIds(allIds);
              }}
              className="px-3.5 py-2 border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded-lg transition active:scale-95 cursor-pointer"
            >
              Selecionar Todos
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3.5 py-2 border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded-lg transition active:scale-95 cursor-pointer"
            >
              Desmarcar Todos
            </button>
            <button
              type="button"
              disabled={selectedIds.length === 0 || isDeleting}
              onClick={handleBatchDelete}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-[10px] font-extrabold rounded-lg shadow-md transition active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">delete</span>
              <span>{isDeleting ? "Excluindo..." : "Excluir Selecionados"}</span>
            </button>
          </div>
        </div>
      )}

      <div
        ref={boardScrollRef}
        onDragOver={handleBoardDragOver}
        onDragEnd={handleDragEnd}
        className={`flex-1 flex overflow-x-auto gap-6 pb-2 pr-2 custom-scrollbar-horizontal ${
          draggingId ? "" : "snap-x snap-mandatory"
        }`}
      >
        {(viewMode === "financeiro" ? FINANCIAL_COLUMNS : viewMode === "recepcao" ? RECEPCAO_COLUMNS : TECNICO_COLUMNS).map((column) => {
          // No modo financeiro, listamos apenas OSs FINALIZADO. Nos outros, filtramos pelo status da coluna.
          const colOS = dataSource
            .filter(os => {
              if (viewMode === "financeiro") {
                const osFinStatus = os.financialStatus || "PENDENTE";
                return os.status === "FINALIZADO" && osFinStatus === column.id;
              } else {
                return os.status === column.id;
              }
            })
            .sort((a, b) => {
              const timeA = new Date(a.createdAt).getTime();
              const timeB = new Date(b.createdAt).getTime();
              return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
            });

          // Contagem de cards na coluna
          const colCount = viewMode === "financeiro"
            ? dataSource.filter(os => os.status === "FINALIZADO" && (os.financialStatus || "PENDENTE") === column.id).length
            : (countsByStatus[column.id] || 0);

          return (
            <div 
              id={`kanban-col-${column.id}`} 
              key={column.id} 
              onDragOver={handleDragOver} 
              onDrop={(e) => handleDrop(e, column.id)} 
              className={`w-[360px] min-w-[360px] shrink-0 rounded-2xl border border-slate-200/85 border-t-4 p-4.5 flex flex-col h-full max-h-full gap-4 overflow-hidden ${column.color} ${
                draggingId ? "" : "snap-center"
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 shrink-0">
                <h3 className="font-bold text-sm text-slate-900">{column.name}</h3>
                <span className="bg-slate-900 text-white font-mono text-[10px] px-2 py-0.5 rounded-full">{colCount}</span>
              </div>
              <div 
                onScroll={(e) => handleColumnScroll(e, column.id as any)}
                className="flex-1 space-y-2.5 overflow-y-auto pr-1 pb-2 custom-scrollbar"
              >
                {colOS.map((os) => {
                  // Motor de Recorrência
                  const ninetyDaysAgo = new Date(os.createdAt);
                  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                  const recurrenceCount = ordensServico.filter(otherOS => 
                    otherOS.deviceId === os.deviceId &&
                    new Date(otherOS.createdAt) >= ninetyDaysAgo &&
                    new Date(otherOS.createdAt) <= new Date(os.createdAt)
                  ).length;
                  const hasRecurrence = os.recurrentAlert ? true : (recurrenceCount >= 3);

                  return (
                    <KanbanCard 
                      key={os.id} 
                      os={os}
                      hasRecurrence={hasRecurrence}
                      isSelectMode={isSelectMode}
                      isSelected={selectedIds.includes(os.id)}
                      onSelectToggle={(e, id) => {
                        if (selectedIds.includes(id)) {
                          setSelectedIds(selectedIds.filter(x => x !== id));
                        } else {
                          setSelectedIds([...selectedIds, id]);
                        }
                      }}
                      onDragStart={handleDragStart} 
                      onDragEnd={handleDragEnd}
                      onClick={openOSDetails} 
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Helper functions for Pipefy Modal */}
      {(() => {
        if (!showEditModal || !selectedOS) return null;
        
        const saveAndMove = async (e: React.MouseEvent, newStatus: OSStatus) => {
          e.preventDefault();
          setLoading(true);
          try {
            const token = localStorage.getItem("mgv_token") || "";
            const resDados = await fetch(`/api/ordens-servico/${selectedOS.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
              body: JSON.stringify({ diagnostic, laudoMacro, usedParts: selectedParts, discount, benchLocation, returnMethod, packagingCleaned, tagIds: editTagIds })
            });
            if (!resDados.ok) throw new Error("Erro ao gravar dados.");
            
            // Se o destino for FINALIZADO ou PRONTO_RETIRADA e a origem for um status de orçamento/avaliação,
            // interceptamos e abrimos o modal de Motivo de Encerramento Sem Reparo.
            const isOrigemSemReparo = selectedOS.status === "AGUARDANDO_AVALIACAO" || selectedOS.status === "AGUARDANDO_AUTORIZACAO";
            if ((newStatus === "FINALIZADO" || newStatus === "PRONTO_RETIRADA") && isOrigemSemReparo) {
              const osUpdatedForSemReparo = {
                ...selectedOS,
                diagnostic,
                laudoMacro,
                benchLocation,
                returnMethod,
                packagingCleaned,
                usedParts: selectedParts,
                laborCost: computedLaborCost,
                discount: Number(discount) || 0,
                technicianLaborHours: selectedOS.technicianLaborHours || 0,
                technicianHourlyRate: selectedOS.technicianHourlyRate || 0,
                totalCost: computedTotal
              };
              setSemReparoOS(osUpdatedForSemReparo);
              setSelectedClosingReason('ORCAMENTO_RECUSADO');
              setSemReparoNotifyWhatsapp(true);
              setShowEditModal(false);
              setShowSemReparoModal(true);
              return;
            }

            const isProfitEnabled = isFeatureEnabled("OS_PROFITABILITY_CALC");
            if (newStatus === "FINALIZADO" && userRole === UserRole.OWNER && isProfitEnabled) {
              const osUpdatedForClosing = {
                ...selectedOS,
                diagnostic,
                laudoMacro,
                benchLocation,
                returnMethod,
                packagingCleaned,
                usedParts: selectedParts,
                laborCost: computedLaborCost,
                discount: Number(discount) || 0,
                technicianLaborHours: selectedOS.technicianLaborHours || 0,
                technicianHourlyRate: selectedOS.technicianHourlyRate || 0,
                totalCost: computedTotal
              };
              setShowEditModal(false);
              setClosingOS(osUpdatedForClosing);
              return;
            }
            if (newStatus === "FINALIZADO") {
              setPaymentModalOS({ id: selectedOS.id, targetStatus: newStatus });
              setShowEditModal(false);
              return;
            }

            const resStatus = await fetch(`/api/ordens-servico/${selectedOS.id}/status`, {
              method: "PUT",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
              body: JSON.stringify({ status: newStatus })
            });
            if (!resStatus.ok) {
              const errData = await resStatus.json().catch(() => ({}));
              throw new Error(errData.error || "Erro ao mudar fase.");
            }
            
            setSuccessMsg(`Fase alterada com sucesso!`);
            onRefresh();
            setTimeout(() => { setShowEditModal(false); setSuccessMsg(""); }, 1000);
          } catch (err: any) {
            setErrorMsg(err.message);
          } finally {
            setLoading(false);
          }
        };

        const renderActionMotor = () => {
          switch(selectedOS.status) {
            case "AGUARDANDO_AVALIACAO":
              return (
                 <div className="space-y-3">
                   <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                     Avalie o equipamento e lance as peças e serviços necessários. Em seguida, envie o orçamento para aprovação do cliente.
                   </p>
                   <button type="button" onClick={(e) => saveAndMove(e, "AGUARDANDO_AUTORIZACAO")} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2 active:scale-95">
                     <span className="material-symbols-outlined text-[18px]">send</span>
                     <span>Enviar Orçamento p/ Aprovação</span>
                   </button>
                   <button type="button" onClick={(e) => saveAndMove(e, "EM_MANUTENCAO")} className="w-full py-3 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2 active:scale-95">
                     <span className="material-symbols-outlined text-[18px]">build</span>
                     <span>Reparo em Garantia / Iniciar Direto</span>
                   </button>
                   <button type="button" onClick={async (e) => {
                     e.preventDefault();
                     setLoading(true);
                     try {
                       const token = localStorage.getItem("mgv_token") || "";
                       const resDados = await fetch(`/api/ordens-servico/${selectedOS.id}`, {
                         method: "PUT",
                         headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                         body: JSON.stringify({ diagnostic, laudoMacro, usedParts: selectedParts, discount, benchLocation, returnMethod, packagingCleaned, tagIds: editTagIds })
                       });
                       if (!resDados.ok) throw new Error("Erro ao gravar dados.");
                       
                       const osUpdatedForSemReparo = {
                         ...selectedOS,
                         diagnostic,
                         laudoMacro,
                         benchLocation,
                         returnMethod,
                         packagingCleaned,
                         usedParts: selectedParts,
                         laborCost: computedLaborCost,
                         discount: Number(discount) || 0,
                         technicianLaborHours: selectedOS.technicianLaborHours || 0,
                         technicianHourlyRate: selectedOS.technicianHourlyRate || 0,
                         totalCost: computedTotal
                       };
                       setSemReparoOS(osUpdatedForSemReparo);
                       setSelectedClosingReason('EQUIPAMENTO_SEM_DEFEITO');
                       setSemReparoNotifyWhatsapp(true);
                       setShowEditModal(false);
                       setShowSemReparoModal(true);
                     } catch(err: any) {
                       setErrorMsg(err.message);
                     } finally {
                       setLoading(false);
                     }
                   }} className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2 active:scale-95">
                     <span className="material-symbols-outlined text-[18px]">verified</span>
                     <span>Encerrar OS (Aparelho sem Defeito)</span>
                   </button>
                 </div>
              );
            case "AGUARDANDO_AUTORIZACAO":
              return (
                 <div className="space-y-3">
                   <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                     O orçamento está sob análise do cliente. Registre a resposta da autorização abaixo:
                   </p>
                   <button type="button" onClick={(e) => saveAndMove(e, "EM_MANUTENCAO")} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2 active:scale-95">
                     <span className="material-symbols-outlined text-[18px]">check_circle</span>
                     <span>Cliente Aprovou (Iniciar Reparo)</span>
                   </button>
                   <button type="button" onClick={(e) => saveAndMove(e, "AGUARDANDO_PECA")} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2 active:scale-95">
                     <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                     <span>Cliente Aprovou (Aguardar Peças)</span>
                   </button>
                   <button type="button" onClick={(e) => saveAndMove(e, "FINALIZADO")} className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2 active:scale-95">
                     <span className="material-symbols-outlined text-[18px]">cancel</span>
                     <span>Cliente Recusou (Devolver sem Reparo)</span>
                   </button>
                 </div>
              );
            case "AGUARDANDO_PECA":
              return (
                 <div className="space-y-3">
                   <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                     Equipamento parado aguardando a chegada de peças compradas ou encomendadas. Quando as peças chegarem, envie para a manutenção.
                   </p>
                   <button type="button" onClick={(e) => saveAndMove(e, "EM_MANUTENCAO")} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2 active:scale-95">
                     <span className="material-symbols-outlined text-[18px]">build</span>
                     <span>Peças Chegaram (Iniciar Manutenção)</span>
                   </button>
                 </div>
              );
            case "EM_MANUTENCAO":
              return (
                 <div className="space-y-3">
                   <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                     Equipamento atualmente em reparo na bancada. Após concluir o serviço, registre o laudo técnico e indique que está pronto.
                   </p>
                   <StressTestWidget os={selectedOS} onStartStress={handleStartStressTest} />
                   <button type="button" onClick={(e) => saveAndMove(e, "PRONTO_RETIRADA")} className="w-full py-3 mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2 active:scale-95">
                     <span className="material-symbols-outlined text-[18px]">check_circle</span>
                     <span>Concluir Reparo (Pronto p/ Retirada)</span>
                   </button>
                 </div>
              );
            case "PRONTO_RETIRADA":
              return (
                 <div className="space-y-3">
                   <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                     O equipamento está consertado e pronto! Aguardando o cliente vir retirar. Ao entregar o equipamento, você pode imprimir o recibo e fechar a OS.
                   </p>
                   <button type="button" onClick={() => handlePrintRecibo(selectedOS)} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition flex items-center justify-center space-x-2 shadow-sm active:scale-95">
                     <span className="material-symbols-outlined text-[18px]">print</span>
                     <span>Imprimir Recibo de Entrega</span>
                   </button>
                   <button type="button" onClick={(e) => saveAndMove(e, "FINALIZADO")} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2 active:scale-95">
                     <span className="material-symbols-outlined text-[18px]">task_alt</span>
                     <span>Entregar ao Cliente (Finalizar OS)</span>
                   </button>
                 </div>
              );
            case "FINALIZADO":
              return (
                 <div className="space-y-3">
                   <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col items-center justify-center text-center text-emerald-800 space-y-2 mb-4">
                     <span className="material-symbols-outlined text-3xl">verified</span>
                     <p className="text-xs font-bold">Ordem de Serviço Concluída e Fechada!</p>
                   </div>
                   <button type="button" onClick={() => handlePrintRecibo(selectedOS)} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition flex items-center justify-center space-x-2 shadow-sm active:scale-95">
                     <span className="material-symbols-outlined text-[18px]">print</span>
                     <span>Imprimir Recibo Novamente</span>
                   </button>
                 </div>
              );
            default:
              return null;
          }
        };

        return (
        <div className={`fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto ${isFeatureEnabled("PIPEFY_SPLIT_MODAL") ? "md:p-8" : ""}`}>
          <div className={`bg-white rounded-2xl shadow-2xl border border-slate-200 w-full overflow-hidden flex anim-slideup ${isFeatureEnabled("PIPEFY_SPLIT_MODAL") ? "max-w-7xl md:h-[90vh] flex-col md:flex-row" : "max-w-2xl max-h-[95vh] flex-col"}`}>
            
            {/* Lado Esquerdo (Ou layout inteiro caso Pipefy inativo) */}
            <div className={`flex flex-col h-full overflow-hidden ${isFeatureEnabled("PIPEFY_SPLIT_MODAL") ? "w-full md:w-7/12 border-r border-slate-200 bg-white" : "w-full"}`}>
            
            {/* Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between sticky top-0 z-15 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <span className="material-symbols-outlined text-[20px] text-teal-400 shrink-0">handyman</span>
                <h3 className="font-bold text-base font-display">Prancheta do Técnico - {selectedOS.osNumber}</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-450 hover:text-white transition">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Custom Tab Selection Controls for visual clean segmentation */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 py-2 gap-2">
              <button 
                type="button" 
                onClick={() => setModalTab("laudo")}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all duration-200 active:scale-95 ${
                  modalTab === "laudo" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                1. Laudo & Mão de Obra
              </button>
              <button 
                type="button" 
                onClick={() => setModalTab("pecas")}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all duration-200 active:scale-95 ${
                  modalTab === "pecas" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                2. Substituição de Peças
              </button>
              <button 
                type="button" 
                onClick={() => setModalTab("entrada")}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all duration-200 active:scale-95 ${
                  modalTab === "entrada" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                3. Laudo & Checklist de Entrada
              </button>
              {isFeatureEnabled("CHECKLIST_SAIDA") && (
                <button 
                  type="button" 
                  onClick={() => setModalTab("saida")}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all duration-200 active:scale-95 ${
                    modalTab === "saida" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  4. Checklist de Saída
                </button>
              )}
              {isFeatureEnabled("WHATSAPP_AUTO_MESSAGES") && (
                <button 
                  type="button" 
                  onClick={() => setModalTab("whatsapp" as any)}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all duration-200 active:scale-95 ${
                    modalTab === ("whatsapp" as any) ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  {isFeatureEnabled("CHECKLIST_SAIDA") ? "5. WhatsApp" : "4. WhatsApp"}
                </button>
              )}
            </div>

            {/* Inner Content */}
            <form onSubmit={handleSaveOSDetails} className="p-6 space-y-6 flex-1 overflow-y-auto bg-slate-50/30">
              {errorMsg && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3.5 rounded-xl text-xs text-red-700 font-semibold border border-red-200/30">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3.5 rounded-xl text-xs text-emerald-700 font-semibold border border-emerald-200/30">
                  {successMsg}
                </div>
              )}

              {/* Status information banner */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs select-text">
                <p><span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Cliente proprietário</span> <strong className="text-slate-800 text-sm mt-0.5 block">{(selectedOS as any).client?.name}</strong></p>
                <p><span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Dispositivo em conserto</span> <strong className="text-slate-800 text-sm mt-0.5 block">{(selectedOS as any).device?.type} {(selectedOS as any).device?.brand} ({(selectedOS as any).device?.model})</strong></p>
                {(selectedOS as any).tags && (selectedOS as any).tags.length > 0 && (
                  <p className="sm:col-span-2 border-t border-slate-100 pt-2">
                    <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block mb-1.5">Etiquetas</span>
                    <span className="flex flex-wrap gap-1.5">
                      {(selectedOS as any).tags.map((tag: any) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md text-white shadow-sm"
                          style={{ backgroundColor: tag.colorHex }}
                          title={tag.description || `Etiqueta: ${tag.name}`}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </span>
                  </p>
                )}
                <p className="sm:col-span-2 border-t border-slate-100 pt-2"><span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Sintoma Narrado pelo Solicitante</span> <span className="text-slate-600 italic block mt-1 font-mono">"{(selectedOS as any).reportedDefect}"</span></p>
                {(selectedOS as any).accessoriesLeft && (
                  <p className="border-t border-slate-100 pt-2"><span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Acessórios Deixados</span> <span className="text-slate-700 font-semibold block mt-0.5 font-mono">{(selectedOS as any).accessoriesLeft}</span></p>
                )}
                {(selectedOS as any).physicalState && (
                  <p className="border-t border-slate-100 pt-2"><span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Estado Físico / Balcão</span> <span className="text-slate-700 font-semibold block mt-0.5 font-mono">{(selectedOS as any).physicalState}</span></p>
                )}
              </div>

              {/* Widget de Teste de Estresse para Garantia */}
              <StressTestWidget 
                os={selectedOS} 
                onStartStress={handleStartStressTest} 
              />

              {/* TAB 1: LAUDO & CUSTOS */}
              {modalTab === "laudo" && (
                <div className="space-y-5 anim-fadein">
                  {/* Etiquetas da OS (editáveis em qualquer etapa do fluxo) */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-indigo-500">sell</span>
                        Etiquetas da OS
                      </label>
                      <span className="text-[9px] text-slate-400 font-semibold">salvas junto com o rascunho</span>
                    </div>
                    <TagSelector selectedTagIds={editTagIds} onChange={setEditTagIds} scope="ORDEM_SERVICO" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Diagnóstico Pericial Técnico *</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Escreva quais testes foram executados, qual a anomalia detectada fisicamente na placa ou sistema, e as ações de reparo recomendadas."
                      value={diagnostic}
                      onChange={(e) => setDiagnostic(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Laudo Comercial (Visível no Portal do Cliente)</label>
                    <textarea
                      rows={3}
                      placeholder="Escreva um resumo simplificado do diagnóstico e reparo que será exibido publicamente para o cliente no portal de acompanhamento."
                      value={laudoMacro}
                      onChange={(e) => setLaudoMacro(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition"
                    />
                  </div>

                  {/* Handoff / Logística */}
                  <div className="bg-rose-50/50 border border-rose-200/60 rounded-xl p-4 space-y-3">
                    <h4 className="text-[10px] font-bold text-rose-600 uppercase tracking-widest flex items-center gap-1.5 border-b border-rose-200/50 pb-2">
                      <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                      Logística e Handoff (Recepção)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Local / Prateleira</label>
                        <input
                          type="text"
                          placeholder="Ex: P2-A, Bancada 1"
                          value={benchLocation}
                          onChange={(e) => setBenchLocation(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition font-mono uppercase font-bold text-rose-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Método de Retorno</label>
                        <select
                          value={returnMethod}
                          onChange={(e) => setReturnMethod(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                        >
                          <option value="">Selecione...</option>
                          <option value="RETIRADA_BALCAO">Retirada no Balcão</option>
                          <option value="CORREIOS">Correios / Transportadora</option>
                          <option value="MOTOBOY">Motoboy</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-2 pt-5">
                        <input 
                          type="checkbox"
                          id="chkLimpeza"
                          checked={packagingCleaned}
                          onChange={(e) => setPackagingCleaned(e.target.checked)}
                          className="w-4 h-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500"
                        />
                        <label htmlFor="chkLimpeza" className="text-[10px] font-bold text-slate-700 cursor-pointer select-none">
                          Higienizado para Entrega?
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Valor da Mão de Obra (R$)</label>
                      <div className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-650 font-mono font-bold select-text shadow-inner">
                        R$ {computedLaborCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <p className="text-[10px] text-slate-450 mt-1.5 font-semibold">Calculado automaticamente a partir dos serviços lançados.</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Desconto Aplicado (R$)</label>
                      <input
                        type="number"
                        min={0}
                        value={discount}
                        onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-red-600 focus:ring-2 focus:ring-red-500/10 focus:border-red-500 focus:outline-none transition"
                      />
                    </div>

                    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-4 flex flex-col justify-center items-end text-right border border-slate-850 shadow-md select-text sm:col-span-2">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-indigo-300">Total do Conserto</span>
                      <p className="text-2xl font-mono font-bold text-white mt-1">
                        R$ {computedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 font-semibold">Mão de Obra + Peças - Desconto</span>
                    </div>
                  </div>

                  {/* Resumo de Peças e Serviços Lançados */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 space-y-3 shadow-xs mt-4">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200/60 pb-2 flex items-center space-x-1.5">
                      <span className="material-symbols-outlined text-[18px] text-indigo-600 shrink-0">handyman</span>
                      <span>Resumo de Itens Lançados (Peças e Serviços)</span>
                    </h4>
                    {selectedParts.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">Nenhum item (peça ou serviço) lançado para esta OS.</p>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {selectedParts.map((item) => (
                          <div key={item.id || item.partId} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-150 text-[11px]">
                            <div className="flex items-center space-x-2.5">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase border ${
                                item.category === "SERVICO" 
                                  ? "bg-purple-50 text-purple-700 border-purple-200" 
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}>
                                {item.category === "SERVICO" ? "Serviço" : "Peça"}
                              </span>
                              <span className="font-bold text-slate-800">{item.name}</span>
                              <span className="text-slate-450 font-semibold">({item.quantity}x)</span>
                            </div>
                            <span className="font-mono font-bold text-slate-900">
                              R$ {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: PEÇAS E ALMOXARIFADO */}
              {modalTab === "pecas" && (
                <div className="space-y-5 anim-fadein">
                  <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-4 shadow-sm">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center space-x-1.5">
                      <span className="material-symbols-outlined text-[18px] text-purple-600 shrink-0">inventory_2</span>
                      <span>Substituição de Peças & Peças Utilizadas</span>
                    </h4>

                    <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={handleOpenPartSearchModal}
                        className="bg-blue-600 text-white font-extrabold text-[11px] uppercase tracking-wider px-5 py-2.5 h-[38px] rounded-lg hover:bg-blue-500 active:bg-blue-700 transition duration-150 shrink-0 flex items-center gap-1.5 shadow-sm hover:shadow active:scale-[0.98]"
                      >
                        <span className="material-symbols-outlined text-[18px]">search</span>
                        <span>Adicionar Item do Estoque</span>
                      </button>

                      {isAvulsoEnabled && (
                        <button
                          type="button"
                          onClick={() => setIsAddingAvulso(true)}
                          className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-[11px] uppercase tracking-wider px-4 py-2.5 h-[38px] rounded-lg hover:bg-indigo-100 transition duration-150 shrink-0 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[18px]">add</span> Item Avulso
                        </button>
                      )}
                    </div>

                    {isAvulsoEnabled && isAddingAvulso && (
                      <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200 space-y-3 mt-3 anim-fadein shadow-inner">
                        <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                          <h5 className="text-[11px] font-bold text-indigo-800 uppercase flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">auto_awesome</span> Novo Item Avulso (Apenas nesta OS)
                          </h5>
                          <button type="button" onClick={() => setIsAddingAvulso(false)} className="text-slate-400 hover:text-slate-600">
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">Tipo</label>
                            <select value={avulsoCategory} onChange={(e) => setAvulsoCategory(e.target.value as AvulsoCategory)} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs">
                              <option value="PECA">Peça</option>
                              <option value="SERVICO">Serviço</option>
                              <option value="TAXA">Taxa</option>
                              <option value="FRETE">Frete</option>
                              <option value="DESCONTO">Desconto</option>
                              <option value="OUTROS">Outros</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">Descrição</label>
                            <input required type="text" value={avulsoName} onChange={(e) => setAvulsoName(e.target.value)} placeholder="Ex: Mangueira hidráulica 3/8" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                          </div>
                          <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">Qtd</label>
                              <input required type="number" min={1} value={avulsoQty} onChange={(e) => setAvulsoQty(Math.max(1, Number(e.target.value)))} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">Valor Venda (R$)</label>
                              <input required type="number" min={0} step="0.01" value={avulsoPrice} onChange={(e) => setAvulsoPrice(Math.max(0, Number(e.target.value)))} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">Custo (Opcional)</label>
                              <input type="number" min={0} step="0.01" value={avulsoCost} onChange={(e) => setAvulsoCost(Math.max(0, Number(e.target.value)))} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                            </div>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">Observação</label>
                            <input type="text" value={avulsoObs} onChange={(e) => setAvulsoObs(e.target.value)} placeholder="Ex: Comprado especificamente para esta OS" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                          </div>
                        </div>
                        
                        <div className="flex justify-end pt-2">
                          <button type="button" onClick={(e) => handleAddAvulsoToOS(e as any)} className="bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-indigo-700 transition">Adicionar Item à OS</button>
                        </div>
                      </div>
                    )}

                    {/* Used pieces summary list */}
                    {selectedParts.length === 0 ? (
                      <p className="text-xs text-slate-400 italic font-mono p-4 text-center">Nenhuma peça cadastrada para reposição nesta OS.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedParts.map((p) => {
                          const partDef = parts.find(pd => pd.id === p.partId);
                          const needsSerial = partDef?.requiresSerial;
                          return (
                            <div key={p.partId || p.id} className={`text-xs bg-slate-50 p-2.5 rounded-lg border transition duration-150 ${needsSerial && (!p.serialNumber || p.serialNumber.trim() === "") ? "border-violet-400 bg-violet-50/30" : "border-slate-200 hover:border-slate-350"}`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  {p.isAvulso ? (
                                    <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-md mr-2 uppercase tracking-wider inline-flex items-center" title="Item existe apenas nesta OS"><span className="material-symbols-outlined text-[10px] mr-0.5">auto_awesome</span> Avulso</span>
                                  ) : (
                                    <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded-md mr-2 uppercase tracking-wider inline-flex items-center" title="Baixa no estoque automático"><span className="material-symbols-outlined text-[10px] mr-0.5">inventory_2</span> Estoque</span>
                                  )}
                                  <span className="font-bold text-slate-850">{p.name}</span>
                                  {p.isAvulso && p.category && <span className="ml-1 text-[10px] text-slate-500 font-medium font-mono">({p.category})</span>}
                                  <div className="inline-flex items-center gap-1.5 ml-1">
                                    <input 
                                      type="number" 
                                      min={1} 
                                      value={p.quantity} 
                                      onChange={(e) => {
                                        const qty = Math.max(1, Number(e.target.value));
                                        const updated = selectedParts.map(sp => 
                                          (sp.partId === p.partId || sp.id === p.id) ? { ...sp, quantity: qty } : sp
                                        );
                                        setSelectedParts(updated);
                                      }}
                                      className="w-10 px-1 py-0.5 border border-slate-200 rounded text-center text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-semibold"
                                      title="Editar Quantidade"
                                    />
                                    <span className="text-slate-400 text-[10px]">x</span>
                                    <span className="text-slate-500 text-[10px] font-semibold">R$</span>
                                    <input 
                                      type="number" 
                                      min={0} 
                                      step="0.01" 
                                      value={p.price} 
                                      onChange={(e) => {
                                        const prc = Math.max(0, Number(e.target.value));
                                        const updated = selectedParts.map(sp => 
                                          (sp.partId === p.partId || sp.id === p.id) ? { ...sp, price: prc } : sp
                                        );
                                        setSelectedParts(updated);
                                      }}
                                      className="w-16 px-1 py-0.5 border border-slate-200 rounded text-right text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-semibold"
                                      title="Editar Preço Unitário"
                                    />
                                  </div>
                                  {p.observation && <span className="block mt-1 text-[10px] italic text-slate-500">Nota: {p.observation}</span>}
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span className="font-bold text-slate-900 font-mono">
                                    R$ {(p.price * p.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                  {p.isAvulso && (
                                    <button
                                      type="button"
                                      onClick={() => handlePromoteToStock(p)}
                                      className="text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2 py-1 rounded-lg font-bold transition flex items-center gap-1"
                                      title="Criar como Produto no Estoque"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">save</span> Salvar no Estoque
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePartFromOS(p.partId || p.id || "")}
                                    className="text-red-500 hover:text-red-700 transition ml-2"
                                    title="Remover peça da OS"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                  </button>
                                </div>
                              </div>
                              {needsSerial && (
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="material-symbols-outlined text-violet-600 text-[14px]">qr_code_2</span>
                                  <input
                                    type="text"
                                    placeholder="Nº de Série obrigatório para esta peça"
                                    value={p.serialNumber || ""}
                                    onChange={(e) => {
                                      const updated = selectedParts.map(sp =>
                                        sp.partId === p.partId ? { ...sp, serialNumber: e.target.value } : sp
                                      );
                                      setSelectedParts(updated);
                                    }}
                                    className={`flex-1 px-2.5 py-1.5 text-[11px] rounded-lg border focus:outline-none focus:ring-2 transition ${
                                      p.serialNumber && p.serialNumber.trim() !== ""
                                        ? "border-emerald-300 bg-emerald-50/50 focus:ring-emerald-500/30"
                                        : "border-violet-300 bg-violet-50 focus:ring-violet-500/30"
                                    }`}
                                  />
                                  {p.serialNumber && p.serialNumber.trim() !== "" ? (
                                    <span className="material-symbols-outlined text-emerald-600 text-[14px]">check_circle</span>
                                  ) : (
                                    <span className="text-[9px] text-violet-600 font-bold uppercase">Obrigatório</span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: CHECKLIST E FOTOS DE ENTRADA */}
              {modalTab === "entrada" && (
                <div className="space-y-6 anim-fadein text-xs">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-display">
                      <span className="material-symbols-outlined text-[18px] text-indigo-650">fact_check</span>
                      <span>Checklist e Fotos de Entrada</span>
                    </h4>
                    {!isEditingEntrada && selectedOS.status !== "FINALIZADO" && (
                      <button
                        type="button"
                        onClick={() => setIsEditingEntrada(true)}
                        className="text-xs font-extrabold text-indigo-600 hover:text-indigo-850 flex items-center gap-1 cursor-pointer bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg transition"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span> Editar Laudo
                      </button>
                    )}
                    {isEditingEntrada && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditChecklist(selectedOS.checklistEntrada && selectedOS.checklistEntrada.length > 0 ? selectedOS.checklistEntrada : []);
                          setEditPhotos(selectedOS.laudoFotos || []);
                          setIsEditingEntrada(false);
                        }}
                        className="text-xs font-extrabold text-slate-600 hover:text-slate-850 flex items-center gap-1 cursor-pointer bg-slate-100 border border-slate-250 px-3 py-1.5 rounded-lg transition"
                      >
                        Cancelar Edição
                      </button>
                    )}
                  </div>

                  {isEditingEntrada ? (
                    /* EDITING MODE */
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Acessórios Deixados</label>
                          <input
                            type="text"
                            value={editAccessoriesLeft}
                            onChange={(e) => setEditAccessoriesLeft(e.target.value)}
                            placeholder="Ex: Cabo de força, ponteira"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Estado Físico / Balcão</label>
                          <input
                            type="text"
                            value={editPhysicalState}
                            onChange={(e) => setEditPhysicalState(e.target.value)}
                            placeholder="Ex: Riscado na lateral, marcas de uso"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Checklist Section */}
                        <div className="space-y-4">
                        <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Checklist de Entrada</h5>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 max-h-[350px] overflow-y-auto pr-2">
                          {editChecklist.map((item, idx) => (
                            <div key={item.id} className="flex flex-col border-b border-slate-200/50 pb-2.5 last:border-0 last:pb-0 gap-2">
                              <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="inline-flex rounded-lg border border-slate-205 bg-white p-0.5 shrink-0">
                                  {(["OK", "AVARIA", "NA"] as const).map((status) => {
                                    let activeClass = "";
                                    if (item.status === status) {
                                      if (status === "OK") activeClass = "bg-emerald-500 text-white shadow-sm font-bold";
                                      else if (status === "AVARIA") activeClass = "bg-rose-500 text-white shadow-sm font-bold";
                                      else activeClass = "bg-slate-500 text-white shadow-sm font-bold";
                                    } else {
                                      activeClass = "text-slate-600 hover:bg-slate-100";
                                    }
                                    return (
                                      <button
                                        key={status}
                                        type="button"
                                        onClick={() => {
                                          const updated = [...editChecklist];
                                          updated[idx].status = status;
                                          if (status !== "AVARIA") {
                                            updated[idx].observacao = "";
                                          }
                                          setEditChecklist(updated);
                                        }}
                                        className={`px-3 py-1 text-[10px] rounded-md transition-all cursor-pointer ${activeClass}`}
                                      >
                                        {status === "OK" ? "OK" : status === "AVARIA" ? "Avaria" : "N/A"}
                                      </button>
                                    );
                                  })}
                                </div>
                                {item.status === "AVARIA" && (
                                  <input
                                    type="text"
                                    placeholder="Descrição da avaria..."
                                    value={item.observacao || ""}
                                    onChange={(e) => {
                                      const updated = [...editChecklist];
                                      updated[idx].observacao = e.target.value;
                                      setEditChecklist(updated);
                                    }}
                                    className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 w-full sm:w-48"
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Photos Section */}
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fotos (Máx 6)</h5>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-semibold">{editPhotos.length} de 6 fotos anexadas</span>
                            {editPhotos.length < 6 && (
                              <>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={handleModalPhotoUpload}
                                  className="hidden"
                                  id="modal-checklist-photo-upload"
                                />
                                <label
                                  htmlFor="modal-checklist-photo-upload"
                                  className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-650 hover:bg-indigo-100 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border border-indigo-150 shadow-sm"
                                >
                                  <span className="material-symbols-outlined text-[16px]">upload</span>
                                  <span>Adicionar Fotos</span>
                                </label>
                              </>
                            )}
                          </div>

                          {editPhotos.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                              {editPhotos.map((p, pIdx) => (
                                <div key={p.id} className="relative bg-white border border-slate-200 rounded-xl p-2 flex flex-col group hover:shadow-sm transition">
                                  <img src={p.dataUrl} alt={`Laudo ${pIdx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                                  <button
                                    type="button"
                                    onClick={() => setEditPhotos((prev) => prev.filter((ph) => ph.id !== p.id))}
                                    className="absolute top-2 right-2 bg-rose-600/90 text-white w-5 h-5 rounded-full flex items-center justify-center hover:bg-rose-700 transition"
                                    title="Remover foto"
                                  >
                                    <span className="material-symbols-outlined text-[12px]">close</span>
                                  </button>
                                  <input
                                    type="text"
                                    placeholder="Descreva a foto (opcional)"
                                    value={p.legenda || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEditPhotos((prev) => prev.map((ph) => ph.id === p.id ? { ...ph, legenda: val } : ph));
                                    }}
                                    className="mt-2 w-full px-2 py-1 text-[10px] border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl">
                              <span className="material-symbols-outlined text-[24px] text-slate-350 mx-auto mb-1.5 block">add_a_photo</span>
                              <p className="text-[10px] font-bold">Nenhuma foto adicionada</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  ) : (
                    /* VIEW-ONLY MODE */
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200/85">
                        <div>
                          <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Acessórios Deixados</span>
                          <span className="text-slate-700 font-semibold block mt-1 font-mono text-xs">{editAccessoriesLeft || "Nenhum acessório registrado"}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Estado Físico / Balcão</span>
                          <span className="text-slate-700 font-semibold block mt-1 font-mono text-xs">{editPhysicalState || "Nenhum estado registrado"}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50/50 p-4 rounded-xl border border-slate-200/80">
                        {/* Checklist Summary */}
                        <div className="space-y-4">
                        <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estado Conferido na Entrada</h5>
                        <div className="grid grid-cols-1 gap-2.5 max-h-[400px] overflow-y-auto pr-1">
                          {editChecklist.map((item) => (
                            <div key={item.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2.5">
                              <div>
                                <span className="font-bold text-slate-800 block text-xs">{item.label}</span>
                                {item.observacao && <span className="text-[10px] text-slate-500 italic block mt-0.5">{item.observacao}</span>}
                              </div>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                item.status === "OK" 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                  : item.status === "AVARIA" 
                                    ? "bg-rose-50 text-rose-700 border-rose-200 font-extrabold" 
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}>
                                {item.status === "OK" ? "OK" : item.status === "AVARIA" ? "AVARIA" : "N/A"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Photos Gallery */}
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fotos do Laudo</h5>
                        {editPhotos.length > 0 ? (
                          <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                            {editPhotos.map((p, pIdx) => (
                              <div 
                                key={p.id} 
                                onClick={() => setLightboxPhoto(p)}
                                className="bg-white border border-slate-200 rounded-xl p-1.5 cursor-pointer hover:border-indigo-500 transition hover:shadow-sm"
                              >
                                <img src={p.dataUrl} alt={`Foto ${pIdx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                                {p.legenda && <p className="text-[9px] text-slate-500 font-medium truncate mt-1 text-center">{p.legenda}</p>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl">
                            <span className="material-symbols-outlined text-[32px] text-slate-300 mx-auto mb-1.5 block">image</span>
                            <p className="text-xs font-semibold">Sem fotos anexadas</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              )}

              {/* TAB: CHECKLIST DE SAÍDA */}
              {modalTab === "saida" && (
                <div className="space-y-6 anim-fadein text-xs">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-display">
                      <span className="material-symbols-outlined text-[18px] text-indigo-650">fact_check</span>
                      <span>Checklist de Controle de Qualidade de Saída</span>
                    </h4>
                    {!isEditingSaida && selectedOS.status !== "FINALIZADO" && (
                      <button
                        type="button"
                        onClick={() => setIsEditingSaida(true)}
                        className="text-xs font-extrabold text-indigo-600 hover:text-indigo-850 flex items-center gap-1 cursor-pointer bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg transition"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span> Editar Checklist
                      </button>
                    )}
                    {isEditingSaida && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditChecklistSaida(selectedOS.checklistSaida && selectedOS.checklistSaida.length > 0 ? selectedOS.checklistSaida : []);
                            setIsEditingSaida(false);
                          }}
                          className="text-xs font-extrabold text-slate-600 hover:text-slate-850 flex items-center gap-1 cursor-pointer bg-slate-100 border border-slate-250 px-3 py-1.5 rounded-lg transition"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveChecklistSaida}
                          className="text-xs font-extrabold text-white hover:bg-emerald-700 flex items-center gap-1 cursor-pointer bg-emerald-600 border border-emerald-500 px-3 py-1.5 rounded-lg transition"
                        >
                          Salvar Alterações
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditingSaida ? (
                    /* EDITING MODE FOR EXIT CHECKLIST */
                    <div className="space-y-4 max-w-xl">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 max-h-[350px] overflow-y-auto">
                        {editChecklistSaida.map((item, idx) => (
                          <div key={item.id} className="flex flex-col border-b border-slate-200/50 pb-2.5 last:border-0 last:pb-0 gap-2">
                            <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shrink-0">
                                {(["OK", "AVARIA", "NA"] as const).map((status) => {
                                  let activeClass = "";
                                  if (item.status === status) {
                                    if (status === "OK") activeClass = "bg-emerald-500 text-white shadow-sm font-bold";
                                    else if (status === "AVARIA") activeClass = "bg-rose-500 text-white shadow-sm font-bold";
                                    else activeClass = "bg-slate-500 text-white shadow-sm font-bold";
                                  } else {
                                    activeClass = "text-slate-600 hover:bg-slate-100";
                                  }
                                  return (
                                    <button
                                      key={status}
                                      type="button"
                                      onClick={() => {
                                        const updated = [...editChecklistSaida];
                                        updated[idx].status = status;
                                        if (status !== "AVARIA") {
                                          updated[idx].observacao = "";
                                        }
                                        setEditChecklistSaida(updated);
                                      }}
                                      className={`px-3 py-1 text-[10px] rounded-md transition-all cursor-pointer ${activeClass}`}
                                    >
                                      {status === "OK" ? "OK" : status === "AVARIA" ? "Avaria" : "N/A"}
                                    </button>
                                  );
                                })}
                              </div>
                              {item.status === "AVARIA" && (
                                <input
                                  type="text"
                                  placeholder="Descreva a avaria observada..."
                                  value={item.observacao || ""}
                                  onChange={(e) => {
                                    const updated = [...editChecklistSaida];
                                    updated[idx].observacao = e.target.value;
                                    setEditChecklistSaida(updated);
                                  }}
                                  className="flex-1 min-w-[200px] px-2.5 py-1 text-[11px] border border-rose-300 bg-rose-50/20 text-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* VIEW MODE */
                    <div className="space-y-4 max-w-xl">
                      {editChecklistSaida.length === 0 ? (
                        <p className="text-slate-500 italic">Nenhum checklist de saída configurado para este equipamento.</p>
                      ) : (
                        <div className="bg-white rounded-xl border border-slate-200/80 p-4.5 shadow-sm space-y-2">
                          {editChecklistSaida.map((item) => (
                            <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 last:pb-0">
                              <span className="font-semibold text-slate-700">{item.label}</span>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                                  item.status === "OK" ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
                                  item.status === "AVARIA" ? "text-rose-700 bg-rose-50 border-rose-200" :
                                  "text-slate-500 bg-slate-100 border-slate-200"
                                }`}>
                                  {item.status === "OK" ? "OK" : item.status === "AVARIA" ? "Avaria" : "N/A"}
                                </span>
                                {item.status === "AVARIA" && item.observacao && (
                                  <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg font-medium max-w-[200px] truncate" title={item.observacao}>
                                    {item.observacao}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: WHATSAPP AUTOMATION PANEL */}
              {modalTab === ("whatsapp" as any) && (
                <OSWhatsAppPanel
                  orderId={selectedOS.id}
                  clientPhone={(selectedOS as any).client?.phone || ""}
                  clientName={(selectedOS as any).client?.name || ""}
                  osNumber={selectedOS.osNumber}
                  deviceModel={(selectedOS as any).device?.model || ""}
                  deviceBrand={(selectedOS as any).device?.brand || ""}
                  totalCost={computedTotal}
                  onPrintPDF={() => handlePrintRecibo(selectedOS)}
                />
              )}

              {/* Bling Transition reminder */}
              {selectedOS.status === "PRONTO_RETIRADA" && (
                <div className="bg-blue-50 border border-blue-200/60 rounded-xl p-3.5 text-xs text-blue-800 flex items-start space-x-2.5 font-semibold leading-relaxed shadow-sm">
                  <span className="material-symbols-outlined text-[16px] text-blue-600 shrink-0 mt-0.5">schedule</span>
                  <span>
                    <strong>INFORMAÇÃO FISCAL:</strong> Mudar o status dessa OS para <strong>"Finalizado"</strong> na tela de Kanban integrará os dados automaticamente com a API V3 da Bling para emissão síncrona da nota DANFE.
                  </span>
                </div>
              )}

              {selectedOS.status === "FINALIZADO" && selectedOS.billingStatus === "PROCESSANDO" && (
                <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3.5 text-xs text-amber-800 flex items-center space-x-3 font-semibold shadow-sm">
                  <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
                  <span>Enviando dados para o Bling e gerando Nota Fiscal... (Aguarde alguns segundos e atualize a tela)</span>
                </div>
              )}

              {selectedOS.status === "FINALIZADO" && selectedOS.billingStatus === "REJEITADO" && (
                <div className="bg-red-50 border border-red-200/60 rounded-xl p-3.5 text-xs text-red-800 flex flex-col space-y-2 font-semibold shadow-sm">
                  <div className="flex items-center space-x-2">
                    <span className="material-symbols-outlined text-[16px] text-red-600">error</span>
                    <span>Falha na integração com o Bling ou SEFAZ.</span>
                  </div>
                  <p className="font-mono text-[10px] text-red-600 bg-red-100 p-2 rounded">{selectedOS.sefazErrorMessage || "Erro desconhecido."}</p>
                  <button
                    type="button"
                    onClick={() => handleStatusChangeBtn(selectedOS.id, "FINALIZADO")} // Dispara novamente ao alterar status
                    className="self-start text-[10px] bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition mt-1 uppercase tracking-wider"
                  >
                    Tentar Novamente
                  </button>
                </div>
              )}

              {selectedOS.status === "FINALIZADO" && selectedOS.billingStatus === "FATURADO" && (
                <div className="bg-emerald-50 border border-emerald-200/60 rounded-xl p-3.5 text-xs text-emerald-800 flex flex-col space-y-2 font-semibold shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                      <span>Integração concluída com sucesso.</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        onNavigateToBlingPanel();
                      }}
                      className="bg-emerald-650 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[9px] uppercase font-mono tracking-wider transition shadow-sm"
                    >
                      Painel Bling
                    </button>
                  </div>
                  <p className="font-mono text-[10px] text-emerald-700 bg-emerald-100 p-2 rounded">
                    Pedido: {selectedOS.blingId || "N/A"}<br/>
                    {selectedOS.sefazErrorMessage && selectedOS.sefazErrorMessage.includes("rejeitada") ? (
                      <span className="text-red-600">Alerta de NF: {selectedOS.sefazErrorMessage}</span>
                    ) : (
                      <span>NF-e: {selectedOS.sefazErrorMessage || "Em processamento ou não gerada."}</span>
                    )}
                  </p>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-4">
                {/* Logical deletion block with Owner Check */}
                <button
                  type="button"
                  onClick={handleDeleteOS}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold ${
                    userRole === UserRole.OWNER
                      ? "text-red-700 bg-red-50 hover:bg-red-100 border border-red-200"
                      : "text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed"
                  }`}
                  disabled={userRole !== UserRole.OWNER}
                  title={userRole !== UserRole.OWNER ? "Somente OWNER pode arquivar uma OS" : "Mudar coluna deletedAt no Supabase (Soft Delete)"}
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  <span>Excluir OS (Soft Delete)</span>
                </button>

                <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => handlePrintTermo(selectedOS)}
                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                    title="Imprimir Termo de Recebimento"
                  >
                    <span className="material-symbols-outlined text-[16px]">assignment</span>
                    <span>Imprimir Termo de Recebimento</span>
                  </button>
                  {selectedOS.status === "PRONTO_RETIRADA" || selectedOS.status === "FINALIZADO" ? (
                    <button
                      type="button"
                      onClick={() => handlePrintRecibo(selectedOS)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white font-bold text-sm rounded-lg transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">print</span>
                      <span>Imprimir Recibo & Garantia</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePrintRecibo(selectedOS)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white font-bold text-sm rounded-lg transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">print</span>
                      <span>Imprimir Orçamento</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 flex-1 sm:flex-none transition"
                  >
                    Fechar
                  </button>
                  {modalTab === "entrada" ? (
                    selectedOS.status !== "FINALIZADO" && isEditingEntrada && (
                      <button
                        type="button"
                        onClick={handleSaveLaudoFotos}
                        disabled={loading}
                        className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-lg flex-1 sm:flex-none transition shadow-sm hover-premium active-premium"
                      >
                        {loading ? "Salvando..." : "Salvar Entrada"}
                      </button>
                    )
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2 bg-blue-650 hover:bg-blue-700 text-white font-extrabold text-sm rounded-lg flex-1 sm:flex-none transition shadow-sm hover-premium active-premium"
                    >
                      {loading ? "Salvando..." : "Salvar Gravações"}
                    </button>
                  )}
                </div>
              </div>
            </form>
            </div>

            {/* Lado Direito - Motor de Ação (Apenas se Pipefy ativo) */}
            {isFeatureEnabled("PIPEFY_SPLIT_MODAL") && (
              <div className="w-full md:w-5/12 bg-slate-50 flex flex-col relative h-full">
                <div className="p-4 flex justify-end absolute right-0 top-0 hidden md:block">
                  <button type="button" onClick={() => setShowEditModal(false)} className="text-slate-450 hover:text-slate-700 transition bg-white border border-slate-200 w-8 h-8 rounded-full flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto mt-0 md:mt-12">
                   <div className="flex items-center space-x-3 mb-6">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Fase Atual</span>
                      <span className={`text-[11px] font-bold px-3 py-1.5 rounded-md border ${selectedOS.status === 'AGUARDANDO_AVALIACAO' ? 'bg-slate-100 text-slate-800 border-slate-200' : selectedOS.status === 'AGUARDANDO_AUTORIZACAO' ? 'bg-blue-100 text-blue-800 border-blue-200' : selectedOS.status === 'AGUARDANDO_PECA' ? 'bg-amber-100 text-amber-800 border-amber-200' : selectedOS.status === 'EM_MANUTENCAO' ? 'bg-purple-100 text-purple-800 border-purple-200' : selectedOS.status === 'PRONTO_RETIRADA' ? 'bg-teal-100 text-teal-800 border-teal-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>{([...TECNICO_COLUMNS, ...RECEPCAO_COLUMNS].find(c => c.id === selectedOS.status)?.name) || selectedOS.status}</span>
                   </div>

                   <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                     <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Central de Ação</h3>
                     
                     {renderActionMotor()}
                     
                     <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                       <p className="text-[10px] uppercase font-bold tracking-wider text-indigo-500 mb-1">Custo Total Atual</p>
                       <p className="text-xl font-bold text-indigo-700 font-mono">
                         R$ {computedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                       </p>
                     </div>
                   </div>
                </div>
                
                {selectedOS.status !== "FINALIZADO" && (
                <div className="p-6 bg-white border-t border-slate-200 flex flex-col space-y-3 z-10 shadow-up">
                   <button type="button" onClick={(e) => { e.preventDefault(); handleSaveOSDetails(e as any); }} className="w-full py-3 bg-white border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-700 font-bold rounded-xl shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer active:scale-95">
                     <span className="material-symbols-outlined text-[18px]">save</span>
                     <span>Salvar Alterações (Rascunho)</span>
                   </button>
                </div>
                )}
              </div>
            )}

          </div>
        </div>
        );
      })()}

      {/* MODAL DE BUSCA AVANÇADA DE PEÇAS NO ESTOQUE */}
      {isPartSearchModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm anim-fadein">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Cabeçalho */}
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-[22px] text-blue-400">inventory_2</span>
                <h3 className="font-bold text-base">Adicionar Peças do Estoque</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsPartSearchModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Filtros de Pesquisa */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pesquisar por Nome ou Código:</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <span className="material-symbols-outlined text-[18px]">search</span>
                  </span>
                  <input
                    type="text"
                    value={partSearchQuery}
                    onChange={(e) => setPartSearchQuery(e.target.value)}
                    placeholder="Ex: Teclado, HD, 1024..."
                    className="w-full pl-9 pr-3 py-1.8 text-xs border border-slate-250 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filtrar por Categoria:</label>
                <select
                  value={partSearchCategory}
                  onChange={(e) => setPartSearchCategory(e.target.value)}
                  className="w-full px-3 py-1.8 text-xs border border-slate-250 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                >
                  <option value="">Todas as Categorias</option>
                  {apiCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabela de Resultados */}
            <div className="flex-1 overflow-y-auto p-4 min-h-[250px] relative">
              {isSearchingParts ? (
                <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center z-10">
                  <span className="material-symbols-outlined animate-spin text-[32px] text-blue-600 mb-2">sync</span>
                  <span className="text-xs font-semibold text-slate-600">Buscando peças no estoque completo...</span>
                </div>
              ) : null}

              {(() => {
                const filtered = apiPartsList.filter(p => {
                  const matchesSearch = 
                    p.name.toLowerCase().includes(partSearchQuery.toLowerCase()) ||
                    (p.code && p.code.toLowerCase().includes(partSearchQuery.toLowerCase()));
                  const matchesCategory = !partSearchCategory || (p as any).category === partSearchCategory;
                  return matchesSearch && matchesCategory;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <span className="material-symbols-outlined text-[48px] mb-2 text-slate-300">inventory</span>
                      <p className="text-sm font-semibold">Nenhuma peça encontrada no estoque</p>
                      <p className="text-[11px] mt-0.5">Tente ajustar seus termos de busca ou categoria</p>
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        <th className="py-2 px-3 w-12 text-center">Sel.</th>
                        <th className="py-2 px-3">Peça / Produto</th>
                        <th className="py-2 px-3">Código</th>
                        <th className="py-2 px-3 text-center">Estoque</th>
                        <th className="py-2 px-3 text-right">Valor Venda</th>
                        <th className="py-2 px-3 text-center w-24">Qtd. Adicionar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {filtered.map(p => {
                        const selInfo = selectedPartsInModal[p.id] || { quantity: 1, selected: false };
                        const isSelected = selInfo.selected;
                        const qty = selInfo.quantity;
                        const isOutOfStock = p.stock <= 0;

                        const handleRowCheckbox = (checked: boolean) => {
                          setSelectedPartsInModal(prev => ({
                            ...prev,
                            [p.id]: {
                              selected: checked,
                              quantity: checked ? (prev[p.id]?.quantity || 1) : (prev[p.id]?.quantity || 1)
                            }
                          }));
                        };

                        const handleRowQuantity = (value: number) => {
                          const safeVal = Math.max(1, Math.min(value, p.stock));
                          setSelectedPartsInModal(prev => ({
                            ...prev,
                            [p.id]: {
                              selected: prev[p.id]?.selected || false,
                              quantity: safeVal
                            }
                          }));
                        };

                        return (
                          <tr key={p.id} className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                disabled={isOutOfStock}
                                checked={isSelected}
                                onChange={(e) => handleRowCheckbox(e.target.checked)}
                                className="w-4.5 h-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-800">{p.name}</div>
                              {(p as any).category && <span className="text-[10px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded font-mono">{(p as any).category}</span>}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                              {p.code || "---"}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isOutOfStock ? (
                                <span className="text-[9px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">Sem estoque</span>
                              ) : p.stock <= 2 ? (
                                <span className="text-[9px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">{p.stock} un (Baixo)</span>
                              ) : (
                                <span className="text-[10px] text-slate-600 font-bold">{p.stock} un</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min={1}
                                max={p.stock}
                                disabled={isOutOfStock || !isSelected}
                                value={qty}
                                onChange={(e) => handleRowQuantity(Number(e.target.value))}
                                className="w-full px-2 py-1 border border-slate-200 rounded text-center text-xs disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Rodapé de Ações */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <span className="text-[11px] text-slate-500 font-semibold font-mono">
                {Object.values(selectedPartsInModal).filter(v => (v as any).selected).length} item(ns) selecionado(s)
              </span>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsPartSearchModalOpen(false)}
                  className="px-4 py-2 border border-slate-350 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmModalParts}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shadow-sm"
                >
                  Confirmar e Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {/* Printable Exit Receipt Template */}
      {activePrintOS && (
        <DocumentShell
          template={activePrintTemplate || resolveTemplateForOS(activePrintOS)}
          os={activePrintOS}
          hidden
          dataEmissao={new Date().toISOString()}
        />
      )}

      {/* MODAL DE ENCERRAMENTO SEM REPARO */}
      {showSemReparoModal && semReparoOS && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 anim-scalein">
            
            {/* Header */}
            <div className="flex items-center space-x-2.5 mb-4 text-rose-600 border-b border-slate-100 pb-3">
              <span className="material-symbols-outlined text-[24px]">cancel</span>
              <h3 className="font-extrabold text-lg text-slate-900 font-display">Encerrar OS sem Reparo</h3>
            </div>

            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Você está fechando a **OS {semReparoOS.osNumber}** do cliente **{(semReparoOS as any).client?.name}** sem a realização do conserto. Selecione o motivo operacional abaixo:
            </p>

            {/* Options list */}
            <div className="space-y-3 mb-5">
              {semReparoOS.status === "AGUARDANDO_AUTORIZACAO" && (
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition select-none">
                  <input
                    type="radio"
                    name="closingReason"
                    value="ORCAMENTO_RECUSADO"
                    checked={selectedClosingReason === 'ORCAMENTO_RECUSADO'}
                    onChange={() => setSelectedClosingReason('ORCAMENTO_RECUSADO')}
                    className="mt-1 text-rose-600 focus:ring-rose-500"
                  />
                  <div className="text-xs">
                    <strong className="block font-bold text-slate-900">Orçamento Recusado</strong>
                    <span className="text-slate-500">O cliente optou por não realizar o serviço. Aparelho disponível para retirada.</span>
                  </div>
                </label>
              )}

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition select-none">
                <input
                  type="radio"
                  name="closingReason"
                  value="DESCARTE_CLIENTE_RETIRA"
                  checked={selectedClosingReason === 'DESCARTE_CLIENTE_RETIRA'}
                  onChange={() => setSelectedClosingReason('DESCARTE_CLIENTE_RETIRA')}
                  className="mt-1 text-rose-600 focus:ring-rose-500"
                />
                <div className="text-xs">
                  <strong className="block font-bold text-slate-900">Descarte — Cliente Retira</strong>
                  <span className="text-slate-500">Equipamento considerado inviável. O cliente irá recolher a sucata/aparelho.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition select-none">
                <input
                  type="radio"
                  name="closingReason"
                  value="DESCARTE_OFICINA"
                  checked={selectedClosingReason === 'DESCARTE_OFICINA'}
                  onChange={() => setSelectedClosingReason('DESCARTE_OFICINA')}
                  className="mt-1 text-rose-600 focus:ring-rose-500"
                />
                <div className="text-xs">
                  <strong className="block font-bold text-slate-900">Descarte — Oficina Descarta</strong>
                  <span className="text-slate-500">Equipamento considerado inviável. Cliente autorizou o descarte ecológico pela oficina.</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition select-none">
                <input
                  type="radio"
                  name="closingReason"
                  value="EQUIPAMENTO_SEM_DEFEITO"
                  checked={selectedClosingReason === 'EQUIPAMENTO_SEM_DEFEITO'}
                  onChange={() => setSelectedClosingReason('EQUIPAMENTO_SEM_DEFEITO')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="text-xs">
                  <strong className="block font-bold text-slate-900">Equipamento Sem Defeito</strong>
                  <span className="text-slate-500">Aparelho não apresentou problemas após análise técnica. OS será finalizada sem custo.</span>
                </div>
              </label>
            </div>

            {/* Notification Check */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-6">
              <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={semReparoNotifyWhatsapp}
                  onChange={(e) => setSemReparoNotifyWhatsapp(e.target.checked)}
                  className="rounded border-slate-350 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span>Enviar notificação automática de encerramento via WhatsApp</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button 
                onClick={() => {
                  setShowSemReparoModal(false);
                  setSemReparoOS(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold text-xs hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  try {
                    const token = localStorage.getItem("mgv_token") || "";
                    const res = await fetch(`/api/ordens-servico/${semReparoOS.id}/status`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                      body: JSON.stringify({ 
                        status: "PRONTO_RETIRADA",
                        closingReason: selectedClosingReason
                      })
                    });
                    if (!res.ok) {
                      const data = await res.json();
                      alert(data.error || "Erro ao encerrar OS.");
                    } else {
                      // Disparo opcional do WhatsApp para encerramento
                      if (semReparoNotifyWhatsapp) {
                        try {
                          await fetch(`/api/whatsapp/notify-status`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                            body: JSON.stringify({ orderId: semReparoOS.id, status: "FINALIZADO" })
                          });
                        } catch (wsErr) {
                          console.warn("Erro ao tentar disparar WhatsApp de encerramento:", wsErr);
                        }
                      }
                      onRefresh();
                    }
                  } catch(e: any) { 
                    alert(e.message); 
                  }
                  setShowSemReparoModal(false);
                  setSemReparoOS(null);
                }}
                className="px-5 py-2.5 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 shadow-md transition active:scale-95"
              >
                Confirmar e Encerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {closingOS && userRole === UserRole.OWNER && isFeatureEnabled("OS_PROFITABILITY_CALC") && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <h3 className="font-bold text-lg mb-4 text-slate-900">Encerramento de OS (Rentabilidade)</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-sm font-semibold text-slate-600">Faturamento Bruto</span>
                <span className="font-mono font-bold text-emerald-600">R$ {closingOS.totalCost.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center bg-red-50 p-3 rounded-lg border border-red-100">
                <span className="text-sm font-semibold text-slate-600">Custos Operacionais (Peças + Mão de Obra)</span>
                <span className="font-mono font-bold text-red-600">
                  - R$ {closingOpsCostVal.toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between items-center bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                <span className="text-sm font-bold text-slate-800">Margem de Lucro Real</span>
                <span className="font-mono font-extrabold text-indigo-700">
                  R$ {closingProfitVal.toFixed(2)} ({closingProfitMarginPercentVal.toFixed(1)}%)
                </span>
              </div>
              
              {closingHasZeroCost && (
                <div className="text-[10px] text-amber-700 bg-amber-50 p-2 border border-amber-200 rounded-lg">
                  <strong>Aviso:</strong> Algumas peças desta OS não possuem preço de custo (Custo Zero), afetando a exatidão do lucro.
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setClosingOS(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  setPaymentModalOS({ id: closingOS.id, targetStatus: "FINALIZADO" });
                  setClosingOS(null);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition active:scale-95 hover-premium"
              >
                Confirmar Fechamento
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentModalOS && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-emerald-600">payments</span>
                <span>{isPaymentWarranty(paymentModalOS.id) ? "Finalizar OS (Garantia)" : "Selecione a Forma de Pagamento"}</span>
              </h3>
              <button onClick={() => { setPaymentModalOS(null); setPaymentMethod(""); setPaymentDetails([]); setPaymentNotes(""); setPaymentAmountInput(""); }} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {isPaymentWarranty(paymentModalOS.id) && (
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-teal-600">verified_user</span>
                  <p className="text-xs font-extrabold text-teal-800">Equipamento em Garantia — Sem Cobrança</p>
                </div>
                <p className="text-[11px] text-teal-700 font-medium leading-relaxed">
                  Este conserto está coberto por garantia (MGV 90 dias ou de fábrica). A OS será finalizada sem faturamento e sem pagamento.
                </p>
              </div>
            )}

            {!isPaymentWarranty(paymentModalOS.id) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-extrabold text-slate-700">Data do Pagamento</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-extrabold text-slate-700">Total a Pagar</label>
                <div className="w-full p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold text-center flex items-center justify-center">
                  R$ {(() => {
                    const osTarget = ordensServico.find(o => o.id === paymentModalOS.id);
                    if (!osTarget) return "0.00";
                    const tc = osTarget.totalCost || 0;
                    if (tc > 0) return tc.toFixed(2);
                    const labor = osTarget.laborCost || 0;
                    const partsCost = osTarget.usedParts && Array.isArray(osTarget.usedParts) ? osTarget.usedParts.reduce((s: number, p: any) => s + ((p.price || 0) * (p.quantity || 1)), 0) : 0;
                    return (labor + partsCost - (osTarget.discount || 0)).toFixed(2);
                  })()}
                </div>
              </div>
            </div>
            )}

            {!isPaymentWarranty(paymentModalOS.id) && (
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-700">Pagamentos Fracionados</label>
              
              {paymentDetails.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-2 max-h-32 overflow-y-auto mb-3">
                  {paymentDetails.map((pd, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-1.5 bg-white border border-slate-100 rounded shadow-sm">
                      <span className="font-semibold text-slate-700">{pd.method.replace('_', ' ')}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-emerald-600">R$ {pd.amount.toFixed(2)}</span>
                        <button type="button" onClick={() => setPaymentDetails(paymentDetails.filter((_, i) => i !== idx))} className="text-rose-400 hover:text-rose-600">
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-xs px-1">
                    <span>Total Informado:</span>
                    <span className="text-emerald-700">R$ {paymentDetails.reduce((s, p) => s + p.amount, 0).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="" disabled>Forma...</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                  <option value="CARTAO_DEBITO">Cartão de Débito</option>
                  <option value="PIX">Pix</option>
                  <option value="BOLETO">Boleto Bancário</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="R$ 0,00"
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value)}
                  className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!paymentMethod) return alert("Selecione a forma.");
                    const val = parseFloat(paymentAmountInput);
                    if (isNaN(val) || val <= 0) return alert("Digite um valor válido.");
                    setPaymentDetails([...paymentDetails, { method: paymentMethod, amount: val }]);
                    setPaymentMethod("");
                    setPaymentAmountInput("");
                  }}
                  className="px-3 bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs hover:bg-indigo-200 transition"
                >
                  Add
                </button>
              </div>
            </div>
            )}

            {!isPaymentWarranty(paymentModalOS.id) && (
            <div className="space-y-1 mt-3">
              <label className="block text-xs font-extrabold text-slate-700">Observações sobre o Pagamento</label>
              <textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Detalhes (Ex: Pago pelo sócio, 3x no cartão com juros, etc.)"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none h-16"
              ></textarea>
            </div>
            )}

            {paymentModalOS.targetStatus === "FINALIZADO" && !isPaymentWarranty(paymentModalOS.id) && (
              <div className="space-y-2 border-t border-slate-100 pt-3 mt-3">
                <label className="block text-xs font-extrabold text-slate-700">Tipo de Emissão Fiscal:</label>
                <select
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="nenhum">🚫 Não emitir documento (já emitido anteriormente)</option>
                  <option value="bifasico">🧾 Faturamento Bifásico (Peças + Mão de Obra)</option>
                  <option value="nfe">📦 Apenas NF-e (Modelo 55 - Produtos/Peças)</option>
                  <option value="nfce">🎫 Apenas NFC-e (Modelo 65 - Cupom Fiscal)</option>
                  <option value="nfse">⚙️ Apenas NFS-e (Serviços/Mão de Obra)</option>
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-3 mt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setPaymentModalOS(null); setPaymentMethod(""); setPaymentDetails([]); setPaymentNotes(""); setPaymentAmountInput(""); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const isWarrantyPayment = isPaymentWarranty(paymentModalOS.id);
                  if (!isWarrantyPayment && paymentDetails.length === 0 && !paymentMethod) {
                    alert("Por favor, adicione pelo menos uma forma de pagamento ou selecione na lista.");
                    return;
                  }
                  
                  let finalDetails = [...paymentDetails];
                  let finalMainMethod = paymentMethod;
                  
                  if (finalDetails.length === 0 && paymentMethod) {
                    const osTarget = ordensServico.find(o => o.id === paymentModalOS.id);
                    let osVal = 0;
                    if (osTarget) {
                      osVal = osTarget.totalCost || 0;
                      if (osVal === 0) {
                        const labor = osTarget.laborCost || 0;
                        const partsCost = osTarget.usedParts && Array.isArray(osTarget.usedParts) ? osTarget.usedParts.reduce((s: number, p: any) => s + ((p.price || 0) * (p.quantity || 1)), 0) : 0;
                        osVal = labor + partsCost - (osTarget.discount || 0);
                      }
                    }
                    finalDetails = [{ method: paymentMethod, amount: osVal }];
                  } else if (finalDetails.length > 1) {
                    finalMainMethod = "MULTIPLO";
                  } else if (finalDetails.length === 1) {
                    finalMainMethod = finalDetails[0].method;
                  }

                  setLoading(true);
                  try {
                    const token = localStorage.getItem("mgv_token") || "";
                    const res = await fetch(`/api/ordens-servico/${paymentModalOS.id}/status`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                      body: JSON.stringify({ 
                        status: paymentModalOS.targetStatus,
                        ...(isWarrantyPayment
                          ? { invoiceType: "nenhum" }
                          : {
                              paymentMethod: finalMainMethod,
                              paymentNotes,
                              paymentDate,
                              paymentDetails: finalDetails,
                              invoiceType
                            })
                      })
                    });
                    if (!res.ok) {
                      const data = await res.json();
                      alert(data.error || "Erro.");
                    } else {
                      setSuccessMsg(isWarrantyPayment ? "OS finalizada sem cobrança (equipamento em garantia)!" : "OS encerrada e pagamento registrado com sucesso!");
                      onRefresh();
                      setTimeout(() => setSuccessMsg(""), 1500);
                    }
                  } catch (e: any) {
                    alert(e.message);
                  } finally {
                    setLoading(false);
                    setPaymentModalOS(null);
                    setPaymentMethod("");
                    setPaymentDetails([]);
                    setPaymentNotes("");
                    setPaymentAmountInput("");
                  }
                }}
                disabled={!isPaymentWarranty(paymentModalOS.id) && paymentDetails.length === 0 && !paymentMethod}
                className="flex-1 bg-emerald-650 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition cursor-pointer text-xs shadow-sm flex items-center justify-center gap-1.5 disabled:bg-slate-200 disabled:text-slate-400"
              >
                <span className="material-symbols-outlined text-[16px]">{isPaymentWarranty(paymentModalOS.id) ? "verified" : "task_alt"}</span>
                <span>{isPaymentWarranty(paymentModalOS.id) ? "Finalizar Sem Cobrança" : "Finalizar OS"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showFiscalFixModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-amber-500">warning</span>
                <span>Dados Fiscais do Cliente Pendentes</span>
              </h3>
              <button 
                onClick={() => { setShowFiscalFixModal(false); setFiscalFixPendingOSId(""); setFiscalFixPendingStatus(null); }} 
                className="text-slate-400 hover:text-slate-650 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-1.5 text-xs text-amber-800">
              <p className="font-bold">O Bling rejeitará o faturamento devido às seguintes pendências:</p>
              <ul className="list-disc pl-4 space-y-1">
                {fiscalFixErrors.map((err, i) => (
                  <li key={i} className="font-medium">{err}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Nome / Razão Social</label>
                  <input
                    type="text"
                    value={fiscalFixData.name}
                    onChange={(e) => setFiscalFixData({ ...fiscalFixData, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600">CPF ou CNPJ</label>
                  <input
                    type="text"
                    value={fiscalFixData.cpfCnpj}
                    onChange={(e) => setFiscalFixData({ ...fiscalFixData, cpfCnpj: e.target.value })}
                    placeholder="Somente números"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Inscrição Estadual / RG</label>
                  <input
                    type="text"
                    value={fiscalFixData.stateInscription}
                    onChange={(e) => setFiscalFixData({ ...fiscalFixData, stateInscription: e.target.value })}
                    placeholder="Isento ou Nº"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600">CEP</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={fiscalFixData.zipCode}
                      onChange={(e) => setFiscalFixData({ ...fiscalFixData, zipCode: e.target.value })}
                      placeholder="99999-999"
                      className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleCepSearch(fiscalFixData.zipCode)}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl transition cursor-pointer text-xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">search</span>
                      <span>Buscar</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Endereço (Rua, Número, Bairro)</label>
                  <input
                    type="text"
                    value={fiscalFixData.address}
                    onChange={(e) => setFiscalFixData({ ...fiscalFixData, address: e.target.value })}
                    placeholder="Ex: Rua das Flores, 123 - Centro"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Cidade</label>
                  <input
                    type="text"
                    value={fiscalFixData.city}
                    onChange={(e) => setFiscalFixData({ ...fiscalFixData, city: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Estado (UF)</label>
                  <input
                    type="text"
                    value={fiscalFixData.state}
                    onChange={(e) => setFiscalFixData({ ...fiscalFixData, state: e.target.value.toUpperCase() })}
                    maxLength={2}
                    placeholder="SP"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setShowFiscalFixModal(false); setFiscalFixPendingOSId(""); setFiscalFixPendingStatus(null); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveFiscalFix}
                disabled={fiscalFixLoading}
                className="flex-1 bg-emerald-650 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition cursor-pointer text-xs flex items-center justify-center gap-1.5 disabled:bg-slate-200 disabled:text-slate-400"
              >
                {fiscalFixLoading ? (
                  <span>Salvando...</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>Salvar e Continuar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for viewing photos in large size */}
      {lightboxPhoto && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 z-[70]" onClick={() => setLightboxPhoto(null)}>
          <div className="max-w-3xl w-full max-h-[80vh] flex items-center justify-center relative select-none">
            <img src={lightboxPhoto.dataUrl} alt="Visualização em tamanho real" className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border border-slate-800" />
            <button 
              onClick={() => setLightboxPhoto(null)} 
              className="absolute top-4 right-4 bg-slate-900/60 hover:bg-slate-900 text-white w-10 h-10 rounded-full flex items-center justify-center transition border border-slate-700"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          {lightboxPhoto.legenda && (
            <p className="mt-4 text-white font-medium text-sm bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-800">{lightboxPhoto.legenda}</p>
          )}
        </div>
      )}

      {/* MODAL: ONBOARDING DE DISPOSITIVO LEGADO (Sprint 3) */}
      {showOnboardingModal && onboardingDevice && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4 z-[90] overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md anim-slideup">
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between rounded-t-2xl border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-teal-400 text-[18px]">warning</span>
                <h3 className="font-bold text-sm font-display">Higienizar Base Instalada</h3>
              </div>
              <button 
                onClick={() => {
                  setShowOnboardingModal(false);
                  setOnboardingOS(null);
                  setOnboardingDevice(null);
                  setOnboardingTargetStatus(null);
                }} 
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {(() => {
              const missing = [];
              if (!onbBrand.trim()) missing.push("Marca/Fabricante");
              if (!onbModel.trim()) missing.push("Modelo");
              const isSerialEmpty = !onbSerial.trim() || onbSerial.trim() === "Sem Série";
              if (isSerialEmpty && (!onbDesc.trim() || onbDesc.trim().length < 5)) {
                missing.push("Descrição Física detalhada (mínimo de 5 caracteres)");
              }
              const count = missing.length;
              return (
                <div className="p-5 bg-indigo-50/50 border-b border-indigo-100 text-slate-700 text-xs font-semibold leading-relaxed">
                  <p className="flex items-start space-x-1.5 mb-1.5">
                    <span className="material-symbols-outlined text-indigo-600 text-[16px] shrink-0 mt-0.5">info</span>
                    <span>
                      {count > 0 
                        ? `Faltam apenas ${count} ${count === 1 ? 'informação' : 'informações'} para concluir esta Ordem de Serviço.` 
                        : "Todas as informações obrigatórias de qualidade foram fornecidas!"}
                    </span>
                  </p>
                  {count > 0 && (
                    <ul className="list-disc pl-5 text-slate-500 font-medium space-y-0.5">
                      {missing.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  )}
                </div>
              );
            })()}

            <form onSubmit={handleOnboardingSubmit} className="p-5 space-y-4">
              {onbErrorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
                  {onbErrorMsg}
                </div>
              )}
              {onbSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg">
                  {onbSuccessMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 mb-1 uppercase tracking-wider">Tipo Primário</label>
                  <select
                    value={onbType}
                    onChange={(e) => setOnbType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
                  >
                    <option value="Ultrassom (Fisio/Estética)">Ultrassom (Fisio/Estética)</option>
                    <option value="Radiofrequência">Radiofrequência</option>
                    <option value="Eletroestimulador / Correntes">Eletroestimulador / Correntes</option>
                    <option value="Laserterapia / LED">Laserterapia / LED</option>
                    <option value="Vapor de Ozônio">Vapor de Ozônio</option>
                    <option value="Gerador de Ozônio">Gerador de Ozônio</option>
                    <option value="Alta Frequência">Alta Frequência</option>
                    <option value="Criolipólise / Estética">Criolipólise / Estética</option>
                    <option value="Pressoterapia">Pressoterapia</option>
                    <option value="Carboxiterapia">Carboxiterapia</option>
                    <option value="Outro">Outro</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Função Extra (Opcional)"
                    value={onbExtraType}
                    onChange={(e) => setOnbExtraType(e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 mb-1 uppercase tracking-wider">Marca / Fabricante</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dell, Lenovo, HP"
                    value={onbBrand}
                    onChange={(e) => setOnbBrand(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-650 mb-1 uppercase tracking-wider">Modelo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Latitude 3420, ThinkPad E14"
                  value={onbModel}
                  onChange={(e) => setOnbModel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-650 mb-1 uppercase tracking-wider">Número de Série (N/S)</label>
                <input
                  type="text"
                  placeholder="Digite o número de série real ou deixe em branco se não houver"
                  value={onbSerial}
                  onChange={(e) => setOnbSerial(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-650 mb-1 uppercase tracking-wider">
                  Descrição Física / Marcas Estéticas
                </label>
                <textarea
                  rows={3}
                  required={!onbSerial.trim()}
                  placeholder="Se o ativo não possuir número de série, descreva características estéticas detalhadas (ex: risco na tampa, adesivos, cantos amassados)."
                  value={onbDesc}
                  onChange={(e) => setOnbDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowOnboardingModal(false);
                    setOnboardingOS(null);
                    setOnboardingDevice(null);
                    setOnboardingTargetStatus(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={onbLoading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg transition hover-premium active-premium cursor-pointer"
                >
                  {onbLoading ? "Gravando..." : "Confirmar e Mudar Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
