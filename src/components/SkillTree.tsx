import React, { useState, useEffect } from "react";
import { UserRole } from "../types";
import { useFeatureFlags } from "../contexts/FeatureFlagContext";

interface SkillNode {
  id: string;
  label: string;
  flagKey?: string;
  icon: string;
  description: string;
  x: number;
  y: number;
  dependencies: string[];
  category: "base" | "comunicacao" | "estoque" | "os" | "gerencial" | "automacao" | "ia";
  tier: "S" | "A" | "B" | "C" | "D" | "Lendaria" | "Base";
}

const skillNodes: SkillNode[] = [
  // Linha 0: Base
  {
    id: "base",
    label: "Sistema Base",
    icon: "database",
    description: "Estrutura central do sistema MGV com login, cadastro básico de ordens de serviço, clientes e peças.",
    x: 400,
    y: 40,
    dependencies: [],
    category: "base",
    tier: "Base"
  },
  // Linha 1: Módulos Principais
  {
    id: "comunicacao",
    label: "Módulo Comunicação",
    icon: "chat",
    description: "Canal central de disparos e integrações de mensagens.",
    x: 150,
    y: 150,
    dependencies: ["base"],
    category: "comunicacao",
    tier: "Base"
  },
  {
    id: "estoque",
    label: "Módulo Estoque",
    icon: "inventory_2",
    description: "Organização do inventário de peças e controle de almoxarifado.",
    x: 400,
    y: 150,
    dependencies: ["base"],
    category: "estoque",
    tier: "Base"
  },
  {
    id: "os",
    label: "Módulo Ordens de Serviço",
    icon: "home_repair_service",
    description: "Controle operacional do fluxo de manutenção na oficina.",
    x: 650,
    y: 150,
    dependencies: ["base"],
    category: "os",
    tier: "Base"
  },
  // Linha 2: Habilidades Práticas (Fase 1 / 2)
  {
    id: "whatsapp",
    label: "WhatsApp Automático",
    flagKey: "WHATSAPP_AUTO_MESSAGES",
    icon: "contact_support",
    description: "Envio automático de WhatsApp ao mudar status da OS, orçamento pronto, lembrete de retirada e histórico de envios.",
    x: 150,
    y: 280,
    dependencies: ["comunicacao"],
    category: "comunicacao",
    tier: "S"
  },
  {
    id: "reserva_estoque",
    label: "Reserva & Serialização",
    flagKey: "STOCK_RESERVATION",
    icon: "qr_code_scanner",
    description: "Reserva lógica automática de peças ao iniciar reparos, alertas de estoque mínimo e exigência de número de série para peças caras.",
    x: 400,
    y: 280,
    dependencies: ["estoque"],
    category: "estoque",
    tier: "S"
  },
  {
    id: "checklist",
    label: "Checklist & Fotos",
    flagKey: "MANDATORY_CHECKLIST",
    icon: "fact_check",
    description: "Exigência de preenchimento de checklist de entrada de equipamentos e fotos anexadas para evitar litígios civis.",
    x: 580,
    y: 280,
    dependencies: ["os"],
    category: "os",
    tier: "A"
  },
  {
    id: "stress_test",
    label: "Teste de Carga (Estresse)",
    flagKey: "STRESS_TEST_FLOW",
    icon: "timer",
    description: "Trava operacional no Kanban exigindo teste de estresse contínuo de 30 minutos na bancada antes de finalizar o conserto.",
    x: 720,
    y: 280,
    dependencies: ["os"],
    category: "os",
    tier: "A"
  },
  // Linha 3: Inteligência Gerencial & Extras
  {
    id: "gerencial_root",
    label: "Inteligência Gerencial",
    icon: "trending_up",
    description: "Consolidação de dados operacionais e financeiros da oficina para tomada de decisão.",
    x: 400,
    y: 410,
    dependencies: ["whatsapp", "reserva_estoque"],
    category: "gerencial",
    tier: "Base"
  },
  {
    id: "automacoes",
    label: "Automações & Alertas",
    flagKey: "AUTOMATIONS_AND_ALERTS",
    icon: "smart_toy",
    description: "Criação automática de tarefas secundárias, alertas de ociosidade de OS e agendamento de revisões preventivas.",
    x: 100,
    y: 410,
    dependencies: ["whatsapp", "checklist"],
    category: "automacao",
    tier: "C"
  },
  {
    id: "portal_cliente",
    label: "Portal do Cliente",
    flagKey: "CLIENT_PORTAL",
    icon: "public",
    description: "Página pública de acompanhamento da OS via CPF/CNPJ com timeline, laudo fotográfico e aprovação online de orçamentos.",
    x: 700,
    y: 410,
    dependencies: ["whatsapp", "checklist"],
    category: "comunicacao",
    tier: "B"
  },
  // Linha 4: Habilidades Avançadas (Fase 1 / 2 Avançado)
  {
    id: "profit_calc",
    label: "Lucro por OS",
    flagKey: "OS_PROFITABILITY_CALC",
    icon: "attach_money",
    description: "Cálculo em tempo real do lucro de cada OS baseado em custo médio de peças e valor da hora técnica, exibido no encerramento.",
    x: 220,
    y: 540,
    dependencies: ["gerencial_root"],
    category: "gerencial",
    tier: "S"
  },
  {
    id: "base_instalada",
    label: "Base Instalada 360",
    flagKey: "CLIENT_360_AND_BASE_INSTALADA",
    icon: "devices_other",
    description: "Cadastro vitalício de equipamentos por cliente com alertas de falhas crônicas e histórico de manutenções.",
    x: 340,
    y: 540,
    dependencies: ["gerencial_root"],
    category: "gerencial",
    tier: "A"
  },
  {
    id: "dashboard_financeiro",
    label: "Dashboard Financeiro",
    flagKey: "FINANCIAL_DASHBOARD",
    icon: "dashboard",
    description: "Visão consolidada de receitas, despesas, margens de lucro operacional da oficina e ranking de produtividade de técnicos.",
    x: 460,
    y: 540,
    dependencies: ["gerencial_root"],
    category: "gerencial",
    tier: "S"
  },
  {
    id: "fiscal_bling",
    label: "Emissão Fiscal / Bling",
    flagKey: "FISCAL_NFE_EMISSION",
    icon: "receipt_long",
    description: "Emissão automática de NFe/NFCe na SEFAZ e sincronização bidirecional de clientes/peças com o Bling ERP V3.",
    x: 580,
    y: 540,
    dependencies: ["gerencial_root"],
    category: "gerencial",
    tier: "S"
  },
  // Linha 5: Inteligência Artificial
  {
    id: "ia_diagnostico",
    label: "Inteligência Artificial",
    flagKey: "INTELLIGENCE_ARTIFICIAL_DIAG",
    icon: "psychology",
    description: "Assistente de IA que analisa fotos de defeitos, sugere diagnósticos baseados no histórico e prevê sazonalidade de estoque.",
    x: 400,
    y: 670,
    dependencies: ["gerencial_root"],
    category: "ia",
    tier: "Lendaria"
  }
];

// Mapeamento de conexões (ID Pai -> ID Filho)
const connections: { from: string; to: string }[] = [
  { from: "base", to: "comunicacao" },
  { from: "base", to: "estoque" },
  { from: "base", to: "os" },
  { from: "comunicacao", to: "whatsapp" },
  { from: "estoque", to: "reserva_estoque" },
  { from: "os", to: "checklist" },
  { from: "os", to: "stress_test" },
  { from: "whatsapp", to: "gerencial_root" },
  { from: "reserva_estoque", to: "gerencial_root" },
  { from: "whatsapp", to: "automacoes" },
  { from: "checklist", to: "automacoes" },
  { from: "whatsapp", to: "portal_cliente" },
  { from: "checklist", to: "portal_cliente" },
  { from: "gerencial_root", to: "profit_calc" },
  { from: "gerencial_root", to: "base_instalada" },
  { from: "gerencial_root", to: "dashboard_financeiro" },
  { from: "gerencial_root", to: "fiscal_bling" },
  { from: "gerencial_root", to: "ia_diagnostico" }
];

export default function SkillTree({ userRole }: { userRole: UserRole }) {
  const { flags, refreshFlags, isFeatureEnabled } = useFeatureFlags();
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  // Calcula o status de ativação do nó
  const isNodeActive = (node: SkillNode): boolean => {
    if (!node.flagKey) return true; // Nós estruturais estruturais do sistema base sempre ativos
    return !!flags[node.flagKey];
  };

  // Verifica se o nó tem os requisitos ativados
  const areDependenciesMet = (node: SkillNode): boolean => {
    return node.dependencies.every(depId => {
      const depNode = skillNodes.find(n => n.id === depId);
      if (!depNode) return false;
      return isNodeActive(depNode);
    });
  };

  const handleToggleFlag = async (node: SkillNode) => {
    if (!node.flagKey) return;
    if (userRole !== UserRole.OWNER) return;
    
    // Verifica dependências ao tentar ativar
    const isActive = isNodeActive(node);
    if (!isActive && !areDependenciesMet(node)) {
      alert("Habilidade bloqueada! Desbloqueie primeiro as habilidades pré-requisito.");
      return;
    }

    setIsToggling(true);
    try {
      const token = localStorage.getItem("mgv_token");
      const res = await fetch("/api/feature-flags/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          key: node.flagKey,
          value: !isActive,
          description: node.description
        })
      });

      if (res.ok) {
        await refreshFlags();
        // Atualiza o nó selecionado para refletir o novo valor na UI
        setSelectedNode(prev => prev && prev.id === node.id ? { ...prev } : prev);
      }
    } catch (err) {
      console.error("Erro ao alterar habilidade da árvore:", err);
    } finally {
      setIsToggling(false);
    }
  };

  // Classe utilitária de cores baseada em categorias
  const getCategoryColor = (category: string, active: boolean, locked: boolean) => {
    if (locked) return "border-slate-800 text-slate-600 bg-slate-950/60 shadow-none";
    
    const activeColor = {
      base: "border-sky-500 text-sky-400 bg-sky-950/40 shadow-[0_0_15px_rgba(14,165,233,0.3)]",
      comunicacao: "border-emerald-500 text-emerald-400 bg-emerald-950/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]",
      estoque: "border-amber-500 text-amber-400 bg-amber-950/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]",
      os: "border-indigo-500 text-indigo-400 bg-indigo-950/40 shadow-[0_0_15px_rgba(99,102,241,0.3)]",
      gerencial: "border-rose-500 text-rose-400 bg-rose-950/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]",
      automacao: "border-fuchsia-500 text-fuchsia-400 bg-fuchsia-950/40 shadow-[0_0_15px_rgba(217,70,239,0.3)]",
      ia: "border-purple-500 text-purple-400 bg-purple-950/40 shadow-[0_0_20px_rgba(168,85,247,0.5)] animate-pulse"
    }[category];

    const inactiveColor = {
      base: "border-sky-900 text-sky-600 bg-slate-900/60 hover:border-sky-700",
      comunicacao: "border-emerald-900 text-emerald-600 bg-slate-900/60 hover:border-emerald-700",
      estoque: "border-amber-900 text-amber-600 bg-slate-900/60 hover:border-amber-700",
      os: "border-indigo-900 text-indigo-600 bg-slate-900/60 hover:border-indigo-700",
      gerencial: "border-rose-900 text-rose-600 bg-slate-900/60 hover:border-rose-700",
      automacao: "border-fuchsia-900 text-fuchsia-600 bg-slate-900/60 hover:border-fuchsia-700",
      ia: "border-purple-900 text-purple-600 bg-slate-900/60 hover:border-purple-700"
    }[category];

    return active ? activeColor : inactiveColor;
  };

  const getTierBadge = (tier: string) => {
    const styles: Record<string, string> = {
      S: "bg-rose-500/20 text-rose-300 border-rose-500/30",
      A: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      B: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      C: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
      Lendaria: "bg-purple-500/20 text-purple-300 border-purple-500/30 animate-pulse",
      Base: "bg-slate-500/20 text-slate-300 border-slate-500/30"
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${styles[tier] || styles.Base}`}>
        Tier {tier}
      </span>
    );
  };

  return (
    <div className="relative min-h-[85vh] bg-slate-950/60 backdrop-blur-md rounded-2xl border border-slate-800 p-6 overflow-hidden">
      {/* Grid de fundo */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
              <span className="material-symbols-outlined">account_tree</span>
              Árvore de Habilidades do Sistema MGV
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Desbloqueie recursos para a sua oficina. O progresso é cumulativo e segue a prioridade operacional das Fases.
            </p>
          </div>
          <div className="bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 text-right">
            <div className="text-xs text-slate-500">Perfil Atual</div>
            <div className="text-sm font-bold text-teal-400">{userRole}</div>
          </div>
        </div>

        <div className="flex flex-1 flex-col lg:flex-row gap-8 items-stretch">
          {/* Visualizador da Árvore */}
          <div className="flex-1 min-h-[500px] overflow-auto relative border border-slate-800 rounded-xl bg-slate-950/80 p-4 custom-scrollbar">
            {/* SVG para linhas conectoras */}
            <svg className="absolute inset-0 w-[900px] h-[780px] pointer-events-none z-0">
              <defs>
                <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="inactiveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#334155" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#1e293b" stopOpacity="0.4" />
                </linearGradient>
              </defs>

              {connections.map((conn, idx) => {
                const parent = skillNodes.find(n => n.id === conn.from);
                const child = skillNodes.find(n => n.id === conn.to);
                if (!parent || !child) return null;

                const parentActive = isNodeActive(parent);
                const childActive = isNodeActive(child);
                const isActive = parentActive && childActive;

                return (
                  <line
                    key={idx}
                    x1={parent.x}
                    y1={parent.y}
                    x2={child.x}
                    y2={child.y}
                    stroke={isActive ? "url(#activeGrad)" : "url(#inactiveGrad)"}
                    strokeWidth={isActive ? 3 : 1.5}
                    strokeDasharray={isActive ? "none" : "4 4"}
                    className={isActive ? "animate-pulse" : ""}
                  />
                );
              })}
            </svg>

            {/* Renderização dos Nós */}
            <div className="absolute inset-0 w-[900px] h-[780px] z-10">
              {skillNodes.map(node => {
                const active = isNodeActive(node);
                const locked = !active && !areDependenciesMet(node);
                const isSelected = selectedNode?.id === node.id;

                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    style={{
                      position: "absolute",
                      left: node.x - 70, // Meio da largura (140px)
                      top: node.y - 30,  // Meio da altura (60px)
                      width: 140,
                      height: 65,
                    }}
                    className={`flex flex-col items-center justify-center rounded-xl border text-center transition-all duration-300 ${getCategoryColor(
                      node.category,
                      active,
                      locked
                    )} ${
                      isSelected
                        ? "ring-2 ring-indigo-400 scale-105 border-white"
                        : "hover:scale-[1.03] scale-100"
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl mb-0.5">
                      {locked ? "lock" : node.icon}
                    </span>
                    <span className="text-[11px] font-bold tracking-tight truncate max-w-[125px]">
                      {node.label}
                    </span>
                    <span className="text-[8px] opacity-75 mt-0.5">
                      {node.tier === "Base" ? "Base" : `Tier ${node.tier}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Painel de Detalhes da Habilidade */}
          <div className="w-full lg:w-80 flex flex-col justify-between p-6 border border-slate-800 rounded-xl bg-slate-900/60 backdrop-blur-lg">
            {selectedNode ? (
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-white leading-tight">
                        {selectedNode.label}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5 capitalize">
                        Categoria: {selectedNode.category}
                      </p>
                    </div>
                    {getTierBadge(selectedNode.tier)}
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 mb-6">
                    {selectedNode.description}
                  </p>

                  <div className="space-y-4">
                    {/* Dependências */}
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Requisitos de Desbloqueio:
                      </h3>
                      {selectedNode.dependencies.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {selectedNode.dependencies.map(depId => {
                            const depNode = skillNodes.find(n => n.id === depId);
                            const depActive = depNode ? isNodeActive(depNode) : false;
                            return (
                              <div key={depId} className="flex items-center gap-2 text-xs">
                                <span className={`material-symbols-outlined text-sm ${depActive ? "text-emerald-400" : "text-rose-500"}`}>
                                  {depActive ? "check_circle" : "cancel"}
                                </span>
                                <span className={depActive ? "text-slate-300" : "text-slate-500 line-through"}>
                                  {depNode?.label || depId}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-400 font-medium">Livre (Habilidade Inicial)</span>
                      )}
                    </div>

                    {/* Status Atual */}
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Status Atual:
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${isNodeActive(selectedNode) ? "bg-emerald-400 animate-ping" : "bg-slate-700"}`} />
                        <span className={`text-xs font-bold ${isNodeActive(selectedNode) ? "text-emerald-400" : "text-slate-400"}`}>
                          {isNodeActive(selectedNode) ? "ATIVADA E DESBLOQUEADA" : "BLOQUEADA / DESATIVADA"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-800/80 pt-4">
                  {selectedNode.flagKey ? (
                    userRole === UserRole.OWNER ? (
                      <button
                        onClick={() => handleToggleFlag(selectedNode)}
                        disabled={isToggling || (!isNodeActive(selectedNode) && !areDependenciesMet(selectedNode))}
                        className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-300 ${
                          isNodeActive(selectedNode)
                            ? "bg-rose-600 hover:bg-rose-700 text-white shadow-[0_0_15px_rgba(225,29,72,0.3)]"
                            : areDependenciesMet(selectedNode)
                            ? "bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.3)]"
                            : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                        }`}
                      >
                        {isToggling ? "Ajustando..." : isNodeActive(selectedNode) ? "Desativar Habilidade" : "Desbloquear Habilidade"}
                      </button>
                    ) : (
                      <div className="text-xs text-rose-500 text-center font-medium bg-rose-950/20 border border-rose-900/30 p-3 rounded-lg">
                        ⚠️ Apenas usuários OWNER podem desbloquear novas habilidades.
                      </div>
                    )
                  ) : (
                    <div className="text-xs text-teal-400 text-center font-medium bg-teal-950/20 border border-teal-900/30 p-3 rounded-lg">
                      Módulo base sempre habilitado no núcleo do MGV.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 py-12">
                <span className="material-symbols-outlined text-4xl mb-2 text-indigo-500/50">touch_app</span>
                <p className="text-sm font-medium">Selecione uma habilidade para visualizar detalhes e requisitos de desbloqueio.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
