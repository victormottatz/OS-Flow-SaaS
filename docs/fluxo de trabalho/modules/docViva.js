/**
 * DocViva — Documentation Viva (Fase 2)
 * MGV Assistência Técnica — Visualizador de Fluxo de OS
 *
 * 1. Side panel dinâmico — conteúdo muda conforme filtro ativo
 * 2. Tooltip system — hover/touch em nós do Mermaid mostra descrição
 * 3. Keyboard navigation — atalhos de teclado para todas as ações
 */
(function() {
  'use strict';

  // ============================================
  // CONTEÚDO DINÂMICO DO SIDE PANEL POR FILTRO
  // ============================================
  var PANEL_CONTENT = {
    all: {
      title: 'Visão Geral do Fluxo',
      cards: [
        {
          cls: 'gold-card',
          icon: '🟡',
          title: 'Caso Fabíola (Retirada Temp.)',
          body: 'Equipamento retirado temporariamente pelo cliente enquanto aguarda peça externa.',
          rule: 'OS muda para <code>ENTREGUE_AGUARDANDO_PECA</code>, registra pagamento parcial e não é finalizada precocemente.'
        },
        {
          cls: 'red-card',
          icon: '🔴',
          title: 'Reversão / Reabertura',
          body: 'OS finalizada por engano ou retorno em garantia.',
          rule: 'Exige justificativa obrigatória e grava evento no <code>AuditLog</code> antes de voltar para bancada.'
        },
        {
          cls: 'green-card',
          icon: '🟢',
          title: 'Gestão Financeira',
          body: 'Separación entre OS e lançamentos na tabela de Pagamentos.',
          rule: 'Cliente pode pagar taxas intermediárias sem alterar custo final previsto da OS.'
        },
        {
          cls: 'purple-card',
          icon: '🟣',
          title: 'Edição Livre & Rastreabilidade',
          body: 'Atualizar telefone, endereço ou número de série em qualquer etapa sem bloquear a OS.',
          rule: 'Campos editáveis: cliente, telefone, endereço, número de série, observações.'
        }
      ]
    },
    fabiola: {
      title: 'Caso Fabíola — Retirada Temporária',
      cards: [
        {
          cls: 'gold-card',
          icon: '📍',
          title: 'Cenário Real (OS 234813)',
          body: 'Cliente Fabíola, Moto G84, troca de tela. Peça encomendada de fornecedor externo.',
          rule: 'Equipamento fica na casa do cliente até a peça chegar.'
        },
        {
          cls: 'gold-card',
          icon: '⚙️',
          title: 'Fluxo Técnico',
          body: '1. OS aberta → 2. Orçamento aprovado → 3. Aguardando peça → 4. Retirada temporária → 5. Pagamento parcial → 6. Peça chega → 7. Retorno → 8. Conclusão.',
          rule: 'Emite <code>Dinheiro</code> referente à retirada temporária.'
        },
        {
          cls: 'green-card',
          icon: '💰',
          title: 'Fluxo Financeiro',
          body: 'Registra pagamento parcial (R$ 100,00) no módulo Financeiro. O restante é quitado na conclusão.',
          rule: 'Status financeiro: <code>PAGO_PARCIAL</code>. Não altera custo final da OS.'
        },
        {
          cls: 'red-card',
          icon: '⚠️',
          title: 'Risco de Finalização Prematura',
          body: 'Se o técnico finalizar a OS antes do retorno, o equipamento fica marcado como devolvido sem estar na oficina.',
          rule: 'Validação: OS com status <code>ENTREGUE_AGUARDANDO_PECA</code> não pode ser finalizada.'
        }
      ]
    },
    reabertura: {
      title: 'Reversão / Reabertura de OS',
      cards: [
        {
          cls: 'red-card',
          icon: '🔄',
          title: 'Quando Reabrir?',
          body: 'OS já finalizada precisa de ajuste, ou cliente retorna com defeito em garantia.',
          rule: 'Reabertura = status volta para <code>EM_EXECUCAO</code>. Exige justificativa.'
        },
        {
          cls: 'red-card',
          icon: '📝',
          title: 'Modal de Justificativa',
          body: 'Obrigatório preencher motivo da reabertura antes de confirmar. Sem justificativa = bloqueado.',
          rule: 'Grava evento no <code>AuditLog</code> com: data, técnico, justificativa, OS anterior.'
        },
        {
          cls: 'gold-card',
          icon: '📋',
          title: 'Auditoria Completa',
          body: 'Todo evento de reabertura fica registrado para consulta futura e compliance.',
          rule: 'Campos AuditLog: <code>createdAt</code>, <code>action</code>, <code>entityType</code>, <code>entityId</code>, <code>changes</code>.'
        },
        {
          cls: 'green-card',
          icon: '✅',
          title: 'Após Reabertura',
          body: 'OS volta ao fluxo normal de execução. Pode passar por todos os estágios novamente.',
          rule: 'Ciclo: reabertura → execução → conclusão → (opcionalmente) outra reabertura.'
        }
      ]
    },
    financeiro: {
      title: 'Gestão Financeira da OS',
      cards: [
        {
          cls: 'green-card',
          icon: '💳',
          title: 'Separação OS × Pagamentos',
          body: 'OS define o custo previsto. Pagamentos são lançamentos separados na tabela <code>Payment</code>.',
          rule: 'Uma OS pode ter N pagamentos (parcial, total, adiantado).'
        },
        {
          cls: 'green-card',
          icon: '📊',
          title: 'Status Financeiro',
          body: '<code>SEM_PAGAMENTO</code> → <code>PAGO_PARCIAL</code> → <code>QUITADO</code> / <code>CREDIARIO</code>.',
          rule: 'O status financeiro é calculado a partir dos registros de Payment vinculados à OS.'
        },
        {
          cls: 'gold-card',
          icon: '🧾',
          title: 'Pagamento Parcial (Caso Fabíola)',
          body: 'Cliente paga adiantado pela peça. Registra como pagamento parcial sem fechar a OS.',
          rule: 'Emite recibo/dinheiro. Status: <code>PAGO_PARCIAL</code>. Restante quitado na conclusão.'
        },
        {
          cls: 'purple-card',
          icon: '🔒',
          title: 'Integridade dos Dados',
          body: 'Custos e pagamentos são imutáveis após finalização da OS (trava de auditoria).',
          rule: 'Somente <code>REABERTO</code> permite edição de valores. Senha do supervisor exigida.'
        }
      ]
    },
    recusa: {
      title: 'Recusa de Orçamento & Descarte',
      cards: [
        {
          cls: 'red-card',
          icon: '🚫',
          title: 'Orçamento Recusado',
          body: 'Cliente rejeitou o valor do conserto ou inviabilidade técnica.',
          rule: 'Registar <code>closingReason: ORCAMENTO_RECUSADO</code>. Equipamento aguarda devolução ou descarte.'
        },
        {
          cls: 'red-card',
          icon: '🗑️',
          title: 'Descarte Autorizado',
          body: 'Cliente renuncia ao equipamento em favor da oficina.',
          rule: 'Registar <code>closingReason: DESCARTE_OFICINA</code> com termo assinado.'
        }
      ]
    },
    garantia: {
      title: 'Garantia & Auditoria',
      cards: [
        {
          cls: 'purple-card',
          icon: '🛡️',
          title: 'Garantia MGV / Fábrica',
          body: 'Retorno de equipamento no prazo de garantia (<code>WarrantyType</code>).',
          rule: 'Reabertura sem cobrança de mão de obra.'
        },
        {
          cls: 'red-card',
          icon: '📜',
          title: 'Registro de Auditoria',
          body: 'Todo evento de reabertura ou alteração gera log imutável no <code>AuditLog</code>.',
          rule: 'Grava usuário, IP, justificativa e valores anteriores.'
        }
      ]
    }
  };

  var currentPanelFilter = 'all';

  function updateSidePanel(filter) {
    currentPanelFilter = filter || 'all';
    var data = PANEL_CONTENT[currentPanelFilter];
    if (!data) return;

    var panel = document.querySelector('.side-panel');
    if (!panel) return;

    // Preserva o painel de CRUD de OS
    var crudPanel = panel.querySelector('#os-crud-panel');

    var html = '<h2 style="font-size:1.1rem;font-weight:700;margin-bottom:0.5rem;color:var(--text-main);">' + data.title + '</h2>';

    data.cards.forEach(function(card) {
      html += '<div class="panel-card ' + card.cls + '">';
      html += '<h3>' + card.icon + ' ' + card.title + '</h3>';
      html += '<p>' + card.body + '</p>';
      if (card.rule) {
        html += '<br><p><strong>Regra:</strong> ' + card.rule + '</p>';
      }
      html += '</div>';
    });

    panel.innerHTML = html;

    // Re-insere o painel de CRUD se ele existia
    if (crudPanel) {
      panel.insertBefore(crudPanel, panel.firstChild);
    }

    // Re-insere o card de status real da OS se disponível
    if (window.MGV && window.MGV.currentOS) {
      updateOSRealStatusCard(window.MGV.currentOS);
    }
  }

  function updateOSRealStatusCard(activeOS) {
    var panel = document.querySelector('.side-panel');
    if (!panel) return;
    
    var oldCard = panel.querySelector('#os-real-status-card');
    if (oldCard) oldCard.remove();
    
    if (!activeOS) return;
    
    var card = document.createElement('div');
    card.className = 'panel-card purple-card';
    card.id = 'os-real-status-card';
    
    var html = '';
    html += '<h3>📋 OS Ativa: #' + activeOS.id + ' (' + activeOS.client + ')</h3>';
    html += '<p><strong>Equipamento:</strong> ' + activeOS.equipment + '</p>';
    html += '<p><strong>Status Operacional:</strong> ' + activeOS.status + '</p>';
    html += '<p><strong>SLA de Diagnóstico:</strong> 5 a 10 dias úteis (Realista)</p>';
    
    var waStatus = activeOS.whatsappAccepted ? 
      '<span style="color:#4ade80;font-weight:bold;">✔️ Confirmado (WhatsApp)</span>' : 
      '<span style="color:var(--accent-red);font-weight:bold;">⏳ Pendente de Envio</span>';
    html += '<p><strong>Aceite Digital:</strong> ' + waStatus + '</p>';
    
    var nfeStatus = activeOS.nfeIssued ? 
      '<span style="color:#4ade80;font-weight:bold;">✔️ Emitida (NFC-e modelo 65)</span>' : 
      '<span style="color:var(--accent-red);font-weight:bold;">⏳ Não Emitida</span>';
    html += '<p><strong>Status Fiscal:</strong> ' + nfeStatus + '</p>';
    
    card.innerHTML = html;
    
    var crudPanel = panel.querySelector('#os-crud-panel');
    if (crudPanel) {
      crudPanel.parentNode.insertBefore(card, crudPanel.nextSibling);
    } else {
      panel.appendChild(card);
    }
  }

  // ============================================
  // TOOLTIP SYSTEM
  // ============================================
  var TOOLTIPS = {
    'ENTRADA': 'Ponto de entrada: cliente traz equipamento com defeito. OS é criada no sistema.',
    'AVALIACAO': 'Triagem e orçamento: técnico identifica defeito, emite orçamento, aguarda aprovação do cliente.',
    'AUTORIZACAO': 'Decisão do cliente: aprovação para manutenção ou recusa do orçamento.',
    'RECUSA_ORCAMENTO': 'Orçamento recusado: equipamento devolvido sem conserto (closingReason: ORCAMENTO_RECUSADO).',
    'DESCARTE_OFICINA': 'Descarte na oficina: cliente autoriza doação/descarte com termo.',
    'EXECUCAO': 'Execução/manutenção: técnica é realizada, peça substituída ou reparada.',
    'RETIRADA_TEMP': 'Retirada temporária: equipamento sai da oficina (caso Fabíola). Aguarda peça externa.',
    'PGTO_PARCIAL': 'Pagamento parcial: cliente efetua pagamento antecipado pela peça.',
    'AGUARDA_CASA': 'Aparelho na casa do cliente: equipamento aguarda peça na residência do cliente.',
    'RETORNO': 'Retorno do equipamento: peça chegou, equipamento retorna à oficina para conclusão.',
    'TESTE_ESTRESSE': 'Teste de estresse: procedimentos de controle de qualidade e medições de saída.',
    'CONCLUIDO': 'Serviço concluído: manutenção finalizada, equipamento pronto para devolução.',
    'PGTO_TOTAL': 'Quitação total: saldo zerado, todos os pagamentos registrados.',
    'CREDIARIO_FATURADO': 'Crediário/Boleto: faturamento futuro registrado no sistema.',
    'ABANDONO_INADIMPLENTE': 'Alerta de abandono: retenção legal após 90 dias sem retirada (abandonAlert).',
    'FINALIZADO': 'OS finalizada: equipamento devolvido ao cliente. Status: ENTREGUE_DEFINITIVO.',
    'MODAL_REABERTURA': 'Modal de reabertura: exigida justificativa obrigatória antes de reabrir OS.',
    'GARANTIA_REABERTURA': 'Garantia ativa: retorno sob garantia MGV ou Fábrica sem custo adicional.',
    'REABERTO': 'OS reaberta: volta ao fluxo de execução com status REABERTO.',
    'EDIT_LIVRE': 'Edição livre: permite alterar dados pontuais (cliente, equipamento, obs) em qualquer etapa.'
  };

  var tooltipEl = null;

  function createTooltip() {
    if (tooltipEl) return;
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'mgv-tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    tooltipEl.setAttribute('aria-hidden', 'true');
    tooltipEl.style.cssText = [
      'position:fixed',
      'background:var(--bg-card)',
      'border:1px solid var(--border-color)',
      'border-radius:var(--radius-xl)',
      'padding:0.6rem 0.9rem',
      'font-size:0.8rem',
      'color:var(--text-main)',
      'max-width:320px',
      'z-index:200',
      'pointer-events:none',
      'opacity:0',
      'transition:opacity 0.15s ease',
      'box-shadow:0 8px 24px rgba(0,0,0,0.3)',
      'font-family:var(--font-family)',
      'line-height:1.4'
    ].join(';');
    document.body.appendChild(tooltipEl);
  }

  function showTooltip(text, x, y) {
    createTooltip();
    tooltipEl.textContent = text;
    tooltipEl.setAttribute('aria-hidden', 'false');

    var rect = tooltipEl.getBoundingClientRect();
    var px = Math.min(x + 12, window.innerWidth - rect.width - 16);
    var py = Math.min(y + 12, window.innerHeight - rect.height - 16);
    tooltipEl.style.left = px + 'px';
    tooltipEl.style.top = py + 'px';
    tooltipEl.style.opacity = '1';
  }

  function hideTooltip() {
    if (tooltipEl) {
      tooltipEl.style.opacity = '0';
      tooltipEl.setAttribute('aria-hidden', 'true');
    }
  }

  function bindTooltips() {
    var viewport = document.getElementById('viewport');
    if (!viewport) return;

    viewport.addEventListener('mouseover', function(e) {
      var node = e.target.closest('g.node, g[class*="node"]');
      if (!node) return;
      var id = node.id || node.getAttribute('id') || '';
      // Mermaid usa IDs como "ENTRADA" ou "flowchart-ENTRADA-0"
      var key = Object.keys(TOOLTIPS).find(function(k) {
        return id.indexOf(k) !== -1;
      });
      if (key) {
        showTooltip(TOOLTIPS[key], e.clientX, e.clientY);
      }
    });

    viewport.addEventListener('mouseout', function(e) {
      var node = e.target.closest('g.node, g[class*="node"]');
      if (node) hideTooltip();
    });

    // Touch: mostra tooltip no primeiro toque, esconde no segundo
    viewport.addEventListener('touchstart', function(e) {
      if (e.touches.length !== 1) return;
      var touch = e.touches[0];
      var el = document.elementFromPoint(touch.clientX, touch.clientY);
      var node = el ? el.closest('g.node, g[class*="node"]') : null;
      if (node) {
        var id = node.id || '';
        var key = Object.keys(TOOLTIPS).find(function(k) { return id.indexOf(k) !== -1; });
        if (key) {
          e.preventDefault();
          showTooltip(TOOLTIPS[key], touch.clientX, touch.clientY);
        }
      } else {
        hideTooltip();
      }
    }, { passive: false });
  }

  // ============================================
  // KEYBOARD NAVIGATION
  // ============================================
  var SHORTCUTS = [
    { keys: '1', action: 'Filtro: Todos', fn: function() { if (window.MGV.sectorFilter) window.MGV.sectorFilter.applyFilter('all'); updateSidePanel('all'); }},
    { keys: '2', action: 'Filtro: Caso Fabíola', fn: function() { if (window.MGV.sectorFilter) window.MGV.sectorFilter.applyFilter('fabiola'); updateSidePanel('fabiola'); }},
    { keys: '3', action: 'Filtro: Reabertura', fn: function() { if (window.MGV.sectorFilter) window.MGV.sectorFilter.applyFilter('reabertura'); updateSidePanel('reabertura'); }},
    { keys: '4', action: 'Filtro: Financeiro', fn: function() { if (window.MGV.sectorFilter) window.MGV.sectorFilter.applyFilter('financeiro'); updateSidePanel('financeiro'); }},
    { keys: '5', action: 'Filtro: Recusa & Descarte', fn: function() { if (window.MGV.sectorFilter) window.MGV.sectorFilter.applyFilter('recusa'); updateSidePanel('recusa'); }},
    { keys: '6', action: 'Filtro: Garantia & Audit', fn: function() { if (window.MGV.sectorFilter) window.MGV.sectorFilter.applyFilter('garantia'); updateSidePanel('garantia'); }},
    { keys: '+', action: 'Zoom in', fn: function() { if (window.MGV.panZoom) { var s = window.MGV.panZoom.getState(); window.MGV.panZoom.setScale(s.scale + 0.15); }}},
    { keys: '-', action: 'Zoom out', fn: function() { if (window.MGV.panZoom) { var s = window.MGV.panZoom.getState(); window.MGV.panZoom.setScale(s.scale - 0.15); }}},
    { keys: '0', action: 'Zoom reset', fn: function() { if (window.MGV.panZoom) window.MGV.panZoom.reset(); }},
    { keys: 't', action: 'Alternar tema', fn: function() { if (window.MGV.theme) window.MGV.theme.toggle(); }},
    { keys: '?', action: 'Ajuda (atalhos)', fn: function() { toggleHelpModal(); }},
    { keys: 'Escape', action: 'Fechar modal/tooltip', fn: function() { hideTooltip(); closeHelpModal(); }}
  ];

  function bindKeyboard() {
    document.addEventListener('keydown', function(e) {
      // Ignorar se foco em input/textarea
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      var key = e.key;
      var shortcut = SHORTCUTS.find(function(s) { return s.keys === key; });
      if (shortcut) {
        e.preventDefault();
        shortcut.fn();
      }
    });
  }

  // ============================================
  // HELP MODAL
  // ============================================
  var helpModalEl = null;

  function createHelpModal() {
    if (helpModalEl) return;
    helpModalEl = document.createElement('div');
    helpModalEl.id = 'mgv-help-modal';
    helpModalEl.setAttribute('role', 'dialog');
    helpModalEl.setAttribute('aria-label', 'Atalhos de teclado');
    helpModalEl.setAttribute('aria-hidden', 'true');
    helpModalEl.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:rgba(0,0,0,0.6)',
      'z-index:300',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'opacity:0',
      'transition:opacity 0.2s ease',
      'pointer-events:none'
    ].join(';');

    var inner = document.createElement('div');
    inner.style.cssText = [
      'background:var(--bg-card)',
      'border:1px solid var(--border-color)',
      'border-radius:var(--radius-2xl)',
      'padding:1.5rem',
      'max-width:400px',
      'width:90%',
      'max-height:80vh',
      'overflow-y:auto',
      'font-family:var(--font-family)'
    ].join(';');

    var html = '<h2 style="font-size:1.1rem;font-weight:700;margin-bottom:1rem;color:var(--text-main);">⌨️ Atalhos de Teclado</h2>';
    html += '<table style="width:100%;font-size:0.85rem;color:var(--text-muted);border-collapse:collapse;">';
    SHORTCUTS.forEach(function(s) {
      html += '<tr style="border-bottom:1px solid var(--border-color);">';
      html += '<td style="padding:0.4rem 0;font-weight:600;color:var(--text-main);width:40px;"><code style="background:var(--bg-card-hover);padding:0.15rem 0.4rem;border-radius:4px;">' + s.keys + '</code></td>';
      html += '<td style="padding:0.4rem 0;">' + s.action + '</td>';
      html += '</tr>';
    });
    html += '</table>';
    html += '<p style="margin-top:1rem;font-size:0.75rem;color:var(--text-muted);text-align:center;">Pressione <code style="background:var(--bg-card-hover);padding:0.15rem 0.4rem;border-radius:4px;">?</code> ou <code style="background:var(--bg-card-hover);padding:0.15rem 0.4rem;border-radius:4px;">Esc</code> para fechar</p>';

    inner.innerHTML = html;
    helpModalEl.appendChild(inner);
    document.body.appendChild(helpModalEl);
  }

  function toggleHelpModal() {
    createHelpModal();
    var isOpen = helpModalEl.getAttribute('aria-hidden') === 'false';
    if (isOpen) {
      closeHelpModal();
    } else {
      helpModalEl.setAttribute('aria-hidden', 'false');
      helpModalEl.style.opacity = '1';
      helpModalEl.style.pointerEvents = 'auto';
      // Focus trap: focar no modal
      helpModalEl.querySelector('div').focus();
    }
  }

  function closeHelpModal() {
    if (helpModalEl) {
      helpModalEl.setAttribute('aria-hidden', 'true');
      helpModalEl.style.opacity = '0';
      helpModalEl.style.pointerEvents = 'none';
    }
  }

  // ============================================
  // INTEGRAÇÃO — Interceptar clique nos filtros
  // ============================================
  function bindFilterIntegration() {
    var filterBtns = document.querySelectorAll('.filter-group .btn[data-filter]');
    filterBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var filter = btn.getAttribute('data-filter');
        updateSidePanel(filter);
      });
    });
  }

  // ============================================
  // INIT
  // ============================================
  function init() {
    updateSidePanel('all');
    bindTooltips();
    bindKeyboard();
    bindFilterIntegration();

    // Ouvinte para atualizar o card de status real quando a OS ativa mudar ou atualizar
    document.addEventListener('mgv:os-updated', function(e) {
      if (e.detail && e.detail.activeOS) {
        updateOSRealStatusCard(e.detail.activeOS);
      }
    });
  }

  // Exportar namespace global
  window.MGV = window.MGV || {};
  window.MGV.docViva = { init, updateSidePanel, toggleHelpModal, SHORTCUTS };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
