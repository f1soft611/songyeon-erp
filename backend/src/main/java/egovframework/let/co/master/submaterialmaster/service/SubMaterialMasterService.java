package egovframework.let.co.master.submaterialmaster.service;

import java.util.List;

import egovframework.let.co.master.materialmaster.domain.model.MaterialMasterVO;

/**
 * 공통관리 > 기초정보 > 부자재마스터 서비스 인터페이스 클래스
 * @author SONGYEON ERP
 * @since 2026.10.20
 * @version 1.0
 */
public interface SubMaterialMasterService {

    /**
     * 부자재 목록(분류가 있는 원재료). category 를 주면 그 분류만.
     *
     * @exception Exception
     */
    List<MaterialMasterVO> listSubMaterials(String category) throws Exception;
}
