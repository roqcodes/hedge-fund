import { ICTransferFilterProvider } from '@/components/ic-transfer/shared/ICTransferFilterProvider';

export default function ICTransferBranchLayout({ children }: { children: React.ReactNode }) {
  return <ICTransferFilterProvider>{children}</ICTransferFilterProvider>;
}
