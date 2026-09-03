'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Box, 
  Settings 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDictionary } from '@/lib/i18n';

export function Sidebar() {
  const pathname = usePathname();
  const dict = getDictionary().sidebar;

  const navigation = [
    { name: dict.dashboard, href: '/', icon: LayoutDashboard },
    { name: dict.productionQueue, href: '/pedidos', icon: ShoppingCart },
    { name: dict.catalog, href: '/catalogo', icon: Package },
    { name: dict.inventory, href: '/estoque', icon: Box },
  ];

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card px-3 py-4">
      <div className="mb-8 px-4">
        <h1 className="text-2xl font-bold text-primary tracking-tight">{dict.title}</h1>
      </div>
      <nav className="flex-1 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto">
        <Link
          href="/configuracoes"
          className="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Settings className="mr-3 h-5 w-5 flex-shrink-0 text-muted-foreground group-hover:text-foreground" />
          {dict.settings}
        </Link>
      </div>
    </div>
  );
}
