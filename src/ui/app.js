/* =====================================================================
 * app.js — חיווט ה-UI (handoff): מסכים + canvas-מפה משותף + ניווט
 * ---------------------------------------------------------------------
 * [UI ספציפי לפלטפורמה / PLATFORM-SPECIFIC]
 * מבנה ההנדאוף: מסך פעיל (Home/World/...) + dock צף. ה-canvas של המפה
 * הוא אלמנט קבוע שמוזרק ל-.map-host של המסך הפעיל, ומנוהל ע"י worldCanvas.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  var h = T.h;

  T.mountApp = function (rootEl, store) {
    var d = store.dispatch;

    var screenSlot = h('div', { class: 'screen-slot' });
    var navSlot = h('div', { class: 'slot' });
    var appEl = h('div', { class: 'app handoff' }, screenSlot, navSlot);
    rootEl.replaceChildren(appEl);

    // canvas-מפה קבוע, מנוע worldCanvas (פורט מההנדאוף).
    var mapCanvas = h('canvas', { class: 'map-canvas' });
    var worldCtl = T.createWorldCanvas(mapCanvas, {
      marker: function () { return document.querySelector('.player-marker'); },
      onSelect: function () { render(); },
      getTerritoryStyle: function () { return store.getState().meta.territoryStyle; },
      zoneReady: function (id) { return T.Selectors.zoneReady(store.getState(), id); },
      onZoneTap: function (id) {
        var pl = T.PlaceById[id]; if (!pl) return;
        d({ type: 'COLLECT_RESOURCE', zoneId: id, resource: pl.resource, amount: pl.amount });
      },
    });
    // המחוות (צביטה/גלגל/גרירה/נגיעה) מטופלות בתוך worldCanvas על ה-canvas.

    function ctx() {
      return { state: store.getState(), dispatch: d, S: T.Selectors, L: T.Logic, P: T.Progression, world: worldCtl };
    }

    // מגן פוקוס: לא לרנדר מחדש את המסך בזמן הקלדה בשדה (URL/צבע/שקיפות).
    function editingInScreen() {
      var ae = document.activeElement;
      return ae && screenSlot.contains(ae) && ae.tagName === 'INPUT' &&
        (ae.type === 'text' || ae.type === 'url' || ae.type === 'color' || ae.type === 'range');
    }

    function render() {
      var c = ctx(), st = c.state;
      navSlot.replaceChildren(T.Components.BottomNav(c));
      if (!editingInScreen()) screenSlot.replaceChildren(T.Components.Screen(c));

      // הזרקת ה-canvas ל-map-host של המסך הפעיל (אם קיים).
      var host = screenSlot.querySelector && screenSlot.querySelector('.map-host');
      if (host) {
        if (mapCanvas.parentNode !== host) host.appendChild(mapCanvas);
        worldCtl.setScreen(st.ui.screen === 'world' ? 'world' : 'home');
        worldCtl.setHomeCount(T.Selectors.territorySize(st));
        worldCtl.start();
      } else {
        worldCtl.stop();
      }
    }

    // אנימציית אווטאר מונפש (מסובב פריימים, עמיד לרינדורים).
    var af = 0;
    setInterval(function () {
      var nodes = document.querySelectorAll('.avatar--anim');
      if (!nodes.length) return;
      af++;
      for (var n = 0; n < nodes.length; n++) {
        var imgs = nodes[n].children, cnt = imgs.length; if (!cnt) continue;
        var a = af % cnt; for (var i = 0; i < cnt; i++) imgs[i].style.display = i === a ? 'block' : 'none';
      }
    }, 220);

    store.subscribe(render);
    render();
  };
})(window.Territory);
