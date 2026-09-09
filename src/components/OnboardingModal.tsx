import React, { useState } from "react";
import { Sparkles, Building2, Upload, Receipt, Users, CheckCircle2, ArrowRight, X } from "lucide-react";
import { User, UserRole } from "../types";
import AppLogo from "./AppLogo";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export default function OnboardingModal({ isOpen, onClose, user }: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Passo 1: Identidade da Oficina
  const [officeName, setOfficeName] = useState(user.company?.name || "");
  const [logoUrl, setLogoUrl] = useState(user.company?.logoUrl || "");

  // Passo 2: Modo Fiscal
  const [fiscalMode, setFiscalMode] = useState<"bling" | "avulso">("avulso");
  const [blingApiKey, setBlingApiKey] = useState("");

  // Passo 3: Equipe Inicial
  const [firstTechName, setFirstTechName] = useState("");
  const [firstTechEmail, setFirstTechEmail] = useState("");

  if (!isOpen) return null;

  const handleFinish = () => {
    localStorage.setItem("osflow_onboarding_completed", "true");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 p-6 text-white relative">
          <button
            onClick={handleFinish}
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-cyan-400/20 border border-cyan-300/40 text-cyan-200 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 tracking-wider">
              <Sparkles className="w-3 h-3 text-cyan-300" />
              Configuração Inicial da Oficina
            </span>
          </div>
          <h2 className="text-xl font-black text-white">Bem-vindo ao OS-Flow SaaS!</h2>
          <p className="text-xs text-blue-100 mt-1">
            Vamos preparar sua oficina para emitir termos, controlar peças e atender seus clientes em 3 passos rápidos.
          </p>

          {/* Stepper */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/15 text-xs">
            <div className={`px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${step >= 1 ? "bg-white text-blue-700" : "bg-white/20 text-white/70"}`}>
              1. Identidade
            </div>
            <div className="h-0.5 w-6 bg-white/30" />
            <div className={`px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${step >= 2 ? "bg-white text-blue-700" : "bg-white/20 text-white/70"}`}>
              2. Faturamento
            </div>
            <div className="h-0.5 w-6 bg-white/30" />
            <div className={`px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${step >= 3 ? "bg-white text-blue-700" : "bg-white/20 text-white/70"}`}>
              3. Equipe
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {step === 1 && (
            <div className="space-y-4 anim-fadeIn">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Dados e Logotipo da sua Assistência</span>
              </div>
              <p className="text-xs text-slate-500">
                Essas informações serão impressas no cabeçalho dos seus orçamentos e laudos entregues aos clientes.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome de Exibição da Oficina</label>
                <input
                  type="text"
                  value={officeName}
                  onChange={(e) => setOfficeName(e.target.value)}
                  placeholder="Ex: MGV Assistência Técnica"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">URL do Logotipo (Imagem PNG/JPG)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://suaoficina.com.br/logo.png"
                    className="flex-1 p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Você também pode enviar o arquivo diretamente pela aba Perfil mais tarde.</p>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>Próximo Passo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 anim-fadeIn">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Receipt className="w-4 h-4 text-purple-600" />
                <span>Como você deseja gerenciar os Orçamentos?</span>
              </div>
              <p className="text-xs text-slate-500">
                O OS-Flow funciona tanto para quem emite notas fiscais automaticamente quanto para quem gera orçamentos avulsos em PDF.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setFiscalMode("avulso")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition ${fiscalMode === "avulso" ? "border-blue-600 bg-blue-50/40" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <strong className="text-xs font-bold text-slate-900">Modo Simplificado</strong>
                    {fiscalMode === "avulso" && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Impressão direta de recibos e termos em PDF. Ideal para começar imediatamente sem burocracia.
                  </p>
                </div>

                <div
                  onClick={() => setFiscalMode("bling")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition ${fiscalMode === "bling" ? "border-blue-600 bg-blue-50/40" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <strong className="text-xs font-bold text-slate-900">Integração Bling (NF-e/NFS-e)</strong>
                    {fiscalMode === "bling" && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Faturamento bifásico automático com transmissão direta para a Receita e Prefeitura.
                  </p>
                </div>
              </div>

              {fiscalMode === "bling" && (
                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl space-y-2 anim-fadeIn">
                  <label className="block text-xs font-bold text-purple-950">Chave de API do Bling (Opcional agora)</label>
                  <input
                    type="password"
                    value={blingApiKey}
                    onChange={(e) => setBlingApiKey(e.target.value)}
                    placeholder="Cole sua API Key do Bling V3 ou configure depois nas Configurações"
                    className="w-full p-2 bg-white border border-purple-200 rounded-lg text-xs font-mono outline-none"
                  />
                </div>
              )}

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>Próximo Passo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 anim-fadeIn">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Cadastrar Técnico ou Atendente da Equipe</span>
              </div>
              <p className="text-xs text-slate-500">
                Convide um colaborador para que ele possa abrir OSs na recepção ou preencher laudos na bancada.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Colaborador (Opcional)</label>
                <input
                  type="text"
                  value={firstTechName}
                  onChange={(e) => setFirstTechName(e.target.value)}
                  placeholder="Ex: João Técnico"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail do Colaborador</label>
                <input
                  type="email"
                  value={firstTechEmail}
                  onChange={(e) => setFirstTechEmail(e.target.value)}
                  placeholder="joao@oficina.com.br"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer"
                >
                  <span>Concluir e Começar a Usar</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
