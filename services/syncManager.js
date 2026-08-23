// services/syncManager.js
//
// Fase 4.2 — Procesador de Offline Queue y Pull Sync.
// Conecta SyncManager con los servicios de SyncStatus, OfflineQueue y servicios de Supabase.

'use strict';

const { isSupabaseConfigured, testConnection } = require('./supabaseClient');
const supabaseProductService = require('./supabaseProductService');
const supabaseCategoryService = require('./supabaseCategoryService');
const supabaseSupplierService = require('./supabaseSupplierService');
const supabasePurchaseService = require('./supabasePurchaseService');
const supabaseSaleService = require('./supabaseSaleService');
const supabaseTicketService = require('./supabaseTicketService');
const supabaseClientService = require('./supabaseClientService');
const supabaseExpenseService = require('./supabaseExpenseService');
const supabaseMunicipioService = require('./supabaseMunicipioService');
const supabaseMachineService = require('./supabaseMachineService');
const supabaseEmployeeService = require('./supabaseEmployeeService');
const supabaseBudgetService = require('./supabaseBudgetService');
const supabaseRemitoService = require('./supabaseRemitoService');
const supabaseAtmosfericoService = require('./supabaseAtmosfericoService');

const POLL_INTERVAL_MS = 5000;

class SyncManager {
  constructor(db = null, syncStatus = null, offlineQueue = null) {
    this.db = db;
    this.syncStatus = syncStatus;
    this.offlineQueue = offlineQueue;
    this.initialized = false;
    this.lastOnlineState = false;
    this.monitorInterval = null;
    this.isCheckingConnectivity = false;
  }

  setSyncStatus(syncStatus) {
    this.syncStatus = syncStatus;
  }

  setOfflineQueue(offlineQueue) {
    this.offlineQueue = offlineQueue;
  }

  async initialize() {
    this.initialized = true;
    console.log('[SyncManager] initialize() iniciado');

    const online = await this.isOnline();
    this.lastOnlineState = online;

    if (this.syncStatus) {
      const initialStatus = online ? 'ONLINE' : 'OFFLINE';
      this.syncStatus.setStatus(initialStatus);
    }

    if (online) {
      console.log('[SyncManager] Conexión activa detectada. Procesando cola pendiente...');
      this.processQueue().catch(err => {
        console.error('[SyncManager] Error al procesar cola en arranque:', err);
      });
    }

    this.startConnectivityMonitor();
  }

  startConnectivityMonitor(intervalMs = POLL_INTERVAL_MS) {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    this.monitorInterval = setInterval(async () => {
      if (this.isCheckingConnectivity) return;
      this.isCheckingConnectivity = true;

      try {
        const currentOnline = await this.isOnline();

        if (currentOnline && !this.lastOnlineState) {
          console.log('[SyncManager] Conexión recuperada. Procesando Offline Queue...');
          await this.processQueue();
        }

        this.lastOnlineState = currentOnline;
      } catch (err) {
        console.error('[SyncManager] Error en monitor de conectividad:', err);
      } finally {
        this.isCheckingConnectivity = false;
      }
    }, intervalMs);
  }

  stopConnectivityMonitor() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  async isOnline() {
    if (!isSupabaseConfigured()) {
      return false;
    }
    try {
      const res = await testConnection();
      return Boolean(res && res.success);
    } catch (err) {
      return false;
    }
  }

  async pushChanges() {
    console.log('[SyncManager] pushChanges() iniciado');

    const online = await this.isOnline();
    if (!online) {
      if (this.syncStatus) {
        this.syncStatus.setStatus('OFFLINE');
      }
      return { success: false, reason: 'offline', changesPushed: 0 };
    }

    if (this.syncStatus) {
      this.syncStatus.setStatus('SYNCING');
    }

    if (!this.offlineQueue) {
      if (this.syncStatus) this.syncStatus.setStatus('ONLINE');
      return { success: true, changesPushed: 0 };
    }

    const operations = this.offlineQueue.getOperations();
    let changesPushed = 0;

    for (const op of operations) {
      const { id, entity, action, payload } = op;
      console.log(`[SyncManager] Procesando... ID: ${id}, Entidad: ${entity}, Acción: ${action}`);

      let result = { success: false, error: `Entidad (${entity}) o acción (${action}) no soportada.` };

      try {
        if (entity === 'productos') {
          if (action === 'INSERT') {
            result = await supabaseProductService.createProduct(payload);
          } else if (action === 'UPDATE') {
            result = await supabaseProductService.updateProduct(payload);
          } else if (action === 'UPDATE_STOCK') {
            result = await supabaseProductService.updateStock(payload.id, payload.stock);
          } else if (action === 'DELETE') {
            result = await supabaseProductService.deleteProduct(payload.id);
          }
        } else if (entity === 'categorias') {
          if (action === 'INSERT' || action === 'UPDATE') {
            result = await supabaseCategoryService.createCategory(payload);
          } else if (action === 'DELETE') {
            result = await supabaseCategoryService.deleteCategory(payload.id, payload.nombre);
          }
        } else if (entity === 'proveedores') {
          if (action === 'INSERT' || action === 'UPDATE') {
            result = await supabaseSupplierService.addSupplier(payload);
          } else if (action === 'DELETE') {
            result = await supabaseSupplierService.deleteSupplier(payload.id);
          }
        } else if (entity === 'compras_proveedor') {
          if (action === 'INSERT' || action === 'UPDATE') {
            result = await supabasePurchaseService.addPurchase(payload);
          } else if (action === 'DELETE') {
            result = await supabasePurchaseService.deletePurchase(payload.id);
          }
        } else if (entity === 'pagos_proveedor') {
          if (action === 'INSERT') {
            result = await supabasePurchaseService.addPayment(payload);
          } else if (action === 'DELETE') {
            result = await supabasePurchaseService.deletePayment(payload.id);
          }
        } else if (entity === 'cuenta_corriente_proveedor') {
          if (action === 'INSERT') {
            result = await supabasePurchaseService.addAccountMovement(payload);
          } else if (action === 'DELETE') {
            result = await supabasePurchaseService.deleteAccountMovementByRef(payload.referencia_id, payload.tipo);
          }
        } else if (entity === 'ventas') {
          if (action === 'INSERT' || action === 'UPDATE') {
            result = await supabaseSaleService.addSale(payload);
          } else if (action === 'DELETE') {
            result = await supabaseSaleService.deleteSale(payload.id);
          }
        } else if (entity === 'tickets') {
          if (action === 'INSERT' || action === 'UPDATE') {
            result = await supabaseTicketService.addTicket(payload);
          } else if (action === 'DELETE') {
            result = await supabaseTicketService.deleteTicket(payload.id);
          }
        } else if (entity === 'clientes') {
          if (action === 'INSERT' || action === 'UPDATE') {
            result = await supabaseClientService.addClient(payload);
          } else if (action === 'DELETE') {
            result = await supabaseClientService.deleteClient(payload.id);
          }
        } else if (entity === 'cliente_ventas') {
          if (action === 'INSERT' || action === 'UPDATE') {
            result = await supabaseClientService.addSale(payload);
          } else if (action === 'DELETE') {
            result = await supabaseClientService.deleteSale(payload.id);
          }
        } else if (entity === 'pagos_cliente') {
          if (action === 'INSERT') {
            result = await supabaseClientService.addPayment(payload);
          } else if (action === 'DELETE') {
            result = await supabaseClientService.deletePayment(payload.id);
          }
        } else if (entity === 'cuenta_corriente_cliente') {
          if (action === 'INSERT') {
            result = await supabaseClientService.addAccountMovement(payload);
          } else if (action === 'DELETE') {
            result = await supabaseClientService.deleteAccountMovement(payload.id);
          }
        } else if (entity === 'atmos_ordenes') {
          if (action === 'INSERT' || action === 'UPDATE') {
            result = await supabaseAtmosfericoService.addOrder(payload);
          } else if (action === 'DELETE') {
            result = await supabaseAtmosfericoService.deleteOrder(payload.id);
          }
        } else if (entity === 'atmos_pagos') {
          if (action === 'INSERT') {
            result = await supabaseAtmosfericoService.addPayment(payload);
          } else if (action === 'DELETE') {
            result = await supabaseAtmosfericoService.deletePayment(payload.id, payload.orden_id);
          }
        } else if (entity === 'gastos') {
          if (action === 'INSERT' || action === 'UPDATE') {
            result = await supabaseExpenseService.addExpense(payload);
          } else if (action === 'DELETE') {
            result = await supabaseExpenseService.deleteExpense(payload.id);
          }
        } else if (entity === 'ajustes_caja') {
          const client = require('./supabaseClient').getSupabaseClient();
          if (!client) {
            result = { success: false, error: 'Supabase no disponible.' };
          } else if (action === 'INSERT' || action === 'UPDATE') {
            const { error } = await client.from('ajustes_caja').upsert([payload]);
            result = error ? { success: false, error: error.message } : { success: true };
          } else if (action === 'DELETE') {
            const { error } = await client.from('ajustes_caja').delete().eq('id', payload.id);
            result = error ? { success: false, error: error.message } : { success: true };
          }
        } else if (entity === 'municipio_ordenes') {
          if (action === 'INSERT' || action === 'UPDATE') {
            result = await supabaseMunicipioService.addOrder(payload);
          } else if (action === 'DELETE') {
            result = await supabaseMunicipioService.deleteOrder(payload.id);
          }
        } else if (entity === 'municipio_pagos') {
          if (action === 'INSERT') {
            result = await supabaseMunicipioService.addPayment(payload);
          } else if (action === 'DELETE') {
            result = await supabaseMunicipioService.deletePayment(payload.id);
          }
        } else if (entity === 'maquinas') {
          if (action === 'INSERT' || action === 'UPDATE') {
            result = await supabaseMachineService.addMachine(payload);
          } else if (action === 'DELETE') {
            result = await supabaseMachineService.deleteMachine(payload.id);
          }
        } else if (entity === 'trabajos_maquinas') {
          if (action === 'INSERT') {
            result = await supabaseMachineService.addWorkLog(payload);
          } else if (action === 'DELETE') {
            result = await supabaseMachineService.deleteWorkLog(payload.id);
          }
        } else if (entity === 'combustible_maquinas') {
          if (action === 'INSERT') {
            result = await supabaseMachineService.addFuelLog(payload);
          } else if (action === 'DELETE') {
            result = await supabaseMachineService.deleteFuelLog(payload.id);
          }
        } else if (entity === 'mantenimiento_maquinas') {
          if (action === 'INSERT') {
            result = await supabaseMachineService.addMaintenanceLog(payload);
          } else if (action === 'DELETE') {
            result = await supabaseMachineService.deleteMaintenanceLog(payload.id);
          }
        } else if (entity === 'empleados') {
          if (action === 'INSERT' || action === 'UPDATE') {
            result = await supabaseEmployeeService.addEmployee(payload);
          } else if (action === 'DELETE') {
            result = await supabaseEmployeeService.deleteEmployee(payload.id);
          }
        } else if (entity === 'asistencias') {
          if (action === 'INSERT') {
            result = await supabaseEmployeeService.addAttendance(payload);
          } else if (action === 'DELETE') {
            result = await supabaseEmployeeService.deleteAttendance(payload.id);
          }
        } else if (entity === 'empleado_liquidacion_config') {
          if (action === 'INSERT' || action === 'UPDATE') {
            result = await supabaseEmployeeService.addPayrollConfig(payload);
          }
        } else if (entity === 'empleado_liquidaciones') {
          if (action === 'INSERT') {
            result = await supabaseEmployeeService.addPayroll(payload);
          } else if (action === 'DELETE') {
            result = await supabaseEmployeeService.deletePayroll(payload.id);
          }
        } else if (entity === 'presupuestos') {
          if (action === 'INSERT' || action === 'UPDATE') {
            result = await supabaseBudgetService.addBudget(payload);
          } else if (action === 'DELETE') {
            result = await supabaseBudgetService.deleteBudget(payload.id);
          }
        } else if (entity === 'remitos') {
          if (action === 'INSERT' || action === 'UPDATE') {
            result = await supabaseRemitoService.addRemito(payload);
          } else if (action === 'DELETE') {
            result = await supabaseRemitoService.deleteRemito(payload.id);
          }
        }
      } catch (err) {
        result = { success: false, error: err.message || String(err) };
      }

      if (result && result.success) {
        this.offlineQueue.removeOperation(id);
        changesPushed++;
      } else {
        const errorMsg = result?.error || 'Error desconocido al enviar a Supabase.';
        console.error(`[SyncManager] Error enviando operación. ID: ${id}, Error: ${errorMsg}`);
        if (this.syncStatus) {
          this.syncStatus.setStatus('ERROR');
        }
        return { success: false, error: errorMsg, changesPushed, stoppedAtId: id };
      }
    }

    if (this.syncStatus) {
      this.syncStatus.setStatus('ONLINE');
      this.syncStatus.updateLastPush();
      this.syncStatus.updateLastSync();
    }

    return { success: true, changesPushed };
  }

  setLocalServices(services = {}) {
    if (services.productService) this.productService = services.productService;
    if (services.categoryService) this.categoryService = services.categoryService;
    if (services.supplierService) this.supplierService = services.supplierService;
    if (services.saleService) this.saleService = services.saleService;
    if (services.ticketService) this.ticketService = services.ticketService;
    if (services.clientService) this.clientService = services.clientService;
    if (services.expenseService) this.expenseService = services.expenseService;
    if (services.municipioService) this.municipioService = services.municipioService;
    if (services.machineService) this.machineService = services.machineService;
    if (services.employeeService) this.employeeService = services.employeeService;
    if (services.budgetService) this.budgetService = services.budgetService;
    if (services.remitoService) this.remitoService = services.remitoService;
  }

  upsertAtmosOrder(ao) {
    if (!this.db || !ao || !ao.id) return;
    try {
      const stmt = this.db.prepare(`
        INSERT INTO atmos_ordenes (id, fecha, cliente, direccion, telefono, tipo_servicio, descripcion, monto, saldo_pendiente, estado, observaciones, fecha_estimada_cobro)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          fecha = excluded.fecha,
          cliente = excluded.cliente,
          direccion = excluded.direccion,
          telefono = excluded.telefono,
          tipo_servicio = excluded.tipo_servicio,
          descripcion = excluded.descripcion,
          monto = excluded.monto,
          saldo_pendiente = excluded.saldo_pendiente,
          estado = excluded.estado,
          observaciones = excluded.observaciones,
          fecha_estimada_cobro = excluded.fecha_estimada_cobro
      `);
      stmt.run(
        Number(ao.id),
        ao.fecha,
        String(ao.cliente || ''),
        String(ao.direccion || ''),
        ao.telefono || null,
        String(ao.tipo_servicio || 'Desagote'),
        ao.descripcion || null,
        Number(ao.monto || 0),
        Number(ao.saldo_pendiente ?? ao.monto ?? 0),
        ao.estado || 'Pendiente',
        ao.observaciones || null,
        ao.fecha_estimada_cobro || null
      );
    } catch (err) {
      console.warn('[SyncManager] Error al upsert local de orden atmosférico:', err.message);
    }
  }

  upsertAtmosPayment(ap) {
    if (!this.db || !ap || !ap.id) return;
    try {
      const stmt = this.db.prepare(`
        INSERT INTO atmos_pagos (id, orden_id, fecha, monto, metodo_pago, observaciones)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          orden_id = excluded.orden_id,
          fecha = excluded.fecha,
          monto = excluded.monto,
          metodo_pago = excluded.metodo_pago,
          observaciones = excluded.observaciones
      `);
      stmt.run(
        Number(ap.id),
        Number(ap.orden_id),
        ap.fecha,
        Number(ap.monto || 0),
        String(ap.metodo_pago || 'Efectivo'),
        ap.observaciones || null
      );
    } catch (err) {
      console.warn('[SyncManager] Error al upsert local de pago atmosférico:', err.message);
    }
  }

  async pullChanges() {
    console.log('[SyncManager] Iniciando proceso pullChanges...');

    const online = await this.isOnline();
    if (!online) {
      if (this.syncStatus) {
        this.syncStatus.setStatus('OFFLINE');
      }
      return { success: false, reason: 'offline', changesPulled: 0 };
    }

    if (this.syncStatus) {
      this.syncStatus.setStatus('SYNCING');
    }

    let totalPulled = 0;

    try {
      // 1. Productos
      const products = await supabaseProductService.getProducts();
      if (Array.isArray(products) && this.productService) {
        for (const p of products) this.productService.upsertProduct(p);
        totalPulled += products.length;
      }

      // 2. Categorías
      const categories = await supabaseCategoryService.getAllCategories();
      if (Array.isArray(categories) && this.categoryService) {
        for (const c of categories) this.categoryService.upsertCategory(c);
        totalPulled += categories.length;
      }

      // 3. Proveedores
      const suppliers = await supabaseSupplierService.getAllSuppliers();
      if (Array.isArray(suppliers) && this.supplierService) {
        for (const s of suppliers) this.supplierService.upsertSupplier(s);
        totalPulled += suppliers.length;
      }

      // 4. Compras Proveedores
      const purchases = await supabasePurchaseService.getAllPurchases();
      if (Array.isArray(purchases) && this.supplierService?.upsertPurchase) {
        for (const cp of purchases) this.supplierService.upsertPurchase(cp);
        totalPulled += purchases.length;
      }

      // 5. Pagos Proveedores
      const payments = await supabasePurchaseService.getAllPayments();
      if (Array.isArray(payments) && this.supplierService?.upsertPayment) {
        for (const pg of payments) this.supplierService.upsertPayment(pg);
        totalPulled += payments.length;
      }

      // 6. Cuenta Corriente Proveedores
      const movements = await supabasePurchaseService.getAllAccountMovements();
      if (Array.isArray(movements) && this.supplierService?.upsertAccountMovement) {
        for (const mv of movements) this.supplierService.upsertAccountMovement(mv);
        totalPulled += movements.length;
      }

      // 7. Ventas
      const sales = await supabaseSaleService.getAllSales();
      if (Array.isArray(sales) && this.saleService?.upsertSale) {
        for (const v of sales) this.saleService.upsertSale(v);
        totalPulled += sales.length;
      }

      // 8. Tickets
      const tickets = await supabaseTicketService.getAllTickets();
      if (Array.isArray(tickets) && this.ticketService?.upsertTicket) {
        for (const t of tickets) this.ticketService.upsertTicket(t);
        totalPulled += tickets.length;
      }

      // 9. Clientes
      const clients = await supabaseClientService.getAllClients();
      if (Array.isArray(clients) && this.clientService?.upsertClient) {
        for (const c of clients) this.clientService.upsertClient(c);
        totalPulled += clients.length;
      }

      // 10. Ventas Clientes a Cta Cte
      const clientSales = await supabaseClientService.getAllSales();
      if (Array.isArray(clientSales) && this.clientService?.upsertSale) {
        for (const cs of clientSales) this.clientService.upsertSale(cs);
        totalPulled += clientSales.length;
      }

      // 11. Pagos Clientes
      const clientPayments = await supabaseClientService.getAllPayments();
      if (Array.isArray(clientPayments) && this.clientService?.upsertPayment) {
        for (const pg of clientPayments) this.clientService.upsertPayment(pg);
        totalPulled += clientPayments.length;
      }

      // 12. Cta Cte Clientes
      const clientMovements = await supabaseClientService.getAllAccountMovements();
      if (Array.isArray(clientMovements) && this.clientService?.upsertAccountMovement) {
        for (const mv of clientMovements) this.clientService.upsertAccountMovement(mv);
        totalPulled += clientMovements.length;
      }

      // 13. Órdenes Atmosférico
      const atmosOrders = await supabaseAtmosfericoService.getAllOrders();
      if (Array.isArray(atmosOrders)) {
        for (const ao of atmosOrders) this.upsertAtmosOrder(ao);
        totalPulled += atmosOrders.length;
      }

      // 14. Pagos Atmosférico
      const atmosPayments = await supabaseAtmosfericoService.getAllPayments();
      if (Array.isArray(atmosPayments)) {
        for (const ap of atmosPayments) this.upsertAtmosPayment(ap);
        totalPulled += atmosPayments.length;
      }

      // 15. Gastos
      const expenses = await supabaseExpenseService.getAllExpenses();
      if (Array.isArray(expenses) && this.expenseService?.upsertExpense) {
        for (const g of expenses) this.expenseService.upsertExpense(g);
        totalPulled += expenses.length;
      }

      // 16. Órdenes Municipio
      const muniOrders = await supabaseMunicipioService.getAllOrders();
      if (Array.isArray(muniOrders) && this.municipioService?.upsertOrder) {
        for (const ord of muniOrders) this.municipioService.upsertOrder(ord);
        totalPulled += muniOrders.length;
      }

      // 17. Pagos Municipio
      const muniPayments = await supabaseMunicipioService.getAllPayments();
      if (Array.isArray(muniPayments) && this.municipioService?.upsertPayment) {
        for (const pg of muniPayments) this.municipioService.upsertPayment(pg);
        totalPulled += muniPayments.length;
      }

      // 18. Máquinas
      const machines = await supabaseMachineService.getAllMachines();
      if (Array.isArray(machines) && this.machineService?.upsertMachine) {
        for (const m of machines) this.machineService.upsertMachine(m);
        totalPulled += machines.length;
      }

      // 19. Trabajos Máquinas
      const workLogs = await supabaseMachineService.getAllWorkLogs();
      if (Array.isArray(workLogs) && this.machineService?.upsertWorkLog) {
        for (const w of workLogs) this.machineService.upsertWorkLog(w);
        totalPulled += workLogs.length;
      }

      // 20. Combustible Máquinas
      const fuelLogs = await supabaseMachineService.getAllFuelLogs();
      if (Array.isArray(fuelLogs) && this.machineService?.upsertFuelLog) {
        for (const f of fuelLogs) this.machineService.upsertFuelLog(f);
        totalPulled += fuelLogs.length;
      }

      // 21. Mantenimiento Máquinas
      const maintenanceLogs = await supabaseMachineService.getAllMaintenanceLogs();
      if (Array.isArray(maintenanceLogs) && this.machineService?.upsertMaintenanceLog) {
        for (const mt of maintenanceLogs) this.machineService.upsertMaintenanceLog(mt);
        totalPulled += maintenanceLogs.length;
      }

      // 22. Empleados
      const employees = await supabaseEmployeeService.getAllEmployees();
      if (Array.isArray(employees) && this.employeeService?.upsertEmployee) {
        for (const emp of employees) this.employeeService.upsertEmployee(emp);
        totalPulled += employees.length;
      }

      // 23. Asistencias
      const attendances = await supabaseEmployeeService.getAllAttendances();
      if (Array.isArray(attendances) && this.employeeService?.upsertAttendance) {
        for (const att of attendances) this.employeeService.upsertAttendance(att);
        totalPulled += attendances.length;
      }

      // 24. Config Liquidación Empleados
      const payrollConfigs = await supabaseEmployeeService.getAllPayrollConfigs();
      if (Array.isArray(payrollConfigs) && this.employeeService?.upsertPayrollConfig) {
        for (const cfg of payrollConfigs) this.employeeService.upsertPayrollConfig(cfg);
        totalPulled += payrollConfigs.length;
      }

      // 25. Liquidaciones Empleados
      const payrolls = await supabaseEmployeeService.getAllPayrolls();
      if (Array.isArray(payrolls) && this.employeeService?.upsertPayroll) {
        for (const liq of payrolls) this.employeeService.upsertPayroll(liq);
        totalPulled += payrolls.length;
      }

      // 26. Presupuestos
      const budgets = await supabaseBudgetService.getAllBudgets();
      if (Array.isArray(budgets) && this.budgetService?.upsertBudget) {
        for (const b of budgets) this.budgetService.upsertBudget(b);
        totalPulled += budgets.length;
      }

      // 27. Remitos
      const remitos = await supabaseRemitoService.getAllRemitos();
      if (Array.isArray(remitos) && this.remitoService?.upsertRemito) {
        for (const r of remitos) this.remitoService.upsertRemito(r);
        totalPulled += remitos.length;
      }

      if (this.syncStatus) {
        this.syncStatus.setStatus('ONLINE');
        this.syncStatus.updateLastPull();
        this.syncStatus.updateLastSync();
      }

      return { success: true, changesPulled: totalPulled };
    } catch (error) {
      console.error('[PullSync] Error durante Pull Sync:', error.message || error);
      if (this.syncStatus) {
        this.syncStatus.setStatus('ERROR');
      }
      return { success: false, error: error.message || String(error) };
    }
  }

  queueOperation(operation) {
    if (this.offlineQueue) {
      return this.offlineQueue.addOperation(operation);
    }
  }

  async processQueue() {
    return await this.pushChanges();
  }

  getLastSync() {
    if (this.syncStatus) {
      return this.syncStatus.getStatus().lastSync;
    }
    return null;
  }
}

module.exports = SyncManager;
