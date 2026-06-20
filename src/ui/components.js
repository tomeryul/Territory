/* =====================================================================
 * components.js — קומפוננטות UI (נאמן ל-Territory.dc.html handoff)
 * ---------------------------------------------------------------------
 * [UI ספציפי לפלטפורמה / PLATFORM-SPECIFIC]
 * מסך Home (סרגל מטבעות + כרטיס פרופיל + כותרת טריטוריה + כרטיס מפה +
 * פעולות), מסך World (מפת שחקנים + פאנל נבחר), וניווט תחתון צף.
 * ctx = { state, dispatch, S, L, P, world }
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  var h = T.h;
  var PAL = T.Tokens.palette;

  /* ---- אייקוני SVG (פורט מההנדאוף) ---- */
  function svg(props, kids) { return h('svg', Object.assign({ fill: 'none', 'stroke-width': 1.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, props), kids); }
  function p(d) { return h('path', { d: d }); }
  function Icon(name, color, size) {
    size = size || 20; var s = { width: size, height: size, viewBox: '0 0 24 24', stroke: color || '#fff' };
    switch (name) {
      case 'gem': return svg(s, [p('M3 8l4-5h10l4 5-9 12z'), p('M3 8h18M9 3l-2 5 5 11 5-11-2-5')]);
      case 'coin': return svg(Object.assign({}, s), [h('circle', { cx: 12, cy: 12, r: 8.5 }), h('circle', { cx: 12, cy: 12, r: 4 })]);
      case 'crown': return svg(s, [p('M7 4h10v4a5 5 0 0 1-10 0z'), p('M7 6H4.5v1.5a3 3 0 0 0 3 3M17 6h2.5v1.5a3 3 0 0 1-3 3'), p('M9.5 20h5M12 14v6')]);
      case 'search': return svg(s, [h('circle', { cx: 11, cy: 11, r: 7 }), p('M21 21l-4.3-4.3')]);
      case 'globe': return svg(s, [h('circle', { cx: 12, cy: 12, r: 9 }), p('M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18')]);
      case 'center': return svg(s, [h('circle', { cx: 12, cy: 12, r: 3 }), p('M12 2v3M12 19v3M2 12h3M19 12h3')]);
      case 'edit': return svg(s, [p('M12 20h9'), p('M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z')]);
      case 'cart': return svg(s, [p('M6 8h12l-1.2 11.5a1 1 0 0 1-1 .9H8.2a1 1 0 0 1-1-.9z'), p('M9 8a3 3 0 0 1 6 0')]);
      case 'target': return svg(s, [h('circle', { cx: 12, cy: 12, r: 8.5 }), h('circle', { cx: 12, cy: 12, r: 4 }), h('circle', { cx: 12, cy: 12, r: 0.6, fill: color, stroke: 'none' })]);
      case 'user': return svg(s, [h('circle', { cx: 12, cy: 8, r: 3.6 }), p('M5 20a7 7 0 0 1 14 0')]);
      case 'friends': return svg(s, [h('circle', { cx: 9, cy: 8, r: 3.2 }), h('circle', { cx: 17, cy: 9, r: 2.6 }), p('M3 19a6 6 0 0 1 12 0M15.5 19a5 5 0 0 1 5.5-2')]);
      case 'maphex': return svg(s, [p('M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z'), p('M9 4v13M15 6.5v13')]);
      case 'chat': return svg(s, [p('M4 5h16v11H9l-4 3.5V16H4z')]);
      case 'gear': return svg(s, [h('circle', { cx: 12, cy: 12, r: 3.2 }), p('M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-2.87 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.87-1.2l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 13.5H4.5a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 6.3 6.63l-.06-.06A2 2 0 1 1 9.07 3.74l.06.06A1.7 1.7 0 0 0 12 3.6a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.87 1.2l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0 1.2 2.87')]);
      case 'layers': return svg(s, [p('M12 3l9 4.5-9 4.5-9-4.5z'), p('M3 12l9 4.5 9-4.5M3 16.5L12 21l9-4.5')]);
      case 'close': return svg(Object.assign({}, s, { 'stroke-width': 2.2 }), [p('M6 6l12 12M18 6L6 18')]);
      default: return svg(s, [h('circle', { cx: 12, cy: 12, r: 8 })]);
    }
  }

  /* ---- אווטאר ---- */
  function resolveAvatar(state) {
    var m = state.meta || {};
    if (m.avatarId === 'custom' && m.customAvatar) return { kind: 'image', src: m.customAvatar };
    var def = T.Avatars.byId[m.avatarId] || T.Avatars.byId.wizard || T.Avatars.list[0];
    if (def.frames && def.frames.length > 1) return { kind: 'frames', frames: def.frames };
    if (def.frames && def.frames.length === 1) return { kind: 'image', src: def.frames[0] };
    return { kind: 'emoji', emoji: def.emoji || '🐱' };
  }
  function Marker(state) {
    return h('div', { class: 'player-marker', style: { display: 'none' } },
      h('div', { class: 'player-marker__ring' }),
      h('div', { class: 'player-marker__frame' }, h('div', { class: 'player-marker__inner' }, AvatarImg(state))));
  }
  function AvatarImg(state) {
    var a = resolveAvatar(state);
    if (a.kind === 'image') return h('img', { class: 'avatar__img', src: a.src, alt: 'avatar' });
    if (a.kind === 'frames') return h('div', { class: 'avatar--anim' }, a.frames.map(function (src, i) {
      return h('img', { class: 'avatar__img', src: src, alt: 'a', style: { display: i === 0 ? 'block' : 'none' } });
    }));
    return h('div', { class: 'avatar__emoji' }, a.emoji);
  }

  /* ===================================================================
   * HOME — סרגל מטבעות + פרופיל + טריטוריה + מפה + פעולות
   * =================================================================== */
  function Home(ctx) {
    var st = ctx.state, P = ctx.P, S = ctx.S, d = ctx.dispatch;
    var lvl = P.levelInfo(st), tiles = S.territorySize(st);

    function pill(icon, color, txt, valCol, borderRgba, bgGrad) {
      return h('div', { class: 'cpill', style: { background: bgGrad, border: '1px solid ' + borderRgba } },
        Icon(icon, color, 17), h('span', { class: 'cpill__val', style: { color: valCol } }, txt));
    }

    return h('div', { class: 'screen-home' },
      // ---- countdown banner (הטייל הבא — בולט מאוד למעלה) ----
      Countdown(ctx),
      // ---- currency bar ----
      h('div', { class: 'currency-bar' },
        pill('gem', '#5af0ff', String(P.gems(st)), '#cfeaff', 'rgba(90,150,255,.22)', 'linear-gradient(160deg,rgba(40,52,92,.6),rgba(14,16,34,.6))'),
        pill('coin', '#f5c451', P.coinsLabel(st), '#ffe6ab', 'rgba(245,196,81,.28)', 'linear-gradient(160deg,rgba(70,58,30,.55),rgba(20,16,30,.6))'),
        pill('crown', '#c4b5fd', '#' + P.rank(st), '#e6ddff', 'rgba(167,139,250,.28)', 'linear-gradient(160deg,rgba(58,42,92,.6),rgba(16,15,32,.6))')
      ),
      // ---- resources bar (משאבים שנאספו מהאזורים) ----
      ResourcesBar(ctx),
      // ---- profile card ----
      h('div', { class: 'profile-card glass' },
        h('div', { class: 'pc-orb' }),
        h('div', { class: 'pc-av' },
          h('div', { class: 'pc-av__inner' }, AvatarImg(st)),
          h('div', { class: 'pc-av__lvl' }, String(lvl.level))
        ),
        h('div', { class: 'pc-info' },
          h('div', { class: 'pc-name-row' },
            h('span', { class: 'pc-name' }, 'TraderOne'),
            h('span', { class: 'pc-elite' }, h('svg', { width: 10, height: 10, viewBox: '0 0 24 24', fill: '#c4b5fd' }, h('path', { d: 'M5 16l-2-9 5.5 4L12 4l3.5 7L21 7l-2 9z' })), 'Elite')
          ),
          h('div', { class: 'pc-lvl-row' },
            h('span', { class: 'pc-lvl-label' }, 'Level ' + lvl.level),
            h('span', { class: 'pc-lvl-pct' }, Math.round(lvl.progress * 100) + '%')
          ),
          h('div', { class: 'pc-xp' }, h('div', { class: 'pc-xp__fill', style: { width: Math.round(lvl.progress * 100) + '%' } }, h('div', { class: 'pc-xp__sheen' })))
        )
      ),
      // ---- territory header ----
      h('div', { class: 'terr-head' },
        h('div', {},
          h('div', { class: 'terr-eyebrow' }, 'Your empire'),
          h('div', { class: 'terr-title' }, 'Home territory')
        ),
        h('div', { class: 'terr-tiles' }, h('span', { class: 'terr-tiles__n' }, String(tiles)), h('span', { class: 'terr-tiles__l' }, 'tiles'))
      ),
      // ---- map card (canvas מוזרק ע"י app.js ל-.map-host) ----
      h('div', { class: 'map-card' },
        h('div', { class: 'map-host' }, Marker(st)),
        h('div', { class: 'map-fab' },
          h('div', { class: 'fab', title: 'התקרב', onClick: function () { if (ctx.world) ctx.world.zoomBy(1); } }, h('span', { class: 'fab-z' }, '+')),
          h('div', { class: 'fab', title: 'התרחק', onClick: function () { if (ctx.world) ctx.world.zoomBy(-1); } }, h('span', { class: 'fab-z' }, '−')),
          h('div', { class: 'fab fab--primary', title: 'מפת עולם', onClick: function () { d({ type: 'SET_SCREEN', screen: 'world' }); } }, Icon('globe', '#fff', 20)),
          h('div', { class: 'fab', title: 'מרכז', onClick: function () { if (ctx.world) ctx.world.resetCamera(); } }, Icon('center', '#b9a8f0', 19))
        )
      ),
      // ---- actions ----
      h('div', { class: 'home-actions' },
        h('div', { class: 'btn-edit', onClick: function () { d({ type: 'SET_SHEET', sheet: 'edit' }); } },
          h('div', { class: 'btn-edit__sheen' }), Icon('edit', '#fff', 20), h('span', {}, 'Edit territory')),
        h('div', { class: 'action-row' },
          h('div', { class: 'btn-sec', onClick: function () { d({ type: 'SET_SCREEN', screen: 'market' }); } }, Icon('cart', '#22d3ee', 18), h('span', { style: { color: '#d6e9f5' } }, 'Market')),
          h('div', { class: 'btn-sec', onClick: function () { d({ type: 'SET_SCREEN', screen: 'missions' }); } }, Icon('target', '#f5c451', 18), h('span', { style: { color: '#f3e3bd' } }, 'Missions'))
        )
      ),
      EditSheet(ctx)
    );
  }

  /* ===================================================================
   * WORLD — מפת שחקנים + פאנל נבחר
   * =================================================================== */
  function World(ctx) {
    var d = ctx.dispatch, w = ctx.world, sel = w ? w.getSelected() : null;
    return h('div', { class: 'screen-world' },
      h('div', { class: 'world-head' },
        h('div', { class: 'whead-btn' }, Icon('layers', '#b9a8f0', 20)),
        h('div', { class: 'whead-title' }, h('div', { class: 'whead-title__t' }, 'World map'), h('div', { class: 'whead-title__s' }, 'Global trade arena')),
        h('div', { class: 'whead-btn', onClick: function () { d({ type: 'SET_SCREEN', screen: 'home' }); } }, Icon('close', '#cbb8ff', 18))
      ),
      h('div', { class: 'map-card map-card--world' },
        h('div', { class: 'map-host map-host--world' }, Marker(ctx.state)),
        h('div', { class: 'world-hint' }, h('span', { class: 'world-hint__dot' }), 'Tap a region')
      ),
      sel ? SelPanel(sel, d) : null
    );
  }
  function SelPanel(sel, d) {
    function stat(label, val, col) {
      return h('div', { class: 'sp-stat' }, h('span', { class: 'sp-stat__l' }, label), h('span', { class: 'sp-stat__v', style: { color: col } }, val));
    }
    return h('div', { class: 'sel-panel glass' },
      h('div', { class: 'sp-top' },
        h('div', { class: 'sp-swatch', style: { background: 'linear-gradient(150deg,' + sel.node + ',' + sel.color + ')', boxShadow: '0 0 16px ' + sel.glow } }, sel.name[0]),
        h('div', { class: 'sp-owner' }, h('div', { class: 'sp-owner__l' }, 'Owner'), h('div', { class: 'sel-panel__name' }, sel.name)),
        h('div', { class: 'sp-share' }, h('span', { class: 'sp-share__v' }, sel.share), h('span', { class: 'sp-share__l' }, 'share'))
      ),
      h('div', { class: 'sp-stats' },
        stat('Net value', sel.value, '#ffe6ab'),
        stat('Tiles', sel.tiles, '#c9bdf5'),
        stat('Rank', sel.rank, '#a7f5c0')
      ),
      h('div', { class: 'btn-edit', onClick: function () { d({ type: 'SET_SCREEN', screen: 'profile' }); } }, Icon('user', '#fff', 17), h('span', {}, 'View profile'))
    );
  }

  /* ===================================================================
   * Bottom nav צף — Profile / Friends / Map / Chat / Settings
   * =================================================================== */
  function BottomNav(ctx) {
    var d = ctx.dispatch, cur = ctx.state.ui.screen;
    function item(name, icon, label, onClick, active) {
      return h('div', { class: 'nav-item' + (active ? ' nav-item--active' : ''), onClick: onClick },
        Icon(icon, active ? '#c4b5fd' : '#7a7099', 23), h('span', { class: 'nav-item__l' }, label));
    }
    return h('div', { class: 'dock glass' },
      item('profile', 'user', 'Profile', function () { d({ type: 'SET_SCREEN', screen: 'profile' }); }, cur === 'profile'),
      item('friends', 'friends', 'Friends', function () { d({ type: 'SET_SCREEN', screen: 'friends' }); }, cur === 'friends'),
      // center Map button (elevated)
      h('div', { class: 'nav-center', onClick: function () { d({ type: 'SET_SCREEN', screen: 'home' }); } },
        h('div', { class: 'nav-center__btn' }, h('div', { class: 'nav-center__ping' }), Icon('maphex', '#fff', 26)),
        h('span', { class: 'nav-center__l' }, 'Map')),
      item('chat', 'chat', 'Chat', function () { d({ type: 'SET_SCREEN', screen: 'chat' }); }, cur === 'chat'),
      item('settings', 'gear', 'Settings', function () { d({ type: 'SET_SCREEN', screen: 'settings' }); }, cur === 'settings')
    );
  }

  /* ===================================================================
   * Screen router
   * =================================================================== */
  function Screen(ctx) {
    switch (ctx.state.ui.screen) {
      case 'home': return Home(ctx);
      case 'world': return World(ctx);
      case 'market': return MarketScreen(ctx);
      case 'missions': return MissionsScreen(ctx);
      case 'profile': return ProfileScreen(ctx);
      case 'settings': return SettingsScreen(ctx);
      case 'friends': return Stub('Friends', '👥', 'רשימת חברים ודירוגים — בקרוב.', ctx);
      case 'chat': return Stub('Chat', '💬', 'צ׳אט גלובלי — בקרוב.', ctx);
      default: return Home(ctx);
    }
  }
  function Sub(title, body) {
    return h('div', { class: 'screen sub-screen' },
      h('div', { class: 'screen__head' }, h('h2', { class: 'screen__title' }, title)), body);
  }
  function Stub(title, emoji, text, ctx) {
    return Sub(title, h('div', { class: 'stub' }, h('div', { class: 'stub__emoji' }, emoji), h('p', { class: 'hint' }, text),
      BackBtn(ctx)));
  }
  function BackBtn(ctx) { return h('div', { class: 'btn-sec', style: { marginTop: '14px' }, onClick: function () { ctx.dispatch({ type: 'SET_SCREEN', screen: 'home' }); } }, '← חזרה'); }

  /* ---- Market ---- */
  function MarketScreen(ctx) {
    var st = ctx.state, P = ctx.P, d = ctx.dispatch, listings = P.market(st), gems = P.gems(st);
    return Sub('Market', h('div', { class: 'market' },
      h('div', { class: 'market__bal glass' }, '💎 ' + gems + ' יהלומים'),
      h('div', { class: 'listings' }, listings.map(function (l) { return Listing(l, gems, d); })),
      BackBtn(ctx)));
  }
  function Listing(l, gems, d) {
    var afford = gems >= l.price && !l.sold;
    return h('div', { class: 'listing glass' + (l.sold ? ' listing--sold' : '') },
      h('div', { class: 'listing__top' }, ShapePreview(l.shape, l.tint),
        h('div', { class: 'listing__meta' }, h('div', { class: 'listing__owner' }, '👤 ' + l.owner),
          h('div', { class: 'listing__stats' }, h('span', {}, '⬡ ' + l.size), h('span', {}, '📍 ' + l.distance + ' ק"מ')))),
      l.sold ? h('div', { class: 'listing__sold' }, '✓ נרכש')
        : h('div', { class: 'btn-edit' + (afford ? '' : ' btn--disabled'), onClick: afford ? function () { d({ type: 'BUY_LISTING', id: l.id, price: l.price }); } : null }, 'קנה · 💎 ' + l.price));
  }
  function ShapePreview(bits, tint) {
    return h('div', { class: 'shape' }, bits.map(function (b) { return h('span', { class: 'shape__cell', style: b ? { background: tint, boxShadow: '0 0 6px ' + tint } : {} }); }));
  }

  /* ---- Missions ---- */
  function MissionsScreen(ctx) {
    var st = ctx.state, P = ctx.P, d = ctx.dispatch;
    return Sub('Daily missions', h('div', {},
      h('div', { class: 'mission-list' }, P.missions(st).map(function (m) { return MissionRow(m, d); })),
      BackBtn(ctx)));
  }
  function MissionRow(m, d) {
    return h('div', { class: 'mission glass' + (m.done ? ' mission--done' : '') },
      h('div', { class: 'mission__main' }, h('div', { class: 'mission__title' }, m.title), h('div', { class: 'mission__prog' }, m.current + ' / ' + m.target),
        h('div', { class: 'bar' }, h('div', { class: 'bar__fill', style: { width: Math.round(m.current / m.target * 100) + '%' } }))),
      h('div', { class: 'mission__reward' }, h('span', { class: 'reward' }, '+' + m.reward + ' 💎'),
        m.claimed ? h('span', { class: 'mission__done' }, '✓') : h('div', { class: 'btn-sec btn-sec--sm' + (m.done ? '' : ' btn--disabled'), onClick: m.done ? function () { d({ type: 'CLAIM_MISSION', id: m.id }); } : null }, 'קבל')));
  }

  /* ---- Profile ---- */
  function ProfileScreen(ctx) {
    var st = ctx.state, P = ctx.P, S = ctx.S, lvl = P.levelInfo(st);
    return Sub('Profile', h('div', { class: 'profile' },
      h('div', { class: 'profile-card glass' },
        h('div', { class: 'pc-av pc-av--lg' }, h('div', { class: 'pc-av__inner' }, AvatarImg(st)), h('div', { class: 'pc-av__lvl' }, String(lvl.level))),
        h('div', { class: 'pc-info' }, h('div', { class: 'pc-name' }, 'TraderOne'),
          h('div', { class: 'pc-lvl-row' }, h('span', { class: 'pc-lvl-label' }, 'Level ' + lvl.level), h('span', { class: 'pc-lvl-pct' }, Math.round(lvl.progress * 100) + '%')),
          h('div', { class: 'pc-xp' }, h('div', { class: 'pc-xp__fill', style: { width: Math.round(lvl.progress * 100) + '%' } }, h('div', { class: 'pc-xp__sheen' }))))),
      h('div', { class: 'stat-grid' },
        Cell('⬡', S.territorySize(st), 'Tiles'), Cell('🪙', P.coinsLabel(st), 'Net worth'),
        Cell('🏆', '#' + P.rank(st), 'Rank'), Cell('💎', P.gems(st), 'Gems')),
      h('div', { class: 'section-title' }, 'Avatar'), AvatarPicker(ctx),
      h('div', { class: 'section-title' }, 'Achievements'),
      h('div', { class: 'badges' }, P.achievements(st).map(function (a) {
        return h('div', { class: 'badge glass' + (a.unlocked ? ' badge--on' : ' badge--locked') }, h('span', { class: 'badge__emoji' }, a.emoji), h('span', { class: 'badge__title' }, a.title)); })),
      BackBtn(ctx)));
  }
  function Cell(icon, value, label) {
    return h('div', { class: 'stat-cell glass' }, h('span', { class: 'stat-cell__icon' }, icon), h('span', { class: 'stat-cell__value' }, String(value)), h('span', { class: 'stat-cell__label' }, label));
  }
  function AvatarPicker(ctx) {
    var st = ctx.state, d = ctx.dispatch, curId = (st.meta && st.meta.avatarId) || 'wizard';
    function opt(id, inner, sel) { return h('button', { class: 'av-option' + (sel ? ' av-option--sel' : ''), onClick: function () { d({ type: 'SET_AVATAR', id: id }); } }, inner); }
    var opts = T.Avatars.list.map(function (a) {
      var inner = (a.frames && a.frames.length) ? h('img', { class: 'av-thumb', src: a.frames[0], alt: a.name }) : h('span', { class: 'av-emoji' }, a.emoji || '🐱');
      return opt(a.id, inner, curId === a.id);
    });
    if (st.meta && st.meta.customAvatar) opts.push(opt('custom', h('img', { class: 'av-thumb', src: st.meta.customAvatar, alt: 'c' }), curId === 'custom'));
    var fileInput = h('input', { type: 'file', accept: 'image/*', class: 'file-input', onChange: function (e) { var f = e.target.files && e.target.files[0]; T.readImageFile(f).then(function (u) { if (u) d({ type: 'SET_CUSTOM_AVATAR', dataUrl: u }); }); e.target.value = ''; } });
    opts.push(h('label', { class: 'av-option av-option--upload' }, h('span', { class: 'av-emoji' }, '➕'), fileInput));
    return h('div', { class: 'avatar-picker' }, opts);
  }

  /* ---- Settings ---- */
  function SettingsScreen(ctx) {
    var st = ctx.state, d = ctx.dispatch, night = st.ui.theme === 'night';
    function Row(label, control) { return h('div', { class: 'set-row glass' }, h('span', {}, label), control); }
    return Sub('Settings', h('div', { class: 'settings' },
      Row('🌙 מצב לילה', h('div', { class: 'btn-sec btn-sec--sm', onClick: function () { d({ type: 'SET_THEME', theme: night ? 'dark' : 'night' }); } }, night ? 'פעיל' : 'כבוי')),
      Row('איפוס התקדמות', h('div', { class: 'btn-sec btn-sec--sm', onClick: function () { if (typeof window !== 'undefined') { try { window.localStorage.removeItem('territory.save.v6'); } catch (e) {} window.location.reload(); } } }, 'אפס')),
      h('p', { class: 'hint' }, 'מצב לילה מעמעם את המסך לשהייה ארוכה וחיסכון בסוללה.'),
      BackBtn(ctx)));
  }

  /* ---- גיליון עריכת טריטוריה (כל המשבצות יחד) ---- */
  /* ---- ספירה-לאחור לטייל הבא (בולט בראש המסך) ---- */
  function Countdown(ctx) {
    var st = ctx.state, S = ctx.S;
    return h('div', { class: 'countdown glass' },
      h('div', { class: 'countdown__top' },
        h('span', { class: 'countdown__label' }, '⏳ הטייל הבא בעוד'),
        h('span', { class: 'countdown__time' }, S.nextTileLabel(st))),
      h('div', { class: 'countdown__bar' }, h('div', { class: 'countdown__fill', style: { width: Math.round(S.growthProgress(st) * 100) + '%' } })));
  }

  /* ---- סרגל משאבים שנאספו מהאזורים ---- */
  function ResourcesBar(ctx) {
    var st = ctx.state, S = ctx.S;
    return h('div', { class: 'res-bar' }, Object.keys(T.Resources).map(function (id) {
      var r = T.Resources[id];
      return h('div', { class: 'res-pill' }, h('span', { class: 'res-pill__i' }, r.emoji),
        h('span', { class: 'res-pill__n', style: { color: r.color } }, String(S.resourceCount(st, id))));
    }));
  }

  /* ---- גיליון עיצוב הטריטוריה: צבע (חינם) + אפקטים (עולים משאבים) ---- */
  function EditSheet(ctx) {
    var st = ctx.state, d = ctx.dispatch;
    if (st.ui.sheet !== 'edit') return null;
    var tab = st.ui.editTab;
    function Tab(id, label) { return h('button', { class: 'tab' + (tab === id ? ' tab--active' : ''), onClick: function () { d({ type: 'SET_EDIT_TAB', tab: id }); } }, label); }
    var content = tab === 'effects' ? EffectsEditor(ctx) : ColorEditor(ctx);
    return h('div', { class: 'sheet glass' },
      h('div', { class: 'sheet__header' },
        h('button', { class: 'sheet__close', onClick: function () { d({ type: 'SET_SHEET', sheet: null }); } }, '✕'),
        h('h3', { class: 'sheet__title' }, 'עיצוב הטריטוריה'), h('span', { class: 'sheet__coord' }, '🎨')),
      h('div', { class: 'sheet__body' },
        h('p', { class: 'hint' }, 'צבעים חינם · אפקטים מיוחדים נקנים במשאבים שנאספו מהאזורים על המפה.'),
        h('div', { class: 'tabs' }, Tab('color', 'צבע'), Tab('effects', 'אפקטים')), content));
  }
  var COLOR_PRESETS = ['#4060e6', PAL.brand, PAL.cyan, PAL.green, PAL.pink, '#a855f7', PAL.coin, PAL.slate];
  function ColorEditor(ctx) {
    var d = ctx.dispatch, cur = ctx.state.meta.territoryStyle.color;
    var swatches = COLOR_PRESETS.map(function (color) {
      return h('button', { class: 'swatch' + (cur === color ? ' swatch--sel' : ''), style: { background: color }, onClick: function () { d({ type: 'SET_TERRITORY_COLOR', color: color }); } });
    });
    var picker = h('input', { type: 'color', class: 'color-input', value: cur, onInput: function (e) { d({ type: 'SET_TERRITORY_COLOR', color: e.target.value }); } });
    return h('div', { class: 'field' }, h('div', { class: 'swatches' }, swatches, picker));
  }
  function EffectsEditor(ctx) {
    var st = ctx.state, d = ctx.dispatch, cur = st.meta.territoryStyle.effect, res = st.meta.resources || {};
    return h('div', { class: 'effects' }, T.Effects.map(function (e) {
      var sel = cur === e.id;
      var afford = !e.cost || Object.keys(e.cost).every(function (rk) { return (res[rk] || 0) >= e.cost[rk]; });
      var costTxt = e.cost ? Object.keys(e.cost).map(function (rk) { return T.Resources[rk].emoji + e.cost[rk]; }).join(' ') : 'חינם';
      return h('button', {
        class: 'effect' + (sel ? ' effect--sel' : '') + ((sel || afford) ? '' : ' effect--locked'),
        onClick: (sel || afford) ? function () { d({ type: 'APPLY_TERRITORY_EFFECT', effect: e.id }); } : null,
      }, h('span', { class: 'effect__emoji' }, e.emoji), h('span', { class: 'effect__name' }, e.name),
        h('span', { class: 'effect__cost' }, sel ? '✓ פעיל' : costTxt));
    }));
  }

  T.Components = { Screen: Screen, BottomNav: BottomNav };
})(window.Territory);
