import React, { useState } from "react";
import { OrdemServico, Part, Client, UserRole } from "../types";
import BlingSandbox from "./BlingSandbox";
import FiscalPanel from "./FiscalPanel";

interface FiscalHubViewProps {
  ordensServico: OrdemServico[];
  parts: Part[];
  clients: Client[];
  isOffline: boolean;
  onRefresh: () => Promise<void>;
  userRole?: UserRole;
  initialTab?: "bling" | "productivity";
}

export default function FiscalHubView({
  ordensServico,
  parts,
  clients,
  isOffline,
  onRefresh,
  userRole,
  initialTab = "bling"
}: FiscalHubViewProps) {
  const [activeTab, setActiveTab] = useState<"bling" | "productivity">(initialTab);

  return (
    <div className="space-y-6 animate-fadein">
      {/* Top Header Hub */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-secondary-container/20 text-slate-900 flex items-center justify-center shadow-inner border border-secondary-container/30">
            <span className="material-symbols-outlined text-2xl text-slate-950 font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
              request_quote
            </span>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Gestão Fiscal & Faturamento
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Emissão de NF-e / NFC-e / NFS-e pelo Bling, auditoria tributária e cadastro de NCMs.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-start sm:self-auto shadow-inner">
          <button
            onClick={() => setActiveTab("bling")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "bling"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">sync_alt</span>
            <span>Integração & Emissão Bling</span>
          </button>
          <button
            onClick={() => setActiveTab("productivity")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "productivity"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">rule</span>
            <span>Auditoria Fiscal & NCMs</span>
          </button>
        </div>
      </div>

      {/* Tab Body */}
      <div>
        {activeTab === "bling" && (
          <BlingSandbox
            ordensServico={ordensServico}
            isOffline={isOffline}
            onRefresh={onRefresh}
            userRole={userRole}
          />
        )}

        {activeTab === "productivity" && (
          <FiscalPanel
            parts={parts}
            clients={clients}
            isOffline={isOffline}
            onRefresh={onRefresh}
          />
        )}
      </div>
    </div>
  );
}
