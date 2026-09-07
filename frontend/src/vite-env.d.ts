/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

declare module "virtual:avatar-catalog" {
  export const profileAvatars: string[];
  export default profileAvatars;
}
