
import { useState } from 'react'
import {
  Wallet,
  ShieldCheck,
  ArrowUpRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Activity,
  CheckCircle2,
} from 'lucide-react'
import './App.css'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')

  function handleSubmit(event) {
    event.preventDefault()

    setMessage(
      'Login interface is ready. Backend authentication will be connected next.'
    )
  }

  return (
    <main className="min-h-screen bg-[#0b1120] text-white flex items-center justify-center p-5">

      <div className="w-full max-w-6xl min-h-[650px] grid lg:grid-cols-2 overflow-hidden rounded-3xl border border-slate-800 bg-[#111827] shadow-2xl">

        {/* LEFT PANEL */}
        <section className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-[#142b31] via-[#10242c] to-[#111827]">

          <div>
            {/* BRAND */}
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-emerald-500 flex items-center justify-center">
                <Wallet size={24} className="text-slate-950" />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  LedgerLine
                </h1>
                <p className="text-xs text-slate-400">
                  Financial operations platform
                </p>
              </div>
            </div>

            {/* INTRODUCTION */}
            <div className="mt-24">
              <p className="text-emerald-400 text-sm font-semibold tracking-widest uppercase">
                Trust through transparency
              </p>

              <h2 className="mt-5 text-5xl font-semibold leading-tight text-white">
                Every rupee.
                <br />
                Every movement.
                <br />
                <span className="text-emerald-400">
                  Accounted for.
                </span>
              </h2>

              <p className="mt-6 max-w-md text-slate-400 leading-7">
                Manage accounts and move money with confidence.
                Every financial movement is recorded and traceable
                through a verifiable ledger.
              </p>
            </div>
          </div>

          {/* FEATURE CARDS */}
          <div className="space-y-5">

            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <ShieldCheck size={23} className="text-emerald-400" />
              </div>

              <div>
                <p className="font-medium text-white">
                  Security-first operations
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Access controlled by user permissions.
                </p>
              </div>

              <CheckCircle2 className="ml-auto text-emerald-400" size={20} />
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Activity size={23} className="text-blue-400" />
              </div>

              <div>
                <p className="font-medium text-white">
                  Traceable transactions
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Financial activity recorded in a ledger.
                </p>
              </div>

              <ArrowUpRight className="ml-auto text-slate-400" size={20} />
            </div>

            <p className="text-xs text-slate-500">
              LedgerLine · Secure financial record management
            </p>
          </div>
        </section>

        {/* RIGHT PANEL - LOGIN */}
        <section className="flex items-center justify-center p-7 sm:p-12 lg:p-16">

          <div className="w-full max-w-md">

            {/* MOBILE BRAND */}
            <div className="lg:hidden flex items-center gap-3 mb-12">
              <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                <Wallet size={22} className="text-slate-950" />
              </div>

              <h1 className="text-2xl font-bold text-white">
                LedgerLine
              </h1>
            </div>

            {/* LOGIN HEADING */}
            <div className="mb-9">
              <p className="text-sm font-medium text-emerald-400 mb-3 tracking-wider">
                WELCOME BACK
              </p>

              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
                Sign in to LedgerLine
              </h2>

              <p className="mt-3 text-slate-400">
                Access your account and manage your financial activity.
              </p>
            </div>

            {/* LOGIN FORM */}
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* EMAIL FIELD */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={19}
                    aria-hidden="true"
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                  />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setMessage('')
                    }}
                    autoComplete="username"
                    required
                    style={{ paddingLeft: '48px' }}
                    className="w-full rounded-xl border border-slate-700 bg-[#0b1120] py-3.5 pr-4 text-white placeholder:text-slate-600 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* PASSWORD FIELD */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={19}
                    aria-hidden="true"
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                  />

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setMessage('')
                    }}
                    autoComplete="current-password"
                    required
                    style={{
                      paddingLeft: '48px',
                      paddingRight: '48px',
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-[#0b1120] py-3.5 text-white placeholder:text-slate-600 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </div>

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-500 py-3.5 font-semibold text-slate-950 transition hover:bg-emerald-400 active:scale-[0.99]"
              >
                Sign in to your account
              </button>

              {/* STATUS MESSAGE */}
              {message && (
                <p
                  role="status"
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300"
                >
                  {message}
                </p>
              )}

            </form>

            {/* SECURITY MESSAGE */}
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500">
              <ShieldCheck size={17} className="text-emerald-400" />
              Secure access to LedgerLine
            </div>

            {/* FOOTER */}
            <p className="mt-12 text-center text-xs text-slate-600">
              © 2026 LedgerLine. Financial activity with accountability.
            </p>

          </div>
        </section>

      </div>
    </main>
  )
}

export default App
