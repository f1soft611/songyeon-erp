package egovframework.let.qm.haccp.prerequisite.service.impl;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;

import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyChoiceInputVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyChoiceVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyChoicesSaveVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyFormCreateResultVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyFormDetailVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyFormRowVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyFormSaveVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyItemSaveVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyItemVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyVersionVO;
import egovframework.let.qm.haccp.prerequisite.domain.repository.PrerequisiteDAO;
import egovframework.let.qm.haccp.prerequisite.service.PrerequisiteFormService;
import egovframework.let.qm.haccp.prerequisite.service.SurveyConfig;
import egovframework.let.qm.haccp.prerequisite.service.SurveyItems;
import egovframework.let.qm.haccp.prerequisite.service.SurveyPeriod;

/**
 * 품질관리 - HACCP(선행) 양식 만들기 서비스 구현 클래스 (송연 qsurvey.py create_form · update_form · form_active · get_form · _editable_version ·
 * save_choices · add_item · _same_row_in · update_item · delete_item · move_item · _block).
 * - 이미 쓴 판은 고치지 않는다: 질문을 바꾸면 그 질문으로 답해둔 지난 점검표가 말이 안 되게 된다. 그 판으로 쓴 장이 하나라도 있으면
 *   고치는 순간 판을 통째로 베껴 새 판을 뜬다. 화면이 들고 있던 옛 판의 줄 번호는 같은 자리(sort_order)의 새 판 줄로 다시 찾는다
 * - 양식은 지우지 않는다(쓴 장이 남아 있다). 목록에서 내리기만
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Service("prerequisiteFormService")
public class PrerequisiteFormServiceImpl extends EgovAbstractServiceImpl implements PrerequisiteFormService {

    private static final String NO_FORM = "그런 서류가 없습니다";
    private static final String NO_ITEM = "그런 줄이 없습니다";

    private final PrerequisiteDAO prerequisiteDAO;
    private final ObjectMapper objectMapper;

    public PrerequisiteFormServiceImpl(PrerequisiteDAO prerequisiteDAO, ObjectMapper objectMapper) {
        this.prerequisiteDAO = prerequisiteDAO;
        this.objectMapper = objectMapper;
    }

    private static String trim(String v) {
        if (v == null) {
            return null;
        }
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }

    // ---------------------------------------------------------------- 서류

    @Override
    public List<SurveyFormRowVO> listForms() throws Exception {
        List<SurveyFormRowVO> forms = prerequisiteDAO.selectForms();
        for (SurveyFormRowVO f : forms) {
            SurveyConfig s = SurveyConfig.parse(objectMapper, f.getSurveyJson());
            int questions = f.getQuestions() == null ? 0 : f.getQuestions();
            f.setScoreMax(s.scoring() ? questions * s.fullMark() : null);
            f.setCycle(f.getCycle() == null || f.getCycle().trim().isEmpty() ? "수시" : f.getCycle());
            f.setSurveyJson(null);
        }
        return forms;
    }

    /** 제목 · 대상 · 기간 검사(송연 create_form · update_form · _cycle_of). 모르는 기간은 '수시' 로 떨어뜨리지 않고 막는다 */
    private SurveyFormSaveVO checked(SurveyFormSaveVO in, Integer excludeId) throws Exception {
        String name = trim(in.getName());
        if (name == null) {
            throw new IllegalArgumentException("서류 제목을 적어주세요");
        }
        if (prerequisiteDAO.countFormName(name, excludeId) > 0) {
            throw new IllegalArgumentException("'" + name + "' 은(는) 이미 있는 서류입니다");
        }
        String bind = trim(in.getBindType());
        if (bind != null && !"client".equals(bind)) {
            throw new IllegalArgumentException("무엇마다 쓰는 서류인지 잘못 왔습니다");
        }
        String cycle = trim(in.getCycle());
        if (cycle == null) {
            cycle = "수시";
        } else if (!SurveyPeriod.CYCLES.contains(cycle)) {
            throw new IllegalArgumentException("기간을 '" + String.join(" / ", SurveyPeriod.CYCLES) + "' 중에서 골라주세요");
        }
        String category = trim(in.getCategory());
        SurveyFormSaveVO out = new SurveyFormSaveVO();
        out.setName(name);
        out.setCategory(category == null ? "일반" : category);
        out.setBindType(bind);
        out.setCycle(cycle);
        return out;
    }

    @Override
    public SurveyFormCreateResultVO createForm(SurveyFormSaveVO request, String employeeId) throws Exception {
        SurveyFormSaveVO form = checked(request, null);
        form.setCreatedBy(employeeId);
        prerequisiteDAO.insertForm(form);

        SurveyVersionVO v = new SurveyVersionVO();
        v.setFormId(form.getId());
        v.setLabel("1판");
        v.setMemo("새로 만듦");
        v.setCreatedBy(employeeId);
        v.setSurveyJson(SurveyConfig.of(SurveyConfig.defaultChoices(), true, true).toJson(objectMapper));
        prerequisiteDAO.insertVersion(v);

        // 다른 양식에서 질문을 베껴 시작할 수 있다(점검표 앞부분은 서로 비슷해서 고치는 편이 빠르다)
        int copied = 0;
        if (request.getCopyFrom() != null && request.getCopyFrom() > 0) {
            SurveyVersionVO src = prerequisiteDAO.selectCurrentVersion(request.getCopyFrom());
            if (src != null) {
                prerequisiteDAO.updateVersionSurvey(v.getId(), src.getSurveyJson());
                copied = copyItems(src.getId(), v.getId()).size();
            }
        }
        SurveyFormCreateResultVO out = new SurveyFormCreateResultVO();
        out.setId(form.getId());
        out.setCopied(copied);
        return out;
    }

    /** 판 하나의 줄을 통째로 베낀다. 묶음 - 질문 관계도 옮긴다(부모가 먼저 오므로 한 번 훑으면 된다). 옛 번호 → 새 번호 */
    private Map<Integer, Integer> copyItems(int fromVersionId, int toVersionId) throws Exception {
        Map<Integer, Integer> newId = new HashMap<>();
        for (SurveyItemVO old : prerequisiteDAO.selectItemsForCopy(fromVersionId)) {
            SurveyItemVO row = new SurveyItemVO();
            row.setVersionId(toVersionId);
            row.setParentId(old.getParentId() == null ? null : newId.get(old.getParentId()));
            row.setSortOrder(old.getSortOrder());
            row.setRowKind(old.getRowKind());
            row.setLabel(old.getLabel());
            row.setAnswerType(old.getAnswerType());
            row.setTopic(old.getTopic());
            row.setRequired(old.getRequired());
            row.setHasNote(old.getHasNote());
            row.setHasDefect(old.getHasDefect());
            row.setOptionsJson(old.getOptionsJson());
            row.setScoreJson(old.getScoreJson());
            prerequisiteDAO.insertItem(row);
            newId.put(old.getId(), row.getId());
        }
        return newId;
    }

    private SurveyFormRowVO form(int formId) throws Exception {
        SurveyFormRowVO f = prerequisiteDAO.selectSurveyForm(formId);
        if (f == null) {
            throw new IllegalArgumentException(NO_FORM);
        }
        return f;
    }

    @Override
    public SurveyFormDetailVO getForm(int formId) throws Exception {
        SurveyFormRowVO f = form(formId);
        SurveyVersionVO v = prerequisiteDAO.selectCurrentVersion(formId);
        if (v == null) {
            throw new IllegalArgumentException("이 서류에 판이 없습니다");
        }
        SurveyConfig s = SurveyConfig.parse(objectMapper, v.getSurveyJson());
        SurveyFormDetailVO d = new SurveyFormDetailVO();
        d.setId(f.getId());
        d.setName(f.getName());
        d.setCategory(f.getCategory());
        d.setBindType(f.getBindType() == null ? "" : f.getBindType());
        d.setActive(f.getActive() == null || f.getActive() != 0);
        d.setCycle(f.getCycle() == null || f.getCycle().trim().isEmpty() ? "수시" : f.getCycle());
        d.setCycles(new ArrayList<>(SurveyPeriod.CYCLES));
        d.setVersionId(v.getId());
        d.setVersionLabel(v.getLabel());
        d.setChoices(s.getChoices());
        d.setHasNote(s.isHasNote());
        d.setHasDefect(s.isHasDefect());
        d.setScoring(s.scoring());
        d.setFullMark(s.fullMark());
        d.setItems(SurveyItems.decorate(prerequisiteDAO.selectItems(v.getId())));
        d.setUsed(prerequisiteDAO.countRecordsByVersion(v.getId()));
        return d;
    }

    @Override
    public void updateForm(int formId, SurveyFormSaveVO request) throws Exception {
        SurveyFormRowVO f = form(formId);
        SurveyFormSaveVO next = checked(request, formId);
        // 이미 쓴 장이 있는데 '업체마다' 를 '날짜마다' 로 바꾸면 그 장들이 매달려 있던 업체를 잃는다
        String before = f.getBindType() == null ? "" : f.getBindType();
        String after = next.getBindType() == null ? "" : next.getBindType();
        if (!before.equals(after) && prerequisiteDAO.countRecordsByForm(formId) > 0) {
            throw new IllegalArgumentException("이미 쓴 점검표가 있어 '대상' 은 바꿀 수 없습니다. 새 서류로 만들어주세요.");
        }
        // 기간은 언제든 바꿀 수 있다(쓴 서류가 지워지거나 다시 매겨지지는 않는다)
        next.setId(formId);
        prerequisiteDAO.updateForm(next);
    }

    @Override
    public void setActive(int formId, boolean active) throws Exception {
        form(formId);
        prerequisiteDAO.updateFormActive(formId, active ? 1 : 0);
    }

    // ---------------------------------------------------------------- 판

    /** 고쳐도 되는 판(송연 _editable_version). 이미 쓴 판이면 베껴서 새 판을 뜬다 */
    private int editableVersion(int formId, String employeeId) throws Exception {
        form(formId);
        SurveyVersionVO v = prerequisiteDAO.selectCurrentVersion(formId);
        if (v == null) {
            throw new IllegalArgumentException("이 서류에 판이 없습니다");
        }
        int used = prerequisiteDAO.countRecordsByVersion(v.getId());
        if (used == 0) {
            return v.getId();
        }
        int count = prerequisiteDAO.countVersions(formId);
        prerequisiteDAO.clearCurrentVersion(formId);
        SurveyVersionVO next = new SurveyVersionVO();
        next.setFormId(formId);
        next.setLabel((count + 1) + "판");
        next.setMemo("점검표 " + used + "장을 쓴 뒤 고침");
        next.setCreatedBy(employeeId);
        next.setSurveyJson(v.getSurveyJson());
        prerequisiteDAO.insertVersion(next);
        copyItems(v.getId(), next.getId());
        return next.getId();
    }

    /** 옛 판의 줄 번호를 그 판의 같은 자리 줄 번호로(송연 _same_row_in). 없으면 null */
    private Integer sameRowIn(int versionId, Integer itemId) throws Exception {
        if (itemId == null || itemId == 0) {
            return null;
        }
        SurveyItemVO row = prerequisiteDAO.selectItem(itemId);
        if (row == null) {
            return null;
        }
        if (row.getVersionId() != null && row.getVersionId() == versionId) {
            return itemId;
        }
        return prerequisiteDAO.selectItemIdBySort(versionId, row.getSortOrder());
    }

    // ---------------------------------------------------------------- 보기

    @Override
    public int saveChoices(int formId, SurveyChoicesSaveVO request, String employeeId) throws Exception {
        List<SurveyChoiceVO> choices = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (SurveyChoiceInputVO c : request.getChoices() == null ? new ArrayList<SurveyChoiceInputVO>() : request.getChoices()) {
            String label = c == null ? null : trim(c.getLabel());
            if (label == null) {
                continue;
            }
            if (!seen.add(label)) {
                throw new IllegalArgumentException("'" + label + "' 이(가) 두 번 있습니다. 고를 답은 서로 달라야 합니다.");
            }
            String scoreText = trim(c.getScore());
            Integer score = SurveyConfig.score(scoreText);
            if (scoreText != null && score == null) {
                throw new IllegalArgumentException("'" + label + "' 의 점수는 숫자로 적어주세요");
            }
            String mark = trim(c.getMark());
            choices.add(SurveyConfig.choice(label, mark == null ? "" : mark, score));
        }
        if (choices.isEmpty()) {
            throw new IllegalArgumentException("고를 답을 하나 이상 적어주세요");
        }
        int versionId = editableVersion(formId, employeeId);
        String json = SurveyConfig.of(choices, Boolean.TRUE.equals(request.getHasNote()), Boolean.TRUE.equals(request.getHasDefect())).toJson(objectMapper);
        prerequisiteDAO.updateVersionSurvey(versionId, json);
        return versionId;
    }

    // ---------------------------------------------------------------- 줄

    private static int required(SurveyItemSaveVO request) {
        return Boolean.FALSE.equals(request.getRequired()) ? 0 : 1;
    }

    @Override
    public int addItem(int formId, SurveyItemSaveVO request, String employeeId) throws Exception {
        String kind = trim(request.getRowKind()) == null ? "single" : request.getRowKind().trim();
        if (!"single".equals(kind) && !"group".equals(kind)) {
            throw new IllegalArgumentException("질문인지 묶음인지 잘못 왔습니다");
        }
        String label = trim(request.getLabel());
        if (label == null) {
            throw new IllegalArgumentException("group".equals(kind) ? "묶음 이름을 적어주세요" : "질문을 적어주세요");
        }
        int versionId = editableVersion(formId, employeeId);

        Integer after = sameRowIn(versionId, request.getAfterId());
        Integer parent = sameRowIn(versionId, request.getParentId());
        SurveyItemVO afterRow = after == null ? null : prerequisiteDAO.selectItem(after);
        if (parent != null) {
            SurveyItemVO p = prerequisiteDAO.selectItem(parent);
            if (p == null || !"group".equals(p.getRowKind())) {
                throw new IllegalArgumentException("묶음이 아닌 줄 밑에는 넣을 수 없습니다");
            }
        } else if (afterRow != null) {
            // 어디에 매달지 안 알려줬으면 바로 위 줄을 따라간다. 질문 밑이면 그 질문과 형제, 묶음 밑이면 그 묶음 안
            parent = "group".equals(afterRow.getRowKind()) ? afterRow.getId() : afterRow.getParentId();
        }

        int order;
        if (afterRow != null) {
            int base = afterRow.getSortOrder();
            prerequisiteDAO.shiftItemsAfter(versionId, base);
            order = base + 1;
        } else {
            order = prerequisiteDAO.maxItemSort(versionId) + 1;
        }
        SurveyItemVO row = new SurveyItemVO();
        row.setVersionId(versionId);
        row.setParentId(parent);
        row.setSortOrder(order);
        row.setRowKind(kind);
        row.setLabel(label);
        row.setAnswerType("single".equals(kind) ? "choice" : null);
        row.setTopic("single".equals(kind) ? trim(request.getTopic()) : null);
        row.setRequired(required(request));
        row.setHasNote(1);
        row.setHasDefect(1);
        prerequisiteDAO.insertItem(row);
        return row.getId();
    }

    /** 줄과 그 줄이 든 서류의 고칠 판, 그 판에서의 줄 번호 */
    private int[] target(int itemId, String employeeId) throws Exception {
        SurveyItemVO item = prerequisiteDAO.selectItem(itemId);
        if (item == null || item.getFormId() == null) {
            throw new IllegalArgumentException(NO_ITEM);
        }
        int versionId = editableVersion(item.getFormId(), employeeId);
        Integer t = sameRowIn(versionId, itemId);
        if (t == null) {
            throw new IllegalArgumentException(NO_ITEM);
        }
        return new int[] { versionId, t };
    }

    @Override
    public int updateItem(int itemId, SurveyItemSaveVO request, String employeeId) throws Exception {
        String label = trim(request.getLabel());
        if (label == null) {
            throw new IllegalArgumentException("내용을 적어주세요");
        }
        int[] t = target(itemId, employeeId);
        prerequisiteDAO.updateItem(t[1], label, trim(request.getTopic()), required(request));
        return t[1];
    }

    @Override
    public int deleteItem(int itemId, String employeeId) throws Exception {
        int[] t = target(itemId, employeeId);
        // 묶음을 지우면 그 안의 줄도 같이. 자식이 부모를 가리키므로 아래 것부터 지운다
        List<Integer> doomed = new ArrayList<>();
        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(t[1]);
        while (!stack.isEmpty()) {
            int cur = stack.pop();
            doomed.add(cur);
            for (Integer child : prerequisiteDAO.selectChildIds(cur)) {
                stack.push(child);
            }
        }
        for (int i = doomed.size() - 1; i >= 0; i--) {
            prerequisiteDAO.deleteItem(doomed.get(i));
        }
        return doomed.size();
    }

    @Override
    public boolean moveItem(int itemId, String dir, String employeeId) throws Exception {
        boolean up = "up".equals(dir);
        int[] t = target(itemId, employeeId);
        int versionId = t[0];
        SurveyItemVO me = prerequisiteDAO.selectItem(t[1]);
        // 형제끼리만 자리를 바꾼다(다른 묶음으로 건너뛰면 어디로 갔는지 모른다)
        List<SurveyItemVO> sibs = new ArrayList<>(prerequisiteDAO.selectSiblings(versionId, me.getParentId()));
        int at = -1;
        for (int i = 0; i < sibs.size(); i++) {
            if (sibs.get(i).getId() == t[1]) {
                at = i;
            }
        }
        int to = up ? at - 1 : at + 1;
        if (at < 0 || to < 0 || to >= sibs.size()) {
            return false;
        }
        // 묶음은 딸린 줄을 전부 데리고 간다(묶음 제목만 올리면 그 안의 질문이 남의 묶음 밑에 들어간다)
        List<SurveyItemVO> mine = block(t[1]);
        List<SurveyItemVO> theirs = block(sibs.get(to).getId());
        int order = Integer.MAX_VALUE;
        for (SurveyItemVO r : mine) {
            order = Math.min(order, r.getSortOrder());
        }
        for (SurveyItemVO r : theirs) {
            order = Math.min(order, r.getSortOrder());
        }
        List<SurveyItemVO> seq = new ArrayList<>();
        if (up) {
            seq.addAll(mine);
            seq.addAll(theirs);
        } else {
            seq.addAll(theirs);
            seq.addAll(mine);
        }
        for (SurveyItemVO r : seq) {
            prerequisiteDAO.updateItemSort(r.getId(), order++);
        }
        return true;
    }

    /** 그 줄과 그 밑에 딸린 줄 전부를 자리 순서대로(송연 _block) */
    private List<SurveyItemVO> block(int rowId) throws Exception {
        List<SurveyItemVO> out = new ArrayList<>();
        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(rowId);
        while (!stack.isEmpty()) {
            int cur = stack.pop();
            SurveyItemVO row = prerequisiteDAO.selectItem(cur);
            if (row == null) {
                continue;
            }
            out.add(row);
            for (Integer child : prerequisiteDAO.selectChildIds(cur)) {
                stack.push(child);
            }
        }
        out.sort(Comparator.comparingInt(SurveyItemVO::getSortOrder));
        return out;
    }
}
