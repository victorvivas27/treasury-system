export type AboutIcon = "USERS" | "HEART" | "STAR" | "BOOK" | "TARGET" | "SMILE"
  | "AWARD" | "COMPASS" | "GIFT" | "MUSIC" | "SUN";
export type AboutAccent = "TURQUOISE" | "BLUE" | "PURPLE" | "ORANGE" | "PINK" | "GREEN";

export interface AboutSection {
  id: number;
  title: string;
  description: string;
  displayOrder: number;
  visible: boolean;
  icon: AboutIcon;
  accentColor: AboutAccent;
  highlightedPhrase: string | null;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AboutSectionPayload = Pick<AboutSection,
  "title" | "description" | "displayOrder" | "visible" | "icon" | "accentColor"
  | "highlightedPhrase" | "featured">;
