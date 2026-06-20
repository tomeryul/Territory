/* =====================================================================
 * app.js — חיווט ה-UI: ניווט מסכים + canvas-map + מצלמה + מחוות
 * ---------------------------------------------------------------------
 * [UI ספציפי לפלטפורמה / PLATFORM-SPECIFIC]
 * מבנה: TopBar קבוע למעלה, אזור מסך מתחלף (מפה / משימות / פרופיל / ...),
 * וניווט תחתון. מסך המפה הוא <canvas> קבוע עם שכבת בקרות צפה (overlay).
 *  - גרירה = הזזה, צביטה/גלגל = זום, נגיעה = בחירת משבצת (פותח גיליון עריכה).
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  var h = T.h, L = T.Logic, Config = T.Config;

  T.mountApp = function (rootEl, store) {
    var d = store.dispatch;

    /* ---- מעטפת ---- */
    var topbarSlot = h('div', { class: 'slot' });
    var navSlot = h('div', { class: 'slot' });
    var overlaySlot = h('div', { class: 'slot' });
    var canvas = h('canvas', { class: 'map-canvas' });
    var mapWrap = h('div', { class: 'map-wrap' }, canvas);
    var mapScreen = h('div', { class: 'map-screen' }, mapWrap, overlaySlot);
    var otherSlot = h('div', { class: 'other-screen' });

    var appEl = h('div', { class: 'app' },
      topbarSlot,
      h('div', { class: 'screen-host' }, mapScreen, otherSlot),
      navSlot
    );
    rootEl.replaceChildren(appEl);

    var dpr = window.devicePixelRatio || 1;
    var renderer = T.createCanvasRenderer(canvas, function () { render(); });

    function size() { return { w: canvas.clientWidth, h: canvas.clientHeight }; }
    function commit(cx, cy, scale) { var c = L.clampCenter(cx, cy); d({ type: 'SET_CAMERA', centerX: c.x, centerY: c.y, scale: scale }); }
    var Cam = {
      zoom: function (dir) { var s = size(), cam = store.getState().camera; commit(cam.centerX, cam.centerY, L.clampScale(cam.scale * (dir > 0 ? Config.camera.zoomStep : 1 / Config.camera.zoomStep), s.w, s.h)); },
      fit: function () { var s = size(); commit(Config.world.width / 2, Config.world.height / 2, L.fitScale(s.w, s.h)); },
      centerMe: function () { var s = size(); commit(Config.start.x + 0.5, Config.start.y + 0.5, L.clampScale(Config.camera.defaultScale, s.w, s.h)); },
    };

    function ctx() { return { state: store.getState(), dispatch: d, S: T.Selectors, L: L, P: T.Progression, cam: Cam }; }

    /* ---- רינדור המסכים ---- */
    function focusInside(el) {
      var ae = document.activeElement;
      return ae && el.contains(ae) && ae.tagName === 'INPUT' &&
        (ae.type === 'text' || ae.type === 'url' || ae.type === 'color' || ae.type === 'range');
    }
    function update() {
      var c = ctx();
      topbarSlot.replaceChildren(T.Components.TopBar(c));
      navSlot.replaceChildren(T.Components.BottomNav(c));
      if (c.state.ui.screen === 'map') {
        mapScreen.style.display = 'flex';
        otherSlot.style.display = 'none';
        if (!focusInside(overlaySlot)) overlaySlot.replaceChildren(T.Components.MapOverlay(c));
        render();
      } else {
        mapScreen.style.display = 'none';
        otherSlot.style.display = 'block';
        if (!focusInside(otherSlot)) otherSlot.replaceChildren(T.Components.Screen(c));
      }
    }

    /* ---- ציור המפה (canvas) ---- */
    var liveCamera = null, phase = 0, rafId = null;
    function renderState() { var st = store.getState(); return liveCamera ? Object.assign({}, st, { camera: liveCamera }) : st; }
    function palette() {
      var th = T.Tokens.themes[store.getState().ui.theme] || T.Tokens.themes.dark;
      return { bg: th.bg, land: th.empty, gridLine: th.gridLine, accent: th.accent,
        primary: th.primary, secondary: th.secondary, glow: th.glow, star: th.star };
    }
    function render() {
      if (store.getState().ui.screen !== 'map') return;
      var s = size(); if (s.w < 2 || s.h < 2) return;
      var scene = T.Selectors.scene(renderState(), s.w, s.h);
      renderer.draw(scene, phase, palette(), dpr);
      if (scene.animated && !rafId) rafId = requestAnimationFrame(animLoop);
    }
    function animLoop(ts) {
      phase = ts / 1000;
      if (store.getState().ui.screen !== 'map') { rafId = null; return; }
      var s = size(); if (s.w < 2 || s.h < 2) { rafId = null; return; }
      var scene = T.Selectors.scene(renderState(), s.w, s.h);
      renderer.draw(scene, phase, palette(), dpr);
      rafId = scene.animated ? requestAnimationFrame(animLoop) : null;
    }

    /* ---- מחוות מגע/עכבר ---- */
    var pointers = {}, dragging = false, moved = false, startPt = null, startCam = null;
    var pinchDist0 = 0, pinchScale0 = 0, pinchAnchor = null;
    function cloneCam(c) { return { centerX: c.centerX, centerY: c.centerY, scale: c.scale }; }
    function localPt(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function ids() { return Object.keys(pointers); }
    function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }

    canvas.addEventListener('pointerdown', function (e) {
      canvas.setPointerCapture(e.pointerId);
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var n = ids().length;
      if (n === 1) { dragging = true; moved = false; startPt = { x: e.clientX, y: e.clientY }; startCam = cloneCam(store.getState().camera); }
      else if (n === 2) { dragging = false; startPinch(); }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!(e.pointerId in pointers)) return;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (ids().length >= 2) { doPinch(); return; }
      if (!dragging) return;
      var dx = e.clientX - startPt.x, dy = e.clientY - startPt.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      var sc = startCam.scale, c = L.clampCenter(startCam.centerX - dx / sc, startCam.centerY - dy / sc);
      liveCamera = { centerX: c.x, centerY: c.y, scale: sc }; render();
    });
    function endPointer(e) {
      if (!(e.pointerId in pointers)) return;
      delete pointers[e.pointerId];
      var n = ids().length;
      if (n === 0) {
        if (dragging && !moved) selectAt(e.clientX, e.clientY);
        dragging = false;
        if (liveCamera) { commit(liveCamera.centerX, liveCamera.centerY, liveCamera.scale); liveCamera = null; }
        startCam = null;
      } else if (n === 1) {
        if (liveCamera) { commit(liveCamera.centerX, liveCamera.centerY, liveCamera.scale); }
        var id = ids()[0]; startPt = { x: pointers[id].x, y: pointers[id].y };
        startCam = cloneCam(liveCamera || store.getState().camera); liveCamera = null; dragging = true; moved = true;
      }
    }
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);

    function startPinch() {
      var p = ids().map(function (k) { return pointers[k]; });
      pinchDist0 = dist(p[0], p[1]);
      var base = liveCamera || store.getState().camera; pinchScale0 = base.scale; startCam = cloneCam(base);
      var r = canvas.getBoundingClientRect();
      pinchAnchor = { x: (p[0].x + p[1].x) / 2 - r.left, y: (p[0].y + p[1].y) / 2 - r.top };
    }
    function doPinch() {
      var p = ids().map(function (k) { return pointers[k]; }), s = size();
      var ns = L.clampScale(pinchScale0 * (dist(p[0], p[1]) / (pinchDist0 || 1)), s.w, s.h);
      var wx = startCam.centerX + (pinchAnchor.x - s.w / 2) / startCam.scale;
      var wy = startCam.centerY + (pinchAnchor.y - s.h / 2) / startCam.scale;
      var c = L.clampCenter(wx - (pinchAnchor.x - s.w / 2) / ns, wy - (pinchAnchor.y - s.h / 2) / ns);
      liveCamera = { centerX: c.x, centerY: c.y, scale: ns }; render();
    }
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var p = localPt(e), s = size(), cam = store.getState().camera;
      var ns = L.clampScale(cam.scale * (e.deltaY < 0 ? Config.camera.zoomStep : 1 / Config.camera.zoomStep), s.w, s.h);
      var wx = cam.centerX + (p.x - s.w / 2) / cam.scale, wy = cam.centerY + (p.y - s.h / 2) / cam.scale;
      var c = L.clampCenter(wx - (p.x - s.w / 2) / ns, wy - (p.y - s.h / 2) / ns);
      commit(c.x, c.y, ns);
    }, { passive: false });

    function selectAt(clientX, clientY) {
      var r = canvas.getBoundingClientRect(), s = size(), cam = store.getState().camera;
      var tile = L.screenToTile(cam, s.w, s.h, clientX - r.left, clientY - r.top);
      if (L.inWorld(tile.x, tile.y)) d({ type: 'SELECT_TILE', x: tile.x, y: tile.y });
    }

    /* ---- התאמת גודל ---- */
    function onResize() {
      var s = size(); if (s.w < 2 || s.h < 2) return;
      var cam = store.getState().camera, ns = L.clampScale(cam.scale, s.w, s.h);
      if (ns !== cam.scale) commit(cam.centerX, cam.centerY, ns); else render();
    }
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(mapWrap);
    else window.addEventListener('resize', onResize);

    /* ---- אנימציית אווטאר מונפש (מסובב פריימים, עמיד לרינדורים) ----- */
    // עובד גם כשהאלמנט נבנה מחדש: סורק את ה-DOM ומציג פריים אחד בכל רגע.
    var avatarFrame = 0;
    setInterval(function () {
      var nodes = document.querySelectorAll('.avatar--anim');
      if (!nodes.length) return;
      avatarFrame++;
      for (var n = 0; n < nodes.length; n++) {
        var imgs = nodes[n].children, count = imgs.length;
        if (!count) continue;
        var active = avatarFrame % count;
        for (var i = 0; i < count; i++) imgs[i].style.display = i === active ? 'block' : 'none';
      }
    }, 220);

    store.subscribe(update);
    update();
  };
})(window.Territory);
