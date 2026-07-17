import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  Layers, 
  Database, 
  History, 
  RefreshCw, 
  FileText,
  Info,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import axios from 'axios';
import { OSStatus } from '../types';

interface RuleSatisfied {
  rule: string;
  points: number;
  evidence: string;
}

interface Suggestion {
  orderId: string;
  osNumber: string;
  clienteName: string;
  equipamentoName: string;
  statusAtual: OSStatus;
  statusSugerido: OSStatus;
  grauConfianca: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  classification: 'AUTOMATIC' | 'REVIEW' | 'CONFLICT' | 'NONE';
  motivo: string;
  divergencias: string[];
  regrasSatisfeitas: RuleSatisfied[];
  requiresSerialFix: boolean;
  missingSerials: string[];
  valorBanco: number;
  valorCaixa?: number;
  valorRepasse?: number;
  sourceFiles: string[];
}

interface BatchItem {
  id: string;
  orderId: string;
  osNumber: string;
  oldStatus: OSStatus;
  newStatus: OSStatus;
  reason: string;
  confidence: number;
  confidenceLevel: string;
  rulesSatisfied: string[];
  sourceFiles: string[];
  undoneAt: string | null;
}

interface Batch {
  id: string;
  createdAt: string;
  createdBy: string;
  totalItems: number;
  undoneItems: number;
  items: BatchItem[];
}

export default function OSConciliation() {
  const [activeTab, setActiveTab] = useState<'sugestoes' | 'central_status' | 'historico'>('sugestoes');
  // Sub-tabs for the 4 classification groups
  const [subTab, setSubTab] = useState<'AUTOMATIC' | 'REVIEW' | 'CONFLICT' | 'NONE'>('AUTOMATIC');
  
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [reverting, setReverting] = useState<string | null>(null);
  
  // Simulation states
  const [summary, setSummary] = useState<{
    totalAnalyzed: number;
    totalCompatible: number;
    totalReview: number;
    totalConflicts: number;
    totalSuggestions: number;
  } | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [forceSerialFixMap, setForceSerialFixMap] = useState<Record<string, boolean>>({});

  // Central de Status states
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusExecuting, setStatusExecuting] = useState(false);
  const [statusSummary, setStatusSummary] = useState<{
    totalAnalisadas: number;
    totalSugeridas: number;
    totalConfAlta: number;
    totalConfMedia: number;
    valorTotalEmAberto: string;
    percentualDistorcido: string;
    mediaDiasEmAvaliacao: number;
  } | null>(null);
  const [statusSuggestions, setStatusSuggestions] = useState<any[]>([]);
  const [selectedStatusIds, setSelectedStatusIds] = useState<string[]>([]);
  const [dispararWhatsApp, setDispararWhatsApp] = useState(false);
  const [showStatusImpactModal, setShowStatusImpactModal] = useState(false);
  const [expandedStatusOS, setExpandedStatusOS] = useState<Record<string, boolean>>({});
  
  // Modal for Impact Summary
  const [showImpactModal, setShowImpactModal] = useState(false);
  
  // History states
  const [batches, setBatches] = useState<Batch[]>([]);

  // Expanded suggestion card details (to see raw evidences)
  const [expandedOS, setExpandedOS] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchHistory();
  }, []);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/conciliacao/analisar');
      if (response.data.success) {
        setSummary(response.data.summary);
        setSuggestions(response.data.suggestions);
        
        // Auto select only items in AUTOMATIC group that do not require serial fixes
        const autoSelect = response.data.suggestions
          .filter((s: Suggestion) => s.classification === 'AUTOMATIC' && !s.requiresSerialFix)
          .map((s: Suggestion) => s.orderId);
        setSelectedIds(autoSelect);
        
        // Default mapping for force serial fix
        const serialFixes: Record<string, boolean> = {};
        response.data.suggestions.forEach((s: Suggestion) => {
          if (s.requiresSerialFix) {
            serialFixes[s.orderId] = true;
          }
        });
        setForceSerialFixMap(serialFixes);
        
        // Focus on AUTOMATIC group if has suggestions, otherwise REVIEW, etc.
        const hasAuto = response.data.suggestions.some((s: Suggestion) => s.classification === 'AUTOMATIC');
        const hasReview = response.data.suggestions.some((s: Suggestion) => s.classification === 'REVIEW');
        const hasConflict = response.data.suggestions.some((s: Suggestion) => s.classification === 'CONFLICT');
        
        if (hasAuto) setSubTab('AUTOMATIC');
        else if (hasReview) setSubTab('REVIEW');
        else if (hasConflict) setSubTab('CONFLICT');
        else setSubTab('NONE');
      }
    } catch (e) {
      console.error('Falha na simulação:', e);
      alert('Erro ao rodar simulação de conciliação.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenImpact = () => {
    if (selectedIds.length === 0) {
      alert('Selecione pelo menos uma Ordem de Serviço para migração.');
      return;
    }
    setShowImpactModal(true);
  };

  // Calculates impact statistics of selection
  const impactData = useMemo(() => {
    const selectedSuggestions = suggestions.filter(s => selectedIds.includes(s.orderId));
    const statusCounts: Record<string, number> = {};
    const targetStatusCounts: Record<string, number> = {};
    let serialFixesNeeded = 0;
    
    selectedSuggestions.forEach(s => {
      statusCounts[s.statusAtual] = (statusCounts[s.statusAtual] || 0) + 1;
      targetStatusCounts[s.statusSugerido] = (targetStatusCounts[s.statusSugerido] || 0) + 1;
      if (s.requiresSerialFix && forceSerialFixMap[s.orderId]) {
        serialFixesNeeded++;
      }
    });

    return {
      totalSelected: selectedSuggestions.length,
      statusCounts,
      targetStatusCounts,
      serialFixesNeeded
    };
  }, [selectedIds, suggestions, forceSerialFixMap]);

  const executeMigration = async () => {
    const itemsToMigrate = suggestions
      .filter(s => selectedIds.includes(s.orderId))
      .map(s => ({
        orderId: s.orderId,
        statusSugerido: s.statusSugerido,
        motivo: s.motivo,
        grauConfianca: s.grauConfianca,
        confidenceLevel: s.confidenceLevel,
        regrasSatisfeitas: s.regrasSatisfeitas,
        sourceFiles: s.sourceFiles,
        divergencias: s.divergencias,
        forceSerialFix: forceSerialFixMap[s.orderId] || false
      }));

    setExecuting(true);
    setShowImpactModal(false);
    
    try {
      const response = await axios.post('/api/conciliacao/executar', {
        suggestions: itemsToMigrate,
        user: 'Gerente Administrador'
      });

      if (response.data.success) {
        const stats = response.data.summary;
        alert(`Migração em Lote Concluída!\n- Sucesso: ${stats.success}\n- Falhas: ${stats.errors}`);
        // Reset simulation
        setSummary(null);
        setSuggestions([]);
        setSelectedIds([]);
        // Refresh history
        fetchHistory();
      }
    } catch (e) {
      console.error('Falha na execução:', e);
      alert('Erro ao executar migração em lote.');
    } finally {
      setExecuting(false);
    }
  };

  const runStatusSimulation = async () => {
    setStatusLoading(true);
    try {
      const response = await axios.get('/api/conciliacao/avaliacao-scan');
      if (response.data.success) {
        setStatusSummary(response.data.summary);
        setStatusSuggestions(response.data.suggestions);
        
        // Pré-seleciona itens com confiança HIGH
        const highConfIds = response.data.suggestions
          .filter((s: any) => s.confidenceLevel === 'HIGH')
          .map((s: any) => s.orderId);
        setSelectedStatusIds(highConfIds);
      }
    } catch (e) {
      console.error('Falha ao rodar simulação de status:', e);
      alert('Erro ao rodar análise de status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const executeStatusMigration = async () => {
    const itemsToMigrate = statusSuggestions
      .filter(s => selectedStatusIds.includes(s.orderId));

    if (itemsToMigrate.length === 0) {
      alert('Selecione pelo menos uma OS para atualizar.');
      return;
    }

    setStatusExecuting(true);
    setShowStatusImpactModal(false);

    try {
      const response = await axios.post('/api/conciliacao/avaliacao-apply', {
        suggestions: itemsToMigrate,
        dispararWhatsApp,
        user: 'Gerente Administrador'
      });

      if (response.data.success) {
        const stats = response.data.summary;
        alert(`Saneamento Concluído!\n- Atualizado com sucesso: ${stats.success}\n- Erros: ${stats.errors}`);
        // Reset
        setStatusSummary(null);
        setStatusSuggestions([]);
        setSelectedStatusIds([]);
        // Refresh history
        fetchHistory();
      }
    } catch (e) {
      console.error('Falha ao executar saneamento:', e);
      alert('Erro ao aplicar saneamento de status.');
    } finally {
      setStatusExecuting(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get('/api/conciliacao/lotes');
      setBatches(response.data);
    } catch (e) {
      console.error('Erro ao buscar histórico de lotes:', e);
    }
  };

  const handleRollback = async (batchId: string) => {
    if (!window.confirm('Atenção: Deseja realmente reverter (Rollback) este lote de conciliação?\n\nTodas as Ordens de Serviço desse lote retornarão aos seus status originais antes da conciliação.')) {
      return;
    }

    setReverting(batchId);
    try {
      const response = await axios.post(`/api/conciliacao/rollback/${batchId}`, {
        user: 'Gerente Administrador'
      });

      if (response.data.success) {
        alert('Lote revertido com sucesso!');
        fetchHistory();
      }
    } catch (e) {
      console.error('Falha no rollback:', e);
      alert('Erro ao desfazer conciliação.');
    } finally {
      setReverting(null);
    }
  };

  const toggleSelectAllSubTab = (filteredSuggestions: Suggestion[]) => {
    const filteredIds = filteredSuggestions.map(s => s.orderId);
    const allSelected = filteredIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      // Unselect only these items
      setSelectedIds(selectedIds.filter(id => !filteredIds.includes(id)));
    } else {
      // Select all these items
      const newSelected = [...selectedIds];
      filteredIds.forEach(id => {
        if (!newSelected.includes(id)) newSelected.push(id);
      });
      setSelectedIds(newSelected);
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleForceSerialFix = (id: string) => {
    setForceSerialFixMap(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleExpand = (id: string) => {
    setExpandedOS(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getConfidenceBadgeColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'MEDIUM': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
  };

  const getStatusSugeridoBadgeColor = (status: string) => {
    switch (status) {
      case 'FINALIZADO':
        return 'bg-slate-950 text-slate-400 border-slate-800';
      case 'PAGO_PRONTO_RETIRADA':
        return 'bg-teal-950 text-teal-450 border-teal-800';
      case 'PRONTO_RETIRADA':
        return 'bg-amber-950 text-amber-400 border-amber-850';
      default:
        return 'bg-cyan-950 text-cyan-400 border-cyan-800';
    }
  };

  const getClassificationLabel = (group: string) => {
    switch (group) {
      case 'AUTOMATIC': return 'Automação Pronta';
      case 'REVIEW': return 'Revisão Recomendada';
      case 'CONFLICT': return 'Conflitos';
      default: return 'Sem Evidências';
    }
  };

  // Filter suggestions by active sub-tab (classification group)
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(s => s.classification === subTab);
  }, [suggestions, subTab]);

  return (
    <div className="flex-1 min-h-screen bg-slate-950 text-slate-100 p-6 xl:p-10 custom-scrollbar overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
            Conciliação de Ordens de Serviço
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Auditoria e saneamento de base legada utilizando múltiplos fatores de confiança (Caixa, Repasse, Mensagens e Atividade).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={activeTab === 'central_status' ? runStatusSimulation : runSimulation}
            disabled={loading || statusLoading}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 font-bold text-xs text-slate-950 shadow-md hover:shadow-lg hover:shadow-teal-500/10 transition active:scale-95 disabled:opacity-50 disabled:scale-100 cursor-pointer"
          >
            {loading || statusLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <Play className="w-4 h-4 text-slate-950 fill-current" />
            )}
            {activeTab === 'central_status' ? 'Escanear Status' : 'Simular Análise'}
          </button>
        </div>
      </div>

      {/* Stats Cards para Conciliação Fiscal */}
      {summary && activeTab === 'sugestoes' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total Analisadas</span>
            <span className="text-xl font-black text-white">{summary.totalAnalyzed}</span>
          </div>
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-sm">
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest block mb-1">Automação Pronta</span>
            <span className="text-xl font-black text-teal-400">{summary.totalCompatible}</span>
          </div>
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-sm">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-1">Revisão Recomendada</span>
            <span className="text-xl font-black text-amber-400">{summary.totalReview}</span>
          </div>
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-sm">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block mb-1">Conflitos</span>
            <span className="text-xl font-black text-rose-400">{summary.totalConflicts}</span>
          </div>
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-sm">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block mb-1">Com Evidências</span>
            <span className="text-xl font-black text-cyan-400">{summary.totalSuggestions}</span>
          </div>
        </div>
      )}

      {/* Stats Cards para Central de Status (Indicadores de Governança) */}
      {statusSummary && activeTab === 'central_status' && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">OSs em Avaliação</span>
            <span className="text-xl font-black text-white">{statusSummary.totalAnalisadas}</span>
          </div>
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-sm">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block mb-1">Status Incorreto</span>
            <span className="text-xl font-black text-rose-400">{statusSummary.totalSugeridas}</span>
          </div>
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-sm">
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest block mb-1">Confiança Alta</span>
            <span className="text-xl font-black text-teal-400">{statusSummary.totalConfAlta}</span>
          </div>
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-sm">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-1">Confiança Média</span>
            <span className="text-xl font-black text-amber-400">{statusSummary.totalConfMedia}</span>
          </div>
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-sm">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block mb-1">Valor em Aberto</span>
            <span className="text-xl font-black text-cyan-400">{statusSummary.valorTotalEmAberto}</span>
          </div>
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-sm">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">Distorção Operacional</span>
            <span className="text-xl font-black text-indigo-400">{statusSummary.percentualDistorcido}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab('sugestoes')}
          className={`flex items-center gap-2 pb-3 px-1 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === 'sugestoes'
              ? 'border-teal-500 text-teal-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Conciliação Fiscal ({suggestions.length})
        </button>
        <button
          onClick={() => setActiveTab('central_status')}
          className={`flex items-center gap-2 pb-3 px-1 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === 'central_status'
              ? 'border-teal-500 text-teal-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          Central de Status ({statusSuggestions.length})
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`flex items-center gap-2 pb-3 px-1 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === 'historico'
              ? 'border-teal-500 text-teal-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          Histórico de Lotes ({batches.length})
        </button>
      </div>

      {/* SUGGESTIONS TAB */}
      {activeTab === 'sugestoes' && (
        <div className="space-y-4">
          {suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 rounded-3xl border border-slate-800 bg-slate-900/10">
              <Database className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="text-slate-200 font-bold text-sm">Nenhuma simulação ativa</h3>
              <p className="text-slate-500 text-xs text-center max-w-sm mt-1">
                Clique no botão "Simular Análise" no canto superior para rodar o motor de regras multifatorial.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              
              {/* Classification Sub-Tabs */}
              <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-900/40 border border-slate-800 w-fit">
                {(['AUTOMATIC', 'REVIEW', 'CONFLICT', 'NONE'] as const).map(group => {
                  const count = suggestions.filter(s => s.classification === group).length;
                  const active = subTab === group;
                  return (
                    <button
                      key={group}
                      onClick={() => setSubTab(group)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        active
                          ? 'bg-teal-500 text-slate-950'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      {getClassificationLabel(group)} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Selection Summary Actions */}
              <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-900/30 border border-slate-800">
                <span className="text-xs text-slate-400">
                  Selecionado: <strong>{selectedIds.length}</strong> de <strong>{suggestions.length}</strong> sugestões.
                </span>
                <button
                  onClick={handleOpenImpact}
                  disabled={selectedIds.length === 0}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-teal-500 text-slate-950 hover:bg-teal-400 disabled:opacity-50 transition cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  Visualizar Resumo de Impacto
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/20 backdrop-blur-md">
                <table className="w-full border-collapse text-left text-slate-300">
                  <thead className="bg-slate-900/40 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-4 px-4 w-12">
                        <input
                          type="checkbox"
                          checked={filteredSuggestions.length > 0 && filteredSuggestions.every(s => selectedIds.includes(s.orderId))}
                          onChange={() => toggleSelectAllSubTab(filteredSuggestions)}
                          className="rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-500"
                        />
                      </th>
                      <th className="py-4 px-4 w-16"></th>
                      <th className="py-4 px-4">OS</th>
                      <th className="py-4 px-4">Cliente / Aparelho</th>
                      <th className="py-4 px-4">Valores (OS vs Caixa)</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-4">Confiança</th>
                      <th className="py-4 px-4">Evidências Satisfeitas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs">
                    {filteredSuggestions.map((item) => {
                      const isExpanded = expandedOS[item.orderId] || false;
                      return (
                        <React.Fragment key={item.orderId}>
                          <tr className="hover:bg-slate-900/20 transition-colors">
                            <td className="py-4 px-4">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(item.orderId)}
                                onChange={() => toggleSelect(item.orderId)}
                                className="rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-500"
                              />
                            </td>
                            <td className="py-4 px-4 text-center">
                              <button
                                onClick={() => toggleExpand(item.orderId)}
                                className="p-1 rounded hover:bg-slate-800 transition text-slate-400 hover:text-slate-200"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </td>
                            <td className="py-4 px-4 font-mono font-bold text-slate-200">{item.osNumber}</td>
                            <td className="py-4 px-4">
                              <div className="font-semibold text-slate-200">{item.clienteName}</div>
                              <div className="text-[10px] text-slate-400">{item.equipamentoName}</div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-slate-300">OS: <strong>R$ {item.valorBanco.toFixed(2)}</strong></div>
                              {item.valorCaixa !== undefined && (
                                <div className="text-[10px] text-teal-400">Caixa: R$ {item.valorCaixa.toFixed(2)}</div>
                              )}
                              {item.valorRepasse !== undefined && (
                                <div className="text-[10px] text-cyan-400">Repasse: R$ {item.valorRepasse.toFixed(2)}</div>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex flex-col gap-1 items-start">
                                <span className="text-[9px] text-slate-500 uppercase font-bold">De: {item.statusAtual}</span>
                                <span className={`px-1.5 py-0.5 rounded border font-bold text-[9px] ${getStatusSugeridoBadgeColor(item.statusSugerido)}`}>
                                  Para: {item.statusSugerido.replace('_PRONTO_RETIRADA', '_PRONTO')}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex flex-col gap-1">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border w-fit ${getConfidenceBadgeColor(item.confidenceLevel)}`}>
                                  {item.confidenceLevel}
                                </span>
                                <span className="text-[10px] font-black text-slate-350">{item.grauConfianca}%</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 max-w-md">
                              <div className="flex flex-wrap gap-1">
                                {item.regrasSatisfeitas.map((r, idx) => (
                                  <span 
                                    key={idx} 
                                    className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[9px] font-semibold"
                                    title={r.evidence}
                                  >
                                    {r.rule} (+{r.points})
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>

                          {/* Expanded detail row */}
                          {isExpanded && (
                            <tr className="bg-slate-900/30 border-l-2 border-l-teal-500">
                              <td colSpan={8} className="py-4 px-8 space-y-3">
                                <div>
                                  <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest block mb-1">Evidências de Auditoria Detalhadas</span>
                                  <div className="space-y-1.5">
                                    {item.regrasSatisfeitas.map((r, idx) => (
                                      <div key={idx} className="flex gap-2 items-start text-[11px] text-slate-300">
                                        <span className={`px-1.5 py-0.5 rounded font-bold text-[8px] mt-0.5 shrink-0 ${r.points >= 0 ? 'bg-teal-950 text-teal-400 border border-teal-800/40' : 'bg-rose-950 text-rose-400 border border-rose-900/40'}`}>
                                          {r.rule} ({r.points >= 0 ? '+' : ''}{r.points} pts)
                                        </span>
                                        <span>{r.evidence}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {item.divergencias.length > 0 && (
                                  <div>
                                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block mb-1">Avisos e Conflitos</span>
                                    <div className="space-y-1.5">
                                      {item.divergencias.map((div, i) => (
                                        <div key={i} className="flex items-center gap-1.5 text-amber-500 font-bold text-[11px] bg-amber-500/5 p-1.5 rounded-lg border border-amber-500/10">
                                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                          <span>{div}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {item.requiresSerialFix && (
                                  <div className="pt-2">
                                    <label className="flex items-center gap-2 p-2 rounded bg-rose-500/5 border border-rose-500/10 text-rose-400 font-semibold cursor-pointer w-fit">
                                      <input
                                        type="checkbox"
                                        checked={forceSerialFixMap[item.orderId] || false}
                                        onChange={() => toggleForceSerialFix(item.orderId)}
                                        className="rounded border-rose-700 bg-slate-900 text-rose-500 focus:ring-rose-500"
                                      />
                                      <span className="text-[10px]">Autofixar números de série fictícios de saneamento (MIG-AUTO)</span>
                                    </label>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CENTRAL DE STATUS TAB */}
      {activeTab === 'central_status' && (
        <div className="space-y-4">
          {statusSuggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 rounded-3xl border border-slate-800 bg-slate-900/10">
              <Database className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="text-slate-200 font-bold text-sm">Nenhum escaneamento ativo</h3>
              <p className="text-slate-500 text-xs text-center max-w-sm mt-1">
                Clique em "Escanear Status" no canto superior direito para auditar ordens de serviço incorretamente em avaliação.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              
              {/* Seleção de Itens e Ações Rápidas */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/30 border border-slate-800">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-slate-400">
                    Selecionado: <strong>{selectedStatusIds.length}</strong> de <strong>{statusSuggestions.length}</strong> sugestões de saneamento.
                  </span>
                  
                  {/* WhatsApp Toggle */}
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-350 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={dispararWhatsApp}
                      onChange={(e) => setDispararWhatsApp(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-teal-500 focus:ring-teal-500 cursor-pointer"
                    />
                    <span>Disparar WhatsApp automático ao aplicar status `Aguardando Autorização`</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const allIds = statusSuggestions.map(s => s.orderId);
                      const allSelected = allIds.every(id => selectedStatusIds.includes(id));
                      setSelectedStatusIds(allSelected ? [] : allIds);
                    }}
                    className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-800 hover:bg-slate-800 transition cursor-pointer"
                  >
                    {statusSuggestions.map(s => s.orderId).every(id => selectedStatusIds.includes(id)) 
                      ? 'Desmarcar Todas' 
                      : 'Selecionar Todas'}
                  </button>
                  <button
                    onClick={() => setShowStatusImpactModal(true)}
                    disabled={selectedStatusIds.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-teal-500 text-slate-950 hover:bg-teal-400 disabled:opacity-50 transition cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Aplicar Status nas Selecionadas
                  </button>
                </div>
              </div>

              {/* Listagem de Sugestões de Status */}
              <div className="grid grid-cols-1 gap-4">
                {statusSuggestions.map((item) => {
                  const isSelected = selectedStatusIds.includes(item.orderId);
                  const isExpanded = expandedStatusOS[item.orderId] || false;
                  
                  return (
                    <div 
                      key={item.orderId}
                      className={`p-5 rounded-2xl border transition duration-200 bg-slate-900/20 ${
                        isSelected 
                          ? 'border-teal-500/40 bg-teal-500/[0.02]' 
                          : 'border-slate-800 hover:border-slate-750'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        <div className="pt-1.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedStatusIds(selectedStatusIds.filter(id => id !== item.orderId));
                              } else {
                                setSelectedStatusIds([...selectedStatusIds, item.orderId]);
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-teal-500 focus:ring-teal-500 cursor-pointer"
                          />
                        </div>

                        {/* Informações Principais */}
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">OS {item.osNumber}</span>
                              <span className="text-slate-500 text-xs">|</span>
                              <span className="text-xs font-bold text-slate-300">{item.clienteName}</span>
                              {item.whatsappJaEnviado && (
                                <span 
                                  title="WhatsApp já foi enviado anteriormente para este cliente"
                                  className="material-symbols-outlined text-[15px] text-teal-400 cursor-help"
                                >
                                  chat
                                </span>
                              )}
                            </div>

                            {/* Score & Badge de Confiança */}
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      item.scoreConfianca >= 80 ? 'bg-teal-500' : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${item.scoreConfianca}%` }}
                                  ></div>
                                </div>
                                <span className={`text-xs font-black font-mono ${
                                  item.scoreConfianca >= 80 ? 'text-teal-400' : 'text-amber-400'
                                }`}>
                                  {item.scoreConfianca}%
                                </span>
                              </div>
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-wider ${
                                item.confidenceLevel === 'HIGH' 
                                  ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' 
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                Confiança {item.confidenceLevel === 'HIGH' ? 'Alta' : 'Média'}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                            <span>Aparelho: <strong className="text-slate-350">{item.equipamentoName}</strong></span>
                            <span className="text-slate-700">•</span>
                            <span>Mão de Obra: <strong className="text-teal-400">R$ {item.laborCost.toFixed(2)}</strong></span>
                            <span className="text-slate-700">•</span>
                            <span>Peças: <strong className="text-slate-300">{item.partsCount} un</strong></span>
                            <span className="text-slate-700">•</span>
                            <span>Total OS: <strong className="text-teal-400">R$ {item.totalCost.toFixed(2)}</strong></span>
                          </div>

                          <div className="pt-2 flex justify-between items-center text-xs">
                            <span className="text-[11px] text-slate-500">
                              Entrada: {new Date(item.createdAt).toLocaleDateString('pt-BR')} ({Math.max(1, Math.round((Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24)))} dias)
                            </span>
                            <button
                              onClick={() => {
                                setExpandedStatusOS(prev => ({ ...prev, [item.orderId]: !isExpanded }));
                              }}
                              className="text-[11px] text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Ocultar Evidências' : 'Ver Evidências'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>

                          {/* Seção Expansível de Evidências */}
                          {isExpanded && (
                            <div className="mt-3 p-4 rounded-xl border border-slate-800 bg-slate-950/30 space-y-2">
                              <span className="text-[9px] font-black text-teal-400 uppercase tracking-widest block">Histórico de Validações Operacionais</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {item.regrasSatisfeitas.map((r: any, idx: number) => (
                                  <div key={idx} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-850 flex justify-between items-center text-[11px]">
                                    <span className="text-slate-350">{r.evidence}</span>
                                    <span className="font-mono font-bold text-teal-400 text-[10px]">+{r.points} pts</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'historico' && (
        <div className="space-y-4">
          {batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 rounded-3xl border border-slate-800 bg-slate-900/10">
              <History className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="text-slate-200 font-bold text-sm">Histórico vazio</h3>
              <p className="text-slate-500 text-xs text-center max-w-sm mt-1">
                Nenhum lote de conciliação executado no sistema.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {batches.map((batch) => (
                <div key={batch.id} className="p-6 rounded-3xl border border-slate-800 bg-slate-900/30 backdrop-blur-md space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lote de Conciliação</span>
                        <span className="font-mono text-xs text-slate-500">{batch.id}</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Executado por <strong>{batch.createdBy}</strong> em {new Date(batch.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      {batch.undoneItems === batch.totalItems ? (
                        <span className="px-3 py-1.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold">
                          Totalmente Revertido
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRollback(batch.id)}
                          disabled={reverting !== null}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-slate-950 disabled:opacity-50 transition cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {reverting === batch.id ? 'Revertendo...' : 'Desfazer Conciliação (Rollback)'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs text-slate-400">
                    <div>Total de Itens: <strong className="text-white">{batch.totalItems}</strong></div>
                    <div>Revertidos: <strong className="text-white">{batch.undoneItems}</strong></div>
                  </div>

                  {/* List of items in batch with snapshot details */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
                    <table className="w-full text-left border-collapse text-slate-350">
                      <thead className="bg-slate-950/40 text-[9px] font-bold uppercase text-slate-500 border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">OS</th>
                          <th className="py-2.5 px-3">Status Anterior</th>
                          <th className="py-2.5 px-3">Confiança</th>
                          <th className="py-2.5 px-3">Regras Auditadas</th>
                          <th className="py-2.5 px-3">Arquivos de Origem</th>
                          <th className="py-2.5 px-3 text-right">Situação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-[11px]">
                        {batch.items.map((i) => (
                          <tr key={i.id} className="hover:bg-slate-900/10">
                            <td className="py-2 px-3 font-mono font-bold text-slate-300">{i.osNumber}</td>
                            <td className="py-2 px-3 text-slate-400">{i.oldStatus}</td>
                            <td className="py-2 px-3 font-semibold text-slate-300">{i.confidence}% ({i.confidenceLevel})</td>
                            <td className="py-2 px-3">
                              <div className="flex flex-wrap gap-1">
                                {i.rulesSatisfied.map((r, idx) => (
                                  <span key={idx} className="px-1 rounded bg-slate-850 text-slate-400 border border-slate-800 text-[8px] font-mono">
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-slate-450 font-mono text-[9px]">{i.sourceFiles.join(', ')}</td>
                            <td className="py-2 px-3 text-right">
                              {i.undoneAt ? (
                                <span className="text-rose-400 font-bold">Desfeita</span>
                              ) : (
                                <span className="text-teal-400 font-bold">Ativa</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* IMPACT SUMMARY MODAL */}
      {showImpactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-2xl p-6 relative">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Resumo do Impacto da Migração</h3>
                <p className="text-xs text-slate-400">Verifique as estatísticas antes de aplicar as mudanças definitivas.</p>
              </div>
              <button 
                onClick={() => setShowImpactModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Impact Details */}
            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/10 text-teal-400 font-bold text-xs flex justify-between">
                <span>Total de Ordens de Serviço a serem movidas:</span>
                <span>{impactData.totalSelected}</span>
              </div>

              {/* Status breakdown */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Origem das Ordens</span>
                <div className="space-y-2">
                  {Object.entries(impactData.statusCounts).map(([status, count]) => (
                    <div key={status} className="flex justify-between text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                      <span>Status: <strong className="font-mono">{status}</strong></span>
                      <span>Quantidade: <strong>{count}</strong></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Destination breakdown */}
              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block mb-2">Destino sugerido após conciliação</span>
                <div className="space-y-2">
                  {Object.entries(impactData.targetStatusCounts).map(([status, count]) => (
                    <div key={status} className="flex justify-between text-xs text-cyan-300 bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                      <span>Para: <strong className="font-mono">{status}</strong></span>
                      <span>Quantidade: <strong>{count}</strong></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Serialization corrections warning */}
              {impactData.serialFixesNeeded > 0 && (
                <div className="flex gap-2.5 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs text-amber-400">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div>
                    <strong className="block font-bold">Série Automática Requerida</strong>
                    {impactData.serialFixesNeeded} O.S. possuem peças sem número de série. O sistema gerará números fictícios de saneamento (MIG-AUTO-...) para permitir a migração correta.
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                onClick={() => setShowImpactModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-800 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={executeMigration}
                disabled={executing}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-500 text-slate-950 hover:bg-teal-400 font-extrabold text-xs shadow-md transition cursor-pointer"
              >
                <CheckCircle className="w-4 h-4 text-slate-950" />
                {executing ? 'Aplicando...' : 'Confirmar e Aplicar Lote'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* STATUS CONCILIATION IMPACT MODAL */}
      {showStatusImpactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-2xl p-6 relative">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Saneamento de Status</h3>
                <p className="text-xs text-slate-400">Verifique as estatísticas operacionais antes de mover o status das OSs.</p>
              </div>
              <button 
                onClick={() => setShowStatusImpactModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Impact Details */}
            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/10 text-teal-400 font-bold text-xs flex justify-between">
                <span>Total de OSs em Avaliação a serem saneadas:</span>
                <span>{selectedStatusIds.length}</span>
              </div>

              <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 text-cyan-450 font-bold text-xs flex justify-between">
                <span>Novo Status de Destino:</span>
                <span>AGUARDANDO_AUTORIZACAO</span>
              </div>

              {/* WhatsApp Option Reminder */}
              <div className={`p-4 rounded-2xl border text-xs flex flex-col gap-2 ${
                dispararWhatsApp 
                  ? 'bg-teal-500/5 border-teal-500/15 text-teal-400' 
                  : 'bg-slate-800/20 border-slate-800 text-slate-400'
              }`}>
                <div className="flex justify-between font-bold">
                  <span>Envio de Notificações WhatsApp:</span>
                  <span>{dispararWhatsApp ? 'ATIVADO' : 'DESATIVADO'}</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {dispararWhatsApp 
                    ? 'Ao confirmar, o sistema enviará uma mensagem de WhatsApp para cada cliente notificando que o orçamento já está pronto para aprovação.'
                    : 'Os status serão atualizados no sistema silenciosamente, sem enviar notificações por mensagem ao cliente.'
                  }
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                onClick={() => setShowStatusImpactModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-800 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={executeStatusMigration}
                disabled={statusExecuting}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-500 text-slate-950 hover:bg-teal-400 font-extrabold text-xs shadow-md transition cursor-pointer"
              >
                <CheckCircle className="w-4 h-4 text-slate-950" />
                {statusExecuting ? 'Atualizando...' : 'Confirmar e Saneiar Status'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
