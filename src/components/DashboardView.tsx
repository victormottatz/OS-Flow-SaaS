/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Client, Device, OrdemServico, Part } from "../types";
import BlingConnectionStatus from "./BlingConnectionStatus";

interface DashboardViewProps {
  clients: Client[];
  devices: Device[];
  ordensServico: OrdemServico[];
  parts: Part[];
  isOffline: boolean;
  onRefresh: () => void;
  setCurrentTab: (tab: string) => void;
}

export default function DashboardView({
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

  // Metrics Calculations
  const totalClientsCount = clients.length;
  const activeOSCount = ordensServico.filter(o => o.status !== "FINALIZADO").length;
  const criticalPartsCount = parts.filter(p => p.stock <= 5).length;

  const getMonthlyReport = () => {
    let receitaTotal = 0;
    let custoPecas = 0;

    ordensServico.forEach(os => {
      // Receita considera todas finalizadas
      if (os.status === "FINALIZADO") {
        receitaTotal += os.totalCost || 0;
        
        if (os.usedParts) {
          os.usedParts.forEach(usedPart => {
            const partInfo = parts.find(p => p.id === usedPart.partId);
            if (partInfo) {
              custoPecas += (partInfo.cost * usedPart.quantity);
            }
          });
        }
      }
    });

    return { receitaTotal, custoPecas, lucroBruto: receitaTotal - custoPecas };
  };

  const { receitaTotal, custoPecas, lucroBruto } = getMonthlyReport();

  // Generate dynamic activities for timeline
  const getRecentActivities = () => {
    const list: { type: "success" | "warning" | "info" | "neutral"; title: string; desc: string; time: string; operator?: string; actionText?: string; onAction?: () => void }[] = [];

    // Critical parts alert
    parts.filter(p => p.stock <= 3).slice(0, 2).forEach(p => {
      list.push({
        type: "warning",
        title: "Alerta de Estoque Crítico",
        desc: `O item "${p.name}" atingiu o nível de segurança crítico (${p.stock} un).`,
        time: "Verifique Almoxarifado"
      });
    });

    // Completed OS
    ordensServico.filter(o => o.status === "FINALIZADO").slice(0, 2).forEach(o => {
      const client = clients.find(c => c.id === o.clientId);
      const clientName = client ? client.name : "Cliente";
      list.push({
        type: "success",
        title: `O.S. #${o.id.substring(0, 6)} Finalizada`,
        desc: `Substituição concluída no cliente ${clientName}.`,
        time: "Recentemente",
        operator: "Ricardo Silva"
      });
    });

    // Active OS
    ordensServico.filter(o => o.status === "ORCAMENTO" || o.status === "EM_MANUTENCAO").slice(0, 2).forEach(o => {
      const device = devices.find(d => d.id === o.deviceId);
      const deviceName = device ? `${device.brand} ${device.model}` : "Aparelho";
      list.push({
        type: "info",
        title: `Nova O.S. #${o.id.substring(0, 6)} em Andamento`,
        desc: `Aparelho "${deviceName}" sob manutenção diagnóstica.`,
        time: "Em bancada"
      });
    });

    // Fallback if empty
    if (list.length === 0) {
      list.push({
        type: "neutral",
        title: "Sincronização diária",
        desc: "Sincronização de banco de dados com ERP Bling concluída.",
        time: "Hoje, 04:00"
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
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">+12% vs mês ant.</span>
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

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-slate-400 transition group flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-slate-100 rounded-xl text-slate-900 group-hover:bg-primary-container group-hover:text-white transition">
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            </div>
            {criticalPartsCount > 0 ? (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">{criticalPartsCount} críticos</span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">Estoque Saudável</span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Peças Críticas</p>
            <h3 className="font-display font-extrabold text-2xl text-slate-900 leading-none mt-1">{criticalPartsCount}</h3>
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
            <div className="bg-rose-500 h-full rounded-full" style={{ width: criticalPartsCount > 0 ? "85%" : "10%" }}></div>
          </div>
        </div>

        {/* Metric 4 - Relatório Mensal Financeiro */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-slate-800 p-5 rounded-2xl shadow-premium hover:shadow-lg transition group flex flex-col justify-between min-h-[140px] text-white relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500 opacity-10 rounded-full blur-2xl"></div>
          
          <div className="flex justify-between items-start z-10">
            <div className="p-2.5 bg-slate-800/80 rounded-xl text-emerald-400 group-hover:scale-110 transition duration-300">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
            <span className="text-[9px] font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full font-mono uppercase tracking-widest">
              Relatório Global
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
      </section>

      {/* Main Dashboard Layout (Table of Stock + Recent Activities Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monitor Visual de Estoque */}
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h4 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">Monitor Visual de Estoque</h4>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Crítico
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Alerta
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-55 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Componente / Peça</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Código</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nível de Estoque</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Qtd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {parts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic font-mono">
                      Nenhuma peça de reposição catalogada localmente.
                    </td>
                  </tr>
                ) : (
                  parts.map(part => {
                    const pct = Math.min(100, Math.max(0, (part.stock / 25) * 100));
                    const isCrit = part.stock <= 3;
                    const isWarn = part.stock > 3 && part.stock <= 8;

                    return (
                      <tr key={part.id} className="hover:bg-slate-50 transition duration-150">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-slate-400">build</span>
                            <span className="font-semibold text-slate-800">{part.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500 uppercase">{part.code}</td>
                        <td className="px-6 py-3.5 w-48">
                          <div className="flex items-center gap-2.5">
                            <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  isCrit ? "bg-rose-500" :
                                  isWarn ? "bg-amber-500" : "bg-emerald-500"
                                }`} 
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                            <span className={`text-[10px] font-mono font-bold ${
                              isCrit ? "text-rose-600" :
                              isWarn ? "text-amber-600" : "text-emerald-600"
                            }`}>{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">{part.stock} un</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-55 border-t border-slate-100 text-center">
            <button 
              onClick={() => setCurrentTab("os")}
              className="text-[10px] font-bold text-primary-container hover:underline tracking-wider uppercase cursor-pointer"
            >
              Vincular Peças a uma O.S. Ativa
            </button>
          </div>
        </section>

        {/* Recent Activities Section */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h4 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">Atividades Recentes</h4>
            <span className="material-symbols-outlined text-[18px] text-slate-400">history</span>
          </div>
          <div className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[340px] scrollbar-thin">
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
                  <div className="flex-1 pb-2">
                    <div className="flex justify-between items-start mb-0.5">
                      <p className="font-bold text-slate-800 text-[11px] leading-tight">{act.title}</p>
                      <span className="text-[9px] font-semibold text-slate-400 font-mono whitespace-nowrap">{act.time}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal">{act.desc}</p>
                    {act.operator && (
                      <div className="mt-1.5 inline-flex items-center px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-semibold text-slate-500">
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

      {/* Bottom Row (Technical efficiency graph & Registrar Nova Peça form) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Technical performance & workload bar chart */}
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">Carga Técnica & Distribuição</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Média de eficiência operacional: 94% das metas de SLA atingidas</p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
              Últimos 7 Dias
            </span>
          </div>

          <div className="flex-1 flex items-end gap-3 sm:gap-6 justify-between pt-6 border-b border-slate-100 pb-2">
            {[
              { day: "Seg", val: "60%" },
              { day: "Ter", val: "85%" },
              { day: "Qua", val: "45%" },
              { day: "Qui", val: "95%" },
              { day: "Sex", val: "70%" },
              { day: "Sáb", val: "30%" },
              { day: "Dom", val: "15%" }
            ].map((col, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-slate-55 rounded-t-lg relative group h-28 flex items-end overflow-hidden">
                  <div 
                    className="w-full bg-slate-800 group-hover:bg-secondary-container transition-all duration-300 rounded-t-md" 
                    style={{ height: col.val }}
                  ></div>
                </div>
                <span className="text-[10px] font-bold text-slate-450 font-mono">{col.day}</span>
              </div>
            ))}
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
                  value={partCost}
                  onChange={(e) => setPartCost(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-white px-3 py-2 border border-slate-250 rounded-xl text-xs font-semibold text-slate-800 focus:border-slate-600 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-bold uppercase tracking-wider text-[9px]">Venda * (R$)</label>
                <input
                  type="number"
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
