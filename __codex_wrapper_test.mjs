const LEGACY_APP_URL = "https://cdn.jsdelivr.net/gh/minsu0906/BPpelc@6a3d1715ae0a75907443ba163a2f85a6b77cb24a/app.js";
const nativeFetch = globalThis.fetch.bind(globalThis);

function shouldPatchGeminiPayload(url, payload) {
  if (!/generativelanguage\.googleapis\.com/i.test(url)) {
    return false;
  }

  if (!payload || typeof payload !== "object") {
    return false;
  }

  if (!Array.isArray(payload.tools) || !payload.tools.some((tool) => tool && typeof tool === "object" && "google_search" in tool)) {
    return false;
  }

  return Boolean(payload.generationConfig?.responseMimeType || payload.generationConfig?.responseJsonSchema);
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

globalThis.fetch = function patchedFetch(input, init) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url ?? "";
  return nativeFetch(input, sanitizeInit(url, init));
};

await import(LEGACY_APP_URL);
