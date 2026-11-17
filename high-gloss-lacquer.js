/**
 * Antigravity Matte Enterprise & Web/3D Craftsmanship Runtime (high-gloss-lacquer.js)
 * 
 * Integrates the 5 Web Design & 3D Asset Craftsmanship Pillars across all projects:
 * 1. fontshare.com — Commercial-free ITF typography (Clash Display, Satoshi, Cabinet Grotesk, General Sans)
 * 2. fffuel.co     — Tactile SVG fractal noise (nnnoise) & isometric/topographic SVG pattern generators
 * 3. jiro.build    — Curated AI web design & UI layout prompt registry
 * 4. ambientcg.com — Public-domain CC0 PBR material maps (NormalGL, Roughness, AO) & studio HDRI helpers
 * 5. poly.pizza    — Low-poly 3D model kit & GLTF/GLB loader with faceted low-poly procedural meshes
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

    // Ensure Fontshare ITF Typography CDN is connected
    if (!document.querySelector('link[href*="api.fontshare.com"]')) {
      const fsLink = document.createElement('link');
      fsLink.rel = 'stylesheet';
      fsLink.href = 'https://api.fontshare.com/v2/css?f[]=clash-display@600,700&f[]=satoshi@400,500,700&f[]=cabinet-grotesk@700,800&f[]=general-sans@400,500,600&f[]=zodiak@400,700&display=swap';
      document.head.appendChild(fsLink);
    }
  }

  function ensureStillCanvas() {
    const ids = [
      'screensaver-scene', 'screensaver-star-canvas', 'screensaver-planet-glow',
      'screensaver-sun-flare', 'screensaver-water-shimmer', 'screensaver-city-glow'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  // Expose unified Web & 3D Asset Craftsmanship Kit globally
  window.AntigravityCraftsmanship = {
    version: '2.5.0',
    sources: {
      prompts: 'https://jiro.build',
      svgGenerators: 'https://fffuel.co',
      lowPoly3D: 'https://poly.pizza',
      typography: 'https://www.fontshare.com',
      pbrMaterials: 'https://ambientcg.com'
    },

    // jiro.build Curated AI Layout & UI Prompt Library
    jiroPrompts: {
      bentoConsole: "Construct an asymmetric 12-column CSS Grid bento layout (gap: 16px, grid-auto-rows: minmax(140px, auto)) with a 7-column primary interactive stage and a 5-column telemetry rail. Enforce 1px solid #30363d borders, Clash Display headers, Satoshi tabular-nums metrics, and fffuel nnnoise 3.5% SVG fractal film grain.",
      hero3DStage: "Design a 100vw x 100vh command deck over a live Three.js WebGL canvas. Anchor a 56px glassmorphic top command bar, a bottom-left raycast inspector card with cubic-bezier(0.16, 1, 0.3, 1) entrance, and a bottom-center RPG action cluster without obscuring the center 65% of the 3D scene.",
      blueprintDrawer: "Architect a 420px dockable right-hand engineering drawer with exposed 1px technical hairlines, monospace status pills, live waveform sparklines, and one-click code copy blocks."
    },

    // ambientcg.com CC0 PBR Material & Procedural Normal/Roughness Generator for Three.js
    createAmbientCgMaterial: function (preset, customOpts) {
      if (typeof THREE === 'undefined') return null;
      const opts = customOpts || {};
      const size = 256;
      const normCanvas = document.createElement('canvas');
      normCanvas.width = size;
      normCanvas.height = size;
      const nCtx = normCanvas.getContext('2d');

      // Base tangent-space normal (128, 128, 255)
      nCtx.fillStyle = 'rgb(128, 128, 255)';
      nCtx.fillRect(0, 0, size, size);

      const roughCanvas = document.createElement('canvas');
      roughCanvas.width = size;
      roughCanvas.height = size;
      const rCtx = roughCanvas.getContext('2d');

      if (preset === 'Marble012') {
        rCtx.fillStyle = 'rgb(32, 32, 32)';
        rCtx.fillRect(0, 0, size, size);
        nCtx.strokeStyle = 'rgb(148, 148, 255)';
        nCtx.lineWidth = 2;
        nCtx.strokeRect(1, 1, size - 2, size - 2);
        for (let i = 0; i < 14; i++) {
          nCtx.strokeStyle = i % 2 === 0 ? 'rgba(165, 145, 255, 0.28)' : 'rgba(105, 115, 255, 0.22)';
          rCtx.strokeStyle = 'rgba(90, 90, 90, 0.35)';
          nCtx.beginPath();
          rCtx.beginPath();
          const sx = Math.random() * size;
          const ex = Math.random() * size;
          nCtx.moveTo(sx, 0);
          nCtx.bezierCurveTo(sx + 30, size * 0.35, ex - 30, size * 0.65, ex, size);
          nCtx.stroke();
          rCtx.moveTo(sx, 0);
          rCtx.lineTo(ex, size);
          rCtx.stroke();
        }
      } else if (preset === 'Metal032') {
        rCtx.fillStyle = 'rgb(78, 78, 78)';
        rCtx.fillRect(0, 0, size, size);
        for (let y = 0; y < size; y += 2) {
          const nVal = Math.floor(120 + (y % 4) * 4);
          nCtx.fillStyle = 'rgb(' + nVal + ', 128, 255)';
          nCtx.fillRect(0, y, size, 1);
        }
      } else if (preset === 'Wood066') {
        rCtx.fillStyle = 'rgb(68, 68, 68)';
        rCtx.fillRect(0, 0, size, size);
        nCtx.strokeStyle = 'rgb(146, 132, 255)';
        nCtx.lineWidth = 2;
        for (let x = 0; x < size; x += 32) {
          for (let y = 0; y < size; y += 64) {
            nCtx.strokeRect(x, y, 32, 64);
          }
        }
      }

      const normalMap = new THREE.CanvasTexture(normCanvas);
      normalMap.wrapS = THREE.RepeatWrapping;
      normalMap.wrapT = THREE.RepeatWrapping;
      normalMap.repeat.set(opts.repeat || 12, opts.repeat || 12);

      const roughnessMap = new THREE.CanvasTexture(roughCanvas);
      roughnessMap.wrapS = THREE.RepeatWrapping;
      roughnessMap.wrapT = THREE.RepeatWrapping;
      roughnessMap.repeat.set(opts.repeat || 12, opts.repeat || 12);

      return new THREE.MeshStandardMaterial({
        color: opts.color !== undefined ? opts.color : (preset === 'Marble012' ? 0x090b12 : preset === 'Wood066' ? 0x7c5333 : 0x1e2433),
        roughness: opts.roughness !== undefined ? opts.roughness : (preset === 'Marble012' ? 0.14 : preset === 'Wood066' ? 0.28 : 0.34),
        metalness: opts.metalness !== undefined ? opts.metalness : (preset === 'Marble012' ? 0.86 : preset === 'Wood066' ? 0.08 : 0.84),
        normalMap: normalMap,
        roughnessMap: roughnessMap,
        normalScale: new THREE.Vector2(opts.normalScale || 0.25, opts.normalScale || 0.25)
      });
    },

    // poly.pizza Low-Poly 3D Prop Generator for Three.js / R3F
    createPolyPizzaProp: function (archetype, accentColor) {
      if (typeof THREE === 'undefined') return null;
      const group = new THREE.Group();
      const color = accentColor || 0xd4af37;
      const lowPolyMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.32,
        metalness: 0.55,
        flatShading: true
      });
      const darkLowPolyMat = new THREE.MeshStandardMaterial({
        color: 0x161f30,
        roughness: 0.45,
        metalness: 0.75,
        flatShading: true
      });

      if (archetype === 'crystal-cluster') {
        const offsets = [
          { x: 0, y: 0.45, z: 0, r: 0.22, h: 0.9, rotZ: 0 },
          { x: -0.22, y: 0.3, z: 0.12, r: 0.14, h: 0.6, rotZ: 0.35 },
          { x: 0.24, y: 0.28, z: -0.1, r: 0.15, h: 0.55, rotZ: -0.32 }
        ];
        offsets.forEach(o => {
          const shard = new THREE.Mesh(new THREE.ConeGeometry(o.r, o.h, 6), lowPolyMat);
          shard.position.set(o.x, o.y, o.z);
          shard.rotation.z = o.rotZ;
          shard.castShadow = true;
          group.add(shard);
        });
      } else if (archetype === 'mecha-drone') {
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), darkLowPolyMat);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.04, 6, 12), lowPolyMat);
        ring.rotation.x = Math.PI / 2;
        group.add(core, ring);
      } else {
        const poly = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), lowPolyMat);
        poly.castShadow = true;
        group.add(poly);
      }
      return group;
    }
  };

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
