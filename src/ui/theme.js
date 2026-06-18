/* =====================================================================
 * theme.js — הזרקת Design Tokens כ-CSS Variables
 * ---------------------------------------------------------------------
 * [UI ספציפי לפלטפורמה / PLATFORM-SPECIFIC]
 * הגשר היחיד בין הטוקנים (core/tokens.js) ל-CSS. ה-CSS לא מכיל ערכים
 * קשיחים — הכל var(--token). כאן מחילים את ערכי הנושא הנבחר על :root.
 * ב-React/Native/Flutter: מחליפים בקובץ ThemeProvider/ThemeData.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  var Tokens = T.Tokens;

  // ממיר ערך מספרי (פיקסלים) למחרוזת CSS; משאיר מחרוזות כמו שהן.
  function px(v) {
    return typeof v === 'number' ? v + 'px' : v;
  }

  T.applyTheme = function (themeName) {
    var root = document.documentElement;
    var theme = Tokens.themes[themeName] || Tokens.themes.dark;

    // צבעי הנושא: --color-<key>
    for (var c in theme) {
      root.style.setProperty('--color-' + kebab(c), theme[c]);
    }
    // מרווחים, רדיוסים, גדלים, פונטים — מקור אמת אחד.
    setGroup(root, '--space-', Tokens.space);
    setGroup(root, '--radius-', Tokens.radius);
    setGroup(root, '--size-', Tokens.size);
    setGroup(root, '--font-', Tokens.font);

    // מסמן את הנושא הפעיל (שימושי גם ל-color-scheme של הדפדפן).
    root.setAttribute('data-theme', themeName);
    root.style.colorScheme = themeName === 'dark' ? 'dark' : 'light';
  };

  function setGroup(root, prefix, obj) {
    for (var k in obj) root.style.setProperty(prefix + kebab(k), px(obj[k]));
  }

  function kebab(s) {
    return s.replace(/[A-Z]/g, function (m) {
      return '-' + m.toLowerCase();
    });
  }
})(window.Territory);
