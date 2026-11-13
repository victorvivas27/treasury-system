import { apiClient } from '@/core/D-config/api';
import type { ILoaderSettingsRepository } from '@/core/A-domain/repository/treasury/ILoaderSettingsRepository';
import type { LoaderConfiguration, LoaderPreference, LoaderSection } from '@/core/A-domain/entities/treasury/LoaderSettings';
const endpoint = '/tesoreria/configuracion-general/loaders';
export class LoaderSettingsRepositoryImpl implements ILoaderSettingsRepository {
  async get(): Promise<LoaderConfiguration> {
    return (await apiClient.get<LoaderConfiguration>(endpoint, { timeout: 5000 })).data;
  }
  async save(section: LoaderSection, preference: LoaderPreference): Promise<LoaderPreference> {
    return (await apiClient.put<LoaderPreference>(`${endpoint}/${section === 'startup' ? 'inicio' : 'paginas'}`, preference)).data;
  }
}
