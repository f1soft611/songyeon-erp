# 04. 화면·메뉴 매핑과 React 이관 추적표

최종 정리: 2026-09-18 · 표기 `03:640` = `static/js/03-shell.js` 640행, `html:374` = `templates/pricing.html` 374행

이 문서는 **화면 단위 이관 추적표**다. 화면을 하나 옮길 때마다 "상태" 열을 갱신한다.

## 1. 기존 화면 구조 요약

- `pricing.html` 한 장에 화면 43개(`.main-screen`)와 모달 약 70개가 정적 HTML로 들어 있다. 인라인 `style=`이 1,170개다.
- 일반 `<script>` 39개를 번호 순서대로 로드하고 **전역 스코프 하나를 공유**한다. 파일 순서가 곧 의존 관계다.
- **파일 경계와 기능 경계가 다르다.** 예: `13-delivery-statement.js` 뒷부분은 온도 모니터, `14-temperature.js`에는 거래처BOM·제품BOM 저장, `18-stock.js` 뒷부분은 수불대장, `22-dashboard.js` 뒷부분은 생산현황, `03-shell.js` 중간은 단가관리, 공용 엑셀 함수는 `02-chat.js:685`에 있다. **React로 옮길 때 파일 번호가 아니라 이 문서의 "기존 JS" 열(행 범위)을 기준으로 삼는다.**
- 권한: 화면은 메뉴·탭을 숨기기만 한다. 실제 판정은 서버 `permissions.py`가 한다([02 문서 4장](02-legacy-architecture.md#4-권한-모델)).

## 2. 셸(공통 레이아웃) 동작 — 신규 구현 대조

| 기존 동작 | 위치 | 신규 React | 비고 |
|---|---|---|---|
| 분류 타일 11개 + 메뉴 목록, DOM 순서 | 03:686-759 | ✅ `navigation.ts` + `Sidebar` | 분류·ID·순서·이름 동일 확인 |
| 마지막 분류 기억(localStorage `songyeon-nav-category`) | 03:706 | ❌ | |
| 메뉴 하나짜리 분류는 타일 클릭 시 바로 열기 | 03:751 | ❌ | |
| 탭: 대시보드 고정, 중복 방지, 닫기 | 03:502-684 | ✅ `useWorkspace` | 신규는 열린 탭을 모두 마운트한 채 hidden 처리(입력 유지) |
| 보던 메뉴 다시 클릭 = 새로고침, `ALWAYS_REFRESH` 12개 화면 | 03:522-606 | ❌ | 화면별 조회 훅에 refetch로 구현 |
| F2 = 현재 화면 조회 | 03:195 | ❌ | |
| 화면 전환 시 열린 모달 모두 닫기 | 03:648 | ❌ | |
| 메뉴 배지(메신저 안읽음, 레시피발 가견적, 라벨 요청) | html:60,74, 05:17 | ❌ | |
| 권한 별칭(wh-move→stock 등 5종), settings-* → 기초정보 | 03:85-115 | ✅ | |
| `shared_recipe_count` → 공유받은 레시피 메뉴, `shared_document_count` → 문서함 | 03:66-69,103,106 | ❌ | `/api/me`에 두 필드가 없음 |
| `recipe-shared`(공유받은 레시피) 숨김 메뉴 | html:90 | ❌ | navigation.ts에 없음 |
| 다크모드(`songyeon-theme`), 첫 화면 깜빡임 방지 | 03:11-37, html:11-22 | ✅ (깜빡임 방지는 없음) | |
| 기본 비밀번호 경고 + 비밀번호 변경 | html:171, 03:161-192 | 경고만 ✅, 변경 ❌ | 서버 API도 미구현 |
| 로그아웃 | 03:153 | ✅ | |
| 채팅 위젯(떠 있는 버튼) | 02:368-683 | 버튼만(준비 중 안내) | |
| 모달 ESC·최대화·크기 기억 | 01:517-628 | 기본 `<dialog>`만 | |
| "DB 연결됨" 표시(관리자만) | html:41, 03:48 | ✅ "서버 연결됨"(관리자만) | **둘 다 실제 연결 확인 없는 고정 표시** |
| 전역 fetch 래퍼(401→로그인, 403 알림, 네트워크 오류) | 01:640-690 | 인증 API에만 있음 | 공용 apiClient 필요 |

## 3. 메뉴·화면 매핑표

**상태**: ✅ 완료 · 🟡 화면만(서버 미연결) · ⬜ 미착수
**복잡도**: 상·중·하 (JS 규모, 편집·인쇄·계산 요소 기준)
**React 경로**: 옮긴 화면은 화면코드 규칙 `pages/<업무코드>/<화면코드>/<화면코드>Page.tsx`(예: `pages/sa/SA0001/SA0001Page.tsx`, 2026-09-18 결정)를 따른다. 아직 옮기지 않은 화면의 경로는 예전 제안(`pages/<업무>/<기능>/XxxPage.tsx`)이 남아 있으며, 옮길 때 업무코드(CM·PD·LG·SL·PU·QM·RD·HA)와 메뉴 순서 번호로 화면코드를 붙인다([05 문서 2-1](05-target-architecture.md#2-1-패키지-트리)).

### 대시보드 · 메신저·AI

| 메뉴ID | 메뉴명 | 기존 JS | 주요 API | 권한 | 복잡도 | React 경로(제안) | 상태 |
|---|---|---|---|---|---|---|---|
| dashboard | 대시보드 | 22:4-151 | dashboard-memos(GET·POST·DELETE), holidays | 없음 | 중하 | `pages/dashboard/DashboardPage.tsx` | 🟡 달력·메모 팝업 화면만. 메모 API·공휴일 API 미연결(정적 JSON) |
| chat | 메신저 | 02:1-366 (+위젯 368-683) | chat/rooms, messages(after_id 폴링), read, unlock, password, members, invite, search, employees, files | chat | 상 | `pages/comm/chat/ChatPage.tsx` + 공용 위젯 | ⬜ |
| ai-chat | AI 분석 | 11 전체 | ai/chat, ai/generate-image, server-settings(관리자) | ai-chat | 하 | `pages/comm/ai/AiChatPage.tsx` | ⬜ |

### 영업관리

| 메뉴ID | 메뉴명 | 기존 JS | 주요 API | 권한 | 복잡도 | React 경로(제안) | 상태 |
|---|---|---|---|---|---|---|---|
| product | 제품등록 | 04:4-492 | materials/names, products/next-code, materials/check, products/register, product-types, (견적 확정 시) quotes/{}/mark-confirmed, pricing/{code} | product | 중상 | `pages/sa/SA0001/SA0001Page.tsx` | 🟡 기존 화면과 같은 문구·배치로 재작성, BOM 행 편집(빈 행 3개 시작)·적용단가 계산·저장 전 검사. **저장은 서버 연결됨**(`POST /api/sa/sa0001`, 성공하면 기존처럼 제품코드까지 입력을 비움, 등록 내용은 단가관리에서 확인). **원재료명 확인 창 연결됨**(등록 전 `materials/check` → 다르면 기존 확인 창, 고른 이름으로 등록). **원재료명 자동완성·단가 자동 채우기 연결됨**(자동으로 채운 단가는 이름이 안 맞으면 비움 — 기존 문제 수정). 거래처명 자동완성 연결됨(거래처BOM, 없는 이름은 비움). 포장유형 목록, 엑셀 파싱은 미연결. **서버**: `/api/sa/sa0001`(원재료·포장유형·거래처 목록, 원재료명 확인, 등록+견적 확정 — 제품코드는 저장할 때 발번) 작성 |
| pricing | 단가관리 | 03:223-500 | summary, pricing(목록·상세·수정), product-types, client-master | pricing | 중 | `pages/sa/SA0002/SA0002Page.tsx` | 🟡 기존 문구·배치 그대로. 거래처 유사도 필터·차액금 필터/정렬·차액 색·단가상세 창(고정마진·로스 계산, 포장유형 값 채우기, 상위 5개 원재료 강조) 구현. **서버 연결됨**: 제품 수·목록(검색어 입력마다 다시 조회)·상세·포장유형·저장(저장 뒤 목록·상세 다시 조회). 엑셀 다운로드 연결됨(보이는 줄 그대로, 시트 단가관리). 거래처 자동완성·저장 알림(토스트)은 미연결. **서버**: `/api/sa/sa0002`(목록·요약·상세·저장, 포장유형·거래처 목록) |
| quote | 견적 | 05:4-429 | quotes CRUD | quote | 중 | `pages/sa/SA0003/SA0003Page.tsx` | 🟡 기존 문구·배치 그대로. 목록(검색·전체선택·출력 수)·가견적 창(작성/수정/확정 상세 읽기전용, BOM 편집, 고정마진→로스→원가 합계 견적단가, 포장유형 값 채우기, 저장 전 검사). **서버 연결됨**: 목록, 가견적 작성·수정(상세를 받아 입력칸·BOM 채움)·삭제(확인), 거래처명(거래처BOM strict)·원재료명(단가 자동 채우기)·포장유형 자동완성. **확정 연결됨**: 상세를 받아 제품등록 탭을 열고 값을 채운다(기존 안내 문구 포함), 등록하면 `quote_id`·`quote_costs` 를 함께 보내 확정·단가 반영, 견적 목록은 자동으로 다시 조회. 견적서 인쇄·엑셀은 미연결. **서버**: `/api/sa/sa0003`(목록·상세·작성·수정·삭제, 원재료·포장유형·거래처 목록). 확정 표시는 제품 등록 때 함께 |
| order | 수주등록 | 20:4-245 | sales-order CRUD, products/order-candidates, clients/sales-names·vendor-names | order | 중 | `pages/sa/SA0004/SA0004Page.tsx` | 🟡 기존 문구·배치 그대로. 날짜 기본값(오늘), 행 추가·저장 전 삭제, 재고생산 체크 시 출고일 비우고 잠금, 건수·총수주량 합계, 저장 전 줄 빨간 표시, 알림창. **서버 연결됨**: 열면 오늘 수주 조회, 조회, 새 줄 저장(번호 받고 잠금)·수정(풀고 다시 저장)·삭제(저장된 줄은 확인), 저장된 줄 파란 표시, 생산확정·출하등록에서 가져간 줄은 '… 가져감 — 수정불가', 거절 시 서버 문구 후 물류출고일/거래처 칸으로. 거래처·품목 자동완성 연결됨(매출 거래처 strict, 그 거래처 품목 위로). 엑셀 다운로드 연결됨. **표는 F1-Grid**(2026-09-23, 거래처 앞에 순번 칸 추가): 칸을 두 번 눌러 고치고, 거래처·품목 후보는 브라우저 기본 목록, 없는 거래처는 저장할 때 알린다([12-f1-grid-review.md](12-f1-grid-review.md)). **서버**: `/api/sa/sa0004`(날짜별 조회·등록·수정·삭제, 매출 거래처·품목 후보) |
| shipment | 출하등록 | 21:54-500 | logistics-schedule(등록·삭제·실출하량·로트배분), products/stock, products/{code}/lots, sales-order(가져오기), mark-imported | shipment | 상 | `pages/sa/SA0005/SA0005Page.tsx` | 🟡 기존 문구·배치 그대로. 날짜 조회·새 줄(저장 전 검사)·취소, 확정된 줄 읽기 전용, 로트 선택 창(생산입고 완료/생산예정, 여러 로트 배분 합계 검사), 수주등록 가져오기 창(기간 3일 전~7일 뒤, 전체 가져오기). **서버 연결됨**: 열면 오늘 출하 조회, 새 줄 등록(+수주 가져감)·저장된 줄 출하량(생산연동 줄은 생산확정 실출하량)·삭제(확인), 로트 선택 창(품목명(규격)으로 제품 → 로트·생산예정 수주), 저장된 줄 로트 배분(적어둔 배분 불러오기·저장), 수주등록 가져오기(열면 바로 조회). 저장·배분 뒤 다시 조회할 때 아직 저장 안 한 새 줄은 남김(기존은 사라짐). 거래처·품목 자동완성 연결됨(매출 거래처 strict, 그 거래처 품목 위로). 엑셀 다운로드 연결됨. **서버**: `/api/sa/sa0005`(목록·등록+수주 가져감·실출하량·삭제·로트 배분·로트·생산예정 수주·가져올 수주·거래처·품목) |
| prod-check | 생산가능확인 | 34 전체 | products/with-bom, production/feasibility | prod-check | 중 | `pages/sa/SA0006/SA0006Page.tsx` | 🟡 기존 문구·배치 그대로. 검색 창(생산일자, 제품 담기 — 공용 `shared/components/Picker`), 만들 것 줄(수량·빼기·상세보기), 확인 전 검사, 판정 한 줄, 원재료 표(모자란 것 위, 제품별 필요량 칸, 합계줄, 머리 눌러 정렬), 제품 하나 상세. **서버 연결됨**: 검색 창을 처음 열 때 제품 목록(BOM 있는 제품), 확인(제품·수량 짝지어 조회 → 판정·원재료·제품별 필요량·상세보기), 거절 시 서버 문구·앞 결과 유지. 엑셀 다운로드 연결됨. **서버**: `/api/sa/sa0006`(제품 목록·확인) |

### 공통관리

| 메뉴ID | 메뉴명 | 기존 JS | 주요 API | 권한 | 복잡도 | React 경로(제안) | 상태 |
|---|---|---|---|---|---|---|---|
| settings | 기초정보(탭 10개, 아래 표) | 04·06·07·08·14·16·24 일부 | 아래 | settings-* | 상 | `pages/cm/CM0001/CM0001Page.tsx` | ✅ **탭 10개 모두 화면·서버 연결됨**: 제품BOM(목록 검색·안 만든 기간·사용안함 보기·엑셀, 창의 상세보기(총량→중량 환산)·수정(기본정보·부자재·배합비, 원재료명 확인 창)·변경로그 diff), 포장유형(줄 단위 저장·삭제, 화면은 %·저장은 비율), 포장방법·차량정보(추가 창·삭제), 창고등록(추가·수정 창, 입고창고 한 곳, 이름 바꾸면 원재료도 따라옴, 쓰는 곳 있으면 삭제 막음). 거래처BOM(목록 검색·등록/수정 창(사업자등록번호 검산·Daum 주소 검색)·삭제·엑셀 양식 내려받기/올리기), 거래처별 제품조회(거래처명을 적어야 그 거래처 제품만, 상세보기는 제품BOM 창의 상세보기 탭), 원재료BOM(목록 검색·안 쓴 기간·엑셀, 원재료 창(기본정보·납품업체 여러 곳·단가/예약·변경로그)·역전개·일괄적용), 부자재BOM(분류 필터·검색·쓰는 제품 수, 원재료 창을 분류 칸만 더해 함께 씀), 서버관리(외부 API 키·주소, 키는 잠가서 보관하고 화면에는 앞뒤 몇 글자만). 탭은 권한 있는 것만 보인다. 제품BOM 의 라벨보기는 라벨 화면 이관 때. **서버**: `/api/cm/cm0001` |
| production | 생산스케줄 | 20:612-653 | production-schedule?date | production | 하 | `pages/cm/CM0002/CM0002Page.tsx` | ✅ 기존 문구·배치 그대로(조회 전용). 열면 오늘 것을 바로 조회, 날짜 조회, 합계(생산품목수량·총생산량 — 생산지시량에서 숫자만 뽑아 더함), 엑셀 다운로드(실생산량이 있으면 그것, `생산스케줄_<날짜>_<오늘>.xlsx`). `📺 TV로 보기` 는 현장 TV 화면(`/tv/production`, 로그인 없이 새 창)을 연다. **서버**: `/api/cm/cm0002`(날짜별 조회) |
| logistics | 물류스케줄 | 21:4-52 | logistics-schedule?date | logistics | 하 | `pages/cm/CM0003/CM0003Page.tsx` | ✅ 기존 문구·배치 그대로(조회 전용). 열면 오늘 것을 바로 조회, 출하완료/출하대기/생산연동 꼬리표와 줄 색, 합계(출고품목수량·총출고량), 엑셀(상태 칸 포함). `📺 TV로 보기` 는 현장 TV 화면(`/tv/logistics`, 로그인 없이 새 창)을 연다. **서버**: `/api/cm/cm0003`(출하등록 줄 + 물류출고일이 잡힌 생산확정 줄, 로트가 연결된 생산 줄은 숨김) |
| recipe-shared (숨김) | 공유받은 레시피 | 09:814-854 | recipe-shares/mine, recipe-drafts/{}/shared-view | shared_recipe_count>0 | 하 | `pages/rnd/shared/SharedRecipePage.tsx` | ⬜ (메뉴 정의도 없음) |

**기초정보 서브탭** (html:380-390, 탭 표시 권한은 `settings-{탭}` 또는 `data-basic-perm`)

| 탭 | 권한 키 | 기존 JS | API | 복잡도 |
|---|---|---|---|---|
| 포장유형 | settings-packaging | 04:494-556 | product-types | 하 |
| 포장방법 | settings-packingmethod | 08:4-55 | packing-methods | 하 |
| 차량정보 | settings-vehicle | 08:146-197 | vehicles | 하 |
| 창고등록 | settings-warehouse | 08:57-144 | warehouses | 하 |
| 제품BOM | settings-pbom | 06:4-161, 258-409 / 07:387-458, 1347-1391 / 14:250-289 | products/with-bom, bom, bom-log, discontinue, sub-materials, info, materials/check, 라벨 조회 | 상 |
| 거래처BOM | settings-client | 14:98-248 | client-master CRUD, export-excel, upload-excel (+Daum 우편번호) | 중 |
| 거래처별 제품조회 | settings-clientproduct | 06:119-144 | products/with-bom(캐시) | 하 |
| 원재료BOM | settings-material | 16:4-487 | materials CRUD, usage, bulk-replace, price·price-log·price-schedule | 상 |
| 부자재BOM | settings-material | 16:490-551 | sub-materials | 하 |
| 서버관리 | (관리자 전용) | 24 전체 | server-settings | 하 |

### 생산관리

| 메뉴ID | 메뉴명 | 기존 JS | 주요 API | 권한 | 복잡도 | React 경로(제안) | 상태 |
|---|---|---|---|---|---|---|---|
| prod-confirm | 생산확정 | 20:247-610 | production-schedule CRUD, /materials, sales-order(가져오기), mark-imported | prod-confirm | 중상 | `pages/pd/PD0001/PD0001Page.tsx` | 🟡 기존 문구·배치 그대로. 열면 오늘 것을 바로 조회, 줄 단위 확정·수정·삭제(확인), 확정된 줄은 잠기고 파란 표시·재고생산/원재료치환 꼬리표, 합계(화면에 보이는 줄 기준), 엑셀. 수주등록 가져오기 창(기본 기간 −3일~+7일, 이미 담은 건 제외, 전체 가져오기, `→` 로 그 수주의 수주등록 화면으로 이동해 줄을 밝힘). 거래처·품목 자동완성 연결됨. **확정하면 로트번호 발번·배합비대로 원재료 차감·수주 '가져감' 표시·그 수주의 출하줄을 이 로트에 연결**(서버 한 트랜잭션). **📄 레시피(현장 투입지시서) 연결됨** — 새 창(`/print/batch-sheet?id=`)으로 A4 한 장, 생산지시량으로 환산한 투입량(kg)·로트번호, 바꿔 쓴 줄은 바뀐 이름과 원래 이름, 배합비(%)는 종이에 넣지 않음. **미연결**: 🏷️ 라벨 — 라벨출력 화면 이관 때. **서버**: `/api/pd/pd0001`(조회·확정·수정·삭제, 가져올 수주, 거래처·품목) |
| actual | 생산입고 | 20:655-750 | production-schedule?date, actual-qty | actual | 중 | `pages/pd/PD0002/PD0002Page.tsx` | ✅ 기존 문구·배치 그대로. 열면 오늘 것을 바로 조회, 실생산량 저장(저장하면 칸이 잠김 · '저장됨' 잠깐)·수정·입고취소(확인 문구에 지울 수량), 엑셀. **저장하면 제품 재고가 늘고 원장(`product_stock_movement`)에 생산입고/생산정정/입고취소로 남으며, 만든 만큼 필름·파우치가 빠진다**(고치면 차이만큼만). **서버**: `/api/pd/pd0002` + 공용 재고 원장 `service/inventory/InventoryService` |
| prod-status | 생산현황 | 22:154-195 | production-status | prod-status | 하 | `pages/pd/PD0003/PD0003Page.tsx` | ✅ 기존 문구·배치 그대로. 기간(오늘~오늘로 채움)·품목명·거래처명 검색, 조회를 눌러야 불러옴(기존도 처음엔 빈 표), 실생산량이 적힌 줄만 생산일·거래처 순, 엑셀. 서버 `/api/pd/pd0003`(권한 prod-status·production·prod-confirm) |
| label-print | 라벨출력 | 15 전체 + 07 `openLabelForm(printMode)` | label-print/by-date + 라벨 조회 API | label-print | 하(라벨 렌더러가 있으면) | `pages/pd/PD0004/PD0004Page.tsx` + `shared/components/LabelForm` | ✅ 기존 문구·배치 그대로. 날짜(오늘로 채움)·조회를 눌러야 불러옴, 품목명·규격단위·생산수량·바코드(CODE128)·🏷️ 인쇄(제품코드 없으면 막고 기존 안내). 인쇄는 라벨 창을 인쇄 전용으로(사용중 버전 고정·칸 잠금·배합표·알러지 자동채움·미리보기 배율·새 창 인쇄). 생산확정의 🏷️ 라벨도 같은 창. 서버 `/api/pd/pd0004`(label-print) + 공용 `/api/qm/label` |

### 물류관리

| 메뉴ID | 메뉴명 | 기존 JS | 주요 API | 권한 | 복잡도 | React 경로(제안) | 상태 |
|---|---|---|---|---|---|---|---|
| product-stock | 제품재고관리 | 20:751-881 | products/stock, lots, stock-as-of | product-stock | 중하 | `pages/lg/LG0001/LG0001Page.tsx` | ✅ 기존 문구·배치 그대로. 열면 바로 조회, 품목명·거래처(엔터로도 조회)·정렬(조회를 눌러야), 현재고·생산예정(지시량 합계·건수)·합계현재고, 로트보기(한 줄·전체, 로트번호 없으면 생산일·생산예정 꼬리표), 기준일 📥 내려받기(그 날짜 기준 재고·원재료비·재고금액), 💰 재고금액 조회 창. 서버 `/api/lg/lg0001`(목록·as-of: product-stock·stock·logistics·prod-status, 로트: product-stock·ship-confirm·logistics) |
| ship-confirm | 출하확정 | 21:502-940 | (logistics\|production)-schedule/{}/confirm·unconfirm-shipment, actual-qty, charter-summary | ship-confirm | 상 | `pages/lg/LG0002/LG0002Page.tsx` | ✅ 기존 문구·배치 그대로. 열면 오늘 것을 바로 조회, 실출하량 제안(정한 값 · 만든 만큼 · 예정량 순), 확정된 줄 잠김·확정취소, 칸 글자 거르기, 확정 전 재고 마이너스 경고, 🚚 배차·순서로 정렬(배차별 묶음 줄), 💰 용차 금액 확인 창, 🖨 인쇄(완제품출고일지·작업지시서 새 창), 엑셀. 서버 `/api/lg/lg0002`(목록: logistics·ship-confirm·ship-status·shipment, 확정·확정취소·칸 목록: ship-confirm, 용차: 로그인만) |
| ship-status | 출하현황 | 23 전체 | shipment-status | ship-status | 하 | `pages/lg/LG0003/LG0003Page.tsx` | ✅ 기존 문구·배치 그대로. 기간(오늘~오늘)·품목명·거래처명, 조회를 눌러야 불러옴, 출고일·거래처 순, 이월 꼬리표(서버가 만든 글자), 엑셀. 서버 `/api/lg/lg0003`(ship-status·logistics·ship-confirm) |

### 판매관리

| 메뉴ID | 메뉴명 | 기존 JS | 주요 API | 권한 | 복잡도 | React 경로(제안) | 상태 |
|---|---|---|---|---|---|---|---|
| sales-register | 판매등록 | 36:31-137 | sales/shippable, sales/pull, sales(POST), accounting/clients·products | sales-register | 중하 | `pages/salesmgmt/register/SalesRegisterPage.tsx` | ⬜ |
| sales-status | 판매현황 | 36:139-190 | sales(GET·DELETE) | sales-status | 하 | `pages/salesmgmt/status/SalesStatusPage.tsx` | ⬜ |
| sales-total | 토탈집계 | 36:192-317 | sales/total | sales-total | 중하 | `pages/salesmgmt/total/SalesTotalPage.tsx` | ⬜ |

### 구매관리

| 메뉴ID | 메뉴명 | 기존 JS | 주요 API | 권한 | 복잡도 | React 경로(제안) | 상태 |
|---|---|---|---|---|---|---|---|
| po | 발주관리 (탭: 등록/현황) | 19:12-110, 154-177, 454-536; 38 | materials/purchase-order(목록·bulk·삭제) | po | 중 | `pages/purchase/orders/PurchaseOrderPage.tsx` | ⬜ |
| recv | 입고관리 (탭 4: 등록/현황/서류/반품) | 19:111-452, 538-1110; 37 | materials/receiving(목록·bulk·삭제), receiving-status(+detail), last-price, purchase-order, attachments | recv | 상 | `pages/purchase/receiving/ReceivingPage.tsx` | ⬜ |
| mat-sub | 재료 치환등록 | 39 전체 | material-substitution, production-schedule/{}/materials·substitute | mat-sub | 중 | `pages/purchase/substitution/MaterialSubstitutionPage.tsx` | ⬜ |
| purchase | 수불대장 (탭: 원재료/부자재) | 18:600-1139 | purchase-stock-range, purchase-order/bulk(source=ledger), stock-as-of | purchase | 상 | `pages/purchase/ledger/StockLedgerPage.tsx` | ⬜ |
| stock | 재고조정 (탭: 원재료/제품/창고이동) | 18:1-598, 30 | materials·products stock-upload·schedule·confirm·history, movement, warehouse-moves(lookup·CRUD) | stock / wh-move(탭) | 상 | `pages/purchase/stock-adjust/StockAdjustPage.tsx` | ⬜ |
| stock-status | 재고현황 | 29 전체 | materials/stock-as-of, materials/{code}/lots | stock-status | 중 | `pages/purchase/stock-status/StockStatusPage.tsx` | ⬜ |
| documents | 문서함 (탭: 공용/개인/공유) | 28 전체 | doc-folders(CRUD·lock·unlock·files), attachments, document-shares, departments | documents 또는 shared_document_count>0 | 상 | `pages/purchase/documents/DocumentBoxPage.tsx` | ⬜ |

### 품질관리

| 메뉴ID | 메뉴명 | 기존 JS | 주요 API | 권한 | 복잡도 | React 경로(제안) | 상태 |
|---|---|---|---|---|---|---|---|
| label-register | 라벨등록 (탭: 등록/표시사항 요청/양식) | 07·25·26·27 (약 2,400줄) | label-register/products, label-versions, products/{code}/label·label-layout·bom·bom-allergens, label-templates, label-fields, label-marks, label-company-info, label-requests, label-source-products | label-register | **최상** | `pages/quality/labels/LabelRegisterPage.tsx` + `shared/label-renderer` | ⬜ |
| temp-monitor | 실시간 온도 | 13:209-397, 14:4-94 | temp/settings·groups·sensors·readings·channels | temp-monitor | 중 | `pages/quality/temperature/TemperatureMonitorPage.tsx` | ⬜ |

### 상품개발

| 메뉴ID | 메뉴명 | 기존 JS | 주요 API | 권한 | 복잡도 | React 경로(제안) | 상태 |
|---|---|---|---|---|---|---|---|
| recipe-write | 레시피 작성 | 09:4-521 (+04:176-265) | recipe-clients, recipe-sales-reps, recipe-drafts CRUD, versions, recipe-versions/{} (+export-excel), stage-logs, products/with-bom, materials/check | recipe_permission (편집은 upload) | 상 | `pages/rnd/recipes/RecipeWritePage.tsx` | ⬜ |
| recipe-share | 레시피 검색·공유 | 09:523-642, 713-812 | recipe-drafts(검색), recipe-handoffs, recipe-shares | recipe_permission (넘기기 upload, 공유 관리자) | 중 | `pages/rnd/share/RecipeSharePage.tsx` | ⬜ |
| recipe-log | 레시피 공유 로그 | 09:644-711 | recipe-handoffs | recipe_permission | 하 | `pages/rnd/log/RecipeLogPage.tsx` | ⬜ |

### 인사·회계

| 메뉴ID | 메뉴명 | 기존 JS | 주요 API | 권한 | 복잡도 | React 경로(제안) | 상태 |
|---|---|---|---|---|---|---|---|
| hr | 인사관리 (탭: 사원/근태/증명서/계정) | 32·35·17 | employees CRUD, resident-no, account(관리자), hr/leave | hr / employees(계정 탭) | 상 | `pages/accounting/hr/HrPage.tsx` | ⬜ (증명서 탭은 기존에도 미구현) |
| acc-basic | 기초회계정보 (탭: 계정과목/계좌/카드) | 31 전체 | accounting/subjects·bank-accounts·cards | acc-basic | 중 | `pages/accounting/basic/AccountingBasicPage.tsx` | ⬜ |
| acc-tx | 회계거래현황 | 33:12-171 | accounting/transactions | acc-tx | 중하 | `pages/accounting/transactions/TransactionPage.tsx` | ⬜ |
| acc-in-report | 입·출금관리 (탭: 입금/출금) | 33:174-302 | accounting/cash-report | acc-in-report / acc-out-report | 하 | `pages/accounting/cash-report/CashReportPage.tsx` | ⬜ |
| acc-sales | 매출·매입관리 (탭: 매출/매입) | 10 전체 | accounting/trade-report, clients, products | acc-sales / acc-purchase | 중 | `pages/accounting/trade/TradeReportPage.tsx` | ⬜ |
| acc-receivable | 거래처별관리대장 (탭: 채권/채무) | 33:305-541 | accounting/client-ledger | acc-receivable / acc-payable | 중 | `pages/accounting/ledger/ClientLedgerPage.tsx` | ⬜ |
| tax-invoice | 세금계산서 (탭: 즉시/월 일괄) | 12 전체 | sales-by-client(+detail), tax-invoice/issue-*(서버 501) | tax-invoice | 하 | `pages/accounting/tax-invoice/TaxInvoicePage.tsx` | ⬜ (기존도 발행 미구현) |
| delivery-statement | 거래명세표 | 13:4-206 | delivery-statement-rows, carryover, client-master | delivery-statement | 중 | `pages/accounting/delivery-statement/DeliveryStatementPage.tsx` | ⬜ |

### 화면 밖 페이지

| 대상 | 파일 | API | React 경로(제안) | 상태 |
|---|---|---|---|---|
| 로그인 | templates/login.html | POST /api/login | `pages/auth/LoginPage.tsx` | ✅ |
| TV 생산 / TV 물류 | tv_production.html / tv_logistics.html (색·API만 다른 복사본) | production/logistics-schedule?date, 3초 폴링 × 3일 | `pages/tv/TvBoardPage.tsx` 하나로 통합 + 전용 읽기 API | ⬜ |

**집계**: 메뉴 43개(숨김 포함) 가운데 ✅ 1(로그인) · 🟡 7(대시보드, 제품등록, 단가관리, 수주등록, 견적, 출하등록, 생산가능확인) · ⬜ 나머지.

## 4. 재현해야 할 공통 UI 요소 → React 공용 부품 후보

| 기존 | 위치 | 사용처 | React 공용 부품 제안 |
|---|---|---|---|
| `fmt` 수량(소수 2자리), `fmtPrice` 금액(소수 4자리), `fmtDash` | 01:8-28 | 거의 전체 | `shared/utils/format.ts` |
| `appAlert/Confirm/Prompt/PromptPassword/Prompt2` (Promise 반환) | 01:466-492 | 거의 전체 | `useDialog()` |
| `showSaveToast` (2.2초) | 01:700 | 25개 파일 | `toast()` |
| 모달 (ESC, 최대화, 크기 기억) | 01:517-628 | 약 70개 | `shared/components/Modal` (현재 `Dialog` 확장) |
| 표: 헤더 정렬(빈 값 항상 아래), 열 너비 조절 저장(`colw:`), 그룹 rowspan·줄무늬, 행 펼치기 | 01:204-430 | 18, 34, 36, 37, 38 등 | `shared/components/DataGrid` (또는 s-erp F1-Grid) |
| 자동완성 `attachCustomAutosuggest`(최대 30개, 힌트), 거래처 strict 모드 | 01:726-878 | 03, 06, 16, 19, 20, 39 | `<Autocomplete>`, `<ClientSelect strict>` |
| 다중 선택 칩 `makePicker` | 01:78 | 10, 33, 34 | `<MultiPicker>` |
| 파일 드롭 3종(`wireDropzone`, `attachFileDrop`, 직접 구현) | 04:18, 01:170, 18:182 | 제품·견적·레시피·입고·문서 | `useFileDrop` |
| 엑셀 다운로드 `downloadRowsAsExcel`(`prefix_YYYYMMDD.xlsx`) | 02:685 | 약 35곳 | `shared/utils/excel.ts` (SheetJS) |
| BOM 엑셀 파싱("품목" 헤더, 합계≈1인 열 자동 탐지) | 04:36-117 | 제품·견적·레시피·제품BOM | `shared/utils/bomExcel.ts` |
| BOM 행 편집기 2벌(`addBomRow`/`addRecipeBomRow`) + 원재료 매칭 모달 | 04:119-323 | 05, 06, 07, 09, 14 | `shared/components/BomEditor` (현재 제품등록 전용 → 공용화) |
| 인쇄: 새 창 `document.write` — 견적서, 레시피, 투입지시서, 완제품출고일지, 작업지시서(가로), 거래명세표(거래처별 페이지), 라벨(`@page` mm) | 05:88, 09:415, 20:523, 21:785·883, 13:108, 07:1325 | | `shared/print` (인쇄 전용 라우트 또는 iframe) |
| 라벨 렌더러 `buildLabelHTML` + `LABEL_CSS` (mm, 100×150 기본) | 07:95-370 | 15, 20, 25, 26, 27 | `shared/label-renderer` |
| 바코드 JsBarcode CODE128, 스캐너 입력 + Enter | 07:198, 15:38, 30:127 | | `<Barcode>` |
| 원재료명 서식 편집(contenteditable + execCommand, 허용 목록 sanitize) | 06:163-256, 07:137 | 라벨 | 소형 리치텍스트 + 서버 sanitize |
| Daum 우편번호 | 14:200 | 거래처BOM | ✅ `shared/utils/postcode.ts` — 부품 없이 공식 스크립트를 누를 때만 불러온다 |
| 공휴일 표시 | 22 | 대시보드 | 서버 공휴일 API(2028년 이후 대비) |

## 5. 폴링·타이머 (React에서 정리할 것)

| 대상 | 주기 | 기존 문제 | React 방침 |
|---|---|---|---|
| 메신저 방 목록 | 8초 | **권한과 무관하게 모든 사용자, 모든 화면**에서 동작 | 권한 있을 때만. 위젯과 하나의 쿼리 공유 |
| 메신저 위젯 배지 | 8초 | 위와 같은 API를 중복 호출 | 통합 |
| 열린 방 새 메시지 | 3초 | 채팅 화면을 떠나도 멈추지 않음 | 언마운트 시 정리(React Query `refetchInterval`) |
| 온도 그룹별 | 0/60/180/300/600초 | 화면을 안 열어도 `force=1`로 폴링, 캐시 무시 | 화면 활성일 때만, force 제거 |
| TV | 3초 × 3일 | 오류를 삼키고 "없음" 표시 | 오류 표시, 전용 API |

## 6. 기존 화면의 결함 — React 이관 때 고칠 것

| # | 결함 | 위치 | 이관 시 조치 |
|---|---|---|---|
| 1 | 권한과 무관하게 **모든 화면 데이터를 페이지 로드 때** 불러옴. 관리자 전용 `/api/server-settings` 호출로 일반 사용자는 로그인마다 403 알림 | 11:18, 12:71 외 다수 | 화면을 열 때만 조회(탭 마운트 시) |
| 2 | 403 응답을 배열로 가정해 TypeError | 08:12, 14:106, 13:345, 22:20 | 공용 apiClient에서 오류 형식 통일 |
| 3 | `fillEmptyDates`가 비어 있는 날짜를 모두 오늘로 채워 화면별 기본값(이달 1일, 다음 달 1일, 전체 기간)이 무시됨 | 28:661 | 화면별 기본값을 명시적 초기 상태로 |
| 4 | ESC 핸들러 두 개 → 모달이 두 개 닫힘 | 01:517, 04:344 | 모달 스택 관리 |
| 5 | 응답 확인 누락: 생산확정 저장, 출하확정 결과 등을 `res.ok` 없이 성공 처리 | 20:329, 21:685 외 | apiClient가 실패 시 예외 |
| 6 | `toISOString().slice(0,10)` UTC 날짜 버그(한국 새벽·월초 하루 밀림) | 19:201, 03:422, 06:27 | 로컬 날짜 유틸 하나로 |
| 7 | 새로고침 불일치(단가관리는 요약만, 기초정보는 제품BOM만 갱신) | 03:556, 03:563 | 화면별 refetch |
| 8 | 서비스워커 scope가 `/static/`이라 앱을 제어하지 못함(PWA 목적 미달성) | static/service-worker.js | 필요성 재검토 |
| 9 | **XSS**: 서버 데이터를 `innerHTML`로 삽입 — 공용 메모, 채팅 방 이름·파일명·보낸 사람, 문서함 폴더명·파일명·공유 메모, 레시피명, 입고 첨부 파일명, 속성 주입 `data-lot='${JSON}'` | 22:53, 02:24·65, 28:104 외 | React 기본 이스케이프. 라벨 리치텍스트·인쇄 HTML은 별도 sanitize |
| 10 | 공급자 사업자번호·대표명·주소가 견적서·거래명세표·출고일지에 하드코딩 | 05:166, 13:148, 21:876 | 회사정보 설정값으로 |
| 11 | 단가관리 검색이 키 입력마다 서버 조회 | 03:397 | 디바운스 |
| 12 | "오늘 날짜" 함수 7종, BOM 편집기 2벌, 재고금액 모달 2벌, 채팅 전체화면·위젯 2벌, TV 2벌 | 여러 곳 | 공용 부품 하나로 |

## 7. 권장 이관 순서 (화면 관점)

1. **공용 기반**: apiClient(401/403/5xx), useDialog·toast, Modal, DataGrid(정렬·열 크기), Autocomplete·ClientSelect, MultiPicker, 엑셀 유틸, 권한 훅(탭 단위 포함), `/api/me` 확장
2. **조회 위주 하·중하 화면**: 생산스케줄, 물류스케줄, 생산현황, 출하현황, 판매현황, 입·출금관리, 제품재고관리 → apiClient·DataGrid·엑셀 검증에 좋음
3. **기준정보 흐름**: 거래처BOM → 원재료BOM → 제품BOM·제품등록 → 단가관리 → 견적(확정 트랜잭션)
4. **영업·구매**: 수주 → 발주 → 입고(첨부 포함) → 수불대장·재고현황
5. **생산·물류**: 생산확정 → 생산입고 → 치환 → 출하등록(로트배분) → 출하확정 → 재고조정
6. **인쇄 인프라 + 라벨 렌더러** → 라벨출력 → 라벨등록(양식 편집기 포함)
7. **판매·회계**: 판매 3종 → 매출·매입 → 거래처대장 → 거래명세표(이월) → 기초회계·전표
8. **주변 업무**: 레시피 3종, 문서함, 인사·연차, 메신저, 온도, AI, TV

각 단계는 **화면 + Spring API + 서버 권한 + 테스트**를 한 묶음으로 완료한다. 순서 근거와 백엔드 작업은 [07. 진행 현황과 로드맵](07-migration-status.md)에 있다.
