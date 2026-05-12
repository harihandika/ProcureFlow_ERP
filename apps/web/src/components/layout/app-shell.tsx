'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChevronRight, LogOut, Menu, Search, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { navigationItems, roleLabels, roleOptions, type NavigationItem, type UserRole } from '@/lib/navigation';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const userRoles = useMemo(() => normalizeUserRoles(user?.roles ?? []), [user?.roles]);

  const visibleItems = useMemo(
    () => navigationItems.filter((item) => item.roles.some((role) => userRoles.includes(role))),
    [userRoles],
  );

  const currentPage = useMemo(() => getCurrentPage(pathname), [pathname]);
  const sidebar = <SidebarContent pathname={pathname} items={visibleItems} />;
  const roleDisplay = userRoles.length > 0 ? userRoles.map((role) => roleLabels[role]).join(', ') : 'No role assigned';

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-72 lg:flex-col lg:border-r lg:bg-slate-950">
        {sidebar}
      </div>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center gap-3 px-4 py-3 md:px-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="max-w-80 bg-slate-950 p-0 text-white" side="left">
                <SheetHeader className="border-slate-800">
                  <SheetTitle className="text-white">ProcureFlow ERP</SheetTitle>
                </SheetHeader>
                {sidebar}
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <Breadcrumb currentPage={currentPage} />
              <h1 className="mt-1 truncate text-xl font-semibold tracking-normal text-slate-950 md:text-2xl">
                {currentPage.title}
              </h1>
            </div>

            <div className="hidden w-full max-w-sm xl:block">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="pl-9" placeholder="Search records, documents, suppliers" />
              </div>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-3">
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3 rounded-md border px-2 py-1.5 sm:px-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-900 text-xs font-semibold text-white">
                  {getInitials(user?.fullName ?? 'User')}
                </div>
                <div className="hidden leading-tight md:block">
                  <div className="text-sm font-semibold text-slate-900">{user?.fullName ?? 'User'}</div>
                  <div className="max-w-48 truncate text-xs text-slate-500">{roleDisplay}</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" aria-label="Logout" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] bg-slate-50/70">
          <div className="mx-auto w-full max-w-[1500px] px-4 py-6 md:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function normalizeUserRoles(roles: string[]): UserRole[] {
  const allowedRoles = new Set<UserRole>(roleOptions);

  return roles.map((role) => role.toUpperCase() as UserRole).filter((role) => allowedRoles.has(role));
}

function SidebarContent({ pathname, items }: { pathname: string; items: NavigationItem[] }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-500 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">ProcureFlow ERP</div>
          <div className="text-xs text-slate-400">Procurement Control</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-900 hover:text-white',
                active && 'bg-blue-600 text-white hover:bg-blue-600',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
          <div className="text-xs font-medium uppercase text-slate-400">Environment</div>
          <div className="mt-1 text-sm font-semibold text-white">Portfolio Demo</div>
          <div className="mt-1 text-xs text-slate-400">Next.js UI + NestJS API</div>
        </div>
      </div>
    </div>
  );
}

function Breadcrumb({ currentPage }: { currentPage: NavigationItem }) {
  return (
    <nav className="flex items-center gap-1 text-xs font-medium text-slate-500" aria-label="Breadcrumb">
      <Link href="/dashboard" className="hover:text-blue-800">
        ProcureFlow
      </Link>
      <ChevronRight className="h-3.5 w-3.5" />
      <span className="truncate text-slate-700">{currentPage.title}</span>
    </nav>
  );
}

function getCurrentPage(pathname: string): NavigationItem {
  const exactMatch = navigationItems.find((item) => item.href === pathname);

  if (exactMatch) {
    return exactMatch;
  }

  const nestedMatch = navigationItems.find((item) => pathname.startsWith(`${item.href}/`));

  if (nestedMatch) {
    return nestedMatch;
  }

  return {
    title: titleFromPathname(pathname),
    href: pathname,
    icon: ShieldCheck,
    roles: roleOptions,
  };
}

function titleFromPathname(pathname: string) {
  const segment = pathname.split('/').filter(Boolean).at(-1) ?? 'Dashboard';

  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
