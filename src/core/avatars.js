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
      // דמות מלאה מונפשת (5 פוזות) — חתול-מכשף בפיקסל-ארט, רקע שקוף.
      { id: 'wizard', name: 'חתול מכשף', fps: 5,
        frames: ['assets/avatars/wizard_1.png', 'assets/avatars/wizard_2.png', 'assets/avatars/wizard_3.png',
                 'assets/avatars/wizard_4.png', 'assets/avatars/wizard_5.png'] },
      // דמויות מונפשות (3 פוזות כל אחת) — נחתכו מגיליון הדמויות.
      { id: 'shiba', name: 'שיבא הקוסם', fps: 4,
        frames: ['assets/avatars/shiba_1.png', 'assets/avatars/shiba_2.png', 'assets/avatars/shiba_3.png'] },
      { id: 'wizardcat', name: 'חתול מכשף', fps: 4,
        frames: ['assets/avatars/wizardcat_1.png', 'assets/avatars/wizardcat_2.png', 'assets/avatars/wizardcat_3.png'] },
      { id: 'cyberdog', name: 'כלב סייבר', fps: 4,
        frames: ['assets/avatars/cyberdog_1.png', 'assets/avatars/cyberdog_2.png', 'assets/avatars/cyberdog_3.png'] },
      { id: 'kingcat', name: 'חתול מלך', fps: 4,
        frames: ['assets/avatars/kingcat_1.png', 'assets/avatars/kingcat_2.png', 'assets/avatars/kingcat_3.png'] },
      // אווטארי אימוג'י (גיבוי / בחירה מהירה).
      { id: 'default', name: 'חתול', emoji: '🐱', frames: [] },
      { id: 'fox', name: 'שועל', emoji: '🦊', frames: [] },
      { id: 'robot', name: 'רובוט', emoji: '🤖', frames: [] },
    ],
  };

  T.Avatars.byId = {};
  T.Avatars.list.forEach(function (a) { T.Avatars.byId[a.id] = a; });
})(window.Territory);
