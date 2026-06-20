/* =====================================================================
 * h.js — Hyperscript זעיר (h = createElement)
 * ---------------------------------------------------------------------
 * [UI ספציפי לפלטפורמה / PLATFORM-SPECIFIC]
 * עוזר רינדור קטן בסגנון React.createElement. הקומפוננטות כותבות עצים
 * הצהרתיים: h('div', {class:'x', onClick: fn}, child1, child2).
 * בהמרה ל-React: h(tag, props, ...kids)  ->  <tag {...props}>{kids}</tag>.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  // תגיות SVG — נוצרות ב-namespace הנכון (להטמעת אייקונים מההנדאוף).
  var SVG_TAGS = {
    svg: 1, path: 1, circle: 1, rect: 1, g: 1, line: 1, polyline: 1, polygon: 1,
    ellipse: 1, defs: 1, linearGradient: 1, radialGradient: 1, stop: 1, clipPath: 1, use: 1,
  };

  // h(tag, props, ...children) -> Element
  T.h = function (tag, props) {
    var isSvg = SVG_TAGS[tag] === 1;
    var el = isSvg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
    props = props || {};

    for (var k in props) {
      var v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') {
        if (isSvg) el.setAttribute('class', v); else el.className = v;
      } else if (k === 'style' && typeof v === 'object') {
        for (var s in v) el.style[s] = v[s];
      } else if (k === 'dataset' && typeof v === 'object') {
        for (var d in v) el.dataset[d] = v[d];
      } else if (k.indexOf('on') === 0 && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v); // onClick -> 'click'
      } else if (k === 'value' && !isSvg) {
        el.value = v;
      } else {
        el.setAttribute(k, v === true ? '' : v);
      }
    }

    var kids = Array.prototype.slice.call(arguments, 2);
    flatten(kids).forEach(function (c) {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
    });
    return el;
  };

  function flatten(arr) {
    return arr.reduce(function (acc, x) {
      return acc.concat(Array.isArray(x) ? flatten(x) : x);
    }, []);
  }
})(window.Territory);
