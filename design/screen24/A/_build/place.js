  /* Composition (screen 24). The card floats at the right, placed in the free band as on page 2 (the band runs from the
     search field's top, the field sitting left of the card, to 12 pt above the bottom row); a card top that would come
     level with the field (less than 8 pt under its bottom) aligns with the field's top. The selected country sits 36 pt
     left of the card at the height of the card's head, or lower where the field above it leaves no room (its top 8 pt
     under the field); the lead line runs from it to the head (placeMap). */
  var EG = { x0: %s, x1: %s, y0: %s, y1: %s, cy: %s, ax: %s, ay: %s };   /* the selected country: Côte d'Ivoire */ window.__EG = EG;
  function placeCard() {
    var root = document.documentElement, card = document.querySelector('.sel');
    var s = document.querySelector('.search').getBoundingClientRect(), b = document.querySelector('.bottom').getBoundingClientRect();
    var y0 = s.top, y1 = b.top - 12;
    root.dataset.cardfit = '0';
    if (card.getBoundingClientRect().height > y1 - y0) root.dataset.cardfit = '1';
    var h = card.getBoundingClientRect().height;
    var top = Math.min(Math.max(y0 + (y1 - y0) * 0.6 - h / 2, y0), y1 - h);
    if (top < s.bottom + 8) top = s.top;
    card.style.top = top + 'px';
    var hd = card.querySelector('.head').getBoundingClientRect(), sc = window.__dev.H / 440;
    var ey = Math.max(hd.top + hd.height / 2, s.bottom + 8 + (EG.ay - EG.y0) * sc);
    window.__band = { y0: y0, y1: y1, ey: ey, head: [hd.top, hd.bottom] };
    window.__card = { y0: y0, y1: y1, h: h, top: top, fits: h <= y1 - y0, fit: +root.dataset.cardfit };
  }
