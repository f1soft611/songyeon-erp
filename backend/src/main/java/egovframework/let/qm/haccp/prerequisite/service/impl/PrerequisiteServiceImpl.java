package egovframework.let.qm.haccp.prerequisite.service.impl;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;

import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyAnswerInputVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyAnswerVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyChoiceVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyClientVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyFormRowVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyItemVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyMissingRowVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyMissingVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyRecordVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveySaveRequestVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveySaveResultVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveySheetVO;
import egovframework.let.qm.haccp.prerequisite.domain.repository.PrerequisiteDAO;
import egovframework.let.qm.haccp.prerequisite.service.PrerequisiteService;
import egovframework.let.qm.haccp.prerequisite.service.SurveyConfig;
import egovframework.let.qm.haccp.prerequisite.service.SurveyItems;
import egovframework.let.qm.haccp.prerequisite.service.SurveyPeriod;
import egovframework.let.qm.haccp.prerequisite.service.SurveyRecordConflictException;

/**
 * 품질관리 - HACCP(선행) 서비스 구현 클래스 (송연 qsurvey.py pick_forms · blank_record · save_record · list_records · get_record · missing).
 * - 점수는 서버가 센다(화면을 고쳐 보내면 0점짜리가 만점이 된다). 만점은 '답한 것' 으로 센다 — 반쯤 쓴 장이 91/182 로 보이면 반이 부적합인 것처럼 읽힌다
 * - 한 기간에 한 장(거래처마다면 업체마다). 같은 기간 다른 날 장이 있으면 새로 만들지도, 날짜를 옮기지도 않는다
 * - 2026-11-09 결재는 방식이 정해지지 않아 임시저장(작성중)만 한다
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Service("prerequisiteService")
public class PrerequisiteServiceImpl extends EgovAbstractServiceImpl implements PrerequisiteService {

    private static final String CLIENT = "client";
    private static final String DRAFT = "작성중";

    private final PrerequisiteDAO prerequisiteDAO;
    private final ObjectMapper objectMapper;

    public PrerequisiteServiceImpl(PrerequisiteDAO prerequisiteDAO, ObjectMapper objectMapper) {
        this.prerequisiteDAO = prerequisiteDAO;
        this.objectMapper = objectMapper;
    }

    // ---------------------------------------------------------------- 보기와 점수

    /** 판에 적힌 보기 · 칸(송연 _survey_of). 없거나 깨졌으면 기본 보기 */
    private SurveyConfig survey(String raw) {
        return SurveyConfig.parse(objectMapper, raw);
    }

    // ---------------------------------------------------------------- 줄

    /** 판에 달린 줄에 깊이와 묶음 질문 수를 붙인다 */
    private List<SurveyItemVO> items(int versionId) throws Exception {
        return SurveyItems.decorate(prerequisiteDAO.selectItems(versionId));
    }

    // ---------------------------------------------------------------- 서류 · 거래처 · 이미 쓴 장

    private SurveyFormRowVO usableForm(int formId) throws Exception {
        SurveyFormRowVO form = prerequisiteDAO.selectSurveyForm(formId);
        if (form == null || form.getVersionId() == null) {
            throw new IllegalArgumentException("그런 서류가 없습니다");
        }
        if (form.getActive() != null && form.getActive() == 0) {
            throw new IllegalArgumentException("'" + form.getName() + "' 은(는) 내려둔 서류입니다");
        }
        return form;
    }

    /** 거래처마다 서류: 거래처코드를 거래처로 바꾼다(송연 _client_id 는 이름 · 번호, ERP 는 거래처 고르기 창의 코드) */
    private SurveyClientVO client(SurveyFormRowVO form, String clientCode) throws Exception {
        if (!CLIENT.equals(form.getBindType())) {
            return null;
        }
        String code = trim(clientCode);
        if (code == null) {
            throw new IllegalArgumentException("어느 거래처를 점검했는지 골라주세요");
        }
        SurveyClientVO c = prerequisiteDAO.selectClientByCode(code);
        if (c == null) {
            throw new IllegalArgumentException("그런 거래처가 없습니다");
        }
        return c;
    }

    /** 그 기간(수시는 그 날)에 이미 쓴 장 */
    private SurveyRecordVO inPeriod(int formId, int bindId, String docDate, SurveyPeriod period) throws Exception {
        return period != null
                ? prerequisiteDAO.selectRecordInPeriod(formId, bindId, period.getStart(), period.getEnd())
                : prerequisiteDAO.selectRecordOnDate(formId, bindId, docDate);
    }

    private static String cycleOf(String cycle) {
        String c = trim(cycle);
        return c == null ? "수시" : c;
    }

    private static String trim(String v) {
        if (v == null) {
            return null;
        }
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }

    private static void fillSurvey(SurveySheetVO sheet, SurveyConfig s) {
        sheet.setChoices(s.getChoices());
        sheet.setHasNote(s.isHasNote());
        sheet.setHasDefect(s.isHasDefect());
        sheet.setScoring(s.scoring());
        sheet.setFullMark(s.fullMark());
    }

    // ---------------------------------------------------------------- API

    @Override
    public List<SurveyFormRowVO> listPickForms() throws Exception {
        List<SurveyFormRowVO> forms = prerequisiteDAO.selectPickForms();
        for (SurveyFormRowVO f : forms) {
            f.setCycle(cycleOf(f.getCycle()));
            f.setSurveyJson(null);
        }
        return forms;
    }

    @Override
    public SurveySheetVO blank(int formId, String docDate, String clientCode) throws Exception {
        SurveyFormRowVO form = usableForm(formId);
        SurveyClientVO client = client(form, clientCode);
        String date = trim(docDate);
        String cycle = cycleOf(form.getCycle());
        SurveyPeriod period = SurveyPeriod.of(cycle, date);

        SurveySheetVO sheet = new SurveySheetVO();
        sheet.setFormId(form.getId());
        sheet.setFormName(form.getName());
        sheet.setCategory(form.getCategory());
        sheet.setBindType(form.getBindType() == null ? "" : form.getBindType());
        sheet.setCycle(cycle);
        sheet.setPeriod(period == null ? "" : period.getLabel());
        sheet.setVersionId(form.getVersionId());
        sheet.setVersionLabel(form.getVersionLabel());
        fillSurvey(sheet, survey(form.getSurveyJson()));
        sheet.setItems(items(form.getVersionId()));
        sheet.setDocDate(date == null ? "" : date);
        if (client != null) {
            sheet.setBindId(client.getId());
            sheet.setBindName(client.getName());
            sheet.setClientCode(client.getClientCode());
        }
        // 한 기간에 한 장. 그 기간에 이미 쓴 장이 있으면 화면이 그 장을 연다(다른 날 것이면 그 날짜도 알린다)
        if (date != null) {
            SurveyRecordVO dup = inPeriod(formId, client == null ? 0 : client.getId(), date, period);
            if (dup != null) {
                sheet.setExistingId(dup.getId());
                sheet.setExistingStatus(dup.getStatus());
                sheet.setExistingDate(dup.getDocDate());
            }
        }
        return sheet;
    }

    @Override
    public SurveySaveResultVO save(SurveySaveRequestVO request, String employeeId) throws Exception {
        String date = trim(request.getDocDate());
        if (date == null) {
            throw new IllegalArgumentException("점검일을 골라주세요");
        }
        SurveyFormRowVO form = usableForm(request.getFormId() == null ? 0 : request.getFormId());
        SurveyClientVO client = client(form, request.getClientCode());
        int bindId = client == null ? 0 : client.getId();

        SurveyConfig s = survey(form.getSurveyJson());
        Map<String, SurveyChoiceVO> byLabel = new HashMap<>();
        for (SurveyChoiceVO c : s.getChoices()) {
            byLabel.put(c.getLabel(), c);
        }
        Set<Integer> questions = new HashSet<>();
        for (SurveyItemVO item : items(form.getVersionId())) {
            if ("single".equals(item.getRowKind())) {
                questions.add(item.getId());
            }
        }

        // 그 판의 질문이 아닌 줄은 버리고, 고른 답 · 세부내역 · 부적합내역이 모두 빈 질문은 저장하지 않는다
        List<SurveyAnswerVO> graded = new ArrayList<>();
        int got = 0;
        int answered = 0;
        int bad = 0;
        Map<String, SurveyAnswerInputVO> answers = request.getAnswers() == null ? Collections.emptyMap() : request.getAnswers();
        for (Map.Entry<String, SurveyAnswerInputVO> e : answers.entrySet()) {
            Integer itemId;
            try {
                itemId = Integer.valueOf(e.getKey().trim());
            } catch (NumberFormatException ex) {
                continue;
            }
            if (!questions.contains(itemId) || e.getValue() == null) {
                continue;
            }
            String label = trim(e.getValue().getValue());
            if (label != null && !byLabel.containsKey(label)) {
                throw new IllegalArgumentException("'" + label + "' 은(는) 이 서류에서 고를 수 없는 답입니다");
            }
            String note = trim(e.getValue().getNote());
            String defect = trim(e.getValue().getDefect());
            if (label == null && note == null && defect == null) {
                continue;
            }
            if (label != null) {
                SurveyChoiceVO c = byLabel.get(label);
                answered++;
                if (c.getScore() != null) {
                    got += c.getScore();
                }
                // 0점 보기만 부적합(제일 낮은 점수가 아니다 — 3/2/1점 양식에서 1점은 부적합이 아니다)
                if (c.getScore() != null && c.getScore() == 0) {
                    bad++;
                }
            }
            SurveyAnswerVO a = new SurveyAnswerVO();
            a.setItemId(itemId);
            a.setValueText(label);
            a.setNote(note);
            a.setDefect(defect);
            graded.add(a);
        }

        String cycle = cycleOf(form.getCycle());
        SurveyPeriod period = SurveyPeriod.of(cycle, date);
        SurveyRecordVO rec = inPeriod(form.getId(), bindId, date, period);
        if (rec != null && "승인".equals(rec.getStatus())) {
            throw new IllegalArgumentException("이미 승인된 점검표입니다. 고치려면 검토자가 먼저 승인을 거둬야 합니다.");
        }
        // 결재에 올라가 있는 동안에는 못 고친다(1단계 검토자가 본 뒤에 답이 바뀌면 그 도장은 보지 않은 것을 본 것이 된다)
        if (rec != null && "검토대기".equals(rec.getStatus())) {
            throw new SurveyRecordConflictException("결재에 올라가 있는 점검표입니다. 고치려면 결재자가 돌려보내야 합니다.", rec.getId(), rec.getDocDate(), true);
        }
        // 같은 기간에 다른 날 장이 있으면 새로 만들지 않고, 그 장의 날짜를 옮기지도 않는다(점검한 날이 바뀐다)
        if (rec != null && period != null && !date.equals(rec.getDocDate())) {
            throw new SurveyRecordConflictException(period.getLabel() + " 점검표는 " + rec.getDocDate() + " 에 이미 썼습니다. " + cycle
                    + " 짜리 서류는 한 기간에 한 장이라, 그 장을 열어 고쳐주세요.", rec.getId(), rec.getDocDate(), false);
        }

        SurveyRecordVO row = new SurveyRecordVO();
        row.setFormId(form.getId());
        row.setVersionId(form.getVersionId());
        row.setBindType(client == null ? null : CLIENT);
        row.setBindId(client == null ? null : client.getId());
        row.setDocDate(date);
        row.setStatus(DRAFT);
        row.setScore(got);
        row.setScoreMax(answered * s.fullMark());
        row.setWrittenBy(employeeId);
        if (rec != null) {
            row.setId(rec.getId());
            prerequisiteDAO.updateRecord(row);
            prerequisiteDAO.deleteAnswers(rec.getId());
        } else {
            prerequisiteDAO.insertRecord(row);
        }
        for (SurveyAnswerVO a : graded) {
            a.setRecordId(row.getId());
            prerequisiteDAO.insertAnswer(a);
        }

        SurveySaveResultVO out = new SurveySaveResultVO();
        out.setId(row.getId() == null ? 0 : row.getId());
        out.setStatus(DRAFT);
        out.setScore(got);
        out.setScoreMax(answered * s.fullMark());
        out.setAnswered(answered);
        out.setBad(bad);
        return out;
    }

    @Override
    public List<SurveyRecordVO> listRecords(String start, String end, Integer formId) throws Exception {
        String from = trim(start);
        String to = trim(end);
        if (from == null || to == null) {
            from = null;
            to = null;
        }
        List<SurveyRecordVO> rows = prerequisiteDAO.selectRecords(from, to, formId != null && formId > 0 ? formId : null);
        for (SurveyRecordVO r : rows) {
            r.setCycle(cycleOf(r.getCycle()));
            SurveyPeriod p = SurveyPeriod.of(r.getCycle(), r.getDocDate());
            r.setPeriod(p == null ? "" : p.getLabel());
        }
        return rows;
    }

    @Override
    public SurveySheetVO getRecord(int recordId) throws Exception {
        SurveyRecordVO r = prerequisiteDAO.selectRecord(recordId);
        if (r == null) {
            throw new IllegalArgumentException("그런 점검표가 없습니다");
        }
        String cycle = cycleOf(r.getCycle());
        SurveyPeriod period = SurveyPeriod.of(cycle, r.getDocDate());
        SurveySheetVO sheet = new SurveySheetVO();
        sheet.setRecordId(r.getId());
        sheet.setFormId(r.getFormId());
        sheet.setFormName(r.getFormName());
        sheet.setCategory(r.getCategory());
        sheet.setBindType(r.getBindType() == null ? "" : r.getBindType());
        sheet.setCycle(cycle);
        sheet.setPeriod(period == null ? "" : period.getLabel());
        sheet.setVersionId(r.getVersionId());
        sheet.setVersionLabel(r.getVersionLabel());
        fillSurvey(sheet, survey(r.getSurveyJson()));
        sheet.setItems(items(r.getVersionId()));
        for (SurveyAnswerVO a : prerequisiteDAO.selectAnswers(recordId)) {
            SurveyAnswerInputVO in = new SurveyAnswerInputVO();
            in.setValue(a.getValueText() == null ? "" : a.getValueText());
            in.setNote(a.getNote() == null ? "" : a.getNote());
            in.setDefect(a.getDefect() == null ? "" : a.getDefect());
            sheet.getAnswers().put(String.valueOf(a.getItemId()), in);
        }
        sheet.setDocDate(r.getDocDate());
        sheet.setBindId(r.getBindId());
        sheet.setBindName(r.getBindName() == null ? "" : r.getBindName());
        sheet.setClientCode(r.getClientCode());
        sheet.setStatus(r.getStatus());
        sheet.setScore(r.getScore());
        sheet.setScoreMax(r.getScoreMax());
        sheet.setWrittenBy(r.getWrittenBy());
        sheet.setWrittenByNm(r.getWrittenByNm());
        sheet.setWrittenAt(r.getWrittenAt());
        sheet.setRejectReason(r.getRejectReason());
        return sheet;
    }

    @Override
    public List<SurveyMissingVO> missing() throws Exception {
        return missingAt(LocalDate.now());
    }

    /** 안 쓴 기간(송연 missing). 수시 서류는 뺀다 */
    List<SurveyMissingVO> missingAt(LocalDate today) throws Exception {
        List<SurveyMissingVO> out = new ArrayList<>();
        for (SurveyFormRowVO f : prerequisiteDAO.selectMissingForms()) {
            String cycle = cycleOf(f.getCycle());
            if ("수시".equals(cycle) || SurveyPeriod.of(cycle, today) == null) {
                continue;
            }
            List<SurveyMissingRowVO> rows = CLIENT.equals(f.getBindType()) ? missingClients(f.getId(), cycle, today) : missingDates(f.getId(), cycle, today);
            if (rows.isEmpty()) {
                continue;
            }
            SurveyMissingVO m = new SurveyMissingVO();
            m.setFormId(f.getId());
            m.setFormName(f.getName());
            m.setCycle(cycle);
            m.setBindType(f.getBindType() == null ? "" : f.getBindType());
            m.setRows(rows);
            out.add(m);
        }
        return out;
    }

    /** 날짜마다 서류: 최근 기간 중 한 장도 없는 기간 */
    private List<SurveyMissingRowVO> missingDates(int formId, String cycle, LocalDate today) throws Exception {
        List<SurveyMissingRowVO> out = new ArrayList<>();
        for (SurveyPeriod p : SurveyPeriod.back(cycle, SurveyPeriod.lookback(cycle), today)) {
            if (prerequisiteDAO.countRecordsBetween(formId, p.getStart(), p.getEnd()) == 0) {
                SurveyMissingRowVO row = new SurveyMissingRowVO();
                row.setLabel(p.getLabel());
                row.setStart(p.getStart());
                row.setEnd(p.getEnd());
                out.add(row);
            }
        }
        return out;
    }

    /**
     * 거래처마다 서류: 지난 기간에 평가한 업체 중 이번 기간에 빠진 곳.
     * 거래처 수백 곳을 전부 세면 '안 한 곳' 이 수백 줄 나와 아무 말도 안 하는 것과 같다 — 애초에 평가 대상이 아니었던 업체는 셈에 넣지 않는다
     */
    private List<SurveyMissingRowVO> missingClients(int formId, String cycle, LocalDate today) throws Exception {
        SurveyPeriod cur = SurveyPeriod.of(cycle, today);
        Set<Integer> before = new TreeSet<>(prerequisiteDAO.selectBindIdsBefore(formId, cur.getStart()));
        if (before.isEmpty()) {
            return Collections.emptyList();
        }
        before.removeAll(new LinkedHashSet<>(prerequisiteDAO.selectBindIdsBetween(formId, cur.getStart(), cur.getEnd())));
        List<SurveyMissingRowVO> out = new ArrayList<>();
        for (Integer clientId : before) {
            String name = prerequisiteDAO.selectClientName(clientId);
            SurveyMissingRowVO row = new SurveyMissingRowVO();
            row.setLabel(name == null ? "(지워진 거래처)" : name);
            row.setPeriod(cur.getLabel());
            row.setClientId(clientId);
            row.setStart(cur.getStart());
            row.setEnd(cur.getEnd());
            out.add(row);
        }
        return out;
    }
}
