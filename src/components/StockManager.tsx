/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { Part, UserRole } from "../types";
import { useFeatureFlags } from "../contexts/FeatureFlagContext";

interface StockManagerProps {
  parts: Part[];
  userRole: UserRole;
  isOffline: boolean;
  onRefresh: () => void;
  limit: number | "all";
  onLimitChange: (limit: number | "all") => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalItemsCount: number;
  dbLowStockCount?: number;
  dbSerializedCount?: number;
  dbTotalStockValue?: number;
}

type SortField = "name" | "code" | "stock" | "cost" | "price" | "stockMin";
type SortDirection = "asc" | "desc";
type StockFilter = "all" | "low" | "serialized";

export default function StockManager({ 
  parts, 
  userRole, 
  isOffline, 
  onRefresh, 
  limit, 
  onLimitChange, 
  searchQuery, 
  onSearchChange, 
  totalItemsCount,
  dbLowStockCount = 0,
  dbSerializedCount = 0,
  dbTotalStockValue = 0
}: StockManagerProps) {
  // Search & Filter State
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // CRUD Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [formData, setFormData] = useState({
    name: "", code: "", sku: "", barcode: "",
    stock: 0, stockMin: 0, cost: 0, price: 0,
    requiresSerial: false, supplier: "", location: "",
    // Campos Fiscais
    unit: "UN", gtin: "", ncm: "", cest: "",
    manufacturerCode: "", manufacturer: "", cnpjFab: "",
    partGroup: "", partSubgroup: "",
    weightGross: 0, weightNet: 0,
    cstOrigem: "0", cstIcms: "000",
    icmsAliq: 0, icmsStAliq: 0, icmsRedBc: 100,
    cfopIntraEstadual: "5102", cfopInterEstadual: "6102",
    ipiAliq: 0, ipiEnquadramento: "999",
    pisAliq: 0, cofinsAliq: 0,
    totalTributos: 0, cBenef: "", indEscala: "S",
    bcStRetido: 0, icmsStRetido: 0, aliqSt: 0, icmsSubstituto: 0,
    redBcEfet: 0, bcEfet: 0, icmsEfetAliq: 0, icmsEfetValor: 0
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showFiscalSection, setShowFiscalSection] = useState(false);

  // XML Import states (Fase 1 / Bling XML Purchase Import)
  const [showImportModal, setShowImportModal] = useState(false);
  const [xmlContent, setXmlContent] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importError, setImportError] = useState("");

  const { isFeatureEnabled } = useFeatureFlags();

  // Computed: filtered and sorted parts
  const filteredParts = useMemo(() => {
    let result = [...parts];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.supplier && p.supplier.toLowerCase().includes(q))
      );
    }

    // Stock level filter
    if (stockFilter === "low") {
      result = result.filter(p => p.stock <= (p.stockMin || 0));
    } else if (stockFilter === "serialized") {
      result = result.filter(p => p.requiresSerial);
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField] ?? "";
      const bVal = b[sortField] ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return result;
  }, [parts, searchQuery, stockFilter, sortField, sortDirection]);

  // Stats
  const totalItems = totalItemsCount || parts.length;
  const lowStockCount = dbLowStockCount ?? parts.filter(p => p.stock <= (p.stockMin || 0)).length;
  const serializedCount = dbSerializedCount ?? parts.filter(p => p.requiresSerial).length;
  const totalStockValue = dbTotalStockValue ?? parts.reduce((sum, p) => sum + (p.cost * p.stock), 0);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const openCreateModal = () => {
    setEditingPart(null);
    setFormData({
      name: "", code: "", sku: "", barcode: "",
      stock: 0, stockMin: 0, cost: 0, price: 0,
      requiresSerial: false, supplier: "", location: "",
      unit: "UN", gtin: "", ncm: "", cest: "",
      manufacturerCode: "", manufacturer: "", cnpjFab: "",
      partGroup: "", partSubgroup: "",
      weightGross: 0, weightNet: 0,
      cstOrigem: "0", cstIcms: "000",
      icmsAliq: 0, icmsStAliq: 0, icmsRedBc: 100,
      cfopIntraEstadual: "5102", cfopInterEstadual: "6102",
      ipiAliq: 0, ipiEnquadramento: "999",
      pisAliq: 0, cofinsAliq: 0,
      totalTributos: 0, cBenef: "", indEscala: "S",
      bcStRetido: 0, icmsStRetido: 0, aliqSt: 0, icmsSubstituto: 0,
      redBcEfet: 0, bcEfet: 0, icmsEfetAliq: 0, icmsEfetValor: 0
    });
    setShowFiscalSection(false);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (part: Part) => {
    setEditingPart(part);
    setFormData({
      name: part.name,
      code: part.code,
      sku: part.sku || "",
      barcode: part.barcode || "",
      stock: part.stock,
      stockMin: part.stockMin || 0,
      cost: part.cost,
      price: part.price,
      requiresSerial: part.requiresSerial || false,
      supplier: part.supplier || "",
      location: part.location || "",
      unit: part.unit || "UN",
      gtin: part.gtin || "",
      ncm: part.ncm || "",
      cest: part.cest || "",
      manufacturerCode: part.manufacturerCode || "",
      manufacturer: part.manufacturer || "",
      cnpjFab: part.cnpjFab || "",
      partGroup: part.partGroup || "",
      partSubgroup: part.partSubgroup || "",
      weightGross: part.weightGross || 0,
      weightNet: part.weightNet || 0,
      cstOrigem: part.cstOrigem || "0",
      cstIcms: part.cstIcms || "000",
      icmsAliq: part.icmsAliq || 0,
      icmsStAliq: part.icmsStAliq || 0,
      icmsRedBc: part.icmsRedBc ?? 100,
      cfopIntraEstadual: part.cfopIntraEstadual || "5102",
      cfopInterEstadual: part.cfopInterEstadual || "6102",
      ipiAliq: part.ipiAliq || 0,
      ipiEnquadramento: part.ipiEnquadramento || "999",
      pisAliq: part.pisAliq || 0,
      cofinsAliq: part.cofinsAliq || 0,
      totalTributos: part.totalTributos || 0,
      cBenef: part.cBenef || "",
      indEscala: part.indEscala || "S",
      bcStRetido: part.bcStRetido || 0,
      icmsStRetido: part.icmsStRetido || 0,
      aliqSt: part.aliqSt || 0,
      icmsSubstituto: part.icmsSubstituto || 0,
      redBcEfet: part.redBcEfet || 0,
      bcEfet: part.bcEfet || 0,
      icmsEfetAliq: part.icmsEfetAliq || 0,
      icmsEfetValor: part.icmsEfetValor || 0
    });
    // Se a peça já tem dados fiscais preenchidos, abre a seção fiscal
    setShowFiscalSection(!!(part.ncm || part.cest || (part.icmsAliq && part.icmsAliq > 0)));
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      setError("Nome e Código são obrigatórios.");
      return;
    }
    setSaving(true);
    setError("");

    const token = localStorage.getItem("mgv_token") || "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const url = editingPart ? `/api/parts/${editingPart.id}` : "/api/parts";
      const method = editingPart ? "PUT" : "POST";
      const resp = await fetch(url, { method, headers, body: JSON.stringify(formData) });
      const data = await resp.json();

      if (!resp.ok) {
        setError(data.error || "Erro ao salvar peça.");
        setSaving(false);
        return;
      }

      setShowModal(false);
      onRefresh();
    } catch (err) {
      setError("Falha na comunicação com o servidor.");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem("mgv_token") || "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      await fetch(`/api/parts/${id}`, { method: "DELETE", headers });
      setDeleteConfirmId(null);
      onRefresh();
    } catch (err) {
      alert("Erro ao excluir peça.");
    }
  };

  const getStockBadge = (part: Part) => {
    if (part.stock <= 0) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>Zerado
      </span>;
    }
    if (part.stock <= (part.stockMin || 0)) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>Baixo
      </span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>OK
    </span>;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="material-symbols-outlined text-[14px] text-slate-300">unfold_more</span>;
    return <span className="material-symbols-outlined text-[14px] text-indigo-600">{sortDirection === "asc" ? "arrow_upward" : "arrow_downward"}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-600 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total de Itens</p>
              <p className="text-xl font-bold text-slate-900">{totalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-600 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Estoque Baixo</p>
              <p className="text-xl font-bold text-amber-600">{lowStockCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-violet-600 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_2</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Serialização</p>
              <p className="text-xl font-bold text-violet-600">{serializedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-600 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Valor em Estoque</p>
              <p className="text-xl font-bold text-emerald-600">R$ {totalStockValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Buscar por nome, código, SKU ou fornecedor..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-2 shrink-0">
            {([
              { key: "all" as StockFilter, label: "Todos", icon: "apps" },
              { key: "low" as StockFilter, label: "Estoque Baixo", icon: "warning" },
              { key: "serialized" as StockFilter, label: "Serialização", icon: "qr_code_2" }
            ]).map(f => (
              <button
                key={f.key}
                onClick={() => setStockFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-xl border transition cursor-pointer ${
                  stockFilter === f.key
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">{f.icon}</span>
                <span className="hidden sm:inline">{f.label}</span>
              </button>
            ))}
          </div>

          {/* Add Button & XML Import */}
          {userRole !== UserRole.TECHNICIAN && (
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              {isFeatureEnabled("FISCAL_NFE_EMISSION") && (
                <button
                  onClick={() => setShowImportModal(true)}
                  disabled={isOffline}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  <span>Importar XML NFe</span>
                </button>
              )}
              <button
                onClick={openCreateModal}
                disabled={isOffline}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-secondary-container hover:bg-secondary-container-hover text-primary-container text-xs font-bold rounded-xl transition cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
                <span>Nova Peça</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {([
                  { field: "name" as SortField, label: "Peça / Produto" },
                  { field: "code" as SortField, label: "Código" },
                  { field: "stock" as SortField, label: "Estoque" },
                  { field: "stockMin" as SortField, label: "Mín." },
                  { field: "cost" as SortField, label: "Custo" },
                  { field: "price" as SortField, label: "Preço Venda" },
                ]).map(col => (
                  <th
                    key={col.field}
                    onClick={() => handleSort(col.field)}
                    className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition select-none"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIcon field={col.field} />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Série</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <span className="material-symbols-outlined text-[40px] block mb-2">inventory_2</span>
                    <p className="text-sm font-bold">Nenhuma peça encontrada</p>
                    <p className="text-[11px] mt-1">Ajuste os filtros ou cadastre uma nova peça</p>
                  </td>
                </tr>
              ) : (
                filteredParts.map((part) => (
                  <tr key={part.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-bold text-slate-800">{part.name}</p>
                        {part.supplier && <p className="text-[10px] text-slate-400 mt-0.5">{part.supplier}</p>}
                        {part.location && <p className="text-[10px] text-slate-400">📍 {part.location}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{part.code}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{part.stock}</td>
                    <td className="px-4 py-3 text-slate-500">{part.stockMin || 0}</td>
                    <td className="px-4 py-3 text-slate-600">R$ {(part.cost || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">R$ {(part.price || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">{getStockBadge(part)}</td>
                    <td className="px-4 py-3">
                      {part.requiresSerial ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold">
                          <span className="material-symbols-outlined text-[12px]">qr_code_2</span>Obrigatório
                        </span>
                      ) : (
                        <span className="text-slate-300 text-[10px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {userRole !== UserRole.TECHNICIAN && (
                          <button
                            onClick={() => openEditModal(part)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                        )}
                        {userRole === UserRole.OWNER && (
                          <>
                            {deleteConfirmId === part.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleDelete(part.id)} className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition cursor-pointer text-[10px] font-bold">Sim</button>
                                <button onClick={() => setDeleteConfirmId(null)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition cursor-pointer text-[10px] font-bold">Não</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(part.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition cursor-pointer"
                                title="Excluir"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 font-bold">
          <span>Exibindo {filteredParts.length} de {totalItems} itens</span>
          
          {limit !== "all" && filteredParts.length >= (typeof limit === "number" ? limit : 100) && (
            <button
              onClick={() => onLimitChange(typeof limit === "number" ? limit + 100 : 200)}
              className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Mostrar mais (+100)
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={isOffline}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200 transition cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[14px]">refresh</span>
            Atualizar
          </button>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200">
              <h3 className="font-display font-bold text-lg text-slate-900">{editingPart ? "Editar Peça" : "Cadastrar Nova Peça"}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Preencha os dados abaixo para {editingPart ? "atualizar" : "registrar"} o item no estoque.</p>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {error}
                </div>
              )}

              {/* Row 1: Name + Code */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nome da Peça *</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" placeholder="Ex: Placa Mãe ASUS B550" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Código Interno *</label>
                  <input type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" placeholder="Ex: PM-ASUS-B550" />
                </div>
              </div>

              {/* Row 2: SKU + Barcode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">SKU</label>
                  <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" placeholder="Opcional" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Código de Barras</label>
                  <input type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" placeholder="Opcional" />
                </div>
              </div>

              {/* Row 3: Stock + Stock Min */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Estoque Atual *</label>
                  <input type="number" min="0" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Estoque Mínimo</label>
                  <input type="number" min="0" value={formData.stockMin} onChange={e => setFormData({...formData, stockMin: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                </div>
              </div>

              {/* Row 4: Cost + Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Preço de Custo (R$) *</label>
                  <input type="number" min="0" step="0.01" value={formData.cost} onChange={e => setFormData({...formData, cost: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Preço de Venda (R$) *</label>
                  <input type="number" min="0" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                </div>
              </div>

              {/* Row 5: Supplier + Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Fornecedor</label>
                  <input type="text" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" placeholder="Ex: Distribuidora XYZ" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Localização Física</label>
                  <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" placeholder="Ex: Prateleira A3" />
                </div>
              </div>

              {/* Row 6: Requires Serial Toggle */}
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.requiresSerial}
                      onChange={e => setFormData({...formData, requiresSerial: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-300 rounded-full peer-checked:bg-violet-600 transition-colors"></div>
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm peer-checked:translate-x-5 transition-transform"></div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-violet-800">Exige Número de Série na OS</p>
                    <p className="text-[10px] text-violet-600 mt-0.5">Ative para peças de alto valor. O técnico será obrigado a informar o nº de série ao instalar esta peça em uma OS.</p>
                  </div>
                </label>
              </div>

              {/* ============ DADOS FISCAIS (Collapsible) ============ */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowFiscalSection(!showFiscalSection)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-indigo-600" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
                    <span className="text-xs font-bold text-slate-700">Dados Fiscais / Tributários</span>
                    {formData.ncm && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">NCM preenchido</span>}
                  </div>
                  <span className={`material-symbols-outlined text-[16px] text-slate-400 transition-transform ${showFiscalSection ? 'rotate-180' : ''}`}>expand_more</span>
                </button>

                {showFiscalSection && (
                  <div className="p-4 space-y-4 border-t border-slate-200">

                    {/* Identificação Fiscal */}
                    <div>
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">badge</span>Identificação Fiscal
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">NCM</label>
                          <input type="text" value={formData.ncm} onChange={e => setFormData({...formData, ncm: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono" placeholder="00000000" maxLength={8} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">CEST</label>
                          <input type="text" value={formData.cest} onChange={e => setFormData({...formData, cest: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono" placeholder="0000000" maxLength={7} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">GTIN/EAN</label>
                          <input type="text" value={formData.gtin} onChange={e => setFormData({...formData, gtin: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono" placeholder="Código de barras" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Unidade</label>
                          <input type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" placeholder="UN" maxLength={6} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Peso Bruto (kg)</label>
                          <input type="number" min="0" step="0.001" value={formData.weightGross} onChange={e => setFormData({...formData, weightGross: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Peso Líquido (kg)</label>
                          <input type="number" min="0" step="0.001" value={formData.weightNet} onChange={e => setFormData({...formData, weightNet: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                        </div>
                      </div>
                    </div>

                    {/* Fabricante */}
                    <div>
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">factory</span>Fabricante
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Cód. Fabricante</label>
                          <input type="text" value={formData.manufacturerCode} onChange={e => setFormData({...formData, manufacturerCode: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Fabricante</label>
                          <input type="text" value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">CNPJ Fabricante</label>
                          <input type="text" value={formData.cnpjFab} onChange={e => setFormData({...formData, cnpjFab: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono" placeholder="00.000.000/0000-00" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Grupo</label>
                          <input type="text" value={formData.partGroup} onChange={e => setFormData({...formData, partGroup: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Subgrupo</label>
                          <input type="text" value={formData.partSubgroup} onChange={e => setFormData({...formData, partSubgroup: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                        </div>
                      </div>
                    </div>

                    {/* Tributação */}
                    <div>
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">calculate</span>Tributação
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Origem CST</label>
                          <select value={formData.cstOrigem} onChange={e => setFormData({...formData, cstOrigem: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400">
                            <option value="0">0 - Nacional</option>
                            <option value="1">1 - Estrangeira (Import. direta)</option>
                            <option value="2">2 - Estrangeira (Merc. interno)</option>
                            <option value="3">3 - Nacional (40-70% imp.)</option>
                            <option value="4">4 - Nacional (proc. básico)</option>
                            <option value="5">5 - Nacional (Conf. DL 288/67)</option>
                            <option value="6">6 - Estrangeira (Import. s/ similar)</option>
                            <option value="7">7 - Estrangeira (Merc. int. s/ similar)</option>
                            <option value="8">8 - Nacional (sup. 70% imp.)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">CST ICMS</label>
                          <input type="text" value={formData.cstIcms} onChange={e => setFormData({...formData, cstIcms: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono" placeholder="000" maxLength={3} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">ICMS (%)</label>
                          <input type="number" min="0" step="0.01" value={formData.icmsAliq} onChange={e => setFormData({...formData, icmsAliq: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">ICMS-ST (%)</label>
                          <input type="number" min="0" step="0.01" value={formData.icmsStAliq} onChange={e => setFormData({...formData, icmsStAliq: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Red. BC ICMS (%)</label>
                          <input type="number" min="0" max="100" step="0.01" value={formData.icmsRedBc} onChange={e => setFormData({...formData, icmsRedBc: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">IPI (%)</label>
                          <input type="number" min="0" step="0.01" value={formData.ipiAliq} onChange={e => setFormData({...formData, ipiAliq: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3 mt-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Enq. IPI</label>
                          <input type="text" value={formData.ipiEnquadramento} onChange={e => setFormData({...formData, ipiEnquadramento: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono" placeholder="999" maxLength={3} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">PIS (%)</label>
                          <input type="number" min="0" step="0.01" value={formData.pisAliq} onChange={e => setFormData({...formData, pisAliq: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">COFINS (%)</label>
                          <input type="number" min="0" step="0.01" value={formData.cofinsAliq} onChange={e => setFormData({...formData, cofinsAliq: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Tributos (R$)</label>
                          <input type="number" min="0" step="0.01" value={formData.totalTributos} onChange={e => setFormData({...formData, totalTributos: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400" />
                        </div>
                      </div>
                    </div>

                    {/* CFOP e Outros */}
                    <div>
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">local_shipping</span>CFOP e Outros
                      </p>
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">CFOP Intra-UF</label>
                          <input type="text" value={formData.cfopIntraEstadual} onChange={e => setFormData({...formData, cfopIntraEstadual: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono" placeholder="5102" maxLength={4} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">CFOP Inter-UF</label>
                          <input type="text" value={formData.cfopInterEstadual} onChange={e => setFormData({...formData, cfopInterEstadual: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono" placeholder="6102" maxLength={4} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Cód. Benefício</label>
                          <input type="text" value={formData.cBenef} onChange={e => setFormData({...formData, cBenef: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Ind. Escala</label>
                          <select value={formData.indEscala} onChange={e => setFormData({...formData, indEscala: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400">
                            <option value="S">S - Relevante</option>
                            <option value="N">N - Não Relevante</option>
                          </select>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex items-center justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-primary-container text-white text-xs font-bold rounded-xl hover:opacity-90 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving ? (
                  <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>
                )}
                {editingPart ? "Salvar Alterações" : "Cadastrar Peça"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Import XML Modal (Fase 1 / Bling XML Purchase Import) */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => {
          setShowImportModal(false);
          setXmlContent("");
          setImportResult(null);
          setImportError("");
        }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200">
              <h3 className="font-display font-bold text-lg text-slate-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-indigo-650">upload_file</span>
                Importar XML de NFe (Entrada de Estoque)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-semibold">
                Importe a nota fiscal eletrônica de compra (XML) do seu fornecedor para dar entrada automática em lote e atualizar o custo médio.
              </p>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto bg-slate-50/30">
              {importError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {importError}
                </div>
              )}

              {importResult && (
                <div className="bg-emerald-50 border border-emerald-250 text-emerald-850 p-4 rounded-xl text-xs space-y-3 shadow-inner">
                  <div className="flex items-center gap-2 font-bold text-emerald-900 border-b border-emerald-200/50 pb-2">
                    <span className="material-symbols-outlined">check_circle</span>
                    <span>Importação realizada com sucesso!</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <p>Nota Fiscal: <strong className="text-emerald-950 font-mono">{importResult.nNF}</strong></p>
                    <p>Fornecedor: <strong className="text-emerald-950">{importResult.supplier}</strong></p>
                    <p>Itens Processados: <strong>{importResult.totalItems}</strong></p>
                    <p>Cadastrados (Novos): <strong className="text-indigo-700">{importResult.createdCount}</strong></p>
                    <p>Atualizados (Estoque/Custo): <strong className="text-emerald-800">{importResult.updatedCount}</strong></p>
                  </div>
                  
                  {/* Minilog de alterações */}
                  <div className="border-t border-emerald-200/50 pt-2 space-y-1.5 max-h-[150px] overflow-y-auto custom-scrollbar">
                    <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Histórico de Alterações:</span>
                    {importResult.logs?.map((l: any, idx: number) => (
                      <div key={idx} className="bg-white/60 p-2 rounded-lg border border-emerald-100 flex justify-between items-center text-[10px]">
                        <div>
                          <strong className="text-slate-800">{l.name}</strong>
                          <span className="block font-mono text-[9px] text-slate-500">{l.code} ({l.action})</span>
                        </div>
                        <div className="text-right">
                          <span className="block font-bold">Estoque: {l.prevStock} ➔ {l.newStock}</span>
                          <span className="block text-slate-500 font-mono">Custo: R$ {l.prevCost.toFixed(2)} ➔ R$ {l.newCost.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Área */}
              {!importResult && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white rounded-2xl p-6 transition flex flex-col items-center justify-center relative cursor-pointer group">
                    <input 
                      type="file" 
                      accept=".xml" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setXmlContent(event.target.result as string);
                          }
                        };
                        reader.readAsText(file);
                      }} 
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                    />
                    <span className="material-symbols-outlined text-4xl text-slate-350 group-hover:text-indigo-500 transition mb-2">cloud_upload</span>
                    <span className="text-xs font-bold text-slate-700">Selecione o arquivo XML da NFe</span>
                    <span className="text-[10px] text-slate-400 mt-1">Limite: 1 arquivo (.xml)</span>
                  </div>

                  {xmlContent && (
                    <div className="bg-slate-900 text-slate-300 font-mono text-[10px] p-3.5 rounded-xl max-h-[120px] overflow-y-auto border border-slate-800 shadow-inner">
                      <span className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Preview do Conteúdo XML carregado:</span>
                      {xmlContent.slice(0, 1000)}...
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex items-center justify-end gap-3">
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setXmlContent("");
                  setImportResult(null);
                  setImportError("");
                }} 
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                {importResult ? "Fechar" : "Cancelar"}
              </button>
              
              {!importResult && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!xmlContent.trim()) {
                      setImportError("O conteúdo XML está vazio.");
                      return;
                    }

                    setImporting(true);
                    setImportError("");
                    setImportResult(null);

                    const token = localStorage.getItem("mgv_token") || "";
                    const headers: Record<string, string> = { "Content-Type": "application/json" };
                    if (token) headers["Authorization"] = `Bearer ${token}`;

                    try {
                      const resp = await fetch("/api/integration/bling/import-xml", {
                        method: "POST",
                        headers,
                        body: JSON.stringify({ xmlContent })
                      });
                      const data = await resp.json();

                      if (!resp.ok) {
                        setImportError(data.error || "Erro ao importar XML.");
                      } else {
                        setImportResult(data);
                        onRefresh(); // Atualiza a tabela de estoque
                      }
                    } catch (err) {
                      setImportError("Falha na comunicação com o servidor.");
                    } finally {
                      setImporting(false);
                    }
                  }}
                  disabled={importing || !xmlContent}
                  className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl hover:opacity-90 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {importing ? (
                    <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[14px]">play_for_work</span>
                  )}
                  Importar e Atualizar Estoque
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
