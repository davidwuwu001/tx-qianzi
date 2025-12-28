import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create a test city
  const city = await prisma.city.upsert({
    where: { name: '北京' },
    update: {},
    create: {
      id: 'city-beijing-001',
      name: '北京',
      description: '北京市',
      isActive: true,
      updatedAt: new Date(),
    },
  });
  console.log('Created city:', city.name);

  // Create a test system admin
  const systemAdminPassword = await bcrypt.hash(process.env.DEV_SYSTEM_ADMIN_PASSWORD || 'SysAdmin123!', 10);
  
  const systemAdmin = await prisma.user.upsert({
    where: { username: process.env.DEV_SYSTEM_ADMIN_USERNAME || 'sysadmin' },
    update: {},
    create: {
      id: 'user-sysadmin-001',
      username: process.env.DEV_SYSTEM_ADMIN_USERNAME || 'sysadmin',
      password: systemAdminPassword,
      phone: '13800138001',
      name: '系统管理员',
      role: 'SYSTEM_ADMIN',
      isActive: true,
      updatedAt: new Date(),
    },
  });
  console.log('Created system admin:', systemAdmin.username);

  // Create a test city admin
  const cityAdminPassword = await bcrypt.hash(process.env.DEV_CITY_ADMIN_PASSWORD || 'CityAdmin123!', 10);
  
  const cityAdmin = await prisma.user.upsert({
    where: { username: process.env.DEV_CITY_ADMIN_USERNAME || 'cityadmin' },
    update: {},
    create: {
      id: 'user-cityadmin-001',
      username: process.env.DEV_CITY_ADMIN_USERNAME || 'cityadmin',
      password: cityAdminPassword,
      phone: '13900139001',
      name: '城市管理员',
      role: 'CITY_ADMIN',
      cityId: city.id,
      isActive: true,
      updatedAt: new Date(),
    },
  });
  console.log('Created city admin:', cityAdmin.username);

  // Create a test product
  const product = await prisma.product.upsert({
    where: { id: 'product-test-001' },
    update: {},
    create: {
      id: 'product-test-001',
      name: '标准服务合同',
      description: '适用于一般服务类合同签署',
      templateId: process.env.TENCENT_ESIGN_TEMPLATE_ID || 'test-template-id',
      formFields: {
        partyBName: '乙方姓名',
        partyBPhone: '乙方手机号',
        partyBIdCard: '乙方身份证号',
      },
      isActive: true,
      updatedAt: new Date(),
    },
  });
  console.log('Created product:', product.name);

  // Create city-product relationship
  await prisma.cityProduct.upsert({
    where: {
      cityId_productId: {
        cityId: city.id,
        productId: product.id,
      },
    },
    update: {},
    create: {
      id: 'city-product-001',
      cityId: city.id,
      productId: product.id,
    },
  });
  console.log('Created city-product relationship');

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
