package egovframework.let.co.master.partnermaster.domain.repository;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.co.master.partnermaster.domain.model.ClientTypeVO;
import egovframework.let.co.master.partnermaster.domain.model.PartnerMasterVO;

/**
 * 기초정보 - 거래처마스터 데이터 접근 클래스
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Repository("partnerMasterDAO")
public class PartnerMasterDAO extends EgovAbstractMapper {

    /** 거래처 목록을 이름 순으로 조회한다. */
    public List<PartnerMasterVO> selectClientList() throws Exception {
        return selectList("PartnerMasterDAO.selectClientList");
    }

    /** 거래처 한 곳을 조회한다. 없으면 null. */
    public PartnerMasterVO selectClient(Long id) throws Exception {
        return selectOne("PartnerMasterDAO.selectClient", id);
    }

    /** 이름이 같은 거래처를 조회한다. 없으면 null. */
    public PartnerMasterVO selectClientByName(String name) throws Exception {
        return selectOne("PartnerMasterDAO.selectClientByName", name);
    }

    /** 거래처 분류: 공통코드 CUSTOMER_CATEGORY 의 사용 중 항목(2026-10-23) */
    public List<ClientTypeVO> selectClientTypes() throws Exception {
        return selectList("PartnerMasterDAO.selectClientTypes");
    }

    /** 6자리 숫자 거래처코드 가운데 가장 큰 번호. 없으면 null(2026-10-23) */
    public Integer selectMaxClientCodeNo() throws Exception {
        return selectOne("PartnerMasterDAO.selectMaxClientCodeNo");
    }

    /** 같은 거래처코드가 몇 개인지 */
    public int countClientCode(String clientCode) throws Exception {
        Integer n = selectOne("PartnerMasterDAO.countClientCode", clientCode);
        return n == null ? 0 : n;
    }

    public void insertClient(PartnerMasterVO client) throws Exception {
        insert("PartnerMasterDAO.insertClient", client);
    }

    public void updateClient(PartnerMasterVO client) throws Exception {
        update("PartnerMasterDAO.updateClient", client);
    }
}
