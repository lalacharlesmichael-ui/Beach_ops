import { useEffect, useMemo, useState } from 'react'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import {
  Banknote,
  Bell,
  BellOff,
  CalendarDays,
  ChartColumn,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  Database,
  Download,
  Eye,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  Minus,
  PackageOpen,
  Plus,
  Printer,
  RefreshCw,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Table2,
  Trash,
  User,
  UserCog,
  Users,
  Utensils,
  Wallet,
  Waves,
  X,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  closeTableSession,
  insertAuditLog,
  insertExpense,
  insertMenuItem,
  insertOrder,
  insertPayment,
  insertStaffAccount,
  insertTableSession,
  isoNow,
  loadAppData,
  updateMenuItem,
  updateOrder,
  updateSettings,
  updateStaffAccount,
  updateTableStatus,
  upsertDefaultSettings,
  upsertStaffAccounts,
  upsertTables,
} from './lib/databaseApi'
import { isSupabaseConfigured, supabaseConfigError } from './lib/supabaseClient'
import './App.css'

const SESSION_STORAGE_KEY = 'beach-project-current-user-id'

const viewMeta = {
  Dashboard: { icon: LayoutDashboard },
  Tables: { icon: Table2 },
  'New Order': { icon: ShoppingCart },
  'Active Orders': { icon: ClipboardList },
  Payments: { icon: Wallet },
  'Kitchen/Bar Queue': { icon: ChefHat },
  Menu: { icon: Utensils },
  Expenses: { icon: CircleDollarSign },
  Reports: { icon: ChartColumn },
  'Staff Accounts': { icon: UserCog },
  'Audit Logs': { icon: ScrollText },
  Settings: { icon: Settings },
}

const navigationByRole = {
  Admin: [
    'Dashboard',
    'Tables',
    'New Order',
    'Active Orders',
    'Payments',
    'Kitchen/Bar Queue',
    'Menu',
    'Expenses',
    'Reports',
    'Staff Accounts',
    'Audit Logs',
    'Settings',
  ],
  Staff: ['Tables', 'New Order', 'Active Orders', 'Payments', 'Kitchen/Bar Queue'],
  Kitchen: ['Kitchen/Bar Queue', 'Active Orders'],
}

const inventoryCategoryOrder = ['Mains', 'Seafood', 'Desserts', 'Drinks']

const initialStaffAccounts = [
  {
    id: 'USR-01',
    name: 'Admin User',
    username: 'admin',
    password: 'admin123',
    role: 'Admin',
    status: 'Active',
  },
]

const initialTables = [
  { id: 'T01', name: 'Table 1', area: 'Beachfront', capacity: 4, status: 'Available' },
  { id: 'T02', name: 'Table 2', area: 'Beachfront', capacity: 6, status: 'Available' },
  { id: 'T03', name: 'Table 3', area: 'Cabana', capacity: 4, status: 'Available' },
  { id: 'T04', name: 'Table 4', area: 'Cabana', capacity: 8, status: 'Available' },
  { id: 'T05', name: 'Table 5', area: 'Bar Deck', capacity: 2, status: 'Available' },
  { id: 'T06', name: 'Table 6', area: 'Bar Deck', capacity: 4, status: 'Available' },
  { id: 'T07', name: 'Table 7', area: 'Garden', capacity: 6, status: 'Available' },
  { id: 'T08', name: 'Table 8', area: 'Garden', capacity: 4, status: 'Available' },
  { id: 'T09', name: 'Table 9', area: 'Poolside', capacity: 6, status: 'Available' },
  { id: 'T10', name: 'Table 10', area: 'Poolside', capacity: 8, status: 'Available' },
]

const initialSessions = []

const initialMenuItems = []

const initialOrders = []

const initialExpenses = []

const initialPayments = []

const initialAuditLogs = []

const initialSettings = {
  printReceipts: true,
  soundAlerts: true,
  requireServedBeforeCleaning: true,
}

const alertToast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2600,
  timerProgressBar: true,
  customClass: {
    popup: 'sweet-toast',
  },
})

const weeklySales = [
  { label: 'Mon', sales: 0 },
  { label: 'Tue', sales: 0 },
  { label: 'Wed', sales: 0 },
  { label: 'Thu', sales: 0 },
  { label: 'Fri', sales: 0 },
  { label: 'Sat', sales: 0 },
  { label: 'Sun', sales: 0 },
]

function cents(value) {
  return Number(value) || 0
}

function formatMoney(centsValue) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(cents(centsValue) / 100)
}

function centsToInput(centsValue) {
  const amount = Math.max(0, cents(centsValue))
  return `${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, '0')}`
}

function inputToCents(value) {
  const clean = String(value || '').replace(/[^\d.]/g, '')
  if (!clean) return 0
  const [whole = '0', fraction = ''] = clean.split('.')
  return Number(whole || 0) * 100 + Number(`${fraction}00`.slice(0, 2))
}

function nowTime() {
  return new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date())
}

function todayDate() {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())
}

function orderTotal(order) {
  return order.items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0)
}

function tableDisplayStatus(table, tableOrders) {
  if (table.status === 'For Cleaning') return 'For Cleaning'
  if (table.status === 'Available') return 'Available'
  if (tableOrders.some((order) => order.status === 'Ready')) return 'Ready'
  if (tableOrders.some((order) => order.status === 'Preparing' || order.status === 'Paid')) return 'Preparing'
  return 'Occupied'
}

function stationsForOrder(order) {
  return [...new Set(order.items.map((item) => item.station))].join(' + ')
}

function stockStatus(item) {
  const quantity = Number(item.stockQty) || 0
  if (!item.available) return 'Unavailable'
  if (quantity <= 0) return 'Out of Stock'
  if (quantity <= 5) return 'Low Stock'
  return 'In Stock'
}

function stockLabel(item) {
  const quantity = Math.max(0, Number(item.stockQty) || 0)
  return `${quantity} left`
}

function toneForCategory(category) {
  const normalized = category.toLowerCase()
  if (normalized.includes('drink')) return 'palm'
  if (normalized.includes('sea')) return 'reef'
  if (normalized.includes('dessert')) return 'mango'
  return 'sunset'
}

function nextRecordId(prefix, records, width, startAt = 1) {
  const maxId = records.reduce((max, record) => {
    const match = String(record.id || '').match(new RegExp(`^${prefix}-(\\d+)$`))
    return match ? Math.max(max, Number(match[1])) : max
  }, startAt - 1)

  return `${prefix}-${String(maxId + 1).padStart(width, '0')}`
}

function StatusPill({ status }) {
  return <span className={`status-pill status-${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span>
}

function IconLabel({ icon: Icon, children }) {
  return (
    <span className="icon-label">
      <Icon size={18} aria-hidden="true" />
      {children}
    </span>
  )
}

function EmptyState({ icon: Icon = PackageOpen, title, body }) {
  return (
    <div className="empty-state">
      <Icon size={32} aria-hidden="true" />
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  )
}

function LoadingOverlay({ message }) {
  if (!message) return null

  return (
    <div className="loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-panel">
        <RefreshCw size={28} aria-hidden="true" />
        <strong>{message}</strong>
      </div>
    </div>
  )
}

function App() {
  const [currentUserId, setCurrentUserId] = useState(() => window.localStorage.getItem(SESSION_STORAGE_KEY) || null)
  const [loginDraft, setLoginDraft] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [activeView, setActiveView] = useState(() => {
    const storedUserId = window.localStorage.getItem(SESSION_STORAGE_KEY)
    const storedUser = initialStaffAccounts.find((account) => account.id === storedUserId)
    return navigationByRole[storedUser?.role]?.[0] || 'Dashboard'
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tables, setTables] = useState(initialTables)
  const [sessions, setSessions] = useState(initialSessions)
  const [menuItems, setMenuItems] = useState(initialMenuItems)
  const [orders, setOrders] = useState(initialOrders)
  const [payments, setPayments] = useState(initialPayments)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs)
  const [selectedTableId, setSelectedTableId] = useState('T01')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [draftItems, setDraftItems] = useState([])
  const [paymentInputs, setPaymentInputs] = useState({})
  const [customerInputs, setCustomerInputs] = useState({})
  const [selectedPaymentOrderId, setSelectedPaymentOrderId] = useState(null)
  const [confirmingPaymentId, setConfirmingPaymentId] = useState(null)
  const [invoiceOrderId, setInvoiceOrderId] = useState(null)
  const [activeModal, setActiveModal] = useState(null)
  const [soundOn, setSoundOn] = useState(true)
  const [notice, setNotice] = useState(null)
  const [databaseReady, setDatabaseReady] = useState(false)
  const [databaseConnected, setDatabaseConnected] = useState(false)
  const [databaseError, setDatabaseError] = useState('')
  const [loadingMessage, setLoadingMessage] = useState('Connecting to Supabase...')
  const [tableSearch, setTableSearch] = useState('')
  const [menuSearch, setMenuSearch] = useState('')
  const [publicInventoryFilter, setPublicInventoryFilter] = useState('All')
  const [publicInventorySearch, setPublicInventorySearch] = useState('')
  const [reportRange, setReportRange] = useState('Daily')
  const [expenseDraft, setExpenseDraft] = useState({ category: 'Produce', description: '', amount: '' })
  const [menuDraft, setMenuDraft] = useState({
    name: '',
    category: 'Mains',
    newCategory: '',
    addingCategory: false,
    price: '',
    station: 'Kitchen',
    stock: '',
  })
  const [staffDraft, setStaffDraft] = useState({
    name: '',
    username: '',
    password: '',
    role: 'Staff',
    status: 'Active',
  })
  const [staffAccounts, setStaffAccounts] = useState(initialStaffAccounts)
  const [settingsState, setSettingsState] = useState(initialSettings)

  useEffect(() => {
    let cancelled = false

    async function syncInitialData() {
      if (!isSupabaseConfigured) {
        setDatabaseConnected(false)
        setDatabaseError(supabaseConfigError || 'Supabase environment variables are missing.')
        setLoadingMessage('')
        setDatabaseReady(true)
        return
      }

      setDatabaseReady(false)
      setDatabaseConnected(false)
      setLoadingMessage('Connecting to Supabase...')

      try {
        let data = await loadAppData()
        const setupWrites = []

        if (!data.staffAccounts.length) {
          setupWrites.push(upsertStaffAccounts(initialStaffAccounts))
        }

        if (!data.tables.length) {
          setupWrites.push(upsertTables(initialTables))
        }

        if (!data.settings) {
          setupWrites.push(upsertDefaultSettings(initialSettings))
        }

        if (setupWrites.length) {
          setLoadingMessage('Preparing your database...')
          await Promise.all(setupWrites)
          setLoadingMessage('Loading your workspace...')
          data = await loadAppData()
        }

        if (cancelled) return

        const nextStaffAccounts = data.staffAccounts.length ? data.staffAccounts : initialStaffAccounts
        const nextTables = data.tables.length ? data.tables : initialTables
        const nextSettings = data.settings || initialSettings
        const storedUserId = window.localStorage.getItem(SESSION_STORAGE_KEY)
        const storedUser = nextStaffAccounts.find((account) => account.id === storedUserId)

        setStaffAccounts(nextStaffAccounts)
        setTables(nextTables)
        setSessions(data.sessions)
        setMenuItems(data.menuItems)
        setOrders(data.orders)
        setPayments(data.payments)
        setExpenses(data.expenses)
        setAuditLogs(data.auditLogs)
        setSettingsState(nextSettings)
        setSoundOn(nextSettings.soundAlerts)

        if (storedUserId && (!storedUser || storedUser.status !== 'Active')) {
          window.localStorage.removeItem(SESSION_STORAGE_KEY)
          setCurrentUserId(null)
          setActiveView('Dashboard')
        } else if (storedUser) {
          setActiveView(navigationByRole[storedUser.role]?.[0] || 'Dashboard')
        }

        setDatabaseConnected(true)
        setDatabaseError('')
      } catch (error) {
        if (cancelled) return
        setDatabaseConnected(false)
        setDatabaseError(error.message)
        setNotice({ message: `Supabase connection failed: ${error.message}`, type: 'error' })
        alertToast.fire({
          icon: 'error',
          title: `Supabase connection failed: ${error.message}`,
        })
      } finally {
        if (!cancelled) {
          setDatabaseReady(true)
          setLoadingMessage('')
        }
      }
    }

    syncInitialData()

    return () => {
      cancelled = true
    }
  }, [])

  const canUseDatabase = databaseReady && databaseConnected
  const currentUser = canUseDatabase
    ? staffAccounts.find((account) => account.id === currentUserId && account.status === 'Active') || null
    : null
  const role = currentUser?.role || 'Guest'
  const currentStaff = currentUser?.name || 'System'
  const allowedViews = navigationByRole[role] || []
  const openSessions = useMemo(() => sessions.filter((session) => !session.closedAt), [sessions])
  const activeKitchenOrders = useMemo(
    () => orders.filter((order) => ['Paid', 'Preparing', 'Ready'].includes(order.status)),
    [orders],
  )
  const pendingPaymentOrders = useMemo(
    () => orders.filter((order) => order.status === 'Awaiting Payment' && order.paymentStatus === 'Pending'),
    [orders],
  )
  const draftTotal = useMemo(
    () => draftItems.reduce((sum, item) => sum + item.priceCents * item.quantity, 0),
    [draftItems],
  )
  const liveCategories = useMemo(
    () => ['All', ...new Set(menuItems.filter((item) => !item.archived).map((item) => item.category))],
    [menuItems],
  )
  const visibleMenuItems = useMemo(() => {
    const query = menuSearch.trim().toLowerCase()
    return menuItems.filter((item) => {
      if (item.archived) return false
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false
      if (!query) return true
      return `${item.name} ${item.category} ${item.station}`.toLowerCase().includes(query)
    })
  }, [menuItems, menuSearch, selectedCategory])
  const selectedTable = tables.find((table) => table.id === selectedTableId) || tables[0]
  const selectedPaymentOrder =
    orders.find((order) => order.id === selectedPaymentOrderId) || pendingPaymentOrders[0] || null

  const paidSalesTotal = payments
    .filter((payment) => payment.status === 'Paid')
    .reduce((sum, payment) => sum + payment.amountCents, 0)
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amountCents, 0)
  const menuSalesData = useMemo(() => {
    const totals = {}
    orders
      .filter((order) => order.paymentStatus === 'Paid')
      .forEach((order) => {
        order.items.forEach((item) => {
          totals[item.name] = (totals[item.name] || 0) + item.quantity
        })
      })
    return Object.entries(totals)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6)
  }, [orders])
  const categorySalesData = useMemo(() => {
    const totals = {}
    orders
      .filter((order) => order.paymentStatus === 'Paid')
      .forEach((order) => {
        order.items.forEach((item) => {
          totals[item.category] = (totals[item.category] || 0) + item.priceCents * item.quantity
        })
      })
    return Object.entries(totals).map(([name, value]) => ({ name, value: Math.round(value / 100) }))
  }, [orders])

  function notify(message, type = 'success') {
    setNotice({ message, type })
    alertToast.fire({
      icon: type === 'error' ? 'error' : 'success',
      title: message,
    })
  }

  function notifyDatabaseError(error) {
    const message = error instanceof Error ? error.message : String(error)
    setDatabaseError(message)
    notify(`Database update failed: ${message}`, 'error')
  }

  async function withLoading(message, action) {
    setLoadingMessage(message)

    try {
      return await action()
    } finally {
      setLoadingMessage('')
    }
  }

  async function confirmAction({ title, text, confirmButtonText }) {
    const result = await Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: 'Keep it',
      reverseButtons: true,
      buttonsStyling: false,
      customClass: {
        popup: 'sweet-dialog',
        confirmButton: 'swal-confirm-button',
        cancelButton: 'swal-cancel-button',
        actions: 'swal-action-row',
      },
    })

    return result.isConfirmed
  }

  function addAudit(action, detail) {
    const log = {
      id: nextRecordId('LOG', auditLogs, 3),
      actor: currentStaff,
      action,
      detail,
      time: nowTime(),
      loggedAtIso: isoNow(),
    }

    setAuditLogs((current) => [log, ...current])

    insertAuditLog(log).catch((error) => {
      notifyDatabaseError(error)
    })
  }

  function handleLogin(event) {
    event.preventDefault()
    if (!databaseReady) {
      notify('Please wait for Supabase to finish loading.', 'error')
      return
    }
    if (!databaseConnected) {
      notify(`Supabase is not connected: ${databaseError || 'check the deployment environment variables.'}`, 'error')
      return
    }

    const username = loginDraft.username.trim().toLowerCase()
    const account = staffAccounts.find((item) => item.username.toLowerCase() === username)

    if (!account || account.password !== loginDraft.password) {
      setLoginError('Invalid username or password.')
      return
    }

    if (account.status !== 'Active') {
      setLoginError('This account is inactive. Ask an admin to reactivate it.')
      return
    }

    window.localStorage.setItem(SESSION_STORAGE_KEY, account.id)
    setCurrentUserId(account.id)
    setActiveView(navigationByRole[account.role][0])
    setLoginDraft({ username: '', password: '' })
    setLoginError('')
    setNotice({ message: `Logged in as ${account.name}.`, type: 'success' })
  }

  function handleLogout() {
    addAudit('User logged out', `${currentStaff} ended the session`)
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    setCurrentUserId(null)
    setActiveView('Dashboard')
    setActiveModal(null)
    setSidebarOpen(false)
    setInvoiceOrderId(null)
    setLoginDraft({ username: '', password: '' })
    setLoginError('')
  }

  function goToView(view) {
    setActiveView(view)
    setActiveModal(null)
    setSidebarOpen(false)
  }

  async function applyStockChange(orderItems, multiplier) {
    const changedItems = []
    const nextMenuItems = menuItems.map((menuItem) => {
      const quantityChange = orderItems
        .filter((item) => item.itemId === menuItem.id)
        .reduce((sum, item) => sum + item.quantity, 0)

      if (!quantityChange) return menuItem

      const nextItem = {
        ...menuItem,
        stockQty: Math.max(0, (Number(menuItem.stockQty) || 0) + quantityChange * multiplier),
      }
      changedItems.push(nextItem)
      return nextItem
    })

    if (changedItems.length) {
      await Promise.all(
        changedItems.map((item) => updateMenuItem(item.id, { stock_qty: item.stockQty })),
      )
      setMenuItems(nextMenuItems)
    }
  }

  async function adjustMenuStock(menuItemId, delta) {
    const menuItem = menuItems.find((item) => item.id === menuItemId)
    if (!menuItem) return

    const nextStock = Math.max(0, (Number(menuItem.stockQty) || 0) + delta)
    try {
      await withLoading('Updating stock...', () => updateMenuItem(menuItemId, { stock_qty: nextStock }))
    } catch (error) {
      notifyDatabaseError(error)
      return
    }

    setMenuItems((current) =>
      current.map((item) => (item.id === menuItemId ? { ...item, stockQty: nextStock } : item)),
    )
    addAudit('Inventory adjusted', `${menuItem.name} stock changed to ${nextStock}`)
  }

  async function ensureTableSession(tableId) {
    const existing = openSessions.find((session) => session.tableId === tableId)
    if (existing) return existing.id

    const table = tables.find((item) => item.id === tableId)
    if (!table || table.status === 'For Cleaning') {
      notify('This table must be cleaned before a new order can be opened.', 'error')
      return null
    }

    const sessionId = nextRecordId('SES', sessions, 3, 101)
    const openedAtIso = isoNow()
    try {
      await withLoading('Opening table...', async () => {
        await updateTableStatus(tableId, 'Occupied')
        await insertTableSession({ id: sessionId, tableId, openedAtIso })
      })
    } catch (error) {
      notifyDatabaseError(error)
      return null
    }

    setTables((current) =>
      current.map((item) => (item.id === tableId ? { ...item, status: 'Occupied' } : item)),
    )
    setSessions((current) => [
      { id: sessionId, tableId, openedAt: nowTime(), closedAt: null },
      ...current,
    ])
    addAudit('Table opened', `${table.name} opened for service`)
    return sessionId
  }

  async function handleOpenTable(tableId) {
    const table = tables.find((item) => item.id === tableId)
    if (!table) return
    if (table.status === 'For Cleaning') {
      notify('This table is still marked For Cleaning.', 'error')
      return
    }
    const sessionId = await ensureTableSession(tableId)
    if (!sessionId) return

    setSelectedTableId(tableId)
    setActiveView('New Order')
  }

  async function handleAddItem(menuItem) {
    if (!menuItem.available) {
      notify(`${menuItem.name} is unavailable.`, 'error')
      return
    }
    const stockQty = Number(menuItem.stockQty) || 0
    const draftQuantity = draftItems
      .filter((item) => item.itemId === menuItem.id)
      .reduce((sum, item) => sum + item.quantity, 0)

    if (stockQty <= draftQuantity) {
      notify(`${menuItem.name} is out of stock.`, 'error')
      return
    }

    const sessionId = await ensureTableSession(selectedTable.id)
    if (!sessionId) return

    setDraftItems((current) => {
      const existing = current.find((item) => item.itemId === menuItem.id && item.instructions === '')
      if (existing) {
        return current.map((item) =>
          item.lineId === existing.lineId ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }
      return [
        ...current,
        {
          lineId: `${menuItem.id}-${Date.now()}`,
          itemId: menuItem.id,
          name: menuItem.name,
          category: menuItem.category,
          station: menuItem.station,
          priceCents: menuItem.priceCents,
          quantity: 1,
          instructions: '',
        },
      ]
    })
  }

  function updateDraftQuantity(lineId, delta) {
    if (delta > 0) {
      const draftLine = draftItems.find((item) => item.lineId === lineId)
      const menuItem = menuItems.find((item) => item.id === draftLine?.itemId)
      const stockQty = Number(menuItem?.stockQty) || 0
      const draftQuantity = draftItems
        .filter((item) => item.itemId === draftLine?.itemId)
        .reduce((sum, item) => sum + item.quantity, 0)

      if (draftLine && stockQty <= draftQuantity) {
        notify(`${draftLine.name} is out of stock.`, 'error')
        return
      }
    }

    setDraftItems((current) =>
      current
        .map((item) => (item.lineId === lineId ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0),
    )
  }

  function updateDraftInstructions(lineId, instructions) {
    setDraftItems((current) =>
      current.map((item) => (item.lineId === lineId ? { ...item, instructions } : item)),
    )
  }

  async function handleProceedToPayment() {
    if (!draftItems.length) {
      notify('Add at least one item before payment.', 'error')
      return
    }
    const stockProblem = draftItems.find((item) => {
      const menuItem = menuItems.find((menu) => menu.id === item.itemId)
      return !menuItem?.available || item.quantity > (Number(menuItem?.stockQty) || 0)
    })

    if (stockProblem) {
      notify(`${stockProblem.name} does not have enough stock.`, 'error')
      return
    }

    const sessionId = await ensureTableSession(selectedTable.id)
    if (!sessionId) return

    const orderId = nextRecordId('ORD', orders, 4, 2401)
    const createdAtIso = isoNow()
    const newOrder = {
      id: orderId,
      sessionId,
      tableId: selectedTable.id,
      status: 'Awaiting Payment',
      paymentStatus: 'Pending',
      createdAt: nowTime(),
      createdAtIso,
      paidAt: null,
      paidAtIso: null,
      staff: currentStaff,
      customerName: '',
      items: draftItems.map((item) => ({ ...item })),
    }

    try {
      await withLoading('Sending order to Supabase...', async () => {
        await insertOrder(newOrder)
        await applyStockChange(draftItems, -1)
      })
    } catch (error) {
      notifyDatabaseError(error)
      return
    }

    setOrders((current) => [newOrder, ...current])
    setPaymentInputs((current) => ({ ...current, [orderId]: '' }))
    setCustomerInputs((current) => ({ ...current, [orderId]: '' }))
    setSelectedPaymentOrderId(orderId)
    setDraftItems([])
    setActiveView('Payments')
    addAudit('Order created', `${orderId} awaits cash payment at ${selectedTable.name}`)
    notify(`${orderId} is ready for cash payment confirmation.`)
  }

  async function handleConfirmPayment(order) {
    if (!order || confirmingPaymentId) return
    if (order.paymentStatus === 'Paid') {
      notify(`${order.id} is already paid.`, 'error')
      return
    }
    const total = orderTotal(order)
    const amountReceived = inputToCents(paymentInputs[order.id])
    const customerName = (customerInputs[order.id] ?? order.customerName ?? '').trim()
    if (!customerName) {
      notify('Customer name is required for the invoice.', 'error')
      return
    }
    if (amountReceived < total) {
      notify('Amount received is below the order total.', 'error')
      return
    }

    const paidAtIso = isoNow()
    const payment = {
      id: nextRecordId('PAY', payments, 4, 9001),
      orderId: order.id,
      method: 'Cash',
      status: 'Paid',
      amountCents: total,
      amountReceivedCents: amountReceived,
      changeCents: amountReceived - total,
      customerName,
      staff: currentStaff,
      time: nowTime(),
      paidAtIso,
    }

    setConfirmingPaymentId(order.id)
    try {
      await withLoading('Confirming payment...', async () => {
        await insertPayment(payment)
        await updateOrder(order.id, {
          status: 'Paid',
          payment_status: 'Paid',
          paid_at: paidAtIso,
          paid_by: currentStaff,
          customer_name: customerName,
        })
      })
    } catch (error) {
      setConfirmingPaymentId(null)
      notifyDatabaseError(error)
      return
    }

    setOrders((current) =>
      current.map((item) =>
        item.id === order.id
          ? { ...item, status: 'Paid', paymentStatus: 'Paid', paidAt: payment.time, paidBy: currentStaff, customerName }
          : item,
      ),
    )
    setPayments((current) => [payment, ...current])
    setConfirmingPaymentId(null)
    setSelectedPaymentOrderId(null)
    setInvoiceOrderId(order.id)
    setActiveView('Kitchen/Bar Queue')
    addAudit('Cash payment confirmed', `${order.id} was marked Paid and queued`)
    notify(`${order.id} is paid. Show the invoice so the customer can take a photo.`)
  }

  async function updateOrderStatus(orderId, nextStatus) {
    const order = orders.find((item) => item.id === orderId)
    if (!order) return
    if (nextStatus !== 'Cancelled' && order.paymentStatus !== 'Paid') {
      notify('Only paid orders can move into preparation.', 'error')
      return
    }

    try {
      await withLoading('Updating order status...', () => updateOrder(orderId, { status: nextStatus }))
    } catch (error) {
      notifyDatabaseError(error)
      return
    }

    setOrders((current) =>
      current.map((item) => (item.id === orderId ? { ...item, status: nextStatus } : item)),
    )
    addAudit('Order status changed', `${orderId} moved to ${nextStatus}`)
    notify(`${orderId} moved to ${nextStatus}.`)
  }

  async function handleCancelOrder(orderId) {
    const order = orders.find((item) => item.id === orderId)
    if (!order) return
    const paid = order.paymentStatus === 'Paid'
    const confirmed = await confirmAction({
      title: paid ? `Refund ${orderId}?` : `Cancel ${orderId}?`,
      text: paid ? 'This marks the paid order as refunded.' : 'This cancels the unpaid order and returns stock.',
      confirmButtonText: paid ? 'Refund order' : 'Cancel order',
    })
    if (!confirmed) return
    const nextStatus = paid ? 'Refunded' : 'Cancelled'
    const nextPaymentStatus = paid ? 'Refunded' : 'Failed'

    try {
      await withLoading(paid ? 'Refunding order...' : 'Cancelling order...', async () => {
        await updateOrder(orderId, { status: nextStatus, payment_status: nextPaymentStatus })
        if (!paid) {
          await applyStockChange(order.items, 1)
        }
      })
    } catch (error) {
      notifyDatabaseError(error)
      return
    }

    setOrders((current) =>
      current.map((item) =>
        item.id === orderId
          ? { ...item, status: nextStatus, paymentStatus: nextPaymentStatus }
          : item,
      ),
    )
    addAudit(paid ? 'Order refunded' : 'Order cancelled', `${orderId} was ${paid ? 'refunded' : 'cancelled'}`)
    notify(`${orderId} was ${paid ? 'refunded' : 'cancelled'}.`)
  }

  async function handleCustomersLeft(tableId) {
    const table = tables.find((item) => item.id === tableId)
    const session = openSessions.find((item) => item.tableId === tableId)
    if (!table || !session) return
    const unfinished = orders.filter(
      (order) => order.sessionId === session.id && !['Served', 'Cancelled', 'Refunded'].includes(order.status),
    )
    if (unfinished.length) {
      notify(`${table.name} still has unpaid or unfinished orders.`, 'error')
      return
    }
    const closedAtIso = isoNow()
    try {
      await withLoading('Closing table session...', async () => {
        await updateTableStatus(tableId, 'For Cleaning')
        await closeTableSession(session.id, closedAtIso)
      })
    } catch (error) {
      notifyDatabaseError(error)
      return
    }

    setTables((current) =>
      current.map((item) => (item.id === tableId ? { ...item, status: 'For Cleaning' } : item)),
    )
    setSessions((current) =>
      current.map((item) => (item.id === session.id ? { ...item, closedAt: nowTime() } : item)),
    )
    addAudit('Customers left', `${table.name} moved to For Cleaning`)
    notify(`${table.name} is ready for cleaning.`)
  }

  async function handleMarkCleaned(tableId) {
    const table = tables.find((item) => item.id === tableId)
    try {
      await withLoading('Marking table cleaned...', () => updateTableStatus(tableId, 'Available'))
    } catch (error) {
      notifyDatabaseError(error)
      return
    }

    setTables((current) =>
      current.map((item) => (item.id === tableId ? { ...item, status: 'Available' } : item)),
    )
    addAudit('Table cleaned', `${table?.name || tableId} moved to Available`)
    notify(`${table?.name || tableId} is available.`)
  }

  async function toggleMenuAvailability(menuItemId) {
    const menuItem = menuItems.find((item) => item.id === menuItemId)
    if (!menuItem) return
    const nextAvailable = !menuItem.available

    try {
      await withLoading('Updating availability...', () => updateMenuItem(menuItemId, { available: nextAvailable }))
    } catch (error) {
      notifyDatabaseError(error)
      return
    }

    setMenuItems((current) =>
      current.map((item) =>
        item.id === menuItemId ? { ...item, available: nextAvailable } : item,
      ),
    )
    addAudit('Menu availability changed', `${menuItem?.name || menuItemId} was updated`)
  }

  async function archiveMenuItem(menuItemId) {
    const menuItem = menuItems.find((item) => item.id === menuItemId)
    const confirmed = await confirmAction({
      title: `Archive ${menuItem?.name || 'this item'}?`,
      text: 'Archived items are hidden from ordering, but historical orders stay unchanged.',
      confirmButtonText: 'Archive item',
    })
    if (!confirmed) return
    try {
      await withLoading('Archiving menu item...', () => updateMenuItem(menuItemId, { archived: true, available: false }))
    } catch (error) {
      notifyDatabaseError(error)
      return
    }

    setMenuItems((current) =>
      current.map((item) => (item.id === menuItemId ? { ...item, archived: true, available: false } : item)),
    )
    addAudit('Menu item archived', `${menuItem?.name || menuItemId} was archived`)
    notify(`${menuItem?.name || 'Item'} archived.`)
  }

  async function handleAddMenuItem(event) {
    event.preventDefault()
    const priceCents = inputToCents(menuDraft.price)
    const stockQty = Math.max(0, Number.parseInt(menuDraft.stock, 10) || 0)
    const category = (menuDraft.addingCategory ? menuDraft.newCategory : menuDraft.category).trim() || 'Mains'
    if (!menuDraft.name.trim() || priceCents <= 0) {
      notify('Menu item name and price are required.', 'error')
      return
    }
    if (menuDraft.addingCategory && !menuDraft.newCategory.trim()) {
      notify('New category name is required.', 'error')
      return
    }
    const newItem = {
      id: nextRecordId('MI', menuItems, 2),
      name: menuDraft.name.trim(),
      category,
      priceCents,
      station: menuDraft.station,
      available: true,
      stockQty,
      archived: false,
      tone: toneForCategory(category),
    }
    try {
      await withLoading('Saving menu item...', () => insertMenuItem(newItem))
    } catch (error) {
      notifyDatabaseError(error)
      return
    }

    setMenuItems((current) => [newItem, ...current])
    setMenuDraft({
      name: '',
      category,
      newCategory: '',
      addingCategory: false,
      price: '',
      station: menuDraft.station,
      stock: '',
    })
    setActiveModal(null)
    addAudit('Menu item added', `${newItem.name} added to ${newItem.category}`)
    notify(`${newItem.name} added to the menu.`)
  }

  async function handleAddExpense(event) {
    event.preventDefault()
    const amountCents = inputToCents(expenseDraft.amount)
    if (!expenseDraft.description.trim() || amountCents <= 0) {
      notify('Expense description and amount are required.', 'error')
      return
    }
    const spentAtIso = isoNow()
    const newExpense = {
      id: nextRecordId('EXP', expenses, 3),
      category: expenseDraft.category,
      description: expenseDraft.description.trim(),
      amountCents,
      staff: currentStaff,
      time: nowTime(),
      spentAtIso,
    }
    try {
      await withLoading('Recording expense...', () => insertExpense(newExpense))
    } catch (error) {
      notifyDatabaseError(error)
      return
    }

    setExpenses((current) => [newExpense, ...current])
    setExpenseDraft({ category: expenseDraft.category, description: '', amount: '' })
    setActiveModal(null)
    addAudit('Expense recorded', `${newExpense.description} recorded at ${formatMoney(amountCents)}`)
    notify('Expense recorded.')
  }

  async function handleAddStaff(event) {
    event.preventDefault()
    const username = staffDraft.username.trim().toLowerCase()

    if (!staffDraft.name.trim() || !username || !staffDraft.password.trim()) {
      notify('Staff name, username, and password are required.', 'error')
      return
    }

    if (staffAccounts.some((account) => account.username.toLowerCase() === username)) {
      notify('That username is already in use.', 'error')
      return
    }

    const newStaff = {
      id: nextRecordId('USR', staffAccounts, 2),
      name: staffDraft.name.trim(),
      username,
      password: staffDraft.password,
      role: staffDraft.role,
      status: staffDraft.status,
    }
    try {
      await withLoading('Creating staff account...', () => insertStaffAccount(newStaff))
    } catch (error) {
      notifyDatabaseError(error)
      return
    }

    setStaffAccounts((current) => [newStaff, ...current])
    setStaffDraft({ name: '', username: '', password: '', role: 'Staff', status: 'Active' })
    setActiveModal(null)
    addAudit('Staff account added', `${newStaff.name} added as ${newStaff.role}`)
    notify(`${newStaff.name} added.`)
  }

  async function toggleStaffStatus(staffId) {
    const staff = staffAccounts.find((item) => item.id === staffId)
    if (staffId === currentUserId) {
      notify('You cannot deactivate the signed-in account.', 'error')
      return
    }
    if (!staff) return

    const nextStatus = staff.status === 'Active' ? 'Inactive' : 'Active'
    try {
      await withLoading('Updating staff account...', () => updateStaffAccount(staffId, { status: nextStatus }))
    } catch (error) {
      notifyDatabaseError(error)
      return
    }

    setStaffAccounts((current) =>
      current.map((item) =>
        item.id === staffId
          ? { ...item, status: nextStatus }
          : item,
      ),
    )
    addAudit('Staff account updated', `${staff?.name || staffId} status changed`)
  }

  async function handleSettingsToggle(key) {
    const nextSettings = {
      ...settingsState,
      [key]: !settingsState[key],
    }

    setSettingsState(nextSettings)
    if (key === 'soundAlerts') {
      setSoundOn(nextSettings.soundAlerts)
    }

    try {
      await withLoading('Saving settings...', () => updateSettings(nextSettings))
    } catch (error) {
      notifyDatabaseError(error)
    }
  }

  function downloadReport() {
    const rows = [
      ['Order ID', 'Payment Method', 'Amount', 'Staff', 'Time'],
      ...payments.map((payment) => [
        payment.orderId,
        payment.method,
        centsToInput(payment.amountCents),
        payment.staff,
        payment.time,
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'beach-sales-report.csv'
    link.click()
    URL.revokeObjectURL(url)
    addAudit('Report exported', `${reportRange} sales report exported`)
  }

  function metrics() {
    return [
      { label: "Today's gross sales", value: formatMoney(paidSalesTotal), icon: CircleDollarSign, accent: 'teal' },
      { label: 'Orders today', value: orders.length, icon: ClipboardCheck, accent: 'sky' },
      { label: 'Cash payments', value: formatMoney(paidSalesTotal), icon: Banknote, accent: 'green' },
      { label: 'Awaiting payment', value: pendingPaymentOrders.length, icon: Wallet, accent: 'cyan' },
      { label: 'Occupied tables', value: tables.filter((table) => table.status === 'Occupied').length, icon: Table2, accent: 'blue' },
      { label: 'Preparing', value: orders.filter((order) => order.status === 'Preparing').length, icon: ChefHat, accent: 'violet' },
      { label: 'Ready to serve', value: orders.filter((order) => order.status === 'Ready').length, icon: CheckCircle2, accent: 'cyan' },
      { label: "Today's expenses", value: formatMoney(expenseTotal), icon: ScrollText, accent: 'red' },
    ]
  }

  const filteredTables = tables.filter((table) =>
    `${table.name} ${table.area} ${table.status}`.toLowerCase().includes(tableSearch.trim().toLowerCase()),
  )

  function renderDashboard() {
    return (
      <div className="view-stack">
        <ViewHeader
          eyebrow="Admin dashboard"
          title="Beach operations"
          action={<StatusPill status="Paid Gate Active" />}
        />
        <section className="metric-grid" aria-label="Current business metrics">
          {metrics().map((item) => (
            <article className={`metric-card accent-${item.accent}`} key={item.label}>
              <div>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
              <item.icon size={24} aria-hidden="true" />
            </article>
          ))}
        </section>

        <section className="dashboard-grid">
          <article className="chart-panel">
            <div className="panel-heading">
              <div>
                <span>Sales trend</span>
                <h2>Weekly cash sales</h2>
              </div>
              <CalendarDays size={20} aria-hidden="true" />
            </div>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklySales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7DCE6" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatMoney(Number(value) * 100)} />
                  <Area type="monotone" dataKey="sales" stroke="#24124F" fill="#E9E0F1" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="chart-panel">
            <div className="panel-heading">
              <div>
                <span>Menu mix</span>
                <h2>Sales by category</h2>
              </div>
              <Utensils size={20} aria-hidden="true" />
            </div>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categorySalesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7DCE6" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatMoney(Number(value) * 100)} />
                  <Bar dataKey="value" fill="#FF6243" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>

        <section className="split-grid">
          <article className="table-panel">
            <div className="panel-heading">
              <div>
                <span>Best sellers</span>
                <h2>Top items</h2>
              </div>
              <ChartColumn size={20} aria-hidden="true" />
            </div>
            <div className="rank-list">
              {menuSalesData.length ? (
                menuSalesData.map((item, index) => (
                  <div className="rank-row" key={item.name}>
                    <span>{index + 1}</span>
                    <strong>{item.name}</strong>
                    <em>{item.quantity} sold</em>
                  </div>
                ))
              ) : (
                <EmptyState icon={ChartColumn} title="No item sales yet" body="Paid orders will rank your menu items here." />
              )}
            </div>
          </article>

          <article className="table-panel">
            <div className="panel-heading">
              <div>
                <span>Recent transactions</span>
                <h2>Paid orders</h2>
              </div>
              <Banknote size={20} aria-hidden="true" />
            </div>
            <div className="data-list">
              {payments.length ? (
                payments.slice(0, 5).map((payment) => (
                  <div className="data-row" key={payment.id}>
                    <span>{payment.orderId}</span>
                    <strong>{formatMoney(payment.amountCents)}</strong>
                    <small>{payment.staff} at {payment.time}</small>
                  </div>
                ))
              ) : (
                <EmptyState icon={Banknote} title="No payments yet" body="Confirmed cash payments will appear here." />
              )}
            </div>
          </article>
        </section>
      </div>
    )
  }

  function renderTables() {
    return (
      <div className="view-stack">
        <ViewHeader
          eyebrow="Floor status"
          title="Tables"
          action={
            <div className="search-control">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={tableSearch}
                onChange={(event) => setTableSearch(event.target.value)}
                placeholder="Search tables"
              />
            </div>
          }
        />
        <section className="table-grid" aria-label="Restaurant tables">
          {filteredTables.map((table) => {
            const session = openSessions.find((item) => item.tableId === table.id)
            const sessionOrders = session ? orders.filter((order) => order.sessionId === session.id) : []
            const unfinishedOrders = sessionOrders.filter(
              (order) => !['Served', 'Cancelled', 'Refunded'].includes(order.status),
            )
            const displayStatus = tableDisplayStatus(table, unfinishedOrders)
            const total = sessionOrders
              .filter((order) => order.paymentStatus === 'Paid')
              .reduce((sum, order) => sum + orderTotal(order), 0)
            return (
              <article className={`table-card status-card-${displayStatus.toLowerCase().replaceAll(' ', '-')}`} key={table.id}>
                <div className="card-topline">
                  <span>{table.area}</span>
                  <StatusPill status={displayStatus} />
                </div>
                <h2>{table.name}</h2>
                <dl className="detail-grid">
                  <div>
                    <dt>Capacity</dt>
                    <dd>{table.capacity}</dd>
                  </div>
                  <div>
                    <dt>Time occupied</dt>
                    <dd>{session?.openedAt || 'None'}</dd>
                  </div>
                  <div>
                    <dt>Active orders</dt>
                    <dd>{unfinishedOrders.length}</dd>
                  </div>
                  <div>
                    <dt>Session total</dt>
                    <dd>{formatMoney(total)}</dd>
                  </div>
                </dl>
                <div className="button-row">
                  {table.status === 'For Cleaning' ? (
                    <button className="secondary-button" type="button" onClick={() => handleMarkCleaned(table.id)}>
                      <IconLabel icon={RefreshCw}>Mark cleaned</IconLabel>
                    </button>
                  ) : (
                    <button className="primary-button" type="button" onClick={() => handleOpenTable(table.id)}>
                      <IconLabel icon={ShoppingCart}>{table.status === 'Available' ? 'Open table' : 'Add order'}</IconLabel>
                    </button>
                  )}
                  {table.status === 'Occupied' && (
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => handleCustomersLeft(table.id)}
                    >
                      <IconLabel icon={Users}>Customers left</IconLabel>
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </section>
      </div>
    )
  }

  function renderOrderScreen() {
    return (
      <div className="view-stack">
        <ViewHeader eyebrow="Staff ordering" title="New order" action={<StatusPill status={selectedTable.status} />} />
        <section className="ordering-layout">
          <aside className="table-selector" aria-label="Table selector">
            <h2>Table</h2>
            <div className="table-chip-list">
              {tables.map((table) => (
                <button
                  className={`table-chip ${selectedTableId === table.id ? 'selected' : ''}`}
                  disabled={table.status === 'For Cleaning'}
                  type="button"
                  key={table.id}
                  onClick={() => setSelectedTableId(table.id)}
                >
                  <span>{table.name}</span>
                  <small>{table.status}</small>
                </button>
              ))}
            </div>
          </aside>

          <section className="menu-browser" aria-label="Menu browser">
            <div className="menu-toolbar">
              <div className="category-tabs" role="tablist" aria-label="Menu categories">
                {liveCategories.map((category) => (
                  <button
                    className={selectedCategory === category ? 'active' : ''}
                    type="button"
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="search-control">
                <Search size={18} aria-hidden="true" />
                <input
                  type="search"
                  value={menuSearch}
                  onChange={(event) => setMenuSearch(event.target.value)}
                  placeholder="Search menu"
                />
              </div>
            </div>
            <div className="menu-grid">
              {visibleMenuItems.length ? (
                visibleMenuItems.map((item) => {
                  const orderable = item.available && Number(item.stockQty) > 0

                  return (
                    <article className={`menu-card tone-${item.tone}`} key={item.id}>
                      <div className="menu-visual" aria-hidden="true">
                        {item.station === 'Bar' ? <Waves size={26} /> : <Utensils size={26} />}
                      </div>
                      <div className="menu-card-body">
                        <div className="card-topline">
                          <span>{item.category}</span>
                          <StatusPill status={stockStatus(item)} />
                        </div>
                        <h2>{item.name}</h2>
                        <p>{item.station} - {stockLabel(item)}</p>
                        <div className="price-row">
                          <strong>{formatMoney(item.priceCents)}</strong>
                          <button
                            className="small-primary-button"
                            disabled={!orderable}
                            type="button"
                            onClick={() => handleAddItem(item)}
                          >
                            <IconLabel icon={Plus}>Add</IconLabel>
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })
              ) : (
                <EmptyState icon={Utensils} title="No menu items yet" body="Add menu items from the Menu screen before ordering." />
              )}
            </div>
          </section>

          <aside className="order-summary" id="order-summary" aria-label="Current order summary">
            <div className="summary-heading">
              <div>
                <span>Current order</span>
                <h2>{selectedTable.name}</h2>
              </div>
              <ShoppingCart size={22} aria-hidden="true" />
            </div>
            {draftItems.length ? (
              <div className="summary-lines">
                {draftItems.map((item) => (
                  <div className="summary-line" key={item.lineId}>
                    <div className="line-title">
                      <strong>{item.name}</strong>
                      <button
                        className="icon-button danger"
                        type="button"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => updateDraftQuantity(item.lineId, -item.quantity)}
                      >
                        <Trash size={18} aria-hidden="true" />
                      </button>
                    </div>
                    <div className="line-controls">
                      <div className="quantity-stepper" aria-label={`${item.name} quantity`}>
                        <button type="button" onClick={() => updateDraftQuantity(item.lineId, -1)}>
                          <Minus size={16} aria-hidden="true" />
                        </button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={() => updateDraftQuantity(item.lineId, 1)}>
                          <Plus size={16} aria-hidden="true" />
                        </button>
                      </div>
                      <strong>{formatMoney(item.priceCents * item.quantity)}</strong>
                    </div>
                    <label className="field-label">
                      Special instructions
                      <input
                        type="text"
                        value={item.instructions}
                        onChange={(event) => updateDraftInstructions(item.lineId, event.target.value)}
                        placeholder="Optional"
                      />
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={ShoppingCart} title="No items selected" body="Choose menu items to build this order." />
            )}
            <div className="summary-total">
              <span>Total amount</span>
              <strong>{formatMoney(draftTotal)}</strong>
            </div>
            <button
              className="primary-button full"
              disabled={!draftItems.length}
              type="button"
              onClick={handleProceedToPayment}
            >
              <IconLabel icon={Wallet}>Proceed to payment</IconLabel>
            </button>
          </aside>
        </section>
        {draftItems.length > 0 && (
          <button
            className="mobile-summary-bar"
            type="button"
            onClick={() => document.getElementById('order-summary')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <IconLabel icon={ShoppingCart}>Review order</IconLabel>
            <strong>{formatMoney(draftTotal)}</strong>
          </button>
        )}
      </div>
    )
  }

  function renderPayments() {
    const total = selectedPaymentOrder ? orderTotal(selectedPaymentOrder) : 0
    const amountReceived = selectedPaymentOrder ? inputToCents(paymentInputs[selectedPaymentOrder.id]) : 0
    const changeDue = Math.max(0, amountReceived - total)
    const customerName = selectedPaymentOrder
      ? (customerInputs[selectedPaymentOrder.id] ?? selectedPaymentOrder.customerName ?? '').trim()
      : ''
    return (
      <div className="view-stack">
        <ViewHeader eyebrow="Cash desk" title="Payments" action={<StatusPill status="Cash Only" />} />
        <section className="payment-layout">
          <aside className="payment-list" aria-label="Orders awaiting payment">
            <h2>Awaiting payment</h2>
            {pendingPaymentOrders.length ? (
              pendingPaymentOrders.map((order) => {
                const table = tables.find((item) => item.id === order.tableId)
                return (
                  <button
                    className={`payment-order-chip ${selectedPaymentOrder?.id === order.id ? 'selected' : ''}`}
                    type="button"
                    key={order.id}
                    onClick={() => setSelectedPaymentOrderId(order.id)}
                  >
                    <strong>{order.id}</strong>
                    <span>{table?.name || order.tableId}</span>
                    <em>{formatMoney(orderTotal(order))}</em>
                  </button>
                )
              })
            ) : (
              <EmptyState icon={Wallet} title="No pending payments" body="New unpaid orders will appear here." />
            )}
          </aside>

          <section className="payment-panel" aria-label="Payment confirmation">
            {selectedPaymentOrder ? (
              <>
                <div className="summary-heading">
                  <div>
                    <span>Cash payment confirmation</span>
                    <h2>{selectedPaymentOrder.id}</h2>
                  </div>
                  <Banknote size={24} aria-hidden="true" />
                </div>
                <div className="receipt-lines">
                  {selectedPaymentOrder.items.map((item) => (
                    <div className="receipt-line" key={item.lineId}>
                      <span>{item.quantity} x {item.name}</span>
                      <strong>{formatMoney(item.priceCents * item.quantity)}</strong>
                    </div>
                  ))}
                </div>
                <div className="payment-totals">
                  <label className="field-label">
                    Customer name
                    <input
                      value={customerInputs[selectedPaymentOrder.id] ?? selectedPaymentOrder.customerName ?? ''}
                      onChange={(event) =>
                        setCustomerInputs((current) => ({
                          ...current,
                          [selectedPaymentOrder.id]: event.target.value,
                        }))
                      }
                      placeholder="Customer name"
                    />
                  </label>
                  <div>
                    <span>Total amount</span>
                    <strong>{formatMoney(total)}</strong>
                  </div>
                  <label className="field-label">
                    Customer paid
                    <input
                      inputMode="decimal"
                      value={paymentInputs[selectedPaymentOrder.id] || ''}
                      onChange={(event) =>
                        setPaymentInputs((current) => ({
                          ...current,
                          [selectedPaymentOrder.id]: event.target.value,
                        }))
                      }
                      placeholder={centsToInput(total)}
                    />
                  </label>
                  <div>
                    <span>Change due</span>
                    <strong>{formatMoney(changeDue)}</strong>
                  </div>
                </div>
                <div className="button-row end">
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      setSelectedTableId(selectedPaymentOrder.tableId)
                      setActiveView('New Order')
                    }}
                  >
                    <IconLabel icon={ShoppingCart}>Add more items</IconLabel>
                  </button>
                  <button
                    className="primary-button"
                    disabled={confirmingPaymentId === selectedPaymentOrder.id || amountReceived < total || !customerName}
                    type="button"
                    onClick={() => handleConfirmPayment(selectedPaymentOrder)}
                  >
                    <IconLabel icon={CheckCircle2}>
                      {confirmingPaymentId === selectedPaymentOrder.id ? 'Confirming' : 'Confirm paid'}
                    </IconLabel>
                  </button>
                </div>
              </>
            ) : (
              <EmptyState icon={Wallet} title="Payment queue is clear" body="Create an order to collect payment." />
            )}
          </section>
        </section>

        <section className="table-panel">
          <div className="panel-heading">
            <div>
              <span>Payment history</span>
              <h2>Cash payments</h2>
            </div>
            <Banknote size={20} aria-hidden="true" />
          </div>
          <div className="data-list">
            {payments.length ? (
              payments.map((payment) => (
                <div className="data-row" key={payment.id}>
                  <span>{payment.orderId}</span>
                  <strong>{formatMoney(payment.amountCents)}</strong>
                  <small>{payment.customerName || 'Walk-in customer'} - {payment.staff} confirmed at {payment.time}</small>
                  <button className="secondary-button compact-button" type="button" onClick={() => setInvoiceOrderId(payment.orderId)}>
                    <IconLabel icon={Printer}>Invoice</IconLabel>
                  </button>
                </div>
              ))
            ) : (
              <EmptyState icon={Banknote} title="No payment history" body="Paid orders will be listed here." />
            )}
          </div>
        </section>
      </div>
    )
  }

  function renderKitchenQueue() {
    return (
      <div className="view-stack">
        <ViewHeader
          eyebrow="Realtime queue"
          title="Kitchen and bar"
          action={
            <button
              className="secondary-button"
              type="button"
              onClick={() => handleSettingsToggle('soundAlerts')}
            >
              <IconLabel icon={soundOn ? Bell : BellOff}>{soundOn ? 'Sound on' : 'Sound off'}</IconLabel>
            </button>
          }
        />
        <section className="queue-grid" aria-label="Paid preparation queue">
          {activeKitchenOrders.length ? (
            activeKitchenOrders.map((order) => {
              const table = tables.find((item) => item.id === order.tableId)
              return (
                <article className={`queue-card status-card-${order.status.toLowerCase().replaceAll(' ', '-')}`} key={order.id}>
                  <div className="card-topline">
                    <span>{stationsForOrder(order)}</span>
                    <StatusPill status={order.status} />
                  </div>
                  <h2>{order.id}</h2>
                  <dl className="detail-grid compact">
                    <div>
                      <dt>Table</dt>
                      <dd>{table?.name || order.tableId}</dd>
                    </div>
                    <div>
                      <dt>Received</dt>
                      <dd>{order.paidAt || order.createdAt}</dd>
                    </div>
                  </dl>
                  <div className="queue-items">
                    {order.items.map((item) => (
                      <div className="queue-item" key={item.lineId}>
                        <strong>{item.quantity} x {item.name}</strong>
                        {item.instructions && <span>{item.instructions}</span>}
                      </div>
                    ))}
                  </div>
                  <div className="button-row">
                    <button
                      className="secondary-button"
                      disabled={order.status !== 'Paid'}
                      type="button"
                      onClick={() => updateOrderStatus(order.id, 'Preparing')}
                    >
                      <IconLabel icon={ChefHat}>Preparing</IconLabel>
                    </button>
                    <button
                      className="primary-button"
                      disabled={order.status !== 'Preparing'}
                      type="button"
                      onClick={() => updateOrderStatus(order.id, 'Ready')}
                    >
                      <IconLabel icon={CheckCircle2}>Ready</IconLabel>
                    </button>
                  </div>
                </article>
              )
            })
          ) : (
            <EmptyState icon={ChefHat} title="Queue is clear" body="Paid orders will appear here." />
          )}
        </section>
      </div>
    )
  }

  function renderActiveOrders() {
    const activeOrders = orders.filter((order) => !['Cancelled', 'Refunded'].includes(order.status))
    return (
      <div className="view-stack">
        <ViewHeader eyebrow="Service status" title="Active orders" action={<StatusPill status={`${activeOrders.length} Orders`} />} />
        <section className="orders-list" aria-label="Active orders">
          {activeOrders.length ? (
            activeOrders.map((order) => {
              const table = tables.find((item) => item.id === order.tableId)
              return (
                <article className="order-row" key={order.id}>
                  <div className="order-main">
                    <div>
                      <span>
                        {table?.name || order.tableId}
                        {order.customerName ? ` - ${order.customerName}` : ''}
                      </span>
                      <h2>{order.id}</h2>
                    </div>
                    <StatusPill status={order.status} />
                  </div>
                  <div className="order-meta">
                    <span>{order.items.length} line items</span>
                    <span>{stationsForOrder(order)}</span>
                    <strong>{formatMoney(orderTotal(order))}</strong>
                  </div>
                  <div className="button-row end">
                    {role !== 'Kitchen' && order.status === 'Awaiting Payment' && (
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => {
                          setSelectedPaymentOrderId(order.id)
                          setActiveView('Payments')
                        }}
                      >
                        <IconLabel icon={Wallet}>Take payment</IconLabel>
                      </button>
                    )}
                    {role !== 'Kitchen' && order.status === 'Ready' && (
                      <button className="primary-button" type="button" onClick={() => updateOrderStatus(order.id, 'Served')}>
                        <IconLabel icon={CheckCircle2}>Mark served</IconLabel>
                      </button>
                    )}
                    {role !== 'Kitchen' && order.paymentStatus === 'Paid' && (
                      <button className="secondary-button" type="button" onClick={() => setInvoiceOrderId(order.id)}>
                        <IconLabel icon={Printer}>View invoice</IconLabel>
                      </button>
                    )}
                    {order.status === 'Served' && <StatusPill status="Served" />}
                    {role !== 'Kitchen' && order.status !== 'Served' && (
                      <button className="ghost-button danger-text" type="button" onClick={() => handleCancelOrder(order.id)}>
                        <IconLabel icon={X}>Cancel</IconLabel>
                      </button>
                    )}
                  </div>
                </article>
              )
            })
          ) : (
            <EmptyState icon={ClipboardList} title="No active orders" body="Open a table and create an order to begin service." />
          )}
        </section>
      </div>
    )
  }

  function renderMenuAdmin() {
    const activeItems = menuItems.filter((item) => !item.archived)
    return (
      <div className="view-stack">
        <ViewHeader
          eyebrow="Admin menu"
          title="Menu"
          action={
            <div className="button-row">
              <StatusPill status={`${activeItems.length} Active Items`} />
              <button className="primary-button" type="button" onClick={() => setActiveModal('menu')}>
                <IconLabel icon={Plus}>Add item</IconLabel>
              </button>
            </div>
          }
        />
        <section className="menu-admin-grid">
          {activeItems.length ? (
            activeItems.map((item) => (
              <article className={`menu-admin-card tone-${item.tone}`} key={item.id}>
                <div className="card-topline">
                  <span>{item.category} - {item.station}</span>
                  <StatusPill status={stockStatus(item)} />
                </div>
                <h2>{item.name}</h2>
                <div className="inventory-stepper" aria-label={`${item.name} stock`}>
                  <button
                    className="icon-button compact-button"
                    type="button"
                    aria-label={`Reduce ${item.name} stock`}
                    onClick={() => adjustMenuStock(item.id, -1)}
                    disabled={Number(item.stockQty) <= 0}
                  >
                    <Minus size={17} aria-hidden="true" />
                  </button>
                  <strong>{stockLabel(item)}</strong>
                  <button
                    className="icon-button compact-button"
                    type="button"
                    aria-label={`Increase ${item.name} stock`}
                    onClick={() => adjustMenuStock(item.id, 1)}
                  >
                    <Plus size={17} aria-hidden="true" />
                  </button>
                </div>
                <div className="price-row">
                  <strong>{formatMoney(item.priceCents)}</strong>
                  <div className="button-row">
                    <button className="secondary-button" type="button" onClick={() => toggleMenuAvailability(item.id)}>
                      <IconLabel icon={SlidersHorizontal}>{item.available ? 'Mark unavailable' : 'Mark available'}</IconLabel>
                    </button>
                    <button className="ghost-button danger-text" type="button" onClick={() => archiveMenuItem(item.id)}>
                      <IconLabel icon={Trash}>Archive</IconLabel>
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <EmptyState icon={Utensils} title="No menu items yet" body="Add your first kitchen or bar item." />
          )}
        </section>
      </div>
    )
  }

  function renderExpenses() {
    return (
      <div className="view-stack">
        <ViewHeader
          eyebrow="Admin expenses"
          title="Expenses"
          action={
            <div className="button-row">
              <StatusPill status={formatMoney(expenseTotal)} />
              <button className="primary-button" type="button" onClick={() => setActiveModal('expense')}>
                <IconLabel icon={Plus}>Record expense</IconLabel>
              </button>
            </div>
          }
        />
        <section className="table-panel">
          <div className="panel-heading">
            <div>
              <span>Expense log</span>
              <h2>Today</h2>
            </div>
            <ScrollText size={20} aria-hidden="true" />
          </div>
          <div className="data-list">
            {expenses.length ? (
              expenses.map((expense) => (
                <div className="data-row" key={expense.id}>
                  <span>{expense.category}</span>
                  <strong>{formatMoney(expense.amountCents)}</strong>
                  <small>{expense.description} - {expense.staff} at {expense.time}</small>
                </div>
              ))
            ) : (
              <EmptyState icon={ScrollText} title="No expenses yet" body="Recorded operating expenses will appear here." />
            )}
          </div>
        </section>
      </div>
    )
  }

  function renderReports() {
    const netIncome = paidSalesTotal - expenseTotal
    return (
      <div className="view-stack">
        <ViewHeader
          eyebrow="Reports"
          title="Sales reporting"
          action={
            <div className="button-row">
              <button className="secondary-button" type="button" onClick={() => window.print()}>
                <IconLabel icon={Printer}>Print</IconLabel>
              </button>
              <button className="primary-button" type="button" onClick={downloadReport}>
                <IconLabel icon={Download}>Export</IconLabel>
              </button>
            </div>
          }
        />
        <div className="category-tabs range-tabs" role="tablist" aria-label="Report range">
          {['Daily', 'Weekly', 'Monthly', 'Custom'].map((range) => (
            <button
              className={reportRange === range ? 'active' : ''}
              type="button"
              key={range}
              onClick={() => setReportRange(range)}
            >
              {range}
            </button>
          ))}
        </div>
        <section className="metric-grid compact-metrics">
          <article className="metric-card accent-teal">
            <div>
              <span>Gross sales</span>
              <strong>{formatMoney(paidSalesTotal)}</strong>
            </div>
            <CircleDollarSign size={24} aria-hidden="true" />
          </article>
          <article className="metric-card accent-red">
            <div>
              <span>Expenses</span>
              <strong>{formatMoney(expenseTotal)}</strong>
            </div>
            <ScrollText size={24} aria-hidden="true" />
          </article>
          <article className="metric-card accent-green">
            <div>
              <span>Net income</span>
              <strong>{formatMoney(netIncome)}</strong>
            </div>
            <Banknote size={24} aria-hidden="true" />
          </article>
        </section>
        <section className="dashboard-grid">
          <article className="chart-panel">
            <div className="panel-heading">
              <div>
                <span>{reportRange} view</span>
                <h2>Cash sales</h2>
              </div>
              <ChartColumn size={20} aria-hidden="true" />
            </div>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklySales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7DCE6" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatMoney(Number(value) * 100)} />
                  <Area type="monotone" dataKey="sales" stroke="#523560" fill="#EDE3F0" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>
          <article className="chart-panel">
            <div className="panel-heading">
              <div>
                <span>Item movement</span>
                <h2>Best selling items</h2>
              </div>
              <Utensils size={20} aria-hidden="true" />
            </div>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={menuSalesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7DCE6" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#FFC857" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>
      </div>
    )
  }

  function renderStaffAccounts() {
    return (
      <div className="view-stack">
        <ViewHeader
          eyebrow="Admin access"
          title="Staff accounts"
          action={
            <div className="button-row">
              <StatusPill status={`${staffAccounts.length} Users`} />
              <button className="primary-button" type="button" onClick={() => setActiveModal('staff')}>
                <IconLabel icon={Plus}>Add staff</IconLabel>
              </button>
            </div>
          }
        />
        <section className="staff-grid">
          {staffAccounts.map((staff) => (
            <article className="staff-card" key={staff.id}>
              <div className="staff-avatar" aria-hidden="true">{staff.name.slice(0, 1)}</div>
              <div>
                <h2>{staff.name}</h2>
                <span>{staff.role} - @{staff.username}</span>
              </div>
              <StatusPill status={staff.status} />
              <button className="secondary-button" type="button" onClick={() => toggleStaffStatus(staff.id)}>
                <IconLabel icon={ShieldCheck}>{staff.status === 'Active' ? 'Deactivate' : 'Activate'}</IconLabel>
              </button>
            </article>
          ))}
        </section>
      </div>
    )
  }

  function renderAuditLogs() {
    return (
      <div className="view-stack">
        <ViewHeader eyebrow="Audit trail" title="Audit logs" action={<StatusPill status={`${auditLogs.length} Events`} />} />
        <section className="timeline" aria-label="Audit log events">
          {auditLogs.length ? (
            auditLogs.map((log) => (
              <article className="timeline-row" key={log.id}>
                <span>{log.time}</span>
                <div>
                  <h2>{log.action}</h2>
                  <p>{log.detail}</p>
                </div>
                <strong>{log.actor}</strong>
              </article>
            ))
          ) : (
            <EmptyState icon={ScrollText} title="No audit events yet" body="System activity will be logged here." />
          )}
        </section>
      </div>
    )
  }

  function renderSettings() {
    const lockedRules = [
      'Customers must pay before kitchen or bar preparation.',
      'Additional orders stay under the same active table session.',
      'Served, cancelled, and refunded records remain in audit history.',
      'Menu edits do not alter historical order names or prices.',
    ]
    return (
      <div className="view-stack">
        <ViewHeader eyebrow="System settings" title="Settings" action={<StatusPill status="Protected Rules" />} />
        <section className="settings-grid">
          <article className="table-panel">
            <div className="panel-heading">
              <div>
                <span>Business rules</span>
                <h2>Locked safeguards</h2>
              </div>
              <ShieldCheck size={20} aria-hidden="true" />
            </div>
            <div className="check-list">
              {lockedRules.map((rule) => (
                <div className="check-row" key={rule}>
                  <CheckCircle2 size={18} aria-hidden="true" />
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </article>
          <article className="table-panel">
            <div className="panel-heading">
              <div>
                <span>Operations</span>
                <h2>Preferences</h2>
              </div>
              <Settings size={20} aria-hidden="true" />
            </div>
            <div className="settings-list">
              {[
                ['printReceipts', 'Print receipt after payment'],
                ['soundAlerts', 'Sound notification for paid orders'],
                ['requireServedBeforeCleaning', 'Require completed orders before cleaning'],
              ].map(([key, label]) => (
                <label className="toggle-row" key={key}>
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={settingsState[key]}
                    onChange={() => handleSettingsToggle(key)}
                  />
                </label>
              ))}
            </div>
          </article>
        </section>
      </div>
    )
  }

  function renderAdminModal() {
    if (!activeModal) return null

    const modalCopy = {
      menu: { eyebrow: 'Admin menu', title: 'Add menu item' },
      expense: { eyebrow: 'Admin expenses', title: 'Record expense' },
      staff: { eyebrow: 'Admin access', title: 'Add staff account' },
    }
    const currentModal = modalCopy[activeModal]
    if (!currentModal) return null
    const menuCategoryOptions = [
      ...new Set([...inventoryCategoryOrder, ...menuItems.filter((item) => !item.archived).map((item) => item.category)]),
    ]
      .sort((a, b) => {
        const rankA = inventoryCategoryOrder.includes(a) ? inventoryCategoryOrder.indexOf(a) : inventoryCategoryOrder.length
        const rankB = inventoryCategoryOrder.includes(b) ? inventoryCategoryOrder.indexOf(b) : inventoryCategoryOrder.length

        return rankA === rankB ? a.localeCompare(b) : rankA - rankB
      })

    return (
      <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
        <section className="admin-modal-card">
          <div className="modal-heading">
            <div>
              <span>{currentModal.eyebrow}</span>
              <h2 id="admin-modal-title">{currentModal.title}</h2>
            </div>
            <button className="icon-button" type="button" aria-label="Close modal" onClick={() => setActiveModal(null)}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {activeModal === 'menu' && (
            <form className="form-panel modal-form" onSubmit={handleAddMenuItem}>
              <label className="field-label">
                Item name
                <input
                  value={menuDraft.name}
                  onChange={(event) => setMenuDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Menu item"
                />
              </label>
              <label className="field-label">
                Category
                <select
                  value={menuDraft.category}
                  onChange={(event) =>
                    setMenuDraft((current) => ({
                      ...current,
                      category: event.target.value,
                      addingCategory: false,
                      newCategory: '',
                    }))
                  }
                >
                  {menuCategoryOptions.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <div className={`add-category-control ${menuDraft.addingCategory ? 'expanded' : ''}`}>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() =>
                    setMenuDraft((current) => ({
                      ...current,
                      addingCategory: !current.addingCategory,
                      newCategory: '',
                    }))
                  }
                >
                  <IconLabel icon={Plus}>Add category</IconLabel>
                </button>
                {menuDraft.addingCategory && (
                  <label className="field-label add-category-field">
                    Category name
                    <input
                      autoFocus
                      value={menuDraft.newCategory}
                      onChange={(event) =>
                        setMenuDraft((current) => ({ ...current, newCategory: event.target.value }))
                      }
                      placeholder="New category"
                    />
                  </label>
                )}
              </div>
              <label className="field-label">
                Price
                <input
                  inputMode="decimal"
                  value={menuDraft.price}
                  onChange={(event) => setMenuDraft((current) => ({ ...current, price: event.target.value }))}
                  placeholder="0.00"
                />
              </label>
              <label className="field-label">
                Opening stock
                <input
                  inputMode="numeric"
                  value={menuDraft.stock}
                  onChange={(event) => setMenuDraft((current) => ({ ...current, stock: event.target.value }))}
                  placeholder="0"
                />
              </label>
              <label className="field-label">
                Station
                <select
                  value={menuDraft.station}
                  onChange={(event) => setMenuDraft((current) => ({ ...current, station: event.target.value }))}
                >
                  <option>Kitchen</option>
                  <option>Bar</option>
                </select>
              </label>
              <button className="primary-button" type="submit">
                <IconLabel icon={Plus}>Save item</IconLabel>
              </button>
            </form>
          )}

          {activeModal === 'expense' && (
            <form className="form-panel modal-form" onSubmit={handleAddExpense}>
              <label className="field-label">
                Category
                <select
                  value={expenseDraft.category}
                  onChange={(event) => setExpenseDraft((current) => ({ ...current, category: event.target.value }))}
                >
                  <option>Produce</option>
                  <option>Supplies</option>
                  <option>Maintenance</option>
                  <option>Payroll</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="field-label">
                Amount
                <input
                  inputMode="decimal"
                  value={expenseDraft.amount}
                  onChange={(event) => setExpenseDraft((current) => ({ ...current, amount: event.target.value }))}
                  placeholder="0.00"
                />
              </label>
              <label className="field-label wide">
                Description
                <input
                  value={expenseDraft.description}
                  onChange={(event) => setExpenseDraft((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Expense description"
                />
              </label>
              <button className="primary-button" type="submit">
                <IconLabel icon={Plus}>Save expense</IconLabel>
              </button>
            </form>
          )}

          {activeModal === 'staff' && (
            <form className="form-panel modal-form" onSubmit={handleAddStaff}>
              <label className="field-label wide">
                Staff name
                <input
                  value={staffDraft.name}
                  onChange={(event) => setStaffDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Full name"
                />
              </label>
              <label className="field-label">
                Username
                <input
                  autoComplete="username"
                  value={staffDraft.username}
                  onChange={(event) => setStaffDraft((current) => ({ ...current, username: event.target.value }))}
                  placeholder="username"
                />
              </label>
              <label className="field-label">
                Password
                <input
                  autoComplete="new-password"
                  type="password"
                  value={staffDraft.password}
                  onChange={(event) => setStaffDraft((current) => ({ ...current, password: event.target.value }))}
                  placeholder="password"
                />
              </label>
              <label className="field-label">
                Role
                <select
                  value={staffDraft.role}
                  onChange={(event) => setStaffDraft((current) => ({ ...current, role: event.target.value }))}
                >
                  <option>Admin</option>
                  <option>Staff</option>
                  <option>Kitchen</option>
                </select>
              </label>
              <label className="field-label">
                Status
                <select
                  value={staffDraft.status}
                  onChange={(event) => setStaffDraft((current) => ({ ...current, status: event.target.value }))}
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </label>
              <button className="primary-button" type="submit">
                <IconLabel icon={Plus}>Save staff</IconLabel>
              </button>
            </form>
          )}
        </section>
      </div>
    )
  }

  function renderInvoiceModal() {
    if (!invoiceOrderId) return null
    const order = orders.find((item) => item.id === invoiceOrderId)
    if (!order) return null
    const payment = payments.find((item) => item.orderId === order.id)
    if (!payment || payment.status !== 'Paid') return null
    const table = tables.find((item) => item.id === order.tableId)
    const total = orderTotal(order)
    const customerName = payment.customerName || order.customerName || 'Walk-in customer'

    return (
      <div className="invoice-overlay" role="dialog" aria-modal="true" aria-labelledby="invoice-title">
        <section className="invoice-card">
          <div className="invoice-actions no-print">
            <button className="secondary-button" type="button" onClick={() => window.print()}>
              <IconLabel icon={Printer}>Print</IconLabel>
            </button>
            <button className="ghost-button" type="button" onClick={() => setInvoiceOrderId(null)}>
              <IconLabel icon={X}>Close</IconLabel>
            </button>
          </div>

          <div className="invoice-paper">
            <div className="invoice-brand">
              <div>
                <span>Paid invoice</span>
                <h2 id="invoice-title">The Beach Project</h2>
                <p>Restobar and Beach Resort</p>
              </div>
              <strong>PAID</strong>
            </div>

            <div className="invoice-meta-grid">
              <div>
                <span>Invoice no.</span>
                <strong>INV-{order.id.replace('ORD-', '')}</strong>
              </div>
              <div>
                <span>Order no.</span>
                <strong>{order.id}</strong>
              </div>
              <div>
                <span>Table</span>
                <strong>{table?.name || order.tableId}</strong>
              </div>
              <div>
                <span>Customer</span>
                <strong>{customerName}</strong>
              </div>
              <div>
                <span>Date paid</span>
                <strong>{todayDate()}</strong>
              </div>
              <div>
                <span>Time paid</span>
                <strong>{payment.time}</strong>
              </div>
              <div>
                <span>Cashier</span>
                <strong>{payment.staff}</strong>
              </div>
            </div>

            <div className="invoice-lines" aria-label="Invoice items">
              <div className="invoice-line invoice-line-head">
                <span>Item</span>
                <span>Qty</span>
                <span>Subtotal</span>
              </div>
              {order.items.map((item) => (
                <div className="invoice-line" key={item.lineId}>
                  <div>
                    <strong>{item.name}</strong>
                    {item.instructions && <small>{item.instructions}</small>}
                  </div>
                  <span>{item.quantity}</span>
                  <strong>{formatMoney(item.priceCents * item.quantity)}</strong>
                </div>
              ))}
            </div>

            <div className="invoice-total-box">
              <div>
                <span>Total paid</span>
                <strong>{formatMoney(total)}</strong>
              </div>
              <div>
                <span>Customer paid</span>
                <strong>{formatMoney(payment.amountReceivedCents)}</strong>
              </div>
              <div>
                <span>Change</span>
                <strong>{formatMoney(payment.changeCents)}</strong>
              </div>
            </div>

            <p className="invoice-note">
              Show this paid invoice to the customer after payment confirmation. This order has already been sent to the kitchen/bar queue.
            </p>
          </div>
        </section>
      </div>
    )
  }

  function renderLogin() {
    const publicMenuItems = menuItems.filter((item) => !item.archived)
    const inStockCount = publicMenuItems.filter((item) => stockStatus(item) === 'In Stock').length
    const lowStockCount = publicMenuItems.filter((item) => stockStatus(item) === 'Low Stock').length
    const outStockCount = publicMenuItems.filter((item) => ['Out of Stock', 'Unavailable'].includes(stockStatus(item))).length
    const totalStock = publicMenuItems.reduce((sum, item) => sum + (Number(item.stockQty) || 0), 0)
    const selectedInventoryFilter = publicInventoryFilter === 'All'
      || inventoryCategoryOrder.includes(publicInventoryFilter)
      || publicMenuItems.some((item) => item.category === publicInventoryFilter)
      ? publicInventoryFilter
      : 'All'
    const inventoryGroups = [...new Set(publicMenuItems.map((item) => item.category))]
      .sort((a, b) => {
        const rankA = inventoryCategoryOrder.includes(a) ? inventoryCategoryOrder.indexOf(a) : inventoryCategoryOrder.length
        const rankB = inventoryCategoryOrder.includes(b) ? inventoryCategoryOrder.indexOf(b) : inventoryCategoryOrder.length

        return rankA === rankB ? a.localeCompare(b) : rankA - rankB
      })
      .map((category) => {
        const items = publicMenuItems
          .filter((item) => item.category === category)
          .sort((a, b) => a.station.localeCompare(b.station) || a.name.localeCompare(b.name))
        const statusCounts = items.reduce(
          (totals, item) => {
            const status = stockStatus(item)
            if (status === 'In Stock') totals.ready += 1
            if (status === 'Low Stock') totals.low += 1
            if (status === 'Out of Stock' || status === 'Unavailable') totals.out += 1
            return totals
          },
          { ready: 0, low: 0, out: 0 },
        )

        return {
          category,
          items,
          ...statusCounts,
          stations: [...new Set(items.map((item) => item.station))].sort(),
          totalStock: items.reduce((sum, item) => sum + (Number(item.stockQty) || 0), 0),
        }
      })
    const publicInventoryQuery = publicInventorySearch.trim().toLowerCase()
    const visibleInventoryRows = publicMenuItems
      .filter((item) => selectedInventoryFilter === 'All' || item.category === selectedInventoryFilter)
      .filter((item) => {
        if (!publicInventoryQuery) return true
        return `${item.name} ${item.category} ${item.station}`.toLowerCase().includes(publicInventoryQuery)
      })
      .sort((a, b) => {
        const rankA = inventoryCategoryOrder.includes(a.category)
          ? inventoryCategoryOrder.indexOf(a.category)
          : inventoryCategoryOrder.length
        const rankB = inventoryCategoryOrder.includes(b.category)
          ? inventoryCategoryOrder.indexOf(b.category)
          : inventoryCategoryOrder.length

        return rankA === rankB ? a.name.localeCompare(b.name) : rankA - rankB
      })
    const inventorySummaryCards = [
      {
        label: 'Total items',
        value: publicMenuItems.length,
        detail: 'in inventory',
        icon: PackageOpen,
        tone: 'total',
      },
      {
        label: 'Total stock',
        value: totalStock,
        detail: 'units',
        icon: Database,
        tone: 'stock',
      },
      {
        label: 'Ready',
        value: inStockCount,
        detail: 'items',
        icon: CheckCircle2,
        tone: 'ready',
      },
      {
        label: 'Low / Out',
        value: lowStockCount + outStockCount,
        detail: 'items',
        icon: CircleAlert,
        tone: 'alert',
      },
    ]
    const categoryIconMap = {
      All: PackageOpen,
      Mains: Utensils,
      Seafood: Waves,
      Desserts: ShoppingCart,
      Drinks: Database,
    }
    const filterButtonGroups = [
      {
        category: 'All',
        itemCount: publicMenuItems.length,
        totalStock,
        Icon: categoryIconMap.All,
      },
      ...inventoryGroups.map((group) => ({
        category: group.category,
        itemCount: group.items.length,
        totalStock: group.totalStock,
        Icon: categoryIconMap[group.category] || PackageOpen,
      })),
    ]

    return (
      <main className="login-shell">
        <div className="login-layout">
          <section className="login-card" aria-labelledby="login-title">
            <div className="login-logo-card">
              <div className="brand-mark">
                <img src="/bp.png" alt="The Beach Project logo" />
              </div>
            </div>
            <div className="login-brand-copy">
              <h1 id="login-title">RESTOBAR OPS</h1>
              <span>Sign in to your account</span>
            </div>

            {(!databaseReady || !databaseConnected || databaseError) && (
              <div
                className={`connection-status ${databaseReady && (!databaseConnected || databaseError) ? 'error' : ''}`}
                role={databaseReady && (!databaseConnected || databaseError) ? 'alert' : 'status'}
              >
                {databaseReady && (!databaseConnected || databaseError) ? (
                  <CircleAlert size={16} aria-hidden="true" />
                ) : (
                  <Database size={16} aria-hidden="true" />
                )}
                <span>
                  {!databaseReady
                    ? 'Connecting to Supabase'
                    : databaseError || 'Supabase is not connected.'}
                </span>
              </div>
            )}

            <form className="login-form" onSubmit={handleLogin}>
              <label className="login-field">
                <span>Username</span>
                <div className="login-input-shell">
                  <User size={16} aria-hidden="true" />
                  <input
                    autoComplete="username"
                    autoFocus
                    value={loginDraft.username}
                    onChange={(event) =>
                      setLoginDraft((current) => ({ ...current, username: event.target.value }))
                    }
                    placeholder="Enter your username"
                  />
                </div>
              </label>
              <label className="login-field">
                <span>Password</span>
                <div className="login-input-shell">
                  <LockKeyhole size={16} aria-hidden="true" />
                  <input
                    autoComplete="current-password"
                    type="password"
                    value={loginDraft.password}
                    onChange={(event) =>
                      setLoginDraft((current) => ({ ...current, password: event.target.value }))
                    }
                    placeholder="Enter your password"
                  />
                  <Eye className="login-input-trailing" size={16} aria-hidden="true" />
                </div>
              </label>
              {loginError && (
                <div className="login-error" role="alert">
                  <CircleAlert size={18} aria-hidden="true" />
                  <span>{loginError}</span>
                </div>
              )}
              <button className="login-submit" disabled={!canUseDatabase} type="submit">
                <IconLabel icon={ShieldCheck}>Log in</IconLabel>
              </button>
            </form>
          </section>

          <section className="public-inventory-panel" aria-labelledby="public-inventory-title">
            <div className="inventory-topbar">
              <div>
                <span>Live menu</span>
                <h2 id="public-inventory-title">Stocks &amp; Inventory</h2>
              </div>
              <div className="inventory-user-chip" aria-label="Restobar Ops profile">
                <PackageOpen size={19} aria-hidden="true" />
                <div>
                  <strong>Restobar Ops</strong>
                  <span>The Beach Project</span>
                </div>
                <b>TB</b>
                <ChevronDown size={14} aria-hidden="true" />
              </div>
            </div>

            <div className="inventory-metric-grid" aria-label="Inventory summary">
              {inventorySummaryCards.map(({ label, value, detail, icon: Icon, tone }) => (
                <div className={`inventory-metric ${tone}`} key={label}>
                  <span className="inventory-metric-icon">
                    <Icon size={23} aria-hidden="true" />
                  </span>
                  <div>
                    <small>{label}</small>
                    <strong>{value}</strong>
                    <em>{detail}</em>
                  </div>
                </div>
              ))}
            </div>

            <div className="inventory-category-summary" aria-label="Inventory category filters">
              {filterButtonGroups.map(({ category, itemCount, Icon }) => (
                <button
                  className={`inventory-category-chip ${selectedInventoryFilter === category ? 'active' : ''}`}
                  type="button"
                  key={category}
                  onClick={() => setPublicInventoryFilter(category)}
                  aria-pressed={selectedInventoryFilter === category}
                >
                  <Icon size={16} aria-hidden="true" />
                  <strong>{category}</strong>
                  <span>{itemCount}</span>
                </button>
              ))}
            </div>

            <div className="inventory-toolbar">
              <label className="inventory-search">
                <Search size={17} aria-hidden="true" />
                <input
                  type="search"
                  value={publicInventorySearch}
                  onChange={(event) => setPublicInventorySearch(event.target.value)}
                  placeholder="Search items, categories..."
                />
              </label>
              <button className="inventory-filter-button" type="button">
                <SlidersHorizontal size={16} aria-hidden="true" />
                <span>Filter</span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>
            </div>

            <div className="inventory-table" role="table" aria-label="Inventory stock table">
              <div className="inventory-table-head" role="row">
                <span>Item</span>
                <span>Category</span>
                <span>Price</span>
                <span>Status</span>
                <span>Stock</span>
                <span aria-hidden="true" />
              </div>
              <div className="inventory-table-body">
                {visibleInventoryRows.map((item) => {
                  const stockQty = Math.max(0, Number(item.stockQty) || 0)
                  const stockFill = `${Math.min(100, Math.max(stockQty > 0 ? 8 : 0, Math.round((stockQty / 30) * 100)))}%`
                  const displayStatus = stockStatus(item) === 'Unavailable' ? 'Out of Stock' : stockStatus(item)
                  const statusClass = displayStatus.toLowerCase().replaceAll(' ', '-')
                  const categoryClass = item.category.toLowerCase().replaceAll(' ', '-')

                  return (
                    <article className="inventory-table-row" role="row" key={item.id}>
                      <div className="inventory-table-item" role="cell">
                        <strong>{item.name}</strong>
                        <span>{item.station}</span>
                      </div>
                      <span className={`inventory-table-category category-${categoryClass}`} role="cell">
                        {item.category}
                      </span>
                      <strong role="cell">{formatMoney(item.priceCents)}</strong>
                      <span className={`inventory-table-status ${statusClass}`} role="cell">
                        <i aria-hidden="true" />
                        {displayStatus}
                      </span>
                      <div className="inventory-table-stock" role="cell">
                        <span>{stockLabel(item)}</span>
                        <div className={`stock-meter ${statusClass}`} aria-hidden="true">
                          <span style={{ width: stockFill }} />
                        </div>
                      </div>
                      <ChevronRight size={16} aria-hidden="true" />
                    </article>
                  )
                })}
                {!visibleInventoryRows.length && (
                  <div className="inventory-empty-row">
                    <Search size={18} aria-hidden="true" />
                    <span>No menu items match the current inventory filters.</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
        <LoadingOverlay message={loadingMessage} />
      </main>
    )
  }

  function renderView() {
    const viewToRender = allowedViews.includes(activeView) ? activeView : allowedViews[0]

    switch (viewToRender) {
      case 'Dashboard':
        return renderDashboard()
      case 'Tables':
        return renderTables()
      case 'New Order':
        return renderOrderScreen()
      case 'Active Orders':
        return renderActiveOrders()
      case 'Payments':
        return renderPayments()
      case 'Kitchen/Bar Queue':
        return renderKitchenQueue()
      case 'Menu':
        return renderMenuAdmin()
      case 'Expenses':
        return renderExpenses()
      case 'Reports':
        return renderReports()
      case 'Staff Accounts':
        return renderStaffAccounts()
      case 'Audit Logs':
        return renderAuditLogs()
      case 'Settings':
        return renderSettings()
      default:
        return renderDashboard()
    }
  }

  if (!currentUser) {
    return renderLogin()
  }

  const visibleActiveView = allowedViews.includes(activeView) ? activeView : allowedViews[0]

  return (
    <div className={`app-shell ${invoiceOrderId ? 'invoice-open' : ''}`}>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Main navigation">
        <div className="brand-lockup">
          <div className="brand-mark">
            <img src="/bp.png" alt="The Beach Project logo" />
          </div>
          <div>
            <strong>The Beach Project</strong>
            <span>Restobar Ops</span>
          </div>
        </div>
        <nav className="side-nav">
          {allowedViews.map((view) => {
            const Icon = viewMeta[view].icon
            return (
              <button
                className={visibleActiveView === view ? 'active' : ''}
                type="button"
                key={view}
                onClick={() => goToView(view)}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{view}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <button className="icon-button menu-button" type="button" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} aria-hidden="true" />
          </button>
          <div className="topbar-title">
            <span>{visibleActiveView}</span>
            <strong>{currentStaff}</strong>
            <small>{role}</small>
          </div>
          <div className="account-actions">
            <div className="account-chip" aria-label="Signed in account">
              <span>@{currentUser.username}</span>
              <strong>{role}</strong>
            </div>
            <button className="icon-button" type="button" aria-label="Log out" onClick={handleLogout}>
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        {notice && (
          <div className={`notice notice-${notice.type}`} role="status">
            {notice.type === 'error' ? <CircleAlert size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
            <span>{notice.message}</span>
            <button className="icon-button" type="button" aria-label="Dismiss message" onClick={() => setNotice(null)}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        )}

        <main className="workspace">{renderView()}</main>
      </div>

      {sidebarOpen && <button className="scrim" type="button" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}
      {renderAdminModal()}
      {renderInvoiceModal()}
      <LoadingOverlay message={loadingMessage} />

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {allowedViews.slice(0, 5).map((view) => {
          const Icon = viewMeta[view].icon
          return (
            <button
              className={visibleActiveView === view ? 'active' : ''}
              type="button"
              key={view}
              onClick={() => goToView(view)}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{view}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function ViewHeader({ eyebrow, title, action }) {
  return (
    <div className="view-header">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      {action && <div className="view-action">{action}</div>}
    </div>
  )
}

export default App
