import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const examId = searchParams.get('examId');

  if (!studentId || !examId) {
    return NextResponse.json({ error: 'studentId and examId are required' }, { status: 400 });
  }

  try {
    const performances = await prisma.studentPerformance.findMany({
      where: {
        studentId,
        examId,
      },
      include: {
        question: true,
      },
    });

    const totalAttempted = performances.filter((p: any) => p.isAttempted).length;
    const totalCorrect = performances.filter((p: any) => p.isCorrect).length;
    const totalIncorrect = performances.filter((p: any) => p.isAttempted && !p.isCorrect).length;
    const totalUnattempted = performances.filter((p: any) => !p.isAttempted).length;
    const totalScore = (totalCorrect * 4) - (totalIncorrect * 1);
    const accuracy = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

    const difficultyGrid = {
      EASY: { attempted: 0, correct: 0, incorrect: 0, unattempted: 0, total: 0 },
      MEDIUM: { attempted: 0, correct: 0, incorrect: 0, unattempted: 0, total: 0 },
      HARD: { attempted: 0, correct: 0, incorrect: 0, unattempted: 0, total: 0 },
    };

    performances.forEach((p: any) => {
      const diff = p.question.difficulty as 'EASY' | 'MEDIUM' | 'HARD';
      if (difficultyGrid[diff]) {
        difficultyGrid[diff].total += 1;
        if (p.isAttempted) {
          difficultyGrid[diff].attempted += 1;
          if (p.isCorrect) difficultyGrid[diff].correct += 1;
          else difficultyGrid[diff].incorrect += 1;
        } else {
          difficultyGrid[diff].unattempted += 1;
        }
      }
    });

    return NextResponse.json({
      metrics: {
        totalAttempted,
        totalCorrect,
        totalIncorrect,
        totalUnattempted,
        totalScore,
        accuracy,
      },
      difficultyGrid,
      rawPerformances: performances,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
