# 20261103_005 입고관리 탭 → 화면 분리 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-11-03 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 메뉴 데이터 변경(화면 1행의 화면ID · 주소 · 이름 · 설명, 새 화면 3행 추가, 화면 1행 순서, 새 화면 권한 행 복사) |
| 대상 표 | `tb_menu`(추가 3행 · 수정 2행), `tb_menu_permission` · `tb_role_menu_permission`(새 화면 행 추가) |
| 적용 | 2026-11-03 적용 완료(트랜잭션 시험 실행 통과: 입고등록은 예전 메뉴 번호 그대로, 새 화면 권한 = 입고등록 권한, 다시 적용해도 같음, 롤백하면 처음과 같음) |
| 롤백 | `20261103_005_rollback.sql` |

## 내용

- 요청: "입고관리화면에 있는 탭4개 다 화면으로 빼고싶은데" → 메뉴 구성 "제안대로", 조회조건 "발주관리처럼 같이 정리".
- 설계: [20261103_007_입고관리_화면분리_설계서.md](../../spec/20261103/20261103_007_입고관리_화면분리_설계서.md)

| 순서 | 화면ID · 주소 | 이름 | 바뀐 것 |
|---|---|---|---|
| 10 | `IBReceivingRegisterView` · `/pu/inbound/IBReceivingRegisterView` | 입고등록 | 예전 `IBReceivingView` 입고관리 행. 메뉴 번호 · 권한 그대로, 화면ID · 주소 · 이름 · 설명(`원재료 입고를 등록해요`) |
| 20 | `IBReceivingStatusView` · `/pu/inbound/IBReceivingStatusView` | 입고현황 | 새 행(`기간별 입고 · 반품 현황을 확인해요`) |
| 30 | `IBReceivingDocView` · `/pu/inbound/IBReceivingDocView` | 서류등록 | 새 행(`입고 건마다 거래명세서 같은 서류를 보관해요`) |
| 40 | `IBReturnRegisterView` · `/pu/inbound/IBReturnRegisterView` | 반품등록 | 새 행(`원재료 반품을 등록해요`) |
| 50 | `IBSubstitutionView` | 재료 치환등록 | 순서 20 → 50 |

- 새 화면 3개의 권한은 입고등록(예전 입고관리)의 메뉴 권한 · 역할 권한을 그대로 복사했다. 탭일 때와 같은 사람이 같은 권한으로 본다(발주현황을 뺄 때 `20261102_002` 와 같은 방식).
- 기존 메뉴의 권한 행은 바뀌지 않는다.

## 같이 바뀐 코드

| 화면 | 프론트 폴더 |
|---|---|
| 입고등록 | `pages/pu/inbound/receiving-register`(예전 `receiving`, 같이 쓰는 서비스 · 타입 · 규칙) |
| 입고현황 | `pages/pu/inbound/receiving-status` |
| 서류등록 | `pages/pu/inbound/receiving-doc` |
| 반품등록 | `pages/pu/inbound/return-register` |

- 서버 API 주소 · 패키지는 그대로(`/api/v1/pu/inbound/receivings`). 매퍼 조회 조건만 거래처코드 · 원재료코드로도 찾게 바꿨다.

## 영향 범위

- 화면(`DashboardContent`)은 화면ID 로 화면을 고른다. 이 스크립트와 새 프론트를 함께 올려야 한다.
  - 스크립트만 적용하면 예전 프론트에서 입고관리 화면이 열리지 않는다(`IBReceivingView` 가 없어짐).
  - 프론트만 올리면 새 화면 메뉴가 없고 입고등록도 열리지 않는다.
- 브라우저에 남은 예전 주소(최근 사용 · 즐겨찾기의 `/pu/inbound/IBReceivingView`)는 열리지 않는다. 메뉴에서 다시 열면 된다.
- 롤백하면 새 화면 3개(권한 행은 FK CASCADE, 화면검수 기록은 먼저 지움)를 지우고 입고등록을 예전 입고관리로, 재료 치환등록 순서를 20으로 돌린다. 프론트도 함께 돌려야 한다.
