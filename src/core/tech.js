/* =====================================================================
 * tech.js — עץ טכנולוגיות (מטרה ארוכת-טווח) — נתונים טהורים
 * ---------------------------------------------------------------------
 * [לוגיקה ניידת / PORTABLE LOGIC]
 * צמתים בשכבות (tiers) עם דרישות-קדם (prereqs), עלות (משאבים + נק'-מחקר)
 * ואפקט. העלות מטפסת בין השכבות → ההתקדמות המאוחרת איטית במכוון.
 *
 * אפקטים נתמכים (נצברים ב-Selectors.techMods):
 *   prodPct    — אחוז תוספת לכל הייצור (מצטבר)
 *   capBonus   — תוספת קבועה לקיבולת האחסון
 *   tradeBonus — שיפור יחס הסחר (מוריד את ה-rate)
 *   growthMult — מכפיל זמן-לטייל (<1 = מהיר יותר; מצטבר בכפל)
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  // tier קובע גם את סדר התצוגה (שכבות). prereqs = מזהי צמתים שצריך לפני.
  T.Tech = [
    // --- שכבה 1: יסודות זולים, פתיחה מהירה ומתגמלת ---
    { id: 'logistics', tier: 1, name: 'לוגיסטיקה', emoji: '🧭', desc: '+15% ייצור',
      prereqs: [], cost: { techPoints: 3, iron: 12 }, effect: { prodPct: 15 } },
    { id: 'warehousing', tier: 1, name: 'אחסנה', emoji: '🏚️', desc: '+25 קיבולת',
      prereqs: [], cost: { techPoints: 3, wood: 12 }, effect: { capBonus: 25 } },
    { id: 'haggling', tier: 1, name: 'מיקוח', emoji: '🤝', desc: 'סחר טוב יותר (-1)',
      prereqs: [], cost: { techPoints: 4, crystal: 12 }, effect: { tradeBonus: 1 } },

    // --- שכבה 2: דורשת שכבה 1, יקרה יותר ---
    { id: 'automation', tier: 2, name: 'אוטומציה', emoji: '🤖', desc: '+25% ייצור',
      prereqs: ['logistics'], cost: { techPoints: 9, neon: 25, iron: 18 }, effect: { prodPct: 25 } },
    { id: 'megastore', tier: 2, name: 'מגה-מחסן', emoji: '🏗️', desc: '+50 קיבולת',
      prereqs: ['warehousing'], cost: { techPoints: 9, wood: 30 }, effect: { capBonus: 50 } },
    { id: 'guild', tier: 2, name: 'גילדת סוחרים', emoji: '⚖️', desc: 'סחר טוב יותר (-1)',
      prereqs: ['haggling'], cost: { techPoints: 11, crystal: 28, solar: 16 }, effect: { tradeBonus: 1 } },

    // --- שכבה 3: יעדי קצה יקרים מאוד (התקדמות מאוחרת איטית) ---
    { id: 'logistics2', tier: 3, name: 'רשת אספקה', emoji: '🛰️', desc: '+40% ייצור',
      prereqs: ['automation', 'megastore'], cost: { techPoints: 22, neon: 50, crystal: 40 }, effect: { prodPct: 40 } },
    { id: 'surveying', tier: 3, name: 'מיפוי קרקע', emoji: '🗺️', desc: 'גידול מהיר ב-20%',
      prereqs: ['automation'], cost: { techPoints: 18, solar: 45, iron: 35 }, effect: { growthMult: 0.8 } },

    // --- שכבה 4: יעד-על ---
    { id: 'singularity', tier: 4, name: 'סינגולריות', emoji: '🌌', desc: 'גידול מהיר נוסף ב-25% +60% ייצור',
      prereqs: ['logistics2', 'surveying'], cost: { techPoints: 40, neon: 90, crystal: 80, solar: 60 },
      effect: { growthMult: 0.75, prodPct: 60 } },
  ];
  T.TechById = {}; T.Tech.forEach(function (n) { T.TechById[n.id] = n; });

  // האם כל דרישות-הקדם הושגו (tech = מפת מזהים שנחקרו).
  T.techPrereqsMet = function (node, tech) {
    for (var i = 0; i < node.prereqs.length; i++) if (!tech[node.prereqs[i]]) return false;
    return true;
  };
})(window.Territory);
