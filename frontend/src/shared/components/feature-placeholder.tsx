import { Construction } from 'lucide-react';
import { Card } from './card';

interface FeaturePlaceholderProps {
  title: string;
  ticket: string;
  description: string;
}
export function FeaturePlaceholder({ title, ticket, description }: FeaturePlaceholderProps) {
  return (
    <div className="page-container">
      <h1 className="mb-2 text-2xl font-extrabold">{title}</h1>
      <p className="mb-6 text-ink-secondary">{description}</p>
      <Card className="max-w-2xl border border-line-subtle">
        <Construction aria-hidden="true" className="mb-3 h-8 w-8 text-brand-primary" />
        <p className="font-semibold">Implementação funcional prevista para {ticket}</p>
        <p className="mt-2 text-sm text-ink-secondary">
          A navegação e a estrutura MVVM estão preparadas. Esta página não apresenta dados fictícios.
        </p>
      </Card>
    </div>
  );
}
