import SignupPage from '../signup/page';

export const dynamic = 'force-dynamic';

export default function LoginPage(props) {
  return <SignupPage {...props} title="Log in" />;
}
