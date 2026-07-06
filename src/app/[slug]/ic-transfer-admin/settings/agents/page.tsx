import ICTransferSettingsUsersPage from '@/components/ic-transfer/settings/ICTransferSettingsUsersPage';

export default function AgentManagementPage() {
  return (
    <ICTransferSettingsUsersPage
      title="Add User"
      subtitle="Manage agent accounts and access"
      modalTitle="Add User"
      showRate
    />
  );
}
