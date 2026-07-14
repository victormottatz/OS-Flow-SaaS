/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useFeatureFlags } from "../contexts/FeatureFlagContext";
import { OrdemServico, OSStatus, Part, UsedPart, UserRole, Client, Device, ChecklistItem, EntradaFoto, AvulsoCategory } from "../types";
import OSWhatsAppPanel from "./OSWhatsAppPanel";


interface KanbanBoardProps {
  ordensServico: OrdemServico[];
  parts: Part[];
  userRole: UserRole;
  isOffline: boolean;
  onRefresh: () => void;
  onNavigateToBlingPanel: () => void;
}

const COLUMNS: { id: OSStatus; name: string; color: string; desc: string }[] = [
  { id: "ORCAMENTO", name: "Orçamento", color: "border-t-blue-500 bg-blue-50/10", desc: "Aguardando laudo inicial" },
  { id: "AGUARDANDO_PECA", name: "Aguardando Peça", color: "border-t-amber-500 bg-amber-50/10", desc: "Fora de estoque local" },
  { id: "EM_MANUTENCAO", name: "Em Manutenção", color: "border-t-purple-500 bg-purple-50/10", desc: "Conserto ativo na bancada" },
  { id: "PRONTO_RETIRADA", name: "Pronto p/ Retirada", color: "border-t-teal-500 bg-teal-50/10", desc: "Reparo efetuado" },
  { id: "FINALIZADO", name: "Finalizado", color: "border-t-emerald-500 bg-emerald-50/10", desc: "Faturando no Bling" },
];

const getOSCardBorders = (status: OSStatus) => {
  switch (status) {
    case "ORCAMENTO": return "border-l-4 border-l-blue-500";
    case "AGUARDANDO_PECA": return "border-l-4 border-l-amber-500";
    case "EM_MANUTENCAO": return "border-l-4 border-l-purple-500";
    case "PRONTO_RETIRADA": return "border-l-4 border-l-teal-500";
    case "FINALIZADO": return "border-l-4 border-l-emerald-500";
    default: return "border-l-4 border-l-slate-400";
  }
};

const KanbanCard = React.memo(({
  os,
  hasRecurrence,
  onDragStart,
  onClick
}: {
  os: OrdemServico;
  hasRecurrence?: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick: (os: OrdemServico) => void;
}) => {
  const total = (os.usedParts?.reduce((s, i) => s + (i.price * i.quantity), 0) || 0) + (os.laborCost || 0);
  return (
    <div draggable onDragStart={(e) => onDragStart(e, os.id)} onClick={() => onClick(os)} className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm cursor-pointer transition hover:shadow-md ${getOSCardBorders(os.status)}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{os.osNumber}</span>
        {hasRecurrence && (
          <span 
            className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded flex items-center font-bold gap-0.5" 
            title={os.recurrentAlert ? `Alerta de Falha Crônica: Retornou ${os.recurrentAlert.count} vezes em 90 dias (${os.recurrentAlert.previousOsNumbers.join(", ")})` : "Recorrência: > 2 OS em 90 dias"}
          >
            <span className="material-symbols-outlined text-[12px]">warning</span> Recorrente
          </span>
        )}
      </div>
      <h4 className="font-extrabold text-slate-900 text-xs truncate">{(os as any).client?.name}</h4>
      <p className="text-[11px] text-slate-500 font-semibold">{(os as any).device?.model}</p>
      <div className="border-t mt-3 pt-2.5 flex justify-between text-[10px]">
        <span className="text-slate-400">{new Date(os.createdAt).toLocaleDateString()}</span>
        <span className="text-slate-900 font-extrabold">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
}, (prevProps, nextProps) => prevProps.os === nextProps.os && prevProps.hasRecurrence === nextProps.hasRecurrence);

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
      <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 select-none transition hover:border-indigo-500/50">
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
    <div className={`p-4 rounded-xl border select-none transition ${
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
  onNavigateToBlingPanel
}: KanbanBoardProps) {
  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<"laudo" | "pecas" | "entrada" | "saida">("laudo");

  // Checklist de Saída & Categorias
  const [deviceCategories, setDeviceCategories] = useState<{ id: string; name: string; defaultChecklist: ChecklistItem[] }[]>([]);
  const [editChecklistSaida, setEditChecklistSaida] = useState<ChecklistItem[]>([]);
  const [isEditingSaida, setIsEditingSaida] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem("mgv_token") || "";
        const res = await fetch("/api/device-categories", {
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

  // Checklist & Photos states in modal
  const [isEditingEntrada, setIsEditingEntrada] = useState(false);
  const [editChecklist, setEditChecklist] = useState<ChecklistItem[]>([]);
  const [editPhotos, setEditPhotos] = useState<EntradaFoto[]>([]);
  const [lightboxPhoto, setLightboxPhoto] = useState<EntradaFoto | null>(null);

  // Print state
  const [activePrintOS, setActivePrintOS] = useState<OrdemServico | null>(null);

  const handlePrintRecibo = (os: OrdemServico) => {
    setActivePrintOS(os);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Form states
  const [diagnostic, setDiagnostic] = useState("");
  const [laborCost, setLaborCost] = useState(0);
  const [technicianLaborHours, setTechnicianLaborHours] = useState(0);
  const [technicianHourlyRate, setTechnicianHourlyRate] = useState(0);
  const [closingOS, setClosingOS] = useState<OrdemServico | null>(null);
  const [selectedParts, setSelectedParts] = useState<UsedPart[]>([]);
  const [tempPartId, setTempPartId] = useState("");
  const [tempPartQty, setTempPartQty] = useState(1);
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
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Erro ao salvar checklist de saída.");
      }
    } catch (err: any) {
      setErrorMsg("Erro ao salvar checklist de saída: " + err.message);
    }
  };

  const openOSDetails = (os: OrdemServico) => {
    setSelectedOS(os);
    setDiagnostic(os.diagnostic || "");
    setLaborCost(os.laborCost || 0);
    setTechnicianLaborHours(os.technicianLaborHours || 0);
    setTechnicianHourlyRate(os.technicianHourlyRate || 0);
    setSelectedParts(os.usedParts || []);
    setEditChecklist(os.checklistEntrada && os.checklistEntrada.length > 0 ? os.checklistEntrada : [
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
    ]);
    setEditPhotos(os.laudoFotos || []);
    setIsEditingEntrada(false);

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
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 800;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
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
        body: JSON.stringify({ checklistEntrada: editChecklist, laudoFotos: editPhotos })
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
        laudoFotos: editPhotos
      });
      setIsEditingEntrada(false);
      setTimeout(() => setSuccessMsg(""), 1200);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };


  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (isOffline) { e.preventDefault(); return; }
    setDraggingId(id);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = async (e: React.DragEvent, targetStatus: OSStatus) => {
    e.preventDefault();
    if (!draggingId || isOffline) return;

    const osToMove = ordensServico.find(o => o.id === draggingId);
    const isProfitEnabled = isFeatureEnabled("OS_PROFITABILITY_CALC");
    if (targetStatus === "FINALIZADO" && userRole === UserRole.OWNER && isProfitEnabled && osToMove) {
      setClosingOS(osToMove);
      setDraggingId(null);
      return;
    }

    try {
      const token = localStorage.getItem("mgv_token") || "";
      const response = await fetch(`/api/ordens-servico/${draggingId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status: targetStatus })
      });
      if (!response.ok) {
        const errData = await response.json();
        if (errData.code === "DEVICE_INCOMPLETE") {
          setOnboardingOS(osToMove || null);
          setOnboardingDevice(errData.device);
          setOnboardingTargetStatus(targetStatus);
          setOnbType(errData.device.type || "Ultrassom (Fisio/Estética)");
          setOnbBrand(errData.device.brand === "Indefinido" ? "" : errData.device.brand);
          setOnbModel(errData.device.model === "Indefinido" ? "" : errData.device.model);
          setOnbSerial(errData.device.serialNumber === "Sem Série" ? "" : errData.device.serialNumber);
          setOnbDesc(errData.device.description === "Sem observações." ? "" : errData.device.description);
          setOnbErrorMsg("");
          setOnbSuccessMsg("");
          setShowOnboardingModal(true);
        } else {
          alert(errData.error || "Erro ao mover a OS.");
        }
      } else {
        onRefresh();
      }
    } catch (err: any) { alert(err.message); } finally { setDraggingId(null); }
  };

  const handleStatusChangeBtn = async (id: string, newStatus: OSStatus) => {
    if (isOffline) return;

    const osToMove = ordensServico.find(o => o.id === id);
    const isProfitEnabled = isFeatureEnabled("OS_PROFITABILITY_CALC");
    if (newStatus === "FINALIZADO" && userRole === UserRole.OWNER && isProfitEnabled && osToMove) {
      setClosingOS(osToMove);
      return;
    }

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
          setOnboardingOS(osToMove || null);
          setOnboardingDevice(errData.device);
          setOnboardingTargetStatus(newStatus);
          setOnbType(errData.device.type || "Ultrassom (Fisio/Estética)");
          setOnbBrand(errData.device.brand === "Indefinido" ? "" : errData.device.brand);
          setOnbModel(errData.device.model === "Indefinido" ? "" : errData.device.model);
          setOnbSerial(errData.device.serialNumber === "Sem Série" ? "" : errData.device.serialNumber);
          setOnbDesc(errData.device.description === "Sem observações." ? "" : errData.device.description);
          setOnbErrorMsg("");
          setOnbSuccessMsg("");
          setShowOnboardingModal(true);
        } else {
          alert(errData.error || "Erro ao alterar status.");
        }
      } else {
        onRefresh();
      }
    } catch (err: any) { alert(err.message); }
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
          type: onbType,
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

  const handleRemovePartFromOS = (partId: string) => setSelectedParts(selectedParts.filter(item => item.partId !== partId));

  const partsTotal = selectedParts.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const computedTotal = partsTotal + Number(laborCost);

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
        body: JSON.stringify({ diagnostic, usedParts: selectedParts, laborCost, technicianLaborHours, technicianHourlyRate })
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



  return (
    <div className="space-y-6">
      {isOffline && (
        <div className="bg-red-950/60 border border-red-500 rounded-xl p-3 text-red-200 text-xs flex items-center space-x-2 animate-pulse shadow-inner">
          <span className="material-symbols-outlined text-[16px] text-red-400 shrink-0">warning</span>
          <span><strong>ALERTA:</strong> Conexão offline ativa. Movimentação bloqueada.</span>
        </div>
      )}

      <div className="flex overflow-x-auto lg:grid lg:grid-cols-5 gap-5 h-[calc(100vh-140px)] min-h-[500px] pb-2 snap-x snap-mandatory">
        {COLUMNS.map((column) => {
          const colOS = ordensServico.filter(os => os.status === column.id);
          return (
            <div key={column.id} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, column.id)} className={`min-w-[85vw] sm:min-w-[320px] lg:min-w-0 shrink-0 snap-center rounded-2xl border border-slate-200/85 border-t-4 p-4 flex flex-col h-full max-h-full gap-4 overflow-hidden ${column.color}`}>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 shrink-0">
                <h3 className="font-bold text-sm text-slate-900">{column.name}</h3>
                <span className="bg-slate-900 text-white font-mono text-[10px] px-2 py-0.5 rounded-full">{colOS.length}</span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto pr-1 pb-2 custom-scrollbar">
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
                      onDragStart={handleDragStart} 
                      onClick={openOSDetails} 
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {showEditModal && selectedOS && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col anim-slideup">
            
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
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs select-none">
                <p><span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Cliente proprietário</span> <strong className="text-slate-800 text-sm mt-0.5 block">{(selectedOS as any).client?.name}</strong></p>
                <p><span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Dispositivo em conserto</span> <strong className="text-slate-800 text-sm mt-0.5 block">{(selectedOS as any).device?.type} {(selectedOS as any).device?.brand} ({(selectedOS as any).device?.model})</strong></p>
                <p className="sm:col-span-2 border-t border-slate-100 pt-2"><span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Sintoma Narrado pelo Solicitante</span> <span className="text-slate-600 italic block mt-1 font-mono">"{(selectedOS as any).reportedDefect}"</span></p>
              </div>

              {/* Widget de Teste de Estresse para Garantia */}
              <StressTestWidget 
                os={selectedOS} 
                onStartStress={handleStartStressTest} 
              />

              {/* TAB 1: LAUDO & CUSTOS */}
              {modalTab === "laudo" && (
                <div className="space-y-5 anim-fadein">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Valor da Mão de Obra (R$)</label>
                      <input
                        type="number"
                        min={0}
                        value={laborCost}
                        onChange={(e) => setLaborCost(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 font-mono font-bold focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition"
                      />
                      <p className="text-[10px] text-slate-450 mt-1.5 font-semibold">Valor do serviço técnico especializado da MGV.</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Horas do Técnico</label>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={technicianLaborHours}
                        onChange={(e) => setTechnicianLaborHours(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Custo/Hora Técnico (R$)</label>
                      <input
                        type="number"
                        min={0}
                        value={technicianHourlyRate}
                        onChange={(e) => setTechnicianHourlyRate(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none"
                      />
                    </div>

                    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-4 flex flex-col justify-center items-end text-right border border-slate-850 shadow-md select-none">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-indigo-300">Total do Conserto</span>
                      <p className="text-2xl font-mono font-bold text-white mt-1">
                        R$ {computedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 font-semibold">Mão de Obra + Peças</span>
                    </div>
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

                    <div className="flex flex-col sm:flex-row items-end gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Pesquisar Peça em Estoque:</label>
                        <select
                          value={tempPartId}
                          onChange={(e) => setTempPartId(e.target.value)}
                          className="w-full px-2.5 py-1.8 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white"
                        >
                          <option value="">-- Escolher Peça --</option>
                          {parts.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.code}) [Qtd: {p.stock} | R$ {p.price.toFixed(2)}]
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Qtd:</label>
                        <input
                          type="number"
                          min={1}
                          value={tempPartQty}
                          onChange={(e) => setTempPartQty(Math.max(1, Number(e.target.value)))}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddPartToOS}
                        className="bg-slate-900 text-white font-extrabold text-[10px] uppercase tracking-wider px-4 py-1.8 h-[34px] rounded-lg hover:bg-slate-800 active:bg-slate-950 transition duration-150 shrink-0 hover-premium active-premium"
                      >
                        Lançar Peça
                      </button>

                      {isAvulsoEnabled && (
                        <button
                          type="button"
                          onClick={() => setIsAddingAvulso(true)}
                          className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-[10px] uppercase tracking-wider px-4 py-1.8 h-[34px] rounded-lg hover:bg-indigo-100 transition duration-150 shrink-0 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span> Item Avulso
                        </button>
                      )}
                    </div>

                    {isAvulsoEnabled && isAddingAvulso && (
                      <form onSubmit={handleAddAvulsoToOS} className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200 space-y-3 mt-3 anim-fadein shadow-inner">
                        <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                          <h5 className="text-[11px] font-bold text-indigo-800 uppercase flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">sparkles</span> Novo Item Avulso (Apenas nesta OS)
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
                          <button type="submit" className="bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-indigo-700 transition">Adicionar Item à OS</button>
                        </div>
                      </form>
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
                            <div key={p.partId} className={`text-xs bg-slate-50 p-2.5 rounded-lg border transition duration-150 ${needsSerial && (!p.serialNumber || p.serialNumber.trim() === "") ? "border-violet-400 bg-violet-50/30" : "border-slate-200 hover:border-slate-350"}`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  {p.isAvulso ? (
                                    <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-md mr-2 uppercase tracking-wider inline-flex items-center" title="Item existe apenas nesta OS"><span className="material-symbols-outlined text-[10px] mr-0.5">sparkles</span> Avulso</span>
                                  ) : (
                                    <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded-md mr-2 uppercase tracking-wider inline-flex items-center" title="Baixa no estoque automático"><span className="material-symbols-outlined text-[10px] mr-0.5">inventory_2</span> Estoque</span>
                                  )}
                                  <span className="font-bold text-slate-850">{p.name}</span>
                                  {p.isAvulso && p.category && <span className="ml-1 text-[10px] text-slate-500 font-medium font-mono">({p.category})</span>}
                                  <span className="text-slate-400 mx-2">|</span>
                                  <span className="text-slate-500 font-mono font-semibold">{p.quantity} x R$ {p.price.toFixed(2)}</span>
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
                  ) : (
                    /* VIEW-ONLY MODE */
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

                <div className="flex space-x-2 w-full sm:w-auto justify-end">
                  {(selectedOS.status === "PRONTO_RETIRADA" || selectedOS.status === "FINALIZADO") && (
                    <button
                      type="button"
                      onClick={() => handlePrintRecibo(selectedOS)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white font-bold text-sm rounded-lg transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">print</span>
                      <span>Imprimir Recibo & Garantia</span>
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
        </div>
      )}

      {/* Print Overrides styling */}
      <style>{`
        @media print {
          @page {
            margin: 0.5cm;
            size: auto;
          }
          body * {
            visibility: hidden;
          }
          #printable-recibo, #printable-recibo * {
            visibility: visible;
          }
          #printable-recibo {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* Printable Exit Receipt Template */}
      {activePrintOS && (
        <div id="printable-recibo" className="hidden print:block bg-white text-slate-900 font-sans p-8 print:p-0 print:border-none">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-premium text-slate-900 max-w-3xl mx-auto print:border-none print:shadow-none font-sans relative overflow-hidden">
            {/* Watermark/Accent line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-600" />
            
            <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-6 gap-4">
              <div>
                <h1 className="text-xl font-bold uppercase tracking-wide text-emerald-950 flex items-center">
                  <span className="material-symbols-outlined text-[20px] mr-1.5 text-emerald-650">workspace_premium</span>
                  MGV Tecnologia
                </h1>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-mono tracking-wider font-semibold">MGV TECNOLOGIA E ASSISTÊNCIA TÉCNICA LTDA</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">CNPJ: 18.291.554/0001-90 | IE: 109.283.412.110</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Av. Tiradentes, 850, Ribeirão Preto - SP | Tel: (11) 3218-9900</p>
              </div>
              <div className="flex flex-col items-end text-right w-full sm:w-auto">
                <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full font-mono">
                  RECIBO DE ENTREGA E GARANTIA
                </span>
                <p className="text-3xl font-mono font-bold mt-3 text-slate-950 tracking-tight">{activePrintOS.osNumber}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  Conclusão: {new Date().toLocaleString("pt-BR")}
                </p>
              </div>
            </div>

            {/* Client & Device Summary details */}
            <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-2.5 pb-1 border-b border-slate-200 flex items-center">
                  <span className="material-symbols-outlined text-[16px] mr-1.5 text-slate-600">how_to_reg</span>
                  Cliente proprietário
                </h4>
                <p className="font-bold text-slate-950 text-sm">{(activePrintOS as any).client?.name || "Carlos Roberto Silva"}</p>
                <p className="mt-1.5 font-medium text-slate-700">Documento: <span className="font-mono">{(activePrintOS as any).client?.cpfCnpj || "N/D"}</span></p>
                <p className="font-medium text-slate-700">Contato: <span className="font-mono">{(activePrintOS as any).client?.phone || "N/D"}</span></p>
                <p className="mt-1.5 text-slate-500 font-medium">Endereço: {(activePrintOS as any).client?.address || "N/D"}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-2.5 pb-1 border-b border-slate-200 flex items-center">
                  <span className="material-symbols-outlined text-[16px] mr-1.5 text-slate-650">devices</span>
                  Aparelho em Manutenção
                </h4>
                <p className="font-bold text-slate-950 text-sm">{(activePrintOS as any).device?.type || "Ultrassom (Fisio/Estética)"} {(activePrintOS as any).device?.brand || "Ibramed"}</p>
                <p className="mt-1.5 font-medium text-slate-700">Modelo: {(activePrintOS as any).device?.model || "Neurodyn"}</p>
                <p className="font-medium text-slate-700 font-mono">Série: <span className="bg-slate-200 px-1 py-0.5 rounded font-bold text-slate-800">{(activePrintOS as any).device?.serialNumber || "Sem Série"}</span></p>
                <p className="mt-1.5 text-slate-550 font-medium italic">Estética: {(activePrintOS as any).device?.description || "N/D"}</p>
              </div>
            </div>

            {/* Diagnosis pericial description */}
            <div className="space-y-4 text-xs border-t border-slate-200 pt-5">
              <div>
                <h4 className="font-bold text-slate-850 uppercase text-[10px] tracking-wider mb-1.5 flex items-center">
                  <span className="material-symbols-outlined text-[16px] mr-1.5 text-slate-600 font-bold">description</span>
                  Laudo Técnico do Laboratório
                </h4>
                <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 leading-relaxed font-semibold italic">
                  {activePrintOS.diagnostic || "Serviço efetuado com diagnóstico conclusivo da equipe técnica."}
                </p>
              </div>
              
              <div className="border-t border-slate-100 pt-4">
                <h4 className="font-bold text-slate-850 uppercase text-[10px] tracking-wider mb-2.5 flex items-center">
                  <span className="material-symbols-outlined text-[16px] mr-1.5 text-slate-600">inventory_2</span>
                  Insumos / Peças Substituídas
                </h4>
                {activePrintOS.usedParts?.length === 0 ? (
                  <p className="text-slate-400 italic text-[11px] p-2">Nenhuma peça física utilizada para este reparo (serviço exclusivo).</p>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                        <th className="py-2 font-bold">Descrição da Peça</th>
                        <th className="py-2 text-center font-bold">Qtd</th>
                        <th className="py-2 text-right font-bold">Valor Un.</th>
                        <th className="py-2 text-right font-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePrintOS.usedParts?.map((item, index) => (
                        <tr key={index} className="border-b border-slate-100 text-slate-700">
                          <td className="py-2.5 font-semibold">{item.name}</td>
                          <td className="py-2.5 text-center font-mono font-bold">{item.quantity}</td>
                          <td className="py-2.5 text-right font-mono font-semibold">R$ {item.price.toFixed(2)}</td>
                          <td className="py-2.5 text-right font-mono font-bold text-slate-900">R$ {(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Invoicing summary cost */}
              <div className="my-6 p-4 bg-slate-950 text-white rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center border border-slate-900 shadow-md">
                <div className="space-y-0.5 select-none">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-indigo-300">Custo Total de Operação</span>
                  <p className="text-xs text-slate-400">Serviço Técnico + Insumos de Reposição</p>
                </div>
                <div className="text-right sm:mt-0 mt-3 flex items-baseline space-x-4">
                  <span className="text-xs text-slate-450 font-semibold">Mão de Obra: R$ {activePrintOS.laborCost.toFixed(2)}</span>
                  <span className="text-2xl font-mono font-bold text-emerald-400">
                    R$ {activePrintOS.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Warranty certificate legal terms */}
              <div className="mt-8 border-t border-slate-200 pt-5 text-[10px] text-slate-500 leading-relaxed space-y-2 select-none">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">Termo de Entrega e Garantia de Assistência:</p>
                <p>
                  1. A MGV Tecnologia declara garantia legal de 90 dias (conforme art. 26 do Código de Defesa do Consumidor - CDC) para todas as peças físicas substituídas e serviços discriminados neste laudo técnico, a contar da data de retirada descrita.
                </p>
                <p>
                  2. A garantia aplica-se exclusivamente a falhas espontâneas das peças novas fornecidas. Estão integralmente excluídos da garantia danos causados por quedas, sobretensões elétricas na rede externa, oxidação por umidade local ou intervenções técnicas executadas por terceiros.
                </p>
              </div>

              {/* Signatures */}
              <div className="mt-14 grid grid-cols-2 gap-12 text-center text-xs">
                <div className="border-t border-slate-350 pt-3">
                  <p className="font-semibold text-slate-800">Técnico MGV Responsável</p>
                  <p className="text-[10px] text-slate-400 font-medium">Assinatura / Carimbo</p>
                </div>
                <div className="border-t border-slate-350 pt-3">
                  <p className="font-semibold text-slate-800">Assinatura do Cliente</p>
                  <p className="text-[10px] text-slate-400 font-medium">De acordo de recebimento do ativo</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {closingOS && (
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
                onClick={async () => {
                  try {
                    const token = localStorage.getItem("mgv_token") || "";
                    const res = await fetch(`/api/ordens-servico/${closingOS.id}/status`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                      body: JSON.stringify({ status: "FINALIZADO" })
                    });
                    if (!res.ok) {
                      const data = await res.json();
                      alert(data.error || "Erro.");
                    } else {
                      onRefresh();
                    }
                  } catch(e: any) { alert(e.message); }
                  setClosingOS(null);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-md"
              >
                Confirmar Fechamento
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
                  <label className="block text-[10px] font-bold text-slate-650 mb-1 uppercase tracking-wider">Tipo</label>
                  <select
                    value={onbType}
                    onChange={(e) => setOnbType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold"
                  >
                    <option value="Ultrassom (Fisio/Estética)">Ultrassom (Fisio/Estética)</option>
                    <option value="Carboxiterapia">Carboxiterapia</option>
                    <option value="Outro">Outro</option>
                  </select>
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
