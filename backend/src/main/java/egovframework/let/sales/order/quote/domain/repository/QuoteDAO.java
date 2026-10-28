package egovframework.let.sa.quote.domain.repository;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.sa.quote.domain.model.QuoteVO;

/**
 * 영업관리 - 견적 데이터 접근 클래스 (송연 quotes)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Repository("quoteDAO")
public class QuoteDAO extends EgovAbstractMapper {

    /** 견적 목록(최근 것부터) */
    public List<QuoteVO> selectQuoteList() throws Exception {
        return selectList("QuoteDAO.selectQuoteList");
    }

    /** 견적 한 건. 없으면 null. */
    public QuoteVO selectQuote(long quoteId) throws Exception {
        return selectOne("QuoteDAO.selectQuote", quoteId);
    }

    /** 견적 상태(draft/confirmed, 비었으면 빈 글자). 없으면 null. */
    public String selectQuoteStatus(long quoteId) throws Exception {
        return selectOne("QuoteDAO.selectQuoteStatus", quoteId);
    }

    /** 넣은 뒤 quote.quoteId 에 새 ID 가 채워진다. */
    public void insertQuote(QuoteVO quote) throws Exception {
        insert("QuoteDAO.insertQuote", quote);
    }

    public int updateQuote(QuoteVO quote) throws Exception {
        return update("QuoteDAO.updateQuote", quote);
    }

    public int deleteQuote(long quoteId) throws Exception {
        return delete("QuoteDAO.deleteQuote", quoteId);
    }
}
