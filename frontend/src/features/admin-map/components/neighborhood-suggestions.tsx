import { useId, useState } from 'react';
import type { SelectOption } from '@/shared/components/select';

export function NeighborhoodSuggestions({ query, onQueryChange, options, selected, onSelect, disabled }: {
  query: string; onQueryChange: (query: string) => void; options: SelectOption[];
  selected?: string; onSelect: (id: string) => void; disabled: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const expanded = open && !!query.trim() && options.length > 0;
  const activeIndex = Math.min(active, Math.max(0, options.length - 1));
  function choose(value: string) {
    onSelect(value); onQueryChange(''); setOpen(false); setActive(0);
  }
  function highlight(index: number) {
    setActive(index);
    document.getElementById(`${id}-${index}`)?.scrollIntoView({ block: 'nearest' });
  }
  return <div onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
    <label className="sr-only" htmlFor={id}>Pesquisar bairro</label>
    <input id={id} role="combobox" type="text" autoComplete="off" className="field-input" placeholder="Digite para ver sugestões de bairros…"
      value={query} disabled={disabled} aria-autocomplete="list" aria-expanded={expanded}
      aria-controls={expanded ? `${id}-list` : undefined} aria-activedescendant={expanded ? `${id}-${activeIndex}` : undefined}
      onFocus={() => setOpen(true)} onChange={event => { onQueryChange(event.target.value); setOpen(true); setActive(0); }}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && query.trim() && options.length) {
          event.preventDefault(); setOpen(true);
          highlight(expanded ? (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length : 0);
        }
        if (event.key === 'Enter') { event.preventDefault(); if (expanded) choose(options[activeIndex].value); }
      }} />
    {expanded && <ul id={`${id}-list`} role="listbox" aria-label="Sugestões de bairros" className="mt-1 max-h-44 overflow-y-auto rounded-lg border border-line bg-white p-1 shadow-md">
      {options.map((option, index) => <li id={`${id}-${index}`} key={option.value} role="option" aria-selected={option.value === selected}
        className={'cursor-pointer rounded-md px-3 py-2 text-sm text-ink-primary ' + (index === activeIndex ? 'bg-surface-info' : 'hover:bg-surface-info')}
        onMouseDown={event => event.preventDefault()} onClick={() => choose(option.value)}>{option.label}</li>)}
    </ul>}
  </div>;
}
