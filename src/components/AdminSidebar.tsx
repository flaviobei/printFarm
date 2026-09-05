'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Settings, LogOut, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export function AdminSidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const navItems = [
    { name: 'Painel Central', href: '/admin', icon: Shield },
    // Outros menus exclusivos de admin no futuro:
    // { name: 'Faturamento Global', href: '/admin/faturamento', icon: DollarSign },
  ];

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r shadow-sm border-r-primary/20">
      <div className="flex h-14 items-center border-b px-6 bg-primary/5">
        <span className="text-lg font-bold text-primary flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Super Admin
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t space-y-2">
        <Link
          href="/"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 transition-colors"
        >
          <LayoutDashboard className="h-4 w-4" />
          Ver meu Dashboard
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair do Sistema
        </button>
      </div>
    </div>
  );
}
