import { useLayoutEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { cleanAccountLinkUrl, readAccountLinkToken, releaseInitialAccountLinkToken } from "@/shared/security/accountLinkToken";

export const useAccountLinkToken = () => {
  const location = useLocation();
  const [token] = useState(() => readAccountLinkToken(location));
  useLayoutEffect(() => {
    cleanAccountLinkUrl();
    releaseInitialAccountLinkToken();
  }, []);
  return token;
};
