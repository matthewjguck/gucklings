import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-[var(--navbar-height)] items-center justify-between border-b border-border px-4">
        <h1 className="text-lg font-bold text-foreground">CAPSTONE</h1>
        <button
          onClick={signOut}
          className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          Sign out
        </button>
      </header>

      <main className="flex-1 px-4 py-6">
        <p className="text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{user?.email}</span>
        </p>
      </main>
    </div>
  )
}
