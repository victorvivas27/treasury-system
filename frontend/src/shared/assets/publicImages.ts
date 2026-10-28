import manifest from "./publicImages.manifest.json";

type PublicImageName = keyof typeof manifest.images;

const imageBaseUrl = manifest.baseUrl;

export const publicImages = Object.fromEntries(
  Object.entries(manifest.images).map(([name, image]) => [name, `${imageBaseUrl}/${image.file}`]),
) as Record<PublicImageName, string>;
