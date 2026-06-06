import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding members...');

  const members = [
    // --- Long-tenured members (2024) — all waiting periods cleared ---
    { memberId: 'EMP001', name: 'Rajesh Kumar',    joinDate: new Date('2024-01-15') },
    { memberId: 'EMP002', name: 'Priya Sharma',    joinDate: new Date('2024-03-01') },
    { memberId: 'EMP003', name: 'Amit Patel',      joinDate: new Date('2024-05-20') },
    { memberId: 'EMP004', name: 'Sneha Reddy',     joinDate: new Date('2024-08-10') },

    // --- Mid-tenured members (2025) — past initial, most specific periods cleared ---
    { memberId: 'EMP005', name: 'Vikram Joshi',    joinDate: new Date('2026-04-01') },
    { memberId: 'EMP006', name: 'Ananya Singh',    joinDate: new Date('2025-02-15') },
    { memberId: 'EMP007', name: 'Rahul Verma',     joinDate: new Date('2025-04-01') },
    { memberId: 'EMP008', name: 'Deepika Nair',    joinDate: new Date('2025-06-01') },
    { memberId: 'EMP009', name: 'Karthik Rao',     joinDate: new Date('2025-07-15') },
    { memberId: 'EMP010', name: 'Meera Gupta',     joinDate: new Date('2025-09-01') },

    // --- Recent members (early 2026) — past initial, specific conditions may apply ---
    { memberId: 'EMP011', name: 'Suresh Menon',    joinDate: new Date('2026-01-01') },
    { memberId: 'EMP012', name: 'Lakshmi Iyer',    joinDate: new Date('2026-01-15') },
    { memberId: 'EMP013', name: 'Arjun Das',       joinDate: new Date('2026-02-01') },
    { memberId: 'EMP014', name: 'Kavita Mishra',   joinDate: new Date('2026-03-01') },
    { memberId: 'EMP015', name: 'Rohit Malhotra',  joinDate: new Date('2026-03-15') },

    // --- New members — may trigger specific condition waiting periods ---
    { memberId: 'EMP016', name: 'Pooja Bhatt',     joinDate: new Date('2026-04-01') },
    { memberId: 'EMP017', name: 'Nitin Agarwal',   joinDate: new Date('2026-04-15') },
    { memberId: 'EMP018', name: 'Sanjay Kapoor',   joinDate: new Date('2026-05-01') },

    // --- Very new members — will trigger 30-day initial waiting period ---
    { memberId: 'EMP019', name: 'Divya Chauhan',   joinDate: new Date('2026-05-20') },
    { memberId: 'EMP020', name: 'Manoj Tiwari',    joinDate: new Date('2026-05-28') },
  ];

  for (const m of members) {
    await prisma.member.upsert({
      where: { memberId: m.memberId },
      update: { name: m.name, joinDate: m.joinDate },
      create: m,
    });
    console.log(`  ${m.memberId} — ${m.name} (joined ${m.joinDate.toDateString()})`);
  }

  console.log(`\nSeeded ${members.length} members successfully.`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
