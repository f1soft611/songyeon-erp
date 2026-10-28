package egovframework.let.co.master.warehouse.service;

import java.util.List;

import egovframework.let.co.master.warehouse.domain.model.WarehouseSaveRequestVO;
import egovframework.let.co.master.warehouse.domain.model.WarehouseVO;

/**
 * 기초정보 - 창고등록 서비스 인터페이스 클래스 (tb_warehouse)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 2.0 (2026.10.19 tb_warehouse 로 변경)
 */
public interface WarehouseService {

    /**
     * 사용 중인 창고 목록(두고 있는 원재료 수 · 등록자 · 수정자 포함)을 조회한다.
     *
     * @exception Exception
     */
    List<WarehouseVO> listWarehouses() throws Exception;

    /** includeUnused 가 true 면 사용안함(삭제한) 줄도 같이 준다(창고등록 화면 조회 조건) */
    List<WarehouseVO> listWarehouses(boolean includeUnused) throws Exception;

    /**
     * 창고를 등록한다. 창고코드는 서버가 매긴다.
     *
     * @param employeeId 로그인한 사원의 사번(employees.id). 등록자에 넣는다
     * @exception Exception
     */
    void createWarehouse(WarehouseSaveRequestVO payload, String employeeId) throws Exception;

    /**
     * 창고를 수정한다. 이름을 바꾸면 그 창고를 쓰던 원재료 · 재고 · 입고도 같이 바꾼다.
     *
     * @return 같이 옮긴 원재료 수
     * @exception Exception
     */
    int updateWarehouse(Long id, WarehouseSaveRequestVO payload, String employeeId) throws Exception;
}
