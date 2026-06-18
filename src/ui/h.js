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

  // h(tag, props, ...children) -> HTMLElement
  T.h = function (tag, props) {
    var el = document.createElement(tag);
    props = props || {};

    for (var k in props) {
      var v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') {
        el.className = v;
      } else if (k === 'style' && typeof v === 'object') {
        for (var s in v) el.style[s] = v[s];
      } else if (k === 'dataset' && typeof v === 'object') {
        for (var d in v) el.dataset[d] = v[d];
      } else if (k.indexOf('on') === 0 && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v); // onClick -> 'click'
      } else if (k === 'value') {
        el.value = v;
      } else {
        el.setAttribute(k, v === true ? '' : v);
      }
    }

    // children: שטוח, מדלג על null/false, ממיר טקסט.
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
