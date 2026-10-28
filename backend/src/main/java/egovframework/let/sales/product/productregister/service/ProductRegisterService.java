package egovframework.let.sales.product.productregister.service;

import egovframework.let.sales.product.productregister.domain.model.ProductRegisterRequestVO;
import egovframework.let.sales.product.productregister.domain.model.ProductRegisterVO;

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

    /**
     * 방금 등록한 제품을 지운다(2026-10-28, 제품등록 [삭제]). 한 트랜잭션: 확정한 견적을 가견적으로 돌리고 배합비 · 배합비 이력 · 단가표 · 제품을 지운다.
     * 재고가 있거나 수주 · 판매 · 생산 · 물류 · 출하 · 라벨에 쓰인 제품은 막는다(제품마스터에서 사용안함으로 바꾼다).
     */
    void deleteProduct(String productCode) throws Exception;
}
