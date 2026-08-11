/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Tag as TagIcon, Plus, X, Trash2, Edit2, Check, PaintBucket, ShieldCheck, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { addNotification } from '../hooks/useNotifications';
import { Tag, TagScope } from '../types';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#14b8a6', 
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', 
  '#f43f5e', '#64748b', '#78716c', '#000000'
];

const SCOPE_LABELS: Record<string, { label: string; badge: string }> = {
  GLOBAL: { label: "Oficina", badge: "bg-slate-100 text-slate-600 border-slate-200" },
  CLIENT: { label: "Cliente", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  DEVICE: { label: "Aparelho", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  ORDEM_SERVICO: { label: "OS", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" }
};

const MANAGER_ROLES = ["OWNER", "ADMIN", "SUPERVISOR"];

function getCurrentUser(): { id: string; role: string; name: string } {
  try {
    const saved = JSON.parse(localStorage.getItem("mgv_user") || "{}");
    return { id: saved?.id || "", role: saved?.role || "", name: saved?.name || "" };
  } catch {
    return { id: "", role: "", name: "" };
  }
}

function getAuthHeaders(extra?: Record<string, string>) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("mgv_token") || ""}`,
    ...extra
  };
}

interface TagManagerProps {
  onClose: () => void;
}

export default function TagManager({ onClose }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [scopeFilter, setScopeFilter] = useState<string>("ALL");
  const currentUser = getCurrentUser();
  const isManager = MANAGER_ROLES.includes(currentUser.role);

  // Form state
  const [name, setName] = useState('');
  const [colorHex, setColorHex] = useState(PRESET_COLORS[0]);
  const [scope, setScope] = useState<TagScope>('GLOBAL');
  const [description, setDescription] = useState('');
  const [asGlobal, setAsGlobal] = useState(true);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tags', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch (error) {
      console.error(error);
      addNotification("Erro", "Não foi possível carregar as etiquetas.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const canManage = (tag: Tag) =>
    isManager || (tag.ownerId && tag.ownerId === currentUser.id);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const isEditing = !!editingTag;
      const url = isEditing ? `/api/tags/${editingTag.id}` : '/api/tags';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name,
          colorHex,
          scope,
          description,
          ...(!isEditing && { global: asGlobal })
        })
      });

      if (res.ok) {
        addNotification("Sucesso", `Etiqueta ${isEditing ? 'atualizada' : 'criada'} com sucesso!`, "success");
        setEditingTag(null);
        setName('');
        setColorHex(PRESET_COLORS[0]);
        setScope('GLOBAL');
        setDescription('');
        setAsGlobal(true);
        fetchTags();
      } else {
        const err = await res.json().catch(() => ({}));
        addNotification("Erro", err.error || "Falha ao salvar etiqueta.", "error");
      }
    } catch (error) {
      addNotification("Erro", "Falha ao salvar etiqueta.", "error");
    }
  };

  const handleDelete = async (id: string, tagName: string) => {
    if (!window.confirm(`Deseja realmente excluir a etiqueta "${tagName}"?`)) return;
    
    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        addNotification("Excluída", `Etiqueta "${tagName}" foi removida.`, "info");
        fetchTags();
      } else {
        const err = await res.json().catch(() => ({}));
        addNotification("Erro", err.error || "Falha ao excluir etiqueta.", "error");
      }
    } catch (error) {
      addNotification("Erro", "Falha ao excluir etiqueta.", "error");
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingTag(tag);
    setName(tag.name);
    setColorHex(tag.colorHex);
    setScope((tag.scope || "GLOBAL") as TagScope);
    setDescription(tag.description || "");
  };

  const cancelEdit = () => {
    setEditingTag(null);
    setName('');
    setColorHex(PRESET_COLORS[0]);
    setScope('GLOBAL');
    setDescription('');
    setAsGlobal(true);
  };

  const filteredTags = scopeFilter === "ALL"
    ? tags
    : tags.filter(t => (t.scope || "GLOBAL") === scopeFilter);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl shadow-premium w-full max-w-2xl flex flex-col overflow-hidden border border-slate-200"
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <TagIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Gerenciar Etiquetas</h2>
              <p className="text-xs text-slate-500 font-medium">
                Etiquetas da oficina (compartilhadas) e pessoais, por escopo.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[65vh] custom-scrollbar bg-slate-50/30">
          
          {/* Formulário de Criação/Edição */}
          <form onSubmit={handleSave} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
              {editingTag ? <Edit2 className="w-4 h-4 text-indigo-500" /> : <Plus className="w-4 h-4 text-emerald-500" />}
              {editingTag ? 'Editando Etiqueta' : 'Nova Etiqueta'}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Nome da Etiqueta
                </label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: VIP, Retorno, Urgente"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  maxLength={30}
                  required
                />
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  Cor Visual <PaintBucket className="w-3 h-3" />
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setColorHex(color)}
                      className={`w-6 h-6 rounded-md border-2 transition-transform ${colorHex === color ? 'border-slate-900 scale-110 shadow-sm' : 'border-transparent hover:scale-110'}`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Escopo de Uso
                </label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as TagScope)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                >
                  <option value="GLOBAL">Oficina (qualquer tela)</option>
                  <option value="CLIENT">Clientes</option>
                  <option value="DEVICE">Aparelhos</option>
                  <option value="ORDEM_SERVICO">Ordens de Serviço (cards)</option>
                </select>
              </div>

              {!editingTag && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Compartilhamento
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAsGlobal(true)}
                      disabled={!isManager}
                      title={!isManager ? "Apenas gestores criam etiquetas da oficina" : ""}
                      className={`flex-1 h-10 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        asGlobal
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      } ${!isManager ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Oficina
                    </button>
                    <button
                      type="button"
                      onClick={() => setAsGlobal(false)}
                      className={`flex-1 h-10 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        !asGlobal
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      } cursor-pointer`}
                    >
                      <UserIcon className="w-3.5 h-3.5" /> Pessoal
                    </button>
                  </div>
                  {!isManager && (
                    <p className="text-[9px] text-slate-400 mt-1 font-semibold">
                      Seu perfil cria etiquetas pessoais. Gestores compartilham com a oficina.
                    </p>
                  )}
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Cliente prioritário com contrato anual"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  maxLength={120}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              {editingTag && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={!name.trim()}
                className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {editingTag ? 'Salvar Alterações' : 'Criar Etiqueta'}
              </button>
            </div>
          </form>

          {/* Filtro por escopo */}
          <div className="flex flex-wrap gap-1.5 mb-3 px-1">
            {[["ALL", "Todas"], ["CLIENT", "Clientes"], ["ORDEM_SERVICO", "OS"], ["DEVICE", "Aparelhos"], ["GLOBAL", "Oficina"]].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setScopeFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                  scopeFilter === key
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Lista de Etiquetas Existentes */}
          <h3 className="text-sm font-bold text-slate-800 mb-3 px-1">
            Etiquetas Cadastradas <span className="text-slate-400 font-semibold text-xs">({filteredTags.length})</span>
          </h3>
          
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="text-center p-8 bg-white rounded-xl border border-dashed border-slate-300">
              <TagIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500 font-medium">Nenhuma etiqueta neste escopo.</p>
              <p className="text-xs text-slate-400 mt-1">Crie sua primeira etiqueta acima.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredTags.map(tag => {
                const scopeInfo = SCOPE_LABELS[tag.scope || "GLOBAL"] || SCOPE_LABELS.GLOBAL;
                const ownerName = tag.owner?.name || (tag.ownerId ? "Usuário" : null);
                const manageable = canManage(tag);
                return (
                  <div key={tag.id} className="bg-white border border-slate-200 rounded-lg p-3 group hover:border-slate-300 hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                        <div className="w-3.5 h-3.5 rounded-full shadow-inner shrink-0" style={{ backgroundColor: tag.colorHex }}></div>
                        <span className="text-sm font-semibold text-slate-700 truncate">{tag.name}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {manageable && (
                          <>
                            <button 
                              onClick={() => startEdit(tag)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDelete(tag.id, tag.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8.5px] font-extrabold uppercase tracking-wider border ${scopeInfo.badge}`}>
                        {scopeInfo.label}
                      </span>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8.5px] font-extrabold uppercase tracking-wider border ${
                        tag.ownerId
                          ? "bg-violet-50 text-violet-700 border-violet-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        {tag.ownerId ? <UserIcon className="w-2.5 h-2.5" /> : <ShieldCheck className="w-2.5 h-2.5" />}
                        {tag.ownerId ? (ownerName || "Pessoal") : "Oficina"}
                      </span>
                    </div>
                    {tag.description && (
                      <p className="text-[10px] text-slate-450 font-medium mt-1.5 truncate">{tag.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
