/* =====================================================================
 * selectors.js — נתונים נגזרים (Derived data), טהורים
 * ---------------------------------------------------------------------
 * [לוגיקה ניידת / PORTABLE LOGIC]
 * מחשב "נתונים מוכנים לציור" מתוך ה-state, בלי DOM. שכבת ה-canvas רק
 * מציירת את מה שמחזירים כאן — היא לא מחשבת גאומטריה או חוקים בעצמה.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  var Config = T.Config;
  var L = T.Logic;

  function territorySize(state) {
    var n = 0;
    for (var k in state.tiles) if (state.tiles[k].ownerId === state.currentUserId) n++;
    return n;
  }

  function activeTimeLabel(state) {
    var sec = Math.floor(state.session.activeMs / 1000);
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  // שניות עד המשבצת הבאה (טיימר לתצוגה).
  function nextTileLabel(state) {
    return Math.ceil(L.msToNextTile(state.session.activeMs) / 1000) + 'ש׳';
  }

  function selectedTile(state) {
    var sel = state.ui.selection;
    if (!sel) return null;
    var k = L.key(sel.x, sel.y);
    var tile = state.tiles[k];
    if (tile) return Object.assign({ zone: null }, tile);
    var zType = (state.zones && state.zones[k]) || null;
    return {
      x: sel.x, y: sel.y, ownerId: null, color: null, imageUrl: null,
      zone: zType, zoneInfo: zType ? state.zonesInfo[zType] : null,
    };
  }

  // תיבת-תוחמת לכל סוג אזור (לצורך אנימציות גלובליות כמו רכבת נעה).
  function zoneBounds(state) {
    var b = {};
    for (var k in state.zones) {
      var type = state.zones[k];
      var p = L.parseKey(k);
      var z = b[type] || (b[type] = { minX: p.x, maxX: p.x, minY: p.y, maxY: p.y });
      if (p.x < z.minX) z.minX = p.x; if (p.x > z.maxX) z.maxX = p.x;
      if (p.y < z.minY) z.minY = p.y; if (p.y > z.maxY) z.maxY = p.y;
    }
    return b;
  }

  /* ---- scene: כל מה שצריך לצייר פריים, ביחידות מסך ------------------ */
  // מקבל את ממדי ה-canvas (CSS px). מחזיר רשימות מוכנות-לציור.
  function scene(state, viewW, viewH) {
    var cam = state.camera;
    var scale = cam.scale;
    var rng = L.visibleRange(cam, viewW, viewH);
    var meId = state.currentUserId;

    function sx(wx) { return L.worldToScreenX(cam, viewW, wx); }
    function sy(wy) { return L.worldToScreenY(cam, viewH, wy); }
    function inView(x, y) { return x >= rng.minX && x <= rng.maxX && y >= rng.minY && y <= rng.maxY; }

    // אזורים נראים (sparse — מעט ערכים).
    var zones = [];
    for (var zk in state.zones) {
      var zp = L.parseKey(zk);
      if (!inView(zp.x, zp.y)) continue;
      var type = state.zones[zk];
      zones.push({
        x: zp.x, y: zp.y, sx: sx(zp.x), sy: sy(zp.y), size: scale, type: type,
        anchor: state.zoneAnchors[zk] === type,
        info: state.zonesInfo[type],
      });
    }

    // משבצות בבעלות נראות.
    var tiles = [];
    for (var tk in state.tiles) {
      var t = state.tiles[tk];
      if (t.ownerId !== meId) continue;
      if (!inView(t.x, t.y)) continue;
      tiles.push({
        x: t.x, y: t.y, sx: sx(t.x), sy: sy(t.y), size: scale,
        color: t.color, imageUrl: t.imageUrl,
      });
    }

    // בחירה בודדת + בחירה מרובה (מסגרות הדגשה).
    var selection = null;
    if (state.ui.selection) {
      var s = state.ui.selection;
      selection = { sx: sx(s.x), sy: sy(s.y), size: scale };
    }
    var multi = [];
    if (state.ui.multiSelect.on) {
      state.ui.multiSelect.keys.forEach(function (mk) {
        var mp = L.parseKey(mk);
        if (inView(mp.x, mp.y)) multi.push({ sx: sx(mp.x), sy: sy(mp.y), size: scale });
      });
    }

    return {
      scale: scale,
      detail: scale >= Config.camera.detailScale, // לצייר פירוט + אנימציה
      showGrid: scale >= Config.camera.gridScale,
      view: { w: viewW, h: viewH },
      // מלבן העולם במסך (לרקע ולגבול).
      worldRect: { x: sx(0), y: sy(0), w: state.world.width * scale, h: state.world.height * scale },
      range: rng,
      origin: { x: sx(rng.minX), y: sy(rng.minY) },
      zones: zones,
      zoneBounds: zoneBounds(state),
      sx0: sx(0), sy0: sy(0), // נקודת עיגון להמרת world->screen בתוך הרנדרר
      tiles: tiles,
      selection: selection,
      multi: multi,
    };
  }

  T.Selectors = {
    territorySize: territorySize,
    activeTimeLabel: activeTimeLabel,
    nextTileLabel: nextTileLabel,
    selectedTile: selectedTile,
    scene: scene,
  };
})(window.Territory);
