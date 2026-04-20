import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { studentId, amount } = await request.json();
    
    // Simplistic handling: fetch ledger, add amount, update.
    const ledger = await prisma.feeLedger.findUnique({ where: { studentId } });
    if (!ledger) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = await prisma.feeLedger.update({
      where: { studentId },
      data: { totalPaid: ledger.totalPaid + amount }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
