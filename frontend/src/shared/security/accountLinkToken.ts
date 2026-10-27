type LinkLocation = Pick<Location, "pathname" | "search" | "hash">;
const accountPaths = new Set(["/restablecer-password", "/aceptar-invitacion", "/verificar-correo"]);
let initialToken: { pathname: string; token: string } | undefined;
export const isAccountLinkPath = (pathname: string) => {
  try { return accountPaths.has(decodeURIComponent(pathname).toLowerCase().replace(/\/+$/, "")); }
  catch { return false; }
};

export const readAccountLinkToken = (location: LinkLocation) =>
  new URLSearchParams(location.hash.slice(1)).get("token")
  ?? new URLSearchParams(location.search).get("token")
  ?? (initialToken?.pathname === location.pathname ? initialToken.token : "");

export const cleanAccountLinkUrl = () => {
  const url = new URL(window.location.href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  if (!url.searchParams.has("token") && !fragment.has("token")) return;
  url.searchParams.delete("token");
  if (fragment.has("token")) {
    fragment.delete("token");
    url.hash = fragment.toString();
  }
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
};

// Runs before React/router initialization; never persist the captured credential.
export const captureInitialAccountLinkToken = () => {
  initialToken = undefined;
  if (!isAccountLinkPath(window.location.pathname)) return;
  const token = readAccountLinkToken(window.location);
  if (token) initialToken = { pathname: window.location.pathname, token };
  cleanAccountLinkUrl();
};

export const releaseInitialAccountLinkToken = () => { initialToken = undefined; };
