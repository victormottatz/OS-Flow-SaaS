/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface SystemNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  link?: string;
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
  link?: string
) => {
  const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as SystemNotification[];
  const newNotif: SystemNotification = {
    id: crypto.randomUUID(),
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString(),
    link,
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
      setNotifications(data);
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
