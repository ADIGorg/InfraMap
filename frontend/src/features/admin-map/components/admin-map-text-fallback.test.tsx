import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminMapTextFallback } from './admin-map-text-fallback';
import type { AdminMapOccurrence } from '../services/admin-occurrences.service';

const items: AdminMapOccurrence[] = Array.from({ length: 9 }, (_, index) => ({
  id: `10000000-0000-4000-8000-${String(index).padStart(12, '0')}`, category: { id: 'cat', code: 'CAT01', name: `Categoria ${index + 1}` },
  description: `Descrição completa ${index + 1}`, status: 'CONFIRMED', priority: 'HIGH',
  location: { lat: -12.3, lng: -38.9 }, createdAt: '2026-11-20T00:00:00Z',
}));
describe('Lista compacta do mapa', () => {
  it('permite acessar todos os registros em páginas de quatro, com detalhes e ajuste', () => {
    const adjust = vi.fn();
    render(<MemoryRouter><AdminMapTextFallback items={items} reason="Visualização em lista selecionada." onAdjust={adjust} /></MemoryRouter>);
    const list = screen.getByRole('list', { name: 'Ocorrências ativas' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText('1–4 de 9 ocorrências carregadas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(screen.getByText('5–8 de 9 ocorrências carregadas')).toBeInTheDocument();
    expect(screen.queryByText('Categoria 1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Ver detalhes' })).toHaveAttribute('href', '/admin/occurrences/' + items[8].id);
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar posição' }));
    expect(adjust).toHaveBeenCalledWith(items[8]);
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
  });
  it('ajusta a página se a atualização da API reduzir os resultados', () => {
    const view = render(<MemoryRouter><AdminMapTextFallback items={items} reason="Lista" onAdjust={vi.fn()} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    view.rerender(<MemoryRouter><AdminMapTextFallback items={items.slice(0, 1)} reason="Lista" onAdjust={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText('1–1 de 1 ocorrências carregadas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  });
});
