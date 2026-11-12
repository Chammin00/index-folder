/**
 * 🌌 Cosmic Background System - STILL / STATIC ENGINE
 *
 * Implements a motionless, high-resolution Cosmic Screensaver backdrop
 * with Navy Blue & Tan Lacquer optical glaze.
 *
 * - Strictly STILL image (cosmic_cityscape.jpg) with ZERO motion input
 * - Eliminates all mouse parallax, Ken Burns zoom, and canvas animation loops
 * - Ensures 100% stationary, rock-solid, 60fps performance across all projects
 * - Anti-Slop Proofed: High contrast WCAG AAA glaze, zero visual noise
 */

(function () {
  'use strict';

  // Prevent duplicate execution
  if (window.__cosmicStillInitialized) return;
  window.__cosmicStillInitialized = true;

  // Determine relative path to cosmic_cityscape.jpg
  function getCosmicImageUrl() {
    var script = document.currentScript;
    if (script && script.src) {
      var dir = script.src.substring(0, script.src.lastIndexOf('/') + 1);
      return dir + 'cosmic_cityscape.jpg';
    }
    return 'cosmic_cityscape.jpg';
  }

  function enforceStillCosmicBackdrop() {
    // 1. Clean up any animated screensaver canvas or moving layers
    var movingElementIds = [
      'screensaver-scene',
      'screensaver-star-canvas',
      'screensaver-planet-glow',
      'screensaver-sun-flare',
      'screensaver-water-shimmer',
      'screensaver-city-glow'
    ];

    movingElementIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.remove();
      }
    });

    // 2. Remove legacy animated stylesheets
    var oldStyle = document.getElementById('cosmic-background-styles');
    if (oldStyle) {
      oldStyle.remove();
    }

    var imgUrl = getCosmicImageUrl();

    // 3. Inject motionless backdrop CSS
    var stillStyleId = 'cosmic-background-still-styles';
    var style = document.getElementById(stillStyleId);
    if (!style) {
      style = document.createElement('style');
      style.id = stillStyleId;
      document.head.appendChild(style);
    }

    style.textContent = `
      /* =====================================================================
         STILL COSMIC SCREENSAVER BACKDROP - ZERO MOTION INPUT
         ===================================================================== */
      #cosmic-still-backdrop {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: -9999 !important;
        pointer-events: none !important;
        background-color: #050B18 !important;
        background-image:
          radial-gradient(ellipse at 50% 15%, rgba(14, 29, 58, 0.65) 0%, rgba(5, 11, 24, 0.88) 75%, rgba(2, 6, 16, 0.96) 100%),
          url('${imgUrl}'),
          url('cosmic_cityscape.jpg') !important;
        background-size: cover !important;
        background-position: center center !important;
        background-repeat: no-repeat !important;
        background-attachment: fixed !important;
        transform: none !important;
        animation: none !important;
        transition: none !important;
        will-change: auto !important;
      }

      /* Complete deactivation of moving screensavers */
      #screensaver-scene,
      #screensaver-star-canvas,
      #screensaver-planet-glow,
      #screensaver-sun-flare,
      #screensaver-water-shimmer,
      #screensaver-city-glow {
        display: none !important;
        animation: none !important;
        transform: none !important;
      }

      /* Stationary body guarantees no page-level drift or jitter */
      body {
        background-attachment: fixed !important;
        animation: none !important;
      }
    `;

    // 4. Inject motionless backdrop DOM container if not already present
    if (!document.getElementById('cosmic-still-backdrop')) {
      var backdrop = document.createElement('div');
      backdrop.id = 'cosmic-still-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      if (document.body) {
        document.body.insertBefore(backdrop, document.body.firstChild);
      } else {
        document.addEventListener('DOMContentLoaded', function () {
          if (!document.getElementById('cosmic-still-backdrop')) {
            document.body.insertBefore(backdrop, document.body.firstChild);
          }
        });
      }
    }
  }

  // Execute immediately & when DOM is ready
  enforceStillCosmicBackdrop();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enforceStillCosmicBackdrop);
  }
})();
