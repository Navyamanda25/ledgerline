
import { useEffect, useState } from 'react'
import {
  Wallet,
  ShieldCheck,
  LayoutDashboard,
  CreditCard,
  ArrowLeftRight,
  FileText,
  Activity,
  LogOut,
  RefreshCw,
  TrendingUp,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  CheckCircle2,
} from 'lucide-react'
import './App.css'

const API_URL = 'http://localhost:5000'

function formatINR(paise) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number(paise) / 100)
}

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginMessage, setLoginMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('ledgerline_user') || 'null')
    } catch {
      return null
    }
  })

  const [accounts, setAccounts] = useState([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [accountsError, setAccountsError] = useState('')

  async function loadAccounts() {
    const token = sessionStorage.getItem('ledgerline_token')

    if (!token) {
      handleLogout()
      return
    }

    setAccountsLoading(true)
    setAccountsError('')

    try {
      const response = await fetch(`${API_URL}/api/accounts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.status === 401) {
        handleLogout()
        setLoginMessage('Your session expired. Please sign in again.')
        return
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load accounts.')
      }

      setAccounts(data.accounts || [])
    } catch (error) {
      setAccountsError(
        error.message === 'Failed to fetch'
          ? 'Cannot connect to the backend. Check whether the server is running.'
          : error.message
      )
    } finally {
      setAccountsLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadAccounts()
    }
  }, [user])

  async function handleSubmit(event) {
    event.preventDefault()
    setLoginMessage('')
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Login failed.')
      }

      sessionStorage.setItem('ledgerline_token', data.token)
      sessionStorage.setItem('ledgerline_user', JSON.stringify(data.user))

      setUser(data.user)
      setPassword('')
    } catch (error) {
      setLoginMessage(
        error.message === 'Failed to fetch'
          ? 'Unable to connect to the backend. Please check the server.'
          : error.message
      )
    } finally {
      setIsLoading(false)
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('ledgerline_token')
    sessionStorage.removeItem('ledgerline_user')
    setUser(null)
    setAccounts([])
    setEmail('')
    setPassword('')
    setLoginMessage('')
    setAccountsError('')
  }

  const totalBalance = accounts.reduce(
    (total, account) => total + Number(account.balance_paise || 0),
    0
  )

  const activeAccounts = accounts.filter(account => account.is_active)

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0b1120] text-white flex items-center justify-center p-5">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 overflow-hidden rounded-3xl border border-slate-800 bg-[#111827] shadow-2xl">

          <section className="hidden lg:flex flex-col justify-center p-12 bg-gradient-to-br from-[#142b31] via-[#10242c] to-[#111827]">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-emerald-500 flex items-center justify-center">
                <Wallet size={24} className="text-slate-950" />
              </div>
              <h1 className="text-2xl font-bold">LedgerLine</h1>
            </div>

            <div className="mt-24">
              <p className="text-emerald-400 text-sm font-semibold tracking-widest">
                TRUST THROUGH TRANSPARENCY
              </p>
              <h2 className="mt-5 text-5xl font-semibold leading-tight">
                Every rupee.
                <br />
                Every movement.
                <br />
                <span className="text-emerald-400">Accounted for.</span>
              </h2>
              <p className="mt-6 text-slate-400 leading-7">
                Manage accounts and move money with confidence.
                Every financial movement is recorded and traceable.
              </p>
            </div>
          </section>

          <section className="flex items-center justify-center p-8 sm:p-12">
            <div className="w-full max-w-md">
              <p className="text-emerald-400 text-sm font-semibold mb-3">
                WELCOME BACK
              </p>
              <h2 className="text-3xl font-semibold">
                Sign in to LedgerLine
              </h2>
              <p className="mt-3 text-slate-400">
                Access your financial accounts securely.
              </p>

              <form onSubmit={handleSubmit} className="mt-9 space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm text-slate-300 mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={19} />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value)
                        setLoginMessage('')
                      }}
                      placeholder="name@example.com"
                      required
                      autoComplete="username"
                      className="w-full rounded-xl border border-slate-700 bg-[#0b1120] py-3.5 pl-12 pr-4 text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm text-slate-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={19} />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value)
                        setLoginMessage('')
                      }}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-slate-700 bg-[#0b1120] py-3.5 pl-12 pr-12 text-white outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl bg-emerald-500 py-3.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                >
                  {isLoading ? 'Signing in...' : 'Sign in to your account'}
                </button>

                {loginMessage && (
                  <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                    {loginMessage}
                  </p>
                )}
              </form>

              <div className="mt-8 flex justify-center items-center gap-2 text-sm text-slate-500">
                <ShieldCheck size={17} className="text-emerald-400" />
                Secure access to LedgerLine
              </div>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0b1120] text-white flex">

      {/* SIDEBAR */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-slate-800 bg-[#111827] p-6">
        <div className="flex items-center gap-3 mb-12">
          <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center">
            <Wallet size={22} className="text-slate-950" />
          </div>
          <div>
            <h1 className="text-xl font-bold">LedgerLine</h1>
            <p className="text-xs text-slate-500">Financial platform</p>
          </div>
        </div>

        <p className="text-xs font-semibold tracking-widest text-slate-500 mb-4">
          WORKSPACE
        </p>

        <nav className="space-y-2">
          <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 px-4 py-3 text-emerald-400">
            <LayoutDashboard size={19} />
            <span className="text-sm font-medium">Overview</span>
          </div>

          <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-400">
            <CreditCard size={19} />
            <span className="text-sm">My accounts</span>
          </div>

          <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-400">
            <ArrowLeftRight size={19} />
            <span className="text-sm">Transactions</span>
          </div>

          <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-400">
            <FileText size={19} />
            <span className="text-sm">Statements</span>
          </div>

          <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-400">
            <Activity size={19} />
            <span className="text-sm">Audit trail</span>
          </div>
        </nav>

        <div className="mt-auto border-t border-slate-800 pt-5">
          <div className="mb-4">
            <p className="text-sm font-medium">{user.fullName}</p>
            <p className="text-xs text-slate-500">{user.role}</p>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <section className="flex-1 min-w-0 p-5 sm:p-8 lg:p-10">

        <header className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div>
            <p className="text-sm text-emerald-400">YOUR FINANCIAL WORKSPACE</p>
            <h2 className="mt-2 text-3xl font-semibold">Dashboard</h2>
            <p className="mt-2 text-sm text-slate-400">
              Welcome back, {user.fullName}.
            </p>
          </div>

          <button
            onClick={loadAccounts}
            disabled={accountsLoading}
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw size={16} className={accountsLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </header>

        {/* BALANCE CARDS */}
        {accountsError && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {accountsError}
            <button onClick={loadAccounts} className="ml-3 underline">
              Try again
            </button>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-3">

          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-[#123c36] to-[#10242c] p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-emerald-200">TOTAL ACCOUNT BALANCE</p>
              <div className="rounded-xl bg-white/10 p-3">
                <Wallet size={22} className="text-emerald-300" />
              </div>
            </div>

            {accountsLoading && accounts.length === 0 ? (
              <p className="mt-6 text-2xl text-slate-300">Loading...</p>
            ) : (
              <h3 className="mt-5 text-4xl sm:text-5xl font-semibold tracking-tight">
                {formatINR(totalBalance)}
              </h3>
            )}

            <div className="mt-6 flex items-center gap-2 text-sm text-emerald-200">
              <ShieldCheck size={17} />
              <span>Balances retrieved from your accounts API</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#111827] p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">ACTIVE ACCOUNTS</p>
              <CreditCard size={22} className="text-emerald-400" />
            </div>

            <h3 className="mt-6 text-4xl font-semibold">
              {accountsLoading && accounts.length === 0 ? '—' : activeAccounts.length}
            </h3>

            <p className="mt-3 text-sm text-slate-500">
              Accounts available to you
            </p>
          </div>
        </div>

        {/* ACCOUNTS SECTION */}
        <div className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-xl font-semibold">Your accounts</h3>
              <p className="mt-1 text-sm text-slate-500">
                Account balances and details
              </p>
            </div>
            <span className="text-xs rounded-lg border border-slate-700 px-3 py-2 text-slate-400">
              INR · Indian Rupee
            </span>
          </div>

          {accountsLoading && accounts.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#111827] p-8 text-center text-slate-400">
              Loading your accounts...
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#111827] p-8 text-center text-slate-400">
              No accounts are currently available.
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {accounts.map(account => (
                <div
                  key={account.id}
                  className="rounded-2xl border border-slate-800 bg-[#111827] p-6 transition hover:border-emerald-500/40"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-emerald-500/10 p-3">
                        <CreditCard size={22} className="text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{account.account_name}</h4>
                        <p className="mt-1 text-xs text-slate-500">
                          {account.account_number}
                        </p>
                      </div>
                    </div>

                    <span className={`rounded-full px-3 py-1 text-xs ${
                      account.is_active
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {account.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="mt-8">
                    <p className="text-xs text-slate-500">AVAILABLE BALANCE</p>
                    <h3 className="mt-2 text-3xl font-semibold">
                      {formatINR(account.balance_paise)}
                    </h3>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-500">
                    <span>Account type</span>
                    <span className="capitalize">{account.account_type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECURITY INFORMATION */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-[#111827] p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-3">
              <ShieldCheck size={22} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Secure account access</p>
              <p className="mt-1 text-xs text-slate-500">
                Signed in as {user.role}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 size={16} />
            Authenticated session
          </div>
        </div>

        <footer className="mt-10 border-t border-slate-800 pt-5 text-center text-xs text-slate-600">
          © 2026 LedgerLine · Every rupee accounted for.
        </footer>
      </section>
    </main>
  )
}

export default App
