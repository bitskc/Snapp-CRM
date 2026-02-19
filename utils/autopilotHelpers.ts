import { Lead, AppSettings } from '../types';

export interface CompactLeadSummary {
  id: string;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  status: string;
  matchScore: number;
  daysSinceLastContact: number;
  noteCount: number;
  description: string;
}

const isToday = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const daysSince = (dateStr: string): number => {
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

export const preFilterLeads = (
  leads: Lead[],
  settings: AppSettings
): CompactLeadSummary[] => {
  const autopilotStatuses =
    settings.autopilotStatuses ??
    settings.statuses.slice(0, -1).map(s => s.id);

  const filtered = leads.filter(lead => {
    if (!autopilotStatuses.includes(lead.status)) return false;
    const contactedToday = lead.notes.some(n => isToday(n.createdAt));
    if (contactedToday) return false;
    return true;
  });

  const scored = filtered.map(lead => {
    const lastContactDate =
      lead.notes.length > 0
        ? lead.notes[lead.notes.length - 1].createdAt
        : lead.createdAt;

    return {
      lead,
      daysSinceLastContact: daysSince(lastContactDate),
      matchScore: lead.matchScore ?? 0,
      noteCount: lead.notes.length,
    };
  });

  scored.sort((a, b) => {
    // Never contacted first (infinite staleness)
    if (a.noteCount === 0 && b.noteCount > 0) return -1;
    if (b.noteCount === 0 && a.noteCount > 0) return 1;
    // Then by staleness desc
    if (b.daysSinceLastContact !== a.daysSinceLastContact)
      return b.daysSinceLastContact - a.daysSinceLastContact;
    // Then by match score desc
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    // Then by fewer notes (less engaged)
    return a.noteCount - b.noteCount;
  });

  return scored.slice(0, 60).map(({ lead, daysSinceLastContact }) => ({
    id: lead.id,
    companyName: lead.companyName,
    contactName: lead.contactName,
    email: lead.email,
    phone: lead.phone,
    status: lead.status,
    matchScore: lead.matchScore ?? 0,
    daysSinceLastContact,
    noteCount: lead.notes.length,
    description: (lead.description || '').slice(0, 100),
  }));
};
