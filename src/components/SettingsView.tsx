import React, { useState } from "react";
import { UserRole } from "../types";
import SystemConfigPanel from "./SystemConfigPanel";
import GenericSettingsPanel from "./GenericSettingsPanel";
import UserManagement from "./UserManagement";
import OSConciliation from "./OSConciliation";

interface SettingsViewProps {
  userRole: UserRole;
  isOffline?: boolean;
}

export default function SettingsView({ userRole, isOffline = false }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<string>("general");

  const tabs = [
    { id: "general", label: "Geral", icon: "settings" },
    { id: "users", label: "Equipe e Acessos", icon: "manage_accounts" },
    { id: "finance", label: "Financeiro", icon: "payments" },
    { id: "conciliation_tool", label: "Ferramenta de Conciliação", icon: "history_toggle_off" },
    { id: "conciliation", label: "Regras de Conciliação", icon: "tune" },
    { id: "whatsapp", label: "WhatsApp", icon: "forum" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Settings Header */}
      <div className="flex items-center gap-3 mb-6 px-2">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>settings_applications</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configurações do Sistema</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie parâmetros, algoritmos e integrações da plataforma.</p>
        </div>
      </div>

      {/* Horizontal Tabs */}
      <div className="flex overflow-x-auto space-x-2 border-b border-slate-200 pb-2 px-2 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-slate-800 text-white shadow-md"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: activeTab === tab.id ? "'FILL' 1" : "'FILL' 0" }}>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-2">
        {activeTab === "general" && <GenericSettingsPanel category="GERAL" />}
        {activeTab === "users" && <UserManagement userRole={userRole} isOffline={isOffline} />}
        {activeTab === "finance" && <GenericSettingsPanel category="FINANCEIRO" />}
        {activeTab === "conciliation_tool" && <OSConciliation />}
        {activeTab === "conciliation" && <SystemConfigPanel />}
        {activeTab === "whatsapp" && <GenericSettingsPanel category="WHATSAPP" />}
      </div>
    </div>
  );
}
