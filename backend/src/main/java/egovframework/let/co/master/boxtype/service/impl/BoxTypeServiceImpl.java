package egovframework.let.co.master.boxtype.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import egovframework.let.co.master.boxtype.domain.model.BoxTypeVO;
import egovframework.let.co.master.boxtype.domain.repository.BoxTypeDAO;
import egovframework.let.co.master.boxtype.service.BoxTypeService;

/**
 * 기준정보 - 포장유형 서비스 구현 클래스 (tb_box_type)
 * 사업장 · 사업부는 F001 / P001 로 고정한다(송연에는 사업장 개념이 없다). 적용기간은 관리하지 않고, 수정은 그 줄을 덮어쓴다.
 * 포장유형코드는 화면에서 받지 않고 서버가 6자리 숫자로 매긴다(2026.10.22): 표에 있는 가장 큰 6자리 숫자 코드 + 1, 없으면 000001.
 * 등록한 뒤에는 코드를 바꾸지 않는다. 옛 'PACK-…' 코드 줄은 그대로 둔다.
 * 칸 길이 · 범위 검사는 표 정의(VARCHAR 길이, CHECK 제약)와 같은 값이다.
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 2.0 (2026.10.19 tb_box_type 으로 변경)
 */
@Service("boxTypeService")
public class BoxTypeServiceImpl extends EgovAbstractServiceImpl implements BoxTypeService {

    static final String FACTORY_CODE = "F001";
    static final String PLANT_CODE = "P001";
    // 포장유형코드(2026-10-22): 화면에서 받지 않고 서버가 6자리 숫자로 매긴다(가장 큰 6자리 숫자 코드 + 1, 없으면 000001)
    static final int CODE_WIDTH = 6;
    // 포장유형명 끝의 '숫자 + 영문 단위' (예: 소포장3kg, 소포장 500g, 박스 1.5 KG)
    private static final Pattern PACK_SIZE = Pattern.compile("([0-9]+(?:\\.[0-9]+)?)\\s*([A-Za-z]+)\\s*$");

    private final BoxTypeDAO boxTypeDAO;

    public BoxTypeServiceImpl(BoxTypeDAO boxTypeDAO) {
        this.boxTypeDAO = boxTypeDAO;
    }

    private static Map<String, Object> site() {
        Map<String, Object> p = new HashMap<>();
        p.put("factoryCode", FACTORY_CODE);
        p.put("plantCode", PLANT_CODE);
        return p;
    }

    @Override
    public List<BoxTypeVO> listBoxTypes() throws Exception {
        return listBoxTypes(false);
    }

    @Override
    public List<BoxTypeVO> listBoxTypes(boolean includeUnused) throws Exception {
        Map<String, Object> p = site();
        p.put("includeUnused", includeUnused);
        return boxTypeDAO.selectBoxTypeList(p);
    }

    @Override
    @Transactional
    public void saveBoxType(BoxTypeVO payload, String employeeId) throws Exception {
        if (payload == null) {
            throw new IllegalArgumentException("포장유형코드는 필수입니다");
        }
        // 새로 등록하면 서버가 코드를 매긴다(아래 nextCode). 수정은 코드를 바꾸지 않는다
        String code = payload.getBoxTypeId() == null ? "" : trim(payload.getBoxTypeCd());
        String name = trim(payload.getBoxTypeNm());
        if (name.isEmpty()) {
            throw new IllegalArgumentException("포장유형명은 필수입니다");
        }
        if (name.length() > 50) {
            throw new IllegalArgumentException("포장유형명은 50자까지 입력할 수 있습니다");
        }
        Map<String, Object> p = site();
        p.put("boxTypeId", payload.getBoxTypeId());
        p.put("boxTypeCd", code);
        p.put("boxTypeNm", name);
        // 포장단위 수량 · 단위는 화면에서 받지 않고 이름에서 읽는다. 이름에 없으면 비운다(이름을 고치면 다시 읽는다)
        Object[] size = packSize(name);
        p.put("packQty", size[0]);
        p.put("packUnit", size[1]);
        p.put("fixedMarginRate", rate(payload.getFixedMarginRate(), "고정마진율"));
        p.put("lossRate", rate(payload.getLossRate(), "로스율"));
        p.put("laborCost", amount(payload.getLaborCost(), "인건비"));
        p.put("packingCost", amount(payload.getPackingCost(), "포장비"));
        p.put("logisticsCost", amount(payload.getLogisticsCost(), "물류비"));
        p.put("marginAmt", amount(payload.getMarginAmt(), "마진"));
        p.put("sortSeq", payload.getSortSeq() == null ? 0 : payload.getSortSeq());
        p.put("userId", employeeId);
        // 사용여부 체크박스(2026-10-22): 'N' 이면 사용안함, 그 밖은 사용
        String useYn = "N".equalsIgnoreCase(trim(payload.getUseYn())) ? "N" : "Y";
        p.put("useYn", useYn);

        if (payload.getBoxTypeId() == null) {
            p.put("boxTypeCd", nextCode(p));
            try {
                boxTypeDAO.insertBoxType(p);
            } catch (DuplicateKeyException ex) {
                // 같은 코드가 오늘 사용안함으로 남아 있으면 표 유니크(코드 + 적용시작일)에 걸린다
                throw new IllegalArgumentException("이미 쓴 적 있는 포장유형코드입니다(사용안함 포함): " + p.get("boxTypeCd"));
            }
            return;
        }
        // 사용안함 줄을 다시 켤 때 같은 코드의 다른 줄이 이미 사용 중이면 막는다
        if ("Y".equals(useYn) && boxTypeDAO.countActiveCode(p) > 0) {
            throw new IllegalArgumentException("이미 사용 중인 포장유형코드입니다: " + code);
        }
        if (boxTypeDAO.updateBoxType(p) == 0) {
            throw new IllegalArgumentException("포장유형을 찾을 수 없습니다. 다시 조회해 주세요");
        }
    }

    @Override
    @Transactional
    public void deleteBoxType(Long boxTypeId, String employeeId) throws Exception {
        if (boxTypeId == null) {
            throw new IllegalArgumentException("삭제할 포장유형을 골라주세요");
        }
        Map<String, Object> p = site();
        p.put("boxTypeId", boxTypeId);
        p.put("userId", employeeId);
        if (boxTypeDAO.deleteBoxType(p) == 0) {
            throw new IllegalArgumentException("포장유형을 찾을 수 없습니다. 다시 조회해 주세요");
        }
    }

    // {수량(BigDecimal), 단위(대문자)} 또는 {null, null}. 표 제약: pack_qty > 0, NUMERIC(15,3), pack_unit VARCHAR(10)
    static Object[] packSize(String name) {
        Matcher m = PACK_SIZE.matcher(name == null ? "" : name);
        if (!m.find()) {
            return new Object[] { null, null };
        }
        java.math.BigDecimal qty = new java.math.BigDecimal(m.group(1));
        String unit = m.group(2).toUpperCase(java.util.Locale.ROOT);
        if (qty.signum() <= 0 || qty.scale() > 3 || qty.precision() - qty.scale() > 12 || unit.length() > 10) {
            return new Object[] { null, null };
        }
        return new Object[] { qty, unit };
    }

    // 표에 있는 6자리 숫자 코드 가운데 가장 큰 번호 + 1(사용안함 줄 포함). 없으면 000001.
    // 이미 있는 코드면 다음 번호로 넘어간다. 옛 PACK-… 코드는 숫자 코드가 아니라 세지 않는다(2026-10-22)
    private String nextCode(Map<String, Object> p) throws Exception {
        Integer max = boxTypeDAO.selectMaxAutoCodeNo(site());
        long n = max == null ? 0 : max;
        for (int tries = 0; tries < 1000; tries++) {
            String code = formatCode(++n);
            p.put("boxTypeCd", code);
            if (boxTypeDAO.countAnyCode(p) == 0) {
                return code;
            }
        }
        throw new IllegalStateException("포장유형코드를 만들지 못했습니다");
    }

    static String formatCode(long value) {
        StringBuilder digits = new StringBuilder(String.valueOf(value));
        while (digits.length() < CODE_WIDTH) {
            digits.insert(0, '0');
        }
        return digits.toString();
    }

    // 표: NUMERIC NOT NULL DEFAULT 0, CHECK 0~100
    private static double rate(Double value, String label) {
        double v = value == null ? 0 : value;
        if (v < 0 || v > 100) {
            throw new IllegalArgumentException(label + "은(는) 0~100 사이로 입력하세요");
        }
        return v;
    }

    // 표: NUMERIC NOT NULL DEFAULT 0, CHECK >= 0
    private static double amount(Double value, String label) {
        double v = value == null ? 0 : value;
        if (v < 0) {
            throw new IllegalArgumentException(label + "은(는) 0 이상으로 입력하세요");
        }
        return v;
    }

    private static String trim(String v) {
        return StringUtils.hasText(v) ? v.trim() : "";
    }
}
