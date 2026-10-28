import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  login,
  LoginError,
  readSessionNotice,
  setSessionNotice,
} from '../../../shared/services/authService';

// 기존 송연 로그인 화면(useLoginForm)과 같은 문구·동작. 로그인 자체는 S_ERP JWT 로그인(authService.login)을 쓴다.
export function useLoginForm(onSuccess: () => void) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(() => readSessionNotice() ?? '');
  const [lockedUntil, setLockedUntil] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const submitting = useRef(false);

  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setSecondsLeft(left);
      if (!left) {
        setLockedUntil(0);
        setMessage('다시 시도할 수 있습니다.');
      }
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [lockedUntil]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || lockedUntil > Date.now()) return;
    setMessage('');
    if (!username.trim() || !password) {
      setMessage('아이디와 비밀번호를 입력해주세요');
      return;
    }
    submitting.current = true;
    setBusy(true);
    let succeeded = false;
    try {
      await login({ userId: username.trim(), password });
      succeeded = true;
      setSessionNotice(null);
      onSuccess();
    } catch (error) {
      if (error instanceof LoginError && error.lockedSeconds > 0) {
        setMessage(error.message);
        setSecondsLeft(error.lockedSeconds);
        setLockedUntil(Date.now() + error.lockedSeconds * 1000);
      } else if (error instanceof LoginError && error.resultCode === '300') {
        setMessage('아이디 또는 비밀번호가 올바르지 않습니다');
      } else {
        setMessage(error instanceof Error ? error.message : '로그인에 실패했어요');
      }
    } finally {
      if (!succeeded) {
        submitting.current = false;
        setBusy(false);
      }
    }
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const feedback = secondsLeft > 0
    ? `로그인 시도가 너무 많습니다. ${minutes ? `${minutes}분 ` : ''}${seconds}초 후에 다시 시도해주세요.`
    : message;

  return { username, password, setUsername, setPassword, busy, secondsLeft, feedback, submit };
}
export type LoginFormState = ReturnType<typeof useLoginForm>;
