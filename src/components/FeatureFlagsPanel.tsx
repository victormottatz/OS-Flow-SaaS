import React, { useState, useEffect } from "react";
import { UserRole } from "../types";
import { useFeatureFlags } from "../contexts/FeatureFlagContext";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";

interface FeatureFlag {
  id: string;
  key: string;
  value: boolean;
  description: string | null;
  updatedAt: string;
}

export default function FeatureFlagsPanel({ userRole }: { userRole: UserRole }) {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Guarda de alterações não salvas (formulário de nova feature flag)
  const newFlagDirty = newKey.trim() !== "" || newDesc.trim() !== "";
  useUnsavedChangesGuard(newFlagDirty);
  const { refreshFlags } = useFeatureFlags();

  const fetchAdminFlags = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("mgv_token");
      const res = await fetch("/api/feature-flags/admin", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setFlags(await res.json());
      }
    } catch (err) {
      console.error("Erro ao buscar flags:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminFlags();
  }, []);

  const handleToggle = async (key: string, currentValue: boolean, description: string | null) => {
    try {
      const token = localStorage.getItem("mgv_token");
      const res = await fetch("/api/feature-flags/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ key, value: !currentValue, description })
      });
      if (res.ok) {
        await fetchAdminFlags();
        await refreshFlags(); // Atualiza o contexto global do front-end instantaneamente
      }
    } catch (err) {
      console.error("Erro ao alterar flag:", err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    try {
      const token = localStorage.getItem("mgv_token");
      const res = await fetch("/api/feature-flags/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          key: newKey.trim().toUpperCase().replace(/\s+/g, '_'), 
          value: false, 
          description: newDesc 
        })
      });
      if (res.ok) {
        setNewKey("");
        setNewDesc("");
        await fetchAdminFlags();
      }
    } catch (err) {
      console.error("Erro ao criar flag:", err);
    }
  };

  if (userRole !== UserRole.OWNER) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-rose-500 mb-4">gpp_bad</span>
          <h2 className="text-xl font-bold text-slate-800">Acesso Negado</h2>
          <p className="text-slate-500 mt-2">Apenas administradores podem acessar o Quadro de Disjuntores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>toggle_on</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quadro de Disjuntores</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerenciamento de Feature Flags (Zero Downtime Deployment)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-4xl text-indigo-500">sync</span>
            </div>
          ) : flags.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">power_off</span>
              <h3 className="text-lg font-bold text-slate-700">Nenhuma Flag Encontrada</h3>
              <p className="text-sm text-slate-500 mt-1">Crie a sua primeira feature flag no painel lateral.</p>
            </div>
          ) : (
            flags.map(flag => (
              <div key={flag.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${flag.value ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                    <h3 className="text-base font-bold text-slate-800 font-mono tracking-tight">{flag.key}</h3>
                  </div>
                  <p className="text-sm text-slate-500 mt-1.5 ml-4.5">{flag.description || "Sem descrição"}</p>
                </div>
                
                {/* Toggle Switch */}
                <button 
                  onClick={() => handleToggle(flag.key, flag.value, flag.description)}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${flag.value ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <span className={`${flag.value ? 'translate-x-8' : 'translate-x-1'} inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm`} />
                </button>
              </div>
            ))
          )}
        </div>

        <div>
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl sticky top-24">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-teal-400">add_circle</span>
              <h3 className="font-bold text-lg">Nova Flag</h3>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Chave da Flag</label>
                <input 
                  type="text" 
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  placeholder="EX: NOVO_PAINEL_OS"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-teal-500 outline-none font-mono placeholder:text-slate-600"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Descrição Curta</label>
                <input 
                  type="text" 
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Ativa a nova tela de Kanban"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-teal-500 outline-none placeholder:text-slate-600"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold rounded-xl py-3 mt-2 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">save</span>
                <span>Registrar Flag</span>
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">info</span>
                Como funciona
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                As *Feature Flags* permitem que você ative funcionalidades novas sem precisar reiniciar o servidor. Elas ficam escondidas no código até que você ligue o interruptor aqui.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
