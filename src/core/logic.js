/* =====================================================================
 * logic.js — הלוגיקה העסקית הטהורה של המשחק
 * ---------------------------------------------------------------------
 * [לוגיקה ניידת / PORTABLE LOGIC]
 * פונקציות טהורות בלבד: קלט -> פלט, ללא תופעות לוואי, ללא DOM.
 * כולל: גריד/שכנות, גידול אוטומטי, טרנספורמציות מצלמה (world<->screen),
 * וזריעת העולם (אזורים מיוחדים). זה החלק שעובר ~1:1 לכל פלטפורמה.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  var Config = T.Config;

  /* ---- מפתוח משבצות: (x,y) <-> "x,y" -------------------------------- */
  function key(x, y) { return x + ',' + y; }
  function parseKey(k) { var p = k.split(','); return { x: +p[0], y: +p[1] }; }

  function inWorld(x, y) {
    return x >= 0 && y >= 0 && x < Config.world.width && y < Config.world.height;
  }

  /* ---- שכנוּת (4 כיוונים) — בסיס לחוק "רק משבצות צמודות" ------------- */
  function neighbors(x, y) {
    return [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
  }

  /* ---- גידול אוטומטי -------------------------------------------------- */
  // כמה משבצות אמורות להיות לשחקן לפי הזמן הפעיל (כולל משבצת ההתחלה).
  function growthTarget(activeMs) {
    return 1 + Math.floor(activeMs / Config.growth.msPerTile);
  }
  // זמן (ms) עד המשבצת הבאה.
  function msToNextTile(activeMs) {
    return Config.growth.msPerTile - (activeMs % Config.growth.msPerTile);
  }

  // המשבצת הבאה שתתווסף אוטומטית: המשבצת הפנויה (לא אזור, בעולם) הצמודה
  // לטריטוריה, הקרובה ביותר לנקודת ההתחלה — כך הטריטוריה גדלה קומפקטית
  // (כמו דיסק) ולא קופצת. דטרמיניסטי לחלוטין.
  function nextGrowthTile(state) {
    var s = Config.start;
    var owned = state.tiles;
    var best = null, bestD = Infinity, bestKey = null;
    var seen = {};

    for (var k in owned) {
      if (owned[k].ownerId !== state.currentUserId) continue;
      var t = owned[k];
      var nb = neighbors(t.x, t.y);
      for (var i = 0; i < nb.length; i++) {
        var nx = nb[i][0], ny = nb[i][1];
        var nk = key(nx, ny);
        if (seen[nk]) continue;
        seen[nk] = true;
        if (!inWorld(nx, ny)) continue;
        if (owned[nk]) continue;                       // כבר תפוסה
        if (state.zones && state.zones[nk]) continue;  // אזור מיוחד — לא ניתן
        var dx = nx - s.x, dy = ny - s.y;
        var d = dx * dx + dy * dy;
        // tie-break דטרמיניסטי לפי קואורדינטות
        if (d < bestD || (d === bestD && nk < bestKey)) {
          bestD = d; best = { x: nx, y: ny }; bestKey = nk;
        }
      }
    }
    return best;
  }

  /* ---- טרנספורמציות מצלמה (world <-> screen), טהורות ---------------- */
  // scale = פיקסלים למשבצת. המרכז (centerX/Y) ממופה למרכז המסך.
  function worldToScreenX(cam, viewW, wx) { return viewW / 2 + (wx - cam.centerX) * cam.scale; }
  function worldToScreenY(cam, viewH, wy) { return viewH / 2 + (wy - cam.centerY) * cam.scale; }
  function screenToWorldX(cam, viewW, px) { return cam.centerX + (px - viewW / 2) / cam.scale; }
  function screenToWorldY(cam, viewH, py) { return cam.centerY + (py - viewH / 2) / cam.scale; }

  // משבצת מתחת לנקודת מסך.
  function screenToTile(cam, viewW, viewH, px, py) {
    return {
      x: Math.floor(screenToWorldX(cam, viewW, px)),
      y: Math.floor(screenToWorldY(cam, viewH, py)),
    };
  }

  // ה-scale המינימלי שבו כל העולם נכנס לתצוגה.
  function fitScale(viewW, viewH) {
    return Math.min(viewW / Config.world.width, viewH / Config.world.height);
  }

  // הגבלת ה-scale לטווח חוקי [fit, maxScale].
  function clampScale(scale, viewW, viewH) {
    var min = fitScale(viewW, viewH);
    return Math.max(min, Math.min(Config.camera.maxScale, scale));
  }

  // הגבלת מרכז המצלמה לגבולות העולם.
  function clampCenter(cx, cy) {
    return {
      x: Math.max(0, Math.min(Config.world.width, cx)),
      y: Math.max(0, Math.min(Config.world.height, cy)),
    };
  }

  // טווח המשבצות הנראות (כולל שוליים), חתוך לגבולות העולם.
  function visibleRange(cam, viewW, viewH) {
    var halfW = (viewW / 2) / cam.scale, halfH = (viewH / 2) / cam.scale;
    return {
      minX: Math.max(0, Math.floor(cam.centerX - halfW) - 1),
      maxX: Math.min(Config.world.width - 1, Math.ceil(cam.centerX + halfW) + 1),
      minY: Math.max(0, Math.floor(cam.centerY - halfH) - 1),
      maxY: Math.min(Config.world.height - 1, Math.ceil(cam.centerY + halfH) + 1),
    };
  }

  /* ---- זריעת העולם ההתחלתי (טהורה, דטרמיניסטית) --------------------- */
  // משבצת התחלה של השחקן + "אזורים" מיוחדים רב-משבצתיים (ים/עיר/רכבת).
  // האזורים אינם ניתנים לכיבוש — הם חלק מהנוף.
  function seedWorld() {
    var s = Config.start;
    var pal = T.Tokens.palette;
    var users = { me: { id: 'me', name: 'אני', color: pal.brand } };

    var tiles = {};
    tiles[key(s.x, s.y)] = { x: s.x, y: s.y, ownerId: 'me', color: users.me.color, imageUrl: null };

    var zonesInfo = {
      sea: { name: 'ים', emoji: '🌊' },
      city: { name: 'עיר', emoji: '🏙️' },
      rail: { name: 'רכבת', emoji: '🚆' },
    };

    var zones = {};        // "x,y" -> סוג אזור
    var zoneAnchors = {};  // "x,y" -> סוג (משבצת שתישא תווית)

    function rect(type, x0, x1, y0, y1) {
      for (var x = x0; x <= x1; x++) {
        for (var y = y0; y <= y1; y++) zones[key(x, y)] = type;
      }
      zoneAnchors[key(x0, y0)] = type;
    }
    function line(type, pts) {
      pts.forEach(function (p) { zones[key(p[0], p[1])] = type; });
      zoneAnchors[key(pts[0][0], pts[0][1])] = type;
    }

    // משאירים מרחב פנוי סביב ההתחלה כדי שהגידול יתחיל בנוחות.
    rect('sea', s.x - 14, s.x - 6, s.y + 4, s.y + 12);   // ים — בלוק גדול משמאל-מטה
    rect('city', s.x + 6, s.x + 12, s.y - 12, s.y - 5);  // עיר — בלוק מימין-מעלה
    var rail = [];                                       // רכבת — קו ארוך אופקי
    for (var rx = s.x - 18; rx <= s.x + 18; rx++) rail.push([rx, s.y + 16]);
    line('rail', rail);

    return {
      users: users, tiles: tiles,
      zones: zones, zonesInfo: zonesInfo, zoneAnchors: zoneAnchors,
    };
  }

  T.Logic = {
    key: key, parseKey: parseKey, inWorld: inWorld, neighbors: neighbors,
    growthTarget: growthTarget, msToNextTile: msToNextTile, nextGrowthTile: nextGrowthTile,
    worldToScreenX: worldToScreenX, worldToScreenY: worldToScreenY,
    screenToWorldX: screenToWorldX, screenToWorldY: screenToWorldY,
    screenToTile: screenToTile, fitScale: fitScale, clampScale: clampScale,
    clampCenter: clampCenter, visibleRange: visibleRange, seedWorld: seedWorld,
  };
})(window.Territory);
