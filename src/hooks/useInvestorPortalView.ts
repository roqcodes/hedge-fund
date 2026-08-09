import { useApp } from '@/context/AppContext';

export function useInvestorPortalView() {
  const { user } = useApp();
  const isInvestorView = user?.role === 'investor';
  const investorId = user?.investorId;
  return { isInvestorView, investorId };
}
