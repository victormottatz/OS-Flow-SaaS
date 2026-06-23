/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { OrdemServico, Client, Device } from "../types";


interface BlingSandboxProps {
  ordensServico: OrdemServico[];
  isOffline: boolean;
  onRefresh: () => void;
}

export default function BlingSandbox({ ordensServico, isOffline, onRefresh }: BlingSandboxProps) {
  const [selectedOSId, setSelectedOSId] = useState("");
  const [forceErrorType, setForceErrorType] = useState<"" | "SEFAZ_REJECT" | "UNAUTHORIZED" | "SERVICE_DOWN" | "MOCK_TIMEOUT">("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [syncStatusMsg, setSyncStatusMsg] = useState("");
  const [errorHeader, setErrorHeader] = useState("");
  
  // Backoff simulation visual timers
  const [backoffTimer, setBackoffTimer] = useState<number | null>(null);
  
  // Selected OS record
  const selectedOS = ordensServico.find(o => o.id === selectedOSId);

  // DANFE view states
  const [activeDanfeOS, setActiveDanfeOS] = useState<OrdemServico | null>(null);
  const [danfeData, setDanfeData] = useState<any>(null);

  // Catalog Sync State and polling
  const [catalogSync, setCatalogSync] = useState({
    isSyncing: false,
    total: 0,
    processed: 0,
    successCount: 0,
    errorCount: 0,
    currentType: "idle",
    logs: [] as string[]
  });

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
    if (!window.confirm("Isso iniciará uma sincronização em segundo plano de todos os clientes e estoque. Pode levar alguns minutos. Deseja prosseguir?")) {
      return;
    }
    const token = localStorage.getItem("mgv_token") || "";
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};
    try {
      const res = await fetch("/api/integration/bling/sync/catalog", {
        method: "POST",
        headers
      });
      if (res.ok) {
        fetchCatalogSyncProgress();
      } else {
        const d = await res.json();
        alert(d.error || "Erro ao iniciar sincronização.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao iniciar sincronização.");
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
        fetchCatalogSyncProgress();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Set default selected OS and manage polling
  useEffect(() => {
    if (!selectedOSId && ordensServico.length > 0) {
      const finalizada = ordensServico.find(o => o.status === "FINALIZADO" || o.status === "PRONTO_RETIRADA");
      if (finalizada) {
        setSelectedOSId(finalizada.id);
      } else {
        setSelectedOSId(ordensServico[0].id);
      }
    }

    // Initial fetch for progress
    fetchCatalogSyncProgress();

    // Poll every 1.5 seconds to track progress
    const interval = setInterval(() => {
      fetchCatalogSyncProgress();
    }, 1500);

    return () => clearInterval(interval);
  }, [ordensServico]);

  const triggerBlingInvoice = async (osId: string) => {
    if (isOffline) {
      alert("Erro fiscal: Operação offline. Imparidade física detectada.");
      return;
    }

    setIsSyncing(true);
    setSyncLogs(["Iniciando trigger de sinc de vendas no canal..."]);
    setErrorHeader("");
    setSyncStatusMsg("Conectando de forma síncrona aos servidores da Bling...");
    setBackoffTimer(null);

    const useTimeout = forceErrorType === "MOCK_TIMEOUT";

    try {
      // Simulate front-end status progression as requested in Spec
      setTimeout(() => {
        setSyncStatusMsg("Enviando dados estruturados... Aguardando SEFAZ/Bling...");
        setSyncLogs(prev => [...prev, "Bling API V3 Gateway: Payload validado localmente.", "Aguardando retorno síncrono da SEFAZ..."]);
      }, 1000);

      const response = await fetch(`/api/integration/bling/sync/${osId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forceErrorType: forceErrorType === "MOCK_TIMEOUT" ? "" : forceErrorType,
          simulatedTimeout: useTimeout
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw { status: response.status, data };
      }

      setSyncStatusMsg("Faturamento concluído com sucesso!");
      setSyncLogs(data.os?.billingLogs || ["Sucesso na integração de notas!"]);
      onRefresh();

    } catch (err: any) {
      const respStatus = err.status;
      const respData = err.data;

      // SPEC: Exponential Backoff retry mechanism simulation
      if (respStatus === 503) {
        setSyncStatusMsg("Gateway indisponível. Iniciando mecanismo de retentativas programadas...");
        
        // Simular Backoff Exponencial visual de 3 tentativas
        setSyncLogs(prev => [...prev, "[FALHA 503] Ativando Backoff Exponencial de retentativas físicas..."]);
        
        let attempt = 1;
        const retryTimes = [5, 10, 15]; // shorter visual times than 5s, 15s, 45s for demo responsiveness
        
        const runRetry = () => {
          if (attempt > 3) {
            setSyncStatusMsg("Sincronia falhou após 3 tentativas. Operação movida para Fila de Lote.");
            setSyncLogs(prev => [...prev, "[EXCEDIDO] Todas as retentativas falharam. Finalizado com Erro local."]);
            setIsSyncing(false);
            onRefresh();
            return;
          }

          setSyncLogs(prev => [...prev, `[BACKOFF] Preparando retentativa ${attempt}/3... aguardando.`]);
          
          let secondsLeft = retryTimes[attempt - 1];
          const timerInterval = setInterval(() => {
            secondsLeft--;
            setSyncStatusMsg(`Retentando em ${secondsLeft}s... (Tentativa ${attempt}/3)`);
            if (secondsLeft <= 0) {
              clearInterval(timerInterval);
              setSyncLogs(prev => [...prev, `[RETENTATIVA ${attempt}] Despachando nota fiscal ao Bling...`]);
              attempt++;
              runRetry();
            }
          }, 1000);
        };

        runRetry();
        return;

      } else {
        // Handle normal errors
        setErrorHeader(respData?.error || "Erro SEFAZ");
        setSyncStatusMsg(respData?.feedbackMessage || "Emissão fiscal rejeitada pelas validações SEFAZ.");
        setSyncLogs(respData?.logs || ["Erro na operação"]);
        onRefresh();
      }
    } finally {
      if (forceErrorType !== "MOCK_TIMEOUT" && forceErrorType !== "SERVICE_DOWN") {
        setIsSyncing(false);
      }
    }
  };

  const handleOpenDanfe = async (os: OrdemServico) => {
    if (!os.pdfUrl) return;

    try {
      const response = await fetch(os.pdfUrl);
      const data = await response.json();
      setActiveDanfeOS(os);
      setDanfeData(data);
    } catch (err) {
      alert("Erro ao decodificar DANFE.");
    }
  };

  return (
    <div className="space-y-6 anim-fadein">
      {/* Printable Area overrides shown inside modal / container */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-danfe, #printable-danfe * {
            visibility: visible;
          }
          #printable-danfe {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Painel de Integração Externa & Fiscal</h2>
        <p className="text-slate-500 text-sm">Interface de faturamento e monitoramento fiscal integrados em tempo real via Bling API V3</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column cards stack */}
        <div className="space-y-6">
          {/* Simulador de Homologação */}
          <div className="bg-white rounded-2xl border border-slate-250/70 p-6 space-y-5 shadow-premium">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-2.5">
              <span className="material-symbols-outlined text-[18px] text-indigo-650">settings</span>
              <span>Simulador de Homologação</span>
            </h3>

            <p className="text-xs text-slate-500 leading-relaxed">
              Como faturamento com a SEFAZ real possui regras restritas, use as configurações abaixo para testar o comportamento do sistema diante de falhas de comunicação e rejeições de impostos:
            </p>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Selecione uma Ordem de Serviço:</label>
              <select
                value={selectedOSId}
                onChange={(e) => setSelectedOSId(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-650/20 focus:border-indigo-600 font-medium transition duration-150"
              >
                <option value="">-- Escolher OS --</option>
                {ordensServico.map(os => (
                  <option key={os.id} value={os.id}>
                    {os.osNumber} - {(os as any).client?.name} (Status: {os.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Forçar tipo de Erro Fiscal SEFAZ/Bling:</label>
              <div className="space-y-2">
                {[
                  { id: "", label: "Sucesso Absoluto (Faturamento autoriza na hora)", color: "text-emerald-700" },
                  { id: "MOCK_TIMEOUT", label: "Timeout de Comunicação (Excede limite síncrono de 10s)", color: "text-amber-700" },
                  { id: "SEFAZ_REJECT", label: "Rejeitado pela SEFAZ (Validações de inscrição/imposto)", color: "text-red-700" },
                  { id: "UNAUTHORIZED", label: "Não Autorizado (Assinatura digital/Chave de API expirada)", color: "text-red-700" },
                  { id: "SERVICE_DOWN", label: "Servidores em Manutenção (Código HTTP 503)", color: "text-purple-700" },
                ].map(opt => (
                  <label key={opt.id} className="flex items-start space-x-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs transition duration-150 hover-premium">
                    <input
                      type="radio"
                      name="error-forced"
                      checked={forceErrorType === opt.id}
                      onChange={() => setForceErrorType(opt.id as any)}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={`font-semibold ${opt.color}`}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={() => selectedOSId && triggerBlingInvoice(selectedOSId)}
              disabled={!selectedOSId || isSyncing}
              className="w-full bg-indigo-600 text-white font-bold text-xs py-3 rounded-xl hover:bg-indigo-700 active:bg-indigo-800 transition duration-150 flex items-center justify-center space-x-2 disabled:bg-slate-200 disabled:text-slate-450 hover-premium active-premium cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              <span>{isSyncing ? "Processando Comunicação..." : "Faturar & Transmitir NFe"}</span>
            </button>
          </div>

          {/* Sincronização de Cadastro (Clientes e Peças) */}
          <div className="bg-white rounded-2xl border border-slate-250/70 p-6 space-y-4 shadow-premium">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-2.5">
              <span className="material-symbols-outlined text-[18px] text-indigo-650">sync</span>
              <span>Sincronização de Cadastro</span>
            </h3>

            <p className="text-xs text-slate-500 leading-relaxed">
              Sincronize a base de clientes ativos e estoque local de peças de reposição com o ERP Bling V3.
            </p>

            {catalogSync.isSyncing ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-650">
                  <span>Enviando: {catalogSync.currentType === "clients" ? "Clientes" : "Estoque/Peças"}</span>
                  <span className="font-mono">{catalogSync.processed} / {catalogSync.total} ({((catalogSync.processed / (catalogSync.total || 1)) * 100).toFixed(0)}%)</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(catalogSync.processed / (catalogSync.total || 1)) * 100}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono font-bold">
                  <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 p-2 rounded-lg">
                    Sucessos: {catalogSync.successCount}
                  </div>
                  <div className="bg-rose-50 text-rose-700 border border-rose-100 p-2 rounded-lg">
                    Erros: {catalogSync.errorCount}
                  </div>
                </div>

                {/* Mini logs terminal */}
                <div className="bg-slate-950 text-cyan-400 p-3 rounded-xl text-[9px] font-mono max-h-[120px] overflow-y-auto leading-normal border border-slate-800 shadow-inner">
                  {catalogSync.logs.slice(-5).map((log, idx) => (
                    <p key={idx} className="truncate">&gt; {log}</p>
                  ))}
                </div>

                <button
                  onClick={stopCatalogSync}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-2.5 rounded-xl transition duration-150 flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[14px]">stop</span>
                  <span>Interromper Sincronização</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-mono text-slate-400 block font-bold">Último status:</span>
                  <span className="text-[10px] text-slate-700 font-semibold block mt-1.5 font-mono line-clamp-2 leading-relaxed">
                    {catalogSync.logs.length > 0 ? catalogSync.logs[catalogSync.logs.length - 1] : "Nenhuma execução registrada."}
                  </span>
                </div>
                <button
                  onClick={startCatalogSync}
                  className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition duration-150 flex items-center justify-center space-x-2 hover-premium cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[14px]">sync</span>
                  <span>Sincronizar Geral</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Middle column: Sinc Live logs & Circuit Breaker */}
        <div className="glassmorphism-dark text-slate-100 rounded-2xl p-6 flex flex-col justify-between shadow-premium-dark lg:col-span-2 border border-slate-800 relative overflow-hidden">
          {/* Subtle grid scanlines overlay for retro premium terminal screen */}
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,6px_100%]" />
          
          <div className="space-y-4 z-10">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs uppercase font-mono tracking-widest text-cyan-400 flex items-center space-x-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                </span>
                <span className="neon-text-cyan font-bold flex items-center">
                  <span className="material-symbols-outlined text-[16px] mr-1.5">terminal</span>
                  Monitor do Posto Fiscal (SEFAZ/Bling)
                </span>
              </span>
              
              <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-400">
                <span className="flex items-center space-x-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? "bg-red-500" : "bg-emerald-500 anim-pulse"}`} />
                  <span>Internet</span>
                </span>
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  PORT: TLS/HTTPS
                </span>
              </div>
            </div>

            {/* Simulated CRT Terminal screen */}
            {isSyncing || syncLogs.length > 0 ? (
              <div className="space-y-2.5 font-mono text-xs max-h-[310px] overflow-y-auto bg-black/90 p-4 rounded-xl border border-slate-800 shadow-inner neon-glow-cyan">
                <p className="text-slate-500 text-[10px] tracking-widest mb-1">=== INICIANDO COMUNICAÇÃO SEGURA ===</p>
                {syncLogs.map((log, idx) => (
                  <p key={idx} className={`${
                    log.includes("[SEFAZ REJECT]") || log.includes("[HTTP 4") || log.includes("[HTTP 5") || log.includes("[FALHA") ? "text-red-400 font-bold" :
                    log.includes("[BACKOFF]") || log.includes("[RETENTATIVA") ? "text-amber-400" :
                    log.includes("sucesso") || log.includes("autorizou") || log.includes("gerada") ? "text-emerald-400 font-bold neon-text-emerald" :
                    "text-cyan-300 opacity-90"
                  } leading-relaxed`}>
                    &gt; {log}
                  </p>
                ))}
                
                {isSyncing && (
                  <div className="py-2 flex items-center space-x-2 font-semibold text-cyan-400 anim-pulse">
                    <span className="material-symbols-outlined text-[14px] animate-spin text-cyan-400">sync</span>
                    <span className="neon-text-cyan">{syncStatusMsg}</span>
                    <span className="w-1.5 h-3 bg-cyan-400 animate-pulse" />
                  </div>
                )}
                {!isSyncing && <p className="text-cyan-400 flex items-center mt-1">&gt;<span className="w-1.5 h-3.5 bg-cyan-400 animate-pulse ml-1" /></p>}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl bg-black/20">
                <span className="material-symbols-outlined text-[32px] mx-auto mb-3 text-slate-600 opacity-60 block text-center">terminal</span>
                <p className="font-bold text-slate-400">AGUARDANDO TRANSMISSÃO FISCAL</p>
                <p className="text-[10px] mt-1 text-slate-500">Selecione uma OS da base e aperte em Faturar para depurar em tempo real.</p>
              </div>
            )}

            {/* Error notifications block */}
            {errorHeader && (
              <div className="bg-red-950/60 border border-red-800/80 rounded-xl p-3.5 text-red-200 text-xs flex items-start space-x-3 anim-slideup">
                <span className="material-symbols-outlined text-[20px] text-rose-450 shrink-0 mt-0.5">error</span>
                <div>
                  <strong className="font-bold block uppercase tracking-wide text-red-300">{errorHeader}</strong>
                  <p className="mt-1 text-red-300/90 leading-relaxed font-medium">{syncStatusMsg}</p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between items-center mt-6 z-10">
            <span className="flex items-center space-x-1.5">
              <span className="material-symbols-outlined text-[16px] text-cyan-500">verified_user</span>
              <span>Chave criptográfica ativa (SSL/TLS 1.3)</span>
            </span>
            <span>BLING-GW-V3</span>
          </div>
        </div>
      </div>

      {/* Completed finalizadas table list of sales invoices */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-premium p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-100 pb-4 mb-4 gap-2">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
            <span className="material-symbols-outlined text-[18px] mr-2 text-indigo-600">layers</span>
            Notas Fiscais de Serviços & Peças (NF-e)
          </h3>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg font-mono">
            Mostrando ordens com status "FINALIZADO"
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="text-[10px] uppercase text-slate-400 font-bold bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-3">Numeração</th>
                <th className="p-3">Proprietário (Cliente)</th>
                <th className="p-3 font-mono">Chave de Acesso SEFAZ</th>
                <th className="p-3 text-right">Valor Total</th>
                <th className="p-3 text-center">Integração</th>
                <th className="p-3 text-right">Ações de Documento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {ordensServico.filter(os => os.status === "FINALIZADO").length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 italic">
                    Não existem ordens de serviço finalizadas prontas para faturamento no momento.
                  </td>
                </tr>
              ) : (
                ordensServico.filter(os => os.status === "FINALIZADO").map(os => (
                  <tr key={os.id} className="hover:bg-slate-50/50 transition duration-150">
                    <td className="p-3 font-bold text-slate-900">{os.osNumber}</td>
                    <td className="p-3 text-slate-800">{(os as any).client?.name || "Cliente N/D"}</td>
                    <td className="p-3 font-mono text-slate-500 text-[11px] flex items-center space-x-1.5">
                      {os.blingKey ? (
                        <>
                          <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">{os.blingKey.slice(0, 16)}...</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(os.blingKey || "");
                              alert("Chave SEFAZ copiada para a área de transferência!");
                            }}
                            title="Copiar chave completa"
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[12px]">content_copy</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-300">Não faturada</span>
                      )}
                    </td>
                    <td className="p-3 font-bold font-mono text-slate-900 text-right">R$ {os.totalCost.toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                        os.billingStatus === "FATURADO" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        os.billingStatus === "REJEITADO" ? "bg-red-50 text-red-700 border-red-200" :
                        os.billingStatus === "TIMEOUT" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-slate-50 text-slate-600 border-slate-200"
                      }`}>
                        {os.billingStatus}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {os.billingStatus === "FATURADO" ? (
                        <button
                          onClick={() => handleOpenDanfe(os)}
                          className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] px-3.5 py-2 rounded-xl uppercase font-mono tracking-wide flex items-center space-x-1.5 inline-flex ml-auto transition hover-premium active-premium cursor-pointer shadow-sm"
                        >
                           <span className="material-symbols-outlined text-[14px]">description</span>
                          <span>Visualizar DANFE</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => triggerBlingInvoice(os.id)}
                          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] px-3.5 py-2 rounded-xl uppercase font-mono tracking-wide inline-flex ml-auto transition hover-premium active-premium cursor-pointer shadow-sm"
                        >
                          Tentar Re-envio
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* API Reference table from Specification */}
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 mt-6 text-xs text-slate-650 shadow-sm">
        <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-3 flex items-center space-x-1.5 border-b border-slate-200 pb-1.5">
          <span className="material-symbols-outlined text-[16px] text-indigo-650">help</span>
          <span>Tabela de Referência Fiscal (Códigos de Operação Bling API V3)</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mt-3">
          {[
            { code: "200 OK", desc: "Sucesso na geração fiscal SEFAZ. Nota autorizada.", color: "text-emerald-700 bg-emerald-50/50 border border-emerald-100" },
            { code: "400 Bad Request", desc: "Invalidez de digitação documental ou campos ausentes.", color: "text-amber-700 bg-amber-50/50 border border-amber-100" },
            { code: "401 Unauthorized", desc: "Chave API Bling incorreta ou expirada.", color: "text-red-700 bg-red-50/50 border border-red-100" },
            { code: "422 Unproc Entity", desc: "Nota rejeitada pela SEFAZ (inconsistência de dados).", color: "text-red-700 bg-red-50/50 border border-red-100" },
            { code: "503 Service Down", desc: "Servidores do posto fiscal offline. Aciona backoff.", color: "text-purple-700 bg-purple-50/50 border border-purple-100" },
          ].map((item, idx) => (
            <div key={idx} className={`p-3 rounded-xl transition ${item.color}`}>
              <span className="font-mono font-bold text-xs block">{item.code}</span>
              <span className="text-[10px] text-slate-500 font-medium mt-1 block leading-relaxed">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* DANFE MODAL PREVIEW ON SCREEN */}
      {activeDanfeOS && danfeData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-350 w-full max-w-4xl max-h-[95vh] overflow-y-auto flex flex-col anim-slideup">
            
            {/* Modal header with options */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-10 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <span className="material-symbols-outlined text-[20px] text-cyan-400">description</span>
                <h3 className="font-bold text-sm uppercase tracking-wide font-display">Simulação de Nota Fiscal Eletrônica (DANFE)</h3>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-2 transition shadow-sm hover-premium active-premium cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Imprimir NFe</span>
                </button>
                <button 
                  onClick={() => { setActiveDanfeOS(null); setDanfeData(null); }} 
                  className="text-slate-400 hover:text-white transition p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* DANFE Layout - Pixel Perfect Brazilian NFe Mockup */}
            <div id="printable-danfe" className="p-6 font-sans text-[9px] text-black bg-white select-none">
              
              <div className="border border-black p-3 space-y-3 font-mono">
                
                {/* COM PROVANTE RECEBIMENTO TEAR-OFF STUB */}
                <div className="grid grid-cols-12 border border-black divide-x divide-black mb-2">
                  <div className="col-span-9 p-1.5 leading-relaxed">
                    <p className="uppercase text-[7px] text-slate-500 font-bold">RECEBEMOS DE MGV TECNOLOGIA E ASSISTÊNCIA TÉCNICA LTDA OS SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO</p>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="border-t border-dashed border-black/40 pt-1">
                        <span className="text-[6px] text-slate-500 block uppercase font-bold">Data de Recebimento</span>
                      </div>
                      <div className="border-t border-dashed border-black/40 pt-1">
                        <span className="text-[6px] text-slate-500 block uppercase font-bold">Identificação e Assinatura do Recebedor</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-3 p-2 text-center flex flex-col justify-center items-center">
                    <span className="font-bold block text-sm">NF-e</span>
                    <span className="font-bold text-xs mt-0.5">Nº {danfeData.os.osNumber.replace(/\D/g, "")}</span>
                    <span className="text-[8px] text-slate-500 uppercase font-bold">Série 001</span>
                  </div>
                </div>
                
                <div className="border-b border-dashed border-black pb-2 text-center text-[7px] text-slate-400 uppercase tracking-widest">
                  ------------------------------------------ CORTAR AQUI ------------------------------------------
                </div>

                {/* EMITENTE E CHAVE SEFAZ */}
                <div className="grid grid-cols-12 border border-black divide-x divide-black">
                  <div className="col-span-4 p-2.5 space-y-1">
                    <h4 className="text-[10px] font-bold uppercase tracking-tight text-slate-900">{danfeData.emitente.nome}</h4>
                    <p className="text-[8px] text-slate-500 leading-normal">
                      Av. Tiradentes, 850 - Centro<br/>
                      CEP: {danfeData.emitente.cep} - Ribeirão Preto - SP<br/>
                      Tel: {danfeData.emitente.contato}
                    </p>
                  </div>
                  
                  <div className="col-span-3 p-2.5 text-center flex flex-col justify-center items-center font-sans">
                    <h5 className="font-black text-sm uppercase text-slate-900 tracking-wider">DANFE</h5>
                    <p className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">Documento Auxiliar da<br/>Nota Fiscal Eletrônica</p>
                    <div className="border border-black px-3 py-1.5 my-1.5 text-left text-[9px] font-bold inline-block font-mono">
                      <p>0 - Entrada</p>
                      <p className="flex items-center">
                        <span className="border border-black w-2.5 h-2.5 flex items-center justify-center mr-1">1</span>
                        <span>1 - Saída</span>
                      </p>
                    </div>
                    <p className="font-bold text-[9px]">Nº {danfeData.os.osNumber.replace(/\D/g, "")}</p>
                    <p className="text-[8px] text-slate-500 uppercase font-bold">SÉRIE 001 - FL 1/1</p>
                  </div>
                  
                  <div className="col-span-5 p-2.5 space-y-2 leading-relaxed">
                    <div>
                      <span className="text-[6px] text-slate-500 block uppercase font-bold">Controle do Fisco</span>
                      {/* Simulated Access Key Barcode */}
                      <div className="flex items-end space-x-[1px] h-9 w-full bg-slate-50 border border-slate-300 rounded p-1 justify-center">
                        <div className="w-[1px] h-full bg-black" />
                        <div className="w-[2px] h-full bg-black" />
                        <div className="w-[1px] h-full bg-black" />
                        <div className="w-[3px] h-full bg-black" />
                        <div className="w-[1px] h-full bg-black" />
                        <div className="w-[2px] h-full bg-black" />
                        <div className="w-[4px] h-full bg-black" />
                        <div className="w-[1px] h-full bg-black" />
                        <div className="w-[2px] h-full bg-black" />
                        <div className="w-[3px] h-full bg-black" />
                        <div className="w-[1px] h-full bg-black" />
                        <div className="w-[4px] h-full bg-black" />
                        <div className="w-[2px] h-full bg-black" />
                        <div className="w-[1px] h-full bg-black" />
                        <div className="w-[3px] h-full bg-black" />
                        <div className="w-[1px] h-full bg-black" />
                      </div>
                    </div>
                    <div>
                      <span className="text-[6px] text-slate-500 block uppercase font-bold">Chave de Acesso (44 dígitos)</span>
                      <strong className="text-[8px] font-mono block tracking-tighter text-slate-900">
                        {danfeData.os.blingKey ? danfeData.os.blingKey.replace(/(\w{4})/g, "$1 ") : "3526 0618 2915 5400 0190 5500 1000 0001 2345 6789 0123"}
                      </strong>
                    </div>
                    <div className="text-[7px] text-slate-500 leading-normal border-t border-slate-200 pt-1 font-sans">
                      Consulta de autenticidade no portal nacional da NF-e (www.nfe.fazenda.gov.br) ou no site da Sefaz Autorizadora.
                    </div>
                  </div>
                </div>

                {/* NATUREZA OPERACAO / PROTOCOLO */}
                <div className="grid grid-cols-12 border border-black divide-x divide-black border-t-0">
                  <div className="col-span-6 p-1.5">
                    <span className="text-[6px] text-slate-500 block uppercase font-bold">Natureza da Operação</span>
                    <span className="font-bold text-slate-800">Prestação de Serviço com Reposição de Peças</span>
                  </div>
                  <div className="col-span-6 p-1.5">
                    <span className="text-[6px] text-slate-500 block uppercase font-bold">Protocolo de Autorização de Uso da NF-e</span>
                    <span className="font-bold text-slate-800 font-mono">135260012938102 - {new Date(danfeData.os.createdAt).toLocaleString("pt-BR")}</span>
                  </div>
                </div>

                {/* CADASTROS FISCAIS */}
                <div className="grid grid-cols-3 border border-black divide-x divide-black border-t-0 text-center">
                  <div className="p-1.5 text-left">
                    <span className="text-[6px] text-slate-500 block uppercase font-bold">Inscrição Estadual</span>
                    <span className="font-bold text-slate-800 font-mono">{danfeData.emitente.ie}</span>
                  </div>
                  <div className="p-1.5 text-left">
                    <span className="text-[6px] text-slate-500 block uppercase font-bold">Insc. Est. do Subst. Trib.</span>
                    <span className="font-bold text-slate-800">--</span>
                  </div>
                  <div className="p-1.5 text-left">
                    <span className="text-[6px] text-slate-500 block uppercase font-bold">CNPJ Emitente</span>
                    <span className="font-bold text-slate-800 font-mono">{danfeData.emitente.cnpj}</span>
                  </div>
                </div>

                {/* DESTINATÁRIO */}
                <div className="border border-black">
                  <div className="bg-slate-100 text-[7px] font-bold px-2 py-0.5 border-b border-black uppercase font-sans">Destinatário / Remetente</div>
                  <div className="grid grid-cols-12 divide-x divide-black divide-y-0 text-left">
                    <div className="col-span-7 p-1.5">
                      <span className="text-[6px] text-slate-500 block uppercase font-bold">Nome / Razão Social</span>
                      <strong className="text-slate-900 text-[10px]">{danfeData.client.name}</strong>
                    </div>
                    <div className="col-span-3 p-1.5">
                      <span className="text-[6px] text-slate-500 block uppercase font-bold">CNPJ / CPF</span>
                      <span className="font-mono font-bold text-slate-850">{danfeData.client.cpfCnpj}</span>
                    </div>
                    <div className="col-span-2 p-1.5">
                      <span className="text-[6px] text-slate-500 block uppercase font-bold">Data de Emissão</span>
                      <span className="font-mono">{new Date(danfeData.os.createdAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-12 divide-x divide-black border-t border-black text-left">
                    <div className="col-span-5 p-1.5">
                      <span className="text-[6px] text-slate-500 block uppercase font-bold">Endereço</span>
                      <span className="truncate block max-w-full">{danfeData.client.address}</span>
                    </div>
                    <div className="col-span-3 p-1.5">
                      <span className="text-[6px] text-slate-500 block uppercase font-bold">Bairro / Distrito</span>
                      <span>Centro</span>
                    </div>
                    <div className="col-span-2 p-1.5">
                      <span className="text-[6px] text-slate-500 block uppercase font-bold">CEP</span>
                      <span className="font-mono text-slate-800">01000-000</span>
                    </div>
                    <div className="col-span-2 p-1.5">
                      <span className="text-[6px] text-slate-500 block uppercase font-bold">Data de Saída/Entrada</span>
                      <span className="font-mono">{new Date(danfeData.os.createdAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 divide-x divide-black border-t border-black text-left">
                    <div className="col-span-4 p-1.5">
                      <span className="text-[6px] text-slate-500 block uppercase font-bold">Município</span>
                      <span>{danfeData.emitente.cidade.split(" - ")[0]}</span>
                    </div>
                    <div className="col-span-2 p-1.5">
                      <span className="text-[6px] text-slate-500 block uppercase font-bold">Fone / Fax</span>
                      <span className="font-mono">{danfeData.client.phone}</span>
                    </div>
                    <div className="col-span-1 p-1.5 text-center">
                      <span className="text-[6px] text-slate-500 block uppercase font-bold">UF</span>
                      <span>SP</span>
                    </div>
                    <div className="col-span-3 p-1.5">
                      <span className="text-[6px] text-slate-500 block uppercase font-bold">Inscrição Estadual</span>
                      <span>Isento</span>
                    </div>
                    <div className="col-span-2 p-1.5">
                      <span className="text-[6px] text-slate-500 block uppercase font-bold">Hora de Saída</span>
                      <span className="font-mono">{new Date(danfeData.os.createdAt).toLocaleTimeString("pt-BR", {hour: "2-digit", minute: "2-digit"})}</span>
                    </div>
                  </div>
                </div>

                {/* FATURA / DUPLICATAS */}
                <div className="border border-black">
                  <div className="bg-slate-100 text-[7px] font-bold px-2 py-0.5 border-b border-black uppercase font-sans">Fatura / Duplicata</div>
                  <div className="p-1.5 font-bold text-slate-800 text-[8px] flex justify-between">
                    <span>Nº DUPLICATA: DUP-01</span>
                    <span>VENCIMENTO: À VISTA</span>
                    <span>VALOR: R$ {danfeData.os.totalCost.toFixed(2)}</span>
                  </div>
                </div>

                {/* CALCULO DO IMPOSTO */}
                <div className="border border-black">
                  <div className="bg-slate-100 text-[7px] font-bold px-2 py-0.5 border-b border-black uppercase font-sans">Cálculo do Imposto</div>
                  <div className="grid grid-cols-5 divide-x divide-black text-center text-[8px]">
                    <div className="p-1">
                      <span className="text-[5.5px] text-slate-500 uppercase block font-bold">Base de Cálculo do ICMS</span>
                      <span className="font-mono">R$ 0,00</span>
                    </div>
                    <div className="p-1">
                      <span className="text-[5.5px] text-slate-500 uppercase block font-bold">Valor do ICMS</span>
                      <span className="font-mono">R$ 0,00</span>
                    </div>
                    <div className="p-1">
                      <span className="text-[5.5px] text-slate-500 uppercase block font-bold">Base de Calc. ICMS S.T.</span>
                      <span className="font-mono">R$ 0,00</span>
                    </div>
                    <div className="p-1">
                      <span className="text-[5.5px] text-slate-500 uppercase block font-bold">Valor do ICMS S.T.</span>
                      <span className="font-mono">R$ 0,00</span>
                    </div>
                    <div className="p-1 text-right pr-2">
                      <span className="text-[5.5px] text-slate-500 uppercase block font-bold">V. Total dos Produtos</span>
                      <span className="font-mono font-bold text-slate-900">R$ {danfeData.os.usedParts.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0).toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-5 divide-x divide-black text-center text-[8px] border-t border-black">
                    <div className="p-1">
                      <span className="text-[5.5px] text-slate-500 uppercase block font-bold">Valor do Frete</span>
                      <span className="font-mono">R$ 0,00</span>
                    </div>
                    <div className="p-1">
                      <span className="text-[5.5px] text-slate-500 uppercase block font-bold">Valor do Seguro</span>
                      <span className="font-mono">R$ 0,00</span>
                    </div>
                    <div className="p-1">
                      <span className="text-[5.5px] text-slate-500 uppercase block font-bold">Desconto</span>
                      <span className="font-mono">R$ 0,00</span>
                    </div>
                    <div className="p-1">
                      <span className="text-[5.5px] text-slate-500 uppercase block font-bold">Outras Despesas</span>
                      <span className="font-mono">R$ 0,00</span>
                    </div>
                    <div className="p-1 text-right pr-2">
                      <span className="text-[5.5px] text-slate-500 uppercase block font-bold">VALOR TOTAL DA NOTA</span>
                      <strong className="font-mono text-slate-950 font-bold text-[10px]">R$ {danfeData.os.totalCost.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

                {/* TRANSPORTADOR */}
                <div className="border border-black">
                  <div className="bg-slate-100 text-[7px] font-bold px-2 py-0.5 border-b border-black uppercase font-sans">Transportador / Volumes Transportados</div>
                  <div className="grid grid-cols-12 divide-x divide-black text-left text-[8px]">
                    <div className="col-span-5 p-1">
                      <span className="text-[5.5px] text-slate-500 block uppercase font-bold">Razão Social</span>
                      <span className="font-bold">O MESMO (RETIRADA LOCAL)</span>
                    </div>
                    <div className="col-span-2 p-1">
                      <span className="text-[5.5px] text-slate-500 block uppercase font-bold">Frete por Conta</span>
                      <span>9 - SEM FRETE</span>
                    </div>
                    <div className="col-span-2 p-1">
                      <span className="text-[5.5px] text-slate-500 block uppercase font-bold">Código ANTT</span>
                      <span>--</span>
                    </div>
                    <div className="col-span-2 p-1">
                      <span className="text-[5.5px] text-slate-500 block uppercase font-bold">Placa do Veículo</span>
                      <span>--</span>
                    </div>
                    <div className="col-span-1 p-1 text-center">
                      <span className="text-[5.5px] text-slate-500 block uppercase font-bold">UF</span>
                      <span>SP</span>
                    </div>
                  </div>
                </div>

                {/* ITENS DA NOTA FISCAL */}
                <div className="border border-black">
                  <div className="bg-slate-100 text-[7px] font-bold px-2 py-0.5 border-b border-black uppercase font-sans">Dados dos Produtos / Serviços</div>
                  <table className="w-full text-left text-[8px] font-mono border-collapse divide-y divide-black">
                    <thead className="bg-slate-50 font-bold text-slate-800 text-[7px]">
                      <tr>
                        <th className="p-1">CÓDIGO</th>
                        <th className="p-1">DESCRIÇÃO DOS PRODUTOS / SERVIÇOS</th>
                        <th className="p-1 text-center">NCM</th>
                        <th className="p-1 text-center">CST</th>
                        <th className="p-1 text-center">CFOP</th>
                        <th className="p-1 text-center">UN</th>
                        <th className="p-1 text-center">QTD</th>
                        <th className="p-1 text-right">V. UNIT</th>
                        <th className="p-1 text-right">V. TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/30 text-slate-850">
                      {danfeData.os.usedParts.map((p: any) => (
                        <tr key={p.partId}>
                          <td className="p-1">{p.partId.slice(0, 10).toUpperCase()}</td>
                          <td className="p-1">{p.name.toUpperCase()} (REPOSIÇÃO)</td>
                          <td className="p-1 text-center">84733019</td>
                          <td className="p-1 text-center">0102</td>
                          <td className="p-1 text-center">5949</td>
                          <td className="p-1 text-center">UN</td>
                          <td className="p-1 text-center">{p.quantity}</td>
                          <td className="p-1 text-right">R$ {p.price.toFixed(2)}</td>
                          <td className="p-1 text-right font-bold">R$ {(p.price * p.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td className="p-1">SUP-SERV</td>
                        <td className="p-1">
                          CONSERTO TÉCNICO ESPECIALIZADO: {danfeData.device.type.toUpperCase()} {danfeData.device.brand.toUpperCase()} {danfeData.device.model.toUpperCase()} (SÉRIE: {danfeData.device.serialNumber.toUpperCase()})
                        </td>
                        <td className="p-1 text-center">84713012</td>
                        <td className="p-1 text-center">0000</td>
                        <td className="p-1 text-center">5933</td>
                        <td className="p-1 text-center">UN</td>
                        <td className="p-1 text-center">1</td>
                        <td className="p-1 text-right">R$ {danfeData.os.laborCost.toFixed(2)}</td>
                        <td className="p-1 text-right font-bold">R$ {danfeData.os.laborCost.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* CALCULO DO ISSQN */}
                <div className="border border-black">
                  <div className="bg-slate-100 text-[7px] font-bold px-2 py-0.5 border-b border-black uppercase font-sans">Cálculo do ISSQN</div>
                  <div className="grid grid-cols-4 divide-x divide-black text-center text-[8px]">
                    <div className="p-1 text-left">
                      <span className="text-[5.5px] text-slate-500 uppercase block font-bold">Inscrição Municipal</span>
                      <span className="font-mono font-bold">1291823/001</span>
                    </div>
                    <div className="p-1">
                      <span className="text-[5.5px] text-slate-500 uppercase block font-bold">Valor Total dos Serviços</span>
                      <span className="font-mono">R$ {danfeData.os.laborCost.toFixed(2)}</span>
                    </div>
                    <div className="p-1">
                      <span className="text-[5.5px] text-slate-500 uppercase block font-bold">Base de Cálculo do ISSQN</span>
                      <span className="font-mono">R$ {danfeData.os.laborCost.toFixed(2)}</span>
                    </div>
                    <div className="p-1 text-right pr-2">
                      <span className="text-[5.5px] text-slate-500 uppercase block font-bold">Valor do ISSQN (5%)</span>
                      <span className="font-mono font-bold text-slate-900">R$ {(danfeData.os.laborCost * 0.05).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* DADOS ADICIONAIS */}
                <div className="border border-black">
                  <div className="bg-slate-100 text-[7px] font-bold px-2 py-0.5 border-b border-black uppercase font-sans">Dados Adicionais</div>
                  <div className="p-2 leading-relaxed text-slate-600 text-[7.5px]">
                    <span className="font-bold text-slate-800 block uppercase text-[6.5px]">Informações Complementares:</span>
                    <p>
                      Valores simulados em ambiente de homologação. Documento fiscal demonstrativo sem valor comercial real. 
                      Referente à Ordem de Serviço {danfeData.os.osNumber}. Defeito periciado: "{danfeData.os.reportedDefect}". 
                      Garantia legal de 90 dias conforme artigo 26, inciso II, do Código de Defesa do Consumidor. 
                      Dispositivo em custódia: {danfeData.device.brand} {danfeData.device.model} (Série: {danfeData.device.serialNumber}).
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
