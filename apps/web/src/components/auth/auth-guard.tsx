'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { buildLoginUrl } from '@/lib/auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(buildLoginUrl(pathname));
    }
  }, [pathname, router, status]);

  if (status !== 'authenticated') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex items-center gap-3 rounded-lg border px-4 py-3 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-900 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-950">Checking session</div>
            <div className="text-xs text-slate-500">ProcureFlow ERP</div>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
