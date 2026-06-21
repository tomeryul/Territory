/* =====================================================================
 * daily.js — וו יומי: מאגר משימות מתחלפות + פרסי רצף-התחברות (streak)
 * ---------------------------------------------------------------------
 * [לוגיקה ניידת / PORTABLE LOGIC]
 * מאגר משימות שמהן בוחרים 3 ליום (דטרמיניסטי לפי תאריך). ההתקדמות נגזרת
 * מ-meta.dailyStats (שמתאפס בכל יום ב-SET_DAY). פרס נתבע ידנית.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  // metric: שם מונה יומי שנגזר ב-Selectors.dailyMissions.
  //   collects/trades/builds/researches — נספרים ב-meta.dailyStats
  //   tilesToday — משבצות שנוספו היום;  minutesToday — דקות פעילות היום
  T.DailyPool = [
    { id: 'd_collect3', metric: 'collects', target: 3, title: 'אסוף משאבים 3 פעמים', reward: { gems: 8 } },
    { id: 'd_collect6', metric: 'collects', target: 6, title: 'אסוף משאבים 6 פעמים', reward: { gems: 14, techPoints: 1 } },
    { id: 'd_trade2', metric: 'trades', target: 2, title: 'בצע 2 עסקאות סחר', reward: { gems: 10 } },
    { id: 'd_trade5', metric: 'trades', target: 5, title: 'בצע 5 עסקאות סחר', reward: { gems: 16, techPoints: 1 } },
    { id: 'd_build1', metric: 'builds', target: 1, title: 'בנה או שדרג מבנה', reward: { gems: 10 } },
    { id: 'd_build3', metric: 'builds', target: 3, title: 'בנה או שדרג 3 מבנים', reward: { gems: 18, techPoints: 1 } },
    { id: 'd_research1', metric: 'researches', target: 1, title: 'חקור טכנולוגיה', reward: { gems: 20, techPoints: 1 } },
    { id: 'd_tiles3', metric: 'tilesToday', target: 3, title: 'הרחב ב-3 משבצות היום', reward: { gems: 12 } },
    { id: 'd_play15', metric: 'minutesToday', target: 15, title: 'שחק 15 דקות היום', reward: { gems: 12, techPoints: 1 } },
    { id: 'd_play30', metric: 'minutesToday', target: 30, title: 'שחק 30 דקות היום', reward: { gems: 22, techPoints: 2 } },
  ];
  T.DailyById = {}; T.DailyPool.forEach(function (m) { T.DailyById[m.id] = m; });

  // פרסי רצף — מחזור של 7 ימים (היום ה-7 הוא ה"גדול"). count מתחיל מ-1.
  T.StreakRewards = [
    { gems: 5 },
    { gems: 8 },
    { gems: 10, techPoints: 1 },
    { gems: 12 },
    { gems: 15, techPoints: 1 },
    { gems: 20 },
    { gems: 40, techPoints: 3 },
  ];
  T.streakReward = function (count) {
    var i = ((count - 1) % 7 + 7) % 7;
    return T.StreakRewards[i];
  };

  // ---- בחירת 3 משימות ליום, דטרמיניסטית לפי מחרוזת התאריך ----
  function hashStr(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  // מחזיר מערך של 3 מזהי-משימות יציבים ליום נתון (day = 'YYYY-MM-DD').
  T.dailyPick = function (day) {
    var rng = mulberry32(hashStr('daily:' + (day || '')));
    var pool = T.DailyPool.map(function (m) { return m.id; });
    // ערבוב Fisher–Yates דטרמיניסטי, ואז 3 הראשונים.
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    return pool.slice(0, 3);
  };
})(window.Territory);
