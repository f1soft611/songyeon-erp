# 01. 프로젝트 분석 & 기술 감지 스킬 (01-project-analysis)

> **목적**: 작업 시작 전 대상 프로젝트의 언어, 프레임워크, 테스트 환경 및 현재 빌드/테스트 상태(Baseline)를 자동으로 분석하고 파악합니다.

---

## 📋 수행 절차

### 1. 작업 대상 디렉터리 감지

- 작업 변경 범위가 프론트엔드(`frontend/`), 백엔드(`backend/`), 또는 양쪽 모두에 해당하는지 확인합니다.

### 2. 기술 스택 프로필 판별 및 정의 로드

- **SONGYEON ERP 프론트엔드 (`frontend/`)**:
  - 스택 정의 참조: `.github/f1workflow/tech-stacks/s-erp-react-vite.yml`
  - `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json` 확인
  - 주요 스택: React 18, TypeScript, Vite, Vitest, MUI (Material UI), F1-Grid
  - 테스트 명령: `npm run test` (Vitest), UI 캡처: Playwright 스크립트 (`scripts/capture-*.js`)
- **SONGYEON ERP 백엔드 (`backend/`)**:
  - 스택 정의 참조: `.github/f1workflow/tech-stacks/s-erp-java-egov.yml`
  - `backend/pom.xml`, `backend/src/main/resources/` 확인
  - 주요 스택: Java 8+, Spring Boot / eGovFrame 4.x, MyBatis (PostgreSQL), Maven
  - 테스트 명령: `mvn test`, 실행 명령: `mvn spring-boot:run`
  - Java 8 호환성 점검: Java 9+ 문법/API 사용 여부, `maven-compiler-plugin` `source`/`target` 또는 `release` 값, `var`, `record`, `List.of()`, `Stream.toList()`, `Path.of()` 사용 금지 여부 확인

### 3. 빌드 및 테스트 기준선(Baseline) 점검

- 구현을 시작하기 전, 현재 코드베이스가 빌드 및 테스트를 통과하는 그린(Green) 상태인지 확인합니다.
- 기존 테스트가 실패하거나 빌드가 깨진 경우, 먼저 현상 원인을 파악합니다.

---

## 🎯 산출물

프로젝트 분석 결과를 간단히 정리하여 파악합니다:

- **작업 대상**: [Frontend / Backend / Both]
- **적용 기술 스택**: [React+Vite / Java+eGovFrame]
- **기준선 상태**: [빌드/테스트 정상 여부]
