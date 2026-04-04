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

function setValidationStatus(message) {
  const badge = document.getElementById("statusBadge");
  const text = document.getElementById("statusText");

  if (badge) {
    badge.textContent = "입력 확인";
    badge.className = "status-badge error";
  }

  if (text) {
    text.textContent = message;
  }
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

  setValidationStatus(`${getFieldLabel(event.target)} 항목을 먼저 입력해 주세요.`);
}

function clearFieldError(event) {
  const field = getFieldContainer(event.target);
  if (field) {
    field.classList.remove("is-invalid");
  }
}

function enhanceValidationFeedback() {
  const form = document.getElementById("analysisForm");
  if (!form || form.dataset.codexEnhanced === "true") {
    return;
  }

  form.dataset.codexEnhanced = "true";
  ensureInvalidStyle();
  form.addEventListener("invalid", handleInvalidField, true);
  form.addEventListener("input", clearFieldError, true);
  form.addEventListener("change", clearFieldError, true);
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
