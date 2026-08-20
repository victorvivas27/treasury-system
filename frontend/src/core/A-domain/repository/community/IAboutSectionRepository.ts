import type { AboutSection, AboutSectionPayload } from "../../entities/community/AboutSection";

export interface IAboutSectionRepository {
  publicList(): Promise<AboutSection[]>;
  adminList(): Promise<AboutSection[]>;
  create(payload: AboutSectionPayload): Promise<AboutSection>;
  update(id: number, payload: AboutSectionPayload): Promise<AboutSection>;
  delete(id: number): Promise<void>;
}
