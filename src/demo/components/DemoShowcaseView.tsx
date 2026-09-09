import React, { useState, useEffect, useMemo } from "react";
import {
  Kanban,
  FileCheck2,
  Timer,
  MessageSquare,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  Send,
  Cpu,
  TrendingUp,
  Clock,
  DollarSign,
  Layers,
  ChevronDown,
  Star,
  Check,
  X,
  PhoneCall,
  Smartphone,
  ExternalLink,
  Activity,
  Award,
  Lock,
  Boxes,
  FileSpreadsheet,
  Terminal,
  Gauge,
  Sliders,
  CheckCircle,
  HelpCircle
} from "lucide-react";

interface DemoShowcaseViewProps {
  onEnterLiveDemo?: () => void;
}

export default function DemoShowcaseView({ onEnterLiveDemo }: DemoShowcaseViewProps) {
  // Controle de Abas do Product Studio
  const [activeTab, setActiveTab] = useState<"kanban" | "fiscal" | "stress" | "whatsapp">("kanban");
  const [showContactModal, setShowContactModal] = useState(false);

  // Estados da Calculadora de ROI
  const [monthlyOS, setMonthlyOS] = useState<number>(120);
  const [avgTicket, setAvgTicket] = useState<number>(380);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Estados Interativos do Kanban Simulado
  const [kanbanOrders] = useState([
    {
      id: "OS-2492",
      client: "Dra. Juliana Ramos",
      device: "Smart TV LG 55\" OLED 4K",
      status: "orcamento",
      time: "Hoje, 09:30",
      price: "R$ 650,00",
      defect: "Sem imagem na tela, áudio operando",
      tag: "Orçamento",
      priority: "Normal"
    },
    {
      id: "OS-2490",
      client: "Carlos Eduardo",
      device: "Dell XPS 15 (i7 / 32GB)",
      status: "manutencao",
      time: "Em bancada",
      price: "R$ 850,00",
      defect: "Cooler CPU e reballing VRM",
      tag: "Em Reparo",
      tech: "Lucas Ramos",
      priority: "Urgente"
    },
    {
      id: "OS-2488",
      client: "Matheus Silva",
      device: "PlayStation 5 Digital",
      status: "pronto",
      time: "Aprovado",
      price: "R$ 490,00",
      defect: "Conector HDMI e metal líquido",
      tag: "Pronto p/ Retirada",
      notified: true,
      priority: "Normal"
    },
    {
      id: "OS-2485",
      client: "Dra. Renata Ferreira",
      device: "MacBook Air M2 (512GB)",
      status: "finalizado",
      time: "Ontem, 17:40",
      price: "R$ 1.250,00",
      defect: "Banho químico e teclado",
      tag: "Entregue e Pago",
      fiscal: "NF-e + NFS-e Emitidas",
      priority: "Baixa"
    }
  ]);

  // Estados interativos do Simulador Fiscal Bifásico
  const [fiscalStep, setFiscalStep] = useState<"ready" | "validating" | "success">("ready");
  const [fiscalValidationLogs, setFiscalValidationLogs] = useState<string[]>([]);

  // Estados interativos do Teste de Estresse e Bancada
  const [stressTime, setStressTime] = useState(1800); // 30 min em segundos
  const [isStressRunning, setIsStressRunning] = useState(false);
  const [telemetryTemp, setTelemetryTemp] = useState(58.4);
  const [telemetryVoltage, setTelemetryVoltage] = useState(19.42);
  const [checklist, setChecklist] = useState({
    temperatura: true,
    tensao: true,
    bateria: false,
    desempenho: false,
  });

  // Estados do WhatsApp e Chat
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      from: "bot",
      text: "👋 Olá Carlos Eduardo! Seu equipamento *Dell XPS 15 (OS #2490)* deu entrada no laboratório da *Oficina Modelo*.",
      time: "10:15",
      isLink: false
    },
    {
      id: 2,
      from: "bot",
      text: "🔍 Acompanhe o diagnóstico e fotos do reparo em tempo real no link seguro: *https://rastreio.osflow.com.br/OS-2490*",
      time: "10:15",
      isLink: true
    }
  ]);

  // Handler para iniciar a demonstração completa ao vivo
  const handleStartLiveDemo = () => {
    if (onEnterLiveDemo) {
      onEnterLiveDemo();
    } else {
      localStorage.setItem("osflow_live_demo", "true");
      window.location.href = "/dashboard";
    }
  };

  // Cronômetro do teste de estresse e variação suave de telemetria
  useEffect(() => {
    let interval: any;
    if (isStressRunning && stressTime > 0) {
      interval = setInterval(() => {
        setStressTime((t) => Math.max(0, t - 1));
        setTelemetryTemp((prev) => +(prev + (Math.random() * 0.6 - 0.28)).toFixed(1));
        setTelemetryVoltage((prev) => +(19.4 + (Math.random() * 0.06 - 0.03)).toFixed(2));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStressRunning, stressTime]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Simulação de Faturamento Bifásico em Etapas
  const handleSimulateFiscal = () => {
    setFiscalStep("validating");
    setFiscalValidationLogs([
      "⚡ [OS Flow Kernel] Validando tomador e inscrição municipal...",
      "🔍 [NCM Engine] Verificando código 8414.59.90 (Cooler Fan) na tabela SEFAZ...",
      "✓ [NCM OK] Formato estrito de 8 dígitos validado com sucesso.",
      "📑 [Bifásico] Desacoplando Peças (ICMS Mod. 55) e Mão de Obra (LC 116 Item 14.01)...",
      "🚀 [Transmissão] Lote fiscal assinado digitalmente e sincronizado com Bling V3."
    ]);

    setTimeout(() => {
      setFiscalStep("success");
    }, 2000);
  };

  // Simulação do Disparo WhatsApp com feedback visual e efeito digitando
  const handleSendWhatsApp = () => {
    if (whatsappSent) return;
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setWhatsappSent(true);
      setChatMessages((prev) => [
        ...prev,
        {
          id: 3,
          from: "bot",
          text: "🚀 *OS FLOW NOTIFICAÇÕES:* Olá Carlos! O reparo da sua *OS #2490* foi concluído com sucesso e aprovado no teste de bancada física (30 min).\n\n✅ *Status:* Pronto para Retirada\n💵 *Total:* R$ 850,00 (NF-e de peças e NFS-e já autorizadas)\n📍 *Local:* Oficina Modelo - Balcão Principal",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isLink: false
        }
      ]);
    }, 1200);
  };

  // Cálculo de ROI Reativo
  const calculatedROI = useMemo(() => {
    const hoursSavedPerMonth = Math.round(monthlyOS * 0.45);
    const revenueImpact = Math.round(monthlyOS * avgTicket * 0.08);
    const taxPenaltyAvoided = Math.round(monthlyOS * 18.5);
    return {
      hoursSavedPerMonth,
      revenueImpact,
      taxPenaltyAvoided,
      totalGain: revenueImpact + taxPenaltyAvoided
    };
  }, [monthlyOS, avgTicket]);

  return (
    <div className="min-h-screen bg-[#070A11] text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 pb-20 relative overflow-hidden">
      {/* ─── Grid Decorativo Tecnológico de Fundo (Blueprint Grid) ─── */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#6366f1 1px, transparent 1px), radial-gradient(#06b6d4 1px, transparent 1px)`,
          backgroundSize: `32px 32px`,
          backgroundPosition: `0 0, 16px 16px`
        }}
      />

      {/* ─── Efeitos Atmosféricos de Luz (Backdrop Ambient Glows) ───── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] bg-gradient-to-b from-indigo-600/20 via-cyan-500/10 to-transparent blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-[800px] -right-20 w-[600px] h-[600px] bg-emerald-500/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-[1800px] -left-20 w-[700px] h-[700px] bg-indigo-600/10 blur-[150px] pointer-events-none rounded-full" />

      {/* ─── TOPBAR HEADER ELEGANTE COM GLASSMORPHISM ──────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#070A11]/80 border-b border-white/[0.08] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo Exclusiva OS Flow */}
          <div className="flex items-center space-x-3.5 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-cyan-500 to-emerald-400 p-[1.5px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300">
                <div className="w-full h-full bg-[#090D18] rounded-[14px] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-transparent" />
                  <div className="flex items-center -space-x-1 relative z-10">
                    <span className="w-2.5 h-4.5 bg-gradient-to-b from-cyan-400 to-indigo-500 rounded-sm transform -skew-x-12 shadow-sm" />
                    <span className="w-2.5 h-4.5 bg-gradient-to-b from-emerald-400 to-cyan-400 rounded-sm transform -skew-x-12 shadow-sm opacity-90" />
                  </div>
                </div>
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  OS <span className="text-cyan-400 font-black">FLOW</span>
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 tracking-wider">
                  SaaS V26
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">O Sistema Operacional de Alta Performance para Assistências</p>
            </div>
          </div>

          {/* Nav Quick Links */}
          <nav className="hidden lg:flex items-center space-x-8 text-xs font-semibold text-slate-300">
            <button
              onClick={() => {
                const el = document.getElementById("product-studio");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:text-cyan-300 transition-colors"
            >
              Simulador ao Vivo
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("comparative-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:text-cyan-300 transition-colors"
            >
              Diferenciais
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("roi-calculator");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:text-cyan-300 transition-colors"
            >
              Calculadora ROI
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("pricing-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:text-cyan-300 transition-colors"
            >
              Planos & Preços
            </button>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleStartLiveDemo}
              className="group relative inline-flex items-center justify-center p-[1px] overflow-hidden rounded-xl font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/20"
            >
              <span className="w-full h-full bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 absolute"></span>
              <span className="relative px-4 py-2 text-xs transition-all ease-in duration-75 bg-[#090D18] rounded-[11px] group-hover:bg-opacity-0 text-cyan-300 group-hover:text-slate-950 flex items-center space-x-2 font-bold">
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="font-extrabold">Entrar no Sistema (Ao Vivo)</span>
              </span>
            </button>

            <button
              onClick={() => setShowContactModal(true)}
              className="hidden sm:flex items-center space-x-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 rounded-xl shadow-lg shadow-indigo-600/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>Contratar para Minha Oficina</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION DE ALTO IMPACTO ─────────────────────────── */}
      <section className="relative pt-14 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Glow Badge de Engenharia 2026 */}
        <div className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-white/[0.1] shadow-inner text-slate-300 text-xs font-semibold mb-6 backdrop-blur-md">
          <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="text-cyan-400 font-bold">OS Flow Engine 2026:</span>
          <span>Faturamento Bifásico SEFAZ + Trava de Bancada + WhatsApp Realtime</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.12] text-white">
          O Sistema Operacional que Substitui o Caos por{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent underline decoration-cyan-400/40 decoration-wavy decoration-2">
            Precisão Milimétrica
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-5 text-base sm:text-lg text-slate-300/90 max-w-3xl mx-auto leading-relaxed font-normal">
          Elimine perdas com notas fiscais erradas, acabe com o caos de papéis e cadernos e dê adeus às mensagens manuais no balcão. O OS Flow centraliza Kanban, Estoque com Reserva, Telemetria de Bancada e Bling V3 em um único lugar.
        </p>

        {/* Hero CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleStartLiveDemo}
            className="w-full sm:w-auto px-8 py-4 text-sm font-extrabold text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 rounded-2xl shadow-2xl shadow-cyan-500/25 flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Navegar no Sistema Completo (Demo Grátis)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              const el = document.getElementById("product-studio");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="w-full sm:w-auto px-6 py-4 text-sm font-bold text-slate-200 bg-slate-900/80 hover:bg-slate-800/90 border border-white/[0.1] hover:border-cyan-500/40 rounded-2xl flex items-center justify-center gap-2 transition-all"
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Explorar Laboratório Interativo Abaixo</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* ─── HERO DASHBOARD PREVIEW INTERATIVO FLUTUANTE ───────── */}
        <div className="mt-14 relative max-w-5xl mx-auto">
          {/* Moldura Glassmorphism com Efeito Glow */}
          <div className="relative rounded-3xl p-1 bg-gradient-to-b from-cyan-500/30 via-indigo-500/20 to-slate-900/80 shadow-2xl shadow-indigo-950/80 backdrop-blur-xl">
            <div className="bg-[#080D1A]/95 rounded-[22px] p-4 sm:p-6 border border-white/[0.08] text-left overflow-hidden">
              {/* Barra superior de janela de aplicativo */}
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-[11px] text-slate-400 ml-2 font-mono hidden sm:inline">
                    app.osflow.com.br/dashboard • Sessão Ativa: Oficina Modelo (Demo)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    🟢 SEFAZ & Bling: Online
                  </span>
                </div>
              </div>

              {/* Grid de Métricas no Mockup */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5">
                <div className="p-3.5 bg-slate-900/80 border border-white/[0.06] rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 block">Faturamento do Mês</span>
                  <div className="text-lg sm:text-xl font-black text-white mt-1">R$ 54.820,00</div>
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" /> +18.4% vs mês anterior
                  </span>
                </div>

                <div className="p-3.5 bg-slate-900/80 border border-white/[0.06] rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 block">Ordens em Andamento</span>
                  <div className="text-lg sm:text-xl font-black text-cyan-300 mt-1">28 OS Ativas</div>
                  <span className="text-[10px] text-slate-400 mt-1 block">9 em bancada física</span>
                </div>

                <div className="p-3.5 bg-slate-900/80 border border-white/[0.06] rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 block">SLA Médio de Entrega</span>
                  <div className="text-lg sm:text-xl font-black text-emerald-300 mt-1">18h 30min</div>
                  <span className="text-[10px] text-emerald-400 font-semibold mt-1 block">99.2% dentro do prazo</span>
                </div>

                <div className="p-3.5 bg-slate-900/80 border border-white/[0.06] rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 block">Índice de Retrabalho</span>
                  <div className="text-lg sm:text-xl font-black text-emerald-400 mt-1">0.3%</div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Blindagem por checklist</span>
                </div>
              </div>

              {/* Mini Prévia do Kanban dentro do Mockup Hero */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/70 p-3 rounded-xl border border-white/[0.06]">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 mb-2">
                    <span>Orçamento (2)</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-white/[0.04] text-xs">
                    <div className="font-bold text-slate-200">OS #2494 • MacBook Pro M1</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Troca de Display Retina • Dra. Camila</div>
                    <div className="mt-1.5 text-[10px] text-amber-300 font-mono">R$ 1.890,00</div>
                  </div>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-white/[0.06]">
                  <div className="flex items-center justify-between text-[11px] font-bold text-cyan-400 mb-2">
                    <span>Em Manutenção (1)</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-cyan-500/30 text-xs">
                    <div className="font-bold text-slate-200">OS #2490 • Dell XPS 15</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Bancada #02 • Teste Estresse 30m</div>
                    <div className="mt-1.5 text-[10px] text-cyan-300 font-mono">Lucas Ramos • R$ 850,00</div>
                  </div>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-white/[0.06]">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 mb-2">
                    <span>Pronto Retirada (1)</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-emerald-500/30 text-xs">
                    <div className="font-bold text-slate-200">OS #2488 • PlayStation 5</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">WhatsApp Enviado ✓ • Pronto</div>
                    <div className="mt-1.5 text-[10px] text-emerald-400 font-mono">R$ 490,00 • Faturar</div>
                  </div>
                </div>
              </div>

              {/* Mini Bar de Ação no Rodapé do Mockup */}
              <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Demonstração ativa do SaaS OS Flow com banco de dados isolado.
                </span>
                <button
                  onClick={handleStartLiveDemo}
                  className="text-cyan-400 hover:text-cyan-300 font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <span>Abrir Tela Cheia</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TICKER DE CONFIANÇA & NÚMEROS COMPROVADOS ───────────── */}
      <section className="py-10 border-y border-white/[0.08] bg-slate-900/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-3">
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono">+4.800</div>
              <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                Ordens de Serviço Processadas
              </div>
            </div>

            <div className="p-3">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono">0%</div>
              <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                Glosas ou Erros Fiscais de NCM
              </div>
            </div>

            <div className="p-3">
              <div className="text-3xl sm:text-4xl font-extrabold text-cyan-400 font-mono">-74%</div>
              <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                Tempo Gasto no WhatsApp do Balcão
              </div>
            </div>

            <div className="p-3">
              <div className="text-3xl sm:text-4xl font-extrabold text-indigo-400 font-mono">100%</div>
              <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                Conformidade SEFAZ & Bling V3
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── LABORATÓRIO INTERATIVO (PRODUCT STUDIO) ──────────────── */}
      <section id="product-studio" className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold mb-3">
            <Cpu className="w-3.5 h-3.5" />
            <span>LABORATÓRIO INTERATIVO AO VIVO</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Experimente na Prática os 4 Pilares do OS Flow
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Interaja com os controles abaixo para simular uma rotina real da sua assistência técnica.
          </p>
        </div>

        {/* Abas de Navegação do Simulador */}
        <div className="flex flex-wrap justify-center gap-2.5 p-2 bg-slate-900/90 border border-white/[0.08] rounded-2xl max-w-4xl mx-auto backdrop-blur-md shadow-xl mb-8">
          <button
            onClick={() => setActiveTab("kanban")}
            className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "kanban"
                ? "bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Kanban className="w-4 h-4" />
            <span>1. Kanban de Alta Performance</span>
          </button>

          <button
            onClick={() => setActiveTab("fiscal")}
            className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "fiscal"
                ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg shadow-cyan-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>2. Faturamento Bifásico (SEFAZ)</span>
          </button>

          <button
            onClick={() => setActiveTab("stress")}
            className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "stress"
                ? "bg-gradient-to-r from-amber-600 to-orange-700 text-white shadow-lg shadow-amber-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Timer className="w-4 h-4" />
            <span>3. Teste em Bancada & Telemetria</span>
          </button>

          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "whatsapp"
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>4. Automação WhatsApp Realtime</span>
          </button>
        </div>

        {/* ─── TAB 1: KANBAN BOARD DEMO ──────────────────────── */}
        {activeTab === "kanban" && (
          <div className="bg-[#080D1A] border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/[0.08] gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Kanban className="w-5 h-5" />
                  </span>
                  <h3 className="text-xl font-bold text-white">Quadro Kanban Operacional — Visão 360°</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Organização visual por colunas com tempos de permanência, técnicos designados e alertas de prioridade.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs bg-slate-900 text-slate-300 px-3.5 py-1.5 rounded-xl border border-white/[0.08] font-mono">
                  Sessão: <strong className="text-white">4 OS Ativas</strong>
                </span>
                <button
                  onClick={handleStartLiveDemo}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <span>Abrir Quadro Completo</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* 4 Colunas do Kanban */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              {/* Coluna 1: Orçamento */}
              <div className="bg-slate-950/70 border border-white/[0.06] rounded-2xl p-3.5 flex flex-col h-[420px]">
                <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08] mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50"></span>
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Orçamento (1)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">SLA: 24h</span>
                </div>
                <div className="space-y-3 overflow-y-auto pr-1">
                  <div className="bg-slate-900/90 border border-white/[0.06] hover:border-amber-500/50 p-3.5 rounded-xl shadow-md transition-all group cursor-pointer">
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-bold text-amber-400 font-mono">OS #2492</span>
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Hoje, 09:30</span>
                    </div>
                    <h4 className="font-bold text-sm text-white mt-1.5">Smart TV LG 55" OLED</h4>
                    <p className="text-[11px] text-slate-400">Cliente: Dra. Juliana Ramos</p>
                    <div className="mt-2.5 text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                      Defeito: Sem imagem na tela, áudio operando
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/[0.06]">
                      <span>Aguardando Laudo</span>
                      <span className="text-white font-bold font-mono">R$ 650,00</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna 2: Em Manutenção */}
              <div className="bg-slate-950/70 border border-white/[0.06] rounded-2xl p-3.5 flex flex-col h-[420px]">
                <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08] mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50"></span>
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Manutenção (1)</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono">Em bancada</span>
                </div>
                <div className="space-y-3 overflow-y-auto pr-1">
                  <div className="bg-slate-900/90 border border-cyan-500/40 p-3.5 rounded-xl shadow-md transition-all cursor-pointer">
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-bold text-cyan-400 font-mono">OS #2490</span>
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 rounded border border-rose-500/30">
                        URGENTE
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-white mt-1.5">Dell XPS 15 (i7 / 32GB)</h4>
                    <p className="text-[11px] text-slate-400">Cliente: Carlos Eduardo</p>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-300 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-white/[0.06]">
                      <span>Téc: Lucas Ramos</span>
                      <span className="text-emerald-400 font-bold font-mono">R$ 850,00</span>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] text-cyan-300">
                      <Activity className="w-3 h-3 animate-pulse" />
                      <span>Teste de estresse em andamento (58°C)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna 3: Pronto Retirada */}
              <div className="bg-slate-950/70 border border-white/[0.06] rounded-2xl p-3.5 flex flex-col h-[420px]">
                <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08] mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Pronto Retirada (1)</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">Notificado</span>
                </div>
                <div className="space-y-3 overflow-y-auto pr-1">
                  <div className="bg-slate-900/90 border border-emerald-500/40 p-3.5 rounded-xl shadow-md transition-all cursor-pointer">
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-bold text-emerald-400 font-mono">OS #2488</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-500/30">
                        WHATSAPP ENVIADO
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-white mt-1.5">PlayStation 5 Digital</h4>
                    <p className="text-[11px] text-slate-400">Cliente: Matheus Silva</p>
                    <div className="mt-2.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
                      <span>Pronto p/ Faturar</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/[0.06]">
                      <span>Garantia: 90 dias</span>
                      <span className="text-white font-bold font-mono">R$ 490,00</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna 4: Finalizado / Faturado */}
              <div className="bg-slate-950/70 border border-white/[0.06] rounded-2xl p-3.5 flex flex-col h-[420px]">
                <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08] mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50"></span>
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Finalizado (1)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Faturado</span>
                </div>
                <div className="space-y-3 overflow-y-auto pr-1">
                  <div className="bg-slate-900/60 border border-white/[0.06] p-3.5 rounded-xl shadow-sm">
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-bold text-purple-400 font-mono">OS #2485</span>
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Ontem, 17:40</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-200 mt-1.5">MacBook Air M2 (512GB)</h4>
                    <p className="text-[11px] text-slate-400">Cliente: Dra. Renata Ferreira</p>
                    <div className="mt-2.5 text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
                      <span>NF-e + NFS-e Emitidas</span>
                      <span className="font-bold text-emerald-400">Pago ✓</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/[0.06]">
                      <span>Bling V3 Sincronizado</span>
                      <span className="text-emerald-400 font-bold font-mono">R$ 1.250,00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: FISCAL BIFÁSICO DEMO ───────────────────── */}
        {activeTab === "fiscal" && (
          <div className="bg-[#080D1A] border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/[0.08] gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <FileCheck2 className="w-5 h-5" />
                  </span>
                  <h3 className="text-xl font-bold text-white">Simulador Fiscal OS Flow — Faturamento Bifásico (SEFAZ + Prefeitura)</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Separação automática de Peças (NF-e Modelo 55) e Serviços (NFS-e Municipal) com validação de NCM em 1 clique.
                </p>
              </div>

              <button
                onClick={() => {
                  setFiscalStep("ready");
                  setFiscalValidationLogs([]);
                }}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/[0.08] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar Simulação</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              {/* Card da OS Selecionada */}
              <div className="lg:col-span-1 bg-slate-950/80 border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider font-mono">Ordem de Serviço</span>
                    <span className="text-[11px] font-mono text-slate-400">OS #2490</span>
                  </div>
                  <div className="mt-2 text-lg font-black text-white">Dell XPS 15 (i7 / 32GB)</div>
                  <div className="text-xs text-slate-400">Cliente: Carlos Eduardo (CPF: 123.456.789-00)</div>

                  {/* Discriminação Peça x Serviço */}
                  <div className="mt-5 pt-4 border-t border-white/[0.08] space-y-3 text-xs">
                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-white/[0.06]">
                      <div className="flex justify-between font-bold text-indigo-300">
                        <span>1. Peça: Cooler Fan CPU</span>
                        <span className="font-mono text-white">R$ 350,00</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        NCM: <strong className="text-cyan-400 font-mono">8414.59.90</strong> (8 dígitos SEFAZ)
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-900/90 rounded-xl border border-white/[0.06]">
                      <div className="flex justify-between font-bold text-cyan-300">
                        <span>2. Serviço: Reparo de Placa-Mãe</span>
                        <span className="font-mono text-white">R$ 500,00</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Código Tributário Municipal: <strong className="text-cyan-400 font-mono">14.01</strong>
                      </div>
                    </div>

                    <div className="flex justify-between text-sm font-black text-emerald-400 pt-2 border-t border-white/[0.08]">
                      <span>Total Faturado:</span>
                      <span className="font-mono">R$ 850,00</span>
                    </div>
                  </div>
                </div>

                {/* Botão de Disparo */}
                <div className="mt-6">
                  {fiscalStep === "ready" && (
                    <button
                      onClick={handleSimulateFiscal}
                      className="w-full py-3.5 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                    >
                      <Zap className="w-4 h-4 fill-slate-950" />
                      <span>Emitir Faturamento Bifásico em 1 Clique</span>
                    </button>
                  )}

                  {fiscalStep === "validating" && (
                    <div className="w-full py-3.5 bg-slate-900 border border-cyan-500/40 text-cyan-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 animate-pulse">
                      <Cpu className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Validando NCMs e transmitindo SEFAZ...</span>
                    </div>
                  )}

                  {fiscalStep === "success" && (
                    <div className="w-full py-3.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Notas Emitidas & Sincronizadas no Bling!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Console de Validação e Documentos Fiscais */}
              <div className="lg:col-span-2 space-y-4">
                {/* Console Log de Validação */}
                <div className="bg-slate-950 border border-white/[0.08] rounded-2xl p-4 font-mono text-[11px]">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] text-slate-400 text-[10px]">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <Terminal className="w-3.5 h-3.5" /> MOTOR FISCAL • OS FLOW & BLING V3
                    </span>
                    <span className="text-emerald-400">Status: Conectado</span>
                  </div>
                  <div className="mt-3 space-y-1 text-slate-300 min-h-[70px]">
                    {fiscalStep === "ready" && (
                      <p className="text-slate-500 italic">
                        Clique no botão ao lado para iniciar a validação de regras fiscais e transmissão simultânea.
                      </p>
                    )}
                    {fiscalValidationLogs.map((log, index) => (
                      <p key={index} className="text-cyan-300/90 animate-fade-in">
                        {log}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Duas Notas Emitidas em Paralelo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* NF-e Produtos */}
                  <div
                    className={`border rounded-2xl p-4 transition duration-500 ${
                      fiscalStep === "success"
                        ? "bg-slate-950 border-cyan-500/50 shadow-xl shadow-cyan-500/10"
                        : "bg-slate-950/40 border-white/[0.06] opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                        <Boxes className="w-3.5 h-3.5" />
                        NF-e (Produtos / Peças)
                      </span>
                      {fiscalStep === "success" ? (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                          AUTORIZADA SEFAZ
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-500">Aguardando</span>
                      )}
                    </div>
                    <div className="mt-3 text-xs text-slate-300 space-y-1.5">
                      <p className="text-[11px]">
                        <strong>Item:</strong> Cooler Fan CPU
                      </p>
                      <p className="text-[11px]">
                        <strong>NCM:</strong> 8414.59.90 (Aprovado ✓)
                      </p>
                      <p className="text-[11px]">
                        <strong>Base de Cálculo:</strong> R$ 350,00
                      </p>
                      <div className="pt-2 border-t border-white/[0.06] text-[10px] text-slate-400 font-mono">
                        Protocolo: {fiscalStep === "success" ? "13526008912401-SP" : "---"}
                      </div>
                    </div>
                  </div>

                  {/* NFS-e Serviços */}
                  <div
                    className={`border rounded-2xl p-4 transition duration-500 ${
                      fiscalStep === "success"
                        ? "bg-slate-950 border-emerald-500/50 shadow-xl shadow-emerald-500/10"
                        : "bg-slate-950/40 border-white/[0.06] opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        NFS-e (Mão de Obra)
                      </span>
                      {fiscalStep === "success" ? (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                          TRANSMITIDA PREFEITURA
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-500">Aguardando</span>
                      )}
                    </div>
                    <div className="mt-3 text-xs text-slate-300 space-y-1.5">
                      <p className="text-[11px]">
                        <strong>Serviço:</strong> Reparo de Placa-Mãe
                      </p>
                      <p className="text-[11px]">
                        <strong>Código LC 116:</strong> 14.01
                      </p>
                      <p className="text-[11px]">
                        <strong>Valor do Serviço:</strong> R$ 500,00
                      </p>
                      <div className="pt-2 border-t border-white/[0.06] text-[10px] text-slate-400 font-mono">
                        Autenticação: {fiscalStep === "success" ? "882A-C991-FE44-SP" : "---"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: TESTE DE ESTRESSE EM BANCADA ───────────── */}
        {activeTab === "stress" && (
          <div className="bg-[#080D1A] border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/[0.08] gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Timer className="w-5 h-5" />
                  </span>
                  <h3 className="text-xl font-bold text-white">Protocolo de Teste de Bancada OS Flow & Telemetria</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Bloqueio inteligente de liberação de OS: exige 30 minutos de estresse físico e checklist auditável antes de notificar o cliente.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-center">
              {/* Cronômetro e Telemetria */}
              <div className="bg-slate-950/80 border border-white/[0.06] rounded-2xl p-6 text-center">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  Cronômetro de Estresse Físico Obrigatório
                </span>
                <div className="mt-3 text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 font-mono tracking-widest">
                  {formatTimer(stressTime)}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Tempo mínimo exigido pelo controle de qualidade para liberação da OS #2490.
                </p>

                {/* Telemetria de Bancada */}
                <div className="grid grid-cols-2 gap-3 mt-5 text-left">
                  <div className="p-3 bg-slate-900 rounded-xl border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 font-semibold block">Temperatura em Carga</span>
                    <div className="text-lg font-bold font-mono text-cyan-300 mt-0.5 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                      <span>{telemetryTemp} °C</span>
                    </div>
                    <span className="text-[9px] text-emerald-400 mt-0.5 block">Normal (&lt; 75°C)</span>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 font-semibold block">Tensão Primária</span>
                    <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">
                      {telemetryVoltage} V
                    </div>
                    <span className="text-[9px] text-emerald-400 mt-0.5 block">Estável (19.0V - 19.8V)</span>
                  </div>
                </div>

                {/* Controles do Cronômetro */}
                <div className="mt-6 flex justify-center gap-3">
                  {!isStressRunning ? (
                    <button
                      onClick={() => setIsStressRunning(true)}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Iniciar Teste de Bancada</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsStressRunning(false)}
                      className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-600/30 flex items-center gap-2 transition-all"
                    >
                      <span>Pausar Teste</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsStressRunning(false);
                      setStressTime(1800);
                    }}
                    className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-white/[0.08] transition-colors"
                  >
                    Resetar
                  </button>
                </div>
              </div>

              {/* Checklist de Saída e Blindagem */}
              <div className="bg-slate-950/80 border border-white/[0.06] rounded-2xl p-6">
                <h4 className="font-bold text-sm text-white mb-3.5 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Checklist Técnico de Saída (Auditável)
                </h4>
                <div className="space-y-3 text-xs text-slate-300">
                  <label className="flex items-center gap-3 p-3 bg-slate-900/90 rounded-xl border border-white/[0.06] cursor-pointer hover:border-cyan-500/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={checklist.temperatura}
                      onChange={(e) => setChecklist({ ...checklist, temperatura: e.target.checked })}
                      className="w-4 h-4 text-cyan-500 rounded bg-slate-800 border-slate-700 focus:ring-cyan-500"
                    />
                    <span>Temperatura sob estresse máximo verificada dentro dos limites (máx 75°C)</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-900/90 rounded-xl border border-white/[0.06] cursor-pointer hover:border-cyan-500/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={checklist.tensao}
                      onChange={(e) => setChecklist({ ...checklist, tensao: e.target.checked })}
                      className="w-4 h-4 text-cyan-500 rounded bg-slate-800 border-slate-700 focus:ring-cyan-500"
                    />
                    <span>Estabilidade de tensões primárias e secundárias confirmadas</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-900/90 rounded-xl border border-white/[0.06] cursor-pointer hover:border-cyan-500/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={checklist.bateria}
                      onChange={(e) => setChecklist({ ...checklist, bateria: e.target.checked })}
                      className="w-4 h-4 text-cyan-500 rounded bg-slate-800 border-slate-700 focus:ring-cyan-500"
                    />
                    <span>Ciclo de carga e descarga da bateria aferido</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-900/90 rounded-xl border border-white/[0.06] cursor-pointer hover:border-cyan-500/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={checklist.desempenho}
                      onChange={(e) => setChecklist({ ...checklist, desempenho: e.target.checked })}
                      className="w-4 h-4 text-cyan-500 rounded bg-slate-800 border-slate-700 focus:ring-cyan-500"
                    />
                    <span>Limpeza interna e aplicação de pasta térmica de alto rendimento</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: WHATSAPP LIVE DEMO ─────────────────────── */}
        {activeTab === "whatsapp" && (
          <div className="bg-[#080D1A] border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/[0.08] gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <MessageSquare className="w-5 h-5" />
                  </span>
                  <h3 className="text-xl font-bold text-white">Simulador de Notificações via WhatsApp</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Atualize o status da OS e o cliente recebe instantaneamente a notificação com link para acompanhamento em tempo real.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-center">
              {/* Painel do Operador */}
              <div className="bg-slate-950/80 border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between h-full">
                <div>
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider font-mono">Ação do Técnico</span>
                  <h4 className="text-base font-black text-white mt-1">Conclusão e Liberação da OS #2490</h4>
                  <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                    Ao marcar a OS como "Pronta para Retirada", o motor do OS Flow gera a mensagem personalizada com dados do equipamento, valor discriminado e instruções de retirada.
                  </p>
                </div>

                <div className="mt-8">
                  <button
                    onClick={handleSendWhatsApp}
                    disabled={whatsappSent || isTyping}
                    className={`w-full py-4 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all ${
                      whatsappSent
                        ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/25 active:scale-95"
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isTyping
                        ? "Disparando mensagem..."
                        : whatsappSent
                        ? "Mensagem Entregue com Sucesso ✓"
                        : "Disparar Aviso de 'Pronto para Retirada'"}
                    </span>
                  </button>

                  {whatsappSent && (
                    <p className="text-[11px] text-emerald-400 mt-2.5 text-center flex items-center justify-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mensagem entregue ao WhatsApp do cliente!
                    </p>
                  )}
                </div>
              </div>

              {/* Smartphone Mockup */}
              <div className="bg-slate-950 border-2 border-slate-800 rounded-[32px] p-3 shadow-2xl max-w-[340px] mx-auto w-full">
                {/* Top Notch */}
                <div className="w-28 h-4 bg-slate-900 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-950" />
                </div>

                <div className="bg-[#075E54] text-white px-3 py-2.5 rounded-t-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs">
                    OF
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">Oficina Modelo (WhatsApp Oficial)</div>
                    <div className="text-[9px] text-emerald-200">Online • Conta Comercial Verificada</div>
                  </div>
                </div>

                <div className="bg-[#0B141A] p-3 rounded-b-2xl min-h-[260px] max-h-[300px] overflow-y-auto space-y-2.5 text-xs">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-2.5 rounded-xl max-w-[90%] text-[11px] leading-relaxed shadow-sm ${
                        msg.from === "bot"
                          ? "bg-[#202C33] text-slate-100 mr-auto border border-slate-700/40"
                          : "bg-[#005C4B] text-white ml-auto"
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.text}</p>
                      <span className="block text-[8px] text-slate-400 text-right mt-1 font-mono">{msg.time}</span>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="bg-[#202C33] text-emerald-400 text-[10px] px-3 py-1.5 rounded-full w-fit animate-pulse flex items-center gap-1.5">
                      <span>Digitando...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ─── SEÇÃO COMPARATIVA: CAOS DAS PLANILHAS VS OS FLOW ─────── */}
      <section id="comparative-section" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Por que as Assistências Estão Migrando para o OS Flow?
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Veja a diferença direta entre uma operação manual e uma assistência impulsionada pelo OS Flow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Lado A: O Caos Tradicional */}
          <div className="bg-rose-950/20 border border-rose-900/40 rounded-3xl p-6 sm:p-8 backdrop-blur-md">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <X className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-rose-300">O Caos do Método Tradicional</h3>
                <p className="text-xs text-slate-400">Cadernos, planilhas soltas e WhatsApp manual</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="flex items-start gap-3">
                <span className="text-rose-400 font-bold mt-0.5">✕</span>
                <span><strong>Risco Fiscal:</strong> NCM genérico na emissão, gerando glosas fiscais e multas SEFAZ.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-rose-400 font-bold mt-0.5">✕</span>
                <span><strong>Atendimento Sobrecarregado:</strong> Clientes ligando o dia inteiro perguntando se o aparelho está pronto.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-rose-400 font-bold mt-0.5">✕</span>
                <span><strong>Retrabalhos & Garantias:</strong> Aparelhos entregues com falhas ocultas por falta de teste de bancada obrigatório.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-rose-400 font-bold mt-0.5">✕</span>
                <span><strong>Perda de Peças no Estoque:</strong> Sem reserva automática, peças são usadas sem registro de OS.</span>
              </div>
            </div>
          </div>

          {/* Lado B: OS Flow High-Tech */}
          <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-3xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1 bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 text-[10px] font-extrabold rounded-bl-xl shadow-md">
              PADRÃO OURO 2026
            </div>

            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-300">Com o OS Flow</h3>
                <p className="text-xs text-slate-400">Automação inteligente e controle de ponta a ponta</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="flex items-start gap-3">
                <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                <span><strong>Faturamento Bifásico em 1 Clique:</strong> NF-e de peças e NFS-e de serviço emitidas com NCM auditado.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                <span><strong>Portal de Rastreio Público:</strong> Cliente acompanha o status em tempo real sem sobrecarregar a recepção.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                <span><strong>Trava de Estresse Físico:</strong> Checklist de 30min elimina devoluções e constrói reputação impecável.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                <span><strong>Estoque com Reserva Automática:</strong> Peça vinculada à OS dá baixa imediata e sincroniza com o Bling ERP.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BENTO GRID DE RECURSOS EXCLUSIVOS ────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>ARQUITETURA DE CLASSE EMPRESARIAL</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Tudo o que sua Oficina Precisa para Escalar
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 bg-slate-900/60 border border-white/[0.06] rounded-3xl hover:border-cyan-500/40 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Integração Nativa com Bling V3</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Sincronização bidirecional de produtos, estoque físico, ordens de serviço e faturamento fiscal sem retrabalho manual.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 bg-slate-900/60 border border-white/[0.06] rounded-3xl hover:border-cyan-500/40 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
              <Smartphone className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Portal do Cliente Rastreável</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Link exclusivo por OS onde o cliente visualiza fotos do defeito, laudo técnico, aprova orçamentos e emite recibos.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 bg-slate-900/60 border border-white/[0.06] rounded-3xl hover:border-cyan-500/40 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <Boxes className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Gestão de Estoque com Reserva</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Evite vender peças que já estão reservadas em bancada para outra OS. Controle de saldo físico e disponível em tempo real.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 bg-slate-900/60 border border-white/[0.06] rounded-3xl hover:border-cyan-500/40 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Multi-tenant com RLS Blindado</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Isolamento estrito de dados por empresa e filial. Seus dados financeiros e de clientes com criptografia de ponta a ponta.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-6 bg-slate-900/60 border border-white/[0.06] rounded-3xl hover:border-cyan-500/40 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
              <Award className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Laudos Técnicos e Termos em PDF</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Emissão com 1 clique de comprovantes de entrada com termos de responsabilidade e laudos técnicos prontos para impressão.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-6 bg-slate-900/60 border border-white/[0.06] rounded-3xl hover:border-cyan-500/40 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Automação de WhatsApp Oficial</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Disparos automáticos quando a OS muda de status: Entrada, Orçamento Aprovado, Aguardando Peça e Pronto para Retirada.
            </p>
          </div>
        </div>
      </section>

      {/* ─── CALCULADORA INTERATIVA DE ROI ───────────────────────── */}
      <section id="roi-calculator" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-b from-slate-900/90 to-[#080D1A] border border-white/[0.08] rounded-3xl p-8 sm:p-12 backdrop-blur-xl shadow-2xl">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-3">
              <DollarSign className="w-3.5 h-3.5" />
              <span>SIMULADOR DE GANHO REAL</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Quanto sua Oficina Deixa de Ganhar Todo Mês sem o OS Flow?
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Ajuste o volume de atendimento da sua empresa e veja o impacto financeiro.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center max-w-5xl mx-auto">
            {/* Controles de Sliders */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center text-sm font-bold text-slate-200 mb-2">
                  <span>Ordens de Serviço por Mês:</span>
                  <span className="text-cyan-400 text-base font-mono">{monthlyOS} OS/mês</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="600"
                  step="10"
                  value={monthlyOS}
                  onChange={(e) => setMonthlyOS(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>20 OS</span>
                  <span>300 OS</span>
                  <span>600 OS</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-sm font-bold text-slate-200 mb-2">
                  <span>Ticket Médio por Reparo (R$):</span>
                  <span className="text-emerald-400 text-base font-mono">R$ {avgTicket},00</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1500"
                  step="20"
                  value={avgTicket}
                  onChange={(e) => setAvgTicket(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>R$ 100</span>
                  <span>R$ 750</span>
                  <span>R$ 1.500</span>
                </div>
              </div>
            </div>

            {/* Resultado do Impacto Financeiro */}
            <div className="bg-slate-950/80 border border-white/[0.06] rounded-2xl p-6 text-center lg:text-left space-y-4">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                Impacto Mensal Estimado para sua Oficina
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-900 rounded-xl border border-white/[0.06]">
                  <span className="text-[11px] text-slate-400 block">Horas Economizadas</span>
                  <div className="text-xl sm:text-2xl font-black text-cyan-300 font-mono mt-1">
                    ~{calculatedROI.hoursSavedPerMonth} h/mês
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Menos tempo no balcão</span>
                </div>

                <div className="p-3.5 bg-slate-900 rounded-xl border border-white/[0.06]">
                  <span className="text-[11px] text-slate-400 block">Ganho em Produtividade</span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">
                    R$ {calculatedROI.revenueImpact.toLocaleString("pt-BR")}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Mais OS entregues no prazo</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl">
                <div className="text-xs text-emerald-300 font-semibold">Ganho Total Mensal com OS Flow:</div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono mt-1">
                  + R$ {calculatedROI.totalGain.toLocaleString("pt-BR")} / mês
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DEPOIMENTOS DE CLIENTES REAIS ────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="flex items-center justify-center gap-1 text-amber-400 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-amber-400" />
            ))}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Aprovado por Quem Vive o Dia a Dia da Bancada
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-slate-900/60 border border-white/[0.06] rounded-3xl">
            <p className="text-xs text-slate-300 leading-relaxed italic">
              "A emissão de nota com peças e serviços separados no OS Flow salvou nosso Simples Nacional. O que a gente gastava 2 horas fazendo no fim do dia agora sai em 1 clique."
            </p>
            <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-xs">
                MR
              </div>
              <div>
                <h5 className="text-xs font-bold text-white">Marcos Roberto</h5>
                <p className="text-[10px] text-slate-400">Proprietário • InfoTech Especializada</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-900/60 border border-white/[0.06] rounded-3xl">
            <p className="text-xs text-slate-300 leading-relaxed italic">
              "O link de acompanhamento no WhatsApp diminuiu as mensagens na recepção em mais de 80%. O cliente vê as fotos do reparo e não fica ligando toda hora."
            </p>
            <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-600/30 text-emerald-300 flex items-center justify-center font-bold text-xs">
                AF
              </div>
              <div>
                <h5 className="text-xs font-bold text-white">Aline Fernandes</h5>
                <p className="text-[10px] text-slate-400">Gerente Geral • MegaCell Express</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-900/60 border border-white/[0.06] rounded-3xl">
            <p className="text-xs text-slate-300 leading-relaxed italic">
              "A trava de 30 minutos de teste e checklist de bancada do OS Flow eliminou os retornos de garantia. Nossa oficina ganhou autoridade e clientes corporativos."
            </p>
            <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-cyan-600/30 text-cyan-300 flex items-center justify-center font-bold text-xs">
                CS
              </div>
              <div>
                <h5 className="text-xs font-bold text-white">Carlos Silveira</h5>
                <p className="text-[10px] text-slate-400">Técnico Chefe • Doctor Games & Console</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SEÇÃO DE PLANOS & PREÇOS ──────────────────────────────── */}
      <section id="pricing-section" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>INVESTIMENTO QUE SE PAGA NO 1º MÊS</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Planos Transparentes sem Letras Miúdas
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Escolha o plano ideal para o tamanho da sua assistência técnica.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
          {/* Plano Starter */}
          <div className="p-6 bg-slate-900/70 border border-white/[0.08] rounded-3xl">
            <h4 className="text-base font-bold text-white">Oficina Starter</h4>
            <p className="text-xs text-slate-400 mt-1">Para assistências com até 2 bancadas</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-xs text-slate-400">R$</span>
              <span className="text-3xl font-black text-white font-mono">149</span>
              <span className="text-xs text-slate-400">/mês</span>
            </div>
            <ul className="mt-6 space-y-3 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> Até 100 OS/mês
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> Kanban Visual em Tempo Real
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> Portal de Rastreio Público
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> Emissão de Laudos em PDF
              </li>
            </ul>
            <button
              onClick={() => setShowContactModal(true)}
              className="mt-6 w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-white/[0.08] transition-colors"
            >
              Começar com Starter
            </button>
          </div>

          {/* Plano Pro (Destaque) */}
          <div className="p-8 bg-gradient-to-b from-slate-900 to-[#090D18] border-2 border-cyan-500/80 rounded-3xl shadow-2xl relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 font-black text-[10px] rounded-full uppercase tracking-wider shadow-md">
              MAIS ESCOLHIDO PELAS ASSISTÊNCIAS
            </div>
            <h4 className="text-lg font-bold text-white">Oficina Pro (Completo)</h4>
            <p className="text-xs text-slate-400 mt-1">Automação total e motor fiscal OS Flow</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-xs text-slate-400">R$</span>
              <span className="text-4xl font-black text-cyan-400 font-mono">249</span>
              <span className="text-xs text-slate-400">/mês</span>
            </div>
            <ul className="mt-6 space-y-3 text-xs text-slate-200">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400" /> Ordens de Serviço Ilimitadas
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400" /> Faturamento Bifásico NF-e + NFS-e
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400" /> Integração Direta com Bling V3
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400" /> Disparos Automáticos de WhatsApp
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400" /> Trava de Estresse de Bancada (30m)
              </li>
            </ul>
            <button
              onClick={() => setShowContactModal(true)}
              className="mt-8 w-full py-4 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95"
            >
              Assinar Plano Pro
            </button>
          </div>

          {/* Plano Enterprise */}
          <div className="p-6 bg-slate-900/70 border border-white/[0.08] rounded-3xl">
            <h4 className="text-base font-bold text-white">Multi-Filiais / Enterprise</h4>
            <p className="text-xs text-slate-400 mt-1">Para redes de assistência técnica</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-xs text-slate-400">R$</span>
              <span className="text-3xl font-black text-white font-mono">489</span>
              <span className="text-xs text-slate-400">/mês</span>
            </div>
            <ul className="mt-6 space-y-3 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> Multi-unidades / Matriz e Filiais
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> Transferência de Estoque entre Lojas
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> Suporte Dedicado Prioritário
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> API Customizada & Treinamento
              </li>
            </ul>
            <button
              onClick={() => setShowContactModal(true)}
              className="mt-6 w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-white/[0.08] transition-colors"
            >
              Falar com Comercial
            </button>
          </div>
        </div>
      </section>

      {/* ─── FAQ INTERATIVO (ACCORDION) ───────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Perguntas Frequentes
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            Tire suas dúvidas antes de testar ou contratar o OS Flow.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "Preciso instalar algum programa no computador?",
              a: "Não. O OS Flow roda 100% em nuvem no navegador do seu computador, tablet ou celular. Você e seus técnicos podem acessar de qualquer lugar com segurança."
            },
            {
              q: "Como funciona a separação de Peças e Serviços para o imposto?",
              a: "O sistema separa automaticamente os itens com NCM de produtos (para a NF-e de mercadorias emitida à SEFAZ) e as mãos de obra (para a NFS-e municipal da sua prefeitura), evitando que você pague bitributação indevida."
            },
            {
              q: "Consigo importar meus clientes e produtos antigos?",
              a: "Sim. O OS Flow possui importador em massa via planilhas Excel/CSV e sincronização nativa direta com a API V3 do Bling ERP."
            },
            {
              q: "Como testo o sistema completo agora?",
              a: "Basta clicar no botão 'Entrar no Sistema (Ao Vivo)' no topo desta página. Você entrará diretamente no painel com dados fictícios e todas as telas liberadas para teste."
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-900/70 border border-white/[0.08] rounded-2xl overflow-hidden transition-colors"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full px-5 py-4 text-left font-bold text-xs sm:text-sm text-white flex items-center justify-between"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    openFaq === idx ? "rotate-180 text-cyan-400" : ""
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-4 text-xs text-slate-300 leading-relaxed border-t border-white/[0.08] pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA FINAL DE CONVERSÃO ───────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="relative rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-cyan-950/40 border border-white/[0.1] shadow-2xl overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Pronto para Elevar o Padrão da sua Assistência com o OS Flow?
            </h2>
            <p className="text-sm text-slate-300 mt-3">
              Experimente agora mesmo a demonstração ao vivo ou fale diretamente com a equipe técnica para implantar na sua oficina hoje.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={handleStartLiveDemo}
                className="px-8 py-4 text-sm font-black text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 rounded-2xl shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Navegar no Sistema Completo</span>
              </button>

              <button
                onClick={() => setShowContactModal(true)}
                className="px-6 py-4 text-sm font-bold text-white bg-slate-800/90 hover:bg-slate-700 rounded-2xl border border-white/[0.1] flex items-center justify-center gap-2 transition-colors"
              >
                <PhoneCall className="w-4 h-4 text-cyan-400" />
                <span>Falar no WhatsApp Comercial</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER CORPORATIVO PREMIUM ───────────────────────────── */}
      <footer className="mt-12 pt-10 border-t border-white/[0.08] text-xs text-slate-400 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-8">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-black text-xs shadow-sm">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-extrabold text-white text-sm">OS FLOW • SISTEMA INTEGRADO</span>
            <span className="text-[10px] text-slate-500 font-mono">• v2026.8.28</span>
          </div>

          <div className="flex items-center space-x-6 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Nuvem Segura & Criptografada
            </span>
            <span className="text-slate-500">Conformidade LGPD & SEFAZ</span>
          </div>
        </div>
      </footer>

      {/* ─── MODAL DE CONTATO COMERCIAL (LEAD / VENDA) ───────────── */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#090D18] border border-white/[0.1] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Adquirir o OS Flow</h3>
                <p className="text-xs text-slate-400">Atendimento prioritário para sua assistência técnica.</p>
              </div>
            </div>

            <div className="space-y-2.5 my-5 text-xs text-slate-300">
              <div className="p-3 bg-slate-900/90 rounded-xl border border-white/[0.06]">
                <span className="text-cyan-400 font-bold block mb-0.5">✓ Faturamento Bifásico Automatizado</span>
                Emissão de NF-e e NFS-e integradas ao Bling V3 sem erros de NCM.
              </div>
              <div className="p-3 bg-slate-900/90 rounded-xl border border-white/[0.06]">
                <span className="text-emerald-400 font-bold block mb-0.5">✓ Instalação e Ativação Imediata</span>
                Acesso liberado no mesmo dia com treinamento e suporte humano especializado.
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                onClick={() => {
                  window.open(
                    "https://wa.me/5511999999999?text=Olá!%20Gostaria%20de%20solicitar%20uma%20demonstração%20e%20proposta%20do%20OS%20Flow%20para%20minha%20assistência%20técnica.",
                    "_blank"
                  );
                  setShowContactModal(false);
                }}
                className="w-full py-4 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95"
              >
                <MessageSquare className="w-4 h-4 fill-slate-950" />
                <span>Conversar pelo WhatsApp Comercial</span>
              </button>
              <button
                onClick={() => setShowContactModal(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold rounded-xl transition-colors"
              >
                Voltar à Demonstração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
