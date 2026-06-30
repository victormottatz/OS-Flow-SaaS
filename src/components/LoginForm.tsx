/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, UserRole } from "../types";


interface LoginFormProps {
  onLoginSuccess: (user: User, token: string) => void;
  isOffline: boolean;
}

export default function LoginForm({ onLoginSuccess, isOffline }: LoginFormProps) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.EDITOR);
  
  // Feedbacks
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Simple password strength verification
  const validatePassword = (pwd: string) => {
    if (pwd.length < 6) {
      return "A senha deve conter no mínimo 6 caracteres.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (isOffline) {
      setErrorMsg("O sistema está offline. Não é possível processar requisições Supabase Auth sem internet.");
      return;
    }

    if (!email || !password || (!isLoginMode && !name)) {
      setErrorMsg("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const pwdErr = validatePassword(password);
    if (!isLoginMode && pwdErr) {
      setErrorMsg(pwdErr);
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLoginMode ? "/api/auth/login" : "/api/auth/register";
      const body = isLoginMode ? { email, password } : { name, email, password, role };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar solicitação.");
      }

      if (isLoginMode) {
        onLoginSuccess(data.user, data.token);
      } else {
        setSuccessMsg("Colaborador registrado com sucesso na infraestrutura Supabase!");
        // Clear registration fields and switch to login
        setName("");
        setEmail("");
        setPassword("");
        setRole(UserRole.EDITOR);
        setTimeout(() => {
          setIsLoginMode(true);
          setSuccessMsg("");
        }, 2200);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Falha ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 relative overflow-hidden">
      {/* Dynamic Background Blur Shapes */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md glassmorphism-dark rounded-2xl shadow-2xl overflow-hidden relative z-10 hover:border-slate-800 transition-all duration-500 anim-fadein">
        {/* Banner Area */}
        <div className="px-6 py-8 text-white relative text-center border-b border-slate-800/60 bg-slate-950/40">
          <div className="absolute top-3 right-3 flex items-center bg-teal-500/10 text-teal-400 border border-teal-500/30 font-mono text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full select-none anim-pulse">
            Supabase Auth Ativo
          </div>
          <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-2xl mx-auto flex items-center justify-center font-extrabold text-slate-950 mb-3 shadow-lg neon-glow-emerald">
            MGV
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white font-display">MGV Assistência Técnica</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Substituto Corporativo Web Integrado do SH Oficina Desktop
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex border-b border-slate-800/60 bg-slate-950/20">
          <button
            onClick={() => {
              setIsLoginMode(true);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`w-1/2 py-3.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              isLoginMode
                ? "text-teal-400 bg-teal-950/20 border-b-2 border-teal-500"
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/10"
            }`}
          >
            Acessar Sistema
          </button>
          <button
            onClick={() => {
              setIsLoginMode(false);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`w-1/2 py-3.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              !isLoginMode
                ? "text-teal-400 bg-teal-950/20 border-b-2 border-teal-500"
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/10"
            }`}
          >
            Cadastrar Técnico
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {errorMsg && (
            <div className="mb-5 bg-red-950/50 border-l-4 border-red-500 p-3 rounded-lg text-xs text-red-200 flex items-start space-x-2 border border-red-900/20 anim-slideup">
              <span className="material-symbols-outlined text-[16px] text-red-400 mt-0.5 shrink-0">shield_alert</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 bg-emerald-950/50 border-l-4 border-emerald-500 p-3 rounded-lg text-xs text-emerald-200 flex items-start space-x-2 border border-emerald-900/20 anim-slideup">
              <span className="material-symbols-outlined text-[16px] text-emerald-400 mt-0.5 shrink-0">check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLoginMode && (
              <div className="anim-slideup">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Vinícius Souza"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-650 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 hover:border-slate-700 transition duration-200"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                E-mail de Trabalho
              </label>
              <input
                type="email"
                required
                placeholder="Ex: tecnico@mgv.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-650 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 hover:border-slate-700 transition duration-200"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Senha Segura
              </label>
              <input
                type="password"
                required
                placeholder="• • • • • •"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-650 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 hover:border-slate-700 transition duration-200"
              />
            </div>

            {!isLoginMode && (
              <div className="anim-slideup">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Perfil de Acesso (Role)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 hover:border-slate-700 transition duration-200"
                >
                  <option value={UserRole.EDITOR}>EDITOR (Técnicos e Atendentes)</option>
                  <option value={UserRole.OWNER}>OWNER (Diretores e Administradores)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-2 flex items-start space-x-1.5 leading-relaxed">
                  <span className="material-symbols-outlined text-[14px] text-teal-400 shrink-0 mt-0.5">info</span>
                  <span>
                    O perfil EDITOR não possui privilégios de exclusão (Políticas RLS ativas).
                  </span>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-teal-400 hover:bg-teal-350 active:bg-teal-500 text-slate-950 py-2.5 rounded-lg text-xs uppercase tracking-wider font-extrabold shadow-md flex items-center justify-center space-x-2 disabled:bg-slate-800 disabled:text-slate-550 disabled:cursor-not-allowed hover-premium active-premium"
            >
              {loading ? (
                <span>Tratando com o Supabase Auth...</span>
              ) : isLoginMode ? (
                <>
                  <span className="material-symbols-outlined text-[16px]">login</span>
                  <span>Acessar Oficina</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  <span>Cadastrar no Banco</span>
                </>
              )}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
