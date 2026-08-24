/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
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
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    if (showUserDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserDropdown]);

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
      case "kanban":
        return "Ordens de Serviço";
      case "os-create":
        return "Nova Ordem de Serviço";
      case "whatsapp":
        return "Central de Atendimento WhatsApp";
      case "estoque":
        return "Gestão de Estoque";
      case "fiscal":
      case "bling":
        return "Gestão Fiscal & Faturamento";
      case "workflow":
        return "Mapa de Navegação e Arquitetura";
      case "settings":
        return "Configurações do Sistema";
      case "profile":
        return "Meu Perfil";
      default:
        return "MGV Assistência";
    }
  };

  // Estrutura semântica categorizada do menu
  const menuSections = [
    {
      title: "Operação",
      items: [
        { id: "dashboard", label: "Dashboard", icon: "dashboard", visible: true },
        { id: "os", label: "Ordens de Serviço", icon: "assignment", visible: true },
        { id: "whatsapp", label: "Central WhatsApp", icon: "chat", visible: true }
      ]
    },
    {
      title: "Cadastros",
      items: [
        { id: "clients", label: "Clientes", icon: "group", visible: true },
        { id: "estoque", label: "Estoque", icon: "inventory_2", visible: true }
      ]
    },
    {
      title: "Gestão",
      items: [
        { 
          id: "fiscal", 
          label: "Fiscal & Bling", 
          icon: "request_quote", 
          visible: user.role === UserRole.OWNER || user.role === UserRole.FINANCIAL || user.role === UserRole.ADMIN 
        },
        { 
          id: "settings", 
          label: "Configurações", 
          icon: "settings", 
          visible: user.role === UserRole.OWNER || user.role === UserRole.ADMIN 
        }
      ]
    }
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case UserRole.OWNER: return "Administrador";
      case UserRole.ATTENDANT: return "Atendimento";
      case UserRole.TECHNICIAN: return "Laboratório";
      case UserRole.FINANCIAL: return "Financeiro";
      default: return "Usuário";
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
      <aside className={`flex flex-col h-screen fixed left-0 top-0 bg-primary-container text-white py-6 z-50 border-r border-slate-900 select-none transition-all duration-300 ${
        isMobileMenuOpen ? "translate-x-0 w-[260px]" : "-translate-x-full md:translate-x-0 " + (isSidebarMinimized ? "md:w-[70px]" : "md:w-[260px]")
      }`}>
        {/* Brand header */}
        <div className="px-4 mb-6 flex justify-center items-center h-10">
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
              className="hidden md:block p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
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

        {/* Sidebar Nav Links com Categorias Semânticas */}
        <nav className="flex-1 space-y-4 px-3 overflow-y-auto hide-scrollbar">
          {menuSections.map((section, sIdx) => {
            const visibleItems = section.items.filter(i => i.visible);
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title || sIdx} className="space-y-1">
                {section.title && !isSidebarMinimized && (
                  <p className="px-3 pt-1 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 select-none animate-fadein">
                    {section.title}
                  </p>
                )}
                {visibleItems.map((item) => {
                  const active = currentTab === item.id || 
                    (item.id === "os" && (currentTab === "os" || currentTab === "kanban")) ||
                    (item.id === "fiscal" && (currentTab === "fiscal" || currentTab === "bling"));

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      title={isSidebarMinimized ? item.label : ""}
                      className={`w-full flex items-center transition duration-150 cursor-pointer ${
                        isSidebarMinimized ? "md:justify-center md:py-2.5 md:px-0 gap-3 px-4 py-2.5 rounded-xl" : "gap-3 px-3.5 py-2.5 rounded-xl"
                      } ${
                        active
                          ? "bg-slate-800 text-white font-bold border-l-4 border-secondary-container shadow-inner"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[19px]" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                        {item.icon}
                      </span>
                      <span className={`${isSidebarMinimized ? "md:hidden" : "animate-fadein"} text-xs font-semibold block whitespace-nowrap`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Bottom CTA (Nova Ordem) */}
        <div className="px-3 mt-auto pt-4 border-t border-slate-800/80">
          {(user.role === UserRole.OWNER || user.role === UserRole.ATTENDANT) && (
            <>
              <button
                onClick={() => handleTabClick("os-create")}
                className={`hidden ${isSidebarMinimized ? "md:flex" : "hidden"} w-10 h-10 mx-auto bg-secondary-container hover:bg-secondary-container-hover text-primary-container rounded-xl font-bold items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md`}
                title="Nova Ordem de Serviço"
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
              </button>
              <button
                onClick={() => handleTabClick("os-create")}
                className={`w-full bg-secondary-container hover:bg-secondary-container-hover text-primary-container py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-md animate-fadein ${isSidebarMinimized ? "md:hidden" : "flex"}`}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
                <span>Nova Ordem</span>
              </button>
            </>
          )}
        </div>
      </aside>

      {/* 2. STICKY TOP APP BAR */}
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

        {/* Top bar controls com Dropdown de Perfil */}
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
          
          {/* User Profile Trigger & Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div 
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2.5 cursor-pointer p-1 rounded-xl hover:bg-slate-100/80 transition-all select-none"
              title="Menu do Usuário"
            >
              <div className="text-right flex flex-col items-end">
                <p className="font-bold text-xs text-slate-800 leading-none max-w-[80px] sm:max-w-[150px] truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  {getRoleBadge(user.role)}
                </p>
              </div>
              
              <img 
                alt="Avatar do Usuário" 
                className="w-9 h-9 shrink-0 rounded-xl border border-slate-200 object-cover shadow-sm bg-slate-50"
                src={user.avatarUrl || FALLBACK_AVATAR}
              />
              <span className="material-symbols-outlined text-[16px] text-slate-400">
                {showUserDropdown ? "expand_less" : "expand_more"}
              </span>
            </div>

            {/* Dropdown Menu Flutuante */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fadein">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">{user.email || "Operador MGV"}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded-md border border-indigo-100">
                    {getRoleBadge(user.role)}
                  </span>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      handleTabClick("profile");
                      setShowUserDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-slate-500">person</span>
                    <span>Meu Perfil</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      alert("Central de Suporte MGV:\n\n• Telefone: (11) 3218-9900\n• E-mail: suporte@mgv.com.br\n• Atendimento: Seg a Sex das 08h às 18h");
                    }}
                    className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-slate-500">help</span>
                    <span>Central de Suporte</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 py-1">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      if (window.confirm("Deseja sair para acessar a conta de outro funcionário?")) {
                        onLogout();
                      }
                    }}
                    className="w-full px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">switch_account</span>
                    <span>Trocar de Conta</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    <span>Sair da Conta</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 3. MOBILE NAVIGATION TAB BAR */}
      <div className="md:hidden flex border-t border-slate-200/80 bg-white/95 backdrop-blur-md overflow-x-auto justify-around py-2 px-2 sticky bottom-0 z-45">
        {[
          { id: "dashboard", label: "Painel", icon: "dashboard" },
          { id: "os", label: "OS", icon: "assignment" },
          { id: "whatsapp", label: "WhatsApp", icon: "chat" },
          { id: "clients", label: "Clientes", icon: "group" },
          { id: "estoque", label: "Estoque", icon: "inventory_2" },
          ...((user.role === UserRole.OWNER || user.role === UserRole.FINANCIAL || user.role === UserRole.ADMIN) ? [{ id: "fiscal", label: "Fiscal", icon: "request_quote" }] : []),
          { id: "profile", label: "Perfil", icon: "person" }
        ].map((tab) => {
          const active = currentTab === tab.id || 
            (tab.id === "os" && (currentTab === "os" || currentTab === "kanban")) ||
            (tab.id === "fiscal" && (currentTab === "fiscal" || currentTab === "bling"));

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
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
