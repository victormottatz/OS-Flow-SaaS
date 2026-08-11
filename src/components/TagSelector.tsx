import React, { useState, useEffect, useCallback } from 'react';
import { Tag as TagIcon, X, Check, Plus, Loader2 } from 'lucide-react';
import { Tag, TagScope } from '../types';
import { addNotification } from '../hooks/useNotifications';

interface TagSelectorProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  /** Escopo das etiquetas exibidas: "CLIENT", "ORDEM_SERVICO", "DEVICE" ou "GLOBAL". */
  scope?: TagScope | string;
  /** Texto do botão de adicionar (padrão: "+ Etiqueta"). */
  placeholder?: string;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#f43f5e', '#64748b', '#78716c', '#000000'
];

function getCurrentUserId(): string {
  try {
    const saved = JSON.parse(localStorage.getItem("mgv_user") || "{}");
    return saved?.id || "";
  } catch {
    return "";
  }
}

function getAuthHeaders(extra?: Record<string, string>) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("mgv_token") || ""}`,
    ...extra
  };
}

export default function TagSelector({ selectedTagIds, onChange, scope, placeholder }: TagSelectorProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const currentUserId = getCurrentUserId();

  // Criação rápida
  const [quickName, setQuickName] = useState("");
  const [quickColor, setQuickColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const query = scope ? `?scope=${encodeURIComponent(scope)}` : "";
      const res = await fetch(`/api/tags${query}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableTags(data || []);
      }
    } catch {
      setAvailableTags([]);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  // NÃO usar <form> aqui: o TagSelector é renderizado DENTRO de outros
  // formulários (criação de OS/cliente, modal do Kanban). <form> aninhado é
  // HTML inválido e o navegador ignora o submit — por isso a criação rápida
  // "não acontecia nada" ao clicar. Usamos div + handlers explícitos.
  const quickCreate = async () => {
    if (!quickName.trim() || creating) return;

    setCreating(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: quickName.trim(),
          colorHex: quickColor,
          scope: scope && scope !== "GLOBAL" ? scope : "GLOBAL"
        })
      });

      if (res.ok) {
        const tag = await res.json();
        setAvailableTags(prev => [...prev.filter(t => t.id !== tag.id), tag].sort((a, b) => a.name.localeCompare(b.name)));
        // Seleciona a etiqueta recém-criada automaticamente
        onChange([...selectedTagIds, tag.id]);
        setQuickName("");
        setQuickColor(PRESET_COLORS[0]);
        addNotification("Sucesso", `Etiqueta "${tag.name}" criada!`, "success");
      } else {
        const err = await res.json().catch(() => ({}));
        addNotification("Erro", err.error || "Falha ao criar etiqueta.", "error");
      }
    } catch {
      addNotification("Erro", "Falha ao criar etiqueta.", "error");
    } finally {
      setCreating(false);
    }
  };

  const selectedTags = availableTags.filter(t => selectedTagIds.includes(t.id));

  // Agrupamento: minhas etiquetas pessoais primeiro, depois as da oficina
  const personalTags = availableTags.filter(t => t.ownerId === currentUserId);
  const officeTags = availableTags.filter(t => !t.ownerId);
  const otherTags = availableTags.filter(t => t.ownerId && t.ownerId !== currentUserId);

  const renderTagOption = (tag: Tag) => {
    const isSelected = selectedTagIds.includes(tag.id);
    return (
      <button
        key={tag.id}
        type="button"
        onClick={() => toggleTag(tag.id)}
        className={`flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors w-full text-left ${
          isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-3 h-3 rounded-full shadow-inner shrink-0" style={{ backgroundColor: tag.colorHex }}></div>
          <span className="font-medium text-slate-700 truncate">{tag.name}</span>
          {tag.ownerId === currentUserId && (
            <span className="text-[8px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-50 border border-indigo-100 px-1 py-0.5 rounded shrink-0">Minha</span>
          )}
        </div>
        {isSelected && <Check className="w-4 h-4 text-indigo-500 shrink-0" />}
      </button>
    );
  };

  const renderGroup = (title: string, tags: Tag[]) => {
    if (tags.length === 0) return null;
    return (
      <div className="mb-1">
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1 py-1">{title}</div>
        {tags.map(renderTagOption)}
      </div>
    );
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {selectedTags.map(tag => (
          <span
            key={tag.id}
            className="text-[10px] font-bold px-2 py-1 rounded-md text-white flex items-center gap-1 shadow-sm"
            style={{ backgroundColor: tag.colorHex }}
          >
            {tag.name}
            <button
              type="button"
              onClick={() => toggleTag(tag.id)}
              className="hover:bg-black/20 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 flex items-center gap-1 transition-colors shadow-sm"
        >
          <TagIcon className="w-3 h-3" /> {placeholder || "+ Etiqueta"}
        </button>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-premium z-20 p-2">
            <div className="text-[10px] font-bold text-slate-400 mb-2 px-1 uppercase tracking-wider">
              Etiquetas Disponíveis
            </div>

            {loading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
              </div>
            ) : availableTags.length === 0 ? (
              <p className="text-xs text-slate-500 px-1 py-2">Nenhuma etiqueta cadastrada para este escopo.</p>
            ) : (
              <div className="flex flex-col gap-1 max-h-44 overflow-y-auto custom-scrollbar mb-2">
                {renderGroup("Minhas etiquetas", personalTags)}
                {renderGroup("Etiquetas da oficina", officeTags)}
                {renderGroup("Outras", otherTags)}
              </div>
            )}

            {/* Criação rápida — div (NUNCA <form>) para não aninhar formulário */}
            <div className="border-t border-slate-100 pt-2 mt-1">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-1.5">
                Criar nova etiqueta
              </div>
              <div className="flex items-center gap-1.5 px-1">
                <input
                  type="text"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      quickCreate();
                    }
                  }}
                  placeholder="Nome da etiqueta"
                  maxLength={30}
                  className="flex-1 min-w-0 h-8 px-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    quickCreate();
                  }}
                  disabled={!quickName.trim() || creating}
                  className="h-8 w-8 flex items-center justify-center rounded-md bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                  title="Criar e adicionar"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex flex-wrap gap-1 px-1 pt-2">
                {PRESET_COLORS.slice(0, 12).map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setQuickColor(color)}
                    className={`w-4 h-4 rounded border transition-transform ${
                      quickColor === color ? 'border-slate-900 scale-125 shadow-sm' : 'border-transparent hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
