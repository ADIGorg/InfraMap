import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { useAdminDashboardViewModel } from './use-admin-dashboard-view-model';

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn() }));

describe('Dashboard MVVM polling', () => {
  it('programa a consulta do dashboard e a lista recente para cada 30 segundos', () => {
    const refetch = vi.fn();
    vi.mocked(useQuery).mockReturnValue({
      data: undefined, refetch, isFetching: false, isPending: true, isError: false,
    } as unknown as ReturnType<typeof useQuery>);

    const { result, unmount } = renderHook(() => useAdminDashboardViewModel());
    expect(result.current.pollingSeconds).toBe(30);
    expect(useQuery).toHaveBeenCalledTimes(2);
    expect(useQuery).toHaveBeenNthCalledWith(1, expect.objectContaining({
      queryKey: ['admin', 'dashboard'],
      refetchInterval: 30_000,
      staleTime: 30_000,
    }));
    expect(useQuery).toHaveBeenNthCalledWith(2, expect.objectContaining({
      queryKey: ['admin', 'occurrences', 'dashboard-recent', { page: 1, pageSize: 5, sort: 'recent' }],
      refetchInterval: 30_000,
    }));
    result.current.refresh();
    expect(refetch).toHaveBeenCalledTimes(2);
    unmount();
  });
});
