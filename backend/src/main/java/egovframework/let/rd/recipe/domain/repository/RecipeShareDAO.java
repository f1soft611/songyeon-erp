package egovframework.let.rd.recipe.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.rd.recipe.domain.model.RecipeHandoffVO;
import egovframework.let.rd.recipe.domain.model.RecipeShareVO;

/**
 * 상품개발 - 레시피 검색·공유 · 공유 로그 데이터 접근 클래스 (송연 recipe_handoffs · recipe_shares, 넘길 때 quotes · label_requests)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Repository("recipeShareDAO")
public class RecipeShareDAO extends EgovAbstractMapper {

    private static Map<String, Object> params(Object... keyValues) {
        Map<String, Object> map = new HashMap<>();
        for (int i = 0; i + 1 < keyValues.length; i += 2) {
            map.put((String) keyValues[i], keyValues[i + 1]);
        }
        return map;
    }

    /** {draftId, versionLabel, draftName, draftSpec, clientName, stage} 또는 null */
    public Map<String, Object> selectHandoffSource(long versionId) throws Exception {
        return selectOne("RecipeShareDAO.selectHandoffSource", versionId);
    }

    public int countHandoff(long versionId, String kind) throws Exception {
        Integer n = selectOne("RecipeShareDAO.countHandoff", params("versionId", versionId, "kind", kind));
        return n == null ? 0 : n;
    }

    /** {materialName, ratio(0~1), unitPrice, materialCode} 함량이 많은 것부터 */
    public List<Map<String, Object>> selectHandoffBom(long versionId) throws Exception {
        return selectList("RecipeShareDAO.selectHandoffBom", versionId);
    }

    public long insertQuote(Map<String, Object> values) throws Exception {
        insert("RecipeShareDAO.insertQuote", values);
        return ((Number) values.get("quoteId")).longValue();
    }

    public String selectUsername(String employeeId) throws Exception {
        return employeeId == null ? null : selectOne("RecipeShareDAO.selectUsername", employeeId);
    }

    public long insertHandoff(Map<String, Object> values) throws Exception {
        insert("RecipeShareDAO.insertHandoff", values);
        return ((Number) values.get("id")).longValue();
    }

    public int insertLabelRequest(long handoffId, String ingredientsText, String now) throws Exception {
        return insert("RecipeShareDAO.insertLabelRequest", params("handoffId", handoffId, "ingredientsText", ingredientsText, "now", now));
    }

    public int lockVersion(long versionId, String stage) throws Exception {
        return update("RecipeShareDAO.lockVersion", params("versionId", versionId, "stage", stage));
    }

    public int insertStageLog(Map<String, Object> values) throws Exception {
        return insert("RecipeShareDAO.insertStageLog", values);
    }

    public int touchDraft(long draftId, String now) throws Exception {
        return update("RecipeShareDAO.touchDraft", params("draftId", draftId, "now", now));
    }

    public List<RecipeHandoffVO> selectHandoffs(Map<String, Object> filter) throws Exception {
        return selectList("RecipeShareDAO.selectHandoffs", filter);
    }

    public List<RecipeShareVO> selectShares() throws Exception {
        return selectList("RecipeShareDAO.selectShares");
    }

    public Long selectVersionDraftId(long versionId) throws Exception {
        return selectOne("RecipeShareDAO.selectVersionDraftId", versionId);
    }

    public Long selectLatestVersionId(long draftId) throws Exception {
        return selectOne("RecipeShareDAO.selectLatestVersionId", draftId);
    }

    public int insertShare(Map<String, Object> values) throws Exception {
        return insert("RecipeShareDAO.insertShare", values);
    }

    public int deleteShare(long id) throws Exception {
        return delete("RecipeShareDAO.deleteShare", id);
    }
}
