# 채용 가산점 레이더

대기업·공기업 채용공고를 기준으로 채용 정보, 전형 절차, 주요 가점 항목을 정리해주는 정적 웹앱입니다.

## 바로 열기

- 서비스 링크: [https://minsu0906.github.io/BPpelc/](https://minsu0906.github.io/BPpelc/)
- 저장소: [https://github.com/minsu0906/BPpelc](https://github.com/minsu0906/BPpelc)

## 현재 기능

- 최신 공고 1건 기준 분석
- 특정 공고 PDF 업로드 분석
- Gemini `google_search` 기반 최신 공고 탐색
- 지원 자격, 채용 절차, 가점 항목, 출처 링크 정리

## 사용 방법

1. 서비스 링크를 엽니다.
2. 원하는 기업과 학력 구분을 입력합니다.
3. `최신 공고 1회` 또는 `특정 공고 업로드`를 선택합니다.
4. 최신 공고 모드라면 Gemini API 키를 입력합니다.
5. `공고 기준 분석하기`를 누릅니다.

## 배포 방식

- 이 프로젝트는 빌드 없는 정적 사이트입니다.
- `main` 브랜치에 반영되면 GitHub Actions가 GitHub Pages로 자동 배포합니다.
- 배포 워크플로는 [.github/workflows/deploy-pages.yml](./.github/workflows/deploy-pages.yml)에 있습니다.

## 참고

- 이 앱은 브라우저에서 직접 Gemini API를 호출합니다.
- 실제 서비스 수준으로 운영하려면 서버 프록시나 서버리스 함수로 API 키를 숨기는 구성이 더 안전합니다.
- 현재 기본 모델은 `gemini-2.5-flash-lite`입니다.
