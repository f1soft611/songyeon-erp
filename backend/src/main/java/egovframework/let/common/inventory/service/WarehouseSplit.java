package egovframework.let.common.inventory.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import egovframework.let.common.inventory.domain.model.WarehouseQtyVO;

/**
 * 공통 재고 - 남은재고를 창고별로 나누는 규칙 (송연 warehouse_splitter 가 돌려주는 split 함수)
 * 옮겨간 만큼만 다른 창고에 있고, 나머지는 전부 들어온 창고(입고창고)에 있다.
 * 창고별로 따로 세지 않고 한 창고가 나머지를 떠안으므로 합이 남은재고와 어긋날 수 없다.
 * 창고 목록과 이동내역은 품목마다 다시 찾지 않도록 한 번만 읽어 담아둔다.
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
public class WarehouseSplit {

    private final List<String> names;
    private final String receivingName;
    private final Map<String, Map<String, Double>> moved;

    public WarehouseSplit(List<String> names, String receivingName, Map<String, Map<String, Double>> moved) {
        this.names = names == null ? Collections.<String>emptyList() : names;
        this.receivingName = receivingName;
        this.moved = moved == null ? Collections.<String, Map<String, Double>>emptyMap() : moved;
    }

    /** 원재료 하나의 그 시점 재고를 창고 차례대로 나눈다 */
    public List<WarehouseQtyVO> split(String code, double remaining) {
        Map<String, Double> here = moved.getOrDefault(code, Collections.<String, Double>emptyMap());
        double movedTotal = 0;
        for (Double qty : here.values()) {
            movedTotal += qty == null ? 0 : qty;
        }
        List<WarehouseQtyVO> out = new ArrayList<>();
        for (String name : names) {
            double qty = name.equals(receivingName) ? remaining - movedTotal : here.getOrDefault(name, 0.0);
            out.add(new WarehouseQtyVO(name, qty));
        }
        return out;
    }

    public List<String> getNames() {
        return names;
    }
}
