/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { User, UserRole, Client, Device, OrdemServico, Part } from "./types";
import { FeatureFlagProvider } from "./contexts/FeatureFlagContext";
import Navbar from "./components/Navbar";
import LoginForm from "./components/LoginForm";
import DashboardView from "./components/DashboardView";
import ClientManager from "./components/ClientManager";
import OSManager from "./components/OSManager";
import KanbanBoard from "./components/KanbanBoard";
import BlingSandbox from "./components/BlingSandbox";
import StockManager from "./components/StockManager";
import PublicPortal from "./components/PublicPortal";
import UserManagement from "./components/UserManagement";
import FeatureFlagsPanel from "./components/FeatureFlagsPanel";
import SkillTree from "./components/SkillTree";

const getInitialTab = () => {
  const path = window.location.pathname;
  if (path === "/clientes") return "clients";
  if (path === "/os") return "os";
  if (path === "/kanban") return "kanban";
  if (path === "/estoque") return "estoque";
  if (path === "/bling") return "bling";
  if (path === "/users") return "users";
  if (path === "/feature-flags") return "feature-flags";
  if (path === "/skills") return "skills";
  return "dashboard";
};

export default function App() {
  // Roteamento simples para o Portal Público
  const isPublicPortal = window.location.pathname === "/acompanhar";
  if (isPublicPortal) {
    return <PublicPortal />;
  }

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Core Database Models State
  const [clients, setClients] = useState<(Client & { devices: Device[] })[]>([]);
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [parts, setParts] = useState<Part[]>([]);

  // System Controls
  const [currentTab, setCurrentTab] = useState<string>(getInitialTab);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    let path = "/dashboard";
    if (tab === "clients") path = "/clientes";
    else if (tab === "os") path = "/os";
    else if (tab === "kanban") path = "/kanban";
    else if (tab === "estoque") path = "/estoque";
    else if (tab === "bling") path = "/bling";
    else if (tab === "users") path = "/users";
    else if (tab === "feature-flags") path = "/feature-flags";
    else if (tab === "skills") path = "/skills";
    
    window.history.pushState(null, "", path);
  };

  // Sync tab with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentTab(getInitialTab());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Load session from storage
  useEffect(() => {
    const savedUser = localStorage.getItem("mgv_user");
    const savedToken = localStorage.getItem("mgv_token");
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
    setIsInitialized(true);
  }, []);

  // Fetch core models from express server API
  const loadDatabase = async () => {
    if (isOffline) return; // Freeze API calls if offline

    const activeToken = localStorage.getItem("mgv_token") || token || "";
    const headers = activeToken ? { "Authorization": `Bearer ${activeToken}` } : {};

    try {
      const [clientsRes, osRes, partsRes] = await Promise.all([
        fetch("/api/clients", { headers }),
        fetch("/api/ordens-servico", { headers }),
        fetch("/api/parts", { headers })
      ]);

      if (clientsRes.ok && osRes.ok && partsRes.ok) {
        const clientsData = await clientsRes.json();
        const osData = await osRes.json();
        const partsData = await partsRes.json();

        setClients(clientsData);
        setOrdensServico(osData);
        setParts(partsData);
      }
    } catch (err) {
      console.error("Erro ao sincronizar base de dados Express:", err);
    }
  };

  useEffect(() => {
    if (user) {
      loadDatabase();
    }
  }, [user, isOffline]);

  const handleLoginSuccess = (loggedInUser: User, sessionToken: string) => {
    setUser(loggedInUser);
    setToken(sessionToken);
    localStorage.setItem("mgv_user", JSON.stringify(loggedInUser));
    localStorage.setItem("mgv_token", sessionToken);
    handleTabChange("dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("mgv_user");
    localStorage.removeItem("mgv_token");
  };



  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-mono text-xs">
        <span>Iniciando Servidor MGV Tecnologia...</span>
      </div>
    );
  }

  // Not Authenticated Layout
  if (!user) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} isOffline={isOffline} />;
  }

  // Authenticated Dashboard layout viewport
  return (
    <FeatureFlagProvider token={token}>
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 antialiased font-sans">
      <Navbar
        user={user}
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
        isOffline={isOffline}
        setIsOffline={setIsOffline}
        onLogout={handleLogout}
      />

      <main className="flex-1 md:ml-[260px] p-4 sm:p-6 lg:p-8 pb-28 transition-all">
        {currentTab === "dashboard" && (
          <DashboardView
            clients={clients}
            devices={clients.flatMap(c => c.devices || [])}
            ordensServico={ordensServico}
            parts={parts}
            isOffline={isOffline}
            onRefresh={loadDatabase}
            setCurrentTab={handleTabChange}
          />
        )}

        {currentTab === "clients" && (
          <ClientManager
            clients={clients}
            userRole={user.role}
            isOffline={isOffline}
            onRefresh={loadDatabase}
          />
        )}

        {currentTab === "os" && (
          <OSManager
            clients={clients}
            ordensServico={ordensServico}
            isOffline={isOffline}
            onRefresh={loadDatabase}
            userRole={user.role}
          />
        )}

        {currentTab === "kanban" && (
          <KanbanBoard
            ordensServico={ordensServico}
            parts={parts}
            userRole={user.role}
            isOffline={isOffline}
            onRefresh={loadDatabase}
            onNavigateToBlingPanel={() => handleTabChange("bling")}
          />
        )}

        {currentTab === "estoque" && (
          <StockManager
            parts={parts}
            userRole={user.role}
            isOffline={isOffline}
            onRefresh={loadDatabase}
          />
        )}

        {currentTab === "bling" && (
          <BlingSandbox
            ordensServico={ordensServico}
            isOffline={isOffline}
            onRefresh={loadDatabase}
            userRole={user.role}
          />
        )}

        {currentTab === "users" && (
          <UserManagement
            userRole={user.role}
            isOffline={isOffline}
          />
        )}

        {currentTab === "feature-flags" && (
          <FeatureFlagsPanel
            userRole={user.role}
          />
        )}

        {currentTab === "skills" && (
          <SkillTree
            userRole={user.role}
          />
        )}
      </main>

      {/* Floating Action Button (FAB) for OS Creation (hidden when already on OS view) */}
      {currentTab !== "os" && (
        <button 
          onClick={() => handleTabChange("os")} 
          className="fixed bottom-8 right-8 w-14 h-14 bg-secondary-container text-primary-container rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 cursor-pointer"
          title="Nova Ordem de Serviço"
        >
          <span className="material-symbols-outlined text-[28px]">add</span>
        </button>
      )}

      <footer className="md:ml-[260px] bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 font-mono select-none">
        <p>MGV Tecnologia & Assistência Técnica © {new Date().getFullYear()} – Centralized ERP Workspace</p>
      </footer>
    </div>
    </FeatureFlagProvider>
  );
}
