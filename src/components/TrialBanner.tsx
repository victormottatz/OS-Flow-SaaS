import React from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { User } from "../types";

interface TrialBannerProps {
  user: User;
  onNavigateToPlans: () => void;
  isSidebarMinimized: boolean;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({
  user,
  onNavigateToPlans,
  isSidebarMinimized,
}) => {
  const sub = user.company?.subscription;
  
  // Exibe apenas se a empresa estiver em TRIAL ou se não tiver assinatura definitiva
  const isTrial = sub?.status === "TRIAL" || (!sub && user.company);
  if (!isTrial) return null;

  const now = new Date();
  let daysRemaining = 14;

  if (sub?.trialEndsAt) {
    const trialEnd = new Date(sub.trialEndsAt);
    const diffTime = trialEnd.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  } else if (user.company?.createdAt) {
    const createdAt = new Date(user.company.createdAt);
    const elapsedDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    daysRemaining = Math.max(0, Math.ceil(14 - elapsedDays));
  }

  return (
    <div
      className={`bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white px-4 py-2 text-xs flex items-center justify-between shadow-md transition-all duration-300 select-none ${
        isSidebarMinimized ? "md:ml-[70px]" : "md:ml-[260px]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="p-1 bg-white/20 rounded-lg flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-cyan-200 animate-pulse" />
        </span>
        <span>
          <strong className="font-bold">Período de Avaliação (Plano Pro):</strong>{" "}
          {daysRemaining > 0 ? (
            <>
              Restam <span className="underline font-black">{daysRemaining} {daysRemaining === 1 ? "dia" : "dias"}</span> de teste gratuito.
            </>
          ) : (
            <span className="text-amber-200 font-bold">Seu período de avaliação chegou ao fim.</span>
          )}
        </span>
      </div>

      <button
        onClick={onNavigateToPlans}
        className="bg-white text-indigo-700 hover:bg-cyan-50 font-bold px-3 py-1 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5 text-[11px] cursor-pointer"
      >
        <span>Ativar Assinatura Definitiva</span>
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
};

export default TrialBanner;
