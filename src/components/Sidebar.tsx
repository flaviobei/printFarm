'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListTodo, Package, Settings, Box, LogOut, CreditCard, Printer, Shield, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useDictionary } from '@/lib/i18n';
import { api } from '@/services/api';
import { useEffect, useState } from 'react';

export function Sidebar() {
  const pathname = usePathname();
  const { dict, locale, setLocale } = useDictionary();
  const sideDict = dict.sidebar;
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const settings = await api.getUserSettings();
        if (settings?.role === 'master' || settings?.role === 'admin') {
          setIsAdmin(true);
          return;
        }
        // Fallback for mock if role is not set yet in DB
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (data.user?.email === 'flaviobei@gmail.com' || data.user?.email?.startsWith('admin@')) {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error(error);
      }
    }
    checkAdmin();
  }, []);

  // Don't show sidebar on login page
  if (pathname === '/login') return null;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const navItems = [
    { name: sideDict.dashboard, href: '/', icon: LayoutDashboard },
    { name: sideDict.productionQueue, href: '/pedidos', icon: ListTodo },
    { name: 'Histórico', href: '/historico', icon: History },
    { name: sideDict.catalog, href: '/catalogo', icon: Box },
    { name: sideDict.inventory, href: '/estoque', icon: Package },
    { name: 'Impressoras', href: '/impressoras', icon: Printer },
    { name: sideDict.billing, href: '/assinatura', icon: CreditCard },
    { name: sideDict.settings, href: '/configuracoes', icon: Settings },
  ];

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r shadow-sm">
      <div className="flex h-14 items-center border-b px-6">
        <span className="text-lg font-bold">PrintFarm</span>
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
        <div className="flex items-center justify-between px-3 pt-2">
          <span className="text-xs font-medium text-muted-foreground">Idioma / Lang</span>
          <div className="flex space-x-1">
            <button 
              onClick={() => setLocale('pt')}
              className={cn("px-2 py-1 text-xs rounded", locale === 'pt' ? "bg-primary text-primary-foreground" : "bg-muted")}
            >
              PT
            </button>
            <button 
              onClick={() => setLocale('en')}
              className={cn("px-2 py-1 text-xs rounded", locale === 'en' ? "bg-primary text-primary-foreground" : "bg-muted")}
            >
              EN
            </button>
          </div>
        </div>

        {isAdmin && (
          <Link
            href="/admin"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors mt-2"
          >
            <Shield className="h-4 w-4" />
            Super Admin
          </Link>
        )}

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors mt-2"
        >
          <LogOut className="h-4 w-4" />
          {sideDict.logout}
        </button>
      </div>
    </div>
  );
}
