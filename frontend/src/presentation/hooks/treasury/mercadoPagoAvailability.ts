import { mercadoPagoRepository } from "@/core/C-infra/repositories/treasury/MercadoPagoRepository";
import { createDashboardResource } from "@/presentation/pages/dashboard/dashboardCache";
import { DASHBOARD_RESET } from "@/shared/treasury/dashboardEvents";

export const mercadoPagoAvailability = createDashboardResource(() => mercadoPagoRepository.available());
window.addEventListener(DASHBOARD_RESET, () => mercadoPagoAvailability.clear());
