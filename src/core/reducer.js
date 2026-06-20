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
      regions: world.regions,       // רשימת אזורים עם גבולות (לאנימציות)
      zoneBuckets: world.zoneBuckets, // אינדקס מרחבי לציור מהיר

      // זמן פעיל מצטבר + מד-התקדמות לגידול (נצרך לכל משבצת חדשה).
      session: { activeMs: 0, growthMs: 0 },

      // מצלמה: מרכז (קואורדינטות עולם) + scale (פיקסלים למשבצת).
      camera: { centerX: Config.start.x, centerY: Config.start.y, scale: Config.camera.defaultScale },

      // מטבע פרמיום, משימות, אווטאר, משאבים ועיצוב טריטוריה (נשמר).
      meta: {
        gems: 60, claimedMissions: {}, soldListings: {}, avatarId: 'wizard', customAvatar: null,
        resources: {}, zoneCd: {}, territoryStyle: { color: '#4060e6', effect: 'none' },
      },

      // מצב UI (חולף — לא נשמר, חוץ מהנושא).
      ui: {
        theme: 'dark',
        screen: 'home',                      // ברירת מחדל: מסך הבית (כמו ההנדאוף)
        editTab: 'color',                    // טאב בגיליון העריכה
        sheet: null,                         // גיליון תחתון פתוח (null / 'edit')
        selection: null,
        multiSelect: { on: false, keys: [] },
      },
    };
  };

  /* ---- גידול אוטומטי מואט: צוברים growthMs ו"קונים" משבצות ---------- */
  // עלות כל משבצת גדלה עם גודל הטריטוריה (costFor) — כך הבנייה איטית
  // ומתעצמת בהדרגה, כמו פיתוח תיק נכסים.
  function applyGrowth(state, addedMs) {
    var owned = 0;
    for (var k in state.tiles) if (state.tiles[k].ownerId === state.currentUserId) owned++;

    var growthMs = state.session.growthMs + addedMs;
    var tiles = null;
    var added = 0, cap = Config.growth.maxPerTick;
    var working = state;

    while (added < cap) {
      var cost = L.costFor(owned);
      if (growthMs < cost) break;
      if (!tiles) { tiles = {}; for (var t in state.tiles) tiles[t] = state.tiles[t]; working = Object.assign({}, state, { tiles: tiles }); }
      var nt = L.nextGrowthTile(working);
      if (!nt) { growthMs = cost; break; } // מוקפים — לא צוברים מעבר לעלות אחת
      tiles[L.key(nt.x, nt.y)] = {
        x: nt.x, y: nt.y, ownerId: state.currentUserId,
        color: state.users[state.currentUserId].color, imageUrl: null,
      };
      growthMs -= cost; owned++; added++;
    }

    var session = { activeMs: state.session.activeMs + addedMs, growthMs: growthMs };
    return Object.assign({}, state, tiles ? { tiles: tiles, session: session } : { session: session });
  }

  /* ---- ה-reducer הטהור --------------------------------------------- */
  T.reducer = function (state, action) {
    switch (action.type) {
      // זמן פעיל -> צבירה + גידול אוטומטי מואט.
      case 'TICK':
        return applyGrowth(state, action.ms);

      case 'SET_THEME':
        return Object.assign({}, state, {
          ui: Object.assign({}, state.ui, { theme: action.theme }),
        });

      // מצלמה: ה-UI מחשב מרכז/scale חוקיים (דרך פונקציות logic) ושולח כאן.
      case 'SET_CAMERA':
        return Object.assign({}, state, {
          camera: { centerX: action.centerX, centerY: action.centerY, scale: action.scale },
        });

      // ניווט בין מסכים (מפה/משימות/פרופיל/חברים/צ'אט/הגדרות).
      case 'SET_SCREEN':
        return Object.assign({}, state, {
          ui: Object.assign({}, state.ui, { screen: action.screen }),
        });

      case 'SELECT_TILE':
        return Object.assign({}, state, {
          ui: Object.assign({}, state.ui, { selection: { x: action.x, y: action.y } }),
        });
      case 'CLEAR_SELECTION':
        return Object.assign({}, state, {
          ui: Object.assign({}, state.ui, { selection: null }),
        });

      // תביעת פרס משימה — רק אם הושלמה ולא נתבעה.
      case 'CLAIM_MISSION': {
        var ms = T.Progression.missions(state);
        var m = null;
        for (var i = 0; i < ms.length; i++) if (ms[i].id === action.id) m = ms[i];
        if (!m || !m.done || m.claimed) return state;
        var claimed = Object.assign({}, state.meta.claimedMissions); claimed[m.id] = true;
        return Object.assign({}, state, {
          meta: Object.assign({}, state.meta, {
            gems: state.meta.gems + m.reward, claimedMissions: claimed,
          }),
        });
      }

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
      case 'SET_TILE_OPACITY':
        return applyToOwned(state, action.keys, { opacity: action.opacity });

      case 'SET_EDIT_TAB':
        return Object.assign({}, state, {
          ui: Object.assign({}, state.ui, { editTab: action.tab }),
        });
      case 'SET_SHEET':
        return Object.assign({}, state, {
          ui: Object.assign({}, state.ui, { sheet: action.sheet }),
        });

      // רכישת טריטוריה בשוק — עולה יהלומים; מסומנת כנמכרה.
      case 'BUY_LISTING': {
        if (state.meta.soldListings[action.id]) return state;
        if (state.meta.gems < action.price) return state;
        var sold = Object.assign({}, state.meta.soldListings); sold[action.id] = true;
        return Object.assign({}, state, {
          meta: Object.assign({}, state.meta, { gems: state.meta.gems - action.price, soldListings: sold }),
        });
      }

      // איסוף משאב מאזור (עם cooldown לפי זמן פעיל).
      case 'COLLECT_RESOURCE': {
        var now = state.session.activeMs;
        var last = state.meta.zoneCd[action.zoneId];
        if (last != null && now - last < Config.resources.cooldownMs) return state;
        var res = Object.assign({}, state.meta.resources);
        res[action.resource] = (res[action.resource] || 0) + action.amount;
        var cd = Object.assign({}, state.meta.zoneCd); cd[action.zoneId] = now;
        return Object.assign({}, state, { meta: Object.assign({}, state.meta, { resources: res, zoneCd: cd }) });
      }
      // צבע הטריטוריה (חינם).
      case 'SET_TERRITORY_COLOR':
        return Object.assign({}, state, {
          meta: Object.assign({}, state.meta, { territoryStyle: Object.assign({}, state.meta.territoryStyle, { color: action.color }) }),
        });
      // החלת אפקט-עיצוב — עולה משאבים.
      case 'APPLY_TERRITORY_EFFECT': {
        var eff = T.EffectById[action.effect]; if (!eff) return state;
        if (state.meta.territoryStyle.effect === action.effect) return state; // כבר פעיל — לא לחייב שוב
        var have = state.meta.resources, cost = eff.cost || {};
        for (var rk in cost) if ((have[rk] || 0) < cost[rk]) return state; // אין מספיק משאבים
        var nres = Object.assign({}, have);
        for (var rk2 in cost) nres[rk2] = nres[rk2] - cost[rk2];
        return Object.assign({}, state, {
          meta: Object.assign({}, state.meta, {
            resources: nres,
            territoryStyle: Object.assign({}, state.meta.territoryStyle, { effect: action.effect }),
          }),
        });
      }

      // בחירת אווטאר מהקטלוג.
      case 'SET_AVATAR':
        return Object.assign({}, state, {
          meta: Object.assign({}, state.meta, { avatarId: action.id }),
        });
      // העלאת אווטאר אישי (תמונה) — נבחר אוטומטית.
      case 'SET_CUSTOM_AVATAR':
        return Object.assign({}, state, {
          meta: Object.assign({}, state.meta, { customAvatar: action.dataUrl, avatarId: 'custom' }),
        });

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
