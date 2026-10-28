import { apiGet, apiPut } from '../../../shared/services/apiClient';
import type {
  ChangeMyPasswordPayload,
  MyProfile,
  UpdateMyProfilePayload,
} from '../types/profileSettings';

export const fetchMyProfile = (): Promise<MyProfile> =>
  apiGet<MyProfile>('/api/v1/users/me/profile');

export const updateMyProfile = (
  payload: UpdateMyProfilePayload,
): Promise<MyProfile> => apiPut<MyProfile>('/api/v1/users/me/profile', payload);

export const changeMyPassword = (
  payload: ChangeMyPasswordPayload,
): Promise<void> => apiPut<void>('/api/v1/users/me/password', payload);
