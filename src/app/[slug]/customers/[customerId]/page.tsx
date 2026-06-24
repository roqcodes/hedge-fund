import CustomerDetailPage from '@/components/customers/CustomerDetailPage';

export default async function CustomerDetailRoute({
  params,
}: {
  params: Promise<{ slug: string; customerId: string }>;
}) {
  await params;
  return <CustomerDetailPage />;
}
