import { useDailyScheduleManagement } from '../../hooks/useDailyScheduleManagement';
import { fetchProductionSchedule } from '../../services/schedule.service';

// 생산스케줄 화면의 조회 상태. 물류스케줄과 같은 조회 길을 쓰고 주소만 다르다
export function useProductionScheduleManagement() {
  return useDailyScheduleManagement(fetchProductionSchedule);
}
