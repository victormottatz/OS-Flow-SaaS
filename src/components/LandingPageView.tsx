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
  Laptop
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
