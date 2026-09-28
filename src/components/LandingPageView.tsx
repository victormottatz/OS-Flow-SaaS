import React, { useState } from "react";
import { 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  ArrowRight, 
  Flame, 
  FileText, 
  MessageSquare, 
  TrendingUp, 
  Building2, 
  Layers, 
  Check, 
  Star, 
  Play, 
  HelpCircle, 
  Clock, 
  Laptop, 
  BarChart3, 
  PieChart, 
  Activity, 
  Smartphone, 
  FileCheck, 
  DollarSign, 
  X, 
  Calculator, 
  ChevronDown, 
  ArrowUpRight, 
  Sliders, 
  Send, 
  Wrench, 
  Camera, 
  CheckCircle, 
  Quote, 
  Award, 
  Lock, 
  Cpu, 
  RefreshCw, 
  Gauge,
  Scale
} from "lucide-react";
import AppLogo from "./AppLogo";
import RegisterTenantModal from "./RegisterTenantModal";
import { VideoDemoModal } from "./VideoDemoModal";
import { User } from "../types";

interface LandingPageViewProps {
  onLoginClick: () => void;
  onEnterLiveDemo: () => void;
  onRegisterSuccess: (user: User, token: string) => void;
}

export default function LandingPageView({ onLoginClick, onEnterLiveDemo, onRegisterSuccess }: LandingPageViewProps) {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showVideoDemoModal, setShowVideoDemoModal] = useState(false);
  const [heroPreviewTab, setHeroPreviewTab] = useState<"dashboard" | "kanban" | "fiscal" | "prancheta">("dashboard");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("ANNUAL");
  const [activeMigrationTab, setActiveMigrationTab] = useState<"graficos" | "prints">("graficos");
  const [selectedChartIndex, setSelectedChartIndex] = useState<number>(0);
  const [selectedPrintIndex, setSelectedPrintIndex] = useState<number>(0);

  // Estado do Menu Dropdown de Segmentos Atendidos (Inspirado no Online OS)
  const [isSegmentsMenuOpen, setIsSegmentsMenuOpen] = useState<boolean>(false);

  // Estado do Widget Flutuante WhatsApp
  const [showWhatsappFloatingTooltip, setShowWhatsappFloatingTooltip] = useState<boolean>(true);

  // Estado do Fluxo Passo a Passo
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(1);

  // Estado da Calculadora de Economia / ROI
  const [monthlyOsCount, setMonthlyOsCount] = useState<number>(45);
  const [avgTicket, setAvgTicket] = useState<number>(2400);

  // Estado do FAQ Accordion
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);

  // Cálculos dinâmicos da Calculadora de ROI
  const monthlyRevenue = monthlyOsCount * avgTicket;
  const laborPortion = monthlyRevenue * 0.40;
  const estimatedTaxSavings = Math.round(laborPortion * 0.075);
  const hoursSavedPerMonth = Math.round((monthlyOsCount * 35) / 60);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 selection:bg-cyan-500 selection:text-slate-950 font-sans relative overflow-x-hidden">
      
      {/* Background Grid Pattern & Ambient Glows */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1f293d0d_1px,transparent_1px),linear-gradient(to_bottom,#1f293d0d_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none -z-10"></div>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-cyan-500/10 via-indigo-500/5 to-transparent blur-[140px] pointer-events-none -z-10"></div>

      {/* 1. TOP NAVBAR COM GLASSMORPHISM AVANÇADO */}
      <header className="sticky top-0 z-40 bg-[#060913]/85 backdrop-blur-2xl border-b border-white/[0.08] px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          {/* Logo e Badge */}
          <div className="flex items-center gap-3">
            <AppLogo className="h-8 sm:h-9 w-auto object-contain cursor-pointer transition transform hover:scale-102" />
            <span className="bg-gradient-to-r from-cyan-500/15 to-blue-500/15 border border-cyan-400/30 text-cyan-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider hidden md:inline-flex items-center gap-1 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              SaaS Vertical Estética
            </span>
          </div>

          {/* Links de Navegação Rápida (Desktop) */}
          <nav className="hidden lg:flex items-center gap-5 text-xs font-semibold text-slate-300">
            {/* Menu Dropdown de Segmentos (Inspirado no Online OS) */}
            <div className="relative">
              <button
                onClick={() => setIsSegmentsMenuOpen(!isSegmentsMenuOpen)}
                onMouseEnter={() => setIsSegmentsMenuOpen(true)}
                className="hover:text-cyan-300 transition-colors cursor-pointer py-1 flex items-center gap-1 text-slate-200"
              >
                <span>Segmentos</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isSegmentsMenuOpen ? "rotate-180 text-cyan-400" : ""}`} />
              </button>

              {isSegmentsMenuOpen && (
                <div 
                  onMouseLeave={() => setIsSegmentsMenuOpen(false)}
                  className="absolute top-full left-0 mt-2 w-72 p-2 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl space-y-1 animate-fadeIn z-50"
                >
                  <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 border-b border-white/5">
                    Segmentos Especializados
                  </div>
                  {[
                    { title: "Assistências de Laser & IPL", desc: "Diodo 808nm, Alexandrite, Nd:YAG, troca de barras", icon: Flame },
                    { title: "Clínicas de Estética Avançada", desc: "Criolipólise, ultrassom microfocado, radiofrequência", icon: Sparkles },
                    { title: "Equipamentos Hospitalares & Médicos", desc: "Bombas de infusão, eletrocautério, laudo CREA", icon: ShieldCheck },
                    { title: "Odontologia & Esterilização", desc: "Autoclaves, motores de implante e compressores", icon: Wrench },
                    { title: "Fisioterapia & Eletroterapia", desc: "Ondas de choque, laserterapia de baixa potência", icon: Activity }
                  ].map((seg, idx) => {
                    const SegIcon = seg.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setIsSegmentsMenuOpen(false);
                          scrollToSection("recursos-bancada");
                        }}
                        className="w-full text-left p-2 rounded-xl hover:bg-white/5 transition flex items-start gap-2.5 cursor-pointer group"
                      >
                        <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-950 transition">
                          <SegIcon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition">{seg.title}</p>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{seg.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button 
              onClick={() => scrollToSection("como-funciona")} 
              className="hover:text-cyan-300 transition-colors cursor-pointer py-1"
            >
              Como Funciona
            </button>
            <button 
              onClick={() => scrollToSection("comparativo")} 
              className="hover:text-cyan-300 transition-colors cursor-pointer py-1"
            >
              Comparativo
            </button>
            <button 
              onClick={() => scrollToSection("recursos-bancada")} 
              className="hover:text-cyan-300 transition-colors cursor-pointer py-1"
            >
              Recursos
            </button>
            <button 
              onClick={() => scrollToSection("metricas-prints")} 
              className="hover:text-cyan-300 transition-colors cursor-pointer py-1"
            >
              Impacto & Telas
            </button>
            <button 
              onClick={() => scrollToSection("calculadora-roi")} 
              className="hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1.5 font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full shadow-inner"
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simulador</span>
            </button>
            <button 
              onClick={() => scrollToSection("planos-precos")} 
              className="hover:text-cyan-300 transition-colors cursor-pointer py-1"
            >
              Planos
            </button>
            <button 
              onClick={() => scrollToSection("perguntas-frequentes")} 
              className="hover:text-cyan-300 transition-colors cursor-pointer py-1"
            >
              FAQ
            </button>
          </nav>

          {/* Ações / CTAs da Navbar */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setShowVideoDemoModal(true)}
              className="text-xs font-bold text-emerald-300 hover:text-white px-3 sm:px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 shadow-sm"
              title="Assistir vídeo demonstrativo programático (30s)"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Vídeo Demo (30s)</span>
              <span className="sm:hidden">Vídeo</span>
            </button>

            <button
              onClick={onEnterLiveDemo}
              className="text-xs font-bold text-slate-200 hover:text-white px-3 sm:px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer bg-slate-900/90 hover:bg-slate-800 border border-white/10 shadow-sm"
              title="Abrir ambiente de demonstração com dados de exemplo"
            >
              <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
              <span className="hidden sm:inline">Ver Demonstração</span>
              <span className="sm:hidden">Demo</span>
            </button>

            <button
              onClick={onLoginClick}
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 sm:px-4 py-2 rounded-xl hover:bg-white/5 transition cursor-pointer hidden sm:inline"
            >
              Já sou cliente
            </button>

            <button
              onClick={() => setShowRegisterModal(true)}
              className="text-xs font-black bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 px-3.5 sm:px-4 py-2 rounded-xl shadow-lg shadow-cyan-500/20 transition transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              Testar 14 Dias Grátis
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION COM VISUAL DE ALTO IMPACTO */}
      <section className="relative pt-12 sm:pt-20 pb-20 px-4 sm:px-6 overflow-hidden">
        
        {/* Glow Central Hero */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[400px] bg-gradient-to-tr from-indigo-600/20 via-cyan-500/20 to-emerald-500/15 rounded-full blur-[150px] pointer-events-none"></div>

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-7">
          
          {/* Badge de Destaque Superior com Pulso Ciano */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-slate-900/90 via-slate-800/90 to-slate-900/90 border border-cyan-500/30 px-4 py-1.5 rounded-full text-xs font-bold text-cyan-300 shadow-xl backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>O 1º ERP Vertical para Assistências Técnicas de Estética, Lasers & Eletromédicos</span>
          </div>

          {/* Headline Principal de Alta Conversão (Message Match com WhatsApp) */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.12]">
            O ERP Especializado da sua Bancada: <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">Zero Bitributação</span> e Laudos com Fotos em 1 Clique.
          </h1>

          {/* Subtítulo Didático e Cirúrgico */}
          <p className="text-sm sm:text-lg text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
            Desenvolvido por quem vive a bancada: separe <strong>peças (NF-e) de serviço (NFS-e)</strong> automaticamente no Bling sem pagar imposto em duplicidade, acelere <strong>aprovações no WhatsApp</strong> e emita <strong>laudos periciais com fotos e laudo CREA</strong> com a sua logomarca.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <button
              onClick={() => setShowRegisterModal(true)}
              className="w-full sm:w-auto text-sm font-black bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 px-8 py-4 rounded-2xl shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2.5 transition transform hover:-translate-y-0.5 active:scale-98 cursor-pointer"
            >
              <span>Começar Teste de 14 Dias Grátis</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>

            <button
              onClick={onEnterLiveDemo}
              className="w-full sm:w-auto text-sm font-semibold bg-slate-900/80 hover:bg-slate-800 text-white border border-white/15 px-6 py-4 rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer shadow-sm backdrop-blur-md"
            >
              <Play className="w-4 h-4 text-cyan-400 fill-cyan-400" />
              <span>Explorar Demonstração Interativa</span>
            </button>

            <button
              onClick={() => setShowVideoDemoModal(true)}
              className="w-full sm:w-auto text-sm font-bold bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-500/40 px-6 py-4 rounded-2xl flex items-center justify-center gap-2.5 transition cursor-pointer shadow-lg shadow-emerald-500/10 backdrop-blur-md hover:-translate-y-0.5 active:scale-98"
            >
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Vídeo do Produto (30s)</span>
            </button>
          </div>

          {/* Badges de Confiança e Risco Zero */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-2 text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 14 dias grátis no Plano Pro
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/60 border border-white/10 px-3 py-1 rounded-full text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Sem necessidade de cartão
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/60 border border-white/10 px-3 py-1 rounded-full text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Setup guiado em 3 minutos
            </span>
          </div>

          {/* PREVIEW DO HERO: 3 Pilares com Visual Glassmorphic e Atalhos de Snapshot */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 text-left">
            
            <div 
              onClick={() => setHeroPreviewTab("dashboard")}
              className={`p-5 rounded-3xl border transition-all duration-300 backdrop-blur-xl shadow-xl hover:-translate-y-1 cursor-pointer ${
                heroPreviewTab === "dashboard" ? "bg-cyan-500/15 border-cyan-400/60 ring-2 ring-cyan-500/30" : "bg-slate-900/60 border-white/10 hover:border-cyan-500/40"
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400 mb-3.5">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white flex items-center justify-between">
                <span>Dashboard de Bancada</span>
                <span className="text-[10px] text-cyan-400 font-mono">Ver Print Real →</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Visão 360° da assistência técnica: faturamento, chamados urgentes e atalho rápido de OS.
              </p>
            </div>

            <div 
              onClick={() => setHeroPreviewTab("kanban")}
              className={`p-5 rounded-3xl border transition-all duration-300 backdrop-blur-xl shadow-xl hover:-translate-y-1 cursor-pointer ${
                heroPreviewTab === "kanban" ? "bg-emerald-500/15 border-emerald-400/60 ring-2 ring-emerald-500/30" : "bg-slate-900/60 border-white/10 hover:border-emerald-500/40"
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400 mb-3.5">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white flex items-center justify-between">
                <span>Quadro Kanban em Tempo Real</span>
                <span className="text-[10px] text-emerald-400 font-mono">Ver Print Real →</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Pipeline de triagem, manutenção ativa, trava de teste térmico e pronto para retirada.
              </p>
            </div>

            <div 
              onClick={() => setHeroPreviewTab("fiscal")}
              className={`p-5 rounded-3xl border transition-all duration-300 backdrop-blur-xl shadow-xl hover:-translate-y-1 cursor-pointer ${
                heroPreviewTab === "fiscal" ? "bg-indigo-500/15 border-indigo-400/60 ring-2 ring-indigo-500/30" : "bg-slate-900/60 border-white/10 hover:border-indigo-500/40"
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center text-indigo-400 mb-3.5">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white flex items-center justify-between">
                <span>Hub Fiscal Bling (Split)</span>
                <span className="text-[10px] text-indigo-400 font-mono">Ver Print Real →</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Faturamento bifásico: divide peças (NF-e) e mão de obra (NFS-e) sem bitributação na SEFAZ.
              </p>
            </div>

          </div>

          {/* MOCKUP INTERATIVO EM ABAS (SNAPSHOTS REAIS E AUTÊNTICOS DO OS-FLOW) */}
          <div className="pt-8 relative max-w-5xl mx-auto">
            <div className="rounded-3xl bg-slate-950 p-2 sm:p-3 border border-white/15 shadow-[0_25px_80px_rgba(0,0,0,0.85)] ring-1 ring-cyan-500/30 overflow-hidden relative group">
              
              {/* Barra Superior do Navegador com Seletor das Telas Reais */}
              <div className="bg-slate-900 px-4 py-2.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
                  </div>
                  
                  {/* Abas dos Snapshots Reais */}
                  <div className="flex flex-wrap items-center gap-1 ml-2 sm:ml-4 bg-slate-950/80 p-1 rounded-xl border border-white/10">
                    <button
                      onClick={() => setHeroPreviewTab("dashboard")}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        heroPreviewTab === "dashboard" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Dashboard Real</span>
                    </button>
                    <button
                      onClick={() => setHeroPreviewTab("kanban")}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        heroPreviewTab === "kanban" ? "bg-emerald-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Kanban de Bancada</span>
                    </button>
                    <button
                      onClick={() => setHeroPreviewTab("fiscal")}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        heroPreviewTab === "fiscal" ? "bg-indigo-500 text-white shadow-sm" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Hub Fiscal Bling</span>
                    </button>
                    <button
                      onClick={() => setHeroPreviewTab("prancheta")}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        heroPreviewTab === "prancheta" ? "bg-amber-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Prancheta Técnica</span>
                    </button>
                  </div>
                </div>

                <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Captura Real do Sistema OS-Flow v5.6</span>
                </span>
              </div>

              {/* Telas Reais dos Snapshots */}
              {heroPreviewTab === "dashboard" && (
                <div className="relative animate-fadeIn overflow-hidden rounded-b-xl">
                  <div className="bg-slate-950 px-4 py-1.5 text-[11px] font-mono text-slate-400 border-b border-white/5 flex justify-between items-center">
                    <span>app.osflow.com.br / dashboard</span>
                    <span className="text-emerald-400 font-bold">● Tela Real do Dashboard</span>
                  </div>
                  <img 
                    src="/snapshots/dashboard.png" 
                    alt="Snapshot Real do Dashboard OS-Flow" 
                    className="w-full h-auto rounded-b-xl object-cover shadow-2xl transition-all duration-500 hover:scale-[1.005]"
                    loading="eager"
                  />
                </div>
              )}

              {heroPreviewTab === "kanban" && (
                <div className="relative animate-fadeIn overflow-hidden rounded-b-xl">
                  <div className="bg-slate-950 px-4 py-1.5 text-[11px] font-mono text-slate-400 border-b border-white/5 flex justify-between items-center">
                    <span>app.osflow.com.br / kanban-bancada</span>
                    <span className="text-emerald-400 font-bold">● Tela Real do Quadro Kanban</span>
                  </div>
                  <img 
                    src="/snapshots/kanban.png" 
                    alt="Snapshot Real do Kanban de Bancada OS-Flow" 
                    className="w-full h-auto rounded-b-xl object-cover shadow-2xl transition-all duration-500 hover:scale-[1.005]"
                    loading="eager"
                  />
                </div>
              )}

              {heroPreviewTab === "fiscal" && (
                <div className="relative animate-fadeIn overflow-hidden rounded-b-xl">
                  <div className="bg-slate-950 px-4 py-1.5 text-[11px] font-mono text-slate-400 border-b border-white/5 flex justify-between items-center">
                    <span>app.osflow.com.br / fiscal-bling</span>
                    <span className="text-emerald-400 font-bold">● Tela Real do Faturamento Bifásico</span>
                  </div>
                  <img 
                    src="/snapshots/fiscal-bling.png" 
                    alt="Snapshot Real do Painel Fiscal Bling OS-Flow" 
                    className="w-full h-auto rounded-b-xl object-cover shadow-2xl transition-all duration-500 hover:scale-[1.005]"
                    loading="eager"
                  />
                </div>
              )}

              {heroPreviewTab === "prancheta" && (
                <div className="relative animate-fadeIn overflow-hidden rounded-b-xl">
                  <div className="bg-slate-950 px-4 py-1.5 text-[11px] font-mono text-slate-400 border-b border-white/5 flex justify-between items-center">
                    <span>app.osflow.com.br / os / prancheta-tecnica</span>
                    <span className="text-emerald-400 font-bold">● Tela Real da Prancheta Técnica de O.S</span>
                  </div>
                  <img 
                    src="/snapshots/prancheta-tecnica.png" 
                    alt="Snapshot Real da Prancheta Técnica OS-Flow" 
                    className="w-full h-auto rounded-b-xl object-cover shadow-2xl transition-all duration-500 hover:scale-[1.005]"
                    loading="eager"
                  />
                </div>
              )}

            </div>
          </div>

        </div>
      </section>

      {/* FAIXA DE AUTORIDADE: TECNOLOGIAS DE BANCADA & INTEGRAÇÕES HOMOLOGADAS (INSPIRADO NO ONLINE OS) */}
      <section className="py-8 px-4 sm:px-6 bg-slate-950/90 border-y border-white/[0.08] relative">
        <div className="max-w-7xl mx-auto space-y-4">
          <p className="text-[11px] font-bold text-center uppercase tracking-widest text-slate-400">
            Homologado para gerenciar as principais tecnologias de laser, estética e saúde do Brasil:
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 opacity-80 grayscale hover:grayscale-0 transition-all duration-500 text-xs sm:text-sm font-black text-slate-300">
            <span className="flex items-center gap-1.5 hover:text-cyan-400 transition">
              <Flame className="w-4 h-4 text-cyan-400" /> Soprano Ice & Titanium
            </span>
            <span className="flex items-center gap-1.5 hover:text-cyan-400 transition">
              <Zap className="w-4 h-4 text-cyan-400" /> Alma Lasers
            </span>
            <span className="flex items-center gap-1.5 hover:text-cyan-400 transition">
              <Activity className="w-4 h-4 text-cyan-400" /> Fotona Medical
            </span>
            <span className="flex items-center gap-1.5 hover:text-cyan-400 transition">
              <Cpu className="w-4 h-4 text-cyan-400" /> Solon & LMG
            </span>
            <span className="flex items-center gap-1.5 hover:text-cyan-400 transition">
              <ShieldCheck className="w-4 h-4 text-cyan-400" /> Milesman Diodo
            </span>
            <span className="flex items-center gap-1.5 hover:text-cyan-400 transition">
              <Sparkles className="w-4 h-4 text-cyan-400" /> Candela & Syneron
            </span>
            <span className="flex items-center gap-1.5 hover:text-cyan-400 transition">
              <Wrench className="w-4 h-4 text-cyan-400" /> Zye Laser
            </span>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-[10px] text-slate-400 font-semibold border-t border-white/5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-white/10 text-slate-300">
              <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
              Integração Oficial Bling ERP V3
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-white/10 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Validação SEFAZ (NF-e 4.0 / NFS-e)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-white/10 text-slate-300">
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              WhatsApp Cloud API Nativa
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-white/10 text-slate-300">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              Conformidade LGPD & Criptografia 256-bit
            </span>
          </div>
        </div>
      </section>

      {/* 3. NOVA SEÇÃO: COMPARATIVO LADO A LADO (SOFTWARES GENÉRICOS VS OS-FLOW) */}
      <section id="comparativo" className="py-20 px-4 sm:px-6 bg-gradient-to-b from-[#060913] via-slate-950 to-[#060913] border-t border-white/[0.08]">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-emerald-500/10 border border-white/10 px-4 py-1.5 rounded-full text-xs font-bold text-slate-300">
              <Scale className="w-3.5 h-3.5 text-cyan-400" />
              <span>COMPARAÇÃO DIRETA</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Softwares Genéricos vs. Especializado em Laser</h2>
            <p className="text-xs sm:text-sm text-slate-400">Entenda por que tentar adaptar ERPs genéricos ou planilhas custa caro para a sua oficina.</p>
          </div>

          <div className="rounded-3xl bg-slate-900/80 border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-950/80 text-slate-300">
                    <th className="p-4 sm:p-5 font-bold">Recurso / Necessidade de Oficina</th>
                    <th className="p-4 sm:p-5 font-bold text-slate-400 text-center w-1/3">Softwares Genéricos / Planilhas</th>
                    <th className="p-4 sm:p-5 font-black text-cyan-300 text-center w-1/3 bg-cyan-500/10 border-l border-r border-cyan-500/20">
                      OS-Flow SaaS
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {[
                    { feature: "Faturamento Bifásico (NF-e Peças + NFS-e Mão de Obra)", generic: "Não (Gera bitributação)", osflow: "Automático integrado ao Bling V3" },
                    { feature: "Aprovação de Orçamento via WhatsApp Interativo", generic: "Manual (E-mail ou PDF anexo)", osflow: "Link instantâneo com aprovação em 1 toque" },
                    { feature: "Checklist com Contador de Disparos e Fotos do Manípulo", generic: "Inexistente / Campo de texto solto", osflow: "Nativo com fotos e contagem de disparos" },
                    { feature: "Trava de Bancada & Teste Térmico de Estresse (30min)", generic: "Sem controle de bancada", osflow: "Obrigatório para liberação da garantia" },
                    { feature: "Gestão de Aparelho Reserva / Máquina Backup", generic: "Não suporta empréstimo", osflow: "Controle completo de contratos e devolução" },
                    { feature: "Validação Prévia de NCM de 8 Dígitos da SEFAZ", generic: "Erros manuais e notas rejeitadas", osflow: "Validação automática contra glosas" },
                    { feature: "Laudos em PDF White-Label com Assinatura e CREA", generic: "Modelos genéricos simples", osflow: "Alta resolução com seu logo e certificado" }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition">
                      <td className="p-4 sm:p-5 font-medium text-white">{row.feature}</td>
                      <td className="p-4 sm:p-5 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-1.5 text-rose-400">
                          <X className="w-4 h-4 flex-shrink-0" />
                          <span className="text-xs text-slate-400">{row.generic}</span>
                        </div>
                      </td>
                      <td className="p-4 sm:p-5 text-center bg-cyan-500/5 border-l border-r border-cyan-500/20 font-bold text-cyan-200">
                        <div className="flex items-center justify-center gap-1.5 text-emerald-400">
                          <Check className="w-4 h-4 flex-shrink-0 font-black" />
                          <span className="text-xs text-slate-100">{row.osflow}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </section>

      {/* 4. FLUXO INTERATIVO PASSO A PASSO DA ROTINA */}
      <section id="como-funciona" className="py-20 px-4 sm:px-6 bg-[#060913] border-t border-white/[0.08]">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-cyan-400/30 px-4 py-1.5 rounded-full text-xs font-bold text-cyan-300">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>FLUXO DE TRABALHO INTUITIVO</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Como o OS-Flow funciona na sua oficina em 4 passos:</h2>
            <p className="text-xs sm:text-sm text-slate-400">Clique nas etapas abaixo para ver exatamente como sua equipe ganha velocidade do balcão até a entrega.</p>
          </div>

          {/* Seletor dos 4 Passos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { step: 1, title: "1. Entrada & Checklist", desc: "Triagem com fotos e contagem de disparos", icon: Camera },
              { step: 2, title: "2. Diagnóstico & Peças", desc: "Orçamento com NCM e separação fiscal", icon: Wrench },
              { step: 3, title: "3. Aprovação WhatsApp", desc: "Link interativo para a clínica aprovar", icon: Send },
              { step: 4, title: "4. Teste & Faturamento", desc: "Teste de 30m + NF-e e NFS-e automáticas", icon: CheckCircle }
            ].map((item) => {
              const IconComp = item.icon;
              const isSelected = activeWorkflowStep === item.step;
              return (
                <button
                  key={item.step}
                  onClick={() => setActiveWorkflowStep(item.step)}
                  className={`p-4 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 border-cyan-400/60 shadow-xl shadow-cyan-500/10 ring-2 ring-cyan-500/20 translate-y-[-2px]"
                      : "bg-slate-900/40 border-white/10 hover:bg-slate-900/70 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-xl ${isSelected ? "bg-cyan-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-400"}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded ${isSelected ? "bg-cyan-500/20 text-cyan-300" : "text-slate-500"}`}>
                      Passo {item.step}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white mt-3">{item.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{item.desc}</p>
                </button>
              );
            })}
          </div>

          {/* CARD EXPLICATIVO INTERATIVO DO PASSO SELECIONADO */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/10 shadow-2xl backdrop-blur-xl">
            
            {/* PASSO 1: ENTRADA & CHECKLIST */}
            {activeWorkflowStep === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center animate-fadeIn">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-400/30">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Passo 1 de 4: Recepção & Triagem Técnica</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">Receba o equipamento com checklist fotográfico e proteção jurídica total</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Assim que a máquina ou manípulo chega na oficina, a atendente registra o número de série, fotos de avarias estéticas existentes e o contador de disparos atual. Um termo de entrada em PDF é gerado automaticamente.
                  </p>
                  
                  <div className="space-y-2.5 pt-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Fotos anexadas direto pelo celular ou webcam da bancada</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Termo de entrada assinado no balcão ou enviado por WhatsApp</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Histórico completo de manutenções anteriores do cliente</span>
                    </div>
                  </div>
                </div>

                {/* Mockup Visual com Snapshot Real do Passo 1 */}
                <div className="space-y-3">
                  <div className="rounded-2xl bg-slate-950 border border-cyan-500/30 overflow-hidden shadow-2xl group">
                    <div className="bg-slate-900 px-3.5 py-2 border-b border-white/10 flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-2 text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                        Wizard de Entrada & Triagem da O.S
                      </span>
                      <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-mono">Snapshot Real</span>
                    </div>
                    <div className="overflow-hidden bg-slate-950">
                      <img 
                        src="/snapshots/nova-os-wizard.png" 
                        alt="Snapshot Real: Wizard de Nova Ordem de Serviço com Checklist" 
                        className="w-full h-auto object-cover max-h-[340px] group-hover:scale-102 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  </div>
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Checklist de entrada com fotos, avarias e contagem de disparos</span>
                  </div>
                </div>
              </div>
            )}

            {/* PASSO 2: DIAGNÓSTICO & PEÇAS */}
            {activeWorkflowStep === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center animate-fadeIn">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-400/30">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Passo 2 de 4: Orçamento & Mão de Obra</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">Adicione peças e mão de obra com cálculo fiscal em tempo real</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    O técnico seleciona os componentes do estoque com NCM já validado pela SEFAZ. O sistema separa automaticamente o que é venda de mercadoria (peças) e o que é serviço (calibração/revisão).
                  </p>
                  
                  <div className="space-y-2.5 pt-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                      <span>Catálogo de peças com NCM de 8 dígitos para evitar glosas</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                      <span>Cálculo de margem de lucro e custo de bancada em tempo real</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                      <span>Opção de vincular máquina substituta (aparelho backup)</span>
                    </div>
                  </div>
                </div>

                {/* Mockup Visual com Snapshot Real do Passo 2 */}
                <div className="space-y-3">
                  <div className="rounded-2xl bg-slate-950 border border-indigo-500/30 overflow-hidden shadow-2xl group">
                    <div className="bg-slate-900 px-3.5 py-2 border-b border-white/10 flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-2 text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                        Prancheta Técnica & Diagnóstico de Bancada
                      </span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">Snapshot Real</span>
                    </div>
                    <div className="overflow-hidden bg-slate-950">
                      <img 
                        src="/snapshots/prancheta-tecnica.png" 
                        alt="Snapshot Real: Prancheta Técnica da O.S" 
                        className="w-full h-auto object-cover max-h-[340px] group-hover:scale-102 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  </div>
                  <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[11px] text-indigo-300 flex items-center justify-between">
                    <span>Validação prévia de NCM de 8 dígitos para cada peça</span>
                    <strong className="text-white">SEFAZ OK</strong>
                  </div>
                </div>
              </div>
            )}

            {/* PASSO 3: APROVAÇÃO WHATSAPP */}
            {activeWorkflowStep === 3 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center animate-fadeIn">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-400/30">
                    <Send className="w-3.5 h-3.5" />
                    <span>Passo 3 de 4: Envio & Aprovação Instantânea</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">O cliente aprova com 1 toque no celular sem precisar de e-mail</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Com 1 clique, o sistema gera a mensagem com link oficial no WhatsApp do cliente da clínica. Ele confere o laudo com fotos e clica em <strong>"Aprovar Orçamento"</strong>, atualizando o status na bancada na mesma hora.
                  </p>
                  
                  <div className="space-y-2.5 pt-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Tempo médio de aprovação reduzido de 48h para menos de 15 minutos</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Registro com data, hora e IP da aprovação do cliente</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Aviso sonoro e visual instantâneo na bancada técnica</span>
                    </div>
                  </div>
                </div>

                {/* Mockup Visual do Passo 3 */}
                <div className="space-y-3">
                  <div className="max-w-md mx-auto p-4 rounded-2xl bg-[#0b141a] border border-emerald-500/30 space-y-3 font-sans shadow-2xl">
                    <div className="flex items-center gap-2.5 border-b border-emerald-500/20 pb-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-xs">
                        OS
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white">OS-Flow Notificações WhatsApp</h5>
                        <span className="text-[9px] text-emerald-400">Online • Orçamento #2490</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#1f2c34] text-xs space-y-2 text-slate-200">
                      <p className="text-[11px]">Olá, Dra. Camila! O orçamento do seu <strong>Laser Soprano</strong> está pronto para revisão.</p>
                      <div className="bg-[#111b21] p-2 rounded-lg text-[10px] space-y-1">
                        <div className="flex justify-between"><span>Subtotal Peças:</span><strong>R$ 1.850,00</strong></div>
                        <div className="flex justify-between"><span>Mão de Obra:</span><strong>R$ 650,00</strong></div>
                        <div className="flex justify-between text-emerald-400 font-bold text-xs pt-1 border-t border-white/10"><span>Total:</span><span>R$ 2.500,00</span></div>
                      </div>
                      <button className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer">
                        <Check className="w-3.5 h-3.5" /> Aprovar Orçamento (1 Toque)
                      </button>
                    </div>
                  </div>

                  {/* Snapshot Real de Clientes e Aparelhos */}
                  <div className="rounded-xl bg-slate-950 border border-white/10 overflow-hidden shadow-xl">
                    <div className="px-3 py-1.5 bg-slate-900 text-[10px] text-slate-400 flex justify-between items-center border-b border-white/5">
                      <span>Gestão de Aparelhos e Histórico do Cliente</span>
                      <span className="text-cyan-400 font-mono">Snapshot Real</span>
                    </div>
                    <img 
                      src="/snapshots/clientes-equipamentos.png" 
                      alt="Snapshot Real: Gestão de Clientes e Aparelhos" 
                      className="w-full h-auto object-cover max-h-[140px]"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PASSO 4: TESTE DE ESTRESSE & FATURAMENTO */}
            {activeWorkflowStep === 4 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center animate-fadeIn">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-400/30">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Passo 4 de 4: Finalização & Faturamento Bifásico</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">Teste térmico de 30 min e faturamento automático no Bling</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    O sistema bloqueia a saída até que o teste térmico seja concluído com sucesso. Na liberação, são emitidas a <strong>NF-e de peças</strong> e a <strong>NFS-e de serviços</strong> separadamente, com laudo de calibração em anexo.
                  </p>
                  
                  <div className="space-y-2.5 pt-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                      <span>Zero retorno em garantia com aferição de temperatura do cristal</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                      <span>Emissão simultânea de NF-e e NFS-e integradas ao Bling V3</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                      <span>Certificado de calibração com validade de 12 meses gerado em PDF</span>
                    </div>
                  </div>
                </div>

                {/* Mockup Visual com Snapshot Real do Passo 4 */}
                <div className="space-y-3">
                  <div className="rounded-2xl bg-slate-950 border border-cyan-500/30 overflow-hidden shadow-2xl group">
                    <div className="bg-slate-900 px-3.5 py-2 border-b border-white/10 flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-2 text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Faturamento Bifásico Bling & SEFAZ
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">Snapshot Real</span>
                    </div>
                    <div className="overflow-hidden bg-slate-950">
                      <img 
                        src="/snapshots/fiscal-bling.png" 
                        alt="Snapshot Real: Integração Fiscal Bling e Faturamento Bifásico" 
                        className="w-full h-auto object-cover max-h-[340px] group-hover:scale-102 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  </div>
                  <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-[11px] text-cyan-300 flex items-center justify-between">
                    <span>Divisão automática: NF-e Peças + NFS-e Mão de Obra</span>
                    <strong className="text-emerald-400">Zero Bitributação</strong>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* 5. CALCULADORA INTERATIVA DE ROI E ECONOMIA FISCAL */}
      <section id="calculadora-roi" className="py-20 px-4 sm:px-6 bg-[#050810] border-t border-white/[0.08] relative overflow-hidden">
        
        {/* Glows */}
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-[160px] pointer-events-none"></div>

        <div className="max-w-6xl mx-auto space-y-12 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-400/30 px-4 py-1.5 rounded-full text-xs font-bold text-emerald-300">
              <Calculator className="w-3.5 h-3.5 text-emerald-400" />
              <span>SIMULADOR DE ECONOMIA REAL</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Quanto a sua assistência deixa na mesa todo mês sem o OS-Flow?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Ajuste os controles abaixo de acordo com a realidade da sua oficina e veja o impacto financeiro imediato.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Lado Esquerdo: Controles Interativos (Sliders) */}
            <div className="lg:col-span-6 p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/10 space-y-6 shadow-2xl backdrop-blur-xl">
              
              <div className="flex items-center gap-2 pb-3 border-b border-white/10 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Dados da sua Oficina</span>
              </div>

              {/* Slider 1: Número de OS por Mês */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs sm:text-sm font-semibold text-slate-200">
                    Ordens de Serviço por Mês:
                  </label>
                  <span className="text-base sm:text-lg font-black text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded-xl">
                    {monthlyOsCount} OS / mês
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="150"
                  step="5"
                  value={monthlyOsCount}
                  onChange={(e) => setMonthlyOsCount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>5 OS</span>
                  <span>75 OS</span>
                  <span>150+ OS</span>
                </div>
              </div>

              {/* Slider 2: Ticket Médio por Reparo */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs sm:text-sm font-semibold text-slate-200">
                    Valor Médio por Reparo (R$):
                  </label>
                  <span className="text-base sm:text-lg font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-xl">
                    R$ {avgTicket.toLocaleString("pt-BR")}
                  </span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="8000"
                  step="100"
                  value={avgTicket}
                  onChange={(e) => setAvgTicket(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>R$ 500</span>
                  <span>R$ 4.000</span>
                  <span>R$ 8.000+</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Movimentação Bruta Mensal:</span>
                  <strong className="text-white">R$ {monthlyRevenue.toLocaleString("pt-BR")}/mês</strong>
                </div>
                <p className="text-[10px] text-slate-500">Estimativa calculada com base no mix de peças e mão de obra de bancada estética.</p>
              </div>

            </div>

            {/* Lado Direito: Resultados e Economia Calculada */}
            <div className="lg:col-span-6 space-y-4">
              
              {/* Card 1: Economia em Impostos */}
              <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border-2 border-emerald-500/40 shadow-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Economia Estimada de Impostos (Bifásico)
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-400 text-slate-950 px-2 py-0.5 rounded">
                    Recuperado Todo Mês
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-emerald-400">
                  R$ {estimatedTaxSavings.toLocaleString("pt-BR")} <span className="text-sm text-slate-400 font-normal">/ mês</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Eliminando a bitributação ao emitir NFS-e municipal separada da NF-e de peças no Bling. No ano, isso representa <strong>R$ {(estimatedTaxSavings * 12).toLocaleString("pt-BR")}</strong> a mais no caixa da oficina.
                </p>
              </div>

              {/* Card 2: Horas Poupadas no WhatsApp */}
              <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/80 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    Tempo Poupado pela Equipe
                  </span>
                  <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">
                    Produtividade
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-cyan-300">
                  {hoursSavedPerMonth} Horas <span className="text-sm text-slate-400 font-normal">/ mês</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Com o envio automatizado e aprovação em 1 clique pelo WhatsApp, seus técnicos e atendentes não perdem tempo ligando ou negociando por mensagem manual.
                </p>
              </div>

              {/* CTA Rápido da Calculadora */}
              <button
                onClick={() => setShowRegisterModal(true)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/10 cursor-pointer"
              >
                <span>Recuperar Essa Economia Agora (14 Dias Grátis)</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </div>

          </div>

        </div>
      </section>

      {/* 6. SEÇÃO DE IMPACTO & SHOWCASE DE TELAS DO SISTEMA */}
      <section id="metricas-prints" className="py-20 px-4 sm:px-6 bg-gradient-to-b from-[#060913] via-slate-950 to-[#060913] relative overflow-hidden border-t border-white/[0.08]">
        <div className="max-w-7xl mx-auto space-y-12 relative z-10">
          
          {/* Cabeçalho da Seção */}
          <div className="text-center max-w-4xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-400/30 px-4 py-1.5 rounded-full text-xs font-bold text-cyan-300">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>DADOS DE IMPACTO & SHOWCASE DE INTERFACE</span>
            </div>

            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Por que as Assistências Estão Migrando para o <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">OS Flow</span>?
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl mx-auto leading-relaxed">
              Diferente de ERPs genéricos ou planilhas vulneráveis, o OS Flow foi feito sob medida para bancadas de laser, estética e saúde. Veja os números reais de migração e navegue pelos prints do sistema.
            </p>

            {/* Alternador de Visões: Gráficos vs Prints */}
            <div className="flex justify-center pt-2">
              <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-white/10 inline-flex items-center gap-2 shadow-2xl backdrop-blur-md">
                <button
                  onClick={() => setActiveMigrationTab("graficos")}
                  className={`px-5 sm:px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                    activeMigrationTab === "graficos"
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/25"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Gráficos de Impacto & ROI</span>
                </button>

                <button
                  onClick={() => setActiveMigrationTab("prints")}
                  className={`px-5 sm:px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                    activeMigrationTab === "prints"
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/25"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Laptop className="w-4 h-4" />
                  <span>Prints Reais do Sistema</span>
                </button>
              </div>
            </div>
          </div>

          {/* VISÃO 1: GRÁFICOS DE IMPACTO */}
          {activeMigrationTab === "graficos" && (
            <div className="space-y-8 animate-fadeIn">
              {/* Seletor Rápido de Gráficos */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { title: "Faturamento Líquido", val: "+44.5%", desc: "Recuperação com Faturamento Bifásico", icon: DollarSign, color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10" },
                  { title: "Tempo de Aprovação", val: "14 min", desc: "Reduzido de 48h com WhatsApp", icon: Clock, color: "text-cyan-400", border: "border-cyan-500/30", bg: "bg-cyan-500/10" },
                  { title: "Retorno em Garantia", val: "0.3%", desc: "Queda de 16.5% com Teste Térmico", icon: ShieldCheck, color: "text-indigo-400", border: "border-indigo-500/30", bg: "bg-indigo-500/10" },
                  { title: "Motivos da Migração", val: "100%", desc: "Pesquisa com 120+ oficinas", icon: PieChart, color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10" }
                ].map((item, idx) => {
                  const IconComp = item.icon;
                  const isSelected = selectedChartIndex === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedChartIndex(idx)}
                      className={`p-4 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                        isSelected 
                          ? `${item.border} bg-slate-900/90 shadow-xl ring-2 ring-cyan-400/40 translate-y-[-2px]`
                          : "border-white/[0.08] bg-slate-900/40 hover:bg-slate-900/70 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-xl ${item.bg} ${item.color}`}>
                          <IconComp className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <span className={`text-base sm:text-lg font-black ${item.color}`}>{item.val}</span>
                      </div>
                      <h4 className="text-xs font-bold text-white mt-3">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{item.desc}</p>
                    </button>
                  );
                })}
              </div>

              {/* CARD DETALHADO DO GRÁFICO SELECIONADO */}
              <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/10 shadow-2xl backdrop-blur-xl relative">
                
                {/* GRÁFICO 0: AUMENTO DE FATURAMENTO LÍQUIDO */}
                {selectedChartIndex === 0 && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                      <div>
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                          <DollarSign className="w-4 h-4" />
                          <span>Métrica 1: Crescimento do Faturamento Mensal</span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1">Comparativo de Lucratividade: Sem OS Flow x Com OS Flow</h3>
                      </div>
                      <span className="bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto">
                        +44.5% de Lucro Real Recuperado
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Ao eliminar a bitributação no faturamento de peças e mão de obra (NF-e + NFS-e separadas) e agilizar aprovações no WhatsApp, a assistência média recupera milhares de reais por mês.
                    </p>

                    <div className="space-y-6 pt-2">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-400">Softwares Genéricos / Planilhas (Sem Faturamento Bifásico)</span>
                          <span className="text-slate-300 font-bold">R$ 28.500 / mês</span>
                        </div>
                        <div className="w-full h-8 bg-slate-800 rounded-xl overflow-hidden p-1 flex items-center">
                          <div className="h-full bg-slate-600 rounded-lg w-[60%] flex items-center justify-end px-3 text-[10px] font-bold text-white">
                            60% Eficiência Fiscal
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-cyan-400" />
                            Com OS-Flow SaaS (Faturamento Bifásico + Orçamentos WhatsApp)
                          </span>
                          <span className="text-emerald-400 font-black text-sm">R$ 41.200 / mês</span>
                        </div>
                        <div className="w-full h-10 bg-slate-800/80 rounded-xl overflow-hidden p-1 flex items-center border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
                          <div className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 rounded-lg w-[92%] flex items-center justify-between px-3 text-xs font-black text-slate-950">
                            <span>Bancada Otimizada</span>
                            <span className="bg-slate-950/80 text-emerald-300 px-2 py-0.5 rounded text-[10px]">+ R$ 12.700/mês</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                        <span className="text-slate-400 block text-[11px]">Economia de Impostos</span>
                        <span className="text-emerald-400 font-bold text-sm mt-0.5 block">Zero Bitributação</span>
                        <p className="text-[10px] text-slate-400 mt-1">NFS-e de mão de obra emitida separadamente das peças.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                        <span className="text-slate-400 block text-[11px]">Glosas de Peças</span>
                        <span className="text-cyan-400 font-bold text-sm mt-0.5 block">Eliminadas (100%)</span>
                        <p className="text-[10px] text-slate-400 mt-1">Validação prévia de NCM de 8 dígitos da SEFAZ.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                        <span className="text-slate-400 block text-[11px]">Giro de Bancada</span>
                        <span className="text-blue-400 font-bold text-sm mt-0.5 block">2.4x Mais Rápido</span>
                        <p className="text-[10px] text-slate-400 mt-1">Orçamentos aprovados antes das peças acumularem.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* GRÁFICO 1: TEMPO DE APROVAÇÃO */}
                {selectedChartIndex === 1 && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                      <div>
                        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                          <Clock className="w-4 h-4" />
                          <span>Métrica 2: Velocidade de Aprovação de Orçamentos</span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1">Redução Extrema de Espera: De 48 Horas para 14 Minutos</h3>
                      </div>
                      <span className="bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto">
                        Aprovação no WhatsApp com 1 Clique
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Em vez de ligar para a clínica ou mandar PDFs pesados por e-mail, o OS-Flow envia uma mensagem formatada no WhatsApp com link direto para aprovação instantânea pelo proprietário da clínica.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-rose-300">Método Tradicional (E-mail/PDFs)</span>
                          <span className="text-xl font-black text-rose-400">48 Horas</span>
                        </div>
                        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                          <div className="bg-rose-500 h-full w-[100%]"></div>
                        </div>
                        <ul className="space-y-1.5 text-[11px] text-slate-400 pt-1">
                          <li className="flex items-center gap-1.5"><X className="w-3.5 h-3.5 text-rose-400" /> Cliente demora para abrir o e-mail</li>
                          <li className="flex items-center gap-1.5"><X className="w-3.5 h-3.5 text-rose-400" /> Dúvidas técnicas travam a bancada por dias</li>
                          <li className="flex items-center gap-1.5"><X className="w-3.5 h-3.5 text-rose-400" /> Equipamento parado ocupando espaço</li>
                        </ul>
                      </div>

                      <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-3 shadow-lg shadow-cyan-500/10">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                            <MessageSquare className="w-4 h-4 text-emerald-400" /> OS-Flow Link Interativo WhatsApp
                          </span>
                          <span className="text-2xl font-black text-cyan-300">14 Minutos</span>
                        </div>
                        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                          <div className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full w-[15%]"></div>
                        </div>
                        <ul className="space-y-1.5 text-[11px] text-slate-200 pt-1">
                          <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Notificação no celular do dono da clínica</li>
                          <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Laudo visual com fotos das peças e do manípulo</li>
                          <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Botão verde "Aprovar Orçamento" direto no link</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* GRÁFICO 2: RETORNO EM GARANTIA */}
                {selectedChartIndex === 2 && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                      <div>
                        <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Métrica 3: Qualidade de Bancada & Retorno em Garantia</span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1">Queda Drástica de Refugo: De 16.5% para Apenas 0.3%</h3>
                      </div>
                      <span className="bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto">
                        Trava Obrigatória de Teste Térmico
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Equipamentos de laser e estética necessitam de aferição térmica rigorosa. O OS Flow bloqueia o status "Pronto para Entrega" até que o técnico registre o checklist de bancada e o Teste de Estresse de 30 minutos.
                    </p>

                    <div className="p-6 rounded-2xl bg-slate-950/80 border border-white/10 space-y-4">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-400">Evolução do Índice de Retorno em Garantia (Meses de Bancada)</span>
                        <span className="text-emerald-400">-98% de Redução em Retrabalho</span>
                      </div>

                      <div className="grid grid-cols-4 gap-3 pt-2">
                        <div className="space-y-2 text-center">
                          <div className="h-32 bg-slate-900 rounded-xl flex items-end justify-center p-2 border border-white/5">
                            <div className="w-full bg-rose-500/80 rounded-lg h-[90%] flex items-center justify-center text-white text-xs font-extrabold">16.5%</div>
                          </div>
                          <span className="text-[11px] text-slate-400 block font-semibold">Sem Checklist</span>
                        </div>

                        <div className="space-y-2 text-center">
                          <div className="h-32 bg-slate-900 rounded-xl flex items-end justify-center p-2 border border-white/5">
                            <div className="w-full bg-amber-500/80 rounded-lg h-[50%] flex items-center justify-center text-white text-xs font-extrabold">8.2%</div>
                          </div>
                          <span className="text-[11px] text-slate-400 block font-semibold">Mês 1 (OS Flow)</span>
                        </div>

                        <div className="space-y-2 text-center">
                          <div className="h-32 bg-slate-900 rounded-xl flex items-end justify-center p-2 border border-white/5">
                            <div className="w-full bg-blue-500/80 rounded-lg h-[20%] flex items-center justify-center text-white text-xs font-extrabold">2.1%</div>
                          </div>
                          <span className="text-[11px] text-slate-400 block font-semibold">Mês 2 (OS Flow)</span>
                        </div>

                        <div className="space-y-2 text-center">
                          <div className="h-32 bg-slate-900 rounded-xl flex items-end justify-center p-2 border border-cyan-500/40 shadow-lg shadow-cyan-500/10">
                            <div className="w-full bg-gradient-to-t from-emerald-500 to-cyan-400 rounded-lg h-[8%] flex items-center justify-center text-slate-950 text-xs font-black">0.3%</div>
                          </div>
                          <span className="text-[11px] text-emerald-400 block font-bold">Estável (Teste 30m)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* GRÁFICO 3: MOTIVOS DE MIGRAÇÃO */}
                {selectedChartIndex === 3 && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                      <div>
                        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                          <PieChart className="w-4 h-4" />
                          <span>Métrica 4: Principais Motivos Declarados pelas Assistências</span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1">Por que os Proprietários Decidiram Migrar para o OS Flow?</h3>
                      </div>
                      <span className="bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto">
                        Pesquisa com 120+ Assistências de Saúde & Estética
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2">
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-cyan-300">1. Faturamento Bifásico (NF-e Peças + NFS-e Mão de Obra)</span>
                            <span className="text-cyan-400 font-extrabold">38%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                            <div className="bg-cyan-400 h-full w-[38%]"></div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-emerald-300">2. Aprovação de Orçamento pelo WhatsApp com 1 Clique</span>
                            <span className="text-emerald-400 font-extrabold">27%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                            <div className="bg-emerald-400 h-full w-[27%]"></div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-indigo-300">3. Laudos de Calibração Laser com Gráficos e Logo</span>
                            <span className="text-indigo-400 font-extrabold">21%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                            <div className="bg-indigo-400 h-full w-[21%]"></div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-amber-300">4. Gestão de Equipamento Backup / Máquina Reserva</span>
                            <span className="text-amber-400 font-extrabold">14%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                            <div className="bg-amber-400 h-full w-[14%]"></div>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-slate-950 border border-white/10 space-y-3">
                        <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Conclusão da Pesquisa de Migração</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Softwares genéricos tratam o reparo de um manípulo de laser de R$ 15.000 igual à venda de uma camiseta. O OS-Flow foi desenvolvido especificamente para gerenciar parâmetros técnicos, calibração, garantia e suporte fiscal especializado.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VISÃO 2: PRINTS REAIS DO SISTEMA */}
          {activeMigrationTab === "prints" && (
            <div className="space-y-8 animate-fadeIn">
              {/* Seletor de Prints */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                {[
                  { title: "Kanban de Bancada Laser", icon: Activity },
                  { title: "Orçamento & WhatsApp", icon: Smartphone },
                  { title: "Faturamento Bifásico SEFAZ", icon: FileText },
                  { title: "Laudo & Calibração PDF", icon: ShieldCheck }
                ].map((print, idx) => {
                  const IconComp = print.icon;
                  const isSelected = selectedPrintIndex === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedPrintIndex(idx)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? "bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 shadow-lg shadow-cyan-500/10"
                          : "bg-slate-900/60 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-900"
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                      <span>{print.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* CONTAINER DOS PRINTS DO SISTEMA */}
              <div className="rounded-3xl bg-slate-950 border border-white/10 shadow-2xl overflow-hidden">
                
                {/* Header Estilo Janela do Sistema */}
                <div className="bg-slate-900 px-6 py-3 border-b border-white/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
                      <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
                      <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px] ml-2">os-flow-saas.app / dashboard / bancada-laser</span>
                  </div>
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Ambiente em Produção (OS-Flow v5.2)</span>
                  </div>
                </div>

                {/* CONTEÚDO DO PRINT 0: KANBAN DE BANCADA */}
                {selectedPrintIndex === 0 && (
                  <div className="p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                          <Activity className="w-5 h-5 text-cyan-400" />
                          <span>Print 1: Gestão de Bancada Técnica & Workflow de Laser</span>
                        </h4>
                        <p className="text-xs text-slate-400">Controle visual por cartões com status de manípulos, contadores de disparos e travamento térmico.</p>
                      </div>
                      <span className="bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-[11px] font-bold px-3 py-1 rounded-full self-start sm:self-auto">
                        Múltiplas Bancadas Simultâneas
                      </span>
                    </div>

                    {/* Snapshot Real: Kanban de Bancada */}
                    <div className="rounded-2xl bg-slate-950 border border-cyan-500/30 overflow-hidden shadow-2xl relative group">
                      <div className="bg-slate-900/90 px-4 py-2 border-b border-white/10 flex items-center justify-between text-xs backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span className="font-mono text-slate-300 text-[11px]">Captura Real da Tela de Produção: Bancada Kanban</span>
                        </div>
                        <span className="bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold">
                          100% Tela Real
                        </span>
                      </div>
                      <div className="overflow-hidden bg-slate-950">
                        <img 
                          src="/snapshots/kanban.png" 
                          alt="Snapshot Real do Kanban de Bancada Técnica OS-Flow" 
                          className="w-full h-auto object-cover max-h-[520px] transition-transform duration-700 group-hover:scale-101"
                          loading="lazy"
                        />
                      </div>
                    </div>

                    {/* Destaques Técnicos Explicativos do Print */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                      <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                          <span>Triagem & Contagem de Disparos</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Cada cartão exibe a foto do manípulo, total de disparos aferidos na entrada e prioridade de atendimento do cliente.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/20 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                          <Flame className="w-4 h-4 text-cyan-400" />
                          <span>Teste Térmico de Estresse (30min)</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Temporizador integrado que bloqueia a liberação até comprovar temperatura do cristal abaixo de 20°C sob carga contínua.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Laudo Digital e Liberação com 1 Toque</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Gera o certificado de calibração em PDF, notifica o financeiro e dispara o aviso de retirada para a clínica no WhatsApp.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* CONTEÚDO DO PRINT 1: CLIENTES & WHATSAPP */}
                {selectedPrintIndex === 1 && (
                  <div className="p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                          <Smartphone className="w-5 h-5 text-emerald-400" />
                          <span>Print 2: Gestão de Clientes, Máquinas & Aprovação no WhatsApp</span>
                        </h4>
                        <p className="text-xs text-slate-400">Histórico de calibração do equipamento no sistema com envio de link interativo para o dono da clínica aprovar em 1 toque.</p>
                      </div>
                      <span className="bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold px-3 py-1 rounded-full self-start sm:self-auto">
                        Integração WhatsApp API Oficial
                      </span>
                    </div>

                    {/* Grid: Snapshot Real do Sistema + Card Interativo do WhatsApp */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                      
                      {/* Lado Esquerdo: Snapshot Real da Gestão de Clientes e Aparelhos */}
                      <div className="lg:col-span-7 rounded-2xl bg-slate-950 border border-emerald-500/30 overflow-hidden shadow-2xl group">
                        <div className="bg-slate-900/90 px-4 py-2 border-b border-white/10 flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-300 text-[11px]">Sistema: Ficha do Aparelho & Histórico de Manípulos</span>
                          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono text-[10px] font-bold">Snapshot Real</span>
                        </div>
                        <div className="overflow-hidden bg-slate-950">
                          <img 
                            src="/snapshots/clientes-equipamentos.png" 
                            alt="Snapshot Real: Gestão de Clientes e Equipamentos Médicos" 
                            className="w-full h-auto object-cover max-h-[380px] transition-transform duration-700 group-hover:scale-101"
                            loading="lazy"
                          />
                        </div>
                      </div>

                      {/* Lado Direito: Preview Realista do WhatsApp que a Clínica Recebe */}
                      <div className="lg:col-span-5 p-4 rounded-3xl bg-[#0b141a] border border-emerald-500/30 shadow-2xl space-y-3 font-sans">
                        <div className="flex items-center gap-3 border-b border-emerald-500/20 pb-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-xs">
                            OS
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-white">OS-Flow Assistência Técnica</h5>
                            <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Notificação Oficial de Orçamento
                            </p>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-[#1f2c34] border border-white/5 space-y-2.5 text-xs text-slate-200">
                          <p className="font-semibold text-white">Olá, Dra. Juliana! 👋</p>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            Seu equipamento <strong>Laser Soprano Ice (OS #2490)</strong> passou pela bancada de diagnóstico e o laudo de calibração está pronto.
                          </p>

                          <div className="p-2.5 rounded-xl bg-[#111b21] border border-emerald-500/30 space-y-1">
                            <div className="flex justify-between font-bold text-[11px]">
                              <span>Troca de Célula Peltier & Calibração:</span>
                              <span className="text-emerald-400">R$ 2.450,00</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>Garantia de Bancada:</span>
                              <span>90 Dias com Teste Térmico</span>
                            </div>
                          </div>

                          <div className="pt-2 flex flex-col gap-2">
                            <button className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow">
                              <Check className="w-4 h-4" />
                              <span>Aprovar Orçamento Agora (1 Clique)</span>
                            </button>
                            <button className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-[11px] transition text-center cursor-pointer">
                              Visualizar Laudo Técnico Completo em PDF
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* CONTEÚDO DO PRINT 2: FATURAMENTO BIFÁSICO */}
                {selectedPrintIndex === 2 && (
                  <div className="p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-400" />
                          <span>Print 3: Painel de Faturamento Bifásico & Integração Bling / SEFAZ</span>
                        </h4>
                        <p className="text-xs text-slate-400">Divisão automática de NF-e (peças) e NFS-e (mão de obra) sem erros manuais nem bitributação.</p>
                      </div>
                      <span className="bg-blue-500/10 border border-blue-400/30 text-blue-300 text-[11px] font-bold px-3 py-1 rounded-full self-start sm:self-auto">
                        Integração Bling V3 & SEFAZ
                      </span>
                    </div>

                    {/* Snapshot Real: Painel Fiscal do Bling */}
                    <div className="rounded-2xl bg-slate-950 border border-blue-500/30 overflow-hidden shadow-2xl group">
                      <div className="bg-slate-900/90 px-4 py-2 border-b border-white/10 flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-300 text-[11px]">Módulo Fiscal: Emissão Direta de NF-e + NFS-e Bifásica</span>
                        <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-mono text-[10px] font-bold">Snapshot Real</span>
                      </div>
                      <div className="overflow-hidden bg-slate-950">
                        <img 
                          src="/snapshots/fiscal-bling.png" 
                          alt="Snapshot Real: Módulo de Faturamento Bifásico e Integração Fiscal Bling" 
                          className="w-full h-auto object-cover max-h-[460px] transition-transform duration-700 group-hover:scale-101"
                          loading="lazy"
                        />
                      </div>
                    </div>

                    {/* Resumo da Divisão e Economia Fiscal */}
                    <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-cyan-300">NF-e Peças & Componentes</span>
                            <span className="bg-cyan-500/20 text-cyan-300 text-[10px] px-2 py-0.5 rounded font-bold">Emitida Bling</span>
                          </div>
                          <p className="text-lg font-extrabold text-white">R$ 2.450,00</p>
                          <p className="text-[10px] text-slate-400">NCM Validado: 9018.90.99 (Equipamentos Médicos/Estéticos)</p>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-2">
                          <div className="flex justify-between items-start text-xs">
                            <span className="font-bold text-indigo-300">NFS-e Mão de Obra Municipal</span>
                            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded font-bold">Emitida Prefeitura</span>
                          </div>
                          <p className="text-lg font-extrabold text-white">R$ 1.400,00</p>
                          <p className="text-[10px] text-slate-400">Código de Serviço: 14.01 (Manutenção & Calibração)</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                        <span className="flex items-center gap-2 font-bold">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          Bitributação Zerada: Impostos calculados estritamente sobre cada alíquota correta.
                        </span>
                        <span className="font-mono text-[10px] text-emerald-400 font-bold hidden sm:inline">Economia estimada: R$ 412,00 nesta OS</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* CONTEÚDO DO PRINT 3: LAUDO PDF & PRANCHETA TÉCNICA */}
                {selectedPrintIndex === 3 && (
                  <div className="p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-indigo-400" />
                          <span>Print 4: Prancheta Técnica de O.S & Laudo de Calibração em PDF</span>
                        </h4>
                        <p className="text-xs text-slate-400">Laudo completo com medição de Joules, peças aplicadas, checklist fotográfico e assinatura do responsável técnico.</p>
                      </div>
                      <span className="bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-[11px] font-bold px-3 py-1 rounded-full self-start sm:self-auto">
                        Laudo Técnico & CREA
                      </span>
                    </div>

                    {/* Snapshot Real: Prancheta Técnica do Técnico de Bancada */}
                    <div className="rounded-2xl bg-slate-950 border border-indigo-500/30 overflow-hidden shadow-2xl group">
                      <div className="bg-slate-900/90 px-4 py-2 border-b border-white/10 flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-300 text-[11px]">Prancheta Técnica: Diagnóstico, Peças, Serviços & Laudo Final</span>
                        <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono text-[10px] font-bold">Snapshot Real</span>
                      </div>
                      <div className="overflow-hidden bg-slate-950">
                        <img 
                          src="/snapshots/prancheta-tecnica.png" 
                          alt="Snapshot Real: Prancheta Técnica da Ordem de Serviço OS-Flow" 
                          className="w-full h-auto object-cover max-h-[460px] transition-transform duration-700 group-hover:scale-101"
                          loading="lazy"
                        />
                      </div>
                    </div>

                    {/* Destaques de Credibilidade do Laudo */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3.5 bg-slate-900/80 rounded-xl border border-white/10 space-y-1">
                        <strong className="text-indigo-300 block">Medição de Joules e Fluência</strong>
                        <p className="text-slate-400 text-[11px]">Registro de potência antes e após a troca do diodo ou lâmpada flash.</p>
                      </div>
                      <div className="p-3.5 bg-slate-900/80 rounded-xl border border-white/10 space-y-1">
                        <strong className="text-indigo-300 block">Assinatura Digital & CREA</strong>
                        <p className="text-slate-400 text-[11px]">Campos oficiais para número de registro do engenheiro ou técnico responsável.</p>
                      </div>
                      <div className="p-3.5 bg-slate-900/80 rounded-xl border border-white/10 space-y-1">
                        <strong className="text-indigo-300 block">Selo White-Label</strong>
                        <p className="text-slate-400 text-[11px]">O laudo sai formatado com o logotipo e identidade visual da sua própria assistência.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </section>

      {/* 7. OS 6 PILARES EXCLUSIVOS DE BANCADA */}
      <section id="recursos-bancada" className="py-20 px-4 sm:px-6 bg-slate-950/60 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-xs font-bold tracking-widest text-cyan-400 uppercase">Funcionalidades Exclusivas de Bancada</h2>
            <p className="text-2xl sm:text-4xl font-extrabold text-white">Por que softwares genéricos não atendem assistência técnica?</p>
            <p className="text-xs sm:text-sm text-slate-400">Softwares genéricos tratam sua assistência técnica de laser como se fosse uma loja de roupas. O OS-Flow resolve suas dores reais.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] hover:border-cyan-500/30 transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Faturamento Bifásico Automático</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Emite com 1 clique a <strong>NF-e de peças</strong> e a <strong>NFS-e municipal de mão de obra</strong> separadas no Bling, eliminando bitributação e erros manuais.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] hover:border-indigo-500/30 transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center text-indigo-400">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Teste de Estresse de 30min em Bancada</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Trava a liberação do equipamento até que o técnico realize o teste térmico e contagem de disparos do manípulo, garantindo zero retorno em garantia.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] hover:border-emerald-500/30 transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Aprovação de Orçamento via WhatsApp</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                O cliente da clínica recebe o laudo detalhado e aprova o orçamento direto pelo WhatsApp com 1 clique. Reduz o ciclo de aprovação de dias para minutos.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] hover:border-amber-500/30 transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Máquina Reserva & Aparelho Backup</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Controle de empréstimo ou locação de equipamento substituto enquanto o aparelho da clínica está na bancada de manutenção.
              </p>
            </div>

            {/* Card 5 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] hover:border-rose-500/30 transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-400/20 flex items-center justify-center text-rose-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Laudos e Termos White-Label</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Termo de entrada com checklist fotográfico, orçamento formal e recibo de entrega gerados em PDF de alta qualidade com o seu logotipo e dados cadastrais.
              </p>
            </div>

            {/* Card 6 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] hover:border-blue-500/30 transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center text-blue-400">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Validador Fiscal e NCM de 8 Dígitos</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Zero notas rejeitadas na SEFAZ. O sistema analisa previamente o CNPJ, endereço e NCM de cada peça utilizada na ordem de serviço.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. NOVA SEÇÃO: DEPOIMENTOS & PROVA SOCIAL (ASSISTÊNCIAS REAIS) */}
      <section className="py-20 px-4 sm:px-6 bg-[#050810] border-t border-white/[0.08]">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-400/30 px-4 py-1.5 rounded-full text-xs font-bold text-amber-300">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>RESULTADOS REAIS NA BANCADA</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">O que dizem os donos de assistência técnica</h2>
            <p className="text-xs sm:text-sm text-slate-400">Assistências que transformaram sua gestão e eliminaram o caos das ordens de serviço.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/70 border border-white/10 space-y-4 relative flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic">
                  "O faturamento bifásico pagou o sistema no primeiro mês. Antes, meu contador sofria para separar peças da mão de obra e nós pagávamos imposto duplicado. O OS-Flow resolveu isso com 1 clique."
                </p>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center font-bold text-cyan-300 text-xs">
                  RM
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Rodrigo Mendes</h4>
                  <p className="text-[10px] text-slate-400">Proprietário da Laser Prime Tech (Campinas/SP)</p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/70 border border-cyan-500/30 shadow-xl shadow-cyan-500/5 space-y-4 relative flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic">
                  "Nossas aprovações no WhatsApp acontecem agora em 10 minutos. O médico ou a dona da clínica vê o laudo com fotos do manípulo e clica em aprovar. A bancada não fica mais travada esperando retorno."
                </p>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center font-bold text-emerald-300 text-xs">
                  FT
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Fabiana Toledo</h4>
                  <p className="text-[10px] text-slate-400">Gerente de Operações da BioLaser Medical (SP)</p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/70 border border-white/10 space-y-4 relative flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic">
                  "A trava obrigatória de 30 minutos de teste térmico acabou com os retornos em garantia. Nossos técnicos entregam o equipamento com laudo assinado e certificado de calibração profissional."
                </p>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center font-bold text-indigo-300 text-xs">
                  EC
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Eng. Carlos Eduardo</h4>
                  <p className="text-[10px] text-slate-400">Responsável Técnico da Solon Tech Reparos (RJ)</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 9. TABELA DE PREÇOS COM TRANSPARÊNCIA */}
      <section id="planos-precos" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-bold tracking-widest text-cyan-400 uppercase">Planos & Preços</h2>
            <p className="text-2xl sm:text-4xl font-extrabold text-white">Escolha o plano ideal para a sua assistência técnica</p>
            <p className="text-xs sm:text-sm text-slate-400">Todos os planos contam com 14 dias de teste gratuito sem necessidade de cartão de crédito.</p>

            {/* Toggle Mensal / Anual */}
            <div className="flex items-center justify-center pt-4">
              <div className="bg-slate-900 p-1.5 rounded-2xl border border-white/10 flex items-center gap-1 text-xs">
                <button
                  onClick={() => setBillingCycle("MONTHLY")}
                  className={`px-5 py-2 rounded-xl font-bold transition cursor-pointer ${
                    billingCycle === "MONTHLY" ? "bg-cyan-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setBillingCycle("ANNUAL")}
                  className={`px-5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    billingCycle === "ANNUAL" ? "bg-cyan-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Anual
                  <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded">
                    2 Meses Grátis
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/50 border border-white/10 flex flex-col justify-between space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Starter</h3>
                <p className="text-xs text-slate-400 mt-1">Para bancadas individuais e pequenas oficinas.</p>
                <div className="my-6">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white">
                    R$ {billingCycle === "ANNUAL" ? "164" : "197"}
                  </span>
                  <span className="text-slate-400 text-xs">/mês</span>
                </div>
                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Até 2 Técnicos/Usuários</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Até 50 Ordens de Serviço/mês</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Laudos em PDF com seu Logo</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> WhatsApp Integrado</div>
                </div>
              </div>
              <button
                onClick={() => setShowRegisterModal(true)}
                className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer"
              >
                Começar no Starter
              </button>
            </div>

            {/* Pro (Destacado) */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-indigo-950/80 to-slate-900 border-2 border-cyan-400 relative flex flex-col justify-between space-y-6 shadow-2xl shadow-cyan-500/10">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow">
                Mais Escolhido por Assistências
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">Pro</h3>
                <p className="text-xs text-slate-400 mt-1">O pacote completo com faturamento bifásico e automação.</p>
                <div className="my-6">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white">
                    R$ {billingCycle === "ANNUAL" ? "330" : "397"}
                  </span>
                  <span className="text-slate-400 text-xs">/mês</span>
                </div>
                <div className="space-y-2.5 text-xs text-slate-200">
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Até 6 Técnicos/Usuários</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Ordens de Serviço Ilimitadas</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Faturamento Bifásico (NF-e + NFS-e)</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Validador Fiscal & NCM Automático</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Gestão de Máquina Reserva / Backup</div>
                </div>
              </div>
              <button
                onClick={() => setShowRegisterModal(true)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs transition shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                Experimentar Pro por 14 Dias Grátis
              </button>
            </div>

            {/* Enterprise */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/50 border border-white/10 flex flex-col justify-between space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Enterprise</h3>
                <p className="text-xs text-slate-400 mt-1">Para redes, autorizadas e grandes distribuidores.</p>
                <div className="my-6">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white">
                    R$ {billingCycle === "ANNUAL" ? "658" : "790"}
                  </span>
                  <span className="text-slate-400 text-xs">/mês</span>
                </div>
                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Usuários Ilimitados</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Multi-filiais e Centros de Reparo</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> API de Integração Aberta</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-cyan-400" /> Gerente de Contas & Suporte Prioritário</div>
                </div>
              </div>
              <button
                onClick={() => setShowRegisterModal(true)}
                className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer"
              >
                Falar com Consultor
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 9.1 SEÇÃO DE DECISÃO & PRÓXIMOS PASSOS: DUAL CARDS (INSPIRADO NO ONLINE OS) */}
      <section className="py-16 px-4 sm:px-6 bg-gradient-to-b from-slate-950 via-[#070b16] to-[#050810] border-t border-white/[0.08]">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-xs font-bold tracking-widest text-cyan-400 uppercase">Próximos Passos</h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Como você prefere começar hoje?</h3>
            <p className="text-xs sm:text-sm text-slate-400">Escolha o caminho mais rápido para transformar a produtividade e a gestão fiscal da sua bancada.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Iniciar Teste Direto */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-cyan-500/30 hover:border-cyan-400 transition-all duration-300 shadow-2xl flex flex-col justify-between space-y-6 group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-xl font-extrabold text-white group-hover:text-cyan-300 transition">
                    Testar 14 Dias Grátis Agora →
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                    Crie sua conta em menos de 3 minutos, cadastre sua equipe e comece a emitir laudos fotográficos e orçamentos pelo WhatsApp imediatamente.
                  </p>
                </div>
                <div className="space-y-2 pt-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> Sem necessidade de cartão de crédito</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> Acesso a todos os recursos da bancada Pro</div>
                </div>
              </div>

              <button
                onClick={() => setShowRegisterModal(true)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs sm:text-sm transition shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Criar Conta e Iniciar Teste Gratuito</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Card 2: Falar com Especialista WhatsApp */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-emerald-500/30 hover:border-emerald-400 transition-all duration-300 shadow-2xl flex flex-col justify-between space-y-6 group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Send className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-xl font-extrabold text-white group-hover:text-emerald-300 transition">
                    Falar com um Consultor no WhatsApp →
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                    Tire dúvidas sobre migração do seu sistema atual, integração com o Bling ERP, emissão de NF-e/NFS-e ou solicite uma demonstração guiada para sua equipe.
                  </p>
                </div>
                <div className="space-y-2 pt-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Atendimento humanizado por especialistas</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Suporte para migração de dados antigos</div>
                </div>
              </div>

              <a
                href="https://wa.me/5516993660041?text=Ol%C3%A1!+Gostaria+de+conhecer+o+OS-Flow+SaaS+para+a+minha+assist%C3%AAncia+t%C3%A9cnica."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Conversar no WhatsApp Oficial</span>
                <Send className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FAQ - PERGUNTAS FREQUENTES ACCORDION */}
      <section id="perguntas-frequentes" className="py-20 px-4 sm:px-6 bg-[#050810] border-t border-white/[0.08]">
        <div className="max-w-4xl mx-auto space-y-10">
          
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-400/30 px-4 py-1.5 rounded-full text-xs font-bold text-indigo-300">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>TIRE SUAS DÚVIDAS</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Perguntas Frequentes</h2>
            <p className="text-xs sm:text-sm text-slate-400">Tudo o que você precisa saber antes de iniciar seus 14 dias de teste gratuito.</p>
          </div>

          {/* Accordion List */}
          <div className="space-y-3">
            {[
              {
                q: "Como funciona o teste grátis de 14 dias? Preciso cadastrar cartão de crédito?",
                a: "Não! O teste é 100% gratuito e não exige nenhum cartão de crédito. Você cria sua conta em menos de 3 minutos, cadastra sua assistência e já pode utilizar todos os recursos da bancada, emitir laudos e testar a aprovação via WhatsApp."
              },
              {
                q: "Como funciona o Faturamento Bifásico com o Bling?",
                a: "O OS-Flow se conecta diretamente à API oficial do Bling (V3). Ao concluir uma ordem de serviço, o sistema divide automaticamente os itens: gera a NF-e para as peças e componentes e a NFS-e para os serviços de calibração/manutenção na prefeitura, garantindo que você nunca pague impostos duplicados."
              },
              {
                q: "Consigo importar meus clientes e estoque de planilhas Excel?",
                a: "Sim! O OS-Flow possui importadores nativos para clientes, equipamentos cadastrados e catálogo de peças via planilhas .xlsx e .csv. Nossa equipe de suporte também auxilia na migração sem custo extra."
              },
              {
                q: "O sistema funciona em celular, tablet e computador?",
                a: "Sim! O OS-Flow é 100% em nuvem e responsivo. Seus técnicos podem usar em tablets na bancada para anexar fotos e checklists, as atendentes no computador do balcão e os donos acompanharem o dashboard no celular de qualquer lugar."
              },
              {
                q: "Os laudos técnicos e termos em PDF saem com o logotipo da minha empresa?",
                a: "Sim! O sistema é totalmente white-label. Você personaliza suas cores, logotipo, dados de CREA/CFT dos engenheiros responsáveis, dados cadastrais e termos de garantia personalizados."
              },
              {
                q: "E se eu precisar de ajuda ou suporte durante o uso?",
                a: "Oferecemos suporte técnico humanizado via WhatsApp e e-mail em horário comercial, além de vídeos tutoriais passo a passo dentro do próprio sistema."
              }
            ].map((faq, idx) => {
              const isExpanded = expandedFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-slate-900/70 border border-white/10 overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => setExpandedFaqIndex(isExpanded ? null : idx)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition"
                  >
                    <span className="text-xs sm:text-sm font-bold text-white">{faq.q}</span>
                    <div className={`p-1 rounded-full bg-slate-800 text-slate-300 transition-transform ${isExpanded ? "rotate-180 text-cyan-400 bg-cyan-500/20" : ""}`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 sm:px-6 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/5 pt-3 animate-fadeIn">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 11. BANNER FINAL DE CONVERSÃO */}
      <section className="py-16 px-4 sm:px-6 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-t border-white/10 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Pronto para profissionalizar a bancada da sua assistência técnica?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto">
            Junte-se às assistências especializadas em laser e estética que economizam milhares de reais em impostos e aceleram suas aprovações todo mês.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setShowRegisterModal(true)}
              className="w-full sm:w-auto text-sm font-black bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 px-8 py-4 rounded-2xl shadow-xl shadow-cyan-500/20 transition transform hover:-translate-y-0.5 cursor-pointer"
            >
              Criar Conta Gratuita (14 Dias Grátis)
            </button>
            <button
              onClick={onEnterLiveDemo}
              className="w-full sm:w-auto text-sm font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/15 px-6 py-4 rounded-2xl transition cursor-pointer"
            >
              Ver Demonstração Interativa
            </button>
          </div>
        </div>
      </section>

      {/* 12. FOOTER ORGANIZADO */}
      <footer className="py-12 px-4 sm:px-6 border-t border-white/[0.08] bg-[#050810] text-xs text-slate-500 space-y-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <AppLogo className="h-7 w-auto object-contain opacity-90" />
              <span className="text-slate-300 font-bold">OS-Flow SaaS</span>
            </div>
            <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed">
              O ecossistema completo para assistências técnicas de estética, laser e equipamentos de saúde. Faturamento bifásico, gestão de bancada e automação no WhatsApp.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-semibold pt-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Conformidade com LGPD & Conexão Segura SSL 256-bit</span>
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">Navegação Rápida</h5>
            <ul className="space-y-1.5 text-[11px] text-slate-400">
              <li><button onClick={() => scrollToSection("como-funciona")} className="hover:text-white cursor-pointer">Como Funciona</button></li>
              <li><button onClick={() => scrollToSection("comparativo")} className="hover:text-white cursor-pointer">Comparativo de Sistemas</button></li>
              <li><button onClick={() => scrollToSection("recursos-bancada")} className="hover:text-white cursor-pointer">Recursos de Bancada</button></li>
              <li><button onClick={() => scrollToSection("metricas-prints")} className="hover:text-white cursor-pointer">Métricas & Prints</button></li>
              <li><button onClick={() => scrollToSection("calculadora-roi")} className="hover:text-white cursor-pointer">Simulador de Lucro</button></li>
              <li><button onClick={() => scrollToSection("planos-precos")} className="hover:text-white cursor-pointer">Tabela de Preços</button></li>
              <li><button onClick={() => scrollToSection("perguntas-frequentes")} className="hover:text-white cursor-pointer">Perguntas Frequentes (FAQ)</button></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">Acesso ao Sistema</h5>
            <ul className="space-y-1.5 text-[11px] text-slate-400">
              <li><button onClick={() => setShowRegisterModal(true)} className="hover:text-white cursor-pointer text-cyan-400 font-bold">Criar Conta Gratuita</button></li>
              <li><button onClick={onLoginClick} className="hover:text-white cursor-pointer">Entrar no Sistema (Login)</button></li>
              <li><button onClick={onEnterLiveDemo} className="hover:text-white cursor-pointer">Modo Demonstração</button></li>
            </ul>
          </div>

        </div>

        {/* BLOCO DE COMPATIBILIDADE MULTI-DISPOSITIVO (INSPIRADO NO ONLINE OS) */}
        <div className="max-w-7xl mx-auto pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Laptop className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-300">Compatibilidade Total da Plataforma:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <span className="px-3 py-1 rounded-lg bg-slate-900 border border-white/10 text-slate-300 flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-cyan-400" /> Computador / Desktop (Chrome, Edge, Safari)
            </span>
            <span className="px-3 py-1 rounded-lg bg-slate-900 border border-white/10 text-slate-300 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" /> Tablet Touch para Bancada & Fotos
            </span>
            <span className="px-3 py-1 rounded-lg bg-slate-900 border border-white/10 text-slate-300 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" /> Celular do Gestor & PWA Mobile
            </span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
          <p>© 2026 OS-Flow SaaS. Todos os direitos reservados.</p>
          <p>Feito para impulsionar a gestão de oficinas técnicas no Brasil 🇧🇷</p>
        </div>
      </footer>

      {/* WIDGET FLUTUANTE DE WHATSAPP COM BALÃO DE ENGAJAMENTO (INSPIRADO NO ONLINE OS) */}
      <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3 pointer-events-auto">
        {/* Balão de Engajamento */}
        {showWhatsappFloatingTooltip && (
          <div className="hidden sm:flex items-center gap-2.5 bg-slate-900/95 border border-emerald-500/40 text-slate-200 text-xs px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md animate-fadeIn max-w-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
            <p className="leading-snug">
              Dúvidas sobre sua bancada? <strong>Converse com nosso consultor!</strong>
            </p>
            <button
              onClick={() => setShowWhatsappFloatingTooltip(false)}
              className="text-slate-400 hover:text-white p-1 ml-1 cursor-pointer"
              title="Fechar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Botão Flutuante Circular Verde */}
        <a
          href="https://wa.me/5516993660041?text=Ol%C3%A1!+Gostaria+de+conhecer+o+OS-Flow+SaaS+para+a+minha+assist%C3%AAncia+t%C3%A9cnica."
          target="_blank"
          rel="noopener noreferrer"
          className="relative w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 transition-transform duration-300 hover:scale-110 active:scale-95 cursor-pointer group"
          title="Fale com nosso consultor técnico no WhatsApp"
        >
          {/* Badge Vermelho de Notificação */}
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 border-2 border-slate-950 text-[10px] font-black flex items-center justify-center text-white">
            1
          </span>

          {/* Ícone do WhatsApp */}
          <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.072-2.125-.526-1.587-.663-2.613-2.28-2.693-2.387-.08-.107-.648-.861-.648-1.64 0-.779.408-1.163.553-1.32.144-.157.315-.198.42-.198.106 0 .211.002.304.007.098.005.23-.037.36.275.134.323.46 1.121.5 1.203.04.082.067.178.013.286-.054.107-.08.175-.16.27-.08.095-.168.212-.24.285-.08.082-.163.171-.07.33.093.16.413.682.887 1.103.61.543 1.124.71 1.284.79.16.08.254.07.35-.04.095-.11.407-.474.516-.637.108-.163.217-.136.365-.082.148.054.937.442 1.098.522.16.08.268.12.307.187.04.067.04.388-.104.793z" />
          </svg>
        </a>
      </div>

      {/* BARRA FIXA DE CONVERSÃO MOBILE (STICKY CTA EM DISPOSITIVOS MÓVEIS) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#070a13]/95 border-t border-white/10 p-3 sm:hidden backdrop-blur-xl flex items-center justify-between gap-3 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-white leading-tight">14 Dias Grátis</span>
          <span className="text-[9px] text-emerald-400 font-semibold">Sem cartão de crédito</span>
        </div>
        <button
          onClick={() => setShowRegisterModal(true)}
          className="bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer"
        >
          <span>Testar Grátis</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* MODAL DE REGISTRO */}
      <RegisterTenantModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={onRegisterSuccess}
      />

      {/* MODAL DE VÍDEO DEMO (REMOTION) */}
      <VideoDemoModal
        isOpen={showVideoDemoModal}
        onClose={() => setShowVideoDemoModal(false)}
      />

    </div>
  );
}
