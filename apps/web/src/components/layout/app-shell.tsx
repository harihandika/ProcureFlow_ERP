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
    <div className="min-h-screen bg-slate-50/50">
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-slate-800 lg:bg-slate-900 shadow-enterprise">
        {sidebar}
      </div>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200/50 bg-white/70 backdrop-blur-md shadow-sm">
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
              <div className="flex items-center gap-3 rounded-full border border-slate-200/60 bg-white/50 px-2 py-1.5 sm:px-3 shadow-sm transition-all hover:shadow-md">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 shadow-sm text-xs font-semibold text-white ring-2 ring-white">
                  {getInitials(user?.fullName ?? 'User')}
                </div>
                <div className="hidden leading-tight md:block">
                  <div className="text-sm font-semibold text-slate-900">{user?.fullName ?? 'User'}</div>
                  <div className="max-w-48 truncate text-xs text-slate-500">{roleDisplay}</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" aria-label="Logout" data-testid="logout-button" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] bg-transparent animate-fade-in">
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

function normalizeUserRoles(roles: unknown): UserRole[] {
  const allowedRoles = new Set<UserRole>(roleOptions);

  if (!Array.isArray(roles)) {
    return [];
  }

  return roles
    .map((role) => {
      if (typeof role === 'string') {
        return role;
      }

      if (role && typeof role === 'object' && 'name' in role && typeof role.name === 'string') {
        return role.name;
      }

      return '';
    })
    .map((role) => role.toUpperCase() as UserRole)
    .filter((role) => allowedRoles.has(role));
}

function SidebarContent({ pathname, items }: { pathname: string; items: NavigationItem[] }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-slate-800/50 bg-slate-950/30 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg text-white">
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
              data-testid={`nav-${item.href.replace(/^\//, '').replace(/\//g, '-') || 'dashboard'}`}
              className={cn(
                'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-400 transition-all duration-200 hover:translate-x-1 hover:bg-slate-800/50 hover:text-white',
                active && 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-md hover:translate-x-0',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 backdrop-blur-sm">
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
