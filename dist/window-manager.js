'use strict';

(() => {
  const STORAGE_KEY = 'astra-window-layout-v1';
  const selectors = [
    { id: 'character-sheet', selector: '#game > aside', title: 'Character Sheet' },
    { id: 'story', selector: '#game > article', title: 'The Dungeon Master' },
    { id: 'map', selector: '#aidmPort', title: 'World & Tactical Map' },
  ];
  let layout = loadLayout();
  let nextZ = Math.max(2, ...Object.values(layout.panels).map((item) => item.zIndex || 1));
  let initialized = false;

  function loadLayout() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (parsed?.version === 1 && parsed.panels && typeof parsed.panels === 'object') return parsed;
      return { version: 1, panels: {} };
    } catch {
      return { version: 1, panels: {} };
    }
  }

  function saveLayout() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, panels: layout.panels }));
    } catch {
      // Layout persistence is a convenience; gameplay must continue without it.
    }
  }

  function isMobile() {
    return window.matchMedia('(max-width: 760px)').matches;
  }

  function defaults(id, index) {
    const width = Math.min(id === 'story' ? 760 : 360, Math.max(280, window.innerWidth - 48));
    return {
      x: id === 'story' ? 390 : 24,
      y: 24 + index * 18,
      width,
      height: id === 'story' ? 720 : 620,
      zIndex: index + 1,
      minimized: false,
      maximized: false,
      visible: true,
    };
  }

  function geometry(panel, id, index) {
    const saved = layout.panels[id] || {};
    const base = defaults(id, index);
    return {
      ...base,
      ...Object.fromEntries(Object.entries(saved).filter(([key, value]) => ['x', 'y', 'width', 'height', 'zIndex', 'minimized', 'maximized', 'visible'].includes(key) && (typeof value === 'number' || typeof value === 'boolean'))),
      minWidth: Math.max(260, panel.dataset.minWidth ? Number(panel.dataset.minWidth) : 260),
      minHeight: 180,
    };
  }

  function clamp(item) {
    const maxWidth = Math.max(item.minWidth, window.innerWidth - 24);
    const maxHeight = Math.max(item.minHeight, window.innerHeight - 92);
    item.width = Math.min(Math.max(item.width, item.minWidth), maxWidth);
    item.height = Math.min(Math.max(item.height, item.minHeight), maxHeight);
    item.x = Math.max(12, Math.min(item.x, Math.max(12, window.innerWidth - 24 - item.width)));
    item.y = Math.max(12, Math.min(item.y, Math.max(12, window.innerHeight - 80 - item.height)));
  }

  function update(panel, item) {
    layout.panels[panel.dataset.windowId] = { ...item };
    panel.style.zIndex = String(item.zIndex);
    panel.classList.toggle('is-minimized', item.minimized);
    panel.classList.toggle('is-maximized', item.maximized);
    panel.classList.toggle('is-closed', item.visible === false);
    if (isMobile()) {
      panel.style.removeProperty('left');
      panel.style.removeProperty('top');
      panel.style.removeProperty('width');
      panel.style.removeProperty('height');
    } else if (item.maximized) {
      panel.style.left = '12px';
      panel.style.top = '12px';
      panel.style.width = 'calc(100vw - 24px)';
      panel.style.height = 'calc(100vh - 92px)';
    } else {
      clamp(item);
      panel.style.left = `${item.x}px`;
      panel.style.top = `${item.y}px`;
      panel.style.width = `${item.width}px`;
      panel.style.height = item.minimized ? 'auto' : `${item.height}px`;
    }
    const minimize = panel.querySelector('[data-window-action="minimize"]');
    const maximize = panel.querySelector('[data-window-action="maximize"]');
    if (minimize) minimize.setAttribute('aria-label', item.minimized ? 'Restore window' : 'Minimize window');
    if (maximize) maximize.setAttribute('aria-label', item.maximized ? 'Restore window size' : 'Maximize window');
    saveLayout();
  }

  function bringToFront(panel, item) {
    item.zIndex = ++nextZ;
    update(panel, item);
  }

  function addButton(toolbar, action, label, text) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'window-control';
    button.dataset.windowAction = action;
    button.setAttribute('aria-label', label);
    button.title = label;
    button.textContent = text;
    toolbar.append(button);
    return button;
  }

  function beginDrag(event, panel, item) {
    if (isMobile() || event.button !== 0 || event.target.closest('button')) return;
    event.preventDefault();
    bringToFront(panel, item);
    const origin = { x: event.clientX, y: event.clientY, left: item.x, top: item.y };
    const move = (current) => {
      item.x = origin.left + current.clientX - origin.x;
      item.y = origin.top + current.clientY - origin.y;
      update(panel, item);
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      panel.classList.remove('is-moving');
      saveLayout();
    };
    panel.classList.add('is-moving');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
  }

  function beginResize(event, panel, item, handle) {
    if (isMobile() || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    bringToFront(panel, item);
    const origin = { x: event.clientX, y: event.clientY, width: item.width, height: item.height, left: item.x, top: item.y };
    const move = (current) => {
      const dx = current.clientX - origin.x;
      const dy = current.clientY - origin.y;
      if (handle.includes('e')) item.width = origin.width + dx;
      if (handle.includes('s')) item.height = origin.height + dy;
      if (handle.includes('w')) {
        item.width = origin.width - dx;
        item.x = origin.left + dx;
      }
      if (handle.includes('n')) {
        item.height = origin.height - dy;
        item.y = origin.top + dy;
      }
      update(panel, item);
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      panel.classList.remove('is-resizing');
      saveLayout();
    };
    panel.classList.add('is-resizing');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
  }

  function addPanel(panel, id, index) {
    panel.classList.add('window-panel');
    panel.dataset.windowId = id;
    const item = geometry(panel, id, index);
    const titlebar = document.createElement('div');
    titlebar.className = 'window-titlebar';
    titlebar.tabIndex = 0;
    const title = document.createElement('span');
    title.className = 'window-title';
    title.textContent = selectors[index].title;
    titlebar.append(title);
    const toolbar = document.createElement('span');
    toolbar.className = 'window-toolbar';
    addButton(toolbar, 'minimize', 'Minimize window', '−');
    addButton(toolbar, 'maximize', 'Maximize window', '□');
    addButton(toolbar, 'close', 'Close window', '×');
    titlebar.append(toolbar);
    panel.prepend(titlebar);
    ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'].forEach((handle) => {
      const resize = document.createElement('span');
      resize.className = `window-resize window-resize-${handle}`;
      resize.dataset.resize = handle;
      resize.setAttribute('aria-hidden', 'true');
      panel.append(resize);
      resize.addEventListener('pointerdown', (event) => beginResize(event, panel, item, handle));
    });
    titlebar.addEventListener('pointerdown', (event) => beginDrag(event, panel, item));
    titlebar.addEventListener('keydown', (event) => {
      if (!event.altKey) return;
      const amount = event.shiftKey ? 40 : 12;
      if (event.key === 'ArrowLeft') item.x -= amount;
      if (event.key === 'ArrowRight') item.x += amount;
      if (event.key === 'ArrowUp') item.y -= amount;
      if (event.key === 'ArrowDown') item.y += amount;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        bringToFront(panel, item);
      }
    });
    toolbar.querySelector('[data-window-action="minimize"]').addEventListener('click', () => {
      item.minimized = !item.minimized;
      update(panel, item);
    });
    toolbar.querySelector('[data-window-action="maximize"]').addEventListener('click', () => {
      item.maximized = !item.maximized;
      item.minimized = false;
      update(panel, item);
    });
    toolbar.querySelector('[data-window-action="close"]').addEventListener('click', () => {
      item.visible = false;
      update(panel, item);
      showLauncher();
    });
    panel.addEventListener('pointerdown', () => bringToFront(panel, item));
    update(panel, item);
  }

  function showLauncher() {
    let launcher = document.querySelector('#window-launcher');
    if (launcher) return;
    launcher = document.createElement('div');
    launcher.id = 'window-launcher';
    launcher.setAttribute('aria-label', 'Closed windows');
    document.body.append(launcher);
    selectors.forEach(({ id, title }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `Show ${title}`;
      button.addEventListener('click', () => {
        const panel = document.querySelector(`[data-window-id="${id}"]`);
        if (!panel) return;
        const item = layout.panels[id] || {};
        item.visible = true;
        update(panel, item);
        launcher.remove();
      });
      launcher.append(button);
    });
  }

  function addResetControl() {
    const header = document.querySelector('header');
    if (!header || document.querySelector('#reset-layout')) return;
    const button = document.createElement('button');
    button.id = 'reset-layout';
    button.type = 'button';
    button.textContent = 'Reset workspace';
    button.addEventListener('click', () => {
      selectors.forEach(({ id }) => delete layout.panels[id]);
      saveLayout();
      window.location.reload();
    });
    header.append(button);
  }

  function addMobileQuickStats() {
    const story = document.querySelector('[data-window-id="story"]');
    if (!story || document.querySelector('#mobile-quick-stats')) return;
    const strip = document.createElement('div');
    strip.id = 'mobile-quick-stats';
    strip.setAttribute('aria-label', 'Current character status');
    strip.setAttribute('role', 'status');
    const update = () => {
      const hp = document.querySelector('#hp')?.textContent || '—';
      const ac = document.querySelector('#ac')?.textContent || '—';
      const pack = document.querySelector('#pack')?.textContent || '';
      strip.textContent = `HP ${hp}  ·  AC ${ac}  ·  ${pack.split('\n')[0] || 'Resources ready'}`;
    };
    story.querySelector('.window-titlebar')?.after(strip);
    update();
    new MutationObserver(update).observe(document.querySelector('#game'), { subtree: true, childList: true, characterData: true });
  }

  function init() {
    if (initialized) return;
    const game = document.querySelector('#game');
    if (!game) return;
    initialized = true;
    game.classList.add('window-workspace');
    const map = game.querySelector('#aidmPort');
    if (map) game.append(map);
    selectors.forEach(({ id, selector }, index) => {
      const panel = document.querySelector(selector);
      if (panel) addPanel(panel, id, index);
    });
    addMobileQuickStats();
    addResetControl();
    window.addEventListener('resize', () => {
      document.querySelectorAll('.window-panel').forEach((panel) => {
        const item = layout.panels[panel.dataset.windowId];
        if (item) update(panel, item);
      });
    });
  }

  init();
  new MutationObserver(init).observe(document.body, { childList: true, subtree: true });
})();
