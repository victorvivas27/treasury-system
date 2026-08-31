import type { User } from "@/core/A-domain/entities/user/User";
import { UserRepositoryImpl } from "@/core/C-infra/repositories/user/UserRepositoryImpl";

type AvatarUser = Pick<User, "profileImageType" | "profileImageUrl"> & { id?: number };

const repository = new UserRepositoryImpl();
const objectUrlCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string>>();
let cacheGeneration = 0;

const avatarCacheKey = (user: AvatarUser, customImageUserId?: number) => {
  const owner = customImageUserId ?? user.id ?? "me";
  return `${owner}:${user.profileImageUrl ?? "current"}`;
};

export const loadCachedProfileImage = (
  user: AvatarUser,
  customImageUserId?: number,
): Promise<string> => {
  const key = avatarCacheKey(user, customImageUserId);
  const cached = objectUrlCache.get(key);
  if (cached) return Promise.resolve(cached);

  const pending = pendingRequests.get(key);
  if (pending) return pending;

  const requestGeneration = cacheGeneration;
  const request = (customImageUserId === undefined
    ? repository.getProfileImage(user.profileImageUrl ?? undefined)
    : repository.getProfileImageByUserId(customImageUserId, user.profileImageUrl ?? undefined))
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      if (requestGeneration !== cacheGeneration) {
        URL.revokeObjectURL(objectUrl);
        throw new Error("Profile image cache was cleared");
      }
      objectUrlCache.set(key, objectUrl);
      pendingRequests.delete(key);
      return objectUrl;
    })
    .catch((error: unknown) => {
      pendingRequests.delete(key);
      throw error;
    });

  pendingRequests.set(key, request);
  return request;
};

export const prefetchUserProfileImage = (user: User | null) => {
  if (user?.profileImageType !== "CUSTOM_IMAGE") return;
  void loadCachedProfileImage(user).catch(() => undefined);
};

export const clearProfileImageCache = () => {
  cacheGeneration += 1;
  objectUrlCache.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
  objectUrlCache.clear();
  pendingRequests.clear();
};
