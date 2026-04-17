const LATEST_MODEL_NAME = "gemini-2.5-flash-lite";
const STORAGE_KEY = "job-bonus-radar-gemini-key";
const UNKNOWN_TEXT = "공고에서 명시 여부 확인 필요";
const PDFJS_MODULE_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs";
const PDFJS_WORKER_URL =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";

let pdfjsLibPromise = null;
let activeUploadedFileUrl = "";

const LATEST_NOTICE_SCHEMA = {
  type: "object",
  properties: {
    notice: {
      type: "object",
      properties: {
        organization: { type: "string" },
        title: { type: "string" },
        noticeDate: { type: "string" },
        educationLevel: { type: "string" },
        employmentType: { type: "string" },
        headcount: { type: "string" },
        applicationPeriod: { type: "string" },
        summary: { type: "string" },
      },
      required: [
        "organization",
        "title",
        "noticeDate",
        "educationLevel",
        "employmentType",
        "headcount",
        "applicationPeriod",
        "summary",
      ],
    },
    source: {
      type: "object",
      properties: {
        title: { type: "string" },
        url: { type: "string" },
        note: { type: "string" },
      },
      required: ["title", "url", "note"],
    },
  },
  required: ["notice", "source"],
};

const elements = {
  body: document.body,
  form: document.getElementById("analysisForm"),
  formPanel: document.getElementById("formPanel"),
  formStatus: document.getElementById("formStatus"),
  companyName: document.getElementById("companyName"),
  apiKey: document.getElementById("apiKey"),
  apiKeyField: document.getElementById("apiKeyField"),
  employmentType: document.getElementById("employmentType"),
  noticeFile: document.getElementById("noticeFile"),
  uploadField: document.getElementById("uploadField"),
  questionPrompt: document.getElementById("questionPrompt"),
  modeHelper: document.getElementById("modeHelper"),
  analyzeButton: document.getElementById("analyzeButton"),
  editButton: document.getElementById("editButton"),
  statusBadge: document.getElementById("statusBadge"),
  statusText: document.getElementById("statusText"),
  noticeCard: document.getElementById("noticeCard"),
  informationPanel: document.getElementById("informationPanel"),
  processPanel: document.getElementById("processPanel"),
  bonusPanel: document.getElementById("bonusPanel"),
  sourcePanel: document.getElementById("sourcePanel"),
  results: document.querySelector(".results"),
  modeInputs: Array.from(document.querySelectorAll('input[name="analysisMode"]')),
};

initialize();

function initialize() {
  const savedKey = localStorage.getItem(STORAGE_KEY);
  if (savedKey) {
    elements.apiKey.value = savedKey;
  }

  const defaultMode = document.querySelector('input[name="analysisMode"][value="latest"]');
  if (defaultMode && !getAnalysisMode()) {
    defaultMode.checked = true;
  }

  updateModeUI();
  showInputView({ instant: true });

  elements.modeInputs.forEach((input) => {
    input.addEventListener("change", updateModeUI);
  });

  elements.form.addEventListener("invalid", handleInvalidField, true);
  elements.form.addEventListener("input", clearFieldError);
  elements.form.addEventListener("change", clearFieldError);
  elements.form.addEventListener("submit", handleAnalyze);
  elements.editButton.addEventListener("click", handleEdit);
  window.addEventListener("beforeunload", releaseUploadedFileUrl);
}

function getSelectedValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value ?? "";
}

function getAnalysisMode() {
  return getSelectedValue("analysisMode");
}

function isLocalFileRuntime() {
  return window.location.protocol === "file:";
}

function buildRuntimeHint() {
  if (!isLocalFileRuntime()) {
    return "";
  }

  return `
    <p class="helper-note">
      <strong>로컬 실행 안내</strong>
      현재 <code>index.html</code>을 직접 열어둔 상태라 브라우저 보안 정책에 따라 PDF 분석 모듈이나 외부 API 요청이 차단될 수 있습니다.
      가능하면 <code>python -m http.server 4173</code> 같은 로컬 서버나 배포 주소에서 다시 열어 주세요.
    </p>
  `;
}

async function ensurePdfJsLib() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import(PDFJS_MODULE_URL)
      .then((module) => {
        const library = module?.default ?? module;

        if (typeof library?.getDocument !== "function" || !library?.GlobalWorkerOptions) {
          throw new Error("PDF 분석 모듈 초기화에 실패했습니다.");
        }

        library.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        return library;
      })
      .catch((error) => {
        pdfjsLibPromise = null;

        const wrappedError = new Error(
          isLocalFileRuntime()
            ? "브라우저가 로컬 파일 환경에서 PDF 분석 모듈 로딩을 차단했습니다. `python -m http.server 4173`처럼 간단한 로컬 서버로 열거나 배포 주소에서 다시 시도해 주세요."
            : "PDF 분석 모듈을 불러오지 못했습니다. 네트워크 환경 또는 브라우저 확장 프로그램이 jsDelivr 로딩을 차단했을 수 있습니다."
        );

        wrappedError.cause = error;
        throw wrappedError;
      });
  }

  return pdfjsLibPromise;
}

function updateModeUI() {
  const isUploadMode = getAnalysisMode() === "upload";
  const runtimeHint = buildRuntimeHint();

  elements.uploadField.classList.toggle("is-hidden", !isUploadMode);
  elements.noticeFile.required = isUploadMode;
  elements.noticeFile.disabled = !isUploadMode;

  elements.apiKeyField.classList.toggle("is-hidden", isUploadMode);
  elements.apiKey.required = !isUploadMode;
  elements.apiKey.disabled = isUploadMode;

  if (!isUploadMode) {
    elements.noticeFile.value = "";
  }

  elements.modeHelper.innerHTML = isUploadMode
    ? `
        <strong>특정 공고 업로드</strong>
        업로드한 PDF를 브라우저에서 직접 읽어 정리합니다. 무료 Gemini 한도와 무관하게 사용할 수 있고, 텍스트가 포함된 PDF일수록 더 정확합니다.
        ${runtimeHint}
      `
    : `
        <strong>최신 공고 1회</strong>
        Gemini API로 검색 근거가 있는 최신 공고 1건만 찾습니다. 무료 키에서 <code>RESOURCE_EXHAUSTED</code>가 뜨면 일일 또는 분당 한도에 걸린 상태입니다.
        ${runtimeHint}
      `;

  if (isUploadMode) {
    void ensurePdfJsLib().catch(() => {});
  }
}

async function handleAnalyze(event) {
  event.preventDefault();

  updateModeUI();
  clearAllFieldErrors();
  clearFormStatus();

  if (!elements.form.reportValidity()) {
    return;
  }

  const mode = getAnalysisMode();
  const payload = collectPayload();

  if (mode === "upload" && !elements.noticeFile.files[0]) {
    showInputView();
    setFormStatus("error", "특정 공고 분석을 위해 PDF 파일을 업로드해 주세요.");
    setStatus("error", "파일 확인", "특정 공고 분석을 위해 PDF 파일을 업로드해 주세요.");
    return;
  }

  if (mode === "upload" && !isPdfFile(elements.noticeFile.files[0])) {
    showInputView();
    setFormStatus("error", "PDF 파일만 업로드할 수 있습니다.");
    setStatus("error", "파일 형식 확인", "PDF 파일만 업로드할 수 있습니다.");
    return;
  }

  if (mode === "latest") {
    localStorage.setItem(STORAGE_KEY, payload.apiKey);
  }

  releaseUploadedFileUrl();
  showResultsView();
  setBusy(true);
  setStatus(
    "loading",
    "분석 중",
    mode === "latest"
      ? "최신 공고 1건을 찾고 있으며, 공고 원문과 기본 정보만 먼저 가져오고 있습니다."
      : "업로드한 PDF를 브라우저에서 직접 읽고 채용 정보를 정리하고 있습니다."
  );
  renderLoadingState();
  revealResults();

  try {
    let analysisData;
    let sources;

    if (mode === "latest") {
      const response = await requestLatestAnalysis(payload.apiKey, payload);
      const groundedSources = normalizeGroundedSources(
        response?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []
      );
      const text = extractResponseText(response, { allowEmpty: true });
      const latestNotice = normalizeLatestNoticeResult(
        parseLatestNoticePayload(text, payload, groundedSources),
        payload,
        groundedSources
      );

      sources = mergeLatestSources(groundedSources, latestNotice.source);
      analysisData = buildLatestFetchAnalysis(latestNotice.notice, sources, payload);
      const hasFetchedNotice =
        isMeaningfulUrl(sources[0]?.url) || isMeaningfulValue(latestNotice.notice.title);

      if (!hasFetchedNotice || isEffectivelyEmptyAnalysis(analysisData, sources)) {
        throw new Error(
          "조건에 맞는 최신 공고 원문을 찾지 못했습니다. 기업명이나 고용 형태 조건을 조금 넓혀 다시 시도해 주세요."
        );
      }
    } else {
      const file = elements.noticeFile.files[0];
      const extractedText = await extractPdfText(file);
      analysisData = analyzeUploadedNotice(extractedText, payload, file.name);
      sources = [buildUploadedFileSource(file)];
    }

    renderAnalysis(analysisData, payload, sources);
    setStatus(
      "success",
      "완료",
      mode === "latest"
        ? "최신 공고 1건을 가져왔습니다. 상세 분석은 잠시 비워두고 공고 원문부터 보여주고 있습니다."
        : "업로드한 공고를 API 키 없이 바로 정리했습니다."
    );
  } catch (error) {
    console.error(error);
    const message = resolveErrorMessage(error, mode);
    setStatus("error", "오류", message);
    renderErrorState(message);
  } finally {
    setBusy(false);
  }
}

function handleInvalidField(event) {
  const field = getFieldContainer(event.target);
  const label = getFieldLabel(event.target);

  if (field) {
    field.classList.add("is-invalid");
    field.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  showInputView();
  setFormStatus("error", `${label} 항목을 먼저 입력해 주세요.`);
  setStatus("error", "입력 확인", `${label} 항목을 먼저 입력해 주세요.`);
}

function clearFieldError(event) {
  const field = getFieldContainer(event.target);
  if (field) {
    field.classList.remove("is-invalid");
  }

  clearFormStatus();
}

function clearAllFieldErrors() {
  elements.form.querySelectorAll(".field.is-invalid").forEach((field) => {
    field.classList.remove("is-invalid");
  });
}

function getFieldContainer(element) {
  return element?.closest?.(".field") ?? null;
}

function getFieldLabel(element) {
  const field = getFieldContainer(element);
  const label = field?.querySelector(":scope > span")?.textContent?.trim();
  return label || "필수 입력";
}

function handleEdit() {
  releaseUploadedFileUrl();
  showInputView();
  clearFormStatus();
  elements.companyName.focus();
}

function showInputView(options = {}) {
  setView("input", options);
}

function showResultsView(options = {}) {
  setView("results", options);
}

function setView(view, options = {}) {
  elements.body.dataset.view = view;

  if (options.instant) {
    return;
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function setFormStatus(type, message) {
  elements.formStatus.textContent = message;
  elements.formStatus.className = `form-status ${type} span-2`;
}

function clearFormStatus() {
  elements.formStatus.textContent = "";
  elements.formStatus.className = "form-status span-2 is-hidden";
}

function collectPayload() {
  return {
    apiKey: String(elements.apiKey.value ?? "").trim(),
    companyName: String(elements.companyName.value ?? "").trim(),
    analysisMode: getAnalysisMode(),
    educationLevel: getSelectedValue("educationLevel"),
    employmentType: String(elements.employmentType.value ?? "").trim(),
    questionPrompt: String(elements.questionPrompt.value ?? "").trim(),
  };
}

function buildLatestPrompt(payload) {
  const employmentLine = payload.employmentType
    ? `- 고용 형태: ${payload.employmentType}`
    : "- 고용 형태: 사용자가 지정하지 않음";
  const questionLine = payload.questionPrompt
    ? `- 질문 사항: ${payload.questionPrompt}`
    : "- 질문 사항: 없음";

  return `
당신은 한국 채용 공고 탐색 도우미다.
Google Search grounding을 사용해 아래 조건과 가장 관련 있는 최신 공고 1건만 찾고, 공고 자체를 식별할 수 있는 기본 정보만 JSON으로 작성해라.

사용자 조건
- 기업명: ${payload.companyName}
- 학력 구분: ${payload.educationLevel}
${employmentLine}
${questionLine}

반드시 지킬 규칙
- 검색 결과 여러 건을 섞지 말고 가장 최신 공고 1건만 사용한다.
- 상세 전형 분석은 하지 말고 notice와 source만 채운다.
- source.url에는 실제 공고 원문 URL 또는 공식 채용 페이지 URL 1개를 반드시 넣는다.
- source.title에는 링크 제목 또는 공고 제목을 넣는다.
- source.note에는 왜 이 공고를 선택했는지 한 문장으로 적는다.
- 공고에 없는 내용은 추정하지 말고 "${UNKNOWN_TEXT}" 또는 "미기재"라고 적는다.
- summary는 이 공고가 어떤 채용인지 1~2문장으로 짧게 요약한다.
- 출력은 설명 없이 JSON 객체 하나만 반환한다.
- Markdown 코드 블록, 머리말, 꼬리말, 참고 문장 없이 JSON만 응답한다.
  `.trim();
}

async function requestLatestAnalysis(apiKey, payload) {
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
    requestBody.generationConfig.responseJsonSchema = LATEST_NOTICE_SCHEMA;
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
}

async function callGemini(apiKey, requestBody) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${LATEST_MODEL_NAME}:generateContent`;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        data?.error?.message ??
          "Gemini API 요청에 실패했습니다. API 키 또는 사용량 한도를 확인해 주세요."
      );
      error.httpStatus = response.status;
      error.apiStatus = data?.error?.status ?? "";
      throw error;
    }

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("응답 시간이 길어 요청을 중단했습니다. 잠시 후 다시 시도해 주세요.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function extractPdfText(file) {
  const pdfjsLib = await ensurePdfJsLib();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = groupPdfItemsToLines(content.items);
    pages.push(lines.join("\n"));
  }

  const text = cleanPdfText(pages.join("\n"));
  if (text.replace(/\s+/g, "").length < 80) {
    throw new Error(
      "업로드한 PDF에서 텍스트를 충분히 읽지 못했습니다. 이미지 스캔본이면 브라우저에서 바로 분석하기 어렵습니다."
    );
  }

  return text;
}

function groupPdfItemsToLines(items) {
  const entries = items
    .filter((item) => typeof item?.str === "string" && item.str.trim())
    .map((item) => ({
      text: item.str.trim(),
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
    }))
    .sort((left, right) => {
      if (Math.abs(right.y - left.y) > 2.5) {
        return right.y - left.y;
      }
      return left.x - right.x;
    });

  const lines = [];
  let currentLine = [];
  let currentY = null;

  for (const entry of entries) {
    if (currentY === null || Math.abs(entry.y - currentY) <= 2.5) {
      currentLine.push(entry.text);
      currentY = currentY ?? entry.y;
      continue;
    }

    lines.push(joinPdfLine(currentLine));
    currentLine = [entry.text];
    currentY = entry.y;
  }

  if (currentLine.length) {
    lines.push(joinPdfLine(currentLine));
  }

  return lines.filter(Boolean);
}

function joinPdfLine(parts) {
  return parts
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.:;)\]])/g, "$1")
    .replace(/([(［[])\s+/g, "$1")
    .trim();
}

function cleanPdfText(text) {
  return text
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function analyzeUploadedNotice(text, payload, fileName) {
  const lines = splitLines(text);
  const notice = buildLocalNotice(text, lines, payload, fileName);
  const information = buildLocalInformation(text, lines, payload, notice, fileName);
  const process = buildLocalProcess(text, lines);
  const bonusPoints = buildLocalBonus(text, lines);

  return normalizeAnalysisData({
    notice,
    information,
    process,
    bonusPoints,
  });
}

function buildLocalNotice(text, lines, payload, fileName) {
  const title = extractTitle(lines, payload, fileName);
  const employmentType = extractEmploymentType(text, payload);
  const applicationPeriod = extractApplicationPeriod(text, lines);
  const headcount = extractHeadcount(text, lines);
  const noticeDate = extractNoticeDate(text, lines);

  return {
    organization: payload.companyName || "기업명 미기재",
    title,
    noticeDate,
    educationLevel: payload.educationLevel || "미기재",
    employmentType,
    headcount,
    applicationPeriod,
    summary: buildSummary(payload, title, employmentType),
  };
}

function buildSummary(payload, title, employmentType) {
  const employmentPhrase = employmentType !== "미기재" ? employmentType : "고용 형태 확인 필요";
  return `${payload.companyName}의 ${title}를 기준으로 ${payload.educationLevel} 채용과 ${employmentPhrase} 정보를 정리했습니다.`;
}

function buildLocalInformation(text, lines, payload, notice, fileName) {
  const items = [
    {
      label: "지원 자격",
      value:
        extractSectionText(lines, ["지원자격", "응시자격", "자격요건"], 4) ||
        `${payload.educationLevel} 기준 세부 지원 자격은 공고 본문 확인 필요`,
    },
    { label: "고용 형태", value: notice.employmentType },
    { label: "모집 인원", value: notice.headcount },
    { label: "접수 기간", value: notice.applicationPeriod },
    fileName ? { label: "기준 파일", value: fileName } : null,
  ].filter(Boolean);

  const extraItems = [
    {
      label: "모집 분야",
      value: extractSectionText(lines, ["모집분야", "채용분야", "모집부문", "직무"], 3),
    },
    {
      label: "근무지",
      value: extractSectionText(lines, ["근무지", "근무지역", "근무예정지", "배치"], 3),
    },
    {
      label: "제출 서류",
      value: extractSectionText(lines, ["제출서류", "증빙서류"], 3),
    },
    {
      label: "우대 또는 참고",
      value:
        extractSectionText(lines, ["우대사항", "가점", "기타사항"], 3) ||
        extractSectionText(lines, ["유의사항"], 3),
    },
  ];

  for (const item of extraItems) {
    if (item.value) {
      items.push(item);
    }
  }

  return dedupeInformation(items).slice(0, 9);
}

function buildLocalProcess(text, lines) {
  const stages = extractStageSegments(lines);
  if (!stages.length) {
    return [
      buildStageCard(
        "채용 절차",
        extractSectionText(lines, ["전형절차", "채용절차"], 8) || text
      ),
    ];
  }

  return stages.map((stage, index) => {
    const nextIndex = stages[index + 1]?.index ?? lines.length;
    const segmentLines = lines.slice(stage.index, nextIndex);
    return buildStageCard(stage.name, segmentLines.join("\n"));
  });
}

function buildStageCard(stageName, segmentText) {
  return {
    stageName,
    schedule: extractSchedule(segmentText),
    evaluationItems: extractEvaluationItems(segmentText, stageName),
    selectionRatio: extractSelectionRatio(segmentText),
    score: extractScore(segmentText),
    tieBreaker: extractTieBreaker(segmentText),
    notes: extractStageNotes(segmentText, stageName),
  };
}

function buildLocalBonus(text, lines) {
  const configs = [
    {
      category: "법정 가점",
      keywords: ["가점", "취업지원대상자", "보훈", "국가유공자", "장애인"],
    },
    {
      category: "자격증/면허",
      keywords: ["자격증", "면허", "기사", "산업기사", "기능사", "기술사", "한국사"],
    },
    {
      category: "우대 사항",
      keywords: ["우대사항", "우대", "사회형평", "어학", "경력", "경험"],
    },
  ];

  const cards = configs
    .map((config) => {
      const linesForCategory = uniqueTexts(
        lines.filter((line) => config.keywords.some((keyword) => line.includes(keyword))).slice(0, 5)
      );

      if (!linesForCategory.length) {
        return null;
      }

      const combined = trimSummary(linesForCategory.join(" / "), 220);
      return {
        category: config.category,
        details: combined || UNKNOWN_TEXT,
        points: extractPointExpression(combined),
        notes: buildBonusNotes(combined),
      };
    })
    .filter(Boolean);

  if (!cards.length) {
    return [
      {
        category: "가점/우대",
        details: UNKNOWN_TEXT,
        points: UNKNOWN_TEXT,
        notes: "공고 본문에서 가점 또는 우대 기준을 다시 확인해 주세요.",
      },
    ];
  }

  return cards;
}

function extractTitle(lines, payload, fileName) {
  const titleCandidates = lines
    .slice(0, 20)
    .filter((line) => /채용|모집|공고|인턴|모집요강/.test(line))
    .sort((left, right) => right.length - left.length);

  if (titleCandidates.length) {
    return trimSummary(titleCandidates[0], 90);
  }

  return payload.companyName
    ? `${payload.companyName} 채용 공고`
    : fileName.replace(/\.pdf$/i, "") || "업로드 공고";
}

function extractEmploymentType(text, payload) {
  if (/채용형\s*인턴/.test(text)) {
    return "채용형 인턴";
  }
  if (/체험형\s*인턴/.test(text)) {
    return "체험형 인턴";
  }
  if (/무기계약직/.test(text)) {
    return "무기계약직";
  }
  if (/계약직/.test(text)) {
    return "계약직";
  }
  if (/정규직/.test(text)) {
    return "정규직";
  }

  return payload.employmentType || "미기재";
}

function extractApplicationPeriod(text, lines) {
  const direct = firstMatch(text, [
    /(?:접수기간|원서접수|지원서 접수)\s*[:：]?\s*([^\n]{1,120})/,
    /([0-9]{4}[.\-/년]\s*[0-9]{1,2}[.\-/월]\s*[0-9]{1,2}[일.]?\s*(?:~|-|부터)\s*[0-9]{4}[.\-/년]\s*[0-9]{1,2}[.\-/월]\s*[0-9]{1,2}[일.]?)/,
  ]);

  return direct || extractSectionText(lines, ["접수기간", "원서접수", "지원서 접수"], 3) || "미기재";
}

function extractHeadcount(text, lines) {
  const direct = firstMatch(text, [
    /(?:모집인원|채용인원|채용예정인원|선발예정인원)\s*[:：]?\s*([^\n]{0,60}\d+\s*명[^\n]{0,40})/,
    /(\d+\s*명\s*(?:내외|이내|정도)?)/,
  ]);

  return direct || extractSectionText(lines, ["모집인원", "채용인원", "선발예정인원"], 3) || "미기재";
}

function extractNoticeDate(text, lines) {
  const direct = firstMatch(text, [
    /(?:공고일|게시일|공고일자)\s*[:：]?\s*([0-9]{4}[.\-/년]\s*[0-9]{1,2}[.\-/월]\s*[0-9]{1,2}[일.]?)/,
    /([0-9]{4}\.\s*[0-9]{1,2}\.\s*[0-9]{1,2}\.?)/,
  ]);

  return direct || extractSectionText(lines, ["공고일", "게시일"], 2) || "미기재";
}

function extractSectionText(lines, keywords, span = 4) {
  const index = lines.findIndex((line) => keywords.some((keyword) => line.includes(keyword)));
  if (index === -1) {
    return "";
  }

  const segment = lines.slice(index, index + span).join(" ");
  return trimSummary(segment, 220);
}

function extractStageSegments(lines) {
  const segments = [];

  lines.forEach((line, index) => {
    const stageName = normalizeStageName(line);
    if (!stageName) {
      return;
    }

    if (segments.some((stage) => stage.name === stageName)) {
      return;
    }

    segments.push({ name: stageName, index });
  });

  return segments;
}

function normalizeStageName(line) {
  const cleaned = line.replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length > 70) {
    return "";
  }

  const numbered = cleaned.match(
    /(\d+\s*차\s*전형(?:\s*[\(\[][^\)\]\n]{1,40}[\)\]])?)/
  );
  if (numbered) {
    return numbered[1].replace(/\s+/g, " ");
  }

  const named = cleaned.match(
    /^(서류전형|필기시험|인성검사|직무면접|실무면접|종합면접|최종면접|AI면접|최종전형)$/
  );
  if (named) {
    return named[1];
  }

  return "";
}

function extractSchedule(segmentText) {
  const labeled = firstMatch(segmentText, [
    /(?:일정|전형일정|시험일자|면접일정|합격자 발표)\s*[:：]?\s*([^\n]{1,140})/,
  ]);
  if (labeled) {
    return labeled;
  }

  const dateMatches = Array.from(
    segmentText.matchAll(
      /([0-9]{4}[.\-/년]\s*[0-9]{1,2}[.\-/월]\s*[0-9]{1,2}[일.]?(?:\s*[~\-]\s*[0-9]{1,2}[.\-/월]?\s*[0-9]{1,2}[일.]?)?)/g
    )
  )
    .map((match) => trimSummary(match[1], 60))
    .filter(Boolean);

  return dateMatches.length ? uniqueTexts(dateMatches).slice(0, 2).join(" / ") : UNKNOWN_TEXT;
}

function extractEvaluationItems(segmentText, stageName) {
  const labeled = firstMatch(segmentText, [
    /(?:평가항목|평가요소|시험과목|면접항목|면접내용)\s*[:：]?\s*([^\n]{1,180})/,
  ]);
  if (labeled) {
    return splitToItems(labeled);
  }

  const inferred = [];
  const stageKeywords =
    /필기/.test(stageName)
      ? ["NCS", "직업기초능력", "직무수행능력", "전공", "한국사", "인성"]
      : ["직무역량", "조직적합성", "의사소통", "인성", "문제해결", "직업윤리"];

  stageKeywords.forEach((keyword) => {
    if (segmentText.includes(keyword)) {
      inferred.push(keyword);
    }
  });

  return uniqueTexts(inferred).length ? uniqueTexts(inferred) : [UNKNOWN_TEXT];
}

function extractSelectionRatio(segmentText) {
  return (
    firstMatch(segmentText, [
      /(?:평가배수|선발배수|합격배수|배수)\s*[:：]?\s*([^\n]{1,80})/,
      /(선발예정인원의\s*\d+\s*배수)/,
      /(\d+\s*배수)/,
    ]) || UNKNOWN_TEXT
  );
}

function extractScore(segmentText) {
  return (
    firstMatch(segmentText, [
      /(?:배점|만점|총점|점수)\s*[:：]?\s*([^\n]{1,100})/,
      /((?:\d+\s*점(?:\s*만점)?)(?:\s*\/\s*\d+\s*점)?[^\n]{0,30})/,
    ]) || UNKNOWN_TEXT
  );
}

function extractTieBreaker(segmentText) {
  return (
    firstMatch(segmentText, [
      /(?:동점자 처리 기준|동점자 처리|동점자)\s*[:：]?\s*([^\n]{1,140})/,
    ]) || UNKNOWN_TEXT
  );
}

function extractStageNotes(segmentText, stageName) {
  const lines = splitLines(segmentText);
  const notes = lines.filter((line) =>
    /과락|불합격|합격기준|유의|제외|결격|응시자격|발표|기준/.test(line)
  );

  if (!notes.length && /면접/.test(stageName)) {
    return ["면접 관련 세부 유의사항은 공고 본문 확인 필요"];
  }

  if (!notes.length && /필기/.test(stageName)) {
    return ["필기시험 세부 기준은 공고 본문 확인 필요"];
  }

  return uniqueTexts(notes).slice(0, 3).map((note) => trimSummary(note, 160));
}

function extractPointExpression(text) {
  const matches = Array.from(text.matchAll(/(\d+(?:\.\d+)?\s*(?:점|%|퍼센트|가점))/g))
    .map((match) => match[1].trim())
    .filter(Boolean);

  return matches.length ? uniqueTexts(matches).join(", ") : UNKNOWN_TEXT;
}

function buildBonusNotes(text) {
  if (/중복/.test(text)) {
    return "중복 적용 여부를 공고 본문에서 함께 확인해 주세요.";
  }
  if (/취업지원대상자|보훈|국가유공자/.test(text)) {
    return "법정 우대는 관련 법령과 공고 세부 기준을 함께 확인해 주세요.";
  }
  return "세부 적용 조건은 원문 공고를 다시 확인해 주세요.";
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return trimSummary(match[1], 180);
    }
  }

  return "";
}

function splitToItems(text) {
  const items = text
    .split(/[,/·]| 및 | 와 | 과 /)
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return uniqueTexts(items).slice(0, 5);
}

function dedupeInformation(items) {
  const seen = new Set();
  return items.filter((item) => {
    const label = asText(item?.label);
    const value = asText(item?.value);
    if (!label || !value) {
      return false;
    }

    const key = `${label}:${value}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function splitLines(text) {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function trimSummary(text, maxLength) {
  const cleaned = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "";
  }

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength - 1).trim()}…`;
}

function isPdfFile(file) {
  return file && (file.type === "application/pdf" || /\.pdf$/i.test(file.name));
}

function releaseUploadedFileUrl() {
  if (!activeUploadedFileUrl) {
    return;
  }

  URL.revokeObjectURL(activeUploadedFileUrl);
  activeUploadedFileUrl = "";
}

function buildUploadedFileSource(file) {
  releaseUploadedFileUrl();
  activeUploadedFileUrl = URL.createObjectURL(file);

  return {
    title: file.name,
    note: "업로드한 PDF를 기준 파일로 사용했습니다.",
    url: activeUploadedFileUrl,
    linkLabel: "파일 열기",
  };
}

function normalizeLatestNoticeResult(raw, payload, groundedSources = []) {
  const notice = raw?.notice ?? {};
  const source = raw?.source ?? {};
  const groundedSource = toArray(groundedSources)[0] ?? {};
  const sourceTitle = asText(source.title, asText(groundedSource.title, ""));
  const sourceUrl = asText(source.url, asText(groundedSource.url, ""));
  const sourceNote = asText(source.note, asText(groundedSource.note, ""));

  return {
    notice: {
      organization: asText(notice.organization, payload.companyName || "기업명 미기재"),
      title: asText(notice.title, sourceTitle || "공고 제목 미기재"),
      noticeDate: asText(notice.noticeDate, "미기재"),
      educationLevel: asText(notice.educationLevel, payload.educationLevel || "미기재"),
      employmentType: asText(notice.employmentType, payload.employmentType || "미기재"),
      headcount: asText(notice.headcount, "미기재"),
      applicationPeriod: asText(notice.applicationPeriod, "미기재"),
      summary: asText(
        notice.summary,
        "최신 공고 원문을 찾았습니다. 상세 전형 분석과 가점 분석은 아직 생략하고 있습니다."
      ),
    },
    source: {
      title: sourceTitle || "공고 원문",
      url: sourceUrl,
      note: sourceNote || (isMeaningfulUrl(sourceUrl) ? safeDomain(sourceUrl) : ""),
    },
  };
}

function buildLatestFetchAnalysis(notice, sources, payload) {
  const primarySource = toArray(sources)[0] ?? {};
  const information = dedupeInformation([
    { label: "지원 학력", value: notice.educationLevel || payload.educationLevel },
    { label: "고용 형태", value: notice.employmentType || payload.employmentType || "미기재" },
    { label: "모집 인원", value: notice.headcount },
    { label: "접수 기간", value: notice.applicationPeriod },
    isMeaningfulUrl(primarySource.url)
      ? {
          label: "원문 링크",
          value: asText(primarySource.title, safeDomain(primarySource.url)),
        }
      : null,
    {
      label: "상세 분석",
      value: "공고 원문 확인 완료. 전형/가점 분석은 아직 생략했습니다.",
    },
  ]);

  return normalizeAnalysisData({
    notice: {
      organization: notice.organization,
      title: notice.title,
      noticeDate: notice.noticeDate,
      educationLevel: notice.educationLevel,
      employmentType: notice.employmentType,
      headcount: notice.headcount,
      applicationPeriod: notice.applicationPeriod,
      summary: notice.summary,
    },
    information,
    process: [],
    bonusPoints: [],
  });
}

function mergeLatestSources(groundedSources, preferredSource) {
  const seen = new Set();

  return [preferredSource, ...toArray(groundedSources)]
    .map((source) => ({
      title: asText(source?.title, "공고 원문"),
      url: asText(source?.url),
      note: asText(source?.note, ""),
    }))
    .filter((source) => isMeaningfulUrl(source.url))
    .filter((source) => {
      if (seen.has(source.url)) {
        return false;
      }

      seen.add(source.url);
      return true;
    });
}

function normalizeAnalysisData(raw) {
  const notice = raw?.notice ?? {};

  return {
    notice: {
      organization: asText(notice.organization, "기업명 미기재"),
      title: asText(notice.title, "공고 제목 미기재"),
      noticeDate: asText(notice.noticeDate, "미기재"),
      educationLevel: asText(notice.educationLevel, "미기재"),
      employmentType: asText(notice.employmentType, "미기재"),
      headcount: asText(notice.headcount, "미기재"),
      applicationPeriod: asText(notice.applicationPeriod, "미기재"),
      summary: asText(notice.summary, "요약 정보가 없습니다."),
    },
    information: toArray(raw?.information).map((item) => ({
      label: asText(item?.label, "항목"),
      value: asText(item?.value, "미기재"),
    })),
    process: toArray(raw?.process).map((item) => ({
      stageName: asText(item?.stageName, "전형 단계"),
      schedule: asText(item?.schedule, UNKNOWN_TEXT),
      evaluationItems: toArray(item?.evaluationItems)
        .map((value) => asText(value))
        .filter(Boolean)
        .slice(0, 6),
      selectionRatio: asText(item?.selectionRatio, UNKNOWN_TEXT),
      score: asText(item?.score, UNKNOWN_TEXT),
      tieBreaker: asText(item?.tieBreaker, UNKNOWN_TEXT),
      notes: toArray(item?.notes)
        .map((value) => asText(value))
        .filter(Boolean)
        .slice(0, 4),
    })),
    bonusPoints: toArray(raw?.bonusPoints).map((item) => ({
      category: asText(item?.category, "가점"),
      details: asText(item?.details, UNKNOWN_TEXT),
      points: asText(item?.points, UNKNOWN_TEXT),
      notes: asText(item?.notes, UNKNOWN_TEXT),
    })),
  };
}

function isEffectivelyEmptyAnalysis(data, sources) {
  const notice = data?.notice ?? {};
  const missingNotice =
    !isMeaningfulValue(notice.organization) && !isMeaningfulValue(notice.title);
  const hasInformation = toArray(data?.information).some((item) => isMeaningfulValue(item?.value));
  const hasProcess = toArray(data?.process).some(
    (item) =>
      isMeaningfulValue(item?.schedule) ||
      isMeaningfulValue(item?.selectionRatio) ||
      isMeaningfulValue(item?.score) ||
      isMeaningfulValue(item?.tieBreaker) ||
      toArray(item?.evaluationItems).some((value) => isMeaningfulValue(value))
  );
  const hasBonus = toArray(data?.bonusPoints).some(
    (item) => isMeaningfulValue(item?.details) || isMeaningfulValue(item?.points)
  );
  const hasSources = Array.isArray(sources) && sources.length > 0;

  return missingNotice && !hasInformation && !hasProcess && !hasBonus && !hasSources;
}

function renderAnalysis(data, payload, sources) {
  renderNoticeCard(data.notice, payload);
  renderInformation(data.information);
  renderProcess(data.process);
  renderBonusPoints(data.bonusPoints);
  renderSources(sources, payload);
}

function renderNoticeCard(notice, payload) {
  const chips = [
    payload.analysisMode === "latest" ? "최신 공고 1회" : "업로드 공고",
    `학력: ${notice.educationLevel}`,
    `고용형태: ${notice.employmentType}`,
    `모집 인원: ${notice.headcount}`,
    `접수 기간: ${notice.applicationPeriod}`,
  ];

  elements.noticeCard.innerHTML = `
    <div class="notice-top">
      <div>
        <p class="section-label">기준 공고</p>
        <h3 class="notice-title">${escapeHtml(notice.organization)} / ${escapeHtml(notice.title)}</h3>
        <p class="notice-summary">${escapeHtml(notice.summary)}</p>
      </div>
      <span class="status-badge">${escapeHtml(notice.noticeDate)}</span>
    </div>
    <div class="notice-chip-row">
      ${chips.map((chip) => `<span class="notice-chip">${escapeHtml(chip)}</span>`).join("")}
    </div>
  `;
}

function renderInformation(items) {
  if (!items.length) {
    elements.informationPanel.innerHTML = `
      <div class="empty-state compact">
        <p>정리할 정보가 충분하지 않았습니다.</p>
      </div>
    `;
    return;
  }

  elements.informationPanel.innerHTML = `
    <div class="info-list">
      ${items
        .map(
          (item) => `
            <dl class="info-item">
              <dt>${escapeHtml(item.label)}</dt>
              <dd>${escapeHtml(item.value)}</dd>
            </dl>
          `
        )
        .join("")}
    </div>
  `;
}

function renderProcess(stages) {
  if (!stages.length) {
    elements.processPanel.innerHTML = `
      <div class="empty-state compact">
        <p>채용 절차 정보를 충분히 찾지 못했습니다.</p>
      </div>
    `;
    return;
  }

  elements.processPanel.innerHTML = stages
    .map((stage) => {
      const evaluationItems = stage.evaluationItems.length
        ? stage.evaluationItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
        : `<li>${escapeHtml(UNKNOWN_TEXT)}</li>`;

      const notes = stage.notes.length
        ? stage.notes.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
        : `<li>${escapeHtml(UNKNOWN_TEXT)}</li>`;

      return `
        <article class="stage-card">
          <h4>${escapeHtml(stage.stageName)}</h4>
          <div class="stage-grid">
            <div class="stage-key">
              <strong>일정</strong>
              <span>${escapeHtml(stage.schedule)}</span>
            </div>
            <div class="stage-key">
              <strong>평가 배수</strong>
              <span>${escapeHtml(stage.selectionRatio)}</span>
            </div>
            <div class="stage-key">
              <strong>배점</strong>
              <span>${escapeHtml(stage.score)}</span>
            </div>
            <div class="stage-key">
              <strong>동점자 처리 기준</strong>
              <span>${escapeHtml(stage.tieBreaker)}</span>
            </div>
          </div>
          <div>
            <strong>평가 항목</strong>
            <ul class="stage-meta">${evaluationItems}</ul>
          </div>
          <div>
            <strong>비고</strong>
            <ul class="stage-notes">${notes}</ul>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderBonusPoints(items) {
  if (!items.length) {
    elements.bonusPanel.innerHTML = `
      <div class="empty-state compact">
        <p>정리할 가점 항목이 충분하지 않았습니다.</p>
      </div>
    `;
    return;
  }

  elements.bonusPanel.innerHTML = `
    <div class="bonus-grid">
      ${items
        .map(
          (item) => `
            <article class="bonus-card">
              <h4>${escapeHtml(item.category)}</h4>
              <p class="bonus-copy">${escapeHtml(item.details)}</p>
              <p class="bonus-copy"><strong>적용 수치</strong> ${escapeHtml(item.points)}</p>
              <p class="bonus-copy"><strong>참고</strong> ${escapeHtml(item.notes)}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSources(sources, payload) {
  const sourceCards = sources.length
    ? sources
        .map(
          (source) => `
            <article class="source-card">
              <h4>${escapeHtml(source.title || "기준 자료")}</h4>
              <p class="source-note">${escapeHtml(source.note || "")}</p>
              ${
                source.url
                  ? `<a class="source-link" href="${escapeAttribute(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.linkLabel || "원문 보기")}</a>`
                  : ""
              }
            </article>
          `
        )
        .join("")
    : `
        <div class="empty-state compact">
          <p>기준 자료를 찾지 못했습니다.</p>
        </div>
      `;

  const questionCard = payload.questionPrompt
    ? `
        <article class="source-card">
          <h4>질문 사항</h4>
          <p class="source-note">${escapeHtml(payload.questionPrompt)}</p>
        </article>
      `
    : "";

  elements.sourcePanel.innerHTML = `
    <div class="source-list">
      ${sourceCards}
      ${questionCard}
    </div>
  `;
}

function renderLoadingState() {
  elements.noticeCard.innerHTML = `
    <div class="loading-shell">
      <div class="loading-line"></div>
      <div class="loading-line medium"></div>
      <div class="loading-line short"></div>
    </div>
  `;

  elements.informationPanel.innerHTML = loadingBlock("핵심 정보를 정리하고 있습니다.");
  elements.processPanel.innerHTML = loadingBlock("채용 절차를 정리하고 있습니다.");
  elements.bonusPanel.innerHTML = loadingBlock("가점 항목을 확인하고 있습니다.");
  elements.sourcePanel.innerHTML = loadingBlock("기준 자료를 정리하고 있습니다.");
}

function loadingBlock(message) {
  return `
    <div class="empty-state compact">
      <p>${escapeHtml(message)}</p>
      <div class="loading-shell">
        <div class="loading-line"></div>
        <div class="loading-line medium"></div>
        <div class="loading-line short"></div>
      </div>
    </div>
  `;
}

function renderErrorState(message) {
  elements.noticeCard.innerHTML = `
    <div class="empty-state">
      <h3>분석을 완료하지 못했습니다</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;

  const errorState = `
    <div class="empty-state compact">
      <p>${escapeHtml(message)}</p>
    </div>
  `;

  elements.informationPanel.innerHTML = errorState;
  elements.processPanel.innerHTML = errorState;
  elements.bonusPanel.innerHTML = errorState;
  elements.sourcePanel.innerHTML = errorState;
}

function setBusy(isBusy) {
  elements.analyzeButton.disabled = isBusy;
}

function setStatus(type, badgeText, message) {
  elements.statusBadge.textContent = badgeText;
  elements.statusBadge.className = `status-badge ${type}`;
  elements.statusText.textContent = message;
}

function revealResults() {
  elements.results.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function supportsStructuredOutputWithTools(modelName) {
  return /^gemini-3/i.test(String(modelName ?? "").trim());
}

function shouldRetryWithoutStructuredOutput(error, requestBody) {
  const message = error instanceof Error ? error.message : "";
  const hasStructuredOutput =
    Boolean(requestBody?.generationConfig?.responseMimeType) ||
    Boolean(requestBody?.generationConfig?.responseJsonSchema);

  return hasStructuredOutput && /tool use with a response mime type/i.test(message);
}

function extractResponseText(data, options = {}) {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((part) => typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();

  if (!text) {
    if (options.allowEmpty) {
      return "";
    }

    throw new Error("모델 응답에서 텍스트를 찾지 못했습니다.");
  }

  return text;
}

function parseJsonObject(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : text.trim();
  const startIndex = candidate.indexOf("{");
  const endIndex = candidate.lastIndexOf("}");

  if (startIndex === -1 || endIndex === -1) {
    throw new Error("모델 응답을 JSON으로 해석하지 못했습니다.");
  }

  const jsonText = candidate.slice(startIndex, endIndex + 1);

  try {
    return JSON.parse(jsonText);
  } catch {
    throw new Error("모델 응답 JSON을 파싱하지 못했습니다.");
  }
}

function parseLatestNoticePayload(text, payload, groundedSources = []) {
  if (text) {
    try {
      return parseJsonObject(text);
    } catch {
      const groundedSource = toArray(groundedSources)[0] ?? {};
      const fallbackTitle = extractNoticeTitleFromText(text) || asText(groundedSource.title, "");
      const fallbackUrl = extractFirstUrl(text) || asText(groundedSource.url);

      return {
        notice: {
          organization: payload.companyName || "기업명 미기재",
          title: fallbackTitle || "공고 제목 미기재",
          noticeDate: "미기재",
          educationLevel: payload.educationLevel || "미기재",
          employmentType: payload.employmentType || "미기재",
          headcount: "미기재",
          applicationPeriod: "미기재",
          summary:
            trimSummary(text, 180) ||
            "최신 공고 원문을 찾았습니다. 상세 전형 분석과 가점 분석은 아직 생략하고 있습니다.",
        },
        source: {
          title: asText(groundedSource.title, fallbackTitle || "공고 원문"),
          url: fallbackUrl,
          note: "모델 자유 형식 응답에서 공고 정보를 보정했습니다.",
        },
      };
    }
  }

  const groundedSource = toArray(groundedSources)[0] ?? {};
  return {
    notice: {
      organization: payload.companyName || "기업명 미기재",
      title: asText(groundedSource.title, "공고 제목 미기재"),
      noticeDate: "미기재",
      educationLevel: payload.educationLevel || "미기재",
      employmentType: payload.employmentType || "미기재",
      headcount: "미기재",
      applicationPeriod: "미기재",
      summary: "최신 공고 원문 링크를 찾았습니다. 상세 전형 분석과 가점 분석은 아직 생략하고 있습니다.",
    },
    source: {
      title: asText(groundedSource.title, "공고 원문"),
      url: asText(groundedSource.url),
      note: asText(groundedSource.note, ""),
    },
  };
}

function extractFirstUrl(text) {
  const match = String(text ?? "").match(/https?:\/\/\S+/i);
  return match ? match[0].replace(/[)\],.]+$/g, "") : "";
}

function extractNoticeTitleFromText(text) {
  return (
    splitLines(text).find((line) => /채용|모집|공고|인턴|신입|경력/.test(line) && line.length <= 120) ||
    ""
  );
}

function normalizeGroundedSources(chunks) {
  const seen = new Set();
  return toArray(chunks)
    .map((chunk) => {
      const web = chunk?.web ?? {};
      return {
        title: asText(web.title, "검색 결과"),
        url: asText(web.uri),
        note: asText(web.uri ? safeDomain(web.uri) : "", ""),
      };
    })
    .filter((item) => item.url)
    .filter((item) => {
      if (seen.has(item.url)) {
        return false;
      }
      seen.add(item.url);
      return true;
    });
}

function resolveErrorMessage(error, mode) {
  const message = error instanceof Error ? error.message : "";
  const httpStatus = Number(error?.httpStatus ?? 0);
  const apiStatus = String(error?.apiStatus ?? "");

  if (httpStatus === 429 || /RESOURCE_EXHAUSTED|rate limit|quota/i.test(`${message} ${apiStatus}`)) {
    const dailyHint = /day|daily|RPD/i.test(message)
      ? "현재 무료 키의 일일 요청 한도에 도달한 상태입니다."
      : "현재 무료 키의 요청 한도에 도달한 상태입니다.";

    return `${dailyHint} Google 공식 문서 기준 429 RESOURCE_EXHAUSTED는 무료 Gemini API rate limit 초과일 때 발생합니다. 특정 공고 업로드 모드는 API 없이 바로 사용할 수 있고, 최신 공고 1회 모드는 한도 초기화 뒤 다시 시도해 주세요.`;
  }

  if (httpStatus === 403 || /PERMISSION_DENIED|API key|authentication/i.test(`${message} ${apiStatus}`)) {
    return "Gemini API 키 권한을 확인해 주세요. 잘못된 키이거나, 사용할 수 없는 키일 수 있습니다.";
  }

  if (/reported as leaked|leaked/i.test(message)) {
    return "이 API 키는 Google에서 노출된 키로 판단해 차단했을 수 있습니다. 새 키를 발급해 다시 시도해 주세요.";
  }

  if (/tool use with a response mime type/i.test(message)) {
    return "현재 사용 중인 Gemini 모델은 검색 도구와 JSON 강제 응답을 함께 처리하지 못해 실패했습니다. 최신 공고 요청은 이제 도구 호환 방식으로 다시 보내도록 수정해야 하며, 배포가 갱신되면 정상 동작해야 합니다.";
  }

  if (mode === "upload") {
    return message || "업로드한 공고를 분석하지 못했습니다. 텍스트가 포함된 PDF인지 확인해 주세요.";
  }

  return message || "알 수 없는 오류가 발생했습니다.";
}

function safeDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function asText(value, fallback = "") {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

function isMeaningfulUrl(value) {
  return /^https?:\/\/\S+/i.test(asText(value));
}

function isMeaningfulValue(value) {
  const text = asText(value).trim();
  return Boolean(
    text &&
      ![
        "",
        UNKNOWN_TEXT,
        "미기재",
        "기업명 미기재",
        "공고 제목 미기재",
        "요약 정보가 없습니다.",
      ].includes(text)
  );
}

function uniqueTexts(values) {
  return [...new Set(values.map((value) => asText(value)).filter(Boolean))];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
