# SONGYEON ERP 핵심 프로젝트 구조

## 구성

- `frontend/`: React + TypeScript + Vite 기반 웹 애플리케이션
  - `src/`: 페이지, 공통 컴포넌트, 라우팅, 서비스, 테마
  - `tests/`: Vitest 기반 프론트엔드 테스트
  - `scripts/`: 화면 검증 및 캡처 보조 스크립트
- `backend/`: Java + Spring Boot/eGovFrame 기반 API 서버
  - `src/main/java/`: Controller, Service, Mapper/DAO 등 서버 소스
  - `src/test/`: Maven 기반 서버 테스트
  - `DATABASE/`: 날짜별 데이터베이스 변경 이력
- `docs/`: 프로젝트 작업 문서
  - `directions/`: 작업지시서
  - `plan/`: 구현 계획서
  - `spec/`: 상세 사양서
  - `result/`: 작업 결과와 검증 기록
  - `database/`: 데이터베이스 스키마 및 변경 이력

## 기본 명령

```bash
cd frontend
npm run build
npm run test

cd ../backend
mvn test
```

## 작업 흐름

1. `docs/directions/YYYYMMDD`에서 작업지시서를 확인한다.
2. `docs/plan/YYYYMMDD`에 구현 계획을 작성한다.
3. `docs/spec/YYYYMMDD`에 상세 사양과 검증 기준을 작성한다.
4. 문서 기준으로 프론트엔드 또는 백엔드를 구현한다.
5. `docs/result/YYYYMMDD`에 결과와 검증 내용을 기록한다.

## 데이터베이스 변경

스키마를 변경하면 `docs/database/YYYYMMDD`와 `backend/DATABASE/YYYYMMDD`에 SQL, 변경 이력, 롤백 스크립트를 함께 관리한다.
