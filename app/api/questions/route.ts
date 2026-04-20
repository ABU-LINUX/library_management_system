import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { examId, rawLatex, difficulty, conceptTag } = await request.json();
    const question = await prisma.question.create({
      data: { examId, rawLatex, difficulty, conceptTag },
    });
    return NextResponse.json(question);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
