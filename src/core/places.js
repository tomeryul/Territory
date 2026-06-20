/* =====================================================================
 * places.js — אזורים מיוחדים, משאבים, ואפקטי-עיצוב (נתונים טהורים)
 * ---------------------------------------------------------------------
 * [לוגיקה ניידת / PORTABLE LOGIC]
 * אזורים על המפה (ערים/מקומות מיוחדים) שמהם אוספים משאבים; את המשאבים
 * מוציאים כדי לעצב את הטריטוריה (אפקטים/סקינים).
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  // משאבים (מטבע-משחק לעיצוב).
  T.Resources = {
    neon: { name: 'ניאון', emoji: '⚡', color: '#22d3ee' },
    iron: { name: 'ברזל', emoji: '🔩', color: '#9aa6b2' },
    crystal: { name: 'קריסטל', emoji: '💠', color: '#7af0e0' },
    wood: { name: 'עץ', emoji: '🪵', color: '#b5894f' },
    solar: { name: 'אנרגיה', emoji: '☀️', color: '#f5c451' },
  };

  // אזורים מיוחדים על המפה — לכל אחד משאב שאפשר לאסוף ממנו.
  T.Places = [
    { id: 'neoncity', name: 'עיר הניאון', emoji: '🏙️', color: '#a855f7', glow: 'rgba(180,110,255,.85)', node: '#dcb8ff', seed: 201, off: [-13, 9], count: 50, resource: 'neon', amount: 3 },
    { id: 'ironrange', name: 'רכס הברזל', emoji: '⛰️', color: '#6b7280', glow: 'rgba(150,160,185,.8)', node: '#cfd6e0', seed: 202, off: [15, 11], count: 42, resource: 'iron', amount: 3 },
    { id: 'crystalbay', name: 'מפרץ הקריסטל', emoji: '🌊', color: '#16b8a6', glow: 'rgba(40,225,205,.8)', node: '#7af0e0', seed: 203, off: [3, -17], count: 46, resource: 'crystal', amount: 3 },
    { id: 'forest', name: 'יער האזמרגד', emoji: '🌲', color: '#2e9e54', glow: 'rgba(60,200,110,.8)', node: '#a7f5c0', seed: 204, off: [-17, -9], count: 52, resource: 'wood', amount: 3 },
    { id: 'dunes', name: 'דיונות הזהב', emoji: '🏜️', color: '#cf9b2c', glow: 'rgba(245,196,81,.8)', node: '#ffdd92', seed: 205, off: [17, -5], count: 44, resource: 'solar', amount: 3 },
  ];
  T.PlaceById = {}; T.Places.forEach(function (p) { T.PlaceById[p.id] = p; });

  // אפקטי-עיצוב לטריטוריה — עולים משאבים. משנים צבע/זוהר על המפה.
  T.Effects = [
    { id: 'none', name: 'רגיל', emoji: '◻️', cost: null, glow: 'rgba(90,130,255,.95)' },
    { id: 'neon', name: 'ניאון', emoji: '⚡', cost: { neon: 8 }, glow: 'rgba(34,211,238,1)' },
    { id: 'gold', name: 'זהב', emoji: '☀️', cost: { solar: 8 }, glow: 'rgba(245,196,81,1)' },
    { id: 'crystal', name: 'קריסטל', emoji: '💠', cost: { crystal: 8 }, glow: 'rgba(122,240,224,1)' },
    { id: 'forest', name: 'יער', emoji: '🌲', cost: { wood: 8 }, glow: 'rgba(60,200,110,1)' },
    { id: 'iron', name: 'מתכת', emoji: '🔩', cost: { iron: 8 }, glow: 'rgba(180,190,210,1)' },
  ];
  T.EffectById = {}; T.Effects.forEach(function (e) { T.EffectById[e.id] = e; });
})(window.Territory);
