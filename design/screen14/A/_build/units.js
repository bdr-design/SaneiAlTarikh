  /* ---------- The military map (D-15) ----------
     Map space is the overlay's 1688 x 1097 (Egypt's box centre (764, 578) sits at --map-cx/--map-cy, scaled by --map-s).
     Units are placed in screen points from their map positions, so they keep their size while the map zooms. */
  var $ = function (sel) { return document.querySelector(sel); };
  var UNITS = {
    west:   { kind: 'army', name: 'المنطقة الغربية', n: 4, at: [659, 434], place: 'مطروح', org: 76 },
    north:  { kind: 'army', name: 'المنطقة الشمالية', n: 4, at: [739, 441], place: 'الإسكندرية', org: 75 },
    cairo:  { kind: 'stack', name: 'القاهرة', n: 6, at: [777, 478], parts: [['المنطقة المركزية', 5], ['الحرس الجمهوري', 1]] },
    second: { kind: 'army', name: 'الجيش الثاني الميداني', n: 7, at: [810, 450], place: 'القناة', org: 80 },
    third:  { kind: 'army', name: 'الجيش الثالث الميداني', n: 6, at: [816, 481], place: 'السويس', org: 78 },
    fleet:  { kind: 'ship', name: 'أسطول المتوسط', n: 10, at: [735, 411], place: 'الإسكندرية' },
    air:    { kind: 'plane', name: 'مجموعة جوية', n: 24, at: [773, 509], place: 'بني سويف' }
  };
  /* the western army's route: from Marsa Matruh down the desert road (one waypoint) to the Siwa oasis near the Libyan border */
  var ROUTE = { unit: 'west', pts: [[659, 434], [637, 468], [608, 504]], to: 'سيوة' };
  var KM = { x: 3.23, y: 3.40 }, KMDAY = 40;                 /* km per map unit (at 31° N); a march of 40 km a day */
  var legs = [], TOTAL = 0;
  for (var i = 1; i < ROUTE.pts.length; i++) {
    var a = ROUTE.pts[i - 1], b = ROUTE.pts[i], km = Math.hypot((b[0] - a[0]) * KM.x, (b[1] - a[1]) * KM.y);
    legs.push({ a: a, b: b, km: km, from: TOTAL }); TOTAL += km;
  }
  var MARCH_DAYS = TOTAL / KMDAY;                                  /* the whole march in days */
  function along(k) {                                        /* the point at a distance along the route (map space) */
    k = Math.max(0, Math.min(TOTAL, k));
    for (var i = 0; i < legs.length; i++) { var L = legs[i]; if (k <= L.from + L.km + 1e-9) { var f = (k - L.from) / L.km; return [L.a[0] + (L.b[0] - L.a[0]) * f, L.a[1] + (L.b[1] - L.a[1]) * f]; } }
    return ROUTE.pts[ROUTE.pts.length - 1];
  }
  function ar(n, one, two, few, many) { return n === 1 ? one : n === 2 ? two : (n >= 3 && n <= 10 ? n + ' ' + few : n + ' ' + many); }
  function fm(n) { return ar(n, 'تشكيل واحد', 'تشكيلان', 'تشكيلات', 'تشكيلًا'); }
  function what(u) { return u.kind === 'ship' ? ar(u.n, 'سفينة', 'سفينتان', 'سفن', 'سفينة') : u.kind === 'plane' ? ar(u.n, 'طائرة', 'طائرتان', 'طائرات', 'طائرة') : fm(u.n); }
  var MONTH = 'يناير', DOW = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  var S = { s: 1, cx: 0, cy: 0 };                            /* the map placement */
  function scr(p) { return [S.cx + (p[0] - 764) * S.s, S.cy + (p[1] - 578) * S.s]; }
  function tokEl(id) { return $('.u-tok[data-u="' + id + '"]'); }

  /* The state: the selected unit; the game clock (days since 1 January 2011) and the days the western army has marched
     (null: not ordered); halted: the army holds where it is while the clock runs. */
  var ST = { sel: null, clock: 0, e: null, halted: false };
  function moving() { return ST.e !== null && ST.e < MARCH_DAYS - 1e-9; }
  /* the arrival: the day the march ends, counted on the HUD's dates (so «بعد N» and the date on arrival agree) */
  function arrivalIn() { return Math.floor(ST.clock + (MARCH_DAYS - ST.e) + 1e-9) - Math.floor(ST.clock + 1e-9); }
  function arrivalText() { var n = arrivalIn(); return n === 0 ? 'الوصول اليوم' : 'الوصول بعد ' + ar(n, 'يوم', 'يومين', 'أيام', 'يومًا'); }

  /* VoiceOver: each unit reads its name, strength and where it is or goes */
  function tokLabel(id) {
    var u = UNITS[id];
    if (u.kind === 'stack') return u.name + ': جيشان، ' + fm(u.n) + '، ' + u.parts.map(function (p) { return p[0] + ' ' + fm(p[1]); }).join(' و') + '. يعرض الجيشين';
    var where = u.place;
    if (id === ROUTE.unit && ST.e !== null) where = !moving() ? 'في ' + ROUTE.to : ST.halted ? 'على طريق ' + ROUTE.to + '، الأمر: توقّف' : 'في الطريق إلى ' + ROUTE.to + '، ' + arrivalText();
    return u.name + '، مصر: ' + what(u) + '، ' + where;
  }

  function drawDate() {
    var day = 1 + Math.max(0, Math.floor(ST.clock + 1e-9));
    window.__setDate(DOW[(day - 1) % 7], day + ' ' + MONTH + ' 2011');   /* the HUD's date setter (fit 5 moves the year up) */
  }
  /* one map frame: the units, the route ahead, the bar (counted in window.__frames) */
  function render() {
    var root = document.documentElement, mv = moving();
    root.dataset.sel = ST.sel ? '1' : '0';
    root.dataset.route = ST.sel === ROUTE.unit && mv ? '1' : '0';
    Object.keys(UNITS).forEach(function (id) {
      var t = tokEl(id), p = id === ROUTE.unit && ST.e !== null ? along(ST.e * KMDAY) : UNITS[id].at, q = scr(p);
      var im = t.querySelector('.u-img');                     /* the image's centre is the unit's place */
      t.style.left = (q[0] - t.offsetWidth / 2) + 'px'; t.style.top = (q[1] - (t.offsetHeight - im.offsetHeight / 2)) + 'px';
      t.setAttribute('aria-pressed', String(ST.sel === id));
      t.setAttribute('aria-label', tokLabel(id));
    });
    if (root.dataset.route === '1') drawRoute();
    drawDate();
    if (ST.sel) drawBar();
    window.__frames = (window.__frames || 0) + 1;
    window.__units = { sel: ST.sel, e: ST.e, clock: ST.clock, halted: ST.halted, days: MARCH_DAYS, km: TOTAL, moving: mv, s: S.s };
  }
  /* the route still ahead: from the unit through the waypoints not yet passed to the destination; the line stops at the
     arrowhead's base, so neither it nor its halo pokes past the tip */
  function drawRoute() {
    var k = ST.e * KMDAY, pts = [along(k)].concat(ROUTE.pts.slice(1).filter(function (p, i) { return legs[i].from + legs[i].km > k + 1e-9; })).map(scr);
    var z = pts[pts.length - 1], y = pts[pts.length - 2], ang = Math.atan2(z[1] - y[1], z[0] - y[0]), h = 9, w = 5;
    var base = [z[0] - h * Math.cos(ang), z[1] - h * Math.sin(ang)], line = pts.slice(0, -1).concat([base]);
    var d = 'M' + line.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('L');
    $('.route .halo').setAttribute('d', d); $('.route .line').setAttribute('d', d);
    var bl = [base[0] + w * Math.sin(ang), base[1] - w * Math.cos(ang)], br = [base[0] - w * Math.sin(ang), base[1] + w * Math.cos(ang)];
    $('.route .head').setAttribute('d', 'M' + [z, bl, br].map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('L') + 'Z');
    var wp = $('.u-wp'), passed = legs[0].from + legs[0].km <= k + 1e-9, wq = scr(ROUTE.pts[1]);
    wp.style.display = passed ? 'none' : ''; wp.style.left = (wq[0] - 10) + 'px'; wp.style.top = (wq[1] - 10) + 'px';
    var ds = $('.u-dest'), r = destBox(ds.offsetWidth, ds.offsetHeight, S.s, S.cx, S.cy);
    ds.style.left = r.x0 + 'px'; ds.style.top = r.y0 + 'px';
  }
  /* the destination's name sits on the side away from the last leg (below it when the leg comes down to it), 8 pt off */
  function destSide() { var a = ROUTE.pts[ROUTE.pts.length - 2], b = ROUTE.pts[ROUTE.pts.length - 1], dx = b[0] - a[0], dy = b[1] - a[1];
    return Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? 'below' : 'above') : (dx > 0 ? 'right' : 'left'); }
  function destBox(w, h, s, cx, cy) {
    var p = ROUTE.pts[ROUTE.pts.length - 1], x = cx + (p[0] - 764) * s, y = cy + (p[1] - 578) * s, side = destSide();
    if (side === 'below') return { x0: x - w / 2, x1: x + w / 2, y0: y + 8, y1: y + 8 + h };
    if (side === 'above') return { x0: x - w / 2, x1: x + w / 2, y0: y - 8 - h, y1: y - 8 };
    if (side === 'right') return { x0: x + 8, x1: x + 8 + w, y0: y - h / 2, y1: y + h / 2 };
    return { x0: x - 8 - w, x1: x - 8, y0: y - h / 2, y1: y + h / 2 };
  }
  /* the order bar: the unit, its line, and the order in force (white) */
  function drawBar() {
    var u = UNITS[ST.sel], name = u.name, sub, on = null, stack = u.kind === 'stack';
    if (stack) { name = u.name + ': جيشان'; sub = u.parts.map(function (p) { return p[0] + ' ' + fm(p[1]); }).join(' · '); }
    else if (ST.sel === ROUTE.unit && ST.e !== null) {
      if (!moving()) { sub = what(u) + ' · في ' + ROUTE.to; on = 'halt'; }
      else if (ST.halted) { sub = what(u) + ' · على طريق ' + ROUTE.to + ' · الأمر: توقّف'; on = 'halt'; }
      else { sub = what(u) + ' · إلى ' + ROUTE.to + ' · ' + arrivalText(); on = 'move'; }
    } else sub = what(u) + ' · ' + u.place + (u.org ? ' · التنظيم ' + u.org + '%' : '');
    $('.o-name').textContent = name; $('.o-sub').textContent = sub;
    $('.o-unit').setAttribute('aria-label', name + '، ' + sub.split(' · ').join('، '));
    Array.prototype.forEach.call(document.querySelectorAll('.o-btn[data-o]'), function (b) {
      var o = b.dataset.o, isOn = o === on; b.classList.toggle('on', isOn);
      if (o === 'attack') return;                              /* locked: no war */
      /* a stack takes no order until one of its two armies is chosen */
      if (stack) { b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-label', b.textContent.trim() + ': اختر أحد الجيشين أولًا'); b.removeAttribute('aria-pressed'); }
      else { b.removeAttribute('aria-disabled'); b.removeAttribute('aria-label'); b.setAttribute('aria-pressed', String(isOn)); }
    });
  }

  /* Placement: the largest zoom at which every unit (with its 44 pt hit box), the whole route swept by the moving unit,
     the waypoint and the destination's name stay inside the safe screen, clear of every HUD panel (8 pt for their hit
     boxes), with no two unit hit boxes touching; then the position nearest the middle of the free map. */
  function placeUnits() {
    var d = window.__dev, W = d.W, H = d.H, SIDE = Math.max(d.SIDE, 0), BOT = d.BOTTOM, PAD = 8;
    var obs = Array.prototype.filter.call(document.querySelectorAll('.hud .glass'), function (e) { return !e.classList.contains('menu') && !e.classList.contains('o-tip') && e.getClientRects().length; })
      .map(function (e) { var r = e.getBoundingClientRect(); return { x0: r.left - PAD, y0: r.top - PAD, x1: r.right + PAD, y1: r.bottom + PAD }; });
    var top = $('.top').getBoundingClientRect(), bar = ($('.orders').getClientRects().length ? $('.orders') : $('.dock')).getBoundingClientRect();
    var tx = W / 2, ty = (top.bottom + bar.top) / 2;
    /* a unit's box (its hit box: at least 44 x 44) is centred above its place by half its tag */
    function tb(t) { var h = Math.max(t.offsetHeight, 44); return { hw: Math.max(t.offsetWidth, 44) / 2, hh: h / 2, oy: t.offsetHeight / 2 - (t.offsetHeight - t.querySelector('.u-img').offsetHeight / 2) }; }
    var objs = Object.keys(UNITS).map(function (id) { var b = tb(tokEl(id)); return { p: UNITS[id].at, hw: b.hw, hh: b.hh, oy: b.oy, id: id }; });
    var wb = tb(tokEl(ROUTE.unit));
    for (var k = 0; k <= TOTAL; k += 6) objs.push({ p: along(k), hw: wb.hw, hh: wb.hh, oy: wb.oy });
    objs.push({ p: ROUTE.pts[1], hw: 10, hh: 10 });
    var dst = $('.u-dest'), dw = dst.offsetWidth, dh = dst.offsetHeight;
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
        return { x0: x - o.hw, x1: x + o.hw, y0: y - o.hh, y1: y + o.hh }; }).concat([destBox(dw, dh, s, cx, cy)]);
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

  /* Map labels at this zoom keep the size they have on the play screen (the game draws them from a glyph atlas at screen
     size). A city name a unit covers moves under that unit (its dot is the unit itself); any name still cut by a unit, a
     route mark or a panel edge, or sliced by the screen edge or the side inset, is hidden. */
  function placeLabels() {
    var d = window.__dev, W = d.W, H = d.H, SIDE = Math.max(d.SIDE, 0), hidden = [], moved = [];
    var s0 = 0.63 * H / 390, k = s0 / S.s, mr = $('.map').getBoundingClientRect(), mk = mr.width / 1688;
    Array.prototype.forEach.call(document.querySelectorAll('.labels text, .labels circle'), function (e) {
      ['font-size', 'stroke-width', 'r'].forEach(function (a) { if (e.hasAttribute(a)) e.setAttribute(a, String(+(parseFloat(e.getAttribute(a)) * k).toFixed(3))); });
    });
    var obs = function () { return Array.prototype.filter.call(document.querySelectorAll('.hud .glass, .u-tok, .u-wp, .u-dest'), function (e) { return e.getClientRects().length && !e.classList.contains('menu') && !e.classList.contains('o-tip'); })
      .map(function (e) { var r = e.getBoundingClientRect(); return { x0: r.left - 2, y0: r.top - 2, x1: r.right + 2, y1: r.bottom + 2, panel: e.classList.contains('glass'), tok: e.classList.contains('u-tok') ? e : null }; }); };
    function bbox(u) { var bs = u.map(function (e) { var r = e.getBoundingClientRect(), w = parseFloat(e.getAttribute('stroke-width') || 0) / 2 * S.s; return [r.left - w, r.top - w, r.right + w, r.bottom + w]; });
      return bs.reduce(function (a, r) { return [Math.min(a[0], r[0]), Math.min(a[1], r[1]), Math.max(a[2], r[2]), Math.max(a[3], r[3])]; }); }
    function hits(b, O) { return O.filter(function (o) { var inside = o.panel && b[0] >= o.x0 + 2 && b[2] <= o.x1 - 2 && b[1] >= o.y0 + 2 && b[3] <= o.y1 - 2;
      return !inside && b[2] > o.x0 && b[0] < o.x1 && b[3] > o.y0 && b[1] < o.y1; }); }
    function sliced(b) { return b[0] < SIDE || b[2] > W - SIDE || b[1] < 0 || b[3] > H; }
    var O = obs();
    Array.prototype.forEach.call(document.querySelectorAll('.labels text'), function (t) {
      var key = t.getAttribute('data-city'), dot = key === null ? null : document.querySelector('.labels circle[data-city="' + key + '"]'), u = dot ? [t, dot] : [t];
      u.forEach(function (e) { e.classList.remove('cut'); });
      var b = bbox(u); if (b[2] <= 0 || b[0] >= W || b[3] <= 0 || b[1] >= H) return;
      var hs = hits(b, O);
      if (!hs.length && !sliced(b)) return;
      var tok = dot && hs.length && hs.every(function (o) { return o.tok; }) ? hs[0].tok : null;
      if (tok) {                                                /* move the name next to the unit that covers it: under, left, right or above */
        var r = tok.getBoundingClientRect(), im = tok.querySelector('.u-img').getBoundingClientRect(), cxm = (r.left + r.right) / 2;
        dot.classList.add('cut'); t.removeAttribute('direction');
        var sides = [['middle', cxm, 'top', r.bottom + 3], ['end', r.left - 3, 'mid', (im.top + im.bottom) / 2], ['start', r.right + 3, 'mid', (im.top + im.bottom) / 2], ['middle', cxm, 'bottom', r.top - 3]];
        for (var si = 0; si < sides.length; si++) {
          var sd = sides[si];
          t.setAttribute('text-anchor', sd[0]); t.setAttribute('x', ((sd[1] - mr.left) / mk).toFixed(1)); t.setAttribute('y', ((im.top - mr.top) / mk).toFixed(1));
          var nb = bbox([t]), want = sd[2] === 'top' ? sd[3] - nb[1] : sd[2] === 'bottom' ? sd[3] - nb[3] : sd[3] - (nb[1] + nb[3]) / 2;   /* shift the box (halo included) into place */
          t.setAttribute('y', (parseFloat(t.getAttribute('y')) + want / mk).toFixed(1));
          nb = bbox([t]);
          if (!hits(nb, O).length && !sliced(nb)) { moved.push(t.textContent); return; }
        }
      }
      u.forEach(function (e) { e.classList.add('cut'); }); hidden.push(t.textContent);
    });
    window.__map.hiddenLabels = hidden; window.__map.movedLabels = moved;
  }

  /* Live (no &t): the clock runs and the western army glides. Light (D-15): map frames only while an on-screen unit
     moves, at most 30 a second; at ×10 and above, or with Reduce Motion, the unit steps once a game day instead. With
     nothing moving the clock still turns the HUD's date, once a game day at most 4 times a second, and draws no map
     frame. */
  var LIVE = { on: false, speed: 1, playing: true, last: 0, drawn: 0, timer: 0, raf: 0, loop: true, tip: 0 };
  var SPEEDS = [1, 2, 5, 10, 30];
  function reduce() { return window.__motion === 'reduce' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function gliding() { return moving() && !ST.halted && LIVE.speed < 10 && !reduce(); }
  function stop() { cancelAnimationFrame(LIVE.raf); clearTimeout(LIVE.timer); LIVE.raf = 0; LIVE.timer = 0; }
  function advance(dd) {                                       /* the clock moves dd days; the army marches with it */
    var was = Math.floor(ST.clock + 1e-9), mv = moving() && !ST.halted;
    ST.clock += dd;
    if (mv) { ST.e = Math.min(MARCH_DAYS, ST.e + dd); return 'map'; }
    return Math.floor(ST.clock + 1e-9) !== was ? 'date' : '';
  }
  function arrived() { if (LIVE.loop) { clearTimeout(LIVE.timer); LIVE.timer = setTimeout(function () { ST.clock = 0; ST.e = 0; ST.halted = false; render(); go(); }, 2500); } }
  function go() {
    stop(); if (!LIVE.playing) return;
    if (gliding()) {
      LIVE.last = performance.now();
      var frame = function (now) {
        advance(Math.max(0, now - LIVE.last) / 1000 * LIVE.speed); LIVE.last = now; LIVE.raf = 0;
        render();
        if (!moving()) { go(); arrived(); return; }
        /* the next frame no sooner than 34 ms after this one (≤30 a second whatever the display's rate) */
        LIVE.timer = setTimeout(function () { LIVE.raf = requestAnimationFrame(frame); }, Math.max(0, 34 - (performance.now() - now)));
      };
      LIVE.timer = setTimeout(function () { LIVE.raf = requestAnimationFrame(frame); }, 33);
      return;
    }
    /* steps: a wake every game day (×1–×10), 10 a second at «أقصى» with 3 days each; the date alone at most 4 a second */
    var mv = moving() && !ST.halted, perSec = mv ? Math.min(LIVE.speed, 10) : Math.min(LIVE.speed, 4), dd = LIVE.speed / perSec;
    LIVE.timer = setTimeout(function tick() {
      var r = advance(dd);
      if (r === 'map') { render(); if (!moving()) { go(); arrived(); return; } } else if (r === 'date') drawDate();
      LIVE.timer = setTimeout(tick, 1000 / perSec);
    }, 1000 / perSec);
  }
  function setPlaying(p) { LIVE.playing = p; var b = $('.play'); b.setAttribute('aria-label', p ? 'إيقاف مؤقت (اللعبة تعمل)' : 'تشغيل (اللعبة متوقفة)'); b.querySelector('use').setAttribute('href', p ? '#i-pause' : '#i-play'); go(); }
  function showTip(on) { var t = $('.o-tip'), a = $('.o-btn[data-o="attack"]').getBoundingClientRect(), hud = $('.hud').getBoundingClientRect();
    t.hidden = !on; if (on) { t.style.left = ((a.left + a.right) / 2 - hud.left - t.offsetWidth / 2) + 'px'; } }
  function wire() {
    var last = null;
    Array.prototype.forEach.call(document.querySelectorAll('.u-tok'), function (t) {
      t.addEventListener('click', function () { ST.sel = ST.sel === t.dataset.u ? null : t.dataset.u; last = t; showTip(false); render(); }); });
    $('.o-x').addEventListener('click', function () { var t = last || tokEl(ST.sel || ROUTE.unit); ST.sel = null; showTip(false); render(); if (t) t.focus(); });
    $('.play').addEventListener('click', function () { setPlaying(!LIVE.playing); });
    $('.spd').addEventListener('click', function () { LIVE.speed = SPEEDS[(SPEEDS.indexOf(LIVE.speed) + 1) % SPEEDS.length];
      var t = LIVE.speed === 30 ? 'أقصى' : LIVE.speed + '×'; $('.spd .ltr').textContent = t; $('.spd').setAttribute('aria-label', 'السرعة ' + t); go(); });
    $('.o-btn[data-o="halt"]').addEventListener('click', function () { if (ST.sel === ROUTE.unit && moving()) { ST.halted = true; render(); go(); } });
    $('.o-btn[data-o="move"]').addEventListener('click', function () { if (ST.sel === ROUTE.unit) { if (ST.e === null || !moving()) ST.e = 0; ST.halted = false; render(); go(); } });
    $('.o-btn[data-o="attack"]').addEventListener('click', function () { showTip(true); clearTimeout(LIVE.tip); LIVE.tip = setTimeout(function () { showTip(false); }, 2500); });
  }
  function startUnits() {
    var q = new URLSearchParams(location.search), st = q.get('state') || 'order', t = parseFloat(q.get('t'));
    window.__motion = q.get('motion') === 'reduce' ? 'reduce' : '';
    ST.sel = st === 'idle' ? null : ROUTE.unit;
    ST.e = st === 'idle' ? null : (isFinite(t) ? Math.max(0, Math.min(1, t)) * MARCH_DAYS : 0);
    ST.clock = ST.e || 0;                                      /* the frozen views: the march began on 1 January */
    ST.halted = q.get('halt') === '1' && moving();
    render(); placeUnits(); render(); placeLabels();
    showTip(q.get('tip') === '1');
    if (st !== 'idle' && !isFinite(t)) {
      LIVE.on = true; LIVE.loop = q.get('loop') !== '0';
      var sp = { '1': 1, '2': 2, '5': 5, '10': 10, 'max': 30 }[q.get('speed') || '1'] || 1; LIVE.speed = sp;
      $('.spd .ltr').textContent = sp === 30 ? 'أقصى' : sp + '×'; $('.spd').setAttribute('aria-label', 'السرعة ' + (sp === 30 ? 'أقصى' : sp + '×'));
      wire(); go();
    }
    window.__live = LIVE;
  }
