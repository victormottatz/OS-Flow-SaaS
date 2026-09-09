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
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("SP");

  // Dados do Dono / Responsável
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  // Termos de Uso e LGPD
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  if (!isOpen) return null;

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!companyName || !phone || !city) {
      setErrorMsg("Preencha o nome da assistência, telefone e cidade.");
      return;
    }
    setStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!ownerName || !ownerEmail || !ownerPassword) {
      setErrorMsg("Preencha todos os dados do responsável.");
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
          companyName,
          cnpj,
          phone,
          city,
          state,
          ownerName,
          ownerEmail,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header com Gradiente */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-400/20 border border-emerald-300/40 text-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              14 Dias de Teste Grátis no Plano Pro
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Criar Conta para sua Assistência Técnica</h2>
          <p className="text-blue-100 text-xs mt-1">
            O único sistema projetado sob medida para manutenção de Laser, Criolipólise e Eletromédicos.
          </p>

          {/* Indicador de Passos */}
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/10 text-xs">
            <div className={`flex items-center gap-1.5 font-medium ${step === 1 ? "text-white font-bold" : "text-blue-200"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 1 ? "bg-white text-blue-800" : "bg-blue-800 text-white"}`}>1</span>
              Dados da Oficina
            </div>
            <div className="w-6 h-px bg-white/20"></div>
            <div className={`flex items-center gap-1.5 font-medium ${step === 2 ? "text-white font-bold" : "text-blue-200"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 2 ? "bg-white text-blue-800" : "bg-blue-800 text-white"}`}>2</span>
              Administrador
            </div>
          </div>
        </div>

        {/* Corpo do Formulário */}
        <div className="p-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome da Assistência Técnica *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Laser Tech Assistência Especializada"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CNPJ (Opcional)</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp da Oficina *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="(11) 99999-8888"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cidade *</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Ribeirão Preto"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">UF *</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    {["SP", "RJ", "MG", "PR", "SC", "RS", "GO", "DF", "BA", "PE", "CE", "AM", "ES", "MT", "MS"].map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Benefícios Inclusos */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Seu teste gratuito de 14 dias inclui:
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Faturamento Bifásico</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Laudos em PDF com seu Logo</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Teste de Estresse de Laser</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> WhatsApp Integrado</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seu Nome Completo (Responsável/Dono) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Silva"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail Corporativo de Acesso *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="carlos@lasertech.com.br"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Senha de Acesso *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  required
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="acceptTerms" className="text-xs text-slate-600 leading-snug cursor-pointer select-none">
                  Li e concordo com os{" "}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-blue-600 hover:underline font-semibold inline cursor-pointer"
                  >
                    Termos de Uso
                  </button>{" "}
                  e a{" "}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-blue-600 hover:underline font-semibold inline cursor-pointer"
                  >
                    Política de Privacidade (LGPD)
                  </button>
                  .
                </label>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                🔒 <strong>Sem compromisso:</strong> Nenhum cartão de crédito é exigido para iniciar os 14 dias de teste.
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                >
                  ← Voltar
                </button>
                <button
                  type="submit"
                  disabled={loading || !acceptedTerms}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Criando sua oficina..." : "Ativar Teste Gratuito"}
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Modal de Termos de Uso e LGPD */}
      {showTermsModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Termos de Uso e Diretrizes de Privacidade (LGPD)
              </h3>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-xs text-slate-650 space-y-4 leading-relaxed">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-900 text-[11px]">
                <strong>Licenciante:</strong> {LEGAL_TERMS.companyName} • CNPJ: {LEGAL_TERMS.cnpj} • Foro: {LEGAL_TERMS.jurisdiction}
              </div>

              {LEGAL_TERMS.sections.map((section, idx) => (
                <section key={idx} className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 text-sm">{section.title}</h4>
                  <p>{section.content}</p>
                </section>
              ))}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setAcceptedTerms(true);
                  setShowTermsModal(false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
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
