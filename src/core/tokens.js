/* =====================================================================
 * tokens.js — Design Tokens (מערכת העיצוב הפרימיום)
 * ---------------------------------------------------------------------
 * [לוגיקה ניידת / PORTABLE LOGIC]
 * עיצוב כהה-פוטוריסטי: שחור עמוק, ניאון סגול/ציאן, גלאסמורפיזם וזוהר.
 * 'dark' = מצב פרימיום; 'night' = מצב לילה עמום מאוד (ידידותי לסוללה/שינה).
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  T.Tokens = {
    // צבעי טריטוריה/שחקנים (קבועים בין הנושאים).
    palette: {
      brand: '#6C5CE7', cyan: '#00D4FF', green: '#00D97E', amber: '#FFC857',
      red: '#FF5C6C', purple: '#9B6CFF', pink: '#FF6BD6', slate: '#8FA0C0',
    },

    space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
    radius: { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 },
    size: { cell: 40, gap: 2 },
    font: { sm: 12, base: 14, lg: 18, xl: 22, xxl: 28 },

    themes: {
      // ---- מצב פרימיום (ברירת מחדל) ----
      dark: {
        bg: '#050816',
        bgElev: '#0B1024',
        surface: '#0E1324',
        surfaceHover: '#151B30',
        surface2: '#151B30',
        glass: 'rgba(18,24,46,0.55)',
        glassHi: 'rgba(30,38,70,0.65)',
        text: '#FFFFFF',
        muted: '#A7B0C3',
        border: 'rgba(255,255,255,0.08)',
        borderHi: 'rgba(108,92,231,0.45)',
        gridLine: 'rgba(108,92,231,0.12)',
        empty: '#0A0F20',
        primary: '#6C5CE7',
        secondary: '#00D4FF',
        success: '#00D97E',
        warning: '#FFC857',
        accent: '#6C5CE7',
        accent2: '#00D4FF',
        accentText: '#FFFFFF',
        glow: 'rgba(108,92,231,0.45)',
        glowCyan: 'rgba(0,212,255,0.40)',
        gem: '#00D4FF',
        coin: '#FFC857',
        danger: '#FF5C6C',
        shadow: 'rgba(0,0,0,0.6)',
        star: 'rgba(120,160,255,0.5)',
      },
      // ---- מצב לילה: כמעט שחור, זוהר כחול עמום, מינימום לבן ----
      night: {
        bg: '#02030A',
        bgElev: '#05070F',
        surface: '#070A14',
        surfaceHover: '#0A0E1A',
        surface2: '#0A0E1A',
        glass: 'rgba(8,12,24,0.6)',
        glassHi: 'rgba(14,20,38,0.6)',
        text: '#9FB0D0',
        muted: '#5A6880',
        border: 'rgba(120,150,255,0.06)',
        borderHi: 'rgba(70,90,180,0.30)',
        gridLine: 'rgba(70,100,200,0.06)',
        empty: '#04060E',
        primary: '#3E4DA8',
        secondary: '#2E6E9E',
        success: '#2A8F63',
        warning: '#8A7038',
        accent: '#3E4DA8',
        accent2: '#2E6E9E',
        accentText: '#C7D2EA',
        glow: 'rgba(50,70,160,0.22)',
        glowCyan: 'rgba(40,110,160,0.20)',
        gem: '#5C90C0',
        coin: '#9A875A',
        danger: '#9A4550',
        shadow: 'rgba(0,0,0,0.85)',
        star: 'rgba(70,100,170,0.30)',
      },
    },
  };
})(window.Territory);
