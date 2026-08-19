/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { OrdemServico, OSStatus, EntradaFoto } from "../types";
import { useOSList } from "../hooks/useOSList";
import { SearchScope } from "../utils/searchUtils";

import { usePrintDocument } from "../hooks/usePrintDocument";
import { resolveTemplateForOS, DOCUMENT_TEMPLATES, DocumentTemplate } from "../config/documents.config";
import { downloadDocumentPdf } from "../utils/downloadDocument";
import DocumentShell from "./DocumentShell";
import TagSelector from "./TagSelector";

interface OSListProps {
  userRole: string;
  isOffline: boolean;
  onRefresh: () => void;
}

const getStatusBadgeClass = (status: OSStatus, closingReason?: string | null) => {
  if (status === "FINALIZADO") {
    if (closingReason === "ORCAMENTO_RECUSADO") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (closingReason === "DESCARTE_CLIENTE_RETIRA" || closingReason === "DESCARTE_OFICINA") {
      return "bg-slate-100 text-slate-650 border-slate-300";
    }
  }
  switch (status) {
    case "AGUARDANDO_AVALIACAO":
      return "bg-slate-50 text-slate-700 border-slate-200";
    case "AGUARDANDO_AUTORIZACAO":
      return "bg-blue-50 text-blue-750 border-blue-200";
    case "AGUARDANDO_PECA":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "EM_MANUTENCAO":
      return "bg-purple-50 text-purple-750 border-purple-200";
    case "PRONTO_RETIRADA":
      return "bg-teal-50 text-teal-800 border-teal-200";
    case "PAGO_PRONTO_RETIRADA":
      return "bg-cyan-50 text-cyan-800 border-cyan-200";
    case "FINALIZADO":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

const getStatusName = (status: OSStatus, closingReason?: string | null) => {
  if (status === "FINALIZADO") {
    if (closingReason === "ORCAMENTO_RECUSADO") return "Sem Reparo (Recusado)";
    if (closingReason === "DESCARTE_CLIENTE_RETIRA") return "Descarte (Cliente Retira)";
    if (closingReason === "DESCARTE_OFICINA") return "Descarte (Oficina)";
  }
  switch (status) {
    case "AGUARDANDO_AVALIACAO": return "Aguardando Avaliação";
    case "AGUARDANDO_AUTORIZACAO": return "Aguardando Autorização";
    case "AGUARDANDO_PECA": return "Aguardando Peça";
    case "EM_MANUTENCAO": return "Em Manutenção";
    case "PRONTO_RETIRADA": return "Pronto p/ Retirada";
    case "PAGO_PRONTO_RETIRADA": return "Pago Pronto p/ Retirada";
    case "FINALIZADO": return "Finalizado";
    default: return status;
  }
};

export default function OSList({ isOffline, onRefresh, userRole }: OSListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<OSStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null);
  const [activePrintOS, setActivePrintOS] = useState<OrdemServico | null>(null);
  const [activePrintTemplate, setActivePrintTemplate] = useState<DocumentTemplate | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<EntradaFoto | null>(null);
  const [modalTab, setModalTab] = useState<"laudo" | "pecas" | "entrada" | "saida">("laudo");
  const [searchScope, setSearchScope] = useState<SearchScope>("all");
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);

  const pageSize = 50;

  // Reset to page 1 when search or status filter changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  const {
    data: ordensServico,
    total,
    page: currentPage,
    totalPages,
    hasMore,
    loading,
    error,
    countsByStatus,
    refetch,
  } = useOSList({
    page,
    pageSize,
    search: searchTerm || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const handleRefresh = () => {
    refetch();
    onRefresh();
  };

  const printDocument = usePrintDocument();

  const handlePrintReceipt = async (os: OrdemServico) => {
    const template = resolveTemplateForOS(os);
    // PDF real gerado no servidor; fallback para a impressão via navegador se falhar.
    const ok = await downloadDocumentPdf(template.id, os.id, `${template.nomeArquivo}-${os.osNumber}`);
    if (!ok) {
      setActivePrintOS(os);
      setActivePrintTemplate(template);
      printDocument(`${template.nomeArquivo}-${os.osNumber}`);
    }
  };

  const handlePrintTermo = async (os: OrdemServico) => {
    const template = DOCUMENT_TEMPLATES.termo;
    // PDF real gerado no servidor; fallback para a impressão via navegador se falhar.
    const ok = await downloadDocumentPdf(template.id, os.id, `${template.nomeArquivo}-${os.osNumber}`);
    if (!ok) {
      setActivePrintOS(os);
      setActivePrintTemplate(template);
      printDocument(`${template.nomeArquivo}-${os.osNumber}`);
    }
  };

  const handleStatusChange = async (osId: string, newStatus: OSStatus) => {
    if (!confirm(`Tem certeza que deseja mover esta Ordem de Serviço para a fase "${newStatus.replace(/_/g, ' ')}"?`)) return;
    
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const resStatus = await fetch(`/api/ordens-servico/${osId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!resStatus.ok) {
        const errData = await resStatus.json().catch(() => ({}));
        if (errData.code === "DEVICE_INCOMPLETE") {
           alert("Aparelho com cadastro incompleto.\n\nPor favor, vá até a tela da Oficina (Kanban) e mude a fase lá. Assim, a tela para completar a Marca e Modelo do aparelho será exibida corretamente para você.");
           return;
        }
        throw new Error(errData.error || "Erro ao mudar fase da OS.");
      }
      
      alert("Fase da OS alterada com sucesso!");
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getOSTotal = (os: OrdemServico) => {
    if (os.totalCost !== undefined && os.totalCost !== null && os.totalCost > 0) {
      return os.totalCost;
    }
    const partsTotal = os.usedParts?.filter(i => i.category !== "SERVICO").reduce((s, i) => s + (i.price * i.quantity), 0) || 0;
    const labor = os.laborCost || 0;
    const discount = os.discount || 0;
    return Math.max(0, partsTotal + labor - discount);
  };

  const renderPageNumbers = (current: number, total: number, goTo: (p: number) => void) => {
    const pages: (number | string)[] = [];
    const delta = 2;
    const start = Math.max(2, current - delta);
    const end = Math.min(total - 1, current + delta);
    pages.push(1);
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push('...');
    if (total > 1) pages.push(total);
    return pages.map((p, i) =>
      typeof p === 'string' ? (
        <span key={`e${i}`} className="px-1 text-slate-300 text-xs">…</span>
      ) : (
        <button
          key={p}
          onClick={() => goTo(p)}
          className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition cursor-pointer ${
            p === current
              ? 'bg-indigo-650 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          {p}
        </button>
      )
    );
  };

  const handleOpenDetails = async (os: OrdemServico) => {
    setSelectedOS(os);
    setModalTab("laudo");
    setEditTagIds(((os as any).tags || []).map((t: any) => t.id));
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch(`/api/ordens-servico/${os.id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const fullOS = await res.json();
        setSelectedOS(fullOS);
        setEditTagIds((fullOS.tags || []).map((t: any) => t.id));
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes completos da OS:", err);
    }
  };

  const handleSaveTags = async () => {
    if (!selectedOS) return;
    setSavingTags(true);
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch(`/api/ordens-servico/${selectedOS.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ tagIds: editTagIds })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedOS(prev =>
          prev ? { ...updated, tags: updated.tags || [] } : updated
        );
        handleRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Erro ao salvar etiquetas.");
      }
    } catch (err: any) {
      alert("Erro ao salvar etiquetas: " + err.message);
    } finally {
      setSavingTags(false);
    }
  };

  return (
    <div className="space-y-6 anim-fadein select-none">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Listagem de OS</h2>
          <p className="text-slate-500 text-sm">Visualização, busca rápida e auditoria geral de todas as Ordens de Serviço</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm text-xs text-slate-500">
            <span className="material-symbols-outlined text-[16px] text-slate-400">database</span>
            <span className="font-semibold">{total} OS{total !== 1 ? 's' : ''}</span>
            {total > 0 && (
              <span className="text-slate-300 mx-0.5">·</span>
            )}
            {total > 0 && (
              <span className="text-slate-400">Página {currentPage} de {totalPages}</span>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>
              {loading ? 'progress_activity' : 'sync'}
            </span> {loading ? 'Carregando...' : 'Recarregar'}
          </button>
        </div>
      </div>

      {/* Control Panel (Search + Status Filter) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row items-center gap-4">
        {/* Search Field with Scope Dropdown Selector */}
        <div className="flex-1 relative w-full group flex flex-col sm:flex-row items-center gap-2">
          <div className="relative w-full flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                searchScope === "osNumber" ? "Pesquisar por número da OS..." :
                searchScope === "name" ? "Pesquisar por nome do cliente..." :
                searchScope === "phone" ? "Pesquisar por número ou dígitos do telefone..." :
                searchScope === "document" ? "Pesquisar por CPF ou CNPJ..." :
                searchScope === "address" ? "Pesquisar por endereço..." :
                searchScope === "device" ? "Pesquisar por marca, modelo ou nº de série..." :
                "Pesquisar por OS, cliente, aparelho, laudo ou sintomas..."
              }
              className="w-full pl-12 pr-10 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button 
                type="button" 
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-750 bg-slate-100 hover:bg-slate-200 rounded-full p-1 transition"
              >
                <span className="material-symbols-outlined text-[16px] block">close</span>
              </button>
            )}
          </div>

          <select
            value={searchScope}
            onChange={(e) => setSearchScope(e.target.value as SearchScope)}
            className="w-full sm:w-auto px-3.5 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shrink-0 cursor-pointer shadow-xs"
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

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2 hidden xl:inline">Status:</label>
          {(() => {
            const totalAllOS = countsByStatus ? Object.values(countsByStatus).reduce((a, b) => a + b, 0) : total;
            return (
            <>
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  statusFilter === "ALL" 
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm" 
                    : "bg-slate-50 text-slate-650 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Todas {totalAllOS > 0 && `(${totalAllOS})`}
              </button>
              {(["AGUARDANDO_AVALIACAO", "AGUARDANDO_AUTORIZACAO", "AGUARDANDO_PECA", "EM_MANUTENCAO", "PRONTO_RETIRADA", "PAGO_PRONTO_RETIRADA", "FINALIZADO"] as OSStatus[]).map((status) => {
                const active = statusFilter === status;
                const count = countsByStatus ? countsByStatus[status] : 0;
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      active 
                        ? "bg-indigo-650 text-white border-indigo-650 shadow-sm" 
                        : "bg-slate-50 text-slate-650 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {getStatusName(status)} {count !== undefined && count > 0 ? `(${count})` : "(0)"}
                  </button>
                );
              })}
            </>
          );
        })()}
        </div>
      </div>

      {/* Loading State */}
      {loading && !error && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <span className="material-symbols-outlined text-[48px] text-slate-300 mx-auto mb-2 block animate-spin">progress_activity</span>
            <p className="text-sm font-bold text-slate-600">Carregando ordens de serviço...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-red-400">
            <span className="material-symbols-outlined text-[48px] text-red-300 mx-auto mb-2 block">error_outline</span>
            <p className="text-sm font-bold text-red-600">Erro ao carregar OSs</p>
            <p className="text-xs text-red-500 mt-1">{error}</p>
            <button onClick={handleRefresh} className="mt-4 px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold text-red-700 transition cursor-pointer">
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* OS Data Table */}
      {!loading && !error && (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {ordensServico.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-450 font-bold uppercase text-[9px] tracking-wider">
                  <th className="px-6 py-4 font-bold">Nº OS</th>
                  <th className="px-6 py-4 font-bold">Cliente</th>
                  <th className="px-6 py-4 font-bold">Equipamento</th>
                  <th className="px-6 py-4 font-bold">Data de Abertura</th>
                  <th className="px-6 py-4 font-bold">Fase / Status</th>
                  <th className="px-6 py-4 font-bold text-right">Valor Total</th>
                  <th className="px-6 py-4 font-bold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {ordensServico.map((os) => {
                  const total = getOSTotal(os);
                  return (
                    <tr key={os.id} className="hover:bg-slate-50/40 text-slate-700 transition">
                      <td className="px-6 py-4 font-bold font-mono text-slate-900">
                        <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded border border-slate-200/60">{os.osNumber}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-extrabold text-slate-900 text-[13px]">{os.client?.name || "Cliente Desconhecido"}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{os.client?.phone || "Telefone não cadastrado"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-850">
                          {os.device?.brand || "Aparelho"} {os.device?.type || ""} {os.device?.model && os.device.model.toLowerCase() !== 'indefinido' ? `(${os.device.model})` : ""}
                        </p>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-500">
                        {new Date(os.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <select 
                            value={os.status}
                            onChange={(e) => handleStatusChange(os.id, e.target.value as OSStatus)}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold border cursor-pointer outline-none appearance-none ${getStatusBadgeClass(os.status, os.closingReason)}`}
                            style={{ textAlign: 'center', textAlignLast: 'center' }}
                            title="Clique para alterar a fase da OS"
                          >
                            <option value="AGUARDANDO_AVALIACAO">Aguardando Avaliação</option>
                            <option value="AGUARDANDO_AUTORIZACAO">Aguardando Autorização</option>
                            <option value="AGUARDANDO_PECA">Aguardando Peça</option>
                            <option value="EM_MANUTENCAO">Em Manutenção</option>
                            <option value="PRONTO_RETIRADA">Pronto p/ Retirada</option>
                            <option value="PAGO_PRONTO_RETIRADA">Pago Pronto p/ Retirada</option>
                            {os.status === "FINALIZADO" && os.closingReason ? (
                              <option value="FINALIZADO">{getStatusName(os.status, os.closingReason)}</option>
                            ) : (
                              <option value="FINALIZADO">Finalizado</option>
                            )}
                          </select>
                          <div className="flex flex-wrap gap-1">
                            {[13, 16, 18, 23].includes(os.statusCode) && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Garantia
                              </span>
                            )}
                            {[15, 17].includes(os.statusCode) && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                Pagamento Pendente
                              </span>
                            )}
                            {os.statusCode === 9 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-extrabold bg-slate-100 text-slate-700 border border-slate-350">
                                Sem Conserto
                              </span>
                            )}
                            {os.statusCode === 25 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                                Conferência Manual
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 text-right text-[13px]">
                        R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenDetails(os)}
                            className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-650 border border-slate-200 hover:border-indigo-200 rounded-lg text-slate-500 transition cursor-pointer"
                            title="Visualizar laudo técnico"
                          >
                            <span className="material-symbols-outlined text-[16px] block">visibility</span>
                          </button>
                          <button
                            onClick={() => handlePrintTermo(os)}
                            className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-650 border border-slate-200 hover:border-indigo-200 rounded-lg text-indigo-600 transition cursor-pointer"
                            title="Imprimir Termo de Recebimento"
                          >
                            <span className="material-symbols-outlined text-[16px] block">assignment</span>
                          </button>
                          <button
                            onClick={() => handlePrintReceipt(os)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-650 transition cursor-pointer"
                            title="Imprimir recibo / orçamento"
                          >
                            <span className="material-symbols-outlined text-[16px] block">print</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400 bg-white">
            <span className="material-symbols-outlined text-[48px] text-slate-300 mx-auto mb-2 block">assignment_late</span>
            <p className="text-sm font-bold text-slate-800">Nenhuma Ordem de Serviço encontrada</p>
            <p className="text-xs text-slate-500 mt-1">Experimente limpar os filtros ou digitar termos de busca mais simples.</p>
          </div>
        )}
      </div>
      )}

      {/* Pagination Controls */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200/80 shadow-sm px-6 py-3 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            ← Anterior
          </button>
          <div className="flex items-center gap-2">
            {renderPageNumbers(currentPage, totalPages, setPage)}
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Próxima →
          </button>
        </div>
      )}

      {/* DETAIL MODAL VIEWER */}
      {selectedOS && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden anim-slideup">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between sticky top-0 z-15 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <span className="material-symbols-outlined text-[20px] text-teal-400 shrink-0">inventory_2</span>
                <h3 className="font-bold text-base font-display">Consulta de OS - {selectedOS.osNumber}</h3>
              </div>
              <button onClick={() => setSelectedOS(null)} className="text-slate-450 hover:text-white transition cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 py-2 gap-2 select-none">
              <button 
                type="button" 
                onClick={() => setModalTab("laudo")}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all duration-200 active:scale-95 ${
                  modalTab === "laudo" ? "bg-slate-900 text-white shadow-sm" : "text-slate-650 hover:bg-slate-200/60"
                }`}
              >
                1. Laudo & Custos
              </button>
              <button 
                type="button" 
                onClick={() => setModalTab("pecas")}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all duration-200 active:scale-95 ${
                  modalTab === "pecas" ? "bg-slate-900 text-white shadow-sm" : "text-slate-650 hover:bg-slate-200/60"
                }`}
              >
                2. Peças Aplicadas
              </button>
              <button 
                type="button" 
                onClick={() => setModalTab("entrada")}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all duration-200 active:scale-95 ${
                  modalTab === "entrada" ? "bg-slate-900 text-white shadow-sm" : "text-slate-650 hover:bg-slate-200/60"
                }`}
              >
                3. Checklist de Entrada
              </button>
              {selectedOS.checklistSaida && selectedOS.checklistSaida.length > 0 && (
                <button 
                  type="button" 
                  onClick={() => setModalTab("saida")}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all duration-200 active:scale-95 ${
                    modalTab === "saida" ? "bg-slate-900 text-white shadow-sm" : "text-slate-650 hover:bg-slate-200/60"
                  }`}
                >
                  4. Checklist de Saída
                </button>
              )}
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-slate-50/30">
              
              {/* Client & Device Card Banner */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <p>
                  <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Cliente</span> 
                  <strong className="text-slate-800 text-sm mt-0.5 block">{selectedOS.client?.name || "Desconhecido"}</strong>
                  <span className="text-slate-500 block font-mono text-[10px] mt-0.5">TEL: {selectedOS.client?.phone || "N/A"}</span>
                </p>
                <p>
                  <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Dispositivo</span> 
                  <strong className="text-slate-800 text-sm mt-0.5 block">{selectedOS.device?.type} {selectedOS.device?.brand}</strong>
                  <span className="text-slate-500 block font-semibold text-[10px] mt-0.5">MODELO: {selectedOS.device?.model} | SÉRIE: {selectedOS.device?.serialNumber}</span>
                </p>
                <p className="sm:col-span-2 border-t border-slate-100 pt-2">
                  <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Defeito Relatado</span> 
                  <span className="text-slate-650 italic block mt-1">"{selectedOS.reportedDefect || "N/A"}"</span>
                </p>
                {selectedOS.accessoriesLeft && (
                  <p className="border-t border-slate-100 pt-2">
                    <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Acessórios Deixados</span> 
                    <span className="text-slate-700 font-semibold block mt-0.5 font-mono">{selectedOS.accessoriesLeft}</span>
                  </p>
                )}
                {selectedOS.physicalState && (
                  <p className="border-t border-slate-100 pt-2">
                    <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Estado Físico / Balcão</span> 
                    <span className="text-slate-700 font-semibold block mt-0.5 font-mono">{selectedOS.physicalState}</span>
                  </p>
                )}
                {selectedOS.tags && selectedOS.tags.length > 0 && (
                  <p className="sm:col-span-2 border-t border-slate-100 pt-2">
                    <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block mb-1.5">Etiquetas</span>
                    <span className="flex flex-wrap gap-1.5">
                      {selectedOS.tags.map((tag: any) => (
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
              </div>

              {/* TAB 1: LAUDO & CUSTOS */}
              {modalTab === "laudo" && (
                <div className="space-y-5 anim-fadein">
                  {/* Etiquetas da OS (editáveis em qualquer etapa) */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-indigo-500">sell</span>
                        Etiquetas da OS
                      </label>
                      <button
                        type="button"
                        onClick={handleSaveTags}
                        disabled={savingTags}
                        className="text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        {savingTags ? "Salvando..." : "Salvar Etiquetas"}
                      </button>
                    </div>
                    <TagSelector selectedTagIds={editTagIds} onChange={setEditTagIds} scope="ORDEM_SERVICO" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Laudo Técnico da OS (Interno)</label>
                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold font-mono leading-relaxed min-h-[100px] whitespace-pre-wrap">
                      {selectedOS.diagnostic || "Ainda sem laudo técnico emitido."}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Laudo Comercial (Visível no Portal do Cliente)</label>
                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold font-mono leading-relaxed min-h-[70px] whitespace-pre-wrap">
                      {selectedOS.laudoMacro || "Ainda sem laudo comercial emitido."}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-xs font-semibold select-none">
                    <div className="bg-white p-3 border border-slate-200 rounded-xl">
                      <span className="text-[9px] text-slate-400 uppercase block tracking-wider font-bold">Mão de Obra</span>
                      <span className="text-slate-900 font-bold font-mono text-sm block mt-1">R$ {selectedOS.laborCost?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="bg-white p-3 border border-slate-200 rounded-xl">
                      <span className="text-[9px] text-slate-400 uppercase block tracking-wider font-bold">Horas Alocadas</span>
                      <span className="text-slate-900 font-bold font-mono text-sm block mt-1">{selectedOS.technicianLaborHours || "0"}h</span>
                    </div>
                    <div className="bg-white p-3 border border-slate-200 rounded-xl bg-slate-950 border-slate-950 text-white">
                      <span className="text-[9px] text-slate-400 uppercase block tracking-wider font-bold">Total Faturado</span>
                      <span className="text-emerald-400 font-extrabold font-mono text-sm block mt-1">R$ {getOSTotal(selectedOS).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: USED PARTS */}
              {modalTab === "pecas" && (
                <div className="space-y-4 anim-fadein">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Histórico de Insumos da OS</h4>
                  {!selectedOS.usedParts || selectedOS.usedParts.length === 0 ? (
                    <div className="p-8 text-center text-slate-450 italic bg-white border border-slate-200 rounded-xl text-xs">
                      Nenhuma peça alocada a esta Ordem de Serviço.
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                            <th className="px-4 py-2.5 font-bold">Descrição da Peça</th>
                            <th className="px-4 py-2.5 font-bold text-center">Quantidade</th>
                            <th className="px-4 py-2.5 font-bold text-right">Preço Un. (R$)</th>
                            <th className="px-4 py-2.5 font-bold text-right">Total (R$)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150">
                          {selectedOS.usedParts.map((item, idx) => (
                            <tr key={idx} className="text-slate-700">
                              <td className="px-4 py-3 font-semibold">
                                <p className="font-bold text-slate-900">{item.name}</p>
                                {item.serialNumber && (
                                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">N/S: <span className="bg-slate-100 px-1 py-0.5 rounded border">{item.serialNumber}</span></p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center font-mono font-bold">{item.quantity}</td>
                              <td className="px-4 py-3 text-right font-mono font-semibold">R$ {item.price.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">R$ {(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CHECKLIST ENTRADA */}
              {modalTab === "entrada" && (
                <div className="space-y-6 anim-fadein">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Checklist */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Condições de Recepção do Aparelho</h4>
                      <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 max-h-[300px] overflow-y-auto">
                        {selectedOS.checklistEntrada && selectedOS.checklistEntrada.length > 0 ? (
                          selectedOS.checklistEntrada.map((item) => (
                            <div key={item.id} className="flex justify-between items-center text-xs py-1 border-b last:border-b-0 border-slate-100">
                              <span className="font-semibold text-slate-700">{item.label}</span>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${
                                  item.status === "OK" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  item.status === "AVARIA" ? "bg-rose-50 text-rose-700 border-rose-200" :
                                  "bg-slate-50 text-slate-500 border-slate-200"
                                }`}>
                                  {item.status === "OK" ? "✓ OK" : item.status === "AVARIA" ? "✗ Avaria" : "N/A"}
                                </span>
                                {item.observacao && (
                                  <span className="text-[10px] text-slate-450 italic">({item.observacao})</span>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-400 italic text-center text-xs py-8">Nenhum checklist de entrada registrado.</p>
                        )}
                      </div>
                    </div>

                    {/* Photos */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Laudo Fotográfico de Entrada</h4>
                      {selectedOS.laudoFotos && selectedOS.laudoFotos.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                          {selectedOS.laudoFotos.map((photo) => (
                            <div 
                              key={photo.id} 
                              onClick={() => setLightboxPhoto(photo)}
                              className="bg-white border border-slate-200 rounded-xl p-1.5 cursor-pointer hover:shadow-sm transition"
                            >
                              <img src={photo.dataUrl} alt="Laudo entrada" className="w-full h-24 object-cover rounded-lg" />
                              {photo.legenda && (
                                <p className="text-[9px] text-slate-550 font-medium truncate mt-1.5 px-1">{photo.legenda}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400 italic bg-white border border-dashed border-slate-200 rounded-xl text-xs py-16">
                          Sem anexos fotográficos.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: CHECKLIST SAIDA */}
              {modalTab === "saida" && selectedOS.checklistSaida && (
                <div className="space-y-3 anim-fadein">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Checklist de Liberação Técnica (Saída)</h4>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 max-w-xl">
                    {selectedOS.checklistSaida.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-xs py-1.5 border-b last:border-b-0 border-slate-150">
                        <span className="font-semibold text-slate-700">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${
                            item.status === "OK" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            item.status === "AVARIA" ? "bg-rose-50 text-rose-700 border-rose-200" :
                            "bg-slate-50 text-slate-500 border-slate-200"
                          }`}>
                            {item.status === "OK" ? "✓ Aprovado" : item.status === "AVARIA" ? "✗ Reprovado" : "N/A"}
                          </span>
                          {item.observacao && (
                            <span className="text-[10px] text-slate-450 italic">({item.observacao})</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center select-none">
              <div className="flex gap-2">
                <button
                  onClick={() => handlePrintTermo(selectedOS)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                  title="Imprimir Termo de Recebimento"
                >
                  <span className="material-symbols-outlined text-[16px]">assignment</span> Imprimir Termo de Recebimento
                </button>
                <button
                  onClick={() => handlePrintReceipt(selectedOS)}
                  className="bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span> {selectedOS.status === "PRONTO_RETIRADA" || selectedOS.status === "FINALIZADO" ? "Imprimir Termo/Recibo" : "Imprimir Orçamento"}
                </button>
              </div>
              <button
                onClick={() => setSelectedOS(null)}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for large photo viewing */}
      {lightboxPhoto && (
        <div 
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 z-[60]"
          onClick={() => setLightboxPhoto(null)}
        >
          <div className="max-w-3xl w-full max-h-[85vh] flex items-center justify-center relative select-none">
            <img src={lightboxPhoto.dataUrl} alt="Visualização em tamanho real" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-slate-800" />
            <button 
              onClick={() => setLightboxPhoto(null)} 
              className="absolute top-4 right-4 bg-slate-900/60 hover:bg-slate-900 text-white w-10 h-10 rounded-full flex items-center justify-center transition border border-slate-700 cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          {lightboxPhoto.legenda && (
            <p className="mt-4 text-white font-medium text-sm bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-800 select-none">{lightboxPhoto.legenda}</p>
          )}
        </div>
      )}

      {/* HIDDEN PRINTABLE CONTAINER */}
      {activePrintOS && (
        <DocumentShell
          template={activePrintTemplate || resolveTemplateForOS(activePrintOS)}
          os={activePrintOS}
          hidden
        />
      )}
    </div>
  );
}
