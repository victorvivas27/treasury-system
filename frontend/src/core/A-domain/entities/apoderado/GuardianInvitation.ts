export interface GuardianInvitation {
 status: "NONE" | "PENDING" | "EXPIRED" | "ACTIVATED" | "SUPERSEDED";
 deliveryStatus: "PENDING" | "SEND_REQUESTED" | "ACCEPTED" | "DELIVERED" | "FAILED" | "SIMULATED" | null;
 createdAt: string | null;
 expiresAt: string | null;
 activatedAt: string | null;
 deliveredAt: string | null;
 errorCode: string | null;
 simulated: boolean;
}
export interface WhatsAppConsent { authorized: boolean; source: string; authorizedAt: string; }
