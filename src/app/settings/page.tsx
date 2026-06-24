import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import StaffAccountSettings from '@/components/users/StaffAccountSettings';
import UsersManagement from '@/components/users/UsersManagement';
import { fetchCognitoUsersAction } from '@/app/actions/cognitoActions';
import { pageHeader, pageSubtitle, pageTitle } from '@/lib/ui';

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    redirect('/');
  }

  const { success, data: initialUsers, error } = await fetchCognitoUsersAction();

  return (
    <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className={pageHeader}>
        <div>
          <h2 className={pageTitle}>Settings</h2>
          <p className={pageSubtitle}>Platform configuration, user preferences, and system administration</p>
        </div>
      </div>

      <div className="w-full space-y-8">
        <UsersManagement initialUsers={success && initialUsers ? initialUsers : []} error={error} />
        <StaffAccountSettings />
      </div>
    </div>
  );
}
