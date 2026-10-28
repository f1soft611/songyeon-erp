# 송연 MES — Python → Spring Boot·React 전환 문서

최종 정리: **2026-09-18** (2026-09-17 최초 분석 문서를 전면 재분석·재구성)

송연의 사내 업무 시스템(Flask + SQLite + 순수 JS)을 **Spring Boot(Java 17) + React(TypeScript)** 로 옮기는 작업의 기준 문서다. 구조 참조 프로젝트는 `D:\workspace\s-erp-main`이다.

## 현재 단계: 전환 가능 여부 확인

- **결론: 전환 가능.** 막는 기술 요소는 없고, 로그인·화면 틀은 실제로 옮겨서 확인했다. → [00. 전환 가능성 검토](00-feasibility.md)
- DB는 **PostgreSQL로 확정**했다. PostgreSQL DB를 생성한 뒤 기존 SQLite 자료를 옮긴다.
- 업무 기능 286개 API는 아직 모두 Flask에 있다. 05~07은 전환을 진행할 때 쓸 설계·로드맵이다.

## 문서 목록

| 문서 | 무엇을 보려면 | 주 독자 |
|---|---|---|
| [00. 전환 가능성 검토](00-feasibility.md) | **전환 가능 여부 결론**, 실제로 옮겨 본 것, 영역별 판정, 아직 확인 못 한 것, 추가 PoC 제안 | 모두 |
| [01. 개요와 폴더 구조](01-overview.md) | 전체 그림, 폴더별 역할, 기술 스택 비교 | 모두 |
| [02. 기존 시스템 구조](02-legacy-architecture.md) | Flask 요청 흐름, 인증·세션, **권한 모델·권한 키 54개**, 설정·암호화, 기동 시 스키마 보정 | 백엔드 |
| [03. 업무 도메인별 규칙](03-business-rules.md) | 기준정보·견적·생산·재고·출하·회계·레시피·라벨 등 **계산식·상태 전이·보존할 규칙·결함**, 업무 담당자 확인 질문 | 백엔드·기획 |
| [04. 화면·메뉴 매핑과 이관 추적표](04-screen-map.md) | 메뉴 43개 ↔ 기존 JS ↔ API ↔ 권한 ↔ React 경로 ↔ **이관 상태**, 공통 UI 부품, 화면 결함 | 프런트 |
| [05. 목표 구조](05-target-architecture.md) | **앞으로 따를 설계 기준**: 패키지·명명·응답 형식·DB·MyBatis·권한·프런트 폴더·apiClient | 개발 전원 |
| [06. 신규 시스템 구조](06-new-system.md) | 현재 `backend/`·`frontend/` 코드 설명, **새 화면·API 추가 방법**, 목표와의 차이 | 개발 전원 |
| [07. 진행 현황과 로드맵](07-migration-status.md) | 완료 내역·검증 결과, **신규 코드 이슈 13건**, 단계별 로드맵, 결정 필요 항목, 보고용 요약 | 관리·보고 |
| [08. 실행·테스트 안내](08-run-guide.md) | 서버 실행·종료, 설정값, 테스트 명령, 문제 해결, 전자정부 개발도구 사용 | 개발 전원 |
| [09. s-erp-main 분석·비교](09-s-erp-reference.md) | 참조 프로젝트의 스택·규칙·자동화, 송연과 비교, 따르는 것/따르지 않는 것 | 개발 전원 |
| [10. 전환 작업 내역(보고용)](10-change-history.md) | 진행 현황 요약, 날짜별 작업 내용, 운영 DB 자료 변경, 기존과 다른 점, 결정 필요 사항 | 보고·공유 |
| [11. 프로젝트 구조(보고용)](11-project-structure.md) | 전체 구성, 코드 체계, 서버·화면 폴더 구조와 규칙, 규모 | 보고·공유 |
| [12. F1-Grid 도입 검토(보고용)](12-f1-grid-review.md) | 생산현황 시범 적용 결과, 전체 적용 시 문제점, 결정 필요 사항 | 보고·공유 |

**부록 (자동 생성)**

| 문서 | 내용 |
|---|---|
| [reference/api-inventory.md](reference/api-inventory.md) | 레거시 API 290개: 메서드·경로·핸들러·소스 줄·입력 키 후보 |
| [reference/database-schema.md](reference/database-schema.md) | 테이블 60개 / 컬럼 614개 / 인덱스 상세 |
| [reference/ui-and-test-inventory.md](reference/ui-and-test-inventory.md) | Python 모듈, 화면 JS 39개, 화면 컨테이너 43개, 테스트 49개 |
| [reference/F1-GRID.md](reference/F1-GRID.md) | F1-Grid 사용 설명서(s-erp `frontend/src/pages/f1-grid-docs/F1-GRID.md` 를 고치지 않고 복사, 자동 생성 아님) |

### 읽는 순서

- **처음 보는 사람**: 00 → 01 → 07
- **기능을 하나 옮길 때**: 04(해당 화면 행) → 03(해당 도메인) → 02(권한) → 05·06(작성 규칙) → reference(API·테이블 상세)
- **보고할 때**: 07의 1장·6장

## 규모 (레거시, 2026-09-18 재생성으로 확인)

| 항목 | 값 |
|---|---:|
| Python 모듈 / Blueprint | 18 / 9 |
| HTTP 메서드·경로 조합 (그중 `/api/`) | 290 (286) |
| `app.py` / `pricing.html` | 5,987줄 / 4,646줄 |
| 화면 JS / 화면 컨테이너 / 모달 | 39 / 43 / 약 70 |
| DB 테이블 / 컬럼 / 선언된 FK | 60 / 614 / 0 |
| 권한 키 | 54 |
| 테스트 파일 (배치 실행 대상) | 49 (36) |

## 분석 범위와 원칙

- Python 소스·템플릿·JS·설정·테스트, 신규 `backend/`·`frontend/` 전체, s-erp-main의 규칙 문서·백엔드·프런트를 읽었다. 코드는 **수정하지 않았다**(이번 작업은 문서만).
- SQLite는 읽기 전용으로 구조만 확인했다. 업무 데이터·비밀번호·API 키·`secret.key`·s-erp 접속 정보 값은 읽거나 옮기지 않았다.
- 앱 실행·테스트 재실행·프린터·센서·외부 API 검증은 하지 않았다. 테스트 결과는 2026-09-17 실행 기록이다.
- "권장", "미정"으로 표시한 항목은 사용자 결정이 필요하다.

## 부록 재생성

```powershell
cd 'C:\Users\USER\Documents\업무\송연'
.\venv\Scripts\python.exe -X utf8 docs\_tools\inventory.py
```
표준 라이브러리만 사용하고 앱 모듈을 import하지 않는다(import하면 스키마 보정이 실행되기 때문). `docs/reference/` 3개 파일을 덮어쓴다. 해설은 01~09에 쓴다.

## 이번 재구성에서 바뀐 점 (2026-09-18)

| 기존 문서 | 처리 |
|---|---|
| 01-current-architecture, 02-domain-and-business-rules | 01·02·03으로 재작성(업무 규칙·결함·권한 키 대폭 보강) |
| 03~05 자동 생성 목록 | `reference/`로 이동, 생성 도구 경로 수정 |
| 06-migration-plan | 05(목표 구조)·07(로드맵)로 흡수 |
| 07-migration-progress-report, 09-product-page-migration | 07(진행 현황)로 통합 |
| 08-run-and-egovframe-guide | 08-run-guide로 개정 |
| 10-frontend-structure | 05·06으로 흡수 |
| 11-s-erp-structure-comparison | 09로 재작성(백엔드·응답·인증·자동화 비교 추가) |
| (신규) | 04 화면 매핑·이관 추적표 |
