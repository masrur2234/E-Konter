import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Hash password once
  const hashedPassword = await bcrypt.hash('user123', 10)
  const hashedAdminPassword = await bcrypt.hash('Serv3r4PP!', 10)

  // 1. Super Admin - MASRUR ROHIM (unlimited access)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superedp@gmail.com' },
    update: {},
    create: {
      email: 'superedp@gmail.com',
      password: hashedAdminPassword,
      name: 'MASRUR ROHIM',
      phone: '081234567890',
      role: 'super_admin',
      status: 'active',
      subscriptionStatus: 'active',
      subscriptionStart: new Date('2024-01-01'),
      subscriptionEnd: new Date('2099-12-31'),
      planType: 'yearly',
    },
  })

  // Create store for super admin
  await prisma.store.upsert({
    where: { id: 'store-superadmin-001' },
    update: {},
    create: {
      id: 'store-superadmin-001',
      userId: superAdmin.id,
      name: 'KasirPOS Headquarters',
      address: 'Indonesia',
      phone: '081234567890',
      whatsapp: '081234567890',
      isActive: true,
    },
  })

  console.log('✅ Super Admin created:', superAdmin.email)

  // 2. Trial Account
  const trialUser = await prisma.user.upsert({
    where: { email: 'trial@kasirpos.com' },
    update: {},
    create: {
      email: 'trial@kasirpos.com',
      password: hashedPassword,
      name: 'User Trial',
      role: 'owner',
      status: 'active',
      subscriptionStatus: 'trial',
      trialStart: new Date(),
      trialEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    },
  })

  await prisma.store.upsert({
    where: { id: 'store-trial-001' },
    update: {},
    create: {
      id: 'store-trial-001',
      userId: trialUser.id,
      name: 'Toko Trial',
      address: 'Jl. Trial No. 1',
      isActive: true,
    },
  })

  console.log('✅ Trial user created:', trialUser.email)

  // 3. Bulanan Active Account
  const bulananUser = await prisma.user.upsert({
    where: { email: 'bulanan@kasirpos.com' },
    update: {},
    create: {
      email: 'bulanan@kasirpos.com',
      password: hashedPassword,
      name: 'User Bulanan',
      role: 'owner',
      status: 'active',
      subscriptionStatus: 'active',
      subscriptionStart: new Date(),
      subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      planType: 'monthly',
    },
  })

  await prisma.store.upsert({
    where: { id: 'store-bulanan-001' },
    update: {},
    create: {
      id: 'store-bulanan-001',
      userId: bulananUser.id,
      name: 'Toko Bulanan',
      address: 'Jl. Bulanan No. 1',
      isActive: true,
    },
  })

  console.log('✅ Bulanan user created:', bulananUser.email)

  // 4. Tahunan Active Account
  const tahunanUser = await prisma.user.upsert({
    where: { email: 'tahunan@kasirpos.com' },
    update: {},
    create: {
      email: 'tahunan@kasirpos.com',
      password: hashedPassword,
      name: 'User Tahunan',
      role: 'owner',
      status: 'active',
      subscriptionStatus: 'active',
      subscriptionStart: new Date(),
      subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 365 days
      planType: 'yearly',
    },
  })

  await prisma.store.upsert({
    where: { id: 'store-tahunan-001' },
    update: {},
    create: {
      id: 'store-tahunan-001',
      userId: tahunanUser.id,
      name: 'Toko Tahunan',
      address: 'Jl. Tahunan No. 1',
      isActive: true,
    },
  })

  console.log('✅ Tahunan user created:', tahunanUser.email)

  // 5. Expired Account
  const expiredUser = await prisma.user.upsert({
    where: { email: 'expired@kasirpos.com' },
    update: {},
    create: {
      email: 'expired@kasirpos.com',
      password: hashedPassword,
      name: 'User Expired',
      role: 'owner',
      status: 'active',
      subscriptionStatus: 'expired',
      subscriptionStart: new Date('2024-01-01'),
      subscriptionEnd: new Date('2024-02-01'),
      planType: 'monthly',
    },
  })

  await prisma.store.upsert({
    where: { id: 'store-expired-001' },
    update: {},
    create: {
      id: 'store-expired-001',
      userId: expiredUser.id,
      name: 'Toko Expired',
      address: 'Jl. Expired No. 1',
      isActive: true,
    },
  })

  console.log('✅ Expired user created:', expiredUser.email)

  // 6. Seed sample categories for each user
  const users = [superAdmin, trialUser, bulananUser, tahunanUser, expiredUser]
  const storeMap: Record<string, string> = {
    [superAdmin.id]: 'store-superadmin-001',
    [trialUser.id]: 'store-trial-001',
    [bulananUser.id]: 'store-bulanan-001',
    [tahunanUser.id]: 'store-tahunan-001',
    [expiredUser.id]: 'store-expired-001',
  }

  const categories = [
    { name: 'Handphone', type: 'phone' },
    { name: 'Aksesoris', type: 'accessory' },
    { name: 'Pulsa', type: 'pulsa' },
    { name: 'Paket Data', type: 'paket_data' },
    { name: 'Token Listrik', type: 'token_listrik' },
  ]

  for (const user of users) {
    const storeId = storeMap[user.id]
    for (const cat of categories) {
      await prisma.category.upsert({
        where: {
          id: `cat-${user.id.substring(0, 4)}-${cat.type}`,
        },
        update: {},
        create: {
          id: `cat-${user.id.substring(0, 4)}-${cat.type}`,
          userId: user.id,
          storeId,
          name: cat.name,
          type: cat.type,
        },
      })
    }
  }

  console.log('✅ Categories seeded for all users')

  // 7. Seed sample products for super admin
  const sampleProducts = [
    { name: 'iPhone 15 Pro Max', type: 'phone', buyPrice: 22000000, sellPrice: 24500000, stock: 5, brand: 'Apple', model: 'iPhone 15 Pro Max', storage: '256GB', condition: 'new' },
    { name: 'Samsung Galaxy S24 Ultra', type: 'phone', buyPrice: 18000000, sellPrice: 20500000, stock: 3, brand: 'Samsung', model: 'Galaxy S24 Ultra', storage: '256GB', condition: 'new' },
    { name: 'Xiaomi 14 Pro', type: 'phone', buyPrice: 8000000, sellPrice: 9500000, stock: 8, brand: 'Xiaomi', model: '14 Pro', storage: '256GB', condition: 'new' },
    { name: 'Casing HP Premium', type: 'accessory', buyPrice: 15000, sellPrice: 35000, stock: 50, brand: 'Universal' },
    { name: 'Charger Fast Charging 33W', type: 'accessory', buyPrice: 25000, sellPrice: 55000, stock: 30, brand: 'Universal' },
    { name: 'Tempered Glass Full Cover', type: 'accessory', buyPrice: 5000, sellPrice: 20000, stock: 100, brand: 'Universal' },
    { name: 'Earphone Bluetooth TWS', type: 'accessory', buyPrice: 35000, sellPrice: 75000, stock: 20, brand: 'Universal' },
    { name: 'Pulsa Telkomsel 5.000', type: 'pulsa', buyPrice: 5200, sellPrice: 7000, stock: 999, brand: 'Telkomsel' },
    { name: 'Pulsa Telkomsel 10.000', type: 'pulsa', buyPrice: 10100, sellPrice: 12000, stock: 999, brand: 'Telkomsel' },
    { name: 'Pulsa Telkomsel 25.000', type: 'pulsa', buyPrice: 25200, sellPrice: 27000, stock: 999, brand: 'Telkomsel' },
    { name: 'Pulsa XL 10.000', type: 'pulsa', buyPrice: 10200, sellPrice: 12000, stock: 999, brand: 'XL' },
    { name: 'Paket Data Telkomsel 15GB', type: 'paket_data', buyPrice: 35000, sellPrice: 45000, stock: 999, brand: 'Telkomsel' },
    { name: 'Token Listrik 50.000', type: 'token_listrik', buyPrice: 50200, sellPrice: 54000, stock: 999, brand: 'PLN' },
    { name: 'Token Listrik 100.000', type: 'token_listrik', buyPrice: 100200, sellPrice: 104000, stock: 999, brand: 'PLN' },
  ]

  for (let i = 0; i < sampleProducts.length; i++) {
    const p = sampleProducts[i]
    await prisma.product.upsert({
      where: { id: `product-sa-${String(i + 1).padStart(3, '0')}` },
      update: {},
      create: {
        id: `product-sa-${String(i + 1).padStart(3, '0')}`,
        userId: superAdmin.id,
        storeId: 'store-superadmin-001',
        categoryId: `cat-${superAdmin.id.substring(0, 4)}-${p.type}`,
        name: p.name,
        type: p.type,
        buyPrice: p.buyPrice,
        sellPrice: p.sellPrice,
        stock: p.stock,
        minStock: p.type === 'pulsa' || p.type === 'paket_data' || p.type === 'token_listrik' ? 0 : 5,
        brand: p.brand || null,
        model: (p as any).model || null,
        storage: (p as any).storage || null,
        condition: (p as any).condition || null,
        isActive: true,
      },
    })
  }

  console.log('✅ Sample products seeded for super admin')

  // 8. Seed sample customers for super admin
  const sampleCustomers = [
    { name: 'Budi Santoso', phone: '081111222333' },
    { name: 'Siti Rahayu', phone: '082222333444' },
    { name: 'Ahmad Fauzi', phone: '083333444555' },
    { name: 'Dewi Lestari', phone: '084444555666' },
    { name: 'Rizky Pratama', phone: '085555666777', debt: 150000 },
  ]

  for (let i = 0; i < sampleCustomers.length; i++) {
    const c = sampleCustomers[i]
    await prisma.customer.upsert({
      where: { id: `cust-sa-${String(i + 1).padStart(3, '0')}` },
      update: {},
      create: {
        id: `cust-sa-${String(i + 1).padStart(3, '0')}`,
        userId: superAdmin.id,
        storeId: 'store-superadmin-001',
        name: c.name,
        phone: c.phone,
        debt: c.debt || 0,
      },
    })
  }

  console.log('✅ Sample customers seeded for super admin')

  console.log('')
  console.log('🎉 Seeding complete!')
  console.log('')
  console.log('📋 Test Accounts:')
  console.log('  ┌─────────────────────────────┬──────────────────────┬──────────────┐')
  console.log('  │ Email                        │ Password             │ Role         │')
  console.log('  ├─────────────────────────────┼──────────────────────┼──────────────┤')
  console.log('  │ superedp@gmail.com           │ Serv3r4PP!           │ Super Admin  │')
  console.log('  │ trial@kasirpos.com           │ user123              │ Trial (5hr)  │')
  console.log('  │ bulanan@kasirpos.com         │ user123              │ Bulanan      │')
  console.log('  │ tahunan@kasirpos.com         │ user123              │ Tahunan      │')
  console.log('  │ expired@kasirpos.com         │ user123              │ Expired      │')
  console.log('  └─────────────────────────────┴──────────────────────┴──────────────┘')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
