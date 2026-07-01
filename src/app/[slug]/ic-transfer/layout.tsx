import ICTransferModeEffect from '@/components/ic-transfer/ICTransferModeEffect';
import { ICTransferFilterProvider } from '@/components/ic-transfer/shared/ICTransferFilterProvider';

export default function ICTransferLayout({ children }: { children: React.ReactNode }) {
  return (
    <ICTransferFilterProvider>
      <ICTransferModeEffect />
      {children}
    </ICTransferFilterProvider>
  );
}
