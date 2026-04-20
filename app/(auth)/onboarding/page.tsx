'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const STEPS = [
  {
    icon: '🌿',
    title: 'Welcome to MELIAF Taxonomy Review',
    body: 'You\'ll review terms from the CGIAR climate adaptation taxonomy — 96 terms covering 8 elements like Rationale, Intervention, Outcomes, and Beneficiaries.',
    detail: 'Each term has 12 fields including definition, inclusion/exclusion criteria, examples, and hierarchy.',
  },
  {
    icon: '⭐',
    title: 'How points work',
    body: 'Earn points by completing reviews, suggesting improvements, and proposing new terms.',
    detail: '✅ Complete a review: +10 pts\n✏️ Suggest a field edit: +5 pts\n🎯 Suggestion accepted: +20 pts\n🚀 New term accepted: +50 pts',
  },
  {
    icon: '🏆',
    title: 'Compete for the prize',
    body: 'The top contributor at the end of the review cycle wins a free subscription!',
    detail: 'Each term gets reviewed by exactly 2 people — so your reviews genuinely shape the final taxonomy. Pseudonyms keep it fun and fair.',
  },
];

export default function OnboardingPage() {
  const [step, setStep]     = useState(0);
  const [loading, setLoading] = useState(false);
  const router   = useRouter();
  const supabase = createClient();

  const isLast = step === STEPS.length - 1;

  async function finish() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_done: true })
        .eq('id', user.id);
    }
    router.push('/home');
  }

  const current = STEPS[step];

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-8 bg-green-600' : i < step ? 'w-2 bg-green-400' : 'w-2 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6 text-center">
          <div className="text-6xl">{current.icon}</div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900">{current.title}</h2>
            <p className="text-gray-600">{current.body}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 text-left whitespace-pre-line">
            {current.detail}
          </div>

          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={isLast ? finish : () => setStep(s => s + 1)}
              disabled={loading}
              className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors"
            >
              {loading ? 'Starting…' : isLast ? 'Start reviewing!' : 'Next'}
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400">Step {step + 1} of {STEPS.length}</p>
      </div>
    </main>
  );
}
