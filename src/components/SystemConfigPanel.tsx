import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface SettingItem {
  id: string;
  key: string;
  value: string;
  type: string;
  category: string;
  description: string | null;
}

export default function SystemConfigPanel() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Armazena valores alterados localmente
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  const fetchSettings = async () => {
    try {
      const activeToken = localStorage.getItem('mgv_token') || '';
      const response = await axios.get('/api/config', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      
      // Filtra apenas configurações da categoria de conciliação
      const conciliationSettings = response.data.filter(
        (s: SettingItem) => s.category === 'CONCILIACAO'
      );
      
      setSettings(conciliationSettings);
      
      // Popula valores locais
      const vals: Record<string, string> = {};
      conciliationSettings.forEach((s: SettingItem) => {
        vals[s.key] = s.value;
      });
      setLocalValues(vals);
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleValueChange = (key: string, val: string) => {
    setLocalValues(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const activeToken = localStorage.getItem('mgv_token') || '';
      
      // Roda requisições em paralelo para cada configuração atualizada
      const promises = Object.entries(localValues).map(([key, value]) => {
        const original = settings.find(s => s.key === key);
        return axios.put(`/api/config/${key}`, {
          value: String(value),
          category: original?.category || 'CONCILIACAO',
          description: original?.description || '',
          type: original?.type || 'number'
        }, {
          headers: { Authorization: `Bearer ${activeToken}` }
        });
      });

      await Promise.all(promises);
      alert('Configurações salvas e aplicadas com sucesso!');
      fetchSettings();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  // Agrupamentos didáticos
  const getGroupedSettings = () => {
    const successScores = ['os_number_match_score', 'physical_present_score', 'payment_integral_score', 'temporal_match_high_score', 'temporal_match_medium_score'];
    const penalties = ['multiple_os_penalty', 'temporal_conflict_penalty', 'name_only_match_penalty', 'multiple_history_penalty'];
    const thresholds = ['threshold_automatic', 'threshold_review'];
    const limits = ['days_temporal_high', 'days_temporal_medium'];

    return {
      success: settings.filter(s => successScores.includes(s.key)),
      penalties: settings.filter(s => penalties.includes(s.key)),
      thresholds: settings.filter(s => thresholds.includes(s.key)),
      limits: settings.filter(s => limits.includes(s.key))
    };
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 font-mono text-xs">
        Carregando parâmetros de calibração...
      </div>
    );
  }

  const groups = getGroupedSettings();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Configurações Operacionais</h1>
          <p className="text-sm text-slate-500 mt-1">
            Calibre os pesos e limites do motor de tomada de decisão e conciliação de OS em tempo real.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">save</span>
          {saving ? 'Aplicando...' : 'Aplicar Configurações'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pesos Positivos */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Pesos de Evidências Positivas
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Pontuação agregada ao motor quando as condições operacionais e financeiras favoráveis são localizadas.
            </p>
          </div>

          <div className="space-y-4">
            {groups.success.map(s => (
              <div key={s.key} className="space-y-1.5 p-3.5 rounded-xl bg-slate-50/50 border border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 text-xs">{s.description || s.key}</span>
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    +{localValues[s.key] || s.value} pts
                  </span>
                </div>
                <div className="flex gap-3 items-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={localValues[s.key] || s.value}
                    onChange={e => handleValueChange(s.key, e.target.value)}
                    className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <input
                    type="number"
                    value={localValues[s.key] || s.value}
                    onChange={e => handleValueChange(s.key, e.target.value)}
                    className="w-14 text-center text-xs font-bold border border-slate-200 rounded-lg p-1"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Penalidades e Deduções */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Penalidades e Deduções de Confiança
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Pontos deduzidos em situações de ambiguidade de dados, histórico complexo ou incoerência cronológica.
            </p>
          </div>

          <div className="space-y-4">
            {groups.penalties.map(s => (
              <div key={s.key} className="space-y-1.5 p-3.5 rounded-xl bg-slate-50/50 border border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 text-xs">{s.description || s.key}</span>
                  <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    -{localValues[s.key] || s.value} pts
                  </span>
                </div>
                <div className="flex gap-3 items-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={localValues[s.key] || s.value}
                    onChange={e => handleValueChange(s.key, e.target.value)}
                    className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                  />
                  <input
                    type="number"
                    value={localValues[s.key] || s.value}
                    onChange={e => handleValueChange(s.key, e.target.value)}
                    className="w-14 text-center text-xs font-bold border border-slate-200 rounded-lg p-1"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Limites e Prazos Temporais */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
              Limites e Prazos Temporais (Dias)
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Ajuste de intervalo máximo em dias entre a data de abertura e pagamento para qualificação temporal.
            </p>
          </div>

          <div className="space-y-4">
            {groups.limits.map(s => (
              <div key={s.key} className="space-y-1.5 p-3.5 rounded-xl bg-slate-50/50 border border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 text-xs">{s.description || s.key}</span>
                  <span className="text-xs font-black text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                    {localValues[s.key] || s.value} dias
                  </span>
                </div>
                <div className="flex gap-3 items-center">
                  <input
                    type="range"
                    min="1"
                    max="365"
                    value={localValues[s.key] || s.value}
                    onChange={e => handleValueChange(s.key, e.target.value)}
                    className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                  />
                  <input
                    type="number"
                    value={localValues[s.key] || s.value}
                    onChange={e => handleValueChange(s.key, e.target.value)}
                    className="w-14 text-center text-xs font-bold border border-slate-200 rounded-lg p-1"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Níveis de Tomada de Decisão */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Níveis Mínimos de Decisão (Thresholds)
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Nota de corte mínima exigida para classificação automática de migração direta ou revisão manual.
            </p>
          </div>

          <div className="space-y-4">
            {groups.thresholds.map(s => (
              <div key={s.key} className="space-y-1.5 p-3.5 rounded-xl bg-slate-50/50 border border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 text-xs">{s.description || s.key}</span>
                  <span className="text-xs font-black text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    Nota: {localValues[s.key] || s.value}
                  </span>
                </div>
                <div className="flex gap-3 items-center">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={localValues[s.key] || s.value}
                    onChange={e => handleValueChange(s.key, e.target.value)}
                    className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <input
                    type="number"
                    value={localValues[s.key] || s.value}
                    onChange={e => handleValueChange(s.key, e.target.value)}
                    className="w-14 text-center text-xs font-bold border border-slate-200 rounded-lg p-1"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
