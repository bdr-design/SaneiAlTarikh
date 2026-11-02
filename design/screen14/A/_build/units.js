  /* ---------- The military map (D-15) ----------
     Map space is the overlay's 1688 x 1097 (Egypt's box centre (764, 578) sits at --map-cx/--map-cy, scaled by --map-s).
     Units are placed in screen points from their map positions, so they keep their size while the map zooms. */
  var $ = function (sel) { return document.querySelector(sel); };
  var UNITS = {
    west:   { kind: 'army', name: 'المنطقة الغربية', n: 4, at: [659, 440], place: 'مطروح', org: 76 },
    north:  { kind: 'army', name: 'المنطقة الشمالية', n: 4, at: [741, 447], place: 'الإسكندرية', org: 75 },
    cairo:  { kind: 'stack', name: 'القاهرة', n: 6, at: [777, 478], parts: [['المنطقة المركزية', 5, 82], ['الحرس الجمهوري', 1, 95]] },
    second: { kind: 'army', name: 'الجيش الثاني الميداني', n: 7, at: [810, 450], place: 'القناة', org: 80 },
    third:  { kind: 'army', name: 'الجيش الثالث الميداني', n: 6, at: [816, 481], place: 'السويس', org: 78 },
    fleet:  { kind: 'ship', name: 'الأسطول الشمالي', n: 10, at: [735, 415], place: 'الإسكندرية' },
    air:    { kind: 'plane', name: 'مجموعة جوية', n: 24, at: [773, 509], place: 'بني سويف' }
  };
  /* the western army's route: from Marsa Matruh down the desert road (one waypoint) to the Siwa oasis near the Libyan border */
  var ROUTE = { unit: 'west', pts: [[659, 440], [640, 468], [608, 504]], to: 'سيوة' };
  var KM = { x: 3.23, y: 3.40 }, KMDAY = 40;                 /* km per map unit (at 31° N); a march of 40 km a day */
  var legs = [], TOTAL = 0;
  for (var i = 1; i < ROUTE.pts.length; i++) {
    var a = ROUTE.pts[i - 1], b = ROUTE.pts[i], km = Math.hypot((b[0] - a[0]) * KM.x, (b[1] - a[1]) * KM.y);
    legs.push({ a: a, b: b, km: km, from: TOTAL }); TOTAL += km;
  }
  var DAYS = TOTAL / KMDAY;                                  /* the whole march in days */
  /* the point at a distance along the route (map space) */
  function along(k) {
    k = Math.max(0, Math.min(TOTAL, k));
    for (var i = 0; i < legs.length; i++) { var L = legs[i]; if (k <= L.from + L.km + 1e-9) { var f = (k - L.from) / L.km; return [L.a[0] + (L.b[0] - L.a[0]) * f, L.a[1] + (L.b[1] - L.a[1]) * f]; } }
    return ROUTE.pts[ROUTE.pts.length - 1];
  }
  function ar(n, one, two, few, many) { return n === 1 ? one : n === 2 ? two : (n >= 3 && n <= 10 ? n + ' ' + few : n + ' ' + many); }
  var MONTH = 'يناير', DOW = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  var S = { s: 1, cx: 0, cy: 0 };                            /* the map placement */
  function scr(p) { return [S.cx + (p[0] - 764) * S.s, S.cy + (p[1] - 578) * S.s]; }
  function tokEl(id) { return $('.u-tok[data-u="' + id + '"]'); }

  /* VoiceOver: each token reads its name, strength and where it is or goes */
  function tokLabel(id, e) {
    var u = UNITS[id];
    if (u.kind === 'stack') return u.name + ': جيشان، ' + ar(u.n, 'تشكيل واحد', 'تشكيلان', 'تشكيلات', 'تشكيلًا') + '، ' + u.parts.map(function (p) { return p[0] + ' ' + p[1]; }).join(' و') + '. يفتح الاختيار';
    var what = u.kind === 'ship' ? ar(u.n, 'سفينة', 'سفينتان', 'سفن', 'سفينة') : u.kind === 'plane' ? ar(u.n, 'طائرة', 'طائرتان', 'طائرات', 'طائرة') : ar(u.n, 'تشكيل واحد', 'تشكيلان', 'تشكيلات', 'تشكيلًا');
    var where = u.place;
    if (id === ROUTE.unit && e !== null) where = e >= DAYS - 1e-9 ? 'في ' + ROUTE.to : 'تتحرك إلى ' + ROUTE.to + '، تصل ' + eta(e);
    return u.name + '، مصر: ' + what + '، ' + where;
  }
  function eta(e) { var d = Math.ceil(DAYS - e - 1e-9); return 'بعد ' + ar(d, 'يوم', 'يومين', 'أيام', 'يومًا'); }

  /* the state: which army is selected, whether the western army is under way (e = days marched; null = not ordered) */
  var ST = { sel: null, e: null };
  function render() {
    var root = document.documentElement, moving = ST.e !== null && ST.e < DAYS - 1e-9;
    root.dataset.sel = ST.sel ? '1' : '0';
    root.dataset.route = ST.sel === ROUTE.unit && moving ? '1' : '0';
    Object.keys(UNITS).forEach(function (id) {
      var t = tokEl(id), p = id === ROUTE.unit && ST.e !== null ? along(ST.e * KMDAY) : UNITS[id].at, q = scr(p);
      var im = t.querySelector('.u-img');                     /* the image's centre is the unit's place */
      t.style.left = (q[0] - t.offsetWidth / 2) + 'px'; t.style.top = (q[1] - (t.offsetHeight - im.offsetHeight / 2)) + 'px';
      t.setAttribute('aria-pressed', String(ST.sel === id));
      t.setAttribute('aria-label', tokLabel(id, id === ROUTE.unit ? ST.e : null));
    });
    /* the route still ahead: from the token through what is left of the waypoints to the destination */
    if (root.dataset.route === '1') {
      var k = ST.e * KMDAY, pts = [along(k)].concat(ROUTE.pts.slice(1).filter(function (p, i) { return legs[i].from + legs[i].km > k + 1e-9; })).map(scr);
      var d = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('L');
      $('.route .halo').setAttribute('d', d); $('.route .line').setAttribute('d', d);
      var z = pts[pts.length - 1], y = pts[pts.length - 2], ang = Math.atan2(z[1] - y[1], z[0] - y[0]), h = 9, w = 5;
      var tip = [z[0], z[1]], bl = [z[0] - h * Math.cos(ang) + w * Math.sin(ang), z[1] - h * Math.sin(ang) - w * Math.cos(ang)], br = [z[0] - h * Math.cos(ang) - w * Math.sin(ang), z[1] - h * Math.sin(ang) + w * Math.cos(ang)];
      $('.route .head').setAttribute('d', 'M' + [tip, bl, br].map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('L') + 'Z');
      var wp = $('.u-wp'), passed = legs[0].from + legs[0].km <= k + 1e-9, wq = scr(ROUTE.pts[1]);
      wp.style.display = passed ? 'none' : ''; wp.style.left = (wq[0] - 10) + 'px'; wp.style.top = (wq[1] - 10) + 'px';
      var ds = $('.u-dest'), dq = scr(ROUTE.pts[ROUTE.pts.length - 1]);
      ds.style.left = (dq[0] - ds.offsetWidth / 2) + 'px'; ds.style.top = (dq[1] - 14 - ds.offsetHeight) + 'px';
    }
    /* the HUD date: 1 January 2011 plus the whole days marched */
    var day = 1 + (ST.e === null ? 0 : Math.floor(ST.e + 1e-9));
    $('.date .dow').textContent = DOW[(day - 1) % 7];
    $('.date .dmy').textContent = day + ' ' + MONTH + ' 2011';
    /* the order bar */
    if (ST.sel) {
      var u = UNITS[ST.sel], sub, on = null;
      if (u.kind === 'stack') sub = u.parts.map(function (p) { return p[0] + ' ' + p[1]; }).join(' · ');
      else {
        var what = u.kind === 'ship' ? ar(u.n, 'سفينة', 'سفينتان', 'سفن', 'سفينة') : u.kind === 'plane' ? ar(u.n, 'طائرة', 'طائرتان', 'طائرات', 'طائرة') : ar(u.n, 'تشكيل واحد', 'تشكيلان', 'تشكيلات', 'تشكيلًا');
        if (ST.sel === ROUTE.unit && ST.e !== null) {
          if (moving) { sub = what + ' · إلى ' + ROUTE.to + ' · يصل ' + eta(ST.e); on = 'move'; } else { sub = what + ' · في ' + ROUTE.to; on = 'halt'; }
        } else sub = what + ' · ' + u.place + (u.org ? ' · التنظيم ' + u.org + '%' : '');
      }
      $('.o-name').textContent = u.name; $('.o-sub').textContent = sub;
      $('.o-unit').setAttribute('aria-label', u.name + ': ' + sub.split(' · ').join('، '));
      Array.prototype.forEach.call(document.querySelectorAll('.o-btn[data-o]'), function (b) {
        var isOn = b.dataset.o === on; b.classList.toggle('on', isOn);
        if (b.getAttribute('aria-disabled') !== 'true') b.setAttribute('aria-pressed', String(isOn));
      });
    }
    window.__frames = (window.__frames || 0) + 1;
    window.__units = { sel: ST.sel, e: ST.e, days: DAYS, km: TOTAL, moving: moving, s: S.s };
  }

  /* Placement: the largest zoom at which every token (with its 44 pt hit box), the whole route swept by the moving token,
     the waypoint and the destination stay inside the safe screen, clear of every HUD panel (8 pt for their hit boxes),
     with no two token hit boxes touching; then the position nearest the middle of the free map. */
  function placeUnits() {
    var d = window.__dev, W = d.W, H = d.H, SIDE = Math.max(d.SIDE, 0), BOT = d.BOTTOM, PAD = 8;
    var obs = Array.prototype.filter.call(document.querySelectorAll('.hud .glass'), function (e) { return !e.classList.contains('menu') && e.getClientRects().length; })
      .map(function (e) { var r = e.getBoundingClientRect(); return { x0: r.left - PAD, y0: r.top - PAD, x1: r.right + PAD, y1: r.bottom + PAD }; });
    var top = $('.top').getBoundingClientRect(), bar = ($('.orders').getClientRects().length ? $('.orders') : $('.dock')).getBoundingClientRect();
    var tx = W / 2, ty = (top.bottom + bar.top) / 2;
    /* objects in map space with their half sizes in points (hit boxes for tokens) */
    /* a token's box (its hit box: at least 44 x 44) is centred above its place by half its tag */
    function tb(t) { var h = Math.max(t.offsetHeight, 44); return { hw: Math.max(t.offsetWidth, 44) / 2, hh: h / 2, oy: t.offsetHeight / 2 - (t.offsetHeight - t.querySelector('.u-img').offsetHeight / 2) }; }
    var objs = Object.keys(UNITS).map(function (id) { var b = tb(tokEl(id)); return { p: UNITS[id].at, hw: b.hw, hh: b.hh, oy: b.oy, id: id }; });
    var wb = tb(tokEl(ROUTE.unit));
    for (var k = 0; k <= TOTAL; k += 6) objs.push({ p: along(k), hw: wb.hw, hh: wb.hh, oy: wb.oy, sweep: true });
    var dst = $('.u-dest'), dw = dst.offsetWidth / 2, dh = dst.offsetHeight;
    objs.push({ p: ROUTE.pts[1], hw: 10, hh: 10 });
    objs.push({ p: ROUTE.pts[2], hw: dw, hh: 14 + dh, up: true });
    var toks = objs.filter(function (o) { return o.id; });
    function sepOK(s) {
      for (var i = 0; i < toks.length; i++) for (var j = i + 1; j < toks.length; j++) {
        var a = toks[i], b = toks[j];
        if (Math.abs(a.p[0] - b.p[0]) * s < a.hw + b.hw + 1 && Math.abs((a.p[1] - b.p[1]) * s + (a.oy - b.oy)) < a.hh + b.hh + 1) return false;
      }
      return true;
    }
    function boxes(s, cx, cy) {
      return objs.map(function (o) { var x = cx + (o.p[0] - 764) * s, y = cy + (o.p[1] - 578) * s + (o.oy || 0);
        return o.up ? { x0: x - o.hw, x1: x + o.hw, y0: y - o.hh, y1: y + 9 } : { x0: x - o.hw, x1: x + o.hw, y0: y - o.hh, y1: y + o.hh }; });
    }
    function clear(bs) {
      for (var i = 0; i < bs.length; i++) { var r = bs[i];
        if (r.x0 < SIDE + 2 || r.x1 > W - SIDE - 2 || r.y0 < 2 || r.y1 > H - BOT - 2) return false;
        for (var j = 0; j < obs.length; j++) { var o = obs[j]; if (r.x1 > o.x0 && r.x0 < o.x1 && r.y1 > o.y0 && r.y0 < o.y1) return false; } }
      return true;
    }
    var pick = null;
    for (var s = 3.0; s >= 1.2 - 1e-9 && !pick; s -= 0.05) {
      if (!sepOK(s)) continue;
      var best = null, b0 = boxes(s, 0, 0), mx = [Infinity, -Infinity, Infinity, -Infinity];
      b0.forEach(function (r) { mx = [Math.min(mx[0], r.x0), Math.max(mx[1], r.x1), Math.min(mx[2], r.y0), Math.max(mx[3], r.y1)]; });
      for (var cy = 0; cy <= H; cy += 2) for (var cx = 0; cx <= W; cx += 2) {
        if (cx + mx[0] < SIDE + 2 || cx + mx[1] > W - SIDE - 2 || cy + mx[2] < 2 || cy + mx[3] > H - BOT - 2) continue;
        var L = cx - 764 * s, T = cy - 578 * s; if (L > 0 || L + 1688 * s < W || T > 0 || T + 1097 * s < H) continue;   /* full-bleed */
        var mcx = cx + (mx[0] + mx[1]) / 2, mcy = cy + (mx[2] + mx[3]) / 2, cost = (mcx - tx) * (mcx - tx) + 2 * (mcy - ty) * (mcy - ty);
        if (best && cost >= best.cost) continue;
        if (clear(boxes(s, cx, cy))) best = { cost: cost, cx: cx, cy: cy };
      }
      if (best) pick = { s: +s.toFixed(2), cx: best.cx, cy: best.cy };
    }
    if (!pick) pick = { s: 1.2, cx: tx, cy: ty, failed: true };
    S = pick;
    var rs = document.documentElement.style;
    rs.setProperty('--map-s', String(S.s)); rs.setProperty('--map-cx', S.cx + 'px'); rs.setProperty('--map-cy', S.cy + 'px');
    window.__map = { ok: !pick.failed, s: S.s, cx: S.cx, cy: S.cy, target: [tx, ty] };
  }

  /* Map labels yield to the units: a country or city name (with its dot) that a token, the route's marks or a HUD panel
     edge would cut, or that the screen edge or the side inset would slice, is hidden. */
  function hideLabels() {
    var d = window.__dev, W = d.W, H = d.H, SIDE = Math.max(d.SIDE, 0), hidden = [];
    var obs = Array.prototype.filter.call(document.querySelectorAll('.hud .glass, .u-tok, .u-wp, .u-dest'), function (e) { return e.getClientRects().length && !e.classList.contains('menu'); })
      .map(function (e) { var r = e.getBoundingClientRect(); return { x0: r.left - 2, y0: r.top - 2, x1: r.right + 2, y1: r.bottom + 2, panel: e.classList.contains('glass') }; });
    var units = Array.prototype.map.call(document.querySelectorAll('.labels text'), function (t) {
      var k = t.getAttribute('data-city'); return k === null ? [t] : [t, document.querySelector('.labels circle[data-city="' + k + '"]')]; });
    units.forEach(function (u) {
      u.forEach(function (e) { e.classList.remove('cut'); });
      var bs = u.map(function (e) { var r = e.getBoundingClientRect(), w = parseFloat(e.getAttribute('stroke-width') || 0) / 2 * S.s; return [r.left - w, r.top - w, r.right + w, r.bottom + w]; });
      var b = bs.reduce(function (a, r) { return [Math.min(a[0], r[0]), Math.min(a[1], r[1]), Math.max(a[2], r[2]), Math.max(a[3], r[3])]; });
      if (b[2] <= 0 || b[0] >= W || b[3] <= 0 || b[1] >= H) return;
      var cut = b[0] < SIDE || b[2] > W - SIDE || b[1] < 0 || b[3] > H || obs.some(function (o) {
        var inside = o.panel && b[0] >= o.x0 + 2 && b[2] <= o.x1 - 2 && b[1] >= o.y0 + 2 && b[3] <= o.y1 - 2;
        return !inside && b[2] > o.x0 && b[0] < o.x1 && b[3] > o.y0 && b[1] < o.y1; });
      if (cut) { u.forEach(function (e) { e.classList.add('cut'); }); hidden.push(u[0].textContent); }
    });
    window.__map.hiddenLabels = hidden;
  }

  /* Live (no &t): the clock runs and the western army glides. Light (D-15): frames only while an on-screen unit moves,
     at most 30 a second; at ×10 and above, or with Reduce Motion, the token steps once a game day instead. */
  var LIVE = { on: false, speed: 1, playing: true, last: 0, drawn: 0, timer: 0, raf: 0, loop: true };
  var SPEEDS = [1, 2, 5, 10, 30];
  function reduce() { return window.__motion === 'reduce' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function stepMode() { return LIVE.speed >= 10 || reduce(); }
  function stop() { cancelAnimationFrame(LIVE.raf); clearTimeout(LIVE.timer); LIVE.raf = 0; LIVE.timer = 0; }
  function arrive() { ST.e = DAYS; render(); stop(); if (LIVE.loop) LIVE.timer = setTimeout(function () { ST.e = 0; render(); go(); }, 2500); }
  function go() {
    stop(); if (!LIVE.playing || ST.e === null || ST.e >= DAYS) return;
    if (stepMode()) {
      LIVE.timer = setTimeout(function tick() {
        ST.e = Math.floor(ST.e + 1e-9) + Math.max(1, LIVE.speed / 10);
        if (ST.e >= DAYS) return arrive();
        render(); LIVE.timer = setTimeout(tick, 1000 / Math.min(LIVE.speed, 10));
      }, 1000 / Math.min(LIVE.speed, 10));
      return;
    }
    LIVE.last = performance.now(); LIVE.drawn = 0;
    LIVE.raf = requestAnimationFrame(function frame(now) {
      ST.e += (now - LIVE.last) / 1000 * LIVE.speed; LIVE.last = now;
      if (ST.e >= DAYS) return arrive();
      if (now - LIVE.drawn >= 33) { LIVE.drawn = now; render(); }
      LIVE.raf = requestAnimationFrame(frame);
    });
  }
  function wire() {
    Array.prototype.forEach.call(document.querySelectorAll('.u-tok'), function (t) {
      t.addEventListener('click', function () { ST.sel = ST.sel === t.dataset.u ? null : t.dataset.u; render(); }); });
    $('.o-x').addEventListener('click', function () { ST.sel = null; render(); });
    $('.play').addEventListener('click', function () { LIVE.playing = !LIVE.playing; $('.play').setAttribute('aria-label', LIVE.playing ? 'إيقاف مؤقت (اللعبة تعمل)' : 'تشغيل (اللعبة متوقفة)'); go(); });
    $('.spd').addEventListener('click', function () { LIVE.speed = SPEEDS[(SPEEDS.indexOf(LIVE.speed) + 1) % SPEEDS.length];
      var t = LIVE.speed === 30 ? 'أقصى' : LIVE.speed + '×'; $('.spd .ltr').textContent = t; $('.spd').setAttribute('aria-label', 'السرعة ' + t); go(); });
    $('.o-btn[data-o="halt"]').addEventListener('click', function () { if (ST.sel === ROUTE.unit && ST.e !== null && ST.e < DAYS) { LIVE.playing = false; stop(); } });
    $('.o-btn[data-o="move"]').addEventListener('click', function () { if (ST.sel === ROUTE.unit) { if (ST.e === null || ST.e >= DAYS) ST.e = 0; LIVE.playing = true; render(); go(); } });
  }
  function startUnits() {
    var q = new URLSearchParams(location.search), st = q.get('state') || 'order', t = parseFloat(q.get('t'));
    window.__motion = q.get('motion') === 'reduce' ? 'reduce' : '';
    ST.sel = st === 'idle' ? null : ROUTE.unit;
    ST.e = st === 'idle' ? null : (isFinite(t) ? Math.max(0, Math.min(1, t)) * DAYS : 0);
    render(); placeUnits(); render(); hideLabels();
    if (st !== 'idle' && !isFinite(t)) {
      LIVE.on = true; LIVE.loop = q.get('loop') !== '0';
      var sp = { '1': 1, '2': 2, '5': 5, '10': 10, 'max': 30 }[q.get('speed') || '1'] || 1; LIVE.speed = sp;
      $('.spd .ltr').textContent = sp === 30 ? 'أقصى' : sp + '×'; $('.spd').setAttribute('aria-label', 'السرعة ' + (sp === 30 ? 'أقصى' : sp + '×'));
      wire(); go();
    }
    window.__live = LIVE;
  }
