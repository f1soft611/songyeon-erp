package egovframework.let.co.master.materialmaster.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.co.master.materialmaster.domain.model.MaterialMasterVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialPriceLogVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialPriceScheduleVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialSupplierVO;
import egovframework.let.co.master.materialmaster.domain.model.MaterialUsageVO;

/**
 * 기초정보 - 원재료BOM·부자재BOM 데이터 접근 클래스 (송연 materials 와 딸린 표)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Repository("materialMasterDAO")
public class MaterialMasterDAO extends EgovAbstractMapper {

    /** 원재료 목록(부자재 포함, 마지막 사용일·납품업체 조인 포함). q 가 있으면 이름·코드 부분 일치. */
    public List<MaterialMasterVO> selectMaterialList(String q) throws Exception {
        return selectList("MaterialMasterDAO.selectMaterialList", q);
    }

    /** 납품업체 자동완성: 매입(또는 매입+매출) 거래처의 업체코드·업체명 */
    public List<MaterialSupplierVO> selectVendorClients() throws Exception {
        return selectList("MaterialMasterDAO.selectVendorClients");
    }

    /** 거래처코드로 거래처명을 찾는다. 없으면 null(2026-10-23). */
    public String selectClientNameByCode(String clientCode) throws Exception {
        return selectOne("MaterialMasterDAO.selectClientNameByCode", clientCode);
    }

    /** 원재료 한 개(코드·이름·단가·분류). 없으면 null. */
    /** 부자재 분류: 공통코드 SUB_MATERIAL_CATEGORY 의 사용 중 코드(2026-10-23) */
    public List<String> selectSubCategoryCodes() throws Exception {
        return selectList("MaterialMasterDAO.selectSubCategoryCodes");
    }

    /** 수정자 · 수정일시를 남긴다(2026-10-23). userId = 사원 사번 */
    /** 사용여부(Y/N)를 바꾸고 수정자 · 수정일시를 남긴다(2026-10-23). userId = 사원 사번 */
    public void updateMaterialUseYn(String code, String useYn, String userId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("useYn", useYn);
        params.put("userId", userId);
        update("MaterialMasterDAO.updateMaterialUseYn", params);
    }

    public void updateMaterialAudit(String code, String userId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("userId", userId);
        update("MaterialMasterDAO.updateMaterialAudit", params);
    }

    /** 단위: 공통코드 UNIT 의 사용 중 코드(2026-10-23) */
    public List<String> selectUnitCodes() throws Exception {
        return selectList("MaterialMasterDAO.selectUnitCodes");
    }

    public MaterialMasterVO selectMaterial(String code) throws Exception {
        return selectOne("MaterialMasterDAO.selectMaterial", code);
    }

    /** 이름·규격이 같은 원재료(띄어쓰기·대소문자 무시). excludeCode 는 뺀다. */
    public List<MaterialMasterVO> selectSameMaterials(String name, String spec, String excludeCode) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("name", name);
        params.put("spec", spec);
        params.put("excludeCode", excludeCode);
        return selectList("MaterialMasterDAO.selectSameMaterials", params);
    }

    /** 신규 원재료. 코드는 숫자 코드 최대값 + 1 을 6자리로 채워 발번하고 material.code 에 넣는다. */
    public void insertMaterial(MaterialMasterVO material) throws Exception {
        insert("MaterialMasterDAO.insertMaterial", material);
    }

    /** 보내온 칸(fields)만 고친다. 이름·예전 구매업체 칸은 늘 고친다. */
    public void updateMaterialInfo(MaterialMasterVO row, Set<String> fields) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("row", row);
        params.put("fields", fields);
        update("MaterialMasterDAO.updateMaterialInfo", params);
    }

    /** 제품BOM 의 원재료명을 코드로 찾아 바꾼다. 바꾼 줄 수. */
    public int updateBomMaterialName(String code, String name) throws Exception {
        return update("MaterialMasterDAO.updateBomMaterialName", codeName(code, name));
    }

    /** 레시피 배합표의 원재료명을 코드로 찾아 바꾼다. 바꾼 줄 수. */
    public int updateRecipeBomMaterialName(String code, String name) throws Exception {
        return update("MaterialMasterDAO.updateRecipeBomMaterialName", codeName(code, name));
    }

    /** 이 이름을 쓰는 원재료 수 */
    public long countMaterialsByName(String name) throws Exception {
        Long count = selectOne("MaterialMasterDAO.countMaterialsByName", name);
        return count == null ? 0L : count;
    }

    /** 코드가 안 적힌 옛 레시피 줄 중 이 이름인 것의 수 */
    public long countNamelessRecipeBom(String name) throws Exception {
        Long count = selectOne("MaterialMasterDAO.countNamelessRecipeBom", name);
        return count == null ? 0L : count;
    }

    /** 코드가 안 적힌 옛 레시피 줄을 새 이름·코드로 바꾼다. 바꾼 줄 수. */
    public int updateNamelessRecipeBom(String oldName, String name, String code) throws Exception {
        Map<String, Object> params = codeName(code, name);
        params.put("oldName", oldName);
        return update("MaterialMasterDAO.updateNamelessRecipeBom", params);
    }

    /** 배합비 역전개: 이 원재료를 쓰는 제품(배합비율 높은 순) */
    public List<MaterialUsageVO> selectMaterialUsage(String code) throws Exception {
        return selectList("MaterialMasterDAO.selectMaterialUsage", code);
    }

    /** 이 원재료를 쓰는 제품코드. productCodes 가 있으면 그 안에서만. */
    public List<String> selectBomProductCodesByMaterial(String code, List<String> productCodes) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("productCodes", productCodes);
        return selectList("MaterialMasterDAO.selectBomProductCodesByMaterial", params);
    }

    /** 고른 제품들의 배합표에서 이 원재료를 다른 원재료로 바꾼다(적용단가 다시 계산). */
    public void updateBomMaterial(String code, MaterialMasterVO newMaterial, List<String> productCodes) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("newCode", newMaterial.getCode());
        params.put("newName", newMaterial.getName());
        params.put("newPrice", newMaterial.getUnitPrice());
        params.put("productCodes", productCodes);
        update("MaterialMasterDAO.updateBomMaterial", params);
    }

    /** 제품 배합표 적용단가 합계(원재료비). 줄이 없으면 0. */
    public Double selectBomAmountSum(String productCode) throws Exception {
        Double sum = selectOne("MaterialMasterDAO.selectBomAmountSum", productCode);
        return sum == null ? 0d : sum;
    }

    public void updateMaterialPrice(String code, Double unitPrice) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("unitPrice", unitPrice);
        update("MaterialMasterDAO.updateMaterialPrice", params);
    }

    /** 단가가 바뀌면 그 원재료를 쓰는 배합표의 단가·적용단가도 따라 바꾼다. */
    public void updateBomPriceByMaterial(String code, Double unitPrice) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("unitPrice", unitPrice);
        update("MaterialMasterDAO.updateBomPriceByMaterial", params);
    }

    public void insertMaterialPriceLog(String code, String name, String changedAt, Double oldPrice, Double newPrice) throws Exception {
        Map<String, Object> params = codeName(code, name);
        params.put("changedAt", changedAt);
        params.put("oldPrice", oldPrice);
        params.put("newPrice", newPrice);
        insert("MaterialMasterDAO.insertMaterialPriceLog", params);
    }

    public List<MaterialPriceLogVO> selectMaterialPriceLog(String code) throws Exception {
        return selectList("MaterialMasterDAO.selectMaterialPriceLog", code);
    }

    public void insertMaterialPriceSchedule(String code, String name, Double newPrice, String effectiveDate, String createdAt)
            throws Exception {
        Map<String, Object> params = codeName(code, name);
        params.put("newPrice", newPrice);
        params.put("effectiveDate", effectiveDate);
        params.put("createdAt", createdAt);
        insert("MaterialMasterDAO.insertMaterialPriceSchedule", params);
    }

    public List<MaterialPriceScheduleVO> selectMaterialPriceSchedule(String code) throws Exception {
        return selectList("MaterialMasterDAO.selectMaterialPriceSchedule", code);
    }

    /** 아직 적용 안 된 예약만 지운다. */
    public void deleteMaterialPriceSchedule(Long id) throws Exception {
        delete("MaterialMasterDAO.deleteMaterialPriceSchedule", id);
    }

    /** 적용일자가 오늘이거나 지난, 아직 적용 안 된 예약 */
    public List<MaterialPriceScheduleVO> selectDueMaterialPriceSchedules(String today) throws Exception {
        return selectList("MaterialMasterDAO.selectDueMaterialPriceSchedules", today);
    }

    public void markMaterialPriceScheduleApplied(Long id) throws Exception {
        update("MaterialMasterDAO.markMaterialPriceScheduleApplied", id);
    }

    private Map<String, Object> codeName(String code, String name) {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("name", name);
        return params;
    }
}
