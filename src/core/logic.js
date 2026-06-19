/* =====================================================================
 * logic.js — הלוגיקה העסקית הטהורה של המשחק
 * ---------------------------------------------------------------------
 * [לוגיקה ניידת / PORTABLE LOGIC]
 * פונקציות טהורות בלבד: קלט -> פלט, ללא תופעות לוואי, ללא DOM.
 * זה החלק שעובר כמעט 1:1 לכל פלטפורמה. כל החוקים של המשחק כאן.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  var Config = T.Config;

  /* ---- מפתוח משבצות: (x,y) <-> "x,y" -------------------------------- */
  function key(x, y) {
    return x + ',' + y;
  }
  function parseKey(k) {
    var p = k.split(',');
    return { x: +p[0], y: +p[1] };
  }

  /* ---- שכנוּת (4 כיוונים) — בסיס לחוק "רק משבצות צמודות" ------------- */
  function neighborKeys(x, y) {
    return [key(x - 1, y), key(x + 1, y), key(x, y - 1), key(x, y + 1)];
  }

  // האם המשבצת (x,y) צמודה לטריטוריה של ownerId?
  function isAdjacentToOwner(tiles, ownerId, x, y) {
    var nb = neighborKeys(x, y);
    for (var i = 0; i < nb.length; i++) {
      var t = tiles[nb[i]];
      if (t && t.ownerId === ownerId) return true;
    }
    return false;
  }

  function inWorld(x, y) {
    return x >= 0 && y >= 0 && x < Config.world.width && y < Config.world.height;
  }

  /* ---- ולידציות פעולה (טהורות) — משמשות גם את ה-reducer וגם את ה-UI -- */
  // (ה-UI משתמש בהן כדי להפעיל/לכבות כפתורים; ה-reducer כדי לאכוף חוקים.)

  // כיבוש משבצת ריקה: חייבת להיות בעולם, ריקה (לא בבעלות ולא אזור מיוחד),
  // צמודה לטריטוריה שלי, ועם מספיק קרדיט. זו הדרך *היחידה* להתרחב כרגע.
  function canClaim(state, credits, x, y) {
    if (!inWorld(x, y)) return false;
    if (state.tiles[key(x, y)]) return false;          // תפוסה ע"י שחקן
    if (state.zones && state.zones[key(x, y)]) return false; // אזור מיוחד (ים/עיר/רכבת)
    if (!isAdjacentToOwner(state.tiles, state.currentUserId, x, y)) return false;
    return credits >= Config.economy.claimCost;
  }

  /* ---- זריעת העולם ההתחלתי (טהורה, דטרמיניסטית) --------------------- */
  // יוצרת את המשבצת ההתחלתית של השחקן + "אזורים" מיוחדים רב-משבצתיים
  // (ים / עיר / רכבת) הפזורים בעולם. האזורים אינם ניתנים לכיבוש —
  // הם חלק מהנוף שסביבו השחקן מתרחב.
  function seedWorld() {
    var s = Config.start;
    var pal = T.Tokens.palette;

    var users = { me: { id: 'me', name: 'אני', color: pal.brand } };

    var tiles = {};
    // המשבצת היחידה של השחקן בתחילת הדרך.
    tiles[key(s.x, s.y)] = { x: s.x, y: s.y, ownerId: 'me', color: users.me.color, imageUrl: null };

    // מטא-מידע לכל סוג אזור (שם + אייקון לתצוגה).
    var zonesInfo = {
      sea: { name: 'ים', emoji: '🌊' },
      city: { name: 'עיר', emoji: '🏙️' },
      rail: { name: 'רכבת', emoji: '🚆' },
    };

    var zones = {};        // "x,y" -> סוג אזור
    var zoneAnchors = {};  // "x,y" -> סוג אזור (משבצת אחת לכל אזור שתישא תווית)

    // ממלא מלבן באזור, ומסמן את הפינה כעוגן-תווית.
    function rect(type, x0, x1, y0, y1) {
      for (var x = x0; x <= x1; x++) {
        for (var y = y0; y <= y1; y++) zones[key(x, y)] = type;
      }
      zoneAnchors[key(x0, y0)] = type;
    }
    // ממלא רצף משבצות (קו, למשל מסילה), ומסמן את הראשונה כעוגן.
    function line(type, pts) {
      pts.forEach(function (p) { zones[key(p[0], p[1])] = type; });
      zoneAnchors[key(pts[0][0], pts[0][1])] = type;
    }

    // פריסה סביב נקודת ההתחלה (משאירים את 4 השכנים הישירים פנויים כדי
    // שתמיד אפשר להתחיל להתרחב).
    rect('sea', s.x - 6, s.x - 3, s.y + 2, s.y + 6);   // ים — בלוק לרוחב משמאל-מטה
    rect('city', s.x + 2, s.x + 4, s.y - 5, s.y - 2);  // עיר — בלוק מימין-מעלה
    var rail = [];                                     // רכבת — קו ארוך
    for (var rx = s.x - 7; rx <= s.x + 9; rx++) rail.push([rx, s.y + 9]);
    line('rail', rail);

    return {
      users: users, tiles: tiles,
      zones: zones, zonesInfo: zonesInfo, zoneAnchors: zoneAnchors,
    };
  }

  /* ---- חישוב התאמת הרשת לשטח נתון (טהור) --------------------------- */
  // קלט: רוחב/גובה השטח הזמין בפיקסלים. פלט: כמה עמודות/שורות וגודל תא,
  // כך שהרשת תמלא את המסך בלי גלילה. cols/rows אי-זוגיים -> קיים תא מרכזי.
  // [לוגיקה ניידת] מתמטיקה טהורה; שכבת ה-UI רק מודדת ומעבירה מספרים.
  function computeGridFit(areaW, areaH) {
    var g = Config.grid;
    function oddClamp(n, min, max) {
      n = Math.max(min, Math.min(max, n));
      if (n % 2 === 0) n -= 1; // הופכים לאי-זוגי כדי שיהיה תא מרכזי
      return Math.max(min, n);
    }
    // מנכים padding של הרשת לפני החישוב, ומתחשבים ברווחים בין התאים.
    var usableW = Math.max(0, areaW - 2 * g.pad);
    var usableH = Math.max(0, areaH - 2 * g.pad);
    var cols = oddClamp(Math.floor(usableW / g.idealCellPx), g.minCols, g.maxCols);
    var rows = oddClamp(Math.floor(usableH / g.idealCellPx), g.minRows, g.maxRows);
    var cellW = (usableW - (cols - 1) * g.gap) / cols;
    var cellH = (usableH - (rows - 1) * g.gap) / rows;
    var cell = Math.max(g.minCellPx, Math.floor(Math.min(cellW, cellH)));
    return { cols: cols, rows: rows, cell: cell };
  }

  T.Logic = {
    key: key,
    computeGridFit: computeGridFit,
    parseKey: parseKey,
    neighborKeys: neighborKeys,
    isAdjacentToOwner: isAdjacentToOwner,
    inWorld: inWorld,
    canClaim: canClaim,
    seedWorld: seedWorld,
  };
})(window.Territory);
