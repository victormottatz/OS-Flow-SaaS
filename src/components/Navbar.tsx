/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { User, UserRole } from "../types";

interface NavbarProps {
  user: User;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOffline: boolean;
  setIsOffline: (state: boolean) => void;
  onLogout: () => void;
}

export default function Navbar({
  user,
  currentTab,
  setCurrentTab,
  isOffline,
  setIsOffline,
  onLogout
}: NavbarProps) {
  // Translate current tab ID to title string
  const getTabTitle = () => {
    switch (currentTab) {
      case "dashboard":
        return "Painel de Controle";
      case "clients":
        return "Clientes & Equipamentos";
      case "os":
        return "Nova Ordem de Serviço";
      case "kanban":
        return "Quadro Técnico (Kanban)";
      case "estoque":
        return "Gestão de Estoque";
      case "bling":
        return "Integração Fiscal & Bling";
      case "users":
        return "Gestão de Usuários";
      default:
        return "MGV Assistência";
    }
  };

  return (
    <>
      {/* 1. FIXED LEFT SIDEBAR (Desktop only: md and above) */}
      <aside className="hidden md:flex flex-col w-[260px] h-screen fixed left-0 top-0 bg-primary-container text-white py-6 z-50 border-r border-slate-900 select-none">
        {/* Brand header */}
        <div className="px-6 mb-8 flex flex-col">
          <div className="flex items-center space-x-2.5 cursor-pointer group" onClick={() => setCurrentTab("dashboard")}>
            <div className="w-9 h-9 bg-secondary-container text-primary-container rounded-xl flex items-center justify-center font-bold shadow-md transition-all duration-300 group-hover:scale-105 active:scale-95">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            </div>
            <div>
              <h1 className="font-headline font-bold text-sm tracking-tight text-white">MGV Tecnologia</h1>
              <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest leading-none mt-0.5">Technical Ops</p>
            </div>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 space-y-1 px-3">
          {[
            { id: "dashboard", label: "Dashboard", icon: "dashboard" },
            { id: "clients", label: "Clientes", icon: "group" },
            ...((user.role === UserRole.OWNER || user.role === UserRole.ATTENDANT) ? [{ id: "os", label: "Ordens de Serviço", icon: "assignment" }] : []),
            { id: "kanban", label: "Quadro Técnico", icon: "splitscreen" },
            { id: "estoque", label: "Estoque", icon: "inventory_2" },
            ...((user.role === UserRole.OWNER || user.role === UserRole.FINANCIAL) ? [{ id: "bling", label: "Integração Fiscal", icon: "sync_alt" }] : []),
            ...(user.role === UserRole.OWNER ? [{ id: "users", label: "Equipe", icon: "manage_accounts" }] : [])
          ].map((item) => {
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition duration-150 cursor-pointer ${
                  active
                    ? "bg-slate-800 text-white border-l-4 border-secondary-container"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Bottom Controls */}
        <div className="px-4 mt-auto space-y-4">
          {(user.role === UserRole.OWNER || user.role === UserRole.ATTENDANT) && (
            <button
              onClick={() => setCurrentTab("os")}
              className="w-full bg-secondary-container hover:bg-secondary-container-hover text-primary-container py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
              <span>Nova Ordem</span>
            </button>
          )}
          
          <div className="pt-4 border-t border-slate-800 space-y-1">
            <button
              onClick={() => alert("Central de Suporte MGV: Ligue para (11) 3218-9900 ou mande e-mail para suporte@mgv.com.br")}
              className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">help</span>
              <span>Suporte</span>
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-450 hover:text-red-400 transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>Sair da Conta</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 2. STICKY TOP APP BAR (Header offset by 260px on desktop) */}
      <header className="md:pl-[260px] h-16 w-full flex justify-between items-center px-6 border-b border-slate-200 bg-white sticky top-0 z-40 select-none">
        <div className="flex items-center gap-4">
          <h2 className="font-display font-bold text-base sm:text-lg text-slate-900 leading-none">{getTabTitle()}</h2>
          
          {/* Offline/Online Status Badge */}
          <div 
            onClick={() => setIsOffline(!isOffline)}
            className={`flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border text-[9px] sm:text-[10px] font-bold cursor-pointer transition select-none shrink-0 ${
              isOffline
                ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
            }`}
            title={isOffline ? "Clique para reconectar rede" : "Clique para desvincular conexão (Modo Offline)"}
          >
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOffline ? "bg-rose-400" : "bg-emerald-450"}`}></span>
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isOffline ? "bg-rose-500" : "bg-emerald-500"}`}></span>
            </span>
            <span className="hidden sm:inline">{isOffline ? "Offline" : "API Bling V3: Ativa"}</span>
            <span className="inline sm:hidden">{isOffline ? "Off" : "Bling"}</span>
          </div>
        </div>

        {/* Top bar controls */}
        <div className="flex items-center gap-4">
          <div className="h-8 w-[1px] bg-slate-200 hidden sm:block"></div>
          
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              <p className="font-bold text-xs text-slate-800 leading-none">{user.name}</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                {user.role === UserRole.OWNER ? "Administrador" : 
                 user.role === UserRole.ATTENDANT ? "Atendimento" : 
                 user.role === UserRole.TECHNICIAN ? "Laboratório" : "Financeiro"}
              </p>
            </div>
            
            <img 
              alt="Avatar do Técnico" 
              className="w-9 h-9 rounded-xl border border-slate-200 object-cover shadow-sm bg-slate-50"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBIhJ_Dx_RtBiJPW6bRFpao60VHmG9Ibv3lKymUg621O1vI_0RomhbikV8aL0N4Unzm1QjYdcTgGYvx-Mo4JelnFTlgNqHleiEKe28A6CNL39AcQbsGWAIu7_Okc78IvKYnHpwW__zigbO8O4wakwZgH__78Uk-3u7nvh5cMpzYrVgVWa5fL5wpaWeKZN0v5kFEIDtQ7AwTpwP80jhKHJyqJ7YELWtngY0ukOP9nmWXO6XlVLFQbL6GYOfRE0JPHH7qtJ09xwzHodcZ"
            />
          </div>
        </div>
      </header>

      {/* 3. MOBILE NAVIGATION TAB BAR (Bottom screen sticky, visible only on md and below) */}
      <div className="md:hidden flex border-t border-slate-200/80 bg-white/95 backdrop-blur-md overflow-x-auto justify-around py-2 px-2 sticky bottom-0 z-45">
        {[
          { id: "dashboard", label: "Painel", icon: "dashboard" },
          { id: "clients", label: "Clientes", icon: "group" },
          ...((user.role === UserRole.OWNER || user.role === UserRole.ATTENDANT) ? [{ id: "os", label: "Nova OS", icon: "assignment" }] : []),
          { id: "kanban", label: "Quadro", icon: "splitscreen" },
          { id: "estoque", label: "Estoque", icon: "inventory_2" },
          ...((user.role === UserRole.OWNER || user.role === UserRole.FINANCIAL) ? [{ id: "bling", label: "Fiscal", icon: "sync_alt" }] : []),
          ...(user.role === UserRole.OWNER ? [{ id: "users", label: "Equipe", icon: "manage_accounts" }] : [])
        ].map((tab) => {
          const active = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                active ? "text-indigo-650 bg-indigo-50" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-[18px] mb-0.5" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
