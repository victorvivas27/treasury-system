import type { AboutSection } from "@/core/A-domain/entities/community/AboutSection";
import type { BoardMember } from "@/core/A-domain/entities/community/BoardMember";
import type { CoursePhoto } from "@/core/A-domain/entities/community/CoursePhoto";
import { AboutSectionUseCases } from "@/core/B-application/use-cases/community/AboutSectionUseCases";
import { AboutSectionRepositoryImpl } from "@/core/C-infra/repositories/community/AboutSectionRepositoryImpl";
import { coursePhotos } from "@/core/C-infra/repositories/community/CoursePhotoRepository";
import { courseBoard } from "@/core/C-infra/repositories/community/CourseBoardRepository";
import { HOME_COMMUNITY_CHANGED, HOME_COMMUNITY_RESET } from "@/shared/community/homeCommunityEvents";

type ReadyPhoto = CoursePhoto & { url: string; contained: boolean };
interface CommunitySnapshot {
  sections: AboutSection[];
  board: BoardMember[];
  photos: ReadyPhoto[];
  ready: boolean;
  detailsReady: boolean;
  error: string;
}
const emptySnapshot = (): CommunitySnapshot => ({
  sections: [], board: [], photos: [], ready: false, detailsReady: false, error: "",
});
const about = new AboutSectionUseCases(new AboutSectionRepositoryImpl());
const FRESH_FOR_MS = 60_000;
let snapshot = emptySnapshot();
let updatedAt = 0;
let generation = 0;
let revision = 0;
let pending: Promise<void> | undefined;
const listeners = new Set<() => void>();
const ownedUrls = new Set<string>();
const publish = (patch: Partial<CommunitySnapshot>) => {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach(listener => listener());
};
const releaseUrl = (url: string) => {
  URL.revokeObjectURL(url);
  ownedUrls.delete(url);
};

export const homeCommunityCache = {
  getSnapshot: () => snapshot,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  invalidate() { updatedAt = 0; revision += 1; },
  clear() {
    generation += 1;
    pending = undefined;
    updatedAt = 0;
    ownedUrls.forEach(url => URL.revokeObjectURL(url));
    ownedUrls.clear();
    snapshot = emptySnapshot();
    listeners.forEach(listener => listener());
  },
  load(): Promise<void> {
    if (pending) return pending;
    if (updatedAt && Date.now() - updatedAt < FRESH_FOR_MS) return Promise.resolve();
    const requestGeneration = generation;
    const requestRevision = revision;
    if (snapshot.error) publish({ error: "" });
    const request = (async () => {
      const [sections, photos, board] = await Promise.allSettled([
        about.publicList(), coursePhotos.list(), courseBoard.list(),
      ]);
      if (requestGeneration !== generation) return;
      if (sections.status !== "fulfilled" || photos.status !== "fulfilled" || board.status !== "fulfilled") {
        publish({ error: "No pudimos preparar el inicio. Intenta nuevamente." });
        return;
      }
      publish({ sections: sections.value, board: board.value, detailsReady: true });
      const loadPhoto = async (photo: CoursePhoto) => {
        const existing = snapshot.photos.find(item => item.id === photo.id && item.imageUrl === photo.imageUrl);
        if (existing) return { ...existing, ...photo };
        const url = await coursePhotos.loadImageUrl(photo);
        if (requestGeneration !== generation) { URL.revokeObjectURL(url); return null; }
        ownedUrls.add(url);
        try {
          const contained = await new Promise<boolean>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image.naturalWidth / image.naturalHeight < 1.1);
            image.onerror = () => reject(new Error("Photo unavailable"));
            image.src = url;
          });
          return { ...photo, url, contained };
        } catch (error) { releaseUrl(url); throw error; }
      };
      // Only the visible photo blocks entry; the rest of the gallery loads afterwards.
      let firstPhoto: ReadyPhoto | null = null;
      try {
        if (photos.value.length) firstPhoto = await loadPhoto(photos.value[0]);
      } catch {
        if (requestGeneration === generation) publish({ error: "No pudimos cargar la foto de inicio. Intenta nuevamente." });
        return;
      }
      if (requestGeneration !== generation) return;
      const previousPhotos = snapshot.photos;
      const initialPhotos = photos.value.flatMap((photo, index) => {
        if (index === 0) return firstPhoto ? [firstPhoto] : [];
        const previous = previousPhotos.find(item => item.id === photo.id && item.imageUrl === photo.imageUrl);
        return previous ? [{ ...previous, ...photo }] : [];
      });
      publish({ sections: sections.value, board: board.value, photos: initialPhotos, ready: true, error: "" });
      const images = await Promise.allSettled(photos.value.slice(1).map(loadPhoto));
      if (requestGeneration !== generation) return;
      const readyPhotos = [...(firstPhoto ? [firstPhoto] : []), ...images.flatMap((result, index) => {
        if (result.status === "fulfilled") return result.value ? [result.value] : [];
        const previous = previousPhotos.find(photo => photo.id === photos.value[index + 1].id);
        return previous ? [previous] : [];
      })];
      publish({ photos: readyPhotos });
      previousPhotos.forEach(photo => {
        if (!readyPhotos.some(item => item.url === photo.url)) releaseUrl(photo.url);
      });
      if (images.every(image => image.status === "fulfilled") && requestRevision === revision) updatedAt = Date.now();
    })().finally(() => {
      if (requestGeneration === generation) pending = undefined;
    });
    pending = request;
    return request;
  },
};

window.addEventListener(HOME_COMMUNITY_CHANGED, homeCommunityCache.invalidate);
window.addEventListener(HOME_COMMUNITY_RESET, homeCommunityCache.clear);
