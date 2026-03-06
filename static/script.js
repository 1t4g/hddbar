const scanField = document.getElementById("scanField");
const scanHint = document.getElementById("scanHint");
const totalCount = document.getElementById("totalCount");
const doneCount = document.getElementById("doneCount");

const exportBtn = document.getElementById("exportBtn");
const exportMenu = document.getElementById("exportMenu");

const openUpload = document.getElementById("openUpload");
const uploadModal = document.getElementById("uploadModal");
const fileUpload = document.getElementById("fileUpload");
const textUpload = document.getElementById("textUpload");
const doUpload = document.getElementById("doUpload");
const uploadResult = document.getElementById("uploadResult");

const erasedSet = window.__ERASED__ instanceof Set ? window.__ERASED__ : new Set();

function qsAll(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function focusScanner() {
  if (scanField) scanField.focus({ preventScroll: true });
}

function setHint(text, kind = "info") {
  if (!scanHint) return;
  scanHint.textContent = text || "";
  scanHint.dataset.kind = kind;
}

function normalizeCode(code) {
  return (code || "").trim();
}

function markRowDone(code) {
  const row = document.querySelector(`tr[data-sn="${CSS.escape(code)}"]`);
  if (!row) return false;
  row.classList.add("row--done");
  const check = row.querySelector(".check");
  if (check) {
    check.classList.remove("check--empty");
    check.setAttribute("aria-label", "Знищено");
    check.setAttribute("title", "Знищено");
  }
  return true;
}

function updateCounts() {
  if (!doneCount) return;
  doneCount.textContent = String(erasedSet.size);
  if (totalCount) totalCount.textContent = String(qsAll("tbody tr.row").length);
}

async function scan(code) {
  const clean = normalizeCode(code);
  if (!clean) return;

  setHint(`Сканую: ${clean}`, "info");

  const r = await fetch("/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: clean }),
  });

  const res = await r.json().catch(() => ({}));

  if (res.status === "ok") {
    erasedSet.add(clean);
    const found = markRowDone(clean);
    updateCounts();
    softBeep("ok");
    setHint(found ? "Знайдено і відмічено" : "Відмічено (але рядок не знайдено у таблиці)", found ? "ok" : "warn");
    return;
  }

  if (res.status === "duplicate") {
    softBeep("warn");
    setHint("Уже було відмічено раніше", "warn");
    return;
  }

  if (res.status === "not_found") {
    softBeep("error");
    setHint("SN не знайдено у завантаженому списку", "error");
    return;
  }

  if (res.status === "unauthorized") {
    location.href = "/login";
    return;
  }

  softBeep("error");
  setHint("Помилка сканування", "error");
}

function softBeep(kind) {
  // Avoid external URLs (offline friendly) + keep it subtle.
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = kind === "ok" ? 880 : kind === "warn" ? 440 : 220;
  g.gain.value = 0.03;
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  setTimeout(() => {
    o.stop();
    ctx.close?.();
  }, kind === "ok" ? 60 : 120);
}

if (scanField) {
  // Scanner acts like keyboard + sends ENTER.
  scanField.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const code = scanField.value;
    scanField.value = "";
    scan(code);
  });

  // Keep focus so scans always go to the field.
  scanField.addEventListener("blur", () => setTimeout(focusScanner, 0));
  window.addEventListener("load", () => setTimeout(focusScanner, 50));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) setTimeout(focusScanner, 50);
  });
  document.addEventListener("click", (e) => {
    // Don't steal focus when interacting with modal inputs.
    if (uploadModal && !uploadModal.hidden && uploadModal.contains(e.target)) return;
    setTimeout(focusScanner, 0);
  });
}

// Export menu
if (exportBtn && exportMenu) {
  exportBtn.addEventListener("click", () => {
    exportMenu.hidden = !exportMenu.hidden;
  });
  document.addEventListener("click", (e) => {
    if (exportMenu.hidden) return;
    if (exportBtn.contains(e.target) || exportMenu.contains(e.target)) return;
    exportMenu.hidden = true;
  });
  exportMenu.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-export]");
    if (!btn) return;
    exportMenu.hidden = true;
    location.href = btn.dataset.export;
  });
}

// Upload modal
function closeUpload() {
  if (!uploadModal) return;
  uploadModal.hidden = true;
  uploadResult.textContent = "";
  focusScanner();
}
function openUploadModal() {
  if (!uploadModal) return;
  uploadModal.hidden = false;
  fileUpload?.focus?.();
}

if (openUpload) openUpload.addEventListener("click", openUploadModal);
if (uploadModal) {
  uploadModal.addEventListener("click", (e) => {
    if (e.target?.dataset?.close) closeUpload();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && uploadModal && !uploadModal.hidden) closeUpload();
  });
}

async function doUploadRequest() {
  uploadResult.textContent = "Завантаження...";

  const fd = new FormData();
  const f = fileUpload?.files?.[0];
  const t = (textUpload?.value || "").trim();

  if (f) fd.append("file", f);
  if (!f && t) fd.append("text", t);

  if (!f && !t) {
    uploadResult.textContent = "Оберіть файл або вставте список SN.";
    return;
  }

  const r = await fetch("/upload", { method: "POST", body: fd });
  const res = await r.json().catch(() => ({}));

  if (res.status === "ok") {
    uploadResult.textContent = `OK. Додано: ${res.added ?? 0}, пропущено (дублі): ${res.skipped ?? 0}. Оновлюю...`;
    setTimeout(() => location.reload(), 400);
    return;
  }

  if (res.status === "unauthorized") {
    location.href = "/login";
    return;
  }

  uploadResult.textContent = "Помилка завантаження.";
}

if (doUpload) doUpload.addEventListener("click", doUploadRequest);

updateCounts();