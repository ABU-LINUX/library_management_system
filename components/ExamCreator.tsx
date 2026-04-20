"use client";

import React, { useState } from 'react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

export default function ExamCreator({ examId }: { examId: string }) {
  const [rawLatex, setRawLatex] = useState('');
  const [difficulty, setDifficulty] = useState('EASY');
  const [conceptTag, setConceptTag] = useState('');
  const [format, setFormat] = useState('MCQ');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId, rawLatex, difficulty, conceptTag, format }),
    });
    alert('Question added successfully!');
    setRawLatex('');
  };

  return (
    <div className="p-4 border rounded bg-white">
      <h2 className="text-xl font-bold mb-4">Faculty Exam Creator</h2>
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div>
            <label className="block mb-1">Raw LaTeX</label>
            <textarea 
              className="w-full h-40 p-2 border rounded"
              value={rawLatex}
              onChange={(e) => setRawLatex(e.target.value)}
              placeholder="\\ce{H2O} -> \\ce{H+} + \\ce{OH-}"
            />
          </div>
          <div className="flex gap-4">
            <select 
              value={difficulty} 
              onChange={(e) => setDifficulty(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="EASY">EASY</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HARD">HARD</option>
            </select>
            <select 
              value={format} 
              onChange={(e) => setFormat(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="MCQ">Standard MCQ</option>
              <option value="NUMERICAL">Numerical Value</option>
              <option value="MATCH">Match the Following</option>
              <option value="STATEMENT">Statement-based</option>
            </select>
            <input 
              type="text" 
              placeholder="Concept Tag (e.g., Thermodynamics)"
              value={conceptTag}
              onChange={(e) => setConceptTag(e.target.value)}
              className="p-2 border rounded flex-1"
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
            Save Question
          </button>
        </div>
        <div className="flex-1 bg-gray-50 border p-4 rounded overflow-auto h-64">
          <h3 className="font-semibold mb-2">Live Preview</h3>
          <BlockMath>{rawLatex}</BlockMath>
        </div>
      </form>
    </div>
  );
}
