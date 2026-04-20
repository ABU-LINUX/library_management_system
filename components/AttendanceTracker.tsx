"use client";

import React, { useState } from 'react';

export default function AttendanceTracker({ studentId }: { studentId: string }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('PRESENT');
  const [loading, setLoading] = useState(false);

  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, date: new Date(date).toISOString(), status }),
      });
      if (res.ok) {
        alert('Attendance marked successfully!');
      } else {
        alert('Failed to mark attendance.');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4">Attendance Tracking</h2>
      <form onSubmit={handleMarkAttendance} className="flex gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="LATE">Late</option>
          </select>
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Marking...' : 'Mark Attendance'}
        </button>
      </form>
    </div>
  );
}
