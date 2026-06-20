/* =====================================================================
 * logic.js — הלוגיקה העסקית הטהורה של המשחק
 * ---------------------------------------------------------------------
 * [לוגיקה ניידת / PORTABLE LOGIC]
 * פונקציות טהורות בלבד, ללא DOM. כולל: גריד/שכנות, גידול אוטומטי מואט,
 * טרנספורמציות מצלמה, ופיזור פרוצדורלי של אזורים בכל העולם + אינדקס מרחבי.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  var Config = T.Config;

  function key(x, y) { return x + ',' + y; }
  function parseKey(k) { var p = k.split(','); return { x: +p[0], y: +p[1] }; }
  function inWorld(x, y) { return x >= 0 && y >= 0 && x < Config.world.width && y < Config.world.height; }
  function neighbors(x, y) { return [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]; }

  // מסכת 8 שכנים בבעלות אותו שחקן (ל-autotiling: בחירת חלק הטייל הנכון).
  // סדר הביטים: N=1, NE=2, E=4, SE=8, S=16, SW=32, W=64, NW=128.
  function neighborMask8(tiles, ownerId, x, y) {
    function own(nx, ny) { var t = tiles[key(nx, ny)]; return t && t.ownerId === ownerId ? 1 : 0; }
    return own(x, y - 1) * 1 + own(x + 1, y - 1) * 2 + own(x + 1, y) * 4 + own(x + 1, y + 1) * 8 +
           own(x, y + 1) * 16 + own(x - 1, y + 1) * 32 + own(x - 1, y) * 64 + own(x - 1, y - 1) * 128;
  }

  // מפתח תא באינדקס המרחבי (bucket) — לאיסוף מהיר של אזורים נראים.
  function bucketKey(x, y) {
    return Math.floor(x / Config.bucket) + ',' + Math.floor(y / Config.bucket);
  }

  /* ---- גידול אוטומטי בקצב קבוע --------------------------------------- */
  // הזמן (ms) הדרוש לכל טייל נוסף — קבוע (30 דקות), ללא תלות בגודל.
  function costFor(owned) {
    return Config.growth.msPerTile;
  }

  // המשבצת הבאה שתתווסף: הפנויה (לא אזור, בעולם) הצמודה לטריטוריה,
  // הקרובה ביותר לנקודת ההתחלה — גידול קומפקטי ודטרמיניסטי.
  function nextGrowthTile(state) {
    var s = Config.start, owned = state.tiles;
    var best = null, bestD = Infinity, bestKey = null, seen = {};
    for (var k in owned) {
      if (owned[k].ownerId !== state.currentUserId) continue;
      var nb = neighbors(owned[k].x, owned[k].y);
      for (var i = 0; i < nb.length; i++) {
        var nx = nb[i][0], ny = nb[i][1], nk = key(nx, ny);
        if (seen[nk]) continue; seen[nk] = true;
        if (!inWorld(nx, ny) || owned[nk] || (state.zones && state.zones[nk])) continue;
        var dx = nx - s.x, dy = ny - s.y, d = dx * dx + dy * dy;
        if (d < bestD || (d === bestD && nk < bestKey)) { bestD = d; best = { x: nx, y: ny }; bestKey = nk; }
      }
    }
    return best;
  }

  /* ---- טרנספורמציות מצלמה (world <-> screen), טהורות ---------------- */
  function worldToScreenX(cam, viewW, wx) { return viewW / 2 + (wx - cam.centerX) * cam.scale; }
  function worldToScreenY(cam, viewH, wy) { return viewH / 2 + (wy - cam.centerY) * cam.scale; }
  function screenToWorldX(cam, viewW, px) { return cam.centerX + (px - viewW / 2) / cam.scale; }
  function screenToWorldY(cam, viewH, py) { return cam.centerY + (py - viewH / 2) / cam.scale; }
  function screenToTile(cam, viewW, viewH, px, py) {
    return { x: Math.floor(screenToWorldX(cam, viewW, px)), y: Math.floor(screenToWorldY(cam, viewH, py)) };
  }
  function fitScale(viewW, viewH) { return Math.min(viewW / Config.world.width, viewH / Config.world.height); }
  function clampScale(scale, viewW, viewH) {
    return Math.max(fitScale(viewW, viewH), Math.min(Config.camera.maxScale, scale));
  }
  function clampCenter(cx, cy) {
    return { x: Math.max(0, Math.min(Config.world.width, cx)), y: Math.max(0, Math.min(Config.world.height, cy)) };
  }
  function visibleRange(cam, viewW, viewH) {
    var halfW = (viewW / 2) / cam.scale, halfH = (viewH / 2) / cam.scale;
    return {
      minX: Math.max(0, Math.floor(cam.centerX - halfW) - 1),
      maxX: Math.min(Config.world.width - 1, Math.ceil(cam.centerX + halfW) + 1),
      minY: Math.max(0, Math.floor(cam.centerY - halfH) - 1),
      maxY: Math.min(Config.world.height - 1, Math.ceil(cam.centerY + halfH) + 1),
    };
  }

  /* ---- PRNG דטרמיניסטי (mulberry32) -------------------------------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---- זריעת העולם: משבצת התחלה + פיזור אזורים בכל העולם ----------- */
  function seedWorld() {
    var s = Config.start, g = Config.gen, W = Config.world.width, H = Config.world.height;
    var users = { me: { id: 'me', name: 'אני', color: T.Tokens.palette.brand } };

    var tiles = {};
    tiles[key(s.x, s.y)] = { x: s.x, y: s.y, ownerId: 'me', color: users.me.color, imageUrl: null };

    var zones = {};        // "x,y" -> סוג אזור
    var zoneAnchors = {};  // "x,y" -> סוג (משבצת שתישא תווית)
    var regions = [];      // רשימת אזורים עם גבולות (לאנימציות כמו רכבת)
    var buckets = {};      // אינדקס מרחבי: bucketKey -> [{x,y,type,anchor}]

    var rng = mulberry32(g.seed);

    // הגרלת סוג לפי משקלים.
    var weights = T.ZoneWeights, totalW = 0;
    for (var wi = 0; wi < weights.length; wi++) totalW += weights[wi][1];
    function pickType() {
      var r = rng() * totalW;
      for (var i = 0; i < weights.length; i++) { r -= weights[i][1]; if (r <= 0) return weights[i][0]; }
      return weights[0][0];
    }
    function rint(min, max) { return min + Math.floor(rng() * (max - min + 1)); }

    function addCell(x, y, type) {
      if (!inWorld(x, y)) return;
      if (x === s.x && y === s.y) return;            // לא דורסים את ההתחלה
      var k = key(x, y);
      if (zones[k]) return;                          // לא דורסים אזור קיים
      zones[k] = type;
      var bk = bucketKey(x, y);
      (buckets[bk] || (buckets[bk] = [])).push({ x: x, y: y, type: type, anchor: false });
    }

    // צורות אזור לפי סוג.
    function shapeFor(type) {
      switch (type) {
        case 'sea': return { kind: 'blob', w: rint(8, 16), h: rint(6, 12) };
        case 'desert': return { kind: 'blob', w: rint(8, 15), h: rint(6, 11) };
        case 'lake': return { kind: 'blob', w: rint(4, 7), h: rint(3, 6) };
        case 'forest': return { kind: 'blob', w: rint(6, 12), h: rint(5, 10) };
        case 'mountain': return { kind: 'blob', w: rint(5, 9), h: rint(4, 7) };
        case 'city': return { kind: 'rect', w: rint(4, 8), h: rint(4, 8) };
        case 'farm': return { kind: 'rect', w: rint(6, 12), h: rint(4, 8) };
        case 'park': return { kind: 'rect', w: rint(3, 6), h: rint(3, 5) };
        case 'factory': return { kind: 'rect', w: rint(3, 6), h: rint(3, 5) };
        case 'rail': return { kind: 'line', len: rint(10, 28), horiz: rng() < 0.5 };
        default: return { kind: 'rect', w: rint(4, 6), h: rint(4, 6) };
      }
    }

    function place(type, cx, cy) {
      var sh = shapeFor(type), minX = cx, minY = cy, maxX = cx, maxY = cy, anchored = false;
      function mark(x, y) {
        addCell(x, y, type);
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
      if (sh.kind === 'line') {
        for (var i = 0; i < sh.len; i++) mark(sh.horiz ? cx + i : cx, sh.horiz ? cy : cy + i);
      } else {
        var x0 = cx - (sh.w >> 1), y0 = cy - (sh.h >> 1);
        for (var x = x0; x < x0 + sh.w; x++) {
          for (var y = y0; y < y0 + sh.h; y++) {
            // blob: מורידים פינות אקראית כדי לקבל צורה אורגנית
            if (sh.kind === 'blob') {
              var edgeX = (x === x0 || x === x0 + sh.w - 1);
              var edgeY = (y === y0 || y === y0 + sh.h - 1);
              if (edgeX && edgeY && rng() < 0.85) continue;
              if ((edgeX || edgeY) && rng() < 0.25) continue;
            }
            mark(x, y);
          }
        }
      }
      // עוגן-תווית: התא העליון-שמאלי שהוצב בפועל.
      var ak = key(minX, minY);
      if (zones[ak] === type) { zoneAnchors[ak] = type; anchored = true; }
      if (!anchored) {
        // אם הפינה לא הוצבה (blob), נבחר עוגן מתוך הדלי המתאים.
        var bk = bucketKey(cx, cy), arr = buckets[bk];
        if (arr) for (var a = 0; a < arr.length; a++) if (arr[a].type === type) { zoneAnchors[key(arr[a].x, arr[a].y)] = type; arr[a].anchor = true; break; }
      } else {
        // מסמנים anchor=true גם בדלי לצורך התווית.
        var arr2 = buckets[bucketKey(minX, minY)];
        if (arr2) for (var b = 0; b < arr2.length; b++) if (arr2[b].x === minX && arr2[b].y === minY) { arr2[b].anchor = true; break; }
      }
      regions.push({ type: type, minX: minX, maxX: maxX, minY: minY, maxY: maxY, horiz: sh.horiz });
    }

    // סריקת רשת הפיזור על פני כל העולם.
    for (var gx = (g.step >> 1); gx < W; gx += g.step) {
      for (var gy = (g.step >> 1); gy < H; gy += g.step) {
        if (rng() > g.density) continue;
        var cx = Math.round(gx + (rng() * 2 - 1) * g.jitter);
        var cy = Math.round(gy + (rng() * 2 - 1) * g.jitter);
        var ddx = cx - s.x, ddy = cy - s.y;
        if (ddx * ddx + ddy * ddy < g.clearRadius * g.clearRadius) continue; // שומרים מרחב סביב ההתחלה
        place(pickType(), cx, cy);
      }
    }

    return {
      users: users, tiles: tiles,
      zones: zones, zonesInfo: T.ZoneTypes, zoneAnchors: zoneAnchors,
      regions: regions, zoneBuckets: buckets,
    };
  }

  T.Logic = {
    key: key, parseKey: parseKey, inWorld: inWorld, neighbors: neighbors, neighborMask8: neighborMask8, bucketKey: bucketKey,
    costFor: costFor, nextGrowthTile: nextGrowthTile,
    worldToScreenX: worldToScreenX, worldToScreenY: worldToScreenY,
    screenToWorldX: screenToWorldX, screenToWorldY: screenToWorldY,
    screenToTile: screenToTile, fitScale: fitScale, clampScale: clampScale,
    clampCenter: clampCenter, visibleRange: visibleRange, seedWorld: seedWorld,
  };
})(window.Territory);
