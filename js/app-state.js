(function () {
  "use strict";

  const root = window.RE59 = window.RE59 || {};
  root.modules = root.modules || {};

  const listeners = new Map();

  root.state = {
    user: null,
    route: "overview",
    routeParams: {},
    selectedPropertyId: null,
    selectedUnitId: null,
    initialized: false
  };

  root.events = {
    on(name, handler) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(handler);
      return () => listeners.get(name)?.delete(handler);
    },
    emit(name, payload) {
      listeners.get(name)?.forEach((handler) => {
        try { handler(payload); } catch (error) { console.error(error); }
      });
    }
  };

  root.config = {
    appName: "59 Real Estate",
    version: "0.7.2",
    dataProvider: "indexeddb",
    inactivityMinutes: 30,
    currency: "QAR",
    locale: "en-QA"
  };
})();
