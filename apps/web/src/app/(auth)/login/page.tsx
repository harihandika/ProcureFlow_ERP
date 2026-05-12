import { Suspense } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1fr_0.9fr]">
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-900 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-normal text-slate-950">ProcureFlow ERP</h1>
              <p className="text-sm text-slate-500">Portfolio procurement system</p>
            </div>
          </div>

          <div className="mt-10">
            <h2 className="text-2xl font-semibold tracking-normal text-slate-950">Sign in</h2>
            <p className="mt-2 text-sm text-slate-600">Use a seeded demo account to access the dashboard.</p>
          </div>

          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>
        </div>
      </section>

      <section className="hidden border-l bg-slate-950 px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-blue-200">
          <LockKeyhole className="h-4 w-4" />
          Enterprise procurement control
        </div>

        <div>
          <div className="max-w-xl text-4xl font-semibold leading-tight tracking-normal">
            Purchase requests, budgets, approvals, receiving, and ERP sync in one controlled workspace.
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              ['86%', 'Completion'],
              ['IDR 666M', 'Available'],
              ['92%', 'Retry recovery'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <div className="text-xl font-semibold">{value}</div>
                <div className="mt-1 text-xs text-slate-400">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="mt-8 space-y-5">
      <div className="h-16 rounded-md bg-slate-100" />
      <div className="h-16 rounded-md bg-slate-100" />
      <div className="h-10 rounded-md bg-blue-100" />
    </div>
  );
}
