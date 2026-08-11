/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, UserRole } from "../types";
import AppLogo from "./AppLogo";


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
  const [showPassword, setShowPassword] = useState(false);

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
      setErrorMsg("O sistema está offline. Verifique a conexão com a rede local.");
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
        setSuccessMsg("Colaborador registrado com sucesso!");
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
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50 relative overflow-hidden">
      {/* Dynamic Background Blur Shapes */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-secondary-container/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 bg-slate-medium/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-premium border border-slate-100 overflow-hidden relative z-10 transition-all duration-500 anim-fadein">
        {/* Banner Area */}
        <div className="px-6 py-8 relative text-center border-b border-slate-100 bg-slate-50/50">
          <div className="absolute top-3 right-3 flex items-center bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full select-none">
            Banco de Dados Ativo
          </div>
          <AppLogo 
            src="/logos/LOGO V3.0 - menu lateral.png" 
            fallbackSrc="/logos/LOGO V3.0 - menu lateral.png" 
            className="h-20 mx-auto mb-2 object-contain"
          />
          <p className="text-xs text-slate-500 max-w-xs mx-auto font-medium">
            Substituto Corporativo Web Integrado do SH Oficina Desktop
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/20">
          <button
            onClick={() => {
              setIsLoginMode(true);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`w-1/2 py-3.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              isLoginMode
                ? "text-slate-950 bg-white border-b-2 border-secondary-container"
                : "text-slate-450 hover:text-slate-700 hover:bg-slate-50/20"
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
                ? "text-slate-950 bg-white border-b-2 border-secondary-container"
                : "text-slate-450 hover:text-slate-700 hover:bg-slate-50/20"
            }`}
          >
            Cadastrar Técnico
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {errorMsg && (
            <div className="mb-5 bg-red-50 border-l-4 border-red-500 p-3 rounded-lg text-xs text-red-700 flex items-start space-x-2 border border-red-200 anim-slideup">
              <span className="material-symbols-outlined text-[16px] text-red-500 mt-0.5 shrink-0">shield_alert</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-lg text-xs text-emerald-700 flex items-start space-x-2 border border-emerald-200 anim-slideup">
              <span className="material-symbols-outlined text-[16px] text-emerald-500 mt-0.5 shrink-0">check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLoginMode && (
              <div className="anim-slideup">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Vinícius Souza"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 placeholder-slate-450 focus:outline-none focus:border-secondary-container focus:ring-2 focus:ring-secondary-container/20 hover:border-slate-300 transition duration-200"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                E-mail de Trabalho
              </label>
              <input
                type="email"
                required
                placeholder="Ex: tecnico@mgv.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 placeholder-slate-450 focus:outline-none focus:border-secondary-container focus:ring-2 focus:ring-secondary-container/20 hover:border-slate-300 transition duration-200"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Senha Segura
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="• • • • • •"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 placeholder-slate-450 focus:outline-none focus:border-secondary-container focus:ring-2 focus:ring-secondary-container/20 hover:border-slate-300 transition duration-200 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 transition-colors flex items-center justify-center p-0 cursor-pointer border-none bg-transparent"
                  title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {!isLoginMode && (
              <div className="anim-slideup">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Perfil de Acesso (Role)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-950 focus:outline-none focus:border-secondary-container focus:ring-2 focus:ring-secondary-container/20 hover:border-slate-300 transition duration-200"
                >
                  <option value={UserRole.EDITOR}>EDITOR (Técnicos e Atendentes)</option>
                  <option value={UserRole.OWNER}>OWNER (Diretores e Administradores)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-2 flex items-start space-x-1.5 leading-relaxed">
                  <span className="material-symbols-outlined text-[14px] text-secondary-container shrink-0 mt-0.5">info</span>
                  <span>
                    O perfil EDITOR não possui privilégios de exclusão (Políticas de segurança ativas).
                  </span>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-secondary-container hover:bg-secondary-container-hover text-slate-950 py-2.5 rounded-lg text-xs uppercase tracking-wider font-extrabold shadow-md flex items-center justify-center space-x-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed hover-premium active-premium"
            >
              {loading ? (
                <span>Autenticando colaborador...</span>
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
