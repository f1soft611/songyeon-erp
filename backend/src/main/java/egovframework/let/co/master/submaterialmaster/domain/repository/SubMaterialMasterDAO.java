package egovframework.let.co.master.submaterialmaster.domain.repository;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.co.master.materialmaster.domain.model.MaterialMasterVO;

/**
 * 공통관리 > 기초정보 > 부자재마스터 데이터 접근 클래스
 * @author SONGYEON ERP
 * @since 2026.10.20
 * @version 1.0
 */
@Repository("subMaterialMasterDAO")
public class SubMaterialMasterDAO extends EgovAbstractMapper {

    /** 부자재 목록. category 가 '' 이면 분류가 있는 원재료 전부 */
    public List<MaterialMasterVO> selectSubMaterialList(String category) throws Exception {
        return selectList("SubMaterialMasterDAO.selectSubMaterialList", category);
    }
}
