import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion';
import { BrowserFrame } from '../../components/BrowserFrame';
import { VirtualCursor } from '../../components/VirtualCursor';
import { CameraPanZoom } from '../../components/CameraPanZoom';

export const Scene2Action: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrada da Janela do Navegador com Spring
  const windowEntrance = spring({
    frame,
    fps,
    config: { damping: 20, mass: 0.9, stiffness: 120 },
  });

  // Fade out no final para a Cena 3
  const fadeOut = interpolate(frame, [165, 180], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Movimento de arrasto do card (frame 70 até 105)
  const isDragging = frame >= 70 && frame <= 105;
  const dragProgress = interpolate(frame, [70, 105], [0, 1], {
    easing: Easing.bezier(0.25, 1, 0.5, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Deslocamento do card em direção à coluna "FINALIZADO"
  const cardTranslateX = dragProgress * 560;
  const cardTranslateY = Math.sin(dragProgress * Math.PI) * -30; // Arco orgânico ao arrastar
  const cardScale = isDragging ? 1.05 : 1.0;

  // Abertura do Modal de Checkout (a partir do frame 110)
  const modalProgress = spring({
    frame: frame - 110,
    fps,
    config: { damping: 18, mass: 0.8, stiffness: 150 },
  });

  return (
    <div
      className="w-full h-full flex items-center justify-center bg-slate-950 p-12 relative overflow-hidden select-none"
      style={{ opacity: fadeOut }}
    >
      <CameraPanZoom
        zoomStartFrame={110}
        zoomEndFrame={150}
        targetScale={1.35}
        focusOrigin="55% 55%"
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            transform: `scale(${0.9 + windowEntrance * 0.1}) translateZ(0)`,
            opacity: windowEntrance,
          }}
          className="w-full h-full flex items-center justify-center"
        >
          <BrowserFrame className="w-[1600px] h-[900px]">
            {/* Header da Aplicação OS-Flow */}
            <div className="flex items-center justify-between px-8 py-4 bg-slate-900/60 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                  OS
                </div>
                <div>
                  <h1 className="text-sm font-bold text-white tracking-wide">MGV ASSISTÊNCIA TÉCNICA</h1>
                  <p className="text-xs text-slate-400">Fluxo de Ordens de Serviço • Kanban Ativo</p>
                </div>
              </div>

              {/* Botões do Topo */}
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Bling V3 Conectado
                </span>
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10" />
              </div>
            </div>

            {/* Corpo do Kanban */}
            <div className="p-8 grid grid-cols-4 gap-6 h-[760px] bg-slate-950/60">
              {/* Coluna 1: Orçamento */}
              <div className="flex flex-col bg-slate-900/40 rounded-xl border border-white/5 p-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                  <span className="text-xs font-bold text-slate-300 uppercase">1. Orçamento</span>
                  <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-400 font-mono">3</span>
                </div>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-slate-800/40 border border-white/5 text-xs">
                    <p className="font-semibold text-slate-200">OS #1045 • Compressor Odontológico</p>
                    <p className="text-[11px] text-slate-400 mt-1">Dra. Camila Santos</p>
                  </div>
                </div>
              </div>

              {/* Coluna 2: Em Execução */}
              <div className="flex flex-col bg-slate-900/40 rounded-xl border border-white/5 p-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                  <span className="text-xs font-bold text-slate-300 uppercase">2. Em Execução</span>
                  <span className="px-2 py-0.5 rounded text-[11px] bg-amber-500/20 text-amber-300 font-mono">2</span>
                </div>
                <div className="space-y-3 relative">
                  {/* Card que será arrastado */}
                  <div
                    style={{
                      transform: `translate3d(${cardTranslateX}px, ${cardTranslateY}px, 0) scale(${cardScale})`,
                      zIndex: isDragging ? 50 : 1,
                      boxShadow: isDragging ? '0 20px 30px rgba(0,0,0,0.6), 0 0 20px rgba(16,185,129,0.3)' : 'none',
                    }}
                    className="p-4 rounded-xl bg-slate-800/90 border border-emerald-500/40 text-xs shadow-lg relative cursor-grab"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-emerald-400">OS #1042</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold">
                        Pronto
                      </span>
                    </div>
                    <p className="font-bold text-slate-100 text-sm mt-1">Autoclave Cristófoli 21L</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Clínica OdontoLife • Troca de Válvula</p>
                    <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Total OS:</span>
                      <span className="font-mono font-bold text-white text-sm">R$ 1.450,00</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna 3: Aguardando Retirada */}
              <div className="flex flex-col bg-slate-900/40 rounded-xl border border-white/5 p-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                  <span className="text-xs font-bold text-slate-300 uppercase">3. Aguardando Retirada</span>
                  <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-400 font-mono">1</span>
                </div>
              </div>

              {/* Coluna 4: Finalizado */}
              <div className={`flex flex-col rounded-xl p-4 transition-colors ${isDragging ? 'bg-emerald-950/20 border-2 border-dashed border-emerald-500/50' : 'bg-slate-900/40 border border-white/5'}`}>
                <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                  <span className="text-xs font-bold text-emerald-400 uppercase">4. Finalizado & Faturado</span>
                  <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/20 text-emerald-300 font-mono">18</span>
                </div>
              </div>
            </div>

            {/* Modal de Checkout / Faturamento no Bling */}
            {frame >= 108 && (
              <div
                style={{
                  opacity: modalProgress,
                  transform: `scale(${0.85 + modalProgress * 0.15}) translateZ(0)`,
                }}
                className="absolute inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-6 z-40"
              >
                <div className="w-[520px] rounded-2xl bg-slate-900 border border-emerald-500/30 p-7 shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      Checkout Financeiro da OS #1042
                    </h3>
                  </div>

                  <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-white/5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cliente:</span>
                      <span className="font-semibold text-white">Clínica OdontoLife Ltda</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Peças Substituídas:</span>
                      <span>1x Válvula Solenoide (NCM 8481.80.99)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mão de Obra Técnica:</span>
                      <span>Calibração & Higienização</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/10 font-bold text-sm">
                      <span className="text-white">Valor Total:</span>
                      <span className="text-emerald-400 font-mono">R$ 1.450,00</span>
                    </div>
                  </div>

                  {/* Botão de Ação onde o mouse clica */}
                  <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      style={{
                        transform: frame >= 148 && frame <= 156 ? 'scale(0.96)' : 'scale(1)',
                        backgroundColor: frame >= 152 ? '#059669' : '#10b981',
                      }}
                      className="w-full py-3.5 px-6 rounded-xl font-bold text-slate-950 text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all"
                    >
                      {frame >= 152 ? '✓ Sincronizando com Bling...' : '⚡ Emitir NF-e & Faturar no Bling'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Simulação do Cursor do Mouse */}
            {/* Movimento 1: Da borda ao card (frame 30 a 65) */}
            {frame < 110 && (
              <VirtualCursor
                startFrame={30}
                clickFrame={66}
                from={{ x: 250, y: 550 }}
                to={{ x: 580, y: 220 }}
              />
            )}

            {/* Movimento 2: Do meio da tela ao botão Emitir NF-e no modal (frame 120 a 150) */}
            {frame >= 110 && (
              <VirtualCursor
                startFrame={120}
                clickFrame={150}
                from={{ x: 600, y: 350 }}
                to={{ x: 800, y: 580 }}
              />
            )}
          </BrowserFrame>
        </div>
      </CameraPanZoom>
    </div>
  );
};
