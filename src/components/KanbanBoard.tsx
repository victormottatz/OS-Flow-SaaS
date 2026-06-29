/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { OrdemServico, OSStatus, Part, UsedPart, UserRole, Client, Device, ChecklistItem, EntradaFoto } from "../types";


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
          <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded flex items-center font-bold gap-0.5" title="Recorrência: > 2 OS em 90 dias">
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
  const [modalTab, setModalTab] = useState<"laudo" | "pecas" | "entrada">("laudo");

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
      { id: "dobradicas", label: "Dobradiças (notebooks)", status: "NA", observacao: "" },
      { id: "bateria", label: "Bateria / Nível de carga", status: "NA", observacao: "" },
      { id: "carregador", label: "Adaptador / Carregador entregue", status: "NA", observacao: "" },
      { id: "umidade", label: "Alta umidade / Corrosão", status: "NA", observacao: "" },
      { id: "queda", label: "Sinais de queda ou impacto", status: "NA", observacao: "" },
      { id: "temperatura", label: "Temperatura anormal", status: "NA", observacao: "" },
      { id: "memoria", label: "SIM / Memória externa", status: "NA", observacao: "" },
      { id: "acessorios_extra", label: "Acessórios entregues junto", status: "NA", observacao: "" },
      { id: "garantia", label: "Selo de garantia intacto", status: "NA", observacao: "" }
    ]);
    setEditPhotos(os.laudoFotos || []);
    setIsEditingEntrada(false);
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
      const response = await fetch(`/api/ordens-servico/${selectedOS.id}/laudo-fotos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklistEntrada: editChecklist, laudoFotos: editPhotos })
      });
      if (!response.ok) throw new Error("Erro ao gravar laudo de entrada.");
      
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
    if (targetStatus === "FINALIZADO" && userRole === UserRole.OWNER && osToMove) {
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
        alert(errData.error || "Erro ao mover a OS.");
      } else {
        onRefresh();
      }
    } catch (err: any) { alert(err.message); } finally { setDraggingId(null); }
  };

  const handleStatusChangeBtn = async (id: string, newStatus: OSStatus) => {
    if (isOffline) return;

    const osToMove = ordensServico.find(o => o.id === id);
    if (newStatus === "FINALIZADO" && userRole === UserRole.OWNER && osToMove) {
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
        alert(errData.error || "Erro ao alterar status.");
      } else {
        onRefresh();
      }
    } catch (err: any) { alert(err.message); }
  };

  const handleAddPartToOS = () => {
    if (!tempPartId) return;
    const part = parts.find(p => p.id === tempPartId);
    if (!part || part.stock < tempPartQty) return;
    const existsIdx = selectedParts.findIndex(item => item.partId === tempPartId);
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

  const handleRemovePartFromOS = (partId: string) => setSelectedParts(selectedParts.filter(item => item.partId !== partId));

  const partsTotal = selectedParts.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const computedTotal = partsTotal + Number(laborCost);

  const handleSaveOSDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline || !selectedOS) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/ordens-servico/${selectedOS.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnostic, usedParts: selectedParts, laborCost, technicianLaborHours, technicianHourlyRate })
      });
      if (!response.ok) throw new Error("Erro ao gravar.");
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {COLUMNS.map((column) => {
          const colOS = ordensServico.filter(os => os.status === column.id);
          return (
            <div key={column.id} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, column.id)} className={`rounded-2xl border border-slate-200/85 border-t-4 p-4 flex flex-col min-h-[550px] gap-4 ${column.color}`}>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <h3 className="font-bold text-sm text-slate-900">{column.name}</h3>
                <span className="bg-slate-900 text-white font-mono text-[10px] px-2 py-0.5 rounded-full">{colOS.length}</span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {colOS.map((os) => {
                  // Motor de Recorrência
                  const ninetyDaysAgo = new Date(os.createdAt);
                  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                  const recurrenceCount = ordensServico.filter(otherOS => 
                    otherOS.deviceId === os.deviceId &&
                    new Date(otherOS.createdAt) >= ninetyDaysAgo &&
                    new Date(otherOS.createdAt) <= new Date(os.createdAt)
                  ).length;
                  const hasRecurrence = recurrenceCount >= 3;

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
                    </div>

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
                                  <span className="font-bold text-slate-850">{p.name}</span>
                                  <span className="text-slate-400 mx-2">|</span>
                                  <span className="text-slate-500 font-mono font-semibold">{p.quantity} x R$ {p.price.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span className="font-bold text-slate-900 font-mono">
                                    R$ {(p.price * p.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePartFromOS(p.partId)}
                                    className="text-red-500 hover:text-red-700 transition"
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
                <p className="font-bold text-slate-950 text-sm">{(activePrintOS as any).device?.type || "Notebook"} {(activePrintOS as any).device?.brand || "Dell"}</p>
                <p className="mt-1.5 font-medium text-slate-700">Modelo: {(activePrintOS as any).device?.model || "Inspiron"}</p>
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
                  - R$ { ((closingOS.usedParts?.reduce((sum, item) => sum + ((item.costSnapshot || 0) * item.quantity), 0) || 0) + ((closingOS.technicianLaborHours || 0) * (closingOS.technicianHourlyRate || 0))).toFixed(2) }
                </span>
              </div>
              
              <div className="flex justify-between items-center bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                <span className="text-sm font-bold text-slate-800">Margem de Lucro Real</span>
                <span className="font-mono font-extrabold text-indigo-700">
                  R$ { (closingOS.totalCost - ((closingOS.usedParts?.reduce((sum, item) => sum + ((item.costSnapshot || 0) * item.quantity), 0) || 0) + ((closingOS.technicianLaborHours || 0) * (closingOS.technicianHourlyRate || 0)))).toFixed(2) }
                </span>
              </div>
              
              {closingOS.usedParts?.some(p => !p.costSnapshot) && (
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
    </div>
  );
}
