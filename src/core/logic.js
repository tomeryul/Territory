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

  // כיבוש משבצת ריקה: חייבת להיות בעולם, ריקה, צמודה לטריטוריה שלי, ומספיק קרדיט.
  function canClaim(state, credits, x, y) {
    if (!inWorld(x, y)) return false;
    if (state.tiles[key(x, y)]) return false; // תפוסה
    if (!isAdjacentToOwner(state.tiles, state.currentUserId, x, y)) return false;
    return credits >= Config.economy.claimCost;
  }

  // קניית משבצת מאדם אחר: בבעלות אחר, מוצעת למכירה, צמודה לטריטוריה שלי, ומספיק קרדיט.
  function canBuy(state, credits, x, y) {
    var t = state.tiles[key(x, y)];
    if (!t) return false;
    if (t.ownerId === state.currentUserId) return false; // כבר שלי
    if (!t.forSale) return false;
    if (!isAdjacentToOwner(state.tiles, state.currentUserId, x, y)) return false;
    return credits >= t.price;
  }

  /* ---- זריעת העולם ההתחלתי (טהורה, דטרמיניסטית) --------------------- */
  // יוצרת את המשבצת ההתחלתית של השחקן + משבצות שכנות בבעלות "יריבים",
  // חלקן מוצעות למכירה — כדי שיהיה מה לקנות ולהתרחב אליו.
  function seedWorld() {
    var s = Config.start;
    var pal = T.Tokens.palette;

    var users = {
      me: { id: 'me', name: 'אני', color: pal.brand },
      ai1: { id: 'ai1', name: 'יריב אדום', color: pal.red },
      ai2: { id: 'ai2', name: 'יריב ירוק', color: pal.green },
      ai3: { id: 'ai3', name: 'יריב סגול', color: pal.purple },
    };

    var tiles = {};
    // המשבצת היחידה של השחקן בתחילת הדרך.
    tiles[key(s.x, s.y)] = {
      x: s.x, y: s.y, ownerId: 'me', color: users.me.color, imageUrl: null,
      forSale: false, price: 0,
    };

    // משבצות יריבים סביב נקודת ההתחלה — חלקן למכירה (forSale).
    var seeds = [
      { dx: 1, dy: 0, owner: 'ai1', forSale: true, price: 4 },
      { dx: 2, dy: 0, owner: 'ai1', forSale: true, price: 6 },
      { dx: 2, dy: 1, owner: 'ai1', forSale: false, price: 0 },
      { dx: 0, dy: -1, owner: 'ai2', forSale: true, price: 5 },
      { dx: 0, dy: -2, owner: 'ai2', forSale: false, price: 0 },
      { dx: -1, dy: 1, owner: 'ai3', forSale: true, price: 5 },
      { dx: -2, dy: 1, owner: 'ai3', forSale: true, price: 7 },
      { dx: -1, dy: -1, owner: 'ai2', forSale: true, price: 8 },
      { dx: 1, dy: 2, owner: 'ai3', forSale: false, price: 0 },
    ];
    seeds.forEach(function (sd) {
      var x = s.x + sd.dx, y = s.y + sd.dy;
      tiles[key(x, y)] = {
        x: x, y: y, ownerId: sd.owner, color: users[sd.owner].color,
        imageUrl: null, forSale: sd.forSale, price: sd.price,
      };
    });

    return { users: users, tiles: tiles };
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
    canBuy: canBuy,
    seedWorld: seedWorld,
  };
})(window.Territory);
