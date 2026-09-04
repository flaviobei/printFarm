'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListTodo, Package, Settings, Box, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useDictionary } from '@/lib/i18n';

export function Sidebar() {
  const pathname = usePathname();
  const { dict, locale, setLocale } = useDictionary();
  const sideDict = dict.sidebar;

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
    { name: sideDict.catalog, href: '/catalogo', icon: Box },
    { name: sideDict.inventory, href: '/estoque', icon: Package },
    { name: sideDict.settings, href: '/configuracoes', icon: Settings },
  ];

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r shadow-sm">
      <div className="flex h-14 items-center border-b px-6">
        <span className="text-lg font-bold tracking-tight text-primary">{sideDict.title}</span>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid gap-1 px-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="border-t p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between px-3">
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
