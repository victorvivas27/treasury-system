export type ImprovementCategory =
  | "PAYMENTS"
  | "STUDENTS"
  | "REPORTS"
  | "UX"
  | "PERFORMANCE"
  | "COURSES_ADMIN"
  | "OTHER";

export type UserImpact = "USEFUL" | "DIFFICULT" | "BLOCKING";

export type ImprovementPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ImprovementStatus =
  | "RECEIVED"
  | "UNDER_REVIEW"
  | "PLANNED"
  | "IMPLEMENTED"
  | "REJECTED";

export type ImprovementSuggestion = {
  id: number;
  category: ImprovementCategory;
  selectedItems: string[];
  title: string;
  description: string;
  userImpact: UserImpact;
  screenshotUrl: string | null;
  sourceRoute: string;
  status: ImprovementStatus;
  createdAt: string;
  updatedAt: string;
};

export type ImprovementSuggestionPayload = {
  category: ImprovementCategory;
  selectedItems: string[];
  title: string;
  description: string;
  userImpact: UserImpact;
  sourceRoute: string;
  screenshot?: File | null;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type AdminImprovementSuggestion = ImprovementSuggestion & {
  internalPriority: ImprovementPriority;
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  organizationId: number | null;
  organizationName: string | null;
  courseName: string | null;
  schoolYear: number | null;
  relatedSuggestionIds: number[];
};

export type ImprovementAdminSummary = {
  total: number;
  received: number;
  underReview: number;
  planned: number;
  implemented: number;
  critical: number;
};

export type ImprovementSuggestionNote = {
  id: number;
  authorUserId: number;
  authorName: string;
  authorEmail: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type ImprovementSuggestionHistory = {
  id: number;
  changedByName: string;
  changedByEmail: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string;
  createdAt: string;
};

export type ImprovementAdminFilters = {
  page: number;
  size: number;
  search?: string;
  status?: ImprovementStatus | "";
  category?: ImprovementCategory | "";
  impact?: UserImpact | "";
  priority?: ImprovementPriority | "";
  from?: string;
  to?: string;
  sortBy?: "createdAt" | "updatedAt" | "priority" | "status";
  direction?: "asc" | "desc";
};
