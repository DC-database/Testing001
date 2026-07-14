(function () {
  "use strict";

  const root = window.RE59;
  const u = root.utils;

  function toast(message, type = "default", duration = 3200) {
    const rootEl = document.getElementById("toast-root");
    const item = document.createElement("div");
    item.className = `toast ${type}`;
    item.textContent = message;
    rootEl.appendChild(item);
    setTimeout(() => item.remove(), duration);
  }

  function showLoading(message = "Preparing portfolio…") {
    const overlay = document.getElementById("loading-overlay");
    overlay.querySelector("span").textContent = message;
    overlay.classList.remove("is-hidden");
  }

  function hideLoading() {
    document.getElementById("loading-overlay").classList.add("is-hidden");
  }

  function setPageHeader(title, eyebrow = "59 REAL ESTATE") {
    const pageTitle = document.getElementById("page-title");
    const pageEyebrow = document.getElementById("page-eyebrow");
    const mobileTitle = document.getElementById("mobile-page-title");
    if (pageTitle) pageTitle.textContent = title;
    if (pageEyebrow) pageEyebrow.textContent = eyebrow;
    if (mobileTitle) mobileTitle.textContent = title;
    document.title = `${title} · 59 Real Estate`;
  }

  function openModal({ title, eyebrow = "59 REAL ESTATE", content = "", size = "", footer = "", onOpen } = {}) {
    const modalRoot = document.getElementById("modal-root");
    modalRoot.innerHTML = `
      <section class="modal ${size ? `modal-${size}` : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header class="modal-header">
          <div><div class="eyebrow">${u.escapeHTML(eyebrow)}</div><h2 id="modal-title">${u.escapeHTML(title || "Details")}</h2></div>
          <button type="button" class="icon-button modal-close" aria-label="Close">×</button>
        </header>
        <div class="modal-body">${content}</div>
        ${footer ? `<footer class="modal-footer">${footer}</footer>` : ""}
      </section>`;
    const modal = modalRoot.querySelector(".modal");
    const close = () => {
      modalRoot.innerHTML = "";
      document.removeEventListener("keydown", keyHandler);
    };
    const keyHandler = (event) => { if (event.key === "Escape") close(); };
    modalRoot.querySelector(".modal-close").addEventListener("click", close);
    modalRoot.addEventListener("mousedown", (event) => { if (event.target === modalRoot) close(); }, { once: true });
    document.addEventListener("keydown", keyHandler);
    onOpen?.(modal, close);
    return { modal, close };
  }

  function confirm({ title = "Confirm action", message = "Are you sure?", confirmLabel = "Confirm", danger = false } = {}) {
    return new Promise((resolve) => {
      const instance = openModal({
        title,
        eyebrow: "CONFIRMATION",
        content: `<div class="callout ${danger ? "danger" : ""}">${u.escapeHTML(message)}</div>`,
        footer: `<button type="button" class="button button-secondary" data-cancel>Cancel</button><button type="button" class="button ${danger ? "button-danger" : "button-primary"}" data-confirm>${u.escapeHTML(confirmLabel)}</button>`
      });
      instance.modal.querySelector("[data-cancel]").addEventListener("click", () => { instance.close(); resolve(false); });
      instance.modal.querySelector("[data-confirm]").addEventListener("click", () => { instance.close(); resolve(true); });
    });
  }

  function printDocument(title, bodyHTML) {
    const popup = window.open("", "_blank", "width=1100,height=820");
    if (!popup) {
      toast("Pop-up blocked. Allow pop-ups to print this document.", "error");
      return;
    }
    const logoMark = new URL("assets/59.svg", window.location.href).href;
    const logoWord = new URL("assets/RE.svg", window.location.href).href;
    const brandedBody = String(bodyHTML || "").replaceAll('<div class="brand">59 REAL ESTATE</div>', `<div class="brand"><img class="brand-mark-print" src="${logoMark}" alt="59"><img class="brand-word-print" src="${logoWord}" alt="Real Estate"></div>`);
    popup.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${u.escapeHTML(title)}</title>
      <style>
        @page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;font-size:12px}header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #111;padding-bottom:16px;margin-bottom:22px}.brand{display:flex;align-items:center;gap:10px}.brand img{display:block;object-fit:contain}.brand-mark-print{width:38px;height:44px}.brand-word-print{width:115px;height:18px;filter:brightness(0)}.muted{color:#666}.title{font-size:22px;margin:0 0 6px}.meta{text-align:right}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:0;border:1px solid #bbb}.item{padding:10px;border-bottom:1px solid #ddd}.item:nth-child(odd){border-right:1px solid #ddd}.item span{display:block;color:#777;font-size:9px;text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px}.item strong{font-size:12px}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#eee;font-size:9px;text-transform:uppercase;letter-spacing:.5px}.amount{font-size:30px;font-weight:900;margin:16px 0}.signature-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:70px}.signature{border-top:1px solid #111;padding-top:7px}.footer{margin-top:24px;padding-top:12px;border-top:1px solid #ccc;color:#777;font-size:9px}.page-break{page-break-before:always}@media print{button{display:none}}
      </style></head><body>${brandedBody}<script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
    popup.document.close();
  }

  function downloadJSON(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function emptyState(title, message) {
    return `<div class="empty-state"><div><strong>${u.escapeHTML(title)}</strong><span>${u.escapeHTML(message)}</span></div></div>`;
  }

  root.ui = {
    toast,
    showLoading,
    hideLoading,
    setPageHeader,
    openModal,
    confirm,
    printDocument,
    downloadJSON,
    emptyState
  };
})();
