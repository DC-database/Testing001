(function () {
  "use strict";

  const root = window.RE59;

  const moneyFormatter = new Intl.NumberFormat(root.config.locale, {
    style: "currency",
    currency: root.config.currency,
    maximumFractionDigits: 0
  });

  const compactFormatter = new Intl.NumberFormat(root.config.locale, {
    notation: "compact",
    maximumFractionDigits: 1
  });

  root.utils = {
    money(value) {
      const number = Number(value || 0);
      return moneyFormatter.format(Number.isFinite(number) ? number : 0).replace("QAR", "QAR ");
    },
    compact(value) {
      const number = Number(value || 0);
      return compactFormatter.format(Number.isFinite(number) ? number : 0);
    },
    number(value) {
      return new Intl.NumberFormat(root.config.locale, { maximumFractionDigits: 0 }).format(Number(value || 0));
    },
    percent(value, digits = 1) {
      const number = Number(value || 0);
      return `${number.toFixed(digits)}%`;
    },
    date(value, options) {
      if (!value) return "—";
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return "—";
      return new Intl.DateTimeFormat(root.config.locale, options || {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(date);
    },
    dateTime(value) {
      if (!value) return "—";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "—";
      return new Intl.DateTimeFormat(root.config.locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
    },
    isoDate(value = new Date()) {
      const date = value instanceof Date ? value : new Date(value);
      return date.toISOString().slice(0, 10);
    },
    addMonths(value, months) {
      const date = value instanceof Date ? new Date(value) : new Date(value);
      date.setMonth(date.getMonth() + months);
      return date;
    },
    daysBetween(from, to) {
      const a = new Date(from);
      const b = new Date(to);
      a.setHours(0,0,0,0);
      b.setHours(0,0,0,0);
      return Math.ceil((b - a) / 86400000);
    },
    uid(prefix = "id") {
      if (window.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
      return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    },
    escapeHTML(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    },
    titleCase(value) {
      return String(value || "").replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
    },
    initials(name) {
      return String(name || "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("") || "59";
    },
    debounce(fn, delay = 200) {
      let timer;
      return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
      };
    },
    normalize(value) {
      return String(value || "").trim().toLowerCase();
    },
    safeNumber(value, fallback = 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
  };
})();
