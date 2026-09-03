import type {
  CreateOrganizationAdminPayload,
  CreateOrganizationPayload,
  DeleteOrganizationPayload,
  Organization,
  OrganizationAdmin,
  OrganizationLoginOption,
  OrganizationCoursePayload,
  OrganizationEmailPayload,
} from "@/core/A-domain/entities/organization/Organization";
import { apiClient } from "@/core/D-config/api";

export class OrganizationRepositoryImpl {
  private readonly baseUrl = "/organizations";

  async getAll(): Promise<Organization[]> {
    return (await apiClient.get<Organization[]>(this.baseUrl)).data;
  }

  async getLoginOptions(): Promise<OrganizationLoginOption[]> {
    return (await apiClient.get<OrganizationLoginOption[]>(`${this.baseUrl}/login-options`)).data;
  }

  async create(payload: CreateOrganizationPayload): Promise<Organization> {
    return (await apiClient.post<Organization>(this.baseUrl, payload)).data;
  }

  async getAdmins(organizationId: number): Promise<OrganizationAdmin[]> {
    return (await apiClient.get<OrganizationAdmin[]>(
      `${this.baseUrl}/${organizationId}/admins`,
    )).data;
  }

  async createAdmin(
    organizationId: number,
    payload: CreateOrganizationAdminPayload,
  ): Promise<number> {
    return (await apiClient.post<number>(
      `${this.baseUrl}/${organizationId}/admins`, payload,
    )).data;
  }

  async setActive(organizationId: number, active: boolean): Promise<Organization> {
    return (await apiClient.patch<Organization>(
      `${this.baseUrl}/${organizationId}/active`, undefined, { params: { value: active } },
    )).data;
  }

  async updateEmailBranding(
    organizationId: number,
    payload: OrganizationEmailPayload,
  ): Promise<Organization> {
    return (await apiClient.patch<Organization>(
      `${this.baseUrl}/${organizationId}/email-branding`, payload,
    )).data;
  }

  async updateCourse(
    organizationId: number,
    payload: OrganizationCoursePayload,
  ): Promise<Organization> {
    return (await apiClient.patch<Organization>(
      `${this.baseUrl}/${organizationId}/course`, payload,
    )).data;
  }

  async delete(
    organizationId: number,
    payload: DeleteOrganizationPayload,
  ): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${organizationId}`, { data: payload });
  }
}
