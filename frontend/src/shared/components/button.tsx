import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-primary text-white hover:bg-brand-dark',
  secondary: 'bg-brand-secondary text-brand-dark hover:brightness-95',
  outline: 'border border-brand-primary text-brand-primary bg-white hover:bg-surface-info',
  ghost: 'bg-transparent text-brand-primary hover:bg-surface-info',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', isLoading = false, disabled, children, className, ...props }, ref) => (
    <button
      ref={ref}
      {...props}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60',
        variants[variant],
        className,
      )}
    >
      {isLoading && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
