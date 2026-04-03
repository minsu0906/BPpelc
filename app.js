const MODEL_NAME = "gemini-3-flash-preview";
const STORAGE_KEY = "job-bonus-radar-gemini-key";

const ROLE_BLUEPRINTS = {
  it: {
    title: "IT·개발",
    certifications: [
      "정보처리기사: 공공기관 전산 직군과 대기업 IT 지원서에서 설명하기 쉬운 기본 자격",
      "SQLD 또는 ADsP: 데이터 이해도와 실무 적응력을 함께 보여주기 좋음",
      "리눅스마스터 또는 정보보안기사: 인프라·보안 성향 직무에서 연결성이 큼",
    ],
    bonus: "공기업 전산 직군은 기사 자격증, 어학, 한국사, OA 역량을 함께 보는 경우가 많습니다.",
  },
  admin: {
    title: "사무·행정",
    certifications: [
      "컴퓨터활용능력 1급: 공기업 사무직에서 체감 활용도가 높고 자주 언급됨",
      "한국사능력검정시험: 공공기관 가산점 또는 우대조건에서 반복적으로 등장",
      "토익스피킹·오픽: 민간 대기업 지원서에서 커뮤니케이션 역량 증빙용으로 활용",
    ],
    bonus: "사무직은 직접적인 기사 자격보다 OA, 어학, 한국사, 직무 관련 경험 정리가 더 중요할 수 있습니다.",
  },
  finance: {
    title: "재무·회계",
    certifications: [
      "전산회계·전산세무 또는 FAT·TAT: 실무형 회계 역량을 빠르게 보여주기 좋음",
      "재경관리사: 민간기업 회계·재무 지원 시 설명하기 쉬운 중간 레벨 자격",
      "AFPK 또는 투자자산운용사: 금융기관·금융 공기업 계열 준비 시 참고 가능",
    ],
    bonus: "채용공고에 따라 자격증보다 회계 실습, 인턴 경험, ERP 활용 경험이 더 중요하게 반영될 수 있습니다.",
  },
  electrical: {
    title: "전기·설비",
    certifications: [
      "전기기사: 발전·에너지·설비 계열 공기업과 대기업 설비 직무에서 우선순위가 높음",
      "전기공사기사: 시공·운영·유지보수 계열 공고와 연결되기 쉬움",
      "산업안전기사: 현장 운영과 안전관리 성격이 함께 있는 포지션에 도움",
    ],
    bonus: "발전·인프라 계열 공기업은 기사 자격증이 전형 단계 가산 또는 우대의 근거로 이어지는 경우가 많습니다.",
  },
  mechanical: {
    title: "기계·생산",
    certifications: [
      "일반기계기사: 생산기술·설비·R&D 지원 시 범용성이 높음",
      "기계설계기사 또는 CAD 관련 자격: 설계·도면 해석 어필에 유리",
      "품질경영기사: 생산관리·품질관리 직무에 연결하기 좋음",
    ],
    bonus: "대기업 생산기술은 자격증보다 프로젝트·캡스톤·공정 이해를 같이 설명할 때 설득력이 올라갑니다.",
  },
  safety: {
    title: "안전·품질",
    certifications: [
      "산업안전기사: 거의 기본 축으로 볼 수 있는 핵심 자격",
      "품질경영기사: 품질보증·품질관리 직무와 연결성이 높음",
      "위험물산업기사 또는 대기환경기사: 사업장 특성에 따라 추가 우대 가능",
    ],
    bonus: "현장형 직무는 자격증 보유 여부가 서류 메리트로 이어지기 쉬우므로 우선적으로 확보할 가치가 큽니다.",
  },
  marketing: {
    title: "영업·마케팅",
    certifications: [
      "GAIQ 또는 디지털마케팅 관련 수료: 성과 기반 마케팅 직무에서 설명이 쉬움",
      "검색광고마케터: 퍼포먼스 마케팅 직무 초반 포트폴리오 보강용",
      "토익스피킹·오픽: 대기업 영업 직무에서 대외 커뮤니케이션 역량 보완용",
    ],
    bonus: "이 직무군은 자격증보다 포트폴리오, 캠페인 성과, 데이터 해석 경험이 더 강한 신호가 되는 경우가 많습니다.",
  },
};

const DEMO_RESULTS = {
  latest: {
    status: "데모는 최신 공고 1건 기준 예시입니다. 실제 최신 결과는 API 키 입력 후 받아오세요.",
    queries: [
      "2026 공기업 사무 신입 최신 채용 공고 자격증 우대",
      "2026 대기업 IT 신입 최신 채용 공고 우대사항",
    ],
    analysis: `
## 기준 공고
- 예시 기준 공고: 에너지·인프라 계열 공기업의 최근 신입 채용 공고 1건을 기준으로 시연합니다.
- 기준 방식: 가장 최근 공개된 공고 1건에서 요구사항과 우대요건을 우선 해석합니다.

## 핵심 요약
- 공기업 사무·전산 계열은 컴퓨터활용능력, 한국사, 직무 관련 기사 자격증이 여전히 설명력이 큽니다.
- 대기업은 점수형 가산점보다 직무 연관 자격증과 프로젝트 경험을 묶어 평가하는 흐름이 강합니다.
- 전기·설비·안전 직군은 기사 자격증이 서류 경쟁력과 직접 연결될 가능성이 높습니다.

## 준비할 자격증
- 정보처리기사: 전산·IT 계열 최신 공고 1건 기준으로도 가장 설명하기 쉬운 기본 자격입니다.
- 컴퓨터활용능력 1급: 공기업 사무직 공고에서 자주 연결되는 실무형 자격입니다.
- 한국사능력검정시험: 공공기관 우대조건이나 가산점 항목과 연결될 가능성이 큽니다.

## 가산점 포인트
- 한국사, 기사 자격증, OA 능력은 기관에 따라 가산 또는 우대 문구로 표현될 수 있습니다.
- 명시적인 가산점 여부는 원 공고의 지원자격·우대사항 항목에서 다시 확인해야 합니다.

## 최근 공고 예시
- 공기업 사무직 공고: 컴활, 한국사, OA 활용 역량을 묻는 흐름이 반복됩니다.
- IT 계열 공고: 정보처리기사, SQL, 프로젝트 경험을 함께 평가하는 흐름이 보입니다.

## 4주 준비 플랜
1. 목표 직무 기준 최신 공고 1건을 저장하고 우대사항을 문장 단위로 분해합니다.
2. 반복되는 자격증 1개를 선택해 시험 일정과 공부 범위를 확정합니다.
3. 자격증이 직무 역량을 어떻게 증명하는지 자기소개서 문장으로 연결합니다.
4. 지원 전 같은 기관의 직전 채용 공고까지 비교해 요구 수준을 점검합니다.

## 주의사항
- 1건 기준 분석은 빠르게 방향을 잡는 데 유리하지만 전체 시장 흐름을 대표하지 않을 수 있습니다.
- 실제 지원 전에는 해당 기관의 원문 공고와 직전 채용도 함께 확인해야 합니다.
    `.trim(),
    sources: [
      { title: "ALIO 공공기관 채용정보", uri: "https://job.alio.go.kr/" },
      { title: "워크24 채용정보", uri: "https://www.work24.go.kr/" },
    ],
  },
  range: {
    status: "데모는 특정 기간 공고 기준 예시입니다. 실제 기간 분석은 날짜 입력 후 실행하세요.",
    queries: [
      "2026 03 공기업 전산 채용 공고 자격증 우대",
      "2026 03 대기업 생산기술 채용 기사 자격증",
    ],
    analysis: `
## 기준 공고
- 예시 기준 기간: 2026-03-01부터 2026-03-31까지 공개된 관련 공고 흐름을 묶어 시연합니다.
- 기준 방식: 지정 기간 안에서 반복 등장한 자격증과 우대조건을 중심으로 정리합니다.

## 핵심 요약
- 기간 모드는 단일 공고보다 반복 패턴을 보기 좋고, 준비 우선순위를 정할 때 더 안정적입니다.
- 공기업은 한국사, 컴활, 기사 자격증이 기관별로 우대 또는 가산 항목과 연결될 수 있습니다.
- 기술 직군은 기간을 넓혀 볼수록 전기기사, 산업안전기사, 정보처리기사처럼 공통 분모가 드러납니다.

## 준비할 자격증
- 전기기사: 발전·설비·인프라 계열 공고에서 반복적으로 연결될 가능성이 높습니다.
- 산업안전기사: 현장 운영, 생산, 안전관리 계열을 함께 준비할 때 활용 범위가 넓습니다.
- 정보처리기사: 공기업 전산과 민간 IT 직무 사이의 공통 신호로 쓰기 좋습니다.

## 가산점 포인트
- 공공기관은 직무 관련 기사 자격증, 한국사, 보훈·장애인 관련 항목을 구분해 표기하는 경우가 많습니다.
- 기간 분석에서는 특정 기관의 실제 점수보다 어떤 조건이 반복되는지 보는 데 초점을 둬야 합니다.

## 최근 공고 예시
- 에너지 계열 공기업: 전기기사, 전기공사기사, 산업안전기사 우대 흐름이 자주 보입니다.
- 대기업 생산기술 공고: 기계·전기 기사 자격과 현장형 프로젝트 경험을 함께 요구하는 경우가 많습니다.

## 4주 준비 플랜
1. 기간 내 공고를 5건 이상 모아 공통 요구사항을 표로 정리합니다.
2. 가장 자주 등장한 자격증 1개와 보조 자격증 1개를 나눠 우선순위를 정합니다.
3. 각 자격증을 어떤 직무 역량으로 설명할지 이력서 문장을 준비합니다.
4. 기간 마지막 주의 공고를 다시 확인해 최근 요구 변화가 있었는지 점검합니다.

## 주의사항
- 기간이 너무 넓으면 오래된 요구사항이 섞일 수 있으므로 최근 1~2개월 범위가 보통 더 실용적입니다.
- 기관별 가산점 문구는 동일해 보이더라도 적용 단계가 다를 수 있습니다.
    `.trim(),
    sources: [
      { title: "ALIO 공공기관 채용정보", uri: "https://job.alio.go.kr/" },
      { title: "워크24 채용정보", uri: "https://www.work24.go.kr/" },
      { title: "삼성커리어스", uri: "https://www.samsungcareers.com/" },
    ],
  },
};

const elements = {
  form: document.getElementById("analysisForm"),
  apiKey: document.getElementById("apiKey"),
  analyzeButton: document.getElementById("analyzeButton"),
  demoButton: document.getElementById("demoButton"),
  statusBadge: document.getElementById("statusBadge"),
  statusText: document.getElementById("statusText"),
  queryTags: document.getElementById("queryTags"),
  analysisPanel: document.getElementById("analysisPanel"),
  sourcePanel: document.getElementById("sourcePanel"),
  blueprintPanel: document.getElementById("blueprintPanel"),
  jobFamily: document.getElementById("jobFamily"),
  startDate: document.getElementById("startDate"),
  endDate: document.getElementById("endDate"),
  modeInputs: Array.from(document.querySelectorAll('input[name="analysisMode"]')),
};

function initialize() {
  const savedKey = localStorage.getItem(STORAGE_KEY);
  if (savedKey) {
    elements.apiKey.value = savedKey;
  }

  setDefaultDates();
  updateDateInputs();
  renderBlueprint(elements.jobFamily.value);
  renderDemoResult();

  elements.jobFamily.addEventListener("change", (event) => {
    renderBlueprint(event.target.value);
  });

  elements.modeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      updateDateInputs();
      renderDemoResult();
    });
  });

  elements.form.addEventListener("submit", handleAnalyze);
  elements.demoButton.addEventListener("click", renderDemoResult);
}

function setDefaultDates() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 29);

  elements.startDate.value = toDateInputValue(start);
  elements.endDate.value = toDateInputValue(today);
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getAnalysisMode() {
  return (
    document.querySelector('input[name="analysisMode"]:checked')?.value ?? "latest"
  );
}

function updateDateInputs() {
  const enabled = getAnalysisMode() === "range";
  elements.startDate.disabled = !enabled;
  elements.endDate.disabled = !enabled;
}

function renderBlueprint(roleKey) {
  const blueprint = ROLE_BLUEPRINTS[roleKey] ?? ROLE_BLUEPRINTS.it;

  elements.blueprintPanel.innerHTML = `
    <div class="blueprint-group">
      <h3>${escapeHtml(blueprint.title)} 우선 자격</h3>
      <ul>
        ${blueprint.certifications.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </div>
    <div class="blueprint-group">
      <h3>읽는 법</h3>
      <p class="blueprint-note">${escapeHtml(blueprint.bonus)}</p>
    </div>
  `;
}

async function handleAnalyze(event) {
  event.preventDefault();

  const formData = new FormData(elements.form);
  const mode = getAnalysisMode();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const payload = {
    mode,
    sector: String(formData.get("sector") ?? "both"),
    jobFamily: String(formData.get("jobFamily") ?? "it"),
    timeWindow: String(formData.get("timeWindow") ?? "30"),
    focusList: String(formData.get("focusList") ?? "").trim(),
    extraPrompt: String(formData.get("extraPrompt") ?? "").trim(),
    startDate: String(formData.get("startDate") ?? "").trim(),
    endDate: String(formData.get("endDate") ?? "").trim(),
  };

  if (!apiKey) {
    setStatus("error", "API 키 필요", "Gemini API 키를 입력한 뒤 다시 실행해 주세요.");
    return;
  }

  if (mode === "range") {
    if (!payload.startDate || !payload.endDate) {
      setStatus("error", "날짜 확인", "기간 분석 모드에서는 시작일과 종료일을 모두 입력해 주세요.");
      return;
    }

    if (payload.startDate > payload.endDate) {
      setStatus("error", "날짜 순서 확인", "시작일은 종료일보다 늦을 수 없습니다.");
      return;
    }
  }

  localStorage.setItem(STORAGE_KEY, apiKey);
  setBusy(true);
  setStatus(
    "loading",
    "검색 중",
    mode === "latest"
      ? "가장 최근 관련 공고 1건을 찾고 자격증·가산점 포인트를 정리하고 있습니다."
      : "지정한 기간의 공고를 모아 반복되는 자격증·가산점 포인트를 정리하고 있습니다."
  );
  renderLoadingState();

  try {
    const prompt = buildPrompt(payload);
    const response = await requestGemini(apiKey, prompt);
    const text = extractResponseText(response);
    const metadata = response?.candidates?.[0]?.groundingMetadata ?? {};
    const queries = metadata.webSearchQueries ?? [];
    const sources = normalizeSources(metadata.groundingChunks ?? []);

    renderQueries(queries);
    renderAnalysis(text);
    renderSources(sources);

    setStatus(
      "success",
      "완료",
      mode === "latest"
        ? "최신 공고 1건 기준 분석을 마쳤습니다. 해당 기관의 원문 공고를 한 번 더 확인해 주세요."
        : "지정 기간 기준 분석을 마쳤습니다. 기간 내 대표 공고와 원문 조건을 다시 확인해 주세요."
    );
  } catch (error) {
    console.error(error);
    const message = resolveErrorMessage(error);
    setStatus("error", "오류 발생", message);
    renderErrorState(message);
  } finally {
    setBusy(false);
  }
}

function buildPrompt(payload) {
  const sectorMap = {
    both: "한국의 대기업과 공기업을 함께",
    large: "한국의 대기업을 중심으로",
    public: "한국의 공기업을 중심으로",
  };

  const roleMap = {
    it: "IT·개발",
    admin: "사무·행정",
    finance: "재무·회계",
    electrical: "전기·설비",
    mechanical: "기계·생산",
    safety: "안전·품질",
    marketing: "영업·마케팅",
  };

  const focusText = payload.focusList
    ? `특히 다음 기업·기관을 우선 검색해: ${payload.focusList}.`
    : "특정 기업이 없으면 대표 대기업과 주요 공기업 중 관련 공고를 찾아.";

  const extraText = payload.extraPrompt ? `추가 요청: ${payload.extraPrompt}` : "";

  if (payload.mode === "latest") {
    return `
너는 한국 취업 준비용 채용공고 분석 어시스턴트다.
반드시 웹 검색 결과를 근거로 답하고, 최근 ${payload.timeWindow}일 안팎 자료를 우선 참고해라.
${sectorMap[payload.sector]} ${roleMap[payload.jobFamily]} 직무 채용공고를 찾아라.
기본 원칙은 "가장 최근 공고 1건"을 기준으로 분석하는 것이다.
같은 날짜의 공고가 여러 개면 우대사항과 자격요건이 가장 명확한 공고 1건을 선택해라.
${focusText}
${extraText}

응답 규칙:
- 한국어로만 작성한다.
- 날짜는 YYYY-MM-DD 형식으로 적는다.
- 어떤 공고를 기준으로 잡았는지 분명하게 적는다.
- 자격증과 가산점 포인트는 선택한 1건의 공고를 우선 기준으로 설명한다.
- 공고에 명시되지 않은 가산점은 "공고에서 명시 여부 확인 필요"라고 적는다.
- 너무 길지 않게, 하지만 바로 준비를 시작할 수 있을 정도로 실용적으로 써라.

반드시 아래 형식을 지켜라.

## 기준 공고
- 기업/기관명:
- 공고명 또는 채용분야:
- 확인한 날짜 정보:

## 핵심 요약
- bullet 3개

## 준비할 자격증
- 자격증명: 이유

## 가산점 포인트
- 포인트: 설명

## 최근 공고 예시
- 선택한 공고의 핵심 문구 또는 특징

## 4주 준비 플랜
1. step
2. step
3. step
4. step

## 주의사항
- bullet 2개 이상
    `.trim();
  }

  return `
너는 한국 취업 준비용 채용공고 분석 어시스턴트다.
반드시 웹 검색 결과를 근거로 답하고, 아래 지정 기간 안에 공개되었거나 확인 가능한 공고를 우선 참고해라.
분석 대상 기간은 ${payload.startDate}부터 ${payload.endDate}까지다.
${sectorMap[payload.sector]} ${roleMap[payload.jobFamily]} 직무 채용공고 흐름을 정리해라.
${focusText}
${extraText}

응답 규칙:
- 한국어로만 작성한다.
- 날짜는 YYYY-MM-DD 형식으로 적는다.
- 지정 기간 전체의 흐름을 요약하되, 반복되는 자격증과 우대조건을 중심으로 설명한다.
- 기간 안에 공고 수가 적으면 그렇게 명시한다.
- 가산점이 공고에 직접 드러나지 않으면 "기관별 명시 여부 확인 필요"라고 적는다.
- 너무 길지 않게, 하지만 바로 준비를 시작할 수 있을 정도로 실용적으로 써라.

반드시 아래 형식을 지켜라.

## 기준 공고
- 분석 기간:
- 대표 공고 흐름:
- 기간 내 관찰 포인트:

## 핵심 요약
- bullet 3개

## 준비할 자격증
- 자격증명: 이유

## 가산점 포인트
- 포인트: 설명

## 최근 공고 예시
- 기업/기관: 공고 특징

## 4주 준비 플랜
1. step
2. step
3. step
4. step

## 주의사항
- bullet 2개 이상
  `.trim();
}

async function requestGemini(apiKey, prompt) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.35,
          topP: 0.9,
          maxOutputTokens: 2048,
        },
      }),
      signal: controller.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      const message =
        data?.error?.message ??
        "Gemini API 요청이 실패했습니다. 키 상태와 사용량 한도를 확인해 주세요.";
      throw new Error(message);
    }

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("응답 시간이 길어 요청이 중단되었습니다. 잠시 후 다시 시도해 주세요.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function extractResponseText(data) {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((part) => typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("모델 응답 텍스트를 찾지 못했습니다.");
  }

  return text;
}

function normalizeSources(chunks) {
  const seen = new Set();

  return chunks
    .map((chunk) => chunk?.web)
    .filter((web) => web?.uri && web?.title)
    .filter((web) => {
      if (seen.has(web.uri)) {
        return false;
      }
      seen.add(web.uri);
      return true;
    });
}

function renderDemoResult() {
  const demo = DEMO_RESULTS[getAnalysisMode()] ?? DEMO_RESULTS.latest;
  setStatus("success", "데모 표시", demo.status);
  renderQueries(demo.queries);
  renderAnalysis(demo.analysis);
  renderSources(demo.sources);
}

function renderQueries(queries) {
  if (!queries.length) {
    elements.queryTags.innerHTML = "";
    return;
  }

  elements.queryTags.innerHTML = queries
    .map((query) => `<span>${escapeHtml(query)}</span>`)
    .join("");
}

function renderAnalysis(markdownText) {
  const sections = parseSections(markdownText);

  if (!sections.length) {
    elements.analysisPanel.innerHTML = `
      <div class="analysis-section">
        <h3>분석 결과</h3>
        <p>${escapeHtml(markdownText)}</p>
      </div>
    `;
    return;
  }

  elements.analysisPanel.innerHTML = sections.map((section) => renderSection(section)).join("");
}

function parseSections(text) {
  return text
    .split(/^##\s+/m)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [firstLine, ...rest] = block.split("\n");
      return {
        title: firstLine.trim(),
        body: rest.join("\n").trim(),
      };
    });
}

function renderSection(section) {
  const lines = section.body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const bullets = lines.filter((line) => line.startsWith("- "));
  const numbered = lines.filter((line) => /^\d+\.\s/.test(line));
  const paragraphs = lines.filter(
    (line) => !line.startsWith("- ") && !/^\d+\.\s/.test(line)
  );

  let content = "";

  if (bullets.length) {
    content += `
      <ul class="analysis-list">
        ${bullets
          .map((line) => `<li>${escapeHtml(line.replace(/^- /, ""))}</li>`)
          .join("")}
      </ul>
    `;
  }

  if (numbered.length) {
    content += `
      <ol class="analysis-ordered">
        ${numbered
          .map((line) => `<li>${escapeHtml(line.replace(/^\d+\.\s/, ""))}</li>`)
          .join("")}
      </ol>
    `;
  }

  if (paragraphs.length) {
    content += paragraphs.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  }

  return `
    <section class="analysis-section">
      <h3>${escapeHtml(section.title)}</h3>
      ${content}
    </section>
  `;
}

function renderSources(sources) {
  if (!sources.length) {
    elements.sourcePanel.innerHTML = `
      <div class="empty-state compact">
        <p>검색 근거가 없거나 모델이 별도 출처를 반환하지 않았습니다.</p>
      </div>
    `;
    return;
  }

  elements.sourcePanel.innerHTML = sources
    .map((source) => {
      const domain = safeDomain(source.uri);
      return `
        <a class="source-link" href="${escapeAttribute(source.uri)}" target="_blank" rel="noreferrer noopener">
          <h3>${escapeHtml(source.title)}</h3>
          <p>${escapeHtml(source.uri)}</p>
          <span class="domain">${escapeHtml(domain)}</span>
        </a>
      `;
    })
    .join("");
}

function renderLoadingState() {
  elements.analysisPanel.innerHTML = `
    <div class="analysis-section">
      <h3>공고를 분석하는 중입니다</h3>
      <div class="loading-shell">
        <div class="loading-line"></div>
        <div class="loading-line medium"></div>
        <div class="loading-line"></div>
        <div class="loading-line short"></div>
      </div>
    </div>
  `;

  elements.sourcePanel.innerHTML = `
    <div class="analysis-section">
      <h3>근거 문서를 수집하는 중입니다</h3>
      <div class="loading-shell">
        <div class="loading-line"></div>
        <div class="loading-line medium"></div>
        <div class="loading-line short"></div>
      </div>
    </div>
  `;
}

function renderErrorState(message) {
  elements.analysisPanel.innerHTML = `
    <div class="analysis-section">
      <h3>요청을 완료하지 못했습니다</h3>
      <p>${escapeHtml(message)}</p>
      <p>잠시 후 다시 시도하거나 데모 결과로 화면 구성을 먼저 확인해 보세요.</p>
    </div>
  `;
}

function setBusy(isBusy) {
  elements.analyzeButton.disabled = isBusy;
  elements.demoButton.disabled = isBusy;
}

function setStatus(type, badgeText, message) {
  elements.statusBadge.textContent = badgeText;
  elements.statusBadge.className = `status-badge ${type}`;
  elements.statusText.textContent = message;
}

function resolveErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "알 수 없는 오류가 발생했습니다.";
}

function safeDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
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

initialize();
