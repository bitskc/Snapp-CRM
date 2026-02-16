import { Lead } from '../types';

type LeadField = 'companyName' | 'contactName' | 'email' | 'phone' | 'website'
  | 'address' | 'city' | 'stateProvince' | 'postalCode' | 'country'
  | 'description' | 'notes' | 'pitch' | 'source';

const HEADER_MAP: Record<LeadField, string[]> = {
  companyName: ['company', 'company name', 'business', 'business name', 'organization', 'name'],
  contactName: ['contact', 'contact name', 'contact person', 'person', 'rep'],
  email: ['email', 'e-mail', 'email address'],
  phone: ['phone', 'phone number', 'telephone', 'tel', 'mobile'],
  website: ['website', 'web', 'url', 'site', 'web site'],
  address: ['address', 'street', 'street address'],
  city: ['city', 'town'],
  stateProvince: ['state', 'state/province', 'province', 'region', 'st'],
  postalCode: ['postal code', 'zip', 'zip code', 'zipcode', 'postal'],
  country: ['country', 'nation'],
  description: ['description', 'desc', 'about', 'info', 'details'],
  notes: ['notes', 'note', 'comments', 'comment', 'memo'],
  pitch: ['pitch', 'sales pitch', 'approach'],
  source: ['source', 'lead source', 'origin', 'referral'],
};

const detectDelimiter = (text: string): string => {
  const firstLines = text.split(/\r?\n/).slice(0, 5).join('\n');
  const candidates = ['\t', ',', '|', ';'];
  let best = ',';
  let bestCount = 0;

  for (const delim of candidates) {
    const count = firstLines.split(delim).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = delim;
    }
  }

  return best;
};

const parseRow = (line: string, delimiter: string): string[] => {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }

  fields.push(current.trim());
  return fields;
};

const splitRecords = (text: string): string[] => {
  const records: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      if (inQuotes && i + 1 < text.length && text[i + 1] === '"') {
        current += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += ch;
      }
    } else if (ch === '\r' && !inQuotes) {
      if (i + 1 < text.length && text[i + 1] === '\n') {
        i++;
      }
      records.push(current);
      current = '';
    } else if (ch === '\n' && !inQuotes) {
      records.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  if (current.length > 0) {
    records.push(current);
  }

  return records;
};

const mapHeader = (header: string): LeadField | null => {
  const normalized = header.toLowerCase().trim();
  if (!normalized) return null;

  for (const [field, aliases] of Object.entries(HEADER_MAP) as [LeadField, string[]][]) {
    if (aliases.includes(normalized)) return field;
  }

  return null;
};

export const parseImportText = (rawData: string): (Partial<Lead> & { _notes?: string })[] => {
  const records = splitRecords(rawData);
  const firstNonEmpty = records.findIndex(l => l.trim().length > 0);
  if (firstNonEmpty === -1) return [];

  const delimiter = detectDelimiter(rawData);
  const headerCells = parseRow(records[firstNonEmpty], delimiter);

  const columnMap: (LeadField | null)[] = headerCells.map(mapHeader);

  if (!columnMap.some(f => f !== null)) return [];

  const results: (Partial<Lead> & { _notes?: string })[] = [];

  for (let i = firstNonEmpty + 1; i < records.length; i++) {
    const line = records[i].trim();
    if (!line) continue;

    const cells = parseRow(records[i], delimiter);
    const raw: Partial<Record<LeadField, string>> = {};

    for (let c = 0; c < cells.length; c++) {
      const field = columnMap[c];
      if (field && cells[c]) {
        raw[field] = cells[c];
      }
    }

    if (Object.keys(raw).length === 0) continue;

    const lead: Partial<Lead> & { _notes?: string } = {};

    if (raw.companyName) lead.companyName = raw.companyName;
    if (raw.contactName) lead.contactName = raw.contactName;
    if (raw.email) lead.email = raw.email;
    if (raw.phone) lead.phone = raw.phone;
    if (raw.website) lead.website = raw.website;

    const locationParts = [raw.address, raw.city, raw.stateProvince, raw.postalCode, raw.country]
      .filter(Boolean);
    if (locationParts.length > 0) lead.location = locationParts.join(', ');

    let description = raw.description || '';
    if (raw.pitch) description += `\n\nPitch: ${raw.pitch}`;
    if (raw.source) description += `\n\nSource: ${raw.source}`;
    description = description.trim();
    if (description) lead.description = description;

    if (raw.notes) lead._notes = raw.notes;

    results.push(lead);
  }

  return results;
};
