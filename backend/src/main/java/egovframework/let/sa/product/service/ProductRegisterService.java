package egovframework.let.sa.product.service;

import egovframework.let.sa.product.domain.model.ProductRegisterRequestVO;
import egovframework.let.sa.product.domain.model.ProductRegisterVO;

/**
 * 영업관리 - 제품등록 서비스 인터페이스 클래스
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
public interface ProductRegisterService {

    /**
     * 한 트랜잭션: 제품(제품코드 발번) → 배합비 → 단가표. 어느 하나라도 실패하면 모두 취소된다.
     *
     * @return 발번한 제품코드와 원재료비
     * @exception Exception 같은 때 같은 제품코드가 나오면 DuplicateKeyException(부르는 쪽이 다시 시도)
     */
    ProductRegisterVO registerProduct(ProductRegisterRequestVO payload) throws Exception;
}
