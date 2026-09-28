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
    if (savedVersion !== "5.6.0") {
      setIsOpen(true);
      
      // Notificação silenciosa no sino com gatilho para reabrir o modal
      addNotification(
        "🚀 OS-FLOW - Novo Funil de Conversão & Progressive Profiling (v5.6.0)",
        "Hero interativo em 3 abas (Dashboard, Laudo com Fotos e Split Fiscal), cadastro enxuto em 2 etapas e Sticky CTA mobile.",
        "info",
        undefined,
        "open_update_popup"
      );
      
      localStorage.setItem("mgv_last_update_version", "5.6.0");
    }
  }, [addNotification]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('mgv_update_v5_6_seen', 'true');
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
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 p-6 text-white relative">
              <button
                onClick={handleClose}
                className="absolute right-4 top-4 p-1.5 rounded-xl bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/20 text-[11px] font-black tracking-wider uppercase backdrop-blur-md mb-2">
                <span>Versão 5.6.0 Funil de Alta Conversão</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse"></span>
              </div>
              <h2 className="text-xl font-black tracking-tight">Novo Funil de Conversão & UI/UX</h2>
              <p className="text-blue-100 text-xs mt-1">Primeira dobra interativa, cadastro rápido em 2 etapas e otimização para tráfego do WhatsApp.</p>
            </div>

            {/* Conteúdo com os Destaques */}
            <div className="p-6">
              <ul className="space-y-4">
                {/* Alteração 1: Hero Interativo */}
                <div className="flex gap-3.5">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                    <span className="material-symbols-outlined text-[18px]">tab</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200 text-xs">Hero Interativo com 3 Abas de Degustação</h3>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      O visitante agora alterna entre o Dashboard Real, o Laudo Pericial com Fotos e o Split Fiscal de Peças vs Serviços sem precisar rolar a tela.
                    </p>
                  </div>
                </div>

                {/* Alteração 2: Progressive Profiling */}
                <div className="flex gap-3.5">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                    <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200 text-xs">Progressive Profiling no Cadastro (2 Passos)</h3>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Formulário de ativação de 14 dias reestruturado em 2 etapas enxutas com máscara de WhatsApp e design Linear Dark.
                    </p>
                  </div>
                </div>

                {/* Alteração 3: Mobile Sticky CTA */}
                <div className="flex gap-3.5">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <span className="material-symbols-outlined text-[18px]">phone_iphone</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200 text-xs">Barra Sticky CTA no Mobile & Selos de Confiança</h3>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Barra de ação fixa inferior para visitantes de celular vindos do WhatsApp e selos de risco zero (14 dias sem cartão de crédito).
                    </p>
                  </div>
                </div>
              </ul>

              <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleClose}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 text-xs transition-all active:scale-95 cursor-pointer"
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
