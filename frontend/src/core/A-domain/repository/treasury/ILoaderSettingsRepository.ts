import type { LoaderConfiguration, LoaderPreference, LoaderSection } from '../../entities/treasury/LoaderSettings';
export interface ILoaderSettingsRepository {
  get(): Promise<LoaderConfiguration>;
  save(section: LoaderSection, preference: LoaderPreference): Promise<LoaderPreference>;
}
