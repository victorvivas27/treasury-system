export type OrganizationType = "LEGACY" | "SCHOOL" | "COURSE";

export interface Organization {
  id: number;
  name: string;
  slug: string;
  type: OrganizationType;
  active: boolean;
  courseName: string | null;
  schoolYear: number;
  senderName: string | null;
  replyToEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationAdmin {
  id: number;
  name: string;
  email: string;
  enabled: boolean;
  accountNonLocked: boolean;
  createdAt: string;
}

export interface CreateOrganizationPayload {
  name: string;
  slug: string;
  type: OrganizationType;
  senderName?: string;
  replyToEmail?: string;
}

export interface OrganizationEmailPayload {
  senderName: string;
  replyToEmail: string;
}

export interface OrganizationCoursePayload {
  name: string;
  schoolYear: number;
}

export interface DeleteOrganizationPayload {
  organizationName: string;
  confirmation: string;
}

export interface CreateOrganizationAdminPayload {
  name: string;
  email: string;
  password: string;
}
