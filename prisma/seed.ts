import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Créer l'admin - remplacer le clerkId par ton vrai Clerk User ID
  const admin = await prisma.user.upsert({
    where: { email: "admin@wevlap.fr" },
    update: {},
    create: {
      clerkId: "user_3AgW2NOzNiaE89Y9U9G8ahNDzlb",
      email: "admin@wevlap.fr",
      name: "Wassim Habib",
      role: "admin",
      company: "WH Consulting",
    },
  });

  console.log("Admin créé:", admin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
