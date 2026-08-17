/**
 * SectorFilter — Módulo de Filtro por Setor
 * MGV Assistência Técnica — Visualizador de Fluxo de OS
 *
 * Destaca/regionaliza nós do diagrama conforme filtro ativo.
 * Modos: all, fabiola, reabertura, financeiro.
 */
(function() {
  'use strict';

  let activeFilter = 'all';
  const BUTTONS_SELECTOR = '.filter-group .btn[data-filter]';
  const FADE_OPACITY = 0.2;

  function init() {
    bindButtons();
  }

  function bindButtons() {
    const buttons = document.querySelectorAll(BUTTONS_SELECTOR);
    buttons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        const filter = btn.getAttribute('data-filter');
        applyFilter(filter);
      });
    });
  }

  function applyFilter(filter) {
    activeFilter = filter;

    // Atualizar estado dos botões
    const buttons = document.querySelectorAll(BUTTONS_SELECTOR);
    buttons.forEach(function(btn) {
      const isActive = btn.getAttribute('data-filter') === filter;
      btn.classList.toggle('active', isActive);
    });

    // Aplicar opacidade aos nós SVG do Mermaid
    highlightNodes(filter);
  }

  function highlightNodes(filter) {
    const svg = document.querySelector('.mermaid svg');
    if (!svg) return;

    // Selecionar todos os grupos de nós (nodes do Mermaid)
    const nodeGroups = svg.querySelectorAll('g.node, g[class*="node"]');

    nodeGroups.forEach(function(node) {
      const text = node.textContent || '';
      const nodeText = text.toLowerCase();

      if (filter === 'all') {
        node.style.opacity = '1';
        return;
      }

      let shouldHighlight = false;

      switch (filter) {
        case 'fabiola':
          shouldHighlight = nodeText.includes('retirada') || nodeText.includes('cliente') ||
                            nodeText.includes('casa') || nodeText.includes('fabíola') ||
                            nodeText.includes('aguardando');
          break;
        case 'reabertura':
          shouldHighlight = nodeText.includes('reabertura') || nodeText.includes('modal') ||
                            nodeText.includes('reaberto') || nodeText.includes('justificativa') ||
                            nodeText.includes('erro') || nodeText.includes('garantia');
          break;
        case 'financeiro':
          shouldHighlight = nodeText.includes('pagamento') || nodeText.includes('parcial') ||
                            nodeText.includes('quitacao') || nodeText.includes('saldo') ||
                            nodeText.includes('financeiro') || nodeText.includes('crediario') ||
                            nodeText.includes('inadimplencia') || nodeText.includes('faturamento');
          break;
        case 'recusa':
          shouldHighlight = nodeText.includes('recusado') || nodeText.includes('cancelado') ||
                            nodeText.includes('descarte') || nodeText.includes('devolucao');
          break;
        case 'garantia':
          shouldHighlight = nodeText.includes('garantia') || nodeText.includes('reabertura') ||
                            nodeText.includes('modal') || nodeText.includes('auditlog') ||
                            nodeText.includes('contestacao');
          break;
      }

      node.style.opacity = shouldHighlight ? '1' : String(FADE_OPACITY);
    });

    // Também destacar edges (conexões) se possível
    const edges = svg.querySelectorAll('g.edgePath, g[class*="edge"]');
    edges.forEach(function(edge) {
      if (filter === 'all') {
        edge.style.opacity = '1';
      } else {
        // Manter edges visíveis mas com opacidade reduzida
        edge.style.opacity = '0.35';
      }
    });
  }

  function getActive() {
    return activeFilter;
  }

  // Exportar namespace global
  window.MGV = window.MGV || {};
  window.MGV.sectorFilter = { init, applyFilter, getActive };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
