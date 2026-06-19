/* =====================================================================
 * tokens.js — Design Tokens (מקור אמת יחיד לעיצוב)
 * ---------------------------------------------------------------------
 * [לוגיקה ניידת / PORTABLE LOGIC]
 * סגנון: אפליקציית מובייל כהה עם אקסנט סגול, כרטיסים מעוגלים וזוהר עדין.
 * מצב לילה ('dark') הוא ברירת המחדל; קיים גם 'light'.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  T.Tokens = {
    // צבעי טריטוריה/שחקנים (קבועים בין הנושאים).
    palette: {
      brand: '#5b8cff',   // צבע הטריטוריה ההתחלתי (כחול זוהר)
      red: '#e5484d', green: '#30a46c', purple: '#8b5cf6',
      amber: '#f5a623', cyan: '#22d3ee', pink: '#ff6b9d', slate: '#94a3b8',
    },

    space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
    radius: { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 },
    size: { cell: 40, gap: 2 },
    font: { sm: 12, base: 14, lg: 18, xl: 22 },

    themes: {
      // מצב לילה — כהה עמוק עם אקסנט סגול וזוהר.
      dark: {
        bg: '#08080f',
        bgElev: '#0e0e1a',
        surface: '#15151f',
        surface2: '#1c1c2b',
        text: '#eceef6',
        muted: '#8b8fa6',
        border: '#262636',
        gridLine: 'rgba(120,130,200,0.10)',
        empty: '#0f0f1c',
        accent: '#8b5cf6',
        accent2: '#6d4ad6',
        accentText: '#ffffff',
        glow: 'rgba(139,92,246,0.45)',
        gem: '#7cc4ff',
        coin: '#f5b942',
        danger: '#e5484d',
        shadow: 'rgba(0,0,0,0.6)',
        star: 'rgba(180,190,230,0.55)',
      },
      light: {
        bg: '#eef0f6',
        bgElev: '#ffffff',
        surface: '#ffffff',
        surface2: '#f4f5fb',
        text: '#1a1d2b',
        muted: '#6b7180',
        border: '#dfe2ec',
        gridLine: 'rgba(80,90,160,0.12)',
        empty: '#e7eaf3',
        accent: '#7c3aed',
        accent2: '#6d28d9',
        accentText: '#ffffff',
        glow: 'rgba(124,58,237,0.30)',
        gem: '#2b8cff',
        coin: '#e0972a',
        danger: '#e5484d',
        shadow: 'rgba(40,40,80,0.12)',
        star: 'rgba(120,130,180,0.35)',
      },
    },
  };
})(window.Territory);
