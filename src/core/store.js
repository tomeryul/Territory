/* =====================================================================
 * store.js — Store מרוכז (תבנית store פשוטה, Redux-like)
 * ---------------------------------------------------------------------
 * [לוגיקה ניידת / PORTABLE LOGIC]
 * מקור אמת יחיד ל-state. getState / dispatch / subscribe.
 * אין כאן DOM. ממופה ל-Redux store / Zustand ב-React, או Provider ב-Flutter.
 * ===================================================================== */

window.Territory = window.Territory || {};

(function (T) {
  'use strict';

  T.createStore = function (reducer, initialState) {
    var state = initialState;
    var listeners = [];

    function getState() {
      return state;
    }

    function dispatch(action) {
      state = reducer(state, action); // reducer טהור
      for (var i = 0; i < listeners.length; i++) listeners[i](state);
    }

    function subscribe(listener) {
      listeners.push(listener);
      return function unsubscribe() {
        var idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    }

    return { getState: getState, dispatch: dispatch, subscribe: subscribe };
  };
})(window.Territory);
