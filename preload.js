const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  importExcel: () => ipcRenderer.invoke('import-excel'),
  getProducts: () => ipcRenderer.invoke('get-products'),
  addProduct: (product) => ipcRenderer.invoke('add-product', product),

  addProductsBulk: (products, opciones) =>
  ipcRenderer.invoke('add-products-bulk', products, opciones),

  updateProduct: (product) => ipcRenderer.invoke('update-product', product),
  deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
  updatePrices: (percent) => ipcRenderer.invoke('update-prices', percent),
  updatePricesAdvanced: (data) => ipcRenderer.invoke('update-prices-advanced', data),
  getCategories: () => ipcRenderer.invoke('get-categories'),
  addCategory: (nombre) => ipcRenderer.invoke('add-category', nombre),
  deleteAllProducts: () => ipcRenderer.invoke('delete-all-products'),
  sellProduct: (data) => ipcRenderer.invoke('sell-product', data),
  getSalesSummary: (data) => ipcRenderer.invoke('get-sales-summary', data),
  getFinanceMetrics: (data) => ipcRenderer.invoke('get-finance-metrics', data),
  getSalesByDay: (yearMonth) => ipcRenderer.invoke('get-sales-by-day', yearMonth),
  getSalesByDate: (fecha) => ipcRenderer.invoke('get-sales-by-date', fecha),
  getHistorialByDate: (fecha) => ipcRenderer.invoke('get-historial-by-date', fecha),
  getHistorialByRange: (fechaInicio, fechaFin) => ipcRenderer.invoke('get-historial-by-range', fechaInicio, fechaFin),
  deleteCategory: (id) => ipcRenderer.invoke('delete-category', id),
  saveTicket: (data) => ipcRenderer.invoke('save-ticket', data),
  getTickets: () => ipcRenderer.invoke('get-tickets'),
  savePresupuesto: (data) => ipcRenderer.invoke('save-presupuesto', data),
  getPresupuestos: () => ipcRenderer.invoke('get-presupuestos'),
  saveRemito: (data) => ipcRenderer.invoke('save-remito', data),
  getRemitos: () => ipcRenderer.invoke('get-remitos'),
  upsertRemito: (data) => ipcRenderer.invoke('upsert-remito', data),
  deleteRemito: (id) => ipcRenderer.invoke('delete-remito', id),
  saveGasto: (data) => ipcRenderer.invoke('save-gasto', data),
  getGastos: () => ipcRenderer.invoke('get-gastos'),
  deleteGasto: (id) => ipcRenderer.invoke('delete-gasto', id),
  saveAjuste: (data) => ipcRenderer.invoke('save-ajuste', data),
  getAjustes: () => ipcRenderer.invoke('get-ajustes'),
  deleteAjuste: (id) => ipcRenderer.invoke('delete-ajuste', id),
  exportExcel: () => ipcRenderer.invoke('export-excel'),
  createBackup: (prefs) => ipcRenderer.invoke('create-backup', prefs),
  getBackups: () => ipcRenderer.invoke('get-backups'),
  restoreBackup: (path) => ipcRenderer.invoke('restore-backup', path),
  exportRegistros: (filtros) => ipcRenderer.invoke('export-registros', filtros),
  registrarVenta: (venta) => ipcRenderer.send('registrar-venta', venta),
  
  // ✅ NUEVA FUNCIÓN PARA IMÁGENES
  getImagePath: (imageName) => ipcRenderer.invoke('get-image-path', imageName),

  // Empleados, Horarios y Asistencias
  getEmployees: () => ipcRenderer.invoke('get-employees'),
  addEmployee: (employee) => ipcRenderer.invoke('add-employee', employee),
  updateEmployee: (employee) => ipcRenderer.invoke('update-employee', employee),
  deleteEmployee: (id) => ipcRenderer.invoke('delete-employee', id),
  getSchedules: () => ipcRenderer.invoke('get-schedules'),
  saveSchedule: (schedule) => ipcRenderer.invoke('save-schedule', schedule),
  deleteSchedule: (id) => ipcRenderer.invoke('delete-schedule', id),
  getAttendances: (filtros) => ipcRenderer.invoke('get-attendances', filtros),
  saveAttendance: (attendance) => ipcRenderer.invoke('save-attendance', attendance),
  deleteAttendance: (id) => ipcRenderer.invoke('delete-attendance', id),

  // Proveedores, Compras, Pagos, Cuenta Corriente
  getSuppliers: () => ipcRenderer.invoke('get-suppliers'),
  addSupplier: (prov) => ipcRenderer.invoke('add-supplier', prov),
  updateSupplier: (prov) => ipcRenderer.invoke('update-supplier', prov),
  deleteSupplier: (id) => ipcRenderer.invoke('delete-supplier', id),
  getPurchasesSupplier: (proveedorId) => ipcRenderer.invoke('get-purchases-supplier', proveedorId),
  addPurchaseSupplier: (compra) => ipcRenderer.invoke('add-purchase-supplier', compra),
  deletePurchaseSupplier: (id) => ipcRenderer.invoke('delete-purchase-supplier', id),
  getPaymentsSupplier: (proveedorId) => ipcRenderer.invoke('get-payments-supplier', proveedorId),
  addPaymentSupplier: (pago) => ipcRenderer.invoke('add-payment-supplier', pago),
  deletePaymentSupplier: (id) => ipcRenderer.invoke('delete-payment-supplier', id),
  getCurrentAccount: (proveedorId) => ipcRenderer.invoke('get-current-account', proveedorId),
  addAccountMovement: (mov) => ipcRenderer.invoke('add-account-movement', mov),
  getSupplierStats: () => ipcRenderer.invoke('get-supplier-stats'),
    getUpcomingDueDates: () => ipcRenderer.invoke('get-upcoming-due-dates'),
    getPendingDebts: (proveedorId) => ipcRenderer.invoke('get-pending-debts', proveedorId),

    // Módulo Municipio (Cuenta Corriente Municipio)
  muniGetOrders: () => ipcRenderer.invoke('muni-get-orders'),
  muniAddOrder: (orden) => ipcRenderer.invoke('muni-add-order', orden),
  muniGetPayments: (ordenId) => ipcRenderer.invoke('muni-get-payments', ordenId),
  muniAddPayment: (pago) => ipcRenderer.invoke('muni-add-payment', pago),
  muniGetUpcomingCollections: () => ipcRenderer.invoke('muni-get-upcoming-collections'),
  muniGetStats: () => ipcRenderer.invoke('muni-get-stats'),
  muniDeleteOrder: (id) => ipcRenderer.invoke('muni-delete-order', id),
  muniGetMonthBreakdown: (yearMonth) => ipcRenderer.invoke('muni-get-month-breakdown', yearMonth),
  muniGetDayBreakdown: (dateStr) => ipcRenderer.invoke('muni-get-day-breakdown', dateStr),

  // Módulo Clientes (Cuenta Corriente Clientes)
  clienteGetClients: () => ipcRenderer.invoke('get-clientes'),
  clienteAddClient: (data) => ipcRenderer.invoke('add-cliente', data),
  clienteUpdateClient: (data) => ipcRenderer.invoke('update-cliente', data),
  clienteDeleteClient: (id) => ipcRenderer.invoke('delete-cliente', id),
  clienteGetSales: () => ipcRenderer.invoke('cliente-get-sales'),
  clienteAddSale: (sale) => ipcRenderer.invoke('cliente-add-sale', sale),
  clienteDeleteSale: (id) => ipcRenderer.invoke('cliente-delete-sale', id),
  clienteAddSalePayment: (pago) => ipcRenderer.invoke('cliente-add-sale-payment', pago),
  clienteGetPayments: (clienteId) => ipcRenderer.invoke('get-pagos-cliente', clienteId),
  clienteAddPayment: (data) => ipcRenderer.invoke('add-pago-cliente', data),
  clienteDeletePayment: (id) => ipcRenderer.invoke('delete-pago-cliente', id),
  clienteGetUpcomingCollections: () => ipcRenderer.invoke('cliente-get-upcoming-collections'),
  clienteGetStats: () => ipcRenderer.invoke('cliente-get-stats'),
  clienteGetCtaCte: (clienteId) => ipcRenderer.invoke('get-cta-cte-cliente', clienteId),
  clienteGetSaldo: (clienteId) => ipcRenderer.invoke('get-saldo-cliente', clienteId),

  // Módulo Atmosférico
  atmosGetOrders: () => ipcRenderer.invoke('atmos-get-orders'),
  atmosAddOrder: (orden) => ipcRenderer.invoke('atmos-add-order', orden),
  atmosGetPayments: (ordenId) => ipcRenderer.invoke('atmos-get-payments', ordenId),
  atmosAddPayment: (pago) => ipcRenderer.invoke('atmos-add-payment', pago),
    atmosGetUpcomingCollections: () => ipcRenderer.invoke('atmos-get-upcoming-collections'),
  atmosGetStats: () => ipcRenderer.invoke('atmos-get-stats'),
  atmosDeleteOrder: (id) => ipcRenderer.invoke('atmos-delete-order', id),
  atmosUpdateOrder: (orden) => ipcRenderer.invoke('atmos-update-order', orden),
  atmosRegisterPayment: (pago) => ipcRenderer.invoke('atmos-register-payment', pago),


  // Módulo Máquinas
  maqGetAll:            ()    => ipcRenderer.invoke('maq-get-all'),
  maqAdd:               (m)   => ipcRenderer.invoke('maq-add', m),
  maqUpdate:            (m)   => ipcRenderer.invoke('maq-update', m),
  maqDelete:            (id)  => ipcRenderer.invoke('maq-delete', id),
  maqGetTrabajos:       (id)  => ipcRenderer.invoke('maq-get-trabajos', id),
  maqAddTrabajo:        (t)   => ipcRenderer.invoke('maq-add-trabajo', t),
  maqDeleteTrabajo:     (id)  => ipcRenderer.invoke('maq-delete-trabajo', id),
  maqGetCombustible:    (id)  => ipcRenderer.invoke('maq-get-combustible', id),
  maqAddCombustible:    (c)   => ipcRenderer.invoke('maq-add-combustible', c),
  maqDeleteCombustible: (id)  => ipcRenderer.invoke('maq-delete-combustible', id),
  maqGetMantenimiento:  (id)  => ipcRenderer.invoke('maq-get-mantenimiento', id),
  maqAddMantenimiento:  (mt)  => ipcRenderer.invoke('maq-add-mantenimiento', mt),
  maqDeleteMantenimiento:(id) => ipcRenderer.invoke('maq-delete-mantenimiento', id),
  maqGetStats:          ()    => ipcRenderer.invoke('maq-get-stats'),
  maqGetRentabilidad:   ()    => ipcRenderer.invoke('maq-get-rentabilidad'),
  
  // Módulo Liquidación de Empleados
  empLiqGetEmployees: (mes) => ipcRenderer.invoke('emp-liq-get-employees', mes),
  empLiqSaveConfig: (config) => ipcRenderer.invoke('emp-liq-save-config', config),
  empLiqSaveLiquidation: (liq) => ipcRenderer.invoke('emp-liq-save-liquidation', liq),
  empLiqGetStats: (mes) => ipcRenderer.invoke('emp-liq-get-stats', mes),
  
  // Notificaciones
  getNotifications: () => ipcRenderer.invoke('get-notifications'),
  markNotificationRead: (id) => ipcRenderer.invoke('mark-notification-read', id),
  markAllNotificationsRead: () => ipcRenderer.invoke('mark-all-notifications-read'),
  deleteNotification: (id) => ipcRenderer.invoke('delete-notification', id),
  deleteAllNotifications: () => ipcRenderer.invoke('delete-all-notifications'),
  onNewNotification: (callback) => ipcRenderer.on('new-notification', (event, data) => callback(data)),
  closeSplash: () => ipcRenderer.send('close-splash'),

  // Autenticación con Supabase Auth
  authSignIn: (credentials) => {
    console.log('[AUTH TRACE 4] preload IPC invoked with email:', credentials?.email);
    return ipcRenderer.invoke('auth-sign-in', credentials);
  },
  authSignOut: () => ipcRenderer.invoke('auth-sign-out'),
  authGetSession: () => ipcRenderer.invoke('auth-get-session'),
  authGetProfile: () => ipcRenderer.invoke('auth-get-profile'),
  authUpdateProfile: (profileData) => ipcRenderer.invoke('auth-update-profile', profileData),

  // Usuarios de la empresa y Presencia Realtime
  getCompanyUsers: () => ipcRenderer.invoke('auth-get-company-users'),
  startPresence: () => ipcRenderer.invoke('auth-start-presence'),
  onPresenceUpdate: (callback) => ipcRenderer.on('presence-update', (event, onlineUserIds) => callback(onlineUserIds)),

  // Supabase Realtime para Productos y Módulos Clave
  onRealtimeProductEvent: (callback) => ipcRenderer.on('realtime-product-event', (event, data) => callback(data)),
  onRealtimeClientSaleEvent: (callback) => ipcRenderer.on('realtime-client-sale-event', (event, data) => callback(data)),
  onRealtimeClientEvent: (callback) => ipcRenderer.on('realtime-client-event', (event, data) => callback(data)),
  onRealtimeMuniOrderEvent: (callback) => ipcRenderer.on('realtime-muni-order-event', (event, data) => callback(data)),
  onRealtimeAtmosOrderEvent: (callback) => ipcRenderer.on('realtime-atmos-order-event', (event, data) => callback(data)),
  onRealtimeExpenseEvent: (callback) => ipcRenderer.on('realtime-expense-event', (event, data) => callback(data)),
  onRealtimeTicketEvent: (callback) => ipcRenderer.on('realtime-ticket-event', (event, data) => callback(data)),
  onRealtimeFinanceEvent: (callback) => ipcRenderer.on('realtime-finance-event', (event, data) => callback(data))
});

