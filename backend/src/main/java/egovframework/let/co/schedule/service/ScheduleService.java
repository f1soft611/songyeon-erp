package egovframework.let.co.schedule.service;

import java.util.List;

import egovframework.let.co.schedule.domain.model.LogisticsScheduleVO;
import egovframework.let.co.schedule.domain.model.ProductionScheduleVO;
import egovframework.let.co.schedule.domain.model.TvScheduleRowVO;

/**
 * 공통관리 - 생산스케줄·물류스케줄 서비스 인터페이스 클래스 (보기 전용. 등록·수정은 수주등록·생산확정·출하등록에서 한다)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
public interface ScheduleService {

    /** 그 날짜의 생산스케줄. 날짜가 없으면 막는다. */
    List<ProductionScheduleVO> listProductionSchedule(String date) throws Exception;

    /** 그 날짜의 물류스케줄: ① 출하등록 줄 + ② 물류출고일이 있는 생산확정 줄. 날짜가 없으면 막는다. */
    List<LogisticsScheduleVO> listLogisticsSchedule(String date) throws Exception;

    /** 현장 TV(로그인 없이 열림): 생산스케줄을 TV 에 보이는 칸만 */
    List<TvScheduleRowVO> listProductionScheduleForTv(String date) throws Exception;

    /** 현장 TV(로그인 없이 열림): 물류스케줄을 TV 에 보이는 칸만 */
    List<TvScheduleRowVO> listLogisticsScheduleForTv(String date) throws Exception;
}
