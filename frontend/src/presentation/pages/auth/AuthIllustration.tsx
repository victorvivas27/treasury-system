import type { CSSProperties } from "react";
import { publicImages } from "@/shared/assets/publicImages";

// The mobile background is requested only when the phone stylesheet applies.
export const authIllustrationStyle = {
  "--auth-mobile-image": `url("${publicImages.loginMobile}")`,
} as CSSProperties;

// A hidden desktop illustration must not download on phones or tablets.
const transparentPixel = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

export const AuthIllustration = () => (
  <picture className="login-illustration" aria-hidden="true">
    <source media="(min-width: 1024px)" srcSet={publicImages.loginDesktop} />
    <img src={transparentPixel} alt="" width="1536" height="1024" fetchPriority="high" />
  </picture>
);
