import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { studentId, date, status } = await request.json();
    const attendance = await prisma.attendance.create({
      data: { studentId, date: new Date(date), status }
    });
    return NextResponse.json(attendance);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
