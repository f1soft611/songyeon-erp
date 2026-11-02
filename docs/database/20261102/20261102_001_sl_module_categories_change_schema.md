# 20261102_001 판매관리 중분류 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-11-02 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 메뉴 데이터 변경(중분류 2행 추가, 화면 3행의 화면ID · 주소 · 부모 · 순서) |
| 대상 표 | `tb_menu`(추가 2행 · 수정 3행) |
| 적용 | 2026-11-02 적용 완료 (트랜잭션 시험 실행: 다시 적용해도 같음, 롤백하면 처음과 같음, 권한 행 그대로 확인 후 적용) |
| 롤백 | `20261102_001_rollback.sql` |

## 내용

- 요청: "판매관리도 중분류 만들어야하는데". 사용자 결정은 판매처리 / 판매조회 두 중분류.
- 모듈: `SL /sl` 그대로.
- 중분류: 권한 행이 없고, 영업관리 · 생산관리 · 물류관리 중분류와 같은 모양이다.

  | 순서 | menu_code | 이름 | 주소 |
  |---|---|---|---|
  | 1 | `SL_ENTRY` | 판매처리 | `/sl/entry` |
  | 2 | `SL_INQUIRY` | 판매조회 | `/sl/inquiry` |

- 화면ID: 분류 글자 + 화면 뜻 + View. 물류관리 `ST…View` · `OB…View` 와 같은 규칙이다.

  | 중분류 | 예전 | 새 화면ID · 주소 | 순서 |
  |---|---|---|---|
  | 판매처리(EN) | `sales-register` | `ENSalesRegisterView` · `/sl/entry/ENSalesRegisterView` | 10 |
  | 판매조회(IN) | `sales-status` | `INSalesStatusView` · `/sl/inquiry/INSalesStatusView` | 10 |
  | 판매조회(IN) | `sales-total` | `INSalesTotalView` · `/sl/inquiry/INSalesTotalView` | 20 |

- 메뉴 번호 · 이름 · 권한 행(`tb_menu_permission` · `tb_role_menu_permission`)은 그대로다.

## 같이 바뀐 코드(폴더 구조 = 메뉴 구조)

| 화면 | 프론트 폴더 | 백엔드 패키지 · 매퍼 | API |
|---|---|---|---|
| 판매등록 | `pages/sl/entry/sales-register` | `let/sl/entry/salesregister` | `/api/v1/sl/entry/sales-register` |
| 판매현황 | `pages/sl/inquiry/sales-status` | `let/sl/inquiry/salesstatus` | `/api/v1/sl/inquiry/sales-status` |
| 토탈집계 | `pages/sl/inquiry/sales-total` | `let/sl/inquiry/salesstatus` | `/api/v1/sl/inquiry/sales-total` |

- 토탈집계는 판매현황과 서비스 · DAO · 매퍼를 같이 쓰므로 백엔드 패키지를 나누지 않았다.

## 영향 범위

- 화면(`DashboardContent`)은 모듈 `sl` 과 위 화면ID 로 화면을 고른다.
  - 이 스크립트를 적용하지 않으면 새 화면 코드에서 판매관리 화면이 열리지 않는다.
  - 반대로 적용하면 예전 화면 코드에서 판매관리 화면이 열리지 않는다.
- API 주소가 바뀌어 프론트(Vercel)와 백엔드(war)를 같이 올려야 한다. 예전 프론트는 새 백엔드에서 판매관리 API 를 부를 수 없다.
- 그래서 DB 적용 · war 배포 · 프론트 배포를 한 번에 한다.
- 브라우저에 남은 예전 주소(최근 사용 · 즐겨찾기의 `/sl/sales-register` 등)는 열리지 않는다. 메뉴에서 다시 열면 된다.
- 롤백하면 중분류 2행을 지우고 화면을 모듈 바로 아래(예전 화면 키 · 주소 · 순서)로 돌린다. 화면 · 서버 코드도 함께 돌려야 한다.
