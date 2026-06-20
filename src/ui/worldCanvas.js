/* =====================================================================
 * worldCanvas.js — מנוע ציור המפה (פורט נאמן מ-Territory.dc.html)
 * ---------------------------------------------------------------------
 * [UI ספציפי לפלטפורמה / PLATFORM-SPECIFIC]
 * פורט כמעט מילולי של לוגיקת ה-canvas מההנדאוף: genBlob/prep/computeFit/
 * draw/particles/marker/handleClick. מצייר במצב 'home' (טריטוריית השחקן)
 * או 'world' (כל השחקנים) — בדיוק כמו בעיצוב המקורי.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  function mulberry32(a) {
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function genBlob(seed, count) {
    var r = mulberry32(seed), set = { '0,0': 1 }, list = [[0, 0]];
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]], guard = 0;
    while (list.length < count && guard < count * 60) {
      guard++;
      var b = list[Math.floor(r() * list.length)], d = dirs[Math.floor(r() * dirs.length)];
      var nx = b[0] + d[0], ny = b[1] + d[1], k = nx + ',' + ny;
      if (!set[k]) { set[k] = 1; list.push([nx, ny]); }
    }
    return list;
  }
  function prep(t) {
    var r = mulberry32(t.seed + 131); t.nodes = [];
    var n = Math.max(1, Math.round(t.cells.length / 42));
    for (var i = 0; i < n; i++) t.nodes.push(t.cells[Math.floor(r() * t.cells.length)]);
    var sx = 0, sy = 0; for (var c = 0; c < t.cells.length; c++) { sx += t.cells[c][0]; sy += t.cells[c][1]; }
    t.cx = sx / t.cells.length; t.cy = sy / t.cells.length;
    // ג'יטר 0..0.8 — מודולו לא-שלילי (קואורדינטות שליליות לא ייצרו אלפא שלילי).
    t.jit = {}; for (var c2 = 0; c2 < t.cells.length; c2++) { var cc = t.cells[c2]; t.jit[cc[0] + ',' + cc[1]] = ((((cc[0] * 7 + cc[1] * 13) % 5) + 5) % 5) / 5; }
    return t;
  }

  // הגדרות שחקני העולם — כפי שבהנדאוף.
  var WORLD_DEFS = [
    { name: 'TraderOne', seed: 7, off: [0, 4], color: '#4060e6', glow: 'rgba(90,130,255,.9)', node: '#9cc0ff', isPlayer: true, count: 150, share: '18.4%', value: '4.2M', tiles: '245', rank: '#3' },
    { name: 'LandLord', seed: 21, off: [-19, -11], color: '#7c3aed', glow: 'rgba(150,80,255,.85)', node: '#c4a3ff', count: 72, share: '9.1%', value: '750K', tiles: '150', rank: '#9' },
    { name: 'PixelMaster', seed: 33, off: [15, -13], color: '#16b8a6', glow: 'rgba(40,225,205,.85)', node: '#7af0e0', count: 96, share: '32.2%', value: '2.4M', tiles: '322', rank: '#1' },
    { name: 'CryptoKing', seed: 48, off: [26, 3], color: '#a855f7', glow: 'rgba(180,110,255,.85)', node: '#dcb8ff', count: 60, share: '6.0%', value: '410K', tiles: '80', rank: '#14' },
    { name: 'GoldRush', seed: 60, off: [-21, 15], color: '#cf9b2c', glow: 'rgba(245,196,81,.85)', node: '#ffdd92', count: 58, share: '4.4%', value: '1.2M', tiles: '200', rank: '#6' },
    { name: 'RoseEmpire', seed: 72, off: [3, 19], color: '#e0567a', glow: 'rgba(255,110,150,.8)', node: '#ffaec3', count: 70, share: '7.8%', value: '980K', tiles: '118', rank: '#7' },
    { name: 'NightOwl', seed: 84, off: [22, 17], color: '#4f5bd5', glow: 'rgba(110,125,255,.8)', node: '#aeb6ff', count: 60, share: '5.2%', value: '620K', tiles: '95', rank: '#11' },
  ];

  T.createWorldCanvas = function (canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var screen = 'home', selected = 2, glow = 1;
    var zoom = 1, panX = 0, panY = 0, vw = 0, vh = 0; // מצלמה (זום + הזזה)
    var allTerr, neighborsCache = null, worldMap = {}, particles = null, fit = null, fitKey = '', lastHomeCount = -1;
    var raf = null, running = false;

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function applyCam(x, y) { return [(x - vw / 2) * zoom + vw / 2 + panX, (y - vh / 2) * zoom + vh / 2 + panY]; }
    function setZoomAround(z1, fx, fy) {
      z1 = clamp(z1, 0.05, 8); // מינימום נמוך => אפשר לצבוט-החוצה מהבית עד לכל העולם

      var bx = (fx - vw / 2 - panX) / zoom + vw / 2, by = (fy - vh / 2 - panY) / zoom + vh / 2;
      panX = fx - vw / 2 - (bx - vw / 2) * z1; panY = fy - vh / 2 - (by - vh / 2) * z1; zoom = z1;
    }
    function resetCamera() { zoom = 1; panX = 0; panY = 0; }

    // השכנים (שחקנים אחרים) — נבנים פעם אחת, מפוזרים על אותו הגריד.
    function buildNeighbors() {
      return WORLD_DEFS.filter(function (d) { return !d.isPlayer; }).map(function (d) {
        var dd = {}; for (var p in d) dd[p] = d[p];
        dd.off = [Math.round(d.off[0] * 1.5), Math.round(d.off[1] * 1.5)]; // פיזור על אותו הגריד
        dd.cells = genBlob(d.seed, d.count); return prep(dd);
      });
    }
    // מפה אחת משותפת: הטריטוריה שלך (חיה/גדלה) + כל השכנים, על אותו גריד.
    function buildAll(count) {
      count = Math.max(6, count || 6); lastHomeCount = count;
      if (!neighborsCache) neighborsCache = buildNeighbors();
      var player = prep({ name: 'You', seed: 7, off: [0, 0], color: '#4060e6', glow: 'rgba(90,130,255,.95)', node: '#8ab0ff', isPlayer: true, share: '18.4%', value: '4.2M', tiles: String(count), rank: '#3', cells: genBlob(7, count) });
      allTerr = [player].concat(neighborsCache);
      worldMap = {};
      allTerr.forEach(function (t, i) { for (var c = 0; c < t.cells.length; c++) { var cc = t.cells[c]; worldMap[(cc[0] + t.off[0]) + ',' + (cc[1] + t.off[1])] = i; } });
    }
    buildAll(6);

    // אזורים מיוחדים (ערים/מקומות) על אותו הגריד — מהם אוספים משאבים.
    var placesList = null, placesMap = {};
    function buildPlaces() {
      placesList = (T.Places || []).map(function (pp) {
        return prep({ name: pp.name, seed: pp.seed, off: pp.off, color: pp.color, glow: pp.glow, node: pp.node, isPlace: true, placeId: pp.id, emoji: pp.emoji, cells: genBlob(pp.seed, pp.count) });
      });
      placesMap = {};
      placesList.forEach(function (t) { for (var c = 0; c < t.cells.length; c++) { var cc = t.cells[c]; placesMap[(cc[0] + t.off[0]) + ',' + (cc[1] + t.off[1])] = t.placeId; } });
    }
    buildPlaces();

    function activeList() { return allTerr; } // אותה מפה לשני המצבים (בית = זום-אין, עולם = זום-אאוט)

    function computeFit(W, H) {
      var list = activeList(); if (!list || !list[0]) return null;
      // ---- Home: גודל-תא קבוע, ממורכז על מרכז-הכובד => הצמיחה נראית כהתרחבות
      // החוצה (ולא "מתכווץ כדי להתאים"). אפשר לצבוט-זום כשגדל מעבר למסך.
      if (screen === 'home') {
        var tt = allTerr[0], ref = 20; // ממורכז על הטריטוריה שלך; זום ברירת-מחדל
        var step0 = Math.min(W, H) * 0.82 / ref;
        var gap0 = Math.max(1, step0 * 0.14), cell0 = step0 - gap0;
        return { minX: 0, minY: 0, maxX: 0, maxY: 0, step: step0, gap: gap0, cell: cell0,
          originX: W / 2 - tt.cx * step0 + gap0 / 2, originY: H / 2 - tt.cy * step0 + gap0 / 2 };
      }
      var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
      for (var i = 0; i < list.length; i++) for (var c = 0; c < list[i].cells.length; c++) {
        var gx = list[i].cells[c][0] + list[i].off[0], gy = list[i].cells[c][1] + list[i].off[1];
        if (gx < minX) minX = gx; if (gy < minY) minY = gy; if (gx > maxX) maxX = gx; if (gy > maxY) maxY = gy;
      }
      var spanX = maxX - minX + 1, spanY = maxY - minY + 1;
      var pad = screen === 'world' ? 0.9 : 0.82;
      var step = Math.min(W * pad / spanX, H * pad / spanY);
      var gap = Math.max(1, step * 0.14), cell = step - gap;
      var originX = (W - spanX * step) / 2 - minX * step + gap / 2;
      var originY = (H - spanY * step) / 2 - minY * step + gap / 2;
      return { minX: minX, minY: minY, maxX: maxX, maxY: maxY, step: step, gap: gap, cell: cell, originX: originX, originY: originY };
    }
    function initParticles(W, H) {
      var n = Math.round(48 * glow), pal = ['rgba(167,139,250,', 'rgba(90,240,255,', 'rgba(245,196,81,'];
      particles = [];
      for (var i = 0; i < n; i++) particles.push({ x: Math.random() * W, y: Math.random() * H, vy: 0.12 + Math.random() * 0.45, vx: (Math.random() - 0.5) * 0.18, r: 0.6 + Math.random() * 1.9, a: 0.15 + Math.random() * 0.55, tw: Math.random() * 6.28, c: pal[Math.random() < 0.15 ? 2 : (Math.random() < 0.5 ? 1 : 0)] });
    }
    function sp(gx, gy, f) { return [f.originX + gx * f.step, f.originY + gy * f.step]; }

    function draw(ts) {
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var cssW = canvas.clientWidth, cssH = canvas.clientHeight; if (!cssW || !cssH) return;
      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) { canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr); fit = null; }
      var key = screen + '|' + cssW + 'x' + cssH;
      if (key !== fitKey) { fit = null; fitKey = key; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var W = cssW, H = cssH; vw = W; vh = H;
      if (!fit) { fit = computeFit(W, H); initParticles(W, H); }
      var f = fit; if (!f) return;
      var t = ts / 1000, list = activeList();

      // סגנון הטריטוריה של השחקן (צבע/אפקט מהמשאבים).
      if (allTerr[0] && opts.getTerritoryStyle) {
        var stl = opts.getTerritoryStyle();
        if (stl) { allTerr[0].color = stl.color || '#4060e6'; var ef = T.EffectById && T.EffectById[stl.effect]; allTerr[0].glow = ef ? ef.glow : 'rgba(90,130,255,.95)'; }
      }
      var drawList = placesList ? list.concat(placesList) : list; // שחקנים + אזורים

      ctx.clearRect(0, 0, W, H);

      // ---- שכבת העולם (מושפעת מזום/הזזה) ----
      ctx.save();
      ctx.translate(W / 2 + panX, H / 2 + panY); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);

      // grid dots (טווח מורחב כדי למלא גם בזום-אאוט)
      ctx.fillStyle = 'rgba(150,140,210,0.05)';
      var gs = f.step, ox = ((f.originX % gs) + gs) % gs, oy = ((f.originY % gs) + gs) % gs;
      for (var gx = ox - W; gx < W * 2; gx += gs) for (var gy = oy - H; gy < H * 2; gy += gs) ctx.fillRect(gx - 0.5, gy - 0.5, 1, 1);

      // glow pass
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      drawList.forEach(function (tt) {
        var isSel = screen === 'world' && allTerr[selected] === tt;
        var c = sp(tt.cx + tt.off[0], tt.cy + tt.off[1], f);
        var ext = Math.sqrt(tt.cells.length) * f.step * 0.62;
        var pulse = 0.78 + 0.22 * Math.sin(t * 1.6 + tt.seed);
        var g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], ext);
        var a = (isSel ? 0.5 : 0.3) * pulse * glow;
        g.addColorStop(0, tt.glow.replace(/[\d.]+\)$/, a + ')'));
        g.addColorStop(1, tt.glow.replace(/[\d.]+\)$/, '0)'));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], ext, 0, 6.2832); ctx.fill();
      });
      ctx.restore();

      // cells
      drawList.forEach(function (tt) {
        var isSel = screen === 'world' && allTerr[selected] === tt;
        var cw = f.cell, r = Math.max(1.2, cw * 0.18), nodeSet = {};
        for (var ni = 0; ni < tt.nodes.length; ni++) nodeSet[tt.nodes[ni][0] + ',' + tt.nodes[ni][1]] = 1;
        for (var ci = 0; ci < tt.cells.length; ci++) {
          var c = tt.cells[ci], pos = sp(c[0] + tt.off[0], c[1] + tt.off[1], f), X = pos[0], Y = pos[1];
          var isNode = nodeSet[c[0] + ',' + c[1]];
          rr(X, Y, cw, cw, r); ctx.fillStyle = tt.color; ctx.fill();
          var j = tt.jit[c[0] + ',' + c[1]] || 0;
          ctx.fillStyle = 'rgba(0,0,0,' + (0.05 + j * 0.14) + ')'; ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.13)'; ctx.fillRect(X + r * 0.3, Y + r * 0.3, cw - r * 0.6, cw * 0.34);
          ctx.fillStyle = 'rgba(0,0,0,0.26)'; ctx.fillRect(X, Y + cw * 0.64, cw, cw * 0.36);
          if (isSel) { ctx.fillStyle = 'rgba(255,255,255,0.10)'; rr(X, Y, cw, cw, r); ctx.fill(); }
          if (isNode) {
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = tt.node; ctx.beginPath(); ctx.arc(X + cw / 2, Y + cw / 2, cw * 0.34, 0, 6.2832); ctx.fill(); ctx.restore();
            ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(X + cw / 2, Y + cw / 2, Math.max(0.8, cw * 0.1), 0, 6.2832); ctx.fill();
          }
        }
      });

      // selection outline (world)
      if (screen === 'world') {
        var st = allTerr[selected], node = st.nodes[0], pos2 = sp(node[0] + st.off[0], node[1] + st.off[1], f);
        var cw2 = f.cell, pad = f.step * 0.55, blink = 0.6 + 0.4 * Math.sin(t * 3);
        ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,' + blink + ')'; ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 10;
        rr(pos2[0] - pad, pos2[1] - pad, cw2 + pad * 2, cw2 + pad * 2, 5); ctx.stroke(); ctx.restore();
      }

      ctx.restore(); // ---- סוף שכבת העולם (זום/הזזה) ----

      // תוויות אזורים + טבעת-איסוף (מרחב-מסך, גודל קבוע).
      if (placesList) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (var li = 0; li < placesList.length; li++) {
          var pl = placesList[li];
          var bp = sp(pl.cx + pl.off[0], pl.cy + pl.off[1], f), scr = applyCam(bp[0], bp[1]);
          if (scr[0] < -40 || scr[0] > W + 40 || scr[1] < -40 || scr[1] > H + 40) continue;
          var ready = opts.zoneReady ? opts.zoneReady(pl.placeId) : true;
          if (ready) { // טבעת פועמת = ניתן לאסוף
            var rp = 15 + 3 * Math.sin(t * 3 + li);
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(scr[0], scr[1] - 16, rp, 0, 6.2832); ctx.stroke();
          }
          ctx.font = '18px system-ui'; ctx.fillStyle = '#fff'; ctx.fillText(pl.emoji, scr[0], scr[1] - 16);
          ctx.font = '700 10px system-ui';
          var w = ctx.measureText(pl.name).width + 12;
          ctx.fillStyle = 'rgba(8,6,18,0.72)'; rr(scr[0] - w / 2, scr[1] + 2, w, 15, 7); ctx.fill();
          ctx.fillStyle = ready ? '#7df0ff' : '#9aa0b5'; ctx.fillText(pl.name, scr[0], scr[1] + 10);
        }
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      }

      // particles (מרחב-מסך, לא מושפע מזום)
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      if (particles) for (var pi = 0; pi < particles.length; pi++) {
        var p = particles[pi]; p.y -= p.vy; p.x += p.vx;
        if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
        if (p.x < -4) p.x = W + 4; if (p.x > W + 4) p.x = -4;
        var tw = 0.5 + 0.5 * Math.sin(t * 2 + p.tw), al = p.a * tw * (0.5 + 0.5 * glow);
        var g2 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.5);
        g2.addColorStop(0, p.c + al + ')'); g2.addColorStop(1, p.c + '0)');
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.5, 0, 6.2832); ctx.fill();
      }
      ctx.restore();

      placeMarker(f, list);
    }

    function rr(x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      ctx.beginPath(); ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    function placeMarker(f, list) {
      var el = typeof opts.marker === 'function' ? opts.marker() : opts.marker; if (!el) return;
      var player = null; for (var i = 0; i < list.length; i++) if (list[i].isPlayer) { player = list[i]; break; }
      if (!player) player = list[0];
      var pos = sp(player.cx + player.off[0], player.cy + player.off[1], f);
      var scr = applyCam(pos[0], pos[1]); // ממירים לקואורדינטות מסך (אחרי זום/הזזה)
      el.style.left = scr[0] + 'px'; el.style.top = scr[1] + 'px'; el.style.display = 'block';
    }

    function handleClick(clientX, clientY) {
      if (!fit) return;
      var rect = canvas.getBoundingClientRect(), f = fit;
      var sxp = clientX - rect.left, syp = clientY - rect.top;
      var x = (sxp - vw / 2 - panX) / zoom + vw / 2, y = (syp - vh / 2 - panY) / zoom + vh / 2;
      var gx = Math.round((x - f.originX - f.cell / 2) / f.step), gy = Math.round((y - f.originY - f.cell / 2) / f.step);
      // אזורים קודם (איסוף משאב) — בכל מסך, רדיוס חיפוש רחב יותר.
      var pf = null, best = 99;
      for (var dx = -2; dx <= 2; dx++) for (var dy = -2; dy <= 2; dy++) {
        var k = (gx + dx) + ',' + (gy + dy);
        if (k in placesMap) { var d = Math.abs(dx) + Math.abs(dy); if (d < best) { best = d; pf = placesMap[k]; } }
      }
      if (pf !== null) { if (opts.onZoneTap) opts.onZoneTap(pf); return; }
      // שחקנים (בחירה) — רק במסך העולם.
      if (screen !== 'world') return;
      var found = null; best = 99;
      for (var dx2 = -1; dx2 <= 1; dx2++) for (var dy2 = -1; dy2 <= 1; dy2++) {
        var k2 = (gx + dx2) + ',' + (gy + dy2);
        if (k2 in worldMap) { var d2 = Math.abs(dx2) + Math.abs(dy2); if (d2 < best) { best = d2; found = worldMap[k2]; } }
      }
      if (found !== null) { selected = found; if (opts.onSelect) opts.onSelect(getSelected()); }
    }
    function getSelected() { return allTerr[selected]; }

    function loop(ts) { if (!running) return; draw(ts || 0); raf = requestAnimationFrame(loop); }
    function start() { if (running) return; running = true; raf = requestAnimationFrame(loop); }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

    /* ---- מחוות: צביטה (pinch), גלגל, גרירה, ונגיעה לבחירה ---- */
    var pts = {}, dragging = false, moved = false, dsx = 0, dsy = 0, dpx = 0, dpy = 0, pD0 = 0, pZ0 = 1, pMid = null;
    function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
    function pkeys() { return Object.keys(pts); }
    canvas.addEventListener('pointerdown', function (e) {
      if (canvas.setPointerCapture) try { canvas.setPointerCapture(e.pointerId); } catch (x) {}
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var n = pkeys().length;
      if (n === 1) { dragging = true; moved = false; dsx = e.clientX; dsy = e.clientY; dpx = panX; dpy = panY; }
      else if (n === 2) {
        dragging = false; var a = pkeys().map(function (k) { return pts[k]; });
        pD0 = dist(a[0], a[1]); pZ0 = zoom; var r = canvas.getBoundingClientRect();
        pMid = { x: (a[0].x + a[1].x) / 2 - r.left, y: (a[0].y + a[1].y) / 2 - r.top };
      }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!(e.pointerId in pts)) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var k = pkeys();
      if (k.length >= 2) { var a = k.map(function (kk) { return pts[kk]; }); setZoomAround(pZ0 * dist(a[0], a[1]) / (pD0 || 1), pMid.x, pMid.y); return; }
      if (dragging) { var dx = e.clientX - dsx, dy = e.clientY - dsy; if (Math.abs(dx) + Math.abs(dy) > 4) moved = true; panX = dpx + dx; panY = dpy + dy; }
    });
    function up(e) {
      if (!(e.pointerId in pts)) return;
      delete pts[e.pointerId]; var k = pkeys();
      if (k.length === 0) { if (dragging && !moved) handleClick(e.clientX, e.clientY); dragging = false; }
      else if (k.length === 1) { dsx = pts[k[0]].x; dsy = pts[k[0]].y; dpx = panX; dpy = panY; dragging = true; moved = true; }
    }
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault(); var r = canvas.getBoundingClientRect();
      setZoomAround(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    return {
      setScreen: function (s) { if (s !== screen) { screen = s; fit = null; resetCamera(); } },
      setHomeCount: function (n) { n = Math.max(6, n | 0); if (n !== lastHomeCount) { buildAll(n); fit = null; } },
      handleClick: handleClick, getSelected: getSelected,
      zoomBy: function (dir) { setZoomAround(zoom * (dir > 0 ? 1.4 : 0.7), vw / 2, vh / 2); },
      resetCamera: resetCamera,
      start: start, stop: stop,
    };
  };
})(window.Territory);
