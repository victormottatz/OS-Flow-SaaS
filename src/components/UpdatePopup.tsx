import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, CheckCircle2 } from 'lucide-react';
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
    if (savedVersion !== "4.14.6") {
      setIsOpen(true);
      
      // Notificação silenciosa no sino com gatilho para reabrir o modal
      addNotification(
        "🚀 MGV ONE HUB Atualizado (v4.14.6)",
        "Scrollbar Ultra-Minimalista: Fundo transparente e apenas a barra de navegação visível.",
        "info",
        undefined,
        "open_update_popup"
      );
      
      localStorage.setItem("mgv_last_update_version", "4.14.6");
    }
  }, [addNotification]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('mgv_update_v4_14_seen', 'true');
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
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <span className="bg-emerald-500 text-emerald-50 text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded mb-2 inline-block">Nova Atualização</span>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[28px]">chat</span>
                MGV ONE HUB
              </h2>
              <p className="text-emerald-100 mt-1 text-sm">Versão 4.14.6 • Scrollbars Minimalistas com Fundo Transparente</p>
              
              <button 
                onClick={handleClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded-full transition-colors z-20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <ul className="space-y-6">
            {/* Alteração 1: Central de WhatsApp com Fotos de Perfil */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <span className="material-symbols-outlined text-[20px]">account_circle</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-200 text-sm">Fotos de Perfil e Identificação de Contato</h3>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  As fotos de perfil dos contatos do WhatsApp agora aparecem automaticamente na lista de conversas, no cabeçalho do chat e no painel do cliente.
                </p>
              </div>
            </div>

            {/* Alteração 2: Superpoderes da OS */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <span className="material-symbols-outlined text-[20px]">assignment</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-200 text-sm">Contexto de Ordem de Serviço na Conversa</h3>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  A barra lateral do chat exibe os dados da OS ativa, valor do orçamento, diagnóstico e atalhos rápidos com envio automático de laudos em PDF.
                </p>
              </div>
            </div>

            {/* Alteração 3: Multiatendimento */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <span className="material-symbols-outlined text-[20px]">group</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-200 text-sm">Multiatendimento em 1 Único Número</h3>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  Toda a equipe pode atender simultaneamente pelo navegador com identificação do operador e notificações sonoras e visuais instantâneas.
                </p>
              </div>
            </div>
              </ul>

              <div className="mt-8 pt-5 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg shadow-blue-500/20 transition-all active:scale-95"
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
