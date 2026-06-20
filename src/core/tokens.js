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
      // ---- מצב פרימיום (ברירת מחדל) — תואם להנדאוף Territory.dc ----
      dark: {
        bg: '#06040d',
        bgElev: '#0a0716',
        surface: '#14122a',
        surfaceHover: '#1b1830',
        surface2: '#1b1830',
        glass: 'rgba(40,32,68,0.62)',
        glassHi: 'rgba(58,44,98,0.6)',
        text: '#ece9f7',
        muted: '#a99dcb',
        border: 'rgba(150,120,255,0.18)',
        borderHi: 'rgba(167,139,250,0.45)',
        gridLine: 'rgba(150,140,210,0.06)',
        empty: '#0b0818',
        primary: '#7c3aed',
        secondary: '#22d3ee',
        success: '#00D97E',
        warning: '#f5c451',
        accent: '#7c3aed',
        accent2: '#22d3ee',
        accentText: '#ffffff',
        glow: 'rgba(124,77,237,0.5)',
        glowCyan: 'rgba(34,211,238,0.4)',
        gem: '#5af0ff',
        coin: '#f5c451',
        danger: '#FF5C6C',
        shadow: 'rgba(0,0,0,0.6)',
        star: 'rgba(167,139,250,0.5)',
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
