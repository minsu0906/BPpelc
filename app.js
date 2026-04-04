const LEGACY_APP_URL =
  "https://cdn.jsdelivr.net/gh/minsu0906/BPpelc@6a3d1715ae0a75907443ba163a2f85a6b77cb24a/app.js";
const nativeFetch = globalThis.fetch.bind(globalThis);

const INVALID_FIELD_STYLE = `
  .field.is-invalid input,
  .field.is-invalid select,
  .field.is-invalid textarea,
  .field.is-invalid .choice-pill span {
    border-color: #962d2d;
    box-shadow: 0 0 0 4px rgba(150, 45, 45, 0.08);
  }

  .field.is-invalid > span {
    color: #962d2d;
  }
`;

function shouldPatchGeminiPayload(url, payload) {
  if (!/generativelanguage\.googleapis\.com/i.test(url)) {
    return false;
  }

  if (!payload || typeof payload !== "object") {
    return false;
  }

  if (
    !Array.isArray(payload.tools) ||
    !payload.tools.some(
      (tool) => tool && typeof tool === "object" && "google_search" in tool
    )
  ) {
    return false;
  }

  return Boolean(
    payload.generationConfig?.responseMimeType ||
      payload.generationConfig?.responseJsonSchema
  );
}

function sanitizeInit(url, init) {
  if (!init || typeof init.body !== "string") {
    return init;
  }

  try {
    const payload = JSON.parse(init.body);
    if (!shouldPatchGeminiPayload(url, payload)) {
      return init;
    }

    const generationConfig = { ...(payload.generationConfig ?? {}) };
    delete generationConfig.responseMimeType;
    delete generationConfig.responseJsonSchema;

    return {
      ...init,
      body: JSON.stringify({
        ...payload,
        generationConfig,
      }),
    };
  } catch {
    return init;
  }
}

function ensureInvalidStyle() {
  if (document.getElementById("codex-invalid-style")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "codex-invalid-style";
  style.textContent = INVALID_FIELD_STYLE;
  document.head.append(style);
}

function getFieldContainer(element) {
  return element?.closest?.(".field") ?? null;
}

function getFieldLabel(element) {
  const field = getFieldContainer(element);
  const label = field?.querySelector(":scope > span")?.textContent?.trim();
  return label || "필수 입력";
}

function getForm() {
  return document.getElementById("analysisForm");
}

function getStatusBadge() {
  return document.getElementById("statusBadge");
}

function getStatusText() {
  return document.getElementById("statusText");
}

function getFormStatus() {
  return document.getElementById("formStatus");
}

function getEditButton() {
  return document.getElementById("editButton");
}

function getNoticeFileInput() {
  return document.getElementById("noticeFile");
}

function getAnalysisMode() {
  return document.querySelector('input[name="analysisMode"]:checked')?.value ?? "";
}

function isPdfFile(file) {
  return file && (file.type === "application/pdf" || /\.pdf$/i.test(file.name));
}

function setValidationStatus(message) {
  const badge = getStatusBadge();
  const text = getStatusText();
  const formStatus = getFormStatus();

  if (badge) {
    badge.textContent = "입력 확인";
    badge.className = "status-badge error";
  }

  if (text) {
    text.textContent = message;
  }

  if (formStatus) {
    formStatus.textContent = message;
    formStatus.className = "form-status error span-2";
  }
}

function clearValidationStatus() {
  const formStatus = getFormStatus();
  if (!formStatus) {
    return;
  }

  formStatus.textContent = "";
  formStatus.className = "form-status span-2 is-hidden";
}

function setView(view, options = {}) {
  document.body.dataset.view = view;

  if (options.instant) {
    return;
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function handleInvalidField(event) {
  const field = getFieldContainer(event.target);

  if (field) {
    field.classList.add("is-invalid");
    field.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  setView("input");
  setValidationStatus(`${getFieldLabel(event.target)} 항목을 먼저 입력해 주세요.`);
}

function clearFieldError(event) {
  const field = getFieldContainer(event.target);
  if (field) {
    field.classList.remove("is-invalid");
  }

  clearValidationStatus();
}

function isSubmissionReady() {
  const form = getForm();
  if (!form || !form.checkValidity()) {
    return false;
  }

  if (getAnalysisMode() !== "upload") {
    return true;
  }

  const fileInput = getNoticeFileInput();
  const file = fileInput?.files?.[0];
  if (!file) {
    setValidationStatus("특정 공고 분석을 위해 PDF 파일을 업로드해 주세요.");
    return false;
  }

  if (!isPdfFile(file)) {
    setValidationStatus("PDF 파일만 업로드할 수 있습니다.");
    return false;
  }

  return true;
}

function handleSubmitViewChange() {
  if (!isSubmissionReady()) {
    setView("input");
    return;
  }

  clearValidationStatus();
  setView("results");
}

function handleEdit() {
  setView("input");
  clearValidationStatus();
  document.getElementById("companyName")?.focus();
}

function isRenderedEmptyResult() {
  const badgeText = getStatusBadge()?.textContent?.trim() ?? "";
  const noticeTitle = document.querySelector(".notice-title")?.textContent?.trim() ?? "";

  if (badgeText !== "완료") {
    return false;
  }

  return noticeTitle === "기업명 미기재 / 공고 제목 미기재";
}

function reconcileRenderedResult() {
  if (!isRenderedEmptyResult()) {
    return;
  }

  const badge = getStatusBadge();
  const text = getStatusText();

  if (badge) {
    badge.textContent = "오류";
    badge.className = "status-badge error";
  }

  if (text) {
    text.textContent =
      "조건에 맞는 최신 공고를 찾지 못했습니다. 기업명이나 고용 형태 조건을 조금 넓혀 다시 시도해 주세요.";
  }
}

function observeRenderedResult() {
  const results = document.querySelector(".results");
  if (!results) {
    return;
  }

  const observer = new MutationObserver(() => {
    reconcileRenderedResult();
  });

  observer.observe(results, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  reconcileRenderedResult();
}

function enhanceValidationFeedback() {
  const form = getForm();
  if (!form || form.dataset.codexEnhanced === "true") {
    return;
  }

  form.dataset.codexEnhanced = "true";
  ensureInvalidStyle();
  form.addEventListener("invalid", handleInvalidField, true);
  form.addEventListener("input", clearFieldError, true);
  form.addEventListener("change", clearFieldError, true);
  form.addEventListener("submit", handleSubmitViewChange);
  getEditButton()?.addEventListener("click", handleEdit);
}

async function loadLegacyApp() {
  const response = await fetch(LEGACY_APP_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("기준 앱 파일을 불러오지 못했습니다.");
  }

  const source = await response.text();
  const blobUrl = URL.createObjectURL(
    new Blob([source], { type: "text/javascript" })
  );

  try {
    await import(blobUrl);
  } finally {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
  }
}

globalThis.fetch = function patchedFetch(input, init) {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input?.url ?? "";
  return nativeFetch(input, sanitizeInit(url, init));
};

await loadLegacyApp();
enhanceValidationFeedback();
observeRenderedResult();
setView("input", { instant: true });
