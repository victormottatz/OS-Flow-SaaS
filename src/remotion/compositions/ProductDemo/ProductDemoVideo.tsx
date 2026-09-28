import React from 'react';
import { Sequence, AbsoluteFill } from 'remotion';
import { Scene1Hook } from './Scene1Hook';
import { Scene2Action } from './Scene2Action';
import { Scene3TextBifasico } from './Scene3TextBifasico';
import { Scene4ActionMetrics } from './Scene4ActionMetrics';
import { Scene5TextValue } from './Scene5TextValue';
import { Scene6ClosingMission } from './Scene6ClosingMission';

export const ProductDemoVideo: React.FC = () => {
  return (
    <AbsoluteFill
      className="bg-slate-950 font-sans"
      style={{
        backgroundColor: '#020617',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Cena 1: Texto 1 - A Dor & O Gancho Inicial (0s a 4s / frames 0-120) */}
      <Sequence from={0} durationInFrames={120} name="Cena 1 - O Gancho">
        <Scene1Hook />
      </Sequence>

      {/* Cena 2: Ação 1 - Kanban & Movimento do Mouse (4s a 10s / frames 120-300) */}
      <Sequence from={120} durationInFrames={180} name="Cena 2 - Kanban & Ação de Fechamento">
        <Scene2Action />
      </Sequence>

      {/* Cena 3: Texto 2 - A Solução do Faturamento Bifásico (10s a 15s / frames 300-450) */}
      <Sequence from={300} durationInFrames={150} name="Cena 3 - Faturamento Inteligente">
        <Scene3TextBifasico />
      </Sequence>

      {/* Cena 4: Ação 2 - Confirmação Bling, WhatsApp & Métricas (15s a 20s / frames 450-600) */}
      <Sequence from={450} durationInFrames={150} name="Cena 4 - Métricas & WhatsApp">
        <Scene4ActionMetrics />
      </Sequence>

      {/* Cena 5: Texto 3 - Proposta de Rentabilidade & Controle (20s a 24s / frames 600-720) */}
      <Sequence from={600} durationInFrames={120} name="Cena 5 - Valor & Rentabilidade">
        <Scene5TextValue />
      </Sequence>

      {/* Cena 6: Fechamento - Logo Oficial, Missão da Empresa & CTA (24s a 30s / frames 720-900) */}
      <Sequence from={720} durationInFrames={180} name="Cena 6 - Logo & Missão da Empresa">
        <Scene6ClosingMission />
      </Sequence>
    </AbsoluteFill>
  );
};
