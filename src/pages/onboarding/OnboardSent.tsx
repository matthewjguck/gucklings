import { Link } from 'react-router-dom'

export default function OnboardSent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-callout text-text-secondary uppercase tracking-[0.2em]">sent</p>
        <h1 className="text-regular-semibold text-text-primary mt-3">
          Your Inkling was sent!
        </h1>
        <p className="text-subheadline text-text-secondary mt-3">
          We've emailed your friend a link to read and print it.
        </p>

        <Link
          to="/home"
          className="text-headline text-text-inverse bg-fill-primary rounded-md mt-10 flex w-full h-14 items-center justify-center"
        >
          Done
        </Link>
      </div>
    </div>
  )
}
