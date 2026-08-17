/**
 * PanZoomEngine — Módulo de Pan & Zoom
 * MGV Assistência Técnica — Visualizador de Fluxo de OS
 *
 * Suporta: scroll wheel (zoom), drag (pan), touch (pinch + pan).
 * Respeita prefers-reduced-motion (desabilita animações).
 */
(function() {
  'use strict';

  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  const MIN_SCALE = 0.2;
  const MAX_SCALE = 3;
  const ZOOM_STEP = 0.15;
  const THROTTLE_MS = 16; // ~60fps

  let viewport = null;
  let container = null;
  let indicator = null;
  let lastWheelTime = 0;
  let prefersReducedMotion = false;

  function init() {
    viewport = document.getElementById('viewport');
    container = document.getElementById('diagram-container');
    indicator = document.getElementById('zoom-indicator');

    if (!viewport || !container) return;

    prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    bindWheel();
    bindDrag();
    bindTouch();
    bindButtons();
    updateTransform();
  }

  function bindWheel() {
    viewport.addEventListener('wheel', function(e) {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelTime < THROTTLE_MS) return;
      lastWheelTime = now;

      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));
      updateTransform();
    }, { passive: false });
  }

  function bindDrag() {
    viewport.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      viewport.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      translateX += dx;
      translateY += dy;
      lastX = e.clientX;
      lastY = e.clientY;
      updateTransform();
    });

    document.addEventListener('mouseup', function() {
      isDragging = false;
      if (viewport) viewport.style.cursor = '';
    });
  }

  function bindTouch() {
    let lastTouchDist = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;

    viewport.addEventListener('touchstart', function(e) {
      if (e.touches.length === 2) {
        lastTouchDist = getTouchDist(e.touches);
      } else if (e.touches.length === 1) {
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
      }
    }, { passive: true });

    viewport.addEventListener('touchmove', function(e) {
      e.preventDefault();
      if (e.touches.length === 2) {
        const dist = getTouchDist(e.touches);
        const delta = (dist - lastTouchDist) * 0.005;
        scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));
        lastTouchDist = dist;
        updateTransform();
      } else if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - lastTouchX;
        const dy = e.touches[0].clientY - lastTouchY;
        translateX += dx;
        translateY += dy;
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
        updateTransform();
      }
    }, { passive: false });
  }

  function bindButtons() {
    const btnIn = document.getElementById('btn-zoom-in');
    const btnOut = document.getElementById('btn-zoom-out');
    const btnReset = document.getElementById('btn-zoom-reset');

    if (btnIn) btnIn.addEventListener('click', function() {
      scale = Math.min(MAX_SCALE, scale + ZOOM_STEP);
      updateTransform();
    });

    if (btnOut) btnOut.addEventListener('click', function() {
      scale = Math.max(MIN_SCALE, scale - ZOOM_STEP);
      updateTransform();
    });

    if (btnReset) btnReset.addEventListener('click', function() {
      scale = 1;
      translateX = 0;
      translateY = 0;
      updateTransform();
    });
  }

  function getTouchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  function updateTransform() {
    if (!container) return;

    const transition = prefersReducedMotion ? 'none' : 'transform 0.1s ease-out';
    container.style.transition = transition;
    container.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;

    if (indicator) {
      indicator.textContent = `Zoom: ${Math.round(scale * 100)}%`;
    }
  }

  function getState() {
    return { scale, translateX, translateY };
  }

  function setScale(s) {
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
    updateTransform();
  }

  // Exportar namespace global
  window.MGV = window.MGV || {};
  window.MGV.panZoom = { init, getState, setScale, reset: function() {
    scale = 1; translateX = 0; translateY = 0; updateTransform();
  }};

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
