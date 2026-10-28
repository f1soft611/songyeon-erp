# SONGYEON ERP Backend

![java](https://img.shields.io/badge/java-007396?style=for-the-badge&logo=JAVA&logoColor=white)
![Spring_boot](https://img.shields.io/badge/Spring_Boot-F2F4F9?style=for-the-badge&logo=spring-boot)
![maven](https://img.shields.io/badge/Maven-C71A36?style=for-the-badge&logo=apache-maven&logoColor=white)
![swagger](https://img.shields.io/badge/swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)

이 백엔드는 로그인/인증 전용 최소 구조로 정리된 SONGYEON ERP 백엔드입니다. 레거시 업무 모듈, 멀티테넌트 운영 화면, 플랫폼 관리자 전용 기능, 타 프로젝트 명칭은 제거된 상태를 기준으로 유지합니다.

## 환경

| 프로그램 명 | 버전    |
| :---------- | :------ |
| Java        | 17 이상 |
| Maven       | 3.8.x   |

## 현재 유지 범위

- 공통 설정: `egovframework.com`
- 로그인/인증: `egovframework.let.uat.uia`
- 권한/메뉴 공통: `egovframework.let.uss.auth`
- 공개 엔드포인트: `/`, `/auth/login`, `/auth/login-jwt`, `/auth/refresh`, `/v3/api-docs/**`, `/swagger-ui/**`
- 그 외 요청은 기본적으로 차단

## 실행

```bash
cd backend
mvn spring-boot:run
```

dev 프로필의 DB는 송연 PostgreSQL `songyeon` DB이며, 접속 정보는 환경변수로만 받습니다(송연 변환본과 같은 이름).

| 환경변수 | 내용 |
| :------- | :--- |
| `SONGYEON_DB_URL` | `jdbc:postgresql://<호스트>:<포트>/songyeon` |
| `SONGYEON_DB_USERNAME` | DB 계정 |
| `SONGYEON_DB_PASSWORD` | DB 비밀번호 |

## Swagger

- Swagger UI: `http://localhost:8080/swagger-ui/index.html`
- 로그인 API는 공개 접근 허용
- 나머지 API는 JWT 인증이 필요

## 운영 설정

운영 환경에서 민감값은 외부 프로퍼티에서 관리합니다.

```bash
cp src/main/resources/application-dev.properties src/main/resources/application-prod.properties
```

실제 운영 값은 `JWT_SECRET`, `POSTGRES_PASSWORD`, `MAIL_*`, `MINIO_*` 등 환경변수로 주입하는 것을 권장합니다.
