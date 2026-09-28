import React from 'react';
import { KineticTextScene } from '../../components/KineticTextScene';

export const Scene5TextValue: React.FC = () => {
  return (
    <KineticTextScene
      durationInFrames={120}
      accentColor="emerald"
      badgeText="ALTA PERFORMANCE & RENTABILIDADE"
      headline="Menos burocracia na bancada. Mais previsibilidade e dinheiro no caixa."
      highlightWords={['Mais', 'previsibilidade', 'dinheiro', 'no', 'caixa']}
      subheadline="Criado sob medida para atender as dores reais de quem gerencia equipamentos de alto valor e clientes exigentes."
      featurePills={[
        { icon: '⚡', title: 'Fluxo 100% Digital' },
        { icon: '📊', title: 'Margem de Lucro Real' },
        { icon: '📱', title: 'Aprovação por WhatsApp' },
      ]}
    />
  );
};
