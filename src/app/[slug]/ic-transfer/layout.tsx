import ICTransferModeEffect from '@/components/ic-transfer/ICTransferModeEffect';

export default function ICTransferLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ICTransferModeEffect />
      {children}
    </>
  );
}
