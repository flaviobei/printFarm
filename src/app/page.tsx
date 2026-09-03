import { getDictionary } from '@/lib/i18n';

export default function Home() {
  const dict = getDictionary().home;
  
  return (
    <div className="flex items-center justify-center min-h-full">
      <h1 className="text-4xl font-bold tracking-tight text-primary">{dict.title}</h1>
    </div>
  );
}
