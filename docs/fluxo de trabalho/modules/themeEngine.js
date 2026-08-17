/**
 * ThemeEngine — Módulo de Temas (Dark/Light/Print)
 * MGV Assistência Técnica — Visualizador de Fluxo de OS
 *
 * Gerencia alternância de temas com persistência em localStorage.
 * Suporta: dark (padrão), light, print.
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'mgv-theme';
  const THEMES = ['dark', 'light'];

  let currentTheme = 'dark';

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && THEMES.includes(saved)) {
      currentTheme = saved;
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      currentTheme = 'light';
    }
    applyTheme(currentTheme);
    bindToggle();
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    currentTheme = theme;
    localStorage.setItem(STORAGE_KEY, theme);

    // Atualizar ícone do botão
    const btn = document.getElementById('btn-theme-toggle');
    if (btn) {
      btn.textContent = theme === 'dark' ? '☀️ Claro' : '🌙 Escuro';
      btn.setAttribute('aria-label', `Alternar para tema ${theme === 'dark' ? 'claro' : 'escuro'}`);
    }

    // Atualizar mermaid se disponível
    if (window.mermaid) {
      mermaid.initialize({
        startOnLoad: false,
        theme: theme === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose',
        flowchart: { useMaxWidth: false, htmlLabels: true, curve: 'basis' }
      });
    }
  }

  function toggle() {
    const next = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }

  function bindToggle() {
    const btn = document.getElementById('btn-theme-toggle');
    if (btn) {
      btn.addEventListener('click', toggle);
      // Atualizar texto inicial
      btn.textContent = currentTheme === 'dark' ? '☀️ Claro' : '🌙 Escuro';
    }
  }

  // Exportar namespace global
  window.MGV = window.MGV || {};
  window.MGV.theme = { init, toggle, applyTheme, getCurrent: () => currentTheme };

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
