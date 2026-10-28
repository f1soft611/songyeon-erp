package egovframework.let.lg.status.service.impl;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.lg.status.domain.model.ShipStatusVO;
import egovframework.let.lg.status.domain.repository.ShipStatusDAO;
import egovframework.let.lg.status.service.ShipStatusService;

/**
 * 물류관리 - 출하현황 서비스 구현 클래스 (송연 LG0003Service, 기존 shipment_status).
 * 이월(금액만 다른 때로 넘긴 것)은 물건은 이 날짜에 나갔으므로 빼지 않고 꼬리표를 붙인다.
 * 나눠서 여러 번 넘긴 건은 넘긴 양을 더하고 넘긴 때를 모아 '이월(2026-10-05, 2026-11)' 처럼 글자로 만든다
 * (날짜까지 찍은 건은 날짜, 달까지만 찍은 옛 건은 달).
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@Service("shipStatusService")
public class ShipStatusServiceImpl extends EgovAbstractServiceImpl implements ShipStatusService {

    static final String PERIOD_REQUIRED_MESSAGE = "조회 기간을 선택해주세요";

    private final ShipStatusDAO shipStatusDAO;

    public ShipStatusServiceImpl(ShipStatusDAO shipStatusDAO) {
        this.shipStatusDAO = shipStatusDAO;
    }

    @Override
    public List<ShipStatusVO> listStatus(String start, String end, String productName, String clientName) throws Exception {
        String from = blankToNull(start);
        String to = blankToNull(end);
        if (from == null || to == null) {
            throw new IllegalArgumentException(PERIOD_REQUIRED_MESSAGE);
        }
        String product = blankToNull(productName);
        String client = blankToNull(clientName);
        List<ShipStatusVO> rows = new ArrayList<>();
        for (ShipStatusVO row : shipStatusDAO.selectShipped(false, from, to, product, client)) {
            row.setScheduleType("logistics");
            rows.add(row);
        }
        for (ShipStatusVO row : shipStatusDAO.selectShipped(true, from, to, product, client)) {
            row.setScheduleType("production");
            rows.add(row);
        }
        if (!rows.isEmpty()) {
            Map<String, List<ShipStatusVO>> carryovers = new HashMap<>();
            for (ShipStatusVO co : shipStatusDAO.selectCarryovers()) {
                String key = co.getScheduleType() + ":" + co.getScheduleId();
                List<ShipStatusVO> list = carryovers.get(key);
                if (list == null) {
                    list = new ArrayList<>();
                    carryovers.put(key, list);
                }
                list.add(co);
            }
            Map<String, String> storage = new HashMap<>();
            for (ShipStatusVO p : shipStatusDAO.selectProductStorage()) {
                storage.put(displayName(p.getName(), p.getSpec()), p.getStorage());
            }
            for (ShipStatusVO row : rows) {
                applyCarryover(row, carryovers.get(row.getScheduleType() + ":" + row.getId()));
                row.setStorage(storage.get(row.getProductName() == null ? "" : row.getProductName()));
            }
        }
        Collections.sort(rows, (a, b) -> {
            int byDate = nz(a.getScheduleDate()).compareTo(nz(b.getScheduleDate()));
            return byDate != 0 ? byDate : nz(a.getClientName()).compareTo(nz(b.getClientName()));
        });
        return rows;
    }

    private static void applyCarryover(ShipStatusVO row, List<ShipStatusVO> entries) {
        if (entries == null) {
            row.setCarriedOver(false);
            row.setCarryoverQty(0.0);
            row.setCarryoverLabel("");
            return;
        }
        TreeSet<String> whens = new TreeSet<>();
        double qty = 0;
        for (ShipStatusVO e : entries) {
            qty += e.getQty() == null ? 0 : e.getQty();
            String when = e.getTargetDate() != null && !e.getTargetDate().isEmpty() ? e.getTargetDate() : e.getTargetMonth();
            if (when != null && !when.isEmpty()) {
                whens.add(when);
            }
        }
        row.setCarriedOver(true);
        row.setCarryoverQty(qty);
        row.setCarryoverLabel(whens.isEmpty() ? "이월" : "이월(" + String.join(", ", whens) + ")");
    }

    private static String displayName(String name, String spec) {
        return spec != null && !spec.isEmpty() ? nz(name) + "(" + spec + ")" : nz(name);
    }

    private static String blankToNull(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }

    private static String nz(String value) {
        return value == null ? "" : value;
    }
}
