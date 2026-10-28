import type { AboutIcon } from '@/core/A-domain/entities/community/AboutSection';
import { publicImages } from '@/shared/assets/publicImages';

const images: Partial<Record<AboutIcon, string>> = {
  USERS: publicImages.communityFamilies, HEART: publicImages.communityCare,
  STAR: publicImages.communityParticipation, BOOK: publicImages.communityLearning,
  TARGET: publicImages.communityGoals, SMILE: publicImages.communityJoy, SUN: publicImages.communityTree,
};

export const communityImage = (icon: AboutIcon): string => images[icon] ?? publicImages.communityFamilies;
