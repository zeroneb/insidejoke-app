import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { Header } from '@/components/ui';
import NewListForm from '@/components/new-list-form';

export const dynamic = 'force-dynamic';

export default async function NewListPage() {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/lists/new');
  return (
    <main>
      <Header back="/home" title="New list" />
      <NewListForm />
    </main>
  );
}
