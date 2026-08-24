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
import FiscalHubView from "./components/FiscalHubView";
import StockManager from "./components/StockManager";
import PublicPortal from "./components/PublicPortal";
import SettingsView from "./components/SettingsView";
import ProfileSettings from "./components/ProfileSettings";
import WorkflowVisualizer from "./components/WorkflowVisualizer";
import WhatsAppInboxView from "./components/WhatsAppInboxView";
import { installUnsavedChangesGuard } from "./utils/unsavedChanges";
import { UpdatePopup } from "./components/UpdatePopup";

const getInitialTab = () => {
  const path = window.location.pathname;
  if (path === "/clientes") return "clients";
  if (path === "/os/nova" || path === "/os-create") return "os-create";
  if (path === "/os" || path === "/kanban") return "os";
  if (path === "/whatsapp" || path === "/chat") return "whatsapp";
  if (path === "/estoque") return "estoque";
  if (path === "/fiscal" || path === "/bling") return "fiscal";
  if (path === "/processos" || path === "/arquitetura") return "workflow";
  if (path === "/settings") return "settings";
  if (path === "/perfil") return "profile";
  return "dashboard";
};

export default function App() {
  // Roteamento para o Portal Público do Cliente
  const path = window.location.pathname.toLowerCase();
  const isPublicPortal = path === "/acompanhar" || path === "/portal" || path === "/rastreio" || path === "/consultar";
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

  // Modo de visualização de Ordens de Serviço (Quadro Kanban vs Lista Tabela)
  const [osViewMode, setOsViewMode] = useState<"kanban" | "list">(() => {
    return (localStorage.getItem("mgv_os_view_mode") as "kanban" | "list") || "kanban";
  });

  const handleSetOsViewMode = (mode: "kanban" | "list") => {
    setOsViewMode(mode);
    localStorage.setItem("mgv_os_view_mode", mode);
  };

  // GUIA: ESTADO DA SIDEBAR (recolhida/expandida). O valor é salvo em localStorage
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
    // Normalização de tabs unificadas
    let targetTab = tab;
    if (tab === "kanban") targetTab = "os";
    if (tab === "bling") targetTab = "fiscal";

    setCurrentTab(targetTab);
    let path = "/dashboard";
    if (targetTab === "clients") path = "/clientes";
    else if (targetTab === "os") path = "/os";
    else if (targetTab === "os-create") path = "/os/nova";
    else if (targetTab === "whatsapp") path = "/whatsapp";
    else if (targetTab === "estoque") path = "/estoque";
    else if (targetTab === "fiscal") path = "/fiscal";
    else if (targetTab === "workflow") path = "/processos";
    else if (targetTab === "settings") path = "/settings";
    else if (targetTab === "profile") path = "/perfil";
    
    window.history.pushState(null, "", path);
  };

  const [pendingOpenOS, setPendingOpenOS] = useState<{
    orderId: string;
    osNumber?: string;
    initialTab?: string;
    initialMessageText?: string;
    whatsappMessageId?: string;
  } | null>(null);

  // Sync tab with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentTab(getInitialTab());
    };
    const handleOpenOsEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent?.detail) {
        setPendingOpenOS(customEvent.detail);
      }
      handleTabChange("os");
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("mgv_open_os_details", handleOpenOsEvent);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("mgv_open_os_details", handleOpenOsEvent);
    };
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

  // Guarda de alterações não salvas
  useEffect(() => {
    return installUnsavedChangesGuard();
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

  const loadDatabase = async () => {
    if (!token) return;
    try {
      const [resClients, resOS, resParts, resPartStats, resOSCounts] = await Promise.all([
        axios.get(`/api/clients?limit=${clientLimit}&search=${encodeURIComponent(clientSearch)}`),
        axios.get(`/api/ordens-servico?limit=${osLimit}&includeRelations=true`),
        axios.get(`/api/parts?limit=${partLimit}&search=${encodeURIComponent(partSearch)}`),
        axios.get('/api/parts/stats').catch(() => ({ data: { lowStockCount: 0, serializedCount: 0, totalStockValue: 0 } })),
        axios.get('/api/ordens-servico/counts-by-status').catch(() => ({ data: {} }))
      ]);

      if (resClients.data.data) {
        setClients(resClients.data.data);
        setTotalClients(resClients.data.total || resClients.data.data.length);
      } else {
        setClients(resClients.data);
        setTotalClients(resClients.data.length);
      }

      if (Array.isArray(resOS.data)) {
        setOrdensServico(resOS.data);
      } else if (resOS.data?.data && Array.isArray(resOS.data.data)) {
        setOrdensServico(resOS.data.data);
      } else {
        setOrdensServico([]);
      }
      if (resParts.data.data) {
        setParts(resParts.data.data);
        setTotalParts(resParts.data.total || resParts.data.data.length);
      } else {
        setParts(resParts.data);
        setTotalParts(resParts.data.length);
      }

      setPartStats(resPartStats.data);
      setOsCountsByStatus(resOSCounts.data || {});
    } catch (err: any) {
      console.error("Erro ao carregar dados do banco:", err);
      if (err.response?.status === 401) {
        handleLogout();
      }
    }
  };

  useEffect(() => {
    if (user && token) {
      loadDatabase();
    }
  }, [user, token, osLimit, clientLimit, partLimit, clientSearch, partSearch]);

  const handleLoginSuccess = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("mgv_user", JSON.stringify(userData));
    localStorage.setItem("mgv_token", authToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("mgv_user");
    localStorage.removeItem("mgv_token");
    delete axios.defaults.headers.common['Authorization'];
    window.location.href = "/";
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-secondary-container border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-sm text-slate-400">Iniciando MGV One Hub...</p>
        </div>
      </div>
    );
  }

  // Not Authenticated Layout
  if (!user) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} isOffline={isOffline} />;
  }

  const isOSKanbanActive = (currentTab === "os" || currentTab === "kanban") && osViewMode === "kanban";

  // Authenticated Dashboard layout viewport
  return (
    <FeatureFlagProvider token={token}>
    <div className={`min-h-screen bg-slate-50 flex flex-col text-slate-800 antialiased font-sans ${
      isOSKanbanActive || currentTab === "whatsapp" ? "h-screen overflow-hidden" : ""
    }`}>
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
      
      <UpdatePopup />

      {/* Margem do Conteúdo conforme sidebar */}
      <main className={`flex-1 transition-all duration-300 ${
        isOSKanbanActive
          ? "h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden p-3 md:p-4 flex flex-col" 
          : currentTab === "whatsapp"
          ? "h-full max-h-screen overflow-hidden p-0 flex flex-col"
          : "pb-28 pt-6"
      } ${
        currentTab === "whatsapp" || isOSKanbanActive
          ? isSidebarMinimized ? "md:ml-[70px]" : "md:ml-[260px]"
          : isSidebarMinimized 
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

        {/* Visão de Ordens de Serviço (Quadro Kanban vs Lista Tabela) */}
        {(currentTab === "os" || currentTab === "kanban") && (
          osViewMode === "kanban" ? (
            <KanbanBoard
              ordensServico={ordensServico}
              parts={parts}
              userRole={user.role}
              isOffline={isOffline}
              onRefresh={loadDatabase}
              onNavigateToBlingPanel={() => handleTabChange("fiscal")}
              limit={osLimit}
              onLimitChange={setOsLimit}
              countsByStatus={osCountsByStatus}
              onSwitchToList={() => handleSetOsViewMode("list")}
              targetOpenOS={pendingOpenOS}
              onClearTargetOpenOS={() => setPendingOpenOS(null)}
            />
          ) : (
            <OSList
              isOffline={isOffline}
              onRefresh={loadDatabase}
              userRole={user.role}
              onSwitchToKanban={() => handleSetOsViewMode("kanban")}
              targetOpenOS={pendingOpenOS}
              onClearTargetOpenOS={() => setPendingOpenOS(null)}
            />
          )
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

        {currentTab === "whatsapp" && (
          <WhatsAppInboxView
            onOpenOrderModal={(orderId) => {
              setPendingOpenOS({ orderId, initialTab: "whatsapp" });
              handleTabChange("os");
            }}
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

        {/* Visão Unificada Fiscal & Bling */}
        {(currentTab === "fiscal" || currentTab === "bling") && (
          <FiscalHubView
            ordensServico={ordensServico}
            parts={parts}
            clients={clients}
            isOffline={isOffline}
            onRefresh={loadDatabase}
            userRole={user.role}
            initialTab={currentTab === "bling" ? "bling" : "productivity"}
          />
        )}

        {currentTab === "workflow" && (
          <WorkflowVisualizer />
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

      {/* Floating Action Button (FAB) for OS Creation */}
      {currentTab !== "os-create" && currentTab !== "whatsapp" && (
        <button 
          onClick={() => handleTabChange("os-create")} 
          className="fixed bottom-8 right-8 w-14 h-14 bg-secondary-container text-primary-container rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 cursor-pointer"
          title="Nova Ordem de Serviço"
        >
          <span className="material-symbols-outlined text-[28px]">add</span>
        </button>
      )}

      {/* Rodapé Global */}
      {!isOSKanbanActive && currentTab !== "whatsapp" && (
        <footer className={`bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 font-mono select-none transition-all duration-300 ${
          isSidebarMinimized ? "md:ml-[70px]" : "md:ml-[260px]"
        }`}>
          <p>MGV One Hub © {new Date().getFullYear()} – ERP Centralizado de Assistência Técnica</p>
        </footer>
      )}
    </div>
    </FeatureFlagProvider>
  );
}
