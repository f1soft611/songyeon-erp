package egovframework.let.co.master.boxtype.service;

import java.util.List;

import egovframework.let.co.master.boxtype.domain.model.BoxTypeVO;

/**
 * 기준정보 - 포장유형 서비스 인터페이스 클래스 (tb_box_type, 사업장 F001 · 사업부 P001 고정)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 2.0 (2026.10.19 tb_box_type 으로 변경)
 */
public interface BoxTypeService {

    /** 사용 중인 포장유형 목록(정렬순서 → 이름 순) */
    List<BoxTypeVO> listBoxTypes() throws Exception;

    /** includeUnused 가 true 면 사용안함(삭제한) 줄도 같이 준다(포장유형 화면 조회 조건) */
    List<BoxTypeVO> listBoxTypes(boolean includeUnused) throws Exception;

    /**
     * 저장. boxTypeId 가 없으면 새로 등록, 있으면 그 줄을 덮어쓴다(적용기간 · 이력은 관리하지 않는다).
     * employeeId 는 로그인한 사원의 사번(employees.id). 그 값을 등록자 · 수정자에 넣는다.
     * 이름 필수. 새 줄의 코드는 비우면 서버가 BT001 … 로 매긴다(직접 주면 사용 중인 코드와 겹치면 안 된다). 비율은 0~100(%), 금액은 0 이상, 비우면 0.
     */
    void saveBoxType(BoxTypeVO payload, String employeeId) throws Exception;

    /** 물리 삭제(2026-10-22, 공통코드 관리와 같음). 사용안함은 저장할 때 useYn = 'N' */
    void deleteBoxType(Long boxTypeId, String employeeId) throws Exception;
}
