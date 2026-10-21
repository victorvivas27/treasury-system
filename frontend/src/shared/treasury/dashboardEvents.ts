export const DASHBOARD_RESET = "dashboard:reset";
export const resetDashboard = () => window.dispatchEvent(new Event(DASHBOARD_RESET));
