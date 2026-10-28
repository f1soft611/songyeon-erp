package egovframework.let.co.master.itemmaster.service;

import java.util.List;

import egovframework.let.co.master.itemmaster.domain.model.BomLineInputVO;
import egovframework.let.co.master.itemmaster.domain.model.BomLineVO;
import egovframework.let.co.master.itemmaster.domain.model.ClientOptionVO;
import egovframework.let.co.master.itemmaster.domain.model.BomLogVO;
import egovframework.let.co.master.itemmaster.domain.model.MaterialCheckVO;
import egovframework.let.co.master.itemmaster.domain.model.MaterialOptionVO;
import egovframework.let.co.master.itemmaster.domain.model.ProductBomVO;
import egovframework.let.co.master.itemmaster.domain.model.ProductInfoSaveRequestVO;
import egovframework.let.co.master.itemmaster.domain.model.ProductSubMaterialsVO;
import egovframework.let.co.master.itemmaster.domain.model.SubMaterialsSaveRequestVO;

/**
 * 기초정보 - 제품BOM 서비스 인터페이스 클래스
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
public interface ItemMasterService {

    /** 제품 목록. includeDiscontinued 가 false 면 사용안함 제품은 뺀다. */
    List<ProductBomVO> listProducts(boolean includeDiscontinued) throws Exception;

    /** 배합비 */
    List<BomLineVO> getBom(String code) throws Exception;

    /** 기본정보(제품명·보관방법·업체명) 저장. 제품명을 바꾸면 단가표 제품명도 같이 바꾼다. */
    void saveProductInfo(String code, ProductInfoSaveRequestVO payload) throws Exception;

    /** 사용안함/되돌리기. 재고가 남아 있으면 사용안함으로 바꿀 수 없다. */
    void setDiscontinued(String code, boolean discontinued, String note, String userName) throws Exception;

    /** 배합비를 통째로 다시 적고, 단가표 원재료비를 다시 계산하고, 변경로그를 남긴다. 다시 계산한 원재료비를 돌려준다. */
    double saveBom(String code, List<BomLineInputVO> input) throws Exception;

    /** 변경로그(최근 것 먼저) */
    List<BomLogVO> getBomLog(String code) throws Exception;

    /** 부자재 */
    ProductSubMaterialsVO getSubMaterials(String code) throws Exception;

    /** 부자재 저장. 각 칸에는 그 분류로 등록된 원재료만 넣을 수 있다. */
    void saveSubMaterials(String code, SubMaterialsSaveRequestVO payload) throws Exception;

    /** 수정자 · 수정일시를 남긴다(2026-10-23, 제품 창 · 사용여부 저장 뒤). employeeId = 사원 사번 */
    void markProductUpdated(String code, String employeeId) throws Exception;

    /** 원재료 고르기 목록 */
    List<MaterialOptionVO> listMaterials() throws Exception;

    /** 거래처BOM 이름 목록 */
    List<String> listClientNames() throws Exception;

    /** 원재료명 확인: 정확히 같으면 exact, 아니면 비슷한 이름 최대 4개 */
    List<MaterialCheckVO> checkMaterials(List<String> names) throws Exception;

    /**
     * 화면의 배합비 줄(배합비율은 퍼센트)을 저장할 줄로 바꾼다: 원재료를 찾아 코드·단가를 채우고(화면 단가 우선)
     * 적용단가 = 배합비율/100 × 단가. 이름 없는 줄은 건너뛴다. 영업관리 제품등록도 같은 규칙을 쓴다.
     */
    List<BomLineVO> resolveBomLines(List<BomLineInputVO> input) throws Exception;

    /** 거래처BOM 에 있는 이름이면 그 이름, 비우면 null, 없는 이름이면 비슷한 이름을 안내하며 막는다. */
    String resolveRegisteredClient(String raw) throws Exception;

    /** 보관방법(2026-10-23): 비우면 null, 공통코드 STORAGE_METHOD 의 사용 중 코드만 받는다. 제품등록도 같이 쓴다 */
    String resolveStorageCode(String raw) throws Exception;

    /** 거래처 고르기 목록(2026-10-23): 사용 중 거래처 코드 · 이름 */
    List<ClientOptionVO> listClientOptions() throws Exception;

    /**
     * 거래처코드 확인(2026-10-23, 화면이 목록에서 고른 코드를 그대로 저장한다).
     * 비우면 null, 지금 저장된 코드(current)와 같으면 그대로(사용안함이 돼도 둔다), 아니면 사용 중 거래처코드만 받는다.
     */
    String resolveClientCode(String raw, String current) throws Exception;
}
