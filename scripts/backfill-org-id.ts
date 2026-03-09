import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany();

  for (const user of users) {
    console.log(`Updating agents and campaigns for user ${user.email}...`);

    const agentResult = await prisma.agent.updateMany({
      where: { userId: user.id, orgId: null },
      data: { orgId: user.id },
    });

    const campaignResult = await prisma.campaign.updateMany({
      where: { userId: user.id, orgId: null },
      data: { orgId: user.id },
    });

    console.log(`  - ${agentResult.count} agents updated`);
    console.log(`  - ${campaignResult.count} campaigns updated`);
  }

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
