import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  maxWidth?: '5xl' | '7xl' | 'full' | 'screen-2xl'; // default: max-w-[1600px] para telas FullHD/grandes
}

const maxWidthClasses = {
  '5xl': 'max-w-5xl',
  '7xl': 'max-w-7xl',
  'screen-2xl': 'max-w-screen-2xl',
  'full': 'max-w-full',
};

export function PageLayout({ children, className, maxWidth = 'full' }: PageLayoutProps) {
  return (
    <div className={cn('h-full flex flex-col p-6 mx-auto w-full', maxWidthClasses[maxWidth], className)}>
      {children}
    </div>
  );
}
