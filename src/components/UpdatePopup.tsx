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
    const hasSeenUpdate = localStorage.getItem('mgv_update_v4_3_seen');
    if (!hasSeenUpdate) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        // Adiciona a notificação na hora que o popup abre!
        const storageData = localStorage.getItem('mgv_notifications') || '[]';
        try {
          const current = JSON.parse(storageData);
          if (!current.some((n: any) => n.title === "🚀 MANCHETE: MGV One Hub V4.3!")) {
            addNotification(
              "🚀 MANCHETE: MGV One Hub V4.3!",
              "Correções visuais na logo lateral e domínio principal definitivo (mgvrp.com.br) configurados na nuvem.",
              "success"
            );
          }
        } catch (e) {}
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('mgv_update_v4_3_seen', 'true');
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
            {/* Cabeçalho com Degradê Gradiente Premium */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <Sparkles className="w-12 h-12 text-white mb-2 drop-shadow-md animate-pulse" />
              <h2 className="text-2xl font-bold text-white tracking-tight drop-shadow-sm">
                Novidades na Atualização!
              </h2>
              <p className="text-blue-100 mt-1 font-medium z-10">
                O MGV One Hub V4.3 chegou
              </p>
              
              <button 
                onClick={handleClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded-full transition-colors z-20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo de Conteúdo */}
            <div className="p-6">
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-slate-200 font-semibold text-base">Correção da Logo e Estabilidade Visual</h3>
                    <p className="text-slate-400 text-sm mt-0.5 leading-relaxed">
                      A logo do menu lateral e tela de login foi renomeada e corrigida para garantir compatibilidade máxima com ambientes Linux e servidores na nuvem, evitando imagens quebradas.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-slate-200 font-semibold text-base">Domínio Oficial e Criptografia</h3>
                    <p className="text-slate-400 text-sm mt-0.5 leading-relaxed">
                      O sistema e a API da aplicação agora apontam e respondem nativamente para seu domínio oficial, otimizando o tráfego com o proxy Traefik em nossa infraestrutura Coolify.
                    </p>
                  </div>
                </li>
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
