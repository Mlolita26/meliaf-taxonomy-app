'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CancelSuggestionButton({ suggestionId }: { suggestionId: string }) {
  const [phase, setPhase] = useState<'idle' | 'confirming' | 'cancelling' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  async function handleCancel() {
    setPhase('cancelling');
    const res = await fetch('/api/cancel-suggestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestionId }),
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      setErrorMsg(data.error ?? 'Unknown error');
      setPhase('error');
      return;
    }

    router.refresh();
    router.push('/reviews');
  }

  if (phase === 'error') {
    return (
      <div className="space-y-2 pt-1">
        <p className="text-sm text-red-700 font-medium">Something went wrong</p>
        <p className="text-xs text-red-500">{errorMsg}</p>
        <button
          onClick={() => setPhase('idle')}
          className="w-full py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  if (phase === 'confirming') {
    return (
      <div className="space-y-2 pt-1">
        <p className="text-sm text-red-700 font-medium">Cancel this suggestion?</p>
        <p className="text-xs text-gray-500">All points earned for this suggestion will be removed. This cannot be undone.</p>
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-xl text-sm hover:bg-red-700 transition-colors"
          >
            Yes, cancel it
          </button>
          <button
            onClick={() => setPhase('idle')}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl text-sm hover:bg-gray-50 transition-colors"
          >
            Keep it
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'cancelling') {
    return (
      <div className="w-full py-2.5 text-center bg-gray-50 text-gray-400 rounded-xl text-sm border border-gray-100 animate-pulse">
        Cancelling…
      </div>
    );
  }

  return (
    <button
      onClick={() => setPhase('confirming')}
      className="w-full py-2.5 border border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-50 active:scale-95 transition-all text-sm"
    >
      ↩ Cancel this suggestion
    </button>
  );
}
