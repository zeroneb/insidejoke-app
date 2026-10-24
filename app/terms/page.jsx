import Link from 'next/link';
import { LegalPage, LEGAL, Mail } from '@/components/legal';

export const metadata = { title: 'Terms · insidejoke' };

export default function Page() {
  const n = LEGAL.name;
  return (
    <LegalPage
      title="Terms"
      intro={`These terms are an agreement between you and ${n} ("insidejoke", "we", "us") for using insidejoke.club and our services. By using insidejoke you agree to them. If you don't agree, please don't use insidejoke.`}
      sections={[
        { h: 'What insidejoke is', body: (<p>insidejoke lets you make lists of things you'd love, share them, and let friends and family get them, chip in toward them, or treat you to them. Money given is held for the person celebrated and passed to them when they cash out. insidejoke is not a store: we don't sell, ship or guarantee the items on lists, and links go to other sites we don't control.</p>) },
        { h: 'Store links', body: (<p>Links to stores on lists may be affiliate links. If someone buys through them, insidejoke may earn a small commission from the store. It never changes the price you pay or what anyone gives.</p>) },
        { h: 'Your account', body: (<>
          <ul>
            <li>You need a working phone number to sign up. Keep your phone and sign-in codes secure. You're responsible for what happens on your account.</li>
            <li>You must be at least 13 to use insidejoke, and 18 or older (or the age of majority where you live) to give money or cash out.</li>
            <li>Give accurate information, especially for payments and cash-outs.</li>
            <li>One person, one account. Don't impersonate anyone.</li>
          </ul>
        </>) },
        { h: 'Giving', body: (<>
          <ul>
            <li>Gifts are voluntary and charged right away to the payment method you choose. Givers pay no fee: the amount you give is the amount you're charged.</li>
            <li><b>Gifts are final.</b> We don't refund gifts once made, except where required by law or if we reverse a payment for fraud or error. If you think a payment was made by mistake or without your permission, contact us right away.</li>
            <li>A gift toward a wish is a gift to the person celebrated. They decide how to use it. We can't promise they'll buy the exact item.</li>
          </ul>
        </>) },
        { h: 'Receiving and cashing out', body: (<>
          <ul>
            <li>Money given to your lists is held for you until you cash out to a bank account you link.</li>
            <li><b>Fees.</b> When you cash out, three things come off the amount sent: the cost of processing each gift (2.9% + 30¢ for a card, 0.8% up to $5 for a bank payment), insidejoke's 5% fee, and a flat $2.50 cash-out fee. Givers never pay a fee. Every fee is shown before you confirm.</li>
            <li><b>New card gifts.</b> To protect against stolen cards, a gift paid by card can be cashed out 3 days after it's given.</li>
            <li><b>When money can be cashed out.</b> Treats and fully covered wishes can be cashed out anytime. Money toward a wish that isn't fully covered becomes available when that wish is covered, when the list closes (you archive it or its date passes), or when you archive the wish and choose to cash out or move its gifts to another wish.</li>
            <li><b>Minimum cash-out.</b> You can cash out once you have $25 ready, or anytime a list has closed (archived or its date has passed), as long as there is something left after fees.</li><li><b>Review.</b> We may pause a cash-out to check for fraud. We'll text you if we do, and most reviews take about a day.</li>
            <li><b>Bank payments.</b> Gifts paid from a bank account take 3–5 business days to clear and can be cashed out once they have. If a bank payment is returned, the gift is removed.</li>
            <li>To cash out you must complete identity and bank verification with our payment provider. Payouts usually arrive in 1–2 business days but can take longer.</li>
            <li>We may hold or reverse funds connected to fraud, chargebacks, or a breach of these terms.</li>
            <li>You're responsible for any taxes on money you receive.</li>
          </ul>
        </>) },
        { h: 'Refunds and disputed payments', body: (<>
          <ul>
            <li><b>Changing your mind.</b> Gifts are final once given. If you gave by mistake (wrong list, wrong amount), contact us before the person cashes out and we'll refund it to the way you paid.</li>
            <li><b>Before cash-out.</b> If a payment is disputed with the giver's bank, or reported as unauthorized, the gift is removed from the receiver's wallet and returned to the giver's bank. The receiver is told.</li>
            <li><b>After cash-out.</b> If a disputed gift was already cashed out, the amount is taken from the receiver's future gifts on insidejoke, and we may ask the receiver to repay it. We may pause cash-outs on an account while a dispute is open.</li>
            <li><b>Fraud.</b> A gift paid with a card or account that wasn't the giver's own is removed, and accounts involved may be closed. We may pause a cash-out to review it before any money moves.</li>
            <li><b>Items.</b> insidejoke doesn't sell the items on lists. Returns, refunds or problems with an item are between the buyer and the store.</li>
          </ul>
        </>) },
        { h: 'Payments are processed by Stripe', body: (<p>Payment processing services for people who receive money on insidejoke are provided by Stripe and are subject to the <a href="https://stripe.com/connect-account/legal" target="_blank" rel="noreferrer">Stripe Connected Account Agreement</a>, which includes the <a href="https://stripe.com/legal" target="_blank" rel="noreferrer">Stripe Terms of Service</a> (together, the "Stripe Services Agreement"). By cashing out on insidejoke, you agree to be bound by the Stripe Services Agreement, as it may be modified by Stripe from time to time. As a condition of insidejoke enabling payment processing services through Stripe, you agree to provide insidejoke accurate and complete information about you, and you authorize insidejoke to share it and transaction information related to your use of the payment processing services provided by Stripe.</p>) },
        { h: 'Surprises, collab lists and texts', body: (<>
          <ul>
            <li>Only make surprise lists for people who'd welcome them, and only text people who'd expect to hear from you.</li>
            <li>When you invite or share with someone, we send one text on your behalf. You confirm you have permission to text that number.</li>
            <li>On collab lists, everyone you add can edit the list and see who joined. The list's creator is responsible for it and receives its money.</li>
            <li>Texts from insidejoke: message frequency varies; message and data rates may apply. Reply STOP to opt out and HELP for help.</li>
          </ul>
        </>) },
        { h: 'Your content', body: (<>
          <p>You own what you post: lists, photos, notes, voice notes and videos. You give us permission to host, show and send it as needed to run insidejoke (for example, showing your list to people you share it with). This permission ends when you delete it, except copies others already received or that we must keep by law.</p>
          <p>Only post things you have the right to share. Don't post anything illegal, hateful, harassing, sexual involving minors, or that invades someone's privacy.</p>
        </>) },
        { h: 'Things you can’t do', body: (<ul>
          <li>Use insidejoke for fraud, money laundering, selling goods or services, raising money for a business or cause, or anything other than personal gifts.</li>
          <li>List illegal items, weapons, drugs, or anything that breaks the law.</li>
          <li>Harass, spam or mislead people, or send texts to people who didn't agree to them.</li>
          <li>Break, overload, scrape or try to get around the security of insidejoke.</li>
        </ul>) },
        { h: 'Ending things', body: (<p>You can delete your account anytime in Settings. Cash out first: money left in your wallet when you delete may not be recoverable without contacting us. We may suspend or close accounts that break these terms or put others at risk, and we'll pay out any legitimate balance where the law and our payment provider allow.</p>) },
        { h: 'Disclaimers', body: (<p>insidejoke is provided "as is". We work to keep it running and accurate, but we can't promise it will always be available or error-free, and prices or photos pulled from store links may be out of date. To the fullest extent the law allows, we disclaim all warranties, express or implied.</p>) },
        { h: 'Limits on liability', body: (<p>To the fullest extent the law allows, insidejoke won't be liable for indirect, incidental or consequential damages, or for things outside our control such as stores, banks, carriers or other users. Our total liability for any claim is limited to the greater of the fees you paid us in the 12 months before the claim or $100. Some places don't allow these limits, so they may not apply to you.</p>) },
        { h: 'Disputes', body: (<p>These terms are governed by the laws of the State of {LEGAL.state}, USA, without regard to conflict-of-law rules. Before filing a claim, please contact us so we can try to resolve it. Any legal claim will be brought in the state or federal courts located in {LEGAL.state}, and you and we consent to their jurisdiction. You can also bring a claim in small claims court where you live.</p>) },
        { h: 'Changes', body: (<p>We may update these terms. We'll change the date above, and for important changes we'll tell you in the app or by text before they take effect. If you keep using insidejoke after that, the new terms apply.</p>) },
        { h: 'Contact', body: (<p>Questions: <Mail />. Also see our <Link href="/privacy">Privacy policy</Link>.</p>) }
      ]}
    />
  );
}
