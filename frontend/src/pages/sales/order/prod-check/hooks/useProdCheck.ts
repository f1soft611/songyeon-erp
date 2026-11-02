import { useRef, useState } from 'react';
import type { F1GridRef } from '../../../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../../../shared/utils/excelFile';
import { checkProdCheck, fetchProdCheckProducts } from '../services/prodCheck.service';
import type { ProdCheckLine, ProdCheckResult, ProdCheckRow } from '../types/prodCheck.types';
import { addLines, emptyQtyLines, excelColumnsOf, verdictOf } from '../utils/prodCheck';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 생산가능확인 화면의 상태(조회만 한다. 여기서는 아무것도 바꾸지 않는다)
// 만들 제품·수량을 적으면 그 날짜 원재료 재고로 다 만들 수 있는지 서버가 계산한다
export function useProdCheck() {
  const linesGridRef = useRef<F1GridRef<ProdCheckLine>>(null);
  // 고를 수 있는 제품(배합비가 있는 것). 제품 추가 창을 처음 열 때 받는다(비어 있으면 열 때마다 다시)
  const [products, setProducts] = useState<string[]>([]);
  const [lines, setLines] = useState<ProdCheckLine[]>([]);
  // 줄을 담거나 뺄 때만 표를 새로 그린다(수량은 표 안에서 고치고, 확인할 때 표에서 읽는다)
  const [linesVersion, setLinesVersion] = useState(0);
  const [date, setDateValue] = useState(() => todayDash());
  const [data, setData] = useState<ProdCheckResult | null>(null);
  const [one, setOne] = useState<string | null>(null); // 상세보기로 고른 제품(없으면 합계)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  // 표 안에서 고친 수량을 함께 읽는다
  const currentLines = (): ProdCheckLine[] => linesGridRef.current?.getActiveRows() ?? lines;
  // 날짜나 제품이 바뀌었으면 앞의 결과는 그것에 대한 답이 아니다
  const clearResult = () => {
    setData(null);
    setOne(null);
  };
  const replaceLines = (next: ProdCheckLine[]) => {
    setLines(next);
    setLinesVersion((v) => v + 1);
    clearResult();
  };
  const setDate = (value: string) => {
    setLines(currentLines());
    setDateValue(value);
    clearResult();
  };

  const openPicker = async () => {
    setError('');
    if (products.length === 0) setProducts(await fetchProdCheckProducts().catch(() => [])); // 못 받으면 빈 목록으로 연다
    setPickerOpen(true);
  };
  const pickProducts = (picked: string[]) => {
    replaceLines(addLines(currentLines(), picked));
    setPickerOpen(false);
  };
  const removeLine = (product: string) => replaceLines(currentLines().filter((line) => line.product !== product));

  const run = async () => {
    setError('');
    const current = currentLines();
    if (!date) {
      setError('생산일자를 골라주세요');
      return;
    }
    if (current.length === 0) {
      setError('만들 제품을 담아주세요');
      return;
    }
    const empty = emptyQtyLines(current);
    if (empty.length > 0) {
      setError(`생산수량을 적어주세요. ${empty.map((line) => `· ${line.product}`).join(' ')}`);
      return;
    }
    // 확인은 서버가 계산한다. 거절되면 서버 문구를 띄우고 앞의 결과는 그대로 둔다.
    setChecking(true);
    try {
      setLines(current);
      setData(await checkProdCheck(date, current));
      setOne(null);
    } catch (requestError) {
      setError(errorText(requestError, '확인하지 못했어요'));
    } finally {
      setChecking(false);
    }
  };

  const exportExcel = async () => {
    if (!data || data.rows.length === 0) {
      setError('내려받을 내역이 없어요');
      return;
    }
    try {
      await downloadExcel<ProdCheckRow>(data.rows, excelColumnsOf(data), `생산가능확인_${data.date}.xlsx`, '생산가능확인');
    } catch (requestError) {
      setError(errorText(requestError, '엑셀을 만들지 못했어요'));
    }
  };

  const canDetail = Boolean(data) && lines.length > 1;
  const oneResult = one && data ? data.byProduct.find((item) => item.product === one) : undefined;
  const shownRows = oneResult ? oneResult.rows : data?.rows ?? [];
  const perCount = !oneResult && data && data.lines.length > 1 ? data.lines.length : 0;

  return {
    linesGridRef,
    products,
    lines,
    linesVersion,
    date,
    setDate,
    data,
    one,
    setOne,
    oneResult,
    shownRows,
    perCount,
    canDetail,
    verdict: verdictOf(data),
    pickerOpen,
    openPicker,
    closePicker: () => setPickerOpen(false),
    pickProducts,
    removeLine,
    checking,
    error,
    setError,
    run,
    exportExcel,
  };
}
