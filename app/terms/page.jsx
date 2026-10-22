import Link from 'next/link';
import { Header } from '@/components/ui';

export const metadata = { title: 'Terms · insidejoke' };

export default function Page() {
  return (
    <main>
      <Header back="/menu" title="Terms" />
      <div className="page">
        <h1>Terms</h1>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>insidejoke holds gifts on behalf of the person celebrated and passes them on at cash-out, minus a 7% fee paid by the receiver. Givers never pay a fee. [Placeholder: replace with your full terms before launch.]</p>
        <Link href="/" style={{ fontSize: 14 }}>Back to insidejoke</Link>
      </div>
    </main>
  );
}
