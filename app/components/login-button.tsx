import { Link } from 'remix';

export function LoginButton() {
	return <Link to="/auth/login">Login</Link>;
}
