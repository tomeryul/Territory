/* =====================================================================
 * selectors.js — נתונים נגזרים (Derived data)
 * ---------------------------------------------------------------------
 * [לוגיקה ניידת / PORTABLE LOGIC]
 * פונקציות טהורות שמחשבות תצוגות-ביניים מתוך ה-state, *בלי DOM*.
 * שכבת ה-UI מקבלת מכאן "נתונים מוכנים לרינדור" ולא מחשבת בעצמה.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  var Config = T.Config;
  var L = T.Logic;

  // הקרדיט הזמין כרגע (זמן פעיל פחות הוצאות).
  function credits(state) {
    return T.availableCredits(state);
  }

  // כמות המשבצות שבבעלות השחקן (גודל הטריטוריה).
  function territorySize(state) {
    var n = 0;
    for (var k in state.tiles) {
      if (state.tiles[k].ownerId === state.currentUserId) n++;
    }
    return n;
  }

  // זמן פעיל בפורמט קריא (mm:ss).
  function activeTimeLabel(state) {
    var totalSec = Math.floor(state.session.activeMs / 1000);
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  // המשבצת הנבחרת (אובייקט מלא או מידע על משבצת ריקה).
  function selectedTile(state) {
    var sel = state.ui.selection;
    if (!sel) return null;
    var k = L.key(sel.x, sel.y);
    var tile = state.tiles[k];
    if (tile) return tile;
    // משבצת ריקה — מחזירים "stub" עם מטא-מידע לפעולה.
    return { x: sel.x, y: sel.y, ownerId: null, color: null, imageUrl: null, forSale: false, price: 0 };
  }

  // החלון הנראה כמטריצה דו-ממדית של "תאים מוכנים לרינדור".
  // כל תא כולל את כל מה שה-UI צריך — ה-UI רק מצייר, לא מחליט.
  function viewportTiles(state) {
    var cols = state.viewport.cols || Config.viewport.cols;
    var rows = state.viewport.rows || Config.viewport.rows;
    var originX = state.viewport.centerX - Math.floor(cols / 2);
    var originY = state.viewport.centerY - Math.floor(rows / 2);
    var meId = state.currentUserId;
    var avail = credits(state);
    var selKey = state.ui.selection ? L.key(state.ui.selection.x, state.ui.selection.y) : null;
    var multi = state.ui.multiSelect;

    var grid = [];
    for (var r = 0; r < rows; r++) {
      var row = [];
      for (var c = 0; c < cols; c++) {
        var x = originX + c;
        var y = originY + r;
        var k = L.key(x, y);
        var tile = state.tiles[k] || null;
        var inside = L.inWorld(x, y);
        var mine = !!tile && tile.ownerId === meId;

        row.push({
          x: x, y: y, key: k,
          inside: inside,
          tile: tile, // null אם ריקה
          mine: mine,
          ownerColor: tile ? tile.color : null,
          imageUrl: tile ? tile.imageUrl : null,
          forSale: tile ? tile.forSale : false,
          price: tile ? tile.price : 0,
          // דגלי-פעולה מחושבים מראש (ה-UI לא מחשב חוקים):
          claimable: inside && !tile && L.canClaim(state, avail, x, y),
          buyable: inside && L.canBuy(state, avail, x, y),
          selected: k === selKey,
          inMulti: multi.on && multi.keys.indexOf(k) >= 0,
        });
      }
      grid.push(row);
    }
    return { grid: grid, originX: originX, originY: originY };
  }

  T.Selectors = {
    credits: credits,
    territorySize: territorySize,
    activeTimeLabel: activeTimeLabel,
    selectedTile: selectedTile,
    viewportTiles: viewportTiles,
  };
})(window.Territory);
