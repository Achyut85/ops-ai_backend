import { db } from './prisma/db.js';

async function main() {
  const history = await db.orm.public.TicketHistory.create({
    ticketId: 1,
    userId: 1,
    status: 'OPEN',
  });

  console.log(history);
}

main();