const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

const hash = (pw) => bcrypt.hashSync(pw, 10);

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randAmount(min, max) {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function randDate(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, randInt(1, daysInMonth));
}

function randMpesa() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  return Array.from({ length: 10 }, () => randItem(chars.split(''))).join('');
}

// Keep a set of used M-Pesa codes to avoid duplicates within the seed run
const usedMpesa = new Set();
function uniqueMpesa() {
  let code;
  do { code = randMpesa(); } while (usedMpesa.has(code));
  usedMpesa.add(code);
  return code;
}

// Keep a set of used cheque numbers to avoid duplicates within the seed run
const usedCheques = new Set();
function uniqueCheque() {
  let code;
  do { code = `CHQ${randInt(100000, 999999)}`; } while (usedCheques.has(code));
  usedCheques.add(code);
  return code;
}

// ─── Data pools ─────────────────────────────────────────────────────────────

const CONTRIBUTOR_NAMES = [
  'John Mwangi Kibaki', 'Grace Wambui Njeri', 'Elder Samuel Omondi',
  'Mary Njoroge Wanjiku', 'Peter Ochieng Otieno', 'Faith Muthoni Kamau',
  'David Kamau Kariuki', 'Esther Wairimu Gacheru', 'Ruth Achieng Onyango',
  'James Karanja Muthama', 'Lydia Chebet Rutto', 'Philip Njoroge Muturi',
  'Catherine Njoki Gitahi', 'Solomon Kipchoge Rotich', 'Agnes Nyambura Waweru',
  'Timothy Mutua Nzomo', 'Priscilla Auma Odhiambo', 'Barnabas Wekesa Simiyu',
  'Magdalene Waithira Thuku', 'Caleb Kibet Keter', 'Naomi Wanjiru Gicheru',
  'Moses Otieno Owino', 'Deborah Wangui Njenga', 'Aaron Kiprotich Sang',
  'Esther Chemutai Bett', 'Stephen Muigai Gakuru', 'Hanna Akinyi Ouma',
  'Jonathan Mwenda Gitonga', 'Miriam Wangare Macharia', 'Daniel Kipchumba Tarus',
  'Judith Nduta Mwangi', 'Emmanuel Ayub Silas', 'Eunice Adhiambo Onyango',
  'George Njuguna Kamau', 'Beatrice Wangui Githae', 'Patrick Ochieng Owuor',
  'Florence Wamuyu Githuku', 'Thomas Muthoni Kioko', 'Rebecca Chepkirui Koech',
  'Andrew Maina Muchangi',
];

// Only two valid offering service types
const SERVICE_TYPES = ['Sunday Main', 'Sunday School'];

const SALARY_TYPES = ['PASTOR', 'CARETAKER', 'SECURITY_OFFICER'];

const SERMON_TOPICS = [
  'Walking in the Spirit', 'Faith That Moves Mountains', 'The Power of Worship',
  'Divine Provision', 'The Fruit of the Spirit', 'Prayer Without Ceasing',
  'Forgiveness and Restoration', 'The Great Commission', 'Living by Grace',
  'Stewardship and Giving', 'The Armour of God', 'Renewed in Christ',
  'Overcoming Fear with Faith', 'The Gift of Salvation', 'Serving One Another',
  'Building on the Rock', 'The Good Shepherd', 'Light of the World',
  'Love Your Neighbour', 'Hope in the Lord', 'Abiding in the Vine',
  'Wisdom from Above', 'The Promised Land', 'Trusting God in Trials',
];

const SPEAKERS = [
  'Pastor James Kariuki', 'Rev. Samuel Omondi', 'Dr. Sarah Kimani',
  'Rev. Martha Wanjiku', 'Pastor John Mwangi', 'Elder Peter Kingorá',
  'Deacon Moses Otieno', 'Rev. Dr. Ruth Achieng',
];

const PROGRAMMERS = [
  'Mercy Njeri', 'Grace Wambui', 'Faith Muthoni', 'Lydia Chebet',
  'Agnes Nyambura', 'Priscilla Auma', 'Catherine Njoki',
];

const EXPENSE_DESCRIPTIONS = {
  SALARIES: [
    'Pastor Monthly Salary', 'Church Secretary Salary', 'Cleaner Monthly Pay',
    'Worship Leader Honorarium', 'Security Guard Salary', 'Accountant Stipend',
  ],
  UTILITIES: [
    'KPLC Electricity Bill', 'Nairobi Water Bill', 'Safaricom Internet Subscription',
    'Generator Fuel', 'LPG Gas Cylinder', 'Telephone Bill',
  ],
  MAINTENANCE: [
    'Roof Repair & Waterproofing', 'Sound System Servicing', 'Plumbing Repairs',
    'Painting — Main Hall', 'Gate and Fence Repair', 'PA System Cable Replacement',
    'Chairs Re-upholstering', 'Projector Bulb Replacement',
  ],
  EVENTS: [
    'Annual Youth Conference', 'Women Conference Catering', "Men's Retreat — Naivasha",
    'Easter Sunday Programme', 'Christmas Celebration Event', 'Church Anniversary Dinner',
    'Evangelism Outreach Materials', 'Camp Meeting Venue Hire',
  ],
  TRANSPORT: [
    "Pastor's Travel Allowance", 'Church Van Fuel', 'Material Delivery — Town',
    'Event Transport Hire', 'Matatu Fare Reimbursement', 'Airport Pickup — Visiting Minister',
  ],
  SUPPLIES: [
    'New Chairs Purchase (10 pcs)', 'Bibles Procurement (20 copies)', 'Choir Robes Order',
    'Offering Envelopes', 'Communion Elements', 'Banners & Signage Printing',
    'Stationery — Office', 'Cleaning Supplies',
  ],
  MISCELLANEOUS: [
    'License Renewal', 'Medical — Staff', 'Legal Fees',
    'Insurance Premium', 'Guest Minister Gift', 'Benevolence Fund Disbursement',
    'Books & Resource Materials', 'Training & Conference Fees',
  ],
};

// salaryType per salary description
const SALARY_TYPE_MAP = {
  'Pastor Monthly Salary':       'PASTOR',
  'Worship Leader Honorarium':   'PASTOR',
  'Church Secretary Salary':     'CARETAKER',
  'Cleaner Monthly Pay':         'CARETAKER',
  'Security Guard Salary':       'SECURITY_OFFICER',
  'Accountant Stipend':          'CARETAKER',
};

const RECIPIENT_NAMES = {
  SALARIES:      ['Rev. James Kariuki', 'Mrs. Faith Muthoni', 'Mr. Kamau Njoroge', 'Mr. John Otieno'],
  UTILITIES:     ['Kenya Power & Lighting', 'Nairobi City Water', 'Safaricom Ltd', 'Shell Petrol Station'],
  MAINTENANCE:   ['Benson Hardware', 'TechSound Kenya', 'Plumbing Masters', 'Paintmaster Contractors'],
  EVENTS:        ['Venue Hire — KICC', 'Mama Njeri Catering', 'M&M Events', 'Excel Printers'],
  TRANSPORT:     ['Matatu Saccos', 'Petrol Station', 'Deluxe Coaches Ltd', 'Driver John Otieno'],
  SUPPLIES:      ['Bible Society of Kenya', 'Excel Stationers', 'Church Supplies Kenya', 'Local Market'],
  MISCELLANEOUS: ['Registrar of Societies', 'Kenyatta Hospital', 'Advocate M. Mwangi', 'Insurance Co.'],
};

// Event contribution pools
const CHURCH_EVENTS = [
  { eventType: 'CHRISTMAS',           eventName: 'Christmas Day',        month: 11 },
  { eventType: 'BOXING_DAY',          eventName: 'Boxing Day',           month: 11 },
  { eventType: 'NEW_YEAR',            eventName: "New Year's Day",       month: 0  },
  { eventType: 'EASTER_SUNDAY',       eventName: 'Easter Sunday',        month: 3  },
  { eventType: 'GOOD_FRIDAY',         eventName: 'Good Friday',          month: 3  },
  { eventType: 'HARVEST_FESTIVAL',    eventName: 'Harvest Festival',     month: 9  },
  { eventType: 'CHURCH_ANNIVERSARY',  eventName: 'Church Anniversary',   month: 6  },
  { eventType: 'THANKSGIVING_SUNDAY', eventName: 'Thanksgiving Sunday',  month: 10 },
];

const IN_KIND_CATEGORIES = ['FOOD', 'CLOTHES', 'SUPPLIES', 'OTHERS'];
const IN_KIND_DESCRIPTIONS = {
  FOOD:     ['20kg Maize Flour', '10 litres Cooking Oil', '50kg Rice', 'Assorted Food Hamper', '30 loaves of Bread'],
  CLOTHES:  ['10 Warm Jackets', '20 School Uniforms', '30 Pairs of Shoes', 'Assorted Clothing Bundle'],
  SUPPLIES: ['Box of Bibles', '10 Hymn Books', 'Stationery Bundle', 'Cleaning Supplies Pack'],
  OTHERS:   ['Plastic Chairs (5)', 'Portable Generator', 'Water Purifier', 'Garden Tools Set'],
};

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding ChurchFinance Pro — 2024 to 2026...\n');

  // ── Users ────────────────────────────────────────────────────────────────
  // Only MANAGER and SUPER_ADMIN — PARTNER role has been removed
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@churchfinance.pro' },
      update: {},
      create: {
        email: 'admin@churchfinance.pro',
        passwordHash: hash('Admin@123'),
        firstName: 'Super', lastName: 'Admin',
        role: 'SUPER_ADMIN', phone: '+254700000001', isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'manager@churchfinance.pro' },
      update: {},
      create: {
        email: 'manager@churchfinance.pro',
        passwordHash: hash('Manager@123'),
        firstName: 'Pastor', lastName: 'Wanjiku',
        role: 'MANAGER', phone: '+254700000002', isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'elder@churchfinance.pro' },
      update: {},
      create: {
        email: 'elder@churchfinance.pro',
        passwordHash: hash('Manager@123'),
        firstName: 'Elder', lastName: 'Samuel',
        role: 'MANAGER', phone: '+254711000001', isActive: true,
      },
    }),
  ]);

  const admin   = users[0];
  const manager = users[1];
  console.log(`✅ ${users.length} users`);

  // ── Church Services ──────────────────────────────────────────────────────
  const serviceRows = [];
  const years = [2024, 2025, 2026];

  years.forEach((yr) => {
    for (let month = 0; month < 12; month++) {
      if (yr === 2026 && month > 6) break;

      const sundayDate = new Date(yr, month, randInt(1, 28));
      const dayOffset = (7 - sundayDate.getDay()) % 7;
      sundayDate.setDate(sundayDate.getDate() + dayOffset);

      const isPast = yr < 2026 || (yr === 2026 && month < 6);
      const status = isPast ? 'COMPLETED' : randItem(['SCHEDULED', 'INCOMPLETE']);

      serviceRows.push({
        id: `svc-${yr}-${month}-sun`,
        name: 'Sunday Worship Service',
        dayOfWeek: 'Sunday',
        time: randItem(['09:00', '10:00']),
        serviceDate: sundayDate,
        topic: status !== 'INCOMPLETE' ? randItem(SERMON_TOPICS) : null,
        speaker: status !== 'INCOMPLETE' ? randItem(SPEAKERS) : null,
        programmer: status === 'COMPLETED' ? randItem(PROGRAMMERS) : null,
        leadMinistrant: status === 'COMPLETED' ? randItem(['Elder Peter Kingorá', 'Deacon Moses Otieno', 'Elder Ruth Achieng']) : null,
        reader: status === 'COMPLETED' ? randItem(['Alice Wangui', 'Lilian M.', 'Samuel Maina', 'Naomi Wanjiru']) : null,
        notes: null,
        status,
        isActive: true,
        createdBy: manager.id,
      });

      if (month % 2 === 0) {
        const midDate = new Date(yr, month, randInt(8, 25));
        serviceRows.push({
          id: `svc-${yr}-${month}-mid`,
          name: randItem(['Wednesday Bible Study', 'Friday Prayer Meeting']),
          dayOfWeek: randItem(['Wednesday', 'Friday']),
          time: '18:30',
          serviceDate: midDate,
          topic: isPast ? randItem(SERMON_TOPICS) : null,
          speaker: isPast ? randItem(SPEAKERS) : null,
          programmer: null,
          leadMinistrant: null,
          reader: null,
          notes: null,
          status: isPast ? 'COMPLETED' : 'SCHEDULED',
          isActive: true,
          createdBy: manager.id,
        });
      }
    }
  });

  for (const svc of serviceRows) {
    await prisma.churchService.upsert({
      where: { id: svc.id },
      update: {},
      create: svc,
    });
  }
  console.log(`✅ ${serviceRows.length} church services`);

  // ── Tithes — ~190 per year ───────────────────────────────────────────────
  const titheRows = [];

  years.forEach((yr) => {
    const monthsToSeed = yr === 2026 ? 7 : 12;
    const target = yr === 2026 ? Math.round(190 * (7 / 12)) : 190;

    for (let month = 0; month < monthsToSeed; month++) {
      const perMonth = Math.round(target / monthsToSeed) + randInt(-2, 2);
      for (let i = 0; i < perMonth; i++) {
        const usesMpesa = Math.random() > 0.35;
        const usesBankTransfer = !usesMpesa && Math.random() > 0.7;
        titheRows.push({
          id: `tithe-${yr}-${month}-${i}`,
          contributorName: randItem(CONTRIBUTOR_NAMES),
          amount: randAmount(2000, 30000),
          date: randDate(yr, month),
          paymentMethod: usesMpesa ? 'MPESA' : usesBankTransfer ? 'BANK_TRANSFER' : 'CASH',
          mpesaReceiptNo: usesMpesa ? uniqueMpesa() : null,
          bankName: usesBankTransfer ? randItem(['Equity Bank', 'KCB', 'Co-operative Bank', 'NCBA']) : null,
          chequeNumber: usesBankTransfer ? uniqueCheque() : null,
          idNumber: Math.random() > 0.6 ? `${randInt(10000000, 39999999)}` : null,
          notes: Math.random() > 0.85 ? 'Thanksgiving tithe' : null,
          status: Math.random() > 0.05 ? 'CONFIRMED' : 'PENDING',
          recordedBy: manager.id,
        });
      }
    }
  });

  await prisma.tithe.createMany({ data: titheRows, skipDuplicates: true });
  console.log(`✅ ${titheRows.length} tithe records`);

  // ── Offerings — ~190 per year ────────────────────────────────────────────
  // Only Sunday Main and Sunday School — the only valid service types
  const offeringRows = [];

  years.forEach((yr) => {
    const monthsToSeed = yr === 2026 ? 7 : 12;
    const target = yr === 2026 ? Math.round(190 * (7 / 12)) : 190;

    for (let month = 0; month < monthsToSeed; month++) {
      const perMonth = Math.round(target / monthsToSeed) + randInt(-2, 2);
      for (let i = 0; i < perMonth; i++) {
        const usesMpesa = Math.random() > 0.45;
        offeringRows.push({
          id: `offering-${yr}-${month}-${i}`,
          contributorName: randItem(CONTRIBUTOR_NAMES),
          amount: randAmount(500, 15000),
          date: randDate(yr, month),
          serviceType: randItem(SERVICE_TYPES),  // Sunday Main | Sunday School only
          paymentMethod: usesMpesa ? 'MPESA' : 'CASH',
          mpesaReceiptNo: usesMpesa ? uniqueMpesa() : null,
          bankName: null,
          chequeNumber: null,
          idNumber: Math.random() > 0.7 ? `${randInt(10000000, 39999999)}` : null,
          notes: Math.random() > 0.9 ? 'Special offering' : null,
          status: Math.random() > 0.04 ? 'CONFIRMED' : 'PENDING',
          recordedBy: manager.id,
        });
      }
    }
  });

  await prisma.offering.createMany({ data: offeringRows, skipDuplicates: true });
  console.log(`✅ ${offeringRows.length} offering records`);

  // ── Expenses — ~190 per year ─────────────────────────────────────────────
  const categories = ['SALARIES', 'UTILITIES', 'MAINTENANCE', 'EVENTS', 'TRANSPORT', 'SUPPLIES', 'MISCELLANEOUS'];
  const expenseRows = [];

  years.forEach((yr) => {
    const monthsToSeed = yr === 2026 ? 7 : 12;
    const target = yr === 2026 ? Math.round(190 * (7 / 12)) : 190;

    for (let month = 0; month < monthsToSeed; month++) {
      const perMonth = Math.round(target / monthsToSeed) + randInt(-1, 2);
      for (let i = 0; i < perMonth; i++) {
        const cat = randItem(categories);
        const desc = randItem(EXPENSE_DESCRIPTIONS[cat]);
        const usesMpesa = Math.random() > 0.4;
        const isSalary = cat === 'SALARIES';
        const isPending = Math.random() > 0.9;

        // Determine salaryType for SALARIES category
        const salaryType = isSalary
          ? (SALARY_TYPE_MAP[desc] || randItem(SALARY_TYPES))
          : null;

        expenseRows.push({
          id: `expense-${yr}-${month}-${i}`,
          description: desc,
          amount: isSalary
            ? randAmount(25000, 80000)
            : cat === 'EVENTS'
              ? randAmount(15000, 150000)
              : randAmount(1500, 40000),
          date: randDate(yr, month),
          category: cat,
          salaryType,   // populated for SALARIES, null for all others
          paymentMethod: usesMpesa ? 'MPESA' : randItem(['CASH', 'BANK_TRANSFER']),
          recipientName: randItem(RECIPIENT_NAMES[cat]),
          mpesaReceiptNo: usesMpesa ? uniqueMpesa() : null,
          bankName: !usesMpesa && Math.random() > 0.5 ? randItem(['Equity Bank', 'KCB', 'Co-op Bank']) : null,
          accountNo: !usesMpesa && Math.random() > 0.6 ? `${randInt(1000000000, 9999999999)}` : null,
          idNumber: Math.random() > 0.7 ? `${randInt(10000000, 39999999)}` : null,
          notes: Math.random() > 0.85 ? randItem(['Approved in AGM', 'Emergency expenditure', 'Recurring monthly']) : null,
          status: isPending ? 'PENDING' : 'CONFIRMED',
          recordedBy: manager.id,
        });
      }
    }
  });

  await prisma.expense.createMany({ data: expenseRows, skipDuplicates: true });
  console.log(`✅ ${expenseRows.length} expense records`);

  // ── Harambees ────────────────────────────────────────────────────────────
  // Note: Harambee model has no startDate/endDate fields — removed from create calls
  const harambees = await Promise.all([
    prisma.harambee.upsert({
      where: { id: 'harambee-1' },
      update: {},
      create: {
        id: 'harambee-1',
        title: 'Church Building Fund — Phase 2',
        description: 'Roof installation and interior finishing for the new sanctuary building.',
        targetAmount: 5000000,
        currentAmount: 3850000,
        deadline: new Date('2025-06-30'),
        status: 'COMPLETED',
        createdBy: manager.id,
      },
    }),
    prisma.harambee.upsert({
      where: { id: 'harambee-2' },
      update: {},
      create: {
        id: 'harambee-2',
        title: 'Youth Centre Construction',
        description: 'Building a dedicated youth centre for our growing youth ministry.',
        targetAmount: 2000000,
        currentAmount: 1420000,
        deadline: new Date('2025-12-31'),
        status: 'ACTIVE',
        createdBy: manager.id,
      },
    }),
    prisma.harambee.upsert({
      where: { id: 'harambee-3' },
      update: {},
      create: {
        id: 'harambee-3',
        title: "Pastor's Housing Project",
        description: 'Purchase and renovation of a residence for the lead pastor.',
        targetAmount: 3500000,
        currentAmount: 980000,
        deadline: new Date('2026-03-01'),
        status: 'ACTIVE',
        createdBy: manager.id,
      },
    }),
    prisma.harambee.upsert({
      where: { id: 'harambee-4' },
      update: {},
      create: {
        id: 'harambee-4',
        title: 'Church Van Purchase',
        description: 'Buying a 14-seater van for church transport and outreach ministry.',
        targetAmount: 1800000,
        currentAmount: 1800000,
        deadline: new Date('2025-12-31'),
        status: 'COMPLETED',
        createdBy: manager.id,
      },
    }),
    prisma.harambee.upsert({
      where: { id: 'harambee-5' },
      update: {},
      create: {
        id: 'harambee-5',
        title: 'Sound & Multimedia Upgrade',
        description: 'Professional sound system, screens, and cameras for live streaming.',
        targetAmount: 1200000,
        currentAmount: 450000,
        deadline: new Date('2026-12-31'),
        status: 'ACTIVE',
        createdBy: manager.id,
      },
    }),
  ]);
  console.log(`✅ ${harambees.length} harambees`);

  // ── Harambee Contributions ───────────────────────────────────────────────
  const contribRows = [];
  const harambeeContribDistrib = [
    { h: harambees[0], yr: 2024, months: 12, perMonth: 7 },
    { h: harambees[0], yr: 2025, months: 6,  perMonth: 5 },
    { h: harambees[1], yr: 2024, months: 7,  perMonth: 4 },
    { h: harambees[1], yr: 2025, months: 12, perMonth: 6 },
    { h: harambees[2], yr: 2025, months: 10, perMonth: 4 },
    { h: harambees[2], yr: 2026, months: 7,  perMonth: 3 },
    { h: harambees[3], yr: 2025, months: 6,  perMonth: 8 },
    { h: harambees[4], yr: 2026, months: 7,  perMonth: 4 },
  ];

  harambeeContribDistrib.forEach(({ h, yr, months, perMonth }) => {
    for (let month = 0; month < months; month++) {
      for (let i = 0; i < perMonth + randInt(-1, 1); i++) {
        const usesMpesa = Math.random() > 0.3;
        contribRows.push({
          harambeeId: h.id,
          contributorName: randItem(CONTRIBUTOR_NAMES),
          amount: randAmount(5000, 80000),
          date: randDate(yr, month),
          paymentMethod: usesMpesa ? 'MPESA' : randItem(['CASH', 'BANK_TRANSFER']),
          mpesaReceiptNo: usesMpesa ? uniqueMpesa() : null,
          notes: Math.random() > 0.8 ? 'Pledge fulfilment' : null,
          recordedBy: manager.id,
        });
      }
    }
  });

  await prisma.harambeeContribution.createMany({ data: contribRows, skipDuplicates: true });
  console.log(`✅ ${contribRows.length} harambee contributions`);

  // ── Event Contributions ──────────────────────────────────────────────────
  // Mix of MONEY and IN_KIND contributions for major church events
  const eventRows = [];

  years.forEach((yr) => {
    CHURCH_EVENTS.forEach((evt) => {
      if (yr === 2026 && evt.month > 6) return; // only seed up to mid-2026

      const numContribs = randInt(8, 18);
      const eventDate = new Date(yr, evt.month, randInt(1, 28));

      for (let i = 0; i < numContribs; i++) {
        const isMoneyContrib = Math.random() > 0.3;  // 70% money, 30% in-kind

        if (isMoneyContrib) {
          const usesMpesa = Math.random() > 0.35;
          const usesBankTransfer = !usesMpesa && Math.random() > 0.6;
          eventRows.push({
            contributorName: randItem(CONTRIBUTOR_NAMES),
            contributionType: 'MONEY',
            amount: randAmount(1000, 20000),
            paymentMethod: usesMpesa ? 'MPESA' : usesBankTransfer ? 'BANK_TRANSFER' : 'CASH',
            mpesaReceiptNo: usesMpesa ? uniqueMpesa() : null,
            bankName: usesBankTransfer ? randItem(['Equity Bank', 'KCB', 'Co-op Bank', 'NCBA']) : null,
            accountNo: usesBankTransfer ? `${randInt(1000000000, 9999999999)}` : null,
            idNumber: Math.random() > 0.6 ? `${randInt(10000000, 39999999)}` : null,
            inKindCategory: null,
            inKindDescription: null,
            inKindOtherType: null,
            eventType: evt.eventType,
            eventName: evt.eventName,
            eventDate,
            programmeTeam: JSON.stringify([
              { name: randItem(SPEAKERS), role: 'Preacher' },
              { name: randItem(PROGRAMMERS), role: 'MC' },
            ]),
            notes: Math.random() > 0.85 ? 'Special event contribution' : null,
            recordedBy: manager.id,
          });
        } else {
          const cat = randItem(IN_KIND_CATEGORIES);
          const desc = randItem(IN_KIND_DESCRIPTIONS[cat]);
          eventRows.push({
            contributorName: randItem(CONTRIBUTOR_NAMES),
            contributionType: 'IN_KIND',
            amount: null,
            paymentMethod: null,
            mpesaReceiptNo: null,
            bankName: null,
            accountNo: null,
            idNumber: null,
            inKindCategory: cat,
            inKindDescription: desc,
            inKindOtherType: cat === 'OTHERS' ? randItem(['Electronics', 'Furniture', 'Garden Tools']) : null,
            eventType: evt.eventType,
            eventName: evt.eventName,
            eventDate,
            programmeTeam: null,
            notes: null,
            recordedBy: manager.id,
          });
        }
      }
    });
  });

  await prisma.eventContribution.createMany({ data: eventRows, skipDuplicates: true });
  console.log(`✅ ${eventRows.length} event contributions`);

  // ── Audit Logs ────────────────────────────────────────────────────────────
  const modules = ['tithes', 'offerings', 'expenses', 'harambees', 'events', 'users', 'AUTH'];
  const auditRows = [];
  const allUsers = [admin, manager, users[2]];

  for (let i = 0; i < 120; i++) {
    const yr = randItem(years);
    const month = yr === 2026 ? randInt(0, 6) : randInt(0, 11);
    const user = randItem(allUsers);
    const module = randItem(modules);
    const action = module === 'AUTH'
      ? randItem(['LOGIN', 'LOGOUT'])
      : randItem(['CREATE', 'UPDATE', 'STATUS_CHANGE', 'DELETE']);

    auditRows.push({
      userId: user.id,
      action,
      module,
      recordId: action !== 'LOGIN' && action !== 'LOGOUT' ? `rec-${randInt(1000, 9999)}` : null,
      details: action === 'LOGIN'
        ? `${user.firstName} ${user.lastName} logged in`
        : action === 'LOGOUT'
          ? `${user.firstName} ${user.lastName} logged out`
          : `${action} on ${module} by ${user.firstName} ${user.lastName}`,
      ipAddress: `192.168.${randInt(1, 5)}.${randInt(50, 200)}`,
      createdAt: new Date(yr, month, randInt(1, 28), randInt(6, 22), randInt(0, 59)),
    });
  }

  await prisma.auditLog.createMany({ data: auditRows, skipDuplicates: true });
  console.log(`✅ ${auditRows.length} audit log entries`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`
🎉 Seed complete!

📊 Records seeded:
   Users:                  ${users.length}
   Church Services:        ${serviceRows.length}
   Tithes:                 ${titheRows.length}
   Offerings:              ${offeringRows.length}
   Expenses:               ${expenseRows.length}
   Harambees:              ${harambees.length}
   Harambee Contributions: ${contribRows.length}
   Event Contributions:    ${eventRows.length}
   Audit Logs:             ${auditRows.length}

📋 Test Accounts:
   Super Admin:  admin@churchfinance.pro    / Admin@123
   Manager:      manager@churchfinance.pro  / Manager@123
   Manager:      elder@churchfinance.pro    / Manager@123
`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
