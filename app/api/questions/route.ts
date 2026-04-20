import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { examId, rawLatex, difficulty, conceptTag, format } = await request.json();
    const question = await prisma.question.create({
      data: { examId, rawLatex, difficulty, conceptTag, format: format || "MCQ" },
    });
    return NextResponse.json(question);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
