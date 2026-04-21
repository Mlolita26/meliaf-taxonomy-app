import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-green-600 flex items-center justify-center shadow-lg">
            <span className="text-3xl">🌿</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Climate Adaptation Taxonomy</h1>
            <p className="text-green-700 font-medium mt-1">Review &amp; Enrich</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-gray-600 text-base leading-relaxed">
            CGIAR works on climate adaptation across multiple programs and projects but defines and measures it differently in each. The result is a fragmented story no funder or policymaker can act on. This taxonomy fixes that. Your review makes it scientifically sound.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-gray-100">
          {[
            { label: 'Terms', value: '96' },
            { label: 'Elements', value: '8' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-bold text-green-700">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Link
            href="/register"
            className="block w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            Join the review
          </Link>
          <Link
            href="/login"
            className="block w-full py-3 px-6 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl border border-gray-200 transition-colors"
          >
            Sign in
          </Link>
        </div>

        <p className="text-xs text-gray-400">
          Powered by the Climate Adaptation Accelerator (CGIAR MELIAF Project)
        </p>
      </div>
    </main>
  );
}
