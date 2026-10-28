-- 20261002_003_update_songyeon_menu_description.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 송연 메뉴 설명(menu_dc)을 송연 화면 설명 문구로 바꾼다.
--   20261002_002 에서 임시로 넣은 '송연 화면코드 …' 대신, 송연 변환본 shared/config/screenMeta.ts(기존 pricing.html 제목 옆 문구)를 그대로 쓴다.
--   S_ERP 화면 제목줄 아래 설명으로 보인다. 문구가 없는 메뉴는 그대로 둔다(SONGYEON 테넌트의 송연 모듈 메뉴만).
-- 선행: 20261002_002_seed_songyeon_menu.sql

BEGIN;

UPDATE tb_menu m
SET menu_dc = x.menu_dc,
    updated_at = now()
FROM (VALUES
  ('dashboard', '환영합니다'),
  ('chat', '사내 직원들과 1:1 또는 단체로 대화할 수 있어요'),
  ('product', '제품 기본정보 + 원재료 배합비(BOM)'),
  ('settings', '포장유형별 고정값, 확정 제품의 배합비(BOM) 관리'),
  ('hr', '근무하는 사람의 인사정보와, 프로그램에 들어올 아이디·권한을 나눠서 봐요'),
  ('stock', '재고를 엑셀로 일괄 반영하고, 완포장을 계량실로 옮길 때 바코드를 찍어요'),
  ('purchase', '전일재고 · 날짜별 생산 사용량 · 발주량 · 입고 · 남은재고'),
  ('po', '원재료 발주를 등록하고, 기간별 발주현황을 확인해요'),
  ('mat-sub', '그날 생산할 건의 원재료를 이번 한 번만 다른 것으로 바꿔 써요. 제품BOM은 바뀌지 않아요'),
  ('recv', '원재료 입고 등록, 기간별 입고현황, 거래명세서 같은 서류 보관, 반품 등록을 해요'),
  ('stock-status', '날짜를 정하면 그 날 기준 재고 · 품목을 누르면 입고 로트별 내역'),
  ('documents', '부서 폴더를 만들고, 그 아래 하위폴더를 얼마든지 만들어 문서를 올려둘 수 있어요'),
  ('quote', '확정 전 가견적 — 확정하면 제품등록·단가관리에 자동 반영돼요'),
  ('order', '주문 내용을 등록/저장해요 (생산으로 반영하려면 생산확정에서 가져와야 해요)'),
  ('prod-confirm', '수주등록된 건을 가져와서 실제 생산으로 확정해요 (확정해야 TV 화면 등에 반영돼요)'),
  ('production', '날짜별 생산 일정 조회 (등록/수정은 수주등록 메뉴에서 해주세요)'),
  ('actual', '생산스케줄에서 확정된 품목의 실제 생산량을 등록해요 (등록하면 물류스케줄 수량도 함께 바뀌어요)'),
  ('prod-status', '생산입고(실생산량 등록) 기록을 날짜범위로 조회해요'),
  ('label-print', '날짜를 선택하면 그날 생산확정된 품목이 나와요. 라벨정보는 기초정보 > 제품BOM에서 미리 입력해두시면 돼요.'),
  ('label-register', '제품에 붙일 표시사항을 등록합니다. 라벨은 한 제품에 한 장이며, 고쳐도 이전 내용이 버전으로 남습니다.'),
  ('product-stock', '완제품 현재고와 생산예정(생산입고 처리 전 계획수량) 조회'),
  ('logistics', '날짜별 출고 일정 조회 (등록/수정은 출하등록 메뉴에서 해주세요)'),
  ('shipment', '물류스케줄에 실제 출하량을 등록해요 (등록하면 물류스케줄에 자동 반영돼요)'),
  ('ship-confirm', '출하등록된 건에 배차와 포장방법을 입력해서 확정해요'),
  ('ship-status', '출하확정된 기록을 날짜범위로 조회해요'),
  ('recipe-write', '업체별 폴더로 개발중인 레시피를 관리해요 — 상품개발관리에는 항상 전체 자료가 남아있어요'),
  ('recipe-log', '레시피 검색·공유에서 넘긴 기록입니다.'),
  ('recipe-shared', '나에게 공유된 레시피만 보입니다. 공유해준 사람이 정한 버전과 기간 안에서만 볼 수 있어요.'),
  ('prod-check', '만들 제품과 수량을 적으면 그 날짜 원재료 재고로 되는지 봐요. 재고는 바뀌지 않아요'),
  ('sales-register', '출하확정된 것을 끌어와 판매로 남겨요. 출하 없이 판 것은 직접 적어요'),
  ('sales-status', '등록한 판매를 기간·거래처·품목으로 찾아봐요'),
  ('sales-total', '들어온 것(생산입고)과 나간 것(판매)을 한 표에 다 펴놓고 봐요. 표 머리를 누르면 정렬돼요'),
  ('acc-tx', '매일 들어오고 나간 돈을 적고, 지난 것을 찾아 고쳐요'),
  ('acc-in-report', '기간 안에 들어온 돈을 계정과목별·거래처별로 묶어서 봐요'),
  ('acc-basic', '계정과목·계좌·카드를 미리 적어두면 입금·출금을 적을 때 골라 쓸 수 있어요'),
  ('acc-receivable', '거래처를 골라 받을 돈과 줄 돈을 봐요. 줄을 누르면 무엇 때문에 그 금액인지 펼쳐져요'),
  ('ai-chat', '수요예측·재고경고와 AI 챗봇을 한 화면에서 확인하고 물어볼 수 있어요'),
  ('temp-monitor', '라디오노드(타파쿨로365) 온도센서 값을 실시간으로 가져와요'),
  ('tax-invoice', '거래처 요청이 오면 즉시 발행하거나, 월단위로 한번에 일괄발행할 수 있어요'),
  ('delivery-statement', '출하등록된 건은 확정 여부와 상관없이 자동으로 조회돼요. 거래처와 기간을 선택해서 출력하세요.')
) AS x(menu_code, menu_dc),
     tb_tenant t,
     tb_module md
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND md.module_id = m.module_id
  AND md.module_code IN ('DASH', 'COMM', 'SA', 'CM', 'PD', 'LG', 'SL', 'PU', 'QM', 'RD', 'HA')
  AND m.menu_code = x.menu_code;

-- 송연 문구가 없는 메뉴(단가관리 — 송연은 서버 값으로 채움)에 남은 임시 문구는 비운다
UPDATE tb_menu m
SET menu_dc = NULL,
    updated_at = now()
FROM tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.menu_dc LIKE '송연 화면코드%';

COMMIT;
