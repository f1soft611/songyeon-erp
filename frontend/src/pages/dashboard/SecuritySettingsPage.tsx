import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import {
  Alert,
  Box,
  Button,
  Container,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changeMyPassword } from './services/profileSettings.service';
import { logout } from '../../shared/services/authService';

function SecuritySettingsPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      setError('모든 비밀번호를 입력해 주세요.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError('변경 비밀번호와 확인값이 일치하지 않습니다.');
      return;
    }
    if (newPassword.length < 8) {
      setError('변경 비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await changeMyPassword({
        currentPassword,
        newPassword,
        newPasswordConfirm,
      });
      logout();
      navigate('/login', { replace: true });
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : '비밀번호를 변경하지 못했습니다.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{ py: { xs: 2, sm: 4 }, overflowY: 'auto', height: '100%' }}
    >
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <IconButton aria-label="뒤로가기" onClick={() => navigate(-1)}>
            <ArrowBackOutlined />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              보안 설정
            </Typography>
            <Typography variant="body2" color="text.secondary">
              계정 비밀번호를 변경합니다.
            </Typography>
          </Box>
        </Stack>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <LockOutlined color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                비밀번호 변경
              </Typography>
            </Stack>
            <TextField
              label="현재 비밀번호"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
            />
            <TextField
              label="변경 비밀번호"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
            />
            <TextField
              label="변경 비밀번호 확인"
              type="password"
              value={newPasswordConfirm}
              onChange={(event) => setNewPasswordConfirm(event.target.value)}
              autoComplete="new-password"
            />
            <Stack
              direction="row"
              spacing={1}
              sx={{ justifyContent: 'flex-end' }}
            >
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? '변경 중...' : '변경'}
              </Button>
              <Button variant="outlined" onClick={() => navigate(-1)}>
                취소
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

export default SecuritySettingsPage;
