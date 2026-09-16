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
  X
} from "lucide-react";
import AppLogo from "./AppLogo";
import RegisterTenantModal from "./RegisterTenantModal";
import { User } from "../types";

interface LandingPageViewProps {
  onLoginClick: () => void;
  onEnterLiveDemo: () => void;
  onRegisterSuccess: (user: User, token: string) => void;
}

export default function LandingPageView({ onLoginClick, onEnterLiveDemo, onRegisterSuccess }: LandingPageViewProps) {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("ANNUAL");
  const [activeMigrationTab, setActiveMigrationTab] = useState<"graficos" | "prints">("graficos");
  const [selectedChartIndex, setSelectedChartIndex] = useState<number>(0);
  const [selectedPrintIndex, setSelectedPrintIndex] = useState<number>(0);

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 selection:bg-cyan-500 selection:text-slate-950">
      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 z-40 bg-[#070B14]/80 backdrop-blur-xl border-b border-white/[0.08] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AppLogo className="h-9 w-auto object-contain" />
            <span className="bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline">
              SaaS Vertical Estética
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onEnterLiveDemo}
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
              <span className="hidden sm:inline">Ver Demonstração</span>
            </button>
            <button
              onClick={onLoginClick}
              className="text-xs font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-xl hover:bg-white/5 transition cursor-pointer"
            >
              Já sou cliente
            </button>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-4 py-2 rounded-xl shadow-lg shadow-cyan-500/20 transition transform active:scale-95 cursor-pointer"
            >
              Testar 14 Dias Grátis
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-16 pb-20 px-6 overflow-hidden">
        {/* Glows de Fundo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-cyan-500/20 to-blue-600/10 rounded-full blur-[140px] pointer-events-none"></div>

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-900/60 to-cyan-900/60 border border-cyan-500/30 px-4 py-1.5 rounded-full text-xs font-semibold text-cyan-300 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Projetado especificamente para Assistências Técnicas de Estética & Laser</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            Chega de gambiarras em planilhas e softwares genéricos de OS.
          </h1>

          <p className="text-base sm:text-xl text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
            Faturamento bifásico automático (NF-e + NFS-e), laudos de calibração em PDF com o seu logotipo, teste de estresse de laser e aprovação instantânea pelo WhatsApp.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setShowRegisterModal(true)}
              className="w-full sm:w-auto text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 px-8 py-4 rounded-2xl shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2.5 transition transform hover:-translate-y-0.5 active:scale-98 cursor-pointer"
            >
              <span>Criar Conta Gratuita da Oficina</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onEnterLiveDemo}
              className="w-full sm:w-auto text-sm font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 px-6 py-4 rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Play className="w-4 h-4 text-cyan-400 fill-cyan-400" />
              <span>Experimentar com Dados Fictícios</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-6 pt-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> 14 dias sem compromisso</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Sem cartão de crédito</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Setup em 3 minutos</span>
          </div>
        </div>
      </section>

      {/* 2.5 SEÇÃO DEDICADA: POR QUE AS ASSISTÊNCIAS ESTÃO MIGRANDO PARA O OS FLOW? */}
      <section className="py-20 px-6 bg-gradient-to-b from-[#070B14] via-slate-950 to-[#070B14] relative overflow-hidden border-t border-white/[0.08]">
        {/* Glows de fundo da seção */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[160px] pointer-events-none"></div>
        <div className="absolute top-1/3 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[160px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto space-y-12 relative z-10">
          
          {/* Cabeçalho da Seção */}
          <div className="text-center max-w-4xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-400/30 px-4 py-1.5 rounded-full text-xs font-bold text-cyan-300">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>DADOS DE IMPACTO & SHOWCASE DE INTERFACE</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Por que as Assistências Estão Migrando para o <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">OS Flow</span>?
            </h2>

            <p className="text-sm sm:text-base text-slate-400 max-w-3xl mx-auto leading-relaxed">
              Diferente de ERPs genéricos ou planilhas vulneráveis, o OS Flow foi feito sob medida para bancadas de laser, estética e saúde. Veja os números reais de migração e navegue pelos prints do sistema.
            </p>

            {/* Alternador de Visões: Gráficos vs Prints */}
            <div className="flex justify-center pt-4">
              <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-white/10 inline-flex items-center gap-2 shadow-2xl backdrop-blur-md">
                <button
                  onClick={() => setActiveMigrationTab("graficos")}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer ${
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
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer ${
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                          <IconComp className="w-5 h-5" />
                        </div>
                        <span className={`text-lg font-black ${item.color}`}>{item.val}</span>
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
                        <h3 className="text-xl font-extrabold text-white mt-1">Comparativo de Lucratividade: Sem OS Flow x Com OS Flow</h3>
                      </div>
                      <span className="bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto">
                        +44.5% de Lucro Real Recuperado
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Ao eliminar a bitributação no faturamento de peças e mão de obra (NF-e + NFS-e separadas) e agilizar aprovações no WhatsApp, a assistência média recupera milhares de reais por mês.
                    </p>

                    {/* Ilustração Visual do Gráfico de Barras */}
                    <div className="space-y-6 pt-2">
                      {/* Barra 1: Softwares Genéricos */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-400">Softwares Genéricos / Planilhas (Sem Faturamento Bifásico)</span>
                          <span className="text-slate-300 font-bold">R$ 28.500 / mês</span>
                        </div>
                        <div className="w-full h-8 bg-slate-800 rounded-xl overflow-hidden p-1 flex items-center">
                          <div className="h-full bg-slate-600 rounded-lg w-[60%] flex items-center justify-end px-3 text-[10px] font-bold text-white transition-all duration-1000">
                            60% Eficiência Fiscal
                          </div>
                        </div>
                      </div>

                      {/* Barra 2: Com OS Flow */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-cyan-400" />
                            Com OS-Flow SaaS (Faturamento Bifásico + Orçamentos WhatsApp)
                          </span>
                          <span className="text-emerald-400 font-black text-sm">R$ 41.200 / mês</span>
                        </div>
                        <div className="w-full h-10 bg-slate-800/80 rounded-xl overflow-hidden p-1 flex items-center border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
                          <div className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 rounded-lg w-[92%] flex items-center justify-between px-3 text-xs font-black text-slate-950 transition-all duration-1000">
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
                        <h3 className="text-xl font-extrabold text-white mt-1">Redução Extrema de Espera: De 48 Horas para 14 Minutos</h3>
                      </div>
                      <span className="bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto">
                        Aprovação no WhatsApp com 1 Clique
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Em vez de ligar para a clínica ou mandar PDFs pesados por e-mail, o OS-Flow envia uma mensagem formatada no WhatsApp com link direto para aprovação instantânea pelo proprietário da clínica.
                    </p>

                    {/* Visual Comparison Chart */}
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
                          <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Laudo visual com fotos das peças e fotos do manípulo</li>
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
                        <h3 className="text-xl font-extrabold text-white mt-1">Queda Drástica de Refugo: De 16.5% para Apenas 0.3%</h3>
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
                        <span className="text-slate-400">Evolução do Índice de Retorno em Garantia (Mêses de Bancada)</span>
                        <span className="text-emerald-400">-98% de Redução em Re-trabalho</span>
                      </div>

                      {/* Visual Line Chart / Progress Steps */}
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
                        <h3 className="text-xl font-extrabold text-white mt-1">Por que os Proprietários Decidiram Migrar para o OS Flow?</h3>
                      </div>
                      <span className="bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto">
                        Pesquisa com 120+ Assistências de Saúde & Estética
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2">
                      {/* Visual Donut / Bar List */}
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

                      {/* Resumo didático */}
                      <div className="p-5 rounded-2xl bg-slate-950 border border-white/10 space-y-3">
                        <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Conclusão da Pesquisa de Migração</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Softwares genéricos (como Omie ou Bling puro) tratam o reparo de um manípulo de laser de R$ 15.000 igual à venda de uma camiseta. O OS-Flow foi desenvolvido especificamente para gerenciar parâmetros técnicos, calibração, garantia e suporte fiscal especializado.
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

              {/* CONTAINER DOS PRINTS DO SISTEMA (MOCKUPS FIDEDIGNOS DA INTERFACE) */}
              <div className="rounded-3xl bg-slate-950 border border-white/10 shadow-2xl overflow-hidden">
                
                {/* Header Estilo Janela do Sistema OS-Flow */}
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

                    {/* Simulation UI Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      {/* Coluna 1: Entrada */}
                      <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-white/5 text-xs font-bold">
                          <span className="text-slate-300 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span> Entrada & Checklist
                          </span>
                          <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px]">3 OS</span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 space-y-2">
                          <div className="flex justify-between items-start text-xs">
                            <span className="font-bold text-white">OS-2490</span>
                            <span className="text-[10px] bg-amber-400/20 text-amber-300 font-bold px-1.5 py-0.5 rounded">Revisão Preventiva</span>
                          </div>
                          <p className="text-[11px] text-slate-300 font-semibold">Laser Soprano Ice (Manípulo 808nm)</p>
                          <div className="text-[10px] text-slate-400 flex items-center justify-between">
                            <span>Disparos: 1.250.000</span>
                            <span className="text-amber-400">Checklist 12/12</span>
                          </div>
                        </div>
                      </div>

                      {/* Coluna 2: Teste de Estresse */}
                      <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/20 space-y-3 shadow-lg shadow-cyan-500/5">
                        <div className="flex items-center justify-between pb-2 border-b border-white/5 text-xs font-bold">
                          <span className="text-cyan-300 flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5 text-cyan-400" /> Teste de Estresse (30min)
                          </span>
                          <span className="bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded text-[10px]">2 OS em Bancada</span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950 border border-cyan-400/40 space-y-2">
                          <div className="flex justify-between items-start text-xs">
                            <span className="font-bold text-white">OS-2488</span>
                            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span> 24/30 min
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 font-semibold">Laser Mileman - Troca Peltier</p>
                          <div className="bg-slate-900 p-2 rounded-lg text-[10px] text-slate-300 space-y-1">
                            <div className="flex justify-between">
                              <span>Temperatura do Cristal:</span>
                              <span className="text-emerald-400 font-bold">18°C (Estável)</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Teste de Fluxo de Água:</span>
                              <span className="text-cyan-400 font-bold">2.4 L/min OK</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Coluna 3: Pronto + Laudo */}
                      <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-white/5 text-xs font-bold">
                          <span className="text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Pronto p/ Liberação
                          </span>
                          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px]">5 OS</span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2">
                          <div className="flex justify-between items-start text-xs">
                            <span className="font-bold text-white">OS-2485</span>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">Laudo Gerado</span>
                          </div>
                          <p className="text-[11px] text-slate-300 font-semibold">Plataforma Solon - Ajuste de Joules</p>
                          <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            <FileCheck className="w-3.5 h-3.5" /> PDF Aprovado & Assinado
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CONTEÚDO DO PRINT 1: WHATSAPP */}
                {selectedPrintIndex === 1 && (
                  <div className="p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                          <Smartphone className="w-5 h-5 text-emerald-400" />
                          <span>Print 2: Aprovação Instantânea de Orçamento no WhatsApp</span>
                        </h4>
                        <p className="text-xs text-slate-400">O cliente abre a mensagem oficial com 1 clique e aprova direto no celular.</p>
                      </div>
                      <span className="bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold px-3 py-1 rounded-full self-start sm:self-auto">
                        Integração Nativa WhatsApp API
                      </span>
                    </div>

                    {/* Simulation Smartphone Card */}
                    <div className="max-w-md mx-auto p-4 rounded-3xl bg-[#0b141a] border border-emerald-500/30 shadow-2xl space-y-3 font-sans">
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
                )}

                {/* CONTEÚDO DO PRINT 2: FATURAMENTO BIFÁSICO */}
                {selectedPrintIndex === 2 && (
                  <div className="p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-400" />
                          <span>Print 3: Painel de Faturamento Bifásico & Validação SEFAZ</span>
                        </h4>
                        <p className="text-xs text-slate-400">Divisão automática de NF-e (peças) e NFS-e (mão de obra) sem erros manuais.</p>
                      </div>
                      <span className="bg-blue-500/10 border border-blue-400/30 text-blue-300 text-[11px] font-bold px-3 py-1 rounded-full self-start sm:self-auto">
                        Integração Bling V3 & SEFAZ
                      </span>
                    </div>

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

                {/* CONTEÚDO DO PRINT 3: LAUDO PDF */}
                {selectedPrintIndex === 3 && (
                  <div className="p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-indigo-400" />
                          <span>Print 4: Laudo Técnico White-Label em PDF de Alta Resolução</span>
                        </h4>
                        <p className="text-xs text-slate-400">Com o logotipo da sua assistência, histórico de calibração e checklist fotográfico.</p>
                      </div>
                      <span className="bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-[11px] font-bold px-3 py-1 rounded-full self-start sm:self-auto">
                        Personalização White-Label Total
                      </span>
                    </div>

                    {/* PDF Mockup Container */}
                    <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-white text-slate-900 shadow-2xl space-y-4 text-xs">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                            AT
                          </div>
                          <div>
                            <h5 className="font-extrabold text-slate-900 text-sm">LASER TECH - ASSISTÊNCIA TÉCNICA</h5>
                            <p className="text-[10px] text-slate-500">Laudo Técnico de Calibração & Certificado de Teste #OS-2490</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded border border-slate-300 font-bold">
                          ISO 13485 Compliant
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div><strong className="text-slate-700">Equipamento:</strong> Laser Soprano Ice</div>
                        <div><strong className="text-slate-700">Manípulo:</strong> Diode 808nm Premium</div>
                        <div><strong className="text-slate-700">Contador de Disparos:</strong> 1.420.000 shots</div>
                        <div><strong className="text-slate-700">Status do Teste:</strong> Aprovado 100%</div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="font-bold text-slate-800 text-[11px] block">Gráfico de Fluência & Potência Medida (J/cm²)</span>
                        <div className="h-16 bg-slate-100 rounded-lg border border-slate-200 p-2 flex items-end justify-between gap-1 text-[9px] font-mono text-slate-600">
                          <div className="w-full bg-indigo-500/80 rounded-t h-[40%] text-center text-white text-[8px] font-bold">10J</div>
                          <div className="w-full bg-indigo-500/80 rounded-t h-[65%] text-center text-white text-[8px] font-bold">20J</div>
                          <div className="w-full bg-indigo-500/80 rounded-t h-[85%] text-center text-white text-[8px] font-bold">30J</div>
                          <div className="w-full bg-emerald-500 rounded-t h-[100%] text-center text-slate-950 text-[8px] font-bold">40J OK</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                        <span>Assinado Digitalmente por Eng. Lucas Ramos (CREA 48291/SP)</span>
                        <span className="text-emerald-700 font-bold">Validade da Calibração: 12 Meses</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </section>

      {/* 3. OS 5 PILARES QUE FAZEM O OS-FLOW VENCER SOFTWARES GENÉRICOS */}
      <section className="py-20 px-6 bg-slate-950/60 border-y border-white/[0.06]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-xs font-bold tracking-widest text-cyan-400 uppercase">Funcionalidades Exclusivas</h2>
            <p className="text-3xl font-extrabold text-white">Por que o Bling e Omie não resolvem sua oficina?</p>
            <p className="text-sm text-slate-400">Softwares genéricos tratam sua assistência técnica de laser como se fosse uma loja de roupas. O OS-Flow resolve suas dores reais de bancada.</p>
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

      {/* 4. TABELA DE PREÇOS */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-bold tracking-widest text-cyan-400 uppercase">Planos & Preços</h2>
            <p className="text-3xl font-extrabold text-white">Escolha o plano certo para o tamanho da sua oficina</p>
            <p className="text-xs text-slate-400">Todos os planos contam com 14 dias de teste gratuito sem necessidade de cartão.</p>

            {/* Toggle Mensal / Anual */}
            <div className="flex items-center justify-center pt-4">
              <div className="bg-slate-900 p-1 rounded-2xl border border-white/10 flex items-center gap-1 text-xs">
                <button
                  onClick={() => setBillingCycle("MONTHLY")}
                  className={`px-5 py-2 rounded-xl font-bold transition ${
                    billingCycle === "MONTHLY" ? "bg-cyan-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setBillingCycle("ANNUAL")}
                  className={`px-5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
                    billingCycle === "ANNUAL" ? "bg-cyan-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Anual
                  <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded">
                    2 Meses Grátis
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter */}
            <div className="p-8 rounded-3xl bg-slate-900/50 border border-white/10 flex flex-col justify-between space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Starter</h3>
                <p className="text-xs text-slate-400 mt-1">Para bancadas individuais e pequenas oficinas.</p>
                <div className="my-6">
                  <span className="text-4xl font-extrabold text-white">
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
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer"
              >
                Começar no Starter
              </button>
            </div>

            {/* Pro (Destacado) */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-indigo-950/80 to-slate-900 border-2 border-cyan-400 relative flex flex-col justify-between space-y-6 shadow-2xl shadow-cyan-500/10">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow">
                Mais Escolhido por Assistências
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">Pro</h3>
                <p className="text-xs text-slate-400 mt-1">O pacote completo com faturamento bifásico e automação.</p>
                <div className="my-6">
                  <span className="text-4xl font-extrabold text-white">
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
            <div className="p-8 rounded-3xl bg-slate-900/50 border border-white/10 flex flex-col justify-between space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Enterprise</h3>
                <p className="text-xs text-slate-400 mt-1">Para redes, autorizadas e grandes distribuidores.</p>
                <div className="my-6">
                  <span className="text-4xl font-extrabold text-white">
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
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer"
              >
                Falar com Consultor
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FOOTER COM CTA FINAL */}
      <footer className="py-12 px-6 border-t border-white/[0.08] bg-[#050810] text-center text-xs text-slate-500 space-y-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AppLogo className="h-7 w-auto object-contain opacity-80" />
            <span className="text-slate-400 font-semibold">OS-Flow SaaS - O Sistema Oficial da Manutenção Estética</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button onClick={() => setShowRegisterModal(true)} className="hover:text-white cursor-pointer">Cadastrar Oficina</button>
            <button onClick={onLoginClick} className="hover:text-white cursor-pointer">Login</button>
            <button onClick={onEnterLiveDemo} className="hover:text-white cursor-pointer">Modo Demonstração</button>
          </div>
        </div>
        <p>© 2026 OS-Flow SaaS. Todos os direitos reservados.</p>
      </footer>

      {/* Modal de Registro */}
      <RegisterTenantModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={onRegisterSuccess}
      />
    </div>
  );
}
