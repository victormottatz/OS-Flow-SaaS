/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { OrdemServico, OSStatus, Part, UsedPart, UserRole, Client, Device } from "../types";


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
  onDragStart,
  onClick
}: {
  os: OrdemServico;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick: (os: OrdemServico) => void;
}) => {
  const total = (os.usedParts?.reduce((s, i) => s + (i.price * i.quantity), 0) || 0) + (os.laborCost || 0);
  return (
    <div draggable onDragStart={(e) => onDragStart(e, os.id)} onClick={() => onClick(os)} className={`bg-white rounded-xl border border-slate-200 p-4 shadow-sm cursor-pointer transition hover:shadow-md ${getOSCardBorders(os.status)}`}>
      <div className="flex justify-between mb-2">
        <span className="text-[10px] font-bold font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{os.osNumber}</span>
      </div>
      <h4 className="font-extrabold text-slate-900 text-xs truncate">{(os as any).client?.name}</h4>
      <p className="text-[11px] text-slate-500 font-semibold">{(os as any).device?.model}</p>
      <div className="border-t mt-3 pt-2.5 flex justify-between text-[10px]">
        <span className="text-slate-400">{new Date(os.createdAt).toLocaleDateString()}</span>
        <span className="text-slate-900 font-extrabold">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
}, (prevProps, nextProps) => prevProps.os === nextProps.os);

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
  const [modalTab, setModalTab] = useState<"laudo" | "pecas">("laudo");

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
    setSelectedParts(os.usedParts || []);
    setModalTab("laudo");
    setErrorMsg("");
    setSuccessMsg("");
    setShowEditModal(true);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (isOffline) { e.preventDefault(); return; }
    setDraggingId(id);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = async (e: React.DragEvent, targetStatus: OSStatus) => {
    e.preventDefault();
    if (!draggingId || isOffline) return;
    try {
      const response = await fetch(`/api/ordens-servico/${draggingId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus })
      });
      if (response.ok) onRefresh();
    } catch (err: any) { alert(err.message); } finally { setDraggingId(null); }
  };

  const handleStatusChangeBtn = async (id: string, newStatus: OSStatus) => {
    if (isOffline) return;
    try {
      const response = await fetch(`/api/ordens-servico/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) onRefresh();
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
      setSelectedParts([...selectedParts, { partId: part.id, name: part.name, quantity: Number(tempPartQty), price: part.price }]);
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
        body: JSON.stringify({ diagnostic, usedParts: selectedParts, laborCost })
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
              <div className="flex-1 space-y-3 overflow-y-auto">
                {colOS.map((os) => {
                  return (
                    <KanbanCard 
                      key={os.id} 
                      os={os} 
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
                        {selectedParts.map((p) => (
                          <div key={p.partId} className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 hover:border-slate-350 transition duration-150">
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
                        ))}
                      </div>
                    )}
                  </div>
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
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-blue-650 hover:bg-blue-700 text-white font-extrabold text-sm rounded-lg flex-1 sm:flex-none transition shadow-sm hover-premium active-premium"
                  >
                    {loading ? "Salvando..." : "Salvar Gravações"}
                  </button>
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
    </div>
  );
}
