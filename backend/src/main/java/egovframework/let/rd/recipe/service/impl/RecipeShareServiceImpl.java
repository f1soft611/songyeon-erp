package egovframework.let.rd.recipe.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import egovframework.let.rd.recipe.domain.model.RecipeHandoffVO;
import egovframework.let.rd.recipe.domain.model.RecipeShareSaveVO;
import egovframework.let.rd.recipe.domain.model.RecipeShareVO;
import egovframework.let.rd.recipe.domain.repository.RecipeDAO;
import egovframework.let.rd.recipe.domain.repository.RecipeShareDAO;
import egovframework.let.rd.recipe.service.RecipeShareService;

/**
 * 상품개발 - 레시피 검색·공유 · 공유 로그 서비스 구현 클래스 (송연 recipe.py 와 같은 규칙)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Service("recipeShareService")
public class RecipeShareServiceImpl extends EgovAbstractServiceImpl implements RecipeShareService {

    private static final DateTimeFormatter ISO_SECONDS = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    /** 처리구분 → 버전에 붙는 분류 (송연 _HANDOFF_STAGE) */
    static final Map<String, String> HANDOFF_STAGE = new LinkedHashMap<>();
    static {
        HANDOFF_STAGE.put("확정", "신규확정");
        HANDOFF_STAGE.put("견적", "견적공유");
        HANDOFF_STAGE.put("기타", "기타공유");
    }

    private final RecipeShareDAO recipeShareDAO;
    private final RecipeDAO recipeDAO;
    private final ObjectMapper objectMapper;

    public RecipeShareServiceImpl(RecipeShareDAO recipeShareDAO, RecipeDAO recipeDAO, ObjectMapper objectMapper) {
        this.recipeShareDAO = recipeShareDAO;
        this.recipeDAO = recipeDAO;
        this.objectMapper = objectMapper;
    }

    @Override
    public Map<String, Object> handoff(Object versionIdValue, String kindValue, String employeeId, String employeeName) throws Exception {
        String kind = kindValue == null ? "" : kindValue.trim();
        if (!HANDOFF_STAGE.containsKey(kind)) {
            throw new IllegalArgumentException("확정/견적/기타 중 하나여야 합니다");
        }
        Long versionId = toLong(versionIdValue);
        if (versionId == null) {
            throw new IllegalArgumentException("어느 버전을 넘길지 골라주세요");
        }
        Map<String, Object> source = recipeShareDAO.selectHandoffSource(versionId);
        if (source == null) {
            throw new IllegalArgumentException("버전을 찾을 수 없습니다");
        }
        long draftId = ((Number) source.get("draftId")).longValue();
        String versionLabel = (String) source.get("versionLabel");
        String draftName = (String) source.get("draftName");
        String clientName = (String) source.get("clientName");
        // 같은 버전을 같은 곳으로 두 번 넘기면 견적이 두 건 생긴다(버튼을 두 번 눌렀을 뿐인데 영업이 어느 쪽을 봐야 할지 모른다)
        if (recipeShareDAO.countHandoff(versionId, kind) > 0) {
            throw new IllegalArgumentException("이 버전(" + versionLabel + ")은 이미 \"" + kind + "\" 로 넘겼습니다.");
        }
        List<Map<String, Object>> bom = recipeShareDAO.selectHandoffBom(versionId);
        // 배합표가 비어 있으면 받는 쪽에 볼 것이 없고, 넘기는 순간 버전이 잠겨 채워 넣을 수도 없다
        boolean hasMaterial = false;
        for (Map<String, Object> b : bom) {
            if (hasText((String) b.get("materialName"))) {
                hasMaterial = true;
                break;
            }
        }
        if (!hasMaterial) {
            throw new IllegalArgumentException(versionLabel + " 의 배합표가 비어 있습니다. 레시피 작성에서 원재료를 넣은 뒤에 넘겨주세요.");
        }
        String now = LocalDateTime.now(SEOUL).format(ISO_SECONDS);
        Long quoteId = null;
        if (!"기타".equals(kind)) {
            quoteId = insertDraftQuote(kind, bom, draftName, (String) source.get("draftSpec"), clientName, versionLabel, now);
        }
        // 접속 아이디도 같이 남긴다. 이름이 같은 사람이 있을 수 있고 이름은 나중에 바뀌기도 한다
        Map<String, Object> handoff = new HashMap<>();
        handoff.put("draftId", draftId);
        handoff.put("versionId", versionId);
        handoff.put("versionLabel", versionLabel);
        handoff.put("kind", kind);
        handoff.put("quoteId", quoteId);
        handoff.put("requestedBy", employeeId);
        handoff.put("requestedByName", employeeName);
        handoff.put("requestedByUsername", recipeShareDAO.selectUsername(employeeId));
        handoff.put("now", now);
        long handoffId = recipeShareDAO.insertHandoff(handoff);
        if ("기타".equals(kind)) {
            recipeShareDAO.insertLabelRequest(handoffId, ingredientsDraftText(bom), now);
        }
        String stage = HANDOFF_STAGE.get(kind);
        recipeShareDAO.lockVersion(versionId, stage);
        Map<String, Object> log = new HashMap<>();
        log.put("draftId", draftId);
        log.put("versionId", versionId);
        log.put("versionLabel", versionLabel);
        log.put("stage", stage);
        log.put("employeeId", employeeId);
        log.put("employeeName", employeeName);
        log.put("now", now);
        recipeShareDAO.insertStageLog(log);
        recipeShareDAO.touchDraft(draftId, now);

        String where = "기타".equals(kind) ? "품질관리 > 라벨등록 > 표시사항 요청" : "영업관리 > 견적";
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("handoffId", handoffId);
        result.put("quoteId", quoteId);
        result.put("message", "\"" + kind + "\" 로 넘겼습니다. " + where + " 에서 확인하세요.");
        return result;
    }

    /**
     * 가견적 만들기(송연 resolve_bom + compute_cost_fields(원재료비, {})).
     * 레시피는 배합비율을 비율(0.1869)로, 견적은 퍼센트(18.69)로 다룬다 — 100을 곱하지 않으면 원재료비가 100분의 1이 된다.
     * 원재료코드와 단가는 레시피가 들고 있던 그대로 넘긴다(상품개발이 그 값으로 업체와 이야기했다. 영업이 견적에서 고칠 수 있다).
     */
    private long insertDraftQuote(String kind, List<Map<String, Object>> bom, String draftName, String draftSpec,
            String clientName, String versionLabel, String now) throws Exception {
        List<Map<String, Object>> quoteBom = new ArrayList<>();
        BigDecimal materialCost = BigDecimal.ZERO;
        for (Map<String, Object> b : bom) {
            String name = (String) b.get("materialName");
            String code = (String) b.get("materialCode");
            Double ratio = toDouble(b.get("ratio"));
            Double price = toDouble(b.get("unitPrice"));
            Double percent = ratio == null ? null : ratio * 100;
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("material_name", name);
            line.put("material_code", code);
            line.put("ratio_percent", percent);
            line.put("unit_price", price);
            quoteBom.add(line);
            if (!hasText(name == null ? null : name.trim())) {
                continue;
            }
            Double unitPrice = price;
            if (unitPrice == null) {
                Map<String, Object> m = findMaterial(name.trim(), code);
                unitPrice = m == null ? null : toDouble(m.get("unitPrice"));
            }
            if (percent != null && unitPrice != null) {
                materialCost = materialCost.add(BigDecimal.valueOf(percent / 100 * unitPrice));
            }
        }
        Map<String, Object> values = new HashMap<>();
        values.put("productName", draftName);
        values.put("spec", draftSpec);
        values.put("clientName", clientName);
        values.put("bomJson", writeJson(quoteBom));
        values.put("materialCost", materialCost.doubleValue());
        values.put("kind", kind);
        values.put("sourceRecipe", "[" + (hasText(clientName) ? clientName : "미분류") + "] " + draftName + " " + versionLabel);
        values.put("now", now);
        return recipeShareDAO.insertQuote(values);
    }

    /** 송연 common.find_material: 물고 있던 코드의 이름이 지금 이름과 같으면 그것, 아니면 그 이름의 코드 작은 것 */
    private Map<String, Object> findMaterial(String name, String wantCode) throws Exception {
        if (hasText(wantCode == null ? null : wantCode.trim())) {
            Map<String, Object> m = recipeDAO.selectMaterialByCodeAndName(wantCode.trim(), name);
            if (m != null) {
                return m;
            }
        }
        return recipeDAO.selectMaterialByName(name);
    }

    /**
     * 표시사항 '원재료명 및 함량' 초안(송연 _ingredients_draft_text): "정제수 60.0%, 설탕 40.0%".
     * 표기 규정까지 맞춰주지는 못한다. 다시 타이핑하지 않게 해주는 것까지가 목적이다.
     */
    static String ingredientsDraftText(List<Map<String, Object>> bom) {
        StringBuilder out = new StringBuilder();
        for (Map<String, Object> b : bom) {
            String name = (String) b.get("materialName");
            if (!hasText(name)) {
                continue;
            }
            if (out.length() > 0) {
                out.append(", ");
            }
            Double ratio = toDouble(b.get("ratio"));
            out.append(ratio == null ? name : name + " " + pythonRound2(ratio * 100) + "%");
        }
        return out.toString();
    }

    /** 파이썬 str(round(x, 2)): 40.0 은 '40.0', 18.694 는 '18.69' */
    static String pythonRound2(double value) {
        double rounded = new BigDecimal(value).setScale(2, RoundingMode.HALF_EVEN).doubleValue();
        if (rounded == Math.rint(rounded)) {
            return String.valueOf((long) rounded) + ".0";
        }
        return BigDecimal.valueOf(rounded).stripTrailingZeros().toPlainString();
    }

    @Override
    public List<RecipeHandoffVO> listHandoffs(Map<String, String> filter) throws Exception {
        Map<String, Object> f = new HashMap<>();
        String draftId = trim(filter.get("draftId"));
        f.put("draftId", draftId.matches("\\d+") ? Long.valueOf(draftId) : null);
        f.put("kind", trim(filter.get("kind")));
        f.put("start", trim(filter.get("start")));
        f.put("end", trim(filter.get("end")));
        return recipeShareDAO.selectHandoffs(f);
    }

    @Override
    public List<RecipeShareVO> listShares() throws Exception {
        String today = LocalDate.now(SEOUL).toString();
        List<RecipeShareVO> rows = recipeShareDAO.selectShares();
        for (RecipeShareVO r : rows) {
            r.setExpired(hasText(r.getExpiresAt()) && r.getExpiresAt().compareTo(today) < 0);
        }
        return rows;
    }

    @Override
    public void createShare(RecipeShareSaveVO request, String employeeId) throws Exception {
        Long draftId = toLong(request.getDraftId());
        // 사원 id 는 사번 문자열(예: '0000')이다. 비어 있으면 안 고른 것으로 본다
        String targetEmployeeId = trim(request.getEmployeeId());
        targetEmployeeId = targetEmployeeId.isEmpty() ? null : targetEmployeeId;
        String expiresAt = trim(request.getExpiresAt());
        if (draftId == null || targetEmployeeId == null || expiresAt.isEmpty()) {
            throw new IllegalArgumentException("레시피, 사원, 만료일은 모두 필수입니다");
        }
        // 어느 버전을 주는지 못박아 둔다. 안 그러면 나중에 새 버전을 만들었을 때 공유받은 사람에게 보이는 내용이 슬그머니 바뀐다
        Long versionId = toLong(request.getVersionId());
        if (versionId != null) {
            Long owner = recipeShareDAO.selectVersionDraftId(versionId);
            if (owner == null || !owner.equals(draftId)) {
                throw new IllegalArgumentException("이 레시피의 버전이 아닙니다");
            }
        } else {
            // 안 고르면 지금의 최신 버전을 못박는다('늘 최신' 이 되지 않게)
            versionId = recipeShareDAO.selectLatestVersionId(draftId);
        }
        Map<String, Object> values = new HashMap<>();
        values.put("draftId", draftId);
        values.put("versionId", versionId);
        values.put("employeeId", targetEmployeeId);
        values.put("expiresAt", expiresAt);
        values.put("createdBy", employeeId);
        values.put("now", LocalDateTime.now(SEOUL).format(ISO_SECONDS));
        recipeShareDAO.insertShare(values);
    }

    @Override
    public void deleteShare(long id) throws Exception {
        recipeShareDAO.deleteShare(id);
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("배합비를 저장할 수 없습니다");
        }
    }

    /** 숫자나 숫자 글자(파이썬 int(x)), 아니면 null */
    static Long toLong(Object value) {
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        String s = value == null ? "" : String.valueOf(value).trim();
        return s.matches("\\d+") ? Long.valueOf(s) : null;
    }

    private static Double toDouble(Object value) {
        return RecipeServiceImpl.toDouble(value);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isEmpty();
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
