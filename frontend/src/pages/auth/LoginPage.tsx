import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from './components/LoginForm';
import { useLoginForm } from './hooks/useLoginForm';
import './LoginPage.css';

// 기존 송연 로그인 화면과 같은 모양·문구. 탭 제목도 기존과 같게 둔다.
const LOGIN_TITLE = '송연 영업관리 - 로그인';

function LoginPage() {
  const navigate = useNavigate();
  const state = useLoginForm(() => navigate('/', { replace: true }));

  useEffect(() => {
    const previousTitle = document.title;
    document.title = LOGIN_TITLE;
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="songyeon-login">
      <main className="login-layout">
        <section className="login-box" aria-labelledby="login-title">
          <h1 id="login-title" className="brand">송연</h1>
          <LoginForm state={state} />
        </section>
      </main>
    </div>
  );
}

export default LoginPage;
