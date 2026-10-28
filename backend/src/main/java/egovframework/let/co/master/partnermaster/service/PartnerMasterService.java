package egovframework.let.co.master.partnermaster.service;

import java.util.List;

import egovframework.let.co.master.partnermaster.domain.model.PartnerMasterVO;
import egovframework.let.co.master.partnermaster.domain.model.ClientTypeVO;

/**
 * 기초정보 - 거래처마스터 서비스 인터페이스 클래스
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
public interface PartnerMasterService {

    /**
     * 거래처 목록을 이름 순으로 조회한다.
     *
     * @exception Exception
     */
    List<PartnerMasterVO> listClients() throws Exception;

    /**
     * 거래처를 등록한다. 거래처명·분류 필수, 같은 이름 불가, 사업자등록번호는 검산 후 모양을 맞춘다.
     *
     * @exception Exception
     */
    void createClient(PartnerMasterVO payload) throws Exception;

    /**
     * 거래처를 수정한다. 이름 겹침은 미리 보지 않는다(송연과 같음).
     *
     * @exception Exception
     */
    void updateClient(Long id, PartnerMasterVO payload) throws Exception;

    /**
     * 거래처 분류: 공통코드 CUSTOMER_CATEGORY 의 사용 중 항목(2026-10-23).
     *
     * @exception Exception
     */
    List<ClientTypeVO> listClientTypes() throws Exception;
}
