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

  /* ---- readImageFile: קריאת קובץ תמונה כ-Data URL -------------------- */
  // עוטף את FileReader. מחזיר Promise<string|null> (dataURL).
  T.readImageFile = function (file) {
    return new Promise(function (resolve) {
      if (!file) return resolve(null);
      var reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = function () {
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  };
})(window.Territory);
