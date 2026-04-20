"use client";

import React, { useState, useEffect } from 'react';

export default function FeeLedgerView({ studentId }: { studentId: string }) {
  const [ledger, setLedger] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Mock fetch for demonstration
    // In real app: fetch(`/api/fees?studentId=${studentId}`)
    setLedger({
      totalSettlement: 120000,
      totalPaid: 50000,
      installments: [
        { amount: 50000, dueDate: '2025-01-01', status: 'PAID' },
        { amount: 40000, dueDate: '2025-06-01', status: 'PENDING' },
        { amount: 30000, dueDate: '2025-12-01', status: 'PENDING' }
      ]
    });
  }, [studentId]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, amount: Number(amount) })
      });
      alert('Payment recorded!');
      setAmount('');
      // Optimistic update
      setLedger((prev: any) => ({ ...prev, totalPaid: prev.totalPaid + Number(amount) }));
    } catch {
      alert('Failed');
    } finally {
      setLoading(false);
    }
  };

  if (!ledger) return <div>Loading...</div>;

  const balance = ledger.totalSettlement - ledger.totalPaid;

  return (
    <div className="p-6 bg-white shadow rounded space-y-6">
      <h2 className="text-xl font-bold">Fee Ledger & Payments</h2>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded border border-blue-100">
          <p className="text-sm text-blue-600">Total Settlement</p>
          <p className="text-2xl font-bold">₹{ledger.totalSettlement.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 p-4 rounded border border-green-100">
          <p className="text-sm text-green-600">Total Paid</p>
          <p className="text-2xl font-bold">₹{ledger.totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 p-4 rounded border border-red-100">
          <p className="text-sm text-red-600">Balance Due</p>
          <p className="text-2xl font-bold">₹{balance.toLocaleString()}</p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Record New Payment</h3>
        <form onSubmit={handlePayment} className="flex gap-4">
          <input 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount in ₹"
            className="p-2 border rounded flex-1"
            required
            min="1"
          />
          <button type="submit" disabled={loading} className="bg-green-600 text-white px-6 py-2 rounded">
            Record Payment
          </button>
        </form>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Installment Schedule</h3>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="p-2">Due Date</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {ledger.installments.map((inst: any, idx: number) => (
              <tr key={idx} className="border-b">
                <td className="p-2">{new Date(inst.dueDate).toLocaleDateString()}</td>
                <td className="p-2">₹{inst.amount.toLocaleString()}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded text-xs ${inst.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {inst.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
