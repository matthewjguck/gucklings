import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-bg-base px-6">
      <div className="flex flex-1 flex-col justify-center">
        <h1 className="text-regular-semibold text-text-primary">Inklings</h1>
        <p className="text-body text-text-primary mt-2">
          Send a little paper note to someone. We'll walk you through it.
        </p>

        <Link
          to="/signup"
          className="text-headline text-text-inverse bg-fill-primary rounded-md mt-8 flex w-full h-14 items-center justify-center"
        >
          Create an account
        </Link>

        <Link
          to="/login"
          className="text-callout text-text-primary mt-4 w-full text-center"
        >
          Log in
        </Link>
      </div>
    </div>
  )
}
