/* =====================================================================
 * reducer.js — מצב התחלתי + reducer טהור (Redux-like)
 * ---------------------------------------------------------------------
 * [לוגיקה ניידת / PORTABLE LOGIC]
 * (state, action) -> state חדש. פונקציה טהורה לחלוטין, ללא DOM.
 * כל שינוי ב-state עובר דרך כאן. ממופה ישירות ל-useReducer/Redux ב-React
 * או ל-Bloc/Notifier ב-Flutter.
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
      tiles: world.tiles, // sparse: רק משבצות בבעלות מישהו

      // אזורים מיוחדים (ים/עיר/רכבת) — נוף קבוע, לא ניתן לכיבוש.
      zones: world.zones,
      zonesInfo: world.zonesInfo,
      zoneAnchors: world.zoneAnchors,

      // כלכלה: 'spent' מצטבר; הקרדיט הזמין נגזר מזמן פעיל פחות הוצאות (selectors).
      session: { activeMs: 0 },
      economy: { spent: 0 },

      // חלון התצוגה — מרכז + ממדי הרשת (cols/rows מותאמים למסך ע"י ה-UI).
      viewport: {
        centerX: Config.start.x,
        centerY: Config.start.y,
        cols: Config.viewport.cols,
        rows: Config.viewport.rows,
      },

      // מצב UI (לא נשמר ל-storage — חולף).
      ui: {
        theme: 'dark', // ברירת מחדל: מצב לילה (נוח לשהייה ארוכה)
        selection: null, // {x,y} של המשבצת הנבחרת
        multiSelect: { on: false, keys: [] }, // שליטה בכמה משבצות כמקשה אחת
      },
    };
  };

  /* ---- הקרדיט הזמין כרגע (גם כאן, כדי שה-reducer יאכוף עלויות) ------ */
  function availableCredits(state) {
    return Math.floor(state.session.activeMs / Config.economy.msPerCredit) - state.economy.spent;
  }

  /* ---- ה-reducer הטהור --------------------------------------------- */
  T.reducer = function (state, action) {
    switch (action.type) {
      /* --- זמן פעיל: מצטבר את ה-ms שעברו (מקור הצבירה) --- */
      case 'TICK': {
        return Object.assign({}, state, {
          session: { activeMs: state.session.activeMs + action.ms },
        });
      }

      /* --- נושא (מצב לילה/יום) --- */
      case 'SET_THEME': {
        return Object.assign({}, state, {
          ui: Object.assign({}, state.ui, { theme: action.theme }),
        });
      }

      /* --- ניווט בחלון התצוגה (clamped לגבולות העולם) --- */
      case 'PAN': {
        var cx = Math.min(state.world.width - 1, Math.max(0, state.viewport.centerX + action.dx));
        var cy = Math.min(state.world.height - 1, Math.max(0, state.viewport.centerY + action.dy));
        return Object.assign({}, state, {
          viewport: Object.assign({}, state.viewport, { centerX: cx, centerY: cy }),
        });
      }
      case 'CENTER_ON_START': {
        return Object.assign({}, state, {
          viewport: Object.assign({}, state.viewport, {
            centerX: Config.start.x, centerY: Config.start.y,
          }),
        });
      }

      /* --- התאמת ממדי הרשת לגודל המסך (נשלח משכבת ה-UI) --- */
      case 'RESIZE': {
        if (state.viewport.cols === action.cols && state.viewport.rows === action.rows) {
          return state; // ללא שינוי — מונע re-render מיותר ולולאות
        }
        return Object.assign({}, state, {
          viewport: Object.assign({}, state.viewport, {
            cols: action.cols, rows: action.rows,
          }),
        });
      }

      /* --- בחירת משבצת (לעריכה / לפעולה) --- */
      case 'SELECT_TILE': {
        return Object.assign({}, state, {
          ui: Object.assign({}, state.ui, { selection: { x: action.x, y: action.y } }),
        });
      }

      /* --- מצב בחירה-מרובה: לשלוט בכמה משבצות כמקשה אחת --- */
      case 'TOGGLE_MULTISELECT': {
        var on = !state.ui.multiSelect.on;
        return Object.assign({}, state, {
          ui: Object.assign({}, state.ui, { multiSelect: { on: on, keys: [] } }),
        });
      }
      case 'TOGGLE_IN_MULTISELECT': {
        var k = L.key(action.x, action.y);
        var t = state.tiles[k];
        if (!t || t.ownerId !== state.currentUserId) return state; // רק משבצות שלי
        var keys = state.ui.multiSelect.keys.slice();
        var idx = keys.indexOf(k);
        if (idx >= 0) keys.splice(idx, 1);
        else keys.push(k);
        return Object.assign({}, state, {
          ui: Object.assign({}, state.ui, {
            multiSelect: Object.assign({}, state.ui.multiSelect, { keys: keys }),
          }),
        });
      }

      /* --- כיבוש משבצת ריקה צמודה --- */
      case 'CLAIM_TILE': {
        if (!L.canClaim(state, availableCredits(state), action.x, action.y)) return state;
        var ck = L.key(action.x, action.y);
        var tiles = {};
        for (var t1 in state.tiles) tiles[t1] = state.tiles[t1];
        tiles[ck] = {
          x: action.x, y: action.y, ownerId: state.currentUserId,
          color: state.users[state.currentUserId].color, imageUrl: null,
        };
        return Object.assign({}, state, {
          tiles: tiles,
          economy: { spent: state.economy.spent + Config.economy.claimCost },
          ui: Object.assign({}, state.ui, { selection: { x: action.x, y: action.y } }),
        });
      }

      /* --- עריכת מאפייני משבצת (צבע/תמונה) על קבוצת מפתחות --- */
      // חל רק על משבצות בבעלותי. תומך גם בעריכה בודדת וגם בבחירה-מרובה.
      case 'SET_TILE_COLOR': {
        return applyToOwned(state, action.keys, { color: action.color });
      }
      case 'SET_TILE_IMAGE': {
        return applyToOwned(state, action.keys, { imageUrl: action.imageUrl });
      }

      default:
        return state;
    }
  };

  // עוזר טהור: מחיל patch על כל המפתחות שבבעלות השחקן.
  function applyToOwned(state, keys, patch) {
    var tiles = {};
    for (var k in state.tiles) tiles[k] = state.tiles[k];
    keys.forEach(function (k) {
      var t = tiles[k];
      if (t && t.ownerId === state.currentUserId) {
        tiles[k] = Object.assign({}, t, patch);
      }
    });
    return Object.assign({}, state, { tiles: tiles });
  }

  // נחשף גם החוצה — selectors משתמש באותה נוסחה.
  T.availableCredits = availableCredits;
})(window.Territory);
