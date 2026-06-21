/* =====================================================================
 * buildings.js — קטלוג מבנים (כלכלה בסגנון Catan) — נתונים טהורים
 * ---------------------------------------------------------------------
 * [לוגיקה ניידת / PORTABLE LOGIC]
 * מבנים ברמת-הטריטוריה: מפיקים משאבים/נק'-מחקר, מעלים קיבולת ומשפרים סחר.
 * עלות ותפוקה גדלים גאומטרית עם הרמה (האטת שלב מאוחר).
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  T.COST_SCALE = 1.7; // עליית עלות לכל רמה

  T.Buildings = [
    { id: 'reactor', name: 'כור ניאון', emoji: '⚡', produces: 'neon', baseYield: 3, baseCost: { iron: 8, crystal: 4 } },
    { id: 'foundry', name: 'יציקת ברזל', emoji: '🔩', produces: 'iron', baseYield: 3, baseCost: { wood: 8, solar: 4 } },
    { id: 'crystallizer', name: 'מגבש', emoji: '💠', produces: 'crystal', baseYield: 3, baseCost: { neon: 8, iron: 4 } },
    { id: 'sawmill', name: 'מנסרה', emoji: '🪵', produces: 'wood', baseYield: 3, baseCost: { solar: 8, crystal: 4 } },
    { id: 'solarfarm', name: 'שדה סולארי', emoji: '☀️', produces: 'solar', baseYield: 3, baseCost: { wood: 8, neon: 4 } },
    { id: 'depot', name: 'מחסן', emoji: '📦', produces: null, cap: 20, baseCost: { iron: 6, wood: 6 } },
    { id: 'port', name: 'נמל סחר', emoji: '⚓', produces: null, trade: 1, baseCost: { crystal: 8, solar: 6 } },
    { id: 'lab', name: 'מעבדה', emoji: '🧪', produces: 'tech', baseYield: 1, baseCost: { neon: 10, crystal: 8 } },
  ];
  T.BuildingById = {}; T.Buildings.forEach(function (b) { T.BuildingById[b.id] = b; });

  // עלות מעבר מרמה level לרמה level+1.
  T.buildingCost = function (b, level) {
    var c = {}; for (var k in b.baseCost) c[k] = Math.round(b.baseCost[k] * Math.pow(T.COST_SCALE, level));
    return c;
  };
  // תפוקה ברמה נתונה (לינארי ברמה; ההאטה מגיעה מהעלות).
  T.buildingYield = function (b, level) { return (b.baseYield || 0) * level; };
})(window.Territory);
