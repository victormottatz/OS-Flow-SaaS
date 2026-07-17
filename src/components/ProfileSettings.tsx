/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, UserRole } from "../types";

interface ProfileSettingsProps {
  user: User;
  onProfileUpdated: (updatedUser: User) => void;
  isOffline: boolean;
}

const FALLBACK_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200";

export default function ProfileSettings({ user, onProfileUpdated, isOffline }: ProfileSettingsProps) {
  const [activeTab, setActiveTab] = useState<"personal" | "security">("personal");
  
  // Form states
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [bio, setBio] = useState(user.bio || "");

  // Security states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  // Status/Alerts states
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Auto-format phone to (XX) XXXXX-XXXX
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setPhone(value);
  };

  // Convert local image file to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("A imagem é muito grande. O limite máximo é de 10 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarUrl(reader.result);
        setErrorMsg("");
      }
    };
    reader.onerror = () => {
      setErrorMsg("Erro ao ler o arquivo de imagem.");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline) return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const activeToken = localStorage.getItem("mgv_token") || "";
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          avatarUrl,
          bio,
          currentPassword: currentPassword || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || "Perfil atualizado com sucesso!");
        onProfileUpdated(data.user);
        setCurrentPassword(""); // clear security key
      } else {
        setErrorMsg(data.error || "Erro ao atualizar perfil.");
      }
    } catch (err) {
      setErrorMsg("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline) return;

    if (!currentPassword) {
      setErrorMsg("Insira sua senha atual para realizar a alteração.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("A nova senha e a confirmação não coincidem.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const activeToken = localStorage.getItem("mgv_token") || "";
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Senha alterada com sucesso!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        onProfileUpdated(data.user);
      } else {
        setErrorMsg(data.error || "Erro ao alterar senha.");
      }
    } catch (err) {
      setErrorMsg("Erro de conexão ao alterar a senha.");
    } finally {
      setLoading(false);
    }
  };

  const formatRole = (role: UserRole) => {
    switch (role) {
      case UserRole.OWNER: return "Proprietário / Dono";
      case UserRole.ADMIN: return "Administrador do Sistema";
      case UserRole.SUPERVISOR: return "Supervisor";
      case UserRole.EDITOR: return "Editor";
      case UserRole.ATTENDANT: return "Atendimento & Recepção";
      case UserRole.TECHNICIAN: return "Técnico Especialista";
      case UserRole.FINANCIAL: return "Gestor Financeiro";
      default: return role;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 anim-slideup">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configurações de Perfil</h1>
        <p className="text-sm text-slate-500 mt-1">
          Gerencie suas informações cadastrais no sistema, altere seu avatar e configure suas credenciais de segurança.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left column: Real-time Profile Card Preview */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg border border-slate-800 flex flex-col items-center text-center relative overflow-hidden group">
            {/* Design elements */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-secondary-container/10 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-indigo-650/10 rounded-full blur-3xl"></div>

            {/* Profile Avatar Frame with hover effect */}
            <div className="relative w-28 h-28 rounded-2xl border-2 border-secondary-container/85 p-1 bg-slate-800 shadow-xl z-10 transition-transform duration-300 group-hover:scale-105">
              <img
                src={avatarUrl || FALLBACK_AVATAR}
                alt="Foto de Perfil"
                className="w-full h-full object-cover rounded-xl bg-slate-950"
              />
              
              {/* Overlay de carregamento */}
              {loading && (
                <div className="absolute inset-1 bg-slate-950/80 rounded-xl flex flex-col items-center justify-center z-20">
                  <div className="w-5 h-5 border-2 border-secondary-container border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[9px] text-secondary-container mt-1 font-semibold">Enviando...</span>
                </div>
              )}

              {/* Botão de Câmera */}
              <label className="absolute -bottom-2 -right-2 bg-secondary-container text-slate-955 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer shadow-md hover:scale-110 active:scale-95 transition-all z-20" title="Alterar Foto">
                <span className="material-symbols-outlined text-sm font-bold">photo_camera</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={loading}
                />
              </label>

              {/* Botão de Remoção de Foto */}
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarUrl("");
                    setErrorMsg("");
                  }}
                  className="absolute -top-2 -right-2 bg-red-650 text-white w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer shadow-md hover:scale-110 active:scale-95 transition-all z-20 border border-red-500/20"
                  title="Remover Foto de Perfil"
                  disabled={loading}
                >
                  <span className="material-symbols-outlined text-sm font-bold">delete</span>
                </button>
              )}
            </div>

            {/* User Meta */}
            <div className="mt-6 space-y-1.5 z-10 w-full">
              <h3 className="font-bold text-lg text-slate-100 tracking-tight leading-tight px-2 truncate">
                {name || "Seu Nome"}
              </h3>
              <p className="text-[10px] uppercase tracking-wider text-secondary-container font-black px-3 py-0.5 rounded-full bg-secondary-container/10 inline-block">
                {formatRole(user.role)}
              </p>
              <p className="text-xs text-slate-400 font-medium px-2 truncate mt-1">
                {email || "seu-email@empresa.com"}
              </p>
              {phone && (
                <p className="text-xs text-slate-400 font-mono font-medium flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[12px] text-slate-500">phone</span>
                  {phone}
                </p>
              )}
            </div>

            {/* User Bio Preview */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 w-full z-10">
              <h4 className="text-[10px] text-slate-500 font-black uppercase text-left tracking-widest">Sobre mim</h4>
              <p className="text-xs text-slate-300 italic mt-2 text-left leading-relaxed max-h-24 overflow-y-auto custom-scrollbar whitespace-pre-line">
                {bio || "Nenhuma minibio inserida ainda. Diga aos seus colegas de bancada em quais aparelhos você é especialista ou suas funções gerais."}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/60 w-full z-10 text-[10px] text-slate-500 font-semibold text-center leading-none">
              Membro desde: {new Date(user.createdAt).toLocaleDateString("pt-BR")}
            </div>
          </div>
        </div>

        {/* Right column: Settings Form Container */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            
            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/50">
              <button
                onClick={() => { setActiveTab("personal"); setErrorMsg(""); setSuccessMsg(""); }}
                className={`flex-1 py-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "personal"
                    ? "border-primary text-primary font-black bg-white"
                    : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/80"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">account_circle</span>
                Informações Pessoais
              </button>
              <button
                onClick={() => { setActiveTab("security"); setErrorMsg(""); setSuccessMsg(""); }}
                className={`flex-1 py-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "security"
                    ? "border-primary text-primary font-black bg-white"
                    : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/80"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">security</span>
                Segurança & Senha
              </button>
            </div>

            <div className="p-6">
              {/* Notifications */}
              {successMsg && (
                <div className="mb-6 bg-emerald-50 text-emerald-700 text-sm p-4 rounded-xl border border-emerald-200 flex items-start gap-2.5 anim-fadein">
                  <span className="material-symbols-outlined text-sm font-bold mt-0.5">check_circle</span>
                  <p className="font-medium">{successMsg}</p>
                </div>
              )}
              {errorMsg && (
                <div className="mb-6 bg-rose-50 text-rose-700 text-sm p-4 rounded-xl border border-rose-200 flex items-start gap-2.5 anim-fadein">
                  <span className="material-symbols-outlined text-sm font-bold mt-0.5">error</span>
                  <p className="font-medium">{errorMsg}</p>
                </div>
              )}

              {/* Form 1: Personal Info */}
              {activeTab === "personal" && (
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  
                  {/* Two column grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 font-display">Nome Completo</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium text-slate-800 placeholder-slate-400 text-sm"
                        placeholder="Ex: João da Silva"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 font-display">E-mail Comercial</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium text-slate-800 placeholder-slate-400 text-sm"
                        placeholder="joao@empresa.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 font-display">Telefone / WhatsApp</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={handlePhoneChange}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium text-slate-800 placeholder-slate-400 text-sm font-mono"
                        placeholder="(11) 99999-9999"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 font-display">Foto de Perfil (URL Externa)</label>
                      <input
                        type="url"
                        value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
                        onChange={e => setAvatarUrl(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium text-slate-800 placeholder-slate-400 text-sm"
                        placeholder="https://exemplo.com/sua-foto.jpg"
                        disabled={avatarUrl.startsWith("data:")}
                      />
                      {avatarUrl.startsWith("data:") && (
                        <div className="flex justify-between items-center mt-1.5">
                          <span className="text-[10px] text-emerald-600 font-bold">Imagem carregada localmente</span>
                          <button
                            type="button"
                            onClick={() => setAvatarUrl("")}
                            className="text-[10px] text-rose-500 hover:text-rose-700 font-bold transition-all underline cursor-pointer"
                          >
                            Limpar imagem local
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 font-display">Minibio / Especialidade Profissional</label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium text-slate-800 placeholder-slate-400 text-sm leading-relaxed"
                      placeholder="Diga em quais aparelhos você foca ou suas principais atribuições (ex: especialista em compressores, faturamento de notas, etc.)"
                    />
                  </div>

                  {/* Security verification to apply critical profile edits */}
                  {(email.toLowerCase() !== user.email.toLowerCase() || name !== user.name) && (
                    <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200/80 space-y-3.5 anim-fadein">
                      <div className="flex gap-2 text-amber-800">
                        <span className="material-symbols-outlined text-[18px] font-bold">lock_open</span>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider font-display">Verificação de Segurança</h4>
                          <p className="text-[11px] text-amber-700 font-medium">Por favor, insira sua senha atual para salvar alterações de e-mail ou nome.</p>
                        </div>
                      </div>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="w-full sm:w-1/2 px-3.5 py-2 border border-amber-350 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-900 transition-all text-sm font-medium"
                        placeholder="Senha atual"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={loading || isOffline}
                      className="bg-primary-container text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl hover:bg-slate-800 transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer hover-premium"
                    >
                      {loading ? "Salvando..." : "Salvar Alterações"}
                    </button>
                  </div>
                </form>
              )}

              {/* Form 2: Security & Password */}
              {activeTab === "security" && (
                <form onSubmit={handleSavePassword} className="space-y-6">
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 font-display">Senha Atual</label>
                      <input
                        type={showPasswords ? "text" : "password"}
                        required
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium text-slate-800 text-sm"
                        placeholder="Senha atual"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 font-display">Nova Senha</label>
                        <input
                          type={showPasswords ? "text" : "password"}
                          required
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium text-slate-800 text-sm"
                          placeholder="Mínimo 6 caracteres"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 font-display">Confirmar Nova Senha</label>
                        <input
                          type={showPasswords ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium text-slate-800 text-sm"
                          placeholder="Confirme a nova senha"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="toggle-passwords"
                        checked={showPasswords}
                        onChange={e => setShowPasswords(e.target.checked)}
                        className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900 focus:ring-2 cursor-pointer"
                      />
                      <label htmlFor="toggle-passwords" className="text-xs font-semibold text-slate-600 cursor-pointer select-none">
                        Mostrar senhas
                      </label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={loading || isOffline}
                      className="bg-primary-container text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl hover:bg-slate-800 transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer hover-premium"
                    >
                      {loading ? "Processando..." : "Alterar Senha"}
                    </button>
                  </div>
                </form>
              )}

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
