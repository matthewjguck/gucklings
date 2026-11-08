import { Link } from 'react-router-dom'

export default function Terms() {
  return (
    <div className="min-h-screen bg-white px-6 pt-12 pb-16">
      <div className="mx-auto w-full max-w-2xl">
        <Link to="/" className="text-sm text-gray-600">&larr; back</Link>

        <h1 className="text-3xl font-bold text-black mt-6">Terms of Service</h1>
        <p className="text-sm text-gray-600 mt-2">Last updated: April 23, 2026</p>

        <div className="prose text-base text-black mt-8 space-y-5">
          <h2 className="text-lg font-semibold text-black mt-2">Program name</h2>
          <p>Inklings Personal Receipts.</p>

          <h2 className="text-lg font-semibold text-black mt-6">Service description</h2>
          <p>
            Inklings lets you compose a short personal note ("receipt") and send it as an SMS to a
            single recipient whose phone number you provide. Each send is initiated manually by the
            sender — we do not send recurring or automated messages.
          </p>

          <h2 className="text-lg font-semibold text-black mt-6">Message frequency</h2>
          <p>
            Messages are sent on-demand when a sender completes the flow in the app. There is no
            fixed schedule or recurring cadence.
          </p>

          <h2 className="text-lg font-semibold text-black mt-6">Message and data rates</h2>
          <p>
            <strong>Message and data rates may apply.</strong> Standard SMS rates from your mobile
            carrier apply to each message sent or received.
          </p>

          <h2 className="text-lg font-semibold text-black mt-6">Opt-out</h2>
          <p>
            Reply <strong>STOP</strong> to any Inklings SMS to opt out of future messages. You will
            receive one confirmation reply, then no further messages.
          </p>

          <h2 className="text-lg font-semibold text-black mt-6">Support</h2>
          <p>
            Reply <strong>HELP</strong> to any Inklings SMS for help. You can also email{' '}
            <a className="underline" href="mailto:hello@inklings.app">hello@inklings.app</a>.
          </p>

          <h2 className="text-lg font-semibold text-black mt-6">Consent</h2>
          <p>
            By entering a recipient's phone number in the Inklings web app, the sender represents
            that they have the recipient's permission to send a personal message to that number.
            Senders agree not to use the service for commercial, promotional, or bulk messaging.
          </p>

          <h2 className="text-lg font-semibold text-black mt-6">Prohibited use</h2>
          <p>
            You agree not to use Inklings to send unlawful, harassing, or unsolicited commercial
            messages. Accounts found in violation may be suspended without notice.
          </p>

          <h2 className="text-lg font-semibold text-black mt-6">Changes</h2>
          <p>
            We may update these terms at any time. Continued use of the service constitutes
            acceptance of the updated terms.
          </p>
        </div>
      </div>
    </div>
  )
}
