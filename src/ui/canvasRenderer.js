/* =====================================================================
 * canvasRenderer.js — ציור המפה על <canvas> (כולל אנימציות אזורים)
 * ---------------------------------------------------------------------
 * [UI ספציפי לפלטפורמה / PLATFORM-SPECIFIC]
 * מצייר פריים מתוך selectors.scene — לא מחשב גאומטריה/חוקים, רק מצייר.
 * צבעי האזורים נלקחים מהקטלוג core/zones.js (T.ZoneTypes).
 *
 * אנימציות אמיתיות בזום קרוב: גלי ים/אגם נעים, בניינים עם חלונות
 * שנדלקים, עשן ממפעל, ורכבת שנעה לאורך כל מסילה.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  function rnd(seed) {
    var a = seed | 0;
    a = (a ^ 61) ^ (a >>> 16); a = a + (a << 3); a = a ^ (a >>> 4);
    a = Math.imul(a, 0x27d4eb2d); a = a ^ (a >>> 15);
    return (a >>> 0) / 4294967296;
  }
  function seedOf(x, y) { return (x * 73856093) ^ (y * 19349663); }

  /* ---- עוזרי צבע (לגרדיאנט/עומק) ---- */
  function parseRGB(c) {
    if (typeof c === 'string' && c[0] === '#') {
      var hx = c.slice(1);
      if (hx.length === 3) hx = hx[0] + hx[0] + hx[1] + hx[1] + hx[2] + hx[2];
      return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
    }
    var m = /rgba?\(([^)]+)\)/.exec(c || '');
    if (m) { var a = m[1].split(',').map(Number); return [a[0] | 0, a[1] | 0, a[2] | 0]; }
    return [108, 92, 231];
  }
  function mix(rgb, t, amt) {
    return [Math.round(rgb[0] + (t[0] - rgb[0]) * amt), Math.round(rgb[1] + (t[1] - rgb[1]) * amt), Math.round(rgb[2] + (t[2] - rgb[2]) * amt)];
  }
  function rgbStr(a) { return 'rgb(' + a[0] + ',' + a[1] + ',' + a[2] + ')'; }
  var WHITE = [255, 255, 255], BLACK = [0, 0, 0], GOLD = '#FFD56A';
  var EXPAND_MS = 420;

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  T.createCanvasRenderer = function (canvas, requestRedraw) {
    var ctx = canvas.getContext('2d');
    var ZT = T.ZoneTypes;
    var imgCache = {};
    var seen = {};       // key -> זמן הופעה (לאנימציית התרחבות)
    var lastView = null; // לזיהוי "מצלמה יציבה" (כדי לא להבהב בזמן פאן)

    function getImg(url) {
      if (imgCache[url]) return imgCache[url];
      var rec = { img: new Image(), ready: false };
      rec.img.onload = function () { rec.ready = true; requestRedraw(); };
      rec.img.onerror = function () { rec.ready = false; };
      rec.img.src = url;
      imgCache[url] = rec;
      return rec;
    }

    function triangle(apexX, apexY, halfW, h) {
      ctx.beginPath();
      ctx.moveTo(apexX, apexY);
      ctx.lineTo(apexX - halfW, apexY + h);
      ctx.lineTo(apexX + halfW, apexY + h);
      ctx.closePath();
    }

    /* ---- ציור פריים ---- */
    function draw(scene, phase, pal, dpr) {
      var W = scene.view.w, H = scene.view.h, scale = scene.scale;

      var pw = Math.round(W * dpr), ph = Math.round(H * dpr);
      if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H);
      drawStars(W, H, phase, pal.star);
      var wr = scene.worldRect;
      var rx = Math.max(0, wr.x), ry = Math.max(0, wr.y);
      var rw = Math.min(W, wr.x + wr.w) - rx, rh = Math.min(H, wr.y + wr.h) - ry;
      if (rw > 0 && rh > 0) { ctx.fillStyle = pal.land; ctx.fillRect(rx, ry, rw, rh); }

      if (scene.showGrid) drawGrid(scene, pal);

      // אזורים: ממוינים לפי y יורד כדי שאלמנטים שיוצאים כלפי מעלה
      // (בניינים/עצים/הרים) ייראו מעל קצה האזור (skyline).
      var zones = scene.zones.slice().sort(function (a, b) { return b.y - a.y; });
      if (scene.detail) {
        zones.forEach(function (z) { drawZoneDetail(z, scale, phase); });
        scene.rails.forEach(function (r) { drawTrain(scene, r, phase); });
        zones.forEach(function (z) { if (z.anchor) drawLabel(z); });
      } else {
        zones.forEach(function (z) { flat(z, (ZT[z.type] || {}).color || '#666'); });
      }

      // אנימציית התרחבות רק כשהמצלמה יציבה (כדי שלא "יקפצו" משבצות בזמן פאן).
      var stable = lastView && lastView.scale === scene.scale &&
        Math.abs(lastView.sx0 - scene.sx0) < 0.6 && Math.abs(lastView.sy0 - scene.sy0) < 0.6;
      var now = Date.now();
      // תאורה רציפה: גרדיאנט אחד במרחב-המסך שמשותף לכל המשבצות, כך
      // שהשכבה נראית אחידה ומחוברת (בלי "קופסאות" פר-משבצת).
      var sheen = ctx.createLinearGradient(0, 0, scene.view.w, scene.view.h);
      sheen.addColorStop(0, 'rgba(255,255,255,0.16)');
      sheen.addColorStop(0.45, 'rgba(255,255,255,0.0)');
      sheen.addColorStop(1, 'rgba(0,0,0,0.24)');
      scene.tiles.forEach(function (t) { drawOwnedTile(t, scale, pal, phase, now, stable, sheen); });
      lastView = { sx0: scene.sx0, sy0: scene.sy0, scale: scene.scale };

      scene.multi.forEach(function (m) { outline(m, pal.accent, Math.max(2, scale * 0.12)); });
      if (scene.selection) {
        // פעימת זוהר על המשבצת הנבחרת.
        var pulse = 0.5 + 0.5 * Math.sin(phase * 4);
        ctx.shadowColor = pal.secondary || pal.accent; ctx.shadowBlur = (10 + scale * 0.6) * pulse;
        outline(scene.selection, '#ffffff', Math.max(2, scale * 0.14));
        ctx.shadowBlur = 0;
      }
    }

    /* ---- פרימיטיבים ---- */
    function flat(z, color) { ctx.fillStyle = color; ctx.fillRect(z.sx, z.sy, z.size + 1, z.size + 1); }
    function outline(rect, color, lw) {
      ctx.strokeStyle = color; ctx.lineWidth = lw;
      ctx.strokeRect(rect.sx + lw / 2, rect.sy + lw / 2, rect.size - lw, rect.size - lw);
    }
    function drawGrid(scene, pal) {
      var rng = scene.range, scale = scene.scale;
      ctx.strokeStyle = pal.gridLine; ctx.lineWidth = 1; ctx.beginPath();
      for (var x = rng.minX; x <= rng.maxX + 1; x++) {
        var px = Math.round(scene.sx0 + x * scale) + 0.5;
        ctx.moveTo(px, Math.max(0, scene.worldRect.y));
        ctx.lineTo(px, Math.min(scene.view.h, scene.worldRect.y + scene.worldRect.h));
      }
      for (var y = rng.minY; y <= rng.maxY + 1; y++) {
        var py = Math.round(scene.sy0 + y * scale) + 0.5;
        ctx.moveTo(Math.max(0, scene.worldRect.x), py);
        ctx.lineTo(Math.min(scene.view.w, scene.worldRect.x + scene.worldRect.w), py);
      }
      ctx.stroke();
    }

    // חלקיקים צפים ברקע — מרחב כהה עם נקודות ניאון שנעות לאט.
    function drawStars(W, H, phase, color) {
      if (!color) return;
      var step = 46, drift = (phase * 8) % step;
      for (var gx = -step; gx < W + step; gx += step) {
        for (var gy = 0; gy < H; gy += step) {
          var s = rnd((gx * 92837 + 1) ^ (gy * 689287 + 7));
          if (s < 0.55) continue;
          var px = gx + s * step + drift, py = gy + rnd(gx + gy * 3) * step;
          var tw = 0.5 + 0.5 * Math.sin(phase * 2 + s * 12);
          ctx.globalAlpha = tw * (s - 0.5) * 1.6;
          ctx.fillStyle = color;
          ctx.fillRect(px % (W + step), py, s > 0.92 ? 2 : 1, s > 0.92 ? 2 : 1);
        }
      }
      ctx.globalAlpha = 1;
    }

    // משבצת בבעלות = קרקע אחת מחוברת: מילוי + תאורה רציפה (sheen משותף),
    // טקסטורה עדינה, ובליטה/מסגרת רק בקצה החיצוני של הטריטוריה — כך
    // משבצות צמודות מתמזגות לגוש אחד, בלי קווי-הפרדה ובלי קופסאות.
    function drawOwnedTile(t, size, pal, phase, now, stable, sheen) {
      var k = t.x + ',' + t.y;
      if (seen[k] === undefined) seen[k] = stable ? now : 0; // 0 = "כבר קיימת"
      var ease = 1;
      if (seen[k]) {
        var p = (now - seen[k]) / EXPAND_MS;
        if (p >= 1) seen[k] = 0; else ease = 1 - Math.pow(1 - Math.max(0, p), 3);
      }

      var inset = (1 - ease) * size * 0.5;
      var x = t.sx + inset, y = t.sy + inset, s = size - inset * 2;
      var baseAlpha = (t.opacity == null ? 1 : t.opacity);
      ctx.globalAlpha = baseAlpha * (0.25 + 0.75 * ease);

      var m = t.mask || 0;
      var openN = !(m & 1), openE = !(m & 4), openS = !(m & 16), openW = !(m & 64);
      var edge = size * 0.16; // עובי הבליטה/הצללה בקצה החיצוני

      /* ---- מילוי בסיס (שטוח כדי שלא ייווצרו תפרים בין משבצות) ---- */
      if (t.imageUrl) {
        var rec = getImg(t.imageUrl);
        if (rec.ready) {
          ctx.save(); ctx.beginPath(); ctx.rect(x, y, s, s); ctx.clip();
          ctx.drawImage(rec.img, x, y, s, s); ctx.restore();
        } else { ctx.fillStyle = t.color || '#6C5CE7'; ctx.fillRect(x, y, s + 1, s + 1); }
      } else {
        ctx.fillStyle = t.color || '#6C5CE7';
        ctx.fillRect(x, y, s + 1, s + 1);
        // תאורה רציפה (אותו גרדיאנט-מסך לכל המשבצות => נראה מחובר).
        ctx.fillStyle = sheen; ctx.fillRect(x, y, s + 1, s + 1);

        // טקסטורה דקה (רעש דטרמיניסטי) — מוסיף חיים בלי תפרים.
        if (size >= 18) {
          var sd = seedOf(t.x, t.y), cells = 4, cw = s / cells;
          for (var ix = 0; ix < cells; ix++) for (var iy = 0; iy < cells; iy++) {
            var r2 = rnd(sd + ix * 31 + iy * 17);
            if (r2 > 0.82) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x + ix * cw, y + iy * cw, cw * 0.5, cw * 0.5); }
            else if (r2 < 0.1) { ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x + ix * cw, y + iy * cw, cw * 0.5, cw * 0.5); }
          }
        }
      }

      /* ---- עומק רק בקצה החיצוני (בליטת-רמה לכל הטריטוריה) ---- */
      if (size >= 12) {
        if (openN) { ctx.fillStyle = 'rgba(255,255,255,0.20)'; ctx.fillRect(x, y, s, edge); }
        if (openW) { ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(x, y, edge, s); }
        if (openS) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(x, y + s - edge, s, edge); }
        if (openE) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x + s - edge, y, edge, s); }
      }

      /* ---- מסגרת זהב רכה ורציפה (בלי קו-נמלים) + זוהר פועם עדין ---- */
      if (size >= 9 && (openN || openE || openS || openW) && ease > 0.6) {
        var glow = 0.7 + 0.3 * Math.sin(phase * 1.3 + (t.x + t.y) * 0.12);
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = Math.max(1.4, size * 0.085);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(255,200,90,0.65)'; ctx.shadowBlur = size * 0.55 * glow;
        var x0 = x, y0 = y, x1 = x + s, y1 = y + s;
        ctx.beginPath();
        if (openN) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); }
        if (openE) { ctx.moveTo(x1, y0); ctx.lineTo(x1, y1); }
        if (openS) { ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); }
        if (openW) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      /* ---- ניצוצות עדינים מדי פעם ---- */
      if (size >= 16) {
        var ssd = seedOf(t.x * 3, t.y * 5), chance = rnd(ssd);
        if (chance > 0.85) {
          var tw = Math.sin(phase * 2.4 + chance * 30);
          if (tw > 0.4) {
            var px = x + (0.25 + rnd(ssd + 1) * 0.5) * s, py = y + (0.25 + rnd(ssd + 2) * 0.5) * s;
            var r = Math.max(1, s * 0.05) * tw;
            ctx.fillStyle = 'rgba(255,255,255,' + (0.8 * tw) + ')';
            ctx.shadowColor = pal.secondary || '#00D4FF'; ctx.shadowBlur = 7 * tw;
            ctx.fillRect(px - r, py - r * 0.22, r * 2, r * 0.44);
            ctx.fillRect(px - r * 0.22, py - r, r * 0.44, r * 2);
            ctx.shadowBlur = 0;
          }
        }
      }

      if (ease < 1) { // הבזק רך בעת התרחבות
        ctx.globalAlpha = baseAlpha * (1 - ease) * 0.6;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, s + 1, s + 1);
      }
      ctx.globalAlpha = 1;
    }

    /* ---- מפת ציור לפי סוג אזור ---- */
    function drawZoneDetail(z, size, phase) {
      switch (z.type) {
        case 'sea': return drawWater(z, size, phase, '#125a96', 0.32);
        case 'lake': return drawWater(z, size, phase, '#1f7a8c', 0.28);
        case 'city': return drawCity(z, size, phase);
        case 'factory': return drawFactory(z, size, phase);
        case 'forest': return drawForest(z, size);
        case 'mountain': return drawMountain(z, size);
        case 'farm': return drawFarm(z, size);
        case 'park': return drawPark(z, size);
        case 'desert': return drawDesert(z, size);
        case 'rail': return drawRail(z, size);
        default: return flat(z, (ZT[z.type] || {}).color || '#666');
      }
    }

    /* ---- מים: גלים נעים (רציפים בין משבצות) ---- */
    function drawWater(z, size, phase, base, alpha) {
      ctx.fillStyle = base; ctx.fillRect(z.sx, z.sy, size + 1, size + 1);
      ctx.save();
      ctx.beginPath(); ctx.rect(z.sx, z.sy, size + 1, size + 1); ctx.clip();
      var lines = [0.3, 0.55, 0.78];
      ctx.lineWidth = Math.max(1, size * 0.05);
      ctx.strokeStyle = 'rgba(255,255,255,' + alpha + ')';
      for (var li = 0; li < lines.length; li++) {
        var frac = lines[li], amp = size * 0.07, midY = z.sy + size * frac;
        ctx.beginPath();
        for (var px = 0; px <= size; px += 2) {
          var wx = z.x + px / size;
          var yy = midY + amp * Math.sin(wx * 4 + phase * 1.8 + frac * 6);
          if (px === 0) ctx.moveTo(z.sx + px, yy); else ctx.lineTo(z.sx + px, yy);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    /* ---- עיר: בניינים שיוצאים מעל המשבצת + חלונות שנדלקים ---- */
    function drawCity(z, size, phase) {
      ctx.fillStyle = '#23262e'; ctx.fillRect(z.sx, z.sy, size + 1, size + 1);
      var baseY = z.sy + size, seed = seedOf(z.x, z.y);
      var n = 2 + Math.floor(rnd(seed) * 2), slotW = size / n;
      for (var i = 0; i < n; i++) {
        var bw = slotW * (0.62 + rnd(seed + i * 17) * 0.28);
        var bx = z.sx + i * slotW + (slotW - bw) / 2;
        var bh = size * (0.7 + rnd(seed + i * 31) * 1.0);
        var sh = 70 + Math.floor(rnd(seed + i * 7) * 40);
        ctx.fillStyle = 'rgb(' + sh + ',' + (sh + 8) + ',' + (sh + 18) + ')';
        ctx.fillRect(bx, baseY - bh, bw, bh);
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(bx, baseY - bh, bw, Math.max(1, size * 0.05));
        if (size >= 22) drawWindows(bx, baseY - bh, bw, bh, seed + i * 101, phase);
      }
    }
    function drawWindows(bx, by, bw, bh, seed, phase) {
      var cols = Math.max(1, Math.floor(bw / 6)), rows = Math.max(1, Math.floor(bh / 7));
      var gx = bw / cols, gy = bh / rows, ww = gx * 0.55, wh = gy * 0.55, blink = Math.floor(phase * 0.7);
      for (var c = 0; c < cols; c++) for (var r = 0; r < rows; r++) {
        var lit = rnd(seed + c * 13 + r * 7 + blink * 3) > 0.62;
        ctx.fillStyle = lit ? 'rgba(255,214,107,0.95)' : 'rgba(180,200,230,0.10)';
        ctx.fillRect(bx + c * gx + (gx - ww) / 2, by + r * gy + (gy - wh) / 2, ww, wh);
      }
    }

    /* ---- מפעל: מבנה + ארובה + עשן עולה (אנימציה) ---- */
    function drawFactory(z, size, phase) {
      ctx.fillStyle = '#5a4636'; ctx.fillRect(z.sx, z.sy, size + 1, size + 1);
      var baseY = z.sy + size;
      ctx.fillStyle = '#71777f';
      ctx.fillRect(z.sx + size * 0.12, baseY - size * 0.55, size * 0.6, size * 0.55);
      var chx = z.sx + size * 0.74, chTop = baseY - size * 0.85;
      ctx.fillStyle = '#3c4148'; ctx.fillRect(chx, chTop, size * 0.13, size * 0.85);
      // עשן
      for (var i = 0; i < 3; i++) {
        var prog = ((phase * 0.6 + i * 0.33) % 1);
        var sy2 = chTop - prog * size * 0.9;
        ctx.fillStyle = 'rgba(200,200,205,' + (0.35 * (1 - prog)) + ')';
        ctx.beginPath(); ctx.arc(chx + size * 0.06, sy2, size * (0.07 + prog * 0.12), 0, 7); ctx.fill();
      }
    }

    /* ---- יער: עצים שיוצאים מעל המשבצת ---- */
    function drawForest(z, size) {
      ctx.fillStyle = '#1f5a36'; ctx.fillRect(z.sx, z.sy, size + 1, size + 1);
      var seed = seedOf(z.x, z.y), n = 2 + Math.floor(rnd(seed) * 2);
      for (var i = 0; i < n; i++) {
        var tx = z.sx + (0.22 + rnd(seed + i * 7) * 0.56) * size;
        var th = size * (0.7 + rnd(seed + i * 13) * 0.6), base = z.sy + size * 0.96;
        ctx.fillStyle = '#5b3b22'; ctx.fillRect(tx - size * 0.03, base - th * 0.22, size * 0.06, th * 0.22);
        ctx.fillStyle = '#2e7d46'; triangle(tx, base - th, size * 0.26, th * 0.82); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; triangle(tx, base - th, size * 0.26, th * 0.3); ctx.fill();
      }
    }

    /* ---- הרים: פסגות עם כובע שלג ---- */
    function drawMountain(z, size) {
      ctx.fillStyle = '#5a6270'; ctx.fillRect(z.sx, z.sy, size + 1, size + 1);
      var seed = seedOf(z.x, z.y), base = z.sy + size;
      var apexX = z.sx + size * (0.35 + rnd(seed) * 0.3), h = size * (0.9 + rnd(seed + 5) * 0.5);
      ctx.fillStyle = '#6e7682'; triangle(apexX, base - h, size * 0.5, h); ctx.fill();
      ctx.fillStyle = '#eef2f6'; triangle(apexX, base - h, size * 0.18, h * 0.28); ctx.fill();
    }

    /* ---- חווה: שורות גידולים ---- */
    function drawFarm(z, size) {
      ctx.fillStyle = '#b9904a'; ctx.fillRect(z.sx, z.sy, size + 1, size + 1);
      var rows = 5;
      for (var r = 0; r < rows; r++) {
        ctx.fillStyle = r % 2 ? '#8bbb4e' : '#a6864a';
        ctx.fillRect(z.sx, z.sy + (r / rows) * size, size + 1, (size / rows) * 0.6);
      }
    }

    /* ---- פארק: דשא + עצים קטנים ---- */
    function drawPark(z, size) {
      ctx.fillStyle = '#3f8f5a'; ctx.fillRect(z.sx, z.sy, size + 1, size + 1);
      var seed = seedOf(z.x, z.y);
      for (var i = 0; i < 3; i++) {
        var tx = z.sx + (0.2 + rnd(seed + i * 9) * 0.6) * size;
        var ty = z.sy + (0.2 + rnd(seed + i * 5) * 0.6) * size;
        ctx.fillStyle = '#2e7d46'; ctx.beginPath(); ctx.arc(tx, ty, size * 0.12, 0, 7); ctx.fill();
      }
    }

    /* ---- מדבר: דיונות ---- */
    function drawDesert(z, size) {
      ctx.fillStyle = '#d8b878'; ctx.fillRect(z.sx, z.sy, size + 1, size + 1);
      ctx.strokeStyle = 'rgba(150,120,70,0.5)'; ctx.lineWidth = Math.max(1, size * 0.04);
      for (var k = 0; k < 2; k++) {
        var midY = z.sy + size * (0.4 + k * 0.3);
        ctx.beginPath();
        for (var px = 0; px <= size; px += 3) {
          var yy = midY + size * 0.06 * Math.sin(px / size * 6 + k);
          if (px === 0) ctx.moveTo(z.sx + px, yy); else ctx.lineTo(z.sx + px, yy);
        }
        ctx.stroke();
      }
    }

    /* ---- רכבת: קרקע + אדנים + שתי מסילות ---- */
    function drawRail(z, size) {
      ctx.fillStyle = '#6e503a'; ctx.fillRect(z.sx, z.sy, size + 1, size + 1);
      ctx.fillStyle = 'rgba(35,24,15,0.85)';
      var tieW = Math.max(1, size * 0.16), step = size * 0.33;
      for (var tx = 0; tx < size; tx += step) ctx.fillRect(z.sx + tx, z.sy + size * 0.18, tieW, size * 0.64);
      ctx.fillStyle = '#d7dade';
      var railH = Math.max(1, size * 0.07);
      ctx.fillRect(z.sx, z.sy + size * 0.34, size + 1, railH);
      ctx.fillRect(z.sx, z.sy + size * 0.6, size + 1, railH);
    }

    /* ---- רכבת נעה לאורך מסילה (לכל אזור-רכבת נראה) ---- */
    function drawTrain(scene, rail, phase) {
      var scale = scene.scale;
      function SX(wx) { return scene.sx0 + wx * scale; }
      function SY(wy) { return scene.sy0 + wy * scale; }
      var horiz = rail.horiz !== false;
      var len = (horiz ? rail.maxX - rail.minX : rail.maxY - rail.minY) + 1;
      if (len < 2) return;
      var span = len + 5, t = (phase * 3) % span, head = t - 2.5;
      var carW = 1.5, carH = 0.6, gap = 0.22;
      for (var i = 0; i < 3; i++) {
        var along = head - i * (carW + gap);
        var wx, wy;
        if (horiz) { wx = rail.minX + along; wy = rail.minY; if (along + carW < 0 || along > len) continue; }
        else { wx = rail.minX; wy = rail.minY + along; if (along + carW < 0 || along > len) continue; }
        var px = SX(wx) + (horiz ? 0 : (1 - carH) / 2 * scale);
        var py = SY(wy) + (horiz ? (1 - carH) / 2 * scale : 0);
        var w = (horiz ? carW : carH) * scale, hh = (horiz ? carH : carW) * scale;
        roundRect(ctx, px, py, w, hh, Math.min(4, scale * 0.12));
        ctx.fillStyle = i === 0 ? '#c0392b' : '#34495e'; ctx.fill();
      }
    }

    function drawLabel(z) {
      var text = z.info.emoji + ' ' + z.info.name;
      ctx.font = '11px system-ui, sans-serif';
      var tw = ctx.measureText(text).width, pad = 5, h = 18;
      var x = z.sx + 2, y = z.sy + 2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; roundRect(ctx, x, y, tw + pad * 2, h, 9); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText(text, x + pad, y + h / 2 + 0.5);
    }

    return { draw: draw };
  };
})(window.Territory);
