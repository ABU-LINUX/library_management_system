"use client";

import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

export default function TrendDashboard({ studentId }: { studentId: string }) {
  const [trendData, setTrendData] = useState<any[]>([]);
  const [conceptData, setConceptData] = useState<any>({ strong: [], needsRevision: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Expected to fetch data for N-Exams grouped by examId
    async function fetchTrendData() {
      try {
        const res = await fetch(`/api/trends?studentId=${studentId}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setTrendData(data.trends);
          setConceptData(data.concepts);
        }
      } catch (error) {
        console.error("Error fetching trend data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTrendData();
  }, [studentId]);

  if (loading) return <div>Loading Trend Dashboard...</div>;

  return (
    <div className="p-6 bg-white rounded shadow-md space-y-8">
      <h2 className="text-2xl font-bold">N-Exam Trend Analysis</h2>

      <div className="h-80">
        <h3 className="text-xl font-semibold mb-4">Performance Timeline</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="examName" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="totalScore" stroke="#8884d8" name="Total Score" />
            <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#82ca9d" strokeDasharray="5 5" name="Accuracy (%)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="h-80">
        <h3 className="text-xl font-semibold mb-4">Attempt Ratio Analysis</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="examName" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="totalCorrect" stackId="a" fill="#22c55e" name="Correct" />
            <Bar dataKey="totalIncorrect" stackId="a" fill="#ef4444" name="Incorrect" />
            <Bar dataKey="totalUnattempted" stackId="a" fill="#9ca3af" name="Unattempted" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-green-50 p-4 rounded">
          <h3 className="text-lg font-bold text-green-700 mb-2">Strong Concepts (>70%)</h3>
          <ul className="list-disc pl-5">
            {conceptData.strong?.map((c: any) => (
              <li key={c.tag} className="text-green-800">{c.tag} ({c.accuracy.toFixed(1)}%)</li>
            ))}
          </ul>
        </div>
        <div className="bg-red-50 p-4 rounded">
          <h3 className="text-lg font-bold text-red-700 mb-2">Needs Revision (&lt;40%)</h3>
          <ul className="list-disc pl-5">
            {conceptData.needsRevision?.map((c: any) => (
              <li key={c.tag} className="text-red-800">{c.tag} ({c.accuracy.toFixed(1)}%)</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
