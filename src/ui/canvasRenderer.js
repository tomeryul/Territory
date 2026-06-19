/* =====================================================================
 * canvasRenderer.js — ציור המפה על <canvas> (כולל אנימציות אזורים)
 * ---------------------------------------------------------------------
 * [UI ספציפי לפלטפורמה / PLATFORM-SPECIFIC]
 * מצייר פריים מתוך ה-"scene" (selectors.scene) — לא מחשב גאומטריה/חוקים,
 * רק מצייר. בהמרה: ל-Flutter -> CustomPainter, ל-RN -> Skia/Canvas.
 *
 * אזורים בזום קרוב מצוירים בפירוט ובאנימציה אמיתית:
 *   ים  — גלים נעים (sine מתגלגל לרוחב, רציף בין המשבצות).
 *   עיר — בניינים תלת-מימדיים שיוצאים מעל המשבצת, עם חלונות שנדלקים.
 *   רכבת— מסילה עם רכבת שנעה לאורך הקו.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  // hash שלם -> [0,1) דטרמיניסטי (לבחירת גובה בניין/חלונות).
  function rnd(seed) {
    var a = seed | 0;
    a = (a ^ 61) ^ (a >>> 16);
    a = a + (a << 3); a = a ^ (a >>> 4);
    a = Math.imul(a, 0x27d4eb2d); a = a ^ (a >>> 15);
    return (a >>> 0) / 4294967296;
  }

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
    var imgCache = {};

    function getImg(url) {
      if (imgCache[url]) return imgCache[url];
      var rec = { img: new Image(), ready: false };
      rec.img.onload = function () { rec.ready = true; requestRedraw(); };
      rec.img.onerror = function () { rec.ready = false; };
      rec.img.src = url;
      imgCache[url] = rec;
      return rec;
    }

    // ----- ציור פריים -----
    function draw(scene, phase, pal, dpr) {
      var W = scene.view.w, H = scene.view.h, scale = scene.scale;

      // התאמת רזולוציית ה-canvas (חדות בנייד) — מצויר ביחידות CSS px.
      var pw = Math.round(W * dpr), ph = Math.round(H * dpr);
      if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // רקע (מחוץ לעולם) + יבשת העולם.
      ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H);
      var wr = scene.worldRect;
      var rx = Math.max(0, wr.x), ry = Math.max(0, wr.y);
      var rw = Math.min(W, wr.x + wr.w) - rx, rh = Math.min(H, wr.y + wr.h) - ry;
      if (rw > 0 && rh > 0) { ctx.fillStyle = pal.land; ctx.fillRect(rx, ry, rw, rh); }

      // קווי-רשת עדינים (רק בזום מספיק).
      if (scene.showGrid) drawGrid(scene, pal);

      // אזורים — מקובצים לפי סוג; עיר מצוירת מהשורות התחתונות למעלה
      // כדי שהבניינים "יצאו" כלפי מעלה (skyline).
      var sea = [], city = [], rail = [];
      scene.zones.forEach(function (z) {
        if (z.type === 'sea') sea.push(z);
        else if (z.type === 'city') city.push(z);
        else if (z.type === 'rail') rail.push(z);
      });

      if (scene.detail) {
        sea.forEach(function (z) { drawSea(z, scale, phase); });
        rail.forEach(function (z) { drawRail(z, scale); });
        city.sort(function (a, b) { return b.y - a.y; });
        city.forEach(function (z) { drawCity(z, scale, phase); });
        drawTrain(scene, phase);
      } else {
        // בזום רחוק — בלוקים שטוחים (קריא ומהיר).
        sea.forEach(function (z) { flat(z, '#155a99'); });
        city.forEach(function (z) { flat(z, '#4a505c'); });
        rail.forEach(function (z) { flat(z, '#6b4f3a'); });
      }

      // משבצות בבעלות (צבע / תמונה).
      scene.tiles.forEach(function (t) { drawOwnedTile(t, scale); });

      // הדגשות בחירה.
      scene.multi.forEach(function (m) { outline(m, pal.accent, Math.max(2, scale * 0.12)); });
      if (scene.selection) outline(scene.selection, '#ffffff', Math.max(2, scale * 0.12));

      // תוויות אזור (אייקון + שם) — פעם אחת לאזור, בזום קרוב.
      if (scene.detail) {
        scene.zones.forEach(function (z) { if (z.anchor) drawLabel(z); });
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
      ctx.strokeStyle = pal.gridLine; ctx.lineWidth = 1;
      ctx.beginPath();
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

    function drawOwnedTile(t, size) {
      if (t.imageUrl) {
        var rec = getImg(t.imageUrl);
        if (rec.ready) {
          ctx.save();
          ctx.beginPath(); ctx.rect(t.sx, t.sy, size, size); ctx.clip();
          ctx.drawImage(rec.img, t.sx, t.sy, size, size);
          ctx.restore();
        } else {
          ctx.fillStyle = t.color || '#888'; ctx.fillRect(t.sx, t.sy, size + 1, size + 1);
        }
      } else {
        ctx.fillStyle = t.color || '#888'; ctx.fillRect(t.sx, t.sy, size + 1, size + 1);
      }
      if (size >= 18) { // קו-הפרדה עדין בזום קרוב
        ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
        ctx.strokeRect(t.sx + 0.5, t.sy + 0.5, size - 1, size - 1);
      }
    }

    /* ---- ים: גלים נעים (רציפים בין משבצות) ---- */
    function drawSea(z, size, phase) {
      ctx.fillStyle = '#125a96'; ctx.fillRect(z.sx, z.sy, size + 1, size + 1);
      ctx.save();
      ctx.beginPath(); ctx.rect(z.sx, z.sy, size + 1, size + 1); ctx.clip();
      var lines = [0.30, 0.55, 0.78];
      ctx.lineWidth = Math.max(1, size * 0.05);
      ctx.strokeStyle = 'rgba(255,255,255,0.32)';
      for (var li = 0; li < lines.length; li++) {
        var frac = lines[li], amp = size * 0.07;
        var midY = z.sy + size * frac;
        ctx.beginPath();
        for (var px = 0; px <= size; px += 2) {
          // משתמשים בקואורדינטת-עולם (z.x) כדי שהגל יהיה רציף בין תאים
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
      // קרקע
      ctx.fillStyle = '#23262e'; ctx.fillRect(z.sx, z.sy, size + 1, size + 1);
      var baseY = z.sy + size;
      var seed = (z.x * 73856093) ^ (z.y * 19349663);
      var n = 2 + Math.floor(rnd(seed) * 2); // 2-3 בניינים
      var slotW = size / n;
      for (var i = 0; i < n; i++) {
        var r1 = rnd(seed + i * 17);
        var bw = slotW * (0.62 + r1 * 0.28);
        var bx = z.sx + i * slotW + (slotW - bw) / 2;
        var bh = size * (0.7 + rnd(seed + i * 31) * 1.0); // עד ~1.7 משבצת — "יוצא" מעל
        var shade = 70 + Math.floor(rnd(seed + i * 7) * 40);
        ctx.fillStyle = 'rgb(' + shade + ',' + (shade + 8) + ',' + (shade + 18) + ')';
        ctx.fillRect(bx, baseY - bh, bw, bh);
        // גג בהיר קצת
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(bx, baseY - bh, bw, Math.max(1, size * 0.05));
        // חלונות
        if (size >= 22) drawWindows(bx, baseY - bh, bw, bh, seed + i * 101, phase);
      }
    }

    function drawWindows(bx, by, bw, bh, seed, phase) {
      var cols = Math.max(1, Math.floor(bw / 6));
      var rows = Math.max(1, Math.floor(bh / 7));
      var gapx = bw / cols, gapy = bh / rows;
      var ww = gapx * 0.55, wh = gapy * 0.55;
      var blink = Math.floor(phase * 0.7); // החלפה איטית של תאורה
      for (var c = 0; c < cols; c++) {
        for (var r = 0; r < rows; r++) {
          var lit = rnd(seed + c * 13 + r * 7 + blink * 3) > 0.62;
          ctx.fillStyle = lit ? 'rgba(255,214,107,0.95)' : 'rgba(180,200,230,0.10)';
          ctx.fillRect(bx + c * gapx + (gapx - ww) / 2, by + r * gapy + (gapy - wh) / 2, ww, wh);
        }
      }
    }

    /* ---- רכבת: קרקע + אדנים + שתי מסילות ---- */
    function drawRail(z, size) {
      ctx.fillStyle = '#6e503a'; ctx.fillRect(z.sx, z.sy, size + 1, size + 1);
      // אדנים (ties) רוחביים
      ctx.fillStyle = 'rgba(35,24,15,0.85)';
      var tieW = Math.max(1, size * 0.16), step = size * 0.33;
      for (var tx = 0; tx < size; tx += step) ctx.fillRect(z.sx + tx, z.sy + size * 0.18, tieW, size * 0.64);
      // שתי מסילות מתכת
      ctx.fillStyle = '#d7dade';
      var railH = Math.max(1, size * 0.07);
      ctx.fillRect(z.sx, z.sy + size * 0.34, size + 1, railH);
      ctx.fillRect(z.sx, z.sy + size * 0.60, size + 1, railH);
    }

    /* ---- רכבת נעה לאורך המסילה (אנימציה גלובלית) ---- */
    function drawTrain(scene, phase) {
      var b = scene.zoneBounds.rail;
      if (!b) return;
      var scale = scene.scale;
      var len = b.maxX - b.minX + 1;
      var span = len + 6;
      var t = (phase * 4) % span;               // מהירות הרכבת
      var headX = b.minX + t - 3;               // ראש הרכבת בקואורדינטת-עולם
      var railY = b.minY;
      function SX(wx) { return scene.sx0 + wx * scale; }
      function SY(wy) { return scene.sy0 + wy * scale; }
      var carW = 1.5, carH = 0.62, gap = 0.25;
      for (var i = 0; i < 3; i++) {
        var cx = headX - i * (carW + gap);
        if (cx + carW < scene.range.minX || cx > scene.range.maxX) continue;
        var px = SX(cx), py = SY(railY + (1 - carH) / 2 + 0.06);
        roundRect(ctx, px, py, carW * scale, carH * scale, Math.min(4, scale * 0.12));
        ctx.fillStyle = i === 0 ? '#c0392b' : '#34495e';
        ctx.fill();
        // חלונות הרכבת
        if (scale >= 14) {
          ctx.fillStyle = 'rgba(255,235,170,0.9)';
          var wn = 3, wpad = carW * scale * 0.12;
          var availW = carW * scale - wpad * 2;
          for (var w = 0; w < wn; w++) {
            ctx.fillRect(px + wpad + w * (availW / wn) + 2, py + carH * scale * 0.22, availW / wn - 4, carH * scale * 0.4);
          }
        }
      }
    }

    function drawLabel(z) {
      var text = z.info.emoji + ' ' + z.info.name;
      ctx.font = '11px system-ui, sans-serif';
      var tw = ctx.measureText(text).width;
      var pad = 5, h = 18;
      var x = z.sx + 2, y = z.sy + 2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      roundRect(ctx, x, y, tw + pad * 2, h, 9); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText(text, x + pad, y + h / 2 + 0.5);
    }

    return { draw: draw };
  };
})(window.Territory);
