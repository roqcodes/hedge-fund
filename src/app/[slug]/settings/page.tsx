import React from 'react';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import UsersManagement from '@/components/users/UsersManagement';
import StaffAccountSettings from '@/components/users/StaffAccountSettings';
import { fetchCognitoUsersAction } from '@/app/actions/cognitoActions';
import BranchDetailsSettings from '@/components/settings/BranchDetailsSettings';
import BranchBalanceOverwriteSettings from '@/components/settings/BranchBalanceOverwriteSettings';
import { pageHeader, pageSubtitle, pageTitle } from '@/lib/ui';
import { isBranchPortalRole } from '@/lib/rbac';

export default async function BranchSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const user = await getSessionUser(slug);
  if (!user || !isBranchPortalRole(user.role)) {
    redirect(`/${slug}`);
  }

  const branchesRes = await query('SELECT * FROM branches');
  const branches = branchesRes.rows;
  const branch = branches.find((b: { slug?: string; name: string }) =>
    (b.slug || b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) === slug,
  );
  const branchId = branch?.id;

  if (user.branchId && branchId && user.branchId !== branchId) {
    redirect(`/${slug}`);
  }

  if (user.role === 'customer') {
    redirect(`/${slug}/ic-transfer`);
  }

  const isManager = user.role === 'branch_manager';
  const isStaff = user.role === 'staff';

  let branchUsers: Awaited<ReturnType<typeof fetchCognitoUsersAction>>['data'] = [];
  let usersError: string | undefined;

  if (isManager) {
    const { success, data, error } = await fetchCognitoUsersAction(slug);
    branchUsers = success && data && branchId
      ? data.filter(u => u.branchId === branchId && u.role === 'staff')
      : [];
    usersError = error;
  }

  return (
    <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className={pageHeader}>
        <div>
          <h2 className={pageTitle}>{isStaff ? 'Account Settings' : 'Branch Settings'}</h2>
          <p className={pageSubtitle}>
            {isStaff
              ? 'Manage your account and security preferences'
              : 'Configure local preferences, branch roles, and staff access'}
          </p>
        </div>
      </div>

      <div className="mt-4 w-full space-y-8">
        {isStaff ? (
          <StaffAccountSettings branchSlug={slug} />
        ) : (
          <>
            {branch && <BranchDetailsSettings branch={branch} />}
            {branch && branchId && (
              <BranchBalanceOverwriteSettings branchId={branchId} branchSlug={slug} />
            )}
            <UsersManagement
              initialUsers={branchUsers ?? []}
              error={usersError}
              fixedBranchId={branchId}
              branchSlug={slug}
              isBranchManager
            />
            <StaffAccountSettings branchSlug={slug} />
          </>
        )}
      </div>
    </div>
  );
}
