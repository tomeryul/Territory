/* =====================================================================
 * components.js — קומפוננטות UI (פונקציות רינדור דמויות-קומפוננטה)
 * ---------------------------------------------------------------------
 * [UI ספציפי לפלטפורמה / PLATFORM-SPECIFIC]
 * סגנון אפליקציית מובייל: סרגל מטבעות + אווטאר/רמה למעלה, ניווט תחתון,
 * מסך מפה עם בקרות צפות וגיליון-עריכה, ומסכי משימות/פרופיל/הגדרות.
 * בלי לוגיקה עסקית — קוראות מ-Selectors/Progression ושולחות actions.
 *
 * ctx = { state, dispatch, S, L, P, cam }
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  var h = T.h;

  var COLOR_PRESETS = [
    T.Tokens.palette.brand, T.Tokens.palette.cyan, T.Tokens.palette.green,
    T.Tokens.palette.purple, T.Tokens.palette.pink, T.Tokens.palette.red,
    T.Tokens.palette.amber, T.Tokens.palette.slate,
  ];

  /* ---- פרימיטיבים משותפים ---- */
  function Button(label, onClick, opts) {
    opts = opts || {};
    return h('button', {
      class: 'btn' + (opts.primary ? ' btn--primary' : '') + (opts.ghost ? ' btn--ghost' : '') +
        (opts.block ? ' btn--block' : '') + (opts.disabled ? ' btn--disabled' : ''),
      onClick: opts.disabled ? null : onClick, disabled: opts.disabled, title: opts.title || null,
    }, label);
  }
  function Bar(p) {
    return h('div', { class: 'bar' }, h('div', { class: 'bar__fill', style: { width: Math.round(Math.max(0, Math.min(1, p)) * 100) + '%' } }));
  }
  function Chip(icon, val, kind) {
    return h('div', { class: 'chip chip--' + kind }, h('span', { class: 'chip__icon' }, icon), h('span', { class: 'chip__val' }, String(val)));
  }
  // פותר את האווטאר הפעיל מתוך ה-state + הקטלוג.
  function resolveAvatar(state) {
    var m = state.meta || {};
    if (m.avatarId === 'custom' && m.customAvatar) return { kind: 'image', src: m.customAvatar };
    var def = T.Avatars.byId[m.avatarId] || T.Avatars.byId.default;
    if (def.frames && def.frames.length > 1) return { kind: 'frames', frames: def.frames };
    if (def.frames && def.frames.length === 1) return { kind: 'image', src: def.frames[0] };
    return { kind: 'emoji', emoji: def.emoji || '🐱' };
  }

  function Avatar(ctx, big) {
    var a = resolveAvatar(ctx.state);
    var cls = 'avatar' + (big ? ' avatar--lg' : '');
    if (a.kind === 'image') {
      return h('div', { class: cls }, h('img', { class: 'avatar__img', src: a.src, alt: 'avatar' }));
    }
    if (a.kind === 'frames') {
      // פריימים נערמים; מנגנון האנימציה (app.js) מציג אחד בכל רגע.
      return h('div', { class: cls + ' avatar--anim' },
        a.frames.map(function (src, i) {
          return h('img', { class: 'avatar__img', src: src, alt: 'avatar', style: { display: i === 0 ? 'block' : 'none' } });
        }));
    }
    return h('div', { class: cls }, a.emoji);
  }

  /* ===================================================================
   * TopBar — מטבעות + אווטאר/רמה/XP (מוצג בכל המסכים)
   * =================================================================== */
  function TopBar(ctx) {
    var st = ctx.state, P = ctx.P;
    var lvl = P.levelInfo(st);
    return h('header', { class: 'topbar' },
      h('div', { class: 'currencies' },
        Chip('💎', P.gems(st), 'gem'),
        Chip('🪙', P.coinsLabel(st), 'coin'),
        Chip('🏆', '#' + P.rank(st), 'rank')
      ),
      h('div', { class: 'profile-strip' },
        Avatar(ctx, false),
        h('div', { class: 'profile-strip__info' },
          h('div', { class: 'profile-strip__row' },
            h('span', { class: 'profile-strip__name' }, 'הטריטוריה שלי'),
            h('span', { class: 'profile-strip__lvl' }, 'רמה ' + lvl.level)
          ),
          Bar(lvl.progress)
        )
      )
    );
  }

  /* ===================================================================
   * BottomNav — ניווט תחתון
   * =================================================================== */
  var NAV = [
    { id: 'profile', icon: '👤', label: 'פרופיל' },
    { id: 'friends', icon: '👥', label: 'חברים' },
    { id: 'map', icon: '🗺️', label: 'מפה' },
    { id: 'chat', icon: '💬', label: 'צ׳אט' },
    { id: 'settings', icon: '⚙️', label: 'הגדרות' },
  ];
  function BottomNav(ctx) {
    var cur = ctx.state.ui.screen;
    return h('nav', { class: 'bottomnav' }, NAV.map(function (it) {
      var active = cur === it.id || (it.id === 'map' && (cur === 'market'));
      return h('button', {
        class: 'navitem' + (active ? ' navitem--active' : ''),
        onClick: function () { ctx.dispatch({ type: 'SET_SCREEN', screen: it.id }); },
      }, h('span', { class: 'navitem__icon' }, it.icon), h('span', { class: 'navitem__label' }, it.label));
    }));
  }

  /* ===================================================================
   * MapOverlay — בקרות צפות + פעולות + גיליון עריכה (מעל ה-canvas)
   * =================================================================== */
  function MapOverlay(ctx) {
    var cam = ctx.cam, d = ctx.dispatch;
    function Round(label, fn, title) {
      return h('button', { class: 'round-btn', onClick: fn, title: title || null }, label);
    }
    return h('div', { class: 'map-overlay' },
      h('div', { class: 'side-controls' },
        Round('＋', function () { cam.zoom(1); }, 'התקרב'),
        Round('－', function () { cam.zoom(-1); }, 'התרחק'),
        Round('🌍', function () { cam.fit(); }, 'כל העולם'),
        Round('🎯', function () { cam.centerMe(); }, 'הטריטוריה שלי')
      ),
      h('div', { class: 'map-actions' },
        Button('✏️ ערוך שטח', function () { d({ type: 'SELECT_TILE', x: T.Config.start.x, y: T.Config.start.y }); }, { primary: true, block: true }),
        h('div', { class: 'map-actions__row' },
          Button('🛒 שוק', function () { d({ type: 'SET_SCREEN', screen: 'market' }); }, { ghost: true }),
          Button('🎯 משימות', function () { d({ type: 'SET_SCREEN', screen: 'missions' }); }, { ghost: true })
        )
      ),
      EditSheet(ctx)
    );
  }

  /* ---- גיליון עריכה (Bottom sheet) — מופיע כשמשבצת נבחרה ---- */
  function EditSheet(ctx) {
    var st = ctx.state, S = ctx.S, L = ctx.L, d = ctx.dispatch;
    var sel = S.selectedTile(st);
    if (!sel) return null;
    var key = L.key(sel.x, sel.y);
    var mine = sel.ownerId === st.currentUserId;

    var title = mine ? 'עריכת שטח' : sel.zone ? (sel.zoneInfo.emoji + ' ' + sel.zoneInfo.name) : 'משבצת פנויה';
    var header = h('div', { class: 'sheet__header' },
      h('button', { class: 'sheet__close', onClick: function () { d({ type: 'CLEAR_SELECTION' }); } }, '✕'),
      h('h3', { class: 'sheet__title' }, title),
      h('span', { class: 'sheet__coord' }, sel.x + ',' + sel.y)
    );

    var body;
    if (mine) {
      var tab = st.ui.editTab;
      function Tab(id, label) {
        return h('button', { class: 'tab' + (tab === id ? ' tab--active' : ''), onClick: function () { d({ type: 'SET_EDIT_TAB', tab: id }); } }, label);
      }
      var content = tab === 'image' ? ImageEditor([key], ctx, sel.imageUrl)
        : tab === 'effects' ? EffectsEditor([key], ctx, sel)
        : ColorEditor([key], ctx);
      body = [
        h('div', { class: 'value-badge' }, 'שווי משוער: 🪙 ' + (sel.value * T.Config.progression.coinPerValue)),
        h('div', { class: 'tabs' }, Tab('color', 'צבע'), Tab('image', 'תמונה'), Tab('effects', 'אפקטים')),
        content,
      ];
    } else if (sel.zone) {
      body = [
        h('div', { class: 'value-badge' }, 'ערך קרקע: 🪙 ' + sel.zoneInfo.value),
        h('p', { class: 'lesson' }, h('strong', {}, '📈 שיעור השקעה: '), sel.zoneInfo.lesson),
        h('p', { class: 'hint' }, 'אזור זה חלק מהנוף — התרחב לידו כדי להעלות את ערך התיק.'),
      ];
    } else {
      body = [h('p', { class: 'hint' }, 'עוד לא שלך. הטריטוריה גדלה אוטומטית, צמודה לשטח שלך, ככל שנשארים במשחק.')];
    }

    return h('div', { class: 'sheet' }, header, h('div', { class: 'sheet__body' }, body));
  }

  function ColorEditor(keys, ctx) {
    var d = ctx.dispatch;
    var swatches = COLOR_PRESETS.map(function (color) {
      return h('button', { class: 'swatch', style: { background: color }, title: color,
        onClick: function () { d({ type: 'SET_TILE_COLOR', keys: keys, color: color }); } });
    });
    var picker = h('input', { type: 'color', class: 'color-input',
      onInput: function (e) { d({ type: 'SET_TILE_COLOR', keys: keys, color: e.target.value }); } });
    return h('div', { class: 'field' }, h('div', { class: 'swatches' }, swatches, picker));
  }

  function ImageEditor(keys, ctx, currentImg) {
    var d = ctx.dispatch;
    var urlValue = currentImg && currentImg.indexOf('data:') !== 0 ? currentImg : '';
    var urlInput = h('input', { type: 'url', class: 'text-input', placeholder: 'כתובת תמונה (URL)', value: urlValue,
      onChange: function (e) { var u = e.target.value.trim(); d({ type: 'SET_TILE_IMAGE', keys: keys, imageUrl: u || null }); } });
    var fileInput = h('input', { type: 'file', accept: 'image/*', class: 'file-input',
      onChange: function (e) { var f = e.target.files && e.target.files[0]; T.readImageFile(f).then(function (u) { if (u) d({ type: 'SET_TILE_IMAGE', keys: keys, imageUrl: u }); }); e.target.value = ''; } });
    var preview = currentImg
      ? h('div', { class: 'img-preview', style: { backgroundImage: 'url("' + currentImg + '")' } })
      : h('div', { class: 'img-preview img-preview--empty' }, 'אין תמונה');
    return h('div', { class: 'field' }, preview, urlInput,
      h('div', { class: 'field__row' },
        h('label', { class: 'btn btn--ghost file-btn' }, 'העלה קובץ', fileInput),
        Button('הסר', function () { d({ type: 'SET_TILE_IMAGE', keys: keys, imageUrl: null }); })));
  }

  function EffectsEditor(keys, ctx, sel) {
    var d = ctx.dispatch;
    var op = sel.opacity == null ? 1 : sel.opacity;
    var slider = h('input', { type: 'range', min: '20', max: '100', value: String(Math.round(op * 100)), class: 'slider',
      onInput: function (e) { d({ type: 'SET_TILE_OPACITY', keys: keys, opacity: (+e.target.value) / 100 }); } });
    return h('div', { class: 'field' },
      h('div', { class: 'field__row', style: { justifyContent: 'space-between' } },
        h('label', { class: 'field__label' }, 'שקיפות'),
        h('span', { class: 'field__label' }, Math.round(op * 100) + '%')),
      slider);
  }

  /* ===================================================================
   * Screen — מסכים שאינם המפה (מרונדרים מחוץ ל-canvas)
   * =================================================================== */
  function Screen(ctx) {
    switch (ctx.state.ui.screen) {
      case 'missions': return MissionsScreen(ctx);
      case 'profile': return ProfileScreen(ctx);
      case 'settings': return SettingsScreen(ctx);
      case 'market': return Stub('שוק', '🛒', 'קנייה ומכירה של שטחים בין שחקנים — בקרוב.');
      case 'friends': return Stub('חברים', '👥', 'רשימת חברים, דירוגים ושיתופים — בקרוב.');
      case 'chat': return Stub('צ׳אט', '💬', 'צ׳אט גלובלי בין שחקנים — בקרוב.');
      default: return Stub('בקרוב', '✨', 'מסך זה עדיין בפיתוח.');
    }
  }
  function ScreenWrap(title, body) {
    return h('div', { class: 'screen' }, h('h2', { class: 'screen__title' }, title), body);
  }
  function Stub(title, emoji, text) {
    return ScreenWrap(title, h('div', { class: 'stub' }, h('div', { class: 'stub__emoji' }, emoji), h('p', { class: 'hint' }, text)));
  }

  function MissionsScreen(ctx) {
    var st = ctx.state, P = ctx.P, d = ctx.dispatch;
    var ms = P.missions(st);
    return ScreenWrap('משימות יומיות',
      h('div', { class: 'mission-list' }, ms.map(function (m) {
        return h('div', { class: 'mission' },
          h('div', { class: 'mission__main' },
            h('div', { class: 'mission__title' }, m.title),
            h('div', { class: 'mission__prog' }, m.current + '/' + m.target),
            Bar(m.current / m.target)
          ),
          h('div', { class: 'mission__reward' },
            h('span', { class: 'reward' }, '+' + m.reward + ' 💎'),
            m.claimed
              ? h('span', { class: 'mission__done' }, '✓')
              : Button('קבל', function () { d({ type: 'CLAIM_MISSION', id: m.id }); }, { primary: m.done, disabled: !m.done })
          )
        );
      }))
    );
  }

  function ProfileScreen(ctx) {
    var st = ctx.state, P = ctx.P, S = ctx.S;
    var lvl = P.levelInfo(st);
    return ScreenWrap('פרופיל',
      h('div', { class: 'profile' },
        h('div', { class: 'profile__head' },
          Avatar(ctx, true),
          h('div', { class: 'profile__head-info' },
            h('div', { class: 'profile__name' }, 'הטריטוריה שלי'),
            h('div', { class: 'profile__lvl' }, 'רמה ' + lvl.level + ' · ' + Math.round(lvl.progress * 100) + '%'),
            Bar(lvl.progress)
          )
        ),
        h('div', { class: 'stat-grid' },
          StatCell('דירוג עולמי', '#' + P.rank(st)),
          StatCell('ערך נטו', '🪙 ' + P.coinsLabel(st)),
          StatCell('שטח', S.territorySize(st) + '')
        ),
        h('div', { class: 'section-title' }, 'בחירת אווטאר'),
        AvatarPicker(ctx),
        h('div', { class: 'section-title' }, 'הישגים'),
        h('div', { class: 'badges' }, P.achievements(st).map(function (a) {
          return h('div', { class: 'badge' + (a.unlocked ? '' : ' badge--locked') },
            h('span', { class: 'badge__emoji' }, a.emoji), h('span', { class: 'badge__title' }, a.title));
        }))
      )
    );
  }

  // בורר אווטארים: כל הדמויות מהקטלוג + אווטאר אישי שהועלה + כפתור העלאה.
  function AvatarPicker(ctx) {
    var st = ctx.state, d = ctx.dispatch;
    var curId = (st.meta && st.meta.avatarId) || 'default';

    function Option(id, inner, selected) {
      return h('button', { class: 'av-option' + (selected ? ' av-option--sel' : ''),
        onClick: function () { d({ type: 'SET_AVATAR', id: id }); } }, inner);
    }

    var opts = T.Avatars.list.map(function (a) {
      var inner = (a.frames && a.frames.length)
        ? h('img', { class: 'av-thumb', src: a.frames[0], alt: a.name })
        : h('span', { class: 'av-emoji' }, a.emoji || '🐱');
      return Option(a.id, inner, curId === a.id);
    });

    // אווטאר אישי שכבר הועלה.
    if (st.meta && st.meta.customAvatar) {
      opts.push(Option('custom', h('img', { class: 'av-thumb', src: st.meta.customAvatar, alt: 'custom' }), curId === 'custom'));
    }

    // כפתור העלאה (דרך שכבת platform — הקטנה אוטומטית).
    var fileInput = h('input', { type: 'file', accept: 'image/*', class: 'file-input',
      onChange: function (e) {
        var f = e.target.files && e.target.files[0];
        T.readImageFile(f).then(function (u) { if (u) d({ type: 'SET_CUSTOM_AVATAR', dataUrl: u }); });
        e.target.value = '';
      } });
    var upload = h('label', { class: 'av-option av-option--upload' }, h('span', { class: 'av-emoji' }, '➕'), fileInput);

    return h('div', { class: 'avatar-picker' }, opts, upload);
  }

  function StatCell(label, value) {
    return h('div', { class: 'stat-cell' }, h('span', { class: 'stat-cell__value' }, value), h('span', { class: 'stat-cell__label' }, label));
  }

  function SettingsScreen(ctx) {
    var st = ctx.state, d = ctx.dispatch, dark = st.ui.theme === 'dark';
    function Row(label, control) { return h('div', { class: 'set-row' }, h('span', {}, label), control); }
    return ScreenWrap('הגדרות',
      h('div', { class: 'settings' },
        Row('מצב לילה 🌙', Button(dark ? 'פעיל' : 'כבוי', function () { d({ type: 'SET_THEME', theme: dark ? 'light' : 'dark' }); }, { primary: dark })),
        Row('איפוס התקדמות', Button('אפס', function () {
          if (typeof window !== 'undefined') { try { window.localStorage.removeItem('territory.save.v5'); } catch (e) {} window.location.reload(); }
        }))
      )
    );
  }

  T.Components = { TopBar: TopBar, BottomNav: BottomNav, MapOverlay: MapOverlay, Screen: Screen };
})(window.Territory);
