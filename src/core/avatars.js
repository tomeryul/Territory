/* =====================================================================
 * avatars.js — קטלוג אווטארים (נתונים טהורים)
 * ---------------------------------------------------------------------
 * [לוגיקה ניידת / PORTABLE LOGIC]
 * כל אווטאר: id, שם, ואחד מ:
 *   - emoji  (ברירת מחדל ללא תמונה)
 *   - frames (מערך נתיבי תמונות — פוזה אחת לכל פריים; מונפש לפי fps)
 *
 * להוספת דמות מונפשת: שמים את הקבצים תחת assets/avatars/ ומוסיפים רשומה
 * אחת לרשימה למטה, למשל:
 *   { id:'hero', name:'גיבור',
 *     frames:['assets/avatars/hero_1.png','assets/avatars/hero_2.png'], fps:5 }
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  T.Avatars = {
    list: [
      { id: 'default', name: 'חתול', emoji: '🐱', frames: [] },
      { id: 'fox', name: 'שועל', emoji: '🦊', frames: [] },
      { id: 'robot', name: 'רובוט', emoji: '🤖', frames: [] },
      { id: 'alien', name: 'חייזר', emoji: '👾', frames: [] },
      // ⬇️ דמויות מונפשות מתמונות יתווספו כאן (frames + fps).
    ],
  };

  T.Avatars.byId = {};
  T.Avatars.list.forEach(function (a) { T.Avatars.byId[a.id] = a; });
})(window.Territory);
