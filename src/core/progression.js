/* =====================================================================
 * progression.js — שכבת ההתקדמות (XP/רמות/מטבעות/משימות/הישגים)
 * ---------------------------------------------------------------------
 * [לוגיקה ניידת / PORTABLE LOGIC]
 * פונקציות טהורות שגוזרות את ה"משחקיות" מתוך ה-state: רמה ו-XP, ערך נטו
 * (מטבעות), דירוג, משימות יומיות והישגים. בלי DOM. נתון לבדיקה ולהמרה.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  var Config = T.Config;
  var S = T.Selectors;

  // עיצוב מספרים גדולים: 4.2M / 12.5K.
  function formatBig(v) {
    if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
    return String(Math.round(v));
  }

  // סך ה-XP: זמן פעיל + בונוס לכל משבצת.
  function xp(state) {
    var p = Config.progression;
    return Math.floor(state.session.activeMs / 1000) * p.xpPerSec + S.territorySize(state) * p.xpPerTile;
  }

  // רמה לפי XP (כל רמה דורשת base*level — עקומה הולכת וגדלה).
  function levelInfo(state) {
    var total = xp(state), base = Config.progression.xpBaseLevel;
    var lvl = 1, rem = total, need = base;
    while (rem >= need) { rem -= need; lvl++; need = base * lvl; }
    return { level: lvl, inLevel: rem, need: need, progress: rem / need, totalXp: total };
  }

  // ערך נטו (מטבעות) — נגזר משווי התיק, מוגדל כדי "להרגיש" כמו הון.
  function coins(state) { return S.portfolioValue(state) * Config.progression.coinPerValue; }
  function coinsLabel(state) { return formatBig(coins(state)); }

  // יהלומים — מטבע פרמיום שמרוויחים ממשימות.
  function gems(state) { return (state.meta && state.meta.gems) || 0; }

  // דירוג עולמי מדומה — משתפר (יורד) ככל שמתקדמים.
  function rank(state) {
    var r = 9999 - S.territorySize(state) * 12 - levelInfo(state).level * 60 - Math.floor(coins(state) / 8000);
    return Math.max(1, r);
  }

  // משימות יומיות — ההתקדמות נגזרת מה-state; פרס נתבע ידנית (CLAIM_MISSION).
  function missions(state) {
    var terr = S.territorySize(state);
    var minutes = Math.floor(state.session.activeMs / 60000);
    var claimed = (state.meta && state.meta.claimedMissions) || {};
    var defs = [
      { id: 'connect', title: 'התחבר למשחק', current: 1, target: 1, reward: 10 },
      { id: 'hold30', title: 'החזק את האפליקציה 30 דק׳', current: Math.min(30, minutes), target: 30, reward: 20 },
      { id: 'own10', title: 'הרחב ל-10 משבצות', current: Math.min(10, terr), target: 10, reward: 30 },
      { id: 'own100', title: 'אחזק שטח של 100 משבצות', current: Math.min(100, terr), target: 100, reward: 50 },
    ];
    return defs.map(function (m) {
      m.done = m.current >= m.target;
      m.claimed = !!claimed[m.id];
      return m;
    });
  }

  // הישגים — נפתחים לפי אבני-דרך (לתצוגה בפרופיל).
  function achievements(state) {
    var terr = S.territorySize(state), lvl = levelInfo(state).level, c = coins(state);
    return [
      { id: 'first', emoji: '🚩', title: 'התנחלות ראשונה', unlocked: terr >= 2 },
      { id: 't50', emoji: '🥉', title: '50 משבצות', unlocked: terr >= 50 },
      { id: 't250', emoji: '🏆', title: '250 משבצות', unlocked: terr >= 250 },
      { id: 'lvl10', emoji: '⭐', title: 'רמה 10', unlocked: lvl >= 10 },
      { id: 'rich', emoji: '💎', title: 'הון של 1M', unlocked: c >= 1e6 },
    ];
  }

  T.Progression = {
    formatBig: formatBig,
    xp: xp, levelInfo: levelInfo,
    coins: coins, coinsLabel: coinsLabel, gems: gems,
    rank: rank, missions: missions, achievements: achievements,
  };
})(window.Territory);
