# 20261105_002 품질관리 중분류 · 라벨 탭 화면 분리 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-11-05 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 메뉴 데이터 변경(중분류 2행 · 새 화면 2행 추가, 화면 2행의 화면ID · 주소 · 부모 · 순서, 새 화면 권한 행 복사). 테이블 · 칸 변경 없음 |
| 대상 표 | `tb_menu`(추가 4행 · 수정 2행), `tb_menu_permission` · `tb_role_menu_permission`(새 화면 행 추가) |
| 적용 | 2026-11-05 적용 완료(트랜잭션 시험 실행 통과: 예전 화면 2개 메뉴 번호 · 권한 그대로, 새 화면 권한 = 라벨등록 권한, 다시 적용해도 같음, 롤백하면 처음과 같음) |
| 롤백 | `20261105_002_rollback.sql` |

## 내용

- 요청: "품질관리도 중분류 만들어서 메뉴 나눠주고 표준맞춰줘" → 사용자 결정: 라벨등록 탭을 화면으로 나눔.
- 설계: [20261105_005_품질관리_중분류_표준화_계획사양서.md](../../plan/20261105/20261105_005_품질관리_중분류_표준화_계획사양서.md)
- 모듈: `QM /qm` 그대로. 중분류는 권한 행이 없고 다른 모듈 중분류와 같은 모양이다.

| 중분류 | 예전 | 새 화면ID · 주소 | 순서 |
|---|---|---|---|
| `QM_LABEL` 라벨관리 `/qm/label`(1) | `label-register` 라벨등록 | `LBLabelRegisterView` · `/qm/label/LBLabelRegisterView` | 10 |
| | (라벨등록의 탭) | `LBLabelRequestView` 표시사항 요청 | 20 |
| | (라벨등록의 탭) | `LBLabelFormatView` 라벨양식 | 30 |
| `QM_TEMPERATURE` 온도관리 `/qm/temperature`(2) | `temp-monitor` 실시간 온도 | `TMTempMonitorView` · `/qm/temperature/TMTempMonitorView` | 10 |

- 새 화면 2개의 권한은 라벨등록의 메뉴 권한 · 역할 권한을 그대로 복사했다. 기존 메뉴의 권한 행은 바뀌지 않는다.

## 같이 바뀐 코드(폴더 구조 = 메뉴 구조)

| 화면 | 프론트 폴더 | 백엔드 패키지 · 매퍼 | API |
|---|---|---|---|
| 라벨등록 · 표시사항 요청 · 라벨양식 | `pages/qm/label/label-register` · `label-request` · `label-format` | `let/qm/label/labelregister` | `/api/v1/qm/label/label-register` |
| 실시간 온도 | `pages/qm/temperature/temp-monitor` | `let/qm/temperature/tempmonitor` | `/api/v1/qm/temperature/temp-monitor` |

- 공용 라벨 API(`let/qm/label`, `/api/v1/qm/label`)는 그대로다.

## 영향 범위

- 화면(`DashboardContent`)은 모듈 `qm` 과 위 화면ID 로 화면을 고른다. 스크립트 · 프론트 · 서버(war)를 같이 올려야 한다.
  - 스크립트만 적용하면 예전 화면 코드에서 품질관리 화면이 열리지 않는다. 프론트만 올리면 새 화면ID 가 없어 열리지 않는다.
  - API 주소가 바뀌어 프론트와 서버를 같이 올려야 한다.
- 브라우저에 남은 예전 주소(최근 사용 · 즐겨찾기의 `/qm/label-register` · `/qm/temp-monitor`)는 열리지 않는다. 메뉴에서 다시 열면 된다.
- 롤백하면 새 화면 2개(권한 행은 FK CASCADE, 화면검수 기록은 먼저 지움) · 중분류를 지우고 예전 화면ID · 주소 · 순서로 돌린다. 프론트 · 서버도 함께 돌려야 한다.
