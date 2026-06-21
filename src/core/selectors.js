/* =====================================================================
 * selectors.js — נתונים נגזרים (Derived data), טהורים
 * ---------------------------------------------------------------------
 * [לוגיקה ניידת / PORTABLE LOGIC]
 * מחשב "נתונים מוכנים לציור/תצוגה" מתוך ה-state, בלי DOM. כולל את
 * scene() (מה לצייר בכל פריים, דרך אינדקס מרחבי) ואת מנגנון השווי.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  var Config = T.Config;
  var L = T.Logic;

  function ownedCount(state) {
    var n = 0;
    for (var k in state.tiles) if (state.tiles[k].ownerId === state.currentUserId) n++;
    return n;
  }
  function territorySize(state) { return ownedCount(state); }

  // כל מפתחות המשבצות שבבעלות השחקן (לעריכת כל הטריטוריה יחד).
  function myTileKeys(state) {
    var keys = [];
    for (var k in state.tiles) if (state.tiles[k].ownerId === state.currentUserId) keys.push(k);
    return keys;
  }

  function activeTimeLabel(state) {
    var sec = Math.floor(state.session.activeMs / 1000);
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  // זמן עד הטייל הבא — פורמט HH:MM:SS. מושפע מטכנולוגיות גידול.
  function nextTileMs(state) {
    return Math.max(0, effectiveMsPerTile(state) - state.session.growthMs);
  }
  function nextTileLabel(state) {
    var s = Math.ceil(nextTileMs(state) / 1000);
    var hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return (hh > 0 ? p(hh) + ':' : '') + p(mm) + ':' + p(ss);
  }
  function growthProgress(state) {
    var cost = effectiveMsPerTile(state);
    return cost ? state.session.growthMs / cost : 0;
  }

  /* ---- משאבים ואיסוף מאזורים ---- */
  function resourceCount(state, id) { return (state.meta.resources && state.meta.resources[id]) || 0; }
  function zoneCooldownRemainingMs(state, zoneId) {
    var last = state.meta.zoneCd && state.meta.zoneCd[zoneId];
    if (last == null) return 0;
    return Math.max(0, Config.resources.cooldownMs - (state.session.activeMs - last));
  }
  function zoneReady(state, zoneId) { return zoneCooldownRemainingMs(state, zoneId) <= 0; }

  /* ================================================================== *
   * כלכלת Catan: מבנים, ייצור פסיבי, קיבולת, סחר, טכנולוגיות, וו-יומי.
   * כל המתמטיקה כאן (מקור-אמת יחיד) — ה-reducer קורא לפונקציות בזמן ריצה.
   * ================================================================== */

  function buildingLevel(state, id) {
    return (state.meta.buildings && state.meta.buildings[id]) || 0;
  }
  function techOwned(state) { return (state.meta.tech) || {}; }
  function techPoints(state) { return (state.meta.techPoints) || 0; }

  // צבירת אפקטי הטכנולוגיות שנחקרו → בונוסים גלובליים.
  function techMods(state) {
    var m = { prodPct: 0, capBonus: 0, tradeBonus: 0, growthMult: 1 };
    var tech = techOwned(state);
    for (var id in tech) {
      if (!tech[id]) continue;
      var node = T.TechById[id]; if (!node) continue;
      var e = node.effect || {};
      if (e.prodPct) m.prodPct += e.prodPct;
      if (e.capBonus) m.capBonus += e.capBonus;
      if (e.tradeBonus) m.tradeBonus += e.tradeBonus;
      if (e.growthMult) m.growthMult *= e.growthMult;
    }
    return m;
  }

  // ייצור-משאבים לדקה, פר-משאב (כולל בונוס ייצור מטכנולוגיות).
  function productionRates(state) {
    var rates = {};
    var pct = 1 + techMods(state).prodPct / 100;
    T.Buildings.forEach(function (b) {
      if (!b.produces || b.produces === 'tech') return;
      var lvl = buildingLevel(state, b.id);
      if (!lvl) return;
      rates[b.produces] = (rates[b.produces] || 0) + T.buildingYield(b, lvl) * pct;
    });
    return rates;
  }
  // נקודות-מחקר לדקה (ממעבדות) — לא מושפע מבונוס הייצור (נשמר איטי).
  function techRate(state) {
    var tp = 0;
    T.Buildings.forEach(function (b) {
      if (b.produces !== 'tech') return;
      tp += T.buildingYield(b, buildingLevel(state, b.id));
    });
    return tp;
  }

  // קיבולת אחסון לכל משאב (Catan hand-limit) — בסיס + מחסנים + מחקר.
  function resourceCap(state) {
    var cap = Config.storage.baseCap;
    T.Buildings.forEach(function (b) {
      if (!b.cap) return;
      cap += b.cap * buildingLevel(state, b.id);
    });
    return cap + techMods(state).capBonus;
  }

  // יחס סחר נוכחי (n:1) — בסיס פחות נמלים פחות בונוס-מחקר, עם רצפה.
  function tradeRate(state) {
    var rate = Config.economy.bankRate;
    T.Buildings.forEach(function (b) {
      if (!b.trade) return;
      rate -= b.trade * buildingLevel(state, b.id);
    });
    rate -= techMods(state).tradeBonus;
    return Math.max(Config.economy.minRate, rate);
  }
  // תצוגה מקדימה של עסקה: נותנים rate מ-from, מקבלים 1 ל-to.
  function tradePreview(state, from, to) {
    var rate = tradeRate(state);
    return {
      from: from, to: to, give: rate, get: 1, rate: rate,
      canTrade: from && to && from !== to && resourceCount(state, from) >= rate,
    };
  }

  // זמן-לטייל אפקטיבי (ms) אחרי טכנולוגיות גידול (עם רצפה).
  function effectiveMsPerTile(state) {
    var base = Config.growth.msPerTile * techMods(state).growthMult;
    return Math.max(60 * 1000, Math.round(base)); // לא פחות מדקה לטייל
  }

  // רשימת מבנים מוכנה-לתצוגה: רמה, תפוקה נוכחית/הבאה, עלות-שדרוג, האם משיג.
  function buildingList(state) {
    return T.Buildings.map(function (b) {
      var lvl = buildingLevel(state, b.id);
      var cost = T.buildingCost(b, lvl);
      var afford = true;
      for (var k in cost) if (resourceCount(state, k) < cost[k]) afford = false;
      return {
        building: b, id: b.id, level: lvl, cost: cost, canAfford: afford,
        curYield: T.buildingYield(b, lvl), nextYield: T.buildingYield(b, lvl + 1),
      };
    });
  }

  // רשימת טכנולוגיות מוכנה-לתצוגה: בבעלות/נעול/בר-השגה + עלות.
  function techList(state) {
    var tech = techOwned(state);
    return T.Tech.map(function (n) {
      var owned = !!tech[n.id];
      var unlocked = T.techPrereqsMet(n, tech);
      var afford = (techPoints(state) >= (n.cost.techPoints || 0));
      for (var k in n.cost) { if (k === 'techPoints') continue; if (resourceCount(state, k) < n.cost[k]) afford = false; }
      return { node: n, id: n.id, owned: owned, unlocked: unlocked, canResearch: !owned && unlocked && afford };
    });
  }

  /* ---- וו יומי: משימות מתחלפות + רצף התחברות ---- */
  function dailyMetric(state, metric) {
    var d = state.meta.dailyStats || {};
    switch (metric) {
      case 'collects': return d.collects || 0;
      case 'trades': return d.trades || 0;
      case 'builds': return d.builds || 0;
      case 'researches': return d.researches || 0;
      case 'tilesToday': return Math.max(0, territorySize(state) - (state.meta.dayBaseTiles || 0));
      case 'minutesToday': return Math.floor(Math.max(0, state.session.activeMs - (state.meta.dayBaseActiveMs || 0)) / 60000);
      default: return 0;
    }
  }
  function dailyMissions(state) {
    var ids = T.dailyPick(state.meta.day);
    var claimed = state.meta.dailyClaimed || {};
    return ids.map(function (id) {
      var def = T.DailyById[id];
      var cur = Math.min(def.target, dailyMetric(state, def.metric));
      return {
        id: id, title: def.title, current: cur, target: def.target, reward: def.reward,
        done: cur >= def.target, claimed: !!claimed[id],
      };
    });
  }
  function streakInfo(state) {
    var st = state.meta.streak || { count: 0, lastDay: null };
    var count = st.count || 0;
    var canClaim = count > 0 && state.meta.streakClaimedDay !== state.meta.day;
    return {
      count: count, lastDay: st.lastDay,
      reward: T.streakReward(count || 1),
      canClaim: canClaim,
      dayIndex: count > 0 ? ((count - 1) % 7) : 0, // 0..6 בתוך מחזור 7-ימים
    };
  }

  /* ---- שווי: משבצת שווה יותר ככל שצמודה לאזורים בעלי-ערך ----------- */
  // מלמד "מיקום": קרבה לעיר/תשתית/מים מעלה ערך — כמו נדל"ן אמיתי.
  function tileValue(state, x, y) {
    var v = 1; // ערך בסיס לכל קרקע
    var nb = L.neighbors(x, y);
    for (var i = 0; i < nb.length; i++) {
      var zt = state.zones[L.key(nb[i][0], nb[i][1])];
      if (zt && state.zonesInfo[zt]) v += state.zonesInfo[zt].value;
    }
    return v;
  }
  function portfolioValue(state) {
    var sum = 0;
    for (var k in state.tiles) {
      var t = state.tiles[k];
      if (t.ownerId === state.currentUserId) sum += tileValue(state, t.x, t.y);
    }
    return sum;
  }
  function formatValue(v) { return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(v); }

  function selectedTile(state) {
    var sel = state.ui.selection;
    if (!sel) return null;
    var k = L.key(sel.x, sel.y);
    var tile = state.tiles[k];
    if (tile) return Object.assign({ zone: null, value: tileValue(state, sel.x, sel.y) }, tile);
    var zType = (state.zones && state.zones[k]) || null;
    return {
      x: sel.x, y: sel.y, ownerId: null, color: null, imageUrl: null,
      zone: zType, zoneInfo: zType ? state.zonesInfo[zType] : null,
    };
  }

  /* ---- scene: כל מה שצריך לצייר פריים, ביחידות מסך ------------------ */
  function scene(state, viewW, viewH) {
    var cam = state.camera, scale = cam.scale;
    var rng = L.visibleRange(cam, viewW, viewH);
    var meId = state.currentUserId;
    var BS = Config.bucket;

    function sx(wx) { return L.worldToScreenX(cam, viewW, wx); }
    function sy(wy) { return L.worldToScreenY(cam, viewH, wy); }
    function inView(x, y) { return x >= rng.minX && x <= rng.maxX && y >= rng.minY && y <= rng.maxY; }

    // אזורים נראים — דרך האינדקס המרחבי (סורקים רק דליים סמוכים).
    var zones = [];
    for (var bx = Math.floor(rng.minX / BS); bx <= Math.floor(rng.maxX / BS); bx++) {
      for (var by = Math.floor(rng.minY / BS); by <= Math.floor(rng.maxY / BS); by++) {
        var arr = state.zoneBuckets[bx + ',' + by];
        if (!arr) continue;
        for (var i = 0; i < arr.length; i++) {
          var c = arr[i];
          if (!inView(c.x, c.y)) continue;
          zones.push({ x: c.x, y: c.y, sx: sx(c.x), sy: sy(c.y), size: scale, type: c.type, anchor: c.anchor, info: state.zonesInfo[c.type] });
        }
      }
    }

    // אזורי רכבת נראים (לציור רכבת נעה לכל קו).
    var rails = [];
    for (var r = 0; r < state.regions.length; r++) {
      var rg = state.regions[r];
      if (rg.type !== 'rail') continue;
      if (rg.maxX < rng.minX || rg.minX > rng.maxX || rg.maxY < rng.minY || rg.minY > rng.maxY) continue;
      rails.push({ minX: rg.minX, maxX: rg.maxX, minY: rg.minY, maxY: rg.maxY, horiz: rg.horiz });
    }

    // משבצות בבעלות נראות.
    var tiles = [];
    for (var tk in state.tiles) {
      var t = state.tiles[tk];
      if (t.ownerId !== meId || !inView(t.x, t.y)) continue;
      tiles.push({ x: t.x, y: t.y, sx: sx(t.x), sy: sy(t.y), size: scale, color: t.color, imageUrl: t.imageUrl, opacity: t.opacity == null ? 1 : t.opacity,
        mask: L.neighborMask8(state.tiles, meId, t.x, t.y),
        selected: !!(state.ui.selection && state.ui.selection.x === t.x && state.ui.selection.y === t.y) });
    }

    var selection = null;
    if (state.ui.selection) selection = { sx: sx(state.ui.selection.x), sy: sy(state.ui.selection.y), size: scale };
    var multi = [];
    if (state.ui.multiSelect.on) {
      state.ui.multiSelect.keys.forEach(function (mk) {
        var mp = L.parseKey(mk);
        if (inView(mp.x, mp.y)) multi.push({ sx: sx(mp.x), sy: sy(mp.y), size: scale });
      });
    }

    var detail = scale >= Config.camera.detailScale;
    var animatedTypes = { sea: 1, lake: 1, city: 1, factory: 1, rail: 1 };
    // אנימציה רצה כשיש פירוט וגם משהו שזז: אזורים, טריטוריה (זוהר ניאון)
    // או בחירה (פעימת זוהר).
    var animated = detail && (rails.length > 0 || tiles.length > 0 || !!selection ||
      zones.some(function (z) { return animatedTypes[z.type]; }));

    return {
      scale: scale,
      detail: detail,
      animated: animated,
      showGrid: scale >= Config.camera.gridScale,
      view: { w: viewW, h: viewH },
      worldRect: { x: sx(0), y: sy(0), w: state.world.width * scale, h: state.world.height * scale },
      range: rng, sx0: sx(0), sy0: sy(0),
      zones: zones, rails: rails, tiles: tiles, selection: selection, multi: multi,
    };
  }

  T.Selectors = {
    territorySize: territorySize,
    myTileKeys: myTileKeys,
    nextTileMs: nextTileMs, growthProgress: growthProgress,
    resourceCount: resourceCount, zoneCooldownRemainingMs: zoneCooldownRemainingMs, zoneReady: zoneReady,
    // כלכלה / טכנולוגיות / וו-יומי
    buildingLevel: buildingLevel, techMods: techMods, techPoints: techPoints,
    productionRates: productionRates, techRate: techRate,
    resourceCap: resourceCap, tradeRate: tradeRate, tradePreview: tradePreview,
    effectiveMsPerTile: effectiveMsPerTile,
    buildingList: buildingList, techList: techList,
    dailyMissions: dailyMissions, streakInfo: streakInfo,
    activeTimeLabel: activeTimeLabel,
    nextTileLabel: nextTileLabel,
    portfolioValue: portfolioValue,
    formatValue: formatValue,
    tileValue: tileValue,
    selectedTile: selectedTile,
    scene: scene,
  };
})(window.Territory);
