/* =====================================================================
 * app.js — חיווט שכבת ה-UI ל-Store (render loop)
 * ---------------------------------------------------------------------
 * [UI ספציפי לפלטפורמה / PLATFORM-SPECIFIC]
 * מנוי ל-store -> רינדור מחדש של עץ הקומפוננטות -> החלפת תוכן השורש.
 * זו "שכבת ה-UI הדקה": רק רינדור והאזנה, בלי לוגיקה עסקית.
 * ב-React כל זה מתחלף ב-ReactDOM.render + re-render אוטומטי.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  T.mountApp = function (rootEl, store) {
    // ctx מועבר לכל הקומפוננטות — נתונים (state/selectors) + שיגור (dispatch).
    function buildCtx() {
      return {
        state: store.getState(),
        dispatch: store.dispatch,
        S: T.Selectors,
        L: T.Logic,
      };
    }

    function render() {
      var tree = T.Components.App(buildCtx());
      // רינדור מלא ופשוט: מחליפים את כל התוכן. מספיק לפרוטוטייפ
      // (ב-React ה-diffing מתבצע אוטומטית; כאן מחליפים הכל).
      rootEl.replaceChildren(tree);
    }

    store.subscribe(render); // כל dispatch -> render מחדש
    render(); // רינדור ראשוני
  };
})(window.Territory);
