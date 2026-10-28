package egovframework.let.rd.recipe.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.rd.recipe.domain.model.RecipeBomVO;
import egovframework.let.rd.recipe.domain.model.RecipeClientVO;
import egovframework.let.rd.recipe.domain.model.RecipeDraftVO;
import egovframework.let.rd.recipe.domain.model.RecipeSalesRepVO;
import egovframework.let.rd.recipe.domain.model.RecipeStageLogVO;
import egovframework.let.rd.recipe.domain.model.RecipeVersionVO;

/**
 * 상품개발 - 레시피 작성 데이터 접근 클래스 (송연 recipe_clients · recipe_drafts · recipe_versions · recipe_version_bom · recipe_stage_logs)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Repository("recipeDAO")
public class RecipeDAO extends EgovAbstractMapper {

    private static Map<String, Object> params(Object... keyValues) {
        Map<String, Object> map = new HashMap<>();
        for (int i = 0; i + 1 < keyValues.length; i += 2) {
            map.put((String) keyValues[i], keyValues[i + 1]);
        }
        return map;
    }

    private static int count(Integer n) {
        return n == null ? 0 : n;
    }

    public List<RecipeClientVO> selectClients() throws Exception {
        return selectList("RecipeDAO.selectClients");
    }

    public int countEmployee(String id) throws Exception {
        return count(selectOne("RecipeDAO.countEmployee", id));
    }

    public Long selectClientId(String clientName) throws Exception {
        return selectOne("RecipeDAO.selectClientId", clientName);
    }

    public int updateClientRep(long id, String salesEmpId, String now) throws Exception {
        return update("RecipeDAO.updateClientRep", params("id", id, "salesEmpId", salesEmpId, "now", now));
    }

    /** 폴더 줄이 없으면 만든다(이미 있으면 그대로) */
    public int insertClient(String clientName, String salesEmpId, String createdBy, String now, String updatedAt) throws Exception {
        return insert("RecipeDAO.insertClient", params("clientName", clientName, "salesEmpId", salesEmpId, "createdBy", createdBy, "now", now, "updatedAt", updatedAt));
    }

    public List<RecipeSalesRepVO> selectSalesReps() throws Exception {
        return selectList("RecipeDAO.selectSalesReps");
    }

    public List<RecipeDraftVO> selectDrafts(Map<String, Object> filter) throws Exception {
        return selectList("RecipeDAO.selectDrafts", filter);
    }

    public List<RecipeDraftVO> selectDraftsByStage(Map<String, Object> filter) throws Exception {
        return selectList("RecipeDAO.selectDraftsByStage", filter);
    }

    public RecipeDraftVO selectDraft(long id) throws Exception {
        return selectOne("RecipeDAO.selectDraft", id);
    }

    public List<RecipeVersionVO> selectVersions(long draftId) throws Exception {
        return selectList("RecipeDAO.selectVersions", draftId);
    }

    public RecipeVersionVO selectVersion(long id) throws Exception {
        return selectOne("RecipeDAO.selectVersion", id);
    }

    public List<RecipeBomVO> selectVersionBom(long versionId) throws Exception {
        return selectList("RecipeDAO.selectVersionBom", versionId);
    }

    public List<Map<String, Object>> selectOldBomCodes(long versionId) throws Exception {
        return selectList("RecipeDAO.selectOldBomCodes", versionId);
    }

    /** {code, unitPrice} 또는 null */
    public Map<String, Object> selectMaterialByCodeAndName(String code, String name) throws Exception {
        return selectOne("RecipeDAO.selectMaterialByCodeAndName", params("code", code, "name", name));
    }

    public Map<String, Object> selectMaterialByName(String name) throws Exception {
        return selectOne("RecipeDAO.selectMaterialByName", name);
    }

    public int deleteVersionBom(long versionId) throws Exception {
        return delete("RecipeDAO.deleteVersionBom", versionId);
    }

    public int insertBom(long versionId, String materialCode, String materialName, Double weight, double ratio, Double unitPrice, Double amount, int rank) throws Exception {
        return insert("RecipeDAO.insertBom", params("versionId", versionId, "materialCode", materialCode, "materialName", materialName, "weight", weight,
                "ratio", ratio, "unitPrice", unitPrice, "amount", amount, "rank", rank));
    }

    public int copyBom(long fromId, long toId) throws Exception {
        return insert("RecipeDAO.copyBom", params("fromId", fromId, "toId", toId));
    }

    public long insertDraft(Map<String, Object> values) throws Exception {
        insert("RecipeDAO.insertDraft", values);
        return ((Number) values.get("id")).longValue();
    }

    public long insertVersion(long draftId, String versionLabel, String note, String now) throws Exception {
        Map<String, Object> p = params("draftId", draftId, "versionLabel", versionLabel, "note", note, "now", now);
        insert("RecipeDAO.insertVersion", p);
        return ((Number) p.get("id")).longValue();
    }

    public int updateDraft(Map<String, Object> values) throws Exception {
        return update("RecipeDAO.updateDraft", values);
    }

    public int touchDraft(long id, String now) throws Exception {
        return update("RecipeDAO.touchDraft", params("id", id, "now", now));
    }

    public int updateVersionNote(long id, String note) throws Exception {
        return update("RecipeDAO.updateVersionNote", params("id", id, "note", note));
    }

    /** [{id, versionLabel}] 오래된 것부터 */
    public List<Map<String, Object>> selectVersionLabels(long draftId) throws Exception {
        return selectList("RecipeDAO.selectVersionLabels", draftId);
    }

    public void deleteDraftAll(long draftId) throws Exception {
        delete("RecipeDAO.deleteDraftBoms", draftId);
        delete("RecipeDAO.deleteDraftVersions", draftId);
        delete("RecipeDAO.deleteDraftShares", draftId);
        delete("RecipeDAO.deleteDraftStageLogs", draftId);
        delete("RecipeDAO.deleteDraft", draftId);
    }

    public List<RecipeStageLogVO> selectStageLogs(long draftId) throws Exception {
        return selectList("RecipeDAO.selectStageLogs", draftId);
    }
}
