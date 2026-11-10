import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MasterPicker } from '../src/shared/components/master-picker/MasterPicker';
import type { MasterPickerOption } from '../src/shared/components/master-picker/masterPicker.types';

const options: MasterPickerOption[] = [
  { id: 1, code: 'C-001', name: '테스트 거래처' },
];

describe('MasterPicker', () => {
  it('matches the adjacent picker button height to the small input height', () => {
    render(
      <MasterPicker
        label="거래처"
        value={null}
        search={vi.fn(async () => options)}
        onChange={() => undefined}
      />,
    );

    expect(
      screen
        .getByRole('textbox', { name: '거래처' })
        .closest('.MuiInputBase-root'),
    ).toHaveStyle({ height: '40px' });
    expect(screen.getByRole('button', { name: '거래처 선택' })).toHaveStyle({
      height: '40px',
      minHeight: '40px',
    });
  });

  it('aligns the picker field with neighboring normal-margin fields', () => {
    render(
      <MasterPicker
        label="거래처"
        value={null}
        search={vi.fn(async () => options)}
        onChange={() => undefined}
      />,
    );

    expect(
      screen.getByRole('button', { name: '거래처 선택' }).parentElement,
    ).toHaveStyle({ marginTop: '16px' });
  });

  it('opens the lookup from an icon inside the field and returns the selection', async () => {
    const onChange = vi.fn();
    render(
      <MasterPicker
        label="거래처"
        triggerMode="icon"
        value={null}
        search={vi.fn(async () => options)}
        onChange={onChange}
      />,
    );

    const field = screen.getByRole('textbox', { name: '거래처' });
    const trigger = screen.getByRole('button', { name: '거래처 선택' });
    expect(trigger.closest('.MuiInputAdornment-root')).not.toBeNull();
    expect(
      screen.queryByRole('button', { name: '선택', exact: true }),
    ).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: '거래처 선택' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '검색' }));
    fireEvent.click(await screen.findByRole('button', {
      name: 'C-001 테스트 거래처 선택',
    }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(options[0]));
    expect(field).toHaveValue('');
  });

  it('disables the icon trigger when the picker is disabled', () => {
    render(
      <MasterPicker
        label="거래처"
        triggerMode="icon"
        value={null}
        search={vi.fn(async () => options)}
        onChange={() => undefined}
        disabled
      />,
    );

    const trigger = screen.getByRole('button', { name: '거래처 선택' });
    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('searches on Enter and returns the selected typed option', async () => {
    const search = vi.fn(async () => options);
    const onChange = vi.fn();
    render(
      <MasterPicker
        label="거래처"
        value={null}
        search={search}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '거래처 선택' }));
    expect(
      screen.getByRole('dialog', { name: '거래처 선택' }),
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole('textbox', { name: '거래처 검색' })
        .closest('.MuiInputBase-root'),
    ).toHaveStyle({ height: '40px' });
    expect(
      screen.getByRole('textbox', { name: '거래처 검색' }).closest('form'),
    ).toHaveStyle({ alignItems: 'center' });
    expect(screen.getByRole('button', { name: '검색' })).toHaveStyle({
      height: '40px',
      minHeight: '40px',
    });
    fireEvent.change(screen.getByRole('textbox', { name: '거래처 검색' }), {
      target: { value: '테스트' },
    });
    fireEvent.keyDown(screen.getByRole('textbox', { name: '거래처 검색' }), {
      key: 'Enter',
    });

    const option = await screen.findByRole('button', {
      name: 'C-001 테스트 거래처 선택',
    });
    fireEvent.click(option);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(options[0]));
    expect(search).toHaveBeenCalledWith('테스트');
  }, 10000);

  it('shows a search failure distinctly from an empty result', async () => {
    const search = vi.fn(async () => {
      throw new Error('거래처 검색을 완료하지 못했습니다.');
    });
    render(
      <MasterPicker
        label="거래처"
        value={null}
        search={search}
        onChange={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '거래처 선택' }));
    fireEvent.click(screen.getByRole('button', { name: '검색' }));

    expect(
      await screen.findByText('거래처 검색을 완료하지 못했습니다.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('검색 결과가 없습니다.')).not.toBeInTheDocument();
  });

  it('shows loading and empty results separately and closes without selecting', async () => {
    let resolveSearch: (result: MasterPickerOption[]) => void = () =>
      undefined;
    const search = vi.fn(
      () =>
        new Promise<MasterPickerOption[]>((resolve) => {
          resolveSearch = resolve;
        }),
    );
    const onChange = vi.fn();
    render(
      <MasterPicker
        label="거래처"
        value={null}
        search={search}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '거래처 선택' }));
    expect(
      screen.getByText('검색어를 입력한 뒤 검색해 주세요.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '검색' }));
    expect(screen.getByRole('status')).toHaveTextContent('검색 중...');

    resolveSearch([]);
    expect(await screen.findByText('검색 결과가 없습니다.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not replace newer results with an older pending response', async () => {
    let resolveOld: (result: MasterPickerOption[]) => void = () => undefined;
    let resolveNew: (result: MasterPickerOption[]) => void = () => undefined;
    const search = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<MasterPickerOption[]>((resolve) => {
            resolveOld = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<MasterPickerOption[]>((resolve) => {
            resolveNew = resolve;
          }),
      );
    render(
      <MasterPicker
        label="거래처"
        value={null}
        search={search}
        onChange={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '거래처 선택' }));
    const searchInput = screen.getByRole('textbox', { name: '거래처 검색' });
    fireEvent.change(searchInput, { target: { value: '이전 검색' } });
    fireEvent.click(screen.getByRole('button', { name: '검색' }));
    fireEvent.change(searchInput, { target: { value: '최근 검색' } });
    fireEvent.click(screen.getByRole('button', { name: '검색' }));

    resolveNew([{ id: 2, code: 'C-002', name: '최근 결과' }]);
    expect(
      await screen.findByRole('button', { name: 'C-002 최근 결과 선택' }),
    ).toBeInTheDocument();

    resolveOld([{ id: 1, code: 'C-001', name: '이전 결과' }]);
    await waitFor(() =>
      expect(
        within(screen.getByRole('dialog')).queryByText('이전 결과'),
      ).not.toBeInTheDocument(),
    );
  });
});
