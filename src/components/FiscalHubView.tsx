import React, { useState } from "react";
import { OrdemServico, Part, Client, UserRole } from "../types";
import BlingSandbox from "./BlingSandbox";
import FiscalPanel from "./FiscalPanel";
import { Receipt, ShieldCheck, RefreshCw, Layers } from "lucide-react";

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
      <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500/10 to-cyan-500/10 text-cyan-600 flex items-center justify-center shadow-sm border border-cyan-500/20 shrink-0">
            <Receipt className="w-6 h-6 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Gestão Fiscal & Faturamento Bifásico
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
              Emissão de NF-e (SEFAZ), NFS-e Municipal e sincronização de estoque com Bling V3.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 self-start sm:self-auto shadow-inner">
          <button
            onClick={() => setActiveTab("bling")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "bling"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-600" />
            <span>Faturamento Bling V3</span>
          </button>
          <button
            onClick={() => setActiveTab("productivity")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "productivity"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Auditoria de NCMs</span>
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
