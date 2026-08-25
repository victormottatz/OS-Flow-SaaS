/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Client, Device, OrdemServico, Part, User, UserRole } from "../types";
import BlingConnectionStatus from "./BlingConnectionStatus";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";

interface DashboardViewProps {
  user: User;
  clients: Client[];
  devices: Device[];
  ordensServico: OrdemServico[];
  parts: Part[];
  isOffline: boolean;
  onRefresh: () => void;
  setCurrentTab: (tab: string) => void;
}

export default function DashboardView({
  user,
  clients,
  devices,
  ordensServico,
  parts,
  isOffline,
  onRefresh,
  setCurrentTab
}: DashboardViewProps) {
  // New Part State Form
  const [partName, setPartName] = useState("");
  const [partCode, setPartCode] = useState("");
  const [partStock, setPartStock] = useState(10);
  const [partCost, setPartCost] = useState(0);
  const [partPrice, setPartPrice] = useState(0);

  // Guarda de alterações não salvas (formulário rápido de peça)
  const partFormDirty = partName.trim() !== "" || partCode.trim() !== "" || partStock !== 10 || partCost !== 0 || partPrice > 0;
  useUnsavedChangesGuard(partFormDirty);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (isOffline) {
      setErrorMsg("O sistema está offline. Operações bloqueadas.");
      return;
    }

    if (!partName || !partCode || partStock === undefined || partPrice <= 0) {
      setErrorMsg("Por favor, preencha todos os campos obrigatórios da peça de reposição.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: partName,
          code: partCode,
          stock: partStock,
          cost: partCost,
          price: partPrice
        })
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || "Erro ao salvar peça.");
      }

      setPartName("");
      setPartCode("");
      setPartStock(10);
      setPartCost(0);
      setPartPrice(0);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Não foi possível inserir peça.");
    } finally {
      setLoading(false);
    }
  };

  // Backend metrics states
  const [serverOperational, setServerOperational] = useState<any>(null);
  const [serverExecutive, setServerExecutive] = useState<any>(null);

  useEffect(() => {
    if (isOffline) return;

    const token = localStorage.getItem("mgv_token");
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};

    // Fetch operational metrics (accessible to everyone)
    fetch("/api/dashboards/operational", { headers })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data) setServerOperational(data);
      })
      .catch(err => console.error("Erro ao buscar métricas operacionais:", err));

    // Fetch executive metrics (OWNER/FINANCIAL only)
    if (user.role === UserRole.OWNER || user.role === UserRole.FINANCIAL) {
      fetch("/api/dashboards/executive", { headers })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data) setServerExecutive(data);
        })
        .catch(err => console.error("Erro ao buscar métricas executivas:", err));
    }
  }, [isOffline, user.role]);

  // Safe Arrays Guards
  const safeOS = Array.isArray(ordensServico) ? ordensServico : [];
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeParts = Array.isArray(parts) ? parts : [];

  // Metrics Calculations (supporting fallback / offline mode)
  const totalClientsCount = serverOperational && serverOperational.totalClientsCount !== undefined
    ? serverOperational.totalClientsCount
    : safeClients.length;
  const localActiveOSCount = safeOS.filter(o => o.status !== "FINALIZADO").length;
  const criticalPartsCount = serverOperational && serverOperational.criticalStockParts
    ? serverOperational.criticalStockParts.length
    : safeParts.filter(p => p.stock <= (p.stockMin || 0)).length;

  const localSlaCriticalCount = safeOS.filter(o => {
    if (o.status === "FINALIZADO") return false;
    const diff = new Date().getTime() - new Date(o.createdAt).getTime();
    return diff / (1000 * 60 * 60 * 24) > 15; // 15 dias limite
  }).length;

  const getLocalTmaDays = () => {
    const finalized = safeOS.filter(o => o.status === "FINALIZADO");
    if (finalized.length === 0) return 0;
    let totalDays = 0;
    finalized.forEach(o => {
      const start = new Date(o.createdAt);
      const end = o.originalExitDate ? new Date(o.originalExitDate) : null;
      totalDays += end ? Math.max(0.5, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) : 2.5; // 2.5d fallback
    });
    return Number((totalDays / finalized.length).toFixed(1));
  };
  const localTmaDays = getLocalTmaDays();

  // Local Monthly report calculation
  const getMonthlyReport = () => {
    let receitaTotal = 0;
    let custoPecas = 0;
    safeOS.forEach(os => {
      if (os.status === "FINALIZADO") {
        receitaTotal += os.totalCost || 0;
        if (os.usedParts) {
          os.usedParts.forEach(usedPart => {
            const partInfo = parts.find(p => p.id === usedPart.partId);
            const unitCost = usedPart.costSnapshot !== undefined && usedPart.costSnapshot !== null
              ? usedPart.costSnapshot
              : (partInfo?.cost || usedPart.price * 0.5);
            custoPecas += (unitCost * usedPart.quantity);
          });
        }
      }
    });
    return { receitaTotal, custoPecas, lucroBruto: receitaTotal - custoPecas };
  };
  const localFinancials = getMonthlyReport();

  // Unified metrics that prefer server-side calculations but fall back gracefully
  const activeOSCount = serverOperational ? serverOperational.totalActiveOS : localActiveOSCount;
  const slaCriticalCount = serverOperational ? serverOperational.slaCriticalCount : localSlaCriticalCount;
  const tmaDays = serverOperational ? serverOperational.tmaDays : localTmaDays;
  const whatsappSummary = serverOperational ? serverOperational.whatsappSummary : { sent: 0, failed: 0 };

  const receitaTotal = serverExecutive ? serverExecutive.revenue : localFinancials.receitaTotal;
  const custoPecas = serverExecutive ? serverExecutive.partsCost : localFinancials.custoPecas;
  const lucroBruto = serverExecutive ? serverExecutive.profit : localFinancials.lucroBruto;

  const pendingBillingCount = serverOperational && serverOperational.pendingBillingCount !== undefined
    ? serverOperational.pendingBillingCount
    : safeOS.filter(o => o.status === "FINALIZADO" && o.billingStatus === "PENDENTE").length;

  // Kanban Funnel distribution
  const getFunnelDistribution = () => {
    const counts: Record<string, number> = {
      AGUARDANDO_AVALIACAO: 0,
      AGUARDANDO_AUTORIZACAO: 0,
      AGUARDANDO_PECA: 0,
      EM_MANUTENCAO: 0,
      PRONTO_RETIRADA: 0,
      PAGO_PRONTO_RETIRADA: 0,
      FINALIZADO: 0
    };
    safeOS.forEach(o => {
      if (counts[o.status] !== undefined) {
        counts[o.status]++;
      }
    });
    return counts;
  };
  const funnelCounts = serverOperational?.kanbanDistribution || getFunnelDistribution();
  const totalActiveFunnel = Object.entries(funnelCounts)
    .filter(([status]) => status !== "FINALIZADO" && status !== "PAGO_PRONTO_RETIRADA")
    .reduce((sum, [_, val]) => sum + (val as number), 0) || 1;

  // OS paradas aguardando peças
  const waitingPartsOS = safeOS
    .filter(o => o.status === "AGUARDANDO_PECA")
    .slice(0, 5); // top 5

  // Carga de trabalho dinâmica por categoria de aparelho
  const getCargaEquipamento = () => {
    const counts: Record<string, number> = {};
    safeOS.filter(o => o.status !== "FINALIZADO").forEach(o => {
      const type = o.device?.type || "Outros";
      counts[type] = (counts[type] || 0) + 1;
    });
    const items = Object.entries(counts).map(([name, val]) => ({ name, val }));
    items.sort((a, b) => b.val - a.val);
    return items.slice(0, 7); // top 7
  };
  const cargaEquipamento = getCargaEquipamento();
  const maxCarga = cargaEquipamento.length > 0 ? Math.max(...cargaEquipamento.map(c => c.val)) : 1;

  // Timeline activities
  const getRecentActivities = () => {
    const list: { type: "success" | "warning" | "info" | "neutral"; title: string; desc: string; time: string; operator?: string }[] = [];

    // Critical parts alert
    safeParts.filter(p => p.stock <= 3).slice(0, 2).forEach(p => {
      list.push({
        type: "warning",
        title: "Alerta de Estoque Crítico",
        desc: `O item "${p.name}" atingiu o nível de segurança crítico (${p.stock} un).`,
        time: "Almoxarifado"
      });
    });

    // Completed OS
    safeOS.filter(o => o.status === "FINALIZADO").slice(0, 2).forEach(o => {
      const client = safeClients.find(c => c.id === o.clientId);
      const clientName = client ? client.name : "Cliente";
      list.push({
        type: "success",
        title: `O.S. #${o.osNumber} Finalizada`,
        desc: `Conserto concluído no cliente ${clientName}.`,
        time: "Recentemente",
        operator: o.stressTestStartedBy || "Técnico"
      });
    });

    // Active OS
    safeOS.filter(o => ["AGUARDANDO_AVALIACAO", "AGUARDANDO_AUTORIZACAO", "EM_MANUTENCAO"].includes(o.status)).slice(0, 2).forEach(o => {
      const device = (Array.isArray(devices) ? devices : []).find(d => d.id === o.deviceId);
      const deviceName = device ? `${device.brand} ${device.model}` : "Equipamento";
      list.push({
        type: "info",
        title: `O.S. #${o.osNumber} em Andamento`,
        desc: `Aparelho "${deviceName}" sob diagnóstico/reparo.`,
        time: "Em bancada"
      });
    });

    if (list.length === 0) {
      list.push({
        type: "neutral",
        title: "Sincronização ativa",
        desc: "Banco de dados e buffers fiscais em perfeito estado operacional.",
        time: "Hoje"
      });
    }

    return list.slice(0, 4);
  };
  const activities = getRecentActivities();

  return (
    <div className="space-y-8 select-none anim-fadein">
      {/* Welcome Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-900 mb-1">Painel Técnico Operacional</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-semibold">
            {criticalPartsCount > 0 
              ? `Atenção: existem ${criticalPartsCount} itens com estoque crítico no almoxarifado local.` 
              : "Seu painel técnico operacional está atualizado e estável."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <BlingConnectionStatus />
          <button 
            onClick={() => window.print()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 bg-white text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Imprimir Resumo</span>
          </button>
          <button 
            onClick={() => setCurrentTab("os")}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-secondary-container text-primary-container font-bold text-xs rounded-xl hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            <span>Nova Ordem</span>
          </button>
        </div>
      </section>

      {/* Metrics Bento Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-slate-400 transition group flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-slate-100 rounded-xl text-slate-900 group-hover:bg-primary-container group-hover:text-white transition">
              <span className="material-symbols-outlined text-[20px]">assignment</span>
            </div>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">Painel Geral</span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">O.S. Ativas</p>
            <h3 className="font-display font-extrabold text-2xl text-slate-900 leading-none mt-1">{activeOSCount}</h3>
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
            <div className="bg-primary-container h-full rounded-full" style={{ width: "65%" }}></div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-slate-400 transition group flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-slate-100 rounded-xl text-slate-900 group-hover:bg-primary-container group-hover:text-white transition">
              <span className="material-symbols-outlined text-[20px]">group</span>
            </div>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">Clientes Cadastrados</span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Clientes Totais</p>
            <h3 className="font-display font-extrabold text-2xl text-slate-900 leading-none mt-1">{totalClientsCount}</h3>
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
            <div className="bg-secondary-container h-full rounded-full" style={{ width: "40%" }}></div>
          </div>
        </div>

        {/* Metric 3 - Condicional baseada no perfil */}
        {user.role === UserRole.OWNER || user.role === UserRole.FINANCIAL ? (
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-slate-400 transition group flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start">
              <div className="p-2.5 bg-slate-100 rounded-xl text-slate-900 group-hover:bg-primary-container group-hover:text-white transition">
                <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              </div>
              {pendingBillingCount > 0 ? (
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full animate-pulse">{pendingBillingCount} pendentes</span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">Faturamento em Dia</span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Faturamento Pendente (Bling)</p>
              <h3 className="font-display font-extrabold text-2xl text-slate-900 leading-none mt-1">{pendingBillingCount} OS</h3>
            </div>
            <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${pendingBillingCount > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: pendingBillingCount > 0 ? "80%" : "10%" }}></div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-slate-400 transition group flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start">
              <div className="p-2.5 bg-slate-100 rounded-xl text-slate-900 group-hover:bg-primary-container group-hover:text-white transition">
                <span className="material-symbols-outlined text-[20px]">warning</span>
              </div>
              {slaCriticalCount > 0 ? (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">{slaCriticalCount} atrasadas</span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">SLA Estável</span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">OS SLA Crítico (+15d)</p>
              <h3 className="font-display font-extrabold text-2xl text-slate-900 leading-none mt-1">{slaCriticalCount} OS</h3>
            </div>
            <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${slaCriticalCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: slaCriticalCount > 0 ? "75%" : "10%" }}></div>
            </div>
          </div>
        )}

        {/* Metric 4 - Condicional baseada no perfil */}
        {user.role === UserRole.OWNER || user.role === UserRole.FINANCIAL ? (
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-slate-800 p-5 rounded-2xl shadow-premium hover:shadow-lg transition group flex flex-col justify-between min-h-[140px] text-white relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500 opacity-10 rounded-full blur-2xl"></div>
            <div className="flex justify-between items-start z-10">
              <div className="p-2.5 bg-slate-800/80 rounded-xl text-emerald-400 group-hover:scale-110 transition duration-300">
                <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
              </div>
              <span className="text-[9px] font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full font-mono uppercase tracking-widest">
                Mensal Real
              </span>
            </div>
            <div className="mt-4 z-10 flex flex-col space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Receita Operacional Bruta</p>
              <h3 className="font-display font-extrabold text-2xl text-emerald-400 leading-none">
                R$ {receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono">
                <span className="text-rose-400">Custo: R$ {custoPecas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span className="text-white font-bold bg-slate-800 px-2 rounded-sm py-0.5">Lucro: R$ {lucroBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-2xl shadow-premium hover:shadow-lg transition group flex flex-col justify-between min-h-[140px] text-white relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500 opacity-10 rounded-full blur-2xl"></div>
            <div className="flex justify-between items-start z-10">
              <div className="p-2.5 bg-slate-800/80 rounded-xl text-indigo-400 group-hover:scale-110 transition duration-300">
                <span className="material-symbols-outlined text-[20px]">speed</span>
              </div>
              <span className="text-[9px] font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full font-mono uppercase tracking-widest">
                Eficiência SLA
              </span>
            </div>
            <div className="mt-4 z-10 flex flex-col">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tempo Médio de Atendimento</p>
              <h3 className="font-display font-extrabold text-3xl text-indigo-400 leading-none mt-1">
                {tmaDays} <span className="text-xs font-normal text-slate-300">dias</span>
              </h3>
              <p className="text-[9px] text-slate-450 mt-1 font-mono">Meta corporativa: &lt; 3.0 dias</p>
            </div>
          </div>
        )}
      </section>

      {/* Main Dashboard Layout (Funil de Processos & Atividades) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funil de Processos Operacionais */}
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col p-6">
          <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
            <div>
              <h4 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">Funil de Processos Operacionais</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Distribuição atual do fluxo Kanban técnico</p>
            </div>
            <span className="material-symbols-outlined text-slate-400">filter_alt</span>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {[
              { label: "1. Aguardando Avaliação", key: "AGUARDANDO_AVALIACAO", color: "bg-slate-400" },
              { label: "2. Aguardando Autorização", key: "AGUARDANDO_AUTORIZACAO", color: "bg-blue-500" },
              { label: "3. Aguardando Peças", key: "AGUARDANDO_PECA", color: "bg-rose-500" },
              { label: "4. Em Manutenção / Execução", key: "EM_MANUTENCAO", color: "bg-indigo-500" },
              { label: "5. Pronto para Retirada", key: "PRONTO_RETIRADA", color: "bg-emerald-500" },
              { label: "6. Pago & Retirada Pendente", key: "PAGO_PRONTO_RETIRADA", color: "bg-teal-500" }
            ].map(item => {
              const count = funnelCounts[item.key] || 0;
              const pct = totalActiveFunnel > 0 ? (count / totalActiveFunnel) * 100 : 0;
              return (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{item.label}</span>
                    <span className="font-mono font-bold text-slate-900">{count} OS ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${item.color}`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Atividades Recentes */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h4 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">Atividades Recentes</h4>
            <span className="material-symbols-outlined text-[18px] text-slate-400">history</span>
          </div>
          <div className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[320px] scrollbar-thin">
            {activities.map((act, idx) => {
              const borderCol = 
                act.type === "success" ? "bg-emerald-500" :
                act.type === "warning" ? "bg-rose-500" :
                act.type === "info" ? "bg-indigo-500" : "bg-slate-400";
              
              const iconName = 
                act.type === "success" ? "check" :
                act.type === "warning" ? "priority_high" :
                act.type === "info" ? "bolt" : "sync";

              return (
                <div key={idx} className="flex gap-3 relative">
                  {idx !== activities.length - 1 && (
                    <div className="absolute left-[9px] top-6 bottom-[-20px] w-[1.5px] bg-slate-100"></div>
                  )}
                  <div className={`z-10 w-5 h-5 rounded-full ${borderCol} flex items-center justify-center border-2 border-white shadow-sm shrink-0`}>
                    <span className="material-symbols-outlined text-[10px] text-white font-bold">{iconName}</span>
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="flex justify-between items-start mb-0.5">
                      <p className="font-bold text-slate-800 text-[11px] leading-tight">{act.title}</p>
                      <span className="text-[9px] font-semibold text-slate-400 font-mono whitespace-nowrap">{act.time}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">{act.desc}</p>
                    {act.operator && (
                      <div className="mt-1 inline-flex items-center px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-semibold text-slate-500">
                        <span className="material-symbols-outlined text-[10px] mr-1">person</span>
                        {act.operator}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Bottom Row: Carga Técnica por Equipamento & Gargalos por Falta de Peças */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carga por Categoria de Equipamento */}
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">Carga Técnica por Equipamento</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Volume de Ordens Ativas distribuídas por categoria de aparelho</p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
              Em Tempo Real
            </span>
          </div>

          <div className="flex-1 flex items-end gap-3 sm:gap-6 justify-between pt-4 border-b border-slate-100 pb-2 min-h-[160px]">
            {cargaEquipamento.length === 0 ? (
              <p className="text-center w-full pb-8 text-xs text-slate-400 italic font-mono">Nenhuma ordem de serviço ativa no laboratório.</p>
            ) : (
              cargaEquipamento.map((col, i) => {
                const pct = (col.val / maxCarga) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-slate-50 rounded-t-lg relative group h-32 flex items-end overflow-hidden border border-slate-100">
                      <div 
                        className="w-full bg-slate-800 group-hover:bg-primary-container transition-all duration-300 rounded-t-md relative" 
                        style={{ height: `${pct}%` }}
                      >
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold font-mono text-slate-900 opacity-0 group-hover:opacity-100 transition">
                          {col.val}
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 truncate w-full text-center" title={col.name}>{col.name}</span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Gargalos Críticos: OS Aguardando Peças */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
            <h4 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-500 text-[18px]">build_circle</span>
              <span>Gargalos (Falta de Peças)</span>
            </h4>
            <span className="text-[9px] font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              {safeOS.filter(o => o.status === "AGUARDANDO_PECA").length} OS
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[160px] scrollbar-thin text-xs">
            {waitingPartsOS.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-slate-400 italic py-8">
                Nenhuma OS parada por falta de peças de reposição.
              </div>
            ) : (
              waitingPartsOS.map(os => {
                const client = clients.find(c => c.id === os.clientId);
                const device = devices.find(d => d.id === os.deviceId);
                const clientName = client ? client.name.split(" ")[0] : "Cliente";
                const deviceName = device ? `${device.brand} ${device.model}` : "Aparelho";
                
                return (
                  <div key={os.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-350 hover:bg-slate-100/50 transition cursor-pointer" onClick={() => setCurrentTab("kanban")}>
                    <div className="flex justify-between items-start font-bold">
                      <span className="text-slate-800 text-[11px]">#{os.osNumber} - {clientName}</span>
                      <span className="text-[9px] text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.25 rounded-md">Peça Pendente</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold truncate mt-0.5">{deviceName}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {os.usedParts && os.usedParts.slice(0, 2).map((p, idx) => (
                        <span key={idx} className="text-[8px] px-1 py-0.25 bg-slate-200 text-slate-700 rounded-sm font-mono truncate max-w-[100px]">
                          {p.name}
                        </span>
                      ))}
                      {os.usedParts && os.usedParts.length > 2 && (
                        <span className="text-[8px] px-1 py-0.25 bg-slate-200 text-slate-700 rounded-sm font-mono">
                          +{os.usedParts.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Row 4: Status do WhatsApp & Formulário Rápido de Cadastro de Peças */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resumo do Status do WhatsApp */}
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
            <div>
              <h4 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-500 text-[18px]">chat</span>
                <span>Comunicação WhatsApp</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Status das auto-notificações disparadas aos clientes</p>
            </div>
            <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Ativo
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-2 flex-1 items-center">
            {/* Pie Chart Representation */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-24 h-24 rounded-full border-4 border-emerald-100 flex items-center justify-center bg-emerald-50 shadow-inner">
                <span className="material-symbols-outlined text-emerald-600 text-3xl">done_all</span>
                <div className="absolute inset-0 rounded-full border-4 border-rose-500 border-t-transparent border-r-transparent border-l-transparent" style={{ transform: "rotate(45deg)" }}></div>
              </div>
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider mt-3">Envios Totais</span>
              <h4 className="font-display font-extrabold text-lg text-slate-900 leading-none mt-1">
                {whatsappSummary.sent + whatsappSummary.failed}
              </h4>
            </div>

            {/* Stats list */}
            <div className="sm:col-span-2 space-y-4">
              {/* Sent Status */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-650 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Entregues / Enviados
                  </span>
                  <span className="font-mono text-slate-900 font-bold">{whatsappSummary.sent} msgs ({
                    (whatsappSummary.sent + whatsappSummary.failed) > 0 
                      ? ((whatsappSummary.sent / (whatsappSummary.sent + whatsappSummary.failed)) * 100).toFixed(0)
                      : 100
                  }%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ 
                    width: `${(whatsappSummary.sent + whatsappSummary.failed) > 0 
                      ? (whatsappSummary.sent / (whatsappSummary.sent + whatsappSummary.failed)) * 100
                      : 100}%` 
                  }}></div>
                </div>
              </div>

              {/* Failed Status */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-650 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Falhas de Envio
                  </span>
                  <span className="font-mono text-slate-900 font-bold">{whatsappSummary.failed} msgs ({
                    (whatsappSummary.sent + whatsappSummary.failed) > 0 
                      ? ((whatsappSummary.failed / (whatsappSummary.sent + whatsappSummary.failed)) * 100).toFixed(0)
                      : 0
                  }%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ 
                    width: `${(whatsappSummary.sent + whatsappSummary.failed) > 0 
                      ? (whatsappSummary.failed / (whatsappSummary.sent + whatsappSummary.failed)) * 100
                      : 0}%` 
                  }}></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Add Part Form */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col">
          <h4 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container text-[18px]">add_circle</span>
            <span>Registrar Peça</span>
          </h4>

          {errorMsg && (
            <div className="mt-3 bg-rose-50 text-rose-800 p-2.5 rounded-xl text-[11px] font-bold border border-rose-100">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleCreatePart} className="mt-4 space-y-4 text-xs">
            <div>
              <label className="block text-slate-500 mb-1 font-bold uppercase tracking-wider text-[9px]">Nome do Componente *</label>
              <input
                type="text"
                required
                placeholder="Ex: Filtro de Ar Industrial H13"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                className="w-full bg-white px-3 py-2 border border-slate-250 rounded-xl text-xs focus:border-slate-600 focus:outline-none transition font-semibold text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 mb-1 font-bold uppercase tracking-wider text-[9px]">Código *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: FLT-H13-MGV"
                  value={partCode}
                  onChange={(e) => setPartCode(e.target.value)}
                  className="w-full bg-white px-3 py-2 border border-slate-250 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:border-slate-600 focus:outline-none uppercase"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-bold uppercase tracking-wider text-[9px]">Qtd Estoque *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={partStock}
                  onChange={(e) => setPartStock(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-white px-3 py-2 border border-slate-250 rounded-xl text-xs font-semibold text-slate-800 focus:border-slate-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-bold uppercase tracking-wider text-[9px]">Custo (R$)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={partCost}
                  onChange={(e) => setPartCost(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-white px-3 py-2 border border-slate-250 rounded-xl text-xs font-semibold text-slate-800 focus:border-slate-600 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-bold uppercase tracking-wider text-[9px]">Venda * (R$)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={partPrice}
                  onChange={(e) => setPartPrice(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-white px-3 py-2 border border-slate-250 rounded-xl text-xs text-slate-900 font-extrabold focus:border-slate-600 focus:outline-none font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-container hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-all uppercase tracking-wider shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? "Registrando..." : "Cadastrar Peça"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
