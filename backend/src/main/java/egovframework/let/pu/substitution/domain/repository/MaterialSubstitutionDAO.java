package egovframework.let.pu.substitution.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.pu.substitution.domain.model.SubstitutionMaterialVO;
import egovframework.let.pu.substitution.domain.model.SubstitutionRecordVO;
import egovframework.let.pu.substitution.domain.model.SubstitutionScheduleVO;

/**
 * 구매관리 - 재료 치환등록 데이터 접근 클래스 (송연 production_schedule · production_material_substitution · bom · materials)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Repository("materialSubstitutionDAO")
public class MaterialSubstitutionDAO extends EgovAbstractMapper {

    public List<SubstitutionScheduleVO> selectSchedules(String date) throws Exception {
        return selectList("MaterialSubstitutionDAO.selectSchedules", date);
    }

    public SubstitutionScheduleVO selectSchedule(long id) throws Exception {
        return selectOne("MaterialSubstitutionDAO.selectSchedule", id);
    }

    public String selectProductCodeByDisplayName(String displayName) throws Exception {
        return selectOne("MaterialSubstitutionDAO.selectProductCodeByDisplayName", displayName);
    }

    public List<SubstitutionRecordVO> selectRecords(long scheduleId) throws Exception {
        return selectList("MaterialSubstitutionDAO.selectRecords", scheduleId);
    }

    public List<SubstitutionRecordVO> selectBomLines(String productCode) throws Exception {
        return selectList("MaterialSubstitutionDAO.selectBomLines", productCode);
    }

    public String selectMaterialName(String code) throws Exception {
        return selectOne("MaterialSubstitutionDAO.selectMaterialName", code);
    }

    public int countBomLine(String productCode, String materialCode) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("productCode", productCode);
        params.put("materialCode", materialCode);
        Integer count = selectOne("MaterialSubstitutionDAO.countBomLine", params);
        return count == null ? 0 : count;
    }

    public int countRecord(long scheduleId, String materialCode) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("scheduleId", scheduleId);
        params.put("materialCode", materialCode);
        Integer count = selectOne("MaterialSubstitutionDAO.countRecord", params);
        return count == null ? 0 : count;
    }

    public void insertRecord(SubstitutionRecordVO record) throws Exception {
        insert("MaterialSubstitutionDAO.insertRecord", record);
    }

    public int deleteRecord(long scheduleId, long id) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("scheduleId", scheduleId);
        params.put("id", id);
        return delete("MaterialSubstitutionDAO.deleteRecord", params);
    }

    public List<SubstitutionMaterialVO> selectMaterials() throws Exception {
        return selectList("MaterialSubstitutionDAO.selectMaterials");
    }
}
