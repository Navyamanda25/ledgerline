import { useEffect, useState } from 'react'
import {
  Wallet, ShieldCheck, LayoutDashboard, CreditCard,
  ArrowLeftRight, FileText, Activity, LogOut, RefreshCw,
  Eye, EyeOff, LockKeyhole, Mail, CheckCircle2,
  Send, ArrowDownToLine, Clock, AlertCircle,
} from 'lucide-react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const SYSTEM_ACCOUNT_ID = '3'

// Shared style pieces (palette: mocha, silver, lavender)
const card = 'rounded-2xl border border-line bg-silver shadow-sm'
const field =
  'w-full rounded-xl border border-line bg-white text-ink outline-none focus:border-mocha focus:ring-2 focus:ring-mocha/20'
const primaryBtn =
  'rounded-xl bg-mocha font-semibold text-white hover:bg-mocha-dark disabled:cursor-not-allowed disabled:opacity-60'
const errorBox =
  'rounded-xl border border-bad/30 bg-bad/10 p-4 text-sm text-bad'

function formatINR(paise) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number(paise || 0) / 100)
}

function formatDate(date) {
  if (!date) return '—'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function rupeesToPaise(value) {
  const cleaned = value.trim()

  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error('Enter a valid amount with up to two decimal places.')
  }

  const [rupees, fraction = ''] = cleaned.split('.')
  const paise = BigInt(rupees) * 100n + BigInt(fraction.padEnd(2, '0'))

  if (paise <= 0n) {
    throw new Error('Amount must be greater than zero.')
  }

  return paise.toString()
}

function createIdempotencyKey() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `ledgerline-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function AccountList({ accounts, loading }) {
  if (loading && accounts.length === 0) {
    return (
      <div className={`${card} p-8 text-center text-muted`}>
        Loading accounts...
      </div>
    )
  }

  if (!accounts.length) {
    return (
      <div className={`${card} p-8 text-center text-muted`}>
        No accounts available.
      </div>
    )
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {accounts.map(account => (
        <div
          key={account.id}
          className={`${card} p-6 transition hover:border-mocha/50 hover:shadow-md`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-mocha/10 p-3">
                <CreditCard size={22} className="text-mocha" />
              </div>
              <div>
                <h4 className="font-semibold">{account.account_name}</h4>
                <p className="mt-1 text-xs text-muted">
                  {account.account_number}
                </p>
              </div>
            </div>

            <span className={`rounded-full px-3 py-1 text-xs font-medium ${
              account.is_active
                ? 'bg-good/10 text-good'
                : 'bg-bad/10 text-bad'
            }`}>
              {account.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="mt-8">
            <p className="text-xs tracking-wide text-muted">AVAILABLE BALANCE</p>
            <h3 className="mt-2 text-3xl font-semibold">
              {formatINR(account.balance_paise)}
            </h3>
          </div>

          <div className="mt-6 flex justify-between border-t border-line pt-4 text-xs text-muted">
            <span>Account type</span>
            <span className="capitalize">{account.account_type}</span>
          </div>
        </div>
      ))}
    </div>
  )
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
  const [activePage, setActivePage] = useState('Overview')

  const [transactionType, setTransactionType] = useState('withdrawal')
  const [sourceAccountId, setSourceAccountId] = useState('')
  const [destinationAccountId, setDestinationAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [transactionMessage, setTransactionMessage] = useState('')
  const [transactionSuccess, setTransactionSuccess] = useState(false)
  const [transactionLoading, setTransactionLoading] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState('')

  // Statement state
  const [selectedStatementAccount, setSelectedStatementAccount] = useState('')
  const [statementData, setStatementData] = useState([])
  const [statementAccount, setStatementAccount] = useState(null)
  const [statementLoading, setStatementLoading] = useState(false)
  const [statementError, setStatementError] = useState('')

  // Audit Trail state
  const [auditEvents, setAuditEvents] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState('')

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
        headers: { Authorization: `Bearer ${token}` },
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
    if (user) loadAccounts()
  }, [user])

  async function loadStatement(accountId) {
    if (!accountId) {
      setStatementData([])
      setStatementAccount(null)
      return
    }

    const token = sessionStorage.getItem('ledgerline_token')

    setStatementLoading(true)
    setStatementError('')
    setStatementData([])
    setStatementAccount(null)

    try {
      const response = await fetch(
        `${API_URL}/api/accounts/${accountId}/statement`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      const data = await response.json()

      if (response.status === 401) {
        handleLogout()
        setStatementError('Your session expired. Please sign in again.')
        return
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load this statement.')
      }

      setStatementAccount(data.account || null)
      setStatementData(data.statement || [])
    } catch (error) {
      setStatementError(
        error.message === 'Failed to fetch'
          ? 'Cannot connect to the backend. Check whether the server is running.'
          : error.message
      )
    } finally {
      setStatementLoading(false)
    }
  }

  useEffect(() => {
    if (activePage === 'Statements' && selectedStatementAccount) {
      loadStatement(selectedStatementAccount)
    }
  }, [activePage, selectedStatementAccount])

  async function loadAuditEvents() {
    const token = sessionStorage.getItem('ledgerline_token')

    if (!token) {
      setAuditError('Your session has expired. Please sign in again.')
      return
    }

    setAuditLoading(true)
    setAuditError('')

    try {
      const response = await fetch(`${API_URL}/api/audit`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()

      if (response.status === 401) {
        handleLogout()
        setAuditError('Your session has expired. Please sign in again.')
        return
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load audit events.')
      }

      setAuditEvents(data.events || [])
    } catch (error) {
      setAuditError(
        error.message === 'Failed to fetch'
          ? 'Cannot connect to the backend. Check whether the server is running.'
          : error.message
      )
    } finally {
      setAuditLoading(false)
    }
  }

  useEffect(() => {
    if (
      activePage === 'Audit trail' &&
      (user?.role === 'admin' || user?.role === 'auditor')
    ) {
      loadAuditEvents()
    }
  }, [activePage, user])

  async function handleSubmit(event) {
    event.preventDefault()
    setLoginMessage('')
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setActivePage('Overview')
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
    setStatementData([])
    setStatementAccount(null)
    setSelectedStatementAccount('')
    setAuditEvents([])
    setAuditError('')
    setActivePage('Overview')
  }

  function resetTransactionMessage() {
    setTransactionMessage('')
    setTransactionSuccess(false)
  }

  async function handleTransaction(event) {
    event.preventDefault()
    resetTransactionMessage()

    if (user?.role !== 'account_holder') {
      setTransactionMessage('Your role is not permitted to make transactions.')
      return
    }

    if (!sourceAccountId) {
      setTransactionMessage('Please select a source account.')
      return
    }

    if (transactionType === 'transfer' && !destinationAccountId) {
      setTransactionMessage('Please select a destination account.')
      return
    }

    if (
      transactionType === 'transfer' &&
      sourceAccountId === destinationAccountId
    ) {
      setTransactionMessage('Source and destination accounts must be different.')
      return
    }

    let amountPaise

    try {
      amountPaise = rupeesToPaise(amount)
    } catch (error) {
      setTransactionMessage(error.message)
      return
    }

    const key = idempotencyKey || createIdempotencyKey()

    if (!idempotencyKey) {
      setIdempotencyKey(key)
    }

    const payload = {
      type: transactionType,
      sourceAccountId: String(sourceAccountId),
      destinationAccountId:
        transactionType === 'withdrawal'
          ? SYSTEM_ACCOUNT_ID
          : String(destinationAccountId),
      amountPaise,
      idempotencyKey: key,
    }

    setTransactionLoading(true)

    try {
      const token = sessionStorage.getItem('ledgerline_token')

      const response = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Transaction could not be completed.')
      }

      setTransactionSuccess(true)
      setTransactionMessage(
        data.replayed
          ? 'This request was already processed. The original result has been returned.'
          : 'Transaction completed successfully!'
      )

      setAmount('')
      setIdempotencyKey('')
      setDestinationAccountId('')

      await loadAccounts()
    } catch (error) {
      setTransactionSuccess(false)
      setTransactionMessage(
        error.message === 'Failed to fetch'
          ? 'Could not reach the server. Retry this same request safely.'
          : error.message
      )
    } finally {
      setTransactionLoading(false)
    }
  }

  const totalBalance = accounts.reduce(
    (total, account) => total + Number(account.balance_paise || 0),
    0
  )

  const activeAccounts = accounts.filter(account => account.is_active)

  const selectedSource = accounts.find(
    account => String(account.id) === String(sourceAccountId)
  )

  const customerAccounts = accounts.filter(
    account =>
      account.is_active &&
      String(account.account_type || '').toLowerCase() !== 'system'
  )

  // ============================================
  // LOGIN SCREEN
  // ============================================

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-lavender p-5 text-ink">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-line bg-silver shadow-xl lg:grid-cols-2">
          <section className="hidden flex-col justify-center bg-mocha p-12 text-silver lg:flex">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lavender">
                <Wallet size={24} className="text-mocha" />
              </div>
              <h1 className="text-2xl font-bold text-white">LedgerLine</h1>
            </div>

            <div className="mt-20">
              <p className="text-sm font-semibold tracking-widest text-lavender">
                TRUST THROUGH TRANSPARENCY
              </p>
              <h2 className="mt-5 text-5xl font-semibold leading-tight text-white">
                Every rupee.<br />
                Every movement.<br />
                <span className="text-lavender">Accounted for.</span>
              </h2>
              <p className="mt-6 leading-7 text-silver/80">
                Manage accounts and move money with confidence. Every financial
                movement is recorded and traceable.
              </p>
            </div>
          </section>

          <section className="flex items-center justify-center p-8 sm:p-12">
            <div className="w-full max-w-md">
              <div className="mb-8 flex items-center gap-3 lg:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mocha">
                  <Wallet size={22} className="text-white" />
                </div>
                <h1 className="text-xl font-bold">LedgerLine</h1>
              </div>

              <p className="mb-3 text-sm font-semibold tracking-wide text-mocha">
                WELCOME BACK
              </p>
              <h2 className="text-3xl font-semibold">Sign in to LedgerLine</h2>
              <p className="mt-3 text-muted">
                Access your financial accounts securely.
              </p>

              <form onSubmit={handleSubmit} className="mt-9 space-y-6">
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={19} />
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
                      className={`${field} py-3.5 pl-12 pr-4`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-medium">
                    Password
                  </label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={19} />
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
                      className={`${field} py-3.5 pl-12 pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`${primaryBtn} w-full py-3.5`}
                >
                  {isLoading ? 'Signing in...' : 'Sign in to your account'}
                </button>

                {loginMessage && (
                  <p role="alert" className={errorBox}>
                    {loginMessage}
                  </p>
                )}
              </form>

              <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted">
                <ShieldCheck size={17} className="text-mocha" />
                Secure access to LedgerLine
              </div>
            </div>
          </section>
        </div>
      </main>
    )
  }

  // ============================================
  // ROLE-BASED NAVIGATION
  // ============================================

  const navigation = [
    { name: 'Overview', icon: LayoutDashboard },
    { name: 'My accounts', icon: CreditCard },
    { name: 'Transactions', icon: ArrowLeftRight },
    { name: 'Statements', icon: FileText },
    ...(user.role === 'admin' || user.role === 'auditor'
      ? [{ name: 'Audit trail', icon: Activity }]
      : []),
  ]

  const refreshing = accountsLoading || statementLoading || auditLoading

  return (
    <main className="flex min-h-screen bg-lavender text-ink">
      {/* SIDEBAR (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-mocha p-6 text-silver md:flex">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lavender">
            <Wallet size={22} className="text-mocha" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">LedgerLine</h1>
            <p className="text-xs text-silver/70">Financial platform</p>
          </div>
        </div>

        <p className="mb-4 text-xs font-semibold tracking-widest text-silver/60">
          WORKSPACE
        </p>

        <nav className="space-y-2">
          {navigation.map(item => {
            const Icon = item.icon

            return (
              <button
                key={item.name}
                type="button"
                onClick={() => setActivePage(item.name)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                  activePage === item.name
                    ? 'bg-lavender text-mocha'
                    : 'text-silver/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={19} />
                <span className="text-sm font-medium">{item.name}</span>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-white/15 pt-5">
          <div className="mb-4 px-1">
            <p className="text-sm font-medium text-white">{user.fullName}</p>
            <p className="text-xs capitalize text-silver/70">
              {String(user.role).replace('_', ' ')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-silver/85 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      {/* MAIN COLUMN */}
      <section className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* MOBILE MENU */}
        <div className="flex items-center gap-2 overflow-x-auto bg-mocha p-3 md:hidden">
          {navigation.map(item => (
            <button
              key={item.name}
              type="button"
              onClick={() => setActivePage(item.name)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
                activePage === item.name
                  ? 'bg-lavender text-mocha'
                  : 'text-silver/90'
              }`}
            >
              {item.name}
            </button>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="ml-auto whitespace-nowrap rounded-lg px-3 py-2 text-sm text-silver/90"
          >
            Sign out
          </button>
        </div>

        <div className="mx-auto w-full max-w-6xl flex-1 p-5 sm:p-8 lg:p-10">
          <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-wide text-mocha">
                YOUR FINANCIAL WORKSPACE
              </p>
              <h2 className="mt-2 text-3xl font-semibold">{activePage}</h2>
              <p className="mt-2 text-sm text-muted">
                Welcome back, {user.fullName}.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                loadAccounts()
                if (activePage === 'Statements' && selectedStatementAccount) {
                  loadStatement(selectedStatementAccount)
                }
                if (activePage === 'Audit trail') {
                  loadAuditEvents()
                }
              }}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-line bg-silver px-4 py-2.5 text-sm hover:bg-white disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </header>

          {accountsError && (
            <div className={`${errorBox} mb-6`}>
              {accountsError}
              <button type="button" onClick={loadAccounts} className="ml-3 underline">
                Try again
              </button>
            </div>
          )}

          {/* OVERVIEW */}

          {activePage === 'Overview' && (
            <>
              <div className="grid gap-5 lg:grid-cols-3">
                <div className="rounded-2xl bg-mocha p-6 text-white shadow-md lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm tracking-wide text-silver/85">
                      TOTAL ACCOUNT BALANCE
                    </p>
                    <div className="rounded-xl bg-white/15 p-3">
                      <Wallet size={22} className="text-lavender" />
                    </div>
                  </div>

                  {accountsLoading && accounts.length === 0 ? (
                    <p className="mt-6 text-2xl text-silver/80">Loading...</p>
                  ) : (
                    <h3 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                      {formatINR(totalBalance)}
                    </h3>
                  )}

                  <div className="mt-6 flex items-center gap-2 text-sm text-silver/85">
                    <ShieldCheck size={17} />
                    <span>Balances retrieved from your accounts API</span>
                  </div>
                </div>

                <div className={`${card} p-6`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm tracking-wide text-muted">ACTIVE ACCOUNTS</p>
                    <CreditCard size={22} className="text-mocha" />
                  </div>
                  <h3 className="mt-6 text-4xl font-semibold">
                    {accountsLoading && accounts.length === 0 ? '—' : activeAccounts.length}
                  </h3>
                  <p className="mt-3 text-sm text-muted">Accounts available to you</p>
                </div>
              </div>

              <div className="mt-10">
                <h3 className="text-xl font-semibold">Your accounts</h3>
                <p className="mb-5 mt-1 text-sm text-muted">Account balances and details</p>
                <AccountList accounts={accounts} loading={accountsLoading} />
              </div>
            </>
          )}

          {/* MY ACCOUNTS */}

          {activePage === 'My accounts' && (
            <div>
              <h3 className="text-xl font-semibold">Your accounts</h3>
              <p className="mb-6 mt-1 text-sm text-muted">
                View the accounts available to your user role.
              </p>
              <AccountList accounts={accounts} loading={accountsLoading} />
            </div>
          )}

          {/* TRANSACTIONS */}

          {activePage === 'Transactions' && (
            <div className="max-w-3xl">
              <div className="mb-7">
                <p className="text-sm font-semibold tracking-wide text-mocha">MONEY MOVEMENT</p>
                <h3 className="mt-2 text-2xl font-semibold">Make a transaction</h3>
                <p className="mt-2 text-sm text-muted">
                  Move money securely between your permitted accounts.
                </p>
              </div>

              {user.role !== 'account_holder' ? (
                <div className="rounded-2xl border border-warn/30 bg-warn/10 p-5 text-warn">
                  Transaction access is not enabled for your current role.
                </div>
              ) : (
                <form
                  onSubmit={handleTransaction}
                  className={`${card} space-y-6 p-6 sm:p-8`}
                >
                  <div>
                    <label className="mb-3 block text-sm font-medium">
                      Transaction type
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setTransactionType('withdrawal')
                          setDestinationAccountId('')
                          setIdempotencyKey('')
                          resetTransactionMessage()
                        }}
                        className={`flex items-center justify-center gap-2 rounded-xl border p-4 text-sm font-medium ${
                          transactionType === 'withdrawal'
                            ? 'border-mocha bg-mocha text-white'
                            : 'border-line bg-white text-muted hover:bg-lavender'
                        }`}
                      >
                        <ArrowDownToLine size={18} /> Withdraw
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTransactionType('transfer')
                          setIdempotencyKey('')
                          resetTransactionMessage()
                        }}
                        className={`flex items-center justify-center gap-2 rounded-xl border p-4 text-sm font-medium ${
                          transactionType === 'transfer'
                            ? 'border-mocha bg-mocha text-white'
                            : 'border-line bg-white text-muted hover:bg-lavender'
                        }`}
                      >
                        <Send size={18} /> Transfer
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="sourceAccount" className="mb-2 block text-sm font-medium">
                      From account
                    </label>
                    <select
                      id="sourceAccount"
                      value={sourceAccountId}
                      onChange={event => {
                        setSourceAccountId(event.target.value)
                        setIdempotencyKey('')
                        resetTransactionMessage()
                      }}
                      required
                      className={`${field} p-3.5`}
                    >
                      <option value="">Select source account</option>
                      {customerAccounts.map(account => (
                        <option key={account.id} value={String(account.id)}>
                          {account.account_name} · {account.account_number}
                        </option>
                      ))}
                    </select>

                    {selectedSource && (
                      <p className="mt-2 text-xs text-muted">
                        Available balance: {formatINR(selectedSource.balance_paise)}
                      </p>
                    )}

                    {customerAccounts.length === 0 && (
                      <p className="mt-2 text-xs text-warn">
                        No active customer accounts were returned by the accounts API.
                      </p>
                    )}
                  </div>

                  {transactionType === 'transfer' && (
                    <div>
                      <label htmlFor="destinationAccount" className="mb-2 block text-sm font-medium">
                        To account
                      </label>
                      <select
                        id="destinationAccount"
                        value={destinationAccountId}
                        onChange={event => {
                          setDestinationAccountId(event.target.value)
                          setIdempotencyKey('')
                          resetTransactionMessage()
                        }}
                        required
                        className={`${field} p-3.5`}
                      >
                        <option value="">Select destination account</option>
                        {customerAccounts
                          .filter(account => String(account.id) !== String(sourceAccountId))
                          .map(account => (
                            <option key={account.id} value={String(account.id)}>
                              {account.account_name} · {account.account_number}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label htmlFor="amount" className="mb-2 block text-sm font-medium">
                      Amount (INR)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">₹</span>
                      <input
                        id="amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="Enter amount"
                        value={amount}
                        onChange={event => {
                          setAmount(event.target.value)
                          setIdempotencyKey('')
                          resetTransactionMessage()
                        }}
                        required
                        className={`${field} py-3.5 pl-9 pr-4`}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      Amounts are converted to integer paise before being sent to the server.
                    </p>
                  </div>

                  {transactionMessage && (
                    <div
                      role="alert"
                      className={`rounded-xl border p-4 text-sm ${
                        transactionSuccess
                          ? 'border-good/30 bg-good/10 text-good'
                          : 'border-bad/30 bg-bad/10 text-bad'
                      }`}
                    >
                      {transactionMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={transactionLoading || accountsLoading || customerAccounts.length === 0}
                    className={`${primaryBtn} flex w-full items-center justify-center gap-2 py-3.5`}
                  >
                    {transactionLoading
                      ? 'Processing transaction...'
                      : transactionType === 'withdrawal'
                        ? 'Confirm withdrawal'
                        : 'Confirm transfer'}
                    {!transactionLoading && <ArrowLeftRight size={18} />}
                  </button>

                  <p className="text-xs leading-5 text-muted">
                    Your transaction is processed by the backend. Account permissions,
                    available balance, and transaction integrity are checked on the server.
                  </p>
                </form>
              )}
            </div>
          )}

          {/* STATEMENTS */}

          {activePage === 'Statements' && (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold tracking-wide text-mocha">ACCOUNT ACTIVITY</p>
                <h3 className="mt-2 text-2xl font-semibold">Account statements</h3>
                <p className="mt-2 text-sm text-muted">
                  View recorded money movements and account balances.
                </p>
              </div>

              <div className={`${card} p-6`}>
                <label htmlFor="statementAccount" className="mb-2 block text-sm font-medium">
                  Select account
                </label>

                <select
                  id="statementAccount"
                  value={selectedStatementAccount}
                  onChange={event => setSelectedStatementAccount(event.target.value)}
                  className={`${field} max-w-xl p-3.5`}
                >
                  <option value="">Choose an account to view its statement</option>
                  {customerAccounts.map(account => (
                    <option key={account.id} value={String(account.id)}>
                      {account.account_name} · {account.account_number}
                    </option>
                  ))}
                </select>
              </div>

              {statementError && (
                <div className={errorBox}>
                  <div className="flex items-center gap-2">
                    <AlertCircle size={18} />
                    {statementError}
                  </div>
                  <button
                    type="button"
                    onClick={() => loadStatement(selectedStatementAccount)}
                    className="mt-2 underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {statementLoading && (
                <div className={`${card} p-8 text-center text-muted`}>
                  <RefreshCw size={22} className="mx-auto mb-3 animate-spin text-mocha" />
                  Loading account statement...
                </div>
              )}

              {!selectedStatementAccount && (
                <div className={`${card} p-10 text-center`}>
                  <FileText size={32} className="mx-auto mb-3 text-mocha" />
                  <h4 className="font-semibold">Choose an account</h4>
                  <p className="mt-2 text-sm text-muted">
                    Select one of your accounts above to load its transaction history.
                  </p>
                </div>
              )}

              {selectedStatementAccount && !statementLoading && !statementError && (
                <>
                  {statementAccount && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className={`${card} p-5`}>
                        <p className="text-xs tracking-wide text-muted">ACCOUNT</p>
                        <h4 className="mt-2 font-semibold">
                          {statementAccount.accountName || statementAccount.account_name || 'Selected account'}
                        </h4>
                        <p className="mt-1 text-sm text-muted">
                          {statementAccount.accountNumber || statementAccount.account_number || ''}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-mocha p-5 text-white shadow-md">
                        <p className="text-xs tracking-wide text-silver/85">CURRENT BALANCE</p>
                        <h4 className="mt-2 text-2xl font-semibold">
                          {formatINR(
                            statementAccount.balancePaise ??
                            statementAccount.balance_paise ??
                            accounts.find(a => String(a.id) === String(selectedStatementAccount))?.balance_paise
                          )}
                        </h4>
                      </div>
                    </div>
                  )}

                  <div className={`${card} p-5`}>
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-semibold">Transaction history</h4>
                        <p className="mt-1 text-sm text-muted">
                          {statementData.length} statement entries
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-good">● Credit</span>
                        <span className="text-bad">● Debit</span>
                      </div>
                    </div>

                    {statementData.length === 0 ? (
                      <div className="py-10 text-center">
                        <Clock size={28} className="mx-auto mb-3 text-muted" />
                        <p className="font-medium">No statement entries found</p>
                        <p className="mt-2 text-sm text-muted">
                          Transactions for this account will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[850px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-line text-xs uppercase text-muted">
                              <th className="px-3 py-4">Date</th>
                              <th className="px-3 py-4">Transaction</th>
                              <th className="px-3 py-4">Entry</th>
                              <th className="px-3 py-4 text-right">Amount</th>
                              <th className="px-3 py-4 text-right">Balance</th>
                              <th className="px-3 py-4">Initiated by</th>
                              <th className="px-3 py-4">Status</th>
                            </tr>
                          </thead>

                          <tbody>
                            {statementData.map((entry, index) => {
                              const entryType = String(entry.entryType || '').toLowerCase()
                              const status = String(entry.status || 'success').toLowerCase()
                              const refused = status === 'refused'
                              const debit = entryType === 'debit'

                              const initiator =
                                entry.initiator?.name ||
                                entry.initiator?.fullName ||
                                entry.initiator?.email ||
                                entry.initiatorName ||
                                entry.initiatorEmail ||
                                entry.initiatedByName ||
                                entry.initiatedByEmail ||
                                '—'

                              return (
                                <tr
                                  key={`${entry.transactionId || 'entry'}-${index}`}
                                  className="border-b border-line/70 hover:bg-white/50"
                                >
                                  <td className="px-3 py-4 text-muted">
                                    {formatDate(entry.createdAt)}
                                  </td>

                                  <td className="px-3 py-4">
                                    <div className="font-medium capitalize">
                                      {entry.transactionType || 'Transaction'}
                                    </div>
                                    <div className="mt-1 text-xs text-muted">
                                      ID: {entry.transactionId || '—'}
                                    </div>
                                    {entry.reason && (
                                      <div className="mt-1 max-w-xs text-xs text-bad">
                                        {entry.reason}
                                      </div>
                                    )}
                                  </td>

                                  <td className="px-3 py-4">
                                    <span className={debit ? 'text-bad' : 'text-good'}>
                                      {refused ? 'Refused' : debit ? 'Debit' : entryType === 'credit' ? 'Credit' : '—'}
                                    </span>
                                  </td>

                                  <td className={`px-3 py-4 text-right font-medium ${
                                    refused ? 'text-muted' : debit ? 'text-bad' : 'text-good'
                                  }`}>
                                    {refused ? '—' : `${debit ? '−' : '+'}${formatINR(entry.amountPaise)}`}
                                  </td>

                                  <td className="px-3 py-4 text-right font-medium">
                                    {entry.runningBalancePaise == null
                                      ? '—'
                                      : formatINR(entry.runningBalancePaise)}
                                  </td>

                                  <td className="px-3 py-4 text-muted">
                                    {initiator}
                                  </td>

                                  <td className="px-3 py-4">
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                      refused
                                        ? 'bg-bad/10 text-bad'
                                        : 'bg-good/10 text-good'
                                    }`}>
                                      {refused ? 'Refused' : 'Successful'}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* AUDIT TRAIL - ADMIN AND AUDITOR ONLY */}

          {activePage === 'Audit trail' &&
            (user.role === 'admin' || user.role === 'auditor') && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold tracking-wide text-mocha">
                      SECURITY & ACCOUNTABILITY
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold">Audit trail</h3>
                    <p className="mt-2 text-sm text-muted">
                      Read-only record of successful, refused and failed activities.
                    </p>
                  </div>

                  <div className={`${card} px-4 py-3 text-sm`}>
                    {auditEvents.length} events loaded
                  </div>
                </div>

                {auditError && (
                  <div className={errorBox}>
                    <div className="flex items-center gap-2">
                      <AlertCircle size={18} />
                      {auditError}
                    </div>
                    <button
                      type="button"
                      onClick={loadAuditEvents}
                      className="mt-2 underline"
                    >
                      Try again
                    </button>
                  </div>
                )}

                <div className={`${card} overflow-hidden`}>
                  <div className="flex items-center justify-between border-b border-line px-5 py-4">
                    <div>
                      <h4 className="font-semibold">Recorded events</h4>
                      <p className="mt-1 text-xs text-muted">
                        Latest 200 events, newest first
                      </p>
                    </div>
                    <span className="text-xs text-muted">Read only</span>
                  </div>

                  {auditLoading ? (
                    <div className="py-12 text-center text-muted">
                      <RefreshCw size={24} className="mx-auto mb-3 animate-spin text-mocha" />
                      Loading audit events...
                    </div>
                  ) : auditEvents.length === 0 && !auditError ? (
                    <div className="py-12 text-center">
                      <Activity size={30} className="mx-auto mb-3 text-muted" />
                      <p className="font-medium">No audit events found</p>
                      <p className="mt-2 text-sm text-muted">
                        Recorded system activities will appear here.
                      </p>
                    </div>
                  ) : auditEvents.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-line text-xs uppercase text-muted">
                            <th className="px-5 py-4">Date & time</th>
                            <th className="px-5 py-4">Actor</th>
                            <th className="px-5 py-4">Activity</th>
                            <th className="px-5 py-4">Outcome</th>
                            <th className="px-5 py-4">Event details</th>
                          </tr>
                        </thead>

                        <tbody>
                          {auditEvents.map(event => {
                            const outcome = String(event.outcome || '').toLowerCase()

                            const outcomeClass = outcome === 'success'
                              ? 'bg-good/10 text-good'
                              : outcome === 'refused'
                                ? 'bg-warn/15 text-warn'
                                : 'bg-bad/10 text-bad'

                            return (
                              <tr
                                key={event.id}
                                className="border-b border-line/70 align-top hover:bg-white/50"
                              >
                                <td className="whitespace-nowrap px-5 py-4 text-muted">
                                  {formatDate(event.created_at)}
                                  <div className="mt-1 text-xs">
                                    Event #{event.id}
                                  </div>
                                </td>

                                <td className="px-5 py-4">
                                  <div className="font-medium">
                                    {event.actor_name || 'System / unavailable user'}
                                  </div>
                                  <div className="mt-1 text-xs text-muted">
                                    {event.actor_email ||
                                      (event.actor_user_id
                                        ? `User ID: ${event.actor_user_id}`
                                        : 'No user ID')}
                                  </div>
                                </td>

                                <td className="px-5 py-4">
                                  <span className="font-medium">
                                    {event.event_type || 'Unknown event'}
                                  </span>
                                </td>

                                <td className="px-5 py-4">
                                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${outcomeClass}`}>
                                    {outcome || 'unknown'}
                                  </span>
                                </td>

                                <td className="max-w-md px-5 py-4">
                                  <pre className="whitespace-pre-wrap break-words rounded-lg bg-white/60 p-3 font-mono text-xs leading-5 text-muted">
                                    {JSON.stringify(event.details || {}, null, 2)}
                                  </pre>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

          {/* SECURITY FOOTER CARD */}

          <div className={`${card} mt-10 flex flex-wrap items-center justify-between gap-4 p-5`}>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-mocha/10 p-3">
                <ShieldCheck size={22} className="text-mocha" />
              </div>
              <div>
                <p className="text-sm font-medium">Secure account access</p>
                <p className="mt-1 text-xs capitalize text-muted">
                  Signed in as {String(user.role).replace('_', ' ')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-good">
              <CheckCircle2 size={16} /> Authenticated session
            </div>
          </div>
        </div>

        <footer className="border-t border-line py-5 text-center text-xs text-muted">
          © 2026 LedgerLine · Every rupee accounted for.
        </footer>
      </section>
    </main>
  )
}

export default App