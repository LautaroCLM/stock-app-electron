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
const supabaseAjusteService = require('./supabaseAjusteService');

const POLL_INTERVAL_MS = 5000;
const MAX_RETRIES = 3;

/**
 * Clasifica un error de sincronización en una de tres categorías:
 * - NETWORK: Caída de conexión, timeout o error de socket (no penalizar reintentos).
 * - TEMPORARY: Error temporal de Supabase / servidor 5xx (reintentar con backoff).
 * - PERMANENT: Violación de constraint, esquema o datos inválidos (ir directo a cuarentena).
 *
 * @param {string|Error|object} error
 * @returns {'NETWORK'|'TEMPORARY'|'PERMANENT'}
 */
function classifySyncError(error) {
  const msg = (typeof error === 'string' ? error : (error?.message || String(error || ''))).toLowerCase();

  // A) Error de conectividad / red / timeout
  const isNetwork =
    msg.includes('fetch failed') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('enotfound') ||
    msg.includes('econnrefused') ||
    msg.includes('socket hang up') ||
    msg.includes('network') ||
    msg.includes('getaddrinfo') ||
    msg.includes('failed to fetch') ||
    msg.includes('offline');

  if (isNetwork) {
    return 'NETWORK';
  }

  // B) Error temporal de servidor Supabase (HTTP 5xx)
  const isServer =
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('bad gateway') ||
    msg.includes('service unavailable') ||
    msg.includes('gateway timeout') ||
    msg.includes('internal server error') ||
    msg.includes('upstream connect error');

  if (isServer) {
    return 'TEMPORARY';
  }

  // C) Error permanente de datos / validación / restricciones
  const isPermanent =
    msg.includes('violates foreign key') ||
    msg.includes('foreign key') ||
    msg.includes('violates unique constraint') ||
    msg.includes('duplicate key') ||
    msg.includes('violates not-null') ||
    msg.includes('violates check constraint') ||
    msg.includes('does not exist') ||
    msg.includes('invalid input syntax') ||
    msg.includes('syntax error') ||
    msg.includes('no soportada') ||
    msg.includes('requerido') ||
    msg.includes('inválido') ||
    msg.includes('permission denied') ||
    msg.includes('row-level security');

  if (isPermanent) {
    return 'PERMANENT';
  }

  return 'TEMPORARY';
}

/**
 * Calcula el tiempo de backoff exponencial según el número de reintento.
 * @param {number} retryCount
 * @returns {number} Tiempo en milisegundos
 */
function getBackoffDelayMs(retryCount) {
  if (retryCount === 1) return 5000;   // 1er reintento: esperar 5s
  if (retryCount === 2) return 15000;  // 2do reintento: esperar 15s
  return 30000;                        // 3er reintento: esperar 30s
}

class SyncManager {
  constructor(db = null, syncStatus = null, offlineQueue = null) {
    this.db = db;
    this.syncStatus = syncStatus;
    this.offlineQueue = offlineQueue;
    this.initialized = false;
    this.lastOnlineState = false;
    this.monitorInterval = null;
    this.isCheckingConnectivity = false;
    this.isPulling = false;
    this.mainWindow = null;
  }

  setMainWindow(win) {
    this.mainWindow = win;
  }

  notifySyncComplete(changesPulled = 0) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      try {
        console.log('[SyncManager] Notificando sync-completed a mainWindow...');
        this.mainWindow.webContents.send('sync-completed', {
          changesPulled,
          lastSync: this.getLastSync(),
          timestamp: new Date().toISOString()
        });
        // Notificar también al canal de productos para refrescar inventario si está en pantalla
        this.mainWindow.webContents.send('realtime-product-event', {
          eventType: 'SYNC',
          source: 'pull',
          changesPulled
        });
      } catch (err) {
        console.warn('[SyncManager] No se pudo notificar sync-completed:', err.message);
      }
    }
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
      console.log('[SyncManager] Conexión activa detectada. Iniciando secuencia: Push -> Pull...');
      try {
        await this.processQueue();
        console.log('[SyncManager] Cola local procesada. Ejecutando pullChanges()...');
        const pullRes = await this.pullChanges();
        if (pullRes && pullRes.success) {
          this.notifySyncComplete(pullRes.changesPulled || 0);
        }
      } catch (err) {
        console.error('[SyncManager] Error en secuencia inicial de sincronización:', err);
      }
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
          console.log('[SyncManager] Conexión recuperada. Ejecutando Pull de sincronización...');
          const pullRes = await this.pullChanges();
          if (pullRes && pullRes.success) {
            this.notifySyncComplete(pullRes.changesPulled || 0);
          }
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
    let failedCount = 0;
    const now = new Date();

    for (const op of operations) {
      const { id, entity, action, payload, retry_count, next_retry_at } = op;

      // 1. Omitir operación si aún está en período de backoff (espera entre reintentos)
      if (next_retry_at && new Date(next_retry_at) > now) {
        console.log(`[SyncManager] Operación ID ${id} (${entity}) en período de espera (backoff hasta ${next_retry_at}). Omitiendo temporalmente...`);
        continue;
      }

      console.log(`[SyncManager] Procesando operación ID ${id} (${entity} -> ${action})...`);

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
          if (action === 'INSERT' || action === 'UPDATE') {
            result = await supabaseAjusteService.addAjuste(payload);
          } else if (action === 'DELETE') {
            result = await supabaseAjusteService.deleteAjuste(payload.id);
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
        console.log(`[SyncManager] Operación ID ${id} sincronizada correctamente.`);
      } else {
        const errorMsg = result?.error || 'Error desconocido al enviar a Supabase.';
        const errorType = classifySyncError(errorMsg);

        // A) Error de conectividad de red / timeout: no se penalizan los reintentos de la fila
        if (errorType === 'NETWORK') {
          console.warn(`[SyncManager] Error de conectividad de red durante operación ID ${id}: ${errorMsg}. Deteniendo sincronización.`);
          if (this.syncStatus) {
            this.syncStatus.setStatus('OFFLINE');
          }
          return { success: false, reason: 'network_error', error: errorMsg, changesPushed, stoppedAtId: id };
        }

        failedCount++;
        const currentRetries = (retry_count || 0) + 1;

        console.error(`[SyncManager] Operación ID ${id} falló.`);
        console.error(`[SyncManager] Intento: ${currentRetries}/${MAX_RETRIES}`);
        console.error(`[SyncManager] Error: ${errorMsg}`);

        // C) Error permanente o máximo de reintentos alcanzado -> Marcar como FALLIDA/CUARENTENA
        if (errorType === 'PERMANENT' || currentRetries >= MAX_RETRIES) {
          const reason = errorType === 'PERMANENT'
            ? `Error permanente de datos: ${errorMsg}`
            : `Máximo de reintentos alcanzado (${MAX_RETRIES}/${MAX_RETRIES}): ${errorMsg}`;

          if (this.offlineQueue.markFailed) {
            this.offlineQueue.markFailed(id, reason);
          }
          console.error(`[SyncManager] Operación ID ${id} alcanzó el máximo de reintentos.`);
          console.error(`[SyncManager] Operación marcada como FALLIDA/CUARENTENA.`);
        } else {
          // B) Error temporal de servidor: registrar reintento y programar backoff
          const backoffMs = getBackoffDelayMs(currentRetries);
          const nextRetryIso = new Date(Date.now() + backoffMs).toISOString();

          if (this.offlineQueue.recordRetry) {
            this.offlineQueue.recordRetry(id, errorMsg, nextRetryIso);
          }
          console.warn(`[SyncManager] Operación ID ${id} programada para reintento después de ${nextRetryIso}.`);
        }

        // ¡IMPORTANTE: NO DETENER LA COLA! Continuar con la siguiente operación independiente
        console.log(`[SyncManager] Continuando con las siguientes operaciones en la cola...`);
      }
    }

    if (this.syncStatus) {
      this.syncStatus.setStatus('ONLINE');
      this.syncStatus.updateLastPush();
      this.syncStatus.updateLastSync();
    }

    return { success: true, changesPushed, failedCount };
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
    if (this.isPulling) {
      console.log('[SyncManager] pullChanges ya en ejecución. Omitiendo llamada concurrente.');
      return { success: false, reason: 'in_progress', changesPulled: 0 };
    }

    console.log('[SyncManager] Iniciando proceso pullChanges...');
    this.isPulling = true;

    const online = await this.isOnline();
    if (!online) {
      if (this.syncStatus) {
        this.syncStatus.setStatus('OFFLINE');
      }
      this.isPulling = false;
      return { success: false, reason: 'offline', changesPulled: 0 };
    }

    if (this.syncStatus) {
      this.syncStatus.setStatus('SYNCING');
    }

    let totalPulled = 0;

    // Obtener IDs de operaciones pendientes (y en cuarentena) en offlineQueue para evitar sobrescribir datos locales
    const pendingOps = this.offlineQueue ? this.offlineQueue.getOperations(true) : [];
    const pendingProductIds = new Set(
      pendingOps
        .filter(op => op.entity === 'productos')
        .map(op => Number(op.payload?.id))
        .filter(id => !isNaN(id) && id > 0)
    );

    try {
      // 1. Productos
      try {
        const products = await supabaseProductService.getProducts();
        if (Array.isArray(products) && this.productService) {
          const remoteIds = new Set();
          for (const p of products) {
            const pId = Number(p.id);
            if (!isNaN(pId)) remoteIds.add(pId);
            // Si el producto tiene cambios pendientes en offlineQueue, no sobrescribir
            if (!pendingProductIds.has(pId)) {
              this.productService.upsertProduct(p);
              totalPulled++;
            } else {
              console.log(`[SyncManager] Omitiendo pull para producto ID ${pId}: tiene cambios pendientes en offlineQueue.`);
            }
          }

          // Detección segura de eliminaciones en Supabase:
          // Si un producto existe en SQLite pero no en Supabase, y NO está pendiente en offlineQueue, eliminar de SQLite local
          if (this.db && remoteIds.size > 0) {
            const localProducts = this.db.prepare('SELECT id FROM productos').all();
            for (const lp of localProducts) {
              const localId = Number(lp.id);
              if (!remoteIds.has(localId) && !pendingProductIds.has(localId)) {
                console.log(`[SyncManager] Producto ID ${localId} ya no existe en Supabase. Eliminando de SQLite local...`);
                this.db.prepare('DELETE FROM productos WHERE id = ?').run(localId);
              }
            }
          }
        }
      } catch (pErr) {
        console.error('[SyncManager] Error en pull de productos:', pErr.message);
      }

      // 2. Categorías
      try {
        const categories = await supabaseCategoryService.getAllCategories();
        if (Array.isArray(categories) && this.categoryService) {
          for (const c of categories) this.categoryService.upsertCategory(c);
          totalPulled += categories.length;
        }
      } catch (cErr) {
        console.error('[SyncManager] Error en pull de categorías:', cErr.message);
      }

      // 3. Proveedores
      try {
        const suppliers = await supabaseSupplierService.getAllSuppliers();
        if (Array.isArray(suppliers) && this.supplierService) {
          for (const s of suppliers) this.supplierService.upsertSupplier(s);
          totalPulled += suppliers.length;
        }
      } catch (sErr) {
        console.error('[SyncManager] Error en pull de proveedores:', sErr.message);
      }

      // 4. Compras Proveedores
      try {
        const purchases = await supabasePurchaseService.getAllPurchases();
        if (Array.isArray(purchases) && this.supplierService?.upsertPurchase) {
          for (const cp of purchases) this.supplierService.upsertPurchase(cp);
          totalPulled += purchases.length;
        }
      } catch (cpErr) {
        console.error('[SyncManager] Error en pull de compras:', cpErr.message);
      }

      // 5. Pagos Proveedores
      try {
        const payments = await supabasePurchaseService.getAllPayments();
        if (Array.isArray(payments) && this.supplierService?.upsertPayment) {
          for (const pg of payments) this.supplierService.upsertPayment(pg);
          totalPulled += payments.length;
        }
      } catch (pgErr) {
        console.error('[SyncManager] Error en pull de pagos proveedor:', pgErr.message);
      }

      // 6. Cuenta Corriente Proveedores
      try {
        const movements = await supabasePurchaseService.getAllAccountMovements();
        if (Array.isArray(movements) && this.supplierService?.upsertAccountMovement) {
          for (const mv of movements) this.supplierService.upsertAccountMovement(mv);
          totalPulled += movements.length;
        }
      } catch (mvErr) {
        console.error('[SyncManager] Error en pull de cta cte proveedores:', mvErr.message);
      }

      // 7. Ventas
      try {
        const sales = await supabaseSaleService.getAllSales();
        if (Array.isArray(sales) && this.saleService?.upsertSale) {
          for (const v of sales) this.saleService.upsertSale(v);
          totalPulled += sales.length;
        }
      } catch (vErr) {
        console.error('[SyncManager] Error en pull de ventas:', vErr.message);
      }

      // 8. Tickets
      try {
        const tickets = await supabaseTicketService.getAllTickets();
        if (Array.isArray(tickets) && this.ticketService?.upsertTicket) {
          for (const t of tickets) this.ticketService.upsertTicket(t);
          totalPulled += tickets.length;
        }
      } catch (tErr) {
        console.error('[SyncManager] Error en pull de tickets:', tErr.message);
      }

      // 9. Clientes
      try {
        const clients = await supabaseClientService.getAllClients();
        if (Array.isArray(clients) && this.clientService?.upsertClient) {
          for (const c of clients) this.clientService.upsertClient(c);
          totalPulled += clients.length;
        }
      } catch (clErr) {
        console.error('[SyncManager] Error en pull de clientes:', clErr.message);
      }

      // 10. Ventas Clientes a Cta Cte
      try {
        const clientSales = await supabaseClientService.getAllSales();
        if (Array.isArray(clientSales) && this.clientService?.upsertSale) {
          for (const cs of clientSales) this.clientService.upsertSale(cs);
          totalPulled += clientSales.length;
        }
      } catch (csErr) {
        console.error('[SyncManager] Error en pull de cliente_ventas:', csErr.message);
      }

      // 11. Pagos Clientes
      try {
        const clientPayments = await supabaseClientService.getAllPayments();
        if (Array.isArray(clientPayments) && this.clientService?.upsertPayment) {
          for (const pg of clientPayments) this.clientService.upsertPayment(pg);
          totalPulled += clientPayments.length;
        }
      } catch (cpErr) {
        console.error('[SyncManager] Error en pull de pagos_cliente:', cpErr.message);
      }

      // 12. Cta Cte Clientes
      try {
        const clientMovements = await supabaseClientService.getAllAccountMovements();
        if (Array.isArray(clientMovements) && this.clientService?.upsertAccountMovement) {
          for (const mv of clientMovements) this.clientService.upsertAccountMovement(mv);
          totalPulled += clientMovements.length;
        }
      } catch (cmErr) {
        console.error('[SyncManager] Error en pull de cta cte clientes:', cmErr.message);
      }

      // 13. Órdenes Atmosférico
      try {
        const atmosOrders = await supabaseAtmosfericoService.getAllOrders();
        if (Array.isArray(atmosOrders)) {
          for (const ao of atmosOrders) this.upsertAtmosOrder(ao);
          totalPulled += atmosOrders.length;
        }
      } catch (aoErr) {
        console.error('[SyncManager] Error en pull de atmos_ordenes:', aoErr.message);
      }

      // 14. Pagos Atmosférico
      try {
        const atmosPayments = await supabaseAtmosfericoService.getAllPayments();
        if (Array.isArray(atmosPayments)) {
          for (const ap of atmosPayments) this.upsertAtmosPayment(ap);
          totalPulled += atmosPayments.length;
        }
      } catch (apErr) {
        console.error('[SyncManager] Error en pull de atmos_pagos:', apErr.message);
      }

      // 15. Gastos
      try {
        const expenses = await supabaseExpenseService.getAllExpenses();
        if (Array.isArray(expenses) && this.expenseService?.upsertExpense) {
          for (const g of expenses) this.expenseService.upsertExpense(g);
          totalPulled += expenses.length;
        }
      } catch (gErr) {
        console.error('[SyncManager] Error en pull de gastos:', gErr.message);
      }

      // 16. Órdenes Municipio
      try {
        const muniOrders = await supabaseMunicipioService.getAllOrders();
        if (Array.isArray(muniOrders) && this.municipioService?.upsertOrder) {
          for (const ord of muniOrders) this.municipioService.upsertOrder(ord);
          totalPulled += muniOrders.length;
        }
      } catch (moErr) {
        console.error('[SyncManager] Error en pull de municipio_ordenes:', moErr.message);
      }

      // 17. Pagos Municipio
      try {
        const muniPayments = await supabaseMunicipioService.getAllPayments();
        if (Array.isArray(muniPayments) && this.municipioService?.upsertPayment) {
          for (const pg of muniPayments) this.municipioService.upsertPayment(pg);
          totalPulled += muniPayments.length;
        }
      } catch (mpErr) {
        console.error('[SyncManager] Error en pull de municipio_pagos:', mpErr.message);
      }

      // 18. Máquinas
      try {
        const machines = await supabaseMachineService.getAllMachines();
        if (Array.isArray(machines) && this.machineService?.upsertMachine) {
          for (const m of machines) this.machineService.upsertMachine(m);
          totalPulled += machines.length;
        }
      } catch (mErr) {
        console.error('[SyncManager] Error en pull de maquinas:', mErr.message);
      }

      // 19. Trabajos Máquinas
      try {
        const workLogs = await supabaseMachineService.getAllWorkLogs();
        if (Array.isArray(workLogs) && this.machineService?.upsertWorkLog) {
          for (const w of workLogs) this.machineService.upsertWorkLog(w);
          totalPulled += workLogs.length;
        }
      } catch (wErr) {
        console.error('[SyncManager] Error en pull de trabajos_maquinas:', wErr.message);
      }

      // 20. Combustible Máquinas
      try {
        const fuelLogs = await supabaseMachineService.getAllFuelLogs();
        if (Array.isArray(fuelLogs) && this.machineService?.upsertFuelLog) {
          for (const f of fuelLogs) this.machineService.upsertFuelLog(f);
          totalPulled += fuelLogs.length;
        }
      } catch (fErr) {
        console.error('[SyncManager] Error en pull de combustible_maquinas:', fErr.message);
      }

      // 21. Mantenimiento Máquinas
      try {
        const maintenanceLogs = await supabaseMachineService.getAllMaintenanceLogs();
        if (Array.isArray(maintenanceLogs) && this.machineService?.upsertMaintenanceLog) {
          for (const mt of maintenanceLogs) this.machineService.upsertMaintenanceLog(mt);
          totalPulled += maintenanceLogs.length;
        }
      } catch (mtErr) {
        console.error('[SyncManager] Error en pull de mantenimiento_maquinas:', mtErr.message);
      }

      // 22. Empleados
      try {
        const employees = await supabaseEmployeeService.getAllEmployees();
        if (Array.isArray(employees) && this.employeeService?.upsertEmployee) {
          for (const emp of employees) this.employeeService.upsertEmployee(emp);
          totalPulled += employees.length;
        }
      } catch (eErr) {
        console.error('[SyncManager] Error en pull de empleados:', eErr.message);
      }

      // 23. Asistencias
      try {
        const attendances = await supabaseEmployeeService.getAllAttendances();
        if (Array.isArray(attendances) && this.employeeService?.upsertAttendance) {
          for (const att of attendances) this.employeeService.upsertAttendance(att);
          totalPulled += attendances.length;
        }
      } catch (attErr) {
        console.error('[SyncManager] Error en pull de asistencias:', attErr.message);
      }

      // 24. Config Liquidación Empleados
      try {
        const payrollConfigs = await supabaseEmployeeService.getAllPayrollConfigs();
        if (Array.isArray(payrollConfigs) && this.employeeService?.upsertPayrollConfig) {
          for (const cfg of payrollConfigs) this.employeeService.upsertPayrollConfig(cfg);
          totalPulled += payrollConfigs.length;
        }
      } catch (cfgErr) {
        console.error('[SyncManager] Error en pull de empleado_liquidacion_config:', cfgErr.message);
      }

      // 25. Liquidaciones Empleados
      try {
        const payrolls = await supabaseEmployeeService.getAllPayrolls();
        if (Array.isArray(payrolls) && this.employeeService?.upsertPayroll) {
          for (const liq of payrolls) this.employeeService.upsertPayroll(liq);
          totalPulled += payrolls.length;
        }
      } catch (liqErr) {
        console.error('[SyncManager] Error en pull de empleado_liquidaciones:', liqErr.message);
      }

      // 26. Presupuestos
      try {
        const budgets = await supabaseBudgetService.getAllBudgets();
        if (Array.isArray(budgets) && this.budgetService?.upsertBudget) {
          for (const b of budgets) this.budgetService.upsertBudget(b);
          totalPulled += budgets.length;
        }
      } catch (bErr) {
        console.error('[SyncManager] Error en pull de presupuestos:', bErr.message);
      }

      // 27. Remitos
      try {
        const remitos = await supabaseRemitoService.getAllRemitos();
        if (Array.isArray(remitos) && this.remitoService?.upsertRemito) {
          for (const r of remitos) this.remitoService.upsertRemito(r);
          totalPulled += remitos.length;
        }
      } catch (rErr) {
        console.error('[SyncManager] Error en pull de remitos:', rErr.message);
      }

      if (this.syncStatus) {
        this.syncStatus.setStatus('ONLINE');
        this.syncStatus.updateLastPull();
        this.syncStatus.updateLastSync();
      }

      console.log(`[SyncManager] Pull completado exitosamente. Total registros procesados: ${totalPulled}`);
      return { success: true, changesPulled: totalPulled };
    } catch (error) {
      console.error('[PullSync] Error durante Pull Sync:', error.message || error);
      if (this.syncStatus) {
        this.syncStatus.setStatus('ERROR');
      }
      return { success: false, error: error.message || String(error) };
    } finally {
      this.isPulling = false;
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
