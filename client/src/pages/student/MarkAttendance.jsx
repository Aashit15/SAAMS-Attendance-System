import { Link } from 'react-router-dom';

export default function MarkAttendance() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold gradient-text mb-2">Mark Attendance</h1>
      <p className="text-surface-200/60 mb-8">Choose your attendance method</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link to="/student/qr-scan" className="glass rounded-2xl p-8 text-center hover:border-primary-500/30 transition-all group">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-4xl group-hover:animate-float shadow-xl shadow-blue-500/20">
            📱
          </div>
          <h2 className="text-xl font-bold text-surface-100">QR Code</h2>
          <p className="text-sm text-surface-200/50 mt-2">Scan the QR code displayed by your faculty</p>
          <div className="mt-4 px-4 py-2 gradient-primary rounded-xl text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-all">
            Open Scanner →
          </div>
        </Link>

        <Link to="/student/face-scan" className="glass rounded-2xl p-8 text-center hover:border-accent-500/30 transition-all group">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-4xl group-hover:animate-float shadow-xl shadow-emerald-500/20">
            🤖
          </div>
          <h2 className="text-xl font-bold text-surface-100">Face Scan</h2>
          <p className="text-sm text-surface-200/50 mt-2">Use facial recognition to mark your attendance</p>
          <div className="mt-4 px-4 py-2 gradient-accent rounded-xl text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-all">
            Open Camera →
          </div>
        </Link>
      </div>
    </div>
  );
}
