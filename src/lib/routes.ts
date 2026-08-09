/** True when the user is on any Groups & Deals route (branch or superadmin). */
export function isGroupRoute(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return false;
  if (parts[0] === 'group') return true;
  return parts.length >= 2 && parts[1] === 'group';
}
