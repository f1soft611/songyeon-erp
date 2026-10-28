# 08. 실행·테스트·개발환경 안내

최종 정리: 2026-09-29

## 1. 포트와 구성 요소

| 구성 | 위치 | 포트 | 실행 명령 | 비고 |
|---|---|---:|---|---|
| Spring Boot 백엔드 | `backend/` | **8081** | `mvn spring-boot:run` | 127.0.0.1에만 바인딩. 8080은 이 PC의 다른 Tomcat이 사용 중 |
| React 개발 서버 | `frontend/` | **5173** | `npm run dev` | `/api` 요청만 8081로 프록시 |
| 브라우저 테스트용 백엔드 | `backend/` (테스트 클래스패스) | 8089 | `run.cmd e2e` (Playwright가 자동 실행) | 임시 DB, 테스트 계정 |
| 브라우저 테스트용 React | `frontend/` | 5174 | Playwright가 자동 실행 | |
| 기존 Flask 앱 (비교 기준) | `MES_프로토타입_20260916/` | 5050 (`run_dev.py`는 5051) | `start_server.bat` / `python run_dev.py` | 이관 전 기능 확인용 |

접속 주소: **http://localhost:5173/login**. 기존 계정의 아이디·비밀번호를 그대로 사용한다(계정은 업무 DB(PostgreSQL)의 `employees` 표에서 읽는다 — 2026-09-22 부터).

## 2. 실행 순서

### 2-1. 백엔드 (PowerShell 창 1)

```powershell
cd 'C:\Users\USER\Documents\업무\송연\backend'
mvn spring-boot:run
```

- Maven 과 JDK 17 이상이 PATH 에 있으면 이 명령으로 바로 뜬다(확인: Maven 3.9.16 + Java 21, 2026-09-29). 없으면 `.\run.cmd` 를 쓴다 — 프로젝트 안 JDK(`.tools/jdk-17*`)를 찾아 쓰고, PC 전체 `JAVA_HOME` 은 바꾸지 않는다.
- DB 접속 정보(아래 3장)가 없으면 서버가 **무엇이 없는지 알려주고 멈춘다**(`MesApplication`). 접속 정보는 환경변수로만 받는다.
- 콘솔에 `Started MesApplication`이 나오면 기동 완료. 상태 확인: http://localhost:8081/api/health → `{"status":"ok"}`
- 첫 실행 시 Maven 의존성 다운로드가 필요하다(인터넷 연결).

### 2-1-1. 실행되는 SQL 보기

`common/config/SqlLogInterceptor` 가 실행하는 SQL 을 매퍼 XML 모양 그대로(줄바꿈·들여쓰기 유지) 콘솔에 찍는다(기본 켜짐).
`?` 자리에는 실제 넘어간 값을 넣어 보여주므로 그대로 복사해 DB 도구에서 실행해 볼 수 있다.

```
[SQL] PD0002DAO.selectSchedule
    SELECT
        id
      , schedule_date
      …
    FROM production_schedule
    WHERE schedule_date = '2026-09-21'
    ORDER BY sort_order
           , id
    <== 1 rows (3 ms)
```

- `run.cmd` 를 직접 띄운 창에서는 그대로 보인다. 로그 파일로 돌리는 경우(`server.log`) 따라 보기:
  `Get-Content backend\server.log -Wait -Tail 50`
- 끄기: `SONGYEON_SQL_LOG=info` 로 실행한다(`application.yml` 의 `logging.level.kr.co.songyeon.mes.sql`).
- MyBatis 기본 로그(`==> Preparing` 한 줄)는 겹쳐서 꺼 두었다. 다시 보려면 `logging.level.kr.co.songyeon.mes.dao` 를 debug 로.
- 값까지 찍히므로 운영에 올릴 때는 끄고 올린다.

### 2-2. 프런트엔드 (PowerShell 창 2)

```powershell
cd 'C:\Users\USER\Documents\업무\송연\frontend'
npm ci            # 새 PC이거나 node_modules가 없을 때만
npm run dev
```

### 2-3. 종료·재시작

| 상황 | 방법 |
|---|---|
| 서버 종료 | 각 창에서 `Ctrl+C` |
| React 코드 수정 | 자동 반영(HMR). 필요 시 새로고침 |
| Java 코드 수정 | 백엔드 종료 후 `mvn spring-boot:run` 재실행 |
| `vite.config.ts`·`.env.local` 수정 | 프런트엔드 개발 서버 재시작 |
| Spring 재시작 | 세션이 메모리에만 있으므로 다시 로그인해야 함 |

백그라운드로 띄운 서버가 남아 있으면 포트 충돌이 난다. `backend/target/server.pid`는 과거 실행 당시 PID 기록일 뿐이므로, 종료 전 해당 프로세스의 실행 경로가 송연 프로젝트인지 확인한다.

## 3. 설정값

### 백엔드 (환경변수)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `SERVER_PORT` | 8081 | |
| `SONGYEON_DEFAULT_PASSWORD` | `changeme` | "기본 비밀번호 사용 중" 경고 판정 기준. 기존 Flask `.env`의 값과 같아야 경고가 정확함 |
| `SONGYEON_HTTPS` | false | HTTPS 운영 시 true → 쿠키 Secure |
| `SONGYEON_DB_URL` | (없으면 시작하지 않음) | 업무 DB(PostgreSQL). 로그인 계정도 여기서 읽는다. 세 값 중 하나라도 없으면 서버가 시작할 때 멈추고 무엇이 없는지 알려준다 |
| `SONGYEON_DB_USERNAME` / `SONGYEON_DB_PASSWORD` | `songyeon` / (빈 값) | 업무 DB 계정 |
| `SONGYEON_JAVA_HOME` | (없음) | 사용할 JDK 17 경로 |

Spring은 기존 Python 폴더의 `.env`를 읽지 않는다. 필요한 값은 실행 환경변수로 지정한다.

**업무 DB 연결** (2026-09-18 접속 확인, PostgreSQL 18.4, DB 이름 `songyeon`). 서버 주소·계정·비밀번호는 문서와 파일에 적지 않는다. 실행하는 창에서만 넣는다.

```powershell
$env:SONGYEON_DB_URL = 'jdbc:postgresql://<서버주소>:<포트>/songyeon'
$env:SONGYEON_DB_USERNAME = '<계정>'
$env:SONGYEON_DB_PASSWORD = '<비밀번호>'
mvn spring-boot:run
```

같은 서버에 다른 프로젝트 DB(haccp·s-erp·tenant_…)도 있다. 송연 서버 코드는 `songyeon` DB에만 접속한다.

**SQLite → PostgreSQL 이관 도구** (`backend/tools/SqliteToPostgres.java`, JDK 17로 파일 그대로 실행). SQLite는 읽기 전용으로 열고, 대상 DB 이름이 `songyeon`이 아니면 쓰지 않는다. 지우는 동작은 없다.

| 작업 | 하는 일 |
|---|---|
| `check` | 읽기만. 두 DB의 표·컬럼 차이, `real` 컬럼 수, 건수 |
| `alter-real` | `real`(4바이트) 컬럼을 `double precision`으로. 2026-09-18 실행 완료(91개) |
| `load` | 대상 표가 **모두 비어 있을 때만** 자료를 넣고 번호표를 이어지게 맞춘 뒤 건수 대조. 한 트랜잭션 |

```powershell
$env:PG_URL = 'jdbc:postgresql://<서버주소>:<포트>/songyeon'; $env:PG_USER = '<계정>'; $env:PG_PASSWORD = '<비밀번호>'
$cp = "$env:USERPROFILE\.m2\repository\org\xerial\sqlite-jdbc\3.50.3.0\sqlite-jdbc-3.50.3.0.jar;$env:USERPROFILE\.m2\repository\org\postgresql\postgresql\42.7.11\postgresql-42.7.11.jar"
& (Resolve-Path '..\.tools\jdk-17*\bin\java.exe') -cp $cp tools\SqliteToPostgres.java check '<SQLite 파일>'
```

- 운영 자료로 다시 옮기려면, 지금 들어간 자료(이 PC `songyeon.db`의 41건)를 사람이 확인하고 비운 뒤 `load`를 돌린다.
- `ALTER`나 `load`가 끝나지 않고 기다리면, 다른 접속(DBeaver 등)이 트랜잭션을 열어둔 것이다(`idle in transaction`). 그 창에서 커밋·롤백하거나 자동 커밋을 켠다.

### 프런트엔드

`frontend/.env.example`을 `.env.local`로 복사해 `BACKEND_URL`만 바꾼다. Vite 서버만 읽는 값이며 브라우저 번들에 포함되지 않는다. 비밀값을 넣는 곳이 아니다.

## 4. 테스트

| 대상 | 명령 (각 폴더에서) | 내용 | 마지막 확인 결과 (2026-09-17) |
|---|---|---|---|
| 백엔드 단위·통합 | `.\run.cmd test` | 인증·세션·CSRF·시도 제한·계정 조회·Werkzeug 해시 호환, 단가관리 Mapper(H2)·API 권한, 영업 6개 화면 서버 통합(H2) | 26개 통과, 실제 DB 검사 1개는 건너뜀 (2026-09-18) |
| 실제 DB SQL 검사 | 아래 명령 | 영업 6개 화면 SQL 전체를 실제 PostgreSQL에서: 조회는 실행, 저장·수정·삭제 22개는 `EXPLAIN`으로 검사만(쓰지 않음), 연결도 읽기 전용 | 통과, DB 변경 없음 확인 (2026-09-18) |
| 백엔드 패키징 | `.\run.cmd package` | `target/mes-backend-0.1.0.jar` 생성 | 성공 |
| 프런트 타입검사·빌드 | `npm.cmd run build` | `tsc --noEmit` + `vite build` → `dist/` | 통과 |
| 브라우저 E2E | `npm.cmd test` | Playwright + 설치된 Chrome. 8089/5174 포트에 임시 DB로 서버 자동 기동 | 24개 통과 (로그인 8, 대시보드 3, 제품등록 2, 단가관리 2, 수주등록 2, 견적 3, 출하등록 2, 생산가능확인 2) (2026-09-18) |
| 기존 Flask 검사 | `MES_프로토타입_20260916\run_tests.bat` | 49개 테스트 파일 중 36개만 실행 | 이번 정리에서 실행하지 않음 |

실제 DB SQL 검사(`PostgresSchemaSmokeTest`)는 환경변수가 있을 때만 돈다. 평소 `.\run.cmd test`에서는 건너뛴다(1개 skipped).

```powershell
$env:JAVA_HOME = (Resolve-Path '..\.tools\jdk-17*').Path
$env:SONGYEON_PG_SMOKE_URL = 'jdbc:postgresql://<서버주소>:<포트>/songyeon'
$env:SONGYEON_PG_SMOKE_USERNAME = '<계정>'; $env:SONGYEON_PG_SMOKE_PASSWORD = '<비밀번호>'
.\mvnw.cmd -B -ntp test "-Dtest=PostgresSchemaSmokeTest"
```

E2E 테스트는 Java가 만든 임시 DB와 별도 포트를 쓰므로 원본 DB와 개발 서버에 영향을 주지 않는다. `dashboard.spec.ts`·`SA0001.spec.ts`는 실행할 때마다 `docs/screenshots/*.png`를 덮어쓴다.

## 5. 문제 해결

| 증상 | 확인 |
|---|---|
| 5173/8081 포트 사용 중 | 이미 실행 중인 서버가 있는지 확인하고 기존 주소로 접속 |
| 로그인 화면은 뜨는데 "서버에 연결할 수 없습니다" | 8081 백엔드 실행 여부, `vite.config.ts`의 대상 주소 |
| 로그인 시 503 "로그인 정보를 조회할 수 없습니다" | 업무 DB 접속(`SONGYEON_DB_URL`·`SONGYEON_DB_USERNAME`·`SONGYEON_DB_PASSWORD`), `employees` 표. 로그인 계정도 업무 DB(PostgreSQL)에서 읽는다 |
| Java 버전 오류 | `mvn -v` 로 쓰는 JDK 확인(17 이상 필요). 설치가 없으면 `.\run.cmd` 사용 — 프로젝트 `.tools/jdk-17*` 를 쓴다 |
| 로그인 5회 실패 후 전원이 막힘 | 시도 제한이 **접속 IP 기준**이고 Vite 프록시 경유 시 모두 127.0.0.1로 집계됨. 1분 대기 또는 백엔드 재시작 ([07 문서](07-migration-status.md) 이슈 참고) |
| `npm`·`mvn` 을 찾지 못함 | Node.js·Maven 설치와 PATH. PowerShell 에서 안 잡히면 `npm.cmd` / `.\mvnw.cmd` 로 부른다 |

## 6. 전자정부프레임워크(eGovFrame) 사용

**개발도구(Eclipse) 사용과 실행환경 라이브러리 적용은 별개의 작업이다.** 현재 `backend/pom.xml`에는 전자정부 실행환경 의존성이 없다.

### 6-1. 전자정부 개발도구에서 현재 백엔드 열기

1. `File → Import → Maven → Existing Maven Projects` → Root Directory: `C:\Users\USER\Documents\업무\송연\backend`
2. `Window → Preferences → Java → Installed JREs`에 `.tools/jdk-17.0.20.1+1` 등록, 프로젝트 컴파일러·실행 JRE를 17로 지정
3. `Run Configurations → Java Application`: Main class `kr.co.songyeon.mes.MesApplication`, **Working directory `...\송연\backend`** (DB 상대 경로 기준)
4. IDE에서 실행할 때는 `run.cmd` 서버를 동시에 띄우지 않는다.

개발도구 5.0 자체는 JDK 21이 필요하지만 실행환경 최소 기준은 JDK 17이므로, IDE용 Java 21과 서버용 Java 17을 따로 지정하면 된다. 이 절차를 해당 IDE에서 직접 실행 검증하지는 않았다. [5.0 환경 요구사항](https://www.egovframe.go.kr/docs/5.0/getting-started/)

### 6-2. 실행환경을 적용한다면

- 현재 백엔드는 **Java 17 + Spring Boot 3.5.16(Jakarta)** 이므로 **전자정부 5.0 계열**이 맞다. 5.0은 Spring Boot 3.5.x·Spring Framework 6.2 계열을 기준으로 한다. [실행환경 릴리스](https://github.com/eGovFramework/egovframe-runtime/releases)
- 4.3 실행환경은 Spring 5.3·Java EE(javax) 기반이라 현재 코드에 그대로 넣을 수 없다. s-erp-main은 4.3.0 parent를 쓰지만 송연은 이를 따르지 않았다.
- 적용 순서: 버전·사용 기능 결정 → 공식 Boot 구성과 `pom.xml` 의존성 비교 → Controller/Service(Impl)/DAO(Mapper) 계층 규칙 적용 → 인증·세션·CSRF·JSON 응답 형식 유지 확인 → 백엔드·E2E 테스트 재실행.
- 전자정부 템플릿의 계정 테이블·인증 방식을 덮어쓰면 기존 계정 연동(`employees` 표, 기존 비밀번호 해시)이 깨진다. 기존 인증 구조를 기준으로 통합한다.

## 7. 저장소 관리 권장

- 송연 폴더는 **git 저장소가 아니다.** 전환 작업 이력을 남기려면 `git init` 후 첫 커밋을 권장한다.
- 커밋 제외 대상: `.tools/`(JDK 304MB + `temurin17.zip` 182MB — 압축 해제 후 zip은 삭제해도 됨), `venv/`, `frontend/node_modules`, `frontend/dist`, `frontend/test-results`, `backend/target`, `MES_프로토타입_20260916/data/*.db*`, `data/secret.key`. 현재 루트 `.gitignore`에는 `.tools/`만 있다.
- `.github/modernize/java-upgrade/`는 VS Code 확장(Java 업그레이드 도구)이 만든 작업 기록 훅이며 프로젝트 코드가 아니다.
