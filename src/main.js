/* =====================================================================
 * main.js — נקודת כניסה (Bootstrap)
 * ---------------------------------------------------------------------
 * [UI ספציפי לפלטפורמה / PLATFORM-SPECIFIC — דק]
 * מחבר את כל החלקים: טעינת state שמור -> store -> נושא -> ticker -> mount.
 * זה ה"composition root" של האפליקציה.
 * ===================================================================== */

(function (T) {
  'use strict';

  var STORAGE_KEY = 'territory.save.v6';

  // ----- חלקי ה-state שכן נשמרים (האזורים נזרעים מחדש, לא נשמרים) -----
  function persistable(state) {
    return {
      tiles: state.tiles,
      session: state.session,
      camera: state.camera,
      meta: state.meta,
      theme: state.ui.theme,
    };
  }

  // ----- מיזוג state שמור (אם קיים) אל המצב ההתחלתי הטרי -----
  function loadState() {
    var initial = T.createInitialState();
    var saved = T.Storage.getJSON(STORAGE_KEY);
    if (!saved) return initial;
    return Object.assign({}, initial, {
      tiles: saved.tiles || initial.tiles,
      session: saved.session || initial.session,
      camera: saved.camera || initial.camera,
      meta: Object.assign({}, initial.meta, saved.meta), // ממלא שדות חדשים
      ui: Object.assign({}, initial.ui, { theme: saved.theme === 'light' ? 'dark' : (saved.theme || initial.ui.theme) }),
    });
  }

  function boot() {
    var store = T.createStore(T.reducer, loadState());

    // נושא: מחילים מיד ובכל שינוי theme.
    T.applyTheme(store.getState().ui.theme);
    var lastTheme = store.getState().ui.theme;

    // שמירה (debounced) בכל שינוי state + עדכון נושא בעת הצורך.
    var saveTimer = null;
    store.subscribe(function (state) {
      if (state.ui.theme !== lastTheme) {
        lastTheme = state.ui.theme;
        T.applyTheme(lastTheme);
      }
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        T.Storage.setJSON(STORAGE_KEY, persistable(store.getState()));
      }, 400);
    });

    // ----- ה-ticker: צובר זמן פעיל רק כשהמסך גלוי (מקור ההתרחבות) -----
    var ticker = T.createTicker(1000, function (elapsedMs) {
      store.dispatch({ type: 'TICK', ms: elapsedMs });
    });
    ticker.start();

    // ----- mount של ה-UI -----
    T.mountApp(document.getElementById('root'), store);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.Territory);
