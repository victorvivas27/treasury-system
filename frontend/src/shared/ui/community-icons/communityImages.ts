import type { AboutIcon } from '@/core/A-domain/entities/community/AboutSection';
import families from '@/assets/community-icons/community-families.webp';
import care from '@/assets/community-icons/community-care.webp';
import participation from '@/assets/community-icons/community-participation.webp';
import learning from '@/assets/community-icons/community-learning.webp';
import goals from '@/assets/community-icons/community-goals.webp';
import joy from '@/assets/community-icons/community-joy.webp';
import tree from '@/assets/community-icons/community-tree.webp';

const images: Partial<Record<AboutIcon, string>> = {
  USERS: families, HEART: care, STAR: participation, BOOK: learning,
  TARGET: goals, SMILE: joy, SUN: tree,
};

export const communityImage = (icon: AboutIcon): string => images[icon] ?? families;
