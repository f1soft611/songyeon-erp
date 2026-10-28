package egovframework.let.co.master.materialmaster.service;

import java.util.List;
import java.util.Map;

import egovframework.let.co.master.materialmaster.domain.model.MaterialCreateRequestVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialInfoSaveResultVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialMasterVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialPriceLogVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialPriceRequestVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialPriceSaveResultVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialPriceScheduleVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialReplaceRequestVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialSupplierVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialUsageVO;

/**
 * 기초정보 - 원재료BOM·부자재BOM 서비스 인터페이스 클래스
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
public interface MaterialMasterService {

    /** 원재료 목록(부자재 포함, 납품업체 포함). 보기 전에 적용일자가 된 예약 단가를 반영한다. */
    List<MaterialMasterVO> listMaterials(String q) throws Exception;

    /** 목록을 보기 전에 날짜가 된 예약 단가를 반영한다(원재료 · 부자재 목록이 같이 쓴다) */
    void applyDuePriceSchedules() throws Exception;

    /** 목록 줄마다 납품업체(코드 · 이름)를 붙인다(원재료 · 부자재 목록이 같이 쓴다) */
    void attachSuppliers(List<MaterialMasterVO> rows);

    /** 납품업체 자동완성(매입 거래처의 업체코드·업체명) */
    List<MaterialSupplierVO> listVendors() throws Exception;

    /** 이름·규격이 같은 원재료(띄어쓰기·대소문자 무시). excludeCode 는 뺀다(자기 자신). */
    List<MaterialMasterVO> listSameMaterials(String name, String spec, String excludeCode) throws Exception;

    /** 신규 원재료를 만들고 발번한 코드를 돌려준다. 단가를 함께 넣으면 변경로그도 남긴다. */
    String createMaterial(MaterialCreateRequestVO payload) throws Exception;

    /** 보내온 칸만 고친다. 이름을 바꾸면 배합표·레시피도 따라가고 어디까지 바뀌었는지 돌려준다. */
    MaterialInfoSaveResultVO saveMaterialInfo(String code, Map<String, Object> body) throws Exception;

    /** 적용일자가 앞날이면 예약만, 아니면 바로 바꾸면서 배합표·단가표까지 따라 고친다. */
    MaterialPriceSaveResultVO saveMaterialPrice(String code, MaterialPriceRequestVO payload) throws Exception;

    /** 수정자 · 수정일시를 남긴다(2026-10-23, 기본정보 · 바로 반영한 단가 저장 뒤). employeeId = 사원 사번 */
    void markMaterialUpdated(String code, String employeeId) throws Exception;

    /** 사용여부 바꾸기(2026-10-23, Y/N 만). employeeId = 사원 사번(수정자) */
    void updateMaterialUseYn(String code, String useYn, String employeeId) throws Exception;

    List<MaterialPriceLogVO> listPriceLog(String code) throws Exception;

    /** 예약 단가변경(보기 전에 적용일자가 된 예약을 반영한다) */
    List<MaterialPriceScheduleVO> listPriceSchedule(String code) throws Exception;

    /** 아직 적용 안 된 예약을 취소한다. */
    void cancelPriceSchedule(Long id) throws Exception;

    /** 배합비 역전개: 이 원재료를 쓰는 제품 */
    List<MaterialUsageVO> listUsage(String code) throws Exception;

    /** 일괄적용: 고른 제품들의 배합표에서 이 원재료를 다른 것으로 바꾸고 단가표를 다시 계산한다. 바꾼 제품 수. */
    int replaceMaterial(String code, MaterialReplaceRequestVO payload) throws Exception;
}
