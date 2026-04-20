"use client";

import React, { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function CSARReport({ studentId, examId }: { studentId: string, examId: string }) {
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/performances?studentId=${studentId}&examId=${examId}`)
      .then(res => res.json())
      .then(data => setReport(data));
  }, [studentId, examId]);

  if (!report) return <div>Loading...</div>;

  const { metrics, difficultyGrid } = report;

  const donutData = {
    labels: ['Easy', 'Medium', 'Hard'],
    datasets: [{
      data: [
        difficultyGrid.EASY.total,
        difficultyGrid.MEDIUM.total,
        difficultyGrid.HARD.total
      ],
      backgroundColor: ['#4ade80', '#fbbf24', '#f87171'],
    }]
  };

  return (
    <div className="p-6 bg-white shadow rounded">
      <h2 className="text-2xl font-bold mb-4">CSAR Event Report Logic (Single Exam)</h2>
      
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-gray-50 rounded">Score: {metrics.totalScore}</div>
        <div className="p-4 bg-gray-50 rounded">Accuracy: {metrics.accuracy.toFixed(1)}%</div>
        <div className="p-4 bg-gray-50 rounded">Attempted: {metrics.totalAttempted} / {metrics.totalAttempted + metrics.totalUnattempted}</div>
      </div>

      <div className="flex gap-8">
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-2">Difficulty Grid Engine</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-2">Difficulty</th>
                <th className="p-2">Attempted</th>
                <th className="p-2">Correct</th>
                <th className="p-2">Incorrect</th>
                <th className="p-2">Unattempted</th>
              </tr>
            </thead>
            <tbody>
              {['EASY', 'MEDIUM', 'HARD'].map((diff: string) => (
                <tr key={diff} className="border-b">
                  <td className="p-2 font-semibold">{diff}</td>
                  <td className="p-2">{difficultyGrid[diff].attempted}</td>
                  <td className="p-2 text-green-600">{difficultyGrid[diff].correct}</td>
                  <td className="p-2 text-red-600">{difficultyGrid[diff].incorrect}</td>
                  <td className="p-2 text-gray-500">{difficultyGrid[diff].unattempted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="w-64">
          <Doughnut data={donutData} />
        </div>
      </div>
    </div>
  );
}
