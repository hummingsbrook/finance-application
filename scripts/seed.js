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
  // month is 0-indexed
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, randInt(1, daysInMonth));
}

function randMpesa() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  return Array.from({ length: 10 }, () => randItem(chars.split(''))).join('');
}

function randPhone() {
  const prefixes = ['0700', '0711', '0722', '0733', '0740', '0755', '0768', '0790'];
  return randItem(prefixes) + randInt(100000, 999999).toString();
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

const SERVICE_TYPES = [
  'Sunday Main Service', 'Sunday Second Service', 'Sunday School',
  'Wednesday Bible Study', 'Friday Prayer Meeting', 'Youth Service',
  'Ladies Fellowship', 'Men Fellowship',
];

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

const RECIPIENT_NAMES = {
  SALARIES: ['Rev. James Kariuki', 'Mrs. Faith Muthoni', 'Mr. Kamau Njoroge', 'Mr. John Otieno'],
  UTILITIES: ['Kenya Power & Lighting', 'Nairobi City Water', 'Safaricom Ltd', 'Shell Petrol Station'],
  MAINTENANCE: ['Benson Hardware', 'TechSound Kenya', 'Plumbing Masters', 'Paintmaster Contractors'],
  EVENTS: ['Venue Hire — KICC', 'Mama Njeri Catering', 'M&M Events', 'Excel Printers'],
  TRANSPORT: ['Matatu Saccos', 'Petrol Station', 'Deluxe Coaches Ltd', 'Driver John Otieno'],
  SUPPLIES: ['Bible Society of Kenya', 'Excel Stationers', 'Church Supplies Kenya', 'Local Market'],
  MISCELLANEOUS: ['Registrar of Societies', 'Kenyatta Hospital', 'Advocate M. Mwangi', 'Insurance Co.'],
};

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding ChurchFinance Pro — 2024 to 2026...\n');

  // ── Users ────────────────────────────────────────────────────────────────
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
        passwordHash: hash('Partner@123'),
        firstName: 'Elder', lastName: 'Samuel',
        role: 'PARTNER', phone: '+254711000001', isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'grace@churchfinance.pro' },
      update: {},
      create: {
        email: 'grace@churchfinance.pro',
        passwordHash: hash('Partner@123'),
        firstName: 'Grace', lastName: 'Wambui',
        role: 'PARTNER', phone: '+254711000002', isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'john@churchfinance.pro' },
      update: {},
      create: {
        email: 'john@churchfinance.pro',
        passwordHash: hash('Partner@123'),
        firstName: 'John', lastName: 'Kibaki',
        role: 'PARTNER', phone: '+254711000003', isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'faith@churchfinance.pro' },
      update: {},
      create: {
        email: 'faith@churchfinance.pro',
        passwordHash: hash('Partner@123'),
        firstName: 'Faith', lastName: 'Muthoni',
        role: 'PARTNER', phone: '+254722000001', isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'peter@churchfinance.pro' },
      update: {},
      create: {
        email: 'peter@churchfinance.pro',
        passwordHash: hash('Partner@123'),
        firstName: 'Peter', lastName: 'Ochieng',
        role: 'PARTNER', phone: '+254733000001', isActive: true,
      },
    }),
  ]);

  const admin   = users[0];
  const manager = users[1];
  const partners = users.slice(2);
  console.log(`✅ ${users.length} users`);

  // ── Church Services ──────────────────────────────────────────────────────
  // ~8–10 per year spread across Sundays + midweek
  const serviceRows = [];
  const years = [2024, 2025, 2026];

  years.forEach((yr) => {
    const isPast = yr < 2026;
    // ~4 services per quarter = 16 per year; we do 8 main Sundays + 4 midweek per year
    for (let month = 0; month < 12; month++) {
      if (yr === 2026 && month > 6) break; // only seed up to mid-2026
      // 1 Sunday service per month
      const sundayDate = new Date(yr, month, randInt(1, 14) % 7 === 0 ? randInt(1, 7) : randInt(1, 28));
      // snap to nearest Sunday
      const dayOffset = (7 - sundayDate.getDay()) % 7;
      sundayDate.setDate(sundayDate.getDate() + dayOffset);

      const status = isPast ? 'COMPLETED' : (month < 6 ? 'COMPLETED' : randItem(['SCHEDULED', 'INCOMPLETE']));

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
      });

      // 1 midweek per month (alternating Wednesday Bible Study / Friday Prayer)
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
        });
      }
    }
  });

  for (const svc of serviceRows) {
    await prisma.churchService.upsert({ where: { id: svc.id }, update: {}, create: svc });
  }
  console.log(`✅ ${serviceRows.length} church services`);

  // ── Tithes — ~190 per year ───────────────────────────────────────────────
  const titheRows = [];

  years.forEach((yr) => {
    const monthsToSeed = yr === 2026 ? 7 : 12; // Jan–Jul 2026
    let count = 0;
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
          mpesaReceiptNo: usesMpesa ? randMpesa() : null,
          bankName: usesBankTransfer ? randItem(['Equity Bank', 'KCB', 'Co-operative Bank', 'NCBA']) : null,
          chequeNumber: usesBankTransfer ? `CHQ${randInt(100000, 999999)}` : null,
          idNumber: Math.random() > 0.6 ? `${randInt(10000000, 39999999)}` : null,
          notes: Math.random() > 0.85 ? 'Thanksgiving tithe' : null,
          status: Math.random() > 0.05 ? 'CONFIRMED' : 'PENDING',
          recordedBy: manager.id,
        });
        count++;
      }
    }
  });

  await prisma.tithe.createMany({ data: titheRows, skipDuplicates: true });
  console.log(`✅ ${titheRows.length} tithe records`);

  // ── Offerings — ~190 per year ────────────────────────────────────────────
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
          serviceType: randItem(SERVICE_TYPES),
          paymentMethod: usesMpesa ? 'MPESA' : 'CASH',
          mpesaReceiptNo: usesMpesa ? randMpesa() : null,
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
        const descs = EXPENSE_DESCRIPTIONS[cat];
        const desc = randItem(descs);
        const usesMpesa = Math.random() > 0.4;
        const isSalary = cat === 'SALARIES';
        const isPending = Math.random() > 0.9;

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
          paymentMethod: usesMpesa ? 'MPESA' : randItem(['CASH', 'BANK_TRANSFER']),
          recipientName: randItem(RECIPIENT_NAMES[cat]),
          mpesaReceiptNo: usesMpesa ? randMpesa() : null,
          bankName: !usesMpesa && Math.random() > 0.5 ? randItem(['Equity Bank', 'KCB', 'Co-op Bank']) : null,
          accountNo: !usesMpesa && Math.random() > 0.6 ? `${randInt(1000000000, 9999999999)}` : null,
          idNumber: Math.random() > 0.7 ? `${randInt(10000000, 39999999)}` : null,
          notes: Math.random() > 0.85 ? randItem(['Approved in AGM', 'Emergency expenditure', 'Recurring monthly']) : null,
          status: isPending ? 'PENDING' : 'CONFIRMED',
          recordedBy: manager.id,
          approvedBy: !isPending ? admin.id : null,
        });
      }
    }
  });

  await prisma.expense.createMany({ data: expenseRows, skipDuplicates: true });
  console.log(`✅ ${expenseRows.length} expense records`);

  // ── Harambees ────────────────────────────────────────────────────────────
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
        startDate: new Date('2024-01-15'),
        endDate: new Date('2025-06-30'),
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
        startDate: new Date('2024-06-01'),
        endDate: new Date('2025-12-31'),
        status: 'ACTIVE',
        createdBy: manager.id,
      },
    }),
    prisma.harambee.upsert({
      where: { id: 'harambee-3' },
      update: {},
      create: {
        id: 'harambee-3',
        title: 'Pastor\'s Housing Project',
        description: 'Purchase and renovation of a residence for the lead pastor.',
        targetAmount: 3500000,
        currentAmount: 980000,
        startDate: new Date('2025-03-01'),
        endDate: new Date('2026-03-01'),
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
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-12-31'),
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
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        status: 'ACTIVE',
        createdBy: manager.id,
      },
    }),
  ]);
  console.log(`✅ ${harambees.length} harambees`);

  // ── Harambee Contributions — spread across years ──────────────────────────
  const contribRows = [];
  const harambeeContribDistrib = [
    { h: harambees[0], yr: 2024, months: 12, perMonth: 7 },  // 2024 completed
    { h: harambees[0], yr: 2025, months: 6,  perMonth: 5 },  // partial 2025
    { h: harambees[1], yr: 2024, months: 7,  perMonth: 4 },
    { h: harambees[1], yr: 2025, months: 12, perMonth: 6 },
    { h: harambees[2], yr: 2025, months: 10, perMonth: 4 },
    { h: harambees[2], yr: 2026, months: 7,  perMonth: 3 },
    { h: harambees[3], yr: 2025, months: 6,  perMonth: 8 },  // fully funded
    { h: harambees[4], yr: 2026, months: 7,  perMonth: 4 },
  ];

  harambeeContribDistrib.forEach(({ h, yr, months, perMonth }, distIdx) => {
    for (let month = 0; month < months; month++) {
      for (let i = 0; i < perMonth + randInt(-1, 1); i++) {
        const usesMpesa = Math.random() > 0.3;
        contribRows.push({
          harambeeId: h.id,
          contributorName: randItem(CONTRIBUTOR_NAMES),
          amount: randAmount(5000, 80000),
          date: randDate(yr, month),
          paymentMethod: usesMpesa ? 'MPESA' : randItem(['CASH', 'BANK_TRANSFER']),
          mpesaReceiptNo: usesMpesa ? randMpesa() : null,
          notes: Math.random() > 0.8 ? 'Pledge fulfilment' : null,
          recordedBy: manager.id,
        });
      }
    }
  });

  await prisma.harambeeContribution.createMany({ data: contribRows, skipDuplicates: true });
  console.log(`✅ ${contribRows.length} harambee contributions`);

  // ── Partner Payments — spread across years ────────────────────────────────
  const paymentRows = [];
  const payTypes = ['TITHE', 'OFFERING', 'HARAMBEE'];
  const harambeeIds = ['harambee-1', 'harambee-2', 'harambee-3', 'harambee-4', 'harambee-5'];

  years.forEach((yr) => {
    const monthsToSeed = yr === 2026 ? 7 : 12;
    for (let month = 0; month < monthsToSeed; month++) {
      partners.forEach((partner, pIdx) => {
        // Each partner makes 1–3 payments per month
        const numPayments = randInt(1, 3);
        for (let i = 0; i < numPayments; i++) {
          const type = randItem(payTypes);
          const status = Math.random() > 0.1
            ? 'CONFIRMED'
            : Math.random() > 0.5 ? 'PENDING' : 'REJECTED';
          const usesMpesa = Math.random() > 0.25;

          paymentRows.push({
            userId: partner.id,
            amount: randAmount(2000, 50000),
            paymentType: type,
            harambeeId: type === 'HARAMBEE' ? randItem(harambeeIds) : null,
            paymentMethod: usesMpesa ? 'MPESA' : randItem(['CASH', 'BANK_TRANSFER']),
            mpesaReceiptNo: usesMpesa && status === 'CONFIRMED' ? randMpesa() : null,
            phoneNumber: usesMpesa ? partner.phone : null,
            status,
            rejectionReason: status === 'REJECTED'
              ? randItem([
                  'Receipt number does not match any M-Pesa transaction.',
                  'Amount does not match the stated payment.',
                  'Duplicate submission detected.',
                ])
              : null,
            confirmedBy: status === 'CONFIRMED' ? manager.id : null,
            confirmedAt: status === 'CONFIRMED'
              ? new Date(yr, month, randInt(1, 28), randInt(8, 17), randInt(0, 59))
              : null,
            createdAt: new Date(yr, month, randInt(1, 27)),
            updatedAt: new Date(yr, month, randInt(1, 28)),
          });
        }
      });
    }
  });

  await prisma.payment.createMany({ data: paymentRows, skipDuplicates: true });
  console.log(`✅ ${paymentRows.length} partner payments`);

  // ── Audit Logs ────────────────────────────────────────────────────────────
  const modules = ['tithes', 'offerings', 'expenses', 'harambees', 'payments', 'users', 'AUTH'];
  const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'STATUS_CHANGE'];
  const auditRows = [];
  const allUsers = [admin, manager, ...partners];

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
  const totals = {
    tithes: titheRows.length,
    offerings: offeringRows.length,
    expenses: expenseRows.length,
  };
  const grandTotal = totals.tithes + totals.offerings + totals.expenses;

  console.log(`
🎉 Seed complete!

📊 Records per category:
   Tithes:    ${totals.tithes}  (~${Math.round(totals.tithes / (years.length - 0.5))} /yr)
   Offerings: ${totals.offerings}  (~${Math.round(totals.offerings / (years.length - 0.5))} /yr)
   Expenses:  ${totals.expenses}  (~${Math.round(totals.expenses / (years.length - 0.5))} /yr)
   Total:     ${grandTotal}

📋 Test Accounts:
   Super Admin:  admin@churchfinance.pro    / Admin@123
   Manager:      manager@churchfinance.pro  / Manager@123
   Partner:      elder@churchfinance.pro    / Partner@123
                 grace@churchfinance.pro    / Partner@123
                 john@churchfinance.pro     / Partner@123
                 faith@churchfinance.pro    / Partner@123
                 peter@churchfinance.pro    / Partner@123
`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
