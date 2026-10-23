import { LegalPage, LEGAL, Mail } from '@/components/legal';

export const metadata = { title: 'Privacy policy · insidejoke' };

export default function Page() {
  const n = LEGAL.name;
  return (
    <LegalPage
      title="Privacy policy"
      intro={`This policy explains what ${n} ("insidejoke", "we", "us") collects when you use insidejoke.club and our services, how we use it, who we share it with, and the choices you have. We keep it short and plain on purpose.`}
      sections={[
        { h: 'What we collect', body: (<>
          <p><b>What you give us.</b></p>
          <ul>
            <li>Account details: your name, phone number, and optionally an email for cash-out receipts, a photo, a short bio and your profile link.</li>
            <li>Your lists: titles, dates, occasions, wishes and treats, links, notes, photos, cover text, and who you share them with or build them with.</li>
            <li>Gifts and messages: what you give, notes you write, reactions, replies, thank-yous, and surprise cards, voice notes and videos.</li>
            <li>Phone numbers you enter to invite, share with or add friends. If your phone lets you pick contacts, we only receive the ones you choose.</li>
            <li>Things you send us when you contact us.</li>
          </ul>
          <p><b>Payment details.</b> Card and bank details are entered on our payment provider's secure forms. We never see or store your full card or bank account number. We keep a reference to your saved method, its brand and last four digits, and records of gifts and cash-outs.</p>
          <p><b>Collected automatically.</b> Basic usage and device information (pages visited, browser and device type, approximate location from IP address, referring page), security logs, and a sign-in cookie that keeps you logged in. We use privacy-friendly analytics that do not track you across other sites.</p>
          <p><b>From links you add.</b> When you paste a store link, we read that product page (name, price, photo) to fill in your wish.</p>
        </>) },
        { h: 'How we use it', body: (<>
          <ul>
            <li>To run insidejoke: create your account, show your lists, process gifts, hold money until you cash out, and send cash-outs.</li>
            <li>To send texts you'd expect: sign-in codes, invites and shares you ask us to send, gift and thank-you notices, reminders and surprise deliveries.</li>
            <li>To keep insidejoke safe: prevent fraud and abuse, verify identity where payment rules require it, and enforce our Terms.</li>
            <li>To improve insidejoke: understand which features are used and fix what breaks.</li>
            <li>To meet legal, tax and accounting obligations.</li>
          </ul>
          <p>We do not sell your personal information, and we do not share it for advertising on other sites.</p>
        </>) },
        { h: 'What other people can see', body: (<>
          <ul>
            <li><b>Public lists</b> can be seen by anyone with the link and appear on your profile. <b>Private lists</b> are visible only to people you share them with. Surprise lists stay hidden from the person they're for until they're sent.</li>
            <li>Your name, photo, bio and profile link are visible to people who can see your profile. You can make your profile friends-only in Settings.</li>
            <li><b>Amounts are private.</b> How much someone gave is shown only to the giver and the person celebrated. Others see how much of a wish is covered, never who gave what amount.</li>
            <li>Notes on gifts are public or private as the giver chooses.</li>
            <li>Collaborators on a list can see and edit it.</li>
          </ul>
        </>) },
        { h: 'Who we share it with', body: (<>
          <p>We share information only as needed to run insidejoke:</p>
          <ul>
            <li><b>Service providers</b> who work for us under contract: payment processing and payouts (Stripe), text messaging and sign-in codes (Twilio), hosting, file storage and analytics (Vercel), and our database host (Supabase). They may use your information only to provide their service to us.</li>
            <li><b>Payments.</b> Our payment provider receives what it needs to process gifts and cash-outs and to meet identity, anti-fraud and anti-money-laundering rules.</li>
            <li><b>Legal and safety.</b> When required by law or to protect the rights, safety and property of our users, the public or insidejoke.</li>
            <li><b>Business changes.</b> If insidejoke is merged, acquired or sells assets, your information may move as part of that, under this policy.</li>
          </ul>
        </>) },
        { h: 'Texts', body: (<>
          <p>By giving us your phone number you agree to receive texts from insidejoke related to your account and activity, including sign-in codes, notices about gifts and lists, and reminders. Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help. You can also turn off most notices in Settings. Sign-in codes will still be sent when you log in.</p>
          <p>When you ask us to text a list or invite to someone, we send one message on your behalf. We don't use your contacts' numbers for marketing.</p>
        </>) },
        { h: 'How long we keep it', body: (<>
          <p>We keep your information while your account is open. When you delete your account, we remove your profile and lists and stop using your information, except what we must keep for payments, tax, fraud prevention or legal reasons (for example, records of gifts and cash-outs), which we keep for as long as the law requires. Backups clear out on a rolling basis.</p>
        </>) },
        { h: 'Your choices and rights', body: (<>
          <ul>
            <li>Edit your profile, lists and notification settings anytime in the app.</li>
            <li>Delete your account in Settings.</li>
            <li>Ask us for a copy of your information, to correct it, or to delete it by writing to <Mail />.</li>
            <li>Depending on where you live (for example California, or the EU and UK), you may have additional rights, such as to know what we collect, to opt out of certain processing, or to complain to a data protection authority. We will not treat you differently for using them.</li>
          </ul>
        </>) },
        { h: 'Security', body: (<p>We use encryption in transit, keep payment details with our payment provider rather than on our servers, and limit who can access personal information. No service is perfectly secure, so please keep your phone and sign-in codes to yourself.</p>) },
        { h: 'Children', body: (<p>insidejoke is not for children under 13, and we don't knowingly collect their information. You must be 18 or older (or the age of majority where you live) to give money or cash out. A parent or guardian can make a list on a child's behalf. If you believe a child under 13 has given us information, contact us and we'll delete it.</p>) },
        { h: 'Where data is processed', body: (<p>insidejoke is run from the United States, and your information is stored and processed there. If you use insidejoke from elsewhere, you understand your information will be transferred to the US.</p>) },
        { h: 'Changes', body: (<p>If we change this policy, we'll update the date above, and for significant changes we'll tell you in the app or by text before they take effect.</p>) },
        { h: 'Contact', body: (<p>Questions or requests: <Mail />.</p>) }
      ]}
    />
  );
}
