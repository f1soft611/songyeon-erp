package egovframework.let.co.master.itemmaster.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.co.master.itemmaster.domain.model.BomLineVO;
import egovframework.let.co.master.itemmaster.domain.model.ClientOptionVO;
import egovframework.let.co.master.itemmaster.domain.model.BomLogVO;
import egovframework.let.co.master.itemmaster.domain.model.MaterialOptionVO;
import egovframework.let.co.master.itemmaster.domain.model.PricingCostsVO;
import egovframework.let.co.master.itemmaster.domain.model.ProductBomVO;
import egovframework.let.co.master.itemmaster.domain.model.ProductSubMaterialsVO;

/**
 * 기초정보 - 제품BOM 데이터 접근 클래스 (송연 products · bom · bom_change_log · pricing · materials · clients)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Repository("itemMasterDAO")
public class ItemMasterDAO extends EgovAbstractMapper {

    /** 제품 목록(원재료 수·마지막생산일 포함). includeDiscontinued 가 false 면 사용안함 제품은 뺀다. */
    public List<ProductBomVO> selectProductList(boolean includeDiscontinued) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("includeDiscontinued", includeDiscontinued);
        return selectList("ItemMasterDAO.selectProductList", params);
    }

    /** 제품 한 개(코드·이름·업체명·재고). 없으면 null. */
    public ProductBomVO selectProduct(String code) throws Exception {
        return selectOne("ItemMasterDAO.selectProduct", code);
    }

    /** 수정자 · 수정일시를 남긴다(2026-10-23). userId = 사원 사번 */
    public void updateProductAudit(String code, String userId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("userId", userId);
        update("ItemMasterDAO.updateProductAudit", params);
    }

    /** clientCode = 거래처코드(2026-10-23, 예전에는 거래처 이름) */
    public void updateProductInfo(String code, String name, String storage, String clientCode) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("name", name);
        params.put("storage", storage);
        params.put("clientCode", clientCode);
        update("ItemMasterDAO.updateProductInfo", params);
    }

    /** 단가표의 제품명도 같이 바꾼다. */
    public void updatePricingProductName(String code, String name) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("name", name);
        update("ItemMasterDAO.updatePricingProductName", params);
    }

    public void updateProductDiscontinued(ProductBomVO product) throws Exception {
        update("ItemMasterDAO.updateProductDiscontinued", product);
    }

    /** 배합비(원재료명은 원재료BOM 이름 우선) */
    public List<BomLineVO> selectBom(String code) throws Exception {
        return selectList("ItemMasterDAO.selectBom", code);
    }

    public void deleteBom(String code) throws Exception {
        delete("ItemMasterDAO.deleteBom", code);
    }

    public void insertBomLine(String code, BomLineVO line) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("line", line);
        insert("ItemMasterDAO.insertBomLine", params);
    }

    /** 단가표 원가 항목. 단가표가 없으면 null. */
    public PricingCostsVO selectPricingCosts(String code) throws Exception {
        return selectOne("ItemMasterDAO.selectPricingCosts", code);
    }

    public void updatePricingMaterialCost(String code, double materialCost, double totalPrice) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("materialCost", materialCost);
        params.put("totalPrice", totalPrice);
        update("ItemMasterDAO.updatePricingMaterialCost", params);
    }

    public void insertBomLog(String code, String changedAt, String oldBomJson, String newBomJson) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("changedAt", changedAt);
        params.put("oldBomJson", oldBomJson);
        params.put("newBomJson", newBomJson);
        insert("ItemMasterDAO.insertBomLog", params);
    }

    /** 변경로그(최근 것 먼저) */
    public List<BomLogVO> selectBomLog(String code) throws Exception {
        return selectList("ItemMasterDAO.selectBomLog", code);
    }

    /** 부자재. 제품이 없으면 null. */
    public ProductSubMaterialsVO selectSubMaterials(String code) throws Exception {
        return selectOne("ItemMasterDAO.selectSubMaterials", code);
    }

    public void updateSubMaterials(String code, ProductSubMaterialsVO subMaterials) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("code", code);
        params.put("sub", subMaterials);
        update("ItemMasterDAO.updateSubMaterials", params);
    }

    /** 원재료 고르기 목록(이름순) */
    public List<MaterialOptionVO> selectMaterialOptions() throws Exception {
        return selectList("ItemMasterDAO.selectMaterialOptions");
    }

    /** 이름으로 원재료 찾기. 같은 이름이 여럿이면 preferCode 를 먼저. 없으면 null. */
    public MaterialOptionVO selectMaterialByName(String name, String preferCode) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("name", name);
        params.put("preferCode", preferCode);
        return selectOne("ItemMasterDAO.selectMaterialByName", params);
    }

    /** 코드 또는 이름으로 원재료 찾기(부자재 지정). 없으면 null. */
    public MaterialOptionVO selectMaterialByCodeOrName(String value) throws Exception {
        List<MaterialOptionVO> found = selectList("ItemMasterDAO.selectMaterialByCodeOrName", value);
        return found.isEmpty() ? null : found.get(0);
    }

    /** 보관방법: 공통코드 STORAGE_METHOD 의 사용 중 코드(2026-10-23) */
    public List<String> selectStorageCodes() throws Exception {
        return selectList("ItemMasterDAO.selectStorageCodes");
    }

    /** 거래처 고르기 목록: 사용 중 거래처 코드 · 이름(2026-10-23) */
    public List<ClientOptionVO> selectClientOptions() throws Exception {
        return selectList("ItemMasterDAO.selectClientOptions");
    }

    /** 거래처마스터에 있는 거래처코드면 그 코드(사용안함 포함), 없으면 null(2026-10-27) */
    public String selectRegisteredClientCode(String clientCode) throws Exception {
        return selectOne("ItemMasterDAO.selectRegisteredClientCode", clientCode);
    }

    /** 사용 중 거래처코드면 그 코드, 아니면 null(2026-10-23) */
    public String selectActiveClientCode(String clientCode) throws Exception {
        return selectOne("ItemMasterDAO.selectActiveClientCode", clientCode);
    }

    /** 거래처BOM 이름 목록 */
    public List<String> selectClientNames() throws Exception {
        return selectList("ItemMasterDAO.selectClientNames");
    }

    /** 거래처BOM 에 있는 이름이면 그 이름, 없으면 null */
    public String selectClientName(String name) throws Exception {
        return selectOne("ItemMasterDAO.selectClientName", name);
    }
}
