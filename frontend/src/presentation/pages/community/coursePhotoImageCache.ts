import type { CoursePhoto } from '@/core/A-domain/entities/community/CoursePhoto';
import { coursePhotos } from '@/core/C-infra/repositories/community/CoursePhotoRepository';
import { HOME_COMMUNITY_RESET } from '@/shared/community/homeCommunityEvents';

const images = new Map<string, { url?: string; pending?: Promise<string> }>();
let generation = 0;
const key = (photo: CoursePhoto) => `${photo.id}:${photo.imageUrl}`;
export const coursePhotoImageCache = {
  peek: (photo: CoursePhoto) => images.get(key(photo))?.url,
  clear() {
    generation += 1;
    images.forEach(image => { if (image.url) URL.revokeObjectURL(image.url); });
    images.clear();
  },
  load(photo: CoursePhoto): Promise<string> {
    const cached = images.get(key(photo));
    if (cached?.url) return Promise.resolve(cached.url);
    if (cached?.pending) return cached.pending;
    const requestGeneration = generation;
    const entry: { url?: string; pending?: Promise<string> } = {};
    entry.pending = coursePhotos.loadImageUrl(photo).then(async url => {
      if (requestGeneration !== generation) { URL.revokeObjectURL(url); throw new Error('Session changed'); }
      try {
        await new Promise<void>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve();
          image.onerror = reject;
          image.src = url;
        });
        if (requestGeneration !== generation) throw new Error('Session changed');
        entry.url = url;
        return url;
      } catch (error) { URL.revokeObjectURL(url); throw error; }
    }).finally(() => { entry.pending = undefined; });
    images.set(key(photo), entry);
    return entry.pending;
  },
};
window.addEventListener(HOME_COMMUNITY_RESET, coursePhotoImageCache.clear);
