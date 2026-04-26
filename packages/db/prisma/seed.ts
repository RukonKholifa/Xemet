import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a sample admin user
  const adminUser = await prisma.user.upsert({
    where: { telegramId: '000000000' },
    update: {},
    create: {
      telegramId: '000000000',
      telegramUsername: 'admin_user',
      xProfileUrl: 'https://x.com/admin_example',
      status: 'APPROVED',
      points: 50,
    },
  });

  console.log('Created admin user:', adminUser.telegramUsername);

  // Create sample users
  const sampleUsers = [
    {
      telegramId: '111111111',
      telegramUsername: 'user_one',
      xProfileUrl: 'https://x.com/user_one',
      status: 'APPROVED' as const,
      points: 25,
    },
    {
      telegramId: '222222222',
      telegramUsername: 'user_two',
      xProfileUrl: 'https://x.com/user_two',
      status: 'PENDING' as const,
      points: 0,
    },
    {
      telegramId: '333333333',
      telegramUsername: 'user_three',
      xProfileUrl: 'https://x.com/user_three',
      status: 'APPROVED' as const,
      points: 10,
    },
  ];

  for (const userData of sampleUsers) {
    await prisma.user.upsert({
      where: { telegramId: userData.telegramId },
      update: {},
      create: userData,
    });
    console.log('Created user:', userData.telegramUsername);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
