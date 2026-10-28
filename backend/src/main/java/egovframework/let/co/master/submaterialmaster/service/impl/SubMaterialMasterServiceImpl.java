package egovframework.let.co.master.submaterialmaster.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.co.master.materialmaster.domain.model.MaterialMasterVO;
import egovframework.let.co.master.materialmaster.service.MaterialMasterService;
import egovframework.let.co.master.submaterialmaster.domain.repository.SubMaterialMasterDAO;
import egovframework.let.co.master.submaterialmaster.service.SubMaterialMasterService;

/**
 * 공통관리 > 기초정보 > 부자재마스터 서비스 구현 클래스
 * 목록을 보기 전 준비(예약 단가 반영)와 납품업체 붙이기는 원재료와 같은 규칙이라 원재료마스터 서비스에 맡긴다.
 * @author SONGYEON ERP
 * @since 2026.10.20
 * @version 1.0
 */
@Service("subMaterialMasterService")
public class SubMaterialMasterServiceImpl extends EgovAbstractServiceImpl implements SubMaterialMasterService {

    private final SubMaterialMasterDAO subMaterialMasterDAO;
    private final MaterialMasterService materialMasterService;

    public SubMaterialMasterServiceImpl(SubMaterialMasterDAO subMaterialMasterDAO, MaterialMasterService materialMasterService) {
        this.subMaterialMasterDAO = subMaterialMasterDAO;
        this.materialMasterService = materialMasterService;
    }

    @Override
    public List<MaterialMasterVO> listSubMaterials(String category) throws Exception {
        materialMasterService.applyDuePriceSchedules();
        List<MaterialMasterVO> rows = subMaterialMasterDAO.selectSubMaterialList(category == null ? "" : category.trim());
        materialMasterService.attachSuppliers(rows);
        return rows;
    }
}
