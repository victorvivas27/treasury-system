import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ModalAlert } from "./ModalAler";

/** Show the result on the destination, consuming it so refresh/back cannot replay it. */
export function RouteSuccessToast() {
  const location = useLocation();
  const navigate = useNavigate();
  const [notice, setNotice] = useState<{ message: string; pathname: string } | null>(null);
  useEffect(() => {
    const state = location.state as Record<string, unknown> | null;
    if (typeof state?.successMessage !== "string" || !state.successMessage) return;
    setNotice({ message: state.successMessage, pathname: location.pathname });
    const { successMessage: _message, ...remainingState } = state;
    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true, state: Object.keys(remainingState).length ? remainingState : null,
    });
  }, [location, navigate]);
  return <ModalAlert isOpen={Boolean(notice && notice.pathname === location.pathname)}
    message={notice?.message ?? ""} type="success" variant="toast" autoCloseTime={3000}
    onClose={() => setNotice(null)} />;
}
