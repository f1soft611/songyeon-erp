package egovframework.let.common.inventory.service;

import egovframework.let.common.inventory.domain.model.ProductStockMovementVO;

/**
 * 공통 재고 원장 서비스 인터페이스 클래스 (송연 InventoryService)
 * 화면 하나의 것이 아니라 여러 업무(생산입고·출하확정·재고조정)가 함께 쓰는 규칙이다.
 * 재고 숫자와 원장은 항상 같이 움직인다(따로 두면 언젠가 한쪽만 부르는 곳이 생긴다).
 * 스스로 트랜잭션을 끝내지 않는다 — 부르는 쪽 트랜잭션 안에서 함께 저장·취소된다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
public interface InventoryService {

    /**
     * 제품 재고를 qty 만큼 움직이고 원장에 한 줄 남긴다(들어오면 +, 나가면 -).
     * options 의 제품명·일자·출처·거래처·비고·누가를 원장에 적는다.
     * @return 움직인 뒤 재고(움직이지 않았으면 null)
     */
    Double moveProductStock(String productCode, double qty, String kind, ProductStockMovementVO options) throws Exception;

    /** 원재료·부자재 재고를 늘리거나 줄이고 수불 한 줄을 남긴다 */
    void moveMaterialStock(String materialCode, double delta, String note) throws Exception;

    /**
     * 만든 만큼 필름과 파우치를 뺀다(생산입고). 봉지 수 = 생산량 / 한 봉 내용량, 필름 M = 봉지 수 × 한 봉당 길이,
     * 파우치 = 봉지 수 × 한 봉당 파우치 수. deltaKg 가 음수면 뺐던 만큼 되돌린다. 연결이 없으면 조용히 건너뛴다.
     */
    void applyFilmPouchUsage(String productCode, double deltaKg, String note) throws Exception;

    /** 출하 때 박스를 뺀다(박스 수 양수 = 빠짐, 음수 = 되돌림). 제품에 박스가 연결돼 있지 않으면 건너뛴다. */
    void applyBoxUsage(String productCode, double boxDelta, String note) throws Exception;
}
