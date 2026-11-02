  /* ---------- Screen 15: the decision modal and the notification centre ----------
     The game is paused (the play button shows play and says so). &state=event: the modal centred in the safe screen
     over the scrim, the HUD inert under it; &state=center: the centre under the toast, down to 8 pt above the dock. */
  var $ = function (sel) { return document.querySelector(sel); };
  function startEvents() {
    var q = new URLSearchParams(location.search), st = q.get('state') === 'center' ? 'center' : 'event', root = document.documentElement, d = window.__dev;
    root.dataset.state = st;
    var play = $('.play'); play.setAttribute('aria-label', 'تشغيل (اللعبة متوقفة)'); play.querySelector('use').setAttribute('href', '#i-play');
    if (st === 'event') {
      Array.prototype.forEach.call(document.querySelectorAll('.hud, .map'), function (e) { e.setAttribute('inert', ''); e.setAttribute('aria-hidden', 'true'); });
      /* the modal: as wide as the safe width allows up to 640 pt, the image column a third of it; centred in the safe screen */
      var safeW = d.W - 2 * Math.max(d.SIDE, 8), w = Math.min(640, safeW - 16), img = Math.round(Math.min(220, w * 0.32));
      root.style.setProperty('--ev-w', w + 'px'); root.style.setProperty('--ev-img', img + 'px');
      var ev = $('.ev'), h = ev.offsetHeight, top0 = Math.max(8, (d.H - d.BOTTOM - h) / 2);
      ev.style.left = Math.round((d.W - w) / 2) + 'px'; ev.style.top = Math.round(top0) + 'px';
      window.__ev = { w: w, img: img, h: h, words: $('.ev-p').textContent.trim().split(/\s+/).length };
    } else {
      /* the centre: the toast's width or 340 pt (the wider), under the toast, down to 8 pt above the dock line */
      var t = $('.toast').getBoundingClientRect(), dk = $('.dock').getBoundingClientRect(), hud = $('.hud').getBoundingClientRect(), nc = $('.nc');
      var w2 = Math.max(340, Math.round(t.width)); root.style.setProperty('--nc-w', w2 + 'px');
      nc.style.left = (t.left - hud.left) + 'px'; nc.style.top = (t.bottom + 8 - hud.top) + 'px';
      nc.style.height = (Math.min(dk.top - 8, d.H) - (t.bottom + 8)) + 'px';
      /* &scroll=end shows the end of the list, &scroll=mid its middle; the fades follow what the edges hide */
      var bd = $('.nc-b'); bd.scrollTop = q.get('scroll') === 'end' ? bd.scrollHeight : q.get('scroll') === 'mid' ? Math.round((bd.scrollHeight - bd.clientHeight) / 2) : 0;
      var over = bd.scrollHeight - bd.clientHeight;
      nc.dataset.ftop = bd.scrollTop > 0.5 ? '1' : '0'; nc.dataset.fbot = bd.scrollTop < over - 0.5 ? '1' : '0';
      window.__nc = { w: w2, over: over, top: bd.scrollTop };
    }
  }
  /* The map: as on the approved play screen (B3); a name a panel edge would cut, or the screen
     edge or the side inset would slice, is hidden (the screens' label rule). */
  function placeMap15() {
    /* the approved play screen's own placement (B3): the CSS defaults for --map-cx and --map-cy, the scale from the height */
    var d = window.__dev, W = d.W, H = d.H, SIDE = Math.max(d.SIDE, 0), s = 0.63 * H / 390;
    var obs = Array.prototype.filter.call(document.querySelectorAll('.hud .glass'), function (e) { return e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.classList.contains('menu'); })
      .map(function (e) { return e.getBoundingClientRect(); }), hidden = [];
    Array.prototype.forEach.call(document.querySelectorAll('.labels text'), function (t) {
      var k = t.getAttribute('data-city'), u = k === null ? [t] : [t, document.querySelector('.labels circle[data-city="' + k + '"]')];
      u.forEach(function (e) { e.classList.remove('cut'); });
      var b = u.map(function (e) { var r = e.getBoundingClientRect(), w = parseFloat(e.getAttribute('stroke-width') || 0) / 2 * s; return [r.left - w - 2, r.top - w - 2, r.right + w + 2, r.bottom + w + 2]; })
        .reduce(function (a, r) { return [Math.min(a[0], r[0]), Math.min(a[1], r[1]), Math.max(a[2], r[2]), Math.max(a[3], r[3])]; });
      if (b[2] <= 0 || b[0] >= W || b[3] <= 0 || b[1] >= H) return;
      var cut = b[0] < SIDE || b[2] > W - SIDE || b[1] < 0 || b[3] > H || obs.some(function (o) {
        var inside = b[0] >= o.left && b[2] <= o.right && b[1] >= o.top && b[3] <= o.bottom;
        return !inside && b[2] > o.left && b[0] < o.right && b[3] > o.top && b[1] < o.bottom; });
      if (cut) { u.forEach(function (e) { e.classList.add('cut'); }); hidden.push(t.textContent); }
    });
    /* a city name that runs into a country's name yields to it */
    var countries = Array.prototype.filter.call(document.querySelectorAll('.labels text:not([data-city])'), function (e) { return !e.classList.contains('cut'); }).map(function (e) { return e.getBoundingClientRect(); });
    Array.prototype.forEach.call(document.querySelectorAll('.labels text[data-city]'), function (t) {
      if (t.classList.contains('cut')) return;
      var r = t.getBoundingClientRect();
      if (countries.some(function (c) { return r.right > c.left && r.left < c.right && r.bottom > c.top && r.top < c.bottom; })) {
        t.classList.add('cut'); document.querySelector('.labels circle[data-city="' + t.getAttribute('data-city') + '"]').classList.add('cut'); hidden.push(t.textContent); }
    });
    window.__map = { s: s, hiddenLabels: hidden };
  }
