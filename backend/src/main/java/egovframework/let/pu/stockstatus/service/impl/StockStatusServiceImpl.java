package egovframework.let.pu.stockstatus.service.impl;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.pu.ledger.domain.model.StockAsOfVO;
import egovframework.let.pu.ledger.service.StockLedgerService;
import egovframework.let.pu.stockstatus.domain.model.MaterialLotVO;
import egovframework.let.pu.stockstatus.domain.repository.StockStatusDAO;
import egovframework.let.pu.stockstatus.service.StockStatusService;

/**
 * 구매관리 - 재고현황 서비스 구현 클래스 (송연 app.py materials_stock_as_of · material_lots_as_of 와 같은 규칙)
 * 기준일 재고는 수불대장(StockLedgerService.stockAsOf → 공통 재고 되감기)과 같은 것을 쓴다 —
 * 두 화면이 따로 계산하다 서로 다른 값을 보여준 적이 있어서다.
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Service("stockStatusService")
public class StockStatusServiceImpl extends EgovAbstractServiceImpl implements StockStatusService {

    private final StockStatusDAO stockStatusDAO;
    private final StockLedgerService stockLedgerService;

    public StockStatusServiceImpl(StockStatusDAO stockStatusDAO, StockLedgerService stockLedgerService) {
        this.stockStatusDAO = stockStatusDAO;
        this.stockLedgerService = stockLedgerService;
    }

    @Override
    public StockAsOfVO stockAsOf(String date) throws Exception {
        return stockLedgerService.stockAsOf(date);
    }

    // 로트마다 남은 양은 아직 못 낸다(생산 투입 때 어느 입고분을 썼는지 남기지 않는다) — 없는 숫자를 지어내지 않는다
    @Override
    public List<MaterialLotVO> listLots(String code, String date) throws Exception {
        String day = date == null || date.trim().isEmpty() ? LocalDate.now(ZoneId.of("Asia/Seoul")).toString() : date.trim();
        List<MaterialLotVO> lots = stockStatusDAO.selectLots(code, day);
        for (MaterialLotVO lot : lots) {
            lot.setNetQty(nz(lot.getQty()) - nz(lot.getReturnedQty()));
        }
        return lots;
    }

    private static double nz(Double value) {
        return value == null ? 0 : value;
    }
}
