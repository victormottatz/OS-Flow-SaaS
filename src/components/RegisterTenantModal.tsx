import React, { useState } from "react";
import { Sparkles, Building2, User, Mail, Lock, Phone, MapPin, ShieldCheck, CheckCircle2, ArrowRight, X, AlertCircle } from "lucide-react";
import { User as UserType } from "../types";
import { LEGAL_TERMS } from "../constants/legalTerms";

interface RegisterTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType, token: string) => void;
}

export default function RegisterTenantModal({ isOpen, onClose, onSuccess }: RegisterTenantModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Dados da Assistência
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("SP");
  const [cnpj, setCnpj] = useState("");

  // Dados do Dono / Responsável
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  // Termos de Uso e LGPD
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);

  if (!isOpen) return null;

  // Formatação automática do telefone / WhatsApp
  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 11);
    let formatted = raw;
    if (raw.length > 2) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    }
    if (raw.length > 7) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    }
    setPhone(formatted);
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!companyName.trim()) {
      setErrorMsg("Preencha o nome da sua assistência técnica.");
      return;
    }
    if (!phone.trim()) {
      setErrorMsg("Informe o WhatsApp da assistência para receber alertas.");
      return;
    }
    setStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!ownerName || !ownerEmail || !ownerPassword) {
      setErrorMsg("Preencha todos os dados de acesso do administrador.");
      return;
    }

    if (ownerPassword.length < 6) {
      setErrorMsg("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          cnpj: cnpj.trim() || undefined,
          phone: phone.trim(),
          city: city.trim() || "São Paulo",
          state: state || "SP",
          ownerName: ownerName.trim(),
          ownerEmail: ownerEmail.trim().toLowerCase(),
          ownerPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha ao registrar assistência técnica.");
      }

      onSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b0f19] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/10 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        
        {/* Header com Estética Linear Dark & Gradiente Sutil */}
        <div className="p-6 relative border-b border-white/[0.08] bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-400/30 text-cyan-300 text-[11px] font-bold px-3 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              14 Dias de Teste Gratuito • Plano Pro
            </span>
          </div>
          
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Cadastre sua Assistência Técnica
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Zero bitributação no Bling e laudos periciais com o logo da sua oficina em minutos.
          </p>

          {/* Stepper Progressivo de 2 Passos */}
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/[0.08] text-xs font-semibold">
            <div className={`flex items-center gap-2 ${step === 1 ? "text-cyan-400 font-bold" : "text-slate-500"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${step === 1 ? "bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/50" : "bg-slate-800 text-slate-400"}`}>
                1
              </span>
              <span>Dados da Oficina</span>
            </div>
            
            <div className={`w-8 h-0.5 rounded-full transition-colors duration-300 ${step === 2 ? "bg-cyan-500" : "bg-slate-800"}`}></div>
            
            <div className={`flex items-center gap-2 ${step === 2 ? "text-cyan-400 font-bold" : "text-slate-500"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${step === 2 ? "bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/50" : "bg-slate-800 text-slate-400"}`}>
                2
              </span>
              <span>Acesso do Dono</span>
            </div>
          </div>
        </div>

        {/* Corpo do Formulário */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nome da Assistência Técnica *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Ex: Laser Tech Assistência Especializada"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-900/90 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    WhatsApp da Oficina *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="(11) 99999-8888"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-900/90 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    CNPJ ou CPF (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900/90 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Cidade (Opcional)</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="Ex: Ribeirão Preto"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-900/90 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/50 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">UF</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-900/90 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500/50 outline-none cursor-pointer"
                  >
                    {["SP", "RJ", "MG", "PR", "SC", "RS", "GO", "DF", "BA", "PE", "CE", "AM", "ES", "MT", "MS"].map(uf => (
                      <option key={uf} value={uf} className="bg-slate-900 text-white">{uf}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Benefícios Inclusos */}
              <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Seu período gratuito de 14 dias inclui:</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Faturamento Bifásico</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Laudos com seu Logo</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Trava de Estresse Térmico</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Rastreio via WhatsApp</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-black px-6 py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                >
                  <span>Continuar para Passo 2</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Seu Nome Completo (Dono / Responsável) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Ex: Carlos Silva"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-900/90 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/50 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  E-mail Corporativo de Acesso *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="carlos@lasertech.com.br"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-900/90 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/50 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Crie sua Senha de Acesso *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-900/90 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/50 outline-none"
                  />
                </div>
              </div>

              {/* Checkbox Termos de Uso e LGPD */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  required
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                />
                <label htmlFor="acceptTerms" className="text-xs text-slate-400 leading-snug cursor-pointer select-none">
                  Li e concordo com os{" "}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-cyan-400 hover:underline font-semibold inline cursor-pointer"
                  >
                    Termos de Uso
                  </button>{" "}
                  e a{" "}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-cyan-400 hover:underline font-semibold inline cursor-pointer"
                  >
                    Política de Privacidade (LGPD)
                  </button>
                  .
                </label>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                <span>🛡️</span>
                <span><strong>Risco zero:</strong> Nenhum cartão de crédito é exigido para iniciar os 14 dias de teste.</span>
              </div>

              <div className="pt-2 flex justify-between items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-400 hover:text-white font-medium cursor-pointer px-2 py-1"
                >
                  ← Voltar ao Passo 1
                </button>
                <button
                  type="submit"
                  disabled={loading || !acceptedTerms}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black px-6 py-3 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition transform hover:-translate-y-0.5 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Criando sua oficina..." : "Ativar Teste de 14 Dias"}
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Modal de Termos de Uso e LGPD */}
      {showTermsModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0b0f19] rounded-2xl shadow-2xl border border-white/10 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-slate-100">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-900/80">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                Termos de Uso e Diretrizes de Privacidade (LGPD)
              </h3>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-xs text-slate-300 space-y-4 leading-relaxed">
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-200 text-[11px]">
                <strong>Licenciante:</strong> {LEGAL_TERMS.companyName} • CNPJ: {LEGAL_TERMS.cnpj} • Foro: {LEGAL_TERMS.jurisdiction}
              </div>

              {LEGAL_TERMS.sections.map((section, idx) => (
                <section key={idx} className="space-y-1.5">
                  <h4 className="font-bold text-white text-sm">{section.title}</h4>
                  <p>{section.content}</p>
                </section>
              ))}
            </div>

            <div className="p-4 border-t border-white/10 bg-slate-900/80 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setAcceptedTerms(true);
                  setShowTermsModal(false);
                }}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
              >
                Entendido e Aceito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
