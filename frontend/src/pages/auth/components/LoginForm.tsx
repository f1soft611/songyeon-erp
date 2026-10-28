import { useRef } from 'react';
import type { LoginFormState } from '../hooks/useLoginForm';

// 기존 송연 로그인 폼과 같은 구성(로그인아이디 · 비밀번호 · 로그인 버튼 · 안내 문구)
export function LoginForm({ state }: { state: LoginFormState }) {
  const { username, password, setUsername, setPassword, busy, secondsLeft, feedback, submit } = state;
  const passwordInput = useRef<HTMLInputElement>(null);
  return (
        <form onSubmit={submit} noValidate aria-busy={busy}>
          <div className="field">
            <label htmlFor="username">로그인아이디</label>
            <input id="username" name="username" autoComplete="username" autoFocus
              value={username} onChange={event => setUsername(event.target.value)}
              readOnly={busy} aria-describedby="login-message"
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  passwordInput.current?.focus();
                }
              }} />
          </div>
          <div className="field">
            <label htmlFor="password">비밀번호</label>
            <input ref={passwordInput} id="password" name="password" type="password"
              autoComplete="current-password" value={password}
              onChange={event => setPassword(event.target.value)} readOnly={busy}
              aria-describedby="login-message" />
          </div>
          <button className="login-btn" disabled={busy || secondsLeft > 0}>
            {busy ? '확인 중…' : '로그인'}
          </button>
          <p id="login-message" className="error-msg" role="status" aria-live="polite">{feedback}</p>
        </form>
  );
}
