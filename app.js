/* =============================================================
   Pomofocus — vanilla JS
   Single-file SPA. Open index.html directly in a browser.
   ============================================================= */

(() => {
  'use strict';

  // =============================================================
  // SECTION 1: JSDoc typedefs
  // =============================================================

  /**
   * @typedef {Object} Task
   * @property {string} id
   * @property {string} name
   * @property {number} estimatedPomodoros
   * @property {number} completedPomodoros
   * @property {boolean} isActive
   * @property {boolean} isCompleted
   * @property {string} [projectId]
   * @property {string} [notes]
   * @property {string|null} [lastCompletedSessionId]
   */

  /**
   * @typedef {Object} FocusSession
   * @property {string} id
   * @property {string|null} taskId
   * @property {string|null} projectId
   * @property {'pomodoro'|'shortBreak'|'longBreak'} mode
   * @property {number} duration
   * @property {string} startedAt
   * @property {string} completedAt
   */

  /**
   * @typedef {Object} Project
   * @property {string} id
   * @property {string} name
   * @property {string} color
   * @property {string} createdAt
   * @property {string} updatedAt
   */

  /**
   * @typedef {Object} Template
   * @property {string} id
   * @property {string} name
   * @property {Array<{name:string, estimatedPomodoros:number}>} tasks
   * @property {string} createdAt
   * @property {string} updatedAt
   */

  /**
   * @typedef {Object} Settings
   * @property {number} pomodoroDuration
   * @property {number} shortBreakDuration
   * @property {number} longBreakDuration
   * @property {string} [timerRunningColor]
   * @property {boolean} autoStartBreaks
   * @property {boolean} autoStartPomodoros
   * @property {'bell'|'digital'|'none'} alarmSound
   * @property {number} alarmVolume
   * @property {number} alarmRepeat
   * @property {{pomodoro:string, shortBreak:string, longBreak:string}} themeColors
   * @property {'12h'|'24h'} hourFormat
   * @property {boolean} darkModeWhenRunning
   * @property {boolean} desktopNotifications
   */

  // =============================================================
  // SECTION 2: Constants & defaults
  // =============================================================

  const MODES = [
    { value: 'pomodoro', label: 'Pomodoro' },
    { value: 'shortBreak', label: 'Short Break' },
    { value: 'longBreak', label: 'Long Break' },
  ];

  const DEFAULT_SETTINGS = {
    pomodoroDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    alarmSound: 'bell',
    alarmVolume: 50,
    alarmRepeat: 3,
    themeColors: { pomodoro: '#BA4949', shortBreak: '#38858A', longBreak: '#397097' },
    hourFormat: '12h',
    darkModeWhenRunning: false,
    desktopNotifications: true,
  };

  const PRESET_COLORS = [
    { name: 'Red', value: '#BA4949' },
    { name: 'Teal', value: '#38858A' },
    { name: 'Blue', value: '#397097' },
    { name: 'Orange', value: '#D97706' },
    { name: 'Purple', value: '#7C3AED' },
    { name: 'Pink', value: '#DB2777' },
    { name: 'Green', value: '#059669' },
    { name: 'Gray', value: '#4B5563' },
  ];

  const STORAGE_KEYS = {
    settings: 'pomofocus-settings',
    tasks: 'pomofocus-tasks',
    projects: 'pomofocus-projects',
    templates: 'pomofocus-templates',
    sessions: 'pomofocus-focus-sessions',
    timerBackup: 'pomofocus-timer-backup',
  };

  const STORAGE_VERSION = 1;
  const TIMER_BACKUP_INTERVAL_MS = 10_000;
  const TIMER_TIME_JUMP_THRESHOLD_MS = 60_000;
  const TIMER_MAX_BACKUP_AGE_MS = 24 * 60 * 60 * 1000;
  const ALARM_DEBOUNCE_MS = 3_000;

  // =============================================================
  // SECTION 3: Inline SVG icons (lucide)
  // =============================================================

  const ICON_ATTRS = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

  const ICONS = {
    'check-circle': `<svg ${ICON_ATTRS}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    'bar-chart': `<svg ${ICON_ATTRS}><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`,
    'settings': `<svg ${ICON_ATTRS}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
    'bell': `<svg ${ICON_ATTRS}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
    'clock': `<svg ${ICON_ATTRS}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    'volume-2': `<svg ${ICON_ATTRS}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
    'x': `<svg ${ICON_ATTRS}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    'palette': `<svg ${ICON_ATTRS}><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
    'music': `<svg ${ICON_ATTRS}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    'check': `<svg ${ICON_ATTRS}><polyline points="20 6 9 17 4 12"/></svg>`,
    'database': `<svg ${ICON_ATTRS}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
    'trash-2': `<svg ${ICON_ATTRS}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    'folder': `<svg ${ICON_ATTRS}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    'more-vertical': `<svg ${ICON_ATTRS}><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>`,
    'layout-template': `<svg ${ICON_ATTRS}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`,
    'grip-vertical': `<svg ${ICON_ATTRS}><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>`,
    'plus': `<svg ${ICON_ATTRS}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    'file-text': `<svg ${ICON_ATTRS}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    'edit-3': `<svg ${ICON_ATTRS}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
    'sticky-note': `<svg ${ICON_ATTRS}><path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/></svg>`,
    'chevron-down': `<svg ${ICON_ATTRS}><polyline points="6 9 12 15 18 9"/></svg>`,
    'minus': `<svg ${ICON_ATTRS}><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    'rotate-ccw': `<svg ${ICON_ATTRS}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
    'list': `<svg ${ICON_ATTRS}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    'chevron-left': `<svg ${ICON_ATTRS}><polyline points="15 18 9 12 15 6"/></svg>`,
    'chevron-right': `<svg ${ICON_ATTRS}><polyline points="9 18 15 12 9 6"/></svg>`,
    'download': `<svg ${ICON_ATTRS}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    'calendar': `<svg ${ICON_ATTRS}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    'flame': `<svg ${ICON_ATTRS}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
    'edit-2': `<svg ${ICON_ATTRS}><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>`,
  };

  // =============================================================
  // SECTION 4: Storage layer
  // =============================================================

  const getStorage = () => {
    try { return localStorage; } catch { return null; }
  };

  const loadJSON = (key, fallback) => {
    const s = getStorage();
    if (!s) return fallback;
    try {
      const raw = s.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && 'data' in parsed) {
        if (parsed.version !== STORAGE_VERSION) return fallback;
        return parsed.data;
      }
      return parsed ?? fallback;
    } catch (err) {
      console.warn('loadJSON failed for', key, err);
      return fallback;
    }
  };

  const saveJSON = (key, data) => {
    const s = getStorage();
    if (!s) return;
    try {
      const payload = { version: STORAGE_VERSION, data, timestamp: Date.now() };
      s.setItem(key, JSON.stringify(payload));
    } catch (err) {
      console.warn('saveJSON failed for', key, err);
    }
  };

  const removeJSON = (key) => {
    const s = getStorage();
    if (!s) return;
    try { s.removeItem(key); } catch {}
  };

  // =============================================================
  // SECTION 5: Audio (Web Audio API)
  // =============================================================

  let audioContext = null;
  let lastAlarmTime = 0;

  const getAudioContext = () => {
    if (!audioContext) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) audioContext = new Ctor();
    }
    return audioContext;
  };

  const initAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  };

  const playBellAlarm = (volume = 50) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    // Master volume bus.
    const master = ctx.createGain();
    master.gain.value = volume / 100;
    master.connect(ctx.destination);

    // Inharmonic partials — the slight detuning from pure integer ratios
    // is what makes this sound like a bell rather than a flute. Tuned around C5.
    const f0 = 523.25;
    const partials = [
      { ratio: 1.0, gain: 0.30, decay: 1.8 },
      { ratio: 2.0, gain: 0.20, decay: 1.2 },
      { ratio: 2.4, gain: 0.13, decay: 0.9 },
      { ratio: 3.0, gain: 0.10, decay: 0.6 },
      { ratio: 4.5, gain: 0.05, decay: 0.4 },
    ];

    partials.forEach(({ ratio, gain, decay }) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f0 * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.003);          // sharp strike
      g.gain.exponentialRampToValueAtTime(0.001, t + decay);     // exponential ring
      osc.connect(g).connect(master);
      osc.start(t);
      osc.stop(t + decay + 0.05);
    });

    // Clapper strike: a brief high-passed noise burst at the moment of
    // impact, simulating the clapper hitting the metal.
    const noiseLen = Math.floor(ctx.sampleRate * 0.05);
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      const env = Math.exp(-i / (ctx.sampleRate * 0.012));
      noiseData[i] = (Math.random() * 2 - 1) * env;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1800;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.35;
    noise.connect(noiseFilter).connect(noiseGain).connect(master);
    noise.start(t);
  };

  const playDigitalAlarm = (volume = 50) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);

    // 2 beeps
    [0, 0.2].forEach(start => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 880;
      const beepGain = ctx.createGain();
      beepGain.gain.setValueAtTime(volume / 100, t + start);
      beepGain.gain.setValueAtTime(0, t + start + 0.1);
      osc.connect(beepGain).connect(gain);
      osc.start(t + start);
      osc.stop(t + start + 0.12);
    });
  };

  // A short mechanical switch sound. rising=true is "on" (start), rising=false is
  // "off" (pause). Three layered components:
  //   1. A brief band-passed noise burst — the metal contact of the switch.
  //   2. A short sine sweep — ascending for on, descending for off.
  //   3. A short triangle "confirmation" tone — slightly higher pitch for on.
  const playSwitchSound = (volume = 50, rising = true) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const vol = volume / 100;

    // 1. Click: brief band-passed noise burst.
    const clickLen = Math.floor(ctx.sampleRate * 0.02);
    const clickBuf = ctx.createBuffer(1, clickLen, ctx.sampleRate);
    const clickData = clickBuf.getChannelData(0);
    for (let i = 0; i < clickLen; i++) {
      const env = Math.exp(-i / (ctx.sampleRate * 0.005));
      clickData[i] = (Math.random() * 2 - 1) * env;
    }
    const clickSrc = ctx.createBufferSource();
    clickSrc.buffer = clickBuf;
    const clickFilter = ctx.createBiquadFilter();
    clickFilter.type = 'bandpass';
    clickFilter.frequency.value = 3000;
    clickFilter.Q.value = 5;
    const clickGain = ctx.createGain();
    clickGain.gain.value = vol * 0.7;
    clickSrc.connect(clickFilter).connect(clickGain).connect(ctx.destination);
    clickSrc.start(t);

    // 2. Pitched sweep: ascending for on, descending for off.
    const sweepOsc = ctx.createOscillator();
    sweepOsc.type = 'sine';
    sweepOsc.frequency.setValueAtTime(rising ? 600 : 1200, t);
    sweepOsc.frequency.exponentialRampToValueAtTime(rising ? 1200 : 600, t + 0.05);
    const sweepGain = ctx.createGain();
    sweepGain.gain.setValueAtTime(0, t);
    sweepGain.gain.linearRampToValueAtTime(vol * 0.5, t + 0.003);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    sweepOsc.connect(sweepGain).connect(ctx.destination);
    sweepOsc.start(t);
    sweepOsc.stop(t + 0.08);

    // 3. Confirmation tone (higher pitch for on, lower for off).
    const confOsc = ctx.createOscillator();
    confOsc.type = 'triangle';
    confOsc.frequency.value = rising ? 2400 : 1800;
    const confGain = ctx.createGain();
    confGain.gain.setValueAtTime(0, t + 0.005);
    confGain.gain.linearRampToValueAtTime(vol * 0.3, t + 0.008);
    confGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    confOsc.connect(confGain).connect(ctx.destination);
    confOsc.start(t + 0.005);
    confOsc.stop(t + 0.06);
  };

  const playAlarm = (sound, volume, repeat) => {
    if (sound === 'none') return;
    const now = Date.now();
    if (now - lastAlarmTime < ALARM_DEBOUNCE_MS) return;
    lastAlarmTime = now;
    const player = sound === 'digital' ? playDigitalAlarm : playBellAlarm;
    player(volume);
    for (let i = 1; i < (repeat || 1); i++) {
      setTimeout(() => player(volume), i * 800);
    }
  };

  // =============================================================
  // SECTION 6: Date / time helpers
  // =============================================================

  const formatMMSS = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatDurationHM = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatDateLong = (date) =>
    new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(date);

  const formatTime12 = (date) =>
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date);

  const formatTime24 = (date) =>
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);

  const localDateKey = (date) => {
    const d = (date instanceof Date) ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatTimeHM = (date) =>
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date);

  const formatShortDate = (date) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);

  const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
  const sameDay = (a, b) => localDateKey(a) === localDateKey(b);

  // =============================================================
  // SECTION 7: DOM helpers
  // =============================================================

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'html') node.innerHTML = v;
      else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? '' : String(v));
    }
    const kids = Array.isArray(children) ? children : [children];
    for (const c of kids) {
      if (c == null || c === false) continue;
      node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
  };

  const setHTML = (node, html) => { node.innerHTML = html; };

  const injectIcons = (root = document) => {
    root.querySelectorAll('[data-icon]').forEach(node => {
      const name = node.dataset.icon;
      if (ICONS[name] && !node.querySelector(':scope > svg')) {
        node.innerHTML = ICONS[name];
      }
    });
  };

  const escapeHTML = (s) => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // =============================================================
  // SECTION 8: State
  // =============================================================

  const state = {
    /** @type {Settings} */
    settings: structuredClone(DEFAULT_SETTINGS),
    /** @type {Task[]} */
    tasks: [],
    /** @type {Project[]} */
    projects: [],
    /** @type {Template[]} */
    templates: [],
    /** @type {FocusSession[]} */
    sessions: [],
    ui: {
      settingsOpen: false,
      settingsTab: 'timer',
      reportsOpen: false,
      reportsTab: 'summary',
      chartRange: '7d', // '7d' | '30d' | '12w' | '12m'
      calendarMonth: new Date(),
      colorPickerFor: null,
      addTaskOpen: false,
      editingTaskId: null,
      taskMenuId: null,
      tasksMenuOpen: false,
      projectManagerOpen: false,
      templateSelectorOpen: false,
      templateBuilderOpen: false,
      confirm: null, // { title, message, danger, onConfirm }
    },
  };

  const loadState = async () => {
    // Try IndexedDB (via PomoDB) first. On any failure, fall back to
    // localStorage so the app still works in restricted environments.
    let data = null;
    try {
      await PomoDB.initDB();
      data = await PomoDB.loadAll();
    } catch (err) {
      console.warn('PomoDB unavailable, falling back to localStorage', err);
    }

    const settingsSrc = (data && data.settings) || loadJSON(STORAGE_KEYS.settings, {});
    state.settings = { ...DEFAULT_SETTINGS, ...settingsSrc };
    if (!state.settings.themeColors) state.settings.themeColors = structuredClone(DEFAULT_SETTINGS.themeColors);

    state.tasks     = (data && data.tasks)     || loadJSON(STORAGE_KEYS.tasks,     []);
    state.projects  = (data && data.projects)  || loadJSON(STORAGE_KEYS.projects,  []);
    state.templates = (data && data.templates) || loadJSON(STORAGE_KEYS.templates, []);
    state.sessions  = (data && data.sessions)  || loadJSON(STORAGE_KEYS.sessions,  []);
  };

  // Writes go through PomoDB (IndexedDB with a localStorage fallback).
  // Each call is fire-and-forget: the in-memory `state` is the source of
  // truth for reads, and the persistence write happens in the background.
  const saveSettings  = () => { PomoDB.saveSettings(state.settings).catch((e) => console.warn('saveSettings', e)); };
  const saveTasks     = () => { PomoDB.saveTasks(state.tasks).catch((e)     => console.warn('saveTasks', e)); };
  const saveProjects  = () => { PomoDB.saveProjects(state.projects).catch((e) => console.warn('saveProjects', e)); };
  const saveTemplates = () => { PomoDB.saveTemplates(state.templates).catch((e) => console.warn('saveTemplates', e)); };
  const saveSessions  = () => { PomoDB.saveSessions(state.sessions).catch((e) => console.warn('saveSessions', e)); }

  // =============================================================
  // SECTION 9: Timer engine
  // =============================================================

  const timer = {
    mode: 'pomodoro',
    status: 'idle', // 'idle' | 'running' | 'paused'
    remainingSeconds: DEFAULT_SETTINGS.pomodoroDuration * 60,
    totalSeconds: DEFAULT_SETTINGS.pomodoroDuration * 60,
    activeTaskId: null,
    startTime: null,     // ms — when current run segment started
    pausedAt: null,      // ms — when paused
    intervalId: null,
    backupIntervalId: null,
    completionFired: false,
    sessionStartTime: null, // ms — when the pomodoro session began
    sessionId: null,
  };

  const getModeSeconds = (mode) => {
    const s = state.settings;
    if (mode === 'pomodoro') return Math.max(1, s.pomodoroDuration * 60);
    if (mode === 'shortBreak') return Math.max(1, s.shortBreakDuration * 60);
    if (mode === 'longBreak') return Math.max(1, s.longBreakDuration * 60);
    return 1500;
  };

  const setTimerMode = (mode) => {
    if (!MODES.some(m => m.value === mode)) return;
    timer.mode = mode;
    timer.status = 'idle';
    timer.totalSeconds = getModeSeconds(mode);
    timer.remainingSeconds = timer.totalSeconds;
    timer.startTime = null;
    timer.pausedAt = null;
    timer.sessionStartTime = null;
    timer.sessionId = null;
    timer.completionFired = false;
    clearTimerInterval();
    clearTimerBackupInterval();
    clearTimerBackup();
    renderModeSelector();
    renderTimerDisplay();
    renderTimerControls();
    renderTimerBackground();
    setSrStatus(`${labelForMode(mode)} ready`);
  };

  const labelForMode = (mode) => MODES.find(m => m.value === mode)?.label || 'Timer';

  const clearTimerInterval = () => {
    if (timer.intervalId) { clearInterval(timer.intervalId); timer.intervalId = null; }
  };
  const clearTimerBackupInterval = () => {
    if (timer.backupIntervalId) { clearInterval(timer.backupIntervalId); timer.backupIntervalId = null; }
  };

  const startTimer = () => {
    if (timer.status === 'running') return;
    initAudio();
    playSwitchSound(state.settings.alarmVolume, true);   // switch ON (rising)

    if (timer.status === 'idle') {
      timer.startTime = Date.now();
    } else if (timer.status === 'paused') {
      // shift startTime forward by pause duration
      const pausedDuration = Date.now() - timer.pausedAt;
      timer.startTime = timer.startTime + pausedDuration;
      timer.pausedAt = null;
    }

    if (timer.mode === 'pomodoro' && !timer.sessionStartTime) {
      timer.sessionStartTime = timer.startTime;
      timer.sessionId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random());
    }

    timer.status = 'running';
    timer.completionFired = false;
    timer.intervalId = setInterval(tick, 100);
    startBackupInterval();
    renderTimerControls();
    renderTimerBackground();
    setSrStatus('Timer running');
  };

  const pauseTimer = () => {
    if (timer.status !== 'running') return;
    initAudio();
    playSwitchSound(state.settings.alarmVolume, false);  // switch OFF (falling)
    timer.pausedAt = Date.now();
    clearTimerInterval();
    timer.status = 'paused';
    renderTimerControls();
    renderTimerBackground();
    setSrStatus('Timer paused');
  };

  const resetTimer = () => {
    clearTimerInterval();
    clearTimerBackupInterval();
    timer.startTime = null;
    timer.pausedAt = null;
    timer.sessionStartTime = null;
    timer.sessionId = null;
    timer.completionFired = false;
    timer.status = 'idle';
    timer.totalSeconds = getModeSeconds(timer.mode);
    timer.remainingSeconds = timer.totalSeconds;
    renderTimerDisplay();
    renderTimerControls();
    renderTimerBackground();
    setSrStatus('Timer reset');
    clearTimerBackup();
  };

  const tick = () => {
    if (!timer.startTime) return;
    const now = Date.now();
    const lastTick = timer._lastTick || now;
    // Detect system clock jump
    if (now < lastTick || (now - lastTick) > TIMER_TIME_JUMP_THRESHOLD_MS) {
      console.warn('System time jump detected, recalibrating');
      timer.startTime = now - (timer.totalSeconds - timer.remainingSeconds) * 1000;
    }
    timer._lastTick = now;
    const elapsed = Math.floor((now - timer.startTime) / 1000);
    const newRemaining = Math.max(0, timer.totalSeconds - elapsed);
    if (newRemaining !== timer.remainingSeconds) {
      timer.remainingSeconds = newRemaining;
      renderTimerDisplay();
    }
    if (newRemaining === 0) {
      finishTimer();
    }
  };

  const finishTimer = () => {
    if (timer.completionFired) return;
    timer.completionFired = true;
    const completedAt = Date.now();

    clearTimerInterval();
    clearTimerBackupInterval();
    timer.status = 'idle';

    if (timer.mode === 'pomodoro') {
      logFocusSession(completedAt);
    }

    initAudio();
    playAlarm(state.settings.alarmSound, state.settings.alarmVolume, state.settings.alarmRepeat);
    notify('Pomodoro complete!', labelForMode(timer.mode === 'pomodoro' ? 'shortBreak' : 'pomodoro') + ' starts now.');

    const wasPomodoro = timer.mode === 'pomodoro';
    const nextMode = wasPomodoro ? 'shortBreak' : 'pomodoro';
    timer.mode = nextMode;
    timer.totalSeconds = getModeSeconds(nextMode);
    timer.remainingSeconds = timer.totalSeconds;
    timer.startTime = null;
    timer.pausedAt = null;
    timer.sessionStartTime = null;
    timer.sessionId = null;
    clearTimerBackup();

    renderModeSelector();
    renderTimerDisplay();
    renderTimerControls();
    renderTimerBackground();
    renderTaskList();
    renderActiveTaskHint();
    setSrStatus(`${labelForMode(nextMode)} ready`);

    const shouldAutoStart = (wasPomodoro && state.settings.autoStartBreaks) ||
                            (!wasPomodoro && state.settings.autoStartPomodoros);
    if (shouldAutoStart) {
      setTimeout(() => startTimer(), 500);
    }
  };

  const logFocusSession = (completedAt) => {
    const activeTask = state.tasks.find(t => t.id === timer.activeTaskId);
    if (!timer.sessionStartTime) return;
    const session = {
      id: timer.sessionId || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      taskId: timer.activeTaskId,
      projectId: activeTask?.projectId || null,
      mode: 'pomodoro',
      duration: timer.totalSeconds,
      startedAt: new Date(timer.sessionStartTime).toISOString(),
      completedAt: new Date(completedAt).toISOString(),
    };
    state.sessions.push(session);
    PomoDB.appendSession(session).catch((e) => console.warn('appendSession', e));
    if (timer.activeTaskId) {
      incrementPomodoro(timer.activeTaskId, timer.sessionId);
    }
  };

  // ---- Timer backup / crash recovery ----

  const startBackupInterval = () => {
    clearTimerBackupInterval();
    timer.backupIntervalId = setInterval(saveTimerBackup, TIMER_BACKUP_INTERVAL_MS);
  };

  const saveTimerBackup = () => {
    if (timer.status === 'idle' && timer.startTime === null) {
      clearTimerBackup();
      return;
    }
    saveJSON(STORAGE_KEYS.timerBackup, {
      remainingSeconds: timer.remainingSeconds,
      totalSeconds: timer.totalSeconds,
      status: timer.status,
      mode: timer.mode,
      startTime: timer.startTime,
      pausedAt: timer.pausedAt,
      updatedAt: Date.now(),
      sessionStartTime: timer.sessionStartTime,
      sessionId: timer.sessionId,
    });
  };

  const clearTimerBackup = () => removeJSON(STORAGE_KEYS.timerBackup);

  const restoreTimerFromBackup = () => {
    const backup = loadJSON(STORAGE_KEYS.timerBackup, null);
    if (!backup) return;

    const age = Date.now() - (backup.updatedAt || 0);
    if (age > TIMER_MAX_BACKUP_AGE_MS) {
      clearTimerBackup();
      return;
    }

    if (!MODES.some(m => m.value === backup.mode)) {
      clearTimerBackup();
      return;
    }

    timer.mode = backup.mode;
    timer.totalSeconds = getModeSeconds(backup.mode);
    timer.remainingSeconds = Math.max(0, backup.remainingSeconds);

    if (backup.status === 'running') {
      const elapsedSinceBackup = Math.max(0, Math.floor((Date.now() - backup.updatedAt) / 1000));
      const recovered = Math.max(0, backup.remainingSeconds - elapsedSinceBackup);
      timer.remainingSeconds = recovered;
      if (recovered === 0) {
        // Session would have completed while away
        timer.startTime = Date.now() - timer.totalSeconds * 1000;
        timer.status = 'running';
        finishTimer();
        return;
      }
      timer.startTime = Date.now() - (timer.totalSeconds - recovered) * 1000;
      timer.sessionStartTime = backup.sessionStartTime || timer.startTime;
      timer.sessionId = backup.sessionId || null;
      timer.status = 'running';
      timer.completionFired = false;
      timer.intervalId = setInterval(tick, 100);
      startBackupInterval();
    } else if (backup.status === 'paused') {
      timer.startTime = backup.startTime;
      timer.pausedAt = backup.pausedAt;
      timer.sessionStartTime = backup.sessionStartTime || null;
      timer.sessionId = backup.sessionId || null;
      timer.status = 'paused';
    } else {
      clearTimerBackup();
      timer.startTime = null;
      timer.pausedAt = null;
      timer.sessionStartTime = null;
      timer.sessionId = null;
      timer.status = 'idle';
    }
  };

  // ---- Tab visibility resync ----

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && timer.status === 'running') {
      tick();
    }
  });

  // =============================================================
  // SECTION 10: Notifications
  // =============================================================

  let notificationPermissionRequested = false;
  const requestNotificationPermission = () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default' && !notificationPermissionRequested) {
      notificationPermissionRequested = true;
      Notification.requestPermission().catch(() => {});
    }
  };

  const notify = (title, body) => {
    if (!state.settings.desktopNotifications) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      new Notification(title, { body, silent: false });
    } catch {}
  };

  // =============================================================
  // SECTION 11: Task operations
  // =============================================================

  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2));

  const addTask = (name, estimatedPomodoros = 1, projectId = null, notes = '') => {
    const task = {
      id: newId(),
      name: name.trim(),
      estimatedPomodoros: Math.max(1, Math.floor(estimatedPomodoros)),
      completedPomodoros: 0,
      isActive: false,
      isCompleted: false,
      projectId: projectId || null,
      notes: notes || '',
      lastCompletedSessionId: null,
    };
    state.tasks.push(task);
    saveTasks();
    renderTaskList();
  };

  const updateTask = (id, patch) => {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    Object.assign(task, patch);
    saveTasks();
    renderTaskList();
    renderActiveTaskHint();
  };

  const deleteTask = (id) => {
    state.tasks = state.tasks.filter(t => t.id !== id);
    if (timer.activeTaskId === id) {
      timer.activeTaskId = null;
    }
    saveTasks();
    renderTaskList();
    renderActiveTaskHint();
  };

  const toggleTaskCompletion = (id) => {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    task.isCompleted = !task.isCompleted;
    if (task.isCompleted) {
      task.isActive = false;
    }
    saveTasks();
    renderTaskList();
    renderActiveTaskHint();
  };

  const setActiveTask = (id) => {
    const idToSet = state.tasks.some(t => t.id === id && !t.isCompleted) ? id : null;
    timer.activeTaskId = idToSet;
    state.tasks.forEach(t => { t.isActive = t.id === idToSet; });
    saveTasks();
    renderTaskList();
    renderActiveTaskHint();
  };

  const clearCompletedTasks = () => {
    state.tasks = state.tasks.filter(t => !t.isCompleted);
    saveTasks();
    renderTaskList();
    renderActiveTaskHint();
  };

  const incrementPomodoro = (id, sessionId) => {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    if (sessionId && task.lastCompletedSessionId === sessionId) return; // dedupe
    task.completedPomodoros += 1;
    task.lastCompletedSessionId = sessionId || null;
    if (task.completedPomodoros >= task.estimatedPomodoros) {
      task.isCompleted = true;
      task.isActive = false;
    }
    saveTasks();
  };

  const reorderTasks = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    const [moved] = state.tasks.splice(fromIndex, 1);
    state.tasks.splice(toIndex, 0, moved);
    saveTasks();
  };

  // =============================================================
  // SECTION 12: Project operations
  // =============================================================

  const addProject = (name, color) => {
    const now = new Date().toISOString();
    state.projects.push({
      id: newId(),
      name: name.trim(),
      color: color || PRESET_COLORS[0].value,
      createdAt: now,
      updatedAt: now,
    });
    saveProjects();
  };

  const updateProject = (id, patch) => {
    const p = state.projects.find(x => x.id === id);
    if (!p) return;
    Object.assign(p, patch, { updatedAt: new Date().toISOString() });
    saveProjects();
  };

  const deleteProject = (id) => {
    state.projects = state.projects.filter(p => p.id !== id);
    state.tasks.forEach(t => { if (t.projectId === id) t.projectId = null; });
    saveProjects();
    saveTasks();
  };

  const getProjectById = (id) => state.projects.find(p => p.id === id) || null;

  // =============================================================
  // SECTION 13: Template operations
  // =============================================================

  const addTemplate = (name, tasks) => {
    const now = new Date().toISOString();
    state.templates.push({
      id: newId(),
      name: name.trim(),
      tasks: tasks.map(t => ({ name: t.name.trim(), estimatedPomodoros: Math.max(1, Math.floor(t.estimatedPomodoros || 1)) })),
      createdAt: now,
      updatedAt: now,
    });
    saveTemplates();
  };

  const deleteTemplate = (id) => {
    state.templates = state.templates.filter(t => t.id !== id);
    saveTemplates();
  };

  const applyTemplate = (templateId) => {
    const tpl = state.templates.find(t => t.id === templateId);
    if (!tpl) return;
    const newTasks = tpl.tasks.map((t, i) => ({
      id: newId(),
      name: t.name,
      estimatedPomodoros: t.estimatedPomodoros,
      completedPomodoros: 0,
      isActive: i === 0,
      isCompleted: false,
      lastCompletedSessionId: null,
    }));
    state.tasks = newTasks;
    timer.activeTaskId = newTasks[0]?.id || null;
    saveTasks();
    renderTaskList();
    renderActiveTaskHint();
  };

  // =============================================================
  // SECTION 14: Render — Timer background, mode, display, controls
  // =============================================================

  const renderTimerBackground = () => {
    const root = $('#root');
    if (!root) return;
    const color = (timer.status === 'running' && state.settings.timerRunningColor)
      ? state.settings.timerRunningColor
      : state.settings.themeColors[timer.mode];
    root.style.setProperty('--theme-color', color);
    // Compute rgb for rgba() use
    const rgb = hexToRgb(color);
    if (rgb) root.style.setProperty('--theme-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    root.dataset.theme = timer.mode;
    root.classList.toggle('dark-overlay', timer.status === 'running' && state.settings.darkModeWhenRunning);
  };

  const hexToRgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return null;
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  };

  const renderModeSelector = () => {
    const root = $('#mode-selector');
    if (!root) return;
    setHTML(root, `<div class="mode-selector-inner">
      ${MODES.map(m => `
        <button type="button" class="mode-btn ${timer.mode === m.value ? 'active' : ''}"
          role="radio" aria-checked="${timer.mode === m.value}"
          data-mode="${m.value}">${m.label}</button>
      `).join('')}
    </div>`);
  };

  const renderTimerDisplay = () => {
    const root = $('#timer-display');
    if (!root) return;
    let time = root.querySelector('.timer-display-time');
    if (!time) {
      setHTML(root, '<div class="timer-display-time"></div>');
      time = root.querySelector('.timer-display-time');
    }
    time.textContent = formatMMSS(timer.remainingSeconds);
  };

  const renderTimerControls = () => {
    const root = $('#timer-controls');
    if (!root) return;
    const isRunning = timer.status === 'running';
    setHTML(root, `
      <button type="button" class="timer-start-btn" id="btn-start">${isRunning ? 'PAUSE' : 'START'}</button>
      <button type="button" class="timer-reset-btn" id="btn-reset" aria-label="Reset timer">
        <span data-icon="rotate-ccw" aria-hidden="true"></span>
      </button>
    `);
    injectIcons(root);
    $('#btn-start').addEventListener('click', () => {
      if (timer.status === 'running') pauseTimer(); else startTimer();
    });
    $('#btn-reset').addEventListener('click', resetTimer);
  };

  const setSrStatus = (msg) => {
    const node = $('#sr-status');
    if (node) node.textContent = msg;
  };

  // =============================================================
  // SECTION 15: Render — Active task hint
  // =============================================================

  const renderActiveTaskHint = () => {
    const root = $('#active-task-hint');
    if (!root) return;
    const remaining = state.tasks.filter(t => !t.isCompleted).length;
    if (remaining === 0) {
      root.innerHTML = '';
      return;
    }
    const active = state.tasks.find(t => t.id === timer.activeTaskId && !t.isCompleted);
    if (active) {
      const idx = state.tasks.filter(t => !t.isCompleted).findIndex(t => t.id === active.id) + 1;
      setHTML(root, `
        <span class="hint-task-name">Task ${idx}:</span> ${escapeHTML(active.name)}
        <span class="hint-sep">&bull;</span>${remaining} remaining
      `);
    } else {
      setHTML(root, `${remaining} task${remaining !== 1 ? 's' : ''} remaining`);
    }
  };

  // =============================================================
  // SECTION 16: Render — Task list (with drag-to-reorder)
  // =============================================================

  let dragState = null; // { fromIndex, overIndex, position: 'before'|'after' }

  let taskListController = null;

  const renderTaskList = () => {
    const root = $('#tasks-section');
    if (!root) return;
    if (taskListController) taskListController.abort();
    taskListController = new AbortController();
    const signal = taskListController.signal;
    const completedCount = state.tasks.filter(t => t.isCompleted).length;

    setHTML(root, `
      <div class="tasks-actions">
        <button type="button" class="btn" id="btn-add-task">+ Add Task</button>
        <div class="tasks-menu-wrap">
          <button type="button" class="btn btn-icon" id="btn-tasks-menu" aria-label="Task options" aria-expanded="false">
            <span data-icon="more-vertical" aria-hidden="true"></span>
          </button>
          ${state.ui.tasksMenuOpen ? renderTasksMenu() : ''}
        </div>
      </div>
      ${state.tasks.length === 0 ? `
        <div class="empty-state">No tasks yet. Add one to start focusing.</div>
      ` : `
        <ul class="task-list" id="task-list">
          ${state.tasks.map((t, i) => renderTaskItem(t, i)).join('')}
        </ul>
      `}
      ${completedCount > 0 ? `
        <button type="button" class="clear-completed-btn" id="btn-clear-completed">
          <span data-icon="trash-2" aria-hidden="true"></span>
          Clear all finished (${completedCount})
        </button>
      ` : ''}
    `);
    injectIcons(root);
    attachTaskListEvents(signal);
  };

  const renderTasksMenu = () => `
    <div class="tasks-menu" role="menu" id="tasks-menu">
      <button type="button" class="tasks-menu-item" data-action="use-template" role="menuitem">
        <span data-icon="layout-template" aria-hidden="true"></span>
        Use Template
      </button>
      <button type="button" class="tasks-menu-item" data-action="save-template" role="menuitem">
        <span data-icon="file-text" aria-hidden="true"></span>
        Save as Template
      </button>
      <button type="button" class="tasks-menu-item" data-action="manage-projects" role="menuitem">
        <span data-icon="folder" aria-hidden="true"></span>
        Manage Projects
      </button>
    </div>
  `;

  const renderTaskItem = (task, index) => {
    const project = getProjectById(task.projectId);
    const isActive = task.id === timer.activeTaskId;
    return `
      <li class="task-item ${task.isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}"
          data-task-id="${task.id}" data-task-index="${index}" draggable="true">
        <span class="task-grip" aria-hidden="true"><span data-icon="grip-vertical"></span></span>
        <button type="button" class="task-checkbox ${task.isCompleted ? 'checked' : ''}"
          aria-label="${task.isCompleted ? 'Mark as not done' : 'Mark as done'}"
          data-action="toggle" data-task-id="${task.id}">
          ${task.isCompleted ? '<span data-icon="check" aria-hidden="true"></span>' : ''}
        </button>
        <div class="task-body">
          <div class="task-name-row">
            <span class="task-name">${escapeHTML(task.name)}</span>
            ${project ? `<span class="task-project-tag" style="background:${project.color}">${escapeHTML(project.name)}</span>` : ''}
            <span class="task-pomos"><span class="pomos-current">${task.completedPomodoros}</span> / ${task.estimatedPomodoros}</span>
          </div>
          ${task.notes ? `<div class="task-notes">${escapeHTML(task.notes)}</div>` : ''}
        </div>
        <button type="button" class="task-menu-btn" aria-label="Task options" data-action="open-menu" data-task-id="${task.id}">
          <span data-icon="more-vertical" aria-hidden="true"></span>
        </button>
        ${state.ui.taskMenuId === task.id ? renderTaskActionsMenu(task) : ''}
      </li>
    `;
  };

  const renderTaskActionsMenu = (task) => `
    <div class="task-actions-menu" data-task-menu-id="${task.id}">
      <button type="button" data-action="set-active" data-task-id="${task.id}">
        <span data-icon="check" aria-hidden="true"></span>${task.id === timer.activeTaskId ? 'Active' : 'Set Active'}
      </button>
      <button type="button" data-action="edit" data-task-id="${task.id}">
        <span data-icon="edit-3" aria-hidden="true"></span>Edit
      </button>
      <button type="button" class="danger" data-action="delete" data-task-id="${task.id}">
        <span data-icon="trash-2" aria-hidden="true"></span>Delete
      </button>
    </div>
  `;

  const attachTaskListEvents = (signal) => {
    const section = $('#tasks-section');
    if (!section) return;

    $('#btn-add-task')?.addEventListener('click', () => {
      state.ui.editingTaskId = null;
      state.ui.addTaskOpen = true;
      openAddTaskDialog();
    });

    $('#btn-tasks-menu')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.ui.tasksMenuOpen = !state.ui.tasksMenuOpen;
      renderTaskList();
    });

    $('#tasks-menu')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      state.ui.tasksMenuOpen = false;
      const action = btn.dataset.action;
      if (action === 'use-template') openTemplateSelector();
      else if (action === 'save-template') openTemplateBuilderFromCurrent();
      else if (action === 'manage-projects') openProjectManager();
    });

    $('#btn-clear-completed')?.addEventListener('click', () => {
      state.ui.confirm = {
        title: 'Clear completed tasks?',
        message: 'This will remove all finished tasks. This cannot be undone.',
        danger: true,
        onConfirm: () => clearCompletedTasks(),
      };
      openConfirmDialog();
    });

    // Per-task events (delegation)
    section.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (!action) return;
      const id = e.target.closest('[data-action]')?.dataset.taskId;
      if (!id) return;

      if (action === 'toggle') toggleTaskCompletion(id);
      else if (action === 'open-menu') {
        state.ui.taskMenuId = state.ui.taskMenuId === id ? null : id;
        renderTaskList();
      } else if (action === 'set-active') {
        setActiveTask(id);
        state.ui.taskMenuId = null;
        renderTaskList();
      } else if (action === 'edit') {
        state.ui.editingTaskId = id;
        state.ui.taskMenuId = null;
        openAddTaskDialog();
      } else if (action === 'delete') {
        const t = state.tasks.find(x => x.id === id);
        if (!t) return;
        state.ui.taskMenuId = null;
        state.ui.confirm = {
          title: 'Delete task?',
          message: `"${t.name}" will be removed. This cannot be undone.`,
          danger: true,
          onConfirm: () => deleteTask(id),
        };
        openConfirmDialog();
      }
    }, { signal });

    // Drag and drop
    attachDragAndDrop();
  };

  const attachDragAndDrop = () => {
    const items = $$('.task-item');
    items.forEach((node) => {
      node.addEventListener('dragstart', onDragStart);
      node.addEventListener('dragend', onDragEnd);
      node.addEventListener('dragover', onDragOver);
      node.addEventListener('dragleave', onDragLeave);
      node.addEventListener('drop', onDrop);
      node.addEventListener('dragenter', onDragEnter);
    });
  };

  const onDragStart = (e) => {
    const li = e.currentTarget;
    const idx = parseInt(li.dataset.taskIndex, 10);
    dragState = { fromIndex: idx, overIndex: idx, position: 'before' };
    li.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const onDragEnter = (e) => {
    e.preventDefault();
    const li = e.currentTarget;
    if (!dragState) return;
    const rect = li.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    dragState.position = e.clientY < midY ? 'before' : 'after';
    // Clear all drop indicators
    $$('.task-item.drop-before, .task-item.drop-after').forEach(n => n.classList.remove('drop-before', 'drop-after'));
    li.classList.add(dragState.position === 'before' ? 'drop-before' : 'drop-after');
    dragState.overIndex = parseInt(li.dataset.taskIndex, 10);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDragLeave = (e) => {
    const li = e.currentTarget;
    // Only clear if we're actually leaving
    if (!li.contains(e.relatedTarget)) {
      li.classList.remove('drop-before', 'drop-after');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    if (!dragState) return;
    const { fromIndex, overIndex, position } = dragState;
    let toIndex = overIndex;
    if (position === 'after') toIndex += 1;
    if (fromIndex < toIndex) toIndex -= 1; // splice accounting
    if (fromIndex !== toIndex) {
      reorderTasks(fromIndex, toIndex);
      renderTaskList();
    }
    dragState = null;
  };

  const onDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    $$('.task-item.drop-before, .task-item.drop-after').forEach(n => n.classList.remove('drop-before', 'drop-after'));
    dragState = null;
  };

  // =============================================================
  // SECTION 17: Render — Footer
  // =============================================================

  let footerIntervalId = null;
  const startFooterClock = () => {
    if (footerIntervalId) return;
    renderFooter();
    footerIntervalId = setInterval(renderFooter, 1000);
  };
  const renderFooter = () => {
    const root = $('#app-footer');
    if (!root) return;
    const now = new Date();
    const today = formatDateLong(now);
    const time = state.settings.hourFormat === '24h' ? formatTime24(now) : formatTime12(now);
    const todayKey = localDateKey(now);
    const completedToday = state.sessions
      .filter(s => s.mode === 'pomodoro' && localDateKey(s.completedAt) === todayKey)
      .length;
    setHTML(root, `
      <div>${escapeHTML(today)} &bull; ${escapeHTML(time)}</div>
      ${completedToday > 0 ? `<div class="app-footer-sub">${completedToday} pomodoro${completedToday !== 1 ? 's' : ''} completed today</div>` : ''}
    `);
  };

  // =============================================================
  // SECTION 18: Modal & dialog management
  // =============================================================

  let modalController = null;
  let dialogController = null;

  const openModal = (html) => {
    if (modalController) modalController.abort();
    modalController = new AbortController();
    $('#modal-root').innerHTML = `<div class="modal-backdrop">${html}</div>`;
    injectIcons($('#modal-root'));
    document.body.style.overflow = 'hidden';
    return modalController.signal;
  };
  const closeModal = () => {
    if (modalController) { modalController.abort(); modalController = null; }
    $('#modal-root').innerHTML = '';
    document.body.style.overflow = '';
  };

  const openDialog = (html) => {
    if (dialogController) dialogController.abort();
    dialogController = new AbortController();
    $('#dialog-root').innerHTML = `<div class="dialog-backdrop">${html}</div>`;
    injectIcons($('#dialog-root'));
    document.body.style.overflow = 'hidden';
    return dialogController.signal;
  };
  const closeDialog = () => {
    if (dialogController) { dialogController.abort(); dialogController = null; }
    $('#dialog-root').innerHTML = '';
    document.body.style.overflow = '';
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if ($('#modal-root').firstChild) closeModal();
      else if ($('#dialog-root').firstChild) closeDialog();
      else if (state.ui.tasksMenuOpen) { state.ui.tasksMenuOpen = false; renderTaskList(); }
      else if (state.ui.taskMenuId) { state.ui.taskMenuId = null; renderTaskList(); }
    }
  });

  document.addEventListener('click', (e) => {
    if (state.ui.tasksMenuOpen && !e.target.closest('#tasks-menu') && !e.target.closest('#btn-tasks-menu')) {
      state.ui.tasksMenuOpen = false;
      renderTaskList();
    }
    if (state.ui.taskMenuId && !e.target.closest('.task-actions-menu') && !e.target.closest('[data-action="open-menu"]')) {
      state.ui.taskMenuId = null;
      renderTaskList();
    }
  });

  // =============================================================
  // SECTION 19: Render — Settings modal
  // =============================================================

  const openSettings = () => {
    state.ui.settingsOpen = true;
    renderSettingsModal();
  };

  const renderSettingsModal = () => {
    const tab = state.ui.settingsTab;
    const s = state.settings;
    const signal = openModal(`
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div class="modal-header">
          <div>
            <div class="modal-eyebrow">Settings</div>
            <h2 id="settings-title" class="modal-title">Timer preferences</h2>
          </div>
          <button type="button" class="modal-close" id="btn-close-modal" aria-label="Close settings">
            <span data-icon="x" aria-hidden="true"></span>
          </button>
        </div>
        <div class="tabs" role="tablist">
          <button type="button" class="tab-btn ${tab==='timer'?'active':''}" data-tab="timer" role="tab" aria-selected="${tab==='timer'}">
            <span data-icon="clock" aria-hidden="true"></span>Timer
          </button>
          <button type="button" class="tab-btn ${tab==='sound'?'active':''}" data-tab="sound" role="tab" aria-selected="${tab==='sound'}">
            <span data-icon="music" aria-hidden="true"></span>Sound
          </button>
          <button type="button" class="tab-btn ${tab==='theme'?'active':''}" data-tab="theme" role="tab" aria-selected="${tab==='theme'}">
            <span data-icon="palette" aria-hidden="true"></span>Theme
          </button>
        </div>
        <div id="settings-tab-content">
          ${tab === 'timer' ? renderSettingsTimerTab(s) : ''}
          ${tab === 'sound' ? renderSettingsSoundTab(s) : ''}
          ${tab === 'theme' ? renderSettingsThemeTab(s) : ''}
        </div>
      </div>
    `);
    attachSettingsEvents(signal);
  };

  const renderSettingsTimerTab = (s) => `
    <div class="section-card">
      <div class="section-card-title"><span data-icon="clock" aria-hidden="true"></span>Timer Durations (minutes)</div>
      <div class="field-grid-3">
        <label class="field">Pomodoro
          <input type="number" min="0.1" max="180" step="0.1" value="${s.pomodoroDuration}" data-setting="pomodoroDuration" />
        </label>
        <label class="field">Short Break
          <input type="number" min="0.1" max="180" step="0.1" value="${s.shortBreakDuration}" data-setting="shortBreakDuration" />
        </label>
        <label class="field">Long Break
          <input type="number" min="0.1" max="180" step="0.1" value="${s.longBreakDuration}" data-setting="longBreakDuration" />
        </label>
      </div>
      <p class="section-card-hint">Tip: Use 0.1 minutes (6 seconds) for quick testing</p>
    </div>
    <div class="section-card">
      <div class="section-card-title">Auto-start</div>
      <button type="button" class="toggle-row" data-toggle="autoStartBreaks" aria-pressed="${s.autoStartBreaks}">
        <span class="toggle-row-label">Auto-start breaks</span>
        <span class="toggle-switch" aria-hidden="true"></span>
      </button>
      <button type="button" class="toggle-row" data-toggle="autoStartPomodoros" aria-pressed="${s.autoStartPomodoros}">
        <span class="toggle-row-label">Auto-start pomodoros</span>
        <span class="toggle-switch" aria-hidden="true"></span>
      </button>
    </div>
    <div class="section-card">
      <div class="section-card-title"><span data-icon="bell" aria-hidden="true"></span>Notifications</div>
      <button type="button" class="toggle-row" data-toggle="desktopNotifications" aria-pressed="${s.desktopNotifications}">
        <span class="toggle-row-label">Desktop notifications</span>
        <span class="toggle-switch" aria-hidden="true"></span>
      </button>
    </div>
  `;

  const renderSettingsSoundTab = (s) => `
    <div class="section-card">
      <div class="section-card-title"><span data-icon="volume-2" aria-hidden="true"></span>Alarm Sound</div>
      <label class="field">Alarm sound
        <select data-setting="alarmSound">
          <option value="bell" ${s.alarmSound==='bell'?'selected':''}>Bell</option>
          <option value="digital" ${s.alarmSound==='digital'?'selected':''}>Digital</option>
          <option value="none" ${s.alarmSound==='none'?'selected':''}>None</option>
        </select>
      </label>
      <div class="slider-row">
        <div class="slider-row-head"><span>Alarm volume</span><span aria-live="polite">${s.alarmVolume}%</span></div>
        <input type="range" min="0" max="100" value="${s.alarmVolume}" data-setting="alarmVolume" />
      </div>
      <div class="slider-row">
        <div class="slider-row-head"><span>Alarm repeat</span><span aria-live="polite">${s.alarmRepeat} time${s.alarmRepeat!==1?'s':''}</span></div>
        <input type="range" min="1" max="5" value="${s.alarmRepeat}" data-setting="alarmRepeat" />
      </div>
      <button type="button" class="btn btn-block" id="btn-test-alarm" style="margin-top:1rem" ${s.alarmSound==='none'?'disabled':''}>Test Alarm</button>
    </div>
  `;

  const renderSettingsThemeTab = (s) => `
    <div class="section-card">
      <div class="section-card-title"><span data-icon="palette" aria-hidden="true"></span>Color Themes</div>
      <div class="color-row">
        <span class="color-row-label">Mode colors</span>
        <div class="color-swatches">
          ${MODES.map(m => `
            <button type="button" class="color-swatch" style="background:${s.themeColors[m.value]}"
              data-color-mode="${m.value}" aria-label="${m.label} color"></button>
          `).join('')}
        </div>
      </div>
      ${state.ui.colorPickerFor ? renderColorPicker(s) : ''}
    </div>
    <div class="section-card">
      <div class="section-card-title">Time Format</div>
      <div class="hour-format-row">
        <button type="button" class="hour-format-btn ${s.hourFormat==='12h'?'active':''}" data-hour="12h">12-hour (1:30 PM)</button>
        <button type="button" class="hour-format-btn ${s.hourFormat==='24h'?'active':''}" data-hour="24h">24-hour (13:30)</button>
      </div>
    </div>
    <div class="section-card">
      <div class="section-card-title">Dark Mode</div>
      <button type="button" class="toggle-row" data-toggle="darkModeWhenRunning" aria-pressed="${s.darkModeWhenRunning}">
        <span class="toggle-row-label">Dark mode when timer is running</span>
        <span class="toggle-switch" aria-hidden="true"></span>
      </button>
      <p class="section-card-hint">Dims the interface when the timer is running to reduce distractions</p>
    </div>
    <div class="section-card">
      <div class="section-card-title">Timer Running Color</div>
      <label class="field">Custom color when timer is running
        <div class="color-input-row">
          <input type="color" value="${s.timerRunningColor || '#AF4949'}" data-setting="timerRunningColor" />
          <span class="color-input-text">${s.timerRunningColor || '#AF4949'}</span>
        </div>
      </label>
    </div>
  `;

  const renderColorPicker = (s) => {
    const mode = state.ui.colorPickerFor;
    const label = MODES.find(m => m.value === mode)?.label || mode;
    return `
      <div class="color-picker-pop">
        <div class="color-picker-pop-title">Pick a color for ${escapeHTML(label)}</div>
        <div class="color-picker-pop-grid">
          ${PRESET_COLORS.map(c => `
            <button type="button" class="color-swatch ${s.themeColors[mode] === c.value ? 'selected' : ''}"
              style="background:${c.value}" data-pick-color="${c.value}" data-pick-mode="${mode}" aria-label="${c.name}">
              ${s.themeColors[mode] === c.value ? '<span data-icon="check" aria-hidden="true"></span>' : ''}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  };

  const attachSettingsEvents = (signal) => {
    $('#btn-close-modal')?.addEventListener('click', () => { state.ui.settingsOpen = false; closeModal(); });
    // Event delegation
    $('#modal-root').addEventListener('click', (e) => {
      // Click outside the modal to close
      if (e.target.classList.contains('modal-backdrop')) {
        state.ui.settingsOpen = false;
        closeModal();
        return;
      }
      if (!signal || signal.aborted) return;
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) {
        state.ui.settingsTab = tabBtn.dataset.tab;
        renderSettingsModal();
        return;
      }
      const toggle = e.target.closest('[data-toggle]');
      if (toggle) {
        const key = toggle.dataset.toggle;
        state.settings[key] = !state.settings[key];
        saveSettings();
        renderSettingsModal();
        if (key === 'darkModeWhenRunning') renderTimerBackground();
        if (key === 'desktopNotifications' && state.settings.desktopNotifications) requestNotificationPermission();
        return;
      }
      const setting = e.target.closest('[data-setting]');
      if (setting) {
        const key = setting.dataset.setting;
        let value = setting.value;
        if (setting.type === 'number') {
          value = (key.endsWith('Duration')) ? (parseFloat(value) || 0.1) : (parseInt(value, 10) || 0);
          value = clamp(value, parseFloat(setting.min || 0), parseFloat(setting.max || 1000));
        } else if (setting.type === 'range') {
          value = parseInt(value, 10) || 0;
        }
        state.settings[key] = value;
        saveSettings();
        if (key.endsWith('Duration')) {
          // Update timer if not running
          if (timer.status !== 'running') {
            timer.totalSeconds = getModeSeconds(timer.mode);
            timer.remainingSeconds = timer.totalSeconds;
            renderTimerDisplay();
          }
        }
        if (key === 'timerRunningColor') {
          // Update text
          const text = setting.parentElement.querySelector('.color-input-text');
          if (text) text.textContent = value;
          renderTimerBackground();
        }
        // Re-render to update slider labels
        if (setting.type === 'range') {
          renderSettingsModal();
        }
        return;
      }
      const hourBtn = e.target.closest('[data-hour]');
      if (hourBtn) {
        state.settings.hourFormat = hourBtn.dataset.hour;
        saveSettings();
        renderSettingsModal();
        renderFooter();
        return;
      }
      const colorModeBtn = e.target.closest('[data-color-mode]');
      if (colorModeBtn) {
        state.ui.colorPickerFor = state.ui.colorPickerFor === colorModeBtn.dataset.colorMode ? null : colorModeBtn.dataset.colorMode;
        renderSettingsModal();
        return;
      }
      const pickColor = e.target.closest('[data-pick-color]');
      if (pickColor) {
        state.settings.themeColors[pickColor.dataset.pickMode] = pickColor.dataset.pickColor;
        state.ui.colorPickerFor = null;
        saveSettings();
        renderSettingsModal();
        renderTimerBackground();
        return;
      }
      if (e.target.closest('#btn-test-alarm')) {
        initAudio();
        playAlarm(state.settings.alarmSound, state.settings.alarmVolume, 1);
        return;
      }
    }, { signal });
    $('#modal-root').addEventListener('input', (e) => {
      const setting = e.target.closest('[data-setting]');
      if (!setting) return;
      const key = setting.dataset.setting;
      let value = setting.value;
      if (setting.type === 'number') value = parseFloat(value) || 0.1;
      else if (setting.type === 'range') value = parseInt(value, 10) || 0;
      state.settings[key] = value;
      saveSettings();
      if (key === 'timerRunningColor') {
        const text = setting.parentElement.querySelector('.color-input-text');
        if (text) text.textContent = value;
        renderTimerBackground();
      }
      if (setting.type === 'range') {
        // Update label inline
        const head = setting.previousElementSibling;
        if (head) {
          const span = head.querySelector('span[aria-live]');
          if (span) {
            if (key === 'alarmVolume') span.textContent = value + '%';
            else if (key === 'alarmRepeat') span.textContent = value + (value !== 1 ? ' times' : ' time');
          }
        }
        if (key === 'alarmVolume' && state.settings.alarmSound !== 'none') {
          initAudio();
          playBellAlarm(value);
        }
      }
    }, { signal });
  };

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  // =============================================================
  // SECTION 20: Render — Reports modal
  // =============================================================

  let reportRange = '7d'; // '7d' | '30d' | '12w' | '12m'
  let calendarMonth = new Date();

  const openReports = () => {
    state.ui.reportsOpen = true;
    renderReportsModal();
  };

  const renderReportsModal = () => {
    const tab = state.ui.reportsTab;
    const signal = openModal(`
      <div class="modal modal-large" role="dialog" aria-modal="true" aria-labelledby="reports-title">
        <div class="modal-header">
          <div>
            <div class="modal-eyebrow">Reports</div>
            <h2 id="reports-title" class="modal-title">Focus Activity</h2>
          </div>
          <button type="button" class="modal-close" id="btn-close-modal" aria-label="Close reports">
            <span data-icon="x" aria-hidden="true"></span>
          </button>
        </div>
        <div class="tabs" role="tablist">
          <button type="button" class="tab-btn ${tab==='summary'?'active':''}" data-rtab="summary" role="tab">
            <span data-icon="bar-chart" aria-hidden="true"></span>Summary
          </button>
          <button type="button" class="tab-btn ${tab==='detail'?'active':''}" data-rtab="detail" role="tab">
            <span data-icon="list" aria-hidden="true"></span>Detail
          </button>
        </div>
        <div>
          ${tab === 'summary' ? renderReportSummary() : ''}
          ${tab === 'detail' ? renderReportDetail() : ''}
        </div>
      </div>
    `);
    attachReportsEvents(signal);
  };

  const pomodoroSessions = () => state.sessions.filter(s => s.mode === 'pomodoro');

  const getSummaryStats = () => {
    const sessions = pomodoroSessions();
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0) / 60;
    const days = new Set(sessions.map(s => localDateKey(s.completedAt))).size;
    const today = localDateKey(new Date());
    const todayCount = sessions.filter(s => localDateKey(s.completedAt) === today).length;
    return {
      totalSessions: sessions.length,
      totalHours: totalMinutes / 60,
      daysAccessed: days,
      todayCount,
      streak: getCurrentStreak(sessions),
    };
  };

  const getCurrentStreak = (sessions) => {
    if (sessions.length === 0) return 0;
    const dates = new Set(sessions.map(s => localDateKey(s.completedAt)));
    const today = new Date();
    let streak = 0;
    let cursor = new Date(today);
    // Allow today to be empty without breaking streak
    if (!dates.has(localDateKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (dates.has(localDateKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  };

  const renderReportSummary = () => {
    const stats = getSummaryStats();
    return `
      <div class="report-stats">
        <div class="stat-card">
          <div class="stat-label">Today</div>
          <div class="stat-value">${stats.todayCount}</div>
          <div class="stat-sub">pomodoros</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total</div>
          <div class="stat-value">${stats.totalSessions}</div>
          <div class="stat-sub">pomodoros</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Focused</div>
          <div class="stat-value">${stats.totalHours.toFixed(1)}</div>
          <div class="stat-sub">hours</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Streak</div>
          <div class="stat-value">${stats.streak}</div>
          <div class="stat-sub">${stats.streak === 1 ? 'day' : 'days'}</div>
        </div>
      </div>
      ${renderBarChartCard()}
      ${renderCalendarCard()}
    `;
  };

  const renderBarChartCard = () => {
    const data = computeChartData(reportRange);
    const totalMin = data.reduce((s, d) => s + d.minutes, 0);
    return `
      <div class="bar-chart-wrap">
        <div class="bar-chart-head">
          <div class="bar-chart-title">Activity — ${dataLabelForRange(reportRange)} (${formatDurationHM(totalMin * 60)})</div>
          <div class="bar-chart-range-btns" role="tablist">
            <button type="button" class="${reportRange==='7d'?'active':''}" data-range="7d">7d</button>
            <button type="button" class="${reportRange==='30d'?'active':''}" data-range="30d">30d</button>
            <button type="button" class="${reportRange==='12w'?'active':''}" data-range="12w">12w</button>
            <button type="button" class="${reportRange==='12m'?'active':''}" data-range="12m">12m</button>
          </div>
        </div>
        ${data.length === 0 || data.every(d => d.minutes === 0) ? `
          <div class="bar-chart-empty">No sessions in this range yet.</div>
        ` : renderBarChartSVG(data)}
      </div>
    `;
  };

  const dataLabelForRange = (r) => {
    if (r === '7d') return 'last 7 days';
    if (r === '30d') return 'last 30 days';
    if (r === '12w') return 'last 12 weeks';
    return 'last 12 months';
  };

  const computeChartData = (range) => {
    const sessions = pomodoroSessions();
    const now = startOfDay(new Date());
    if (range === '7d') {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = addDays(now, -i);
        const key = localDateKey(d);
        const min = sessions.filter(s => localDateKey(s.completedAt) === key).reduce((sum, s) => sum + s.duration, 0) / 60;
        days.push({ label: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d), key, minutes: min });
      }
      return days;
    }
    if (range === '30d') {
      const days = [];
      for (let i = 29; i >= 0; i--) {
        const d = addDays(now, -i);
        const key = localDateKey(d);
        const min = sessions.filter(s => localDateKey(s.completedAt) === key).reduce((sum, s) => sum + s.duration, 0) / 60;
        const showLabel = i % 5 === 0;
        days.push({ label: showLabel ? new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric' }).format(d) : '', key, minutes: min });
      }
      return days;
    }
    if (range === '12w') {
      // Last 12 ISO weeks (Mon-Sun)
      const weeks = [];
      for (let i = 11; i >= 0; i--) {
        const end = addDays(now, -i * 7);
        const start = addDays(end, -6);
        const min = sessions.filter(s => {
          const t = new Date(s.completedAt).getTime();
          return t >= start.getTime() && t <= end.getTime() + 86400000;
        }).reduce((sum, s) => sum + s.duration, 0) / 60;
        weeks.push({ label: new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric' }).format(start), key: localDateKey(start), minutes: min });
      }
      return weeks;
    }
    // 12m
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const min = sessions.filter(s => {
        const t = new Date(s.completedAt).getTime();
        return t >= d.getTime() && t < next.getTime();
      }).reduce((sum, s) => sum + s.duration, 0) / 60;
      months.push({ label: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(d), key: localDateKey(d), minutes: min });
    }
    return months;
  };

  const renderBarChartSVG = (data) => {
    const width = 600;
    const height = 200;
    const padTop = 16;
    const padBottom = 28;
    const padLeft = 32;
    const padRight = 8;
    const innerW = width - padLeft - padRight;
    const innerH = height - padTop - padBottom;
    const maxV = Math.max(1, ...data.map(d => d.minutes));
    const niceMax = niceCeil(maxV);
    const barW = innerW / data.length;
    const bars = data.map((d, i) => {
      const h = (d.minutes / niceMax) * innerH;
      const x = padLeft + i * barW + barW * 0.15;
      const y = padTop + innerH - h;
      const w = barW * 0.7;
      const valueLabel = d.minutes > 0 ? `<text class="bar-value" x="${x + w/2}" y="${y - 3}" text-anchor="middle">${d.minutes < 1 ? Math.round(d.minutes * 60) + 'm' : d.minutes.toFixed(0) + 'm'}</text>` : '';
      return `${valueLabel}<rect class="bar" x="${x}" y="${y}" width="${w}" height="${h}" rx="2"></rect>`;
    }).join('');
    // Y-axis labels
    const yLabels = [0, niceMax/2, niceMax].map((v, i) => {
      const y = padTop + innerH - (v / niceMax) * innerH;
      return `<text class="axis-label" x="${padLeft - 6}" y="${y + 3}" text-anchor="end">${Math.round(v)}m</text>
              <line class="axis-line" x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}"></line>`;
    }).join('');
    // X-axis labels (sparse)
    const xLabels = data.map((d, i) => {
      if (!d.label) return '';
      const x = padLeft + i * barW + barW / 2;
      return `<text class="axis-label" x="${x}" y="${height - 8}" text-anchor="middle">${escapeHTML(d.label)}</text>`;
    }).join('');
    return `<svg class="bar-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">${yLabels}${xLabels}${bars}</svg>`;
  };

  const niceCeil = (v) => {
    if (v <= 0) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / pow;
    let nice;
    if (n <= 1) nice = 1;
    else if (n <= 2) nice = 2;
    else if (n <= 5) nice = 5;
    else nice = 10;
    return nice * pow;
  };

  const renderCalendarCard = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    const sessions = pomodoroSessions();
    const sessionCountByKey = {};
    sessions.forEach(s => {
      const k = localDateKey(s.completedAt);
      sessionCountByKey[k] = (sessionCountByKey[k] || 0) + 1;
    });
    const firstWeekday = firstDay.getDay(); // 0=Sun
    const days = [];
    for (let i = 0; i < firstWeekday; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const key = localDateKey(date);
      const count = sessionCountByKey[key] || 0;
      days.push({ d, date, key, count, isToday: sameDay(date, today) });
    }
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(firstDay);
    return `
      <div class="calendar">
        <div class="calendar-head">
          <div class="calendar-title">${escapeHTML(monthLabel)}</div>
          <div class="calendar-nav">
            <button type="button" id="cal-prev" aria-label="Previous month"><span data-icon="chevron-left" aria-hidden="true"></span></button>
            <button type="button" id="cal-next" aria-label="Next month"><span data-icon="chevron-right" aria-hidden="true"></span></button>
          </div>
        </div>
        <div class="calendar-weekdays">
          ${weekdays.map(w => `<div class="calendar-weekday">${w}</div>`).join('')}
        </div>
        <div class="calendar-grid">
          ${days.map(day => day ? `
            <div class="calendar-day ${day.count > 0 ? 'has-sessions' : ''} ${day.isToday ? 'today' : ''}">
              <span class="day-num">${day.d}</span>
              ${day.count > 0 ? `<span class="day-count">${day.count}p</span>` : ''}
            </div>
          ` : `<div class="calendar-day empty"></div>`).join('')}
        </div>
        <div class="calendar-legend">
          <span><span class="calendar-legend-swatch" style="background:rgba(var(--theme-color-rgb),0.4)"></span>Has sessions</span>
          <span><span class="calendar-legend-swatch" style="background:#ffffff;outline:2px solid white"></span>Today</span>
        </div>
      </div>
    `;
  };

  const renderReportDetail = () => {
    const sessions = [...state.sessions].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    return `
      <div class="session-list">
        <div class="session-list-head">
          <div class="session-list-title">All sessions (${sessions.length})</div>
          <button type="button" class="export-btn" id="btn-export-csv" ${sessions.length === 0 ? 'disabled' : ''}>
            <span data-icon="download" aria-hidden="true"></span>Export CSV
          </button>
        </div>
        ${sessions.length === 0 ? `<div class="empty-state">No sessions yet. Complete a pomodoro to get started.</div>` : sessions.map(renderSessionRow).join('')}
      </div>
    `;
  };

  const renderSessionRow = (session) => {
    const task = state.tasks.find(t => t.id === session.taskId);
    const project = getProjectById(session.projectId);
    const date = new Date(session.completedAt);
    const time = formatTimeHM(date);
    const taskLabel = task ? task.name : 'No task';
    return `
      <div class="session-row" data-session-id="${session.id}">
        <span class="session-mode-icon" data-icon="${session.mode === 'pomodoro' ? 'check-circle' : 'clock'}" aria-hidden="true"></span>
        <span class="session-task ${task ? '' : 'muted'}">
          ${escapeHTML(taskLabel)}${project ? ` <span style="opacity:0.7">· ${escapeHTML(project.name)}</span>` : ''}
        </span>
        <span class="session-duration">${formatDurationHM(session.duration)}</span>
        <span class="session-duration" style="opacity:0.6">${formatShortDate(date)} ${time}</span>
        <button type="button" class="session-delete" data-delete-session="${session.id}" aria-label="Delete session">
          <span data-icon="trash-2" aria-hidden="true"></span>
        </button>
      </div>
    `;
  };

  const attachReportsEvents = (signal) => {
    $('#btn-close-modal')?.addEventListener('click', () => { state.ui.reportsOpen = false; closeModal(); });
    $('#modal-root').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop')) { state.ui.reportsOpen = false; closeModal(); return; }
      const rtab = e.target.closest('[data-rtab]');
      if (rtab) { state.ui.reportsTab = rtab.dataset.rtab; renderReportsModal(); return; }
      const range = e.target.closest('[data-range]');
      if (range) { reportRange = range.dataset.range; renderReportsModal(); return; }
      if (e.target.closest('#cal-prev')) { calendarMonth = addMonths(calendarMonth, -1); renderReportsModal(); return; }
      if (e.target.closest('#cal-next')) { calendarMonth = addMonths(calendarMonth, 1); renderReportsModal(); return; }
      if (e.target.closest('#btn-export-csv')) { exportSessionsCSV(); return; }
      const delBtn = e.target.closest('[data-delete-session]');
      if (delBtn) {
        const id = delBtn.dataset.deleteSession;
        const session = state.sessions.find(s => s.id === id);
        const taskName = session && state.tasks.find(t => t.id === session.taskId)?.name;
        state.ui.confirm = {
          title: 'Delete session?',
          message: `Remove this ${session ? formatDurationHM(session.duration) : ''} session${taskName ? ` for "${taskName}"` : ''}?`,
          danger: true,
          onConfirm: () => {
            state.sessions = state.sessions.filter(s => s.id !== id);
            PomoDB.deleteSession(id).catch((e) => console.warn('deleteSession', e));
            renderReportsModal();
          },
        };
        openConfirmDialog();
      }
    }, { signal });
  };

  // =============================================================
  // SECTION 21: CSV export
  // =============================================================

  const exportSessionsCSV = () => {
    const rows = [
      ['Date', 'Time', 'Mode', 'Task', 'Project', 'Duration (seconds)', 'Duration (formatted)'],
      ...state.sessions
        .slice()
        .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
        .map(s => {
          const date = new Date(s.completedAt);
          const task = state.tasks.find(t => t.id === s.taskId);
          const project = getProjectById(s.projectId);
          return [
            localDateKey(date),
            formatTimeHM(date),
            s.mode,
            task ? task.name.replace(/"/g, '""') : '',
            project ? project.name.replace(/"/g, '""') : '',
            String(s.duration),
            formatDurationHM(s.duration),
          ];
        }),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pomofocus-sessions-${localDateKey(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // =============================================================
  // SECTION 22: Render — Add/Edit task dialog
  // =============================================================

  const openAddTaskDialog = () => {
    const editing = state.ui.editingTaskId ? state.tasks.find(t => t.id === state.ui.editingTaskId) : null;
    renderAddTaskDialog(editing);
  };

  let addTaskState = { name: '', estimatedPomodoros: 1, projectId: null, notes: '' };
  let addTaskShowNotes = false;

  const renderAddTaskDialog = (editing) => {
    if (editing) {
      addTaskState = {
        name: editing.name,
        estimatedPomodoros: editing.estimatedPomodoros,
        projectId: editing.projectId || null,
        notes: editing.notes || '',
      };
      addTaskShowNotes = Boolean(editing.notes);
    } else {
      addTaskState = { name: '', estimatedPomodoros: 1, projectId: null, notes: '' };
      addTaskShowNotes = false;
    }
    openDialog(`
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="add-task-title">
        <h3 id="add-task-title" class="dialog-title">${editing ? 'Edit Task' : 'Add Task'}</h3>
        <div class="dialog-body">
          <label class="field">Name
            <input type="text" id="task-name" placeholder="What are you working on?" value="${escapeHTML(addTaskState.name)}" autocomplete="off" />
          </label>
          <div class="field">
            <span>Est. Pomodoros</span>
            <div class="pomo-stepper" style="margin-top:0.75rem">
              <button type="button" id="pomo-dec" ${addTaskState.estimatedPomodoros <= 1 ? 'disabled' : ''}>
                <span data-icon="minus" aria-hidden="true"></span>
              </button>
              <span class="pomo-stepper-value" id="pomo-val">${addTaskState.estimatedPomodoros}</span>
              <button type="button" id="pomo-inc">
                <span data-icon="plus" aria-hidden="true"></span>
              </button>
            </div>
          </div>
          <div class="field">
            <span>Project</span>
            <div class="project-select-row" style="margin-top:0.75rem">
              <select id="task-project">
                <option value="">None</option>
                ${state.projects.map(p => `
                  <option value="${p.id}" ${p.id === addTaskState.projectId ? 'selected' : ''}>${escapeHTML(p.name)}</option>
                `).join('')}
              </select>
              <button type="button" class="link-btn" id="btn-manage-projects-inline">+ New</button>
            </div>
          </div>
          ${addTaskShowNotes ? `
            <label class="field">Notes
              <textarea id="task-notes" placeholder="Add notes (supports line breaks)" rows="4">${escapeHTML(addTaskState.notes)}</textarea>
            </label>
          ` : `
            <button type="button" class="notes-toggle" id="btn-add-notes">
              <span data-icon="sticky-note" aria-hidden="true"></span>Add notes
            </button>
          `}
          <div class="dialog-actions">
            <button type="button" class="btn" id="btn-cancel-task">Cancel</button>
            <button type="button" class="btn btn-primary" id="btn-save-task">${editing ? 'Save' : 'Add Task'}</button>
          </div>
        </div>
      </div>
    `);
    attachAddTaskEvents(editing);
    // Focus name field
    setTimeout(() => $('#task-name')?.focus(), 0);
  };

  const attachAddTaskEvents = (editing) => {
    $('#btn-cancel-task')?.addEventListener('click', () => { state.ui.addTaskOpen = false; state.ui.editingTaskId = null; closeDialog(); });
    $('#btn-add-notes')?.addEventListener('click', () => { addTaskShowNotes = true; renderAddTaskDialog(editing); });
    $('#btn-manage-projects-inline')?.addEventListener('click', () => {
      // Close task dialog, open project manager
      state.ui.addTaskOpen = true; // remember to reopen
      closeDialog();
      openProjectManager();
    });
    $('#pomo-inc')?.addEventListener('click', () => {
      addTaskState.estimatedPomodoros = Math.min(20, addTaskState.estimatedPomodoros + 1);
      $('#pomo-val').textContent = addTaskState.estimatedPomodoros;
      $('#pomo-dec').disabled = addTaskState.estimatedPomodoros <= 1;
    });
    $('#pomo-dec')?.addEventListener('click', () => {
      addTaskState.estimatedPomodoros = Math.max(1, addTaskState.estimatedPomodoros - 1);
      $('#pomo-val').textContent = addTaskState.estimatedPomodoros;
      $('#pomo-dec').disabled = addTaskState.estimatedPomodoros <= 1;
    });
    $('#task-name')?.addEventListener('input', (e) => { addTaskState.name = e.target.value; });
    $('#task-project')?.addEventListener('change', (e) => { addTaskState.projectId = e.target.value || null; });
    $('#task-notes')?.addEventListener('input', (e) => { addTaskState.notes = e.target.value; });
    $('#btn-save-task')?.addEventListener('click', () => {
      const name = addTaskState.name.trim();
      if (!name) { $('#task-name').focus(); return; }
      if (editing) {
        updateTask(editing.id, {
          name,
          estimatedPomodoros: addTaskState.estimatedPomodoros,
          projectId: addTaskState.projectId,
          notes: addTaskState.notes,
        });
      } else {
        addTask(name, addTaskState.estimatedPomodoros, addTaskState.projectId, addTaskState.notes);
      }
      state.ui.addTaskOpen = false;
      state.ui.editingTaskId = null;
      closeDialog();
    });
  };

  // =============================================================
  // SECTION 23: Render — Project manager dialog
  // =============================================================

  const openProjectManager = () => {
    renderProjectManager();
  };

  let projectNewColor = PRESET_COLORS[0].value;

  const renderProjectManager = () => {
    const signal = openDialog(`
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="proj-title" style="max-width:36rem">
        <h3 id="proj-title" class="dialog-title">Manage Projects</h3>
        <div class="dialog-body">
          <div class="field">
            <span>New project</span>
            <div class="field-row" style="margin-top:0.75rem;flex-wrap:wrap;gap:0.5rem">
              <input type="text" id="new-project-name" placeholder="Project name" style="flex:1;min-width:10rem" />
              <div class="color-swatches" style="flex-wrap:wrap">
                ${PRESET_COLORS.map(c => `
                  <button type="button" class="color-swatch" style="background:${c.value};width:24px;height:24px"
                    data-new-color="${c.value}" aria-label="${c.name}"></button>
                `).join('')}
              </div>
              <button type="button" class="btn" id="btn-add-project">
                <span data-icon="plus" aria-hidden="true"></span>Add
              </button>
            </div>
          </div>
          <div>
            <span style="font-size:0.875rem;color:rgba(255,255,255,0.7);display:block;margin-bottom:0.5rem">Existing projects</span>
            ${state.projects.length === 0 ? `<div class="empty-state" style="padding:1rem">No projects yet.</div>` : state.projects.map(renderProjectItem).join('')}
          </div>
          <div class="dialog-actions">
            <button type="button" class="btn btn-primary" id="btn-close-projects">Close</button>
          </div>
        </div>
      </div>
    `);
    attachProjectManagerEvents(signal);
  };

  const renderProjectItem = (p) => {
    const taskCount = state.tasks.filter(t => t.projectId === p.id).length;
    return `
      <div class="project-list-item" data-project-id="${p.id}">
        <span class="project-color-dot" style="background:${p.color}"></span>
        <span class="project-list-item-name">${escapeHTML(p.name)}</span>
        <span class="project-list-item-meta">${taskCount} task${taskCount !== 1 ? 's' : ''}</span>
        <div class="project-list-item-actions">
          <button type="button" class="icon-btn danger" data-delete-project="${p.id}" aria-label="Delete project">
            <span data-icon="trash-2" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    `;
  };

  const attachProjectManagerEvents = (signal) => {
    $('#btn-close-projects')?.addEventListener('click', () => {
      closeDialog();
      if (state.ui.addTaskOpen) {
        state.ui.addTaskOpen = false;
        openAddTaskDialog();
      }
    });
    $('#new-project-name')?.addEventListener('input', (e) => { /* nothing, just keep value */ });
    $$('[data-new-color]').forEach(btn => btn.addEventListener('click', () => {
      projectNewColor = btn.dataset.newColor;
      $$('[data-new-color]').forEach(b => b.style.outline = '');
      btn.style.outline = '2px solid white';
    }));
    $('#btn-add-project')?.addEventListener('click', () => {
      const input = $('#new-project-name');
      const name = (input?.value || '').trim();
      if (!name) { input?.focus(); return; }
      addProject(name, projectNewColor);
      input.value = '';
      renderProjectManager();
    });
    $('#dialog-root').addEventListener('click', (e) => {
      const del = e.target.closest('[data-delete-project]');
      if (del) {
        const id = del.dataset.deleteProject;
        const p = state.projects.find(x => x.id === id);
        if (!p) return;
        const taskCount = state.tasks.filter(t => t.projectId === id).length;
        if (taskCount > 0) {
          state.ui.confirm = {
            title: 'Cannot delete project',
            message: `"${p.name}" has ${taskCount} task${taskCount !== 1 ? 's' : ''}. Reassign or remove those tasks first.`,
            danger: false,
            onConfirm: () => {},
          };
          openConfirmDialog();
        } else {
          state.ui.confirm = {
            title: 'Delete project?',
            message: `"${p.name}" will be removed. This cannot be undone.`,
            danger: true,
            onConfirm: () => { deleteProject(id); renderProjectManager(); },
          };
          openConfirmDialog();
        }
      }
    }, { signal });
    $('#new-project-name')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') $('#btn-add-project')?.click();
    });
  };

  // =============================================================
  // SECTION 24: Render — Template selector dialog
  // =============================================================

  const openTemplateSelector = () => {
    renderTemplateSelector();
  };

  const renderTemplateSelector = () => {
    const signal = openDialog(`
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="tpl-sel-title">
        <h3 id="tpl-sel-title" class="dialog-title">Use Template</h3>
        <div class="dialog-body">
          ${state.templates.length === 0 ? `
            <div class="empty-state">No templates yet. Create one to get started.</div>
          ` : state.templates.map(renderTemplateListItem).join('')}
          <div class="dialog-actions">
            <button type="button" class="btn" id="btn-close-tpl-sel">Close</button>
            <button type="button" class="btn btn-primary" id="btn-create-tpl">+ New Template</button>
          </div>
        </div>
      </div>
    `);
    attachTemplateSelectorEvents(signal);
  };

  const renderTemplateListItem = (tpl) => {
    const total = tpl.tasks.reduce((s, t) => s + t.estimatedPomodoros, 0);
    return `
      <div class="template-list-item">
        <div class="template-list-item-info">
          <span class="template-list-item-name">${escapeHTML(tpl.name)}</span>
          <span class="template-list-item-meta">${tpl.tasks.length} task${tpl.tasks.length !== 1 ? 's' : ''} · ${total} pomodoros</span>
        </div>
        <div class="template-list-item-actions">
          <button type="button" class="btn" data-use-tpl="${tpl.id}">Use</button>
          <button type="button" class="icon-btn danger" data-delete-tpl="${tpl.id}" aria-label="Delete template">
            <span data-icon="trash-2" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    `;
  };

  const attachTemplateSelectorEvents = (signal) => {
    $('#btn-close-tpl-sel')?.addEventListener('click', closeDialog);
    $('#btn-create-tpl')?.addEventListener('click', () => {
      closeDialog();
      openTemplateBuilder();
    });
    $('#dialog-root').addEventListener('click', (e) => {
      const useBtn = e.target.closest('[data-use-tpl]');
      if (useBtn) {
        applyTemplate(useBtn.dataset.useTpl);
        closeDialog();
        return;
      }
      const delBtn = e.target.closest('[data-delete-tpl]');
      if (delBtn) {
        const id = delBtn.dataset.deleteTpl;
        const tpl = state.templates.find(t => t.id === id);
        if (!tpl) return;
        state.ui.confirm = {
          title: 'Delete template?',
          message: `"${tpl.name}" will be removed. This cannot be undone.`,
          danger: true,
          onConfirm: () => { deleteTemplate(id); renderTemplateSelector(); },
        };
        openConfirmDialog();
      }
    }, { signal });
  };

  // =============================================================
  // SECTION 25: Render — Template builder dialog
  // =============================================================

  const openTemplateBuilder = () => {
    tplBuilderState = { name: '', tasks: [{ name: '', estimatedPomodoros: 1 }] };
    renderTemplateBuilder();
  };

  const openTemplateBuilderFromCurrent = () => {
    if (state.tasks.length === 0) {
      // Allow building empty
      openTemplateBuilder();
      return;
    }
    tplBuilderState = {
      name: '',
      tasks: state.tasks.map(t => ({ name: t.name, estimatedPomodoros: t.estimatedPomodoros })),
    };
    renderTemplateBuilder();
  };

  let tplBuilderState = { name: '', tasks: [{ name: '', estimatedPomodoros: 1 }] };

  const renderTemplateBuilder = () => {
    const signal = openDialog(`
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="tpl-build-title" style="max-width:36rem">
        <h3 id="tpl-build-title" class="dialog-title">${state.tasks.length > 0 && tplBuilderState.tasks.length === state.tasks.length ? 'Save as Template' : 'New Template'}</h3>
        <div class="dialog-body">
          <label class="field">Template name
            <input type="text" id="tpl-name" placeholder="e.g. Morning Routine" value="${escapeHTML(tplBuilderState.name)}" autocomplete="off" />
          </label>
          <div>
            <span style="font-size:0.875rem;color:rgba(255,255,255,0.7);display:block;margin-bottom:0.5rem">Tasks</span>
            <div class="builder-tasks">
              ${tplBuilderState.tasks.map((t, i) => renderBuilderTaskRow(t, i)).join('')}
            </div>
            <button type="button" class="btn" id="btn-add-tpl-task" style="margin-top:0.5rem;width:100%">
              <span data-icon="plus" aria-hidden="true"></span>Add Task
            </button>
          </div>
          <div class="dialog-actions">
            <button type="button" class="btn" id="btn-cancel-tpl">Cancel</button>
            <button type="button" class="btn btn-primary" id="btn-save-tpl">Save Template</button>
          </div>
        </div>
      </div>
    `);
    attachTemplateBuilderEvents(signal);
    setTimeout(() => $('#tpl-name')?.focus(), 0);
  };

  const renderBuilderTaskRow = (t, i) => `
    <div class="builder-task-row" data-builder-index="${i}">
      <input type="text" placeholder="Task name" value="${escapeHTML(t.name)}" data-builder-name="${i}" />
      <div class="pomo-stepper">
        <button type="button" data-builder-dec="${i}" ${t.estimatedPomodoros <= 1 ? 'disabled' : ''}>
          <span data-icon="minus" aria-hidden="true"></span>
        </button>
        <span class="pomo-stepper-value">${t.estimatedPomodoros}</span>
        <button type="button" data-builder-inc="${i}">
          <span data-icon="plus" aria-hidden="true"></span>
        </button>
      </div>
      <button type="button" class="icon-btn danger" data-builder-remove="${i}" aria-label="Remove task" ${tplBuilderState.tasks.length <= 1 ? 'disabled' : ''}>
        <span data-icon="trash-2" aria-hidden="true"></span>
      </button>
    </div>
  `;

  const attachTemplateBuilderEvents = (signal) => {
    $('#btn-cancel-tpl')?.addEventListener('click', closeDialog);
    $('#tpl-name')?.addEventListener('input', (e) => { tplBuilderState.name = e.target.value; });
    $('#btn-add-tpl-task')?.addEventListener('click', () => {
      tplBuilderState.tasks.push({ name: '', estimatedPomodoros: 1 });
      renderTemplateBuilder();
    });
    $('#dialog-root').addEventListener('click', (e) => {
      const inc = e.target.closest('[data-builder-inc]');
      if (inc) {
        const i = parseInt(inc.dataset.builderInc, 10);
        tplBuilderState.tasks[i].estimatedPomodoros = Math.min(20, tplBuilderState.tasks[i].estimatedPomodoros + 1);
        renderTemplateBuilder();
        return;
      }
      const dec = e.target.closest('[data-builder-dec]');
      if (dec) {
        const i = parseInt(dec.dataset.builderDec, 10);
        tplBuilderState.tasks[i].estimatedPomodoros = Math.max(1, tplBuilderState.tasks[i].estimatedPomodoros - 1);
        renderTemplateBuilder();
        return;
      }
      const rem = e.target.closest('[data-builder-remove]');
      if (rem) {
        const i = parseInt(rem.dataset.builderRemove, 10);
        if (tplBuilderState.tasks.length > 1) {
          tplBuilderState.tasks.splice(i, 1);
          renderTemplateBuilder();
        }
        return;
      }
      if (e.target.closest('#btn-save-tpl')) {
        const name = tplBuilderState.name.trim();
        const validTasks = tplBuilderState.tasks.filter(t => t.name.trim());
        if (!name) { $('#tpl-name').focus(); return; }
        if (validTasks.length === 0) {
          state.ui.confirm = {
            title: 'No tasks',
            message: 'Add at least one task to save this template.',
            danger: false,
            onConfirm: () => {},
          };
          openConfirmDialog();
          return;
        }
        addTemplate(name, validTasks);
        closeDialog();
        return;
      }
    }, { signal });
    $('#dialog-root').addEventListener('input', (e) => {
      const nameInput = e.target.closest('[data-builder-name]');
      if (nameInput) {
        const i = parseInt(nameInput.dataset.builderName, 10);
        tplBuilderState.tasks[i].name = nameInput.value;
      }
    }, { signal });
  };

  // =============================================================
  // SECTION 26: Render — Confirm dialog
  // =============================================================

  const openConfirmDialog = () => {
    const c = state.ui.confirm;
    if (!c) return;
    openDialog(`
      <div class="dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <h3 id="confirm-title" class="dialog-title">${escapeHTML(c.title)}</h3>
        <p class="confirm-text">${escapeHTML(c.message)}</p>
        <div class="dialog-actions">
          <button type="button" class="btn" id="btn-confirm-cancel">Cancel</button>
          <button type="button" class="btn ${c.danger ? 'btn-danger' : 'btn-primary'}" id="btn-confirm-ok">Confirm</button>
        </div>
      </div>
    `);
    $('#btn-confirm-cancel')?.addEventListener('click', () => {
      state.ui.confirm = null;
      closeDialog();
    });
    $('#btn-confirm-ok')?.addEventListener('click', () => {
      const onConfirm = state.ui.confirm?.onConfirm;
      state.ui.confirm = null;
      closeDialog();
      if (onConfirm) {
        try { onConfirm(); } catch (err) { console.error(err); }
      }
    });
  };

  // =============================================================
  // SECTION 27: Init
  // =============================================================

  const init = async () => {
    await loadState();
    restoreTimerFromBackup();
    // Re-sync the timer object's duration with the freshly-loaded settings
    // (settings were updated by loadState; the timer was captured at IIFE
    // init time from DEFAULT_SETTINGS). Only do this when idle so we don't
    // overwrite a paused/running state restored from backup.
    if (timer.status === 'idle') setTimerMode(timer.mode);

    injectIcons();
    renderTimerBackground();
    renderModeSelector();
    renderTimerDisplay();
    renderTimerControls();
    renderActiveTaskHint();
    renderTaskList();
    startFooterClock();

    // Header buttons
    $('#btn-settings').addEventListener('click', openSettings);
    $('#btn-reports').addEventListener('click', openReports);

    // Mode selector (event delegation)
    $('#mode-selector').addEventListener('click', (e) => {
      const mode = e.target.closest('[data-mode]')?.dataset.mode;
      if (mode && mode !== timer.mode) setTimerMode(mode);
    });

    // Mode selector keyboard nav
    $('#mode-selector').addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const idx = MODES.findIndex(m => m.value === timer.mode);
      const next = (idx + (e.key === 'ArrowLeft' ? -1 : 1) + MODES.length) % MODES.length;
      setTimerMode(MODES[next].value);
    });

    // Global keyboard shortcuts (when no modal/dialog open)
    document.addEventListener('keydown', (e) => {
      if ($('#modal-root').firstChild || $('#dialog-root').firstChild) return;
      if (e.target.matches('input, textarea, select')) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (timer.status === 'running') pauseTimer(); else startTimer();
      } else if (e.key === 'r' || e.key === 'R') {
        resetTimer();
      }
    });

    // First user interaction - request notifications
    document.addEventListener('click', () => {
      if (state.settings.desktopNotifications) requestNotificationPermission();
    }, { once: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
