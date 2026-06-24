import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import UsersManagement from '@/components/users/UsersManagement';
import { fetchCognitoUsersAction } from '@/app/actions/cognitoActions';

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    redirect('/');
  }

  const { success, data: initialUsers, error } = await fetchCognitoUsersAction();

  return (
    <div className="w-full max-w-7xl mx-auto">
      <UsersManagement
        initialUsers={success && initialUsers ? initialUsers : []}
        error={error}
        isSuperAdmin
      />
    </div>
  );
}
