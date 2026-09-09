/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Client, Device, OrdemServico, Part, User, UserRole } from "../types";
import BlingConnectionStatus from "./BlingConnectionStatus";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";
import { 
  TrendingUp, 
  Users, 
  FileText, 
  AlertTriangle, 
  DollarSign, 
  Clock, 
  Plus, 
  Printer, 
  Zap, 
  Activity, 
  Layers, 
  CheckCircle2, 
  MessageSquare,
  ShieldCheck,
  Boxes
} from "lucide-react";

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

  // Safe Fallback Calculations (Client-Side)
  const safeOS = Array.isArray(ordensServico) ? ordensServico : [];
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeParts = Array.isArray(parts) ? parts : [];

  const localActiveOSCount = safeOS.filter(o => o.status !== "FINALIZADO").length;
  const totalClientsCount = safeClients.length;
  const criticalPartsCount = safeParts.filter(p => p.stock <= 3).length;

  // Local SLA critical calculation (OS > 15 days in progress)
  const getLocalSlaCriticalCount = () => {
    const now = new Date().getTime();
    return safeOS.filter(os => {
      if (os.status === "FINALIZADO") return false;
      const created = new Date(os.createdAt).getTime();
      const diffDays = (now - created) / (1000 * 3600 * 24);
      return diffDays > 15;
    }).length;
  };
  const localSlaCriticalCount = getLocalSlaCriticalCount();

  // Local TMA calculation (Tempo Médio de Atendimento)
  const getLocalTmaDays = () => {
    const finalized = safeOS.filter(os => os.status === "FINALIZADO" && (os.originalExitDate || os.createdAt));
    if (finalized.length === 0) return 0;
    let totalDays = 0;
    finalized.forEach(os => {
      const created = new Date(os.createdAt).getTime();
      const completed = new Date(os.originalExitDate || os.createdAt).getTime();
      const diff = Math.max(0, (completed - created) / (1000 * 3600 * 24));
      totalDays += diff;
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
    <div className="space-y-8 select-none animate-fadein">
      {/* Welcome Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-600 border border-cyan-500/20">
              <Zap className="w-4 h-4 fill-cyan-500 text-cyan-500" />
            </span>
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
              Painel Técnico Operacional
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {criticalPartsCount > 0 
              ? `Atenção: existem ${criticalPartsCount} itens com estoque crítico no almoxarifado.` 
              : "Visão 360° da assistência técnica em tempo real."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <BlingConnectionStatus />
          <button 
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-sm"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Imprimir Resumo</span>
          </button>
          <button 
            onClick={() => setCurrentTab("os-create")}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-black text-xs rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nova Ordem</span>
          </button>
        </div>
      </section>

      {/* Metrics Bento Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1 - OS Ativas */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all group flex flex-col justify-between min-h-[145px]">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200 shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full font-mono">
              Operacional
            </span>
          </div>
          <div className="mt-3">
            <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">O.S. em Andamento</p>
            <h3 className="font-display font-black text-2xl text-slate-900 leading-none mt-1">{activeOSCount}</h3>
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-3 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-cyan-500 h-full rounded-full" style={{ width: "65%" }}></div>
          </div>
        </div>

        {/* Metric 2 - Clientes Totais */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all group flex flex-col justify-between min-h-[145px]">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl group-hover:bg-cyan-600 group-hover:text-white transition-colors duration-200 shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-100 px-2.5 py-0.5 rounded-full font-mono">
              Base Ativa
            </span>
          </div>
          <div className="mt-3">
            <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Clientes Cadastrados</p>
            <h3 className="font-display font-black text-2xl text-slate-900 leading-none mt-1">{totalClientsCount}</h3>
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-3 rounded-full overflow-hidden">
            <div className="bg-cyan-500 h-full rounded-full" style={{ width: "40%" }}></div>
          </div>
        </div>

        {/* Metric 3 - Condicional baseada no perfil */}
        {user.role === UserRole.OWNER || user.role === UserRole.FINANCIAL ? (
          <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all group flex flex-col justify-between min-h-[145px]">
            <div className="flex justify-between items-start">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors duration-200 shadow-sm">
                <Boxes className="w-5 h-5" />
              </div>
              {pendingBillingCount > 0 ? (
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full animate-pulse font-mono">
                  {pendingBillingCount} pendentes
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full font-mono">
                  Faturamento em Dia
                </span>
              )}
            </div>
            <div className="mt-3">
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Faturamento Pendente (Bling)</p>
              <h3 className="font-display font-black text-2xl text-slate-900 leading-none mt-1">{pendingBillingCount} OS</h3>
            </div>
            <div className="w-full bg-slate-100 h-1.5 mt-3 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${pendingBillingCount > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: pendingBillingCount > 0 ? "80%" : "10%" }}></div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all group flex flex-col justify-between min-h-[145px]">
            <div className="flex justify-between items-start">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors duration-200 shadow-sm">
                <AlertTriangle className="w-5 h-5" />
              </div>
              {slaCriticalCount > 0 ? (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-full font-mono">
                  {slaCriticalCount} atrasadas
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full font-mono">
                  SLA Estável
                </span>
              )}
            </div>
            <div className="mt-3">
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">OS SLA Crítico (+15d)</p>
              <h3 className="font-display font-black text-2xl text-slate-900 leading-none mt-1">{slaCriticalCount} OS</h3>
            </div>
            <div className="w-full bg-slate-100 h-1.5 mt-3 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${slaCriticalCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: slaCriticalCount > 0 ? "75%" : "10%" }}></div>
            </div>
          </div>
        )}

        {/* Metric 4 - Financeiro Executivo / TMA */}
        {user.role === UserRole.OWNER || user.role === UserRole.FINANCIAL ? (
          <div className="bg-gradient-to-br from-[#090D18] via-slate-900 to-indigo-950 border border-slate-800 p-5 rounded-2xl shadow-md text-white relative overflow-hidden flex flex-col justify-between min-h-[145px]">
            <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-cyan-500/20 rounded-full blur-xl pointer-events-none"></div>
            <div className="flex justify-between items-start z-10">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 shadow-sm">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-mono uppercase tracking-widest">
                Mensal Real
              </span>
            </div>
            <div className="mt-3 z-10">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Receita Operacional Bruta</p>
              <h3 className="font-display font-black text-2xl text-emerald-400 leading-none">
                R$ {receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono">
                <span className="text-slate-400">Custo: R$ {custoPecas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span className="text-emerald-300 font-bold bg-slate-800/80 px-2 py-0.5 rounded">
                  Lucro: R$ {lucroBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-[#090D18] via-slate-900 to-indigo-950 border border-slate-800 p-5 rounded-2xl shadow-md text-white relative overflow-hidden flex flex-col justify-between min-h-[145px]">
            <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-indigo-500/20 rounded-full blur-xl pointer-events-none"></div>
            <div className="flex justify-between items-start z-10">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400 shadow-sm">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-mono uppercase tracking-widest">
                Eficiência SLA
              </span>
            </div>
            <div className="mt-3 z-10">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tempo Médio de Atendimento</p>
              <h3 className="font-display font-black text-3xl text-indigo-400 leading-none mt-1">
                {tmaDays} <span className="text-xs font-normal text-slate-300">dias</span>
              </h3>
              <p className="text-[9.5px] text-slate-400 mt-1 font-mono">Meta corporativa: &lt; 3.0 dias</p>
            </div>
          </div>
        )}
      </section>

      {/* Main Dashboard Layout (Funil de Processos & Atividades) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funil de Processos Operacionais */}
        <section className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl shadow-sm flex flex-col p-6">
          <div className="border-b border-slate-100 pb-4 mb-5 flex justify-between items-center">
            <div>
              <h4 className="font-display font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                Funil de Processos Operacionais
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Distribuição atual das OS no fluxo técnico</p>
            </div>
            <span className="p-1.5 bg-slate-100 text-slate-500 rounded-xl">
              <Layers className="w-4 h-4" />
            </span>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {[
              { label: "1. Aguardando Avaliação", key: "AGUARDANDO_AVALIACAO", color: "bg-slate-400" },
              { label: "2. Aguardando Autorização", key: "AGUARDANDO_AUTORIZACAO", color: "bg-blue-500" },
              { label: "3. Aguardando Peças", key: "AGUARDANDO_PECA", color: "bg-rose-500" },
              { label: "4. Em Manutenção / Execução", key: "EM_MANUTENCAO", color: "bg-indigo-600" },
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
        <section className="bg-white border border-slate-200/80 rounded-3xl shadow-sm flex flex-col p-6">
          <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
            <h4 className="font-display font-extrabold text-sm text-slate-900 uppercase tracking-wider">
              Atividades Recentes
            </h4>
            <span className="p-1.5 bg-slate-100 text-slate-500 rounded-xl">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[320px] scrollbar-thin pr-1">
            {activities.map((act, idx) => {
              const borderCol = 
                act.type === "success" ? "bg-emerald-500 text-white" :
                act.type === "warning" ? "bg-rose-500 text-white" :
                act.type === "info" ? "bg-indigo-500 text-white" : "bg-slate-400 text-white";

              return (
                <div key={idx} className="flex gap-3 relative">
                  {idx !== activities.length - 1 && (
                    <div className="absolute left-[11px] top-6 bottom-[-16px] w-[1.5px] bg-slate-100"></div>
                  )}
                  <div className={`z-10 w-6 h-6 rounded-full ${borderCol} flex items-center justify-center border-2 border-white shadow-sm shrink-0 mt-0.5`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="flex justify-between items-start mb-0.5">
                      <p className="font-bold text-slate-800 text-[11px] leading-tight">{act.title}</p>
                      <span className="text-[9px] font-semibold text-slate-400 font-mono whitespace-nowrap">{act.time}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">{act.desc}</p>
                    {act.operator && (
                      <div className="mt-1 inline-flex items-center px-2 py-0.5 bg-slate-100 rounded-md text-[9px] font-semibold text-slate-600">
                        <span>{act.operator}</span>
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
        <section className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl shadow-sm p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="font-display font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                Carga Técnica por Equipamento
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Volume de ordens ativas distribuídas por tipo de aparelho</p>
            </div>
            <span className="text-[10px] font-mono font-bold text-cyan-700 bg-cyan-50 border border-cyan-100 px-2.5 py-1 rounded-xl">
              Tempo Real
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
                    <div className="w-full bg-slate-50 rounded-t-xl relative group h-32 flex items-end overflow-hidden border border-slate-100">
                      <div 
                        className="w-full bg-gradient-to-t from-slate-900 to-indigo-600 group-hover:from-indigo-600 group-hover:to-cyan-400 transition-all duration-300 rounded-t-lg relative" 
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
        <section className="bg-white border border-slate-200/80 rounded-3xl shadow-sm p-6 flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
            <h4 className="font-display font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-500 text-[18px]">build_circle</span>
              <span>Gargalos de Peças</span>
            </h4>
            <span className="text-[9.5px] font-mono font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
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
                  <div key={os.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:border-slate-300 hover:bg-slate-100/60 transition cursor-pointer" onClick={() => setCurrentTab("os")}>
                    <div className="flex justify-between items-start font-bold">
                      <span className="text-slate-800 text-[11px]">#{os.osNumber} - {clientName}</span>
                      <span className="text-[9px] text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md font-semibold">Peça Pendente</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold truncate mt-0.5">{deviceName}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {os.usedParts && os.usedParts.slice(0, 2).map((p, idx) => (
                        <span key={idx} className="text-[8px] px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded font-mono truncate max-w-[110px]">
                          {p.name}
                        </span>
                      ))}
                      {os.usedParts && os.usedParts.length > 2 && (
                        <span className="text-[8px] px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded font-mono">
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
        <section className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl shadow-sm p-6 flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
            <div>
              <h4 className="font-display font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                <span>Notificações Automáticas WhatsApp</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Status das mensagens automáticas disparadas pelo motor OS Flow</p>
            </div>
            <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
              Conectado
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-2 flex-1 items-center">
            {/* Pie Chart Representation */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-24 h-24 rounded-full border-4 border-emerald-100 flex items-center justify-center bg-emerald-50/50 shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3">Envios Totais</span>
              <h4 className="font-display font-black text-xl text-slate-900 leading-none mt-1">
                {whatsappSummary.sent + whatsappSummary.failed}
              </h4>
            </div>

            {/* Stats list */}
            <div className="sm:col-span-2 space-y-4">
              {/* Sent Status */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700 flex items-center gap-1.5">
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
                  <span className="text-slate-700 flex items-center gap-1.5">
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
        <section className="bg-white border border-slate-200/80 rounded-3xl shadow-sm p-6 flex flex-col">
          <h4 className="font-display font-extrabold text-sm text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-cyan-600 stroke-[3]" />
            <span>Cadastrar Peça Rápida</span>
          </h4>

          {errorMsg && (
            <div className="mt-3 bg-rose-50 text-rose-800 p-2.5 rounded-xl text-[11px] font-bold border border-rose-100">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleCreatePart} className="mt-4 space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-500 mb-1 font-bold uppercase tracking-wider text-[9px]">Nome do Componente *</label>
              <input
                type="text"
                required
                placeholder="Ex: Teclado Mecânico ABNT2"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                className="w-full bg-slate-50 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-cyan-500 focus:outline-none transition font-semibold text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-500 mb-1 font-bold uppercase tracking-wider text-[9px]">Código *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: TEC-001"
                  value={partCode}
                  onChange={(e) => setPartCode(e.target.value)}
                  className="w-full bg-slate-50 px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:border-cyan-500 focus:outline-none uppercase"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-bold uppercase tracking-wider text-[9px]">Estoque *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={partStock}
                  onChange={(e) => setPartStock(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-50 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-cyan-500 focus:outline-none"
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
                  className="w-full bg-slate-50 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-cyan-500 focus:outline-none font-mono"
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
                  className="w-full bg-slate-50 px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 font-extrabold focus:bg-white focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-all uppercase tracking-wider shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98] mt-2"
            >
              {loading ? "Registrando..." : "Cadastrar Peça"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
