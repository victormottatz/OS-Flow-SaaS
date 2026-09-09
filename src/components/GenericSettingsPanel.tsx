import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';

interface SettingItem {
  id: string;
  key: string;
  value: string;
  type: string;
  category: string;
  description: string | null;
}

interface GenericSettingsPanelProps {
  category: string;
}

export default function GenericSettingsPanel({ category }: GenericSettingsPanelProps) {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Armazena valores alterados localmente
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  
  // Para criar novas configurações
  const [showNewForm, setShowNewForm] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState('string');

  // Guarda de alterações não salvas (formulário de novo parâmetro)
  const newSettingDirty = showNewForm && (newKey.trim() !== "" || newValue.trim() !== "" || newDesc.trim() !== "");
  useUnsavedChangesGuard(newSettingDirty);

  const fetchSettings = async () => {
    try {
      const activeToken = localStorage.getItem('mgv_token') || '';
      const response = await axios.get('/api/config', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      
      const filteredSettings = response.data.filter(
        (s: SettingItem) => s.category === category
      );
      
      setSettings(filteredSettings);
      
      const vals: Record<string, string> = {};
      filteredSettings.forEach((s: SettingItem) => {
        vals[s.key] = s.value;
      });
      setLocalValues(vals);
    } catch (error) {
      console.error(`Erro ao buscar configurações da categoria ${category}:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [category]);

  const handleValueChange = (key: string, val: string) => {
    setLocalValues(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const activeToken = localStorage.getItem('mgv_token') || '';
      
      const promises = Object.entries(localValues).map(([key, value]) => {
        const original = settings.find(s => s.key === key);
        // Only save if it actually changed
        if (original && original.value !== value) {
            return axios.put(`/api/config/${key}`, {
            value: String(value),
            category: category,
            description: original?.description || '',
            type: original?.type || 'string'
            }, {
            headers: { Authorization: `Bearer ${activeToken}` }
            });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      alert('Configurações salvas com sucesso!');
      fetchSettings();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    
    setSaving(true);
    try {
      const activeToken = localStorage.getItem('mgv_token') || '';
      const formattedKey = newKey.trim().toUpperCase().replace(/\s+/g, '_');
      
      await axios.put(`/api/config/${formattedKey}`, {
        value: String(newValue),
        category: category,
        description: newDesc,
        type: newType
      }, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });

      setNewKey('');
      setNewValue('');
      setNewDesc('');
      setShowNewForm(false);
      fetchSettings();
    } catch (error) {
      console.error('Erro ao criar configuração:', error);
      alert('Erro ao criar nova configuração.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 font-mono text-xs shadow-sm">
        Carregando parâmetros...
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-850 flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400">tune</span>
            Parâmetros: {category}
          </h3>
          <p className="text-[12px] text-slate-500 mt-1">
            Gerencie as variáveis e parâmetros desta categoria.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">{showNewForm ? 'close' : 'add'}</span>
            {showNewForm ? 'Cancelar' : 'Novo'}
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving || settings.length === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-5 py-2 rounded-xl font-bold text-xs hover:from-teal-600 hover:to-teal-700 transition-all shadow-md hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {showNewForm && (
        <form onSubmit={handleCreateNew} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 animate-fadein">
          <h4 className="font-bold text-sm text-slate-700 mb-2">Criar Novo Parâmetro</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chave</label>
              <input type="text" value={newKey} onChange={e => setNewKey(e.target.value)} required placeholder="EX: NOME_EMPRESA" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor Inicial</label>
              <input type="text" value={newValue} onChange={e => setNewValue(e.target.value)} required className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
              <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                <option value="string">Texto (String)</option>
                <option value="number">Número</option>
                <option value="boolean">Booleano</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
              <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Opcional" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-slate-700 transition-colors cursor-pointer">
              Adicionar
            </button>
          </div>
        </form>
      )}

      {settings.length === 0 && !showNewForm ? (
        <div className="py-8 text-center text-slate-400">
          <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
          <p className="text-sm">Nenhuma configuração encontrada para esta categoria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {settings.map(s => (
            <div key={s.key} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-slate-50/50 border border-slate-100 gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-slate-700 text-sm bg-slate-200/50 px-2 py-0.5 rounded border border-slate-200">{s.key}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">{s.type}</span>
                </div>
                <p className="text-xs text-slate-500">{s.description || 'Sem descrição.'}</p>
              </div>
              
              <div className="w-full md:w-1/3">
                {s.type === 'boolean' ? (
                  <select
                    value={localValues[s.key] || s.value}
                    onChange={e => handleValueChange(s.key, e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                  >
                    <option value="true">Verdadeiro (Ativado)</option>
                    <option value="false">Falso (Desativado)</option>
                  </select>
                ) : s.type === 'number' ? (
                  <input
                    type="number"
                    step="any"
                    value={localValues[s.key] || s.value}
                    onChange={e => handleValueChange(s.key, e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={localValues[s.key] || s.value}
                    onChange={e => handleValueChange(s.key, e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bloco de Conformidade LGPD & Exportação de Dados */}
      {category === "GERAL" && (
        <div className="mt-8 border-t border-slate-200 pt-6">
          <div className="p-5 bg-gradient-to-r from-slate-50 to-indigo-50/40 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-indigo-600 text-[20px]">shield</span>
                <h4 className="font-bold text-slate-800 text-sm">Privacidade & Portabilidade de Dados (LGPD)</h4>
              </div>
              <p className="text-xs text-slate-500 max-w-xl">
                Você detém total propriedade sobre os cadastros da sua assistência. Baixe a qualquer momento uma cópia integral de todos os seus clientes, aparelhos da base instalada, histórico de ordens e peças.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  const token = localStorage.getItem("mgv_token") || localStorage.getItem("osflow_token") || "";
                  const res = await fetch("/api/dashboards/export-data", {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  if (!res.ok) throw new Error("Falha ao exportar dados.");
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `backup-osflow-${new Date().toISOString().split("T")[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                } catch (err: any) {
                  alert("Erro ao exportar dados: " + err.message);
                }
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition duration-150 flex items-center gap-2 shrink-0 shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Exportar Backup (JSON)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
