import Link from 'next/link';
import { Header } from '@/components/ui';

export const metadata = { title: 'Privacy policy · insidejoke' };

export default function Page() {
  return (
    <main>
      <Header back="/menu" title="Privacy policy" />
      <div className="page">
        <h1>Privacy policy</h1>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>Your phone number is your account and is used to send you codes and the key moments by text. Amounts you give are shown only to you and the person you gave to, never on lists or feeds. [Placeholder: replace with your full privacy policy before launch.]</p>
        <Link href="/" style={{ fontSize: 14 }}>Back to insidejoke</Link>
      </div>
    </main>
  );
}
