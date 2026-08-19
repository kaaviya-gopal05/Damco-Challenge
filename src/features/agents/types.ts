// Domain types for the Email Monitoring feature. Mirrors
// supabase/migrations/0011_create_agent_tables.sql.

import type { ISODateString, TaskPriority, UUID } from '@/types/database';

export type EmailUrgency = TaskPriority;

export interface EmailMonitoringJob {
  id: UUID;
  userId: UUID;
  gmailMessageId: string;
  sender: string | null;
  subject: string | null;
  snippet: string | null;
  learningGoal: string | null;
  urgency: EmailUrgency | null;
  confidence: number | null;
  context: string | null;
  suggestedActions: string[];
  roadmapId: UUID | null;
  isDismissed: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface GmailConnectionStatus {
  connected: boolean;
  gmailEmail?: string;
  expiresAt?: ISODateString;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  sender: string;
  subject: string;
  body: string;
  timestamp: ISODateString;
}
