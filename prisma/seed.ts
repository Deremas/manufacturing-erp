import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── 1. Admin User ──
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@gmail.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@gmail.com",
      password: hashedPassword,
      role: "admin",
      phone: "+251912345678",
      isActive: true,
    },
  });
  console.log(`  ✓ Admin user created: ${adminUser.email}`);

  // ── 2. Roles ──
  const rolesData = [
    { name: "Admin", description: "Full system access" },
    { name: "Manager", description: "Departmental management access" },
    { name: "User", description: "Standard user access" },
    { name: "Viewer", description: "Read-only access" },
  ];

  const roles = [];
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: { name: r.name, description: r.description, isActive: true },
    });
    roles.push(role);
  }
  console.log(`  ✓ ${roles.length} roles created`);

  // ── 3. Permissions & RolePermissions ──
  const modules = [
    "users",
    "roles",
    "items",
    "categories",
    "units",
    "customers",
    "suppliers",
    "locations",
    "departments",
    "banks",
    "bank-accounts",
    "price-lists",
    "tax-codes",
    "stocks",
    "stock-movements",
    "purchasing",
    "sales",
    "production",
    "qc",
    "fleet",
    "hr",
    "accounting",
    "finance",
    "reports",
    "audit-logs",
    "company-settings",
    "system-settings",
    "document-numbering",
  ];

  const actions = ["create", "read", "update", "delete"];

  // Create permissions and assign to Admin role
  for (const module of modules) {
    for (const action of actions) {
      const permLabel = `${module.charAt(0).toUpperCase() + module.slice(1).replace(/-/g, " ")} - ${action.charAt(0).toUpperCase() + action.slice(1)}`;

      const permission = await prisma.permission.upsert({
        where: { id: `${module}-${action}` },
        update: { label: permLabel },
        create: {
          id: `${module}-${action}`,
          module,
          action,
          label: permLabel,
        },
      });

      // Assign all permissions to Admin role
      await prisma.rolePermission.upsert({
        where: { id: `${roles[0].id}-${permission.id}` },
        update: {},
        create: {
          id: `${roles[0].id}-${permission.id}`,
          roleId: roles[0].id,
          permission: permission.id,
          module,
          action,
        },
      });
    }
  }

  // Assign limited permissions to Manager role (all read + create/update on some modules)
  const managerWriteModules = [
    "items",
    "customers",
    "suppliers",
    "stocks",
    "purchasing",
    "sales",
  ];
  for (const module of modules) {
    for (const action of ["read"]) {
      const perm = await prisma.permission.findFirst({
        where: { module, action },
      });
      if (perm) {
        await prisma.rolePermission.upsert({
          where: { id: `${roles[1].id}-${perm.id}` },
          update: {},
          create: {
            id: `${roles[1].id}-${perm.id}`,
            roleId: roles[1].id,
            permission: perm.id,
            module,
            action,
          },
        });
      }
    }
  }
  for (const module of managerWriteModules) {
    for (const action of ["create", "update"]) {
      const perm = await prisma.permission.findFirst({
        where: { module, action },
      });
      if (perm) {
        await prisma.rolePermission.upsert({
          where: { id: `${roles[1].id}-${perm.id}` },
          update: {},
          create: {
            id: `${roles[1].id}-${perm.id}`,
            roleId: roles[1].id,
            permission: perm.id,
            module,
            action,
          },
        });
      }
    }
  }

  // User role: read-only on most modules
  for (const module of modules) {
    const perm = await prisma.permission.findFirst({
      where: { module, action: "read" },
    });
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { id: `${roles[2].id}-${perm.id}` },
        update: {},
        create: {
          id: `${roles[2].id}-${perm.id}`,
          roleId: roles[2].id,
          permission: perm.id,
          module,
          action: "read",
        },
      });
    }
  }

  // Viewer role: read-only on core modules only
  const viewerModules = [
    "items",
    "categories",
    "units",
    "customers",
    "suppliers",
    "locations",
    "reports",
  ];
  for (const module of viewerModules) {
    const perm = await prisma.permission.findFirst({
      where: { module, action: "read" },
    });
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { id: `${roles[3].id}-${perm.id}` },
        update: {},
        create: {
          id: `${roles[3].id}-${perm.id}`,
          roleId: roles[3].id,
          permission: perm.id,
          module,
          action: "read",
        },
      });
    }
  }

  console.log("  ✓ Permissions and role assignments created");

  // ── 4. System Settings ──
  const systemSettings = [
    { key: "company_name", value: "NEW ERP", category: "general" },
    { key: "company_address", value: "Nairobi, Kenya", category: "general" },
    { key: "company_phone", value: "+254700000000", category: "general" },
    { key: "company_email", value: "info@konel.com", category: "general" },
    { key: "default_currency", value: "KES", category: "general" },
    { key: "tax_rate", value: "16", category: "tax" },
    { key: "enable_approval_workflow", value: "true", category: "approval" },
    { key: "low_stock_threshold", value: "10", category: "inventory" },
    { key: "session_timeout_minutes", value: "60", category: "security" },
    { key: "max_login_attempts", value: "5", category: "security" },
    { key: "enable_audit_log", value: "true", category: "audit" },
    { key: "date_format", value: "DD/MM/YYYY", category: "localization" },
    { key: "time_format", value: "HH:mm", category: "localization" },
    { key: "timezone", value: "Africa/Nairobi", category: "localization" },
  ];

  for (const setting of systemSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log(`  ✓ ${systemSettings.length} system settings created`);

  // ── 5. Document Numbering ──
  const documentNumberings = [
    {
      prefix: "PO",
      description: "Purchase Order",
      prefixFormat: "PO",
      yearFormat: "YYYY",
      currentSequence: 0,
    },
    {
      prefix: "SO",
      description: "Sales Order",
      prefixFormat: "SO",
      yearFormat: "YYYY",
      currentSequence: 0,
    },
    {
      prefix: "GRN",
      description: "Goods Received Note",
      prefixFormat: "GRN",
      yearFormat: "YYYY",
      currentSequence: 0,
    },
    {
      prefix: "DN",
      description: "Delivery Note",
      prefixFormat: "DN",
      yearFormat: "YYYY",
      currentSequence: 0,
    },
    {
      prefix: "INV",
      description: "Invoice",
      prefixFormat: "INV",
      yearFormat: "YYYY",
      currentSequence: 0,
    },
    {
      prefix: "CN",
      description: "Credit Note",
      prefixFormat: "CN",
      yearFormat: "YYYY",
      currentSequence: 0,
    },
    {
      prefix: "SM",
      description: "Stock Movement",
      prefixFormat: "SM",
      yearFormat: "YYYY",
      currentSequence: 0,
    },
    {
      prefix: "PR",
      description: "Purchase Requisition",
      prefixFormat: "PR",
      yearFormat: "YYYY",
      currentSequence: 0,
    },
    {
      prefix: "QT",
      description: "Quotation",
      prefixFormat: "QT",
      yearFormat: "YYYY",
      currentSequence: 0,
    },
    {
      prefix: "JRN",
      description: "Journal Entry",
      prefixFormat: "JRN",
      yearFormat: "YYYY",
      currentSequence: 0,
    },
  ];

  for (const dn of documentNumberings) {
    await prisma.documentNumbering.upsert({
      where: { prefix: dn.prefix },
      update: {},
      create: dn,
    });
  }
  console.log(
    `  ✓ ${documentNumberings.length} document numbering prefixes created`,
  );

  // ── 6. Master Data: Categories ──
  const categoriesData = [
    { name: "Raw Materials", description: "Raw materials for production" },
    { name: "Finished Goods", description: "Finished goods ready for sale" },
    { name: "Packaging Materials", description: "Packaging supplies" },
    { name: "Spare Parts", description: "Equipment spare parts" },
    { name: "Office Supplies", description: "General office supplies" },
    { name: "Consumables", description: "Consumable items" },
    { name: "Semi-Finished Goods", description: "Work-in-progress items" },
    { name: "Services", description: "Service items" },
  ];

  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: { id: cat.name },
      update: {},
      create: {
        id: cat.name,
        name: cat.name,
        description: cat.description,
        isActive: true,
      },
    });
  }
  console.log(`  ✓ ${categoriesData.length} categories created`);

  // ── 7. Master Data: Units ──
  const unitsData = [
    { name: "Kilogram", abbreviation: "kg", type: "WEIGHT" },
    { name: "Gram", abbreviation: "g", type: "WEIGHT" },
    { name: "Ton", abbreviation: "t", type: "WEIGHT" },
    { name: "Liter", abbreviation: "L", type: "VOLUME" },
    { name: "Milliliter", abbreviation: "mL", type: "VOLUME" },
    { name: "Piece", abbreviation: "pc", type: "QUANTITY" },
    { name: "Box", abbreviation: "bx", type: "QUANTITY" },
    { name: "Carton", abbreviation: "ctn", type: "QUANTITY" },
    { name: "Meter", abbreviation: "m", type: "LENGTH" },
    { name: "Square Meter", abbreviation: "m²", type: "AREA" },
    { name: "Packet", abbreviation: "pkt", type: "QUANTITY" },
    { name: "Set", abbreviation: "set", type: "QUANTITY" },
    { name: "Dozen", abbreviation: "doz", type: "QUANTITY" },
    { name: "Roll", abbreviation: "rl", type: "QUANTITY" },
    { name: "Bag", abbreviation: "bag", type: "QUANTITY" },
  ];

  for (const unit of unitsData) {
    await prisma.unit.upsert({
      where: { id: unit.name },
      update: {},
      create: {
        id: unit.name,
        name: unit.name,
        abbreviation: unit.abbreviation,
        type: unit.type,
        isActive: true,
      },
    });
  }
  console.log(`  ✓ ${unitsData.length} units created`);

  // ── 8. Master Data: Locations ──
  const locationsData = [
    {
      locationCode: "WH-MAIN",
      locationName: "Main Warehouse",
      locationType: "WAREHOUSE",
      address: "Nairobi Industrial Area",
    },
    {
      locationCode: "WH-MSA",
      locationName: "Mombasa Warehouse",
      locationType: "WAREHOUSE",
      address: "Mombasa Port Area",
    },
    {
      locationCode: "WH-KSM",
      locationName: "Kisumu Warehouse",
      locationType: "WAREHOUSE",
      address: "Kisumu CBD",
    },
    {
      locationCode: "STORE-PROD",
      locationName: "Production Store",
      locationType: "STORE",
      address: "Factory Floor",
    },
    {
      locationCode: "STORE-QC",
      locationName: "QC Holding Store",
      locationType: "STORE",
      address: "QC Department",
    },
    {
      locationCode: "SHOP-NAI",
      locationName: "Nairobi Retail Shop",
      locationType: "RETAIL",
      address: "Nairobi City Centre",
    },
  ];

  for (const loc of locationsData) {
    await prisma.location.upsert({
      where: { locationCode: loc.locationCode },
      update: {},
      create: loc,
    });
  }
  console.log(`  ✓ ${locationsData.length} locations created`);

  // ── 9. Master Data: Customers ──
  const customersData = [
    {
      customerCode: "CUST-001",
      name: "ABC Enterprises Ltd",
      phone: "+254711000001",
      email: "info@abcenterprises.co.ke",
      address: "Nairobi, Kenya",
      creditLimit: 500000,
      paymentTerms: "NET30",
    },
    {
      customerCode: "CUST-002",
      name: "Nairobi Wholesalers",
      phone: "+254711000002",
      email: "orders@nairobwholesale.co.ke",
      address: "Nairobi Industrial Area",
      creditLimit: 1000000,
      paymentTerms: "NET60",
    },
    {
      customerCode: "CUST-003",
      name: "Mombasa Traders",
      phone: "+254711000003",
      email: "info@mombasatraders.co.ke",
      address: "Mombasa CBD",
      creditLimit: 300000,
      paymentTerms: "NET30",
    },
    {
      customerCode: "CUST-004",
      name: "Beta Supplies",
      phone: "+254711000004",
      email: "sales@betasupplies.co.ke",
      address: "Kisumu, Kenya",
      creditLimit: 200000,
      paymentTerms: "CASH",
    },
    {
      customerCode: "CUST-005",
      name: "Retail Mart Ltd",
      phone: "+254711000005",
      email: "info@retailmart.co.ke",
      address: "Nairobi Westlands",
      creditLimit: 750000,
      paymentTerms: "NET45",
    },
  ];

  for (const c of customersData) {
    await prisma.customer.upsert({
      where: { customerCode: c.customerCode },
      update: {},
      create: c,
    });
  }
  console.log(`  ✓ ${customersData.length} customers created`);

  // ── 10. Master Data: Suppliers ──
  const suppliersData = [
    {
      supplierCode: "SUPP-001",
      name: "Industrial Raw Materials Ltd",
      contactPerson: "John Kamau",
      phone: "+254722000001",
      email: "john@irm.co.ke",
      address: "Nairobi Industrial Area",
      paymentTerms: "NET30",
    },
    {
      supplierCode: "SUPP-002",
      name: "Packaging Solutions Ltd",
      contactPerson: "Mary Wanjiku",
      phone: "+254722000002",
      email: "mary@packsol.co.ke",
      address: "Thika Road",
      paymentTerms: "NET30",
    },
    {
      supplierCode: "SUPP-003",
      name: "Global Tech Imports",
      contactPerson: "David Ochieng",
      phone: "+254722000003",
      email: "david@gti.co.ke",
      address: "Mombasa Port",
      paymentTerms: "LC",
    },
    {
      supplierCode: "SUPP-004",
      name: "Local Farmers Cooperative",
      contactPerson: "Peter Mwangi",
      phone: "+254722000004",
      email: "peter@lfc.co.ke",
      address: "Central Kenya",
      paymentTerms: "CASH",
    },
    {
      supplierCode: "SUPP-005",
      name: "Office Essentials Ltd",
      contactPerson: "Grace Akinyi",
      phone: "+254722000005",
      email: "grace@oessentials.co.ke",
      address: "Nairobi CBD",
      paymentTerms: "NET15",
    },
  ];

  for (const s of suppliersData) {
    await prisma.supplier.upsert({
      where: { supplierCode: s.supplierCode },
      update: {},
      create: s,
    });
  }
  console.log(`  ✓ ${suppliersData.length} suppliers created`);

  // ── 11. Master Data: Banks ──
  const banksData = [
    { name: "Kenya Commercial Bank", shortName: "KCB" },
    { name: "Equity Bank", shortName: "Equity" },
    { name: "Co-operative Bank", shortName: "Co-op" },
    { name: "Standard Chartered Bank", shortName: "StanChart" },
    { name: "NCBA Bank", shortName: "NCBA" },
  ];

  for (const b of banksData) {
    await prisma.bank.upsert({
      where: { id: b.name },
      update: {},
      create: {
        id: b.name,
        name: b.name,
        shortName: b.shortName,
        isActive: true,
      },
    });
  }
  console.log(`  ✓ ${banksData.length} banks created`);

  // ── 12. Master Data: Bank Accounts ──
  const bankAccountsData = [
    {
      accountCode: "KCB-001",
      accountName: "Main Operating Account",
      accountType: "CURRENT",
      bankId: "Kenya Commercial Bank",
      accountNumber: "1100000001",
      branch: "Head Office",
      swiftCode: "KCBLKENX",
      currency: "KES",
      openingBalance: 5000000,
      currentBalance: 5000000,
    },
    {
      accountCode: "EQ-001",
      accountName: "Payroll Account",
      accountType: "CURRENT",
      bankId: "Equity Bank",
      accountNumber: "1200000001",
      branch: "Moi Avenue",
      swiftCode: "EQBLKENA",
      currency: "KES",
      openingBalance: 2000000,
      currentBalance: 2000000,
    },
    {
      accountCode: "COOP-001",
      accountName: "Savings Account",
      accountType: "SAVINGS",
      bankId: "Co-operative Bank",
      accountNumber: "1300000001",
      branch: "Co-op House",
      swiftCode: "COOPKENX",
      currency: "KES",
      openingBalance: 10000000,
      currentBalance: 10000000,
    },
    {
      accountCode: "SCB-USD",
      accountName: "USD Dollar Account",
      accountType: "FOREIGN",
      bankId: "Standard Chartered Bank",
      accountNumber: "1400000001",
      branch: "Kenya",
      swiftCode: "SCBLKENX",
      currency: "USD",
      openingBalance: 50000,
      currentBalance: 50000,
    },
  ];

  for (const ba of bankAccountsData) {
    await prisma.bankAccount.upsert({
      where: { accountCode: ba.accountCode },
      update: {},
      create: ba,
    });
  }
  console.log(`  ✓ ${bankAccountsData.length} bank accounts created`);

  // ── 13. Master Data: Departments ──
  const departmentsData = [
    { name: "Production", code: "PROD" },
    { name: "Sales & Marketing", code: "SALES" },
    { name: "Finance & Accounting", code: "FIN" },
    { name: "Human Resources", code: "HR" },
    { name: "Quality Control", code: "QC" },
    { name: "Warehouse & Logistics", code: "WH" },
    { name: "Procurement", code: "PROC" },
    { name: "Maintenance", code: "MAINT" },
    { name: "Information Technology", code: "IT" },
    { name: "Fleet Management", code: "FLEET" },
  ];

  for (const d of departmentsData) {
    await prisma.department.upsert({
      where: { code: d.code },
      update: {},
      create: { name: d.name, code: d.code, isActive: true },
    });
  }
  console.log(`  ✓ ${departmentsData.length} departments created`);

  // ── 14. Tax Codes ──
  const taxCodesData = [
    { taxName: "VAT 16%", taxType: "VAT", rate: 16 },
    { taxName: "VAT 8%", taxType: "VAT", rate: 8 },
    { taxName: "VAT 0%", taxType: "VAT", rate: 0 },
    { taxName: "Excise Duty", taxType: "EXCISE", rate: 10 },
    { taxName: "Withholding Tax 5%", taxType: "WITHHOLDING", rate: 5 },
  ];

  for (const t of taxCodesData) {
    await prisma.taxCode.upsert({
      where: { id: t.taxName },
      update: {},
      create: {
        id: t.taxName,
        taxName: t.taxName,
        taxType: t.taxType,
        rate: t.rate,
        isActive: true,
      },
    });
  }
  console.log(`  ✓ ${taxCodesData.length} tax codes created`);

  // ── 15. Sample Items ──
  const rawMaterialsCategory = await prisma.category.findFirst({
    where: { name: "Raw Materials" },
  });
  const finishedGoodsCategory = await prisma.category.findFirst({
    where: { name: "Finished Goods" },
  });
  const packagingCategory = await prisma.category.findFirst({
    where: { name: "Packaging Materials" },
  });
  const kgUnit = await prisma.unit.findFirst({ where: { name: "Kilogram" } });
  const pcUnit = await prisma.unit.findFirst({ where: { name: "Piece" } });
  const literUnit = await prisma.unit.findFirst({ where: { name: "Liter" } });

  const itemsData = [
    {
      itemCode: "RM-001",
      itemName: "Corn Flour - Grade A",
      sku: "CF-GA-001",
      categoryId: rawMaterialsCategory?.id,
      itemType: "RAW_MATERIAL",
      uomId: kgUnit?.id,
      standardCost: 45,
      sellingPrice: 65,
    },
    {
      itemCode: "RM-002",
      itemName: "Sugar - Refined",
      sku: "SGR-REF-001",
      categoryId: rawMaterialsCategory?.id,
      itemType: "RAW_MATERIAL",
      uomId: kgUnit?.id,
      standardCost: 120,
      sellingPrice: 150,
    },
    {
      itemCode: "RM-003",
      itemName: "Vegetable Oil",
      sku: "VO-PALM-001",
      categoryId: rawMaterialsCategory?.id,
      itemType: "RAW_MATERIAL",
      uomId: literUnit?.id,
      standardCost: 180,
      sellingPrice: 220,
    },
    {
      itemCode: "FG-001",
      itemName: "Maize Flour - 2kg Pack",
      sku: "MF-2KG-001",
      categoryId: finishedGoodsCategory?.id,
      itemType: "FINISHED_GOOD",
      uomId: pcUnit?.id,
      standardCost: 110,
      sellingPrice: 145,
    },
    {
      itemCode: "FG-002",
      itemName: "Wheat Flour - 1kg Pack",
      sku: "WF-1KG-001",
      categoryId: finishedGoodsCategory?.id,
      itemType: "FINISHED_GOOD",
      uomId: pcUnit?.id,
      standardCost: 85,
      sellingPrice: 115,
    },
    {
      itemCode: "FG-003",
      itemName: "Cooking Oil - 1L Bottle",
      sku: "CO-1L-001",
      categoryId: finishedGoodsCategory?.id,
      itemType: "FINISHED_GOOD",
      uomId: pcUnit?.id,
      standardCost: 220,
      sellingPrice: 280,
    },
    {
      itemCode: "PKG-001",
      itemName: "Plastic Bag - 2kg",
      sku: "PB-2KG-001",
      categoryId: packagingCategory?.id,
      itemType: "PACKAGING",
      uomId: pcUnit?.id,
      standardCost: 5,
      sellingPrice: 8,
    },
    {
      itemCode: "PKG-002",
      itemName: "Carton Box - Standard",
      sku: "CB-STD-001",
      categoryId: packagingCategory?.id,
      itemType: "PACKAGING",
      uomId: pcUnit?.id,
      standardCost: 25,
      sellingPrice: 35,
    },
  ];

  for (const item of itemsData) {
    await prisma.item.upsert({
      where: { itemCode: item.itemCode },
      update: {},
      create: item,
    });
  }
  console.log(`  ✓ ${itemsData.length} sample items created`);

  // ── 16. Price List Items ──
  const items = await prisma.item.findMany({ where: { isActive: true } });
  for (const item of items) {
    await prisma.priceList.create({
      data: {
        itemId: item.id,
        price: item.sellingPrice ?? 0,
        isActive: true,
      },
    });
  }
  console.log(`  ✓ ${items.length} price list entries created`);

  // ── 17. Associate admin user with Admin role ──
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { roleId: roles[0].id },
  });
  console.log("  ✓ Admin user assigned to Admin role");

  // ── 18. Create additional sample users ──
  const sampleUsers = [
    {
      name: "Manager User",
      email: "manager@konel.com",
      password: "manager123",
      role: "manager",
      roleId: roles[1].id,
    },
    {
      name: "Staff User",
      email: "user@konel.com",
      password: "user123",
      role: "user",
      roleId: roles[2].id,
    },
    {
      name: "Viewer User",
      email: "viewer@konel.com",
      password: "viewer123",
      role: "viewer",
      roleId: roles[3].id,
    },
  ];

  for (const u of sampleUsers) {
    const hashedPw = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        password: hashedPw,
        role: u.role,
        roleId: u.roleId,
        isActive: true,
      },
    });
  }
  console.log(`  ✓ ${sampleUsers.length} sample users created`);

  console.log("\n✅ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
