/* =====================================================================
 * tokens.js — Design Tokens (מקור אמת יחיד לעיצוב)
 * ---------------------------------------------------------------------
 * [לוגיקה ניידת / PORTABLE LOGIC]
 * כל הצבעים/מרווחים/גדלים מרוכזים כאן. ה-CSS לא מגדיר ערכים קשיחים —
 * שכבת ה-UI (theme.js) מזריקה את הטוקנים האלה כ-CSS variables.
 * כך אותו אובייקט יעבור ל-ThemeProvider ב-React או ל-ThemeData ב-Flutter.
 *
 * שני נושאים (themes): 'light' ו-'dark'. מצב הלילה ('dark') שואף
 * לשחור-כמעט-מוחלט כדי להתאים לשהייה ארוכה מול המסך.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  T.Tokens = {
    // צבעי המותג של השחקנים (קבועים בין הנושאים).
    palette: {
      brand: '#4f8cff',
      red: '#e5484d',
      green: '#30a46c',
      purple: '#8e4ec6',
      amber: '#f5a623',
    },

    // מרווחים אחידים (8pt-ish scale) — בפיקסלים.
    space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },

    // עיגול פינות.
    radius: { sm: 6, md: 10, lg: 16, pill: 999 },

    // גדלים.
    size: { cell: 40, gap: 2 },

    // טיפוגרפיה.
    font: { sm: 12, base: 14, lg: 18, xl: 22 },

    // ערכי הנושאים. כל מפתח הופך ל-CSS variable (theme.js).
    themes: {
      light: {
        bg: '#f4f6f9',
        surface: '#ffffff',
        text: '#1a1d22',
        muted: '#5b6470',
        border: '#dde1e7',
        gridLine: '#e6eaf0',
        empty: '#eaeef3',
        emptyOwnable: '#dbe7ff', // משבצת ריקה שאפשר לכבוש (צמודה)
        accent: '#4f8cff',
        accentText: '#ffffff',
        danger: '#e5484d',
        shadow: 'rgba(20, 28, 45, 0.10)',
      },
      // מצב לילה — הכי כהה שאפשר (שחור OLED), ניגודיות מרוככת לעיניים.
      dark: {
        bg: '#000000',
        surface: '#0a0b0d',
        text: '#c7ccd4',
        muted: '#6b7280',
        border: '#16181d',
        gridLine: '#0e1014',
        empty: '#0b0c0f',
        emptyOwnable: '#10243f',
        accent: '#3b6fd4',
        accentText: '#eaf0ff',
        danger: '#b93b3f',
        shadow: 'rgba(0, 0, 0, 0.65)',
      },
    },
  };
})(window.Territory);
