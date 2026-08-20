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
    if (savedVersion !== "4.12.1") {
      setIsOpen(true);
      
      // Notificação silenciosa no sino
      addNotification({
        title: "🚀 MGV ONE HUB Atualizado (v4.12.1)",
        message: "Conexão Oficial com a Evolution API corrigida! O QR Code agora funciona perfeitamente.",
        type: "system",
        read: false
      });
      
      localStorage.setItem("mgv_last_update_version", "4.12.1");
    }
  }, [addNotification]);

  const handleClose = () => {
    setIsOpen(false);
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
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <span className="bg-indigo-500 text-indigo-50 text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded mb-2 inline-block">Nova Atualização</span>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[28px]">rocket_launch</span>
                MGV ONE HUB
              </h2>
              <p className="text-indigo-200 mt-1 text-sm">Versão 4.12.1 • Agosto de 2026</p>
              
              <button 
                onClick={handleClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded-full transition-colors z-20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <ul className="space-y-6">
                {/* Alteração 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                    <span className="material-symbols-outlined text-blue-600 text-[20px]">qr_code_scanner</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200 text-sm">Integração WhatsApp Finalizada</h3>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                      O painel de Configurações do WhatsApp agora se conecta diretamente à Evolution API para gerar o QR Code correto. A simulação foi desativada e a integração está em produção.
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
