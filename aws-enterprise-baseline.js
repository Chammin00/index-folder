/**
 * ⚡ Antigravity AWS Enterprise Baseline Controller (aws-enterprise-baseline.js)
 * 
 * Multi-dock modal inspector (Center default, Left, Right)
 * Sidebar toggle with local state persistence
 * Global keyboard shortcuts (Ctrl+K, Esc)
 */

(function () {
  'use strict';

  if (window.AntigravityEnterprise) return;

  const STATE = {
    dockMode: localStorage.getItem('antigravity_inspector_dock') || 'center',
    sidebarCollapsed: localStorage.getItem('antigravity_sidebar_collapsed') === 'true'
  };

  const AntigravityEnterprise = {
    version: "2.0.0",

    init: function () {
      this.applySidebarState();
      this.initDockMode();
      this.bindKeyShortcuts();
    },

    toggleSidebar: function () {
      const sidebar = document.querySelector('.app-sidebar');
      if (!sidebar) return;
      sidebar.classList.toggle('collapsed');
      STATE.sidebarCollapsed = sidebar.classList.contains('collapsed');
      localStorage.setItem('antigravity_sidebar_collapsed', STATE.sidebarCollapsed);
    },

    applySidebarState: function () {
      const sidebar = document.querySelector('.app-sidebar');
      if (sidebar && STATE.sidebarCollapsed) {
        sidebar.classList.add('collapsed');
      }
    },

    setInspectorDock: function (mode) {
      if (!['center', 'left', 'right'].includes(mode)) mode = 'center';
      STATE.dockMode = mode;
      localStorage.setItem('antigravity_inspector_dock', mode);

      const inspector = document.querySelector('.app-inspector');
      const backdrop = document.querySelector('.inspector-backdrop');
      if (!inspector) return;

      inspector.classList.remove('mode-left', 'mode-center', 'mode-right');
      inspector.classList.add(`mode-${mode}`);

      document.querySelectorAll('.dock-mode-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.dock === mode);
      });

      if (backdrop) {
        if (mode === 'center' && !inspector.classList.contains('hidden')) {
          backdrop.classList.add('active');
        } else {
          backdrop.classList.remove('active');
        }
      }
    },

    initDockMode: function () {
      this.setInspectorDock(STATE.dockMode);
    },

    openInspector: function (data) {
      const inspector = document.querySelector('.app-inspector');
      const backdrop = document.querySelector('.inspector-backdrop');
      if (!inspector) return;

      this.setInspectorDock(STATE.dockMode);
      inspector.classList.remove('hidden');

      if (STATE.dockMode === 'center' && backdrop) {
        backdrop.classList.add('active');
      }

      if (data) {
        if (data.title && document.getElementById('insp-title')) {
          document.getElementById('insp-title').textContent = data.title;
        }
        if (data.category && document.getElementById('insp-category')) {
          document.getElementById('insp-category').textContent = data.category;
        }
        if (data.role && document.getElementById('insp-role')) {
          document.getElementById('insp-role').textContent = data.role;
        }
        if (data.specs && document.getElementById('insp-params')) {
          const tbody = document.getElementById('insp-params');
          tbody.innerHTML = '';
          data.specs.forEach(([k, v]) => {
            const row = document.createElement('tr');
            row.innerHTML = `<td style="color:var(--gh-text-muted); padding:4px 8px;">${k}</td><td style="color:var(--gh-text-primary); font-weight:700; padding:4px 8px;">${v}</td>`;
            tbody.appendChild(row);
          });
        }
      }
    },

    closeInspector: function () {
      const inspector = document.querySelector('.app-inspector');
      const backdrop = document.querySelector('.inspector-backdrop');
      if (inspector) inspector.classList.add('hidden');
      if (backdrop) backdrop.classList.remove('active');
    },

    toggleInspector: function () {
      const inspector = document.querySelector('.app-inspector');
      if (!inspector) return;
      if (inspector.classList.contains('hidden')) {
        this.openInspector();
      } else {
        this.closeInspector();
      }
    },

    toggleFullscreen: function () {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.warn('Fullscreen request failed:', err);
        });
      } else {
        document.exitFullscreen();
      }
    },

    bindKeyShortcuts: function () {
      document.addEventListener('keydown', (e) => {
        // Ctrl+K / Cmd+K search focus
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          const searchInput = document.getElementById('global-search-input') || document.getElementById('search-input');
          if (searchInput) searchInput.focus();
        }
        // Esc to close inspector
        if (e.key === 'Escape') {
          this.closeInspector();
        }
      });
    }
  };

  window.AntigravityEnterprise = AntigravityEnterprise;

  document.addEventListener('DOMContentLoaded', function () {
    AntigravityEnterprise.init();
  });
})();
