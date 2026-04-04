const LEGACY_APP_URL =
  "https://cdn.jsdelivr.net/gh/minsu0906/BPpelc@6a3d1715ae0a75907443ba163a2f85a6b77cb24a/app.js";

const OUTPUT_RULE_OLD = "- 출력은 JSON 객체 하나만 반환한다.";
const OUTPUT_RULE_NEW = [
  "- 출력은 설명 없이 JSON 객체 하나만 반환한다.",
  "- Markdown 코드 블록, 머리말, 꼬리말, 참고 문장 없이 JSON만 응답한다.",
].join("\n");

const REQUEST_LATEST_ANALYSIS_PATCH = String.raw`async function requestLatestAnalysis(apiKey, payload) {
  const requestBody = {
    contents: [
      {
        parts: [{ text: buildLatestPrompt(payload) }],
      },
    ],
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.1,
      topP: 0.9,
      maxOutputTokens: 2200,
    },
  };

  if (supportsStructuredOutputWithTools(LATEST_MODEL_NAME)) {
    requestBody.generationConfig.responseMimeType = "application/json";
    requestBody.generationConfig.responseJsonSchema = ANALYSIS_SCHEMA;
  }

  try {
    return await callGemini(apiKey, requestBody);
  } catch (error) {
    if (!shouldRetryWithoutStructuredOutput(error, requestBody)) {
      throw error;
    }

    delete requestBody.generationConfig.responseMimeType;
    delete requestBody.generationConfig.responseJsonSchema;

    return callGemini(apiKey, requestBody);
  }
}`;

const STRUCTURED_OUTPUT_HELPERS_PATCH = String.raw`function supportsStructuredOutputWithTools(modelName) {
  return /^gemini-3/i.test(String(modelName ?? "").trim());
}

function shouldRetryWithoutStructuredOutput(error, requestBody) {
  const message = error instanceof Error ? error.message : "";
  const hasStructuredOutput =
    Boolean(requestBody?.generationConfig?.responseMimeType) ||
    Boolean(requestBody?.generationConfig?.responseJsonSchema);

  return hasStructuredOutput && /tool use with a response mime type/i.test(message);
}`;

const RESOLVE_UPLOAD_BRANCH = [
  '  if (mode === "upload") {',
  '    return message || "업로드한 공고를 분석하지 못했습니다. 텍스트가 포함된 PDF인지 확인해 주세요.";',
  '  }',
].join("\n");

const TOOL_USE_ERROR_BRANCH = [
  '  if (/tool use with a response mime type/i.test(message)) {',
  '    return "현재 사용 중인 Gemini 모델은 검색 도구와 JSON 강제 응답을 함께 처리하지 못해 실패했습니다. 최신 공고 요청은 이제 도구 호환 방식으로 다시 보내도록 수정해야 하며, 배포가 갱신되면 정상 동작해야 합니다.";',
  '  }',
  "",
].join("\n");

function replaceOnce(source, searchValue, replaceValue, label) {
  const updated = source.replace(searchValue, replaceValue);
  if (updated === source) {
    throw new Error(`패치 적용 실패: ${label}`);
  }
  return updated;
}

async function loadPatchedApp() {
  const response = await fetch(LEGACY_APP_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("기준 앱 파일을 불러오지 못했습니다.");
  }

  let source = await response.text();

  source = source
    .replaceAll('type: "OBJECT"', 'type: "object"')
    .replaceAll('type: "ARRAY"', 'type: "array"')
    .replaceAll('type: "STRING"', 'type: "string"');

  source = replaceOnce(source, OUTPUT_RULE_OLD, OUTPUT_RULE_NEW, "output rules");
  source = replaceOnce(
    source,
    /async function requestLatestAnalysis\(apiKey, payload\) \{[\s\S]*?\n\}\n\nasync function callGemini/,
    `${REQUEST_LATEST_ANALYSIS_PATCH}\n\nasync function callGemini`,
    "requestLatestAnalysis"
  );
  source = replaceOnce(
    source,
    "function extractResponseText(data) {",
    `${STRUCTURED_OUTPUT_HELPERS_PATCH}\n\nfunction extractResponseText(data) {`,
    "structured output helpers"
  );
  source = replaceOnce(
    source,
    RESOLVE_UPLOAD_BRANCH,
    `${TOOL_USE_ERROR_BRANCH}${RESOLVE_UPLOAD_BRANCH}`,
    "resolveErrorMessage tool-use branch"
  );

  const blobUrl = URL.createObjectURL(
    new Blob([source], { type: "text/javascript" })
  );

  try {
    await import(blobUrl);
  } finally {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
  }
}

await loadPatchedApp();
