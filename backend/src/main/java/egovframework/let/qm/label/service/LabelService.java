package egovframework.let.qm.label.service;

import java.util.List;
import java.util.Map;

import egovframework.let.qm.label.domain.model.LabelVO;

/**
 * 제품 라벨(표시사항) 조회 서비스 인터페이스 클래스 (송연 LabelService).
 * 라벨출력·생산확정(🏷️ 라벨)·라벨등록이 함께 쓴다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
public interface LabelService {

    /** 버전 목록 {versions, currentId}. 옛 products 라벨이 있으면 v1 을 만들고, 사용중이 없으면 최근 것을 사용중으로 삼는다(송연과 같음). */
    /** 2026-10-26 employeeId: 처음 열 때 v1 을 만들면 만든 사람(사번)으로 남긴다 */
    Map<String, Object> listVersions(String code, String employeeId) throws Exception;

    LabelVO getVersion(long id) throws Exception;

    List<LabelVO> listTemplates() throws Exception;

    LabelVO getTemplate(long id) throws Exception;

    List<LabelVO> listMarks() throws Exception;

    LabelVO getCompanyInfo() throws Exception;

    List<LabelVO> getProductBom(String code) throws Exception;

    /** 배합표 원재료의 알러지유발물질 {allergens, text, sources}. 겹치면 한 번만, 함량 많은 원재료부터. */
    Map<String, Object> getBomAllergens(String code) throws Exception;
}
