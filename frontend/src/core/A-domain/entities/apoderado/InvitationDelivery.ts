export type InvitationDeliveryState = 'UNTRACKED' | 'SENT' | 'DELIVERED' | 'DELAYED' | 'BOUNCED' | 'FAILED' | 'COMPLAINED';
export interface InvitationDelivery {
  status: InvitationDeliveryState;
  createdAt: string | null;
  updatedAt: string | null;
  trackingEnabled: boolean;
}
