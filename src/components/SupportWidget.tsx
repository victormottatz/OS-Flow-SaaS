import React, { useState } from "react";
import { MessageCircle, X, ExternalLink, HelpCircle } from "lucide-react";
import { User } from "../types";

interface SupportWidgetProps {
  user: User | null;
}

export const SupportWidget: React.FC<SupportWidgetProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Número oficial de suporte técnico (substituível via .env ou padrão)
  const supportPhone = (import.meta as any).env?.VITE_SUPPORT_WHATSAPP || "5516999999999";

  const companyName = user?.company?.name || "Minha Oficina";
  const userName = user?.name || "Atendente";

  const defaultMessage = `Olá equipe de suporte do OS-Flow! Sou *${userName}* da assistência *${companyName}*. Gostaria de uma ajuda técnica com o sistema.`;
  const whatsappUrl = `https://wa.me/${supportPhone.replace(/\D/g, "")}?text=${encodeURIComponent(defaultMessage)}`;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end print:hidden">
      {/* Pop-up Card de Suporte Rápido */}
      {isOpen && (
        <div className="mb-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Suporte OS-Flow</h4>
                <p className="text-[11px] text-emerald-100 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                  Atendimento via WhatsApp
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 text-slate-600 text-xs space-y-3">
            <p>
              Precisa de ajuda com cadastro de peças, emissão de laudos em PDF ou dúvidas sobre o seu plano? Fale direto com a nossa equipe de especialistas.
            </p>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer text-xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chamar no WhatsApp</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>

            <p className="text-[10px] text-slate-400 text-center">
              Horário de atendimento: Seg a Sex, das 08h às 18h
            </p>
          </div>
        </div>
      )}

      {/* Botão Flutuante Principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-3 rounded-full shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        title="Falar com o Suporte Técnico"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="text-xs hidden md:inline font-bold">Ajuda & Suporte</span>
        <span className="w-2 h-2 rounded-full bg-emerald-200 animate-ping hidden md:inline"></span>
      </button>
    </div>
  );
};

export default SupportWidget;
