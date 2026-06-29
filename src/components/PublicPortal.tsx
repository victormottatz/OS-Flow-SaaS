/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PublicPortal — Portal de Acompanhamento Público de OS
 * Acessível em /acompanhar sem necessidade de autenticação.
 */

import React, { useState, useEffect, useCallback } from "react";

// ─── Tipos locais (sem importar do types.ts para manter isolamento) ────────────
interface OSPublicData {
  osNumber: string;
  status: string;
  statusLabel: string;
  statusMessage: string;
  statusColor: "yellow" | "orange" | "blue" | "green" | "purple" | "gray";
  statusStep: number;
  deviceLabel: string;
  reportedDefect: string;
  accessoriesLeft: string;
  createdAt: string;
  clientName: string;
  totalCost: number | null;
}

// ─── Configurações dos steps do stepper ──────────────────────────────────────
const STEPS = [
  { step: 1, key: "ORCAMENTO",       label: "Orçamento",     icon: "receipt_long" },
  { step: 2, key: "AGUARDANDO_PECA", label: "Aguard. Peça",  icon: "inventory_2" },
  { step: 3, key: "EM_MANUTENCAO",   label: "Em Manutenção", icon: "build" },
  { step: 4, key: "PRONTO_RETIRADA", label: "Pronto!",       icon: "check_circle" },
  { step: 5, key: "FINALIZADO",      label: "Finalizado",    icon: "verified" },
];

// ─── Utilitários ─────────────────────────────────────────────────────────────
function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1/$2");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

// ─── Componente de cor por status ─────────────────────────────────────────────
const statusColorMap = {
  yellow: { bg: "rgba(253,192,3,0.15)", border: "#fdc003", text: "#fdc003", glow: "0 0 20px rgba(253,192,3,0.25)" },
  orange: { bg: "rgba(249,115,22,0.12)", border: "#f97316", text: "#f97316", glow: "0 0 20px rgba(249,115,22,0.2)" },
  blue:   { bg: "rgba(59,130,246,0.12)", border: "#3b82f6", text: "#3b82f6", glow: "0 0 20px rgba(59,130,246,0.2)" },
  green:  { bg: "rgba(16,185,129,0.12)", border: "#10b981", text: "#10b981", glow: "0 0 20px rgba(16,185,129,0.25)" },
  purple: { bg: "rgba(139,92,246,0.12)", border: "#8b5cf6", text: "#8b5cf6", glow: "0 0 20px rgba(139,92,246,0.2)" },
  gray:   { bg: "rgba(100,116,139,0.12)", border: "#64748b", text: "#94a3b8", glow: "none" },
};

export default function PublicPortal() {
  // ── Estado do formulário
  const [osNumber, setOsNumber] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OSPublicData | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // ── Detectar deep-link: /acompanhar?os=OS-0042
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const osParam = params.get("os");
    if (osParam) {
      setOsNumber(osParam.toUpperCase());
    }
  }, []);

  const handleConsultar = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!osNumber.trim() || !cpfCnpj.trim()) {
      setError("Preencha o número da OS e o CPF/CNPJ para consultar.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setHasSearched(true);

    try {
      const res = await fetch(
        `/api/publico/os?numero=${encodeURIComponent(osNumber.trim())}&cpfCnpj=${encodeURIComponent(cpfCnpj.replace(/\D/g, ""))}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Não encontramos nenhuma OS com os dados informados. Verifique e tente novamente.");
        return;
      }
      setResult(data);
    } catch {
      setError("Falha de conexão com o servidor. Tente novamente em alguns instantes.");
    } finally {
      setIsLoading(false);
    }
  }, [osNumber, cpfCnpj]);

  const handleNovaConsulta = () => {
    setResult(null);
    setError(null);
    setHasSearched(false);
    setOsNumber("");
    setCpfCnpj("");
  };

  const colors = result ? statusColorMap[result.statusColor] : statusColorMap.gray;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0a 0%, #111827 50%, #0a0a0a 100%)",
      fontFamily: "'Inter', system-ui, sans-serif",
      color: "#f8fafc",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* ── HEADER ── */}
      <header style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(28,27,27,0.95)",
        backdropFilter: "blur(12px)",
        padding: "1rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: 36, height: 36,
            background: "#fdc003",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 12px rgba(253,192,3,0.35)",
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#1c1b1b", fontVariationSettings: "'FILL' 1" }}>
              build_circle
            </span>
          </div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "#f8fafc", letterSpacing: "-0.02em" }}>
              MGV Assistência Técnica
            </div>
            <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: 1 }}>Portal do Cliente</div>
          </div>
        </div>

        <a
          href="tel:+551132189900"
          style={{
            display: "flex", alignItems: "center", gap: "0.4rem",
            fontSize: "0.78rem", color: "#fdc003", textDecoration: "none",
            fontWeight: 500,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>phone</span>
          <span style={{ display: "none" }} id="phone-label">(11) 3218-9900</span>
        </a>
      </header>

      {/* ── CONTEÚDO PRINCIPAL ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem 1rem 4rem" }}>

        {/* ── HERO ── */}
        <div style={{ textAlign: "center", maxWidth: 560, marginBottom: "2.5rem", animation: "fadeIn 0.5s ease-out" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            background: "rgba(253,192,3,0.1)", border: "1px solid rgba(253,192,3,0.2)",
            borderRadius: 100, padding: "0.3rem 0.85rem",
            fontSize: "0.72rem", color: "#fdc003", fontWeight: 600, letterSpacing: "0.08em",
            textTransform: "uppercase", marginBottom: "1.25rem",
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>radar</span>
            Acompanhamento em Tempo Real
          </div>

          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            margin: "0 0 0.75rem",
            lineHeight: 1.15,
          }}>
            Onde está o seu{" "}
            <span style={{ color: "#fdc003" }}>equipamento?</span>
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.6, margin: 0 }}>
            Consulte o status da sua Ordem de Serviço informando o número da OS
            e seu CPF ou CNPJ. Seus dados são protegidos.
          </p>
        </div>

        {/* ── FORMULÁRIO DE CONSULTA ── */}
        {!result && (
          <form
            onSubmit={handleConsultar}
            style={{
              width: "100%", maxWidth: 480,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "1.75rem",
              backdropFilter: "blur(12px)",
              animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)",
            }}
            id="consulta-form"
          >
            {/* Campo OS */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label htmlFor="input-os" style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8", marginBottom: "0.5rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Número da OS
              </label>
              <div style={{ position: "relative" }}>
                <span className="material-symbols-outlined" style={{
                  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                  color: "#475569", fontSize: 18,
                }}>
                  assignment
                </span>
                <input
                  id="input-os"
                  type="text"
                  value={osNumber}
                  onChange={e => setOsNumber(e.target.value.toUpperCase())}
                  placeholder="Ex: OS-0042"
                  autoComplete="off"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    padding: "0.75rem 0.875rem 0.75rem 2.75rem",
                    color: "#f8fafc",
                    fontSize: "0.95rem",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 500,
                    letterSpacing: "0.05em",
                    outline: "none",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#fdc003")}
                  onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                />
              </div>
            </div>

            {/* Campo CPF/CNPJ */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label htmlFor="input-cpf" style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8", marginBottom: "0.5rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                CPF ou CNPJ do titular
              </label>
              <div style={{ position: "relative" }}>
                <span className="material-symbols-outlined" style={{
                  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                  color: "#475569", fontSize: 18,
                }}>
                  badge
                </span>
                <input
                  id="input-cpf"
                  type="text"
                  inputMode="numeric"
                  value={cpfCnpj}
                  onChange={e => setCpfCnpj(formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  autoComplete="off"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    padding: "0.75rem 0.875rem 0.75rem 2.75rem",
                    color: "#f8fafc",
                    fontSize: "0.95rem",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 500,
                    letterSpacing: "0.04em",
                    outline: "none",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#fdc003")}
                  onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                />
              </div>
              <p style={{ fontSize: "0.72rem", color: "#475569", marginTop: "0.4rem", marginBottom: 0 }}>
                🔒 Usado apenas para validar sua identidade. Não armazenamos esta consulta.
              </p>
            </div>

            {/* Erro */}
            {error && (
              <div style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 10,
                padding: "0.75rem 1rem",
                marginBottom: "1.25rem",
                display: "flex", alignItems: "flex-start", gap: "0.625rem",
              }}>
                <span className="material-symbols-outlined" style={{ color: "#ef4444", fontSize: 18, flexShrink: 0, marginTop: 1 }}>error</span>
                <p style={{ margin: 0, fontSize: "0.83rem", color: "#fca5a5", lineHeight: 1.5 }}>{error}</p>
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={isLoading}
              id="btn-consultar"
              style={{
                width: "100%",
                background: isLoading ? "rgba(253,192,3,0.5)" : "#fdc003",
                color: "#1c1b1b",
                border: "none",
                borderRadius: 10,
                padding: "0.875rem",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor: isLoading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                transition: "all 0.2s",
                boxShadow: isLoading ? "none" : "0 0 20px rgba(253,192,3,0.25)",
              }}
              onMouseEnter={e => { if (!isLoading) (e.currentTarget.style.background = "#e5ac00"); }}
              onMouseLeave={e => { if (!isLoading) (e.currentTarget.style.background = "#fdc003"); }}
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, animation: "spin 1s linear infinite" }}>sync</span>
                  Consultando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>search</span>
                  Consultar Minha OS
                </>
              )}
            </button>
          </form>
        )}

        {/* ── RESULTADO ── */}
        {result && (
          <div style={{ width: "100%", maxWidth: 600, animation: "slideUp 0.45s cubic-bezier(0.16,1,0.3,1)" }}>

            {/* Header do resultado */}
            <div style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: "1.5rem",
              marginBottom: "1rem",
              boxShadow: colors.glow,
              textAlign: "center",
            }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                background: `${colors.bg}`,
                border: `1px solid ${colors.border}`,
                borderRadius: 100,
                padding: "0.35rem 1rem",
                fontSize: "0.75rem",
                color: colors.text,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: "0.875rem",
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15, fontVariationSettings: "'FILL' 1" }}>
                  {STEPS.find(s => s.key === result.status)?.icon || "info"}
                </span>
                {result.statusLabel}
              </div>

              <h2 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.5rem",
                letterSpacing: "-0.02em",
              }}>
                Olá, {result.clientName}! 👋
              </h2>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: "0 0 0.25rem", lineHeight: 1.5 }}>
                {result.statusMessage}
              </p>
              <p style={{ color: "#475569", fontSize: "0.75rem", margin: 0 }}>
                OS: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#fdc003", fontWeight: 600 }}>{result.osNumber}</span>
                {" · "}Entrada em {formatDate(result.createdAt)}
              </p>
            </div>

            {/* ── STEPPER ── */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16,
              padding: "1.25rem 1rem",
              marginBottom: "1rem",
            }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 1rem", textAlign: "center" }}>
                Progresso do Reparo
              </p>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative" }}>
                {/* Linha de progresso */}
                <div style={{
                  position: "absolute", top: 18, left: "10%", right: "10%",
                  height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 1,
                  zIndex: 0,
                }} />
                <div style={{
                  position: "absolute", top: 18, left: "10%",
                  height: 2,
                  width: `${Math.max(0, Math.min(100, ((result.statusStep - 1) / 4) * 100))}%`,
                  background: `linear-gradient(90deg, #fdc003, ${colors.border})`,
                  borderRadius: 1,
                  zIndex: 1,
                  transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
                }} />

                {STEPS.map((step) => {
                  const isDone = step.step < result.statusStep;
                  const isCurrent = step.step === result.statusStep;
                  return (
                    <div key={step.key} style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      gap: "0.5rem", flex: 1, position: "relative", zIndex: 2,
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: isCurrent ? colors.border : isDone ? "#fdc003" : "rgba(255,255,255,0.07)",
                        border: isCurrent ? `2px solid ${colors.border}` : isDone ? "2px solid #fdc003" : "2px solid rgba(255,255,255,0.1)",
                        boxShadow: isCurrent ? colors.glow : isDone ? "0 0 10px rgba(253,192,3,0.3)" : "none",
                        transition: "all 0.4s ease",
                      }}>
                        <span className="material-symbols-outlined" style={{
                          fontSize: 16,
                          color: isCurrent || isDone ? "#1c1b1b" : "#475569",
                          fontVariationSettings: "'FILL' 1",
                        }}>
                          {isDone ? "check" : step.icon}
                        </span>
                      </div>
                      <span style={{
                        fontSize: "0.62rem",
                        fontWeight: isCurrent ? 700 : 400,
                        color: isCurrent ? colors.text : isDone ? "#fdc003" : "#475569",
                        textAlign: "center",
                        lineHeight: 1.3,
                        maxWidth: 64,
                      }}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── CARDS DE INFO ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              {/* Card Equipamento */}
              <div style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12, padding: "1rem",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#64748b" }}>devices</span>
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>Equipamento</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 600, color: "#e2e8f0", lineHeight: 1.4 }}>
                  {result.deviceLabel}
                </p>
              </div>

              {/* Card Acessórios */}
              <div style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12, padding: "1rem",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#64748b" }}>backpack</span>
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>Acessórios</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.83rem", color: "#94a3b8", lineHeight: 1.4 }}>
                  {result.accessoriesLeft}
                </p>
              </div>
            </div>

            {/* Card Defeito Relatado */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12, padding: "1rem",
              marginBottom: "1rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#64748b" }}>report_problem</span>
                <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>Problema Reportado</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.88rem", color: "#cbd5e1", lineHeight: 1.5, fontStyle: "italic" }}>
                "{result.reportedDefect}"
              </p>
            </div>

            {/* Card Valor Total (só quando pronto/finalizado) */}
            {result.totalCost !== null && (
              <div style={{
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.25)",
                borderRadius: 12, padding: "1rem",
                marginBottom: "1rem",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                boxShadow: "0 0 16px rgba(16,185,129,0.1)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#10b981", fontVariationSettings: "'FILL' 1" }}>payments</span>
                  <div>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "#6ee7b7", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Valor do Serviço</p>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8" }}>Venha preparado para retirar</p>
                  </div>
                </div>
                <span style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "1.4rem", fontWeight: 700,
                  color: "#10b981",
                  letterSpacing: "-0.02em",
                }}>
                  {formatCurrency(result.totalCost)}
                </span>
              </div>
            )}

            {/* ── AÇÕES ── */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <a
                href="https://wa.me/551132189900"
                target="_blank"
                rel="noopener noreferrer"
                id="btn-whatsapp"
                style={{
                  flex: 1, minWidth: 140,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                  background: "rgba(37,211,102,0.12)",
                  border: "1px solid rgba(37,211,102,0.3)",
                  borderRadius: 10, padding: "0.75rem",
                  color: "#25d366", textDecoration: "none",
                  fontSize: "0.85rem", fontWeight: 600,
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(37,211,102,0.2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(37,211,102,0.12)")}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
                Falar no WhatsApp
              </a>

              <button
                onClick={handleNovaConsulta}
                id="btn-nova-consulta"
                style={{
                  flex: 1, minWidth: 140,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10, padding: "0.75rem",
                  color: "#94a3b8",
                  fontSize: "0.85rem", fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.09)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
                Nova Consulta
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "1.25rem",
        textAlign: "center",
        fontSize: "0.72rem",
        color: "#334155",
      }}>
        <p style={{ margin: 0 }}>
          MGV Tecnologia & Assistência Técnica © {new Date().getFullYear()} — Av. Tiradentes, 850 — (11) 3218-9900
        </p>
        <p style={{ margin: "0.25rem 0 0" }}>
          <a href="/" style={{ color: "#475569", textDecoration: "none" }}>← Acesso Restrito (Colaboradores)</a>
        </p>
      </footer>

      {/* ── ESTILOS GLOBAIS INLINE ── */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input::placeholder { color: #334155; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        #phone-label { display: inline !important; }
        @media (max-width: 420px) {
          #phone-label { display: none !important; }
        }
      `}</style>
    </div>
  );
}
