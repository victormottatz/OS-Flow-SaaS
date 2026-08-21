/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, CheckCircle2, Info, AlertTriangle, XCircle, Trash2, Check, ExternalLink } from "lucide-react";
import { useNotifications, SystemNotification } from "../hooks/useNotifications";

export default function NotificationMenu() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const getIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      case "warning": return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case "error": return <XCircle className="w-5 h-5 text-rose-500 shrink-0" />;
      default: return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  const getBgColor = (type: string, read: boolean) => {
    if (read) return "bg-white hover:bg-slate-50";
    switch (type) {
      case "success": return "bg-emerald-50/50 hover:bg-emerald-50";
      case "warning": return "bg-amber-50/50 hover:bg-amber-50";
      case "error": return "bg-rose-50/50 hover:bg-rose-50";
      default: return "bg-blue-50/50 hover:bg-blue-50";
    }
  };

  const safeFormatTime = (isoDate?: string) => {
    if (!isoDate) return "Agora";
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return "Agora";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return "Agora";
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours} h`;
    if (diffDays === 1) return "Ontem";
    return `${diffDays} d`;
  };

  const handleNotificationClick = (notif: SystemNotification) => {
    if (!notif.read) {
      markAsRead(notif.id);
    }

    // Verifica se a notificação é de atualização do sistema
    const isUpdateNotif = 
      notif.action === "open_update_popup" ||
      notif.title.toLowerCase().includes("atualizad") ||
      notif.title.toLowerCase().includes("atualização") ||
      notif.title.toLowerCase().includes("manchete") ||
      notif.title.toLowerCase().includes("mgv one hub");

    if (isUpdateNotif) {
      window.dispatchEvent(new Event("mgv_open_update_popup"));
      setIsOpen(false);
      return;
    }

    if (notif.link) {
      window.open(notif.link, "_blank");
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900 cursor-pointer"
        title="Notificações"
      >
        <Bell className="w-[18px] h-[18px]" />
        
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-sm">Notificações</h3>
                {unreadCount > 0 && (
                  <span className="bg-secondary-container text-primary-container text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} novas
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-md hover:bg-indigo-50 transition-colors cursor-pointer"
                    title="Marcar todas como lidas"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button 
                    onClick={clearAll}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Limpar Histórico"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto overflow-x-hidden custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                    <Bell className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-900">Tudo limpo por aqui</p>
                  <p className="text-xs text-slate-500 mt-1">Você não possui novas notificações no momento.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((notif: SystemNotification) => {
                    const isUpdateNotif = 
                      notif.action === "open_update_popup" ||
                      notif.title.toLowerCase().includes("atualizad") ||
                      notif.title.toLowerCase().includes("atualização") ||
                      notif.title.toLowerCase().includes("manchete") ||
                      notif.title.toLowerCase().includes("mgv one hub");

                    return (
                      <div 
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`flex gap-3 p-4 border-b border-slate-100 last:border-0 cursor-pointer transition-all hover:brightness-95 ${getBgColor(notif.type, notif.read)}`}
                      >
                        <div className="pt-0.5 relative shrink-0">
                          {getIcon(notif.type)}
                          {!notif.read && (
                            <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border-2 border-white translate-x-1 -translate-y-1"></span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5">
                            <h4 className={`text-sm font-semibold truncate pr-2 ${notif.read ? "text-slate-700" : "text-slate-950 font-bold"}`}>
                              {notif.title}
                            </h4>
                            <span className="text-[10px] font-medium text-slate-400 shrink-0 whitespace-nowrap mt-0.5">
                              {safeFormatTime(notif.createdAt)}
                            </span>
                          </div>
                          <p className={`text-xs line-clamp-2 leading-relaxed ${notif.read ? "text-slate-500" : "text-slate-700"}`}>
                            {notif.message}
                          </p>
                          
                          {isUpdateNotif && (
                            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 mt-2 bg-indigo-50/80 px-2 py-0.5 rounded">
                              <span>Ver novidades no modal</span>
                              <ExternalLink className="w-3 h-3" />
                            </div>
                          )}

                          {notif.link && !isUpdateNotif && (
                            <a 
                              href={notif.link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 mt-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Ver detalhes <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
                <p className="text-[10px] text-slate-400 font-medium">As notificações são salvas apenas neste dispositivo.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
