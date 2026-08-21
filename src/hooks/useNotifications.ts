/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";

export type NotificationType = "info" | "success" | "warning" | "error";
export type NotificationAction = "open_update_popup" | "navigate_tab" | "open_url";

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
  actionPayload?: string
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

  const newNotif: SystemNotification = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title: title || "Notificação",
    message: message || "",
    type: type || "info",
    read: false,
    createdAt: new Date().toISOString(),
    link,
    action,
    actionPayload
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
          actionPayload: item.actionPayload ? String(item.actionPayload) : undefined
        }));

      setNotifications(sanitized);
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    loadNotifications();
    window.addEventListener(EVENT_KEY, loadNotifications);
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) loadNotifications();
    });

    return () => {
      window.removeEventListener(EVENT_KEY, loadNotifications);
      window.removeEventListener("storage", loadNotifications);
    };
  }, []);

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
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
    markAllAsRead,
    clearAll
  };
}
