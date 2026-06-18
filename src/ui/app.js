/* =====================================================================
 * app.js — חיווט שכבת ה-UI ל-Store (render loop) + התאמה למסך
 * ---------------------------------------------------------------------
 * [UI ספציפי לפלטפורמה / PLATFORM-SPECIFIC]
 * שכבת תצוגה דקה: בונה "מעטפת" קבועה פעם אחת, ובכל שינוי state מרנדרת
 * כל אזור (TopBar / Grid / Controls / Panel) לתוך ה-slot שלו.
 *
 * שני תיקוני באגים מהותיים מול הגרסה הקודמת:
 *  1) הרשת מותאמת לגודל המסך (responsive) — נכנסת לאייפון בלי גלילה.
 *  2) רינדור לפי-אזור + "מגן פוקוס": בזמן הקלדה בשדה (URL/צבע) לא דורסים
 *     את הפאנל בכל tick — כך אין איבוד טקסט/קפיצות.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  var h = T.h;

  T.mountApp = function (rootEl, store) {
    /* ---- מעטפת קבועה (נבנית פעם אחת; רק תוכן ה-slots מתחלף) ---------- */
    var topbarSlot = h('div', { class: 'slot' });
    var controlsSlot = h('div', { class: 'slot' });
    var panelSlot = h('div', { class: 'slot' });
    var gridAreaEl = h('div', { class: 'grid-area' }); // נמדד להתאמת הרשת

    var appEl = h('div', { class: 'app' },
      topbarSlot,
      h('main', { class: 'main' },
        h('section', { class: 'board' }, gridAreaEl, controlsSlot),
        panelSlot
      )
    );
    rootEl.replaceChildren(appEl);

    function ctx() {
      return {
        state: store.getState(),
        dispatch: store.dispatch,
        S: T.Selectors,
        L: T.Logic,
      };
    }

    /* ---- רינדור לפי אזור ------------------------------------------- */
    function update() {
      var c = ctx();
      topbarSlot.replaceChildren(T.Components.TopBar(c));
      controlsSlot.replaceChildren(T.Components.Controls(c));
      gridAreaEl.replaceChildren(T.Components.Grid(c));

      // מגן פוקוס: אם המשתמש כרגע בתוך שדה קלט בפאנל — לא מרנדרים אותו
      // מחדש (אחרת ההקלדה/בורר הצבע נקטעים בכל שנייה).
      var ae = document.activeElement;
      var editingInPanel =
        ae && panelSlot.contains(ae) && ae.tagName === 'INPUT' &&
        (ae.type === 'text' || ae.type === 'url' || ae.type === 'color');
      if (!editingInPanel) {
        panelSlot.replaceChildren(T.Components.EditorPanel(c));
      }

      applyCellSize(); // קובע את גודל התא בפיקסלים מיד (בלי הבהוב)
      maybeResize();   // אם מספר העמודות/שורות שמתאים השתנה — מעדכן state
    }

    /* ---- התאמת הרשת לגודל השטח (פיקסלים) --------------------------- */
    function measure() {
      var w = gridAreaEl.clientWidth;
      var hh = gridAreaEl.clientHeight;
      if (w < 2 || hh < 2) return null;
      // [UI מודד -> לוגיקה טהורה מחשבת] computeGridFit הוא פונקציה טהורה.
      return T.Logic.computeGridFit(w, hh);
    }

    // עדכון גודל-תא ישירות על ה-DOM (עניין פיקסלים, לא נכנס ל-state).
    function applyCellSize() {
      var fit = measure();
      if (!fit) return;
      var gridEl = gridAreaEl.firstElementChild;
      if (gridEl) gridEl.style.setProperty('--cell-size', fit.cell + 'px');
    }

    // עדכון מספר העמודות/שורות ב-state — רק כשהשתנה (נדחה כדי למנוע לולאה).
    var resizeQueued = false;
    function maybeResize() {
      var fit = measure();
      if (!fit) return;
      var vp = store.getState().viewport;
      if ((vp.cols !== fit.cols || vp.rows !== fit.rows) && !resizeQueued) {
        resizeQueued = true;
        requestAnimationFrame(function () {
          resizeQueued = false;
          store.dispatch({ type: 'RESIZE', cols: fit.cols, rows: fit.rows });
        });
      }
    }

    /* ---- מאזין לשינויי גודל מסך / סיבוב מכשיר ---------------------- */
    // נצמד ל-grid-area הקבוע (לא מוחלף) — כך ההאזנה שורדת רינדורים.
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () {
        applyCellSize();
        maybeResize();
      });
      ro.observe(gridAreaEl);
    } else {
      window.addEventListener('resize', function () {
        applyCellSize();
        maybeResize();
      });
    }

    store.subscribe(update); // כל dispatch -> רינדור מחדש
    update();                // רינדור ראשוני
  };
})(window.Territory);
