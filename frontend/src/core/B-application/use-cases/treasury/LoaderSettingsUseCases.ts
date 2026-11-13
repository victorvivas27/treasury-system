import type { ILoaderSettingsRepository } from '@/core/A-domain/repository/treasury/ILoaderSettingsRepository';
import type { LoaderPreference, LoaderSection } from '@/core/A-domain/entities/treasury/LoaderSettings';
export class LoaderSettingsUseCases {
  private readonly repository: ILoaderSettingsRepository;
  constructor(repository: ILoaderSettingsRepository) { this.repository = repository; }
  get() { return this.repository.get(); }
  save(section: LoaderSection, preference: LoaderPreference) { return this.repository.save(section, preference); }
}
