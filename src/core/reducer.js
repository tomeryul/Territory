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

        // --- כלכלת Catan ---
        buildings: {},          // id -> רמה (count/level)
        prodAccum: {},          // שאריות ייצור חלקיות (כדי לצבור משאבים שלמים)

        // --- עץ טכנולוגיות ---
        tech: {},               // id -> true (נחקר)
        techPoints: 0,          // נקודות-מחקר (כולל שארית חלקית)

        // --- וו יומי ---
        day: null,              // 'YYYY-MM-DD' של היום הנוכחי (מהשכבה החיצונית)
        streak: { count: 0, lastDay: null },
        streakClaimedDay: null, // היום שבו נתבע פרס-הרצף לאחרונה
        dailyClaimed: {},       // id משימה-יומית -> true (מתאפס בכל יום)
        dailyStats: { collects: 0, trades: 0, builds: 0, researches: 0 },
        dayBaseTiles: 0,        // גודל הטריטוריה בתחילת היום (לחישוב "היום")
        dayBaseActiveMs: 0,     // זמן פעיל בתחילת היום
      },

      // מצב UI (חולף — לא נשמר, חוץ מהנושא).
      ui: {
        theme: 'dark',
        screen: 'home',                      // ברירת מחדל: מסך הבית (כמו ההנדאוף)
        editTab: 'color',                    // טאב בגיליון העריכה
        sheet: null,                         // גיליון תחתון פתוח (null / 'edit')
        trade: { from: null, to: null },     // בחירת סחר (חולף — לא נשמר)
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
    var cost = T.Selectors.effectiveMsPerTile(state); // קבוע לאורך הטיק (תלוי טכנולוגיות)

    while (added < cap) {
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

  /* ---- ייצור פסיבי: מבנים מפיקים משאבים/נק'-מחקר לאורך זמן פעיל ----- */
  // נצבר חלקית (prodAccum) ומומר למשאבים שלמים; משאבים נחסמים בקיבולת.
  function applyProduction(state, dt) {
    var S = T.Selectors;
    var rates = S.productionRates(state);     // ליחידת-דקה, פר-משאב
    var tpRate = S.techRate(state);           // נק'-מחקר לדקה
    if (!tpRate) { var hasProd = false; for (var rk in rates) { if (rates[rk]) { hasProd = true; break; } } if (!hasProd) return state; }

    var cap = S.resourceCap(state);
    var res = Object.assign({}, state.meta.resources);
    var acc = Object.assign({}, state.meta.prodAccum);
    var perMs = dt / 60000;

    for (var id in rates) {
      if (!rates[id]) continue;
      var gained = (acc[id] || 0) + rates[id] * perMs;
      var whole = Math.floor(gained);
      acc[id] = gained - whole;
      if (whole > 0) {
        var cur = res[id] || 0;
        if (cur < cap) res[id] = Math.min(cap, cur + whole); // חסום בקיבולת (Catan hand-limit)
      }
    }

    // נקודות-מחקר — נצברות חלקית, ללא תקרה.
    var techPoints = state.meta.techPoints || 0;
    if (tpRate) {
      var tg = (acc.__tech || 0) + tpRate * perMs;
      var tw = Math.floor(tg);
      acc.__tech = tg - tw;
      techPoints += tw;
    }

    return Object.assign({}, state, {
      meta: Object.assign({}, state.meta, { resources: res, prodAccum: acc, techPoints: techPoints }),
    });
  }

  /* ---- ה-reducer הטהור --------------------------------------------- */
  T.reducer = function (state, action) {
    switch (action.type) {
      // זמן פעיל -> צבירה + גידול אוטומטי מואט + ייצור פסיבי מהמבנים.
      case 'TICK':
        return applyProduction(applyGrowth(state, action.ms), action.ms);

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
      // בחירת צד-סחר (from/to) במסך הסחר.
      case 'SET_TRADE':
        return Object.assign({}, state, {
          ui: Object.assign({}, state.ui, { trade: Object.assign({}, state.ui.trade, action.patch) }),
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
        var cap = T.Selectors.resourceCap(state);
        var res = Object.assign({}, state.meta.resources);
        res[action.resource] = Math.min(cap, (res[action.resource] || 0) + action.amount);
        var cd = Object.assign({}, state.meta.zoneCd); cd[action.zoneId] = now;
        return Object.assign({}, state, { meta: Object.assign({}, state.meta, {
          resources: res, zoneCd: cd, dailyStats: bump(state.meta.dailyStats, 'collects', 1),
        }) });
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

      /* ---- כלכלת Catan: בנייה/שדרוג, סחר ---- */
      // בנייה או שדרוג מבנה — מנכה את עלות הרמה הנוכחית ומעלה רמה ב-1.
      case 'BUILD_BUILDING': {
        var b = T.BuildingById[action.id]; if (!b) return state;
        var lvl = (state.meta.buildings && state.meta.buildings[action.id]) || 0;
        var bcost = T.buildingCost(b, lvl);
        var bhave = state.meta.resources || {};
        for (var bk in bcost) if ((bhave[bk] || 0) < bcost[bk]) return state; // אין מספיק
        var bres = Object.assign({}, bhave);
        for (var bk2 in bcost) bres[bk2] = bres[bk2] - bcost[bk2];
        var nb = Object.assign({}, state.meta.buildings); nb[action.id] = lvl + 1;
        return Object.assign({}, state, { meta: Object.assign({}, state.meta, {
          resources: bres, buildings: nb, dailyStats: bump(state.meta.dailyStats, 'builds', 1),
        }) });
      }

      // סחר בבנק/נמל: נותנים rate יחידות מ-from, מקבלים יחידה אחת ל-to.
      case 'TRADE_RESOURCE': {
        var from = action.from, to = action.to;
        if (!from || !to || from === to) return state;
        var rate = T.Selectors.tradeRate(state);
        var thave = state.meta.resources || {};
        if ((thave[from] || 0) < rate) return state; // אין מספיק לסחר
        var tcap = T.Selectors.resourceCap(state);
        var tres = Object.assign({}, thave);
        tres[from] = tres[from] - rate;
        tres[to] = Math.min(tcap, (tres[to] || 0) + 1);
        return Object.assign({}, state, { meta: Object.assign({}, state.meta, {
          resources: tres, dailyStats: bump(state.meta.dailyStats, 'trades', 1),
        }) });
      }

      /* ---- עץ טכנולוגיות ---- */
      case 'RESEARCH_TECH': {
        var node = T.TechById[action.id]; if (!node) return state;
        var tech = state.meta.tech || {};
        if (tech[action.id]) return state;                 // כבר נחקר
        if (!T.techPrereqsMet(node, tech)) return state;   // חסר דרישת-קדם
        var cost = node.cost || {};
        if ((state.meta.techPoints || 0) < (cost.techPoints || 0)) return state;
        var rhave = state.meta.resources || {};
        for (var ck in cost) { if (ck === 'techPoints') continue; if ((rhave[ck] || 0) < cost[ck]) return state; }
        var rres = Object.assign({}, rhave);
        for (var ck2 in cost) { if (ck2 === 'techPoints') continue; rres[ck2] = rres[ck2] - cost[ck2]; }
        var ntech = Object.assign({}, tech); ntech[action.id] = true;
        return Object.assign({}, state, { meta: Object.assign({}, state.meta, {
          resources: rres, tech: ntech,
          techPoints: (state.meta.techPoints || 0) - (cost.techPoints || 0),
          dailyStats: bump(state.meta.dailyStats, 'researches', 1),
        }) });
      }

      /* ---- וו יומי: מעבר-יום, תביעת משימה יומית ופרס-רצף ---- */
      // השכבה החיצונית (main.js) שולחת את היום; כאן מאפסים מונים ומקדמים רצף.
      case 'SET_DAY': {
        if (!action.day || action.day === state.meta.day) return state;
        var prev = state.meta.streak || { count: 0, lastDay: null };
        var newCount;
        if (prev.lastDay && isYesterday(prev.lastDay, action.day)) newCount = (prev.count || 0) + 1;
        else newCount = 1; // יום ראשון או רצף שנשבר
        return Object.assign({}, state, { meta: Object.assign({}, state.meta, {
          day: action.day,
          streak: { count: newCount, lastDay: action.day },
          dailyClaimed: {},
          dailyStats: { collects: 0, trades: 0, builds: 0, researches: 0 },
          dayBaseTiles: T.Selectors.territorySize(state),
          dayBaseActiveMs: state.session.activeMs,
        }) });
      }
      case 'CLAIM_DAILY_MISSION': {
        var dms = T.Selectors.dailyMissions(state), dm = null;
        for (var di = 0; di < dms.length; di++) if (dms[di].id === action.id) dm = dms[di];
        if (!dm || !dm.done || dm.claimed) return state;
        var dclaimed = Object.assign({}, state.meta.dailyClaimed); dclaimed[action.id] = true;
        return grantReward(Object.assign({}, state, {
          meta: Object.assign({}, state.meta, { dailyClaimed: dclaimed }),
        }), dm.reward);
      }
      case 'CLAIM_STREAK': {
        var si = T.Selectors.streakInfo(state);
        if (!si.canClaim) return state;
        return grantReward(Object.assign({}, state, {
          meta: Object.assign({}, state.meta, { streakClaimedDay: state.meta.day }),
        }), si.reward);
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

  // מגדיל מונה יומי בערך נתון (מחזיר אובייקט חדש — אי-שינוי).
  function bump(stats, key, by) {
    var s = Object.assign({ collects: 0, trades: 0, builds: 0, researches: 0 }, stats);
    s[key] = (s[key] || 0) + by;
    return s;
  }

  // האם prevDay (YYYY-MM-DD) הוא בדיוק יום לפני curDay (לקידום רצף).
  function isYesterday(prevDay, curDay) {
    var p = Date.parse(prevDay + 'T00:00:00Z'), c = Date.parse(curDay + 'T00:00:00Z');
    if (isNaN(p) || isNaN(c)) return false;
    return c - p === 86400000;
  }

  // הענקת פרס (יהלומים/משאבים/נק'-מחקר) — משאבים נחסמים בקיבולת.
  function grantReward(state, reward) {
    if (!reward) return state;
    var meta = state.meta;
    var patch = {};
    if (reward.gems) patch.gems = (meta.gems || 0) + reward.gems;
    if (reward.techPoints) patch.techPoints = (meta.techPoints || 0) + reward.techPoints;
    if (reward.res) {
      var cap = T.Selectors.resourceCap(state);
      var res = Object.assign({}, meta.resources);
      for (var rk in reward.res) res[rk] = Math.min(cap, (res[rk] || 0) + reward.res[rk]);
      patch.resources = res;
    }
    return Object.assign({}, state, { meta: Object.assign({}, meta, patch) });
  }

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
