import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { addNotification } from '../hooks/useNotifications';

export function UpdatePopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpenEvent = () => setIsOpen(true);
    window.addEventListener("mgv_open_update_popup", handleOpenEvent);
    return () => {
      window.removeEventListener("mgv_open_update_popup", handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    const savedVersion = localStorage.getItem("mgv_last_update_version");
    if (savedVersion !== "4.22.0") {
      setIsOpen(true);
      
      // Notificação silenciosa no sino com gatilho para reabrir o modal
      addNotification(
        "🚀 MGV ONE HUB Atualizado (v4.22.0)",
        "Técnico Responsável por OS, Linha do Tempo / Histórico de Auditoria e Filtros de Produtividade.",
        "info",
        undefined,
        "open_update_popup"
      );
      
      localStorage.setItem("mgv_last_update_version", "4.22.0");
    }
  }, [addNotification]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('mgv_update_v4_22_seen', 'true');
  };

  // Fecha o popup ao clicar fora da janela de conteúdo (backdrop)
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl"
          >
            {/* Header com Gradiente */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-600 p-6 text-white relative">
              <button
                onClick={handleClose}
                className="absolute right-4 top-4 p-1.5 rounded-xl bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/20 text-[11px] font-black tracking-wider uppercase backdrop-blur-md mb-2">
                <span>Versão 4.22.0</span>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
              </div>
              <h2 className="text-xl font-black tracking-tight">Novidades da Atualização</h2>
              <p className="text-indigo-100 text-xs mt-1">Técnico Responsável, Linha do Tempo e Histórico de Auditoria da OS.</p>
            </div>

            {/* Conteúdo com os Destaques */}
            <div className="p-6">
              <ul className="space-y-4">
                {/* Alteração 1: Técnico Responsável */}
                <div className="flex gap-3.5">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                    <span className="material-symbols-outlined text-[18px]">engineering</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200 text-xs">Técnico Responsável por OS</h3>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Atribua técnicos responsáveis na abertura da OS, na prancheta ou na listagem, com badges visuais e filtros dedicados de bancada.
                    </p>
                  </div>
                </div>

                {/* Alteração 2: Linha do Tempo e Auditoria */}
                <div className="flex gap-3.5">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                    <span className="material-symbols-outlined text-[18px]">history</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200 text-xs">Linha do Tempo e Histórico Completo</h3>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Rastreabilidade total de cada OS: registro de fases, laudo, peças aplicadas, testes de bancada e espaço para anotações internas.
                    </p>
                  </div>
                </div>

                {/* Alteração 3: Filtros de Produtividade */}
                <div className="flex gap-3.5">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                    <span className="material-symbols-outlined text-[18px]">filter_list</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200 text-xs">Filtros por Técnico no Kanban e Lista</h3>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Visualize instantaneamente a fila de trabalho de cada técnico ou identifique equipamentos sem técnico atribuído para agilizar a triagem.
                    </p>
                  </div>
                </div>
              </ul>

              <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleClose}
                  className="px-5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 text-xs transition-all active:scale-95 cursor-pointer"
                >
                  Entendi, vamos lá!
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
