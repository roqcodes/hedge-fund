import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchInitialDataAction } from '@/app/actions/dbActions';

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboardData'],
    queryFn: async () => {
      const res = await fetchInitialDataAction();
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to fetch data');
      }
      return res.data;
    },
    // We can set a stale time of a few minutes for a dashboard
    staleTime: 2 * 60 * 1000,
  });
}
