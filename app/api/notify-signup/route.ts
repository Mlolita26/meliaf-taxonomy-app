import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'a.nowak@cgiar.org';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
// When using Resend without a verified domain, set RESEND_FROM to 'onboarding@resend.dev'
// After verifying your domain, set it to e.g. 'noreply@yourdomain.org'
const FROM_EMAIL = process.env.RESEND_FROM ?? 'onboarding@resend.dev';

export async function POST(req: NextRequest) {
  const { pseudonym, institution } = await req.json();

  if (!RESEND_API_KEY) {
    // Email not configured — log and return OK so signup still works
    console.log(`[notify-signup] No RESEND_API_KEY set. New signup: ${pseudonym}`);
    return NextResponse.json({ ok: true, skipped: true });
  }

  const html = `
    <p>A new reviewer just joined the <strong>Climate Adaptation Taxonomy</strong> app.</p>
    <ul>
      <li><strong>Pseudonym:</strong> ${pseudonym}</li>
      ${institution ? `<li><strong>Institution:</strong> ${institution}</li>` : ''}
    </ul>
    <p>Log in to <a href="https://meliaf-taxonomy-app.vercel.app/admin">the admin dashboard</a> to assign reviews.</p>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    FROM_EMAIL,
      to:      [ADMIN_EMAIL],
      subject: `New reviewer signed up: ${pseudonym}`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[notify-signup] Resend error:', err);
    // Don't block — email failure shouldn't break signup
    return NextResponse.json({ ok: true, emailError: err });
  }

  return NextResponse.json({ ok: true });
}
