import React, { useState, useEffect } from "react";
import { 
  Sparkles, Check, ShieldCheck, QrCode, CreditCard, X, 
  AlertCircle, RefreshCw, Star, Copy, MessageCircle, 
  Building, CheckCircle2, UserCheck, ShieldAlert 
} from "lucide-react";
import { Plan, Subscription, User, UserRole } from "../types";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
}

interface PixConfig {
  pixKey: string;
  pixName: string;
  pixBank: string;
  pixWhatsapp: string;
}

export default function SubscriptionModal({ isOpen, onClose, user }: SubscriptionModalProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [cycle, setCycle] = useState<"MONTHLY" | "ANNUAL">("ANNUAL");
  const [paymentMethod, setPaymentMethod] = useState<"DIRECT_PIX" | "PIX" | "CREDIT_CARD">("DIRECT_PIX");
  const [loading, setLoading] = useState(false);
  const [pixConfig, setPixConfig] = useState<PixConfig>({
    pixKey: "financeiro@osflow.com.br",
    pixName: "OS-Flow Tecnologia / MGV",
    pixBank: "Banco Inter / Nu Pagamentos",
    pixWhatsapp: "5516999999999"
  });
  const [copiedPix, setCopiedPix] = useState(false);
  const [pixData, setPixData] = useState<{ qrCode?: string; copyPaste?: string } | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Estados exclusivos para o Dono (Owner)
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminCompanyId, setAdminCompanyId] = useState("");
  const [adminDays, setAdminDays] = useState(30);
  const [adminTier, setAdminTier] = useState<"STARTER" | "PRO" | "ENTERPRISE">("PRO");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState("");

  const isOwner = user?.role === UserRole.OWNER || user?.role === ("OWNER" as any);

  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      try {
        const token = localStorage.getItem("mgv_token");
        const [plansRes, subRes, pixRes] = await Promise.all([
          fetch("/api/billing/plans"),
          fetch("/api/billing/subscription", {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch("/api/billing/pix-config")
        ]);

        if (plansRes.ok) {
          const p = await plansRes.json();
          setPlans(p);
          if (p.length > 0) {
            const pro = p.find((item: Plan) => item.tier === "PRO") || p[0];
            setSelectedPlanId(pro.id);
          }
        }

        if (subRes.ok) {
          const s = await subRes.json();
          setSubscription(s.subscription);
        }

        if (pixRes.ok) {
          const cfg = await pixRes.json();
          setPixConfig(cfg);
        }
      } catch (err) {
        console.error("Erro ao carregar dados de assinatura:", err);
      }
    };

    fetchData();
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
  const finalPrice = selectedPlan
    ? cycle === "ANNUAL"
      ? selectedPlan.priceAnnual
      : selectedPlan.priceMonthly
    : 0;

  const handleCopyPixKey = () => {
    navigator.clipboard.writeText(pixConfig.pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const generateWhatsAppUrl = () => {
    const companyName = user?.company?.name || "Minha Oficina";
    const planName = selectedPlan ? selectedPlan.name : "Plano Pro";
    const cycleLabel = cycle === "ANNUAL" ? "Anual" : "Mensal";

    const msg = `Olá! Acabei de realizar a transferência via PIX no valor de *R$ ${finalPrice}* referente ao plano *${planName} (${cycleLabel})* da assistência *${companyName}*. Segue o comprovante em anexo para ativação da conta!`;
    const cleanPhone = pixConfig.pixWhatsapp.replace(/\D/g, "");
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  const handleCheckout = async () => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const token = localStorage.getItem("mgv_token");

      if (paymentMethod === "DIRECT_PIX") {
        // Registra a intenção de PIX manual
        const res = await fetch("/api/billing/notify-pix", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            planId: selectedPlanId,
            cycle
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Falha ao registrar pagamento.");

        setSuccessMsg("Pagamento registrado! Envie o comprovante pelo botão do WhatsApp abaixo para ativação imediata.");
        if (data.subscription) setSubscription(data.subscription);
        return;
      }

      // Fluxo de checkout tradicional (Asaas / Gateway)
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          planId: selectedPlanId,
          cycle,
          paymentMethod: paymentMethod === "PIX" ? "PIX" : "CREDIT_CARD"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao processar assinatura.");

      if (paymentMethod === "PIX" && data.invoice) {
        setPixData({
          qrCode: data.invoice.pixQrCode,
          copyPaste: data.invoice.pixCopyPaste
        });
      }

      setSuccessMsg("Assinatura confirmada e ativada com sucesso!");
      setSubscription(data.subscription);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao processar assinatura.");
    } finally {
      setLoading(false);
    }
  };

  // Ativação manual pelo Dono
  const handleAdminActivate = async () => {
    if (!adminCompanyId.trim()) {
      setAdminFeedback("Informe o ID da Empresa (Tenant).");
      return;
    }

    setAdminLoading(true);
    setAdminFeedback("");

    try {
      const token = localStorage.getItem("mgv_token");
      const res = await fetch("/api/billing/admin/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          companyId: adminCompanyId.trim(),
          days: adminDays,
          planTier: adminTier
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na ativação manual.");

      setAdminFeedback(`✅ ${data.message}`);
    } catch (err: any) {
      setAdminFeedback(`❌ ${err.message}`);
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-between mb-2">
            <span className="bg-amber-400/20 border border-amber-300/40 text-amber-300 text-xs font-bold px-3 py-0.5 rounded-full flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-300" />
              Gestão de Assinatura & Planos
            </span>

            {isOwner && (
              <button
                type="button"
                onClick={() => setShowAdminPanel(!showAdminPanel)}
                className="text-[11px] bg-white/10 hover:bg-white/20 text-white font-medium px-2.5 py-1 rounded-lg border border-white/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                {showAdminPanel ? "Ver Planos" : "Painel do Dono"}
              </button>
            )}
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Potencialize sua Assistência Técnica</h2>
          <p className="text-slate-300 text-xs mt-1">
            Escolha o plano ideal para a escala de manutenção da sua oficina.
          </p>

          {/* Toggle Mensal / Anual */}
          {!showAdminPanel && (
            <div className="flex items-center justify-center mt-5">
              <div className="bg-slate-800/80 p-1 rounded-xl border border-white/10 flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setCycle("MONTHLY")}
                  className={`px-4 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    cycle === "MONTHLY" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setCycle("ANNUAL")}
                  className={`px-4 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
                    cycle === "ANNUAL" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Anual
                  <span className="bg-emerald-400 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.2 rounded-md">
                    Economize 2 meses
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Painel do Dono (Ativação Manual Direta) */}
          {showAdminPanel && isOwner ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Ativação Manual de Assinatura (SaaS Owner)</h3>
                  <p className="text-xs text-slate-500">
                    Libere ou estenda a assinatura de qualquer oficina parceira após conferir o comprovante PIX no WhatsApp.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ID da Empresa (Tenant ID)</label>
                  <input
                    type="text"
                    placeholder="Ex: UUID da empresa"
                    value={adminCompanyId}
                    onChange={(e) => setAdminCompanyId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                  {user?.company?.id && (
                    <button
                      type="button"
                      onClick={() => setAdminCompanyId(user.company?.id || "")}
                      className="text-[11px] text-blue-600 hover:underline mt-1 block"
                    >
                      Preencher minha própria oficina ({user.company.name})
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Plano a Liberar</label>
                  <select
                    value={adminTier}
                    onChange={(e) => setAdminTier(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="STARTER">Starter</option>
                    <option value="PRO">Pro (Completo)</option>
                    <option value="ENTERPRISE">Enterprise (Redes)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Período de Acesso</label>
                  <select
                    value={adminDays}
                    onChange={(e) => setAdminDays(Number(e.target.value))}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={30}>30 Dias (1 Mês)</option>
                    <option value={60}>60 Dias (2 Meses)</option>
                    <option value={90}>90 Dias (3 Meses)</option>
                    <option value={180}>180 Dias (Semestral)</option>
                    <option value={365}>365 Dias (1 Ano Completo)</option>
                  </select>
                </div>
              </div>

              {adminFeedback && (
                <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium">
                  {adminFeedback}
                </div>
              )}

              <button
                type="button"
                disabled={adminLoading}
                onClick={handleAdminActivate}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {adminLoading ? "Processando..." : "Confirmar Ativação Imediata (+ Dias)"}
              </button>
            </div>
          ) : (
            <>
              {/* Cards de Planos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((p) => {
                  const isSelected = selectedPlanId === p.id;
                  const isPro = p.tier === "PRO";
                  const price = cycle === "ANNUAL" ? Math.round(p.priceAnnual / 12) : p.priceMonthly;

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlanId(p.id)}
                      className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/30 shadow-lg shadow-blue-500/10"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      {isPro && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow">
                          MAIS POPULAR
                        </span>
                      )}
                      <div>
                        <h3 className="font-bold text-slate-800 text-base">{p.name}</h3>
                        <p className="text-slate-500 text-[11px] mt-1 leading-snug">{p.description}</p>
                        <div className="my-4">
                          <span className="text-2xl font-extrabold text-slate-900">R$ {price}</span>
                          <span className="text-slate-500 text-xs">/mês</span>
                          {cycle === "ANNUAL" && (
                            <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                              R$ {p.priceAnnual} cobrado anualmente
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                          {p.features.map((feat, idx) => (
                            <div key={idx} className="flex items-start gap-1.5">
                              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 pt-3">
                        <button
                          type="button"
                          className={`w-full py-2 rounded-xl text-xs font-bold transition ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          {isSelected ? "Plano Selecionado" : "Escolher"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Opção de Pagamento */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-3">
                  Forma de Pagamento
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("DIRECT_PIX")}
                    className={`p-3 rounded-xl border flex flex-col items-start gap-1 text-xs font-bold transition cursor-pointer ${
                      paymentMethod === "DIRECT_PIX"
                        ? "border-emerald-500 bg-emerald-50/50 text-emerald-900 shadow-sm ring-1 ring-emerald-500"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-emerald-600" />
                      <span>PIX Direto Oficial</span>
                    </div>
                    <span className="text-[10px] font-normal text-slate-500">
                      Chave oficial + Envio WhatsApp
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("PIX")}
                    className={`p-3 rounded-xl border flex flex-col items-start gap-1 text-xs font-bold transition cursor-pointer ${
                      paymentMethod === "PIX"
                        ? "border-blue-600 bg-blue-50/50 text-blue-800 shadow-sm ring-1 ring-blue-600"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-blue-600" />
                      <span>PIX Automático</span>
                    </div>
                    <span className="text-[10px] font-normal text-slate-500">
                      QR Code gerado na hora
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CREDIT_CARD")}
                    className={`p-3 rounded-xl border flex flex-col items-start gap-1 text-xs font-bold transition cursor-pointer ${
                      paymentMethod === "CREDIT_CARD"
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-sm ring-1 ring-indigo-600"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-indigo-600" />
                      <span>Cartão de Crédito</span>
                    </div>
                    <span className="text-[10px] font-normal text-slate-500">
                      Cobrança recorrente
                    </span>
                  </button>
                </div>

                {/* Bloco de PIX Direto (Chave Oficial da Empresa) */}
                {paymentMethod === "DIRECT_PIX" && (
                  <div className="mt-4 p-4 bg-white border-2 border-emerald-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Chave PIX Oficial da Empresa
                      </span>
                      <span className="text-xs font-extrabold text-slate-800">
                        Valor: R$ {finalPrice}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Chave PIX</div>
                        <div className="font-mono text-xs font-bold text-slate-800 select-all">
                          {pixConfig.pixKey}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyPixKey}
                        className="flex items-center gap-1 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium px-3 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        {copiedPix ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Chave</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Favorecido:</span>
                        <span className="font-medium text-slate-700">{pixConfig.pixName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Instituição Financeira:</span>
                        <span className="font-medium text-slate-700">{pixConfig.pixBank}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                      <a
                        href={generateWhatsAppUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 text-xs transition cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Enviar Comprovante pelo WhatsApp</span>
                      </a>
                    </div>
                    <p className="text-[10px] text-slate-400 text-center">
                      Assim que o comprovante for enviado no WhatsApp, nossa equipe libera o acesso em minutos!
                    </p>
                  </div>
                )}

                {/* Bloco de PIX Automático (Gateway) */}
                {paymentMethod === "PIX" && pixData && (
                  <div className="mt-4 p-4 bg-white border border-emerald-200 rounded-xl text-center">
                    <div className="text-xs font-bold text-emerald-800 mb-2">
                      ✅ PIX Copia e Cola Gerado:
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={pixData.copyPaste}
                      className="w-full text-[11px] p-2 bg-slate-50 border rounded-lg font-mono text-slate-700 text-center select-all mb-2"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (pixData.copyPaste) navigator.clipboard.writeText(pixData.copyPaste);
                        alert("Código PIX copiado!");
                      }}
                      className="text-xs bg-emerald-600 text-white font-semibold px-4 py-1.5 rounded-lg hover:bg-emerald-700 cursor-pointer"
                    >
                      Copiar Código PIX
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!showAdminPanel && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Garantia de 7 dias ou seu dinheiro de volta sem burocracia.</span>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={handleCheckout}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {loading
                ? "Processando..."
                : paymentMethod === "DIRECT_PIX"
                ? "Já fiz o PIX (Avisar Sistema)"
                : "Confirmar Assinatura"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

