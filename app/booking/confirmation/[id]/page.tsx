import { redirect } from 'next/navigation';

export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/booking/success/${id}`);
}
