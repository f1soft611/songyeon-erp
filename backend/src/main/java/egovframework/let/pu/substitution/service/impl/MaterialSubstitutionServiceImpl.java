package egovframework.let.pu.substitution.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.pd.confirm.service.ProductionConfirmService;
import egovframework.let.pu.substitution.domain.model.SubstitutionDetailVO;
import egovframework.let.pu.substitution.domain.model.SubstitutionLineVO;
import egovframework.let.pu.substitution.domain.model.SubstitutionMaterialVO;
import egovframework.let.pu.substitution.domain.model.SubstitutionRecordVO;
import egovframework.let.pu.substitution.domain.model.SubstitutionRequestVO;
import egovframework.let.pu.substitution.domain.model.SubstitutionScheduleVO;
import egovframework.let.pu.substitution.domain.repository.MaterialSubstitutionDAO;
import egovframework.let.pu.substitution.service.MaterialSubstitutionService;

/**
 * 구매관리 - 재료 치환등록 서비스 구현 클래스 (송연 app.py 2413-2582 와 같은 규칙)
 * 쪽지를 적거나 지운 뒤의 원재료 차감은 생산확정과 같은 함수(ProductionConfirmService.reapplyMaterialUsage)로 다시 한다 —
 * 두 군데서 따로 계산하면 배합비 규칙이 바뀔 때 한쪽만 고쳐진다.
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Service("materialSubstitutionService")
public class MaterialSubstitutionServiceImpl extends EgovAbstractServiceImpl implements MaterialSubstitutionService {

    static final String DATE_PARAM_MESSAGE = "date 파라미터가 필요합니다";
    static final String NOT_FOUND_MESSAGE = "생산확정 건을 찾을 수 없습니다";
    static final String PICK_BOTH_MESSAGE = "바꿀 원재료와 대신 쓸 원재료를 모두 골라주세요";
    static final String SAME_MESSAGE = "같은 원재료로는 바꿀 수 없어요";
    static final String TO_MISSING_MESSAGE = "대신 쓸 원재료를 원재료 목록에서 찾을 수 없어요";
    static final String NOT_IN_BOM_MESSAGE = "그 원재료는 이 제품의 배합표에 없어요";
    static final String ALREADY_MESSAGE = "이미 바꿔 쓰기로 한 원재료예요. 되돌린 뒤 다시 지정해주세요";
    static final String UNDONE_MESSAGE = "이미 되돌려진 치환이에요";

    private static final DateTimeFormatter CREATED_AT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final Pattern QTY = Pattern.compile("[\\d.]+");

    private final MaterialSubstitutionDAO materialSubstitutionDAO;
    private final ProductionConfirmService productionConfirmService;

    public MaterialSubstitutionServiceImpl(MaterialSubstitutionDAO materialSubstitutionDAO, ProductionConfirmService productionConfirmService) {
        this.materialSubstitutionDAO = materialSubstitutionDAO;
        this.productionConfirmService = productionConfirmService;
    }

    @Override
    public List<SubstitutionScheduleVO> listSchedules(String date) throws Exception {
        String day = text(date);
        if (day == null) {
            throw new IllegalArgumentException(DATE_PARAM_MESSAGE);
        }
        return materialSubstitutionDAO.selectSchedules(day);
    }

    @Override
    public SubstitutionDetailVO detail(long scheduleId) throws Exception {
        SubstitutionDetailVO detail = lines(scheduleId);
        if (detail == null) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        return detail;
    }

    @Override
    public SubstitutionDetailVO substitute(long scheduleId, SubstitutionRequestVO payload, String userName) throws Exception {
        SubstitutionRequestVO request = payload == null ? new SubstitutionRequestVO() : payload;
        String fromCode = text(request.getFromMaterialCode());
        String toCode = text(request.getToMaterialCode());
        String reason = text(request.getReason());
        if (fromCode == null || toCode == null) {
            throw new IllegalArgumentException(PICK_BOTH_MESSAGE);
        }
        if (fromCode.equals(toCode)) {
            throw new IllegalArgumentException(SAME_MESSAGE);
        }
        SubstitutionScheduleVO schedule = materialSubstitutionDAO.selectSchedule(scheduleId);
        if (schedule == null) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        String productCode = productCodeOf(schedule);
        String fromName = materialSubstitutionDAO.selectMaterialName(fromCode);
        String toName = materialSubstitutionDAO.selectMaterialName(toCode);
        if (toName == null) {
            throw new IllegalArgumentException(TO_MISSING_MESSAGE);
        }
        // 바꾸려는 것이 정말 이 제품의 배합에 들어있는지 본다 — 없는 것을 바꾸면 아무 일도 안 일어나는데 화면은 바뀐 줄 안다
        boolean inBom = productCode != null && materialSubstitutionDAO.countBomLine(productCode, fromCode) > 0;
        boolean already = materialSubstitutionDAO.countRecord(scheduleId, fromCode) > 0;
        if (!inBom && !already) {
            throw new IllegalArgumentException(NOT_IN_BOM_MESSAGE);
        }
        if (already) {
            throw new IllegalArgumentException(ALREADY_MESSAGE);
        }
        SubstitutionRecordVO record = new SubstitutionRecordVO();
        record.setScheduleId(scheduleId);
        record.setFromMaterialCode(fromCode);
        record.setFromMaterialName(fromName == null ? "" : fromName);
        record.setToMaterialCode(toCode);
        record.setToMaterialName(toName);
        record.setReason(reason == null ? "" : reason);
        record.setCreatedAt(LocalDateTime.now(ZoneId.of("Asia/Seoul")).format(CREATED_AT));
        record.setCreatedBy(userName == null ? "" : userName);
        materialSubstitutionDAO.insertRecord(record);
        // 이미 깎인 재고를 되돌리고, 쪽지대로 같은 지시량을 다시 깎는다
        productionConfirmService.reapplyMaterialUsage(scheduleId);
        return lines(scheduleId);
    }

    @Override
    public SubstitutionDetailVO undo(long scheduleId, long subId) throws Exception {
        if (materialSubstitutionDAO.selectSchedule(scheduleId) == null) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        if (materialSubstitutionDAO.deleteRecord(scheduleId, subId) == 0) {
            throw new IllegalArgumentException(UNDONE_MESSAGE);
        }
        productionConfirmService.reapplyMaterialUsage(scheduleId);
        return lines(scheduleId);
    }

    @Override
    public List<SubstitutionMaterialVO> listMaterials() throws Exception {
        return materialSubstitutionDAO.selectMaterials();
    }

    // 송연 _production_material_lines: 이 생산건에 들어가는 원재료 줄, 바꿔 쓰기를 반영해 실제 쓰는 것으로.
    // 현장 투입지시서와 같은 표를 본다.
    private SubstitutionDetailVO lines(long scheduleId) throws Exception {
        SubstitutionScheduleVO row = materialSubstitutionDAO.selectSchedule(scheduleId);
        if (row == null) {
            return null;
        }
        double qty = parseQty(row.getOrderQty());
        String productCode = productCodeOf(row);
        Map<String, SubstitutionRecordVO> subs = new LinkedHashMap<>();
        for (SubstitutionRecordVO sub : materialSubstitutionDAO.selectRecords(scheduleId)) {
            subs.put(sub.getFromMaterialCode(), sub); // 같은 원재료가 두 줄이면 나중 것
        }
        List<SubstitutionLineVO> lines = new ArrayList<>();
        if (productCode != null) {
            for (SubstitutionRecordVO bom : materialSubstitutionDAO.selectBomLines(productCode)) {
                SubstitutionRecordVO hit = subs.get(bom.getMaterialCode());
                SubstitutionLineVO line = new SubstitutionLineVO();
                line.setMaterialCode(hit != null ? hit.getToMaterialCode() : bom.getMaterialCode());
                line.setMaterialName(hit != null ? hit.getToMaterialName() : bom.getMaterialName());
                line.setOriginCode(bom.getMaterialCode());
                line.setOriginName(bom.getMaterialName());
                line.setRatioPercent(round(bom.getRatio() * 100, 4));
                line.setQty(round(qty * bom.getRatio(), 3));
                line.setSubstituted(hit != null);
                line.setSubId(hit != null ? hit.getId() : null);
                line.setReason(hit != null && hit.getReason() != null ? hit.getReason() : "");
                lines.add(line);
            }
        }
        SubstitutionScheduleVO header = new SubstitutionScheduleVO();
        header.setId(row.getId());
        header.setClientName(nz(row.getClientName()));
        header.setProductName(nz(row.getProductName()));
        header.setOrderQty(nz(row.getOrderQty()));
        header.setOrderQtyNumber(qty);
        header.setNote(nz(row.getNote()));
        header.setScheduleDate(nz(row.getScheduleDate()));
        header.setLotNo(nz(row.getLotNo()));
        header.setProductCode(productCode == null ? "" : productCode);
        header.setSubstitutionCount(subs.size());
        SubstitutionDetailVO detail = new SubstitutionDetailVO();
        detail.setHeader(header);
        detail.setRows(lines);
        return detail;
    }

    // 저장된 제품코드가 없으면 이름(규격 포함)으로 찾는다
    private String productCodeOf(SubstitutionScheduleVO row) throws Exception {
        String stored = text(row.getProductCode());
        if (stored != null) {
            return stored;
        }
        String name = text(row.getProductName());
        return name == null ? null : materialSubstitutionDAO.selectProductCodeByDisplayName(name);
    }

    // 송연 parse_qty_number: '1,000kg' → 1000
    static double parseQty(String value) {
        if (value == null) {
            return 0;
        }
        Matcher matcher = QTY.matcher(value.replace(",", ""));
        if (!matcher.find()) {
            return 0;
        }
        try {
            return Double.parseDouble(matcher.group());
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    // 파이썬 round(x, n) 과 같게: 두 배 정밀도 값 그대로를 짝수 쪽 반올림
    static double round(double value, int scale) {
        return new BigDecimal(value).setScale(scale, RoundingMode.HALF_EVEN).doubleValue();
    }

    private static String nz(String value) {
        return value == null ? "" : value;
    }

    private static String text(Object raw) {
        String value = raw == null ? "" : raw.toString().trim();
        return value.isEmpty() ? null : value;
    }
}
