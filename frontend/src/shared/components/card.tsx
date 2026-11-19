import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl bg-white p-6 shadow-card', className)} {...props} />;
}
