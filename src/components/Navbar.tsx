/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, UserRole } from "../types";
import AppLogo from "./AppLogo";
import NotificationMenu from "./NotificationMenu";
import TagManager from "./TagManager";
import { Tag as TagIcon } from "lucide-react";

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
  const [showTagManager, setShowTagManager] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleTabClick = (tabId: string) => {
    setCurrentTab(tabId);
    setIsMobileMenuOpen(false);
  };

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
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 1. FIXED LEFT SIDEBAR */}
      {/* GUIA: LARGURA DA SIDEBAR (70px recolhida / 260px expandida).
          Se alterar estes valores, ajuste JUNTO:
          - Navbar.tsx linha ~205 (header): 102px / 292px (= largura + 32)
          - App.tsx linhas ~239-240 e ~369 (conteúdo e rodapé): 70px / 260px
          Use sempre múltiplos "redondos" (70, 260, 300) para facilitar. */}
      <aside className={`flex flex-col h-screen fixed left-0 top-0 bg-primary-container text-white py-6 z-50 border-r border-slate-900 select-none transition-all duration-300 ${
        isMobileMenuOpen ? "translate-x-0 w-[260px]" : "-translate-x-full md:translate-x-0 " + (isSidebarMinimized ? "md:w-[70px]" : "md:w-[260px]")
      }`}>
        {/* Brand header */}
        <div className="px-4 mb-8 flex justify-center items-center h-10">
          <div className={`flex items-center justify-between w-full px-2 ${isSidebarMinimized ? "md:hidden" : ""}`}>
            <div className="flex items-center cursor-pointer group animate-fadein" onClick={() => handleTabClick("dashboard")}>
              <AppLogo 
                src="/logos/logo-v3-menu-lateral.png" 
                fallbackSrc="/logos/logo-v3-menu-lateral.png" 
                className="h-10 w-auto object-contain transition-all duration-300 group-hover:scale-105 active:scale-95" 
              />
            </div>
            <button 
              onClick={toggleSidebar} 
              className="hidden md:block p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              title="Recolher Menu"
            >
              <span className="material-symbols-outlined text-[18px]">menu_open</span>
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="md:hidden p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              title="Fechar Menu"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          
          <div className={`hidden ${isSidebarMinimized ? "md:flex" : "hidden"} items-center justify-center w-full`}>
            <div onClick={toggleSidebar} className="w-9 h-9 bg-secondary-container text-primary-container rounded-xl flex items-center justify-center font-bold shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all" title="Expandir Menu">
              <span className="material-symbols-outlined text-[20px] text-slate-950 font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            </div>
          </div>
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
                onClick={() => handleTabClick(item.id)}
                title={isSidebarMinimized ? item.label : ""}
                className={`w-full flex items-center transition duration-150 cursor-pointer ${
                  isSidebarMinimized ? "md:justify-center md:py-3 md:px-0 gap-3 px-4 py-3 rounded-xl" : "gap-3 px-4 py-3 rounded-xl"
                } ${
                  active
                    ? "bg-slate-800 text-white border-l-4 border-secondary-container"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
                <span className={`${isSidebarMinimized ? "md:hidden" : "animate-fadein"} block whitespace-nowrap`}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Bottom Controls */}
        <div className="px-3 mt-auto space-y-4">
          {(user.role === UserRole.OWNER || user.role === UserRole.ATTENDANT) && (
            <>
              <button
                onClick={() => handleTabClick("os-create")}
                className={`hidden ${isSidebarMinimized ? "md:flex" : "hidden"} w-11 h-11 mx-auto bg-secondary-container hover:bg-secondary-container-hover text-primary-container rounded-full font-bold items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm`}
                title="Nova Ordem de Serviço"
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
              </button>
              <button
                onClick={() => handleTabClick("os-create")}
                className={`w-full bg-secondary-container hover:bg-secondary-container-hover text-primary-container py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-sm animate-fadein ${isSidebarMinimized ? "md:hidden" : "flex"}`}
              >
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
                <span>Nova Ordem</span>
              </button>
            </>
          )}
          
          <div className={`pt-4 border-t border-slate-800 space-y-2 flex flex-col ${isSidebarMinimized ? "md:items-center" : ""}`}>
            <button
              onClick={() => handleTabClick("profile")}
              title={isSidebarMinimized ? "Meu Perfil" : ""}
              className={`flex items-center text-xs font-bold transition cursor-pointer ${
                currentTab === "profile"
                  ? "text-white bg-slate-800 border-l-4 border-secondary-container"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              } ${
                isSidebarMinimized ? "md:justify-center md:p-2 rounded-xl gap-3 px-4 py-2 w-full" : "gap-3 px-4 py-2 w-full rounded-xl"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
              <span className={`${isSidebarMinimized ? "md:hidden" : "animate-fadein"} block whitespace-nowrap`}>Meu Perfil</span>
            </button>
            <button
              onClick={() => {
                alert("Central de Suporte MGV: Ligue para (11) 3218-9900 ou mande e-mail para suporte@mgv.com.br");
                setIsMobileMenuOpen(false);
              }}
              title={isSidebarMinimized ? "Suporte" : ""}
              className={`flex items-center text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer ${
                isSidebarMinimized ? "md:justify-center md:p-2 rounded-xl hover:bg-slate-800/40 gap-3 px-4 py-2 w-full" : "gap-3 px-4 py-2 w-full rounded-xl"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">help</span>
              <span className={`${isSidebarMinimized ? "md:hidden" : "animate-fadein"} block whitespace-nowrap`}>Suporte</span>
            </button>
            <button
              onClick={() => {
                if(window.confirm("Deseja sair para acessar a conta de outro funcionário?")) {
                  onLogout();
                }
              }}
              title={isSidebarMinimized ? "Trocar de Conta" : ""}
              className={`flex items-center text-xs font-bold text-slate-450 hover:text-indigo-400 transition cursor-pointer ${
                isSidebarMinimized ? "md:justify-center md:p-2 rounded-xl hover:bg-slate-800/40 gap-3 px-4 py-2 w-full" : "gap-3 px-4 py-2 w-full rounded-xl"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">switch_account</span>
              <span className={`${isSidebarMinimized ? "md:hidden" : "animate-fadein"} block whitespace-nowrap`}>Trocar de Conta</span>
            </button>
            <button
              onClick={onLogout}
              title={isSidebarMinimized ? "Sair da Conta" : ""}
              className={`flex items-center text-xs font-bold text-slate-450 hover:text-red-400 transition cursor-pointer ${
                isSidebarMinimized ? "md:justify-center md:p-2 rounded-xl hover:bg-slate-800/40 gap-3 px-4 py-2 w-full" : "gap-3 px-4 py-2 w-full rounded-xl"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span className={`${isSidebarMinimized ? "md:hidden" : "animate-fadein"} block whitespace-nowrap`}>Sair da Conta</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 2. STICKY TOP APP BAR (Header offset dynamic on desktop) */}
      {/* GUIA: DESLOCAMENTO do header conforme a sidebar.
          Valor = largura da sidebar + 32px de folga (102 = 70+32 / 292 = 260+32). */}
      <header className={`h-16 w-full flex justify-between items-center pr-8 pl-4 sm:pl-6 border-b border-slate-200 bg-white sticky top-0 z-40 select-none transition-all duration-300 ${
        isSidebarMinimized ? "md:pl-[102px]" : "md:pl-[292px]"
      }`}>
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            className="md:hidden p-1 sm:-ml-2 text-slate-500 hover:text-slate-900 focus:outline-none"
            onClick={() => setIsMobileMenuOpen(true)}
            title="Abrir Menu"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
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
          <button
            onClick={() => setShowTagManager(true)}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900"
            title="Gerenciar Etiquetas"
          >
            <TagIcon className="w-[18px] h-[18px]" />
          </button>

          <NotificationMenu />
          
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
      {/* GUIA: BARRA DE NAVEGAÇÃO DO CELULAR (fixa embaixo).
          - Adicionar/remover abas: edite a lista logo abaixo.
          - Cor dos botões ativos: linha ~276 (text-indigo-650 bg-indigo-50).
          - Fundo/transparência: linha ~257 (bg-white/95 backdrop-blur-md). */}
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

      {/* Modals */}
      {showTagManager && <TagManager onClose={() => setShowTagManager(false)} />}
    </>
  );
}
