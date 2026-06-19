/* =====================================================================
 * reducer.js — מצב התחלתי + reducer טהור (Redux-like)
 * ---------------------------------------------------------------------
 * [לוגיקה ניידת / PORTABLE LOGIC]
 * (state, action) -> state חדש. פונקציה טהורה לחלוטין, ללא DOM.
 * הגידול האוטומטי מתרחש כאן בתוך TICK (זמן פעיל -> משבצות נוספות).
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  var Config = T.Config;
  var L = T.Logic;

  /* ---- מצב התחלתי -------------------------------------------------- */
  T.createInitialState = function () {
    var world = L.seedWorld();
    return {
      world: Config.world,
      currentUserId: 'me',
      users: world.users,
      tiles: world.tiles,           // sparse: משבצות בבעלות
      zones: world.zones,           // sparse: אזורים מיוחדים (נוף)
      zonesInfo: world.zonesInfo,
      zoneAnchors: world.zoneAnchors,

      // זמן פעיל מצטבר — מניע את הגידול האוטומטי.
      session: { activeMs: 0 },

      // מצלמה: מרכז (קואורדינטות עולם) + scale (פיקסלים למשבצת).
      camera: { centerX: Config.start.x, centerY: Config.start.y, scale: Config.camera.defaultScale },

      // מצב UI (חולף — לא נשמר).
      ui: {
        theme: 'dark',
        selection: null,
        multiSelect: { on: false, keys: [] },
      },
    };
  };

  /* ---- גידול אוטומטי: מוסיף משבצות עד שמגיעים ליעד לפי הזמן --------- */
  function applyGrowth(state) {
    var target = L.growthTarget(state.session.activeMs);
    var owned = 0;
    for (var k in state.tiles) if (state.tiles[k].ownerId === state.currentUserId) owned++;
    if (owned >= target) return state;

    // משכפלים את מפת המשבצות פעם אחת ומוסיפים עד היעד (עם תקרה).
    var tiles = {};
    for (var t in state.tiles) tiles[t] = state.tiles[t];
    var working = Object.assign({}, state, { tiles: tiles });
    var added = 0, cap = Config.growth.maxPerTick;
    while (owned + added < target && added < cap) {
      var nt = L.nextGrowthTile(working);
      if (!nt) break; // אין לאן לגדול (מוקפים)
      tiles[L.key(nt.x, nt.y)] = {
        x: nt.x, y: nt.y, ownerId: state.currentUserId,
        color: state.users[state.currentUserId].color, imageUrl: null,
      };
      added++;
    }
    if (added === 0) return state;
    return Object.assign({}, state, { tiles: tiles });
  }

  /* ---- ה-reducer הטהור --------------------------------------------- */
  T.reducer = function (state, action) {
    switch (action.type) {
      // זמן פעיל -> צבירה + גידול אוטומטי.
      case 'TICK': {
        var next = Object.assign({}, state, {
          session: { activeMs: state.session.activeMs + action.ms },
        });
        return applyGrowth(next);
      }

      case 'SET_THEME':
        return Object.assign({}, state, {
          ui: Object.assign({}, state.ui, { theme: action.theme }),
        });

      // מצלמה: ה-UI מחשב מרכז/scale חוקיים (דרך פונקציות logic) ושולח כאן.
      case 'SET_CAMERA':
        return Object.assign({}, state, {
          camera: { centerX: action.centerX, centerY: action.centerY, scale: action.scale },
        });

      case 'SELECT_TILE':
        return Object.assign({}, state, {
          ui: Object.assign({}, state.ui, { selection: { x: action.x, y: action.y } }),
        });

      case 'TOGGLE_MULTISELECT': {
        var on = !state.ui.multiSelect.on;
        return Object.assign({}, state, {
          ui: Object.assign({}, state.ui, { multiSelect: { on: on, keys: [] } }),
        });
      }
      case 'TOGGLE_IN_MULTISELECT': {
        var mk = L.key(action.x, action.y);
        var tile = state.tiles[mk];
        if (!tile || tile.ownerId !== state.currentUserId) return state;
        var keys = state.ui.multiSelect.keys.slice();
        var idx = keys.indexOf(mk);
        if (idx >= 0) keys.splice(idx, 1); else keys.push(mk);
        return Object.assign({}, state, {
          ui: Object.assign({}, state.ui, {
            multiSelect: Object.assign({}, state.ui.multiSelect, { keys: keys }),
          }),
        });
      }

      // עריכת מאפייני משבצת (צבע/תמונה) — רק על משבצות בבעלותי.
      case 'SET_TILE_COLOR':
        return applyToOwned(state, action.keys, { color: action.color });
      case 'SET_TILE_IMAGE':
        return applyToOwned(state, action.keys, { imageUrl: action.imageUrl });

      default:
        return state;
    }
  };

  function applyToOwned(state, keys, patch) {
    var tiles = {};
    for (var k in state.tiles) tiles[k] = state.tiles[k];
    keys.forEach(function (kk) {
      var t = tiles[kk];
      if (t && t.ownerId === state.currentUserId) tiles[kk] = Object.assign({}, t, patch);
    });
    return Object.assign({}, state, { tiles: tiles });
  }
})(window.Territory);
