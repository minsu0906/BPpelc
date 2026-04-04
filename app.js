const LEGACY_APP_URL =
  "https://cdn.jsdelivr.net/gh/minsu0906/BPpelc@6a3d1715ae0a75907443ba163a2f85a6b77cb24a/app.js";

const BUILD_LATEST_PROMPT_PATCH = [
  "function buildLatestPrompt(payload) {",
  "  const employmentLine = payload.employmentType",
  '    ? "- 고용 형태: " + payload.employmentType',
  '    : "- 고용 형태: 사용자가 지정하지 않음";',
  "  const questionLine = payload.questionPrompt",
  '    ? "- 질문 사항: " + payload.questionPrompt',
  '    : "- 질문 사항: 없음";',
  "",
  "  return [",
  '    "당신은 한국 채용 공고 분석 도우미다.",',
  '    "Google Search grounding을 사용해 아래 조건과 가장 관련 있는 최신 채용 공고 1건만 찾아라.",',
  '    "반드시 회사 공식 채용 페이지, 공식 공고문, 공공기관 채용 시스템, 또는 채용 원문을 우선 사용한다.",',
  '    "",',
  '    "사용자 조건",',
  '    "- 기업명: " + payload.companyName,',
  '    "- 학력 구분: " + payload.educationLevel,',
  '    employmentLine,',
  '    questionLine,',
  '    "",',
  '    "반드시 지킬 규칙",',
  '    "- 검색 결과 여러 건을 섞지 말고 가장 적합한 공고 1건만 사용한다.",',
  '    "- 기업명과 학력 조건이 명확히 맞지 않으면 계속 검색한다.",',
  '    "- 공고에 없는 내용은 추정하지 말고 \"" + UNKNOWN_TEXT + "\" 또는 \"미기재\"라고 적는다.",',
  '    "- organization, title, applicationPeriod는 비워 두지 않는다.",',
  '    "- information에는 최소 4개 항목을 넣고, 지원 자격/고용 형태/모집 인원/접수 기간을 우선 포함한다.",',
  '    "- process는 공고에 나온 실제 전형 단계만 작성한다.",',
  '    "- bonusPoints는 실제 가점, 우대, 자격증 관련 내용만 적고, 수치가 없으면 \"" + UNKNOWN_TEXT + "\"라고 쓴다.",',
  '    "- 출력은 설명 없이 JSON 객체 하나만 반환한다.",',
  '    "- Markdown 코드 블록, 머리말, 꼬리말, 참고 문장 없이 JSON만 응답한다.",',
  '  ].join("\\n");',
  "}",
].join("\n");

const REQUEST_LATEST_ANALYSIS_PATCH = [
  "async function requestLatestAnalysis(apiKey, payload) {",
  "  const requestBody = {",
  "    contents: [",
  "      {",
  "        parts: [{ text: buildLatestPrompt(payload) }],",
  "      },",
  "    ],",
  "    tools: [{ google_search: {} }],",
  "    generationConfig: {",
  "      temperature: 0.1,",
  "      topP: 0.9,",
  "      maxOutputTokens: 2200,",
  "    },",
  "  };",
  "",
  "  if (supportsStructuredOutputWithTools(LATEST_MODEL_NAME)) {",
  '    requestBody.generationConfig.responseMimeType = "application/json";',
  "    requestBody.generationConfig.responseJsonSchema = ANALYSIS_SCHEMA;",
  "  }",
  "",
  "  try {",
  "    return await callGemini(apiKey, requestBody);",
  "  } catch (error) {",
  "    if (!shouldRetryWithoutStructuredOutput(error, requestBody)) {",
  "      throw error;",
  "    }",
  "",
  "    delete requestBody.generationConfig.responseMimeType;",
  "    delete requestBody.generationConfig.responseJsonSchema;",
  "",
  "    return callGemini(apiKey, requestBody);",
  "  }",
  "}",
].join("\n");

const STRUCTURED_OUTPUT_HELPERS_PATCH = [
  "function supportsStructuredOutputWithTools(modelName) {",
  '  return /^gemini-3/i.test(String(modelName ?? "").trim());',
  "}",
  "",
  "function shouldRetryWithoutStructuredOutput(error, requestBody) {",
  '  const message = error instanceof Error ? error.message : "";',
  "  const hasStructuredOutput =",
  "    Boolean(requestBody?.generationConfig?.responseMimeType) ||",
  "    Boolean(requestBody?.generationConfig?.responseJsonSchema);",
  "",
  "  return hasStructuredOutput && /tool use with a response mime type/i.test(message);",
  "}",
  "",
  "function isEffectivelyEmptyLatestAnalysis(data, sources) {",
  "  const notice = data?.notice ?? {};",
  "  const missingNotice =",
  '    (!notice.organization || notice.organization === "기업명 미기재") &&',
  '    (!notice.title || notice.title === "공고 제목 미기재");',
  "  const hasInformation = Array.isArray(data?.information) && data.information.length > 0;",
  "  const hasProcess = Array.isArray(data?.process) && data.process.length > 0;",
  "  const hasBonus = Array.isArray(data?.bonusPoints) && data.bonusPoints.length > 0;",
  "  const hasSources = Array.isArray(sources) && sources.length > 0;",
  "",
  "  return missingNotice || (!hasInformation && !hasProcess && !hasBonus && !hasSources);",
  "}",
].join("\n");

const LATEST_ANALYSIS_BLOCK_PATCH = [
  "const response = await requestLatestAnalysis(payload.apiKey, payload);",
  "      const text = extractResponseText(response);",
  "      analysisData = normalizeAnalysisData(parseJsonObject(text));",
  "      sources = normalizeGroundedSources(",
  "        response?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []",
  "      );",
  "      if (isEffectivelyEmptyLatestAnalysis(analysisData, sources)) {",
  '        throw new Error("조건에 맞는 최신 공고를 찾지 못했습니다. 기업명, 학력, 고용 형태 조건을 조금 넓혀 다시 시도해 주세요.");',
  "      }",
].join("\n");

const RESOLVE_UPLOAD_BRANCH = [
  '  if (mode === "upload") {',
  '    return message || "업로드한 공고를 분석하지 못했습니다. 텍스트가 포함된 PDF인지 확인해 주세요.";',
  '  }',
].join("\n");

const TOOL_USE_ERROR_BRANCH = [
  '  if (/tool use with a response mime type/i.test(message)) {',
  '    return "현재 사용 중인 Gemini 모델은 검색 도구와 JSON 강제 응답을 함께 처리하지 못해 실패했습니다. 최신 공고 요청은 도구 호환 방식으로 다시 보내도록 수정되어야 합니다.";',
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

  source = replaceOnce(
    source,
    'const LATEST_MODEL_NAME = "gemini-2.5-flash-lite";',
    'const LATEST_MODEL_NAME = "gemini-2.5-flash";',
    "model name"
  );
  source = replaceOnce(
    source,
    /function buildLatestPrompt\(payload\) \{[\s\S]*?\n\}\n\nasync function requestLatestAnalysis/,
    BUILD_LATEST_PROMPT_PATCH + "\n\nasync function requestLatestAnalysis",
    "buildLatestPrompt"
  );
  source = replaceOnce(
    source,
    /async function requestLatestAnalysis\(apiKey, payload\) \{[\s\S]*?\n\}\n\nasync function callGemini/,
    REQUEST_LATEST_ANALYSIS_PATCH + "\n\nasync function callGemini",
    "requestLatestAnalysis"
  );
  source = replaceOnce(
    source,
    /const response = await requestLatestAnalysis\(payload\.apiKey, payload\);\n\s*const text = extractResponseText\(response\);\n\s*analysisData = normalizeAnalysisData\(parseJsonObject\(text\)\);\n\s*sources = normalizeGroundedSources\(\n\s*response\?\.candidates\?\.\[0\]\?\.groundingMetadata\?\.groundingChunks \?\? \[\]\n\s*\);/,
    LATEST_ANALYSIS_BLOCK_PATCH,
    "latest analysis validation"
  );
  source = replaceOnce(
    source,
    "function extractResponseText(data) {",
    STRUCTURED_OUTPUT_HELPERS_PATCH + "\n\nfunction extractResponseText(data) {",
    "structured output helpers"
  );
  source = replaceOnce(
    source,
    RESOLVE_UPLOAD_BRANCH,
    TOOL_USE_ERROR_BRANCH + RESOLVE_UPLOAD_BRANCH,
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
