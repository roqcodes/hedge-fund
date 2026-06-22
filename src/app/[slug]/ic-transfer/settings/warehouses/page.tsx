import ICTransferSettingsUsersPage from '@/components/ic-transfer/settings/ICTransferSettingsUsersPage';

export default function WarehouseManagementPage() {
  return (
    <ICTransferSettingsUsersPage
      title="Add Warehouse"
      subtitle="Manage warehouse accounts and locations"
      addButtonLabel="Add Warehouse"
      modalTitle="Add User"
      nameColumn="Name"
      showRate={false}
    />
  );
}
