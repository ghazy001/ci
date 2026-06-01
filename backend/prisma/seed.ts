import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@project.com';

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log('Admin already exists');
    return;
  }

  const passwordHash = await bcrypt.hash('Admin12345!', 10);

  await prisma.user.create({
    data: {
      fullName: 'System Admin',
      email,
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log('Admin created:', email);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
