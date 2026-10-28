package egovframework.let.rd.recipe.service.impl;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.rd.recipe.domain.model.RecipeBomInputVO;
import egovframework.let.rd.recipe.domain.model.RecipeClientVO;
import egovframework.let.rd.recipe.domain.model.RecipeDraftVO;
import egovframework.let.rd.recipe.domain.model.RecipeSalesRepVO;
import egovframework.let.rd.recipe.domain.model.RecipeSaveVO;
import egovframework.let.rd.recipe.domain.model.RecipeStageLogVO;
import egovframework.let.rd.recipe.domain.model.RecipeVersionVO;
import egovframework.let.rd.recipe.domain.repository.RecipeDAO;
import egovframework.let.rd.recipe.service.RecipeService;

/**
 * 상품개발 - 레시피 작성 서비스 구현 클래스 (송연 recipe.py 와 같은 규칙)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Service("recipeService")
public class RecipeServiceImpl extends EgovAbstractServiceImpl implements RecipeService {

    private static final DateTimeFormatter ISO_SECONDS = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    // 업체 폴더는 송연과 같이 '2026-10-14 09:30:00' 모양으로 적는다
    private static final DateTimeFormatter SPACE_SECONDS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final RecipeDAO recipeDAO;

    public RecipeServiceImpl(RecipeDAO recipeDAO) {
        this.recipeDAO = recipeDAO;
    }

    @Override
    public List<RecipeClientVO> listClients() throws Exception {
        return recipeDAO.selectClients();
    }

    @Override
    public String saveClient(String clientName, String salesEmpId, String employeeId) throws Exception {
        String name = trim(clientName);
        if (name.isEmpty()) {
            throw new IllegalArgumentException("업체명을 입력해주세요");
        }
        // 담당자는 안 정해도 된다(나중에 정하는 경우가 많다). 비어 있으면 정하지 않은 것으로 본다(사번 문자열 그대로)
        String raw = trim(salesEmpId);
        String emp = raw.isEmpty() ? null : raw;
        if (emp != null && recipeDAO.countEmployee(emp) == 0) {
            throw new IllegalArgumentException("그런 사원이 없습니다");
        }
        String now = LocalDateTime.now(ZoneId.of("Asia/Seoul")).format(SPACE_SECONDS);
        Long id = recipeDAO.selectClientId(name);
        if (id != null) {
            recipeDAO.updateClientRep(id, emp, now);
        } else {
            recipeDAO.insertClient(name, emp, employeeId, now, now);
        }
        return name;
    }

    @Override
    public List<RecipeSalesRepVO> listSalesReps() throws Exception {
        return recipeDAO.selectSalesReps();
    }

    @Override
    public List<RecipeDraftVO> listDrafts(Map<String, String> filter) throws Exception {
        Map<String, Object> f = new HashMap<>();
        for (String key : new String[] { "clientName", "clientQ", "stage", "q", "category", "saleType" }) {
            f.put(key, trim(filter.get(key)));
        }
        if (!((String) f.get("stage")).isEmpty()) {
            return recipeDAO.selectDraftsByStage(f);
        }
        return recipeDAO.selectDrafts(f);
    }

    @Override
    public Map<String, Object> getDraft(long id) throws Exception {
        RecipeDraftVO draft = recipeDAO.selectDraft(id);
        if (draft == null) {
            throw new IllegalArgumentException("레시피를 찾을 수 없습니다");
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("draft", draft);
        result.put("versions", recipeDAO.selectVersions(id));
        return result;
    }

    @Override
    public Map<String, Object> getVersion(long id) throws Exception {
        RecipeVersionVO version = recipeDAO.selectVersion(id);
        if (version == null) {
            throw new IllegalArgumentException("버전을 찾을 수 없습니다");
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("version", version);
        result.put("bom", recipeDAO.selectVersionBom(id));
        return result;
    }

    @Override
    public Map<String, Object> createDraft(RecipeSaveVO request, String employeeId) throws Exception {
        String name = trim(request.getName());
        String clientName = trim(request.getClientName());
        if (name.isEmpty()) {
            throw new IllegalArgumentException("레시피명은 필수입니다");
        }
        if (clientName.isEmpty()) {
            throw new IllegalArgumentException("업체명은 필수입니다");
        }
        String now = now();
        // 폴더를 거치지 않고 업체명을 직접 쳐서 만드는 경우가 있어서 폴더 줄도 같이 챙긴다
        recipeDAO.insertClient(clientName, null, employeeId, now, null);
        Map<String, Object> values = headerValues(request);
        values.put("clientName", clientName);
        values.put("name", name);
        values.put("createdBy", employeeId);
        values.put("now", now);
        long draftId = recipeDAO.insertDraft(values);
        long versionId = recipeDAO.insertVersion(draftId, "초안", null, now);
        saveBom(versionId, request.getBom());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", draftId);
        result.put("versionId", versionId);
        return result;
    }

    @Override
    public void updateDraft(long id, RecipeSaveVO request) throws Exception {
        String name = trim(request.getName());
        if (name.isEmpty()) {
            throw new IllegalArgumentException("레시피명은 필수입니다");
        }
        if (recipeDAO.selectDraft(id) == null) {
            throw new IllegalArgumentException("레시피를 찾을 수 없습니다");
        }
        Map<String, Object> values = headerValues(request);
        values.put("id", id);
        values.put("name", name);
        values.put("now", now());
        recipeDAO.updateDraft(values);
    }

    // 새 버전 이름은 test1, test2 … (지금까지 test 로 시작하는 버전 수 + 1)
    @Override
    public Map<String, Object> addVersion(long draftId, String note) throws Exception {
        if (recipeDAO.selectDraft(draftId) == null) {
            throw new IllegalArgumentException("레시피를 찾을 수 없습니다");
        }
        List<Map<String, Object>> existing = recipeDAO.selectVersionLabels(draftId);
        String label = "test" + (testCount(existing) + 1);
        String now = now();
        long newId = recipeDAO.insertVersion(draftId, label, note, now);
        if (!existing.isEmpty()) {
            long latest = ((Number) existing.get(existing.size() - 1).get("id")).longValue();
            recipeDAO.copyBom(latest, newId);
        }
        recipeDAO.touchDraft(draftId, now);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("versionId", newId);
        result.put("versionLabel", label);
        return result;
    }

    static int testCount(List<Map<String, Object>> versions) {
        int n = 0;
        for (Map<String, Object> v : versions) {
            Object label = v.get("versionLabel");
            if (label != null && String.valueOf(label).startsWith("test")) {
                n++;
            }
        }
        return n;
    }

    @Override
    public void saveVersion(long versionId, RecipeSaveVO request, String note) throws Exception {
        RecipeVersionVO version = recipeDAO.selectVersion(versionId);
        if (version != null && hasText(version.getStage())) {
            throw new IllegalArgumentException("\"" + version.getStage() + "\"로 공유된 버전은 수정할 수 없습니다. 새 test버전을 만들어서 수정해주세요.");
        }
        if (version == null) {
            throw new IllegalArgumentException("버전을 찾을 수 없습니다");
        }
        recipeDAO.updateVersionNote(versionId, note);
        saveBom(versionId, request.getBom());
        recipeDAO.touchDraft(version.getDraftId(), now());
    }

    /**
     * 배합표를 통째로 다시 적는다(송연 _save_recipe_version_bom).
     * 원재료코드: 화면이 보내온 코드, 없으면 이 버전이 원래 물고 있던 코드 — 이름이 겹치는 원재료가 있어도
     * 저장 한 번에 딴 물건으로 갈아타지 않게 한다. 비율·단가는 숫자로 못 읽으면 그 줄을 건너뛰거나 원재료단가를 쓴다.
     */
    private void saveBom(long versionId, List<RecipeBomInputVO> rows) throws Exception {
        Map<String, String> preferCodes = new HashMap<>();
        for (Map<String, Object> old : recipeDAO.selectOldBomCodes(versionId)) {
            String n = (String) old.get("name");
            String c = (String) old.get("code");
            if (hasText(n) && hasText(c) && !preferCodes.containsKey(n)) {
                preferCodes.put(n, c);
            }
        }
        recipeDAO.deleteVersionBom(versionId);
        if (rows == null) {
            return;
        }
        for (int i = 0; i < rows.size(); i++) {
            RecipeBomInputVO b = rows.get(i);
            String name = trim(b.getMaterialName());
            if (name.isEmpty()) {
                continue;
            }
            Double percent = toDouble(b.getRatioPercent());
            if (percent == null) {
                continue;
            }
            double ratio = percent / 100.0;
            Double weight = toDouble(b.getWeight());
            String wantCode = hasText(b.getMaterialCode()) ? b.getMaterialCode() : preferCodes.get(name);
            Map<String, Object> m = findMaterial(name, wantCode);
            String code = m == null ? null : (String) m.get("code");
            Double materialPrice = m == null || m.get("unitPrice") == null ? null : ((Number) m.get("unitPrice")).doubleValue();
            Double unitPrice = toDouble(b.getUnitPrice());
            if (unitPrice == null) {
                unitPrice = materialPrice;
            }
            Double amount = unitPrice == null ? null : unitPrice * ratio;
            recipeDAO.insertBom(versionId, code, name, weight, ratio, unitPrice, amount, i);
        }
    }

    /** 송연 common.find_material: 이미 물고 있던 코드의 이름이 지금 이름과 같으면 그것, 아니면 그 이름의 코드 작은 것 */
    private Map<String, Object> findMaterial(String name, String wantCode) throws Exception {
        String want = wantCode == null ? "" : wantCode.trim();
        if (!want.isEmpty()) {
            Map<String, Object> m = recipeDAO.selectMaterialByCodeAndName(want, name);
            if (m != null) {
                return m;
            }
        }
        return recipeDAO.selectMaterialByName(name);
    }

    @Override
    public void deleteDraft(long id) throws Exception {
        recipeDAO.deleteDraftAll(id);
    }

    @Override
    public List<RecipeStageLogVO> stageLogs(long draftId) throws Exception {
        return recipeDAO.selectStageLogs(draftId);
    }

    private static Map<String, Object> headerValues(RecipeSaveVO r) {
        Map<String, Object> values = new HashMap<>();
        values.put("spec", r.getSpec());
        values.put("note", r.getNote());
        values.put("category", r.getCategory());
        values.put("saleType", r.getSaleType());
        values.put("remark", r.getRemark());
        return values;
    }

    /** 파이썬 float(x): 숫자나 숫자 글자, 비었거나 아니면 null */
    static Double toDouble(Object value) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        if (value == null) {
            return null;
        }
        String s = String.valueOf(value).trim();
        if (s.isEmpty()) {
            return null;
        }
        try {
            return Double.valueOf(s);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static String now() {
        return LocalDateTime.now(ZoneId.of("Asia/Seoul")).format(ISO_SECONDS);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isEmpty();
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
