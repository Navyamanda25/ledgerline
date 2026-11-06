
import { useEffect, useState } from 'react'
import {
  Wallet, ShieldCheck, LayoutDashboard, CreditCard,
  ArrowLeftRight, FileText, Activity, LogOut, RefreshCw,
  Eye, EyeOff, LockKeyhole, Mail, CheckCircle2,
  Send, ArrowDownToLine, Clock, AlertCircle,
} from 'lucide-react'
import './App.css'

const API_URL = 'http://localhost:5000'
const SYSTEM_ACCOUNT_ID = '3'

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
      <div className="rounded-2xl border border-slate-800 bg-[#111827] p-8 text-center text-slate-400">
        Loading accounts...
      </div>
    )
  }

  if (!accounts.length) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-[#111827] p-8 text-center text-slate-400">
        No accounts available.
      </div>
    )
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {accounts.map(account => (
        <div
          key={account.id}
          className="rounded-2xl border border-slate-800 bg-[#111827] p-6 hover:border-emerald-500/40"
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

          <div className="mt-6 flex justify-between border-t border-slate-800 pt-4 text-xs text-slate-500">
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
                Every rupee.<br />
                Every movement.<br />
                <span className="text-emerald-400">Accounted for.</span>
              </h2>
              <p className="mt-6 text-slate-400 leading-7">
                Manage accounts and move money with confidence. Every financial
                movement is recorded and traceable.
              </p>
            </div>
          </section>

          <section className="flex items-center justify-center p-8 sm:p-12">
            <div className="w-full max-w-md">
              <p className="text-emerald-400 text-sm font-semibold mb-3">
                WELCOME BACK
              </p>
              <h2 className="text-3xl font-semibold">Sign in to LedgerLine</h2>
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

  const navigation = [
    { name: 'Overview', icon: LayoutDashboard },
    { name: 'My accounts', icon: CreditCard },
    { name: 'Transactions', icon: ArrowLeftRight },
    { name: 'Statements', icon: FileText },
    { name: 'Audit trail', icon: Activity },
  ]

  return (
    <main className="min-h-screen bg-[#0b1120] text-white flex">
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
          {navigation.map(item => {
            const Icon = item.icon

            return (
              <button
                key={item.name}
                type="button"
                onClick={() => setActivePage(item.name)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                  activePage === item.name
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={19} />
                <span className="text-sm font-medium">{item.name}</span>
              </button>
            )
          })}
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
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      <section className="flex-1 min-w-0 p-5 sm:p-8 lg:p-10">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div>
            <p className="text-sm text-emerald-400">YOUR FINANCIAL WORKSPACE</p>
            <h2 className="mt-2 text-3xl font-semibold">{activePage}</h2>
            <p className="mt-2 text-sm text-slate-400">
              Welcome back, {user.fullName}.
            </p>
          </div>

          <button
            onClick={() => {
              loadAccounts()
              if (activePage === 'Statements' && selectedStatementAccount) {
                loadStatement(selectedStatementAccount)
              }
            }}
            disabled={accountsLoading || statementLoading}
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw size={16} className={accountsLoading || statementLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </header>

        {accountsError && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {accountsError}
            <button onClick={loadAccounts} className="ml-3 underline">
              Try again
            </button>
          </div>
        )}

        {activePage === 'Overview' && (
          <>
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-[#123c36] to-[#10242c] p-6 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-emerald-200">TOTAL ACCOUNT BALANCE</p>
                  <div className="rounded-xl bg-white/10 p-3">
                    <Wallet size={22} className="text-emerald-300" />
                  </div>
                </div>

                {accountsLoading && accounts.length === 0
                  ? <p className="mt-6 text-2xl text-slate-300">Loading...</p>
                  : <h3 className="mt-5 text-4xl sm:text-5xl font-semibold tracking-tight">{formatINR(totalBalance)}</h3>}

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
                <p className="mt-3 text-sm text-slate-500">Accounts available to you</p>
              </div>
            </div>

            <div className="mt-10">
              <h3 className="text-xl font-semibold">Your accounts</h3>
              <p className="mt-1 mb-5 text-sm text-slate-500">Account balances and details</p>
              <AccountList accounts={accounts} loading={accountsLoading} />
            </div>
          </>
        )}

        {activePage === 'My accounts' && (
          <div>
            <h3 className="text-xl font-semibold">Your accounts</h3>
            <p className="mt-1 mb-6 text-sm text-slate-500">
              View the accounts available to your user role.
            </p>
            <AccountList accounts={accounts} loading={accountsLoading} />
          </div>
        )}

        {activePage === 'Transactions' && (
          <div className="max-w-3xl">
            <div className="mb-7">
              <p className="text-sm text-emerald-400 font-medium">MONEY MOVEMENT</p>
              <h3 className="mt-2 text-2xl font-semibold">Make a transaction</h3>
              <p className="mt-2 text-sm text-slate-400">
                Move money securely between your permitted accounts.
              </p>
            </div>

            {user.role !== 'account_holder' ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-200">
                Transaction access is not enabled for your current role.
              </div>
            ) : (
              <form
                onSubmit={handleTransaction}
                className="rounded-2xl border border-slate-800 bg-[#111827] p-6 sm:p-8 space-y-6"
              >
                <div>
                  <label className="mb-3 block text-sm font-medium text-slate-300">
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
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-slate-700 text-slate-400 hover:bg-slate-800'
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
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <Send size={18} /> Transfer
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="sourceAccount" className="mb-2 block text-sm text-slate-300">
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
                    className="w-full rounded-xl border border-slate-700 bg-[#0b1120] p-3.5 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="">Select source account</option>
                    {customerAccounts.map(account => (
                      <option key={account.id} value={String(account.id)}>
                        {account.account_name} · {account.account_number}
                      </option>
                    ))}
                  </select>

                  {selectedSource && (
                    <p className="mt-2 text-xs text-slate-500">
                      Available balance: {formatINR(selectedSource.balance_paise)}
                    </p>
                  )}

                  {customerAccounts.length === 0 && (
                    <p className="mt-2 text-xs text-amber-300">
                      No active customer accounts were returned by the accounts API.
                    </p>
                  )}
                </div>

                {transactionType === 'transfer' && (
                  <div>
                    <label htmlFor="destinationAccount" className="mb-2 block text-sm text-slate-300">
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
                      className="w-full rounded-xl border border-slate-700 bg-[#0b1120] p-3.5 text-white outline-none focus:border-emerald-500"
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
                  <label htmlFor="amount" className="mb-2 block text-sm text-slate-300">
                    Amount (INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
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
                      className="w-full rounded-xl border border-slate-700 bg-[#0b1120] py-3.5 pl-9 pr-4 text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Amounts are converted to integer paise before being sent to the server.
                  </p>
                </div>

                {transactionMessage && (
                  <div
                    role="alert"
                    className={`rounded-xl border p-4 text-sm ${
                      transactionSuccess
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-red-500/30 bg-red-500/10 text-red-300'
                    }`}
                  >
                    {transactionMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={transactionLoading || accountsLoading || customerAccounts.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {transactionLoading
                    ? 'Processing transaction...'
                    : transactionType === 'withdrawal'
                      ? 'Confirm withdrawal'
                      : 'Confirm transfer'}
                  {!transactionLoading && <ArrowLeftRight size={18} />}
                </button>

                <p className="text-xs leading-5 text-slate-500">
                  Your transaction is processed by the backend. Account permissions,
                  available balance, and transaction integrity are checked on the server.
                </p>
              </form>
            )}
          </div>
        )}

        {activePage === 'Statements' && (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-emerald-400">ACCOUNT ACTIVITY</p>
              <h3 className="mt-2 text-2xl font-semibold">Account statements</h3>
              <p className="mt-2 text-sm text-slate-400">
                View recorded money movements and account balances.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#111827] p-6">
              <label
                htmlFor="statementAccount"
                className="mb-2 block text-sm text-slate-300"
              >
                Select account
              </label>

              <select
                id="statementAccount"
                value={selectedStatementAccount}
                onChange={event => setSelectedStatementAccount(event.target.value)}
                className="w-full max-w-xl rounded-xl border border-slate-700 bg-[#0b1120] p-3.5 text-white outline-none focus:border-emerald-500"
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
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                <div className="flex items-center gap-2">
                  <AlertCircle size={18} />
                  {statementError}
                </div>
                <button
                  onClick={() => loadStatement(selectedStatementAccount)}
                  className="mt-2 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {statementLoading && (
              <div className="rounded-2xl border border-slate-800 bg-[#111827] p-8 text-center text-slate-400">
                <RefreshCw size={22} className="mx-auto mb-3 animate-spin text-emerald-400" />
                Loading account statement...
              </div>
            )}

            {!selectedStatementAccount && (
              <div className="rounded-2xl border border-slate-800 bg-[#111827] p-8 text-center">
                <FileText size={32} className="mx-auto mb-3 text-emerald-400" />
                <h4 className="font-semibold">Choose an account</h4>
                <p className="mt-2 text-sm text-slate-400">
                  Select one of your accounts above to load its transaction history.
                </p>
              </div>
            )}

            {selectedStatementAccount && !statementLoading && !statementError && (
              <>
                {statementAccount && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-800 bg-[#111827] p-5">
                      <p className="text-xs text-slate-500">ACCOUNT</p>
                      <h4 className="mt-2 font-semibold">
                        {statementAccount.accountName || statementAccount.account_name || 'Selected account'}
                      </h4>
                      <p className="mt-1 text-sm text-slate-400">
                        {statementAccount.accountNumber || statementAccount.account_number || ''}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-[#123c36] to-[#10242c] p-5">
                      <p className="text-xs text-emerald-200">CURRENT BALANCE</p>
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

                <div className="rounded-2xl border border-slate-800 bg-[#111827] p-5">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-semibold">Transaction history</h4>
                      <p className="mt-1 text-sm text-slate-400">
                        {statementData.length} statement entries
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="text-emerald-400">● Credit</span>
                      <span className="text-red-400">● Debit</span>
                    </div>
                  </div>

                  {statementData.length === 0 ? (
                    <div className="py-10 text-center">
                      <Clock size={28} className="mx-auto mb-3 text-slate-500" />
                      <p className="font-medium">No statement entries found</p>
                      <p className="mt-2 text-sm text-slate-500">
                        Transactions for this account will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[850px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-700 text-xs uppercase text-slate-500">
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
                              '—'

                            return (
                              <tr
                                key={`${entry.transactionId || 'entry'}-${index}`}
                                className="border-b border-slate-800/80 hover:bg-slate-800/30"
                              >
                                <td className="px-3 py-4 text-slate-400">
                                  {formatDate(entry.createdAt)}
                                </td>

                                <td className="px-3 py-4">
                                  <div className="font-medium capitalize">
                                    {entry.transactionType || 'Transaction'}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    ID: {entry.transactionId || '—'}
                                  </div>
                                  {entry.reason && (
                                    <div className="mt-1 max-w-xs text-xs text-red-300">
                                      {entry.reason}
                                    </div>
                                  )}
                                </td>

                                <td className="px-3 py-4">
                                  <span className={debit ? 'text-red-400' : 'text-emerald-400'}>
                                    {refused ? 'Refused' : debit ? 'Debit' : entryType === 'credit' ? 'Credit' : '—'}
                                  </span>
                                </td>

                                <td className={`px-3 py-4 text-right font-medium ${
                                  refused ? 'text-slate-400' : debit ? 'text-red-400' : 'text-emerald-400'
                                }`}>
                                  {refused ? '—' : `${debit ? '−' : '+'}${formatINR(entry.amountPaise)}`}
                                </td>

                                <td className="px-3 py-4 text-right font-medium">
                                  {entry.runningBalancePaise == null
                                    ? '—'
                                    : formatINR(entry.runningBalancePaise)}
                                </td>

                                <td className="px-3 py-4 text-slate-400">
                                  {initiator}
                                </td>

                                <td className="px-3 py-4">
                                  <span className={`rounded-full px-2.5 py-1 text-xs ${
                                    refused
                                      ? 'bg-red-500/10 text-red-400'
                                      : 'bg-emerald-500/10 text-emerald-400'
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

        {activePage === 'Audit trail' && (
          <div className="rounded-2xl border border-slate-800 bg-[#111827] p-8">
            <div className="mb-4 inline-flex rounded-xl bg-emerald-500/10 p-3">
              <Activity size={24} className="text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold">Audit trail</h3>
            <p className="mt-2 text-sm text-slate-400">
              The audit trail interface will be connected next.
            </p>
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-[#111827] p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-3">
              <ShieldCheck size={22} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Secure account access</p>
              <p className="mt-1 text-xs text-slate-500">Signed in as {user.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 size={16} /> Authenticated session
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
