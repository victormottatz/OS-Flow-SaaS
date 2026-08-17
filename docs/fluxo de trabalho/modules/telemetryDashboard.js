/**
 * TelemetryDashboard — Fase 4: Telemetria & Dashboard
 * MGV Assistência Técnica — Visualizador de Fluxo de OS
 *
 * 1. Dashboard UI — KPIs, gráficos, métricas
 * 2. Modelo de dados simulados (demo realista)
 * 3. Gráficos SVG (sem dependências externas)
 * 4. Simulação em tempo real (auto-update)
 * 5. Integração com FSM (métricas baseadas em transições)
 */
(function() {
  'use strict';

  // ============================================
  // MODELO DE DADOS SIMULADOS
  // ============================================
  var DEMO_DATA = {
    os: {
      total: 127,
      abertas: 23,
      concluidas: 98,
      reabertas: 6,
      tempoMedioDias: 7.5,
      sla95: 10.0
    },
    financeiro: {
      receita: 48750,
      recebido: 39200,
      pendente: 9550,
      ticketMedio: 384,
      churn: 8.3
    },
    custodia: {
      naOficina: 18,
      entregueTemp: 3,
      entregueDefinitivo: 106
    },
    porStatus: {
      'AGUARDANDO_ORCAMENTO': 8,
      'AGUARDANDO_APROVACAO': 5,
      'EM_EXECUCAO': 6,
      'AGUARDANDO_PECA': 3,
      'PRONTO_RETIRADA': 1,
      'FINALIZADO': 98,
      'REABERTO': 6
    },
    porTecnico: [
      { nome: 'Carlos', os: 42, media: 3.8 },
      { nome: 'Ana', os: 35, media: 4.1 },
      { nome: 'Pedro', os: 30, media: 4.5 },
      { nome: 'Julia', os: 20, media: 3.9 }
    ],
    receitaMensal: [
      { mes: 'Jan', valor: 38200 },
      { mes: 'Fev', valor: 41500 },
      { mes: 'Mar', valor: 39800 },
      { mes: 'Abr', valor: 45300 },
      { mes: 'Mai', valor: 42100 },
      { mes: 'Jun', valor: 48750 }
    ],
    osPorDia: [
      { dia: 'Seg', qtd: 28 },
      { dia: 'Ter', qtd: 32 },
      { dia: 'Qua', qtd: 25 },
      { dia: 'Qui', qtd: 22 },
      { dia: 'Sex', qtd: 20 }
    ]
  };

  // ============================================
  // CORES DO DESIGN SYSTEM
  // ============================================
  var COLORS = {
    gold: '#ffc107',
    goldDark: '#785900',
    brown: '#5d4e37',
    blue: '#3b82f6',
    green: '#10b981',
    red: '#dc2626',
    purple: '#8b5cf6',
    amber: '#f59e0b',
    text: '#e2e8f0',
    muted: '#94a3b8',
    bg: '#0f172a',
    card: '#1e293b',
    border: '#334155'
  };

  // ============================================
  // ESTADO DO DASHBOARD
  // ============================================
  var dashboardOpen = false;
  var dashboardEl = null;
  var refreshInterval = null;

  // ============================================
  // GRÁFICOS SVG — Helpers
  // ============================================
  function svgEl(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) {
      Object.keys(attrs).forEach(function(k) {
        el.setAttribute(k, attrs[k]);
      });
    }
    return el;
  }

  // ============================================
  // GRÁFICO DE BARRAS (Vertical)
  // ============================================
  function renderBarChart(data, width, height, color) {
    var svg = svgEl('svg', { width: width, height: height, viewBox: '0 0 ' + width + ' ' + height });
    var maxVal = Math.max.apply(null, data.map(function(d) { return d.value; }));
    var barW = (width - 40) / data.length;
    var chartH = height - 50;
    var chartY = 10;

    // Grid lines
    for (var i = 0; i <= 4; i++) {
      var y = chartY + (chartH / 4) * i;
      var line = svgEl('line', { x1: 30, y1: y, x2: width, y2: y, stroke: COLORS.border, 'stroke-width': 1, 'stroke-dasharray': '3,3' });
      svg.appendChild(line);
    }

    // Bars
    data.forEach(function(d, idx) {
      var barH = (d.value / maxVal) * (chartH - 10);
      var x = 35 + idx * barW + barW * 0.15;
      var w = barW * 0.7;
      var y = chartY + chartH - barH;

      var rect = svgEl('rect', { x: x, y: y, width: w, height: barH, fill: color, rx: 4, opacity: 0.9 });
      svg.appendChild(rect);

      // Value label
      var text = svgEl('text', { x: x + w / 2, y: y - 5, fill: COLORS.text, 'font-size': '10', 'text-anchor': 'middle', 'font-family': 'Inter, sans-serif' });
      text.textContent = d.value >= 1000 ? (d.value / 1000).toFixed(1) + 'k' : d.value;
      svg.appendChild(text);

      // Label
      var label = svgEl('text', { x: x + w / 2, y: height - 5, fill: COLORS.muted, 'font-size': '9', 'text-anchor': 'middle', 'font-family': 'Inter, sans-serif' });
      label.textContent = d.label;
      svg.appendChild(label);
    });

    return svg.outerHTML;
  }

  // ============================================
  // GRÁFICO DE DONUT (Pie Chart)
  // ============================================
  function renderDonutChart(data, size) {
    var svg = svgEl('svg', { width: size, height: size, viewBox: '0 0 ' + size + ' ' + size });
    var total = data.reduce(function(s, d) { return s + d.value; }, 0);
    var cx = size / 2, cy = size / 2, r = size / 2 - 15;
    var startAngle = -Math.PI / 2;

    data.forEach(function(d) {
      var sliceAngle = (d.value / total) * 2 * Math.PI;
      var endAngle = startAngle + sliceAngle;
      var largeArc = sliceAngle > Math.PI ? 1 : 0;

      var x1 = cx + r * Math.cos(startAngle);
      var y1 = cy + r * Math.sin(startAngle);
      var x2 = cx + r * Math.cos(endAngle);
      var y2 = cy + r * Math.sin(endAngle);

      var path = svgEl('path', {
        d: 'M ' + cx + ' ' + cy + ' L ' + x1 + ' ' + y1 + ' A ' + r + ' ' + r + ' 0 ' + largeArc + ' 1 ' + x2 + ' ' + y2 + ' Z',
        fill: d.color,
        stroke: COLORS.bg,
        'stroke-width': 2
      });
      svg.appendChild(path);

      startAngle = endAngle;
    });

    // Center hole
    var hole = svgEl('circle', { cx: cx, cy: cy, r: r * 0.55, fill: COLORS.bg });
    svg.appendChild(hole);

    // Center text
    var centerText = svgEl('text', { x: cx, y: cy + 4, fill: COLORS.text, 'font-size': '16', 'font-weight': '700', 'text-anchor': 'middle', 'font-family': 'Inter, sans-serif' });
    centerText.textContent = total;
    svg.appendChild(centerText);

    return svg.outerHTML;
  }

  // ============================================
  // GRÁFICO DE LINHA
  // ============================================
  function renderLineChart(data, width, height, color) {
    var svg = svgEl('svg', { width: width, height: height, viewBox: '0 0 ' + width + ' ' + height });
    var maxVal = Math.max.apply(null, data.map(function(d) { return d.value; }));
    var chartH = height - 50;
    var chartY = 10;
    var stepX = (width - 60) / (data.length - 1);

    // Grid
    for (var i = 0; i <= 4; i++) {
      var y = chartY + (chartH / 4) * i;
      var line = svgEl('line', { x1: 35, y1: y, x2: width - 10, y2: y, stroke: COLORS.border, 'stroke-width': 1, 'stroke-dasharray': '3,3' });
      svg.appendChild(line);
    }

    // Line path
    var points = data.map(function(d, idx) {
      var x = 40 + idx * stepX;
      var y = chartY + chartH - (d.value / maxVal) * (chartH - 10);
      return x + ',' + y;
    });

    var polyline = svgEl('polyline', {
      points: points.join(' '),
      fill: 'none',
      stroke: color,
      'stroke-width': 2.5,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    });
    svg.appendChild(polyline);

    // Dots + labels
    data.forEach(function(d, idx) {
      var x = 40 + idx * stepX;
      var y = chartY + chartH - (d.value / maxVal) * (chartH - 10);

      var dot = svgEl('circle', { cx: x, cy: y, r: 4, fill: color, stroke: COLORS.bg, 'stroke-width': 2 });
      svg.appendChild(dot);

      // Value
      var valText = svgEl('text', { x: x, y: y - 10, fill: COLORS.text, 'font-size': '9', 'text-anchor': 'middle', 'font-family': 'Inter, sans-serif' });
      valText.textContent = d.value >= 1000 ? (d.value / 1000).toFixed(1) + 'k' : d.value;
      svg.appendChild(valText);

      // Label
      var label = svgEl('text', { x: x, y: height - 5, fill: COLORS.muted, 'font-size': '9', 'text-anchor': 'middle', 'font-family': 'Inter, sans-serif' });
      label.textContent = d.label;
      svg.appendChild(label);
    });

    return svg.outerHTML;
  }

  // ============================================
  // KPI CARD
  // ============================================
  function kpiCard(icon, label, value, sub, color) {
    return '<div class="kpi-card">' +
      '<div class="kpi-icon" style="color:' + color + ';">' + icon + '</div>' +
      '<div class="kpi-content">' +
        '<div class="kpi-value" style="color:' + color + ';">' + value + '</div>' +
        '<div class="kpi-label">' + label + '</div>' +
        (sub ? '<div class="kpi-sub">' + sub + '</div>' : '') +
      '</div>' +
    '</div>';
  }

  // ============================================
  // RENDERIZAÇÃO DO DASHBOARD
  // ============================================
  function renderDashboard() {
    if (!dashboardEl) return;

    var d = DEMO_DATA;
    var html = '';

    // Header
    html += '<div class="dash-header">';
    html += '<div><h2 class="dash-title">📊 Dashboard — Métricas da Oficina</h2>';
    html += '<p class="dash-subtitle">Dados simulados para demonstração do sistema</p></div>';
    html += '<button class="btn" id="dash-close" aria-label="Fechar dashboard">✕</button>';
    html += '</div>';

    // KPIs Row
    html += '<div class="kpi-grid">';
    html += kpiCard('📋', 'OS Abertas', d.os.abertas, 'de ' + d.os.total + ' total', COLORS.blue);
    html += kpiCard('✅', 'Concluídas', d.os.concluidas, Math.round(d.os.concluidas / d.os.total * 100) + '% do total', COLORS.green);
    html += kpiCard('⏱️', 'Tempo Médio', d.os.tempoMedioDias + ' dias', 'SLA 95%: ' + d.os.sla95 + ' dias', COLORS.amber);
    html += kpiCard('💰', 'Receita', 'R$ ' + d.financeiro.receita.toLocaleString('pt-BR'), 'Ticket médio: R$ ' + d.financeiro.ticketMedio, COLORS.gold);
    html += kpiCard('📥', 'Recebido', 'R$ ' + d.financeiro.recebido.toLocaleString('pt-BR'), 'Pendente: R$ ' + d.financeiro.pendente.toLocaleString('pt-BR'), COLORS.purple);
    html += kpiCard('🔄', 'Reaberturas', d.os.reabertas, d.os.reabertas + ' OS reabertas', COLORS.red);
    html += '</div>';

    // Charts Row
    html += '<div class="chart-grid">';

    // Donut — OS por Status
    var donutData = [
      { label: 'Aberto', value: d.os.abertas, color: COLORS.blue },
      { label: 'Execução', value: d.porStatus['EM_EXECUCAO'], color: COLORS.amber },
      { label: 'Concluído', value: d.os.concluidas, color: COLORS.green },
      { label: 'Reaberto', value: d.os.reabertas, color: COLORS.red }
    ];
    html += '<div class="chart-card">';
    html += '<h3 class="chart-title">OS por Status</h3>';
    html += '<div class="chart-body" style="text-align:center;">';
    html += renderDonutChart(donutData, 200);
    html += '<div class="chart-legend">';
    donutData.forEach(function(item) {
      html += '<span class="legend-item"><span class="legend-dot" style="background:' + item.color + ';"></span>' + item.label + ' (' + item.value + ')</span>';
    });
    html += '</div></div></div>';

    // Bar — OS por Dia da Semana
    var barData = d.osPorDia.map(function(item) { return { label: item.dia, value: item.qtd }; });
    html += '<div class="chart-card">';
    html += '<h3 class="chart-title">OS por Dia da Semana</h3>';
    html += '<div class="chart-body">';
    html += renderBarChart(barData, 280, 160, COLORS.blue);
    html += '</div></div>';

    // Bar — OS por Técnico
    var techData = d.porTecnico.map(function(item) { return { label: item.nome, value: item.os }; });
    html += '<div class="chart-card">';
    html += '<h3 class="chart-title">OS por Técnico</h3>';
    html += '<div class="chart-body">';
    html += renderBarChart(techData, 280, 160, COLORS.gold);
    html += '</div></div>';

    // Line — Receita Mensal
    var lineData = d.receitaMensal.map(function(item) { return { label: item.mes, value: item.valor }; });
    html += '<div class="chart-card">';
    html += '<h3 class="chart-title">Receita Mensal (R$)</h3>';
    html += '<div class="chart-body">';
    html += renderLineChart(lineData, 280, 160, COLORS.green);
    html += '</div></div>';

    html += '</div>';

    // Custódia info
    html += '<div class="chart-grid" style="grid-template-columns:1fr 1fr;">';
    html += '<div class="chart-card">';
    html += '<h3 class="chart-title">📍 Custódia dos Equipamentos</h3>';
    html += '<div class="chart-body" style="display:flex;gap:1rem;flex-wrap:wrap;justify-content:center;">';
    html += '<div class="custodia-stat"><div class="custodia-num" style="color:' + COLORS.blue + ';">' + d.custodia.naOficina + '</div><div class="custodia-label">Na Oficina</div></div>';
    html += '<div class="custodia-stat"><div class="custodia-num" style="color:' + COLORS.amber + ';">' + d.custodia.entregueTemp + '</div><div class="custodia-label">Entregue Temp.</div></div>';
    html += '<div class="custodia-stat"><div class="custodia-num" style="color:' + COLORS.green + ';">' + d.custodia.entregueDefinitivo + '</div><div class="custodia-label">Entregue Def.</div></div>';
    html += '</div></div>';

    // Técnico table
    html += '<div class="chart-card">';
    html += '<h3 class="chart-title">🏆 Performance por Técnico</h3>';
    html += '<div class="chart-body" style="overflow-x:auto;">';
    html += '<table class="tech-table"><thead><tr><th>Técnico</th><th>OS</th><th>Média (dias)</th><th>Desempenho</th></tr></thead><tbody>';
    d.porTecnico.forEach(function(t) {
      var perf = t.media <= 4 ? '🟢' : t.media <= 4.5 ? '🟡' : '🔴';
      html += '<tr><td>' + t.nome + '</td><td>' + t.os + '</td><td>' + t.media + '</td><td>' + perf + '</td></tr>';
    });
    html += '</tbody></table></div></div>';
    html += '</div>';

    // Simulated refresh indicator
    html += '<div class="dash-footer">';
    html += '<span class="refresh-dot"></span> Dados simulados — Atualizado em tempo real';
    html += '</div>';

    dashboardEl.innerHTML = html;
    bindDashEvents();
  }

  // ============================================
  // EVENTOS
  // ============================================
  function bindDashEvents() {
    var closeBtn = document.getElementById('dash-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeDashboard);
    }
  }

  // ============================================
  // TOGGLE / OPEN / CLOSE
  // ============================================
  function openDashboard() {
    createDashboardUI();
    dashboardOpen = true;
    dashboardEl.style.display = 'flex';
    renderDashboard();
    startAutoRefresh();
  }

  function closeDashboard() {
    dashboardOpen = false;
    if (dashboardEl) {
      dashboardEl.style.display = 'none';
    }
    stopAutoRefresh();
  }

  function toggleDashboard() {
    if (dashboardOpen) {
      closeDashboard();
    } else {
      openDashboard();
    }
  }

  // ============================================
  // AUTO-REFRESH (Simulação de dados em tempo real)
  // ============================================
  function startAutoRefresh() {
    stopAutoRefresh();
    refreshInterval = setInterval(function() {
      // Simular variação nos dados
      DEMO_DATA.os.abertas = Math.max(15, Math.min(35, DEMO_DATA.os.abertas + Math.floor(Math.random() * 3) - 1));
      DEMO_DATA.os.concluidas = DEMO_DATA.os.total - DEMO_DATA.os.abertas - DEMO_DATA.os.reabertas;
      DEMO_DATA.financeiro.receita = DEMO_DATA.os.concluidas * DEMO_DATA.financeiro.ticketMedio;
      DEMO_DATA.financeiro.recebido = Math.floor(DEMO_DATA.financeiro.receita * 0.8);

      // Atualizar KPIs sem re-renderizar tudo
      var kpiValues = dashboardEl.querySelectorAll('.kpi-value');
      if (kpiValues.length >= 6) {
        kpiValues[0].textContent = DEMO_DATA.os.abertas;
        kpiValues[1].textContent = DEMO_DATA.os.concluidas;
        kpiValues[4].textContent = 'R$ ' + DEMO_DATA.financeiro.recebido.toLocaleString('pt-BR');
      }
    }, 5000);
  }

  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  // ============================================
  // CRIAR UI
  // ============================================
  function createDashboardUI() {
    if (dashboardEl) return;

    dashboardEl = document.createElement('div');
    dashboardEl.id = 'mgv-dashboard';
    dashboardEl.setAttribute('role', 'region');
    dashboardEl.setAttribute('aria-label', 'Dashboard de métricas da oficina');
    dashboardEl.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'right:0',
      'bottom:0',
      'background:var(--bg-main)',
      'z-index:200',
      'display:none',
      'flex-direction:column',
      'overflow-y:auto',
      'padding:1.5rem',
      'font-family:var(--font-family)'
    ].join(';');

    document.body.appendChild(dashboardEl);

    // Estilos CSS inline para o dashboard
    var style = document.createElement('style');
    style.textContent = [
      '.kpi-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:0.75rem; margin-bottom:1.5rem; }',
      '.kpi-card { background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-xl); padding:1rem; display:flex; align-items:center; gap:0.75rem; }',
      '.kpi-icon { font-size:1.5rem; }',
      '.kpi-value { font-size:1.3rem; font-weight:700; line-height:1.2; }',
      '.kpi-label { font-size:0.8rem; color:var(--text-muted); }',
      '.kpi-sub { font-size:0.7rem; color:var(--text-muted); opacity:0.7; }',
      '.chart-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:0.75rem; margin-bottom:1.5rem; }',
      '.chart-card { background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-xl); padding:1rem; }',
      '.chart-title { font-size:0.9rem; font-weight:600; color:var(--text-main); margin:0 0 0.75rem 0; }',
      '.chart-body { min-height:160px; }',
      '.chart-legend { display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.5rem; justify-content:center; }',
      '.legend-item { font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; gap:0.3rem; }',
      '.legend-dot { width:8px; height:8px; border-radius:50%; display:inline-block; }',
      '.custodia-stat { text-align:center; padding:0.5rem 1rem; }',
      '.custodia-num { font-size:1.8rem; font-weight:700; }',
      '.custodia-label { font-size:0.8rem; color:var(--text-muted); }',
      '.tech-table { width:100%; border-collapse:collapse; font-size:0.8rem; }',
      '.tech-table th { text-align:left; padding:0.4rem; border-bottom:2px solid var(--border-color); color:var(--text-muted); font-weight:600; }',
      '.tech-table td { padding:0.4rem; border-bottom:1px solid var(--border-color); color:var(--text-main); }',
      '.dash-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; }',
      '.dash-title { font-size:1.2rem; font-weight:700; color:var(--text-main); margin:0; }',
      '.dash-subtitle { font-size:0.8rem; color:var(--text-muted); margin:0.25rem 0 0 0; }',
      '.dash-footer { text-align:center; padding:1rem; font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; justify-content:center; gap:0.5rem; }',
      '.refresh-dot { width:6px; height:6px; border-radius:50%; background:var(--mgv-gold); animation:pulse 2s infinite; }',
      '@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ============================================
  // FAB (Botão flutuante)
  // ============================================
  function createFAB() {
    var fab = document.createElement('button');
    fab.id = 'dash-fab';
    fab.className = 'btn';
    fab.setAttribute('aria-label', 'Abrir dashboard de métricas');
    fab.title = 'Dashboard';
    fab.style.cssText = [
      'position:fixed',
      'bottom:1rem',
      'right:4.5rem',
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
      'justify-content:center'
    ].join(';');
    fab.textContent = '📊';
    fab.addEventListener('click', toggleDashboard);
    document.body.appendChild(fab);
  }

  // ============================================
  // KEYBOARD SHORTCUT — D para toggle dashboard
  // ============================================
  function bindKeyboard() {
    document.addEventListener('keydown', function(e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        toggleDashboard();
      }
    });
  }

  // ============================================
  // LISTEN para FSM transitions
  // ============================================
  function listenFSM() {
    document.addEventListener('mgv:fsm-transition', function(e) {
      var detail = e.detail || {};
      // Atualizar métricas baseado na transição
      if (detail.to === 'FINALIZADO') {
        DEMO_DATA.os.concluidas++;
        DEMO_DATA.os.abertas = Math.max(0, DEMO_DATA.os.abertas - 1);
      } else if (detail.to === 'REABERTO') {
        DEMO_DATA.os.reabertas++;
      }
      // Re-renderizar se dashboard aberto
      if (dashboardOpen) {
        renderDashboard();
      }
    });
  }

  // ============================================
  // INIT
  // ============================================
  function init() {
    createDashboardUI();
    createFAB();
    bindKeyboard();
    listenFSM();
  }

  // Exportar namespace global
  window.MGV = window.MGV || {};
  window.MGV.telemetry = {
    init,
    open: openDashboard,
    close: closeDashboard,
    toggle: toggleDashboard,
    DEMO_DATA
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
