const fs = require('fs');

global.window = global;
global.window.innerWidth = 1024;
global.window.innerHeight = 768;
global.window.devicePixelRatio = 1;
global.window.addEventListener = (ev, fn) => {
  if (ev === 'load') setTimeout(fn, 10);
};
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);

let fillRectCalls = 0;
let strokeCalls = 0;

class Context2DMock {
  constructor() {
    this.fillStyle = '';
    this.strokeStyle = '';
    this.lineWidth = 1;
    this.lineCap = '';
  }
  scale() {}
  setTransform() {}
  fillRect(...args) { fillRectCalls++; }
  strokeRect(...args) {}
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  stroke() { strokeCalls++; }
  fill() {}
  arc() {}
  arcTo() {}
  fillText(...args) {}
  save() {}
  restore() {}
  setLineDash() {}
}

class DOMElement {
  constructor(tag, id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.classList = {
      add: () => {},
      remove: () => {},
      contains: () => false,
    };
    this.style = {};
    this.parentElement = {
      getBoundingClientRect: () => ({ width: 600, height: 600, left: 380, top: 50 }),
      clientWidth: 600,
      clientHeight: 600,
    };
    this.clientWidth = 600;
    this.clientHeight = 600;
    this.value = '2.0';
    this.disabled = false;
    this.children = [];
    this._listeners = {};
    this.innerHTML = '';
    this.textContent = '';
  }
  getContext() { return new Context2DMock(); }
  getBoundingClientRect() { return { width: 600, height: 600, left: 380, top: 50 }; }
  addEventListener(ev, fn) { this._listeners[ev] = fn; }
  querySelector() { return new DOMElement('div'); }
  querySelectorAll() { return [new DOMElement('div'), new DOMElement('div')]; }
  appendChild(c) { this.children.push(c); return c; }
}

const domElements = {};
const ids = [
  'simulation-canvas', 'monitor-angle', 'monitor-pos', 'monitor-force',
  'btn-play-pause', 'btn-reset', 'slider-disturb-strength', 'val-disturb-strength',
  'btn-disturb-minus', 'btn-disturb-plus', 'btn-disturb-left', 'btn-disturb-right',
  'btn-menu-toggle', 'btn-drawer-close', 'side-drawer', 'drawer-backdrop',
  'btn-prev-step', 'btn-next-step', 'accordion-header', 'accordion-body', 'accordion-arrow',
  'step-nav-container', 'step-title', 'step-mission', 'params-container',
  'physics-params-container', 'formula-display', 'theory-content', 'header-step-badge'
];

ids.forEach(id => {
  domElements[id] = new DOMElement('div', id);
});
domElements['simulation-canvas'] = new DOMElement('canvas', 'simulation-canvas');

global.document = {
  getElementById: (id) => domElements[id] || new DOMElement('div', id),
  querySelectorAll: (sel) => [new DOMElement('div'), new DOMElement('div')],
  createElement: (tag) => new DOMElement(tag),
  addEventListener: (ev, fn) => {
    if (ev === 'DOMContentLoaded') fn(); // 即時実行
  },
};

global.ResizeObserver = class {
  constructor(cb) { this.cb = cb; }
  observe() {}
  unobserve() {}
  disconnect() {}
};

try {
  require('./js/physics.js');
  require('./js/controller.js');
  require('./js/renderer.js');
  require('./js/stepManager.js');
  require('./js/main.js');
  console.log('ALL SCRIPTS LOADED AND EXECUTED WITHOUT ANY ERROR!');
  setTimeout(() => {
    console.log('After loop: fillRectCalls =', fillRectCalls, 'strokeCalls =', strokeCalls);
    process.exit(0);
  }, 100);
} catch (e) {
  console.error('ERROR during script load:', e);
  process.exit(1);
}

