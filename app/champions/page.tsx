import ExamCreator from "@/components/ExamCreator";
import TrendDashboard from "@/components/TrendDashboard";
import CSARReport from "@/components/CSARReport";
import AttendanceTracker from "@/components/AttendanceTracker";
import FeeLedgerView from "@/components/FeeLedger";

export default function Home() {
  // Hardcoded test IDs to render the components directly
  const studentId = "student-123";
  const examId = "exam-456";

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto space-y-12">
      <header className="bg-white p-6 rounded shadow flex justify-between items-center border-l-4 border-blue-600">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Champions Portal</h1>
          <p className="text-gray-500">Student Info & Exam Analysis System</p>
        </div>
        <div className="flex gap-4">
          <button className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">Library Login</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Admin Login</button>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AttendanceTracker studentId={studentId} />
        <FeeLedgerView studentId={studentId} />
      </section>

      <section>
        <ExamCreator examId={examId} />
      </section>

      <section>
        <CSARReport studentId={studentId} examId={examId} />
      </section>

      <section>
        <TrendDashboard studentId={studentId} />
      </section>
    </main>
  );
}
