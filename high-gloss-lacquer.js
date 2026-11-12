/**
 * Antigravity Matte Enterprise Script (high-gloss-lacquer.js - Clean Baseline)
 * 
 * Lightweight helper ensuring clean baseline styles and motionless cosmic canvas.
 * Specular glares and mouse-tracked flares are completely disabled.
 */

(function () {
  'use strict';

  function ensureStylesheet() {
    const existing = document.querySelector('link[href*="high-gloss-lacquer.css"]');
    if (!existing) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      const script = document.currentScript;
      if (script && script.src) {
        link.href = script.src.replace(/\.js(\?.*)?$/, '.css$1');
      } else {
        link.href = 'high-gloss-lacquer.css';
      }
      document.head.appendChild(link);
    }
  }

  function ensureStillCanvas() {
    // Disable any legacy canvas screensaver or moving elements
    const ids = [
      'screensaver-scene', 'screensaver-star-canvas', 'screensaver-planet-glow',
      'screensaver-sun-flare', 'screensaver-water-shimmer', 'screensaver-city-glow'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ensureStylesheet();
      ensureStillCanvas();
    });
  } else {
    ensureStylesheet();
    ensureStillCanvas();
  }
})();
