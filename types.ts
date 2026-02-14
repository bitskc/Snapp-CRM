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
  name: string;
  description: string;
}

export interface AppSettings {
  companyName: string;
  companyDescription: string;
  aboutMe: string; // User persona/style
  sheetUrl?: string;
  statuses: StatusConfig[];
}

export interface LeadAIAnalysis {
  score: number;
  reasoning: string;
  nextAction: string;
  lastUpdated: string;
}

export interface Lead {
  id: string;
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

// Google Sheets row representation (mock)
export type SheetRow = (string | number | boolean)[];