package egovframework.let.co.schedule.domain.repository;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.co.schedule.domain.model.LogisticsScheduleVO;
import egovframework.let.co.schedule.domain.model.ProductionScheduleVO;

/**
 * 공통관리 - 생산스케줄·물류스케줄 데이터 접근 클래스 (송연 production_schedule · logistics_schedule, 보기 전용)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Repository("scheduleDAO")
public class ScheduleDAO extends EgovAbstractMapper {

    /** 그 날짜의 생산스케줄(정렬번호 → 번호 순) */
    public List<ProductionScheduleVO> selectProductionSchedule(String date) throws Exception {
        return selectList("ScheduleDAO.selectProductionSchedule", date);
    }

    /** 물류스케줄 ① 출하등록 줄 */
    public List<LogisticsScheduleVO> selectManualLogistics(String date) throws Exception {
        return selectList("ScheduleDAO.selectManualLogistics", date);
    }

    /** 물류스케줄 ② 물류출고일이 있는 생산확정 줄 */
    public List<LogisticsScheduleVO> selectProductionLogistics(String date) throws Exception {
        return selectList("ScheduleDAO.selectProductionLogistics", date);
    }
}
