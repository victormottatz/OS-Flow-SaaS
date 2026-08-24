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
    if (savedVersion !== "4.16.0") {
      setIsOpen(true);
      
      // Notificação silenciosa no sino com gatilho para reabrir o modal
      addNotification(
        "🚀 MGV ONE HUB Atualizado (v4.16.0)",
        "Menu Lateral Reorganizado, Alternador de OS (Quadro/Lista), Kanban Compacto a 100% e Hub Fiscal Integrado.",
        "info",
        undefined,
        "open_update_popup"
      );
      
      localStorage.setItem("mgv_last_update_version", "4.16.0");
    }
  }, [addNotification]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('mgv_update_v4_16_seen', 'true');
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
            <div className="bg-gradient-to-r from-indigo-600 to-blue-700 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <span className="bg-indigo-500 text-indigo-50 text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded mb-2 inline-block">Nova Atualização</span>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[28px]">dashboard_customize</span>
                MGV ONE HUB
              </h2>
              <p className="text-indigo-100 mt-1 text-sm">Versão 4.16.0 • Menu Enxuto, Kanban Otimizado & Hub Fiscal</p>
              
              <button 
                onClick={handleClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded-full transition-colors z-20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <ul className="space-y-5">
                {/* Alteração 1: Menu Lateral Reorganizado & Dropdown de Usuário */}
                <div className="flex gap-3.5">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                    <span className="material-symbols-outlined text-[18px]">menu_open</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200 text-xs">Menu Reorganizado & Dropdown de Perfil</h3>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Navegação dividida em Operação, Cadastros e Gestão, sem poluição no rodapé. Opções de perfil e suporte agora no avatar no topo.
                    </p>
                  </div>
                </div>

                {/* Alteração 2: Alternador Quadro / Lista de OS */}
                <div className="flex gap-3.5">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                    <span className="material-symbols-outlined text-[18px]">view_kanban</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200 text-xs">Alternador Instantâneo Quadro ⟷ Lista</h3>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Alterne entre Kanban e Tabela com 1 clique direto no cabeçalho das Ordens de Serviço. Sua preferência fica salva automaticamente.
                    </p>
                  </div>
                </div>

                {/* Alteração 3: Kanban Otimizado a 100% de Zoom */}
                <div className="flex gap-3.5">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <span className="material-symbols-outlined text-[18px]">fit_screen</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200 text-xs">Quadro Kanban Otimizado (Sem Scroll Vertical)</h3>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Barra de ferramentas compacta e dimensionamento perfeito para aproveitar 100% da altura da tela sem cortes.
                    </p>
                  </div>
                </div>

                {/* Alteração 4: Hub Fiscal & Bling */}
                <div className="flex gap-3.5">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200 text-xs">Hub Fiscal & Bling Unificado</h3>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Emissão Bling V3 e Auditoria Fiscal reunidos em um único menu com abas rápidas.
                    </p>
                  </div>
                </div>
              </ul>

              <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleClose}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 text-xs transition-all active:scale-95"
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
