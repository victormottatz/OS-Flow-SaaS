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
    if (savedVersion !== "4.20.0") {
      setIsOpen(true);
      
      // Notificação silenciosa no sino com gatilho para reabrir o modal
      addNotification(
        "🚀 MGV ONE HUB Atualizado (v4.20.0)",
        "Portal do Consumidor Oficial e Aprovação de Orçamentos Online com Assinatura Digital.",
        "info",
        undefined,
        "open_update_popup"
      );
      
      localStorage.setItem("mgv_last_update_version", "4.20.0");
    }
  }, [addNotification]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('mgv_update_v4_20_seen', 'true');
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
            <div className="bg-gradient-to-r from-amber-600 via-yellow-600 to-indigo-600 p-6 text-white relative">
              <button
                onClick={handleClose}
                className="absolute right-4 top-4 p-1.5 rounded-xl bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/20 text-[11px] font-black tracking-wider uppercase backdrop-blur-md mb-2">
                <span>Versão 4.20.0</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              </div>
              <h2 className="text-xl font-black tracking-tight">Novidades da Atualização</h2>
              <p className="text-amber-100 text-xs mt-1">Portal do Consumidor Oficial, Aprovação de Orçamentos Online e 1-Clique WhatsApp.</p>
            </div>

            {/* Conteúdo com os Destaques */}
            <div className="p-6">
              <ul className="space-y-4">
                {/* Alteração 1: Portal do Consumidor */}
                <div className="flex gap-3.5">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <span className="material-symbols-outlined text-[18px]">public</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200 text-xs">Portal do Consumidor (/acompanhar)</h3>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Seus clientes agora contam com uma área pública exclusiva para acompanhar o progresso do reparo em tempo real com stepper visual.
                    </p>
                  </div>
                </div>

                {/* Alteração 2: Aprovação Online com Assinatura Digital */}
                <div className="flex gap-3.5">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <span className="material-symbols-outlined text-[18px]">draw</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200 text-xs">Aprovação Online com Assinatura Digital</h3>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      O cliente assina pelo celular e aprova o orçamento eletronicamente, avançando a OS automaticamente para "Em Manutenção" no Kanban.
                    </p>
                  </div>
                </div>

                {/* Alteração 3: Deep-Link 1-Clique WhatsApp */}
                <div className="flex gap-3.5">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                    <span className="material-symbols-outlined text-[18px]">link</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200 text-xs">Acesso Direto 1-Clique via WhatsApp</h3>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Links automáticos enviados por mensagem abrem a OS do cliente instantaneamente sem necessidade de digitação.
                    </p>
                  </div>
                </div>
              </ul>

              <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleClose}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 text-xs transition-all active:scale-95 cursor-pointer"
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
