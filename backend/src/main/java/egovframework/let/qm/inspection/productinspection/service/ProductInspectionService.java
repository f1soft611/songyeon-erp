package egovframework.let.qm.inspection.productinspection.service;

import java.util.List;

import egovframework.let.qm.inspection.productinspection.domain.model.InspectionLotVO;
import egovframework.let.qm.inspection.productinspection.domain.model.ProductSpecRowVO;
import egovframework.let.qm.inspection.productinspection.domain.model.ProductSpecStatsVO;

/**
 * 품질관리 - 제품검사 서비스 인터페이스 (송연 qdocs.py). 2026-11-06 제품별 기준 탭 · 검사 탭 조회만
 * @author SONGYEON ERP
 * @since 2026.11.06
 * @version 1.0
 */
public interface ProductInspectionService {

    /** 제품별 기준 목록. only: 빈 값 · 유형있음 · 유형없음 · 규격있음 · 규격없음 */
    List<ProductSpecRowVO> listProductSpecs(String q, String only) throws Exception;

    /** 요약: 제품 수 · 식품유형 정한 수 · 규격 넣은 수 */
    ProductSpecStatsVO specStats() throws Exception;

    /** 검사 탭 로트. dateBy: 빈 값 · made(제조일) · ship(출고일). 기간은 start · end 가 둘 다 있을 때만 */
    List<InspectionLotVO> listLots(String start, String end, String dateBy, boolean planned) throws Exception;
}
