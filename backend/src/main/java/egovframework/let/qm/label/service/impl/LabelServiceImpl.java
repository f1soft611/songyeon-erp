package egovframework.let.qm.label.service.impl;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import egovframework.let.qm.label.domain.model.LabelVO;
import egovframework.let.qm.label.domain.repository.LabelDAO;
import egovframework.let.qm.label.service.LabelService;

/**
 * 제품 라벨(표시사항) 조회 서비스 구현 클래스 (송연 LabelService 를 옮김).
 *
 * 라벨은 인쇄해서 제품에 붙여 내보내는 물건이라, 고친 뒤에도 그때 뭐라고 찍혔는지 남아야 한다.
 * 그래서 제품마다 버전을 쌓고, '사용중' 버전 하나만 실제로 인쇄한다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Service("labelService")
public class LabelServiceImpl extends EgovAbstractServiceImpl implements LabelService {

    private static final DateTimeFormatter CREATED_AT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final TypeReference<Map<String, Object>> JSON_OBJECT = new TypeReference<Map<String, Object>>() { };

    private final LabelDAO labelDAO;
    private final ObjectMapper objectMapper;

    public LabelServiceImpl(LabelDAO labelDAO, ObjectMapper objectMapper) {
        this.labelDAO = labelDAO;
        this.objectMapper = objectMapper;
    }

    @Override
    public Map<String, Object> listVersions(String code, String employeeId) throws Exception {
        if (labelDAO.countProduct(code) == 0) {
            throw new IllegalArgumentException("제품을 찾을 수 없습니다");
        }
        ensureInitialVersion(code, employeeId);
        Long currentId = currentVersionId(code);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("versions", labelDAO.selectVersions(code));
        result.put("currentId", currentId);
        return result;
    }

    // 라벨을 만든 적이 있는가는 라벨에만 쓰는 네 칸으로 본다.
    // 보관방법은 제품BOM 에서도 쓰는 값이라 그것만 있는 제품에 빈 버전이 생기면 안 된다.
    private void ensureInitialVersion(String code, String employeeId) throws Exception {
        if (labelDAO.countVersions(code) > 0) {
            return;
        }
        LabelVO product = labelDAO.selectProductLabel(code);
        if (product == null) {
            return;
        }
        boolean hasContent = hasText(product.getFoodType()) || hasText(product.getNetWeight())
                || hasText(product.getIngredientsText()) || hasText(product.getManufactureReportNo());
        if (!hasContent) {
            return;
        }
        product.setProductCode(code);
        product.setVersionLabel("v1");
        product.setIsCurrent(1);
        product.setCreatedAt(LocalDateTime.now(ZoneId.of("Asia/Seoul")).format(CREATED_AT));
        product.setCreatedBy(employeeId); // 2026-10-26 만든 사람 사번(예전에는 비어 있었다)
        labelDAO.insertVersion(product);
    }

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

    @Override
    public LabelVO getVersion(long id) throws Exception {
        LabelVO version = labelDAO.selectVersion(id);
        if (version == null) {
            throw new IllegalArgumentException("라벨 버전을 찾을 수 없습니다");
        }
        version.setLayout(parseObject(version.getLayoutJson()));
        version.setExtra(parseObject(version.getExtraJson()));
        // 예전에 저장된 라벨은 단위가 없다. 송연과 같이 '월' 로 본다.
        if (version.getShelfLifeMonths() != null && !hasText(version.getShelfLifeUnit())) {
            version.setShelfLifeUnit("월");
        }
        return version;
    }

    @Override
    public List<LabelVO> listTemplates() throws Exception {
        return labelDAO.selectTemplates();
    }

    @Override
    public LabelVO getTemplate(long id) throws Exception {
        LabelVO template = labelDAO.selectTemplate(id);
        if (template == null) {
            throw new IllegalArgumentException("템플릿을 찾을 수 없습니다");
        }
        template.setLayout(parseObject(template.getLayoutJson()));
        return template;
    }

    @Override
    public List<LabelVO> listMarks() throws Exception {
        return labelDAO.selectMarks();
    }

    @Override
    public LabelVO getCompanyInfo() throws Exception {
        LabelVO info = labelDAO.selectCompanyInfo();
        return info == null ? new LabelVO() : info;
    }

    @Override
    public List<LabelVO> getProductBom(String code) throws Exception {
        return labelDAO.selectProductBom(code);
    }

    // 원재료에 한 번 적어두면 그 원재료를 쓰는 제품이 모두 같은 답을 얻는다.
    @Override
    public Map<String, Object> getBomAllergens(String code) throws Exception {
        Set<String> items = new LinkedHashSet<>();
        List<Map<String, Object>> sources = new ArrayList<>();
        for (LabelVO row : labelDAO.selectBomAllergens(code)) {
            List<String> names = new ArrayList<>();
            for (String part : (row.getAllergens() == null ? "" : row.getAllergens()).split("[,·/]")) {
                if (!part.trim().isEmpty()) {
                    names.add(part.trim());
                }
            }
            items.addAll(names);
            if (!names.isEmpty()) {
                Map<String, Object> source = new LinkedHashMap<>();
                source.put("materialName", row.getMaterialName());
                source.put("allergens", names);
                sources.add(source);
            }
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("allergens", new ArrayList<>(items));
        result.put("text", String.join(", ", items));
        result.put("sources", sources);
        return result;
    }

    // DB 의 JSON 글자를 객체로. 비었거나 깨졌으면 빈 객체(송연과 같음).
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

    private static boolean hasText(String value) {
        return value != null && !value.isEmpty();
    }
}
