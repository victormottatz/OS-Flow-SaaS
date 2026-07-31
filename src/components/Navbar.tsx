/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { User, UserRole } from "../types";

const FALLBACK_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200";

interface NavbarProps {
  user: User;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOffline: boolean;
  setIsOffline: (state: boolean) => void;
  onLogout: () => void;
  isSidebarMinimized: boolean;
  toggleSidebar: () => void;
}

export default function Navbar({
  user,
  currentTab,
  setCurrentTab,
  isOffline,
  setIsOffline,
  onLogout,
  isSidebarMinimized,
  toggleSidebar
}: NavbarProps) {
  // Translate current tab ID to title string
  const getTabTitle = () => {
    switch (currentTab) {
      case "dashboard":
        return "Painel de Controle";
      case "clients":
        return "Clientes & Equipamentos";
      case "os":
        return "Listagem de OS";
      case "os-create":
        return "Nova Ordem de Serviço";
      case "kanban":
        return "Ordens de Serviço (Quadro)";
      case "estoque":
        return "Gestão de Estoque";
      case "bling":
        return "Integração Fiscal & Bling";
      case "fiscal":
        return "Painel Fiscal de Produtividade";
      case "workflow":
        return "Mapa de Processos do Sistema";
      case "settings":
        return "Configurações do Sistema";
      case "profile":
        return "Meu Perfil";
      default:
        return "MGV Assistência";
    }
  };

  return (
    <>
      {/* 1. FIXED LEFT SIDEBAR (Desktop only: md and above) */}
      <aside className={`hidden md:flex flex-col h-screen fixed left-0 top-0 bg-primary-container text-white py-6 z-50 border-r border-slate-900 select-none transition-all duration-300 ${
        isSidebarMinimized ? "w-[70px]" : "w-[260px]"
      }`}>
        {/* Brand header */}
        <div className="px-4 mb-8 flex justify-center items-center h-10">
          {isSidebarMinimized ? (
            <div onClick={toggleSidebar} className="w-9 h-9 bg-secondary-container text-primary-container rounded-xl flex items-center justify-center font-bold shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all" title="Expandir Menu">
              <span className="material-symbols-outlined text-[20px] text-slate-950 font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full px-2">
              <div className="flex items-center cursor-pointer group animate-fadein" onClick={() => setCurrentTab("dashboard")}>
                <img 
                  src="/logos/LOGO V3.0 (9).png" 
                  alt="MGV Tecnologia" 
                  className="h-10 w-auto object-contain transition-all duration-300 group-hover:scale-105 active:scale-95" 
                />
              </div>
              <button 
                onClick={toggleSidebar} 
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                title="Recolher Menu"
              >
                <span className="material-symbols-outlined text-[18px]">menu_open</span>
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 space-y-1 px-3">
          {[
            { id: "dashboard", label: "Dashboard", icon: "dashboard" },
            { id: "clients", label: "Clientes", icon: "group" },
            ...((user.role === UserRole.OWNER || user.role === UserRole.ATTENDANT) ? [{ id: "os", label: "Listagem de OS", icon: "view_list" }] : []),
            { id: "kanban", label: "Ordens de Serviço", icon: "assignment" },
            { id: "estoque", label: "Estoque", icon: "inventory_2" },
            ...((user.role === UserRole.OWNER || user.role === UserRole.FINANCIAL || user.role === UserRole.ADMIN) ? [{ id: "fiscal", label: "Painel Fiscal", icon: "request_quote" }] : []),
            ...((user.role === UserRole.OWNER || user.role === UserRole.FINANCIAL) ? [{ id: "bling", label: "Integração Fiscal", icon: "sync_alt" }] : []),
            { id: "workflow", label: "Mapa de Processos", icon: "account_tree" },
            ...((user.role === UserRole.OWNER || user.role === UserRole.ADMIN) ? [{ id: "settings", label: "Configurações", icon: "settings" }] : [])
          ].map((item) => {
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                title={isSidebarMinimized ? item.label : ""}
                className={`w-full flex items-center transition duration-150 cursor-pointer ${
                  isSidebarMinimized ? "justify-center py-3 px-0 rounded-xl" : "gap-3 px-4 py-3 rounded-xl"
                } ${
                  active
                    ? "bg-slate-800 text-white border-l-4 border-secondary-container"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
                {!isSidebarMinimized && <span className="animate-fadein">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Bottom Controls */}
        <div className="px-3 mt-auto space-y-4">
          {(user.role === UserRole.OWNER || user.role === UserRole.ATTENDANT) && (
            isSidebarMinimized ? (
              <button
                onClick={() => setCurrentTab("os-create")}
                className="w-11 h-11 mx-auto bg-secondary-container hover:bg-secondary-container-hover text-primary-container rounded-full font-bold flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
                title="Nova Ordem de Serviço"
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
              </button>
            ) : (
              <button
                onClick={() => setCurrentTab("os-create")}
                className="w-full bg-secondary-container hover:bg-secondary-container-hover text-primary-container py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-sm animate-fadein"
              >
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
                <span>Nova Ordem</span>
              </button>
            )
          )}
          
          <div className={`pt-4 border-t border-slate-800 space-y-2 ${isSidebarMinimized ? "flex flex-col items-center" : ""}`}>
            <button
              onClick={() => setCurrentTab("profile")}
              title={isSidebarMinimized ? "Meu Perfil" : ""}
              className={`flex items-center text-xs font-bold transition cursor-pointer ${
                currentTab === "profile"
                  ? "text-white bg-slate-800 border-l-4 border-secondary-container"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              } ${
                isSidebarMinimized ? "justify-center p-2 rounded-xl" : "gap-3 px-4 py-2 w-full"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
              {!isSidebarMinimized && <span className="animate-fadein">Meu Perfil</span>}
            </button>
            <button
              onClick={() => alert("Central de Suporte MGV: Ligue para (11) 3218-9900 ou mande e-mail para suporte@mgv.com.br")}
              title={isSidebarMinimized ? "Suporte" : ""}
              className={`flex items-center text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer ${
                isSidebarMinimized ? "justify-center p-2 rounded-xl hover:bg-slate-800/40" : "gap-3 px-4 py-2 w-full"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">help</span>
              {!isSidebarMinimized && <span className="animate-fadein">Suporte</span>}
            </button>
            <button
              onClick={() => {
                if(window.confirm("Deseja sair para acessar a conta de outro funcionário?")) {
                  onLogout();
                }
              }}
              title={isSidebarMinimized ? "Trocar de Conta" : ""}
              className={`flex items-center text-xs font-bold text-slate-450 hover:text-indigo-400 transition cursor-pointer ${
                isSidebarMinimized ? "justify-center p-2 rounded-xl hover:bg-slate-800/40" : "gap-3 px-4 py-2 w-full"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">switch_account</span>
              {!isSidebarMinimized && <span className="animate-fadein">Trocar de Conta</span>}
            </button>
            <button
              onClick={onLogout}
              title={isSidebarMinimized ? "Sair da Conta" : ""}
              className={`flex items-center text-xs font-bold text-slate-450 hover:text-red-400 transition cursor-pointer ${
                isSidebarMinimized ? "justify-center p-2 rounded-xl hover:bg-slate-800/40" : "gap-3 px-4 py-2 w-full"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              {!isSidebarMinimized && <span className="animate-fadein">Sair da Conta</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* 2. STICKY TOP APP BAR (Header offset dynamic on desktop) */}
      <header className={`h-16 w-full flex justify-between items-center pr-8 pl-6 border-b border-slate-200 bg-white sticky top-0 z-40 select-none transition-all duration-300 ${
        isSidebarMinimized ? "md:pl-[102px]" : "md:pl-[292px]"
      }`}>
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
          
          <div 
            onClick={() => setCurrentTab("profile")}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
            title="Ver configurações de perfil"
          >
            <div className="text-right flex flex-col items-end">
              <p className="font-bold text-xs text-slate-800 leading-none max-w-[80px] sm:max-w-[150px] truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                {user.role === UserRole.OWNER ? "Administrador" : 
                 user.role === UserRole.ATTENDANT ? "Atendimento" : 
                 user.role === UserRole.TECHNICIAN ? "Laboratório" : "Financeiro"}
              </p>
            </div>
            
            <img 
              alt="Avatar do Técnico" 
              className="w-9 h-9 shrink-0 rounded-xl border border-slate-200 object-cover shadow-sm bg-slate-50"
              src={user.avatarUrl || FALLBACK_AVATAR}
            />
          </div>
        </div>
      </header>

      {/* 3. MOBILE NAVIGATION TAB BAR (Bottom screen sticky, visible only on md and below) */}
      <div className="md:hidden flex border-t border-slate-200/80 bg-white/95 backdrop-blur-md overflow-x-auto justify-around py-2 px-2 sticky bottom-0 z-45">
        {[
          { id: "dashboard", label: "Painel", icon: "dashboard" },
          { id: "clients", label: "Clientes", icon: "group" },
          ...((user.role === UserRole.OWNER || user.role === UserRole.ATTENDANT) ? [{ id: "os", label: "Listagem OS", icon: "view_list" }] : []),
          { id: "kanban", label: "Ordens OS", icon: "assignment" },
          { id: "estoque", label: "Estoque", icon: "inventory_2" },
          ...((user.role === UserRole.OWNER || user.role === UserRole.FINANCIAL || user.role === UserRole.ADMIN) ? [{ id: "fiscal", label: "Painel Fiscal", icon: "request_quote" }] : []),
          ...((user.role === UserRole.OWNER || user.role === UserRole.FINANCIAL) ? [{ id: "bling", label: "Fiscal", icon: "sync_alt" }] : []),
          { id: "workflow", label: "Processos", icon: "account_tree" },
          ...((user.role === UserRole.OWNER || user.role === UserRole.ADMIN) ? [{ id: "settings", label: "Config", icon: "settings" }] : []),
          { id: "profile", label: "Perfil", icon: "person" }
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
