import { TvScheduleBoard } from '../../../shared/components/TvScheduleBoard';
import { fetchTvLogistics, fetchTvProduction } from './services/schedule.service';

// 현장 TV 화면(송연 CM0002TvPage · CM0003TvPage, 주소도 /tv/production · /tv/logistics 그대로).
// 작업장 TV 에 띄워두는 화면이라 로그인 없이 열린다(AppRouter 에서 로그인 확인을 거치지 않는다).

export function ProductionScheduleTvPage() {
  return <TvScheduleBoard load={fetchTvProduction} emptyText="등록된 생산스케줄이 없습니다" />;
}

// 생산스케줄 TV 와 움직임이 같고 색만 다르다(초록 → 파랑)
export function LogisticsScheduleTvPage() {
  return <TvScheduleBoard load={fetchTvLogistics} emptyText="등록된 물류스케줄이 없습니다" theme="logistics" />;
}
