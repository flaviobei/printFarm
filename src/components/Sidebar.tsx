'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListTodo, Package, Settings, Box, LogOut, CreditCard, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useDictionary } from '@/lib/i18n';
import { useEffect, useState } from 'react';

export function Sidebar() {
  const pathname = usePathname();
  const { dict, locale, setLocale } = useDictionary();
  const sideDict = dict.sidebar;
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDevAdminView, setIsDevAdminView] = useState(true);

  useEffect(() => {
    // Recupera a preferência do toggle de dev
    const storedPref = localStorage.getItem('dev_admin_view');
    if (storedPref !== null) {
      setIsDevAdminView(storedPref === 'true');
    }

    async function checkUser() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user?.email === 'flaviobei@gmail.com' || data.user?.email?.startsWith('admin@')) {
        setIsAdmin(true);
      }
    }
    checkUser();
  }, []);

  // Don't show sidebar on login page
  if (pathname === '/login') return null;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const toggleView = () => {
    const newVal = !isDevAdminView;
    setIsDevAdminView(newVal);
    localStorage.setItem('dev_admin_view', String(newVal));
    window.location.href = newVal ? '/admin' : '/';
  };

  let navItems = [
    { name: sideDict.dashboard, href: '/', icon: LayoutDashboard },
    { name: sideDict.productionQueue, href: '/pedidos', icon: ListTodo },
    { name: sideDict.catalog, href: '/catalogo', icon: Box },
    { name: sideDict.inventory, href: '/estoque', icon: Package },
    { name: sideDict.billing, href: '/assinatura', icon: CreditCard },
    { name: sideDict.settings, href: '/configuracoes', icon: Settings },
  ];

  if (isAdmin && isDevAdminView) {
    navItems = [
      { name: (sideDict as any).admin || 'Admin', href: '/admin', icon: Shield },
      { name: sideDict.settings, href: '/configuracoes', icon: Settings },
    ];
  }

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
        {/* Toggle para Devs */}
        {isAdmin && (
          <button
            onClick={toggleView}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs font-bold text-amber-600 bg-amber-100 hover:bg-amber-200 transition-colors"
          >
            <Shield className="h-4 w-4" />
            {isDevAdminView ? 'Ver como Usuário' : 'Ver como Admin'}
          </button>
        )}

        <div className="flex items-center justify-between px-3 pt-2">
          <span className="text-xs font-medium text-muted-foreground">Idioma / Lang</span>
          <div className="flex space-x-1">
            <button 
              onClick={() => setLocale('pt')}
              className={cn("text-xs font-bold px-2 py-1 rounded transition-colors", locale === 'pt' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
            >
              PT
            </button>
            <button 
              onClick={() => setLocale('en')}
              className={cn("text-xs font-bold px-2 py-1 rounded transition-colors", locale === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
            >
              EN
            </button>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair / Logout
        </button>
      </div>
    </div>
  );
}
