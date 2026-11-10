-- 20261109_001_create_qdoc_survey.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 품질 서류 표(qdoc_form · qdoc_version · qdoc_item · qdoc_record · qdoc_answer)를 만들고
--       HACCP(선행) 기본 양식 '협력업체 자체 위생점검 평가표'(질문 91개)를 넣는다
--       (2026-11-09 요청 "2단계" — HACCP(선행) 점검표 열기 · 임시저장 · 현황, 결재는 방식 미정이라 뺀다)
--   - 송연 schema.py 의 qdoc_* 표를 이름 · 칸 그대로 옮긴다(송연에서 옮겨 온 products · clients 와 같이 원본 이름).
--     제품검사 성적서(기록형)도 같은 표를 쓰므로 기록형 칸(spec_min · spec_max · snapshot_json 등)도 둔다.
--   - 원본과 다른 점: 사람 칸(created_by · written_by · approved_by)은 사번(varchar(20), employees.id. 20261103_003),
--     시각 칸은 timestamp, 날짜(doc_date)는 원본처럼 'YYYY-MM-DD' 글.
--   - 결재란(qdoc_sign) · 고친 이력(qdoc_change_log)은 결재 방식이 정해지면 따로 만든다.
--   - 기본 양식은 송연 qsurvey_seed.py 그대로(외부감사 · 거래처마다 · 연1회 · 1판, 보기 적합 O 2 · 미흡 △ 1 · 부적합 X 0 · 해당없음 N/A 2).
--     같은 이름 양식이 이미 있으면 넣지 않는다(고쳐 쓰고 있을 수 있다).
-- 다시 돌려도 결과가 같다(IF NOT EXISTS · 이름 검사).

BEGIN;

-- 서류 한 종류(양식)
CREATE TABLE IF NOT EXISTS public.qdoc_form (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT '일반',
    kind TEXT DEFAULT '기록형',
    bind_type TEXT,
    food_type TEXT,
    needs_approval INTEGER DEFAULT 1,
    active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(20),
    cycle TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_qdoc_form_name_type ON public.qdoc_form (name, COALESCE(food_type, ''));
COMMENT ON TABLE public.qdoc_form IS '품질 서류 양식(송연 qdoc_form). 설문형 = HACCP(선행) 점검표, 기록형 = 제품규격성적서';
COMMENT ON COLUMN public.qdoc_form.category IS '분류: 외부감사 / 내부감사 / 일반';
COMMENT ON COLUMN public.qdoc_form.kind IS '기록형 / 설문형';
COMMENT ON COLUMN public.qdoc_form.bind_type IS '한 장이 붙는 것: NULL(날짜마다) / client(거래처마다, clients.id) / lot(생산로트, production_schedule.id)';
COMMENT ON COLUMN public.qdoc_form.food_type IS '이 식품유형일 때 쓰는 양식(기록형). 비면 유형을 안 가림';
COMMENT ON COLUMN public.qdoc_form.active IS '1 쓰는 중 / 0 목록에서 내림(쓴 장은 남는다)';
COMMENT ON COLUMN public.qdoc_form.created_by IS '만든 사람 사번(employees.id). 기본 양식은 NULL';
COMMENT ON COLUMN public.qdoc_form.cycle IS '기간: 매일 / 주1회 / 월1회 / 분기1회 / 반기1회 / 연1회 / 수시. 수시 말고는 한 기간에 한 장';

-- 양식의 판. 쓴 장이 있는 판을 고치면 새 판을 뜬다(지난 장은 그때 질문 그대로)
CREATE TABLE IF NOT EXISTS public.qdoc_version (
    id SERIAL PRIMARY KEY,
    form_id INTEGER NOT NULL REFERENCES public.qdoc_form (id),
    label TEXT,
    memo TEXT,
    is_current INTEGER DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(20),
    survey_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_qdoc_version_form ON public.qdoc_version (form_id, is_current);
COMMENT ON TABLE public.qdoc_version IS '양식의 판(송연 qdoc_version). 현재 판(is_current=1)은 하나';
COMMENT ON COLUMN public.qdoc_version.survey_json IS '설문형 보기 · 점수 · 칸: {"choices":[{"label","mark","score"}],"has_note":0/1,"has_defect":0/1}';

-- 판에 달린 줄(묶음 · 질문 · 기록형 항목)
CREATE TABLE IF NOT EXISTS public.qdoc_item (
    id SERIAL PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES public.qdoc_version (id),
    parent_id INTEGER REFERENCES public.qdoc_item (id),
    sort_order INTEGER DEFAULT 0,
    row_kind TEXT DEFAULT 'single',
    label TEXT,
    answer_type TEXT DEFAULT 'text',
    unit TEXT,
    spec_text TEXT,
    spec_min DOUBLE PRECISION,
    spec_max DOUBLE PRECISION,
    method TEXT,
    options_json TEXT,
    required INTEGER DEFAULT 1,
    auto_from TEXT,
    has_note INTEGER DEFAULT 0,
    has_defect INTEGER DEFAULT 0,
    score_json TEXT,
    topic TEXT
);
CREATE INDEX IF NOT EXISTS idx_qdoc_item_version ON public.qdoc_item (version_id, sort_order);
COMMENT ON TABLE public.qdoc_item IS '판에 달린 줄(송연 qdoc_item). parent_id 로 묶음 > 작은 묶음 > 질문';
COMMENT ON COLUMN public.qdoc_item.row_kind IS 'group(묶음 제목) / single(질문 · 항목 한 줄) / note(안내문)';
COMMENT ON COLUMN public.qdoc_item.topic IS '설문형 관리항목(엑셀 B열). 묶음이 아니라 줄에 붙는 이름';
COMMENT ON COLUMN public.qdoc_item.required IS '1 꼭 답해야 함 / 0 비워도 됨';

-- 쓴 서류 한 장
CREATE TABLE IF NOT EXISTS public.qdoc_record (
    id SERIAL PRIMARY KEY,
    form_id INTEGER NOT NULL REFERENCES public.qdoc_form (id),
    version_id INTEGER NOT NULL REFERENCES public.qdoc_version (id),
    bind_type TEXT,
    bind_id INTEGER,
    doc_date TEXT,
    status TEXT DEFAULT '작성중',
    verdict TEXT,
    score INTEGER,
    score_max INTEGER,
    issued_at TIMESTAMP,
    snapshot_json TEXT,
    written_by VARCHAR(20) REFERENCES public.employees (id),
    written_at TIMESTAMP,
    approved_by VARCHAR(20) REFERENCES public.employees (id),
    approved_at TIMESTAMP,
    reject_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_qdoc_record_form ON public.qdoc_record (form_id, doc_date);
CREATE INDEX IF NOT EXISTS idx_qdoc_record_bind ON public.qdoc_record (bind_type, bind_id);
COMMENT ON TABLE public.qdoc_record IS '쓴 서류 한 장(송연 qdoc_record). 쓸 때의 판(version_id)을 붙든다';
COMMENT ON COLUMN public.qdoc_record.bind_id IS 'bind_type 이 client 면 clients.id, lot 이면 production_schedule.id';
COMMENT ON COLUMN public.qdoc_record.doc_date IS '점검일 · 검사일(YYYY-MM-DD)';
COMMENT ON COLUMN public.qdoc_record.status IS '작성중 / 검토대기 / 승인 / 반려';
COMMENT ON COLUMN public.qdoc_record.score IS '설문형 점수(서버가 셈): 고른 보기 점수 합';
COMMENT ON COLUMN public.qdoc_record.score_max IS '설문형 만점: 답한 질문 수 × 최고 점수';
COMMENT ON COLUMN public.qdoc_record.written_by IS '마지막으로 저장한 사람 사번(employees.id)';
COMMENT ON COLUMN public.qdoc_record.approved_by IS '결재를 끝낸 사람 사번(employees.id)';

-- 답 한 칸
CREATE TABLE IF NOT EXISTS public.qdoc_answer (
    id SERIAL PRIMARY KEY,
    record_id INTEGER NOT NULL REFERENCES public.qdoc_record (id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES public.qdoc_item (id),
    value_text TEXT,
    value_num DOUBLE PRECISION,
    note TEXT,
    defect TEXT,
    judged TEXT,
    readings_json TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_qdoc_answer_one ON public.qdoc_answer (record_id, item_id);
COMMENT ON TABLE public.qdoc_answer IS '답 한 칸(송연 qdoc_answer)';
COMMENT ON COLUMN public.qdoc_answer.value_text IS '설문형: 고른 보기 이름(예: 적합)';
COMMENT ON COLUMN public.qdoc_answer.note IS '세부내역(비고)';
COMMENT ON COLUMN public.qdoc_answer.defect IS '부적합내역';

-- 기본 양식: 협력업체 자체 위생점검 평가표(송연 qsurvey_seed.py, 묶음 10 · 질문 91)
DO $$
DECLARE
    v_form INTEGER;
    v_version INTEGER;
    v_g1 INTEGER;
    v_g2 INTEGER;
    v_here INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM public.qdoc_form WHERE name = '협력업체 자체 위생점검 평가표') THEN
        RETURN;
    END IF;
    INSERT INTO public.qdoc_form (name, category, kind, bind_type, food_type, needs_approval, active, sort_order, created_by, cycle)
    VALUES ('협력업체 자체 위생점검 평가표', '외부감사', '설문형', 'client', NULL, 1, 1, 0, NULL, '연1회')
    RETURNING id INTO v_form;
    INSERT INTO public.qdoc_version (form_id, label, memo, is_current, created_by, survey_json)
    VALUES (v_form, '1판', '쓰시던 엑셀 평가표를 그대로 옮긴 첫 판', 1, NULL, '{"choices": [{"label": "적합", "mark": "O", "score": 2}, {"label": "미흡", "mark": "△", "score": 1}, {"label": "부적합", "mark": "X", "score": 0}, {"label": "해당없음", "mark": "N/A", "score": 2}], "has_note": 1, "has_defect": 1}')
    RETURNING id INTO v_version;
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label) VALUES (v_version, NULL, 1, 'group', '1. 법적 요건 점검') RETURNING id INTO v_g1;
    v_g2 := NULL;
    v_here := v_g1;
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 2, 'single', '1년에 1회 이상 건강검진을 실시하는가?', 'choice', '건강검진', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 3, 'single', '자가품질검사는 유형별로 이루어지고 있는가?', 'choice', '자가품질검사', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 4, 'single', '자가품질검사의 기록을 유지하고 있는가?', 'choice', '자가품질검사', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 5, 'single', '영업의 신고(허가)사항은 적합한가?', 'choice', '영업신고', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 6, 'single', '품목제조보고는 적절한가?', 'choice', '품목제조보고', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 7, 'single', '출입ᆞ검사 등의 기록부를 비치하고 2년 이상 보관하고 있는가?', 'choice', '출입기록부', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 8, 'single', '행정처분 및 행정지기관련 서류에 대하여 잘 비치하고 이행 결과는 지체 없이 보고하였는가?', 'choice', '행정처분', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 9, 'single', '법적 교육은 적합한가? (위생교육(영업자), 종업원, HACCP교육 등)', 'choice', '교육', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 10, 'single', '제품의 표시기준에 대하여 누락하거나 오류는 없는가?', 'choice', '표시', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 11, 'single', '제품의 알러지 표시는 적합한가?', 'choice', '표시', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 12, 'single', '유전자 재조합표시관련 원료 관리는 실시되고 있는가?', 'choice', '원료관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 13, 'single', '원료의 원산지 관리는 적절한가?', 'choice', '원료관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 14, 'single', '생산실적은 보고되고 있으며, 보고서류는 보관하고 있는가?', 'choice', '생산실적보고', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 15, 'single', '생산 및 작업기록 서류를 작성하고 보관하고 있는가?', 'choice', '생산일보', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 16, 'single', '원료수불대장을 작성하고 보관하고 있는가?', 'choice', '생산일보', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 17, 'single', '무게, 용량, 개수 등이 표시된 양과 실제량과 부족량의 허용오차는 적합한가?', 'choice', '허용오차', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 18, 'single', '제조일자(소비기한) 누락, 지워짐, 변조 등 가능성은 없는가?', 'choice', '소비기한', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 19, 'single', '소비기한이 초과한 원료 또는 제품을 보관하고 있지 않는가?', 'choice', '소비기한', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 20, 'single', '표시대상인 식품에 대하여, 표시되지 않은 원료나 제품을 보관하고 있지 않는가?', 'choice', '보관', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 21, 'single', '물을 식품의 원료(배합수)로 사용하는 때에는 먹는물관리법에 의한 수질검사를 정기적으로 실시하고 있는가?', 'choice', '수질검사', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 22, 'single', '부적합 판정한 물을 계속 사용하고 있는가?', 'choice', '수질검사', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 23, 'single', '위해식품 등의 회수 계획을 보고하지 아니하거나 허위로 보고하지는 않았는가?', 'choice', '회수', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label) VALUES (v_version, NULL, 24, 'group', '2. 실행성(현장) 점검') RETURNING id INTO v_g1;
    v_g2 := NULL;
    v_here := v_g1;
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label) VALUES (v_version, v_g1, 25, 'group', '1 영업장 관리') RETURNING id INTO v_g2;
    v_here := v_g2;
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 26, 'single', '1. 건물은 축산 폐수, 화학물질 등 오염물질 발생시설로부터 떨어진 곳에 위치하는가?', 'choice', '1.1 영업장 외부 환경', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 27, 'single', '2. 공장 외부에 보관할 필요가 있는 경우, 품목(보관품)이 오염되거나 품질 저하되지 않도록 관리하고 있는가?', 'choice', '1.1 영업장 외부 환경', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 28, 'single', '1. 작업장은 누수, 외부의 오염물질이나 해충, 설치류 등의 유입을 차단할 수 있는 밀폐 가능한 구조인가?', 'choice', '1.2 작업장', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 29, 'single', '2. 작업장은 청결구역과 일반구역으로 구분하고, 구역간의 교차오염을 방지하기 위하여 분리, 구획 또는 구분되어 있는가?', 'choice', '1.2 작업장', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 30, 'single', '1. 작업장의 바닥, 벽, 천장은 내수성이며, 파여있거나 갈라진 틈이 없는가?', 'choice', '1.3 바닥, 벽, 천장', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 31, 'single', '2. 바닥은 마른상태를 유지하고 물 흐름에 적합한가?', 'choice', '1.3 바닥, 벽, 천장', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 32, 'single', '3. 천장은 응결수가 발생되지 않는가?', 'choice', '1.3 바닥, 벽, 천장', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 33, 'single', '1. 배수로, 배수구, 배수관은 배수가 용이하고 퇴적물이 쌓이지 아니하는가?', 'choice', '1.4 배수, 배관', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 34, 'single', '2. 배수구, 배수관은 역류가 되지 않는가?', 'choice', '1.4 배수, 배관', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 35, 'single', '1. 출입문은 내수성, 내부식성으로 밀폐 가능한가?', 'choice', '1.5 출입구, 창', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 36, 'single', '2. 작업장 출입구에 구역별 복장 착용 방법이 게시되어 있는가?', 'choice', '1.5 출입구, 창', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 37, 'single', '3. 작업장 출입구에 손 세척, 건조, 소독 설비가 구비되어 있으며, 세척소독 방법이 게시되어 있는가?', 'choice', '1.5 출입구, 창', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 38, 'single', '4. 작업장 내부 통로에 이동경로가 표시되어 있고, 물건이 적재되어 있지 않는가?', 'choice', '1.5 출입구, 창', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 39, 'single', '5. 창의 유리는 파손 시 유리조각이 작업장 내로 흩어지거나 원부자재 등으로 혼입을 방지할 수 있게 되어 있는가?', 'choice', '1.5 출입구, 창', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 40, 'single', '1. 채광 및 조명은 작업특성에 적합한 조도를 유지하는가? (선별 및 검사구역 : 540Lux 이상)', 'choice', '1.6 조명', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 41, 'single', '1. 탈의실, 화장실은 별도의 환기시설이 갖추어져 있는가?', 'choice', '1.7 탈의실/화장실', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 42, 'single', '2. 화장실 출입구에 손 세척, 건조, 소독 설비가 구비되어 있는가?', 'choice', '1.7 탈의실/화장실', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 43, 'single', '3. 탈의실은 외출복과 위생복(신발 포함) 간의 교차 오염이 발생하지 않도록 구분, 보관되어 있는가?', 'choice', '1.7 탈의실/화장실', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label) VALUES (v_version, v_g1, 44, 'group', '2 위생관리') RETURNING id INTO v_g2;
    v_here := v_g2;
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 45, 'single', '1. 원부자재 입고~완제품 출고까지 종업원의 이동동선이 설정되고 준수되고 있는가?', 'choice', '2.1 동선 계획 및 공정간 오염방지', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 46, 'single', '2. 청결구역과 일반구역별로 각각 출입 복장, 세척소독 기준 등을 포함하는 위생수칙이 수립되어 있는가?', 'choice', '2.1 동선 계획 및 공정간 오염방지', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 47, 'single', '1. 작업장은 공정별로 특성에 따라 적정한 온도 및 습도가 유지되는가?', 'choice', '2.2 공조/환기관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 48, 'single', '2. 작업장에 온도 및 습도를 확인할 수 있는 온/습도계가 설치되고 기록 관리되는가?', 'choice', '2.2 공조/환기관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 49, 'single', '3. 작업장 내에서 발생하는 악취나 이취, 유해가스, 매연, 증기 등을 배출하는데 충분한 환기시설을 갖추고 있는가?', 'choice', '2.2 공조/환기관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 50, 'single', '1. 외부로 개방된 흡.배기구에 여과망이나 방충망 등이 부착되어 있는가?', 'choice', '2.3 해충 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 51, 'single', '2. 작업장 내에서 해충이나 설치류 등의 구제를 실시할 경우에는 정해진 위생수칙에 따라 공정이나 식품의 안전성에 영향을 주지 아니하는 범위 내에서 적절한 보호 조치를 취한 후 실시하며, 작업 종료 후 충분한 세척이 이루어지는가?', 'choice', '2.3 해충 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 52, 'single', '1. X-ray검출기 및 금속검출기 등 이물검출기 장비를 구비하고, 이에 따른 관리기준을 수립하고 운영하는가? (이물검출장비 기록 要)', 'choice', '2.4 이물 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 53, 'single', '1. 작업장의 종업원은 위생복, 위생모, 위생화 등을 항시 착용하는가?', 'choice', '2.5 개인위생 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 54, 'single', '2. 작업장의 종업원은 개인용 장신구를 착용하거나, 개인 물품을 반입하지 않는가?', 'choice', '2.5 개인위생 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 55, 'single', '1. 영업장에는 기계/설비, 기구/용기 등을 세척하거나 소독할 수 있는 시설이나 장비가 필요한 장소에 충분히 갖추어져 있는가?', 'choice', '2.6 세척 및 소독', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 56, 'single', '2. 세척제 및 소독제는 구분 보관되어 있는가?', 'choice', '2.6 세척 및 소독', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 57, 'single', '3. 정해진 관리계획에 따라 세척 또는 소독이 실시되는가?', 'choice', '2.6 세척 및 소독', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label) VALUES (v_version, v_g1, 58, 'group', '3 제조시설 및 설비 관리') RETURNING id INTO v_g2;
    v_here := v_g2;
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 59, 'single', '1. 식품취급시설은 공정간 또는 취급시설간 오염이 발생되지 않도록 배치되어 있으며, 공업용 윤활유나 물리적 위해요인에 의해 오염이 발생되지 않는가?', 'choice', '3.1 제조시설 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 60, 'single', '2. 식품과 접촉하는 취급시설은 인체에 무해한 내수성, 내부식성 재질로 세척이 쉽고 청소가 용이한가?', 'choice', '3.1 제조시설 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 61, 'single', '3. 기구 및 용기는 용도별로 구분하여 사용하는가?', 'choice', '3.1 제조시설 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 62, 'single', '1. 냉장, 냉동, 냉각시설의 온도변화를 일정한 주기로 측정하고 기록을 유지하는가?', 'choice', '3.2 냉장, 냉동설비 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 63, 'single', '2. 냉장시설은 내부의 온도를 10℃ 이하(신선편의식품, 훈제연어, 가금육 등 5℃ 이하 등 별도 온도관리기준이 있는 경우는 그에 따름), 냉동시설은 -18℃ 이하로 유지하고 외부에서 온도변화를 관찰할 수 있는가?', 'choice', '3.2 냉장, 냉동설비 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label) VALUES (v_version, v_g1, 64, 'group', '4 용수 관리') RETURNING id INTO v_g2;
    v_here := v_g2;
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 65, 'single', '1. 지하수 등의 취수원은 폐수처리장이나 화장실 등의 오염 우려 장소에서 20m 이상 떨어진 곳에 위치하는가?', 'choice', '4.1 용수시설 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 66, 'single', '2. 용수저장탱크는 인체에 유해하지 않은 재질로 되어 있으며, 외부로부터 오염물질 유입을 방지하는 잠금장치가 되어 있는가?', 'choice', '4.1 용수시설 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 67, 'single', '1. 먹는물 수질기준 전 항목에 대하여 연1회 이상 검사를 실시하며, 미생물학적 항목에 대한 검사는 월1회 이상 실시하는가? (검사일 기재 要)', 'choice', '4.2 용수운용 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 68, 'single', '2. 용수저장탱크는 반기별 1회 이상 청소와 소독을 실시하는가?', 'choice', '4.2 용수운용 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label) VALUES (v_version, v_g1, 69, 'group', '5 보관·운송 관리') RETURNING id INTO v_g2;
    v_here := v_g2;
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 70, 'single', '1. 입고기준 및 규격에 적합한 원부자재만 구입하는가?', 'choice', '5.1 구매 및 입고 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 71, 'single', '2. 입고되는 원부자재를 보관할 적절한 창고가 있으며, 식별표시가 이루어지는가?', 'choice', '5.1 구매 및 입고 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 72, 'single', '1. 협력업체를 평가하고 그 결과를 보유하고 있는가?', 'choice', '5.2 협력업체 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 73, 'single', '1. 운송차량은 냉장의 경우 10℃ 이하(가금육-2~5℃ 등은 별도 온도관리기준 준수), 냉동의 경우 -18℃ 이하를 유지하고, 외부에서 온도별화를 확인할 수 있는 온도기록장치가 부착되어 있는가?', 'choice', '5.3 운송관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 74, 'single', '1. 원료 및 완제품은 선입선출 되는가?', 'choice', '5.4 보관', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 75, 'single', '2. 원부자재 및 완제품은 바닥이나 벽으로부터 이격되어 있는가?', 'choice', '5.4 보관', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 76, 'single', '3. 부적합한 원부자재 및 완제품은 별도의 지정된 장소에서 보관하고 명확히 식별되는 표식이 되어 있는가?', 'choice', '5.4 보관', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 77, 'single', '4. 유독성 물질, 인화성 물질 및 비식용 화학물질은 식품 취급 구역으로부터 격리된 장소에서 보관되는가?', 'choice', '5.4 보관', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label) VALUES (v_version, v_g1, 78, 'group', '6 검사 관리') RETURNING id INTO v_g2;
    v_here := v_g2;
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 79, 'single', '1-1. 자가품질검사는 자체 실험실에서 실시하며, 검사에 필요한 장비를 충분히 갖추고 있는가?', 'choice', '6.1 자가품질검사', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 80, 'single', '1-2. 자가품질검사는 외부검사기관과의 협약에 의하여 실시하는가?', 'choice', '6.1 자가품질검사', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 81, 'single', '2. 검사결과는 기록 유지되는가?', 'choice', '6.1 자가품질검사', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 82, 'single', '1. 냉장, 냉동 및 가열처리 시설 등의 온도측정 장치는 연 1회 이상 검교정 하는가?', 'choice', '6.2 검교정 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 83, 'single', '2. 검사용 장비 및 기구는 정기적으로 교정을 실시하고, 그 결과를 기록하고 있는가?', 'choice', '6.2 검교정 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 84, 'single', '1. 시약이나 배지 등은 신뢰성을 확보할 수 있도록 유지, 관리되는가?', 'choice', '6.3 검사', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 85, 'single', '2. 작업장의 청정도 유지를 위하여 공중낙하세균 등을 측정, 관리하는가?', 'choice', '6.3 검사', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label) VALUES (v_version, v_g1, 86, 'group', '7 회수 관리') RETURNING id INTO v_g2;
    v_here := v_g2;
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 87, 'single', '1. 고객불만사항을 처리하는 적절한 절차가 있는가?', 'choice', '7.1 부적합 제품 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 88, 'single', '2. 고객불만사항에 대하여 시정조치를 실시하고 재발방지 하였는가?', 'choice', '7.1 부적합 제품 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 89, 'single', '3. 반품 및 불량품은 처리전까지 별도 장소에 보관되며, 처리결과를 기록유지 하는가?', 'choice', '7.1 부적합 제품 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 90, 'single', '1. 완제품에서 원재료까지 추적성 확인이 가능한가?', 'choice', '7.2 회수 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 91, 'single', '2. 연 1회 이상 모의회수를 실시하는가?', 'choice', '7.2 회수 관리', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label) VALUES (v_version, v_g1, 92, 'group', '8 HACCP 시스템 (HACCP 적용업체에 한함)') RETURNING id INTO v_g2;
    v_here := v_g2;
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 93, 'single', '1. HACCP팀을 구성하고 팀원별 인수인계 방법이 수립되어 있는가?', 'choice', '8.1 HACCP시스템', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 94, 'single', '2. 제품설명서를 작성하여 관리하는가?', 'choice', '8.1 HACCP시스템', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 95, 'single', '3. 제품의 제조공정도를 작성하여 관리하는가?', 'choice', '8.1 HACCP시스템', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 96, 'single', '4. CCP 공정이 도출되어 있는가? (CCP공정 기록 要)', 'choice', '8.1 HACCP시스템', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 97, 'single', '5. CCP 모니터링이 주기에 맞게 실시되는가?', 'choice', '8.1 HACCP시스템', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 98, 'single', '1. 내부 검증이 실시되었는가? (검증결과 기록 要)', 'choice', '8.2 검증', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 99, 'single', '2. 검증결과, 부적합사항에 대한 개선조치 등 사후관리가 수행되었는가?', 'choice', '8.2 검증', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 100, 'single', '1. HACCP팀장은 HACCP 정기교육을 이수하였는가?', 'choice', '8.3 교육', 1, 1, 1);
    INSERT INTO public.qdoc_item (version_id, parent_id, sort_order, row_kind, label, answer_type, topic, required, has_note, has_defect) VALUES (v_version, v_here, 101, 'single', '2. HACCP팀원은 HACCP 교육을 이수하였는가?', 'choice', '8.3 교육', 1, 1, 1);
END $$;

COMMIT;
