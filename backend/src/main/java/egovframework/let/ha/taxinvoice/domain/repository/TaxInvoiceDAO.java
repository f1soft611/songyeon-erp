package egovframework.let.ha.taxinvoice.domain.repository;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

/**
 * 인사·회계 - 세금계산서 데이터 접근 클래스 (송연 common.py _resolve_single_client 의 clients 읽기, 조회만)
 * 매출 줄은 매출·매입관리와 같은 것을 쓴다(accsales TradeRowReader).
 * @author SONGYEON ERP
 * @since 2026.10.15
 * @version 1.0
 */
@Repository("taxInvoiceDAO")
public class TaxInvoiceDAO extends EgovAbstractMapper {

    /** 이름이 똑같은 거래처 */
    public String selectExactClient(String name) throws Exception {
        return selectOne("TaxInvoiceDAO.selectExactClient", name);
    }

    /** 이름에 글자가 들어간 거래처(영문 대소문자 무시) */
    public List<String> selectClientsLike(String name) throws Exception {
        return selectList("TaxInvoiceDAO.selectClientsLike", name);
    }
}
