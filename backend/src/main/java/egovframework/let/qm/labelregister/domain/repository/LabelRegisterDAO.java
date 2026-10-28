package egovframework.let.qm.labelregister.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.qm.labelregister.domain.model.LabelFieldVO;
import egovframework.let.qm.labelregister.domain.model.LabelProductRowVO;
import egovframework.let.qm.labelregister.domain.model.LabelRequestBomVO;
import egovframework.let.qm.labelregister.domain.model.LabelRequestVO;
import egovframework.let.qm.labelregister.domain.model.LabelSourceProductVO;

/**
 * 품질관리 - 라벨등록 데이터 접근 클래스 (송연 product_label_versions · products · label_templates · label_marks · label_fields ·
 * label_company_info · label_requests · recipe_handoffs · recipe_drafts · recipe_version_bom)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Repository("labelRegisterDAO")
public class LabelRegisterDAO extends EgovAbstractMapper {

    private static Map<String, Object> params(Object... keyValues) {
        Map<String, Object> map = new HashMap<>();
        for (int i = 0; i + 1 < keyValues.length; i += 2) {
            map.put((String) keyValues[i], keyValues[i + 1]);
        }
        return map;
    }

    private static long newId(Map<String, Object> params) {
        return ((Number) params.get("id")).longValue();
    }

    public List<LabelProductRowVO> selectProducts(String q) throws Exception {
        return selectList("LabelRegisterDAO.selectProducts", params("q", q));
    }

    public int countProduct(String code) throws Exception {
        Integer n = selectOne("LabelRegisterDAO.countProduct", code);
        return n == null ? 0 : n;
    }

    /** 버전의 {productCode, isCurrent}. 없으면 null */
    public Map<String, Object> selectVersionMeta(long id) throws Exception {
        return selectOne("LabelRegisterDAO.selectVersionMeta", id);
    }

    public int updateVersionContent(Map<String, Object> values) throws Exception {
        return update("LabelRegisterDAO.updateVersionContent", values);
    }

    public int copyVersionToProducts(long versionId) throws Exception {
        return update("LabelRegisterDAO.copyVersionToProducts", versionId);
    }

    public List<String> selectVersionLabels(String code, Long excludeId) throws Exception {
        return selectList("LabelRegisterDAO.selectVersionLabels", params("code", code, "excludeId", excludeId));
    }

    public long insertVersionCopy(long fromId, String versionLabel, String note, String now, String who) throws Exception {
        Map<String, Object> p = params("fromId", fromId, "versionLabel", versionLabel, "note", note, "now", now, "who", who);
        insert("LabelRegisterDAO.insertVersionCopy", p);
        return newId(p);
    }

    public int updateVersionInfo(long id, String versionLabel, String note) throws Exception {
        return update("LabelRegisterDAO.updateVersionInfo", params("id", id, "versionLabel", versionLabel, "note", note));
    }

    public int clearCurrent(String code) throws Exception {
        return update("LabelRegisterDAO.clearCurrent", code);
    }

    public int setCurrent(long id) throws Exception {
        return update("LabelRegisterDAO.setCurrent", id);
    }

    public int deleteVersion(long id) throws Exception {
        return delete("LabelRegisterDAO.deleteVersion", id);
    }

    public int updateVersionLayout(long id, String layoutJson) throws Exception {
        return update("LabelRegisterDAO.updateVersionLayout", params("id", id, "layoutJson", layoutJson));
    }

    public int updateProductLabelStyle(String code, String layoutJson) throws Exception {
        return update("LabelRegisterDAO.updateProductLabelStyle", params("code", code, "layoutJson", layoutJson));
    }

    public List<LabelSourceProductVO> selectSourceProducts(String exclude, String q) throws Exception {
        return selectList("LabelRegisterDAO.selectSourceProducts", params("exclude", exclude, "q", q));
    }

    // ===== 양식 =====
    public int countTemplateName(String name, Long excludeId) throws Exception {
        Integer n = selectOne("LabelRegisterDAO.countTemplateName", params("name", name, "excludeId", excludeId));
        return n == null ? 0 : n;
    }

    public int countTemplate(long id) throws Exception {
        Integer n = selectOne("LabelRegisterDAO.countTemplate", id);
        return n == null ? 0 : n;
    }

    public long insertTemplate(String name, String size, String layoutJson, String now) throws Exception {
        Map<String, Object> p = params("name", name, "size", size, "layoutJson", layoutJson, "now", now);
        insert("LabelRegisterDAO.insertTemplate", p);
        return newId(p);
    }

    public int updateTemplate(long id, String name, String size, String layoutJson) throws Exception {
        return update("LabelRegisterDAO.updateTemplate", params("id", id, "name", name, "size", size, "layoutJson", layoutJson));
    }

    public int deleteTemplate(long id) throws Exception {
        return delete("LabelRegisterDAO.deleteTemplate", id);
    }

    public List<Map<String, Object>> selectTemplateUsage(long id) throws Exception {
        return selectList("LabelRegisterDAO.selectTemplateUsage", id);
    }

    // ===== 마크 =====
    public int countMarkName(String name) throws Exception {
        Integer n = selectOne("LabelRegisterDAO.countMarkName", name);
        return n == null ? 0 : n;
    }

    public long insertMark(String name, String dataUrl, double widthMm, String now) throws Exception {
        Map<String, Object> p = params("name", name, "dataUrl", dataUrl, "widthMm", widthMm, "now", now);
        insert("LabelRegisterDAO.insertMark", p);
        return newId(p);
    }

    public int countMark(long id) throws Exception {
        Integer n = selectOne("LabelRegisterDAO.countMark", id);
        return n == null ? 0 : n;
    }

    public int countMarkUsage(long id) throws Exception {
        Integer n = selectOne("LabelRegisterDAO.countMarkUsage", id);
        return n == null ? 0 : n;
    }

    public int deleteMark(long id) throws Exception {
        return delete("LabelRegisterDAO.deleteMark", id);
    }

    // ===== 항목 =====
    public List<LabelFieldVO> selectFields() throws Exception {
        return selectList("LabelRegisterDAO.selectFields");
    }

    public int countFieldName(String name) throws Exception {
        Integer n = selectOne("LabelRegisterDAO.countFieldName", name);
        return n == null ? 0 : n;
    }

    public long insertField(String name, String now) throws Exception {
        Map<String, Object> p = params("name", name, "now", now);
        insert("LabelRegisterDAO.insertField", p);
        return newId(p);
    }

    public String selectFieldName(long id) throws Exception {
        return selectOne("LabelRegisterDAO.selectFieldName", id);
    }

    public List<String> selectTemplatesUsingField(String name) throws Exception {
        return selectList("LabelRegisterDAO.selectTemplatesUsingField", name);
    }

    public int deleteField(long id) throws Exception {
        return delete("LabelRegisterDAO.deleteField", id);
    }

    // ===== 회사 고정정보 =====
    public int updateCompanyInfo(Map<String, Object> values) throws Exception {
        return update("LabelRegisterDAO.updateCompanyInfo", values);
    }

    // ===== 표시사항 요청 =====
    public List<LabelRequestVO> selectRequests(String status) throws Exception {
        return selectList("LabelRegisterDAO.selectRequests", params("status", status));
    }

    public LabelRequestVO selectRequest(long id) throws Exception {
        return selectOne("LabelRegisterDAO.selectRequest", id);
    }

    public List<LabelRequestBomVO> selectRequestBom(Long versionId) throws Exception {
        return selectList("LabelRegisterDAO.selectRequestBom", versionId);
    }

    /** {id, moved}. 요청이 없으면 null */
    public Map<String, Object> selectRequestMoved(long id) throws Exception {
        return selectOne("LabelRegisterDAO.selectRequestMoved", id);
    }

    public int updateRequest(Map<String, Object> values) throws Exception {
        return update("LabelRegisterDAO.updateRequest", values);
    }

    public int updateVersionFromRequest(Map<String, Object> values) throws Exception {
        return update("LabelRegisterDAO.updateVersionFromRequest", values);
    }

    public int markRequestMoved(long id, String code, String now, String who) throws Exception {
        return update("LabelRegisterDAO.markRequestMoved", params("id", id, "code", code, "now", now, "who", who));
    }
}
