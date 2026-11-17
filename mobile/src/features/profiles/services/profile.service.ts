import { http } from '@/infrastructure/api/http-client';
import type {
  AccountProfile,
  UpdateMyProfileRequest,
} from '@/shared/types/api';

export async function getMyProfile(): Promise<AccountProfile> {
  return http<AccountProfile>('/identity/me');
}

export async function updateMyProfile(
  input: UpdateMyProfileRequest,
): Promise<AccountProfile> {
  return http<AccountProfile>('/identity/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}