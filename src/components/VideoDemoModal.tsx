import React, { useState } from 'react';
import { Player } from '@remotion/player';
import { X, Play, RotateCcw, Sparkles } from 'lucide-react';
import { ProductDemoVideo } from '../remotion/compositions/ProductDemo/ProductDemoVideo';

interface VideoDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VideoDemoModal: React.FC<VideoDemoModalProps> = ({ isOpen, onClose }) => {
  const [playerKey, setPlayerKey] = useState(0);

  if (!isOpen) return null;

  const handleRestart = () => {
    setPlayerKey((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      {/* Container Principal */}
      <div className="relative w-full max-w-5xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                OS-Flow SaaS • Vídeo Promocional (30s)
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-medium border border-emerald-500/30">
                  1080p • 30 FPS • Remotion
                </span>
              </h2>
              <p className="text-xs text-slate-400">Edição Dinâmica: Cenas de Texto & Demonstração Intercaladas (30 segundos)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRestart}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Reiniciar Vídeo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Player Remotion */}
        <div className="relative w-full bg-black aspect-video flex items-center justify-center overflow-hidden">
          <Player
            key={playerKey}
            component={ProductDemoVideo}
            durationInFrames={900}
            compositionWidth={1920}
            compositionHeight={1080}
            fps={30}
            style={{
              width: '100%',
              height: '100%',
            }}
            controls
            autoPlay
            loop
          />
        </div>

        {/* Footer com Metadados das Cenas */}
        <div className="px-6 py-3 bg-slate-950/90 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3 overflow-x-auto text-[11px]">
            <span><strong>C1:</strong> Dor</span>
            <span className="text-slate-600">➔</span>
            <span><strong>C2:</strong> Kanban</span>
            <span className="text-slate-600">➔</span>
            <span><strong>C3:</strong> Faturamento</span>
            <span className="text-slate-600">➔</span>
            <span><strong>C4:</strong> Métricas</span>
            <span className="text-slate-600">➔</span>
            <span><strong>C5:</strong> Valor</span>
            <span className="text-slate-600">➔</span>
            <span><strong>C6:</strong> Missão & CTA</span>
          </div>

          <span className="text-emerald-400 font-mono font-semibold">
            Tecnologia: Remotion Engine
          </span>
        </div>
      </div>
    </div>
  );
};
