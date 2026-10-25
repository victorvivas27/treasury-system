import type {
  UserAppearancePreferences,
  UserAppearancePreferencesPayload,
} from "@/core/A-domain/entities/appearance/UserAppearancePreferences";
import { apiClient } from "@/core/D-config/api";

const ENDPOINT = "/users/me/preferences/appearance";
let pendingSave = Promise.resolve();

export const getUserAppearancePreferences = async () =>
  (await apiClient.get<UserAppearancePreferences>(ENDPOINT)).data;

export const saveUserAppearancePreferences = (preferences: UserAppearancePreferencesPayload) => {
  pendingSave = pendingSave.catch(() => undefined).then(() => apiClient.put(ENDPOINT, preferences));
  return pendingSave;
};
