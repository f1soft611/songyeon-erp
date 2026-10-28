import { useDailyScheduleManagement } from '../../hooks/useDailyScheduleManagement';
import { fetchLogisticsSchedule } from '../../services/schedule.service';

// 물류스케줄 화면의 조회 상태. 생산스케줄과 같은 조회 길을 쓰고 주소만 다르다
export function useLogisticsScheduleManagement() {
  return useDailyScheduleManagement(fetchLogisticsSchedule);
}
