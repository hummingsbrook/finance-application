export const CHURCH_EVENT_TYPES = [
  { value: 'NEW_YEAR',            label: "New Year's Day",      date: { month: 1,  day: 1  } },
  { value: 'GOOD_FRIDAY',         label: 'Good Friday',          date: null },
  { value: 'EASTER_SUNDAY',       label: 'Easter Sunday',        date: null },
  { value: 'EASTER_MONDAY',       label: 'Easter Monday',        date: null },
  { value: 'CHRISTMAS',           label: 'Christmas Day',        date: { month: 12, day: 25 } },
  { value: 'BOXING_DAY',          label: 'Boxing Day',           date: { month: 12, day: 26 } },
  { value: 'THANKSGIVING_SUNDAY', label: 'Thanksgiving Sunday',  date: null },
  { value: 'CHURCH_ANNIVERSARY',  label: 'Church Anniversary',   date: null },
  { value: 'HARVEST_FESTIVAL',    label: 'Harvest Festival',     date: null },
  { value: 'CUSTOM',              label: 'Custom Event',         date: null },
];

export const PRESET_EVENT_VALUES = CHURCH_EVENT_TYPES
  .filter((e) => e.value !== 'CUSTOM')
  .map((e) => e.value);


export const PROGRAMME_ROLES = [
  'Preacher',
  'MC',
  'Worship Leader',
  'Choir Director',
  'Usher Coordinator',
  'Scripture Reader',
  'Prayer Lead',
  'Other',
];

export const IN_KIND_CATEGORIES = [
  { value: 'FOOD',     label: 'Food',     icon: 'nutrition' },
  { value: 'CLOTHES',  label: 'Clothes',  icon: 'checkroom' },
  { value: 'SUPPLIES', label: 'Supplies', icon: 'inventory_2' },
  { value: 'OTHERS',   label: 'Others',   icon: 'category' },
];

export const CONTRIBUTION_TYPE_BADGE = {
  MONEY:   { bg: 'bg-secondary-container', text: 'text-on-secondary-container', label: 'Money' },
  IN_KIND: { bg: 'bg-primary-fixed',       text: 'text-on-primary-fixed-variant', label: 'In-Kind' },
};

export const PAYMENT_METHOD_BADGE = {
  CASH:          { bg: 'bg-surface-container-lowest border border-outline-variant', text: 'text-on-surface-variant', label: 'Cash' },
  MPESA:         { bg: 'bg-secondary-container', text: 'text-on-secondary-container', label: 'M-Pesa' },
  BANK_TRANSFER: { bg: 'bg-tertiary-fixed',      text: 'text-on-tertiary-fixed-variant', label: 'Bank' },
};
