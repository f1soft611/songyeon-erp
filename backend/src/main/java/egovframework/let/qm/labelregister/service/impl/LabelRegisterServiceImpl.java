package egovframework.let.qm.labelregister.service.impl;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import egovframework.let.qm.label.domain.model.LabelVO;
import egovframework.let.qm.label.domain.repository.LabelDAO;
import egovframework.let.qm.labelregister.domain.model.LabelContentVO;
import egovframework.let.qm.labelregister.domain.model.LabelFieldVO;
import egovframework.let.qm.labelregister.domain.model.LabelMarkSaveVO;
import egovframework.let.qm.labelregister.domain.model.LabelProductRowVO;
import egovframework.let.qm.labelregister.domain.model.LabelRequestVO;
import egovframework.let.qm.labelregister.domain.model.LabelSourceProductVO;
import egovframework.let.qm.labelregister.domain.model.LabelTemplateSaveVO;
import egovframework.let.qm.labelregister.domain.model.LabelVersionRequestVO;
import egovframework.let.qm.labelregister.domain.repository.LabelRegisterDAO;
import egovframework.let.qm.labelregister.service.LabelRegisterService;

/**
 * 품질관리 - 라벨등록 서비스 구현 클래스 (송연 label.py 와 같은 규칙)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Service("labelRegisterService")
public class LabelRegisterServiceImpl extends EgovAbstractServiceImpl implements LabelRegisterService {

    static final int MAX_VERSION_LABEL = 30;
    static final int MARK_MAX_BYTES = 400 * 1024;
    private static final List<String> MARK_ALLOWED = Arrays.asList(
            "data:image/png;base64,", "data:image/jpeg;base64,", "data:image/gif;base64,", "data:image/svg+xml;base64,");
    private static final DateTimeFormatter ISO_SECONDS = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final TypeReference<Map<String, Object>> JSON_OBJECT = new TypeReference<Map<String, Object>>() { };

    private final LabelRegisterDAO labelRegisterDAO;
    private final LabelDAO labelDAO;
    private final ObjectMapper objectMapper;

    public LabelRegisterServiceImpl(LabelRegisterDAO labelRegisterDAO, LabelDAO labelDAO, ObjectMapper objectMapper) {
        this.labelRegisterDAO = labelRegisterDAO;
        this.labelDAO = labelDAO;
        this.objectMapper = objectMapper;
    }

    // 라벨로 인쇄하려면 최소한 이 네 가지는 있어야 한다. 하나라도 비면 '작성중'
    @Override
    public List<LabelProductRowVO> listProducts(String q) throws Exception {
        List<LabelProductRowVO> rows = labelRegisterDAO.selectProducts(trim(q));
        for (LabelProductRowVO r : rows) {
            r.setLabelState(fillState(r.getFoodType(), r.getNetWeight(), r.getIngredientsText(), r.getManufactureReportNo()));
        }
        return rows;
    }

    // ===== 버전 =====

    /**
     * 이 제품에 버전이 하나도 없으면 지금 products 에 들어있는 내용으로 v1 을 만든다.
     * 라벨을 한 번도 만든 적 없는 제품은 그냥 둔다(createEmpty=false) — 빈 껍데기 버전이 제품 수만큼 쌓이면
     * '아직 안 만든 제품' 과 '만들다 만 제품' 을 구분할 수 없다. 저장하려는 순간에만 createEmpty=true.
     */
    private void ensureInitialVersion(String code, boolean createEmpty, String who) throws Exception {
        if (labelDAO.countVersions(code) > 0) {
            return;
        }
        LabelVO p = labelDAO.selectProductLabel(code);
        if (p == null) {
            return;
        }
        boolean has = hasText(p.getFoodType()) || hasText(p.getNetWeight()) || hasText(p.getIngredientsText()) || hasText(p.getManufactureReportNo());
        if (!createEmpty && !has) {
            return;
        }
        p.setProductCode(code);
        p.setVersionLabel("v1");
        p.setIsCurrent(1);
        p.setCreatedAt(now());
        p.setCreatedBy(who); // 2026-10-26 만든 사람 사번(예전에는 비어 있었다)
        labelDAO.insertVersion(p);
    }

    /** 사용중 버전. 표시가 없으면 가장 최근 버전을 사용중으로 삼는다 */
    private Long currentVersionId(String code) throws Exception {
        Long id = labelDAO.selectCurrentVersionId(code);
        if (id != null) {
            return id;
        }
        Long latest = labelDAO.selectLatestVersionId(code);
        if (latest != null) {
            labelDAO.updateVersionCurrent(latest);
        }
        return latest;
    }

    private void requireProduct(String code) throws Exception {
        if (code == null || labelRegisterDAO.countProduct(code) == 0) {
            throw new IllegalArgumentException("제품을 찾을 수 없습니다");
        }
    }

    // 저장 대상은 products 가 아니라 '버전' 이다. 사용중이 아닌 옛 버전을 고쳐도 실제 인쇄 내용은 바뀌지 않는다
    @Override
    public Map<String, Object> saveLabel(String code, LabelContentVO content, String who) throws Exception {
        requireProduct(code);
        ensureInitialVersion(code, true, who);
        Long vid = content.getVersionId();
        if (vid != null && vid != 0) {
            Map<String, Object> meta = labelRegisterDAO.selectVersionMeta(vid);
            if (meta == null || !code.equals(meta.get("productCode"))) {
                throw new IllegalArgumentException("이 제품의 라벨 버전이 아닙니다");
            }
        } else {
            vid = currentVersionId(code);
        }
        if (vid == null) {
            throw new IllegalArgumentException("라벨 버전을 찾을 수 없습니다");
        }
        Map<String, Object> values = contentValues(content);
        values.put("id", vid);
        values.put("extraJson", content.getExtra() == null ? null : PythonJson.dumps(content.getExtra()));
        values.put("now", now());
        values.put("who", who);
        labelRegisterDAO.updateVersionContent(values);
        boolean current = isCurrent(vid);
        if (current) {
            labelRegisterDAO.copyVersionToProducts(vid);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("versionId", vid);
        result.put("isCurrent", current);
        return result;
    }

    // 양식과 크기는 라벨 '내용' 이 아니라 '모양' 이라 따로 저장한다
    @Override
    public void saveLayout(String code, Map<String, Object> body, String who) throws Exception {
        requireProduct(code);
        ensureInitialVersion(code, true, who);
        Map<String, Object> layout = new LinkedHashMap<>(body == null ? new HashMap<String, Object>() : body);
        Long vid = toLong(layout.remove("versionId"));
        Long legacy = toLong(layout.remove("version_id"));
        if (vid == null) {
            vid = legacy;
        }
        if (vid == null) {
            vid = currentVersionId(code);
        }
        String json = PythonJson.dumps(layout);
        if (vid != null) {
            labelRegisterDAO.updateVersionLayout(vid, json);
            if (isCurrent(vid)) {
                labelRegisterDAO.updateProductLabelStyle(code, json);
            }
        } else {
            labelRegisterDAO.updateProductLabelStyle(code, json);
        }
    }

    // 새 버전은 '사용중' 이 아니다. 작업 중인 미완성 라벨이 생산현장에서 인쇄되는 일을 막는다
    @Override
    public Map<String, Object> newVersion(String code, LabelVersionRequestVO request, String who) throws Exception {
        requireProduct(code);
        ensureInitialVersion(code, true, who);
        Long srcId = request.getFromVersionId() != null && request.getFromVersionId() != 0 ? request.getFromVersionId() : currentVersionId(code);
        Map<String, Object> src = srcId == null ? null : labelRegisterDAO.selectVersionMeta(srcId);
        if (src == null || !code.equals(src.get("productCode"))) {
            throw new IllegalArgumentException("복사할 라벨 버전을 찾을 수 없습니다");
        }
        List<String> existing = labelRegisterDAO.selectVersionLabels(code, null);
        // 이름을 직접 지을 수 있다(예: '2026 표시사항 개정'). 비우면 지금까지 쓴 가장 큰 번호 다음(지운 번호와 겹치지 않게)
        String label = trim(request.getVersionLabel());
        if (!label.isEmpty()) {
            String err = checkVersionLabel(label, existing);
            if (err != null) {
                throw new IllegalArgumentException(err);
            }
        } else {
            label = nextVersionLabel(existing);
        }
        long id = labelRegisterDAO.insertVersionCopy(srcId, label, emptyToNull(trim(request.getNote())), now(), who);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", id);
        result.put("versionLabel", label);
        return result;
    }

    static String nextVersionLabel(List<String> existing) {
        int max = 0;
        for (String lbl : existing) {
            String s = lbl == null ? "" : lbl.replaceFirst("^[vV]+", "").trim();
            try {
                max = Math.max(max, Integer.parseInt(s));
            } catch (NumberFormatException ex) {
                // 숫자가 아닌 이름(예: '2026 개정')은 번호 매기기에서 뺀다
            }
        }
        return "v" + (max + 1);
    }

    static String checkVersionLabel(String label, List<String> existing) {
        if (label.length() > MAX_VERSION_LABEL) {
            return "버전 이름은 " + MAX_VERSION_LABEL + "자까지 넣을 수 있어요";
        }
        if (existing.contains(label)) {
            return "\"" + label + "\" 은 이미 있는 버전 이름이에요. 다른 이름으로 해주세요.";
        }
        return null;
    }

    @Override
    public void renameVersion(long id, LabelVersionRequestVO request) throws Exception {
        Map<String, Object> meta = requireVersion(id);
        String label = trim(request.getVersionLabel());
        if (label.isEmpty()) {
            throw new IllegalArgumentException("버전 이름을 넣어주세요");
        }
        String err = checkVersionLabel(label, labelRegisterDAO.selectVersionLabels((String) meta.get("productCode"), id));
        if (err != null) {
            throw new IllegalArgumentException(err);
        }
        labelRegisterDAO.updateVersionInfo(id, label, emptyToNull(trim(request.getNote())));
    }

    @Override
    public void useVersion(long id) throws Exception {
        Map<String, Object> meta = requireVersion(id);
        labelRegisterDAO.clearCurrent((String) meta.get("productCode"));
        labelRegisterDAO.setCurrent(id);
        labelRegisterDAO.copyVersionToProducts(id);
    }

    @Override
    public void deleteVersion(long id) throws Exception {
        Map<String, Object> meta = requireVersion(id);
        if (((Number) meta.get("isCurrent")).intValue() != 0) {
            throw new IllegalArgumentException("사용중인 버전은 지울 수 없습니다. 다른 버전을 사용중으로 지정한 뒤 지워주세요.");
        }
        if (labelDAO.countVersions((String) meta.get("productCode")) <= 1) {
            throw new IllegalArgumentException("마지막 남은 버전은 지울 수 없습니다");
        }
        labelRegisterDAO.deleteVersion(id);
    }

    private Map<String, Object> requireVersion(long id) throws Exception {
        Map<String, Object> meta = labelRegisterDAO.selectVersionMeta(id);
        if (meta == null) {
            throw new IllegalArgumentException("라벨 버전을 찾을 수 없습니다");
        }
        return meta;
    }

    private boolean isCurrent(long vid) throws Exception {
        Map<String, Object> meta = labelRegisterDAO.selectVersionMeta(vid);
        return meta != null && ((Number) meta.get("isCurrent")).intValue() != 0;
    }

    // 레시피가 같고 이름만 다른 제품은 표시사항이 거의 같다. 라벨을 실제로 만들어둔 제품만 보여준다
    @Override
    public List<LabelSourceProductVO> sourceProducts(String exclude, String q) throws Exception {
        return labelRegisterDAO.selectSourceProducts(exclude == null ? "" : exclude, trim(q));
    }

    // ===== 양식 =====
    // 이미 쓰고 있는 양식을 고치면 그 제품들의 라벨 모양이 모두 함께 바뀐다(화면이 먼저 몇 개인지 알려준다)
    @Override
    public long saveTemplate(Long id, LabelTemplateSaveVO request) throws Exception {
        String name = trim(request.getName());
        if (name.isEmpty()) {
            throw new IllegalArgumentException("양식 이름을 넣어주세요");
        }
        Map<String, Object> layout = request.getLayout() == null ? new LinkedHashMap<String, Object>() : request.getLayout();
        String err = LabelFormatValidator.check(layout);
        if (err != null) {
            throw new IllegalArgumentException(err);
        }
        String size = hasText(request.getSize()) ? request.getSize() : "100x150";
        if (id != null && labelRegisterDAO.countTemplate(id) == 0) {
            throw new IllegalArgumentException("양식을 찾을 수 없습니다");
        }
        if (labelRegisterDAO.countTemplateName(name, id) > 0) {
            throw new IllegalArgumentException("\"" + name + "\" 은 이미 있는 양식 이름이에요");
        }
        String json = PythonJson.dumps(layout);
        if (id == null) {
            return labelRegisterDAO.insertTemplate(name, size, json, now());
        }
        labelRegisterDAO.updateTemplate(id, name, size, json);
        return id;
    }

    @Override
    public void deleteTemplate(long id) throws Exception {
        labelRegisterDAO.deleteTemplate(id);
    }

    @Override
    public Map<String, Object> templateUsage(long id) throws Exception {
        List<Map<String, Object>> products = labelRegisterDAO.selectTemplateUsage(id);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("count", products.size());
        result.put("products", products);
        return result;
    }

    // ===== 마크 =====
    // 그림을 주소로 두지 않고 내용(data URL)을 그대로 담는다. 주소로 넣으면 그림을 다 받기 전에 인쇄가 시작될 수 있다
    @Override
    public long addMark(LabelMarkSaveVO request) throws Exception {
        String name = trim(request.getName());
        String dataUrl = trim(request.getDataUrl());
        if (name.isEmpty()) {
            throw new IllegalArgumentException("마크 이름을 넣어주세요");
        }
        if (name.length() > 30) {
            throw new IllegalArgumentException("마크 이름은 30자까지 넣을 수 있어요");
        }
        boolean allowed = false;
        for (String prefix : MARK_ALLOWED) {
            allowed = allowed || dataUrl.startsWith(prefix);
        }
        if (!allowed) {
            throw new IllegalArgumentException("PNG, JPG, GIF, SVG 그림만 넣을 수 있어요");
        }
        if (dataUrl.length() > MARK_MAX_BYTES) {
            throw new IllegalArgumentException("그림이 너무 큽니다. " + (MARK_MAX_BYTES / 1024) + "KB 이하로 줄여주세요");
        }
        Double width = toDouble(request.getWidthMm());
        double w = width == null || width == 0 ? 9 : width;
        w = Math.min(Math.max(w, 1), 100);
        if (labelRegisterDAO.countMarkName(name) > 0) {
            throw new IllegalArgumentException("\"" + name + "\" 은 이미 있는 마크 이름이에요");
        }
        return labelRegisterDAO.insertMark(name, dataUrl, w, now());
    }

    @Override
    public void deleteMark(long id) throws Exception {
        if (labelRegisterDAO.countMark(id) == 0) {
            throw new IllegalArgumentException("마크를 찾을 수 없습니다");
        }
        int used = labelRegisterDAO.countMarkUsage(id);
        if (used > 0) {
            throw new IllegalArgumentException("이 마크를 쓰는 라벨이 " + used + "개 있어서 지울 수 없어요");
        }
        labelRegisterDAO.deleteMark(id);
    }

    // ===== 항목 =====
    @Override
    public List<LabelFieldVO> listFields() throws Exception {
        return labelRegisterDAO.selectFields();
    }

    @Override
    public LabelFieldVO addField(String rawName) throws Exception {
        String name = trim(rawName);
        if (name.isEmpty()) {
            throw new IllegalArgumentException("항목 이름을 넣어주세요");
        }
        if (name.length() > 30) {
            throw new IllegalArgumentException("항목 이름은 30자까지 넣을 수 있어요");
        }
        if (labelRegisterDAO.countFieldName(name) > 0) {
            throw new IllegalArgumentException("\"" + name + "\" 은 이미 있는 항목이에요");
        }
        LabelFieldVO field = new LabelFieldVO();
        field.setId(labelRegisterDAO.insertField(name, now()));
        field.setName(name);
        return field;
    }

    // 쓰고 있는 항목을 지우면 양식에서 빈칸이 되어버린다
    @Override
    public void deleteField(long id) throws Exception {
        String name = labelRegisterDAO.selectFieldName(id);
        if (name == null) {
            throw new IllegalArgumentException("항목을 찾을 수 없습니다");
        }
        List<String> used = labelRegisterDAO.selectTemplatesUsingField(name);
        if (!used.isEmpty()) {
            throw new IllegalArgumentException("\"" + name + "\" 은 양식 " + used.size() + "개에서 쓰고 있어서 지울 수 없어요 ("
                    + String.join(", ", used.subList(0, Math.min(3, used.size()))) + ").");
        }
        labelRegisterDAO.deleteField(id);
    }

    @Override
    public void updateCompanyInfo(LabelVO info) throws Exception {
        Map<String, Object> values = new HashMap<>();
        values.put("returnExchangeLocation", info.getReturnExchangeLocation());
        values.put("customerServicePhone", info.getCustomerServicePhone());
        values.put("businessName", info.getBusinessName());
        values.put("businessAddress", info.getBusinessAddress());
        values.put("noticeText", info.getNoticeText());
        values.put("now", now());
        labelRegisterDAO.updateCompanyInfo(values);
    }

    // ===== 표시사항 요청 =====
    // 여기 오는 건은 확정 전이라 품목보고번호가 없는 것이 정상이다. 그것까지 따지면 영원히 '적는 중' 에서 못 벗어난다
    @Override
    public List<LabelRequestVO> listRequests(String status) throws Exception {
        List<LabelRequestVO> rows = labelRegisterDAO.selectRequests(trim(status));
        for (LabelRequestVO r : rows) {
            r.setFillState(fillState(r.getFoodType(), r.getNetWeight(), r.getIngredientsText()));
        }
        return rows;
    }

    // 라벨등록 창이 제품의 '버전' 을 받을 때와 같은 모양으로 돌려준다(창을 두 벌로 만들지 않으려면 들어오는 모양도 같아야 한다)
    @Override
    public LabelRequestVO getRequest(long id) throws Exception {
        LabelRequestVO r = labelRegisterDAO.selectRequest(id);
        if (r == null) {
            throw new IllegalArgumentException("요청을 찾을 수 없습니다");
        }
        r.setLayout(parseObject(r.getLayoutJson()));
        r.setExtra(parseObject(r.getExtraJson()));
        if (!hasText(r.getProductName())) {
            r.setProductName(r.getRecipeName());
        }
        r.setBom(labelRegisterDAO.selectRequestBom(r.getVersionId()));
        return r;
    }

    @Override
    public String saveRequest(long id, LabelContentVO content, String who) throws Exception {
        Map<String, Object> row = labelRegisterDAO.selectRequestMoved(id);
        if (row == null) {
            throw new IllegalArgumentException("요청을 찾을 수 없습니다");
        }
        String moved = (String) row.get("moved");
        if (hasText(moved)) {
            // 이미 제품으로 옮긴 뒤에 여기를 고치면 인쇄되는 라벨과 달라진다
            throw new IllegalArgumentException("이미 제품(" + moved + ")으로 옮긴 요청입니다. 라벨등록 탭에서 그 제품을 고쳐주세요.");
        }
        String status = "done".equals(content.getStatus()) ? "done" : "requested";
        Map<String, Object> values = contentValues(content);
        values.put("id", id);
        values.put("productName", content.getProductName());
        values.put("layoutJson", content.getLayout() == null ? null : PythonJson.dumps(content.getLayout()));
        values.put("extraJson", content.getExtra() == null ? null : PythonJson.dumps(content.getExtra()));
        values.put("note", content.getNote());
        values.put("status", status);
        values.put("now", now());
        values.put("who", who);
        labelRegisterDAO.updateRequest(values);
        return status;
    }

    // 옮기고 나면 이 요청은 끝난 것으로 두고, 이후 수정은 라벨등록에서 한다(적을 곳이 두 군데가 되면 안 된다)
    @Override
    public Map<String, Object> moveRequest(long id, String productCode, String who) throws Exception {
        String code = trim(productCode);
        if (code.isEmpty()) {
            throw new IllegalArgumentException("어느 제품으로 옮길지 골라주세요");
        }
        LabelRequestVO req = labelRegisterDAO.selectRequest(id);
        if (req == null) {
            throw new IllegalArgumentException("요청을 찾을 수 없습니다");
        }
        if (hasText(req.getMovedProductCode())) {
            throw new IllegalArgumentException("이미 제품(" + req.getMovedProductCode() + ")으로 옮겼습니다");
        }
        if (labelRegisterDAO.countProduct(code) == 0) {
            throw new IllegalArgumentException("그런 제품코드가 없습니다");
        }
        ensureInitialVersion(code, true, who);
        Long vid = currentVersionId(code);
        if (vid == null) {
            throw new IllegalArgumentException("라벨 버전을 찾을 수 없습니다");
        }
        Object[] fields = { req.getFoodType(), req.getNetWeight(), req.getIngredientsText(), req.getAllergens(), req.getManufactureReportNo(),
                req.getPackagingMaterial(), req.getShelfLifeMonths(), req.getShelfLifeUnit(), req.getStorage() };
        int copied = 0;
        for (Object v : fields) {
            if (v != null && !"".equals(v)) {
                copied++;
            }
        }
        Map<String, Object> values = new HashMap<>();
        values.put("id", vid);
        values.put("foodType", req.getFoodType());
        values.put("netWeight", req.getNetWeight());
        values.put("ingredientsText", req.getIngredientsText());
        values.put("allergens", req.getAllergens());
        values.put("manufactureReportNo", req.getManufactureReportNo());
        values.put("packagingMaterial", req.getPackagingMaterial());
        values.put("shelfLifeMonths", req.getShelfLifeMonths());
        values.put("shelfLifeUnit", req.getShelfLifeUnit());
        values.put("storage", req.getStorage());
        // 라벨의 모양(양식·크기·마크)과 양식별 항목도 같이 옮긴다. 내용만 옮기면 품질이 잡아놓은 모양을 다시 만들어야 한다
        values.put("layoutJson", req.getLayoutJson());
        values.put("extraJson", req.getExtraJson());
        values.put("now", now());
        values.put("who", who);
        labelRegisterDAO.updateVersionFromRequest(values);
        if (isCurrent(vid)) {
            labelRegisterDAO.copyVersionToProducts(vid);
        }
        labelRegisterDAO.markRequestMoved(id, code, now(), who);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("productCode", code);
        result.put("copiedFields", copied);
        return result;
    }

    // ===== 작은 도움 =====

    private static Map<String, Object> contentValues(LabelContentVO c) {
        Map<String, Object> values = new HashMap<>();
        values.put("foodType", c.getFoodType());
        values.put("netWeight", c.getNetWeight());
        values.put("ingredientsText", c.getIngredientsText());
        values.put("allergens", c.getAllergens());
        values.put("manufactureReportNo", c.getManufactureReportNo());
        values.put("packagingMaterial", c.getPackagingMaterial());
        values.put("shelfLifeMonths", intOrNull(c.getShelfLifeMonths()));
        values.put("shelfLifeUnit", hasText(c.getShelfLifeUnit()) ? c.getShelfLifeUnit() : null);
        values.put("storage", c.getStorage());
        return values;
    }

    /** 다 차면 done, 하나라도 있으면 partial, 하나도 없으면 none */
    static String fillState(String... values) {
        int filled = 0;
        for (String v : values) {
            if (hasText(v)) {
                filled++;
            }
        }
        return filled == values.length ? "done" : filled > 0 ? "partial" : "none";
    }

    /** 송연 _int_or_none: 숫자는 정수로(소수는 버림), 정수 글자만, 비었거나 아니면 null */
    static Integer intOrNull(Object value) {
        if (value == null || "".equals(value)) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        try {
            return Integer.valueOf(String.valueOf(value).trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static Long toLong(Object value) {
        Integer v = intOrNull(value);
        return v == null || v == 0 ? null : v.longValue();
    }

    private static Double toDouble(Object value) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        if (value instanceof String && !((String) value).trim().isEmpty()) {
            try {
                return Double.valueOf(((String) value).trim());
            } catch (NumberFormatException ex) {
                return null;
            }
        }
        return null;
    }

    private Map<String, Object> parseObject(String json) {
        if (!hasText(json)) {
            return new LinkedHashMap<>();
        }
        try {
            Map<String, Object> value = objectMapper.readValue(json, JSON_OBJECT);
            return value == null ? new LinkedHashMap<String, Object>() : value;
        } catch (Exception ex) {
            return new LinkedHashMap<>();
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

    private static String emptyToNull(String value) {
        return value == null || value.isEmpty() ? null : value;
    }
}
