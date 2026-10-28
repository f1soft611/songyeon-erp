import type { SyntheticEvent } from 'react';

const stop = (event: SyntheticEvent) => event.stopPropagation();

// F1-Grid 는 셀을 누르면 그 셀 자체로 포커스를 옮기고(키보드 이동용), 셀에서 받은 키로 칸 이동·삭제를 한다.
// 그래서 renderCell 안에 넣은 입력칸은 누르자마자 포커스를 빼앗겨 글자가 써지지 않는다.
// 입력칸(과 그 메뉴)에서 난 마우스·키 이벤트가 셀까지 올라가지 않게 막는다 — F1-Grid 는 건드리지 않는다.
export const cellInputProps = {
  onMouseDown: stop,
  onClick: stop,
  onDoubleClick: stop,
  onKeyDown: stop,
};
