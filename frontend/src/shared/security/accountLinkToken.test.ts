import { afterEach, describe, expect, it, vi } from "vitest";
import { captureInitialAccountLinkToken, cleanAccountLinkUrl, isAccountLinkPath, readAccountLinkToken, releaseInitialAccountLinkToken } from "./accountLinkToken";

afterEach(() => {
  releaseInitialAccountLinkToken();
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
});

describe("account link credentials", () => {
  it("recognizes router-compatible path variants and rejects malformed paths", () => {
    for (const path of ["/RESTABLECER-PASSWORD/", "/aceptar-invitacion/", "/%76erificar-correo"]) expect(isAccountLinkPath(path)).toBe(true);
    expect(isAccountLinkPath("/%malformed")).toBe(false);
    expect(isAccountLinkPath("/other")).toBe(false);
  });
  it.each(["restablecer-password", "aceptar-invitacion", "verificar-correo"])("captures and removes new/old tokens for %s before router startup", (path) => {
    for (const suffix of ["#token=fixture", "?token=fixture"]) {
      window.history.replaceState({ marker: "router-state" }, "", `/${path}${suffix}`);
      const local = vi.spyOn(Storage.prototype, "setItem");
      captureInitialAccountLinkToken();
      expect(window.location.href).not.toContain("token=");
      expect(window.history.state).toEqual({ marker: "router-state" });
      expect(readAccountLinkToken(window.location)).toBe("fixture");
      expect(local).not.toHaveBeenCalled();
      releaseInitialAccountLinkToken();
      expect(readAccountLinkToken(window.location)).toBe("");
      local.mockRestore();
    }
  });

  it("prefers the fragment, removes both copies and retains unrelated navigation state", () => {
    window.history.replaceState(null, "", "/restablecer-password?token=old&lang=es#token=new&section=help");
    captureInitialAccountLinkToken();
    expect(window.location.search).toBe("?lang=es");
    expect(window.location.hash).toBe("#section=help");
    expect(readAccountLinkToken(window.location)).toBe("new");
  });

  it("does not capture credentials from other routes or reuse them on another account route", () => {
    window.history.replaceState(null, "", "/login#token=unrelated");
    captureInitialAccountLinkToken();
    expect(window.location.hash).toBe("#token=unrelated");
    window.history.replaceState(null, "", "/aceptar-invitacion#token=invitation");
    captureInitialAccountLinkToken();
    expect(readAccountLinkToken({ pathname: "/verificar-correo", search: "", hash: "" })).toBe("");
  });

  it("cleans empty and repeated tokens without altering an unrelated hash", () => {
    window.history.replaceState(null, "", "/verificar-correo?token=&token=other#help");
    cleanAccountLinkUrl();
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("#help");
  });
});
