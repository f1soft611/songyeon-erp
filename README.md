# SONGYEON ERP

React 기반 프론트엔드와 Spring Boot/eGovFrame 기반 백엔드로 구성된 ERP 애플리케이션입니다.

## 구성

- `frontend/`: React, TypeScript, Vite 기반 사용자 화면
- `backend/`: Java 17, Spring Boot, eGovFrame 기반 API 서버
- `docs/`: 요구사항, 계획, 사양 및 작업 결과 문서

## 사전 요구사항

- Node.js 및 npm
- Java 17 이상
- Maven 3.8 이상

## 실행

프론트엔드:

```bash
cd frontend
npm install
npm run dev
```

기본 주소는 `http://127.0.0.1:4173`입니다.

백엔드:

```bash
cd backend
mvn spring-boot:run
```

기본 주소는 `http://localhost:8080`이며, Swagger UI는 `http://localhost:8080/swagger-ui/index.html`에서 확인할 수 있습니다.

## 검증

```bash
cd frontend
npm run build
npm run test

cd ../backend
mvn test
```

Windows 환경에서 프론트엔드 테스트가 파일 핸들 오류로 실패하면 Git Bash 또는 WSL2에서 실행합니다.

## 설정 보안

서버 주소, 데이터베이스 계정, JWT 키, 인증서 등 민감한 값은 저장소에 커밋하지 않습니다. 로컬·운영 환경별 설정은 `.gitignore` 규칙에 따라 별도로 관리합니다.
