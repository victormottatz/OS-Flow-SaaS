/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { Part, UserRole } from "../types";

interface StockManagerProps {
  parts: Part[];
  userRole: UserRole;
  isOffline: boolean;
  onRefresh: () => void;
}

type SortField = "name" | "code" | "stock" | "cost" | "price" | "stockMin";
type SortDirection = "asc" | "desc";
type StockFilter = "all" | "low" | "serialized";

export default function StockManager({ parts, userRole, isOffline, onRefresh }: StockManagerProps) {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // CRUD Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [formData, setFormData] = useState({
    name: "", code: "", sku: "", barcode: "",
    stock: 0, stockMin: 0, cost: 0, price: 0,
    requiresSerial: false, supplier: "", location: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
  const totalItems = parts.length;
  const lowStockCount = parts.filter(p => p.stock <= (p.stockMin || 0)).length;
  const serializedCount = parts.filter(p => p.requiresSerial).length;
  const totalStockValue = parts.reduce((sum, p) => sum + (p.cost * p.stock), 0);

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
    setFormData({ name: "", code: "", sku: "", barcode: "", stock: 0, stockMin: 0, cost: 0, price: 0, requiresSerial: false, supplier: "", location: "" });
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
      location: part.location || ""
    });
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
              onChange={(e) => setSearchQuery(e.target.value)}
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

          {/* Add Button */}
          {userRole !== UserRole.TECHNICIAN && (
            <button
              onClick={openCreateModal}
              disabled={isOffline}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-secondary-container hover:bg-secondary-container-hover text-primary-container text-xs font-bold rounded-xl transition cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
              <span>Nova Peça</span>
            </button>
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
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 flex items-center justify-between text-[10px] text-slate-500 font-bold">
          <span>Exibindo {filteredParts.length} de {totalItems} itens</span>
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
    </div>
  );
}
