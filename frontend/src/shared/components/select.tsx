import { forwardRef, useState, type ComponentPropsWithoutRef } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

export interface SelectOption { value: string; label: string; disabled?: boolean }
interface SelectProps extends Omit<ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>, 'value' | 'defaultValue' | 'children' | 'onChange'> {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  placeholder?: string;
}

// Radix reserves the empty string for clearing the selection. The empty option
// remains selectable through a private item value, never submitted to forms.
const EMPTY_OPTION = '__inframap_empty_option__';

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select({
  options, value, defaultValue = '', onValueChange, name, required, disabled,
  placeholder = 'Selecione uma opção', className, ...props
}, ref) {
  const [localValue, setLocalValue] = useState(defaultValue);
  const selected = value ?? localValue;
  const emptyLabel = options.find(option => option.value === '')?.label ?? placeholder;
  return <SelectPrimitive.Root value={selected} name={name} required={required} disabled={disabled}
    onValueChange={next => {
      const actual = next === EMPTY_OPTION ? '' : next;
      setLocalValue(actual); onValueChange?.(actual);
    }}>
    <SelectPrimitive.Trigger {...props} ref={ref} className={cn(
      'field-input flex min-h-11 items-center justify-between gap-3 text-left font-normal disabled:cursor-not-allowed disabled:opacity-60 [&>span:first-child]:min-w-0 [&>span:first-child]:truncate', className,
    )}>
      <SelectPrimitive.Value placeholder={emptyLabel} />
      <SelectPrimitive.Icon asChild><ChevronDown size={16} className="shrink-0 text-ink-secondary" aria-hidden="true" /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content position="popper" sideOffset={4} collisionPadding={8}
        className="z-[70] max-h-[min(320px,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-line bg-white text-sm text-ink-primary shadow-xl">
        <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center bg-white"><ChevronUp size={16} aria-hidden="true" /></SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="p-1">
          {options.map(option => <SelectPrimitive.Item key={option.value} value={option.value || EMPTY_OPTION} disabled={option.disabled} textValue={option.label}
            data-value={option.value} className="relative flex min-h-10 cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-3 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-surface-info data-[highlighted]:text-brand-primary">
            <SelectPrimitive.ItemIndicator className="absolute left-2"><Check size={15} aria-hidden="true" /></SelectPrimitive.ItemIndicator>
            <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
          </SelectPrimitive.Item>)}
        </SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center bg-white"><ChevronDown size={16} aria-hidden="true" /></SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  </SelectPrimitive.Root>;
});
