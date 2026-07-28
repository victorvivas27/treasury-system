import type { AnnualFeeConfigPayload, PaymentMode, TreasuryFilters,
  TreasuryReportType } from "@/core/A-domain/entities/treasury/Treasury";
import type { ContributionConfig, ContributionFilters,
  ContributionType } from "@/core/A-domain/entities/treasury/Treasury";
import type { ExpenseFilters, ExpensePayload } from "@/core/A-domain/entities/treasury/Treasury";
import type { IncomeFilters, IncomePayload } from "@/core/A-domain/entities/treasury/Treasury";
  import type { EventSettlement, SchoolEvent,
    TreasuryDashboardOverview } from "@/core/A-domain/entities/treasury/Treasury";
import type { ITreasuryRepository } from "@/core/A-domain/repository/treasury/ITreasuryRepository";
import { apiClient } from "@/core/D-config/api";

export class TreasuryRepositoryImpl implements ITreasuryRepository {
  private readonly baseUrl = "/tesoreria";

  async listConfigs() {
    return (await apiClient.get(`${this.baseUrl}/configuraciones`)).data;
  }
  async getManagedCourse(): Promise<string> {
    return (await apiClient.get<{ course: string }>(
      `${this.baseUrl}/configuracion-general/curso`)).data.course;
  }
  async saveManagedCourse(course: string): Promise<string> {
    return (await apiClient.put<{ course: string }>(
      `${this.baseUrl}/configuracion-general/curso`, { course })).data.course;
  }
  async saveConfig(year: number, payload: AnnualFeeConfigPayload) {
    return (await apiClient.put(`${this.baseUrl}/configuraciones/${year}`, payload)).data;
  }
  async listPlans(year: number) {
    return (await apiClient.get(`${this.baseUrl}/modalidades`, { params: { year } })).data;
  }
  async assignMode(year: number, familyId: number, mode: PaymentMode) {
    return (await apiClient.put(`${this.baseUrl}/modalidades/${familyId}`, { year, mode })).data;
  }
  async removeFamilyPlan(year: number, familyId: number, reason: string) {
    await apiClient.post(`${this.baseUrl}/modalidades/${familyId}/anulacion`,
      { reason }, { params: { year } });
  }
  async generate(year: number) {
    return (await apiClient.post<{ generated: number }>(
      `${this.baseUrl}/obligaciones/generar/${year}`,
    )).data.generated;
  }
  async listObligations(year: number, filters: TreasuryFilters = {}) {
    return (await apiClient.get(`${this.baseUrl}/obligaciones`, {
      params: { year, ...filters },
    })).data;
  }
  async pay(obligationId: number, paymentDate: string, amount: number,
    observations?: string) {
    await apiClient.post(`${this.baseUrl}/obligaciones/${obligationId}/pagos`,
      { paymentDate, amount, observations });
  }
  async annul(obligationId: number, reason: string) {
    await apiClient.post(`${this.baseUrl}/obligaciones/${obligationId}/anulacion`, { reason });
  }
  async dashboard(year: number) {
    return (await apiClient.get(`${this.baseUrl}/dashboard`, { params: { year } })).data;
  }
  async dashboardOverview(year: number): Promise<TreasuryDashboardOverview> {
    return (await apiClient.get(`${this.baseUrl}/dashboard/overview`,
      { params: { year } })).data;
  }
  async clearAudits(year: number, ids: number[] = [], all = false): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/auditoria`, {
      params: { year },
      data: { ids, all },
    });
  }
  async reports(year: number, type: TreasuryReportType) {
    return (await apiClient.get(`${this.baseUrl}/reportes`, { params: { year, type } })).data;
  }
  async listContributionConfigs(year: number) {
    return (await apiClient.get(`${this.baseUrl}/aportes/configuraciones`,
      { params: { year } })).data;
  }
  async saveContributionConfig(year: number, type: ContributionType,
    payload: Omit<ContributionConfig, "id" | "schoolYear" | "type">) {
    return (await apiClient.put(
      `${this.baseUrl}/aportes/configuraciones/${year}/${type}`, payload)).data;
  }
  async listContributions(year: number, filters: ContributionFilters = {}) {
    return (await apiClient.get(`${this.baseUrl}/aportes`,
      { params: { year, ...filters } })).data;
  }
  async contributionSummary(year: number) {
    return (await apiClient.get(`${this.baseUrl}/aportes/resumen`,
      { params: { year } })).data;
  }
  async payContribution(familyId: number, schoolYear: number,
    contributionType: ContributionType, paymentDate: string, notes?: string) {
    await apiClient.post(`${this.baseUrl}/aportes/${familyId}/pagos`,
      { schoolYear, contributionType, paymentDate, notes });
  }
  async cancelContribution(id: number, reason: string) {
    await apiClient.patch(`${this.baseUrl}/aportes/${id}/anulacion`, { reason });
  }
  async listExpenses(year: number, filters: ExpenseFilters = {}) {
    return (await apiClient.get(`${this.baseUrl}/egresos`,
      { params: { year, ...filters } })).data;
  }
  async getExpense(id: number) {
    return (await apiClient.get(`${this.baseUrl}/egresos/${id}`)).data;
  }
  async createExpense(payload: ExpensePayload) {
    return (await apiClient.post(`${this.baseUrl}/egresos`, payload)).data;
  }
  async updateExpense(id: number, payload: ExpensePayload) {
    return (await apiClient.patch(`${this.baseUrl}/egresos/${id}`, payload)).data;
  }
  async cancelExpense(id: number, reason: string) {
    return (await apiClient.patch(`${this.baseUrl}/egresos/${id}/anulacion`,
      { reason })).data;
  }
  async financialSummary(year: number) {
    return (await apiClient.get(`${this.baseUrl}/resumen-financiero`,
      { params: { year } })).data;
  }
  async listIncomes(year: number, filters: IncomeFilters = {}) {
    return (await apiClient.get(`${this.baseUrl}/ingresos`,
      { params: { year, ...filters } })).data;
  }
  async getIncome(id: number) {
    return (await apiClient.get(`${this.baseUrl}/ingresos/${id}`)).data;
  }
  async createIncome(payload: IncomePayload) {
    return (await apiClient.post(`${this.baseUrl}/ingresos`, payload)).data;
  }
  async updateIncome(id: number, payload: IncomePayload) {
    return (await apiClient.patch(`${this.baseUrl}/ingresos/${id}`, payload)).data;
  }
  async cancelIncome(id: number, reason: string) {
    return (await apiClient.patch(`${this.baseUrl}/ingresos/${id}/anulacion`,
      { reason })).data;
  }
  async listEvents(year: number): Promise<SchoolEvent[]> {
    return (await apiClient.get(`${this.baseUrl}/eventos`, { params: { year } })).data;
  }
  async createEvent(payload: {
    name: string; schoolYear: number; eventDate: string; description?: string;
    participants: Array<{ course: string; standName: string; standType?: string }>;
  }): Promise<SchoolEvent> {
    return (await apiClient.post(`${this.baseUrl}/eventos`, payload)).data;
  }
  async updateEvent(id: number, payload: {
    name: string; schoolYear: number; eventDate: string; description?: string;
    participants: Array<{ course: string; standName: string; standType?: string }>;
  }): Promise<SchoolEvent> {
    return (await apiClient.put(`${this.baseUrl}/eventos/${id}`, payload)).data;
  }
  async deleteEvent(id: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/eventos/${id}`);
  }
  async addEventExpense(id: number, payload: {
    description: string; amount: number; date: string; type: "COMMON" | "COURSE";
    course?: string; category?: string; responsible?: string; paymentMethod?: string;
    deductFromSettlement?: boolean;
  }): Promise<SchoolEvent> {
    return (await apiClient.post(`${this.baseUrl}/eventos/${id}/gastos`, payload)).data;
  }
  async updateEventExpense(id: number, key: string, payload: {
    description: string; amount: number; date: string; type: "COMMON" | "COURSE";
    course?: string; category?: string; responsible?: string; paymentMethod?: string;
    deductFromSettlement?: boolean;
  }): Promise<SchoolEvent> {
    return (await apiClient.put(`${this.baseUrl}/eventos/${id}/gastos/${key}`, payload)).data;
  }
  async deleteEventExpense(id: number, key: string): Promise<SchoolEvent> {
    return (await apiClient.delete(`${this.baseUrl}/eventos/${id}/gastos/${key}`)).data;
  }
  async registerEventRevenue(id: number, payload: {
    amount: number; date: string; description?: string; paymentMethod?: string;
  }): Promise<SchoolEvent> {
    return (await apiClient.put(`${this.baseUrl}/eventos/${id}/recaudacion`, payload)).data;
  }
  async calculateEvent(id: number): Promise<EventSettlement> {
    return (await apiClient.post(`${this.baseUrl}/eventos/${id}/liquidacion/calcular`)).data;
  }
  async confirmEvent(id: number): Promise<SchoolEvent> {
    return (await apiClient.post(`${this.baseUrl}/eventos/${id}/liquidacion/confirmar`)).data;
  }
  async cancelEventSettlement(id: number): Promise<SchoolEvent> {
    return (await apiClient.post(`${this.baseUrl}/eventos/${id}/liquidacion/cancelar`)).data;
  }
}
