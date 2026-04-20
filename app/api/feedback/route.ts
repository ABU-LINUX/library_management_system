import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { studentId, examId, strengths, areasOfConcern, improvementPlan, mentorsNote } = await request.json();
    
    const feedback = await prisma.cSARFeedback.upsert({
      where: {
        studentId_examId: { studentId, examId }
      },
      update: { strengths, areasOfConcern, improvementPlan, mentorsNote },
      create: { studentId, examId, strengths, areasOfConcern, improvementPlan, mentorsNote }
    });

    return NextResponse.json(feedback);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
