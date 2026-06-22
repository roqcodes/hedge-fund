import ICTransferSettingsUsersPage from '@/components/ic-transfer/settings/ICTransferSettingsUsersPage';

export default function SupplierManagementPage() {
  return (
    <ICTransferSettingsUsersPage
      title="Supplier Management"
      subtitle="Manage supplier accounts and rates"
      addButtonLabel="Add Supplier"
      modalTitle="Add Supplier"
      showRate
    />
  );
}
