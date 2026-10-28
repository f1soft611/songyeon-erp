package egovframework.let.co.schedule.service.impl;

import java.util.ArrayList;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.co.schedule.domain.model.LogisticsScheduleVO;
import egovframework.let.co.schedule.domain.model.ProductionScheduleVO;
import egovframework.let.co.schedule.domain.model.TvScheduleRowVO;
import egovframework.let.co.schedule.domain.repository.ScheduleDAO;
import egovframework.let.co.schedule.service.ScheduleService;

/**
 * 공통관리 - 생산스케줄·물류스케줄 서비스 구현 클래스
 * 송연 변환본(CM0002Service · CM0003Service)과 같은 규칙.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Service("scheduleService")
public class ScheduleServiceImpl extends EgovAbstractServiceImpl implements ScheduleService {

    static final String DATE_REQUIRED_MESSAGE = "date 파라미터가 필요합니다";

    private final ScheduleDAO scheduleDAO;

    public ScheduleServiceImpl(ScheduleDAO scheduleDAO) {
        this.scheduleDAO = scheduleDAO;
    }

    @Override
    public List<ProductionScheduleVO> listProductionSchedule(String date) throws Exception {
        return scheduleDAO.selectProductionSchedule(requireDate(date));
    }

    @Override
    public List<LogisticsScheduleVO> listLogisticsSchedule(String date) throws Exception {
        String day = requireDate(date);
        List<LogisticsScheduleVO> rows = new ArrayList<>(scheduleDAO.selectManualLogistics(day));
        rows.addAll(scheduleDAO.selectProductionLogistics(day));
        return rows;
    }

    // 공개 화면이라 실생산량·물류출고일·번호는 빼서, 주소만 알아도 그 이상은 볼 수 없게 한다(송연과 같음)
    @Override
    public List<TvScheduleRowVO> listProductionScheduleForTv(String date) throws Exception {
        List<TvScheduleRowVO> rows = new ArrayList<>();
        for (ProductionScheduleVO row : listProductionSchedule(date)) {
            rows.add(TvScheduleRowVO.of(row.getClientName(), row.getProductName(), row.getOrderQty(), row.getNote()));
        }
        return rows;
    }

    @Override
    public List<TvScheduleRowVO> listLogisticsScheduleForTv(String date) throws Exception {
        List<TvScheduleRowVO> rows = new ArrayList<>();
        for (LogisticsScheduleVO row : listLogisticsSchedule(date)) {
            rows.add(TvScheduleRowVO.of(row.getClientName(), row.getProductName(), row.getOrderQty(), row.getNote()));
        }
        return rows;
    }

    private static String requireDate(String date) {
        String day = date == null ? "" : date.trim();
        if (day.isEmpty()) {
            throw new IllegalArgumentException(DATE_REQUIRED_MESSAGE);
        }
        return day;
    }
}
