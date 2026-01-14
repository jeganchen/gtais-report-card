/**
 * 数据库种子数据
 * 创建初始管理员用户
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 创建初始管理员用户
  const adminPassword = await bcrypt.hash('admin123', 10);

  // 创建 GTAIS 管理员用户
  const gtaisAdminUser = await prisma.user.upsert({
    where: { email: 'infocare@gtais.org' },
    update: {
      password: adminPassword,
      role: 'admin',
      isActive: true,
    },
    create: {
      email: 'infocare@gtais.org',
      name: 'GTAIS Administrator',
      role: 'admin',
      provider: 'credentials',
      password: adminPassword,
      isActive: true,
    },
  });

  console.log('✅ Created GTAIS admin user:', gtaisAdminUser.email);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@school.edu' },
    update: {},
    create: {
      email: 'admin@school.edu',
      name: 'Administrator',
      role: 'admin',
      provider: 'credentials',
      password: adminPassword,
      isActive: true,
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@school.edu' },
    update: {},
    create: {
      email: 'teacher@school.edu',
      name: 'Teacher User',
      role: 'teacher',
      provider: 'credentials',
      password: teacherPassword,
      isActive: true,
    },
  });

  console.log('✅ Created teacher user:', teacherUser.email);

  // 创建默认设置记录
  await prisma.settings.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
    },
  });

  console.log('✅ Created default settings');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
