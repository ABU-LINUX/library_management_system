import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Mock data for N-Exams since we don't have enough populated DB to show trends
  return NextResponse.json({
    trends: [
      { examName: 'Part Test 1', totalScore: 120, accuracy: 65, totalCorrect: 30, totalIncorrect: 15, totalUnattempted: 5 },
      { examName: 'Part Test 2', totalScore: 140, accuracy: 70, totalCorrect: 35, totalIncorrect: 10, totalUnattempted: 5 },
      { examName: 'Part Test 3', totalScore: 110, accuracy: 55, totalCorrect: 28, totalIncorrect: 20, totalUnattempted: 2 },
      { examName: 'Part Test 4', totalScore: 190, accuracy: 80, totalCorrect: 48, totalIncorrect: 8,  totalUnattempted: 4 },
      { examName: 'Full Test 1', totalScore: 210, accuracy: 85, totalCorrect: 53, totalIncorrect: 5,  totalUnattempted: 2 },
    ],
    concepts: {
      strong: [
        { tag: "Thermodynamics", accuracy: 82 },
        { tag: "Gravitation", accuracy: 75 }
      ],
      needsRevision: [
        { tag: "Optics", accuracy: 35 },
        { tag: "Magnetism", accuracy: 20 }
      ]
    }
  });
}
