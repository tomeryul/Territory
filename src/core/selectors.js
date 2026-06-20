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

  function activeTimeLabel(state) {
    var sec = Math.floor(state.session.activeMs / 1000);
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  // שניות עד המשבצת הבאה (לפי מודל העלות המואט).
  function nextTileLabel(state) {
    var cost = L.costFor(ownedCount(state));
    var remain = Math.max(0, cost - state.session.growthMs);
    return Math.ceil(remain / 1000) + 'ש׳';
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
    activeTimeLabel: activeTimeLabel,
    nextTileLabel: nextTileLabel,
    portfolioValue: portfolioValue,
    formatValue: formatValue,
    tileValue: tileValue,
    selectedTile: selectedTile,
    scene: scene,
  };
})(window.Territory);
