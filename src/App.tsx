/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import axios from "axios";
import { User, UserRole, Client, Device, OrdemServico, Part } from "./types";
import { FeatureFlagProvider } from "./contexts/FeatureFlagContext";
import Navbar from "./components/Navbar";
import LoginForm from "./components/LoginForm";
import DashboardView from "./components/DashboardView";
import ClientManager from "./components/ClientManager";
import OSList from "./components/OSList";
import OSManager from "./components/OSManager";
import KanbanBoard from "./components/KanbanBoard";
import BlingSandbox from "./components/BlingSandbox";
import StockManager from "./components/StockManager";
import PublicPortal from "./components/PublicPortal";
import SettingsView from "./components/SettingsView";
import ProfileSettings from "./components/ProfileSettings";

const getInitialTab = () => {
  const path = window.location.pathname;
  if (path === "/clientes") return "clients";
  if (path === "/os/nova" || path === "/os-create") return "os-create";
  if (path === "/os") return "os";
  if (path === "/kanban") return "kanban";
  if (path === "/estoque") return "estoque";
  if (path === "/bling") return "bling";
  if (path === "/settings") return "settings";
  if (path === "/perfil") return "profile";
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
  const [totalClients, setTotalClients] = useState<number>(0);
  const [totalParts, setTotalParts] = useState<number>(0);

  // System Controls
  const [currentTab, setCurrentTab] = useState<string>(getInitialTab);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState<boolean>(() => {
    return localStorage.getItem("mgv_sidebar_minimized") === "true";
  });

  const handleToggleSidebar = () => {
    setIsSidebarMinimized(prev => {
      const newVal = !prev;
      localStorage.setItem("mgv_sidebar_minimized", String(newVal));
      return newVal;
    });
  };

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    let path = "/dashboard";
    if (tab === "clients") path = "/clientes";
    else if (tab === "os") path = "/os";
    else if (tab === "os-create") path = "/os/nova";
    else if (tab === "kanban") path = "/kanban";
    else if (tab === "estoque") path = "/estoque";
    else if (tab === "bling") path = "/bling";
    else if (tab === "settings") path = "/settings";
    else if (tab === "profile") path = "/perfil";
    
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
      // Configura Axios globalmente
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }
    setIsInitialized(true);
  }, []);

  const [osLimit, setOsLimit] = useState<number | "all">(100);
  const [clientLimit, setClientLimit] = useState<number | "all">(100);
  const [partLimit, setPartLimit] = useState<number | "all">(100);
  const [clientSearch, setClientSearch] = useState<string>("");
  const [partSearch, setPartSearch] = useState<string>("");
  const [partStats, setPartStats] = useState<{ lowStockCount: number; serializedCount: number; totalStockValue: number }>({ lowStockCount: 0, serializedCount: 0, totalStockValue: 0 });
  const [osCountsByStatus, setOsCountsByStatus] = useState<Record<string, number>>({
    AGUARDANDO_AVALIACAO: 0,
    AGUARDANDO_AUTORIZACAO: 0,
    AGUARDANDO_PECA: 0,
    EM_MANUTENCAO: 0,
    PRONTO_RETIRADA: 0,
    PAGO_PRONTO_RETIRADA: 0,
    FINALIZADO: 0
  });

  // Fetch core models from express server API
  const loadDatabase = async (
    currentOsLimit = osLimit,
    currentClientLimit = clientLimit,
    currentPartLimit = partLimit,
    currentClientSearch = clientSearch,
    currentPartSearch = partSearch
  ) => {
    if (isOffline) return; // Freeze API calls if offline

    const activeToken = localStorage.getItem("mgv_token") || token || "";
    const headers = activeToken ? { "Authorization": `Bearer ${activeToken}` } : {};

    try {
      const clientsUrl = `/api/clients?limit=${currentClientLimit}${currentClientSearch ? `&search=${encodeURIComponent(currentClientSearch)}` : ""}`;
      const partsUrl = `/api/parts?limit=${currentPartLimit}${currentPartSearch ? `&search=${encodeURIComponent(currentPartSearch)}` : ""}`;
      const osUrl = `/api/ordens-servico?pageSize=${currentOsLimit === "all" ? 10000 : currentOsLimit}&includeRelations=true`;

      const [clientsRes, osRes, partsRes] = await Promise.all([
        fetch(clientsUrl, { headers }),
        fetch(osUrl, { headers }),
        fetch(partsUrl, { headers })
      ]);

      if (clientsRes.ok && osRes.ok && partsRes.ok) {
        const clientsRaw = await clientsRes.json();
        const osRaw = await osRes.json();
        console.log("[App.tsx] osRaw retornado do backend:", osRaw);
        const partsRaw = await partsRes.json();
        const osData = Array.isArray(osRaw) ? osRaw : (osRaw.data || []);
        const countsData = (!Array.isArray(osRaw) && osRaw.countsByStatus) ? osRaw.countsByStatus : {};

        // Se o backend retorna { data, total }, usamos o data e total correspondentes, senão retrocompatibilidade
        const clientsData = clientsRaw && clientsRaw.data ? clientsRaw.data : clientsRaw;
        const totalCli = clientsRaw && typeof clientsRaw.total === "number" ? clientsRaw.total : clientsRaw.length;
        
        const partsData = partsRaw && partsRaw.data ? partsRaw.data : partsRaw;
        const totalPrt = partsRaw && typeof partsRaw.total === "number" ? partsRaw.total : partsRaw.length;
        const statsPrt = partsRaw && partsRaw.stats ? partsRaw.stats : { lowStockCount: 0, serializedCount: 0, totalStockValue: 0 };

        setClients(clientsData);
        setTotalClients(totalCli);
        setOrdensServico(osData);
        setOsCountsByStatus(countsData);
        setParts(partsData);
        setTotalParts(totalPrt);
        setPartStats(statsPrt);
      }
    } catch (err) {
      console.error("Erro ao sincronizar base de dados Express:", err);
    }
  };

  useEffect(() => {
    if (user) {
      loadDatabase(osLimit, clientLimit, partLimit, clientSearch, partSearch);
    }
  }, [user, isOffline, osLimit, clientLimit, partLimit, clientSearch, partSearch]);

  const handleLoginSuccess = (loggedInUser: User, sessionToken: string) => {
    setUser(loggedInUser);
    setToken(sessionToken);
    localStorage.setItem("mgv_user", JSON.stringify(loggedInUser));
    localStorage.setItem("mgv_token", sessionToken);
    // Configura Axios globalmente
    axios.defaults.headers.common['Authorization'] = `Bearer ${sessionToken}`;
    handleTabChange("dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("mgv_user");
    localStorage.removeItem("mgv_token");
    // Remove cabeçalho global do Axios
    delete axios.defaults.headers.common['Authorization'];
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
        isSidebarMinimized={isSidebarMinimized}
        toggleSidebar={handleToggleSidebar}
      />

      <main className={`flex-1 pb-28 transition-all duration-300 ${
        isSidebarMinimized 
          ? "md:ml-[70px] pt-6 pb-6 pr-6 pl-8 md:pl-10 lg:pl-12" 
          : "md:ml-[260px] pt-6 pb-6 pr-6 pl-6 md:pl-8 lg:pl-10"
      }`}>
        {currentTab === "dashboard" && (
          <DashboardView
            user={user}
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
            limit={clientLimit}
            onLimitChange={setClientLimit}
            searchTerm={clientSearch}
            onSearchChange={setClientSearch}
            totalItems={totalClients}
          />
        )}

        {currentTab === "os" && (
          <OSList
            isOffline={isOffline}
            onRefresh={loadDatabase}
            userRole={user.role}
          />
        )}

        {currentTab === "os-create" && (
          <OSManager
            clients={clients}
            ordensServico={ordensServico}
            isOffline={isOffline}
            onRefresh={loadDatabase}
            userRole={user.role}
            onOSCreated={() => handleTabChange("os")}
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
            limit={osLimit}
            onLimitChange={setOsLimit}
            countsByStatus={osCountsByStatus}
          />
        )}

        {currentTab === "estoque" && (
          <StockManager
            parts={parts}
            userRole={user.role}
            isOffline={isOffline}
            onRefresh={loadDatabase}
            limit={partLimit}
            onLimitChange={setPartLimit}
            searchQuery={partSearch}
            onSearchChange={setPartSearch}
            totalItemsCount={totalParts}
            dbLowStockCount={partStats.lowStockCount}
            dbSerializedCount={partStats.serializedCount}
            dbTotalStockValue={partStats.totalStockValue}
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

        {currentTab === "settings" && (
          <SettingsView userRole={user.role} isOffline={isOffline} />
        )}

        {currentTab === "profile" && (
          <ProfileSettings
            user={user}
            onProfileUpdated={(updatedUser) => {
              setUser(updatedUser);
              localStorage.setItem("mgv_user", JSON.stringify(updatedUser));
            }}
            isOffline={isOffline}
          />
        )}
      </main>

      {/* Floating Action Button (FAB) for OS Creation (hidden when already on OS view) */}
      {currentTab !== "os-create" && (
        <button 
          onClick={() => handleTabChange("os-create")} 
          className="fixed bottom-8 right-8 w-14 h-14 bg-secondary-container text-primary-container rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 cursor-pointer"
          title="Nova Ordem de Serviço"
        >
          <span className="material-symbols-outlined text-[28px]">add</span>
        </button>
      )}

      <footer className={`bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 font-mono select-none transition-all duration-300 ${
        isSidebarMinimized ? "md:ml-[70px]" : "md:ml-[260px]"
      }`}>
        <p>MGV Assistência Técnica © {new Date().getFullYear()} – Centralized ERP Workspace</p>
      </footer>
    </div>
    </FeatureFlagProvider>
  );
}
