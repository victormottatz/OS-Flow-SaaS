import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Transition {
  from: string;
  to: string;
}

interface SettingItem {
  id: string;
  key: string;
  value: string;
  type: string;
  category: string;
  description: string | null;
}

const STATUSES = [
  "ORCAMENTO",
  "AGUARDANDO_AVALIACAO",
  "AGUARDANDO_AUTORIZACAO",
  "AGUARDANDO_PECA",
  "EM_MANUTENCAO",
  "PRONTO_RETIRADA",
  "PAGO_PRONTO_RETIRADA",
  "FINALIZADO"
];

const STATUS_LABELS: Record<string, string> = {
  ORCAMENTO: "Orçamento",
  AGUARDANDO_AVALIACAO: "Aguardando Avaliação",
  AGUARDANDO_AUTORIZACAO: "Aguardando Autorização",
  AGUARDANDO_PECA: "Aguardando Peça",
  EM_MANUTENCAO: "Em Manutenção",
  PRONTO_RETIRADA: "Pronto Retirada",
  PAGO_PRONTO_RETIRADA: "Pago / Pronto Retirada",
  FINALIZADO: "Finalizado"
};

const DEFAULT_TRANSITIONS: Transition[] = [
  { from: "AGUARDANDO_AVALIACAO", to: "AGUARDANDO_AUTORIZACAO" },
  { from: "AGUARDANDO_AVALIACAO", to: "EM_MANUTENCAO" },
  { from: "AGUARDANDO_AVALIACAO", to: "AGUARDANDO_PECA" },
  { from: "AGUARDANDO_AVALIACAO", to: "FINALIZADO" },
  { from: "AGUARDANDO_AUTORIZACAO", to: "EM_MANUTENCAO" },
  { from: "AGUARDANDO_AUTORIZACAO", to: "AGUARDANDO_PECA" },
  { from: "AGUARDANDO_AUTORIZACAO", to: "FINALIZADO" },
  { from: "AGUARDANDO_PECA", to: "EM_MANUTENCAO" },
  { from: "EM_MANUTENCAO", to: "AGUARDANDO_PECA" },
  { from: "EM_MANUTENCAO", to: "PRONTO_RETIRADA" },
  { from: "PRONTO_RETIRADA", to: "FINALIZADO" },
  { from: "PRONTO_RETIRADA", to: "PAGO_PRONTO_RETIRADA" },
  { from: "PAGO_PRONTO_RETIRADA", to: "FINALIZADO" },
  { from: "PRONTO_RETIRADA", to: "EM_MANUTENCAO" },
  { from: "FINALIZADO", to: "EM_MANUTENCAO" },
  { from: "FINALIZADO", to: "AGUARDANDO_AVALIACAO" }
];

export default function TransitionSettingsPanel() {
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalSetting, setOriginalSetting] = useState<SettingItem | null>(null);

  const fetchTransitions = async () => {
    try {
      const activeToken = localStorage.getItem('mgv_token') || '';
      const response = await axios.get('/api/config', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      
      const found = response.data.find((s: SettingItem) => s.key === 'OS_ALLOWED_TRANSITIONS');
      if (found) {
        setOriginalSetting(found);
        try {
          const parsed = JSON.parse(found.value) as Transition[];
          setTransitions(parsed);
        } catch {
          setTransitions(DEFAULT_TRANSITIONS);
        }
      } else {
        setTransitions(DEFAULT_TRANSITIONS);
      }
    } catch (error) {
      console.error('Erro ao buscar transições:', error);
      setTransitions(DEFAULT_TRANSITIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransitions();
  }, []);

  const handleToggleTransition = (from: string, to: string) => {
    setTransitions(prev => {
      const exists = prev.some(t => t.from === from && t.to === to);
      if (exists) {
        return prev.filter(t => !(t.from === from && t.to === to));
      } else {
        return [...prev, { from, to }];
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const activeToken = localStorage.getItem('mgv_token') || '';
      await axios.put('/api/config/OS_ALLOWED_TRANSITIONS', {
        value: JSON.stringify(transitions, null, 2),
        category: originalSetting?.category || 'GERAL',
        description: originalSetting?.description || 'Lista de transições de status permitidas para as Ordens de Serviço.',
        type: originalSetting?.type || 'json'
      }, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      
      alert('Transições de status salvas e aplicadas com sucesso!');
      fetchTransitions();
    } catch (error) {
      console.error('Erro ao salvar transições:', error);
      alert('Erro ao salvar as regras de transição de status.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 font-mono text-xs">
        Carregando matriz de transições...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h3 className="text-lg font-black text-slate-850 flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400">swap_calls</span>
            Permissões de Transições de Status
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Configure quais movimentações de status são permitidas no Kanban e nos fluxos de atendimento.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:from-teal-600 hover:to-teal-700 transition-all shadow-md hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">save</span>
          {saving ? 'Gravando...' : 'Salvar Regras'}
        </button>
      </div>

      {/* Grid of status sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {STATUSES.map(sourceStatus => (
          <div key={sourceStatus} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div>
              <h4 className="font-bold text-sm text-slate-850 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                Origem: {STATUS_LABELS[sourceStatus] || sourceStatus}
              </h4>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{sourceStatus}</p>
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
              {STATUSES.map(destStatus => {
                if (sourceStatus === destStatus) return null; // Can transition to itself naturally
                const isAllowed = transitions.some(t => t.from === sourceStatus && t.to === destStatus);

                return (
                  <div key={destStatus} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700">{STATUS_LABELS[destStatus] || destStatus}</span>
                      <span className="text-[9px] text-slate-450 font-mono">{destStatus}</span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAllowed}
                        onChange={() => handleToggleTransition(sourceStatus, destStatus)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
