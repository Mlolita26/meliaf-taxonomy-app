'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';

const schema = z.object({
  pseudonym: z
    .string()
    .min(3, 'At least 3 characters')
    .max(30, 'Max 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Letters, numbers, _ and - only'),
  email:    z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  institution: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const ADJECTIVES = ['Swift','Keen','Bold','Bright','Sharp','Warm','Deep','Clear'];
const NOUNS      = ['Moose','Eagle','Oak','River','Peak','Cloud','Coral','Fern'];

function generatePseudonym() {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num  = Math.floor(Math.random() * 90) + 10;
  return `${adj}${noun}${num}`;
}

export default function RegisterPage() {
  const router  = useRouter();
  const supabase = createClient();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const pseudonym = watch('pseudonym') ?? '';

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError('');

    // Check pseudonym uniqueness
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('pseudonym', data.pseudonym);

    if (count && count > 0) {
      setError('That pseudonym is already taken — try another.');
      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email:    data.email,
      password: data.password,
      options: {
        data: {
          pseudonym:   data.pseudonym,
          avatar_seed: data.pseudonym,
          institution: data.institution ?? null,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    router.push('/onboarding');
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-gray-900">🌿 MELIAF Taxonomy</Link>
          <p className="text-gray-500 mt-1">Create your reviewer account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">

          {/* Pseudonym */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pseudonym <span className="text-gray-400 font-normal">(your public identity)</span>
            </label>
            <div className="flex gap-2">
              <input
                {...register('pseudonym')}
                placeholder="e.g. SwiftMoose42"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="button"
                onClick={() => setValue('pseudonym', generatePseudonym())}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors whitespace-nowrap"
              >
                Generate
              </button>
            </div>
            {pseudonym && (
              <div className="mt-2 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-lg">
                  {pseudonym.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-gray-600">@{pseudonym}</span>
              </div>
            )}
            {errors.pseudonym && <p className="text-red-500 text-xs mt-1">{errors.pseudonym.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              {...register('password')}
              type="password"
              placeholder="Min. 8 characters"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          {/* Institution (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Institution <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              {...register('institution')}
              placeholder="e.g. CIAT, IRRI, University of..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-green-600 hover:underline font-medium">Sign in</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
