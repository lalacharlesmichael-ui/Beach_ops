import { isSupabaseConfigured, supabase, supabaseConfigError } from './supabaseClient'

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(supabaseConfigError || 'Supabase is not configured.')
  }

  return supabase
}

function formatSupabaseError(error) {
  return [
    error.message,
    error.details,
    error.hint ? `Hint: ${error.hint}` : '',
    error.code ? `Code: ${error.code}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function throwIfError(error) {
  if (error) {
    throw new Error(formatSupabaseError(error))
  }
}

function dbTimeToLabel(value) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function toStaffAccount(row) {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    password: row.password,
    role: row.role,
    status: row.status,
  }
}

function toTable(row) {
  return {
    id: row.id,
    name: row.name,
    area: row.area,
    capacity: row.capacity,
    status: row.status,
  }
}

function toTableSession(row) {
  return {
    id: row.id,
    tableId: row.table_id,
    openedAt: dbTimeToLabel(row.opened_at),
    closedAt: dbTimeToLabel(row.closed_at),
  }
}

function toMenuItem(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    priceCents: row.price_cents,
    station: row.station,
    available: row.available,
    stockQty: row.stock_qty,
    archived: row.archived,
    tone: row.tone,
  }
}

function toOrderItem(row) {
  return {
    lineId: row.line_id,
    itemId: row.menu_item_id,
    name: row.name,
    category: row.category,
    station: row.station,
    quantity: row.quantity,
    priceCents: row.price_cents,
    instructions: row.instructions || '',
  }
}

function toOrder(row, itemsByOrderId) {
  return {
    id: row.id,
    sessionId: row.session_id,
    tableId: row.table_id,
    status: row.status,
    paymentStatus: row.payment_status,
    createdAt: dbTimeToLabel(row.created_at),
    paidAt: dbTimeToLabel(row.paid_at),
    paidBy: row.paid_by || undefined,
    staff: row.staff,
    customerName: row.customer_name || '',
    items: itemsByOrderId[row.id] || [],
  }
}

function toPayment(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    method: row.method,
    status: row.status,
    amountCents: row.amount_cents,
    amountReceivedCents: row.amount_received_cents,
    changeCents: row.change_cents,
    customerName: row.customer_name,
    staff: row.staff,
    time: dbTimeToLabel(row.paid_at),
  }
}

function toExpense(row) {
  return {
    id: row.id,
    category: row.category,
    description: row.description,
    amountCents: row.amount_cents,
    staff: row.staff,
    time: dbTimeToLabel(row.spent_at),
  }
}

function toAuditLog(row) {
  return {
    id: row.id,
    actor: row.actor,
    action: row.action,
    detail: row.detail,
    time: dbTimeToLabel(row.logged_at),
  }
}

function toSettings(row) {
  return {
    printReceipts: row.print_receipts,
    soundAlerts: row.sound_alerts,
    requireServedBeforeCleaning: row.require_served_before_cleaning,
  }
}

export function isoNow() {
  return new Date().toISOString()
}

export async function loadAppData() {
  const client = requireSupabase()
  const [
    staffResponse,
    tablesResponse,
    sessionsResponse,
    menuResponse,
    ordersResponse,
    orderItemsResponse,
    paymentsResponse,
    expensesResponse,
    auditResponse,
    settingsResponse,
  ] = await Promise.all([
    client.from('staff_accounts').select('*').order('id', { ascending: true }),
    client.from('tables').select('*').order('id', { ascending: true }),
    client.from('table_sessions').select('*').order('created_at', { ascending: false }),
    client.from('menu_items').select('*').order('created_at', { ascending: false }),
    client.from('orders').select('*').order('created_at', { ascending: false }),
    client.from('order_items').select('*').order('id', { ascending: true }),
    client.from('payments').select('*').order('paid_at', { ascending: false }),
    client.from('expenses').select('*').order('spent_at', { ascending: false }),
    client.from('audit_logs').select('*').order('logged_at', { ascending: false }),
    client.from('settings').select('*').eq('id', 'default').maybeSingle(),
  ])

  const responses = [
    staffResponse,
    tablesResponse,
    sessionsResponse,
    menuResponse,
    ordersResponse,
    orderItemsResponse,
    paymentsResponse,
    expensesResponse,
    auditResponse,
    settingsResponse,
  ]
  responses.forEach(({ error }) => throwIfError(error))

  const itemsByOrderId = (orderItemsResponse.data || []).reduce((groups, row) => {
    const nextGroups = groups
    nextGroups[row.order_id] = [...(nextGroups[row.order_id] || []), toOrderItem(row)]
    return nextGroups
  }, {})

  return {
    staffAccounts: (staffResponse.data || []).map(toStaffAccount),
    tables: (tablesResponse.data || []).map(toTable),
    sessions: (sessionsResponse.data || []).map(toTableSession),
    menuItems: (menuResponse.data || []).map(toMenuItem),
    orders: (ordersResponse.data || []).map((row) => toOrder(row, itemsByOrderId)),
    payments: (paymentsResponse.data || []).map(toPayment),
    expenses: (expensesResponse.data || []).map(toExpense),
    auditLogs: (auditResponse.data || []).map(toAuditLog),
    settings: settingsResponse.data ? toSettings(settingsResponse.data) : null,
  }
}

export async function upsertStaffAccounts(staffAccounts) {
  const client = requireSupabase()
  const { error } = await client.from('staff_accounts').upsert(staffAccounts)
  throwIfError(error)
}

export async function upsertTables(tables) {
  const client = requireSupabase()
  const { error } = await client.from('tables').upsert(tables)
  throwIfError(error)
}

export async function upsertDefaultSettings(settings) {
  const client = requireSupabase()
  const { error } = await client.from('settings').upsert({
    id: 'default',
    print_receipts: settings.printReceipts,
    sound_alerts: settings.soundAlerts,
    require_served_before_cleaning: settings.requireServedBeforeCleaning,
  })
  throwIfError(error)
}

export async function updateSettings(settings) {
  const client = requireSupabase()
  const { error } = await client
    .from('settings')
    .update({
      print_receipts: settings.printReceipts,
      sound_alerts: settings.soundAlerts,
      require_served_before_cleaning: settings.requireServedBeforeCleaning,
    })
    .eq('id', 'default')
  throwIfError(error)
}

export async function insertTableSession(session) {
  const client = requireSupabase()
  const { error } = await client.from('table_sessions').insert({
    id: session.id,
    table_id: session.tableId,
    opened_at: session.openedAtIso,
    closed_at: session.closedAtIso || null,
  })
  throwIfError(error)
}

export async function updateTableStatus(tableId, status) {
  const client = requireSupabase()
  const { error } = await client.from('tables').update({ status }).eq('id', tableId)
  throwIfError(error)
}

export async function closeTableSession(sessionId, closedAtIso) {
  const client = requireSupabase()
  const { error } = await client
    .from('table_sessions')
    .update({ closed_at: closedAtIso })
    .eq('id', sessionId)
  throwIfError(error)
}

export async function updateMenuItem(menuItemId, values) {
  const client = requireSupabase()
  const { error } = await client.from('menu_items').update(values).eq('id', menuItemId)
  throwIfError(error)
}

export async function insertMenuItem(item) {
  const client = requireSupabase()
  const { error } = await client.from('menu_items').insert({
    id: item.id,
    name: item.name,
    category: item.category,
    price_cents: item.priceCents,
    station: item.station,
    available: item.available,
    stock_qty: item.stockQty,
    archived: item.archived,
    tone: item.tone,
  })
  throwIfError(error)
}

export async function insertOrder(order) {
  const client = requireSupabase()
  const { error: orderError } = await client.from('orders').insert({
    id: order.id,
    session_id: order.sessionId,
    table_id: order.tableId,
    status: order.status,
    payment_status: order.paymentStatus,
    created_at: order.createdAtIso,
    paid_at: order.paidAtIso || null,
    staff: order.staff,
    customer_name: order.customerName,
  })
  throwIfError(orderError)

  const { error: itemError } = await client.from('order_items').insert(
    order.items.map((item) => ({
      order_id: order.id,
      line_id: item.lineId,
      menu_item_id: item.itemId,
      name: item.name,
      category: item.category,
      station: item.station,
      quantity: item.quantity,
      price_cents: item.priceCents,
      instructions: item.instructions,
    })),
  )
  throwIfError(itemError)
}

export async function updateOrder(orderId, values) {
  const client = requireSupabase()
  const { error } = await client.from('orders').update(values).eq('id', orderId)
  throwIfError(error)
}

export async function insertPayment(payment) {
  const client = requireSupabase()
  const { error } = await client.from('payments').insert({
    id: payment.id,
    order_id: payment.orderId,
    method: payment.method,
    status: payment.status,
    amount_cents: payment.amountCents,
    amount_received_cents: payment.amountReceivedCents,
    change_cents: payment.changeCents,
    customer_name: payment.customerName,
    staff: payment.staff,
    paid_at: payment.paidAtIso,
  })
  throwIfError(error)
}

export async function insertExpense(expense) {
  const client = requireSupabase()
  const { error } = await client.from('expenses').insert({
    id: expense.id,
    category: expense.category,
    description: expense.description,
    amount_cents: expense.amountCents,
    staff: expense.staff,
    spent_at: expense.spentAtIso,
  })
  throwIfError(error)
}

export async function insertStaffAccount(staff) {
  const client = requireSupabase()
  const { error } = await client.from('staff_accounts').insert(staff)
  throwIfError(error)
}

export async function updateStaffAccount(staffId, values) {
  const client = requireSupabase()
  const { error } = await client.from('staff_accounts').update(values).eq('id', staffId)
  throwIfError(error)
}

export async function insertAuditLog(log) {
  const client = requireSupabase()
  const { error } = await client.from('audit_logs').insert({
    id: log.id,
    actor: log.actor,
    action: log.action,
    detail: log.detail,
    logged_at: log.loggedAtIso,
  })
  throwIfError(error)
}
