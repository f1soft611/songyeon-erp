import { useTheme } from '@mui/material';
import { DashboardCalendar } from './components/DashboardCalendar';
import './DashboardHomePage.css';

// 기존 송연 대시보드(시작하기 안내 + 달력·메모) 그대로. S_ERP 화면 틀 안의 대시보드 메뉴에서 보여준다.
// 색은 S_ERP 테마(밝게/어둡게)를 따라 송연 색 묶음을 고른다.
export default function DashboardHomePage() {
  const dark = useTheme().palette.mode === 'dark';
  return <div className="songyeon-dashboard" data-theme={dark ? 'dark' : 'light'}>
    <section className="mes-start-panel"><h2 className="mes-section-title">시작하기</h2><p>왼쪽 사이드바에서 원하시는 메뉴를 선택해주세요.</p></section>
    <DashboardCalendar />
  </div>;
}
