/* =====================================================================
 * components.js — קומפוננטות UI (פרימיום, גלאסמורפיזם, ניאון)
 * ---------------------------------------------------------------------
 * [UI ספציפי לפלטפורמה / PLATFORM-SPECIFIC]
 * דשבורד עליון + dock צף תחתון + מסכים (בית/מפה/שוק/משימות/פרופיל).
 * בלי לוגיקה עסקית: קוראות מ-Selectors/Progression ושולחות actions.
 * ctx = { state, dispatch, S, L, P, cam }
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  var h = T.h;
  var PAL = T.Tokens.palette;
  var COLOR_PRESETS = [PAL.brand, PAL.cyan, PAL.green, PAL.purple, PAL.pink, PAL.red, PAL.amber, PAL.slate];

  /* ---- פרימיטיבים ---- */
  function Button(label, onClick, opts) {
    opts = opts || {};
    return h('button', {
      class: 'btn' + (opts.primary ? ' btn--primary' : '') + (opts.ghost ? ' btn--ghost' : '') +
        (opts.block ? ' btn--block' : '') + (opts.disabled ? ' btn--disabled' : ''),
      onClick: opts.disabled ? null : onClick, disabled: opts.disabled, title: opts.title || null,
    }, label);
  }
  function Bar(p, cls) {
    return h('div', { class: 'bar' + (cls ? ' ' + cls : '') },
      h('div', { class: 'bar__fill', style: { width: Math.round(Math.max(0, Math.min(1, p)) * 100) + '%' } }));
  }
  function Avatar(ctx, size) {
    var a = resolveAvatar(ctx.state), cls = 'avatar avatar--' + (size || 'md');
    if (a.kind === 'image') return h('div', { class: cls }, h('img', { class: 'avatar__img', src: a.src, alt: 'avatar' }));
    if (a.kind === 'frames') return h('div', { class: cls + ' avatar--anim' },
      a.frames.map(function (src, i) { return h('img', { class: 'avatar__img', src: src, alt: 'a', style: { display: i === 0 ? 'block' : 'none' } }); }));
    return h('div', { class: cls }, a.emoji);
  }
  function resolveAvatar(state) {
    var m = state.meta || {};
    if (m.avatarId === 'custom' && m.customAvatar) return { kind: 'image', src: m.customAvatar };
    var def = T.Avatars.byId[m.avatarId] || T.Avatars.byId.wizard || T.Avatars.list[0];
    if (def.frames && def.frames.length > 1) return { kind: 'frames', frames: def.frames };
    if (def.frames && def.frames.length === 1) return { kind: 'image', src: def.frames[0] };
    return { kind: 'emoji', emoji: def.emoji || '🐱' };
  }

  /* ===================================================================
   * TopBar — דשבורד שחקן (אווטאר + שם + רמה + כרטיסי-סטטיסטיקה זוהרים)
   * =================================================================== */
  function TopBar(ctx) {
    var st = ctx.state, P = ctx.P, S = ctx.S, d = ctx.dispatch;
    var lvl = P.levelInfo(st), night = st.ui.theme === 'night';
    return h('header', { class: 'topbar glass' },
      h('div', { class: 'topbar__main' },
        h('div', { class: 'player' },
          h('div', { class: 'player__av' }, Avatar(ctx, 'md'), h('span', { class: 'player__ring' })),
          h('div', { class: 'player__info' },
            h('div', { class: 'player__row' },
              h('span', { class: 'player__name' }, 'Commander'),
              h('span', { class: 'lvl-badge' }, 'LVL ' + lvl.level)
            ),
            Bar(lvl.progress, 'bar--xp')
          )
        ),
        h('div', { class: 'topbar__actions' },
          h('button', { class: 'icon-btn', title: 'מצב לילה', onClick: function () { d({ type: 'SET_THEME', theme: night ? 'dark' : 'night' }); } }, night ? '🌙' : '🌑'),
          h('button', { class: 'icon-btn', title: 'הגדרות', onClick: function () { d({ type: 'SET_SCREEN', screen: 'settings' }); } }, '⚙️')
        )
      ),
      h('div', { class: 'stat-cards' },
        StatCard('🪙', P.coinsLabel(st), 'הון', 'coin'),
        StatCard('⬡', S.territorySize(st), 'שטח', 'terr'),
        StatCard('🏆', '#' + P.rank(st), 'דירוג', 'rank')
      )
    );
  }
  function StatCard(icon, value, label, kind) {
    return h('div', { class: 'stat-card stat-card--' + kind },
      h('span', { class: 'stat-card__icon' }, icon),
      h('div', { class: 'stat-card__body' },
        h('span', { class: 'stat-card__value' }, String(value)),
        h('span', { class: 'stat-card__label' }, label)
      )
    );
  }

  /* ===================================================================
   * BottomNav — dock צף
   * =================================================================== */
  var NAV = [
    { id: 'home', icon: '🏠', label: 'בית' },
    { id: 'market', icon: '🛒', label: 'שוק' },
    { id: 'map', icon: '🗺️', label: 'מפה' },
    { id: 'missions', icon: '🎯', label: 'משימות' },
    { id: 'profile', icon: '👤', label: 'פרופיל' },
  ];
  function BottomNav(ctx) {
    var cur = ctx.state.ui.screen;
    return h('nav', { class: 'dock glass' }, NAV.map(function (it) {
      var active = cur === it.id || (it.id === 'profile' && cur === 'settings');
      return h('button', { class: 'dock__item' + (active ? ' dock__item--active' : ''),
        onClick: function () { ctx.dispatch({ type: 'SET_SCREEN', screen: it.id }); } },
        h('span', { class: 'dock__icon' }, it.icon),
        h('span', { class: 'dock__label' }, it.label));
    }));
  }

  /* ===================================================================
   * MapOverlay — בקרות צפות + גיליון עריכה
   * =================================================================== */
  function MapOverlay(ctx) {
    var cam = ctx.cam;
    function Round(label, fn, title) { return h('button', { class: 'round-btn glass', onClick: fn, title: title || null }, label); }
    return h('div', { class: 'map-overlay' },
      // מרקר השחקן — ממוקם ע"י app.js במרכז הטריטוריה (מוסתר עד אז).
      h('div', { class: 'player-marker', style: { display: 'none' } },
        h('div', { class: 'player-marker__ring' }),
        h('div', { class: 'player-marker__frame' }, Avatar(ctx, 'mk'))
      ),
      h('div', { class: 'side-controls' },
        Round('＋', function () { cam.zoom(1); }, 'התקרב'),
        Round('－', function () { cam.zoom(-1); }, 'התרחק'),
        Round('🎯', function () { cam.centerMe(); }, 'הבסיס שלי'),
        Round('🌐', function () { cam.fit(); }, 'מיני-מפה'),
        Round('🔍', function () { cam.centerMe(); }, 'חיפוש')
      ),
      EditSheet(ctx)
    );
  }

  function EditSheet(ctx) {
    var st = ctx.state, S = ctx.S, L = ctx.L, d = ctx.dispatch;
    var sel = S.selectedTile(st);
    if (!sel) return null;
    var key = L.key(sel.x, sel.y), mine = sel.ownerId === st.currentUserId;
    var title = mine ? 'עריכת שטח' : sel.zone ? (sel.zoneInfo.emoji + ' ' + sel.zoneInfo.name) : 'משבצת פנויה';
    var header = h('div', { class: 'sheet__header' },
      h('button', { class: 'sheet__close', onClick: function () { d({ type: 'CLEAR_SELECTION' }); } }, '✕'),
      h('h3', { class: 'sheet__title' }, title),
      h('span', { class: 'sheet__coord' }, sel.x + ',' + sel.y));
    var body;
    if (mine) {
      var tab = st.ui.editTab;
      function Tab(id, label) { return h('button', { class: 'tab' + (tab === id ? ' tab--active' : ''), onClick: function () { d({ type: 'SET_EDIT_TAB', tab: id }); } }, label); }
      var content = tab === 'image' ? ImageEditor([key], ctx, sel.imageUrl) : tab === 'effects' ? EffectsEditor([key], ctx, sel) : ColorEditor([key], ctx);
      body = [
        h('div', { class: 'value-badge' }, 'שווי: 🪙 ' + (sel.value * T.Config.progression.coinPerValue)),
        h('div', { class: 'tabs' }, Tab('color', 'צבע'), Tab('image', 'תמונה'), Tab('effects', 'אפקטים')),
        content,
      ];
    } else if (sel.zone) {
      body = [
        h('div', { class: 'value-badge' }, 'ערך קרקע: 🪙 ' + sel.zoneInfo.value),
        h('p', { class: 'lesson' }, h('strong', {}, '📈 שיעור השקעה: '), sel.zoneInfo.lesson),
        h('p', { class: 'hint' }, 'התרחב ליד האזור כדי להעלות את שווי הממלכה.'),
      ];
    } else {
      body = [h('p', { class: 'hint' }, 'עוד לא שלך. הטריטוריה גדלה אוטומטית, צמודה לשטח שלך, ככל שנשארים במשחק.')];
    }
    return h('div', { class: 'sheet glass' }, header, h('div', { class: 'sheet__body' }, body));
  }

  function ColorEditor(keys, ctx) {
    var d = ctx.dispatch;
    var swatches = COLOR_PRESETS.map(function (color) {
      return h('button', { class: 'swatch', style: { background: color }, title: color, onClick: function () { d({ type: 'SET_TILE_COLOR', keys: keys, color: color }); } });
    });
    var picker = h('input', { type: 'color', class: 'color-input', onInput: function (e) { d({ type: 'SET_TILE_COLOR', keys: keys, color: e.target.value }); } });
    return h('div', { class: 'field' }, h('div', { class: 'swatches' }, swatches, picker));
  }
  function ImageEditor(keys, ctx, currentImg) {
    var d = ctx.dispatch;
    var urlValue = currentImg && currentImg.indexOf('data:') !== 0 ? currentImg : '';
    var urlInput = h('input', { type: 'url', class: 'text-input', placeholder: 'כתובת תמונה (URL)', value: urlValue,
      onChange: function (e) { var u = e.target.value.trim(); d({ type: 'SET_TILE_IMAGE', keys: keys, imageUrl: u || null }); } });
    var fileInput = h('input', { type: 'file', accept: 'image/*', class: 'file-input',
      onChange: function (e) { var f = e.target.files && e.target.files[0]; T.readImageFile(f).then(function (u) { if (u) d({ type: 'SET_TILE_IMAGE', keys: keys, imageUrl: u }); }); e.target.value = ''; } });
    var preview = currentImg ? h('div', { class: 'img-preview', style: { backgroundImage: 'url("' + currentImg + '")' } }) : h('div', { class: 'img-preview img-preview--empty' }, 'אין תמונה');
    return h('div', { class: 'field' }, preview, urlInput,
      h('div', { class: 'field__row' }, h('label', { class: 'btn btn--ghost file-btn' }, 'העלה קובץ', fileInput),
        Button('הסר', function () { d({ type: 'SET_TILE_IMAGE', keys: keys, imageUrl: null }); })));
  }
  function EffectsEditor(keys, ctx, sel) {
    var d = ctx.dispatch, op = sel.opacity == null ? 1 : sel.opacity;
    var slider = h('input', { type: 'range', min: '20', max: '100', value: String(Math.round(op * 100)), class: 'slider',
      onInput: function (e) { d({ type: 'SET_TILE_OPACITY', keys: keys, opacity: (+e.target.value) / 100 }); } });
    return h('div', { class: 'field' },
      h('div', { class: 'field__row', style: { justifyContent: 'space-between' } },
        h('label', { class: 'field__label' }, 'שקיפות'), h('span', { class: 'field__label' }, Math.round(op * 100) + '%')), slider);
  }

  /* ===================================================================
   * Screen — מסכים שאינם המפה
   * =================================================================== */
  function Screen(ctx) {
    switch (ctx.state.ui.screen) {
      case 'home': return HomeScreen(ctx);
      case 'market': return MarketScreen(ctx);
      case 'missions': return MissionsScreen(ctx);
      case 'profile': return ProfileScreen(ctx);
      case 'settings': return SettingsScreen(ctx);
      default: return HomeScreen(ctx);
    }
  }
  function ScreenWrap(title, body, sub) {
    return h('div', { class: 'screen' },
      h('div', { class: 'screen__head' }, h('h2', { class: 'screen__title' }, title), sub ? h('span', { class: 'screen__sub' }, sub) : null),
      body);
  }

  /* ---- Home — דשבורד ---- */
  function HomeScreen(ctx) {
    var st = ctx.state, P = ctx.P, S = ctx.S, d = ctx.dispatch;
    var lvl = P.levelInfo(st), ms = P.missions(st).slice(0, 2);
    return ScreenWrap('הממלכה שלך',
      h('div', { class: 'home' },
        h('div', { class: 'hero glass glow' },
          Avatar(ctx, 'xl'),
          h('div', { class: 'hero__info' },
            h('div', { class: 'hero__name' }, 'Commander'),
            h('div', { class: 'hero__lvl' }, 'רמה ' + lvl.level + ' · ' + Math.round(lvl.progress * 100) + '%'),
            Bar(lvl.progress, 'bar--xp')
          )
        ),
        h('div', { class: 'stat-grid' },
          StatCell('💎', P.gems(st), 'יהלומים'),
          StatCell('🪙', P.coinsLabel(st), 'הון'),
          StatCell('⬡', S.territorySize(st), 'שטח'),
          StatCell('🏆', '#' + P.rank(st), 'דירוג')
        ),
        h('div', { class: 'section-title' }, 'משימות פעילות'),
        h('div', { class: 'mission-list' }, ms.map(function (m) { return MissionRow(m, d); })),
        Button('🗺️ אל המפה', function () { d({ type: 'SET_SCREEN', screen: 'map' }); }, { primary: true, block: true })
      ), 'בנה, התרחב, שלוט');
  }

  /* ---- Market — שוק טריטוריות ---- */
  function MarketScreen(ctx) {
    var st = ctx.state, P = ctx.P, d = ctx.dispatch;
    var listings = P.market(st), gems = P.gems(st);
    return ScreenWrap('שוק טריטוריות',
      h('div', { class: 'market' },
        h('div', { class: 'market__bal glass' }, '💎 ' + gems + ' יהלומים זמינים'),
        h('div', { class: 'listings' }, listings.map(function (l) { return Listing(l, gems, d); }))
      ), 'קנה קרקע משחקנים אחרים');
  }
  function Listing(l, gems, d) {
    var afford = gems >= l.price && !l.sold;
    return h('div', { class: 'listing glass glow' + (l.sold ? ' listing--sold' : '') },
      h('div', { class: 'listing__top' },
        ShapePreview(l.shape, l.tint),
        h('div', { class: 'listing__meta' },
          h('div', { class: 'listing__owner' }, '👤 ' + l.owner),
          h('div', { class: 'listing__stats' },
            h('span', {}, '⬡ ' + l.size),
            h('span', {}, '📍 ' + l.distance + ' ק"מ')
          )
        )
      ),
      l.sold
        ? h('div', { class: 'listing__sold' }, '✓ נרכש')
        : h('button', { class: 'btn btn--primary btn--block' + (afford ? '' : ' btn--disabled'),
            onClick: afford ? function () { d({ type: 'BUY_LISTING', id: l.id, price: l.price }); } : null,
            disabled: !afford }, 'קנה · 💎 ' + l.price)
    );
  }
  function ShapePreview(bits, tint) {
    var cells = bits.map(function (b) { return h('span', { class: 'shape__cell', style: b ? { background: tint, boxShadow: '0 0 6px ' + tint } : {} }); });
    return h('div', { class: 'shape' }, cells);
  }

  /* ---- Missions — battle pass ---- */
  function MissionsScreen(ctx) {
    var st = ctx.state, P = ctx.P, d = ctx.dispatch;
    return ScreenWrap('משימות יומיות',
      h('div', { class: 'mission-list' }, P.missions(st).map(function (m) { return MissionRow(m, d); })),
      'השלם משימות, צבור יהלומים');
  }
  function MissionRow(m, d) {
    return h('div', { class: 'mission glass' + (m.done ? ' mission--done' : '') },
      h('div', { class: 'mission__main' },
        h('div', { class: 'mission__title' }, m.title),
        h('div', { class: 'mission__prog' }, m.current + ' / ' + m.target),
        Bar(m.current / m.target, 'bar--xp')
      ),
      h('div', { class: 'mission__reward' },
        h('span', { class: 'reward' }, '+' + m.reward + ' 💎'),
        m.claimed ? h('span', { class: 'mission__done' }, '✓')
          : Button('קבל', function () { d({ type: 'CLAIM_MISSION', id: m.id }); }, { primary: m.done, disabled: !m.done })
      )
    );
  }

  /* ---- Profile ---- */
  function ProfileScreen(ctx) {
    var st = ctx.state, P = ctx.P, S = ctx.S, d = ctx.dispatch;
    var lvl = P.levelInfo(st);
    return ScreenWrap('פרופיל',
      h('div', { class: 'profile' },
        h('div', { class: 'hero glass glow' },
          Avatar(ctx, 'xl'),
          h('div', { class: 'hero__info' },
            h('div', { class: 'hero__name' }, 'Commander'),
            h('div', { class: 'hero__lvl' }, 'רמה ' + lvl.level + ' · ' + Math.round(lvl.progress * 100) + '%'),
            Bar(lvl.progress, 'bar--xp')
          )
        ),
        h('div', { class: 'stat-grid' },
          StatCell('⬡', S.territorySize(st), 'שטח'),
          StatCell('🪙', P.coinsLabel(st), 'הון'),
          StatCell('🏆', '#' + P.rank(st), 'דירוג'),
          StatCell('💎', P.gems(st), 'יהלומים')
        ),
        h('div', { class: 'section-title' }, 'אווטאר'),
        AvatarPicker(ctx),
        h('div', { class: 'section-title' }, 'הישגים'),
        h('div', { class: 'badges' }, P.achievements(st).map(function (a) {
          return h('div', { class: 'badge glass' + (a.unlocked ? ' badge--on' : ' badge--locked') },
            h('span', { class: 'badge__emoji' }, a.emoji), h('span', { class: 'badge__title' }, a.title));
        }))
      ));
  }
  function AvatarPicker(ctx) {
    var st = ctx.state, d = ctx.dispatch, curId = (st.meta && st.meta.avatarId) || 'wizard';
    function Option(id, inner, sel) { return h('button', { class: 'av-option' + (sel ? ' av-option--sel' : ''), onClick: function () { d({ type: 'SET_AVATAR', id: id }); } }, inner); }
    var opts = T.Avatars.list.map(function (a) {
      var inner = (a.frames && a.frames.length) ? h('img', { class: 'av-thumb', src: a.frames[0], alt: a.name }) : h('span', { class: 'av-emoji' }, a.emoji || '🐱');
      return Option(a.id, inner, curId === a.id);
    });
    if (st.meta && st.meta.customAvatar) opts.push(Option('custom', h('img', { class: 'av-thumb', src: st.meta.customAvatar, alt: 'c' }), curId === 'custom'));
    var fileInput = h('input', { type: 'file', accept: 'image/*', class: 'file-input',
      onChange: function (e) { var f = e.target.files && e.target.files[0]; T.readImageFile(f).then(function (u) { if (u) d({ type: 'SET_CUSTOM_AVATAR', dataUrl: u }); }); e.target.value = ''; } });
    opts.push(h('label', { class: 'av-option av-option--upload' }, h('span', { class: 'av-emoji' }, '➕'), fileInput));
    return h('div', { class: 'avatar-picker' }, opts);
  }

  function StatCell(icon, value, label) {
    return h('div', { class: 'stat-cell glass' },
      h('span', { class: 'stat-cell__icon' }, icon),
      h('span', { class: 'stat-cell__value' }, String(value)),
      h('span', { class: 'stat-cell__label' }, label));
  }

  function SettingsScreen(ctx) {
    var st = ctx.state, d = ctx.dispatch, night = st.ui.theme === 'night';
    function Row(label, control) { return h('div', { class: 'set-row glass' }, h('span', {}, label), control); }
    return ScreenWrap('הגדרות',
      h('div', { class: 'settings' },
        Row('מצב לילה 🌙', Button(night ? 'פעיל' : 'כבוי', function () { d({ type: 'SET_THEME', theme: night ? 'dark' : 'night' }); }, { primary: night })),
        Row('איפוס התקדמות', Button('אפס', function () {
          if (typeof window !== 'undefined') { try { window.localStorage.removeItem('territory.save.v6'); } catch (e) {} window.location.reload(); }
        })),
        h('p', { class: 'hint' }, 'מצב לילה מעמעם את המסך לשהייה ארוכה ולחיסכון בסוללה.')
      ));
  }

  T.Components = { TopBar: TopBar, BottomNav: BottomNav, MapOverlay: MapOverlay, Screen: Screen };
})(window.Territory);
