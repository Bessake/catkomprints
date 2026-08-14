import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { emailFromFullName } from "../src/lib/user-email";

const prisma = new PrismaClient();

async function ensureUser(data: {
  name: string;
  email: string;
  role: Role;
  passwordHash: string;
}) {
  await prisma.user.upsert({
    where: { email: data.email },
    create: data,
    update: { name: data.name, role: data.role },
  });
}

async function main() {
  await prisma.smsMessage.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.client.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.serviceSale.deleteMany();
  await prisma.cashOut.deleteMany();
  await prisma.debtor.deleteMany();
  await prisma.dailyReport.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.floorStaff.deleteMany();
  await prisma.pressService.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  await ensureUser({
    name: "Cynthia Larbi",
    email: "admin@catkomprints.local",
    passwordHash,
    role: Role.admin,
  });

  for (const name of ["Wendy", "Yayra"]) {
    await ensureUser({
      name,
      email: emailFromFullName(name),
      passwordHash,
      role: Role.staff,
    });
  }

  await ensureUser({
    name: "Operator",
    email: "operator@catkomprints.local",
    passwordHash,
    role: Role.operator,
  });

  const remaining = {
    products: await prisma.product.count(),
    invoices: await prisma.invoice.count(),
    clients: await prisma.client.count(),
    movements: await prisma.stockMovement.count(),
    serviceSales: await prisma.serviceSale.count(),
    cashOuts: await prisma.cashOut.count(),
    dailyReports: await prisma.dailyReport.count(),
    debtors: await prisma.debtor.count(),
    pressServices: await prisma.pressService.count(),
    users: await prisma.user.count(),
  };
  console.log("Production reset complete:", remaining);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
