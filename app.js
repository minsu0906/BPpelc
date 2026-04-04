const LIVE_APP_URL =
  "https://cdn.jsdelivr.net/gh/minsu0906/BPpelc@8d3eba3ea5b382cdb22237af07e9594bb7628b62/app.js";

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

await import(LIVE_APP_URL);
enhanceValidationFeedback();
