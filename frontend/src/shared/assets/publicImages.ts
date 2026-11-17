import manifest from "./publicImages.manifest.json";

type PublicImageName = keyof typeof manifest.images;

const imageBaseUrl = manifest.baseUrl;

const manifestImages = Object.fromEntries(
  Object.entries(manifest.images).map(([name, image]) => [name, `${imageBaseUrl}/${image.file}`]),
) as Record<PublicImageName, string>;

export const publicImages = {
  ...manifestImages,
  loginDesktop: "/app-images/v1/principal_login.png",
  loginMobile: "/app-images/v1/principal_login_movil.png",
};
