import { useCallback, useEffect, useRef, useState } from 'react';
import { todayDash } from '../../../../../shared/utils/excelFile';
import { cancelMove, fetchMoveTargets, fetchMoves, lookupMove, moveWarehouse } from '../services/stockAdjust.service';
import type { MoveMessage, WarehouseLookup, WarehouseMove } from '../types/stockAdjust.types';
import { movedMessage } from '../utils/stockAdjust';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 창고이동 탭의 바코드 조회 · 옮기기 · 이동 기록 상태
export function useWarehouseMove() {
  const barcodeRef = useRef<HTMLInputElement>(null);
  const packsRef = useRef<HTMLInputElement>(null);
  const [barcode, setBarcode] = useState('');
  const [packs, setPacks] = useState('1');
  const [targets, setTargets] = useState<string[]>([]);
  const [to, setTo] = useState('');
  const [found, setFound] = useState<WarehouseLookup | null>(null);
  const [message, setMessage] = useState<MoveMessage>(null);
  const [date, setDate] = useState(() => todayDash());
  const [moves, setMoves] = useState<WarehouseMove[] | null>(null);
  const [cancelling, setCancelling] = useState<WarehouseMove | null>(null);
  const [alertText, setAlertText] = useState<string | null>(null);

  const loadMoves = useCallback(async (day: string) => {
    try {
      setMoves(await fetchMoves(day || todayDash()));
    } catch (requestError) {
      setAlertText(errorText(requestError, '이동 기록을 불러오지 못했어요'));
    }
  }, []);

  // 탭을 열 때마다 그 날 것을 다시 읽고 바코드 칸에 커서를 둔다(현장에서는 들어오자마자 바로 찍는다)
  useEffect(() => {
    void loadMoves(date);
    fetchMoveTargets().then((list) => {
      setTargets(list);
      // 옮겨갈 창고가 하나뿐이면 그리로(송연과 같음)
      setTo((current) => (current && list.includes(current) ? current : list.length === 1 ? list[0] : current));
    }).catch(() => undefined);
    const timer = setTimeout(() => barcodeRef.current?.focus(), 80);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 찍으면 무엇을 몇 kg 씩 옮기는지 먼저 보여준다 — 바로 옮기면 잘못 찍었을 때 되돌릴 틈이 없다
  const lookup = async () => {
    const key = barcode.trim();
    setFound(null);
    if (!key) {
      setMessage(null);
      return;
    }
    try {
      setFound(await lookupMove(key));
      setMessage(null);
      setTimeout(() => { packsRef.current?.focus(); packsRef.current?.select(); }, 0);
    } catch (requestError) {
      setMessage({ text: errorText(requestError, '찾지 못했어요'), ok: false });
    }
  };

  const move = async () => {
    if (!found) {
      setMessage({ text: '먼저 바코드를 찍어주세요', ok: false });
      return;
    }
    const count = parseInt(packs, 10);
    if (!count || count < 1) {
      setMessage({ text: '봉수를 적어주세요', ok: false });
      return;
    }
    try {
      const result = await moveWarehouse({ materialCode: found.materialCode, barcode: found.barcode, packCount: String(count), movedDate: date || todayDash(), toWarehouse: to });
      setMessage({ text: movedMessage(found, count, result.qty, result.toWarehouse), ok: true });
      // 다음 것을 바로 찍을 수 있게 비우고 되돌아간다(현장에서는 손이 바쁘다)
      setBarcode('');
      setPacks('1');
      setFound(null);
      barcodeRef.current?.focus();
      void loadMoves(date);
    } catch (requestError) {
      setMessage({ text: errorText(requestError, '옮기지 못했어요'), ok: false });
    }
  };

  const cancel = async () => {
    const row = cancelling;
    setCancelling(null);
    if (!row) return;
    try {
      await cancelMove(row.id);
      void loadMoves(date);
    } catch (requestError) {
      setAlertText(errorText(requestError, '취소하지 못했어요'));
    }
  };

  const changeDate = (day: string) => {
    setDate(day);
    void loadMoves(day);
  };

  return {
    barcodeRef,
    packsRef,
    barcode,
    setBarcode,
    packs,
    setPacks,
    targets,
    to,
    setTo,
    found,
    message,
    date,
    changeDate,
    moves,
    cancelling,
    setCancelling,
    lookup,
    move,
    cancel,
    alertText,
    setAlertText,
  };
}
