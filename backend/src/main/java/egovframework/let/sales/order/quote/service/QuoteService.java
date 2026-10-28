package egovframework.let.sales.order.quote.service;

import java.util.List;

import egovframework.let.sales.order.quote.domain.model.QuoteSaveRequestVO;
import egovframework.let.sales.order.quote.domain.model.QuoteVO;

/**
 * 영업관리 - 견적 서비스 인터페이스 클래스
 * (견적 확정은 제품등록에서 그 견적으로 제품을 등록할 때 함께 한다)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
public interface QuoteService {

    /** 견적 목록(최근 것부터) */
    List<QuoteVO> listQuotes() throws Exception;

    /** 견적 상세(저장해 둔 배합비 포함). 없으면 막는다. */
    QuoteVO getQuote(long quoteId) throws Exception;

    /** 가견적 작성: 제품명 필수, 거래처는 거래처BOM 이름만. 원가를 계산해 견적단가를 정한다. */
    QuoteVO createQuote(QuoteSaveRequestVO request) throws Exception;

    /** 가견적 수정: 없거나 확정된 견적은 막는다. */
    QuoteVO updateQuote(long quoteId, QuoteSaveRequestVO request) throws Exception;

    void deleteQuote(long quoteId) throws Exception;
}
