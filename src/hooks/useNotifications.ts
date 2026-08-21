/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";

export type NotificationType = "info" | "success" | "warning" | "error";
export type NotificationAction = "open_update_popup" | "navigate_tab" | "open_url" | "approve_whatsapp" | "open_os";

export interface SystemNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  link?: string;
  action?: NotificationAction;
  actionPayload?: string;
  whatsappMessageId?: string;
  orderId?: string;
  osNumber?: string;
  previewText?: string;
}

const STORAGE_KEY = "mgv_notifications";
const EVENT_KEY = "mgv_notifications_changed";

/**
 * Dispara um evento global avisando que as notificações mudaram.
 */
const notifyChange = () => {
  window.dispatchEvent(new Event(EVENT_KEY));
};

export const addNotification = (
  title: string,
  message: string,
  type: NotificationType = "info",
  link?: string,
  action?: NotificationAction,
  actionPayload?: string,
  extra?: {
    whatsappMessageId?: string;
    orderId?: string;
    osNumber?: string;
    previewText?: string;
  }
) => {
  let current: SystemNotification[] = [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(raw)) {
      current = raw;
    }
  } catch {
    current = [];
  }

  // Se já existir uma notificação idêntica para o mesmo whatsappMessageId que ainda não foi lida/removida, evita duplicar
  if (extra?.whatsappMessageId && current.some(n => n.whatsappMessageId === extra.whatsappMessageId)) {
    return;
  }

  const newNotif: SystemNotification = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title: title || "Notificação",
    message: message || "",
    type: type || "info",
    read: false,
    createdAt: new Date().toISOString(),
    link,
    action,
    actionPayload,
    whatsappMessageId: extra?.whatsappMessageId,
    orderId: extra?.orderId,
    osNumber: extra?.osNumber,
    previewText: extra?.previewText
  };
  
  const updated = [newNotif, ...current].slice(0, 50); // Mantém as últimas 50
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  notifyChange();
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  const loadNotifications = () => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(data)) {
        setNotifications([]);
        return;
      }
      
      // Sanitização defensiva de cada item para prevenir tela branca por dados legados/corrompidos
      const sanitized: SystemNotification[] = data
        .filter((item): item is Record<string, any> => item !== null && typeof item === "object")
        .map((item) => ({
          id: String(item.id || Math.random().toString(36).substring(2, 9)),
          type: (["info", "success", "warning", "error"].includes(item.type) ? item.type : "info") as NotificationType,
          title: String(item.title || "Notificação"),
          message: String(item.message || ""),
          createdAt: item.createdAt && !isNaN(new Date(item.createdAt).getTime()) ? String(item.createdAt) : new Date().toISOString(),
          read: Boolean(item.read),
          link: item.link ? String(item.link) : undefined,
          action: item.action ? (item.action as NotificationAction) : undefined,
          actionPayload: item.actionPayload ? String(item.actionPayload) : undefined,
          whatsappMessageId: item.whatsappMessageId ? String(item.whatsappMessageId) : undefined,
          orderId: item.orderId ? String(item.orderId) : undefined,
          osNumber: item.osNumber ? String(item.osNumber) : undefined,
          previewText: item.previewText ? String(item.previewText) : undefined
        }));

      setNotifications(sanitized);
    } catch {
      setNotifications([]);
    }
  };

  // Sincroniza mensagens de WhatsApp pendentes de aprovação direto do backend
  const syncPendingApprovals = async () => {
    try {
      const activeToken = localStorage.getItem("mgv_token");
      if (!activeToken) return;

      const res = await fetch("/api/whatsapp/pending-messages", {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (!res.ok) return;

      const pendings = await res.json();
      if (Array.isArray(pendings) && pendings.length > 0) {
        pendings.forEach((p: any) => {
          const osNum = p.order?.osNumber || "N/A";
          const clientName = p.order?.client?.name || "Cliente";
          addNotification(
            `📲 Aprovar Envio WhatsApp (OS #${osNum})`,
            `Mensagem para ${clientName} aguardando sua autorização.`,
            "warning",
            undefined,
            "approve_whatsapp",
            p.orderId,
            {
              whatsappMessageId: p.id,
              orderId: p.orderId,
              osNumber: osNum,
              previewText: p.messageText
            }
          );
        });
      }
    } catch {
      // Ignora falhas pontuais de conexão
    }
  };

  useEffect(() => {
    loadNotifications();
    syncPendingApprovals();

    // 1. Polling de redundância a cada 15 segundos
    const interval = setInterval(syncPendingApprovals, 15000);

    // 2. Conexão SSE em Tempo Real para Notificação Instantânea no Sininho
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/whatsapp/events");
      
      eventSource.addEventListener("whatsapp_approval_required", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          const osNum = data.osNumber || "N/A";
          const clientName = data.clientName || "Cliente";

          addNotification(
            `📲 Aprovar Envio WhatsApp (OS #${osNum})`,
            `Mensagem para ${clientName} aguardando sua autorização.`,
            "warning",
            undefined,
            "approve_whatsapp",
            data.orderId,
            {
              whatsappMessageId: data.messageId,
              orderId: data.orderId,
              osNumber: osNum,
              previewText: data.previewText
            }
          );
        } catch (err) {
          console.warn("[useNotifications] Erro ao processar evento SSE:", err);
        }
      });

      eventSource.addEventListener("whatsapp_approval_resolved", () => {
        syncPendingApprovals();
      });
    } catch (sseErr) {
      console.warn("[useNotifications] Falha ao iniciar SSE:", sseErr);
    }

    window.addEventListener(EVENT_KEY, loadNotifications);
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) loadNotifications();
    });

    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
      window.removeEventListener(EVENT_KEY, loadNotifications);
      window.removeEventListener("storage", loadNotifications);
    };
  }, []);

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifyChange();
  };

  const removeNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifyChange();
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifyChange();
  };

  const clearAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    notifyChange();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    removeNotification,
    markAllAsRead,
    clearAll,
    syncPendingApprovals
  };
}

