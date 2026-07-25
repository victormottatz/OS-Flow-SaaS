/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { OrdemServico } from "../types";
import BlingConnectionStatus from "./BlingConnectionStatus";

interface BlingSandboxProps {
  ordensServico: any[];
  isOffline: boolean;
  onRefresh: () => Promise<void>;
  userRole?: string;
}

export default function BlingSandbox({ ordensServico, isOffline, onRefresh }: BlingSandboxProps) {
  const [activeTab, setActiveTab] = useState<"billing" | "catalog" | "xml" | "logs">("billing");

  // Faturamento State
  const [selectedOSId, setSelectedOSId] = useState("");
  const [forceErrorType, setForceErrorType] = useState<"" | "SEFAZ_REJECT" | "UNAUTHORIZED" | "SERVICE_DOWN" | "MOCK_TIMEOUT">("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [syncStatusMsg, setSyncStatusMsg] = useState("");
  const [errorHeader, setErrorHeader] = useState("");
  
  // Modal de Faturamento Estratégico
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [billingOSId, setBillingOSId] = useState("");
  const [clientIcmsType, setClientIcmsType] = useState("9");
  const [clientStateInscription, setClientStateInscription] = useState("");
  const [natureOperation, setNatureOperation] = useState("Venda de Peças e Serviços");

  // DANFE view states
  const [activeDanfeOS, setActiveDanfeOS] = useState<OrdemServico | null>(null);
  const [danfeData, setDanfeData] = useState<any>(null);

  // Importação de XML NFe State
  const [xmlInput, setXmlInput] = useState("");
  const [xmlImportResult, setXmlImportResult] = useState<any>(null);
  const [isImportingXml, setIsImportingXml] = useState(false);

  // Filtro do Console de Logs
  const [logFilter, setLogFilter] = useState("");
  const [copiedLogs, setCopiedLogs] = useState(false);

  // Catalog Sync State e polling inteligente
  const [catalogSync, setCatalogSync] = useState({
    isSyncing: false,
    total: 0,
    processed: 0,
    successCount: 0,
    errorCount: 0,
    currentType: "idle",
    logs: [] as string[]
  });

  // State para Auditoria e Saneamento Fiscal em Lote
  const [auditData, setAuditData] = useState<any>(null);
  const [isFixingBatch, setIsFixingBatch] = useState(false);
  const [fixBatchResult, setFixBatchResult] = useState<string | null>(null);

  const fetchAuditFiscal = async () => {
    try {
      const res = await fetch("/api/integration/audit-fiscal");
      if (res.ok) {
        const data = await res.json();
        setAuditData(data);
      }
    } catch (e) {
      console.error("[Audit Fiscal] Erro ao consultar auditoria:", e);
    }
  };

  useEffect(() => {
    fetchAuditFiscal();
  }, []);

  const handleFixBatch = async () => {
    setIsFixingBatch(true);
    setFixBatchResult(null);
    try {
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch("/api/integration/fix-clients-batch", {
        method: "POST",
        headers: { "Authorization": token ? `Bearer ${token}` : "" }
      });
      const data = await res.json();
      if (res.ok) {
        setFixBatchResult(data.message);
        await fetchAuditFiscal();
        await onRefresh();
      } else {
        alert(`Erro: ${data.message || data.error}`);
      }
    } catch (e) {
      alert("Erro ao comunicar com o servidor de saneamento.");
    } finally {
      setIsFixingBatch(false);
    }
  };

  const [osSearchQuery, setOsSearchQuery] = useState("");

  const filteredOrdensServico = ordensServico.filter(os => {
    if (!osSearchQuery.trim()) return true;
    const q = osSearchQuery.toLowerCase();
    const osNum = (os.osNumber || "").toLowerCase();
    const clientName = (os.client?.name || "").toLowerCase();
    const clientCpf = (os.client?.cpfCnpj || "").toLowerCase();
    const status = (os.status || "").toLowerCase();
    return osNum.includes(q) || clientName.includes(q) || clientCpf.includes(q) || status.includes(q);
  });

  const selectedOS = ordensServico.find(o => o.id === selectedOSId);

  const handleOpenBillingModal = (osId: string) => {
    const os = ordensServico.find(o => o.id === osId);
    setBillingOSId(osId);
    setClientIcmsType("9");
    setClientStateInscription(os?.client?.stateInscription || "");
    setNatureOperation("Venda de Peças e Serviços");
    setIsBillingModalOpen(true);
  };

  const fetchCatalogSyncProgress = async () => {
    const token = localStorage.getItem("mgv_token") || "";
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};
    try {
      const res = await fetch("/api/integration/bling/sync/catalog/progress", { headers });
      if (res.ok) {
        const data = await res.json();
        setCatalogSync(data);
      }
    } catch (err) {
      console.error("[Catalog Sync Status] Error:", err);
    }
  };

  const startCatalogSync = async () => {
    const token = localStorage.getItem("mgv_token") || "";
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};
    try {
      const res = await fetch("/api/integration/bling/sync/catalog", {
        method: "POST",
        headers
      });
      if (res.ok) {
        await fetchCatalogSyncProgress();
      } else {
        const d = await res.json();
        setCatalogSync(prev => ({
          ...prev,
          logs: [...prev.logs, `[ERRO] ${d.error || "Falha ao iniciar sincronização"}`]
        }));
      }
    } catch (err: any) {
      setCatalogSync(prev => ({
        ...prev,
        logs: [...prev.logs, `[ERRO CONEXÃO] ${err.message || "Falha na requisição"}`]
      }));
    }
  };

  const stopCatalogSync = async () => {
    const token = localStorage.getItem("mgv_token") || "";
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};
    try {
      const res = await fetch("/api/integration/bling/sync/catalog/stop", {
        method: "POST",
        headers
      });
      if (res.ok) {
        await fetchCatalogSyncProgress();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Preencher ID padrão e controlar polling INTELIGENTE (apenas se catalogSync.isSyncing)
  useEffect(() => {
    if (!selectedOSId && ordensServico.length > 0) {
      const finalizada = ordensServico.find(o => o.status === "FINALIZADO" || o.status === "PRONTO_RETIRADA");
      if (finalizada) {
        setSelectedOSId(finalizada.id);
      } else {
        setSelectedOSId(ordensServico[0].id);
      }
    }

    // Busca inicial rápida
    fetchCatalogSyncProgress();
  }, [ordensServico]);

  // Polling ativo SOMENTE durante sincronização em andamento (Otimização de Performance)
  useEffect(() => {
    if (!catalogSync.isSyncing) return;

    const interval = setInterval(() => {
      fetchCatalogSyncProgress();
    }, 2000);

    return () => clearInterval(interval);
  }, [catalogSync.isSyncing]);

  const triggerBlingInvoice = async (osId: string, extraOptions?: any) => {
    if (isOffline) {
      alert("Erro fiscal: Operação offline.");
      return;
    }

    setIsSyncing(true);
    setSyncLogs(["Iniciando disparo fiscal de vendas no canal..."]);
    setErrorHeader("");
    setSyncStatusMsg("Conectando de forma síncrona aos servidores do Bling...");

    try {
      const token = localStorage.getItem("mgv_token") || "";
      const response = await fetch(`/api/integration/bling/sync/${osId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          forceErrorType: forceErrorType === "MOCK_TIMEOUT" ? "" : forceErrorType,
          clientIcmsType: extraOptions?.clientIcmsType,
          clientStateInscription: extraOptions?.clientStateInscription,
          natureOperation: extraOptions?.natureOperation
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw { status: response.status, data };
      }

      setSyncStatusMsg("Faturamento e Nota Fiscal gerados com sucesso!");
      setSyncLogs(data.os?.billingLogs || ["Sucesso na integração fiscal!"]);
      await onRefresh();
    } catch (err: any) {
      const status = err.status || 500;
      const apiError = err.data?.feedbackMessage || err.data?.error || err.message || "Erro de integração com a SEFAZ/Bling.";
      
      setErrorHeader(`FALHA [HTTP ${status}]`);
      setSyncStatusMsg(`Erro: ${apiError}`);
      setSyncLogs(prev => [...prev, `[ERRO ${status}] ${apiError}`]);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportXml = async () => {
    if (!xmlInput.trim()) {
      alert("Por favor, cole o conteúdo XML da Nota Fiscal.");
      return;
    }

    setIsImportingXml(true);
    setXmlImportResult(null);

    try {
      const token = localStorage.getItem("mgv_token") || "";
      const res = await fetch("/api/integration/bling/import-xml", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ xmlData: xmlInput })
      });

      const data = await res.json();
      if (res.ok) {
        setXmlImportResult(data);
        await onRefresh();
      } else {
        alert(`Erro ao importar XML: ${data.error || "Falha desconhecida"}`);
      }
    } catch (err: any) {
      alert("Erro de conexão ao processar XML.");
    } finally {
      setIsImportingXml(false);
    }
  };

  const handleCopyLogs = () => {
    const textToCopy = (catalogSync.logs || []).join("\n");
    navigator.clipboard.writeText(textToCopy);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const filteredLogs = (catalogSync.logs || []).filter(l => 
    !logFilter || l.toLowerCase().includes(logFilter.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER PRINCIPAL COM GLASSMORPHISM */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-2xl border border-slate-800">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-full border border-indigo-500/30 uppercase tracking-wider">
                Hub ERP & Fiscal
              </span>
              <span className="text-slate-400 text-xs font-medium">Bling V3 API</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Painel de Integração Bling
            </h1>
            <p className="mt-1 text-sm text-slate-300 max-w-xl">
              Gerencie faturamento de Ordens de Serviço, sincronização de catálogo e entrada de XMLs fiscais com auditoria em tempo real.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <BlingConnectionStatus />
          </div>
        </div>

        {/* NAU-BAR DE ABAS DE NAVEGAÇÃO */}
        <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-800/80 pt-4">
          <button
            onClick={() => setActiveTab("billing")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "billing"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>📄</span>
            <span>Faturamento & NFe</span>
          </button>

          <button
            onClick={() => setActiveTab("catalog")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "catalog"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>📦</span>
            <span>Sincronização de Catálogo</span>
            {catalogSync.isSyncing && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("xml")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "xml"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>📥</span>
            <span>Importador de XML NFe</span>
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "logs"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>📋</span>
            <span>Console de Logs</span>
          </button>
        </div>
      </div>

      {/* CONTEÚDO DAS ABAS */}

      {/* ABA 1: FATURAMENTO & EMISSÃO DE NOTAS */}
      {activeTab === "billing" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PAINEL DE DISPARO DA OS */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Emissão de Nota Fiscal / Vendas</h3>
                <p className="text-xs text-slate-500">Selecione uma Ordem de Serviço para faturamento síncrono no Bling.</p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] rounded-lg border border-emerald-200 uppercase">
                Pronto para Envio
              </span>
            </div>

            {/* CARD DE AUDITORIA FISCAL E SANAMENTO EM LOTE */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Auditoria Cadastral & Saneamento Fiscal (Bling V3)</h4>
                    <p className="text-[11px] text-amber-700">Preencha em massa UFs/Endereços ausentes e habilite fallback dinâmico de Calibragem / Mão de Obra.</p>
                  </div>
                </div>

                <button
                  onClick={handleFixBatch}
                  disabled={isFixingBatch}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isFixingBatch ? "Processando Saneamento..." : "⚡ Corrigir Cadastros em Lote"}
                </button>
              </div>

              {auditData && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60 text-center">
                    <span className="text-[10px] text-amber-700 block font-semibold">Total de Clientes</span>
                    <span className="text-xs font-black text-amber-950">{auditData.totalClients}</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60 text-center">
                    <span className="text-[10px] text-amber-700 block font-semibold">Sem UF/Incompletos</span>
                    <span className={`text-xs font-black ${auditData.incompleteClients > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {auditData.incompleteClients}
                    </span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60 text-center">
                    <span className="text-[10px] text-amber-700 block font-semibold">UF Padrão da Loja</span>
                    <span className="text-xs font-black text-indigo-700">{auditData.storeState}</span>
                  </div>
                </div>
              )}

              {fixBatchResult && (
                <div className="p-2 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold">
                  ✓ {fixBatchResult}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Localizar Ordem de Serviço (OS):
                </label>
                
                {/* BARRA DE PESQUISA INTELIGENTE DE OS */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    🔍
                  </span>
                  <input
                    type="text"
                    value={osSearchQuery}
                    onChange={(e) => setOsSearchQuery(e.target.value)}
                    placeholder="Pesquisar por Nº da OS, Nome do Cliente, CPF/CNPJ ou Status..."
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  />
                  {osSearchQuery && (
                    <button
                      onClick={() => setOsSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* PAINEL DE RESULTADOS SELECIONÁVEIS */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                  {filteredOrdensServico.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-500">
                      Nenhuma Ordem de Serviço encontrada para a busca &quot;{osSearchQuery}&quot;
                    </div>
                  ) : (
                    filteredOrdensServico.map(os => {
                      const isSelected = os.id === selectedOSId;
                      return (
                        <div
                          key={os.id}
                          onClick={() => setSelectedOSId(os.id)}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between ${
                            isSelected
                              ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm"
                              : "bg-white border-slate-200/80 hover:bg-slate-100/80 text-slate-700"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800 flex items-center gap-2">
                              <span>{os.osNumber}</span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-600">{os.client?.name || "Cliente não informado"}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2">
                              <span>CPF/CNPJ: {os.client?.cpfCnpj || "N/A"}</span>
                              <span>•</span>
                              <span className="uppercase font-semibold text-slate-600">{os.status}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-extrabold text-emerald-600 block">R$ {(os.totalCost || 0).toFixed(2)}</span>
                            {isSelected && <span className="text-[10px] font-bold text-indigo-600 uppercase">Selecionada ✓</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {selectedOS && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60 text-xs space-y-2">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Cliente: {selectedOS.client?.name || "N/A"}</span>
                    <span>Status Fiscal: <strong className="text-indigo-600">{selectedOS.billingStatus || "PENDENTE"}</strong></span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-slate-600 pt-2 border-t border-slate-200/60">
                    <div>Mão de Obra: <strong className="text-slate-800">R$ {(selectedOS.laborCost || 0).toFixed(2)}</strong></div>
                    <div>Peças: <strong className="text-slate-800">R$ {(selectedOS.partsCost || 0).toFixed(2)}</strong></div>
                    <div>Total OS: <strong className="text-emerald-600">R$ {(selectedOS.totalCost || 0).toFixed(2)}</strong></div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  disabled={!selectedOSId || isSyncing}
                  onClick={() => handleOpenBillingModal(selectedOSId)}
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSyncing ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                      <span>Sincronizando com Bling...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>Emitir Nota Fiscal & Faturar OS</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* STATUS E LOGS DA SIMULAÇÃO */}
            {(syncStatusMsg || syncLogs.length > 0) && (
              <div className="mt-4 p-4 rounded-xl bg-slate-900 text-slate-200 text-xs space-y-2 font-mono border border-slate-800">
                <div className="flex justify-between items-center text-slate-400 text-[11px] pb-2 border-b border-slate-800">
                  <span>STATUS DO PROCESSAMENTO:</span>
                  <span className="text-emerald-400 font-bold">{syncStatusMsg}</span>
                </div>
                {errorHeader && <div className="text-rose-400 font-bold">{errorHeader}</div>}
                <div className="max-h-40 overflow-y-auto space-y-1 text-[11px] text-slate-300">
                  {syncLogs.map((log, index) => (
                    <div key={index} className="flex gap-2">
                      <span className="text-slate-500">&gt;</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SIMULADOR DE MOCK DE ERROS PARA HOMOLOGAÇÃO */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <span>🧪</span>
              <span>Testes de Homologação</span>
            </h3>
            <p className="text-xs text-slate-500">Simule respostas de falha ou rejeição da SEFAZ para validar a resiliência do sistema.</p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Simular Rejeição/Erro:</label>
              <select
                value={forceErrorType}
                onChange={(e) => setForceErrorType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
              >
                <option value="">Nenhum (Fluxo Real)</option>
                <option value="SEFAZ_REJECT">Rejeição SEFAZ (Rejeição NFe)</option>
                <option value="UNAUTHORIZED">Erro 401 Unauthorized</option>
                <option value="SERVICE_DOWN">Serviço Indisponível (503)</option>
                <option value="MOCK_TIMEOUT">Simular Timeout (Rede)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: SINCRONIZAÇÃO DE CATÁLOGO */}
      {activeTab === "catalog" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Sincronização em Lote do Catálogo</h3>
              <p className="text-xs text-slate-500">Transfira e mantenha atualizadas as peças do estoque local no Bling.</p>
            </div>

            <div className="flex items-center gap-3">
              {catalogSync.isSyncing ? (
                <button
                  onClick={stopCatalogSync}
                  className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold text-xs rounded-xl cursor-pointer transition"
                >
                  Interromper Sincronização
                </button>
              ) : (
                <button
                  onClick={startCatalogSync}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer transition flex items-center gap-2"
                >
                  <span>⚡</span>
                  <span>Iniciar Sincronização de Peças</span>
                </button>
              )}
            </div>
          </div>

          {/* BARRA DE PROGRESSO EM TEMPO REAL */}
          <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200/60">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
              <span>Progresso Global do Catálogo</span>
              <span>{catalogSync.processed} de {catalogSync.total} Peças Processadas</span>
            </div>

            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500 rounded-full"
                style={{
                  width: `${catalogSync.total > 0 ? (catalogSync.processed / catalogSync.total) * 100 : 0}%`
                }}
              ></div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                <span className="block text-slate-400 text-[10px] font-bold uppercase">Total Peças</span>
                <span className="text-sm font-extrabold text-slate-800">{catalogSync.total}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                <span className="block text-emerald-500 text-[10px] font-bold uppercase">Sucesso</span>
                <span className="text-sm font-extrabold text-emerald-600">{catalogSync.successCount}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                <span className="block text-rose-500 text-[10px] font-bold uppercase">Erros</span>
                <span className="text-sm font-extrabold text-rose-600">{catalogSync.errorCount}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                <span className="block text-indigo-500 text-[10px] font-bold uppercase">Status</span>
                <span className="text-xs font-bold text-indigo-600">{catalogSync.isSyncing ? "Sincronizando..." : "Concluído"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: IMPORTADOR DE XML NFE */}
      {activeTab === "xml" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-800">Importador de XML de Nota Fiscal (NFe)</h3>
            <p className="text-xs text-slate-500">Cole a NFe XML de entrada enviada pelo fornecedor para dar entrada automática em estoque.</p>
          </div>

          <div className="space-y-3">
            <textarea
              value={xmlInput}
              onChange={(e) => setXmlInput(e.target.value)}
              placeholder="Cole o código XML completo da NFe aqui (<nfeProc> ou <NFe>)..."
              rows={8}
              className="w-full p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl border border-slate-800 focus:ring-2 focus:ring-indigo-500 transition"
            ></textarea>

            <button
              disabled={isImportingXml || !xmlInput.trim()}
              onClick={handleImportXml}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {isImportingXml ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  <span>Processando XML...</span>
                </>
              ) : (
                <>
                  <span>📥</span>
                  <span>Processar e Dar Entrada no Estoque</span>
                </>
              )}
            </button>
          </div>

          {xmlImportResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-2">
              <div className="font-bold text-emerald-900">✅ XML Processado com Sucesso!</div>
              <div>Nota Fiscal Nº: <strong>{xmlImportResult.nNF}</strong> | Fornecedor: <strong>{xmlImportResult.supplier}</strong></div>
              <div>Peças Criadas: <strong>{xmlImportResult.createdCount}</strong> | Peças Atualizadas: <strong>{xmlImportResult.updatedCount}</strong></div>
            </div>
          )}
        </div>
      )}

      {/* ABA 4: CONSOLE DE LOGS E DIAGNÓSTICO */}
      {activeTab === "logs" && (
        <div className="bg-slate-900 text-slate-200 rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-4 font-mono text-xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-500"></span>
              <span className="h-3 w-3 rounded-full bg-amber-500"></span>
              <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
              <span className="ml-2 font-bold text-slate-300">Terminal de Logs Fiscais Bling</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Filtrar logs..."
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-800 text-slate-200 rounded-lg text-xs border border-slate-700 focus:outline-none"
              />
              <button
                onClick={handleCopyLogs}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition cursor-pointer"
              >
                {copiedLogs ? "Copiado! ✓" : "Copiar Logs"}
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-1.5 text-[11px] text-slate-300 pr-2">
            {filteredLogs.length === 0 ? (
              <div className="text-slate-500 py-4 text-center">Nenhum log registrado até o momento.</div>
            ) : (
              filteredLogs.map((log, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-indigo-400 select-none">&gt;</span>
                  <span className={log.includes("[ERRO]") ? "text-rose-400 font-bold" : log.includes("Sucesso") ? "text-emerald-400" : "text-slate-300"}>
                    {log}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CONFORMAÇÃO FISCAL DE ESTRATÉGIA */}
      {isBillingModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Confirmar Parâmetros Fiscais (NFe)</h3>
              <button onClick={() => setIsBillingModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Indicador de Inscrição Estadual (IE):</label>
                <select
                  value={clientIcmsType}
                  onChange={(e) => setClientIcmsType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                >
                  <option value="9">9 - Não Contribuinte (Pessoa Física / Consumidor Final)</option>
                  <option value="1">1 - Contribuinte ICMS (Empresa com Inscrição Estadual)</option>
                  <option value="2">2 - Contribuinte Isento</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Inscrição Estadual (se houver):</label>
                <input
                  type="text"
                  value={clientStateInscription}
                  onChange={(e) => setClientStateInscription(e.target.value)}
                  placeholder="Ex: 123456789"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Natureza da Operação:</label>
                <input
                  type="text"
                  value={natureOperation}
                  onChange={(e) => setNatureOperation(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsBillingModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setIsBillingModalOpen(false);
                  triggerBlingInvoice(billingOSId, {
                    clientIcmsType,
                    clientStateInscription,
                    natureOperation
                  });
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-lg shadow-indigo-600/20 transition"
              >
                Emitir Nota no Bling
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
