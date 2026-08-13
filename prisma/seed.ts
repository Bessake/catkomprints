import { PrismaClient, Role, MovementType, InvoiceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_PRESS_SERVICES } from "../src/lib/press-services";
import { emailFromFullName } from "../src/lib/user-email";

const prisma = new PrismaClient();

async function main() {
  await prisma.smsMessage.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.client.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.serviceSale.deleteMany();
  await prisma.cashOut.deleteMany();
  await prisma.dailyReport.deleteMany();
  await prisma.pressService.deleteMany();
  await prisma.floorStaff.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Cynthia Larbi",
      email: "admin@catkomprints.local",
      passwordHash,
      role: Role.admin,
    },
  });

  const frontDeskNames = ["Wendy", "Yayra"];
  for (const name of frontDeskNames) {
    await prisma.user.create({
      data: {
        name,
        email: emailFromFullName(name),
        passwordHash,
        role: Role.staff,
      },
    });
  }

  await prisma.user.create({
    data: {
      name: "Operator",
      email: "operator@catkomprints.local",
      passwordHash,
      role: Role.operator,
    },
  });

  const staffA = await prisma.floorStaff.create({
    data: { name: "Staff A" },
  });
  const staffB = await prisma.floorStaff.create({
    data: { name: "Staff B" },
  });
  await prisma.floorStaff.create({ data: { name: "Staff C" } });

  await prisma.pressService.createMany({
    data: DEFAULT_PRESS_SERVICES.map((name) => ({ name })),
  });

  const paper = await prisma.category.create({ data: { name: "Paper & substrates" } });
  const ink = await prisma.category.create({ data: { name: "Ink & toner" } });
  const finishing = await prisma.category.create({ data: { name: "Finishing" } });
  const apparel = await prisma.category.create({ data: { name: "Apparel blanks" } });
  const largeFormat = await prisma.category.create({
    data: { name: "Large format" },
  });

  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: "PAP-A4-80",
        name: "A4 Bond Paper 80gsm (ream)",
        description: "500 sheets for everyday digital print jobs.",
        quantity: 96,
        reorderLevel: 30,
        unitPrice: 7.5,
        costPrice: 3.8,
        categoryId: paper.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: "PAP-BC-300",
        name: "Business Card Stock 300gsm",
        description: "Matte coated card for business cards.",
        quantity: 18,
        reorderLevel: 20,
        unitPrice: 22.0,
        costPrice: 11.5,
        categoryId: paper.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: "INK-CMYK-SET",
        name: "CMYK Ink Set",
        description: "Press-ready cyan, magenta, yellow, and black.",
        quantity: 6,
        reorderLevel: 8,
        unitPrice: 185.0,
        costPrice: 112.0,
        categoryId: ink.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: "VIN-ROLL-54",
        name: "Vinyl Roll 54\"",
        description: "Outdoor adhesive vinyl for banners and signage.",
        quantity: 11,
        reorderLevel: 5,
        unitPrice: 96.0,
        costPrice: 58.0,
        categoryId: largeFormat.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: "BAN-FAB-126",
        name: "Banner Fabric 126\"",
        description: "Polyester banner media for wide-format printers.",
        quantity: 7,
        reorderLevel: 3,
        unitPrice: 128.0,
        costPrice: 74.0,
        categoryId: largeFormat.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: "LF-INK-ECO",
        name: "Eco-solvent Ink Cartridge",
        description: "Large format printer ink cartridge.",
        quantity: 9,
        reorderLevel: 4,
        unitPrice: 64.0,
        costPrice: 38.0,
        categoryId: largeFormat.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: "FIN-LAM-A3",
        name: "A3 Laminating Pouches (pack 100)",
        description: "Gloss pouches for certificates and menus.",
        quantity: 4,
        reorderLevel: 10,
        unitPrice: 28.0,
        costPrice: 14.25,
        categoryId: finishing.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: "APP-TEE-M",
        name: "Blank T-Shirt Medium",
        description: "100% cotton blank for DTG / screen print.",
        quantity: 42,
        reorderLevel: 25,
        unitPrice: 6.75,
        costPrice: 3.1,
        categoryId: apparel.id,
      },
    }),
  ]);

  await prisma.stockMovement.createMany({
    data: [
      {
        productId: products[0].id,
        type: MovementType.in,
        quantity: 100,
        note: "Paper supplier delivery",
        createdById: admin.id,
      },
      {
        productId: products[0].id,
        type: MovementType.out,
        quantity: 4,
        note: "Walk-in flyer job",
        createdById: admin.id,
      },
      {
        productId: products[2].id,
        type: MovementType.in,
        quantity: 10,
        note: "Ink restock",
        createdById: admin.id,
      },
      {
        productId: products[2].id,
        type: MovementType.out,
        quantity: 4,
        note: "Press changeover",
        createdById: admin.id,
      },
      {
        productId: products[6].id,
        type: MovementType.out,
        quantity: 6,
        note: "School certificates batch",
        createdById: admin.id,
      },
      {
        productId: products[1].id,
        type: MovementType.out,
        quantity: 2,
        note: "Business card order #CP-188",
        createdById: admin.id,
      },
      {
        productId: products[3].id,
        type: MovementType.out,
        quantity: 1,
        note: "Stock out recorded on floor terminal · Taken by Staff A",
        takenById: staffA.id,
        createdById: admin.id,
      },
      {
        productId: products[4].id,
        type: MovementType.out,
        quantity: 1,
        note: "Stock out recorded on floor terminal · Taken by Staff B",
        takenById: staffB.id,
        createdById: admin.id,
      },
    ],
  });

  const clientA = await prisma.client.create({
    data: {
      name: "Northside Cafe",
      email: "orders@northsidecafe.example",
      phone: "+15550100001",
      notes: "Menus and loyalty cards.",
    },
  });

  const clientB = await prisma.client.create({
    data: {
      name: "Bright Events Co.",
      email: "hello@brightevents.example",
      phone: "+15550100002",
      notes: "Banners and event badges.",
    },
  });

  await prisma.client.create({
    data: {
      name: "Harbor Studio",
      email: "ops@harbor.example",
      phone: null,
      notes: "Email-only client.",
    },
  });

  const dueSoon = new Date();
  dueSoon.setDate(dueSoon.getDate() + 3);

  await prisma.invoice.create({
    data: {
      number: "INV-0001",
      clientId: clientA.id,
      status: InvoiceStatus.sent,
      taxRate: 8,
      subtotal: 52.0,
      taxAmount: 4.16,
      total: 56.16,
      notes: "Counter order — menus + cards",
      dueDate: dueSoon,
      createdById: admin.id,
      stockDeducted: true,
      items: {
        create: [
          {
            productId: products[0].id,
            description: products[0].name,
            quantity: 4,
            unitPrice: 7.5,
            lineTotal: 30.0,
          },
          {
            productId: products[1].id,
            description: products[1].name,
            quantity: 1,
            unitPrice: 22.0,
            lineTotal: 22.0,
          },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      number: "INV-0002",
      clientId: clientB.id,
      status: InvoiceStatus.overdue,
      taxRate: 8,
      subtotal: 96.0,
      taxAmount: 7.68,
      total: 103.68,
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      createdById: admin.id,
      stockDeducted: true,
      items: {
        create: [
          {
            productId: products[3].id,
            description: products[3].name,
            quantity: 1,
            unitPrice: 96.0,
            lineTotal: 96.0,
          },
        ],
      },
    },
  });
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
