# F1Workflow - Superpowers 기반 지능형 워크플로우 시스템

> **Superpowers의 검증된 소프트웨어 개발 방법론을 F1Workflow의 적응형 아키텍처와 결합**

## 🎯 개요

F1Workflow는 **Superpowers의 핵심 철학(브레인스토밍 → 설계 → 계획 → 서브에이전트/병렬 실행 → TDD/디버깅 → 검증 → 코드 리뷰 → 정리)**을 기반으로 하며, 프로젝트의 특성을 자동으로 감지하여 **최적의 기술 스택과 워크플로우**를 적용하는 지능형 시스템입니다.

### 핵심 가치

- ✅ **Test-Driven Development (TDD)** - 테스트 먼저, RED-GREEN-REFACTOR 사이클 준수
- ✅ **Systematic Debugging** - 가설 설정과 원인 추적 기반의 체계적 디버깅 (Ad-hoc 수정 금지)
- ✅ **Evidence over Claims** - 완료 주장 전 실제 빌드/테스트/스크린샷 증거 확보 (Evidence-based verification)
- ✅ **Subagent & Parallel Execution** - 독립 과제 분산 및 서브에이전트 주도 실행
- ✅ **Adaptive Architecture** - 프로젝트 스택(SONGYEON ERP React/Vite/Vitest, Java/eGovFrame/MyBatis 등) 자동 적용

## 📁 디렉토리 구조

```
.github/f1workflow/
├── skills/
│   ├── 01-project-analysis.md           # 프로젝트 분석 및 기술 감지
│   ├── 02-brainstorm.md                 # 브레인스토밍 (Socratic design)
│   ├── 03-design-validation.md          # 설계 검증 및 계획/사양서 작성
│   ├── 04-git-setup.md                  # Git worktree 설정 (using-git-worktrees)
│   ├── 05-write-plan.md                 # 상세 실행 계획 수립 (writing-plans)
│   ├── 06-subagent-execution.md         # 서브에이전트/병렬 실행 (subagent-driven / dispatching-parallel)
│   ├── 07-implementation-tdd.md         # TDD 구현 (test-driven-development)
│   ├── 08-systematic-debugging.md       # 체계적 디버깅 (systematic-debugging)
│   ├── 09-verification.md               # 증거 기반 최종 검증 (verification-before-completion)
│   ├── 10-code-review.md                # 코드 검토 및 반영 (requesting / receiving code review)
│   └── 11-finalize.md                   # 완료 및 브랜치 정리 (finishing-a-development-branch)
└── README.md                            # 이 파일

.github/prompts/
└── f1workflow.prompt.md                 # /f1workflow 프롬프트 (스킬 문서 순차 실행)
```

## 🔄 Superpowers 기반 워크플로우

작업을 시작하면 먼저 `spike`, `bounded`, `architectural` 중 작업 경로를 분류합니다. SONGYEON ERP의 문서 우선 규칙에 따라 코드/기능 변경은 작업지시서, 계획서, 상세 사양서를 거치며, 각 승인 게이트와 산출물은 `docs/result/YYYYMMDD/<work-slug>/progress.md` 원장에 기록합니다.

```
START
  ↓
[1] 프로젝트 분석 & 기술 감지
  ├─ 언어, 프레임워크, 아키텍처 판별 (SONGYEON ERP React/Vite/Vitest, Java/eGovFrame 등)
  ├─ 기술 스택 정의 자동 로드
  └─ 테스트 프레임워크 및 DB 스키마 관리 규칙 식별
  ↓
[2] 브레인스토밍 (brainstorming - Socratic Design)
  ├─ 작업 목표 명확화 & 요구사항 정제
  ├─ 사용자 의도 파악 및 질문
  └─ 대안 설계 및 아키텍처 탐색
  ↓
[3] 설계 검증 (Design Validation)
  ├─ 기술적 타당성 검증
  ├─ SONGYEON ERP 팀 규칙(문서 우선, DB 스키마 추적) 부합 여부 확인
  └─ 승인 확인
  ↓
[4] Git 워크트리 설정 (using-git-worktrees)
  ├─ Feature 브랜치 및 격리 작업 공간 생성
  └─ 기존 테스트 및 빌드 기준선(Baseline) 확인
  ↓
[5] 상세 구현 계획 (writing-plans)
  ├─ 작업을 2~5분 단위의 독립 단계로 분해
  ├─ 각 단계별 정확한 파일 경로, 완전한 코드, 검증 명령어 명시
  └─ 순차 실행 계획 수립
  ↓
[6] 계획 실행 및 병렬 에이전트 분산 (subagent-driven-development / dispatching-parallel-agents)
  ├─ 단일/서브에이전트 단위로 작성된 계획 순차 수행
  └─ 독립적이고 의존성이 없는 2개 이상의 작업은 병렬 에이전트 분산 처리
  ↓
[7] TDD 구현 또는 체계적 디버깅
  ├─ 신규/기능 수정: TDD (test-driven-development)
  │   ├─ RED: 실패하는 테스트 작성
  │   ├─ GREEN: 최소한의 코드로 테스트 통과
  │   └─ REFACTOR: 코드 품질 및 구조 개선
  └─ 버그/테스트 실패 발생: 체계적 디버깅 (systematic-debugging)
      ├─ 가설 설정 및 데이터 흐름 추적 (임의 시도 수정 금지)
      └─ 근본 원인(Root Cause) 식별 후 단일 가설 검증
  ↓
[8] 완료 전 증거 기반 검증 (verification-before-completion)
  ├─ "성공함/완료됨" 주장에 대한 명확한 실행 증거 수집
  ├─ 실제 빌드/테스트 명령어 실행 결과 로그 확보 (`vitest run`, `mvn test` 등)
  └─ UI 변경 시 Playwright/브라우저 스크린샷 증거 저장
  ↓
[9] 코드 검토 및 피드백 반영 (requesting-code-review / receiving-code-review)
  ├─ 계획 및 사양 준수 검증 (requesting-code-review)
  └─ 리뷰 피드백 수신 시 비판적 검증 후 정밀 반영 (receiving-code-review)
  ↓
[10] 완료 및 브랜치 정리 (finishing-a-development-branch)
  ├─ 병합 / PR / 유지 / 폐기 결정
  ├─ Git worktree 정리
  └─ 결과 문서화 (`docs/result/YYYYMMDD/<work-slug>`) 및 DB 스키마 이력 업데이트
  ↓
END
```

## 🛠️ 지원 기술 스택

### 1️⃣ **[신규 추가] SONGYEON ERP 프론트엔드 (React + TypeScript + Vite + Vitest)** ⭐ _현재 프로젝트 적용_

- **언어/런타임**: TypeScript, Node.js (Vite)
- **프레임워크/라이브러리**: React 18, MUI (Material UI), F1-Grid
- **테스트/캡처**: Vitest (`vitest run`), Playwright Script (UI 자동화 및 스크린샷 캡처)
- **빌드/검증**: `npm run build`, `npm run test`
- **특화 Skill/규칙**:
  - `MuiTextField.defaultProps.margin: 'normal'`로 인한 셀 내부 정렬 비틀림 방지 (`margin="none"` 명시)
  - 1초 카운트다운 state 상위 배치로 인한 매초 전체 리렌더링 및 `@mui/x-tree-view` 훅 루프 방지 (독립 리프 컴포넌트 분리)
  - UI 검증 시 DOM 존재 확인에 그치지 않고 Playwright 스크린샷 기반 시각적 렌더링 검증
  - 와일드카드 라우팅(`/dashboard/*`) 딥링크 진입 시 UI 클릭 동작 모사 검증

### 2️⃣ **[신규 추가] SONGYEON ERP 백엔드 (Java + Spring Boot / eGovFrame + MyBatis)** ⭐ _현재 프로젝트 적용_

- **언어/런타임**: Java 8+, Spring Boot / 전자정부프레임워크(eGovFrame) 4.x
- **ORM/DB**: MyBatis, PostgreSQL (전자정부 eGovAbstractDAO 기반)
- **빌드/테스트**: Maven (`mvn test`, `mvn spring-boot:run`)
- **특화 Skill/규칙**:
  - **DB 스키마 관리**: DB 변경 시 `backend/DATABASE/YYYYMMDD` 및 `docs/database/`에 SQL 스크립트, 변경 이력 문서(`.md`), 롤백 스크립트를 동일 일자로 누적 관리
  - `TenantContextHolder`를 통한 다중 테넴트 DB 라우팅 지원 (JWT 인증 및 트랜잭션 전 컨텍스트 세팅)
  - eGovAbstractDAO 연동 시 raw 타입 처리 및 MyBatis XML namespace/DAO 일치 보장
  - MyBatis XML `if test` 문자열 비교 시 이중 따옴표(`active == "Y"`) 사용으로 OGNL `NumberFormatException` 방지
  - **Java 8 호환 구현 규칙**: `var`, `record`, `List.of()`, `Stream.toList()`, `Path.of()` 등 Java 9+ API/문법을 Java 8 대상 코드에서 금지하고, 명시 타입, `Collectors.toList()`, `Paths.get()`, `Arrays.asList()` 등 Java 8 방식을 사용한다.
  - **Maven 호환성 점검**: 구현 전후 `pom.xml`의 `maven-compiler-plugin` `source`/`target` 또는 `release` 값이 Java 8 기준과 일치하는지 확인한다.

### 3️⃣ **Node.js / TypeScript (Express, NestJS, etc.)**

- **언어**: TypeScript / JavaScript
- **테스트**: Jest, Mocha, Vitest
- **빌드**: Node.js, npm/yarn/pnpm
- **특화 Skill**:
  - ESLint/Prettier 통합
  - npm script 자동 실행
  - 핫 리로드 활용

### 4️⃣ **Python (Django, FastAPI, Flask)**

- **언어**: Python 3.8+
- **테스트**: pytest, unittest
- **패키지**: pip, poetry, pipenv
- **특화 Skill**:
  - Virtual environment 자동 설정
  - pytest 커버리지 통합
  - Type hints 검증

### 5️⃣ **Go**

- **언어**: Go 1.16+
- **테스트**: testing, testify
- **빌드**: go build
- **특화 Skill**:
  - 병렬 컴파일 테스트
  - go fmt/go lint 자동 실행

### 6️⃣ **Java (Spring Boot / 일반)**

- **언어**: Java 8+
- **테스트**: JUnit, Mockito, TestNG
- **빌드**: Maven, Gradle
- **특화 Skill**:
  - Java 8 호환 문법/컬렉션 API 사용 (예: `Collectors.toList()`, `Arrays.asList()`, `Paths.get()`)
  - Spring Boot devtools 활용
  - 빌드 캐시 최적화

### 7️⃣ **일반 프로젝트**

- 감지 불가능한 프로젝트
- 사용자 가이드 기반 진행
- 최소한의 TDD 원칙 적용

## 🔍 자동 감지 시스템

### 언어 감지

```
SONGYEON ERP React  → frontend/package.json, frontend/src/
SONGYEON ERP Java   → backend/pom.xml, backend/src/main/java/
Node.js      → package.json, node_modules/
Python       → requirements.txt, pyproject.toml, setup.py
Go           → go.mod, go.sum
Java         → pom.xml, build.gradle
C#           → *.csproj, *.sln
```

### 프레임워크 및 프론트/백엔드 감지

```
SONGYEON ERP React Frontend  → "react", "vite", "@mui/material" in frontend/package.json
SONGYEON ERP eGov/Spring     → pom.xml의 org.egovframe.rte 및 spring-boot-starter-web
React (일반)          → "react" in package.json
Vue.js                → "vue" in package.json
Express               → "express" in package.json
Django                → manage.py 존재
FastAPI               → "fastapi" in requirements.txt
Spring Boot           → pom.xml의 spring-boot-starter
```

### 테스트 프레임워크 감지

```
Vitest (SONGYEON ERP)  → vitest.config.ts 또는 "vitest" in frontend/package.json
Playwright      → scripts/capture-*.js 또는 playwright 의존성
JUnit / Mockito → backend/pom.xml의 junit / mockito 의존성
Jest            → jest.config.js 또는 "jest" in package.json
pytest          → pytest.ini 또는 conftest.py
```

## 📋 각 단계별 기술 통합

### 단계 1: 프로젝트 분석

**기술 통합 포인트**:

- `detectors/language-detector.md` 실행
- `detectors/framework-detector.md` 실행
- `tech-stacks/[detected-tech].yml` 자동 로드 (예: `s-erp-react-vite.yml`, `s-erp-java-egov.yml`)
- 프로젝트 프로필 및 DB 스키마 관리 규칙 생성

**산출물 (SONGYEON ERP 예시)**:

```json
{
  "project_name": "SONGYEON ERP",
  "frontend": {
    "language": "TypeScript",
    "framework": "React 18 + Vite",
    "ui_library": "MUI + F1-Grid",
    "test_framework": "Vitest (jsdom) + Playwright",
    "tech_stack": "tech-stacks/s-erp-react-vite.yml"
  },
  "backend": {
    "language": "Java 8+",
    "framework": "Spring Boot + eGovFrame 4.x",
    "orm": "MyBatis (PostgreSQL)",
    "build_system": "Maven",
    "tech_stack": "tech-stacks/s-erp-java-egov.yml",
    "db_schema_policy": "backend/DATABASE/YYYYMMDD 관리"
  }
}
```

### 단계 2: 브레인스토밍 (brainstorming)

**기술/프로젝트 특화 질문**:

- SONGYEON ERP Frontend: "MUI 테마 margin 설정이나 TreeView 리렌더링 영향 범위는 검토되었는가?"
- SONGYEON ERP Backend: "다중 테 모드 Context 세팅 및 `backend/DATABASE/YYYYMMDD` 스키마 이력 관리가 필요한가?"
- TypeScript: "타입 안정성을 어떻게 보장할 것인가?"
- Python: "가상 환경 관리는 poetry/pipenv 중 어떤 것을 사용할 것인가?"

### 단계 3: 설계 검증 (Design Validation)

**기술 검증 체크리스트**:

- SONGYEON ERP 팀 개발 규칙 준수 (문서 우선, 범위 최소화, 검증 우선)
- 프레임워크 베스트 프랙티스 준수
- 의존성 버전 호환성 및 DB Migration 스크립트 작성 여부

### 단계 4: Git 워크트리 설정 (using-git-worktrees)

**기술 자동화**:

```bash
# SONGYEON ERP 프론트엔드 작업 공간 준비
git worktree add feature/[task-name]
cd feature/[task-name]/frontend
npm install

# SONGYEON ERP 백엔드 작업 공간 준비
git worktree add feature/[task-name]
cd feature/[task-name]/backend
mvn clean compile
```

### 단계 5: 구현 계획 (writing-plans)

**기술별 세분화**:

- **SONGYEON ERP React**: 컴포넌트, 서비스, Vitest 테스트 파일, Playwright 캡처 스크립트 분해
- **SONGYEON ERP Java**: Controller, Service, Mapper XML, DTO, DB 스크립트(`YYYYMMDD_NNN_*.sql`) 분해

### 단계 6: 계획 실행 및 병렬 분산 (subagent-driven / dispatching-parallel)

- `Subagent-Driven` 또는 `Inline Execution` 중 하나를 선택하고 원장에 기록
- Subagent-Driven에서는 태스크마다 새 구현자와 태스크 리뷰를 사용
- 같은 파일을 수정하는 구현 태스크는 병렬 실행하지 않음
- 각 태스크를 구현 -> 테스트 -> 사양 준수 리뷰 -> 코드 품질 리뷰 순으로 완료

### 단계 7: TDD 및 체계적 디버깅 (test-driven-development / systematic-debugging)

#### SONGYEON ERP React (Vitest) TDD 예시

```typescript
// RED: 실패하는 Vitest 작성
test('should render session countdown without triggering parent re-render', () => {
  const { getByTestText } = render(<SessionCountdownLabel />);
  expect(getByTestText('timer')).toBeInTheDocument();
});

// GREEN: 리프 컴포넌트로 독립 분리 구현
export const SessionCountdownLabel = () => {
  const [time, setTime] = useState(60);
  // ...
  return <span>{time}초</span>;
};
```

#### 체계적 디버깅 (systematic-debugging)

- 버그 발생 시 임의 시도 금지 → 가설 설정 → 데이터 흐름 추적 (예: `page.evaluate()` rect 확인) → 단일 원인 수정 및 테스트 검증

### 단계 8: 증거 기반 최종 검증 (verification-before-completion)

```bash
# 프론트엔드 Vitest 단일 테스트 검증
cd frontend
npm run test -- tests/dashboard-sidebar.test.tsx

# 백엔드 Maven 테스트 검증
cd backend
mvn "-Dtest=TenantAuthTokenTest" test
```

- UI 레이아웃 검증 시 Playwright 스크린샷 결과를 `docs/result/YYYYMMDD/<work-slug>/screenshots/`에 저장 후 검증 완료 선언

### 단계 9: 코드 검토 및 반영 (requesting / receiving code review)

- 각 태스크 완료 직후 태스크 리뷰를 수행하고, 모든 태스크 완료 후 전체 브랜치 리뷰를 수행
- Critical/Important 이슈는 수정 후 재리뷰하며, Minor 이슈와 판정은 원장에 기록
- 피드백을 맹목적으로 수용하지 않고 사양, 코드, 테스트로 기술적 타당성을 확인

### 단계 10: 완료 및 정리 (finishing-a-development-branch)

- 전체 테스트 및 필요한 브라우저 검증을 현재 트리에서 신선하게 실행
- 사용자에게 로컬 병합, Push/PR, 현재 상태 유지 중 하나를 선택받은 뒤 해당 작업만 수행
- `docs/result/YYYYMMDD/<work-slug>` 결과 문서와 진행 원장을 저장

## 💡 기술 스택별 템플릿 예시

### SONGYEON ERP React + Vite + Vitest (`s-erp-react-vite.yml`)

```yaml
name: 'SONGYEON ERP React Frontend'
language: 'TypeScript'
framework: 'React 18 (Vite)'
ui_library: 'MUI + F1-Grid'
test_framework: 'Vitest + Playwright'
build_system: 'npm'

setup:
  - cd frontend && npm install

test_command: npm run test

build_command: npm run build

tdd_tips:
  - '테스트 파일은 tests/*.test.tsx 위치에 작성'
  - 'TextField 사용 시 margin="none" 명시 확인'
  - '1초 카운트다운 등 타이머 상태는 리프 컴포넌트로 독립 분리'
  - 'Playwright 스크린샷 경로는 영문/숫자/하이픈만 사용'
```

### SONGYEON ERP Java + Spring Boot / eGovFrame (`s-erp-java-egov.yml`)

```yaml
name: 'SONGYEON ERP Java Backend'
language: 'Java 8+'
framework: 'Spring Boot / eGovFrame 4.x'
orm: 'MyBatis (PostgreSQL)'
build_system: 'Maven'

setup:
  - cd backend && mvn compile

test_command: mvn test

run_command: mvn spring-boot:run

db_schema_policy:
  - 'DB 변경 시 backend/DATABASE/YYYYMMDD 및 docs/database/ 에 동시 기록'
  - 'YYYYMMDD_NNN_작업명.sql, YYYYMMDD_NNN_변경이력.md, YYYYMMDD_NNN_rollback.sql 생성'

tdd_tips:
  - 'TenantContextHolder 세팅 후 DB 접근 보장'
  - 'MyBatis XML test 조건문 이중 따옴표 사용'
  - 'Java 8 호환 구현: var, record, List.of(), Stream.toList(), Path.of() 금지'
  - 'Java 8 대체 방식: 명시 타입, Arrays.asList(), Collectors.toList(), Paths.get(), 기존 switch 문 사용'
  - 'maven-compiler-plugin source/target/release 값이 Java 8과 일치하는지 확인'
```

## 💡 기술 스택별 템플릿 예시

### TypeScript + Express + Jest

```yaml
# tech-stacks/nodejs-typescript.yml
name: 'Node.js TypeScript (Express)'
language: 'TypeScript'
framework: 'Express.js'
test_framework: 'Jest'
build_system: 'npm'

setup:
  - npm install
  - npm run build

test_command: npm test -- --coverage

lint_command: npm run lint

tdd_tips:
  - '각 테스트 파일은 .test.ts 또는 .spec.ts로 명명'
  - '테스트 전에 @types 설치 확인'
  - 'Mock과 Spy는 Jest에서 기본 제공'

project_structure: src/
  utils/
  services/
  controllers/
  tests/
  unit/
  integration/
  package.json
  tsconfig.json
  jest.config.js
```

### Python + FastAPI + pytest

```yaml
# tech-stacks/python-fastapi.yml
name: 'Python FastAPI'
language: 'Python'
framework: 'FastAPI'
test_framework: 'pytest'
build_system: 'pip'

setup:
  - python -m venv venv
  - source venv/bin/activate # 또는 Windows: venv\Scripts\activate
  - pip install -r requirements.txt

test_command: pytest --cov=src tests/

lint_command: black . && flake8 .

tdd_tips:
  - '각 모듈마다 test_*.py 파일 작성'
  - '@pytest.fixture로 공통 설정 활용'
  - 'TestClient로 API 엔드포인트 테스트'

project_structure: src/
  models/
  services/
  routes/
  tests/
  unit/
  integration/
  requirements.txt
  pyproject.toml
```

## 🚀 사용 방법

VS Code Copilot Chat에서 `/f1workflow` 프롬프트를 사용하여 실행할 수 있습니다. 프롬프트 정의는 `.github/prompts/f1workflow.prompt.md`에 위치해 있습니다.

### 기본 실행 예시

```text
/f1workflow [작업 내용 또는 작업지시서 설명]
```

예시 1:

```text
/f1workflow 대시보드 메뉴 트리의 세션 타이머 리렌더링 버그 수정 및 최적화
```

예시 2:

```text
/f1workflow docs/directions/20260903/20260903_001_메뉴_권한_API_개선_작업지시서.md
```

### 실행 흐름

1. **경로 분류 및 기술 자동 감지**: 작업 규모와 대상 스택을 확인
2. **브레인스토밍/설계 승인**: 질문, 대안, 설계를 정제하고 사용자 승인 대기
3. **문서화**: 작업지시서 -> 계획서 -> 상세 사양서 작성 및 승인 대기
4. **실행 방식 선택**: Subagent-Driven 또는 Inline Execution을 선택하고 원장 생성
5. **구현**: 태스크별 TDD, 즉시 검증, 태스크 리뷰 및 수정 루프 수행
6. **최종 검증/리뷰**: 전체 테스트, 빌드, UI 캡처 및 전체 브랜치 리뷰 수행
7. **완료 선택/문서화**: 사용자 선택에 따라 병합/PR/유지하고 결과 문서 작성

## 📊 Superpowers 핵심 스킬 100% 매핑표

| Superpowers 원본 스킬            | F1Workflow 통합 단계 / 기능 | 주요 역할 및 규칙                                     |
| :------------------------------- | :-------------------------- | :---------------------------------------------------- |
| `brainstorming`                  | [2] 브레인스토밍            | 소크라테스식 질문, 요구사항 정제, 아이디어 대안 탐색  |
| `using-git-worktrees`            | [4] Git 워크트리 설정       | 기능 단위 격리 환경 생성 및 기본 빌드/테스트 검증     |
| `writing-plans`                  | [5] 상세 구현 계획          | 2~5분 단위의 상세 실행 계획서 작성                    |
| `subagent-driven-development`    | [6] 계획 실행 및 병렬 분산  | 계획 기반 서브에이전트 주도 구현                      |
| `dispatching-parallel-agents`    | [6] 계획 실행 및 병렬 분산  | 독립적 태스크 2개 이상 병렬 에이전트 분산             |
| `test-driven-development`        | [7] TDD 구현                | RED-GREEN-REFACTOR 개발 사이클                        |
| `systematic-debugging`           | [7] 체계적 디버깅           | 근본 원인 추적 및 가설 검증 디버깅 (Ad-hoc 수정 금지) |
| `verification-before-completion` | [8] 완료 전 증거 기반 검증  | 실행 로그, 스크린샷 등 실제 증거 확보 후 완료 선언    |
| `requesting-code-review`         | [9] 코드 검토 및 반영       | 사양/계획 준수 및 코드 품질 검토 요청                 |
| `receiving-code-review`          | [9] 코드 검토 및 반영       | 리뷰 피드백 수신 시 비판적 검증 후 정밀 적용          |
| `finishing-a-development-branch` | [10] 완료 및 브랜치 정리    | 개발 브랜치 병합/정리 및 결과 문서 작성               |
| `executing-plans`                | [6]~[8] 세션 관리           | 체크포인트 기반 단계별 검증 및 실행                   |
| `using-superpowers`              | 시작 전 부트스트랩          | 관련 스킬 탐색 및 적용 여부 확인                      |
| `writing-skills`                 | F1Workflow 유지보수         | 워크플로우 문서 변경 시 압박 시나리오로 검증          |

## 📊 프로세스 비교표

| 항목              | F1Workflow (Superpowers 결합)                    | 일반 수동 개발                     |
| :---------------- | :----------------------------------------------- | :--------------------------------- |
| **프로젝트 감지** | ✅ 자동 (SONGYEON ERP React/Vite, Java/eGovFrame 등)    | ❌ 수동 판단                       |
| **요구사항 분석** | ✅ 브레인스토밍 스킬 기반 소크라테스식 정제      | ❌ 모호한 요구사항 그대로 개발     |
| **작업 격리**     | ✅ Git Worktree 자동 격리                        | ❌ 단일 작업공간 엉킴 발생         |
| **구현 방식**     | ✅ TDD (RED-GREEN-REFACTOR) & 서브에이전트       | ❌ 코드부터 임의 작성              |
| **버그 대응**     | ✅ Systematic Debugging (가설/데이터흐름 추적)   | ❌ Ad-hoc 임의 수정 반복           |
| **검증 기준**     | ✅ Evidence-based (로그/스크린샷 증거 제출 필수) | ❌ "잘 되는 것 같습니다" 말로 선언 |
| **DB 변경 관리**  | ✅ 날짜별 스키마/SQL/MD/롤백 스크립트 관리       | ❌ DB 수동 변경 후 기록 누락       |

## 🔗 참고

- **Superpowers 원본**: https://github.com/obra/superpowers
- **TDD 철학**: https://blog.fsck.com/2025/10/09/superpowers/
- **Prime Radiant**: https://primeradiant.com

---

**지금 시작하세요!**

```
@copilot /f1workflow
```
