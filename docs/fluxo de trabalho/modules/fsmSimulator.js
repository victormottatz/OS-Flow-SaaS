/**
 * FSMSimulator — Simulador de Máquina de Estados (Fase 3)
 * MGV Assistência Técnica — Visualizador de Fluxo de OS
 *
 * 1. Mapa de estados com metadados (label, cor, descrição)
 * 2. Transições válidas com guard conditions
 * 3. UI de simulação (estado atual, ações disponíveis)
 * 4. Timeline/histórico de transições
 * 5. Integração com Mermaid (highlight do estado atual)
 */
(function() {
  'use strict';

  // ============================================
  // DEFINIÇÃO DOS ESTADOS
  // ============================================
  var STATES = {
    AGUARDANDO_ORCAMENTO: {
      label: 'Aguardando Orçamento',
      color: '#3b82f6',
      icon: '📋',
      desc: 'OS criada, aguardando triagem e orçamento técnico.',
      custody: 'NA_OFICINA',
      payment: 'SEM_PAGAMENTO'
    },
    AGUARDANDO_APROVACAO: {
      label: 'Aguardando Aprovação',
      color: '#8b5cf6',
      icon: '⏳',
      desc: 'Orçamento enviado, aguardando aprovação do cliente.',
      custody: 'NA_OFICINA',
      payment: 'SEM_PAGAMENTO'
    },
    RECUSA_ORCAMENTO: {
      label: 'Orçamento Recusado',
      color: '#ef4444',
      icon: '🚫',
      desc: 'Cliente recusou o orçamento. Devolução sem conserto ou descarte.',
      custody: 'NA_OFICINA',
      payment: 'SEM_PAGAMENTO'
    },
    EM_EXECUCAO: {
      label: 'Em Execução',
      color: '#f59e0b',
      icon: '🔧',
      desc: 'Manutenção em andamento na bancada.',
      custody: 'NA_OFICINA',
      payment: 'SEM_PAGAMENTO'
    },
    AGUARDANDO_PECA: {
      label: 'Aguardando Peça',
      color: '#785900',
      icon: '📦',
      desc: 'Peça externa encomendada. Equipamento pode estar com cliente (retirada temporária).',
      custody: 'ENTREGUE_TEMP',
      payment: 'PAGO_PARCIAL'
    },
    TESTE_ESTRESSE: {
      label: 'Teste de Estresse',
      color: '#0284c7',
      icon: '🧪',
      desc: 'Testes de segurança e checklist de saída em execução.',
      custody: 'NA_OFICINA',
      payment: 'SEM_PAGAMENTO'
    },
    PRONTO_RETIRADA: {
      label: 'Pronto para Retirada',
      color: '#10b981',
      icon: '✅',
      desc: 'Serviço concluído, equipamento pronto para devolução.',
      custody: 'NA_OFICINA',
      payment: 'QUITADO'
    },
    CREDIARIO_FATURADO: {
      label: 'Crediário / Faturado',
      color: '#16a34a',
      icon: '📄',
      desc: 'Equipamento liberado sob faturamento / boleto futuro.',
      custody: 'ENTREGUE_DEFINITIVO',
      payment: 'CREDIARIO'
    },
    ABANDONO_INADIMPLENTE: {
      label: 'Retenção por Inadimplência',
      color: '#dc2626',
      icon: '⚠️',
      desc: 'Alerta de abandono (90 dias) ou retenção por falta de pagamento.',
      custody: 'NA_OFICINA',
      payment: 'INADIMPLENTE'
    },
    FINALIZADO: {
      label: 'Finalizado',
      color: '#059669',
      icon: '🏁',
      desc: 'OS encerrada. Equipamento devolvido ao cliente.',
      custody: 'ENTREGUE_DEFINITIVO',
      payment: 'QUITADO'
    },
    GARANTIA_REABERTURA: {
      label: 'Garantia Ativa',
      color: '#9333ea',
      icon: '🛡️',
      desc: 'Retorno sob garantia (MGV / Fábrica) sem custo de mão de obra.',
      custody: 'NA_OFICINA',
      payment: 'GARANTIA'
    },
    REABERTO: {
      label: 'Reaberto',
      color: '#dc2626',
      icon: '🔄',
      desc: 'OS reaberta após finalização (erro ou garantia). Exige AuditLog.',
      custody: 'NA_OFICINA',
      payment: 'SEM_PAGAMENTO'
    }
  };

  // ============================================
  // MAPA DE TRANSIÇÕES VÁLIDAS
  // ============================================
  var TRANSITIONS = [
    { from: 'AGUARDANDO_ORCAMENTO', to: 'AGUARDANDO_APROVACAO', label: 'Enviar Orçamento', guard: null },
    { from: 'AGUARDANDO_APROVACAO', to: 'EM_EXECUCAO', label: 'Aprovar Orçamento', guard: null },
    { from: 'AGUARDANDO_APROVACAO', to: 'RECUSA_ORCAMENTO', label: 'Recusar Orçamento', guard: 'Orçamento rejeitado pelo cliente' },
    { from: 'RECUSA_ORCAMENTO', to: 'FINALIZADO', label: 'Encerrar sem Conserto', guard: 'Devolução ou descarte com termo' },
    { from: 'EM_EXECUCAO', to: 'AGUARDANDO_PECA', label: 'Ag. Peça Externa', guard: 'Peça importada / fornecedor (Retirada Temp.)' },
    { from: 'EM_EXECUCAO', to: 'TESTE_ESTRESSE', label: 'Finalizar Reparo', guard: 'Checklist de saída e estresse' },
    { from: 'AGUARDANDO_PECA', to: 'EM_EXECUCAO', label: 'Peça Chegou', guard: 'Equipamento retornou à oficina' },
    { from: 'TESTE_ESTRESSE', to: 'PRONTO_RETIRADA', label: 'Aprovar Testes', guard: null },
    { from: 'PRONTO_RETIRADA', to: 'FINALIZADO', label: 'Quitação & Retirada', guard: 'Pagamento integral realizado' },
    { from: 'PRONTO_RETIRADA', to: 'CREDIARIO_FATURADO', label: 'Liberar no Crediário', guard: 'Faturamento futuro em boleto' },
    { from: 'CREDIARIO_FATURADO', to: 'FINALIZADO', label: 'Liquidar Crediário', guard: null },
    { from: 'PRONTO_RETIRADA', to: 'ABANDONO_INADIMPLENTE', label: 'Alerta Abandono (90d)', guard: 'Cliente não retirou o aparelho' },
    { from: 'ABANDONO_INADIMPLENTE', to: 'FINALIZADO', label: 'Regularizar / Resgatar', guard: 'Pagamento efetuado' },
    { from: 'FINALIZADO', to: 'GARANTIA_REABERTURA', label: 'Retorno Garantia', guard: 'WarrantyType: MGV/FABRICA' },
    { from: 'FINALIZADO', to: 'REABERTO', label: 'Reabrir (AuditLog)', guard: 'Exige justificativa obrigatória' },
    { from: 'GARANTIA_REABERTURA', to: 'REABERTO', label: 'Processar Garantia', guard: null },
    { from: 'REABERTO', to: 'EM_EXECUCAO', label: 'Retomar Execução', guard: null }
  ];

  // ============================================
  // ESTADO DO SIMULADOR
  // ============================================
  var currentState = 'AGUARDANDO_ORCAMENTO';
  var history = []; // [{from, to, label, timestamp, custody, payment}]
  var simulatorOpen = false;

  // ============================================
  // UI — SIMULADOR
  // ============================================
  var simPanelEl = null;
  var timelineEl = null;

  function createSimulatorUI() {
    if (simPanelEl) return;

    // Painel principal do simulador (fixo no bottom)
    simPanelEl = document.createElement('div');
    simPanelEl.id = 'mgv-simulator';
    simPanelEl.setAttribute('role', 'region');
    simPanelEl.setAttribute('aria-label', 'Simulador de estados da OS');
    simPanelEl.style.cssText = [
      'position:fixed',
      'bottom:0',
      'left:0',
      'right:0',
      'background:var(--bg-card)',
      'border-top:2px solid var(--border-color)',
      'z-index:150',
      'transform:translateY(100%)',
      'transition:transform 0.3s ease',
      'font-family:var(--font-family)',
      'box-shadow:0 -4px 24px rgba(0,0,0,0.3)'
    ].join(';');

    document.body.appendChild(simPanelEl);
    renderSimulator();
  }

  function renderSimulator() {
    if (!simPanelEl) return;
    var state = STATES[currentState];
    if (!state) return;

    var availableTransitions = TRANSITIONS.filter(function(t) { return t.from === currentState; });

    var html = '';
    // Header
    html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1.5rem;border-bottom:1px solid var(--border-color);">';
    html += '<div style="display:flex;align-items:center;gap:0.75rem;">';
    html += '<span style="font-size:1.2rem;">' + state.icon + '</span>';
    html += '<div>';
    html += '<div style="font-weight:700;color:var(--text-main);font-size:0.95rem;">Estado Atual: ' + state.label + '</div>';
    html += '<div style="font-size:0.75rem;color:var(--text-muted);">' + state.desc + '</div>';
    html += '</div>';
    html += '</div>';
    html += '<button id="sim-toggle-timeline" class="btn" aria-label="Abrir/fechar histórico de transições" style="font-size:0.8rem;">📜 Histórico (' + history.length + ')</button>';
    html += '</div>';

    // Estado info badges
    html += '<div style="display:flex;gap:0.75rem;padding:0.5rem 1.5rem;border-bottom:1px solid var(--border-color);flex-wrap:wrap;">';
    html += '<span class="badge" style="background:rgba(59,130,246,0.2);color:#3b82f6;">Custódia: ' + state.custody + '</span>';
    html += '<span class="badge" style="background:rgba(245,158,11,0.2);color:#f59e0b;">Pagamento: ' + state.payment + '</span>';
    html += '<span class="badge badge-gold">Estado: ' + currentState + '</span>';
    html += '</div>';

    // Ações disponíveis
    html += '<div style="padding:0.75rem 1.5rem;display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">';
    html += '<span style="font-size:0.8rem;font-weight:600;color:var(--text-muted);margin-right:0.25rem;">Ações:</span>';

    if (availableTransitions.length === 0) {
      html += '<span style="font-size:0.8rem;color:var(--text-muted);font-style:italic;">Nenhuma transição disponível neste estado.</span>';
    } else {
      availableTransitions.forEach(function(t) {
        var target = STATES[t.to];
        var guardNote = t.guard ? ' ⚠️ ' + t.guard : '';
        html += '<button class="btn fsm-action-btn" data-to="' + t.to + '" ';
        html += 'aria-label="Transição: ' + t.label + ' para ' + target.label + '" ';
        html += 'title="' + (t.guard || t.label) + '" ';
        html += 'style="border-color:' + target.color + ';">';
        html += target.icon + ' ' + t.label;
        html += '</button>';
      });
    }

    // Botão reset
    html += '<button class="btn btn-red" id="sim-reset" aria-label="Resetar simulador para estado inicial" style="margin-left:auto;">🔄 Reset</button>';
    html += '</div>';

    // Timeline (colapsável)
    html += '<div id="sim-timeline" style="display:none;border-top:1px solid var(--border-color);max-height:200px;overflow-y:auto;padding:0.75rem 1.5rem;">';
    html += renderTimeline();
    html += '</div>';

    simPanelEl.innerHTML = html;

    // Bind events
    bindSimEvents();
  }

  function renderTimeline() {
    if (history.length === 0) {
      return '<p style="font-size:0.8rem;color:var(--text-muted);font-style:italic;text-align:center;padding:1rem;">Nenhuma transição registrada ainda.</p>';
    }

    var html = '<div style="display:flex;flex-direction:column;gap:0.4rem;">';
    history.slice().reverse().forEach(function(entry, i) {
      var from = STATES[entry.from];
      var to = STATES[entry.to];
      var time = new Date(entry.timestamp).toLocaleTimeString('pt-BR');
      html += '<div style="display:flex;align-items:center;gap:0.5rem;font-size:0.8rem;padding:0.3rem 0;border-bottom:1px solid var(--border-color);">';
      html += '<span style="color:var(--text-muted);min-width:60px;">' + time + '</span>';
      html += '<span style="color:' + from.color + ';">' + from.icon + ' ' + from.label + '</span>';
      html += '<span style="color:var(--text-muted);">→</span>';
      html += '<span style="color:' + to.color + ';">' + to.icon + ' ' + to.label + '</span>';
      html += '<span style="color:var(--text-muted);font-style:italic;margin-left:auto;">' + entry.label + '</span>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  function bindSimEvents() {
    // Transições
    var btns = simPanelEl.querySelectorAll('.fsm-action-btn');
    btns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var to = btn.getAttribute('data-to');
        transitionTo(to, btn.textContent.trim());
      });
    });

    // Timeline toggle
    var toggleBtn = document.getElementById('sim-toggle-timeline');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function() {
        var tl = document.getElementById('sim-timeline');
        if (tl) {
          var isOpen = tl.style.display !== 'none';
          tl.style.display = isOpen ? 'none' : 'block';
          toggleBtn.textContent = isOpen ? '📜 Histórico (' + history.length + ')' : '📜 Fechar';
        }
      });
    }

    // Reset
    var resetBtn = document.getElementById('sim-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        resetSimulator();
      });
    }
  }

  // ============================================
  // LÓGICA DE TRANSIÇÃO
  // ============================================
  function transitionTo(newState, label) {
    var fromState = currentState;
    var fromMeta = STATES[fromState];
    var toMeta = STATES[newState];

    // Registrar no histórico
    history.push({
      from: fromState,
      to: newState,
      label: label,
      timestamp: Date.now(),
      custody: toMeta.custody,
      payment: toMeta.payment
    });

    currentState = newState;
    renderSimulator();
    highlightMermaidNode(newState);

    // Disparar evento customizado
    document.dispatchEvent(new CustomEvent('mgv:fsm-transition', {
      detail: { from: fromState, to: newState, label: label, history: history }
    }));
  }

  function resetSimulator() {
    currentState = 'AGUARDANDO_ORCAMENTO';
    history = [];
    renderSimulator();
    highlightMermaidNode(currentState);
  }

  function getCurrentState() {
    return currentState;
  }

  function getHistory() {
    return history.slice();
  }

  // ============================================
  // INTEGRAÇÃO COM MERMAID — Highlight do estado atual
  // ============================================

  // Mapeamento FSM state → Mermaid node ID (IDs que o Mermaid gera no SVG)
  var FSM_TO_MERMAID = {
    AGUARDANDO_ORCAMENTO: 'ENTRADA',
    AGUARDANDO_APROVACAO: 'AVALIACAO',
    RECUSA_ORCAMENTO: 'RECUSA_ORCAMENTO',
    EM_EXECUCAO: 'EXECUCAO',
    AGUARDANDO_PECA: 'RETIRADA_TEMP',
    TESTE_ESTRESSE: 'TESTE_ESTRESSE',
    PRONTO_RETIRADA: 'CONCLUIDO',
    CREDIARIO_FATURADO: 'CREDIARIO_FATURADO',
    ABANDONO_INADIMPLENTE: 'ABANDONO_INADIMPLENTE',
    FINALIZADO: 'FINALIZADO',
    GARANTIA_REABERTURA: 'GARANTIA_REABERTURA',
    REABERTO: 'REABERTO'
  };

  function highlightMermaidNode(stateKey) {
    var svg = document.querySelector('.mermaid svg');
    if (!svg) return;

    // Remover highlights anteriores
    var prevHighlights = svg.querySelectorAll('.mgv-current-state');
    prevHighlights.forEach(function(el) { el.remove(); });

    var mermaidId = FSM_TO_MERMAID[stateKey];
    if (!mermaidId) return;

    // Mermaid gera IDs como "flowchart-XXXX-N" onde N é o índice do nó
    // Buscar por todos os grupos de nó e identificar pelo conteúdo de texto
    var nodeGroups = svg.querySelectorAll('g.node');
    nodeGroups.forEach(function(node) {
      var text = (node.textContent || '').trim();
      // Verificar se o nó contém o label do Mermaid correspondente
      if (text.indexOf(mermaidId) !== -1 || node.id && node.id.indexOf(mermaidId) !== -1) {
        try {
          var bbox = node.getBBox();
          var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', bbox.x - 6);
          rect.setAttribute('y', bbox.y - 6);
          rect.setAttribute('width', bbox.width + 12);
          rect.setAttribute('height', bbox.height + 12);
          rect.setAttribute('rx', '8');
          rect.setAttribute('fill', 'none');
          rect.setAttribute('stroke', STATES[stateKey].color);
          rect.setAttribute('stroke-width', '3');
          rect.setAttribute('stroke-dasharray', '6 3');
          rect.setAttribute('class', 'mgv-current-state');
          rect.style.pointerEvents = 'none';
          node.parentNode.insertBefore(rect, node);
        } catch (e) { /* getBBox falha em SVG oculto */ }
      }
    });
  }

  // ============================================
  // TOGGLE VISIBILIDADE
  // ============================================
  function toggleSimulator() {
    createSimulatorUI();
    simulatorOpen = !simulatorOpen;
    simPanelEl.style.transform = simulatorOpen ? 'translateY(0)' : 'translateY(100%)';
    if (simulatorOpen) {
      highlightMermaidNode(currentState);
    }
  }

  function openSimulator() {
    createSimulatorUI();
    simulatorOpen = true;
    simPanelEl.style.transform = 'translateY(0)';
    highlightMermaidNode(currentState);
  }

  function closeSimulator() {
    simulatorOpen = false;
    if (simPanelEl) {
      simPanelEl.style.transform = 'translateY(100%)';
    }
  }

  // ============================================
  // BOTÃO FLUTUANTE PARA ABRIR SIMULADOR
  // ============================================
  function createFAB() {
    var fab = document.createElement('button');
    fab.id = 'sim-fab';
    fab.className = 'btn';
    fab.setAttribute('aria-label', 'Abrir simulador de estados da OS');
    fab.title = 'Simulador de Estados';
    fab.style.cssText = [
      'position:fixed',
      'bottom:1rem',
      'right:1rem',
      'z-index:140',
      'width:48px',
      'height:48px',
      'border-radius:var(--radius-full)',
      'background:var(--mgv-gold-dark)',
      'border:2px solid var(--mgv-gold)',
      'color:#fff',
      'font-size:1.2rem',
      'cursor:pointer',
      'box-shadow:0 4px 12px rgba(255,193,7,0.4)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'transition:transform 0.2s ease, box-shadow 0.2s ease'
    ].join(';');
    fab.textContent = '⚙️';
    fab.addEventListener('click', toggleSimulator);
    document.body.appendChild(fab);
  }

  // ============================================
  // KEYBOARD SHORTCUT — S para toggle simulador
  // ============================================
  function bindKeyboard() {
    document.addEventListener('keydown', function(e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        toggleSimulator();
      }
    });
  }

  // ============================================
  // INIT
  // ============================================
  function init() {
    createSimulatorUI();
    createFAB();
    bindKeyboard();
    // Começar fechado
    simPanelEl.style.transform = 'translateY(100%)';
  }

  // Exportar namespace global
  window.MGV = window.MGV || {};
  window.MGV.fsm = {
    init,
    toggle: toggleSimulator,
    open: openSimulator,
    close: closeSimulator,
    getCurrentState,
    getHistory,
    transitionTo,
    reset: resetSimulator,
    STATES,
    TRANSITIONS
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
