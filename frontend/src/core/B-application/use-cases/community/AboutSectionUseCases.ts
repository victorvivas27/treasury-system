import type { AboutSectionPayload } from "@/core/A-domain/entities/community/AboutSection";
import type { IAboutSectionRepository } from "@/core/A-domain/repository/community/IAboutSectionRepository";

export class AboutSectionUseCases {
  private readonly repository: IAboutSectionRepository;
  constructor(repository: IAboutSectionRepository) { this.repository = repository; }
  publicList() { return this.repository.publicList(); }
  adminList() { return this.repository.adminList(); }
  create(payload: AboutSectionPayload) { return this.repository.create(payload); }
  update(id: number, payload: AboutSectionPayload) { return this.repository.update(id, payload); }
  delete(id: number) { return this.repository.delete(id); }
}
