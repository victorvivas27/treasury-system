import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/core/A-domain/entities/user/User';
import { clearProfileImageCache, loadCachedProfileImage, prefetchUserProfileImage } from './profileImageCache';

const { ownImage, userImage } = vi.hoisted(() => ({ ownImage: vi.fn(), userImage: vi.fn() }));
vi.mock('@/core/C-infra/repositories/user/UserRepositoryImpl', () => ({
  UserRepositoryImpl: class { getProfileImage = ownImage; getProfileImageByUserId = userImage; },
}));
const user = { id: 7, profileImageType: 'CUSTOM_IMAGE' as const, profileImageUrl: 'version-1' };
const blob = new Blob(['image'], { type: 'image/png' });

beforeEach(() => {
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = vi.fn().mockReturnValue('blob:profile');
    static revokeObjectURL = vi.fn();
  });
  clearProfileImageCache();
  ownImage.mockReset().mockResolvedValue(blob);
  userImage.mockReset().mockResolvedValue(blob);
});

afterEach(() => {
  clearProfileImageCache();
  vi.unstubAllGlobals();
});

describe('profile image cache', () => {
  it('shares an in-flight request and reuses the cached object URL', async () => {
    const first = loadCachedProfileImage(user);
    const concurrent = loadCachedProfileImage(user);
    expect(first).toBe(concurrent);
    await expect(first).resolves.toBe('blob:profile');
    await expect(loadCachedProfileImage(user)).resolves.toBe('blob:profile');
    expect(ownImage).toHaveBeenCalledExactlyOnceWith('version-1');
    expect(URL.createObjectURL).toHaveBeenCalledExactlyOnceWith(blob);
  });

  it('separates owners and image versions and uses the explicit owner endpoint', async () => {
    await loadCachedProfileImage(user, 10);
    await loadCachedProfileImage(user, 11);
    await loadCachedProfileImage({ ...user, profileImageUrl: 'version-2' }, 10);
    expect(userImage.mock.calls).toEqual([[10, 'version-1'], [11, 'version-1'], [10, 'version-2']]);
    expect(ownImage).not.toHaveBeenCalled();
  });

  it('supports the current user endpoint when ID and image version are absent', async () => {
    await loadCachedProfileImage({ profileImageType: 'CUSTOM_IMAGE', profileImageUrl: null });
    expect(ownImage).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it('allows retry after a download fails', async () => {
    ownImage.mockRejectedValueOnce(new Error('Offline'));
    await expect(loadCachedProfileImage(user)).rejects.toThrow('Offline');
    await expect(loadCachedProfileImage(user)).resolves.toBe('blob:profile');
    expect(ownImage).toHaveBeenCalledTimes(2);
  });

  it('revokes cached URLs when the session cache is cleared', async () => {
    await loadCachedProfileImage(user);
    clearProfileImageCache();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:profile');
    await loadCachedProfileImage(user);
    expect(ownImage).toHaveBeenCalledTimes(2);
  });

  it('discards a previous session image that finishes downloading after logout', async () => {
    let resolve!: (value: Blob) => void;
    ownImage.mockReturnValueOnce(new Promise<Blob>(done => { resolve = done; }));
    const download = loadCachedProfileImage(user);
    clearProfileImageCache();
    resolve(blob);
    await expect(download).rejects.toThrow('Profile image cache was cleared');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:profile');
    await loadCachedProfileImage(user);
    expect(ownImage).toHaveBeenCalledTimes(2);
  });

  it('prefetches custom images only and handles a failed prefetch without leaking a rejection', async () => {
    prefetchUserProfileImage(null);
    prefetchUserProfileImage({ ...user, profileImageType: 'INITIALS' } as User);
    expect(ownImage).not.toHaveBeenCalled();
    ownImage.mockRejectedValueOnce(new Error('Offline'));
    prefetchUserProfileImage(user as User);
    await vi.waitFor(() => expect(ownImage).toHaveBeenCalledOnce());
    await Promise.resolve();
    await Promise.resolve();
    await expect(loadCachedProfileImage(user)).resolves.toBe('blob:profile');
  });
});
