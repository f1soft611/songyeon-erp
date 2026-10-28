import { Dialog } from '../../../../shared/components/Dialog';

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

// 기존 화면과 같이 "2026-09-17 (목요일)" 형식으로 제목을 표시한다.
function titleFor(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return `${date} (${weekdays[new Date(year, month - 1, day).getDay()]}요일)`;
}

export function MemoDialog({ date, onClose }: { date: string; onClose: () => void }) {
  return <Dialog title={titleFor(date)} onClose={onClose}>
      <p className="mes-muted">메모 조회·저장 기능은 준비 중입니다.</p>
      <div className="mes-section-title">새 메모 추가</div>
      <label className="mes-form-field">제목<input placeholder="예: 발주마감, 거래처방문" /></label>
      <label className="mes-form-field">내용<textarea placeholder="상세 내용 (선택)" rows={3} /></label>
      <fieldset className="mes-scope"><legend>공개범위</legend>
        <label><input type="radio" name="memo-scope" defaultChecked /> 개인메모 (나만 보임)</label>
        <label><input type="radio" name="memo-scope" /> 공용메모 (전체 공유)</label>
      </fieldset>
      <button className="mes-primary" disabled title="메모 저장은 추후 연결됩니다">추가</button>
  </Dialog>;
}
