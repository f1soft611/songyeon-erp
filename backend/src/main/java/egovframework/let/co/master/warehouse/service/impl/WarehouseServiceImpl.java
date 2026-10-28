package egovframework.let.co.master.warehouse.service.impl;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import egovframework.let.co.master.warehouse.domain.model.WarehouseSaveRequestVO;
import egovframework.let.co.master.warehouse.domain.model.WarehouseVO;
import egovframework.let.co.master.warehouse.domain.repository.WarehouseDAO;
import egovframework.let.co.master.warehouse.service.WarehouseService;

/**
 * 기초정보 - 창고등록 서비스 구현 클래스 (tb_warehouse)
 * 사업장 · 사업부는 F001 / P001 로 고정한다(송연에는 사업장 개념이 없다).
 * 원재료 등은 창고코드로 창고를 가리킨다(2026-10-26). 창고는 지우지 않는다(2026-10-27 행삭제 제거, 사용안함은 상태 체크박스).
 * 기본창고는 전체에서 한 곳이고 그곳이 입고창고다(2026-10-19 사용자 결정). 마지막 한 곳은 끌 수 없다.
 * 창고코드는 화면에서 받지 않고 서버가 6자리 숫자로 매긴다(2026-10-22): 표 전체 6자리 숫자 코드의 최댓값 + 1, 없으면 000001. 옛 WH-… 줄은 그대로.
 * 상태(use_yn)는 저장할 때 함께 바꾼다(사용안함 줄도 고칠 수 있음).
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 2.0 (2026.10.19 tb_warehouse 로 변경)
 */
@Service("warehouseService")
public class WarehouseServiceImpl extends EgovAbstractServiceImpl implements WarehouseService {

    static final String FACTORY_CODE = "F001";
    static final String PLANT_CODE = "P001";
    static final int CODE_WIDTH = 6;
    // 표 CHECK(ck_wh_type) 와 같은 값
    static final List<String> WAREHOUSE_TYPES = Arrays.asList("원자재", "부자재", "재공", "완제품", "반품", "보류", "폐기", "외부");

    static final String REQUIRED_MESSAGE = "창고 이름은 필수입니다";
    static final String TYPE_MESSAGE = "창고유형을 골라주세요";
    static final String DUPLICATE_MESSAGE = "이미 등록된 창고입니다";
    static final String NOT_FOUND_MESSAGE = "없는 창고입니다";
    static final String RACE_MESSAGE = "방금 다른 사람이 먼저 저장했어요. 새로고침 후 확인해주세요.";
    static final String LAST_RECEIVING_MESSAGE = "입고가 들어오는 창고는 한 곳은 있어야 해요. 다른 창고를 먼저 지정해주세요";

    private final WarehouseDAO warehouseDAO;

    public WarehouseServiceImpl(WarehouseDAO warehouseDAO) {
        this.warehouseDAO = warehouseDAO;
    }

    private static Map<String, Object> site() {
        Map<String, Object> p = new HashMap<>();
        p.put("factoryCode", FACTORY_CODE);
        p.put("plantCode", PLANT_CODE);
        return p;
    }

    @Override
    public List<WarehouseVO> listWarehouses() throws Exception {
        return listWarehouses(false);
    }

    @Override
    public List<WarehouseVO> listWarehouses(boolean includeUnused) throws Exception {
        Map<String, Object> p = site();
        p.put("includeUnused", includeUnused);
        return warehouseDAO.selectWarehouseList(p);
    }

    @Override
    @Transactional
    public void createWarehouse(WarehouseSaveRequestVO payload, String employeeId) throws Exception {
        Map<String, Object> p = fields(payload);
        p.put("warehouseId", null);
        if (warehouseDAO.countActiveName(p) > 0) {
            throw new IllegalArgumentException(DUPLICATE_MESSAGE);
        }
        p.put("userId", employeeId);
        // 기본창고로 켜서 등록하면 다른 기본창고를 끈다
        boolean wantDefault = Boolean.TRUE.equals(payload.getDefaultYn());
        if (wantDefault) {
            warehouseDAO.clearDefaultWarehouse(p);
        }
        p.put("defaultYn", wantDefault ? "Y" : "N");
        p.put("useYn", useYnOf(payload));
        Integer max = warehouseDAO.selectMaxSortSeq(site());
        p.put("sortSeq", (max == null ? 0 : max) + 10);
        // 창고코드: 서버가 6자리 숫자로 매긴다(보낸 값은 쓰지 않는다). 코드는 표 전체에서 하나뿐이다(사용안함 줄 포함)
        p.put("warehouseCd", nextCode());
        try {
            warehouseDAO.insertWarehouse(p);
        } catch (DuplicateKeyException ex) {
            throw new IllegalArgumentException(RACE_MESSAGE);
        }
    }

    @Override
    @Transactional
    public int updateWarehouse(Long id, WarehouseSaveRequestVO payload, String employeeId) throws Exception {
        Map<String, Object> p = fields(payload);
        WarehouseVO current = current(id);
        p.put("warehouseId", id);
        String name = (String) p.get("warehouseNm");
        String oldName = current.getWarehouseNm();
        boolean renamed = !name.equals(oldName);
        // 상태 체크박스(2026-10-22): 사용안함 줄을 다시 켤 때도 같은 이름의 사용 중 창고가 있으면 막는다
        String useYn = useYnOf(payload);
        boolean reEnabled = "Y".equals(useYn) && "N".equals(current.getUseYn());
        if ((renamed || reEnabled) && warehouseDAO.countActiveName(p) > 0) {
            throw new IllegalArgumentException(DUPLICATE_MESSAGE);
        }
        p.put("useYn", useYn);
        p.put("userId", employeeId);

        // 기본창고: 보낸 경우에만 켜고 끈다(null = 그대로). 켜면 다른 기본창고를 끈다
        boolean wantDefault = payload.getDefaultYn() != null
                ? payload.getDefaultYn().booleanValue()
                : "Y".equals(current.getDefaultYn());
        if (wantDefault) {
            warehouseDAO.clearDefaultWarehouse(p);
        }
        p.put("defaultYn", wantDefault ? "Y" : "N");

        // 2026-10-26 쓰는 곳은 창고코드로 이어져 이름을 바꿔도 따라 바꿀 것이 없다(옮긴 원재료 수는 0)
        int moved = 0;
        try {
            if (warehouseDAO.updateWarehouse(p) == 0) {
                throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
            }
        } catch (DuplicateKeyException ex) {
            throw new IllegalArgumentException(RACE_MESSAGE);
        }

        // 입고창고(기본창고)였던 줄을 꺼서 하나도 남지 않으면 되돌린다(송연 기존 동작)
        if (isReceiving(current) && countReceiving() == 0) {
            throw new IllegalArgumentException(LAST_RECEIVING_MESSAGE);
        }
        return moved;
    }

    // 'N' 이면 사용안함, 그 밖(빈 값 포함)은 사용
    private static String useYnOf(WarehouseSaveRequestVO payload) {
        return payload != null && "N".equalsIgnoreCase(trim(payload.getUseYn())) ? "N" : "Y";
    }

    private WarehouseVO current(Long id) throws Exception {
        if (id == null) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        Map<String, Object> p = site();
        p.put("warehouseId", id);
        WarehouseVO current = warehouseDAO.selectWarehouse(p);
        if (current == null) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        return current;
    }

    // 화면에서 받는 칸 검사. 길이는 표 정의(warehouse_nm VARCHAR(100), remark VARCHAR(500))와 같다
    private static Map<String, Object> fields(WarehouseSaveRequestVO payload) {
        String name = payload == null ? "" : trim(payload.getWarehouseNm());
        if (name.isEmpty()) {
            throw new IllegalArgumentException(REQUIRED_MESSAGE);
        }
        if (name.length() > 100) {
            throw new IllegalArgumentException("창고 이름은 100자까지 입력할 수 있습니다");
        }
        String type = trim(payload.getWarehouseType());
        if (!WAREHOUSE_TYPES.contains(type)) {
            throw new IllegalArgumentException(TYPE_MESSAGE);
        }
        String remark = trim(payload.getRemark());
        if (remark.length() > 500) {
            throw new IllegalArgumentException("설명은 500자까지 입력할 수 있습니다");
        }
        Map<String, Object> p = site();
        p.put("warehouseNm", name);
        p.put("warehouseType", type);
        p.put("remark", remark.isEmpty() ? null : remark);
        return p;
    }

    private static boolean isReceiving(WarehouseVO row) {
        return "Y".equals(row.getDefaultYn());
    }

    private long countReceiving() throws Exception {
        return warehouseDAO.countActiveDefault(site());
    }

    // 표 전체 6자리 숫자 코드 가운데 가장 큰 번호 + 1(사용안함 줄 포함). 없으면 000001. 이미 있으면 다음 번호(2026-10-22)
    private String nextCode() throws Exception {
        Integer max = warehouseDAO.selectMaxAutoCodeNo();
        long n = max == null ? 0 : max;
        for (int tries = 0; tries < 1000; tries++) {
            String code = formatCode(++n);
            if (warehouseDAO.countCode(code) == 0) {
                return code;
            }
        }
        throw new IllegalStateException("창고코드를 만들지 못했습니다");
    }

    static String formatCode(long value) {
        StringBuilder digits = new StringBuilder(String.valueOf(value));
        while (digits.length() < CODE_WIDTH) {
            digits.insert(0, '0');
        }
        return digits.toString();
    }

    private static String trim(String v) {
        return StringUtils.hasText(v) ? v.trim() : "";
    }
}
