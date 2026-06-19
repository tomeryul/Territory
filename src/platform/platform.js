/* =====================================================================
 * platform.js — שכבת אבסטרקציה ל-Browser APIs
 * ---------------------------------------------------------------------
 * [UI ספציפי לפלטפורמה / PLATFORM-SPECIFIC]
 * זהו *הקובץ היחיד* שנוגע ב-Browser APIs (localStorage, setInterval,
 * document.visibility, FileReader). כל השאר מדבר רק עם הממשק שכאן.
 *
 * בהמרה לפלטפורמה אחרת מחליפים רק את הקובץ הזה:
 *   - React (web):  כמעט זהה.
 *   - React Native: Storage -> AsyncStorage, Ticker -> AppState+setInterval,
 *                   readImageFile -> expo-image-picker.
 *   - Flutter:      Storage -> shared_preferences, Ticker -> Timer+Lifecycle,
 *                   readImageFile -> image_picker.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  /* ---- Storage: שמירה/טעינה מתמשכת ----------------------------------- */
  // ממשק מינימלי (getJSON/setJSON) שקל למפות לכל מנגנון אחסון נייטיב.
  T.Storage = {
    getJSON: function (key) {
      try {
        var raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null; // אחסון לא זמין / JSON פגום — מתנהגים כ"ריק".
      }
    },
    setJSON: function (key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        /* מתעלמים — אחסון מלא או חסום */
      }
    },
  };

  /* ---- Ticker: דופק זמן שפעיל רק כשהאפליקציה גלויה על המסך ----------- */
  // זה הלב של מנגנון "צבירה לפי זמן פעיל": נספר זמן רק כשהמסך פעיל.
  T.createTicker = function (intervalMs, onTick) {
    var timer = null;
    var lastAt = 0;

    function visible() {
      return document.visibilityState === 'visible';
    }

    function step() {
      var now = Date.now();
      var elapsed = now - lastAt;
      lastAt = now;
      if (visible()) onTick(elapsed); // מעבירים ms שעברו (לוגיקה טהורה תחשב)
    }

    function start() {
      if (timer) return;
      lastAt = Date.now();
      timer = window.setInterval(step, intervalMs);
    }
    function stop() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    // איפוס מד-הזמן בכל מעבר חזרה לפעיל, כדי לא לזכות בזמן "רקע".
    document.addEventListener('visibilitychange', function () {
      lastAt = Date.now();
    });

    return { start: start, stop: stop };
  };

  /* ---- readImageFile: קריאת קובץ תמונה כ-Data URL (עם הקטנה) --------- */
  // עוטף את FileReader + canvas. מקטין את התמונה ל-MAX_DIM כדי שה-data-URL
  // יישאר קטן — אחרת תמונות גדולות חורגות ממכסת localStorage ומאיטות את
  // הרינדור (זה היה הבאג של "הכנסת תמונה לא עובדת טוב").
  // מחזיר Promise<string|null> (dataURL מוקטן, JPEG).
  var MAX_DIM = 256;
  T.readImageFile = function (file) {
    return new Promise(function (resolve) {
      if (!file) return resolve(null);
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          try {
            var scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
            var w = Math.max(1, Math.round(img.width * scale));
            var hgt = Math.max(1, Math.round(img.height * scale));
            var canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = hgt;
            canvas.getContext('2d').drawImage(img, 0, 0, w, hgt);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } catch (e) {
            resolve(reader.result); // נפילה חיננית — מחזירים את המקור
          }
        };
        img.onerror = function () { resolve(null); };
        img.src = reader.result;
      };
      reader.onerror = function () { resolve(null); };
      reader.readAsDataURL(file);
    });
  };
})(window.Territory);
