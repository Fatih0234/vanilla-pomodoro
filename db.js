/* =============================================================
   Pomofocus — Storage layer (db.js)
   IndexedDB via Dexie, with a localStorage fallback and a
   non-destructive one-time migration from localStorage.
   Exposes window.PomoDB.
   ============================================================= */
(() => {
  'use strict';

  // ---- Constants ---------------------------------------------------------

  const DB_NAME = 'pomofocus-db';
  const MIGRATION_FLAG_KEY = 'migration-v1-done';
  const STORAGE_VERSION = 1;

  // Legacy localStorage keys. We READ from these on first boot, then leave
  // them in place as a safety net. We do NOT auto-delete them.
  const LS_KEYS = {
    settings:   'pomofocus-settings',
    tasks:      'pomofocus-tasks',
    projects:   'pomofocus-projects',
    templates:  'pomofocus-templates',
    sessions:   'pomofocus-focus-sessions',
    timerBackup:'pomofocus-timer-backup',
  };

  // ---- Module state ------------------------------------------------------

  let dbInstance = null;
  let initPromise = null;
  let isReady = false;
  let useFallback = false;

  // ---- localStorage helpers (fallback path + initial migration source) ---

  const getLS = () => {
    try { return localStorage; } catch { return null; }
  };

  const loadLS = (key, fallback) => {
    const s = getLS();
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
      console.warn('PomoDB.loadLS failed for', key, err);
      return fallback;
    }
  };

  const saveLS = (key, data) => {
    const s = getLS();
    if (!s) return;
    try {
      s.setItem(key, JSON.stringify({
        version: STORAGE_VERSION,
        data,
        timestamp: Date.now(),
      }));
    } catch (err) {
      console.warn('PomoDB.saveLS failed for', key, err);
    }
  };

  // ---- IndexedDB availability check --------------------------------------

  const hasIndexedDB = () => {
    try { return typeof indexedDB !== 'undefined' && indexedDB !== null; }
    catch { return false; }
  };

  // ---- Schema ------------------------------------------------------------
  // Note: ID fields are user-supplied strings (UUIDs from crypto.randomUUID),
  // NOT auto-increment numbers. So the first listed field is the primary key
  // and we do NOT prefix it with `++`.
  const defineSchema = (db) => {
    db.version(1).stores({
      settings:  '&key',                                                // singleton, key='current'
      tasks:     'id, isCompleted, projectId',
      projects:  'id, name',
      templates: 'id, name',
      sessions:  'id, completedAt, mode, taskId, projectId, [completedAt+mode]',
    });
  };

  // ---- Migration from localStorage → IndexedDB ---------------------------
  // Runs once, gated by a flag in the `settings` store. Idempotent.
  // Per-store best-effort: a failure in one store must not block the others,
  // and must not prevent the migration from being marked done.
  const safePut = async (table, key, value) => {
    if (!value || typeof value !== 'object') return;
    try { await table.put({ key, ...value }); }
    catch (err) { console.warn('PomoDB migrate: put failed for', key, err); }
  };

  const safeBulkPut = async (table, rows) => {
    if (!rows.length) return;
    try { await table.bulkPut(rows); }
    catch (err) { console.warn('PomoDB migrate: bulkPut failed', err); }
  };

  const safe = (arr) => (Array.isArray(arr) ? arr.filter(r => r && r.id) : []);

  const migrateFromLS = async (db) => {
    const flag = await db.settings.get(MIGRATION_FLAG_KEY);
    if (flag) return; // already migrated

    const lsSettings  = loadLS(LS_KEYS.settings,   null);
    const lsTasks     = loadLS(LS_KEYS.tasks,      []);
    const lsProjects  = loadLS(LS_KEYS.projects,   []);
    const lsTemplates = loadLS(LS_KEYS.templates,  []);
    const lsSessions  = loadLS(LS_KEYS.sessions,   []);

    await safePut(db.settings,  'current', lsSettings);
    await safeBulkPut(db.tasks,     safe(lsTasks));
    await safeBulkPut(db.projects,  safe(lsProjects));
    await safeBulkPut(db.templates, safe(lsTemplates));
    await safeBulkPut(db.sessions,  safe(lsSessions));

    // Mark done, regardless of whether anything was migrated.
    try {
      await db.settings.put({ key: MIGRATION_FLAG_KEY, at: Date.now() });
    } catch (err) {
      console.warn('PomoDB migrate: could not write migration flag', err);
    }
  };

  // ---- Init --------------------------------------------------------------

  const initDB = async () => {
    if (initPromise) return initPromise;

    initPromise = (async () => {
      if (!hasIndexedDB()) {
        useFallback = true;
        return null;
      }
      try {
        const db = new Dexie(DB_NAME);
        defineSchema(db);
        await db.open();
        dbInstance = db;
        isReady = true;
        useFallback = false;
        await migrateFromLS(db);
        return db;
      } catch (err) {
        console.warn('PomoDB: initDB failed, falling back to localStorage', err);
        useFallback = true;
        dbInstance = null;
        isReady = false;
        return null;
      }
    })();

    return initPromise;
  };

  // ---- Helpers -----------------------------------------------------------

  const stripKey = (rec) => {
    if (!rec) return rec;
    const { key, ...rest } = rec; // eslint-disable-line no-unused-vars
    return rest;
  };

  // ---- Reads -------------------------------------------------------------

  const loadAll = async () => {
    await initDB();
    if (useFallback) {
      return {
        settings:  loadLS(LS_KEYS.settings, null),
        tasks:     loadLS(LS_KEYS.tasks,    []),
        projects:  loadLS(LS_KEYS.projects, []),
        templates: loadLS(LS_KEYS.templates,[]),
        sessions:  loadLS(LS_KEYS.sessions, []),
      };
    }
    const [settingsRec, tasks, projects, templates, sessions] = await Promise.all([
      dbInstance.settings.get('current'),
      dbInstance.tasks.toArray(),
      dbInstance.projects.toArray(),
      dbInstance.templates.toArray(),
      dbInstance.sessions.toArray(),
    ]);
    return {
      settings:  settingsRec ? stripKey(settingsRec) : null,
      tasks,
      projects,
      templates,
      sessions,
    };
  };

  // ---- Writes ------------------------------------------------------------
  // Each write: try IndexedDB first; on failure, fall back to localStorage.

  const saveSettings = async (obj) => {
    await initDB();
    if (useFallback) { saveLS(LS_KEYS.settings, obj); return; }
    try {
      await dbInstance.settings.put({ key: 'current', ...obj });
    } catch (err) {
      console.warn('PomoDB.saveSettings failed, using localStorage', err);
      saveLS(LS_KEYS.settings, obj);
    }
  };

  const bulkReplace = async (storeName, lsKey, arr) => {
    await initDB();
    const list = safe(arr);
    if (useFallback) { saveLS(lsKey, list); return; }
    try {
      await dbInstance[storeName].clear();
      if (list.length) await dbInstance[storeName].bulkPut(list);
    } catch (err) {
      console.warn(`PomoDB.${storeName}.replace failed, using localStorage`, err);
      saveLS(lsKey, list);
    }
  };

  const saveTasks     = (arr) => bulkReplace('tasks',     LS_KEYS.tasks,     arr);
  const saveProjects  = (arr) => bulkReplace('projects',  LS_KEYS.projects,  arr);
  const saveTemplates = (arr) => bulkReplace('templates', LS_KEYS.templates, arr);
  const saveSessions  = (arr) => bulkReplace('sessions',  LS_KEYS.sessions,  arr);

  const appendSession = async (session) => {
    await initDB();
    if (!session || !session.id) return;
    if (useFallback) {
      const list = loadLS(LS_KEYS.sessions, []);
      list.push(session);
      saveLS(LS_KEYS.sessions, list);
      return;
    }
    try {
      await dbInstance.sessions.add(session);
    } catch (err) {
      console.warn('PomoDB.appendSession failed, using localStorage', err);
      const list = loadLS(LS_KEYS.sessions, []);
      list.push(session);
      saveLS(LS_KEYS.sessions, list);
    }
  };

  const deleteSession = async (id) => {
    await initDB();
    if (useFallback) {
      const list = loadLS(LS_KEYS.sessions, []).filter(s => s.id !== id);
      saveLS(LS_KEYS.sessions, list);
      return;
    }
    try {
      await dbInstance.sessions.delete(id);
    } catch (err) {
      console.warn('PomoDB.deleteSession failed, using localStorage', err);
      const list = loadLS(LS_KEYS.sessions, []).filter(s => s.id !== id);
      saveLS(LS_KEYS.sessions, list);
    }
  };

  // ---- Indexed query helpers (exposed for future use) --------------------
  // app.js does not call these yet — analytics continues to read from the
  // in-memory `state.sessions` array for sync, fast access.

  const sessionsInRange = async (startISO, endISO, mode) => {
    await initDB();
    if (useFallback) {
      const all = loadLS(LS_KEYS.sessions, []);
      return all.filter(s => {
        if (s.completedAt < startISO || s.completedAt > endISO) return false;
        if (mode && s.mode !== mode) return false;
        return true;
      });
    }
    let coll = dbInstance.sessions
      .where('completedAt').between(startISO, endISO, true, true);
    if (mode) coll = coll.and(s => s.mode === mode);
    return coll.toArray();
  };

  // ---- Public surface ----------------------------------------------------

  window.PomoDB = {
    initDB,
    loadAll,
    saveSettings,
    saveTasks,
    saveProjects,
    saveTemplates,
    saveSessions,
    appendSession,
    deleteSession,
    sessionsInRange,
    isAvailable: () => isReady && !useFallback,
    isFallback:  () => useFallback,
    // Debug / future migration tooling.
    _db:        () => dbInstance,
  };
})();
