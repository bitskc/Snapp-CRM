export type LeadStatus = string;

export interface StatusConfig {
  id: string;
  label: string;
  color: string; // e.g. 'blue', 'green', 'red', 'yellow', 'purple', 'gray'
  order: number;
}

export interface Note {
  id: string;
  content: string;
  createdAt: string;
  author: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  description: string;
}

export interface AppSettings {
  id?: string;
  user_id?: string;
  companyName: string;
  companyDescription: string;
  aboutMe: string; // User persona/style
  sheetUrl?: string;
  statuses: StatusConfig[];
  autopilotStatuses?: string[];
}

export interface LeadAIAnalysis {
  score: number;
  reasoning: string;
  nextAction: string;
  lastUpdated: string;
}

export interface Lead {
  id: string;
  user_id: string;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  status: LeadStatus;
  notes: Note[];
  description?: string; // AI gathered info
  location?: string;
  latitude?: number;
  longitude?: number;
  source: 'MANUAL' | 'AI_FINDER';
  productIds: string[]; // IDs of products interested/assigned
  aiAnalysis?: LeadAIAnalysis;
  matchScore?: number;
  matchReason?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
  loadingMessage?: string; // Dynamic loading text
  foundLeads?: Lead[]; // If the model returned leads in this turn
}

export interface AutopilotAction {
  id: string;
  leadId: string;
  leadName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  actionType: 'email' | 'call' | 'social' | 'note';
  priority: number;
  reasoning: string;
  content?: string;
  status: 'pending' | 'completed' | 'skipped';
}

export interface AutopilotQueue {
  generatedAt: string;
  actions: AutopilotAction[];
}

// Google Sheets row representation (mock)
export type SheetRow = (string | number | boolean)[];

// --- Growth Lab ---

export type GrowthConceptStatus = 'RAW' | 'IGNITED' | 'ARCHIVED';
export type GrowthPostStatus = 'DRAFT' | 'POSTED';
export type EngagementOpportunityStatus = 'NEW' | 'DONE';

export interface GrowthSettings {
  userId: string;
  currentCampaignTheme?: string;
  themeGoal?: string;
  updatedAt: string;
}

export interface GrowthConcept {
  id: string;
  userId: string;
  topic: string;
  themeSnapshot?: string;
  status: GrowthConceptStatus;
  createdAt: string;
}

export interface GrowthPost {
  id: string;
  conceptId: string;
  platform: 'LINKEDIN' | 'X';
  content: string;
  status: GrowthPostStatus;
  createdAt: string;
}

export interface EngagementOpportunity {
  id: string;
  userId: string;
  queryUrl: string;
  themeFocus?: string;
  suggestedReply?: string;
  status: EngagementOpportunityStatus;
  createdAt: string;
}