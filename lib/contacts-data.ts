export type Contact = {
  id: string;
  photoUrl?: string;
  namePrefix?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  nameSuffix?: string;
  // Optional phonetic name fields
  phoneticFirstName?: string;
  phoneticMiddleName?: string;
  phoneticLastName?: string;
  nickname?: string;
  /** Optional sort name / display name override */
  fileAs?: string;
  /** Optional department name */
  department?: string;
  /** Primary email ("Email 1") */
  email: string;
  /** Optional secondary email ("Email 2") */
  email2?: string;
  emails?: ContactLabeledValue[];
  /** Primary phone ("Phone 1") */
  phone: string;
  /** Optional secondary phone ("Phone 2") */
  phone2?: string;
  phones?: ContactLabeledValue[];
  company: string;
  title: string;
  // department removed
  /** Optional first line of street address */
  addressLine1?: string;
  /** Optional second line of street address (apt, suite, etc.) */
  addressLine2?: string;
  city: string;
  /** Optional state / region */
  state?: string;
  /** Optional ZIP / postal code */
  zip?: string;
  country: string;
  addresses?: ContactAddress[];
  website: string;
  websites?: ContactLabeledValue[];
  birthday?: string;
  significantDate?: string;
  significantDateLabel?: string;
  relatedPerson?: string;
  relationLabel?: string;
  significantDates?: ContactDate[];
  relatedPeople?: ContactRelatedPerson[];
  notes: string;
  starred: boolean;
  tags: string[];
  groupIds: string[];
  /** Custom field values keyed by CustomField.id */
  customValues: Record<string, CustomFieldValue>;
  createdAt: number;
  updatedAt: number;
};

export type ContactSortOrder = 'lastName' | 'firstName';

function normalizeSortValue(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function getContactSortKey(contact: Contact, order: ContactSortOrder) {
  const firstName = contact.firstName?.trim() ?? '';
  const lastName = contact.lastName?.trim() ?? '';
  const fallback = order === 'lastName' ? `${lastName} ${firstName}` : `${firstName} ${lastName}`;
  if (fallback.trim()) {
    return normalizeSortValue(fallback);
  }
  return normalizeSortValue(contact.fileAs ?? contact.nickname ?? 'Unnamed contact');
}

export function compareContacts(a: Contact, b: Contact, order: ContactSortOrder) {
  return getContactSortKey(a, order).localeCompare(getContactSortKey(b, order));
}

export type ContactLabeledValue = {
  id: string;
  label: string;
  value: string;
};

export type ContactAddress = {
  id: string;
  label: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
};

export type ContactDate = {
  id: string;
  label: string;
  month: string;
  day: string;
  year?: string;
};

export type ContactRelatedPerson = {
  id: string;
  label: string;
  name: string;
};

export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'CHF' | string;

export type EventRecurrence = 'none' | 'yearly' | 'monthly';

export type EventPriceOption = {
  id: string;
  label: string;
  amount: number;
  currency: CurrencyCode;
  notes?: string;
};

export type EventSeries = {
  id: string;
  name: string;
  description?: string;
  /** Visual color used for this series (predefined color name or hex string) */
  color?: GroupColor | string;
  recurrence: EventRecurrence;
  defaultCurrency: CurrencyCode;
  defaultAmountOwed?: number;
  priceOptions?: EventPriceOption[];
  defaultPriceOptionId?: string;
  createdAt: number;
  updatedAt: number;
};

export type EventOccurrence = {
  id: string;
  seriesId: string;
  name: string;
  date?: string;
  location?: string;
  notes?: string;
  participantMode?: 'manual' | 'dynamic';
  contactIds?: string[];
  filter?: ContactList['filter'];
  createdAt: number;
  updatedAt: number;
};

export type ParticipationStatus = 'invited' | 'registered' | 'attended' | 'cancelled' | 'waitlist';

export type PaymentEntry = {
  id: string;
  amount: number;
  date?: string;
  label?: string;
  note?: string;
  createdAt: number;
};

export type EventParticipation = {
  id: string;
  contactId: string;
  occurrenceId: string;
  status: ParticipationStatus;
  amountOwed: number;
  currency: CurrencyCode;
  notes?: string;
  payments: PaymentEntry[];
  createdAt: number;
  updatedAt: number;
};

export type GroupColor = 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'cyan' | 'slate';

export type Group = {
  id: string;
  name: string;
  description: string;
  color: GroupColor;
};

// ----- Custom fields ------------------------------------------------------

export type CustomFieldType =
  | 'text'
  | 'longText'
  | 'number'
  | 'date'
  | 'dropdown'
  | 'multiSelect'
  | 'boolean'
  | 'url'
  | 'email'
  | 'phone';

export type CustomFieldOption = {
  id: string;
  label: string;
};

export type CustomField = {
  id: string;
  name: string;
  /** Stable internal slug, never user-edited */
  slug: string;
  type: CustomFieldType;
  description?: string;
  /** Visible to all contacts when true */
  isGlobal: boolean;
  /** When not global, visible to contacts in any of these groups */
  groupIds: string[];
  /** Options for dropdown/multiSelect fields */
  options?: CustomFieldOption[];
};

/** Stored shape for a single custom field value on a contact. */
export type CustomFieldValue =
  | { type: 'text' | 'longText' | 'url' | 'email' | 'phone'; value: string }
  | { type: 'number'; value: number }
  | { type: 'date'; value: string } // ISO date string YYYY-MM-DD
  | { type: 'boolean'; value: boolean }
  | { type: 'dropdown'; value: string } // option id
  | { type: 'multiSelect'; value: string[] }; // option ids

// ----- Lists --------------------------------------------------------------

export type ContactList = {
  id: string;
  name: string;
  description?: string;
  type: 'manual' | 'dynamic';
  /** Manual lists store explicit member IDs */
  contactIds?: string[];
  /** Dynamic lists store filter criteria; recomputed on render */
  filter?: {
    /** Match contacts in any of these groups (logical OR). Empty/undefined = any. */
    groupIds?: string[];
    /** @deprecated kept for backward compatibility with v1 lists */
    groupId?: string;
    starred?: boolean;
    search?: string;
    /** Optional simple custom-field equality filter */
    customField?: { fieldId: string; equals: string | number | boolean };
    /**
     * Free-form text filter that matches a literal sequence of any
     * characters (letters, numbers, symbols, spaces) against the
     * concatenated value of the selected fields. Partial substring
     * matches are supported.
     *
     * fieldKeys can include any of:
     *   - standard contact field keys (e.g. "firstName", "addressLine1")
     *   - custom field references prefixed with "cf:" (e.g. "cf:cf_status")
     */
    advancedSearch?: {
      query: string;
      fieldKeys: string[];
    };
  };
  createdAt: number;
  updatedAt: number;
};

export const initialGroups: Group[] = [
  { id: 'g1', name: 'VIP Contacts', description: 'Key decision makers', color: 'blue' },
  { id: 'g2', name: 'Business Partners', description: 'Strategic partners', color: 'green' },
  {
    id: 'g3',
    name: 'Technical Team',
    description: 'Engineers & technical contacts',
    color: 'purple',
  },
  { id: 'g4', name: 'Vendors', description: 'External service providers', color: 'amber' },
  { id: 'g5', name: 'Investors', description: 'Current & prospective investors', color: 'rose' },
];

// Fixed base timestamp to avoid SSR/client hydration mismatches.
// Using a literal so server-rendered HTML matches client hydration exactly.
const now = 1761696000000; // 2025-10-29T00:00:00Z
const day = 86_400_000;

export const initialContacts: Contact[] = [
  {
    id: 'c1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@acmecorp.com',
    email2: 'john.personal@gmail.com',
    phone: '+1 (555) 123-4567',
    phone2: '+1 (555) 123-4568',
    company: 'Acme Corp',
    title: 'Product Manager',
    birthday: '1985-04-12',
    addressLine1: '375 Mission Street',
    addressLine2: 'Suite 4200',
    city: 'San Francisco',
    zip: '94105',
    country: 'USA',
    website: 'https://acmecorp.com',
    notes: 'Key decision maker for the enterprise deal. Met at the SaaStr conference.',
    starred: true,
    tags: ['enterprise', 'saas'],
    groupIds: ['g1', 'g2'],
    customValues: {
      cf_status: { type: 'dropdown', value: 'opt_active' },
      cf_source: { type: 'dropdown', value: 'opt_event' },
      cf_interests: { type: 'multiSelect', value: ['opt_design', 'opt_tech'] },
      cf_member: { type: 'text', value: 'ACM-00231' },
      cf_vip: { type: 'boolean', value: true },
      cf_budget: { type: 'number', value: 250000 },
    },
    createdAt: now - 30 * day,
    updatedAt: now - 2 * day,
  },
  {
    id: 'c2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@techinnovations.io',
    phone: '+1 (555) 987-6543',
    company: 'Tech Innovations',
    title: 'Chief Executive Officer',
    addressLine1: '1185 Avenue of the Americas',
    city: 'New York',
    zip: '10036',
    country: 'USA',
    website: 'https://techinnovations.io',
    notes: 'Strategic partner. Discussing co-marketing opportunities for Q3.',
    starred: true,
    tags: ['partner', 'executive'],
    groupIds: ['g1', 'g2'],
    customValues: {
      cf_status: { type: 'dropdown', value: 'opt_active' },
      cf_source: { type: 'dropdown', value: 'opt_referral' },
      cf_interests: { type: 'multiSelect', value: ['opt_arch', 'opt_events'] },
      cf_vip: { type: 'boolean', value: true },
      cf_member: { type: 'text', value: 'ACM-00118' },
    },
    createdAt: now - 45 * day,
    updatedAt: now - 5 * day,
  },
  {
    id: 'c3',
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob.johnson@globalsolutions.com',
    phone: '+1 (555) 456-7890',
    company: 'Global Solutions',
    title: 'Sales Director',
    city: 'Chicago',
    country: 'USA',
    website: 'https://globalsolutions.com',
    notes: 'Interested in Q2 partnership. Follow up next week.',
    starred: false,
    tags: ['sales', 'prospect'],
    groupIds: ['g2'],
    customValues: {},
    createdAt: now - 14 * day,
    updatedAt: now - 7 * day,
  },
  {
    id: 'c4',
    firstName: 'Sarah',
    lastName: 'Williams',
    email: 'sarah.w@designstudio.co',
    phone: '+1 (555) 234-5678',
    company: 'Design Studio Co',
    title: 'Creative Director',
    city: 'Los Angeles',
    country: 'USA',
    website: 'https://designstudio.co',
    notes: 'Handles all our branding projects. Excellent quality and reliable delivery.',
    starred: true,
    tags: ['creative', 'vendor'],
    groupIds: ['g4'],
    customValues: {},
    createdAt: now - 60 * day,
    updatedAt: now - 1 * day,
  },
  {
    id: 'c5',
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'mchen@startupventures.vc',
    email2: 'michael.chen@gmail.com',
    phone: '+1 (555) 345-6789',
    phone2: '+1 (650) 555-0142',
    company: 'Startup Ventures',
    title: 'Managing Partner',
    addressLine1: '2882 Sand Hill Road',
    addressLine2: 'Building 1, Suite 200',
    city: 'Menlo Park',
    zip: '94025',
    country: 'USA',
    website: 'https://startupventures.vc',
    notes: 'Lead investor for Series B. Quarterly check-ins scheduled.',
    starred: true,
    tags: ['investor', 'vc'],
    groupIds: ['g1', 'g5'],
    customValues: {
      cf_status: { type: 'dropdown', value: 'opt_active' },
      cf_vip: { type: 'boolean', value: true },
      cf_budget: { type: 'number', value: 1500000 },
      cf_invest_stage: { type: 'dropdown', value: 'opt_stage_b' },
    },
    createdAt: now - 20 * day,
    updatedAt: now - 3 * day,
  },
  {
    id: 'c6',
    firstName: 'Emily',
    lastName: 'Brown',
    email: 'emily.brown@brownassociates.legal',
    phone: '+1 (555) 567-8901',
    company: 'Brown & Associates',
    title: 'Senior Partner',
    city: 'Boston',
    country: 'USA',
    website: 'https://brownassociates.legal',
    notes: 'Corporate counsel for contract reviews and compliance.',
    starred: false,
    tags: ['legal', 'professional'],
    groupIds: ['g4'],
    customValues: {},
    createdAt: now - 90 * day,
    updatedAt: now - 15 * day,
  },
  {
    id: 'c7',
    firstName: 'David',
    lastName: 'Martinez',
    email: 'david.m@cloudtech.io',
    phone: '+1 (555) 678-9012',
    company: 'CloudTech Solutions',
    title: 'Chief Technology Officer',
    city: 'Seattle',
    country: 'USA',
    website: 'https://cloudtech.io',
    notes: 'Technical integration partner. Working on API v2 rollout.',
    starred: false,
    tags: ['technical', 'partner'],
    groupIds: ['g2', 'g3'],
    customValues: {},
    createdAt: now - 25 * day,
    updatedAt: now - 10 * day,
  },
  {
    id: 'c8',
    firstName: 'Lisa',
    lastName: 'Anderson',
    email: 'lisa.anderson@mediagroup.com',
    phone: '+1 (555) 789-0123',
    company: 'Media Group Inc',
    title: 'VP of Marketing',
    city: 'Austin',
    country: 'USA',
    website: 'https://mediagroup.com',
    notes: 'Handles PR and media relations for product launches.',
    starred: false,
    tags: ['marketing', 'vendor'],
    groupIds: ['g4'],
    customValues: {},
    createdAt: now - 35 * day,
    updatedAt: now - 8 * day,
  },
  {
    id: 'c9',
    firstName: 'Thomas',
    lastName: 'Wilson',
    email: 'thomas.wilson@financeplus.com',
    phone: '+1 (555) 890-1234',
    company: 'Finance Plus',
    title: 'Chief Financial Officer',
    city: 'New York',
    country: 'USA',
    website: 'https://financeplus.com',
    notes: 'Financial advisor for Series A. Strong network in fintech.',
    starred: true,
    tags: ['finance', 'advisor'],
    groupIds: ['g1', 'g5'],
    customValues: {
      cf_status: { type: 'dropdown', value: 'opt_active' },
      cf_vip: { type: 'boolean', value: true },
      cf_invest_stage: { type: 'dropdown', value: 'opt_stage_a' },
      cf_budget: { type: 'number', value: 750000 },
    },
    createdAt: now - 40 * day,
    updatedAt: now - 4 * day,
  },
  {
    id: 'c10',
    firstName: 'Amanda',
    lastName: 'Taylor',
    email: 'amanda.taylor@hrconnect.io',
    phone: '+1 (555) 901-2345',
    company: 'HR Connect',
    title: 'HR Director',
    city: 'Denver',
    country: 'USA',
    website: 'https://hrconnect.io',
    notes: 'Recruitment partner for senior engineering hires.',
    starred: false,
    tags: ['hr', 'recruitment'],
    groupIds: ['g4'],
    customValues: {},
    createdAt: now - 50 * day,
    updatedAt: now - 6 * day,
  },
  {
    id: 'c11',
    firstName: 'Robert',
    lastName: 'Garcia',
    email: 'robert.garcia@devops.tech',
    phone: '+1 (555) 012-3456',
    company: 'DevOps Tech',
    title: 'Lead Site Reliability Engineer',
    city: 'Portland',
    country: 'USA',
    website: 'https://devops.tech',
    notes: 'Infrastructure consultant. Helping with the Kubernetes migration.',
    starred: false,
    tags: ['technical', 'devops'],
    groupIds: ['g3'],
    customValues: {},
    createdAt: now - 55 * day,
    updatedAt: now - 9 * day,
  },
  {
    id: 'c12',
    firstName: 'Jennifer',
    lastName: 'Lee',
    email: 'jennifer.lee@datainsights.ai',
    phone: '+1 (555) 123-7890',
    company: 'Data Insights AI',
    title: 'Principal Data Scientist',
    city: 'San Jose',
    country: 'USA',
    website: 'https://datainsights.ai',
    notes: 'AI/ML consultant for product features. Expert in LLM fine-tuning.',
    starred: true,
    tags: ['ai', 'data', 'technical'],
    groupIds: ['g1', 'g3'],
    customValues: {
      cf_status: { type: 'dropdown', value: 'opt_prospect' },
      cf_source: { type: 'dropdown', value: 'opt_website' },
      cf_interests: { type: 'multiSelect', value: ['opt_tech', 'opt_news'] },
      cf_vip: { type: 'boolean', value: false },
    },
    createdAt: now - 28 * day,
    updatedAt: now - 2 * day,
  },
  {
    id: 'c13',
    firstName: 'Christopher',
    lastName: 'Davis',
    email: 'chris.davis@securitycore.io',
    phone: '+1 (555) 234-1098',
    company: 'Security Core',
    title: 'Chief Information Security Officer',
    city: 'Washington',
    country: 'USA',
    website: 'https://securitycore.io',
    notes: 'Security audit partner. Annual SOC 2 reviews.',
    starred: false,
    tags: ['security', 'compliance'],
    groupIds: ['g3', 'g4'],
    customValues: {},
    createdAt: now - 70 * day,
    updatedAt: now - 12 * day,
  },
  {
    id: 'c14',
    firstName: 'Olivia',
    lastName: 'Martinez',
    email: 'olivia.m@productlabs.co',
    phone: '+1 (555) 345-2109',
    company: 'Product Labs',
    title: 'Head of Product',
    city: 'Miami',
    country: 'USA',
    website: 'https://productlabs.co',
    notes: 'Joint product roadmap discussions for integrated features.',
    starred: true,
    tags: ['product', 'partner'],
    groupIds: ['g2'],
    customValues: {},
    createdAt: now - 18 * day,
    updatedAt: now - 1 * day,
  },
  {
    id: 'c15',
    firstName: 'James',
    lastName: 'Thompson',
    email: 'james.t@growthcapital.fund',
    phone: '+1 (555) 456-3210',
    company: 'Growth Capital Fund',
    title: 'Investment Director',
    city: 'Boston',
    country: 'USA',
    website: 'https://growthcapital.fund',
    notes: 'Series C lead candidate. Quarterly board observer.',
    starred: true,
    tags: ['investor', 'vc'],
    groupIds: ['g5'],
    customValues: {},
    createdAt: now - 22 * day,
    updatedAt: now - 3 * day,
  },
  {
    id: 'c16',
    firstName: 'Mara',
    lastName: 'Main',
    email: 'mara.main@example.com',
    phone: '+49 170 555 0199',
    company: 'Independent',
    title: 'Gong Specialist',
    nickname: 'Main',
    city: 'Berlin',
    country: 'Germany',
    website: 'https://example.com/website-a',
    notes:
      'Details:\n- sometimes uses website a\n- has nice clothes\n\nStatus: Offers to assist in SQ. (on list)\nUser def.: 9 VOLTS / (X-OE)',
    starred: true,
    tags: ['Former Adv. Grp.', 'M0 - VOLT x 2+', 'SQ'],
    groupIds: ['g1'],
    customValues: {
      cf_keywords: { type: 'text', value: '-Former Adv. Grp.' },
      cf_category: { type: 'text', value: 'M0 - VOLT x 2+' },
      cf_contact_status: { type: 'longText', value: 'Offers to assist in SQ. (on list)' },
      cf_user_defined: { type: 'text', value: '9 VOLTS / (X-OE)' },
      cf_profession: { type: 'text', value: 'Gong Specialist' },
    },
    createdAt: now - 12 * day,
    updatedAt: now - 1 * day,
  },
];

export const initialDeleted: Contact[] = [
  {
    id: 'd1',
    firstName: 'Mark',
    lastName: 'Thompson',
    email: 'mark.t@oldcompany.com',
    phone: '+1 (555) 111-2222',
    company: 'Old Company Inc',
    title: 'Account Manager',
    city: 'Houston',
    country: 'USA',
    website: '',
    notes: 'No longer at company',
    starred: false,
    tags: [],
    groupIds: [],
    customValues: {},
    createdAt: now - 100 * day,
    updatedAt: now - 5 * day,
  },
  {
    id: 'd2',
    firstName: 'Susan',
    lastName: 'Parker',
    email: 'susan.p@formerclient.com',
    phone: '+1 (555) 222-3333',
    company: 'Former Client Co',
    title: 'Director',
    city: 'Phoenix',
    country: 'USA',
    website: '',
    notes: 'Account churned',
    starred: false,
    tags: [],
    groupIds: [],
    customValues: {},
    createdAt: now - 120 * day,
    updatedAt: now - 12 * day,
  },
];

export type ActivityEntry = {
  id: string;
  action: 'create' | 'update' | 'delete' | 'restore';
  entityType: 'Contact' | 'Group';
  entityName: string;
  description: string;
  timestamp: number;
};

export const initialActivity: ActivityEntry[] = [
  {
    id: 'a1',
    action: 'create',
    entityType: 'Contact',
    entityName: 'Jennifer Lee',
    description: 'Created contact in Data Insights AI',
    timestamp: now - 2 * day,
  },
  {
    id: 'a2',
    action: 'update',
    entityType: 'Contact',
    entityName: 'John Doe',
    description: 'Updated phone number',
    timestamp: now - 3 * day,
  },
  {
    id: 'a3',
    action: 'delete',
    entityType: 'Contact',
    entityName: 'Mark Thompson',
    description: 'Moved to trash',
    timestamp: now - 5 * day,
  },
  {
    id: 'a4',
    action: 'update',
    entityType: 'Contact',
    entityName: 'Jane Smith',
    description: 'Added to VIP Contacts group',
    timestamp: now - 5 * day,
  },
  {
    id: 'a5',
    action: 'create',
    entityType: 'Group',
    entityName: 'Investors',
    description: 'Created new group with 2 contacts',
    timestamp: now - 20 * day,
  },
  {
    id: 'a6',
    action: 'update',
    entityType: 'Contact',
    entityName: 'Sarah Williams',
    description: 'Marked as starred',
    timestamp: now - 1 * day,
  },
];

// ----- Custom field seed data --------------------------------------------

export const initialCustomFields: CustomField[] = [
  {
    id: 'cf_status',
    name: 'Customer Status',
    slug: 'customer_status',
    type: 'dropdown',
    description: 'Lifecycle stage of this contact',
    isGlobal: true,
    groupIds: [],
    options: [
      { id: 'opt_active', label: 'Active' },
      { id: 'opt_paused', label: 'Paused' },
      { id: 'opt_prospect', label: 'Prospect' },
      { id: 'opt_former', label: 'Former' },
    ],
  },
  {
    id: 'cf_source',
    name: 'Source',
    slug: 'source',
    type: 'dropdown',
    description: 'How did we meet this contact',
    isGlobal: true,
    groupIds: [],
    options: [
      { id: 'opt_referral', label: 'Referral' },
      { id: 'opt_website', label: 'Website' },
      { id: 'opt_event', label: 'Event' },
      { id: 'opt_import', label: 'Manual Import' },
    ],
  },
  {
    id: 'cf_interests',
    name: 'Interests',
    slug: 'interests',
    type: 'multiSelect',
    description: 'Topics this contact cares about',
    isGlobal: true,
    groupIds: [],
    options: [
      { id: 'opt_design', label: 'Design' },
      { id: 'opt_arch', label: 'Architecture' },
      { id: 'opt_tech', label: 'Technology' },
      { id: 'opt_events', label: 'Events' },
      { id: 'opt_news', label: 'Newsletter' },
    ],
  },
  {
    id: 'cf_member',
    name: 'Member Number',
    slug: 'member_number',
    type: 'text',
    isGlobal: true,
    groupIds: [],
  },
  {
    id: 'cf_vip',
    name: 'VIP',
    slug: 'vip',
    type: 'boolean',
    description: 'Flagged as a VIP contact',
    isGlobal: true,
    groupIds: [],
  },
  {
    id: 'cf_budget',
    name: 'Budget',
    slug: 'budget',
    type: 'number',
    description: 'Annual budget in USD',
    isGlobal: false,
    groupIds: ['g1', 'g5'], // VIP Contacts + Investors only
  },
  {
    id: 'cf_invest_stage',
    name: 'Investment Stage',
    slug: 'invest_stage',
    type: 'dropdown',
    description: 'Preferred funding stage',
    isGlobal: false,
    groupIds: ['g5'], // Investors only
    options: [
      { id: 'opt_stage_seed', label: 'Seed' },
      { id: 'opt_stage_a', label: 'Series A' },
      { id: 'opt_stage_b', label: 'Series B' },
      { id: 'opt_stage_c', label: 'Series C+' },
    ],
  },
  {
    id: 'cf_keywords',
    name: 'Keywords',
    slug: 'keywords',
    type: 'text',
    isGlobal: true,
    groupIds: [],
  },
  {
    id: 'cf_category',
    name: 'Category',
    slug: 'category',
    type: 'text',
    isGlobal: true,
    groupIds: [],
  },
  {
    id: 'cf_contact_status',
    name: 'Status',
    slug: 'contact_status',
    type: 'longText',
    isGlobal: true,
    groupIds: [],
  },
  {
    id: 'cf_user_defined',
    name: 'User defined',
    slug: 'user_defined',
    type: 'text',
    isGlobal: true,
    groupIds: [],
  },
  {
    id: 'cf_profession',
    name: 'Profession',
    slug: 'profession',
    type: 'text',
    isGlobal: true,
    groupIds: [],
  },
];

// ----- Event + payment seed data -----------------------------------------

export const initialEventSeries: EventSeries[] = [
  {
    id: 'es_retreat_weekend',
    name: 'Retreat Weekend',
    description: 'Annual retreat with tiered prices and participant-specific payments.',
    color: 'blue',
    recurrence: 'yearly',
    defaultCurrency: 'EUR',
    defaultAmountOwed: 480,
    priceOptions: [
      {
        id: 'price_retreat_standard',
        label: 'Standard',
        amount: 480,
        currency: 'EUR',
      },
      {
        id: 'price_retreat_early',
        label: 'Early booking',
        amount: 420,
        currency: 'EUR',
        notes: 'Example discounted price.',
      },
    ],
    defaultPriceOptionId: 'price_retreat_standard',
    createdAt: now - 900 * day,
    updatedAt: now - 12 * day,
  },
  {
    id: 'es_intro_evening',
    name: 'Intro Evening',
    description: 'Small one-off evening event used as an example of a settled participation.',
    color: 'green',
    recurrence: 'none',
    defaultCurrency: 'EUR',
    defaultAmountOwed: 65,
    priceOptions: [
      {
        id: 'price_intro_standard',
        label: 'Standard',
        amount: 65,
        currency: 'EUR',
      },
      {
        id: 'price_intro_helper',
        label: 'Helper discount',
        amount: 25,
        currency: 'EUR',
        notes: 'Reduced price for people helping with setup.',
      },
    ],
    defaultPriceOptionId: 'price_intro_standard',
    createdAt: now - 35 * day,
    updatedAt: now - 20 * day,
  },
  {
    id: 'es_summer_workshop',
    name: 'Summer Workshop',
    description: 'Recurring yearly workshop with participants added from contact lists.',
    color: 'amber',
    recurrence: 'yearly',
    defaultCurrency: 'EUR',
    defaultAmountOwed: 180,
    priceOptions: [
      {
        id: 'price_workshop_standard',
        label: 'Standard',
        amount: 180,
        currency: 'EUR',
      },
      {
        id: 'price_workshop_member',
        label: 'Member price',
        amount: 150,
        currency: 'EUR',
      },
    ],
    defaultPriceOptionId: 'price_workshop_standard',
    createdAt: now - 32 * day,
    updatedAt: now - 20 * day,
  },
];

export const initialEventOccurrences: EventOccurrence[] = [
  {
    id: 'eo_retreat_weekend_2024',
    seriesId: 'es_retreat_weekend',
    name: 'Retreat Weekend 2024',
    date: '2024-06-15',
    location: 'Countryside retreat house',
    notes: 'Past annual retreat. One participant overpaid, creating credit for later.',
    contactIds: ['c2', 'c7', 'c16'],
    createdAt: now - 500 * day,
    updatedAt: now - 490 * day,
  },
  {
    id: 'eo_retreat_weekend_2025',
    seriesId: 'es_retreat_weekend',
    name: 'Retreat Weekend 2025',
    date: '2025-06-14',
    location: 'Countryside retreat house',
    notes: 'Past yearly occurrence with a static participant roster.',
    contactIds: ['c1', 'c2', 'c16'],
    createdAt: now - 180 * day,
    updatedAt: now - 170 * day,
  },
  {
    id: 'eo_retreat_weekend_2026',
    seriesId: 'es_retreat_weekend',
    name: 'Retreat Weekend 2026',
    date: '2026-06-14',
    location: 'Countryside retreat house',
    notes: 'Upcoming retreat. Mara has two payments recorded and still owes a balance.',
    contactIds: ['c1', 'c2', 'c7', 'c16'],
    createdAt: now - 12 * day,
    updatedAt: now - 12 * day,
  },
  {
    id: 'eo_intro_evening_2026',
    seriesId: 'es_intro_evening',
    name: 'Intro Evening',
    date: '2026-04-18',
    location: 'Berlin studio',
    notes: 'One-off event with settled and discounted participants.',
    contactIds: ['c14', 'c16'],
    createdAt: now - 20 * day,
    updatedAt: now - 20 * day,
  },
  {
    id: 'eo_summer_workshop_2026',
    seriesId: 'es_summer_workshop',
    name: 'Summer Workshop 2026',
    date: '2026-09-12',
    location: 'Community hall',
    notes: 'Future yearly event with one waitlisted participant.',
    contactIds: ['c7', 'c12', 'c16'],
    createdAt: now - 18 * day,
    updatedAt: now - 18 * day,
  },
];

export const initialParticipations: EventParticipation[] = [
  {
    id: 'ep_jane_retreat_2024',
    contactId: 'c2',
    occurrenceId: 'eo_retreat_weekend_2024',
    status: 'attended',
    amountOwed: 420,
    currency: 'EUR',
    notes:
      'Used early booking price and accidentally paid too much. The extra 30 EUR should show as credit.',
    payments: [
      {
        id: 'pay_jane_retreat_2024_deposit',
        amount: 200,
        date: '2024-04-20',
        label: 'Deposit',
        note: 'Paid after early booking confirmation.',
        createdAt: now - 560 * day,
      },
      {
        id: 'pay_jane_retreat_2024_final',
        amount: 250,
        date: '2024-06-01',
        label: 'Final payment',
        note: 'Includes 30 EUR accidental overpayment.',
        createdAt: now - 515 * day,
      },
    ],
    createdAt: now - 560 * day,
    updatedAt: now - 515 * day,
  },
  {
    id: 'ep_david_retreat_2024',
    contactId: 'c7',
    occurrenceId: 'eo_retreat_weekend_2024',
    status: 'cancelled',
    amountOwed: 0,
    currency: 'EUR',
    notes: 'Cancelled before payment was due.',
    payments: [],
    createdAt: now - 555 * day,
    updatedAt: now - 520 * day,
  },
  {
    id: 'ep_main_retreat_2025',
    contactId: 'c16',
    occurrenceId: 'eo_retreat_weekend_2025',
    status: 'attended',
    amountOwed: 480,
    currency: 'EUR',
    notes: 'Settled past retreat.',
    payments: [
      {
        id: 'pay_main_retreat_2025_full',
        amount: 480,
        date: '2025-06-03',
        label: 'Bank transfer',
        note: 'Paid in full before arrival.',
        createdAt: now - 170 * day,
      },
    ],
    createdAt: now - 180 * day,
    updatedAt: now - 170 * day,
  },
  {
    id: 'ep_john_retreat_2025',
    contactId: 'c1',
    occurrenceId: 'eo_retreat_weekend_2025',
    status: 'attended',
    amountOwed: 420,
    currency: 'EUR',
    notes: 'Early booking price.',
    payments: [
      {
        id: 'pay_john_retreat_2025_deposit',
        amount: 120,
        date: '2025-05-02',
        label: 'Deposit',
        createdAt: now - 180 * day,
      },
      {
        id: 'pay_john_retreat_2025_balance',
        amount: 300,
        date: '2025-06-10',
        label: 'Balance',
        createdAt: now - 172 * day,
      },
    ],
    createdAt: now - 180 * day,
    updatedAt: now - 172 * day,
  },
  {
    id: 'ep_main_retreat_2026',
    contactId: 'c16',
    occurrenceId: 'eo_retreat_weekend_2026',
    status: 'registered',
    amountOwed: 480,
    currency: 'EUR',
    notes: 'Primary example: two partial payments with a remaining balance.',
    payments: [
      {
        id: 'pay_main_retreat_down',
        amount: 100,
        date: '2026-05-10',
        label: 'Down payment',
        note: 'Cash after registration.',
        createdAt: now - 6 * day,
      },
      {
        id: 'pay_main_retreat_followup',
        amount: 100,
        date: '2026-05-10',
        label: 'Follow up payment',
        note: 'Second small payment.',
        createdAt: now - 6 * day,
      },
    ],
    createdAt: now - 12 * day,
    updatedAt: now - 6 * day,
  },
  {
    id: 'ep_jane_retreat_2026',
    contactId: 'c2',
    occurrenceId: 'eo_retreat_weekend_2026',
    status: 'registered',
    amountOwed: 480,
    currency: 'EUR',
    notes: "Future participation. Payment overview should offset Jane's 30 EUR credit from 2024.",
    payments: [],
    createdAt: now - 10 * day,
    updatedAt: now - 10 * day,
  },
  {
    id: 'ep_john_retreat_2026',
    contactId: 'c1',
    occurrenceId: 'eo_retreat_weekend_2026',
    status: 'invited',
    amountOwed: 480,
    currency: 'EUR',
    notes: 'Invited, no payment yet.',
    payments: [],
    createdAt: now - 9 * day,
    updatedAt: now - 9 * day,
  },
  {
    id: 'ep_main_intro_evening',
    contactId: 'c16',
    occurrenceId: 'eo_intro_evening_2026',
    status: 'attended',
    amountOwed: 65,
    currency: 'EUR',
    payments: [
      {
        id: 'pay_main_event_a',
        amount: 65,
        date: '2026-04-18',
        label: 'Settled',
        note: 'Paid at the door.',
        createdAt: now - 20 * day,
      },
    ],
    createdAt: now - 20 * day,
    updatedAt: now - 20 * day,
  },
  {
    id: 'ep_olivia_intro_evening',
    contactId: 'c14',
    occurrenceId: 'eo_intro_evening_2026',
    status: 'attended',
    amountOwed: 25,
    currency: 'EUR',
    notes: 'Helper discount for setup support.',
    payments: [
      {
        id: 'pay_olivia_intro_evening',
        amount: 25,
        date: '2026-04-18',
        label: 'Helper price',
        note: 'Discounted participation.',
        createdAt: now - 20 * day,
      },
    ],
    createdAt: now - 20 * day,
    updatedAt: now - 20 * day,
  },
  {
    id: 'ep_david_summer_workshop',
    contactId: 'c7',
    occurrenceId: 'eo_summer_workshop_2026',
    status: 'waitlist',
    amountOwed: 180,
    currency: 'EUR',
    notes: 'Waitlisted, no payment collected yet.',
    payments: [],
    createdAt: now - 16 * day,
    updatedAt: now - 16 * day,
  },
  {
    id: 'ep_jennifer_summer_workshop',
    contactId: 'c12',
    occurrenceId: 'eo_summer_workshop_2026',
    status: 'registered',
    amountOwed: 150,
    currency: 'EUR',
    notes: 'Member price selected individually in the Events participant list.',
    payments: [
      {
        id: 'pay_jennifer_summer_workshop_deposit',
        amount: 50,
        date: '2026-05-12',
        label: 'Deposit',
        note: 'Remaining balance due in August.',
        createdAt: now - 4 * day,
      },
    ],
    createdAt: now - 16 * day,
    updatedAt: now - 4 * day,
  },
];

// ----- Saved lists seed data ---------------------------------------------

export const initialLists: ContactList[] = [
  {
    id: 'l1',
    name: 'Holiday Cards 2025',
    description: 'Send custom holiday cards to these contacts',
    type: 'manual',
    contactIds: ['c1', 'c2', 'c4', 'c9', 'c14'],
    createdAt: now - 30 * day,
    updatedAt: now - 7 * day,
  },
  {
    id: 'l2',
    name: 'Newsletter Q4',
    description: 'Recipients of the Q4 product newsletter',
    type: 'manual',
    contactIds: ['c1', 'c2', 'c5', 'c7', 'c9', 'c12', 'c14', 'c15'],
    createdAt: now - 20 * day,
    updatedAt: now - 3 * day,
  },
  {
    id: 'l3',
    name: 'Board Meeting Attendees',
    description: 'Quarterly board meeting roster',
    type: 'manual',
    contactIds: ['c2', 'c5', 'c9', 'c15'],
    createdAt: now - 10 * day,
    updatedAt: now - 2 * day,
  },
  {
    id: 'l4',
    name: 'Starred Contacts',
    description: 'Auto-updating list of all starred contacts',
    type: 'dynamic',
    filter: { starred: true },
    createdAt: now - 60 * day,
    updatedAt: now - 60 * day,
  },
  {
    id: 'l5',
    name: 'All Investors',
    description: 'Auto-updating list of contacts in the Investors group',
    type: 'dynamic',
    filter: { groupId: 'g5' },
    createdAt: now - 25 * day,
    updatedAt: now - 25 * day,
  },
  {
    id: 'l6',
    name: 'Active Customers',
    description: 'Auto-updating list filtered by Customer Status = Active',
    type: 'dynamic',
    filter: { customField: { fieldId: 'cf_status', equals: 'opt_active' } },
    createdAt: now - 15 * day,
    updatedAt: now - 15 * day,
  },
];

// ----- Helpers ------------------------------------------------------------

/** Resolve which contacts belong to a given list right now. */
export function resolveListMembers(
  list: ContactList,
  contacts: Contact[],
  customFields: CustomField[] = []
): Contact[] {
  if (list.type === 'manual') {
    const ids = new Set(list.contactIds ?? []);
    return contacts.filter((c) => ids.has(c.id));
  }
  const f = list.filter ?? {};
  // Normalize legacy single-group filter into the multi-group form
  const groupIds = f.groupIds && f.groupIds.length > 0 ? f.groupIds : f.groupId ? [f.groupId] : [];
  return contacts.filter((c) => {
    if (f.starred && !c.starred) return false;
    if (groupIds.length > 0 && !groupIds.some((gid) => c.groupIds.includes(gid))) {
      return false;
    }
    if (f.search) {
      const q = f.search.toLowerCase();
      const hay = [
        c.firstName,
        c.middleName,
        c.lastName,
        c.nickname,
        c.email,
        c.email2,
        ...(c.emails ?? []).flatMap((item) => [item.label, item.value]),
        c.website,
        ...(c.websites ?? []).flatMap((item) => [item.label, item.value]),
        c.company,
        c.title,
        c.department,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.customField) {
      const v = c.customValues[f.customField.fieldId];
      if (!v) return false;
      if (Array.isArray((v as { value: unknown }).value)) {
        const arr = (v as { value: string[] }).value;
        if (!arr.includes(String(f.customField.equals))) return false;
      } else if ((v as { value: unknown }).value !== f.customField.equals) {
        return false;
      }
    }
    if (
      f.advancedSearch &&
      f.advancedSearch.query.trim() &&
      f.advancedSearch.fieldKeys.length > 0
    ) {
      if (
        !matchesAdvancedSearch(c, f.advancedSearch.query, f.advancedSearch.fieldKeys, customFields)
      ) {
        return false;
      }
    }
    return true;
  });
}

// ----- Searchable field registry ----------------------------------------

/** Standard contact fields that can be searched / filtered against. */
export const STANDARD_SEARCHABLE_FIELDS: { key: keyof Contact; label: string }[] = [
  { key: 'namePrefix', label: 'Prefix' },
  { key: 'firstName', label: 'First name' },
  { key: 'middleName', label: 'Middle name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'nameSuffix', label: 'Suffix' },
  { key: 'nickname', label: 'Nickname' },
  { key: 'fileAs', label: 'File as' },
  { key: 'phoneticFirstName', label: 'Phonetic first' },
  { key: 'phoneticMiddleName', label: 'Phonetic middle' },
  { key: 'phoneticLastName', label: 'Phonetic last' },
  { key: 'company', label: 'Company' },
  { key: 'title', label: 'Title' },
  { key: 'department', label: 'Department' },
  { key: 'email', label: 'Email 1' },
  { key: 'email2', label: 'Email 2' },
  { key: 'phone', label: 'Phone 1' },
  { key: 'phone2', label: 'Phone 2' },
  { key: 'addressLine1', label: 'Address line 1' },
  { key: 'addressLine2', label: 'Address line 2' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip', label: 'ZIP / Postal code' },
  { key: 'country', label: 'Country' },
  { key: 'website', label: 'Website' },
  { key: 'birthday', label: 'Birthday' },
  { key: 'significantDate', label: 'Significant date' },
  { key: 'significantDateLabel', label: 'Significant date label' },
  { key: 'relatedPerson', label: 'Related person' },
  { key: 'relationLabel', label: 'Relationship' },
  { key: 'notes', label: 'Notes' },
];

/**
 * Returns the raw string representation of a single contact field for
 * search purposes. Custom fields are referenced as "cf:<id>".
 */
export function getContactFieldText(
  contact: Contact,
  fieldKey: string,
  customFields: CustomField[]
): string {
  if (fieldKey.startsWith('cf:')) {
    const id = fieldKey.slice(3);
    const field = customFields.find((f) => f.id === id);
    if (!field) return '';
    return formatCustomValue(contact.customValues[id], field);
  }
  if (fieldKey === 'tags') return contact.tags.join(' ');
  if (fieldKey === 'email')
    return (
      (contact.emails ?? []).map((item) => `${item.label} ${item.value}`).join(' ') || contact.email
    );
  if (fieldKey === 'phone')
    return (
      (contact.phones ?? []).map((item) => `${item.label} ${item.value}`).join(' ') || contact.phone
    );
  if (fieldKey === 'website')
    return (
      (contact.websites ?? []).map((item) => `${item.label} ${item.value}`).join(' ') ||
      contact.website
    );
  if (fieldKey === 'addressLine1') {
    return (
      (contact.addresses ?? [])
        .map((item) =>
          [item.label, item.addressLine1, item.addressLine2, item.city, item.zip, item.country]
            .filter(Boolean)
            .join(' ')
        )
        .join(' ') ||
      contact.addressLine1 ||
      ''
    );
  }
  if (fieldKey === 'significantDate') {
    return (contact.significantDates ?? [])
      .map((item) => `${item.label} ${item.month} ${item.day} ${item.year ?? ''}`)
      .join(' ');
  }
  if (fieldKey === 'relatedPerson') {
    return (contact.relatedPeople ?? []).map((item) => `${item.label} ${item.name}`).join(' ');
  }
  const v = (contact as unknown as Record<string, unknown>)[fieldKey];
  return typeof v === 'string' ? v : '';
}

/**
 * True if `query` is found (case-insensitive substring match) inside the
 * concatenated text of any of the requested fields. Consecutive
 * characters in `query` must appear in order within at least one of the
 * selected fields, but the rest of the field can contain any other
 * characters around them. This makes mixed content like "Apt 4-B",
 * "+49 170", "ACME GmbH", or "john.smith" all match correctly.
 */
export function matchesAdvancedSearch(
  contact: Contact,
  query: string,
  fieldKeys: string[],
  customFields: CustomField[]
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  for (const key of fieldKeys) {
    const text = getContactFieldText(contact, key, customFields).toLowerCase();
    if (text && text.includes(q)) return true;
  }
  return false;
}

/**
 * Global free-text search used by the main contact list. Matches against
 * all standard fields, all tags, all custom field NAMES (when the
 * contact has a value stored for them), and all custom field VALUES.
 */
export function matchesGlobalSearch(
  contact: Contact,
  query: string,
  customFields: CustomField[]
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  // Standard fields
  for (const { key } of STANDARD_SEARCHABLE_FIELDS) {
    const v = contact[key];
    if (typeof v === 'string' && v.toLowerCase().includes(q)) return true;
  }
  // Tags
  if (contact.tags.some((t) => t.toLowerCase().includes(q))) return true;

  // Custom field names + values (only when the contact actually has a value)
  for (const f of customFields) {
    const stored = contact.customValues[f.id];
    if (!stored) continue;
    if (f.name.toLowerCase().includes(q)) return true;
    const text = formatCustomValue(stored, f);
    if (text && text.toLowerCase().includes(q)) return true;
  }
  return false;
}

/** Returns the custom fields visible for a contact based on its group memberships. */
export function visibleCustomFieldsFor(contact: Contact, fields: CustomField[]): CustomField[] {
  return fields.filter(
    (f) => f.isGlobal || f.groupIds.some((gid) => contact.groupIds.includes(gid))
  );
}

/** Render a custom field value as a plain string for tables/print. */
export function formatCustomValue(value: CustomFieldValue | undefined, field: CustomField): string {
  if (!value) return '';
  switch (value.type) {
    case 'boolean':
      return value.value ? 'Yes' : 'No';
    case 'multiSelect': {
      const labels = (value.value ?? []).map(
        (id) => field.options?.find((o) => o.id === id)?.label ?? id
      );
      return labels.join(', ');
    }
    case 'dropdown':
      return field.options?.find((o) => o.id === value.value)?.label ?? value.value;
    case 'number':
      return String(value.value);
    default:
      return String(value.value ?? '');
  }
}
