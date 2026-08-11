import React, { useState } from "react";
import { UserRole } from "../types";
import SystemConfigPanel from "./SystemConfigPanel";
import GenericSettingsPanel from "./GenericSettingsPanel";
import UserManagement from "./UserManagement";
import OSConciliation from "./OSConciliation";
import CustomFieldsManager from "./CustomFieldsManager";
import WhatsAppSettingsPanel from "./WhatsAppSettingsPanel";

interface SettingsViewProps {
  userRole: UserRole;
  isOffline?: boolean;
}

export default function SettingsView({ userRole, isOffline = false }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<string>("general");

  const tabs = [
    { id: "general", label: "Geral", icon: "settings" },
    { id: "users", label: "Equipe e Acessos", icon: "manage_accounts" },
    { id: "custom_fields", label: "Campos Personalizados", icon: "dynamic_form" },
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
          <h1 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie os parâmetros globais da plataforma.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-200 hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab.id 
                  ? 'text-indigo-600' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className={`material-symbols-outlined text-lg ${activeTab === tab.id ? '' : 'opacity-70'}`}>
                {tab.icon}
              </span>
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600" />
              )}
            </button>
          ))}
        </div>

        <div className="pt-2">
          {activeTab === "general" && <GenericSettingsPanel category="GERAL" />}
          {activeTab === "users" && <UserManagement userRole={userRole} isOffline={isOffline} />}
          {activeTab === "finance" && <GenericSettingsPanel category="FINANCEIRO" />}
          {activeTab === "custom_fields" && <CustomFieldsManager />}
          {activeTab === "conciliation_tool" && <OSConciliation />}
          {activeTab === "conciliation" && <SystemConfigPanel />}
          {activeTab === "whatsapp" && <WhatsAppSettingsPanel />}
        </div>
      </div>
    </div>
  );
}
