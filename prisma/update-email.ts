import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.update({
    where: { clerkId: "user_3AgW2NOzNiaE89Y9U9G8ahNDzlb" },
    data: { email: "wh.consultingpro@gmail.com" },
  });
  console.log("Email mis à jour:", user.email);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
