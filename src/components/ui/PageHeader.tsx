import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode; // Espera um ícone do lucide-react com as classes, ex: <Box className="w-8 h-8 mr-3 text-primary" />
  action?: ReactNode; // Botões à direita
}

export function PageHeader({ title, subtitle, icon, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 shrink-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center">
          {icon}
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground mt-2">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}
