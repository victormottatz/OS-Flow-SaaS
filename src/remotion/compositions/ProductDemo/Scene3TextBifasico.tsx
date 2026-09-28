import React from 'react';
import { KineticTextScene } from '../../components/KineticTextScene';

export const Scene3TextBifasico: React.FC = () => {
  return (
    <KineticTextScene
      durationInFrames={150}
      accentColor="cyan"
      badgeText="INTEGRAÇÃO FISCAL BLING V3"
      headline="Do laudo técnico à nota fiscal emitida em menos de 10 segundos."
      highlightWords={['menos', 'de', '10', 'segundos']}
      subheadline="Faturamento bifásico automático: peças e serviços separados na origem para blindar sua assistência contra bitributação."
      featurePills={[
        { icon: '📦', title: 'Peças em NF-e' },
        { icon: '🛠️', title: 'Serviços em NFS-e' },
        { icon: '🛡️', title: 'Zero Bitributação SEFAZ' },
      ]}
    />
  );
};
