/* =====================================================================
 * components.js — קומפוננטות UI (פונקציות רינדור דמויות-קומפוננטה)
 * ---------------------------------------------------------------------
 * [UI ספציפי לפלטפורמה / PLATFORM-SPECIFIC]
 * כל אזור-מסך = פונקציה שמחזירה עץ אלמנטים (h). בלי לוגיקה עסקית:
 * קוראות נתונים מ-Selectors ושולחות actions / פקודות-מצלמה.
 * המפה עצמה היא <canvas> שמנוהל ב-app.js (ציור אימפרטיבי), לא כאן.
 *
 * ctx = { state, dispatch, S, L, cam } כאשר cam = פקודות מצלמה מ-app.js.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  var h = T.h;

  var COLOR_PRESETS = [
    T.Tokens.palette.brand, T.Tokens.palette.red, T.Tokens.palette.green,
    T.Tokens.palette.purple, T.Tokens.palette.amber, '#00b8d9', '#ff6b9d', '#94a3b8',
  ];

  function Button(label, onClick, opts) {
    opts = opts || {};
    return h('button', {
      class: 'btn' + (opts.primary ? ' btn--primary' : '') + (opts.disabled ? ' btn--disabled' : ''),
      onClick: opts.disabled ? null : onClick,
      disabled: opts.disabled, title: opts.title || null,
    }, label);
  }

  /* ===================================================================
   * TopBar — נתוני שחקן + מתג מצב לילה
   * =================================================================== */
  function TopBar(ctx) {
    var state = ctx.state, S = ctx.S, d = ctx.dispatch;
    var isDark = state.ui.theme === 'dark';
    return h('header', { class: 'topbar' },
      h('div', { class: 'topbar__brand' },
        h('span', { class: 'topbar__logo' }, '▦'),
        h('h1', { class: 'topbar__title' }, 'Territory')
      ),
      h('div', { class: 'stats' },
        Stat('שטח', String(S.territorySize(state))),
        Stat('זמן', S.activeTimeLabel(state)),
        Stat('משבצת הבאה', S.nextTileLabel(state))
      ),
      Button(isDark ? '☀️' : '🌙', function () {
        d({ type: 'SET_THEME', theme: isDark ? 'light' : 'dark' });
      }, { title: 'מצב לילה לשהייה ארוכה' })
    );
  }

  function Stat(label, value) {
    return h('div', { class: 'stat' },
      h('span', { class: 'stat__value' }, value),
      h('span', { class: 'stat__label' }, label)
    );
  }

  /* ===================================================================
   * Controls — זום / מבט / בחירה מרובה
   * (פקודות המצלמה ב-app.js כי הן זקוקות לגודל ה-canvas)
   * =================================================================== */
  function Controls(ctx) {
    var state = ctx.state, d = ctx.dispatch, cam = ctx.cam;
    var multiOn = state.ui.multiSelect.on;
    return h('section', { class: 'controls' },
      h('div', { class: 'controls__group' },
        Button('−', function () { cam.zoom(-1); }, { title: 'התרחק' }),
        h('span', { class: 'zoom-label' }, Math.round(state.camera.scale) + 'px'),
        Button('+', function () { cam.zoom(1); }, { title: 'התקרב' })
      ),
      h('div', { class: 'controls__group' },
        Button('🌍 כל העולם', function () { cam.fit(); }, { title: 'לראות את כל המפה' }),
        Button('🎯 שלי', function () { cam.centerMe(); }, { title: 'חזרה לטריטוריה שלי' })
      ),
      Button(multiOn ? '✓ בחירה מרובה' : 'בחירה מרובה',
        function () { d({ type: 'TOGGLE_MULTISELECT' }); },
        { primary: multiOn, title: 'עריכת כמה משבצות יחד' })
    );
  }

  /* ===================================================================
   * EditorPanel — עריכה/מידע לפי המשבצת הנבחרת
   * =================================================================== */
  function EditorPanel(ctx) {
    var state = ctx.state, S = ctx.S, L = ctx.L;
    var ms = state.ui.multiSelect;

    if (ms.on && ms.keys.length > 0) {
      return Panel('עריכת ' + ms.keys.length + ' משבצות יחד', [
        ColorEditor(ms.keys, ctx),
        ImageEditor(ms.keys, ctx, null),
      ]);
    }

    var sel = S.selectedTile(state);
    if (!sel) {
      return Panel('הטריטוריה שלך', [
        h('p', { class: 'hint' }, 'המשבצות מתווספות אוטומטית ככל שנשארים באפליקציה. גוררים להזזת המפה, צובטים/גלגל לזום. נגיעה במשבצת שלך — לעריכה.'),
      ]);
    }

    var key = L.key(sel.x, sel.y);
    var coordLine = h('div', { class: 'panel__coord' }, 'משבצת ', h('strong', {}, sel.x + ', ' + sel.y));

    if (sel.ownerId === state.currentUserId) {
      return Panel('המשבצת שלי', [coordLine, ColorEditor([key], ctx), ImageEditor([key], ctx, sel.imageUrl)]);
    }
    if (sel.zone) {
      return Panel('אזור: ' + sel.zoneInfo.name + ' ' + sel.zoneInfo.emoji, [
        coordLine,
        h('p', { class: 'hint' }, 'אזור מיוחד בנוף — לא ניתן לכבוש אותו. הטריטוריה גדלה סביבו.'),
      ]);
    }
    return Panel('משבצת פנויה', [
      coordLine,
      h('p', { class: 'hint' }, 'עוד לא שלך. המשבצות מתווספות אוטומטית, צמודות לטריטוריה, ככל שצוברים זמן.'),
    ]);
  }

  function ColorEditor(keys, ctx) {
    var d = ctx.dispatch;
    var swatches = COLOR_PRESETS.map(function (color) {
      return h('button', {
        class: 'swatch', style: { background: color }, title: color,
        onClick: function () { d({ type: 'SET_TILE_COLOR', keys: keys, color: color }); },
      });
    });
    var picker = h('input', {
      type: 'color', class: 'color-input',
      onInput: function (e) { d({ type: 'SET_TILE_COLOR', keys: keys, color: e.target.value }); },
    });
    return h('div', { class: 'field' },
      h('label', { class: 'field__label' }, 'צבע'),
      h('div', { class: 'swatches' }, swatches, picker)
    );
  }

  // עורך תמונה: תצוגה מקדימה + URL + העלאת קובץ (דרך שכבת platform).
  function ImageEditor(keys, ctx, currentImg) {
    var d = ctx.dispatch;
    var urlValue = currentImg && currentImg.indexOf('data:') !== 0 ? currentImg : '';

    var urlInput = h('input', {
      type: 'url', class: 'text-input', placeholder: 'הדבק כתובת תמונה (URL)', value: urlValue,
      onChange: function (e) {
        var url = e.target.value.trim();
        d({ type: 'SET_TILE_IMAGE', keys: keys, imageUrl: url || null });
      },
    });
    var fileInput = h('input', {
      type: 'file', accept: 'image/*', class: 'file-input',
      onChange: function (e) {
        var file = e.target.files && e.target.files[0];
        T.readImageFile(file).then(function (dataUrl) {
          if (dataUrl) d({ type: 'SET_TILE_IMAGE', keys: keys, imageUrl: dataUrl });
        });
        e.target.value = '';
      },
    });
    var preview = currentImg
      ? h('div', { class: 'img-preview', style: { backgroundImage: 'url("' + currentImg + '")' } })
      : h('div', { class: 'img-preview img-preview--empty' }, 'אין תמונה');

    return h('div', { class: 'field' },
      h('label', { class: 'field__label' }, 'תמונה'),
      preview, urlInput,
      h('div', { class: 'field__row' },
        h('label', { class: 'btn btn--ghost file-btn' }, 'העלה קובץ', fileInput),
        Button('הסר תמונה', function () { d({ type: 'SET_TILE_IMAGE', keys: keys, imageUrl: null }); })
      )
    );
  }

  function Panel(title, children) {
    return h('aside', { class: 'panel' },
      h('h2', { class: 'panel__title' }, title),
      h('div', { class: 'panel__body' }, children)
    );
  }

  T.Components = { TopBar: TopBar, Controls: Controls, EditorPanel: EditorPanel };
})(window.Territory);
