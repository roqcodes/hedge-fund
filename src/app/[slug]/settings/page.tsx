import React from 'react';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import UsersManagement from '@/components/users/UsersManagement';
import { fetchCognitoUsersAction } from '@/app/actions/cognitoActions';
import { pageHeader, pageSubtitle, pageTitle } from '@/lib/ui';

export default async function BranchSettingsPage({ params }: { params: any }) {
  // Await params in case of Next.js 15+ async params behavior
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams.slug;

  const user = await getSessionUser();
  if (!user) {
    redirect('/');
  }

  // Find the matching branch
  const branchesRes = await query('SELECT id, name, slug FROM branches');
  const branches = branchesRes.rows;
  const branch = branches.find((b: any) => (b.slug || b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) === slug);
  const branchId = branch?.id;

  const { success, data: initialUsers, error } = await fetchCognitoUsersAction();
  
  // Filter users to only those assigned to this branch
  const branchUsers = success && initialUsers && branchId 
    ? initialUsers.filter(u => u.branchId === branchId) 
    : [];

  return (
    <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className={pageHeader}>
        <div>
          <h2 className={pageTitle}>Branch Settings</h2>
          <p className={pageSubtitle}>Configure local preferences, branch roles, and users</p>
        </div>
      </div>

      <div className="w-full mt-4">
        <UsersManagement 
          initialUsers={branchUsers} 
          error={error} 
          fixedBranchId={branchId} 
        />
      </div>
    </div>
  );
}
