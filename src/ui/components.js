/* =====================================================================
 * components.js — קומפוננטות UI (פונקציות רינדור דמויות-קומפוננטה)
 * ---------------------------------------------------------------------
 * [UI ספציפי לפלטפורמה / PLATFORM-SPECIFIC]
 * כל אזור במסך = פונקציה נפרדת שמחזירה עץ אלמנטים (h). אין כאן לוגיקה
 * עסקית: הקומפוננטות קוראות נתונים מ-Selectors ושולחות actions ל-dispatch.
 * כל פונקציה כאן ממופה בעתיד לקומפוננטת React / widget של Flutter.
 *
 * חתימה אחידה: Component(ctx) כאשר ctx = { state, dispatch, S, L, presets }.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  var h = T.h;

  // צבעים מוכנים לבחירה מהירה (UI בלבד — נגזרים מהפלטה).
  var COLOR_PRESETS = [
    T.Tokens.palette.brand,
    T.Tokens.palette.red,
    T.Tokens.palette.green,
    T.Tokens.palette.purple,
    T.Tokens.palette.amber,
    '#00b8d9',
    '#ff6b9d',
    '#94a3b8',
  ];

  /* ---- כפתור גנרי ---------------------------------------------------- */
  function Button(label, onClick, opts) {
    opts = opts || {};
    return h('button', {
      class: 'btn' + (opts.primary ? ' btn--primary' : '') + (opts.disabled ? ' btn--disabled' : ''),
      onClick: opts.disabled ? null : onClick,
      disabled: opts.disabled,
      title: opts.title || null,
    }, label);
  }

  /* ===================================================================
   * TopBar — כותרת, נתוני שחקן, מתג מצב לילה
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
        Stat('קרדיט', String(S.credits(state))),
        Stat('זמן', S.activeTimeLabel(state))
      ),
      Button(isDark ? '☀️ יום' : '🌙 לילה', function () {
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
   * Grid — חלון התצוגה של העולם (מטריצת תאים)
   * =================================================================== */
  function Grid(ctx) {
    var vp = ctx.S.viewportTiles(ctx.state);
    var rows = vp.grid.map(function (row) {
      return h('div', { class: 'grid__row' },
        row.map(function (cell) { return Cell(cell, ctx); })
      );
    });
    return h('div', { class: 'grid' }, rows);
  }

  function Cell(cell, ctx) {
    var d = ctx.dispatch, state = ctx.state;

    var cls = 'cell';
    if (!cell.inside) cls += ' cell--void';
    else if (cell.mine) cls += ' cell--mine';
    else if (cell.tile) cls += ' cell--other';
    else cls += ' cell--empty';
    if (cell.claimable) cls += ' cell--claimable';
    if (cell.selected) cls += ' cell--selected';
    if (cell.inMulti) cls += ' cell--multi';

    var style = {};
    if (cell.ownerColor) style.background = cell.ownerColor;
    if (cell.imageUrl) {
      style.backgroundImage = 'url(' + cell.imageUrl + ')';
      style.backgroundSize = 'cover';
      style.backgroundPosition = 'center';
    }

    // [UI] תרגום קליק לפעולה — מחליטים *איזה* action, לא *מה הוא עושה*.
    function onClick() {
      if (state.ui.multiSelect.on && cell.mine) {
        d({ type: 'TOGGLE_IN_MULTISELECT', x: cell.x, y: cell.y });
      } else {
        d({ type: 'SELECT_TILE', x: cell.x, y: cell.y });
      }
    }

    return h('div', { class: cls, style: style, onClick: cell.inside ? onClick : null },
      cell.forSale ? h('span', { class: 'cell__tag' }, '₪' + cell.price) : null,
      cell.inMulti ? h('span', { class: 'cell__check' }, '✓') : null
    );
  }

  /* ===================================================================
   * Controls — ניווט בעולם + מצב בחירה מרובה
   * =================================================================== */
  function Controls(ctx) {
    var state = ctx.state, d = ctx.dispatch;
    var step = T.Config.viewport.panStep;
    var multiOn = state.ui.multiSelect.on;

    function pan(dx, dy) {
      return function () { d({ type: 'PAN', dx: dx * step, dy: dy * step }); };
    }

    return h('section', { class: 'controls' },
      h('div', { class: 'pad' },
        h('div', { class: 'pad__row' }, Button('▲', pan(0, -1))),
        h('div', { class: 'pad__row' },
          Button('◀', pan(-1, 0)),
          Button('◉', function () { d({ type: 'CENTER_ON_START' }); }, { title: 'חזרה לנקודת ההתחלה' }),
          Button('▶', pan(1, 0))
        ),
        h('div', { class: 'pad__row' }, Button('▼', pan(0, 1)))
      ),
      h('div', { class: 'controls__meta' },
        h('div', { class: 'coords' },
          'מרכז: ', h('strong', {}, state.viewport.centerX + ', ' + state.viewport.centerY)
        ),
        Button(multiOn ? '✓ בחירה מרובה' : 'בחירה מרובה',
          function () { d({ type: 'TOGGLE_MULTISELECT' }); },
          { primary: multiOn, title: 'שליטה בכמה משבצות כמקשה אחת' }
        )
      )
    );
  }

  /* ===================================================================
   * EditorPanel — עריכה/פעולה לפי המשבצת הנבחרת
   * =================================================================== */
  function EditorPanel(ctx) {
    var state = ctx.state, S = ctx.S, L = ctx.L, d = ctx.dispatch;
    var ms = state.ui.multiSelect;

    // מצב בחירה-מרובה פעיל עם בחירות -> עורכים את כולן יחד.
    if (ms.on && ms.keys.length > 0) {
      return Panel('עריכת ' + ms.keys.length + ' משבצות יחד', [
        ColorEditor(ms.keys, ctx),
        ImageEditor(ms.keys, ctx),
      ]);
    }

    var sel = S.selectedTile(state);
    if (!sel) {
      return Panel('עריכת משבצת', [
        h('p', { class: 'hint' }, 'בחר משבצת מהמפה כדי לערוך, לכבוש או לקנות.'),
      ]);
    }

    var key = L.key(sel.x, sel.y);
    var coordLine = h('div', { class: 'panel__coord' }, 'משבצת ', h('strong', {}, sel.x + ', ' + sel.y));

    // (א) משבצת בבעלותי -> עורך צבע/תמונה.
    if (sel.ownerId === state.currentUserId) {
      return Panel('המשבצת שלי', [
        coordLine,
        ColorEditor([key], ctx),
        ImageEditor([key], ctx),
      ]);
    }

    // (ב) משבצת ריקה -> כיבוש (אם צמודה + מספיק קרדיט).
    if (!sel.ownerId) {
      var canClaim = L.canClaim(state, S.credits(state), sel.x, sel.y);
      return Panel('משבצת פנויה', [
        coordLine,
        h('p', { class: 'hint' }, 'עלות כיבוש: ' + T.Config.economy.claimCost + ' קרדיט. חייבת להיות צמודה לטריטוריה שלך.'),
        Button('כבוש משבצת', function () { d({ type: 'CLAIM_TILE', x: sel.x, y: sel.y }); },
          { primary: true, disabled: !canClaim,
            title: canClaim ? '' : 'לא צמודה לטריטוריה שלך או אין מספיק קרדיט' }),
      ]);
    }

    // (ג) משבצת של יריב.
    var owner = state.users[sel.ownerId];
    var ownerName = owner ? owner.name : 'יריב';
    if (sel.forSale) {
      var canBuy = L.canBuy(state, S.credits(state), sel.x, sel.y);
      return Panel('משבצת של ' + ownerName, [
        coordLine,
        h('p', { class: 'hint' }, 'מוצעת למכירה במחיר ' + sel.price + ' קרדיט. חייבת להיות צמודה לטריטוריה שלך.'),
        Button('קנה ב-' + sel.price, function () { d({ type: 'BUY_TILE', x: sel.x, y: sel.y }); },
          { primary: true, disabled: !canBuy,
            title: canBuy ? '' : 'לא צמודה לטריטוריה שלך או אין מספיק קרדיט' }),
      ]);
    }
    return Panel('משבצת של ' + ownerName, [
      coordLine,
      h('p', { class: 'hint' }, 'המשבצת אינה מוצעת למכירה.'),
    ]);
  }

  // עורך צבע: פלטה מהירה + בורר צבע מלא.
  function ColorEditor(keys, ctx) {
    var d = ctx.dispatch;
    var swatches = COLOR_PRESETS.map(function (color) {
      return h('button', {
        class: 'swatch',
        style: { background: color },
        title: color,
        onClick: function () { d({ type: 'SET_TILE_COLOR', keys: keys, color: color }); },
      });
    });
    var picker = h('input', {
      type: 'color', class: 'color-input',
      // onInput: עדכון חי תוך כדי גרירה.
      onInput: function (e) { d({ type: 'SET_TILE_COLOR', keys: keys, color: e.target.value }); },
    });
    return h('div', { class: 'field' },
      h('label', { class: 'field__label' }, 'צבע'),
      h('div', { class: 'swatches' }, swatches, picker)
    );
  }

  // עורך תמונה: כתובת URL או העלאת קובץ (דרך שכבת platform).
  function ImageEditor(keys, ctx) {
    var d = ctx.dispatch;

    var urlInput = h('input', {
      type: 'text', class: 'text-input', placeholder: 'הדבק כתובת תמונה (URL)',
      onChange: function (e) {
        var url = e.target.value.trim();
        d({ type: 'SET_TILE_IMAGE', keys: keys, imageUrl: url || null });
      },
    });

    // [UI/Platform] קריאת קובץ עוברת דרך T.readImageFile (אבסטרקציה).
    var fileInput = h('input', {
      type: 'file', accept: 'image/*', class: 'file-input',
      onChange: function (e) {
        var file = e.target.files && e.target.files[0];
        T.readImageFile(file).then(function (dataUrl) {
          if (dataUrl) d({ type: 'SET_TILE_IMAGE', keys: keys, imageUrl: dataUrl });
        });
      },
    });

    return h('div', { class: 'field' },
      h('label', { class: 'field__label' }, 'תמונה'),
      urlInput,
      h('div', { class: 'field__row' },
        h('label', { class: 'btn btn--ghost file-btn' }, 'העלה קובץ', fileInput),
        Button('הסר תמונה', function () { d({ type: 'SET_TILE_IMAGE', keys: keys, imageUrl: null }); }, { title: 'נקה תמונה' })
      )
    );
  }

  function Panel(title, children) {
    return h('aside', { class: 'panel' },
      h('h2', { class: 'panel__title' }, title),
      h('div', { class: 'panel__body' }, children)
    );
  }

  /* ===================================================================
   * App — הרכבת כל האזורים יחד (תיאור מבני; ראה הערה למטה)
   * -------------------------------------------------------------------
   * הרכבה הצהרתית של כל האזורים. בפועל ui/app.js מרנדר כל אזור לתוך
   * slot נפרד (לאופטימיזציה ולמגן-פוקוס), אבל המבנה זהה — וכך זה ייראה
   * כקומפוננטת שורש אחת ב-React.
   * =================================================================== */
  function App(ctx) {
    return h('div', { class: 'app' },
      TopBar(ctx),
      h('main', { class: 'main' },
        h('section', { class: 'board' },
          h('div', { class: 'grid-area' }, Grid(ctx)),
          Controls(ctx)
        ),
        EditorPanel(ctx)
      )
    );
  }

  // נחשפות גם הקומפוננטות הבודדות — שכבת ה-app מרנדרת כל אזור בנפרד
  // (כדי לא לדרוס שדות קלט בזמן הקלדה; ראה ui/app.js).
  T.Components = {
    App: App,
    TopBar: TopBar,
    Grid: Grid,
    Controls: Controls,
    EditorPanel: EditorPanel,
  };
})(window.Territory);
