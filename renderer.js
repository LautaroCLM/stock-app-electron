// renderer.js

// Constante global con los datos centralizados del negocio (La Perla Desarrolladora S.A.)
const EMPRESA = {
  nombre: "La Perla Desarrolladora S.A.",
  direccion: "Ex ruta 12 esquina Fanny Edelman, barrio El Chantal, Empedrado",
  telefono: "+54 9 3795 58-5278",
  email: "laperla21@gmail.com",
  logo: "logoperla2.png",
  rubros: "FERRETERÍA - ELECTRICIDAD - PINTURA",
  slogan: "¡Te esperamos!",
  cuit: "30-71955729-1",
  ingresosBrutos: "—",
  inicioActividades: "—"
};

// Función auxiliar global para formatear moneda argentina
function formatearMonedaArgentina(valor) {
  const num = Number(valor) || 0;
  const hasDecimals = num % 1 !== 0;
  return num.toLocaleString('es-AR', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });
}
window.formatearMonedaArgentina = formatearMonedaArgentina;

// ===== FUNCIÓN PARA MOSTRAR TOAST (GLOBAL) =====
function mostrarToast(mensaje, tipo = 'info') {
  // Crear elemento toast
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    max-width: 300px;
    word-wrap: break-word;
  `;

  // Colores según tipo
  const colores = {
    success: { bg: '#10b981', text: 'white' },
    error: { bg: '#ef4444', text: 'white' },
    info: { bg: '#3b82f6', text: 'white' },
    warning: { bg: '#f59e0b', text: 'white' }
  };

  const color = colores[tipo] || colores.info;
  toast.style.background = color.bg;
  toast.style.color = color.text;
  toast.textContent = mensaje;

  // Agregar animación CSS si no existe
  if (!document.querySelector('#toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  // Remover después de 3 segundos
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}
window.mostrarToast = mostrarToast;

// === SOLUCIÓN GLOBAL DE FOCO (NATIVO ELECTRON) ===
// Evita que los modales nativos como alert, confirm y prompt bloqueen el teclado en Windows.
const _originalAlert = window.alert;
window.alert = function(...args) {
  const result = _originalAlert.apply(this, args);
  setTimeout(() => { window.focus(); document.body.focus(); if (typeof window.restaurarFoco === 'function') window.restaurarFoco(); }, 50);
  return result;
};

const _originalConfirm = window.confirm;
window.confirm = function(...args) {
  const result = _originalConfirm.apply(this, args);
  setTimeout(() => { window.focus(); document.body.focus(); if (typeof window.restaurarFoco === 'function') window.restaurarFoco(); }, 50);
  return result;
};

const _originalPrompt = window.prompt;
window.prompt = function(...args) {
  const result = _originalPrompt.apply(this, args);
  setTimeout(() => { window.focus(); document.body.focus(); if (typeof window.restaurarFoco === 'function') window.restaurarFoco(); }, 50);
  return result;
};

// Función global inteligente para restaurar el foco al cerrar cualquier modal
window.restaurarFoco = function() {
  setTimeout(() => {
    window.focus();
    document.body.focus();
    const searchInput = document.getElementById('searchInput');
    const cartInputs = document.querySelectorAll('.cart-qty-input');
    
    // 1. Prioridad: Carrito
    if (cartInputs && cartInputs.length > 0) {
      cartInputs[0].focus();
    } 
    // 2. Prioridad: Buscador principal
    else if (searchInput) {
      searchInput.focus();
    }
  }, 100);
};

document.addEventListener('DOMContentLoaded', () => {
  // Inject custom badge styles for Historial general dynamically
  const style = document.createElement('style');
  style.textContent = `
    .badge-gasto-red {
      background-color: #fee2e2;
      color: #991b1b;
      padding: 4px 10px;
      border-radius: 50px;
      font-size: 11.5px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    body.dark-theme .badge-gasto-red {
      background-color: rgba(239, 68, 68, 0.15) !important;
      color: #f87171 !important;
    }
    .badge-presupuesto-blue {
      background-color: #e0f2fe;
      color: #0369a1;
      padding: 4px 10px;
      border-radius: 50px;
      font-size: 11.5px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    body.dark-theme .badge-presupuesto-blue {
      background-color: rgba(14, 165, 233, 0.15) !important;
      color: #38bdf8 !important;
    }
    .badge-remito-orange {
      background-color: #ffedd5;
      color: #c2410c;
      padding: 4px 10px;
      border-radius: 50px;
      font-size: 11.5px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    body.dark-theme .badge-remito-orange {
      background-color: rgba(249, 115, 22, 0.15) !important;
      color: #fb923c !important;
    }
    .search-result-item:hover {
      background-color: #f1f5f9;
    }
    body.dark-theme .search-result-item {
      background-color: #1e293b;
      color: #f8fafc;
      border-bottom: 1px solid #334155;
    }
    body.dark-theme .search-result-item:hover {
      background-color: #334155;
    }
    body.dark-theme .search-results-dropdown {
      border: 1px solid #334155 !important;
      background-color: #1e293b;
    }
    .badge-ajuste-orange {
      background-color: #ffedd5;
      color: #c2410c;
      padding: 4px 10px;
      border-radius: 50px;
      font-size: 11.5px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    body.dark-theme .badge-ajuste-orange {
      background-color: rgba(249, 115, 22, 0.15) !important;
      color: #fb923c !important;
    }
  `;
  document.head.appendChild(style);

  // Alias local para mantener compatibilidad con el resto del archivo
  const restaurarFoco = window.restaurarFoco;

  // Escuchar mensajes desde la ventana de vista previa del presupuesto para guardar en base de datos
  window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'save-budget') {
      try {
        const result = await window.electronAPI.savePresupuesto(event.data.data);
        if (event.source) {
          event.source.postMessage({ type: 'save-budget-result', result }, '*');
        }
      } catch (err) {
        console.error('Error al guardar presupuesto desde popup:', err);
        if (event.source) {
          event.source.postMessage({ type: 'save-budget-result', result: { success: false, error: err.message } }, '*');
        }
      }
    }
  });

  const links = document.querySelectorAll('.sidebar a');
  const content = document.getElementById('content');


  function parsePrecioSeguro(valor) {
    if (typeof valor === 'number') return valor;
    if (!valor) return 0;

    return Number(
      String(valor)
        .replace(/\$/g, '')
        .replace(/\s/g, '')
        .replace(/\./g, '')   // miles
        .replace(',', '.')    // decimal
    ) || 0;
  }


  function updateTextWithResponsiveFont(element, text) {
    if (!element) return;
    element.textContent = text;

    const len = text.length;
    // Si es la KPI principal (id "totalVentas"), el tamaño base es 36px, si no 30px
    const isMain = element.id === 'totalVentas';
    const baseSize = isMain ? 36 : 30;

    if (len > 18) {
      element.style.fontSize = `${baseSize * 0.55}px`; // ~20px / ~16px
    } else if (len > 14) {
      element.style.fontSize = `${baseSize * 0.7}px`;  // ~25px / ~21px
    } else if (len > 10) {
      element.style.fontSize = `${baseSize * 0.85}px`; // ~30px / ~25px
    } else {
      element.style.fontSize = ''; // Hereda el tamaño original del CSS
    }
  }


  function normalizarRow(row) {
    const o = {};
    for (const key in row) {
      const cleanKey = key
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '');

      o[cleanKey] = row[key];
    }
    return o;
  }

  // ===== Configuración lateral + tema =====
  const body = document.body;
  const sidebar = document.querySelector('.sidebar');
  const btnConfig = document.getElementById('btnConfig');
  const configPanel = document.getElementById('configPanel');
  const btnCloseConfig = document.getElementById('btnCloseConfig');
  const btnTema = document.getElementById('btnTema');
  const btnMenuMobile = document.getElementById('btnMenuMobile');
  const btnBackup = document.getElementById('btnBackup');
  const btnLogout = document.getElementById('btnLogout');
  const btnProfileLogout = document.getElementById('btnProfileLogout');
  const btnProfileSettings = document.getElementById('btnProfileSettings');
  const btnToggleDelete = document.getElementById('btnToggleDelete');


  // ── Menú de Perfil (Dropdown Interactivo por Click) ─────────────────────────
  const topbarProfile = document.getElementById('topbarProfile') || document.querySelector('.topbar-profile');
  const profileMenu = document.getElementById('profileMenu') || topbarProfile?.querySelector('.profile-menu');

  if (topbarProfile && profileMenu) {
    let isProfileMenuOpen = false;

    const handleOutsideClick = (e) => {
      if (!topbarProfile.contains(e.target)) {
        closeProfileMenu();
      }
    };

    const handleKeydown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        closeProfileMenu();
      }
    };

    const openProfileMenu = () => {
      if (isProfileMenuOpen) return;
      isProfileMenuOpen = true;
      topbarProfile.classList.add('active');
      profileMenu.classList.add('active');
      topbarProfile.setAttribute('aria-expanded', 'true');
      document.addEventListener('click', handleOutsideClick);
      document.addEventListener('keydown', handleKeydown);

      if (typeof loadAndRenderCompanyUsers === 'function') {
        loadAndRenderCompanyUsers();
      }
    };

    const closeProfileMenu = () => {
      if (!isProfileMenuOpen) return;
      isProfileMenuOpen = false;
      topbarProfile.classList.remove('active');
      profileMenu.classList.remove('active');
      topbarProfile.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeydown);
    };

    const toggleProfileMenu = () => {
      if (isProfileMenuOpen) {
        closeProfileMenu();
      } else {
        openProfileMenu();
      }
    };

    topbarProfile.addEventListener('click', (e) => {
      if (e.target.closest('.profile-menu button')) {
        closeProfileMenu();
        return;
      }
      e.stopPropagation();
      toggleProfileMenu();
    });

    topbarProfile.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (!e.target.closest('.profile-menu button')) {
          e.preventDefault();
          toggleProfileMenu();
        }
      }
    });
  }

  if (btnProfileLogout) {
    btnProfileLogout.addEventListener('click', () => {
      if (btnLogout) btnLogout.click();
    });
  }

  if (btnProfileSettings) {
    btnProfileSettings.addEventListener('click', () => {
      const modal = document.getElementById('modalProfileSettings');
      if (modal) {
        if (typeof openProfileSettingsModal === 'function') {
          openProfileSettingsModal();
        } else {
          modal.classList.add('active');
        }
      }
    });
  }

  // Toggle delete button functionality - AHORA HACE SCROLL HACIA btnDeleteAll
  if (btnToggleDelete) {
    btnToggleDelete.addEventListener('click', () => {
      const btnInventario = document.querySelector('.menu a[data-page="inventario"]');
      if (btnInventario && !btnInventario.classList.contains('active')) {
        btnInventario.click();
      }
      
      setTimeout(() => {
        const btnDeleteAll = document.getElementById('btnDeleteAll');
        if (btnDeleteAll) {
          btnDeleteAll.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const originalShadow = btnDeleteAll.style.boxShadow;
          btnDeleteAll.style.transition = 'all 0.3s ease';
          btnDeleteAll.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.4)';
          setTimeout(() => {
            btnDeleteAll.style.boxShadow = originalShadow || '';
          }, 1500);
        }
      }, 100);
    });
  }

  // ====================
  // SISTEMA DE NOTIFICACIONES
  // ====================
  const btnNotifications = document.getElementById('btnNotifications');
  const notificationPanel = document.getElementById('notificationPanel');
  const btnCloseNotifications = document.getElementById('btnCloseNotifications');
  const notificationBadge = document.getElementById('notificationBadge');
  const notificationList = document.getElementById('notificationList');
  const btnMarkAllRead = document.getElementById('btnMarkAllRead');
  const btnDeleteAllNotifications = document.getElementById('btnDeleteAllNotifications');

  let currentNotifications = [];

  const renderNotifications = () => {
    if (!notificationList) return;
    notificationList.innerHTML = '';
    let unreadCount = 0;

    if (currentNotifications.length === 0) {
      notificationList.innerHTML = '<p style="text-align:center; color:#94a3b8; padding: 20px;">No hay notificaciones</p>';
    } else {
      currentNotifications.forEach(notif => {
        if (!notif.is_read) unreadCount++;
        const item = document.createElement('div');
        item.className = `notification-item ${notif.is_read ? '' : 'unread'}`;
        
        let colorClass = 'blue';
        if (notif.type.includes('cero') || notif.type.includes('error')) colorClass = 'red';
        else if (notif.type.includes('bajo') || notif.type.includes('deuda')) colorClass = 'orange';
        else if (notif.type.includes('backup') || notif.type.includes('completad') || notif.type.includes('exit')) colorClass = 'green';
        else if (notif.type.includes('mantenimiento')) colorClass = 'purple';

        const date = new Date(notif.created_at);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        item.innerHTML = `
          <div class="notif-icon ${colorClass}"><i class="${notif.icon || 'fas fa-info'}"></i></div>
          <div class="notif-content">
            <div class="notif-title">${notif.title}</div>
            <div class="notif-desc">${notif.description}</div>
            <div class="notif-meta">
              <span>${dateStr}</span>
              <button class="notif-delete" title="Eliminar"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        `;

        if (!notif.is_read) {
          item.addEventListener('click', async (e) => {
            if (e.target.closest('.notif-delete')) return;
            const res = await window.electronAPI.markNotificationRead(notif.id);
            if (res?.success) loadNotifications();
          });
        }

        const btnDelete = item.querySelector('.notif-delete');
        btnDelete.addEventListener('click', async (e) => {
          e.stopPropagation();
          const res = await window.electronAPI.deleteNotification(notif.id);
          if (res?.success) loadNotifications();
        });

        notificationList.appendChild(item);
      });
    }

    if (notificationBadge) {
      if (unreadCount > 0) {
        notificationBadge.style.display = 'block';
        notificationBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      } else {
        notificationBadge.style.display = 'none';
      }
    }
  };

  const loadNotifications = async () => {
    const notifs = await window.electronAPI.getNotifications();
    currentNotifications = notifs || [];
    renderNotifications();
  };

  if (btnNotifications && notificationPanel) {
    btnNotifications.addEventListener('click', () => {
      closeConfig();
      notificationPanel.classList.add('active');
      loadNotifications();
    });
  }

  if (btnCloseNotifications) {
    btnCloseNotifications.addEventListener('click', () => {
      notificationPanel.classList.remove('active');
    });
  }

  if (btnMarkAllRead) {
    btnMarkAllRead.addEventListener('click', async () => {
      await window.electronAPI.markAllNotificationsRead();
      loadNotifications();
    });
  }

  if (btnDeleteAllNotifications) {
    btnDeleteAllNotifications.addEventListener('click', async () => {
      if(confirm('¿Eliminar todas las notificaciones?')) {
        await window.electronAPI.deleteAllNotifications();
        loadNotifications();
      }
    });
  }

  if (window.electronAPI.onNewNotification) {
    window.electronAPI.onNewNotification((data) => {
      loadNotifications();
    });
  }

  // Cargar notificaciones iniciales (con un breve timeout para no frenar el paint)
  setTimeout(loadNotifications, 500);

  function applyTheme(theme) {
    const isDark = theme === 'dark';
    body.classList.toggle('dark-theme', isDark);
    if (btnTema) {
      btnTema.querySelector('span')?.remove();
      btnTema.innerHTML = `<i class="fas ${isDark ? 'fa-sun' : 'fa-moon'}"></i><span>${isDark ? 'Tema Claro' : 'Tema Oscuro'}</span>`;
    }
  }

  applyTheme(localStorage.getItem('theme') === 'dark' ? 'dark' : 'light');


  // Función global para escapar caracteres HTML especiales (evita XSS y ReferenceError)
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  window.escapeHtml = escapeHtml;

  // ==========================================================================
  // BUSCADOR INTELIGENTE DE INVENTARIO (VS Code / YouTube Style Autocomplete)
  // ==========================================================================

  // Normalizar cadenas removiendo acentos y convirtiendo a minúsculas
  function normalizeSearchText(str) {
    if (!str) return '';
    return str.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  // Algoritmo de Distancia de Levenshtein para Búsqueda Difusa (Fuzzy Search / Tolerancia a Errores)
  function computeLevenshteinDistance(str1, str2) {
    const a = str1.length;
    const b = str2.length;
    if (a === 0) return b;
    if (b === 0) return a;

    const matrix = Array.from({ length: a + 1 }, () => new Array(b + 1).fill(0));
    for (let i = 0; i <= a; i++) matrix[i][0] = i;
    for (let j = 0; j <= b; j++) matrix[0][j] = j;

    for (let i = 1; i <= a; i++) {
      for (let j = 1; j <= b; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,       // Eliminación
          matrix[i][j - 1] + 1,       // Inserción
          matrix[i - 1][j - 1] + cost // Sustitución
        );
      }
    }
    return matrix[a][b];
  }

  // Similitud Difusa por Tokens (Retorna puntuación entre 0 y 1)
  function calculateFuzzySimilarity(text, query) {
    const normText = normalizeSearchText(text);
    const normQuery = normalizeSearchText(query);
    if (!normText || !normQuery) return 0;

    if (normText.includes(normQuery)) return 1.0;

    const words = normText.split(/\s+/);
    let maxSim = 0;

    for (const word of words) {
      if (!word) continue;
      const dist = computeLevenshteinDistance(word, normQuery);
      const maxLen = Math.max(word.length, normQuery.length);
      const sim = 1 - (dist / maxLen);
      if (sim > maxSim) maxSim = sim;
    }

    return maxSim;
  }

  // Puntuación de Relevancia del Producto (Ranking por Coincidencia)
  function scoreProductRelevance(p, rawQuery) {
    const query = normalizeSearchText(rawQuery);
    if (!query) return 0;

    const nombre = normalizeSearchText(p.nombre);
    const codigo = normalizeSearchText(p.codigo);
    const categoria = normalizeSearchText(p.categoria);
    const unidad = normalizeSearchText(p.unidad);
    const proveedor = normalizeSearchText(p.proveedor_nombre || p.proveedor);

    let score = 0;

    // 1. Coincidencia Exacta de Código o Nombre
    if (codigo === query || nombre === query) score += 1000;

    // 2. Prefijo en Código o Nombre (ej. "pin" -> "Pinza")
    else if (codigo.startsWith(query)) score += 850;
    else if (nombre.startsWith(query)) score += 800;

    // 3. Inicio de Palabra en el Nombre (ej. "cor" -> "Pinza Corte")
    else {
      const words = nombre.split(/\s+/);
      if (words.some(w => w.startsWith(query))) score += 650;
      else if (nombre.includes(query)) score += 500;
      else if (codigo.includes(query)) score += 450;
    }

    // 4. Coincidencia en Categoría, Unidad o Proveedor
    if (categoria.includes(query)) score += 300;
    if (unidad.includes(query)) score += 200;
    if (proveedor && proveedor.includes(query)) score += 250;

    // 5. Búsqueda Difusa por Tolerancia a Errores ("pinsa" -> "Pinza")
    if (score === 0 && query.length >= 3) {
      const fuzzySim = calculateFuzzySimilarity(p.nombre, query);
      if (fuzzySim >= 0.6) {
        score += Math.round(fuzzySim * 350);
      }
    }

    return score;
  }

  // Resaltado de coincidencias en el texto (Highlighting)
  function highlightTextMatches(text, rawQuery) {
    if (!text) return '';
    const query = rawQuery.trim();
    if (!query) return escapeHtml(text);

    const safeText = escapeHtml(text);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');

    return safeText.replace(regex, '<mark class="search-match-highlight">$1</mark>');
  }

  // Hacer accesible la puntuación de relevancia globalmente
  window.__scoreProductRelevance = scoreProductRelevance;

  function setupTopbarSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchWrapper = document.getElementById('topbarSearchWrapper') || document.querySelector('.topbar-search');
    let suggestionsMenu = document.getElementById('searchSuggestionsMenu');

    if (!searchInput || !searchWrapper || searchInput.__topbarSearchBound) return;

    if (!suggestionsMenu) {
      suggestionsMenu = document.createElement('div');
      suggestionsMenu.id = 'searchSuggestionsMenu';
      suggestionsMenu.className = 'search-suggestions-dropdown';
      suggestionsMenu.style.display = 'none';
      searchWrapper.appendChild(suggestionsMenu);
    }

    let activeSuggestionIndex = -1;
    let searchDebounceTimeout = null;

    const hideSuggestions = () => {
      suggestionsMenu.style.display = 'none';
      suggestionsMenu.innerHTML = '';
      activeSuggestionIndex = -1;
      searchWrapper.classList.remove('active');
    };

    const updateActiveState = (active) => {
      if (active) searchWrapper.classList.add('active');
      else if (suggestionsMenu.style.display === 'none') searchWrapper.classList.remove('active');
    };

    const renderSuggestions = (rankedProducts, query) => {
      if (!rankedProducts || rankedProducts.length === 0 || !query.trim()) {
        hideSuggestions();
        return;
      }

      const topProducts = rankedProducts.slice(0, 10);
      activeSuggestionIndex = -1;

      const html = topProducts.map((p, idx) => {
        const highlightedName = highlightTextMatches(p.nombre || 'Producto', query);
        const highlightedCode = highlightTextMatches(p.codigo || '', query);
        const highlightedCat = highlightTextMatches(p.categoria || 'Sin categoría', query);
        const isStockLow = p.stock < 10;
        const stockClass = isStockLow ? 'low' : 'normal';

        return `
          <div class="search-suggestion-item" data-index="${idx}" data-code="${escapeHtml(p.codigo || '')}" data-name="${escapeHtml(p.nombre || '')}">
            <div class="search-suggestion-header">
              <span class="search-suggestion-name">${highlightedName}</span>
              <span class="search-suggestion-code">${highlightedCode}</span>
            </div>
            <div class="search-suggestion-details">
              <span class="search-suggestion-cat"><i class="fas fa-tag"></i> ${highlightedCat}</span>
              <span class="search-suggestion-stock ${stockClass}"><i class="fas fa-boxes"></i> Stock: ${p.stock}</span>
            </div>
          </div>
        `;
      }).join('');

      suggestionsMenu.innerHTML = html;
      suggestionsMenu.style.display = 'block';
      searchWrapper.classList.add('active');

      // Escuchador de clic en sugerencia
      const items = suggestionsMenu.querySelectorAll('.search-suggestion-item');
      items.forEach((item) => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectSuggestionItem(item);
        });
      });
    };

    const selectSuggestionItem = (itemNode) => {
      if (!itemNode) return;
      const code = itemNode.getAttribute('data-code');
      const name = itemNode.getAttribute('data-name');
      const selectedValue = name || code || '';

      searchInput.value = selectedValue;
      hideSuggestions();

      if (typeof window.__inventoryRenderTable === 'function') {
        window.__inventoryRenderTable();
      }
    };

    const fetchProductsIfEmpty = async () => {
      if (!Array.isArray(window.__todosLosProductos) || window.__todosLosProductos.length === 0) {
        try {
          if (window.electronAPI && window.electronAPI.getProducts) {
            window.__todosLosProductos = await window.electronAPI.getProducts();
          }
        } catch (err) {
          console.warn('[SmartSearch] Error obteniendo productos:', err.message);
        }
      }
      return window.__todosLosProductos || [];
    };

    // Escuchador Input en tiempo real
    searchInput.addEventListener('input', async () => {
      clearTimeout(searchDebounceTimeout);

      searchDebounceTimeout = setTimeout(async () => {
        const query = searchInput.value;
        const allProducts = await fetchProductsIfEmpty();

        if (query.trim().length > 0 && allProducts.length > 0) {
          const ranked = allProducts
            .map(p => ({ product: p, score: scoreProductRelevance(p, query) }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(item => item.product);

          renderSuggestions(ranked, query);
        } else {
          hideSuggestions();
        }

        if (typeof window.__inventoryRenderTable === 'function') {
          window.__inventoryRenderTable();
        }
      }, 90);
    });

    // Escuchador de Navegación con Teclado (ArrowUp, ArrowDown, Enter, Escape)
    searchInput.addEventListener('keydown', (e) => {
      const items = suggestionsMenu.querySelectorAll('.search-suggestion-item');
      const isOpen = suggestionsMenu.style.display !== 'none' && items.length > 0;

      if (e.key === 'ArrowDown') {
        if (!isOpen) return;
        e.preventDefault();
        activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
        updateItemSelectionHighlight();
      } else if (e.key === 'ArrowUp') {
        if (!isOpen) return;
        e.preventDefault();
        activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
        updateItemSelectionHighlight();
      } else if (e.key === 'Enter') {
        if (isOpen && activeSuggestionIndex >= 0 && items[activeSuggestionIndex]) {
          e.preventDefault();
          selectSuggestionItem(items[activeSuggestionIndex]);
        } else {
          hideSuggestions();
          if (typeof window.__inventoryRenderTable === 'function') {
            window.__inventoryRenderTable();
          }
        }
      } else if (e.key === 'Escape') {
        hideSuggestions();
      }
    });

    // Cerrar desplegable si se hace clic fuera del buscador
    document.addEventListener('click', (e) => {
      if (!searchWrapper.contains(e.target)) {
        hideSuggestions();
      }
    });

    searchInput.addEventListener('focus', () => updateActiveState(true));

    const icon = searchWrapper.querySelector('i');
    if (icon) {
      icon.addEventListener('click', () => searchInput.focus());
    }

    searchInput.__topbarSearchBound = true;
  }

  setupTopbarSearch();

  // ===== BUSCADOR RÁPIDO GLOBAL (Ctrl+F / Cmd+F) =====
  function setupGlobalSearch() {
    document.addEventListener('keydown', (e) => {
      // Detectar Ctrl+F (Windows/Linux) o Cmd+F (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        // Evitar el buscador nativo del navegador
        e.preventDefault();

        // Función para navegar y enfocar
        const navigateAndFocus = () => {
          const content = document.getElementById('content');
          const links = document.querySelectorAll('.sidebar a[data-page]');
          const inventoryLink = document.querySelector('.sidebar a[data-page="inventario"]');

          if (!content || !inventoryLink) {
            console.error('No se encontraron los elementos necesarios para la navegación');
            return;
          }

          // Si ya estamos en inventario, solo enfocar
          if (content.dataset.currentPage === 'inventario') {
            focusSearchInput();
          } else {
            // Navegar a inventario
            content.innerHTML = pages.inventario || '<h1>Página no encontrada</h1>';
            content.dataset.currentPage = 'inventario';

            // No actualizar navegación activa para evitar que se ponga azul

            // Inicializar inventario
            initInventario();

            // Esperar a que renderice y enfocar
            setTimeout(() => {
              focusSearchInput();
            }, 100);
          }
        };

        // Función para enfocar el input de búsqueda
        const focusSearchInput = () => {
          const searchInput = document.getElementById('searchInput');
          if (searchInput) {
            searchInput.focus();
            // Seleccionar texto existente si lo hay
            if (searchInput.value) {
              searchInput.select();
            }
          } else {
            // Reintentar después de un pequeño delay si el input aún no existe
            setTimeout(() => {
              const retryInput = document.getElementById('searchInput');
              if (retryInput) {
                retryInput.focus();
                if (retryInput.value) {
                  retryInput.select();
                }
              }
            }, 200);
          }
        };

        // Ejecutar navegación y foco
        navigateAndFocus();
      }
    });
  }

  // Inicializar el buscador global cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupGlobalSearch);
  } else {
    setupGlobalSearch();
  }

  btnTema?.addEventListener('click', () => {
    const next = body.classList.contains('dark-theme') ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
  });


  const openConfig = () => configPanel?.classList.add('active');
  const closeConfig = () => configPanel?.classList.remove('active');

  btnConfig?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (configPanel?.classList.contains('active')) closeConfig();
    else openConfig();
  });

  btnCloseConfig?.addEventListener('click', closeConfig);

  btnMenuMobile?.addEventListener('click', () => {
    body.classList.toggle('sidebar-open');
  });

  document.addEventListener('click', (e) => {
    if (configPanel?.classList.contains('active') && !configPanel.contains(e.target) && e.target !== btnConfig && !e.target.closest('#btnConfig')) {
      closeConfig();
    }
    if (window.innerWidth <= 900 && body.classList.contains('sidebar-open') && sidebar && !sidebar.contains(e.target) && !e.target.closest('#btnMenuMobile')) {
      body.classList.remove('sidebar-open');
    }
  });

  btnLogout?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      if (window.electronAPI && window.electronAPI.authSignOut) {
        await window.electronAPI.authSignOut();
      }
    } catch (err) {
      console.warn('[Auth] Error al cerrar sesión:', err);
    } finally {
      localStorage.removeItem('authUser');
      const authOverlay = document.getElementById('authLoginOverlay');
      if (authOverlay) authOverlay.classList.add('active');
    }
  });

  // Modal Datos de Empresa
  const btnDatosEmpresa = document.getElementById('btnDatosEmpresa');
  const modalDatosEmpresa = document.getElementById('modalDatosEmpresa');
  const btnCloseDatosEmpresa = document.getElementById('btnCloseDatosEmpresa');
  const btnAceptarDatosEmpresa = document.getElementById('btnAceptarDatosEmpresa');

    if (btnDatosEmpresa && modalDatosEmpresa) {
    btnDatosEmpresa.addEventListener('click', () => {
      closeConfig();
      
      // Populate company details modal dynamically
      const companyTitle = modalDatosEmpresa.querySelector('.company-logo-wrapper h3');
      if (companyTitle) companyTitle.textContent = EMPRESA.nombre;
      
      const cards = modalDatosEmpresa.querySelectorAll('.info-card');
      cards.forEach(card => {
        const labelEl = card.querySelector('.info-label');
        const valueEl = card.querySelector('.info-value');
        if (labelEl && valueEl) {
          const txt = labelEl.textContent.trim().toLowerCase();
          if (txt.includes('dirección') || txt.includes('direccion')) {
            valueEl.textContent = EMPRESA.direccion;
          } else if (txt.includes('teléfono') || txt.includes('telefono')) {
            valueEl.textContent = EMPRESA.telefono;
          } else if (txt.includes('cuit')) {
            valueEl.textContent = EMPRESA.cuit;
          } else if (txt.includes('email') || txt.includes('correo')) {
            valueEl.textContent = EMPRESA.email;
          }
        }
      });
      
      modalDatosEmpresa.classList.add('active');
    });
  }

  const closeDatosEmpresa = () => {
    if (modalDatosEmpresa) {
      modalDatosEmpresa.classList.remove('active');
      if (typeof window.restaurarFoco === 'function') window.restaurarFoco();
    }
  };

  if (btnCloseDatosEmpresa) btnCloseDatosEmpresa.addEventListener('click', closeDatosEmpresa);
  if (btnAceptarDatosEmpresa) btnAceptarDatosEmpresa.addEventListener('click', closeDatosEmpresa);

  function parseRegistro(row) {
    const fechaObj = row?.fecha ? new Date(row.fecha) : new Date();
    const detalle = String(row?.detalle || '');
    const accion = String(row?.accion || '');
    const productoMatch = detalle.match(/Producto:\s*([^|]+)/i);
    const cantidadMatch = detalle.match(/Cantidad:\s*([\d.,]+)/i);

    return {
      fecha: fechaObj.toLocaleDateString('es-AR'),
      hora: fechaObj.toLocaleTimeString('es-AR'),
      usuario: 'Administrador',
      producto: productoMatch ? productoMatch[1].trim() : '-',
      cantidad: cantidadMatch ? cantidadMatch[1].trim() : '-',
      operacion: accion || '-',
      detalle
    };
  }


  const btnRestoreBackup = document.getElementById('btnRestoreBackup');
  const modalRestaurarBackup = document.getElementById('modalRestaurarBackup');
  const btnCloseRestaurarBackup = document.getElementById('btnCloseRestaurarBackup');
  const backupListContainer = document.getElementById('backupListContainer');

  btnBackup?.addEventListener('click', async () => {
    const prefs = { theme: localStorage.getItem('theme') || 'light' };
    const res = await window.electronAPI.createBackup(prefs);
    if (res?.success) alert(`Respaldo generado:\n${res.path}`);
    else alert(`Error al generar respaldo: ${res?.error || 'Error desconocido'}`);
  });

  const closeRestaurarBackup = () => {
    if (modalRestaurarBackup) {
      modalRestaurarBackup.classList.remove('active');
      if (typeof window.restaurarFoco === 'function') window.restaurarFoco();
    }
  };

  btnCloseRestaurarBackup?.addEventListener('click', closeRestaurarBackup);

  btnRestoreBackup?.addEventListener('click', async () => {
    closeConfig();
    const res = await window.electronAPI.getBackups();
    
    if (backupListContainer) {
      backupListContainer.innerHTML = '';
      if (!res?.success || !res.backups || res.backups.length === 0) {
        backupListContainer.innerHTML = '<p style="color:#64748b; text-align:center; padding: 20px;">No se encontraron respaldos disponibles.</p>';
      } else {
        res.backups.forEach(backup => {
          const dateObj = new Date(backup.date);
          const dateStr = dateObj.toLocaleDateString('es-AR');
          const timeStr = dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
          const sizeKb = (backup.size / 1024).toFixed(1);

          const card = document.createElement('div');
          card.className = 'backup-card';
          card.innerHTML = `
            <div class="backup-card-info">
              <div class="backup-card-icon"><i class="fas fa-file-archive"></i></div>
              <div class="backup-card-text">
                <span class="backup-card-title">${backup.name}</span>
                <span class="backup-card-date"><i class="fas fa-calendar-alt"></i> ${dateStr} - <i class="fas fa-clock"></i> ${timeStr}</span>
              </div>
            </div>
            <div class="backup-card-size">${sizeKb} KB</div>
          `;
          
          card.addEventListener('click', async () => {
            const confirmMsg = '¿Estás seguro de restaurar este respaldo?\\nLa información actual será reemplazada por la del backup seleccionado.';
            if (confirm(confirmMsg)) {
              const restoreRes = await window.electronAPI.restoreBackup(backup.path);
              if (restoreRes?.success) {
                if (restoreRes.prefs && restoreRes.prefs.theme) {
                  localStorage.setItem('theme', restoreRes.prefs.theme);
                }
                alert('Restauración completada con éxito. La aplicación se recargará para aplicar los cambios.');
                window.location.reload();
              } else {
                alert(`Error al restaurar: ${restoreRes?.error || 'Error desconocido'}`);
              }
            }
          });
          
          backupListContainer.appendChild(card);
        });
      }
    }
    
    modalRestaurarBackup?.classList.add('active');
  });


  const pages = {
    'ajustes-caja': `
<div class="gastos-page">
  <div class="gastos-header">
    <div class="gastos-header-left">
      <h1><i class="fas fa-cash-register"></i> Ajustes de Caja</h1>
      <p>Registro y control de diferencias de caja, retiros e ingresos manuales.</p>
    </div>
    <div class="gastos-header-right">
      <button id="btnNuevoAjuste" class="btn-gasto-primary">
        <i class="fas fa-plus"></i> NUEVO AJUSTE
      </button>
    </div>
  </div>

  <!-- Tarjetas de Resumen -->
  <div class="gastos-metrics-panel">
    <div class="metric-card">
      <div class="metric-icon" style="background: rgba(16, 185, 129, 0.1); color: #10b981;">
        <i class="fas fa-arrow-up"></i>
      </div>
      <div class="metric-info">
        <h3>Ajustes Positivos</h3>
        <p id="txtAjustesPositivos">$0</p>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">
        <i class="fas fa-arrow-down"></i>
      </div>
      <div class="metric-info">
        <h3>Ajustes Negativos</h3>
        <p id="txtAjustesNegativos">$0</p>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">
        <i class="fas fa-scale-balanced"></i>
      </div>
      <div class="metric-info">
        <h3>Balance de Ajustes</h3>
        <p id="txtBalanceAjustes">$0</p>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon" style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6;">
        <i class="fas fa-calculator"></i>
      </div>
      <div class="metric-info">
        <h3>Cantidad de Ajustes</h3>
        <p id="txtCantAjustes">0</p>
      </div>
    </div>
  </div>

  <!-- Tabla de Ajustes -->
  <div class="gastos-table-wrapper" style="margin-top: 20px;">
    <table class="gastos-table" style="width: 100%;">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Tipo</th>
          <th>Motivo</th>
          <th>Monto</th>
          <th>Venta Asociada</th>
          <th>Observación</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody id="ajustesTableBody">
        <!-- Los ajustes se cargarán aquí -->
      </tbody>
    </table>
  </div>
</div>

<!-- Modal para Nuevo Ajuste -->
<div id="modalNuevoAjuste" class="modal">
  <div class="modal-content gastos-modal-modern">
    <div class="modal-header">
      <h3 id="ajusteModalTitle"><i class="fas fa-cash-register"></i> Registrar Ajuste de Caja</h3>
      <button class="btn-close-modal" id="btnCerrarAjusteModal"><i class="fas fa-times"></i></button>
    </div>
    <form id="formAjuste">
      <div class="modal-body">
        <div class="form-group-grid">
          <div class="form-group">
            <label for="ajusteEfecto">Sentido del Ajuste <span class="required">*</span></label>
            <select id="ajusteEfecto" required>
              <option value="Ingreso">Ingreso (+) (Ajuste Positivo)</option>
              <option value="Egreso">Egreso / Salida (-) (Ajuste Negativo)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="ajusteTipo">Tipo <span class="required">*</span></label>
            <select id="ajusteTipo" required>
              <option value="">Seleccionar tipo...</option>
              <option value="Venta anulada">Venta anulada</option>
              <option value="Error de carga">Error de carga</option>
              <option value="Retiro de efectivo">Retiro de efectivo</option>
              <option value="Ingreso manual">Ingreso manual</option>
              <option value="Diferencia de caja">Diferencia de caja</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
        </div>
        <div class="form-group-grid" style="margin-top: 15px;">
          <div class="form-group">
            <label for="ajusteMonto">Monto <span class="required">*</span></label>
            <input type="number" step="0.01" id="ajusteMonto" placeholder="Monto del ajuste (ej: 2500)" required>
          </div>
          <div class="form-group">
            <label for="ajusteFecha">Fecha <span class="required">*</span></label>
            <input type="date" id="ajusteFecha" required>
          </div>
        </div>
        <div class="form-group" style="margin-top: 15px;">
          <label for="ajusteMotivo">Motivo <span class="required">*</span></label>
          <input type="text" id="ajusteMotivo" placeholder="Motivo del ajuste" required>
        </div>

        <!-- Selector de Operación Asociada -->
        <div class="form-group" style="margin-top: 15px;">
          <label style="font-weight: 600; margin-bottom: 8px; display: block;">¿A qué operación corresponde este ajuste?</label>
          <div style="display: flex; gap: 20px; align-items: center;">
            <label style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 500;">
              <input type="radio" name="ajusteOperacionTipo" value="ninguna" checked style="width: 16px; height: 16px;">
              Ninguna
            </label>
            <label style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 500;">
              <input type="radio" name="ajusteOperacionTipo" value="venta" style="width: 16px; height: 16px;">
              Venta
            </label>
            <label style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 500;">
              <input type="radio" name="ajusteOperacionTipo" value="gasto" style="width: 16px; height: 16px;">
              Gasto
            </label>
          </div>
        </div>

        <!-- Buscador / Selección de Venta -->
        <div id="ajusteVentaBusquedaContainer" style="margin-top: 12px; display: none; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: rgba(241, 245, 249, 0.5);">
          <div class="form-group">
            <label for="ajusteVentaSearchInput" style="font-size: 13px; font-weight: 600;">Seleccionar Venta Reciente (o buscar por ticket, cliente o total)</label>
            <input type="text" id="ajusteVentaSearchInput" placeholder="Filtrar por ticket #, cliente o total..." style="margin-top: 4px;">
            <div id="ajusteVentaSearchResults" style="max-height: 160px; overflow-y: auto; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 6px; background: var(--bg-card, white);"></div>
            <div id="ajusteVentaSeleccionada" style="margin-top: 8px; font-weight: 600; color: #2563eb; display: none; padding: 8px 12px; background: rgba(37, 99, 235, 0.1); border-radius: 6px; border: 1px solid rgba(37, 99, 235, 0.2);"></div>
            <input type="hidden" id="ajusteVentaId" value="">
          </div>
        </div>

        <!-- Buscador / Selección de Gasto -->
        <div id="ajusteGastoBusquedaContainer" style="margin-top: 12px; display: none; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: rgba(241, 245, 249, 0.5);">
          <div class="form-group">
            <label for="ajusteGastoSearchInput" style="font-size: 13px; font-weight: 600;">Seleccionar Gasto Reciente (o buscar por concepto o monto)</label>
            <input type="text" id="ajusteGastoSearchInput" placeholder="Filtrar por concepto o monto..." style="margin-top: 4px;">
            <div id="ajusteGastoSearchResults" style="max-height: 160px; overflow-y: auto; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 6px; background: var(--bg-card, white);"></div>
            <div id="ajusteGastoSeleccionado" style="margin-top: 8px; font-weight: 600; color: #7c3aed; display: none; padding: 8px 12px; background: rgba(124, 58, 237, 0.1); border-radius: 6px; border: 1px solid rgba(124, 58, 237, 0.2);"></div>
            <input type="hidden" id="ajusteGastoInfo" value="">
          </div>
        </div>

        <div class="form-group" style="margin-top: 15px;">
          <label for="ajusteObservacion">Observaciones (Opcional)</label>
          <textarea id="ajusteObservacion" placeholder="Detalles adicionales..." rows="3"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-modern-secondary" id="btnCancelarAjuste">Cancelar</button>
        <button type="submit" class="btn-modern-primary">Guardar Ajuste</button>
      </div>
    </form>
  </div>
</div>

`,
    'gastos': `
<div class="gastos-page">
  <!-- Header -->
  <div class="gastos-header">
    <div class="gastos-header-left">
      <h1><i class="fas fa-wallet"></i> Control de Gastos</h1>
      <p>Registro y seguimiento de gastos operativos diarios de la ferretería.</p>
    </div>
    <div class="gastos-header-right">
      <button id="btnNuevoGasto" class="btn-gasto-primary">
        <i class="fas fa-plus"></i> Nuevo Gasto
      </button>
    </div>
  </div>

  <!-- Tarjetas de Resumen (Resumen Superior) -->
  <div class="gastos-metrics-panel">
    <div class="metric-card">
      <div class="metric-icon" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">
        <i class="fas fa-calculator"></i>
      </div>
      <div class="metric-info">
        <h3>Total Gastos</h3>
        <p id="txtTotalGastos">$0.00</p>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon" style="background: rgba(16, 185, 129, 0.1); color: #10b981;">
        <i class="fas fa-check-circle"></i>
      </div>
      <div class="metric-info">
        <h3>Pagados</h3>
        <p id="txtGastosPagados">$0.00</p>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">
        <i class="fas fa-clock"></i>
      </div>
      <div class="metric-info">
        <h3>Pendientes</h3>
        <p id="txtGastosPendientes">$0.00</p>
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-icon" style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6;">
        <i class="fas fa-list-ol"></i>
      </div>
      <div class="metric-info">
        <h3>Cantidad</h3>
        <p id="txtCantGastos">0</p>
      </div>
    </div>
  </div>

  <!-- Barra de Filtros y Búsqueda -->
  <div class="gastos-toolbar">
    <div class="gastos-search">
      <i class="fas fa-search"></i>
      <input type="text" id="gastoSearchInput" placeholder="Buscar concepto u observaciones...">
    </div>
    <div class="gastos-filters">
      <select id="gastoFiltroCategoria" class="gasto-filter-select">
        <option value="">Todas las categorías</option>
        <option value="Limpieza">Limpieza</option>
        <option value="Galletitas">Galletitas</option>
        <option value="Agua">Agua</option>
        <option value="Café">Café</option>
        <option value="Papelería">Papelería</option>
        <option value="Combustible">Combustible</option>
        <option value="Reparaciones">Reparaciones</option>
        <option value="Otros">Otros</option>
      </select>
      <select id="gastoFiltroEstado" class="gasto-filter-select">
        <option value="">Todos los estados</option>
        <option value="Pagado">Pagado</option>
        <option value="Pendiente">Pendiente</option>
      </select>
    </div>
  </div>

  <!-- Tabla de Gastos -->
  <div class="gastos-table-wrapper">
    <table class="gastos-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Concepto</th>
          <th>Categoría</th>
          <th>Monto</th>
          <th>Estado</th>
          <th>Observación</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody id="gastosTableBody">
        <tr>
          <td colspan="7" style="text-align:center; padding: 20px; color: var(--muted);">Cargando gastos...</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Modal para Crear/Editar Gasto -->
  <div id="modalNuevoGasto" class="modal">
    <div class="modal-content gastos-modal-modern">
      <div class="modal-prov-header" style="margin-bottom:20px; border-bottom:1px solid var(--border-1); padding-bottom:10px;">
        <h3 id="gastoModalTitle" style="margin:0; font-size:18px; color:var(--text);"><i class="fas fa-wallet"></i> Registrar Gasto</h3>
      </div>
      <form id="formGasto">
        <input type="hidden" id="gastoId">
        <div class="prov-form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div class="prov-form-group">
            <label for="gastoConcepto" style="display:block; margin-bottom:5px; font-weight:600; font-size:13px; color:var(--text);">Concepto *</label>
            <input type="text" id="gastoConcepto" required placeholder="Ej: Café y galletitas" style="width:100%; padding:10px; border:1px solid var(--border-1); border-radius:8px; box-sizing:border-box;">
          </div>
          <div class="prov-form-group">
            <label for="gastoCategoria" style="display:block; margin-bottom:5px; font-weight:600; font-size:13px; color:var(--text);">Categoría *</label>
            <select id="gastoCategoria" required class="gasto-filter-select" style="width:100%; box-sizing:border-box;">
              <option value="Limpieza">Limpieza</option>
              <option value="Galletitas">Galletitas</option>
              <option value="Agua">Agua</option>
              <option value="Café">Café</option>
              <option value="Papelería">Papelería</option>
              <option value="Combustible">Combustible</option>
              <option value="Reparaciones">Reparaciones</option>
              <option value="Otros">Otros</option>
            </select>
          </div>
          <div class="prov-form-group">
            <label for="gastoMonto" style="display:block; margin-bottom:5px; font-weight:600; font-size:13px; color:var(--text);">Monto ($) *</label>
            <input type="number" id="gastoMonto" required min="0.01" step="0.01" placeholder="0.00" style="width:100%; padding:10px; border:1px solid var(--border-1); border-radius:8px; box-sizing:border-box;">
          </div>
          <div class="prov-form-group">
            <label for="gastoFecha" style="display:block; margin-bottom:5px; font-weight:600; font-size:13px; color:var(--text);">Fecha *</label>
            <input type="date" id="gastoFecha" required style="width:100%; padding:10px; border:1px solid var(--border-1); border-radius:8px; box-sizing:border-box;">
          </div>
          <div class="prov-form-group">
            <label for="gastoEstado" style="display:block; margin-bottom:5px; font-weight:600; font-size:13px; color:var(--text);">Estado *</label>
            <select id="gastoEstado" required class="gasto-filter-select" style="width:100%; box-sizing:border-box;">
              <option value="Pagado">Pagado</option>
              <option value="Pendiente">Pendiente</option>
            </select>
          </div>
          <div class="prov-form-group">
            <label for="gastoObservacion" style="display:block; margin-bottom:5px; font-weight:600; font-size:13px; color:var(--text);">Observación (Opcional)</label>
            <input type="text" id="gastoObservacion" placeholder="Detalles adicionales del gasto" style="width:100%; padding:10px; border:1px solid var(--border-1); border-radius:8px; box-sizing:border-box;">
          </div>
        </div>
        <div class="modal-prov-footer" style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px; border-top:1px solid var(--border-1); padding-top:15px;">
          <button type="button" id="btnCancelarGasto" class="btn-prov-secondary" style="padding: 8px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; border: 1px solid #cbd5e1; background: white;"><i class="fas fa-times"></i> Cancelar</button>
          <button type="submit" class="btn-prov-primary" style="padding: 8px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; background: #3b82f6; color: white;"><i class="fas fa-save"></i> Guardar Gasto</button>
        </div>
      </form>
    </div>
  </div>
</div>
`,
    'empleados-liquidacion': `
<div class="emp-liq-page">
  <!-- Header -->
  <div class="emp-liq-header">
    <div class="emp-liq-header-left">
      <h1><i class="fas fa-file-invoice-dollar"></i> Liquidación de Empleados</h1>
      <p>Gestión de valor por hora, cálculo de liquidaciones mensuales y rentabilidad del personal</p>
    </div>
    <div class="emp-liq-header-right">
      <div class="emp-liq-month-selector">
        <button id="empLiqBtnMonthPrev"><i class="fas fa-chevron-left"></i></button>
        <span id="empLiqLabelMonth">Julio 2026</span>
        <button id="empLiqBtnMonthNext"><i class="fas fa-chevron-right"></i></button>
      </div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="emp-liq-tabs">
    <button class="emp-liq-tab-btn active" data-tab="lista"><i class="fas fa-users-cog"></i> Personal y Rentabilidad</button>
    <button class="emp-liq-tab-btn" data-tab="estadisticas"><i class="fas fa-chart-bar"></i> Estadísticas</button>
  </div>

  <!-- ── TAB: LISTA ── -->
  <div class="emp-liq-tab-section active" id="emp-liq-tab-lista">
    <div class="emp-liq-toolbar">
      <div class="emp-liq-search">
        <i class="fas fa-search"></i>
        <input type="text" id="empLiqSearchInput" placeholder="Buscar empleado...">
      </div>
      <select id="empLiqFilterEstado" class="emp-liq-filter-select">
        <option value="">Todos los estados</option>
        <option value="Activo">Activos</option>
        <option value="Inactivo">Inactivos</option>
      </select>
    </div>
    <div class="emp-liq-table-wrapper">
      <table class="emp-liq-table">
        <thead>
          <tr>
            <th>Empleado</th>
            <th>Valor por Hora</th>
            <th>Horas Trabajadas</th>
            <th>Total Generado</th>
            <th>Costo Salarial</th>
            <th>Rentabilidad</th>
            <th>Margen (%)</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="empLiqTableBody">
          <tr><td colspan="8" class="emp-liq-empty"><i class="fas fa-spinner fa-spin"></i><p>Cargando...</p></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ── TAB: ESTADISTICAS ── -->
  <div class="emp-liq-tab-section" id="emp-liq-tab-estadisticas">
    <!-- KPI cards -->
    <div class="emp-liq-kpis">
      <div class="emp-liq-kpi-card">
        <div class="emp-liq-kpi-icon blue"><i class="fas fa-award"></i></div>
        <div class="emp-liq-kpi-info">
          <h3>Más Rentable</h3>
          <p id="kpiEmpLiqMasRentable">Sin datos</p>
        </div>
      </div>
      <div class="emp-liq-kpi-card">
        <div class="emp-liq-kpi-icon purple"><i class="fas fa-business-time"></i></div>
        <div class="emp-liq-kpi-info">
          <h3>Más Horas Trabajadas</h3>
          <p id="kpiEmpLiqMasHoras">Sin datos</p>
        </div>
      </div>
      <div class="emp-liq-kpi-card">
        <div class="emp-liq-kpi-icon green"><i class="fas fa-wallet"></i></div>
        <div class="emp-liq-kpi-info">
          <h3>Total Pagado Sueldos</h3>
          <p id="kpiEmpLiqTotalSueldos">$0,00</p>
        </div>
      </div>
      <div class="emp-liq-kpi-card">
        <div class="emp-liq-kpi-icon yellow"><i class="fas fa-chart-line"></i></div>
        <div class="emp-liq-kpi-info">
          <h3>Total Generado</h3>
          <p id="kpiEmpLiqTotalGenerado">$0,00</p>
        </div>
      </div>
    </div>

    <!-- Charts -->
    <div class="emp-liq-charts-grid">
      <div class="emp-liq-chart-card">
        <h3><i class="fas fa-chart-bar"></i> Rendimiento por Empleado (Generado vs Costo)</h3>
        <div style="position:relative; height:320px; width:100%;">
          <canvas id="empLiqChartRendimiento"></canvas>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Modal: Configuración de Empleado -->
<div id="modalEmpLiqConfig" class="emp-liq-modal">
  <div class="emp-liq-modal-content">
    <div class="emp-liq-modal-header">
      <h2><i class="fas fa-user-cog"></i> Configuración de Empleado</h2>
      <button class="btn-close" id="btnEmpLiqConfigClose">&times;</button>
    </div>
    <div class="emp-liq-modal-body">
      <form id="formEmpLiqConfig">
        <input type="hidden" id="empLiqConfigId">
        <div class="emp-liq-form-group full">
          <label>Empleado</label>
          <input type="text" id="empLiqConfigNombre" readonly style="background:#f1f5f9; cursor:not-allowed;">
        </div>
        <div class="emp-liq-form-grid">
          <div class="emp-liq-form-group">
            <label>Valor por Hora ($) *</label>
            <input type="number" id="empLiqConfigValorHora" min="0" step="0.01" required placeholder="0.00">
          </div>
          <div class="emp-liq-form-group">
            <label>Costo Salarial Mensual ($) (Opcional)</label>
            <input type="number" id="empLiqConfigCostoMensual" min="0" step="0.01" placeholder="Usar total liquidación">
          </div>
        </div>
        <div class="emp-liq-form-group">
          <label>Estado</label>
          <select id="empLiqConfigEstado">
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>
      </form>
    </div>
    <div class="emp-liq-modal-footer">
      <button type="button" class="btn-emp-liq-secondary" id="btnEmpLiqConfigCancel">Cancelar</button>
      <button type="submit" form="formEmpLiqConfig" class="btn-emp-liq-primary">Guardar Cambios</button>
    </div>
  </div>
</div>

<!-- Modal: Registrar/Editar Liquidación -->
<div id="modalEmpLiqLiquidar" class="emp-liq-modal">
  <div class="emp-liq-modal-content">
    <div class="emp-liq-modal-header">
      <h2><i class="fas fa-file-invoice-dollar"></i> Liquidar Haberes - <span id="labelEmpLiqModalMes">Julio 2026</span></h2>
      <button class="btn-close" id="btnEmpLiqLiquidarClose">&times;</button>
    </div>
    <div class="emp-liq-modal-body">
      <form id="formEmpLiqLiquidar">
        <input type="hidden" id="empLiqLiquidarId">
        <div class="emp-liq-form-group full">
          <label>Empleado</label>
          <input type="text" id="empLiqLiquidarNombre" readonly style="background:#f1f5f9; cursor:not-allowed;">
        </div>
        <div class="emp-liq-form-grid">
          <div class="emp-liq-form-group">
            <label>Horas Trabajadas *</label>
            <input type="number" id="empLiqLiquidarHoras" min="0" step="0.1" required>
          </div>
          <div class="emp-liq-form-group">
            <label>Valor por Hora ($) *</label>
            <input type="number" id="empLiqLiquidarValorHora" min="0" step="0.01" required>
          </div>
        </div>
        <div class="emp-liq-form-group">
          <label>Total Generado ($) (Cálculo automático)</label>
          <input type="number" id="empLiqLiquidarGenerado" readonly style="background:#f1f5f9; font-weight:bold;">
        </div>
        <div class="emp-liq-form-grid">
          <div class="emp-liq-form-group">
            <label>Adicionales / Bonificaciones ($)</label>
            <input type="number" id="empLiqLiquidarAdicionales" min="0" step="0.01" value="0">
          </div>
          <div class="emp-liq-form-group">
            <label>Descuentos / Retenciones ($)</label>
            <input type="number" id="empLiqLiquidarDescuentos" min="0" step="0.01" value="0">
          </div>
        </div>
        <div class="emp-liq-form-group">
          <label>Total Liquidación ($) (Cálculo automático)</label>
          <input type="number" id="empLiqLiquidarTotalLiq" readonly style="background:#f0fdf4; color:#16a34a; font-weight:800; font-size:16px;">
        </div>
      </form>
    </div>
    <div class="emp-liq-modal-footer">
      <button type="button" class="btn-emp-liq-secondary" id="btnEmpLiqLiquidarCancel">Cancelar</button>
      <button type="submit" form="formEmpLiqLiquidar" class="btn-emp-liq-primary">Guardar Liquidación</button>
    </div>
  </div>
</div>
`,
    dashboard: `
<div class="finanzas-page">

  <!-- Encabezado -->
  <div class="finanzas-header">
    <div class="finanzas-header-left">
      <h1>Finanzas</h1>
      <p>Resumen de ventas y rendimiento del negocio</p>
    </div>
  </div>

  <!-- Filtros: períodos + fecha personalizada -->
  <div class="finanzas-container">
    <div class="finanzas-filters-row">
      <div class="buttons">
        <button data-period="day">Hoy</button>
        <button data-period="week">Semana</button>
        <button data-period="month">Mes</button>
        <button data-period="year">Año</button>
      </div>
      <div class="finanzas-date-filter">
        <label><i class="fas fa-calendar-alt"></i>&nbsp; Fecha exacta:</label>
        <input type="date" id="finanzasFecha">
        <button id="btnBuscarFinanzas">Buscar</button>
      </div>
    </div>

    <!-- KPI cards -->
    <div class="finanzas-kpi-grid">

      <!-- KPI principal: total período seleccionado -->
      <div class="fkpi-card main-kpi">
        <div class="fkpi-top">
          <span class="fkpi-label">Total del período</span>
          <div class="fkpi-icon"><i class="fas fa-dollar-sign"></i></div>
        </div>
        <div class="fkpi-value" id="totalVentas">$0</div>
        <div class="fkpi-sub" id="periodLabel">Total de ventas del día</div>
      </div>

      <!-- KPI: ventas del día -->
      <div class="fkpi-card green">
        <div class="fkpi-top">
          <span class="fkpi-label">Ventas hoy</span>
          <div class="fkpi-icon"><i class="fas fa-sun"></i></div>
        </div>
        <div class="fkpi-value" id="kpiVentasHoy">$0</div>
        <div class="fkpi-sub">Ingresos del día actual</div>
      </div>

      <!-- KPI: ventas del mes -->
      <div class="fkpi-card violet">
        <div class="fkpi-top">
          <span class="fkpi-label">Ventas del mes</span>
          <div class="fkpi-icon"><i class="fas fa-calendar-check"></i></div>
        </div>
        <div class="fkpi-value" id="kpiVentasMes">$0</div>
        <div class="fkpi-sub">Ingresos del mes en curso</div>
      </div>

      <!-- KPI: cantidad de ventas (tickets) -->
      <div class="fkpi-card amber">
        <div class="fkpi-top">
          <span class="fkpi-label">Ventas realizadas</span>
          <div class="fkpi-icon"><i class="fas fa-receipt"></i></div>
        </div>
        <div class="fkpi-value" id="kpiCantVentas">0</div>
        <div class="fkpi-sub">Transacciones del mes</div>
      </div>

      <!-- KPI: Gastos del mes -->
      <div class="fkpi-card rose">
        <div class="fkpi-top">
          <span class="fkpi-label">Gastos del mes</span>
          <div class="fkpi-icon"><i class="fas fa-wallet"></i></div>
        </div>
        <div class="fkpi-value" id="kpiGastosMes">$0</div>
        <div class="fkpi-sub">Gastos pagados del mes</div>
      </div>

    </div>

    <!-- Tarjeta del gráfico -->
    <div class="finanzas-chart-card">
      <div class="finanzas-chart-header">
        <div class="finanzas-chart-header-left">
          <div class="finanzas-chart-title">Ventas por día</div>
          <div class="finanzas-chart-subtitle" id="chartSubtitle">Evolución de ingresos durante el mes actual</div>
        </div>
        <div class="finanzas-chart-header-right">
          <div class="month-selector-container">
            <button id="btnPrevMonth" class="month-selector-btn" title="Mes anterior">
              <i class="fas fa-chevron-left"></i>
            </button>
            <span id="currentMonthLabel" class="month-selector-label">-</span>
            <button id="btnNextMonth" class="month-selector-btn" title="Mes siguiente">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
          <span class="finanzas-chart-badge" id="chartBadge"><i class="fas fa-circle" style="font-size:7px;vertical-align:2px;"></i> Mes actual</span>
        </div>
      </div>
      <div class="chart-container">
        <canvas id="chartVentas" height="260"></canvas>
        <div id="chartEmptyMessage" class="chart-empty-message" style="display: none;">
          <div class="chart-empty-icon"><i class="fas fa-chart-bar"></i></div>
          <div class="chart-empty-text">No hay ventas registradas para este período.</div>
        </div>
      </div>
    </div>

        <p id="finanzasMsg"></p>
  </div>

    <!-- MODAL: VENTAS DEL MES DESGLOSE -->
  <div id="modalVentasMes" class="modal">
    <div class="modal-content" style="max-width: 550px; border-radius: 20px; padding: 24px; max-height: 90vh; display: flex; flex-direction: column; margin: 5vh auto;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 14px;">
        <h3 style="margin: 0; font-size: 19px; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-calendar-alt" style="color: #3b82f6;"></i> Desglose: Ventas del Mes
        </h3>
        <button class="btn-close" id="btnCloseVentasMes" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #64748b;"><i class="fas fa-times"></i></button>
      </div>
      
      <!-- Navegación de Período -->
      <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg); border: 1px solid var(--border-1); padding: 10px 16px; border-radius: 12px; margin-bottom: 20px;">
        <button id="btnPrevMonthMuni" style="background: var(--surface); border: 1px solid var(--border-1); padding: 6px 12px; border-radius: 8px; font-size: 12.5px; font-weight: 600; cursor: pointer; color: var(--text); display: flex; align-items: center; gap: 6px;">
          <i class="fas fa-chevron-left"></i> Mes anterior
        </button>
        <span id="labelMesMuni" style="font-weight: 700; color: var(--text); font-size: 14.5px;">—</span>
        <button id="btnNextMonthMuni" style="background: var(--surface); border: 1px solid var(--border-1); padding: 6px 12px; border-radius: 8px; font-size: 12.5px; font-weight: 600; cursor: pointer; color: var(--text); display: flex; align-items: center; gap: 6px;">
          Mes siguiente <i class="fas fa-chevron-right"></i>
        </button>
      </div>

      <!-- Contenedor con Scroll Interno -->
      <div style="flex: 1; overflow-y: auto; padding-right: 4px;">
        <!-- Valores Financieros principales -->
        <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px;">
          <!-- Ventas Normales (Azul) -->
          <div class="muni-breakdown-row blue">
            <div>
              <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #2563eb;">Ventas Normales</div>
              <div style="font-size: 12.5px; color: #64748b; margin-top: 2px;">Ventas en mostrador / directas</div>
            </div>
            <div id="muniValVentasNormales" class="amount" style="font-size: 22px; font-weight: 800;">$0,00</div>
          </div>

          <!-- Municipio Pendiente (Amarillo) -->
          <div class="muni-breakdown-row yellow">
            <div>
              <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #d97706;">Municipio Pendiente</div>
              <div style="font-size: 12.5px; color: #64748b; margin-top: 2px;">Cuentas Municipio impagas</div>
            </div>
            <div id="muniValPendienteCobro" class="amount" style="font-size: 22px; font-weight: 800;">$0,00</div>
          </div>

          <!-- Atmosférico Pendiente (Naranja) -->
          <div class="muni-breakdown-row orange">
            <div>
              <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #ea580c;">Atmosférico Pendiente</div>
              <div style="font-size: 12.5px; color: #64748b; margin-top: 2px;">Servicios atmosféricos impagos</div>
            </div>
            <div id="muniValPendienteAtmos" class="amount" style="font-size: 22px; font-weight: 800;">$0,00</div>
          </div>

          <!-- Dinero Ingresado (Verde) -->
          <div class="muni-breakdown-row green">
            <div>
              <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #059669;">Dinero Ingresado</div>
              <div style="font-size: 12.5px; color: #64748b; margin-top: 2px;">Cobrado efectivamente</div>
            </div>
            <div id="muniValDineroIngresado" class="amount" style="font-size: 22px; font-weight: 800;">$0,00</div>
          </div>

          <!-- Total General (Púrpura) -->
          <div class="muni-breakdown-row purple">
            <div>
              <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #a855f7;">Total General</div>
              <div style="font-size: 12.5px; color: #64748b; margin-top: 2px;">Ventas + Municipio + Atmosférico</div>
            </div>
            <div id="muniValVentasTotales" class="amount" style="font-size: 22px; font-weight: 800;">$0,00</div>
          </div>
        </div>

        <!-- Estadísticas / Cantidad de Operaciones -->
        <div style="background: var(--bg); border: 1px solid var(--border-1); border-radius: 14px; padding: 16px;">
          <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border-1); padding-bottom: 6px;">
            Resumen de Operaciones
          </h4>
          <div style="display: grid; grid-template-columns: 1fr; gap: 8px; font-size: 13.5px;">
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span style="color: var(--muted);">Ventas registradas:</span>
              <strong id="muniCountVentasNormales" style="color: var(--text);">0</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span style="color: var(--muted);">Órdenes Municipio:</span>
              <strong id="muniCountOrdenesMuni" style="color: var(--text);">0</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span style="color: var(--muted);">Órdenes Pendientes:</span>
              <strong id="muniCountOrdenesPendientes" style="color: #d97706;">0</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span style="color: var(--muted);">Órdenes Cobradas:</span>
              <strong id="muniCountOrdenesCobradas" style="color: #059669;">0</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
    </div>
  </div>

  <!-- MODAL: VENTAS HOY DESGLOSE -->
  <div id="modalVentasHoy" class="modal">
    <div class="modal-content" style="max-width: 550px; border-radius: 20px; padding: 24px; max-height: 90vh; display: flex; flex-direction: column; margin: 5vh auto;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 14px;">
        <h3 style="margin: 0; font-size: 19px; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-sun" style="color: #10b981;"></i> Desglose: Ventas de Hoy
        </h3>
        <button class="btn-close" id="btnCloseVentasHoy" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #64748b;"><i class="fas fa-times"></i></button>
      </div>
      
      <!-- Navegación de Período -->
      <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg); border: 1px solid var(--border-1); padding: 10px 16px; border-radius: 12px; margin-bottom: 20px;">
        <button id="btnPrevDayMuni" style="background: var(--surface); border: 1px solid var(--border-1); padding: 6px 12px; border-radius: 8px; font-size: 12.5px; font-weight: 600; cursor: pointer; color: var(--text); display: flex; align-items: center; gap: 6px;">
          <i class="fas fa-chevron-left"></i> Día anterior
        </button>
        <span id="labelDayMuni" style="font-weight: 700; color: var(--text); font-size: 14.5px;">—</span>
        <button id="btnNextDayMuni" style="background: var(--surface); border: 1px solid var(--border-1); padding: 6px 12px; border-radius: 8px; font-size: 12.5px; font-weight: 600; cursor: pointer; color: var(--text); display: flex; align-items: center; gap: 6px;">
          Día siguiente <i class="fas fa-chevron-right"></i>
        </button>
      </div>

      <!-- Contenedor con Scroll Interno -->
      <div style="flex: 1; overflow-y: auto; padding-right: 4px;">
        <!-- Valores Financieros principales -->
        <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px;">
          <!-- Ventas Normales (Azul) -->
          <div class="muni-breakdown-row blue">
            <div>
              <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #2563eb;">Ventas Normales</div>
              <div style="font-size: 12.5px; color: #64748b; margin-top: 2px;">Ventas en mostrador / directas</div>
            </div>
            <div id="muniValVentasNormalesHoy" class="amount" style="font-size: 22px; font-weight: 800;">$0,00</div>
          </div>

          <!-- Municipio Pendiente (Amarillo) -->
          <div class="muni-breakdown-row yellow">
            <div>
              <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #d97706;">Municipio Pendiente</div>
              <div style="font-size: 12.5px; color: #64748b; margin-top: 2px;">Cuentas Municipio impagas</div>
            </div>
            <div id="muniValPendienteCobroHoy" class="amount" style="font-size: 22px; font-weight: 800;">$0,00</div>
          </div>

          <!-- Atmosférico Pendiente (Naranja) -->
          <div class="muni-breakdown-row orange">
            <div>
              <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #ea580c;">Atmosférico Pendiente</div>
              <div style="font-size: 12.5px; color: #64748b; margin-top: 2px;">Servicios atmosféricos impagos</div>
            </div>
            <div id="muniValPendienteAtmosHoy" class="amount" style="font-size: 22px; font-weight: 800;">$0,00</div>
          </div>

          <!-- Dinero Ingresado (Verde) -->
          <div class="muni-breakdown-row green">
            <div>
              <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #059669;">Dinero Ingresado</div>
              <div style="font-size: 12.5px; color: #64748b; margin-top: 2px;">Cobrado efectivamente</div>
            </div>
            <div id="muniValDineroIngresadoHoy" class="amount" style="font-size: 22px; font-weight: 800;">$0,00</div>
          </div>

          <!-- Total General (Púrpura) -->
          <div class="muni-breakdown-row purple">
            <div>
              <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #a855f7;">Total General</div>
              <div style="font-size: 12.5px; color: #64748b; margin-top: 2px;">Ventas + Municipio + Atmosférico</div>
            </div>
            <div id="muniValVentasTotalesHoy" class="amount" style="font-size: 22px; font-weight: 800;">$0,00</div>
          </div>
        </div>

        <!-- Estadísticas / Cantidad de Operaciones -->
        <div style="background: var(--bg); border: 1px solid var(--border-1); border-radius: 14px; padding: 16px;">
          <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border-1); padding-bottom: 6px;">
            Resumen de Operaciones
          </h4>
          <div style="display: grid; grid-template-columns: 1fr; gap: 8px; font-size: 13.5px;">
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span style="color: var(--muted);">Ventas registradas:</span>
              <strong id="muniCountVentasNormalesHoy" style="color: var(--text);">0</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span style="color: var(--muted);">Órdenes Municipio:</span>
              <strong id="muniCountOrdenesMuniHoy" style="color: var(--text);">0</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span style="color: var(--muted);">Órdenes Pendientes:</span>
              <strong id="muniCountOrdenesPendientesHoy" style="color: #d97706;">0</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span style="color: var(--muted);">Órdenes Cobradas:</span>
              <strong id="muniCountOrdenesCobradasHoy" style="color: #059669;">0</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
    </div>
  </div>

</div>

`,


    inventario: `
<div class="inventario-container">
 
  
<!-- Panel de Filtros MEJORADO -->
<div id="filtersPanel" class="modal">
  <div class="modal-content filters-panel-modern">
    <div class="filters-header">
      <h3>
        <i class="fas fa-filter"></i>
        Filtros
      </h3>
      <button class="filters-close" id="btnCloseFilters">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="filters-body">
      <!-- Filtro por categorías -->
      <div class="filter-section">
        <div class="filter-section-title">
          <i class="fas fa-folder"></i>
          <span>Categorías</span>
        </div>
        <div class="filter-search-container">
          <i class="fas fa-search"></i>
          <input type="text" id="filterCategorySearch" placeholder="Buscar categoría..." autocomplete="off">
        </div>
        <div class="collapsible-wrapper" id="categoriesWrapper">
          <div class="categories-grid" id="filterCategories">
            <!-- Las categorías se cargarán aquí -->
          </div>
        </div>
        <button type="button" class="btn-toggle-expand" id="btnToggleCategories" style="display: none;">
          <span>▼ Mostrar todas las categorías</span>
        </button>
      </div>

      <!-- Filtro por proveedores -->
      <div class="filter-section">
        <div class="filter-section-title">
          <i class="fas fa-truck"></i>
          <span>Proveedores</span>
        </div>
        <div class="collapsible-wrapper" id="suppliersWrapper">
          <div class="categories-grid" id="filterSuppliers">
            <!-- Los proveedores se cargarán aquí -->
          </div>
        </div>
        <button type="button" class="btn-toggle-expand" id="btnToggleSuppliers" style="display: none;">
          <span>▼ Mostrar todos los proveedores</span>
        </button>
      </div>

      <!-- Filtro por stock -->
      <div class="filter-section">
        <div class="filter-section-title">
          <i class="fas fa-boxes"></i>
          <span>Stock</span>
        </div>
        <div class="stock-filters">
          <button class="stock-filter-btn" data-type="low">
            <i class="fas fa-exclamation-triangle"></i>
            <span>Stock bajo</span>
            <span class="stock-count" id="lowStockCount">0</span>
          </button>
          <button class="stock-filter-btn" data-type="high">
            <i class="fas fa-check-circle"></i>
            <span>Stock normal</span>
            <span class="stock-count" id="highStockCount">0</span>
          </button>
        </div>
      </div>

      <!-- Filtros activos -->
      <div class="active-filters" id="activeFilters" style="display: none;">
        <div class="active-filters-title">
          <i class="fas fa-check-circle"></i>
          <span>Filtros activos</span>
        </div>
        <div class="active-filters-tags" id="activeFiltersTags">
          <!-- Los filtros activos se mostrarán aquí -->
        </div>
      </div>
    </div>

    <div class="filters-footer">
      <button type="button" class="btn-clear-filters" id="clearFilters">
        <i class="fas fa-times"></i>
        Limpiar filtros
      </button>
      <button class="btn-apply-filters" id="applyFilters">
        <i class="fas fa-check"></i>
        Aplicar filtros
      </button>
    </div>
  </div>
</div>

  <table class="inventory-table">
    <thead>
      <tr>
        <th>Código</th>
        <th>Producto</th> 
        <th>Categoría</th>
        <th>Stock</th>
        <th>Unidad</th>
        <th>Precio C</th>
        <th>Precio V</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody id="inventoryBody"></tbody>
  </table>

<!-- Panel de Métricas Rápidas -->
<div class="metrics-panel">
  <div class="metric-card">
    <div class="metric-icon">
      <i class="fas fa-boxes"></i>
    </div>
    <div class="metric-content">
      <div class="metric-value" id="totalProducts">0</div>
      <div class="metric-label">Total de productos</div>
    </div>
  </div>
  
  <div class="metric-card warning">
    <div class="metric-icon">
      <i class="fas fa-exclamation-triangle"></i>
    </div>
    <div class="metric-content">
      <div class="metric-value" id="lowStockProducts">0</div>
      <div class="metric-label">Stock bajo / por vencer</div>
    </div>
  </div>
  
  <div class="metric-card success">
    <div class="metric-icon">
      <i class="fas fa-dollar-sign"></i>
    </div>
    <div class="metric-content">
      <div class="metric-value" id="totalInventoryValue">$0</div>
      <div class="metric-label">Valor total del inventario</div>
    </div>
  </div>
</div>

<!-- Botón Eliminar Todos los Productos -->
<div class="delete-all-section">
  <button class="btn-danger" id="btnDeleteAll"><i class="fas fa-trash-alt"></i> Eliminar Todos los Productos</button>
</div>

<!-- Modal Actualizar Precios MEJORADO -->
<div id="modalUpdatePrices" class="modal">
  <div class="modal-content price-update-modal">
    <div class="modal-header-modern">
      <h2>
        <i class="fas fa-tags"></i>
        Actualizar Precios
      </h2>
      <button class="modal-close" id="cancelUpdatePrices">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="price-modal-body">
      <div class="price-modal-grid">
        <!-- Ajuste Porcentual -->
        <div class="price-section main-section">
          <label class="section-label">
            <i class="fas fa-percentage"></i>
            Porcentaje de ajuste
          </label>
          <div class="percentage-input-wrapper">
            <input type="number" id="percentInput" placeholder="0" step="1" min="-100" max="100">
            <span class="pct-symbol">%</span>
          </div>
          <div class="quick-actions-grid">
            <button class="quick-action-btn plus" id="btnPlus1">+1%</button>
            <button class="quick-action-btn minus" id="btnMinus1">-1%</button>
            <button class="quick-action-btn plus" id="btnPlus10">+10%</button>
          </div>
        </div>

        <!-- Tipo de Precio y Categoría -->
        <div class="price-settings-column">
          <div class="price-section">
            <label class="section-label">
              <i class="fas fa-coins"></i>
              Tipo de precio
            </label>
            <div class="price-type-toggle">
              <label class="toggle-option">
                <input type="radio" name="priceType" value="venta" checked>
                <span class="toggle-label">Venta</span>
              </label>
              <label class="toggle-option">
                <input type="radio" name="priceType" value="costo">
                <span class="toggle-label">Costo</span>
              </label>
            </div>
          </div>

          <div class="price-section">
            <label class="section-label">
              <i class="fas fa-filter"></i>
              Categoría
            </label>
            <div class="custom-select-wrapper">
              <select id="categorySelect">
                <option value="">Todas las categorías</option>
              </select>
              <i class="fas fa-chevron-down"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Vista Previa -->
      <div class="preview-card-modern">
        <div class="preview-header">
          <i class="fas fa-eye"></i>
          Vista previa (primer producto)
        </div>
        <div class="preview-stats">
          <div class="stat-box">
            <span class="stat-label">Precio Actual</span>
            <span id="currentPrice" class="stat-value old">$0.00</span>
          </div>
          <div class="stat-arrow">
            <i class="fas fa-long-arrow-alt-right"></i>
          </div>
          <div class="stat-box">
            <span class="stat-label">Nuevo Precio</span>
            <span id="newPrice" class="stat-value new">$0.00</span>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer-modern">
      <button class="btn-modern-secondary" id="cancelUpdatePricesBtn">
        <i class="fas fa-times"></i>
        Cancelar
      </button>
      <button class="btn-modern-primary" id="btnApplyUpdate">
        <i class="fas fa-check"></i>
        Aplicar Cambios
      </button>
    </div>
  </div>
</div>

<!-- Modal de Categorías - Rediseño Completo -->
<div id="modalCategorias" class="modal">
  <div class="modal-content category-modal">

    <!-- Encabezado -->
    <div class="category-modal-header">
      <h2>
        <i class="fas fa-layer-group"></i>
        Gestionar Categorías
      </h2>
      <button class="modal-close" id="btnCloseCategories">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- Cuerpo -->
    <div class="category-modal-body">

      <!-- Formulario nueva categoría -->
      <div class="catmodal-add-section">
        <div class="catmodal-section-label">
          <i class="fas fa-plus-circle"></i>
          <span>Nueva categoría</span>
        </div>
        <div class="catmodal-add-form">
          <input
            type="text"
            id="newCategoryName"
            class="catmodal-input"
            placeholder="Ej: Herramientas Eléctricas"
            autocomplete="off"
          >
          <button id="btnSaveCategory" class="catmodal-btn-add">
            <i class="fas fa-check"></i>
            <span>Agregar</span>
          </button>
        </div>
      </div>

      <!-- Lista de categorías -->
      <div class="catmodal-list-section">
        <div class="catmodal-section-label">
          <i class="fas fa-list"></i>
          <span>Categorías existentes</span>
          <span class="category-count" id="categoryCount">0</span>
        </div>
        <div class="catmodal-list-container">
          <ul id="categoryList" class="categories-list"></ul>
        </div>
      </div>

    </div>

    <!-- Footer -->
    <div class="category-modal-footer">
      <button class="btn-modern-secondary" id="btnCloseCategories">
        <i class="fas fa-times"></i>
        Cerrar
      </button>
    </div>

  </div>
</div>



<!-- Modal Agregar/Editar Producto MEJORADO -->
<div id="modalAddProduct" class="modal">
  <div class="modal-content product-modal">
    <div class="product-modal-header">
      <h2 id="modalProductTitle">
        <i class="fas fa-edit"></i>
        <span>Editar Producto</span>
      </h2>
      <button class="modal-close" id="cancelNewProduct">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="product-modal-body">
      <form id="productForm" class="modern-product-form" onsubmit="return false;">
        <div class="form-row-compact">
          <!-- Código -->
          <div class="form-group">
            <label for="addCodigo">
              <i class="fas fa-barcode"></i>
              <span>Código</span>
            </label>
            <input type="text" id="addCodigo" class="modern-input" placeholder="Ej: BR21200" autocomplete="off">
          </div>
          
          <!-- Nombre -->
          <div class="form-group">
            <label for="addNombre">
              <i class="fas fa-tag"></i>
              <span>Nombre del producto</span>
            </label>
            <input type="text" id="addNombre" class="modern-input" placeholder="Ej: ALICATE CORTE OBLICUO" autocomplete="off">
          </div>
        </div>

        <div class="form-grid-2">
          <!-- Categoría con botón + Nueva -->
          <div class="form-group">
            <label for="addCategoria">
              <i class="fas fa-folder"></i>
              <span>Categoría</span>
            </label>
            <div class="category-select-wrapper modern">
              <select id="addCategoria" class="modern-select">
                <option value="">Seleccionar categoría</option>
              </select>
              <i class="fas fa-chevron-down"></i>
              <button type="button" id="btnNewCategory" class="btn-new-category modern-btn">
                <i class="fas fa-plus"></i>
                <span>Nueva</span>
              </button>
            </div>
          </div>

          <!-- Unidad (Segmented) -->
          <div class="form-group">
            <label>
              <i class="fas fa-ruler"></i>
              <span>Unidad</span>
            </label>
            <div class="price-type-toggle unit-toggle">
              <label class="toggle-option">
                <input type="radio" name="unidad_visual" value="un" checked onchange="document.getElementById('addUnidad').value = this.value; document.getElementById('addUnidad').dispatchEvent(new Event('change'))">
                <span class="toggle-label">Unidad (un)</span>
              </label>
              <label class="toggle-option">
                <input type="radio" name="unidad_visual" value="kg" onchange="document.getElementById('addUnidad').value = this.value; document.getElementById('addUnidad').dispatchEvent(new Event('change'))">
                <span class="toggle-label">Kilo (kg)</span>
              </label>
              <label class="toggle-option">
                <input type="radio" name="unidad_visual" value="m" onchange="document.getElementById('addUnidad').value = this.value; document.getElementById('addUnidad').dispatchEvent(new Event('change'))">
                <span class="toggle-label">Metro (m)</span>
              </label>
            </div>
            <!-- Select oculto para no romper lógica JS -->
            <select id="addUnidad" style="display: none;">
              <option value="un">Unidad (un)</option>
              <option value="kg">Kilogramo (kg)</option>
              <option value="m">Metro (m)</option>
            </select>
          </div>
        </div>

        <!-- 3 columns for numeric values -->
        <div class="form-grid-3">
          <div class="form-group numeric">
            <label for="addStock">
              <i class="fas fa-boxes"></i>
              <span>Stock inicial</span>
            </label>
            <input type="number" id="addStock" class="modern-input" step="0.01" min="0" placeholder="0.00">
          </div>

          <div class="form-group numeric">
            <label for="addPrecioCosto">
              <i class="fas fa-dollar-sign"></i>
              <span>Precio costo</span>
            </label>
            <input type="number" id="addPrecioCosto" class="modern-input" step="1" min="0" placeholder="$0.00">
          </div>

          <div class="form-group numeric highlight">
            <label for="addPrecio" id="labelPrecio">
              <i class="fas fa-tag"></i>
              <span>Precio venta</span>
            </label>
            <input type="number" id="addPrecio" class="modern-input" step="1" min="0" placeholder="$0.00">
          </div>
        </div>

        <!-- Proveedor -->
        <div class="form-group" style="margin-top: 15px;">
          <label for="addProveedor">
            <i class="fas fa-truck"></i>
            <span>Proveedor</span>
          </label>
          <div class="provider-select-wrapper modern">
            <select id="addProveedor" class="modern-select">
              <option value="">Sin proveedor</option>
            </select>
            <i class="fas fa-chevron-down"></i>
          </div>
        </div>
      </form>
    </div>

    <div class="product-modal-footer">
      <button type="button" class="btn-modern-secondary" id="cancelNewProduct">
        <i class="fas fa-times"></i>
        Cancelar
      </button>
      <button type="button" class="btn-modern-primary" id="saveNewProduct">
        <i class="fas fa-save"></i>
        Guardar cambios
      </button>
    </div>
  </div>
</div>

<!-- Modal para nueva categoría (mejorado) -->
<div id="modalCategorias" class="modal">
  <div class="modal-content category-modal">
    <div class="category-modal-header">
      <h3>
        <i class="fas fa-folder-plus"></i>
        Nueva Categoría
      </h3>
      <button class="modal-close" id="btnCloseCategories">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="category-modal-body">
      <div class="form-group">
        <label for="newCategoryName">Nombre de la categoría</label>
        <input type="text" id="newCategoryName" placeholder="Ej: Herramientas Eléctricas">
      </div>
      
      <div class="category-list">
        <h4>
          <i class="fas fa-list"></i>
          Categorías existentes
        </h4>
        <ul id="categoryList"></ul>
      </div>
    </div>

    <div class="category-modal-footer">
      <button class="btn-cancel" id="btnCloseCategories">
        <i class="fas fa-times"></i>
        Cancelar
      </button>
      <button class="btn-save" id="btnSaveCategory">
        <i class="fas fa-check"></i>
        Guardar
      </button>
    </div>
  </div>
</div>

<!-- Modal del carrito profesional -->
<div id="modalCart" class="modal">
  <div class="modal-content cart-modal">
    <div class="cart-header">
      <div class="cart-header-title">
        <h2><i class="fas fa-shopping-cart"></i> Carrito de Compras</h2>
        <p>Revisa los productos, aplica descuentos y selecciona el método de pago</p>
      </div>
      <button class="cart-close" id="btnCloseCart"><i class="fas fa-times"></i></button>
    </div>

    <div class="cart-body">
      <!-- LEFT COLUMN: Table & Actions -->
      <div class="pos-cart-left">
        <div class="pos-cart-table-wrapper">
          <table class="cart-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th>Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="cartBody"></tbody>
          </table>
        </div>
        
        <div class="pos-actions">
          <button id="btnClearCart" class="btn-modern-secondary">
            <i class="fas fa-trash-alt"></i> Vaciar carrito
          </button>
          <button id="btnImprimirTicket" class="btn-modern-primary">
            <i class="fas fa-print"></i> Imprimir ticket
          </button>
        </div>
      </div>

      <!-- RIGHT COLUMN: Summary & Payment -->
      <div class="pos-cart-right">
        
        <!-- RESUMEN / AJUSTE -->
        <div class="pos-summary-card">
          <h3><i class="fas fa-receipt"></i> Resumen de la Venta</h3>
          
          <div class="discount-section pos-discount">
            <label for="discountInput" class="pos-label"><i class="fas fa-tag"></i> Ajuste (Descuento/Recargo)</label>
            <div class="discount-input-wrapper">
              <div class="discount-control">
                <select id="adjustType">
                  <option value="discount">Descuento</option>
                  <option value="surcharge">Recargo</option>
                </select>
                <select id="adjustMode">
                  <option value="percent">%</option>
                  <option value="fixed">$</option>
                </select>
                <input type="number" id="discountInput" step="1" value="0" placeholder="0">
                <button id="applyDiscount" class="btn-discount">Aplicar</button>
              </div>
            </div>
            <div id="cartTotalDiscount" class="discount-amount"></div>
          </div>

          <div class="cart-total pos-total">
            <span>Total a Pagar</span>
            <span class="total-amount" id="cartTotal">$0.00</span>
          </div>
        </div>

        <!-- MÉTODOS DE PAGO -->
        <div class="payment-section pos-payment">
          <h3><i class="fas fa-credit-card"></i> Seleccionar Pago</h3>
          <div class="payment-methods pos-methods-grid">
            <button class="payment-btn pos-pay-btn" data-metodo="Efectivo">
              <i class="fas fa-money-bill-wave"></i>
              <span>Efectivo</span>
            </button>
            <button class="payment-btn pos-pay-btn" data-metodo="Mercado Pago">
              <i class="fas fa-wallet"></i>
              <span>Mercado Pago</span>
            </button>
            <button class="payment-btn pos-pay-btn" data-metodo="Transferencia">
              <i class="fas fa-university"></i>
              <span>Transferencia</span>
            </button>
          </div>
        </div>
            </div>
    </div>
  </div>
</div>

<!-- Modal de opciones de impresión -->
<div id="modalPrintOptions" class="modal" style="display: none; justify-content: center; align-items: center; z-index: 1100;">
  <div class="modal-content print-options-modal">
    <div class="print-options-header">
      <h3>
        <i class="fas fa-print"></i>
        Opciones de Impresión
      </h3>
      <button class="modal-close" id="btnClosePrintOptions"><i class="fas fa-times"></i></button>
    </div>
    <div class="print-options-body">
      <button id="btnPrintTicketOption" class="print-option-btn">
        <span class="icon">🧾</span>
        <div class="print-option-text">
          <strong class="title">Imprimir Ticket</strong>
          <span class="desc">Comprobante de venta rápido</span>
        </div>
      </button>
      <button id="btnPrintPresupuestoOption" class="print-option-btn">
        <span class="icon">📄</span>
        <div class="print-option-text">
          <strong class="title">Imprimir Presupuesto</strong>
          <span class="desc">Documento no válido como factura</span>
        </div>
      </button>
            <button id="btnPrintRemitoOption" class="print-option-btn">
        <span class="icon">🚚</span>
        <div class="print-option-text">
          <strong class="title">Imprimir Remito</strong>
          <span class="desc">Documento no válido como factura</span>
        </div>
      </button>
    </div>
    <div class="print-options-footer">
      <button class="btn-modern-secondary" id="btnCancelPrintOptions">
        <i class="fas fa-times"></i>
        Cancelar
      </button>
    </div>
  </div>
</div>


<!-- Modal opciones de importación -->
<div id="modalImportOptions" class="modal">
  <div class="modal-content">
    <h2>Opciones de importación</h2>

    <label><input type="checkbox" id="optStock" checked> Actualizar Stock</label><br>
    <label><input type="checkbox" id="optPrecioVenta"> Actualizar Precio de Venta</label><br>
    <label><input type="checkbox" id="optPrecioCosto" checked> Actualizar Precio de Costo</label><br><br>

    <button id="confirmImportExcel">Importar</button>
    <button id="cancelImportExcel">Cancelar</button>
  </div>
</div>
</div>
`,



    informes: `
  <div class="informes-container">
    <div class="informes-header-modern">
      <div class="header-title">
        <h1><i class="fas fa-chart-line"></i> Informes</h1>
        <p>Análisis de ventas, métricas y movimientos</p>
      </div>
      <div class="informes-filters-modern">
        <div class="periodo-selector-modern">
          <button class="btn-periodo" data-periodo="day">Hoy</button>
          <button class="btn-periodo" data-periodo="week">Semana</button>
          <button class="btn-periodo" data-periodo="month">Mes</button>
          <button class="btn-periodo" data-periodo="year">Año</button>
        </div>
        <div class="report-actions-modern">
          <div class="date-input-wrapper">
            <i class="fas fa-calendar-alt"></i>
            <input type="date" id="informesFecha" class="date-input-modern" />
          </div>
          <button id="btnBuscarInformesFecha" class="btn-action-modern btn-search" title="Buscar"><i class="fas fa-search"></i></button>
          <button id="btnLimpiarInformesFecha" class="btn-action-modern btn-clear" title="Limpiar"><i class="fas fa-eraser"></i></button>
        </div>
      </div>
      <div class="periodo-badge-modern">
        <i class="fas fa-clock"></i> <span id="periodo-actual"></span>
      </div>
    </div>

    <!-- KPIs principales -->
    <div class="kpi-grid-modern">
      <div class="kpi-card-modern yellow-card">
        <div class="kpi-icon"><i class="fas fa-star"></i></div>
        <div class="kpi-content">
          <h3>Producto estrella</h3>
          <p id="producto-estrella">-</p>
        </div>
      </div>
      <div class="kpi-card-modern red-card">
        <div class="kpi-icon"><i class="fas fa-arrow-down"></i></div>
        <div class="kpi-content">
          <h3>Menos Vendidos</h3>
          <p id="producto-nadie">-</p>
        </div>
      </div>
      <div class="kpi-card-modern green-card">
        <div class="kpi-icon"><i class="fas fa-trophy"></i></div>
        <div class="kpi-content">
          <h3>Categoría top</h3>
          <p id="categoria-top">-</p>
        </div>
      </div>
    </div>

    <!-- Resumen registros -->
    <div class="resumen-grid-modern">
      <div class="resumen-item resumen-clickable card-green" data-summary-type="entraron">
        <div class="resumen-icon"><i class="fas fa-box-open"></i></div>
        <div class="resumen-content">
          <strong>Productos que entraron</strong>
          <p id="productos-entraron">0</p>
        </div>
      </div>
      <div class="resumen-item resumen-clickable card-red" data-summary-type="borrados">
        <div class="resumen-icon"><i class="fas fa-trash-alt"></i></div>
        <div class="resumen-content">
          <strong>Productos borrados</strong>
          <p id="productos-borrados">0</p>
        </div>
      </div>
      <div class="resumen-item resumen-clickable card-blue" data-summary-type="vendidos">
        <div class="resumen-icon"><i class="fas fa-hand-holding-usd"></i></div>
        <div class="resumen-content">
          <strong>Productos vendidos</strong>
          <p id="productos-vendidos">0</p>
        </div>
      </div>
      <div class="resumen-item resumen-clickable card-yellow" data-summary-type="stock">
        <div class="resumen-icon"><i class="fas fa-cubes"></i></div>
        <div class="resumen-content">
          <strong>Stock actual</strong>
          <p id="productos-stock">0</p>
        </div>
      </div>
    </div>

    <!-- Layout Dashboard -->
    <div class="dashboard-layout-modern">
      
      <!-- Gráficos -->
      <div class="dashboard-charts">
        <div class="chart-card-modern">
          <div class="card-header">
            <h3><i class="fas fa-chart-pie"></i> Ventas por categoría</h3>
          </div>
          <div class="chart-wrapper" style="position:relative; width:100%; height:250px;">
            <canvas id="chartCategorias" style="position:absolute; top:0; left:0; width:100%; height:100%;"></canvas>
          </div>
        </div>
        <div class="chart-card-modern">
          <div class="card-header">
            <h3><i class="fas fa-credit-card"></i> Métodos de pago</h3>
          </div>
          <div class="chart-wrapper" style="position:relative; width:100%; height:250px;">
            <canvas id="chartMetodos" style="position:absolute; top:0; left:0; width:100%; height:100%;"></canvas>
          </div>
        </div>
      </div>

      <!-- Tablas -->
      <div class="dashboard-tables">
        <div class="table-card-modern">
          <div class="card-header">
            <h3><i class="fas fa-arrow-up" style="color: #10b981;"></i> Más vendidos</h3>
          </div>
          <div class="table-responsive">
            <table class="tabla-informe modern-table" id="tabla-mas-vendidos">
              <thead><tr><th>Producto</th><th>Cantidad</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </div>

        <div class="table-card-modern">
          <div class="card-header">
            <h3><i class="fas fa-arrow-down" style="color: #ef4444;"></i> Menos vendidos</h3>
          </div>
          <div class="table-responsive">
            <table class="tabla-informe modern-table" id="tabla-menos-vendidos">
              <thead><tr><th>Producto</th><th>Cantidad</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </div>

        <div class="table-card-modern warning-table-card">
          <div class="card-header warning-header">
            <h3><i class="fas fa-exclamation-triangle"></i> Por reponer (stock < 5)</h3>
          </div>
          <div class="table-responsive">
            <table class="tabla-informe modern-table" id="tabla-reponer">
              <thead><tr><th>Producto</th><th>Stock</th><th>Unidad</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
          <div id="reponerPagination" class="modern-pagination">
            <button id="btnReponerPrev" class="btn-page"><i class="fas fa-chevron-left"></i> Anterior</button>
            <span id="reponerPageInfo" class="page-info"></span>
            <button id="btnReponerNext" class="btn-page">Siguiente <i class="fas fa-chevron-right"></i></button>
          </div>
        </div>
      </div>

    </div>

  <!-- Modal detalle de resumen -->
  <div id="summaryDetailModal" class="summary-detail-overlay">
    <div class="summary-detail-modal modern-modal" role="dialog" aria-modal="true" aria-labelledby="summaryDetailTitle">
      <div class="summary-detail-header">
        <h3 id="summaryDetailTitle">Detalle</h3>
        <button id="btnCloseSummaryDetail" class="summary-detail-close" aria-label="Cerrar"><i class="fas fa-times"></i></button>
      </div>
      <div class="summary-detail-body">
        <ul id="summaryDetailList" class="summary-detail-list"></ul>
        <div id="summaryDetailTotalContainer" style="display: none; margin-top: 15px; padding: 12px 15px; background: rgba(59, 130, 246, 0.05); border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.1); font-weight: bold; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Productos vendidos:</span>
            <span id="summaryDetailTotalVendidos">0 u</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #ef4444;">
            <span>Productos anulados:</span>
            <span id="summaryDetailTotalAnulados">0 u</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px dashed rgba(148, 163, 184, 0.3); padding-top: 5px; margin-top: 5px; color: #10b981; font-size: 14px;">
            <span>Ventas netas:</span>
            <span id="summaryDetailTotalNetas">0 u</span>
          </div>
        </div>
      </div>
      <div class="summary-detail-footer">
        <button id="btnPrintSummary" class="btn-modern-print" style="display:none;"><i class="fas fa-print"></i> Imprimir</button>
        <button id="btnCloseSummaryDetailFooter" class="btn-modern-close">Cerrar</button>
      </div>
    </div>
    </div>
  </div>
`,

    help: `
<div class="help-container">
  <!-- Encabezado -->
  <div class="help-header">
    <div class="header-title">
      <h1><i class="fas fa-question-circle"></i> Centro de Ayuda</h1>
      <p>Guías rápidas y preguntas frecuentes sobre el uso del sistema.</p>
    </div>
  </div>

  <!-- Tarjetas de ayuda -->
  <div class="help-cards-grid">
    <!-- Inventario -->
    <div class="help-card">
      <div class="help-card-icon inventario-icon">
        <i class="fas fa-box"></i>
      </div>
      <h3>Inventario</h3>
      <ul>
        <li><i class="fas fa-plus-circle card-bullet-icon"></i> <span><strong>Cómo agregar productos:</strong> Hacé clic en "Agregar Producto" en la barra superior del inventario y completá el formulario.</span></li>
        <li><i class="fas fa-edit card-bullet-icon"></i> <span><strong>Cómo editar productos:</strong> Buscá el producto en la tabla, hacé clic en el botón de edición y modificá sus datos.</span></li>
        <li><i class="fas fa-trash-alt card-bullet-icon"></i> <span><strong>Cómo eliminar productos:</strong> Hacé clic en el botón de eliminar junto al producto para darlo de baja.</span></li>
      </ul>
    </div>

    <!-- Ventas -->
    <div class="help-card">
      <div class="help-card-icon ventas-icon">
        <i class="fas fa-shopping-cart"></i>
      </div>
      <h3>Ventas</h3>
      <ul>
        <li><i class="fas fa-cash-register card-bullet-icon"></i> <span><strong>Cómo registrar una venta:</strong> Hacé clic en el ícono del carrito para abrir el punto de venta.</span></li>
        <li><i class="fas fa-shopping-basket card-bullet-icon"></i> <span><strong>Cómo utilizar el carrito:</strong> Sumá los productos indicando sus cantidades, aplicá descuentos o recargos si es necesario.</span></li>
        <li><i class="fas fa-print card-bullet-icon"></i> <span><strong>Cómo imprimir tickets:</strong> Elegí el método de pago y confirmá la venta para generar el ticket.</span></li>
      </ul>
    </div>

    <!-- Informes -->
    <div class="help-card">
      <div class="help-card-icon informes-icon">
        <i class="fas fa-chart-line"></i>
      </div>
      <h3>Informes</h3>
      <ul>
        <li><i class="fas fa-chart-bar card-bullet-icon"></i> <span><strong>Cómo interpretar los gráficos:</strong> Consultá la evolución de tus ventas, métodos de pago y productos más vendidos en tiempo real.</span></li>
        <li><i class="fas fa-calendar-check card-bullet-icon"></i> <span><strong>Cómo consultar estadísticas:</strong> Filtrá por fecha para analizar el rendimiento de períodos específicos.</span></li>
      </ul>
    </div>

    <!-- Respaldo -->
    <div class="help-card">
      <div class="help-card-icon respaldo-icon">
        <i class="fas fa-database"></i>
      </div>
      <h3>Respaldo</h3>
      <ul>
        <li><i class="fas fa-save card-bullet-icon"></i> <span><strong>Cómo crear una copia de seguridad:</strong> Dirigite a la Configuración y seleccioná "Respaldo" para exportar tu base de datos de manera segura.</span></li>
        <li><i class="fas fa-shield-alt card-bullet-icon"></i> <span><strong>Recomendaciones para proteger los datos:</strong> Se recomienda guardar los respaldos en un disco externo o la nube periódicamente.</span></li>
      </ul>
    </div>
  </div>

  <!-- Preguntas frecuentes -->
  <div class="faq-section">
    <h2><i class="fas fa-comments"></i> Preguntas frecuentes</h2>
    <div class="faq-accordion">
      <details class="faq-item">
        <summary class="faq-question">
          <span>¿Cómo agrego un producto?</span>
          <i class="fas fa-chevron-down faq-chevron"></i>
        </summary>
        <div class="faq-answer">
          <p>Hacé clic en el botón azul "Agregar Producto" en la parte superior derecha de la sección de Inventario. Completá los campos requeridos (código, nombre, categoría, unidad, stock inicial y precios) y presioná "Guardar cambios".</p>
        </div>
      </details>

      <details class="faq-item">
        <summary class="faq-question">
          <span>¿Cómo actualizo precios?</span>
          <i class="fas fa-chevron-down faq-chevron"></i>
        </summary>
        <div class="faq-answer">
          <p>Podés actualizar precios de manera masiva con el botón "Actualizar Precios" en la barra superior. Allí podés especificar un ajuste porcentual positivo o negativo para una categoría específica o para todo el inventario.</p>
        </div>
      </details>

      <details class="faq-item">
        <summary class="faq-question">
          <span>¿Cómo exporto Excel?</span>
          <i class="fas fa-chevron-down faq-chevron"></i>
        </summary>
        <div class="faq-answer">
          <p>Hacé clic en el botón "Exportar" dentro de la pestaña de Inventario. El sistema generará y descargará automáticamente un archivo en formato Excel con todos tus productos y sus datos actuales.</p>
        </div>
      </details>

      <details class="faq-item">
        <summary class="faq-question">
          <span>¿Cómo recupero un respaldo?</span>
          <i class="fas fa-chevron-down faq-chevron"></i>
        </summary>
        <div class="faq-answer">
          <p>Los respaldos se guardan en la carpeta de seguridad del sistema. En caso de necesitar restaurar uno, dirigite a la Configuración y cargá el archivo de respaldo previamente exportado o consultá los archivos locales.</p>
        </div>
      </details>

      <details class="faq-item">
        <summary class="faq-question">
          <span>¿Qué hacer si una venta fue registrada incorrectamente?</span>
          <i class="fas fa-chevron-down faq-chevron"></i>
        </summary>
        <div class="faq-answer">
          <p>Podés registrar un movimiento correctivo en el inventario o bien registrar un ajuste negativo desde la sección de Ajustes para mantener la contabilidad y el stock en orden.</p>
        </div>
      </details>
    </div>
  </div>

  <!-- Consejos rápidos -->
  <div class="tips-section">
    <h3><i class="fas fa-lightbulb"></i> Tips del sistema</h3>
    <div class="tips-grid">
      <div class="tip-card">
        <div class="tip-number">1</div>
        <div class="tip-content">
          <h4>Respaldos constantes</h4>
          <p>Realizá respaldos periódicamente para evitar pérdidas de información.</p>
        </div>
      </div>
      <div class="tip-card">
        <div class="tip-number">2</div>
        <div class="tip-content">
          <h4>Stock actualizado</h4>
          <p>Mantén actualizado el stock registrando cada entrada y salida de mercadería.</p>
        </div>
      </div>
      <div class="tip-card">
        <div class="tip-number">3</div>
        <div class="tip-content">
          <h4>Precios verificados</h4>
          <p>Verificá los precios antes de aplicar actualizaciones masivas en tu catálogo.</p>
        </div>
      </div>
      <div class="tip-card">
        <div class="tip-number">4</div>
        <div class="tip-content">
          <h4>Revisión periódica</h4>
          <p>Revisá los informes semanalmente para analizar el crecimiento de tu negocio.</p>
        </div>
      </div>
    </div>
  </div>
</div>
`,
    historial: `
  <div class="historial-container">
    <div class="historial-header">
      <div>
        <h1><i class="fas fa-history"></i> Historial</h1>
        <p>Registro de todas las actividades y movimientos</p>
      </div>
      <div class="historial-user-badge">
        <div class="historial-avatar">A</div>
        <div class="historial-user-info">
          <span class="historial-user-name">Administrador</span>
          <span class="historial-session-badge">Sesión activa</span>
        </div>
      </div>
    </div>

    <div class="historial-card">
      <div class="historial-filters">
        <div class="filter-group">
          <label for="historialFecha">
            <i class="fas fa-calendar-alt"></i>
            <span>Filtrar por fecha</span>
          </label>
          <div class="filter-controls">
            <input type="date" id="historialFecha" class="date-input">
            <button id="btnBuscarHistorial" class="btn-filter">
              <i class="fas fa-search"></i>
              Buscar
            </button>
          </div>
        </div>

        <div class="action-buttons">
          <button id="btnImprimirHistorial" class="btn-action print">
            <i class="fas fa-print"></i>
            Imprimir
          </button>
          <button id="btnVerTickets" class="btn-action tickets">
            <i class="fas fa-ticket-alt"></i>
            Ver Tickets
          </button>
        </div>
      </div>

      <!-- Sección de Historial -->
      <div id="historialSection" class="historial-section">
        <div class="historial-table-container">
          <table class="historial-table">
            <thead>
              <tr>
                <th><i class="fas fa-clock"></i> Fecha</th>
                <th><i class="fas fa-tag"></i> Acción</th>
                <th><i class="fas fa-align-left"></i> Detalle</th>
              </tr>
            </thead>
            <tbody id="historialBody">
              <!-- Los registros se cargarán aquí -->
            </tbody>
          </table>
        </div>

        <!-- Mensaje cuando no hay resultados -->
        <div id="historialEmptyMessage" class="historial-empty" style="display: none;">
          <i class="fas fa-inbox"></i>
          <p>No hay registros para esta fecha</p>
        </div>
      </div>
    </div>

    <!-- Sección de Tickets (oculta por defecto) -->
    <div id="ticketsSection" class="tickets-container" style="display: none;">
      <div class="tickets-header">
        <h2><i class="fas fa-ticket-alt"></i> Tickets Registrados</h2>
        <button id="btnCerrarTickets" class="btn-close">
          <i class="fas fa-times"></i> Cerrar
        </button>
      </div>
      <div class="tickets-filters">
        <input type="date" id="ticketsFechaFiltro" placeholder="Filtrar por fecha">
        <button id="btnFiltrarTickets" class="btn-filter">🔍 Buscar</button>
        <button id="btnMostrarTodosTickets" class="btn-filter">📋 Ver todos</button>
      </div>
      <div class="tickets-table-container">
        <table class="tickets-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Método de Pago</th>
              <th>Total</th>
              <th>Productos</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody id="ticketsBody"></tbody>
        </table>
      </div>
      <div id="ticketsEmptyMessage" class="tickets-empty" style="display: none;">
        <i class="fas fa-inbox"></i>
        <p>No hay tickets registrados</p>
      </div>
    </div>

    <!-- Sección de Presupuestos -->
    <div id="presupuestosSection" class="tickets-section" style="display: none;">
      <div class="tickets-header-actions">
        <h2><i class="fas fa-file-invoice-dollar"></i> Historial de Presupuestos</h2>
        <button id="btnCerrarPresupuestos" class="btn-modern-secondary"><i class="fas fa-arrow-left"></i> Volver</button>
      </div>
      <div class="tickets-filters">
        <input type="date" id="presupuestosFechaFiltro" class="date-input">
        <button id="btnFiltrarPresupuestos" class="btn-filter"><i class="fas fa-filter"></i> Filtrar</button>
        <button id="btnMostrarTodosPresupuestos" class="btn-filter">📋 Ver todos</button>
      </div>
      <div class="tickets-table-container">
        <table class="tickets-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Productos</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody id="presupuestosBody"></tbody>
        </table>
      </div>
      <div id="presupuestosEmptyMessage" class="tickets-empty" style="display: none;">
        <i class="fas fa-inbox"></i>
        <p>No hay presupuestos registrados</p>
      </div>
    </div>

    <!-- Sección de Remitos -->
    <div id="remitosSection" class="tickets-section" style="display: none;">
      <div class="tickets-header-actions">
        <h2><i class="fas fa-truck"></i> Historial de Remitos Emitidos</h2>
        <button id="btnCerrarRemitos" class="btn-modern-secondary"><i class="fas fa-arrow-left"></i> Volver</button>
      </div>
      <div class="tickets-filters">
        <input type="date" id="remitosFechaFiltro" class="date-input">
        <button id="btnFiltrarRemitos" class="btn-filter"><i class="fas fa-filter"></i> Filtrar</button>
        <button id="btnMostrarTodosRemitos" class="btn-filter">📋 Ver todos</button>
      </div>
      <div class="tickets-table-container">
        <table class="tickets-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Cliente / Señor(es)</th>
              <th>Fecha</th>
              <th>Domicilio</th>
              <th>Vendedor</th>
              <th>Productos</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody id="remitosBody"></tbody>
        </table>
      </div>
      <div id="remitosEmptyMessage" class="tickets-empty" style="display: none;">
        <i class="fas fa-inbox"></i>
        <p>No hay remitos registrados</p>
      </div>
    </div>
  </div>

  <!-- Modal de selección de tipo de historial (Fase 1) -->
  <div id="modalHistorySelector" class="modal" style="display: none; justify-content: center; align-items: center; z-index: 1100;">
    <div class="modal-content print-options-modal">
      <div class="print-options-header">
        <h3>
          <i class="fas fa-history"></i>
          Seleccionar Historial
        </h3>
        <button class="modal-close" id="btnCloseHistorySelector"><i class="fas fa-times"></i></button>
      </div>
      <div class="print-options-body">
        <button id="btnHistorialTicketsOption" class="print-option-btn">
          <span class="icon">🎫</span>
          <div class="print-option-text">
            <strong class="title">Ver Tickets</strong>
            <span class="desc">Historial de tickets emitidos</span>
          </div>
        </button>
        <button id="btnHistorialPresupuestosOption" class="print-option-btn">
          <span class="icon">📄</span>
          <div class="print-option-text">
            <strong class="title">Ver Presupuestos</strong>
            <span class="desc">Historial de presupuestos emitidos</span>
          </div>
        </button>
        <button id="btnHistorialRemitosOption" class="print-option-btn">
          <span class="icon">🚚</span>
          <div class="print-option-text">
            <strong class="title">Ver Remitos</strong>
            <span class="desc">Historial de remitos emitidos</span>
          </div>
        </button>
      </div>
      <div class="print-options-footer">
        <button class="btn-modern-secondary" id="btnCloseHistorySelector">
          Cancelar
        </button>
      </div>
    </div>
  </div>
`,

    empleados: `
<div class="empleados-page">
  <div class="empleados-header">
    <div>
      <h1><i class="fas fa-users"></i> Empleados</h1>
      <p>Gestión de personal, horarios y asistencias</p>
    </div>
    <button id="btnAgregarEmpleado" class="btn-emp-primary">
      <i class="fas fa-user-plus"></i> Agregar Empleado
    </button>
  </div>

  <!-- Sub-pestañas -->
  <div class="empleados-tabs">
    <button class="empleados-tab-btn active" data-tab="lista-empleados">
      <i class="fas fa-id-card"></i> Empleados
    </button>
    <button class="empleados-tab-btn" data-tab="horarios">
      <i class="fas fa-clock"></i> Horarios
    </button>
    <button class="empleados-tab-btn" data-tab="registrar-asistencia">
      <i class="fas fa-calendar-check"></i> Registrar Asistencia
    </button>
    <button class="empleados-tab-btn" data-tab="historial-asistencias">
      <i class="fas fa-list-alt"></i> Historial
    </button>
    <button class="empleados-tab-btn" data-tab="estadisticas-emp">
      <i class="fas fa-chart-bar"></i> Estadísticas
    </button>
  </div>

  <!-- ===== PESTAÑA: LISTA DE EMPLEADOS ===== -->
  <div id="tab-lista-empleados" class="empleados-tab-section active">
    <div class="empleados-tools">
      <div class="empleados-search">
        <i class="fas fa-search"></i>
        <input type="text" id="empSearchInput" placeholder="Buscar por nombre, DNI o cargo...">
      </div>
      <select id="empFiltroEstado" class="empleados-filter-select">
        <option value="">Todos los estados</option>
        <option value="Activo">Activo</option>
        <option value="Inactivo">Inactivo</option>
      </select>
      <select id="empFiltroCargo" class="empleados-filter-select">
        <option value="">Todos los cargos</option>
      </select>
    </div>
    <div class="empleados-table-wrapper">
      <table class="empleados-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre y Apellido</th>
            <th>DNI</th>
            <th>Teléfono</th>
            <th>Cargo</th>
            <th>Horario</th>
            <th>Ingreso</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="empTableBody">
          <tr>
            <td colspan="9">
              <div class="empleados-empty">
                <i class="fas fa-users"></i>
                <p>No hay empleados registrados</p>
                <small>Hacé clic en "Agregar Empleado" para comenzar</small>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ===== PESTAÑA: HORARIOS ===== -->
  <div id="tab-horarios" class="empleados-tab-section">
    <div class="empleados-tools">
      <button id="btnNuevoHorario" class="btn-emp-primary">
        <i class="fas fa-plus"></i> Nuevo Horario
      </button>
    </div>
    <div id="horariosGrid" class="horarios-grid">
      <div class="empleados-empty">
        <i class="fas fa-clock"></i>
        <p>No hay horarios registrados</p>
      </div>
    </div>
  </div>

  <!-- ===== PESTAÑA: REGISTRAR ASISTENCIA ===== -->
  <div id="tab-registrar-asistencia" class="empleados-tab-section">
    <div class="asistencia-form-card">
      <h3 style="margin:0 0 6px; font-size:16px; font-weight:700; color:#0f172a; display:flex; align-items:center; gap:9px;">
        <i class="fas fa-calendar-plus" style="color:#3b82f6;"></i> Registrar Asistencia
      </h3>
      <p style="margin:0 0 18px; font-size:13px; color:#64748b;">Completá los datos de la asistencia del día.</p>
      <div class="asistencia-form-grid">
        <div class="asistencia-form-group">
          <label><i class="fas fa-user"></i> Empleado <span style="color:#ef4444;">*</span></label>
          <select id="attEmpleado" class="modern-select">
            <option value="">Seleccionar empleado...</option>
          </select>
        </div>
        <div class="asistencia-form-group">
          <label><i class="fas fa-calendar-alt"></i> Fecha <span style="color:#ef4444;">*</span></label>
          <input type="date" id="attFecha">
        </div>
        <div class="asistencia-form-group">
          <label><i class="fas fa-sign-in-alt"></i> Hora de Entrada</label>
          <input type="time" id="attHoraEntrada">
        </div>
        <div class="asistencia-form-group">
          <label><i class="fas fa-sign-out-alt"></i> Hora de Salida</label>
          <input type="time" id="attHoraSalida">
        </div>
        <div class="asistencia-form-group">
          <label><i class="fas fa-tag"></i> Estado <span style="color:#ef4444;">*</span></label>
          <select id="attEstado">
            <option value="Presente">Presente</option>
            <option value="Tarde">Tarde</option>
            <option value="Ausente">Ausente</option>
            <option value="Licencia">Licencia</option>
            <option value="Vacaciones">Vacaciones</option>
          </select>
        </div>
        <div class="asistencia-form-group full">
          <label><i class="fas fa-comment-alt"></i> Observaciones</label>
          <textarea id="attObservaciones" placeholder="Notas adicionales..."></textarea>
        </div>
      </div>
      <div style="display:flex; gap:12px; margin-top:8px;">
        <button id="btnGuardarAsistencia" class="btn-emp-primary">
          <i class="fas fa-save"></i> Guardar Asistencia
        </button>
        <button id="btnLimpiarAsistencia" class="btn-emp-secondary">
          <i class="fas fa-eraser"></i> Limpiar
        </button>
      </div>
    </div>
  </div>

  <!-- ===== PESTAÑA: HISTORIAL DE ASISTENCIAS ===== -->
  <div id="tab-historial-asistencias" class="empleados-tab-section">
    <div class="asistencias-filters">
      <div class="asistencias-filter-group">
        <label>Desde</label>
        <input type="date" id="histFechaInicio">
      </div>
      <div class="asistencias-filter-group">
        <label>Hasta</label>
        <input type="date" id="histFechaFin">
      </div>
      <div class="asistencias-filter-group">
        <label>Empleado</label>
        <select id="histEmpleado">
          <option value="">Todos</option>
        </select>
      </div>
      <div class="asistencias-filter-group">
        <label>Estado</label>
        <select id="histEstado">
          <option value="">Todos</option>
          <option value="Presente">Presente</option>
          <option value="Tarde">Tarde</option>
          <option value="Ausente">Ausente</option>
          <option value="Licencia">Licencia</option>
          <option value="Vacaciones">Vacaciones</option>
        </select>
      </div>
      <button id="btnBuscarHistAtt" class="btn-emp-primary" style="align-self:flex-end;">
        <i class="fas fa-search"></i> Buscar
      </button>
      <button id="btnLimpiarHistAtt" class="btn-emp-secondary" style="align-self:flex-end;">
        <i class="fas fa-times"></i> Limpiar
      </button>
    </div>
    <div class="empleados-table-wrapper">
      <table class="empleados-table">
        <thead>
          <tr>
            <th>Empleado</th>
            <th>Cargo</th>
            <th>Fecha</th>
            <th>Entrada</th>
            <th>Salida</th>
            <th>Horas</th>
            <th>Estado</th>
            <th>Observaciones</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="histAttBody">
          <tr>
            <td colspan="9">
              <div class="empleados-empty">
                <i class="fas fa-list-alt"></i>
                <p>Aplicá los filtros para ver el historial</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ===== PESTAÑA: ESTADÍSTICAS ===== -->
  <div id="tab-estadisticas-emp" class="empleados-tab-section">
    <div class="empleados-kpi-grid" id="empKpiGrid">
      <div class="empleados-kpi-card">
        <div class="empleados-kpi-icon blue"><i class="fas fa-users"></i></div>
        <div class="empleados-kpi-value" id="kpiTotalEmp">—</div>
        <div class="empleados-kpi-label">Total Empleados</div>
      </div>
      <div class="empleados-kpi-card">
        <div class="empleados-kpi-icon green"><i class="fas fa-user-check"></i></div>
        <div class="empleados-kpi-value" id="kpiPresentesHoy">—</div>
        <div class="empleados-kpi-label">Presentes Hoy</div>
      </div>
      <div class="empleados-kpi-card">
        <div class="empleados-kpi-icon yellow"><i class="fas fa-user-clock"></i></div>
        <div class="empleados-kpi-value" id="kpiTardesHoy">—</div>
        <div class="empleados-kpi-label">Llegadas Tarde</div>
      </div>
      <div class="empleados-kpi-card">
        <div class="empleados-kpi-icon red"><i class="fas fa-user-times"></i></div>
        <div class="empleados-kpi-value" id="kpiAusentesHoy">—</div>
        <div class="empleados-kpi-label">Ausentes Hoy</div>
      </div>
      <div class="empleados-kpi-card">
        <div class="empleados-kpi-icon purple"><i class="fas fa-umbrella-beach"></i></div>
        <div class="empleados-kpi-value" id="kpiLicencias">—</div>
        <div class="empleados-kpi-label">Licencias/Vacaciones</div>
      </div>
    </div>
    <div class="estadisticas-charts">
      <div class="estadisticas-chart-card">
        <h3><i class="fas fa-chart-pie"></i> Asistencia del Mes</h3>
        <div class="chart-container-emp">
          <canvas id="chartEmpAsistencia"></canvas>
        </div>
      </div>
      <div class="estadisticas-chart-card">
        <h3><i class="fas fa-stopwatch"></i> Horas Trabajadas (Mes)</h3>
        <div class="horas-resumen-table-wrapper" style="overflow-x:auto;">
          <table class="horas-resumen-table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Días trabajados</th>
                <th>Horas totales</th>
                <th>% Asistencia</th>
              </tr>
            </thead>
            <tbody id="horasResumenBody">
              <tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:24px 0;">Sin datos del mes</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ===== MODAL: AGREGAR / EDITAR EMPLEADO ===== -->
<div id="modalEmpleado" class="modal">
  <div class="modal-content modal-empleado">
    <div class="modal-emp-header">
      <h2><i class="fas fa-user-edit"></i> <span id="modalEmpTitle">Agregar Empleado</span></h2>
      <button class="modal-close" id="btnCloseModalEmp"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-emp-body">
      <div class="emp-form-grid">
        <div class="emp-form-group">
          <label><i class="fas fa-user"></i> Nombre <span class="required-star">*</span></label>
          <input type="text" id="empNombre" class="modern-input" placeholder="Nombre del empleado" autocomplete="off">
          <span class="emp-field-error" id="errEmpNombre">El nombre es obligatorio</span>
        </div>
        <div class="emp-form-group">
          <label><i class="fas fa-user"></i> Apellido <span class="required-star">*</span></label>
          <input type="text" id="empApellido" class="modern-input" placeholder="Apellido del empleado" autocomplete="off">
          <span class="emp-field-error" id="errEmpApellido">El apellido es obligatorio</span>
        </div>
        <div class="emp-form-group">
          <label><i class="fas fa-id-card"></i> DNI <span class="required-star">*</span></label>
          <input type="text" id="empDni" class="modern-input" placeholder="Ej: 32456789" autocomplete="off">
          <span class="emp-field-error" id="errEmpDni">DNI obligatorio</span>
        </div>
        <div class="emp-form-group">
          <label><i class="fas fa-birthday-cake"></i> Fecha de Nacimiento</label>
          <input type="date" id="empFechaNac" class="modern-input">
        </div>
        <div class="emp-form-group">
          <label><i class="fas fa-phone"></i> Teléfono</label>
          <input type="tel" id="empTelefono" class="modern-input" placeholder="Ej: 11 4567-8901" autocomplete="off">
        </div>
        <div class="emp-form-group">
          <label><i class="fas fa-envelope"></i> Email</label>
          <input type="email" id="empEmail" class="modern-input" placeholder="correo@ejemplo.com" autocomplete="off">
          <span class="emp-field-error" id="errEmpEmail">Ingresá un email válido</span>
        </div>
        <div class="emp-form-group full">
          <label><i class="fas fa-map-marker-alt"></i> Dirección</label>
          <input type="text" id="empDireccion" class="modern-input" placeholder="Calle 123, Ciudad" autocomplete="off">
        </div>
        <div class="emp-form-group">
          <label><i class="fas fa-briefcase"></i> Cargo <span class="required-star">*</span></label>
          <input type="text" id="empCargo" class="modern-input" placeholder="Ej: Vendedor, Cajero" autocomplete="off">
          <span class="emp-field-error" id="errEmpCargo">El cargo es obligatorio</span>
        </div>
        <div class="emp-form-group">
          <label><i class="fas fa-calendar-plus"></i> Fecha de Ingreso</label>
          <input type="date" id="empFechaIngreso" class="modern-input">
        </div>
        <div class="emp-form-group">
          <label><i class="fas fa-dollar-sign"></i> Salario (opcional)</label>
          <input type="number" id="empSalario" class="modern-input" placeholder="0.00" min="0" step="0.01">
        </div>
        <div class="emp-form-group">
          <label><i class="fas fa-clock"></i> Horario Asignado</label>
          <select id="empHorarioId" class="modern-select">
            <option value="">Sin horario</option>
          </select>
        </div>
        <div class="emp-form-group">
          <label><i class="fas fa-toggle-on"></i> Estado</label>
          <select id="empEstado" class="modern-select">
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>
        <div class="emp-form-group full">
          <label><i class="fas fa-comment-alt"></i> Observaciones</label>
          <textarea id="empObservaciones" class="modern-input" placeholder="Notas adicionales sobre el empleado..." rows="3"></textarea>
        </div>
      </div>
    </div>
    <div class="modal-emp-footer">
      <button id="btnCancelEmp" class="btn-emp-secondary"><i class="fas fa-times"></i> Cancelar</button>
      <button id="btnGuardarEmp" class="btn-emp-primary"><i class="fas fa-save"></i> Guardar</button>
    </div>
  </div>
</div>

<!-- ===== MODAL: CREAR / EDITAR HORARIO ===== -->
<div id="modalHorario" class="modal">
  <div class="modal-content modal-horario">
    <div class="modal-emp-header">
      <h2><i class="fas fa-clock"></i> <span id="modalHorarioTitle">Nuevo Horario</span></h2>
      <button class="modal-close" id="btnCloseModalHorario"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-emp-body">
      <div class="emp-form-group" style="margin-bottom:18px;">
        <label><i class="fas fa-tag"></i> Nombre del Horario <span class="required-star">*</span></label>
        <input type="text" id="horNombre" class="modern-input" placeholder="Ej: Turno Mañana 08:00-16:00">
      </div>
      <div class="horario-form-grid">
        <div class="horario-form-day" id="hor-lunes">
          <label>Lunes</label>
          <div class="dia-toggle"><input type="checkbox" id="horLunesActivo"> <span style="font-size:12px;color:#64748b;">Activo</span></div>
          <div class="horario-time-inputs">
            <input type="time" id="horLunesEnt" value="08:00"> <span>–</span> <input type="time" id="horLunesSal" value="17:00">
          </div>
        </div>
        <div class="horario-form-day" id="hor-martes">
          <label>Martes</label>
          <div class="dia-toggle"><input type="checkbox" id="horMartesActivo"> <span style="font-size:12px;color:#64748b;">Activo</span></div>
          <div class="horario-time-inputs">
            <input type="time" id="horMartesEnt" value="08:00"> <span>–</span> <input type="time" id="horMartesSal" value="17:00">
          </div>
        </div>
        <div class="horario-form-day" id="hor-miercoles">
          <label>Miércoles</label>
          <div class="dia-toggle"><input type="checkbox" id="horMiercolesActivo"> <span style="font-size:12px;color:#64748b;">Activo</span></div>
          <div class="horario-time-inputs">
            <input type="time" id="horMiercolesEnt" value="08:00"> <span>–</span> <input type="time" id="horMiercolesSal" value="17:00">
          </div>
        </div>
        <div class="horario-form-day" id="hor-jueves">
          <label>Jueves</label>
          <div class="dia-toggle"><input type="checkbox" id="horJuevesActivo"> <span style="font-size:12px;color:#64748b;">Activo</span></div>
          <div class="horario-time-inputs">
            <input type="time" id="horJuevesEnt" value="08:00"> <span>–</span> <input type="time" id="horJuevesSal" value="17:00">
          </div>
        </div>
        <div class="horario-form-day" id="hor-viernes">
          <label>Viernes</label>
          <div class="dia-toggle"><input type="checkbox" id="horViernesActivo"> <span style="font-size:12px;color:#64748b;">Activo</span></div>
          <div class="horario-time-inputs">
            <input type="time" id="horViernesEnt" value="08:00"> <span>–</span> <input type="time" id="horViernesSal" value="17:00">
          </div>
        </div>
        <div class="horario-form-day" id="hor-sabado">
          <label>Sábado</label>
          <div class="dia-toggle"><input type="checkbox" id="horSabadoActivo"> <span style="font-size:12px;color:#64748b;">Activo</span></div>
          <div class="horario-time-inputs">
            <input type="time" id="horSabadoEnt" value="08:00"> <span>–</span> <input type="time" id="horSabadoSal" value="13:00">
          </div>
        </div>
        <div class="horario-form-day" id="hor-domingo">
          <label>Domingo</label>
          <div class="dia-toggle"><input type="checkbox" id="horDomingoActivo"> <span style="font-size:12px;color:#64748b;">Activo</span></div>
          <div class="horario-time-inputs">
            <input type="time" id="horDomingoEnt" value="08:00"> <span>–</span> <input type="time" id="horDomingoSal" value="13:00">
          </div>
        </div>
      </div>
    </div>
    <div class="modal-emp-footer">
      <button id="btnCancelHorario" class="btn-emp-secondary"><i class="fas fa-times"></i> Cancelar</button>
      <button id="btnGuardarHorario" class="btn-emp-primary"><i class="fas fa-save"></i> Guardar Horario</button>
    </div>
  </div>
</div>
`,

    proveedores: `
<div class="proveedores-page">
  <div class="prov-header">
    <div>
      <h1><i class="fas fa-truck"></i> Proveedores</h1>
      <p>Gestión de proveedores, compras, deudas y cuenta corriente</p>
    </div>
    <button id="btnAgregarProveedor" class="btn-prov-primary">
      <i class="fas fa-plus"></i> Agregar Proveedor
    </button>
  </div>

  <!-- Sub-pestañas -->
  <div class="prov-tabs">
    <button class="prov-tab-btn active" data-tab="lista-proveedores"><i class="fas fa-building"></i> Proveedores</button>
    <button class="prov-tab-btn" data-tab="registrar-compra"><i class="fas fa-shopping-bag"></i> Registrar Compra</button>
    <button class="prov-tab-btn" data-tab="registrar-pago"><i class="fas fa-money-bill-wave"></i> Registrar Pago</button>
    <button class="prov-tab-btn" data-tab="vencimientos"><i class="fas fa-calendar-times"></i> Vencimientos</button>
    <button class="prov-tab-btn" data-tab="estadisticas-prov"><i class="fas fa-chart-bar"></i> Estadísticas</button>
  </div>

  <!-- ===== PESTAÑA: LISTA PROVEEDORES ===== -->
  <div id="tab-lista-proveedores" class="prov-tab-section active">
    <div class="prov-tools">
      <div class="prov-search"><i class="fas fa-search"></i>
        <input type="text" id="provSearchInput" placeholder="Buscar por nombre, CUIT, ciudad...">
      </div>
      <select id="provFiltroEstado" class="prov-filter-select">
        <option value="">Todos los estados</option>
        <option value="Activo">Activo</option>
        <option value="Inactivo">Inactivo</option>
      </select>
      <select id="provFiltroDeuda" class="prov-filter-select">
        <option value="">Toda la deuda</option>
        <option value="con-deuda">Con deuda</option>
        <option value="sin-deuda">Sin deuda</option>
      </select>
    </div>
    <div class="prov-table-wrapper">
      <table class="prov-table">
        <thead>
          <tr>
            <th data-col="id">ID <i class="fas fa-sort sort-icon"></i></th>
            <th data-col="razon_social">Razón Social <i class="fas fa-sort sort-icon"></i></th>
            <th data-col="contacto">Contacto</th>
            <th data-col="telefono">Teléfono</th>
            <th data-col="email">Email</th>
            <th data-col="ciudad">Ciudad</th>
            <th data-col="deuda_actual">Deuda <i class="fas fa-sort sort-icon"></i></th>
            <th data-col="ultima_compra">Última Compra <i class="fas fa-sort sort-icon"></i></th>
            <th data-col="estado">Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="provTableBody">
          <tr><td colspan="10"><div class="prov-empty"><i class="fas fa-truck"></i><p>No hay proveedores registrados</p><small>Hacé clic en "Agregar Proveedor" para comenzar</small></div></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ===== PESTAÑA: REGISTRAR COMPRA ===== -->
  <div id="tab-registrar-compra" class="prov-tab-section">
    <div class="prov-form-card">
      <h3><i class="fas fa-shopping-bag"></i> Registrar Compra</h3>
      <p>Cargá los datos de una nueva compra. Si el método de pago es "Cuenta corriente", la deuda se registra automáticamente.</p>
      <div class="prov-form-grid">
        <div class="prov-form-group">
          <label><i class="fas fa-building"></i> Proveedor <span class="req">*</span></label>
          <select id="compraProveedorId">
            <option value="">Seleccionar proveedor...</option>
          </select>
        </div>
        <div class="prov-form-group">
          <label><i class="fas fa-calendar-alt"></i> Fecha <span class="req">*</span></label>
          <input type="date" id="compraFecha">
        </div>
        <div class="prov-form-group full">
          <label><i class="fas fa-file-alt"></i> Descripción / Detalle</label>
          <input type="text" id="compraDescripcion" placeholder="Ej: Factura B 0001-00004532">
        </div>
        <div class="prov-form-group">
          <label><i class="fas fa-dollar-sign"></i> Total <span class="req">*</span></label>
          <input type="number" id="compraTotal" placeholder="0.00" min="0" step="0.01">
        </div>
        <div class="prov-form-group">
          <label><i class="fas fa-credit-card"></i> Método de Pago</label>
          <select id="compraMetodoPago">
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Tarjeta">Tarjeta</option>
            <option value="Cuenta corriente">Cuenta corriente (genera deuda)</option>
          </select>
        </div>
        <div class="prov-form-group" id="compraVencimientoGroup" style="display:none;">
          <label><i class="fas fa-calendar-times"></i> Fecha de Vencimiento</label>
          <input type="date" id="compraFechaVencimiento">
        </div>
        <div class="prov-form-group full">
          <label><i class="fas fa-comment-alt"></i> Observaciones</label>
          <textarea id="compraObservaciones" placeholder="Notas adicionales..."></textarea>
        </div>
      </div>
      <div style="display:flex; gap:12px;">
        <button id="btnGuardarCompra" class="btn-prov-primary"><i class="fas fa-save"></i> Guardar Compra</button>
        <button id="btnLimpiarCompra" class="btn-prov-secondary"><i class="fas fa-eraser"></i> Limpiar</button>
      </div>
    </div>
  </div>

  <!-- ===== PESTAÑA: REGISTRAR PAGO ===== -->
  <div id="tab-registrar-pago" class="prov-tab-section">
    <div class="prov-form-card">
      <h3><i class="fas fa-money-bill-wave"></i> Registrar Pago a Proveedor</h3>
      <p>El monto se descontará automáticamente de la deuda del proveedor.</p>
      <div class="prov-form-grid">
                <div class="prov-form-group">
          <label><i class="fas fa-building"></i> Proveedor <span class="req">*</span></label>
          <select id="pagoProveedorId">
            <option value="">Seleccionar proveedor...</option>
          </select>
        </div>
        <div class="prov-form-group" id="pagoCompraIdGroup">
          <label><i class="fas fa-file-invoice-dollar"></i> Deuda Pendiente <span class="req">*</span></label>
          <select id="pagoCompraId">
            <option value="">Seleccionar deuda...</option>
          </select>
        </div>
        <div class="prov-form-group">
          <label><i class="fas fa-calendar-alt"></i> Fecha <span class="req">*</span></label>
          <input type="date" id="pagoFecha">
        </div>
        <div class="prov-form-group">
          <label><i class="fas fa-dollar-sign"></i> Monto Pagado <span class="req">*</span></label>
          <input type="number" id="pagoMonto" placeholder="0.00" min="0.01" step="0.01">
        </div>
        <div class="prov-form-group">
          <label><i class="fas fa-credit-card"></i> Método de Pago</label>
          <select id="pagoMetodoPago">
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Tarjeta">Tarjeta</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
        <div class="prov-form-group">
          <label><i class="fas fa-receipt"></i> Comprobante (opcional)</label>
          <input type="text" id="pagoComprobante" placeholder="Nro. recibo, transferencia, etc.">
        </div>
        <div class="prov-form-group full">
          <label><i class="fas fa-comment-alt"></i> Observaciones</label>
          <textarea id="pagoObservaciones" placeholder="Notas adicionales..."></textarea>
        </div>
      </div>
      <div style="display:flex; gap:12px;">
        <button id="btnGuardarPago" class="btn-prov-primary"><i class="fas fa-save"></i> Registrar Pago</button>
        <button id="btnLimpiarPago" class="btn-prov-secondary"><i class="fas fa-eraser"></i> Limpiar</button>
      </div>
    </div>
  </div>

  <!-- ===== PESTAÑA: VENCIMIENTOS ===== -->
  <div id="tab-vencimientos" class="prov-tab-section">
    <div class="prov-tools">
      <button id="btnRefrescarVencimientos" class="btn-prov-secondary"><i class="fas fa-sync"></i> Actualizar</button>
    </div>
    <div class="prov-table-wrapper">
      <table class="prov-table">
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>Descripción</th>
            <th>Fecha Vencimiento</th>
            <th>Días Restantes</th>
            <th>Deuda</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody id="vencimientosBody">
          <tr><td colspan="6"><div class="prov-empty"><i class="fas fa-calendar-check"></i><p>Sin vencimientos pendientes</p></div></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ===== PESTAÑA: ESTADÍSTICAS ===== -->
  <div id="tab-estadisticas-prov" class="prov-tab-section">
    <div class="prov-kpi-grid">
      <div class="prov-kpi-card"><div class="prov-kpi-icon green"><i class="fas fa-building"></i></div><div class="prov-kpi-value" id="kpiTotalProv">—</div><div class="prov-kpi-label">Proveedores Activos</div></div>
      <div class="prov-kpi-card"><div class="prov-kpi-icon red"><i class="fas fa-file-invoice-dollar"></i></div><div class="prov-kpi-value" id="kpiTotalDeuda">—</div><div class="prov-kpi-label">Total Adeudado</div></div>
      <div class="prov-kpi-card"><div class="prov-kpi-icon yellow"><i class="fas fa-exclamation-triangle"></i></div><div class="prov-kpi-value" id="kpiDeudasVencidas">—</div><div class="prov-kpi-label">Deudas Vencidas</div></div>
      <div class="prov-kpi-card"><div class="prov-kpi-icon blue"><i class="fas fa-shopping-bag"></i></div><div class="prov-kpi-value" id="kpiComprasMes">—</div><div class="prov-kpi-label">Compras del Mes</div></div>
      <div class="prov-kpi-card"><div class="prov-kpi-icon teal"><i class="fas fa-hand-holding-usd"></i></div><div class="prov-kpi-value" id="kpiPagosMes">—</div><div class="prov-kpi-label">Pagos del Mes</div></div>
      <div class="prov-kpi-card"><div class="prov-kpi-icon purple"><i class="fas fa-star"></i></div><div class="prov-kpi-value" id="kpiTopProv" style="font-size:14px;line-height:1.3;">—</div><div class="prov-kpi-label">Mayor Proveedor</div></div>
    </div>
    <div class="prov-charts">
      <div class="prov-chart-card" style="grid-column: 1/-1;">
        <h3><i class="fas fa-chart-bar"></i> Compras por Mes (últimos 6 meses)</h3>
        <div class="chart-container-prov"><canvas id="chartProvCompras"></canvas></div>
      </div>
    </div>
  </div>
</div>

<!-- ===== MODAL: AGREGAR / EDITAR PROVEEDOR ===== -->
<div id="modalProveedor" class="modal">
  <div class="modal-content modal-prov">
    <div class="modal-prov-header">
      <h2><i class="fas fa-building"></i> <span id="modalProvTitle">Agregar Proveedor</span></h2>
      <button class="modal-close" id="btnCloseModalProv"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-prov-body">
      <div class="prov-form-grid">
        <div class="prov-form-group full">
          <label><i class="fas fa-building"></i> Nombre / Razón Social <span class="req">*</span></label>
          <input type="text" id="provRazonSocial" placeholder="Ej: Distribuidora El Sol S.R.L." autocomplete="off">
          <span class="prov-field-error" id="errProvRazonSocial">La razón social es obligatoria</span>
        </div>
        <div class="prov-form-group">
          <label><i class="fas fa-user"></i> Nombre de Contacto</label>
          <input type="text" id="provContacto" placeholder="Nombre del representante" autocomplete="off">
        </div>
        <div class="prov-form-group">
          <label><i class="fas fa-phone"></i> Teléfono</label>
          <input type="tel" id="provTelefono" placeholder="Ej: 11 4567-8901" autocomplete="off">
        </div>
        <div class="prov-form-group">
          <label><i class="fas fa-envelope"></i> Email</label>
          <input type="email" id="provEmail" placeholder="correo@proveedor.com" autocomplete="off">
          <span class="prov-field-error" id="errProvEmail">Ingresá un email válido</span>
        </div>
        <div class="prov-form-group">
          <label><i class="fas fa-id-card"></i> CUIT</label>
          <input type="text" id="provCuit" placeholder="Ej: 30-12345678-9" autocomplete="off">
        </div>
        <div class="prov-form-group full">
          <label><i class="fas fa-map-marker-alt"></i> Dirección</label>
          <input type="text" id="provDireccion" placeholder="Calle 123, Piso 2" autocomplete="off">
        </div>
        <div class="prov-form-group">
          <label><i class="fas fa-city"></i> Ciudad</label>
          <input type="text" id="provCiudad" placeholder="Buenos Aires" autocomplete="off">
        </div>
        <div class="prov-form-group">
          <label><i class="fas fa-map"></i> Provincia</label>
          <input type="text" id="provProvincia" placeholder="CABA" autocomplete="off">
        </div>
        <div class="prov-form-group">
          <label><i class="fas fa-toggle-on"></i> Estado</label>
          <select id="provEstado">
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>
        <div class="prov-form-group full">
          <label><i class="fas fa-comment-alt"></i> Observaciones</label>
          <textarea id="provObservaciones" placeholder="Notas sobre el proveedor..." rows="2"></textarea>
        </div>
      </div>
    </div>
    <div class="modal-prov-footer">
      <button id="btnCancelProv" class="btn-prov-secondary"><i class="fas fa-times"></i> Cancelar</button>
      <button id="btnGuardarProv" class="btn-prov-primary"><i class="fas fa-save"></i> Guardar</button>
    </div>
  </div>
</div>

<!-- ===== MODAL: CUENTA CORRIENTE / HISTORIAL PROVEEDOR ===== -->
<div id="modalCuentaCorriente" class="modal">
  <div class="modal-content modal-prov-lg">
    <div class="modal-prov-header">
      <h2><i class="fas fa-file-invoice-dollar"></i> <span id="modalCCTitle">Cuenta Corriente</span></h2>
      <button class="modal-close" id="btnCloseModalCC"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-prov-body">
      <!-- Resumen del proveedor -->
      <div class="prov-summary-card" id="ccSummaryCard">
        <div class="prov-summary-item"><label>Proveedor</label><span id="ccProvNombre">—</span></div>
        <div class="prov-summary-item"><label>CUIT</label><span id="ccProvCuit">—</span></div>
        <div class="prov-summary-item"><label>Teléfono</label><span id="ccProvTel">—</span></div>
        <div class="prov-summary-item"><label>Deuda Actual</label><span id="ccDeudaActual" style="color:#ef4444;">$0,00</span></div>
      </div>
      <!-- Tabla de movimientos -->
      <div style="overflow-x:auto;">
        <table class="cuenta-corriente-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th style="text-align:right;">Débito</th>
              <th style="text-align:right;">Crédito</th>
              <th style="text-align:right;">Saldo</th>
              <th>Estado</th>
              <th>Vto.</th>
            </tr>
          </thead>
          <tbody id="ccTableBody">
            <tr><td colspan="8"><div class="prov-empty"><i class="fas fa-file-invoice"></i><p>Sin movimientos registrados</p></div></td></tr>
          </tbody>
        </table>
      </div>
    </div>
        <div class="modal-prov-footer">
      <button id="btnCCCerrar" class="btn-prov-secondary"><i class="fas fa-times"></i> Cerrar</button>
    </div>
  </div>
</div>
`,

  municipio: `
<div class="municipio-page">
  <div class="muni-header">
    <div>
      <h1><i class="fas fa-university"></i> Cuenta Corriente Municipio</h1>
      <p>Gestión de entregas, cuentas por cobrar y seguimiento de pagos del municipio.</p>
    </div>
    <button id="btnNuevaOrdenMuni" class="btn-muni-primary">
      <i class="fas fa-plus"></i> Nueva Orden
    </button>
  </div>

  <!-- Sub-pestañas -->
  <div class="muni-tabs">
    <button class="muni-tab-btn active" data-tab="muni-ordenes"><i class="fas fa-file-signature"></i> Órdenes</button>
    <button class="muni-tab-btn" data-tab="muni-vencimientos"><i class="fas fa-calendar-alt"></i> Próximos Cobros</button>
    <button class="muni-tab-btn" data-tab="muni-stats"><i class="fas fa-chart-line"></i> Estadísticas</button>
  </div>

  <!-- PESTAÑA: ÓRDENES -->
  <div id="tab-muni-ordenes" class="muni-tab-section active">
    <div class="muni-tools">
      <div class="muni-search"><i class="fas fa-search"></i>
        <input type="text" id="muniSearchInput" placeholder="Buscar por expediente, orden de compra u observaciones...">
      </div>
      <select id="muniFiltroEstado" class="muni-filter-select">
        <option value="">Todos los estados</option>
        <option value="Pendiente">Pendiente</option>
        <option value="Pago parcial">Pago parcial</option>
        <option value="Cobrado">Cobrado</option>
      </select>
    </div>
    <div class="muni-table-wrapper">
      <table class="muni-table">
        <thead>
          <tr>
            <th>Número</th>
            <th>Fecha</th>
            <th>Expediente / OC</th>
            <th>Total</th>
            <th>Fecha Est. Cobro</th>
            <th>Estado</th>
            <th>Saldo Pendiente</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="muniTableBody">
          <tr><td colspan="8"><div class="muni-empty"><i class="fas fa-university"></i><p>No hay órdenes registradas</p><small>Hacé clic en "Nueva Orden" para comenzar</small></div></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- PESTAÑA: PRÓXIMOS COBROS -->
  <div id="tab-muni-vencimientos" class="muni-tab-section">
    <div class="muni-table-wrapper">
      <table class="muni-table">
        <thead>
          <tr>
            <th>Fecha Est. Cobro</th>
            <th>Número de Orden</th>
            <th>Expediente / OC</th>
            <th>Total</th>
            <th>Saldo Pendiente</th>
            <th>Días Restantes</th>
          </tr>
        </thead>
        <tbody id="muniVencimientosTableBody">
          <tr><td colspan="6"><div class="muni-empty"><i class="fas fa-calendar-check"></i><p>No hay cobros pendientes</p></div></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- PESTAÑA: ESTADÍSTICAS -->
  <div id="tab-muni-stats" class="muni-tab-section">
    <div class="muni-kpi-grid">
      <div class="muni-kpi-card">
        <div class="muni-kpi-icon blue"><i class="fas fa-file-invoice-dollar"></i></div>
        <div class="muni-kpi-val" id="muniStatTotalVendido">$0,00</div>
        <div class="muni-kpi-label">Total Entregado</div>
      </div>
      <div class="muni-kpi-card">
        <div class="muni-kpi-icon green"><i class="fas fa-hand-holding-usd"></i></div>
        <div class="muni-kpi-val" id="muniStatTotalCobrado">$0,00</div>
        <div class="muni-kpi-label">Total Cobrado</div>
      </div>
      <div class="muni-kpi-card">
        <div class="muni-kpi-icon red"><i class="fas fa-exclamation-circle"></i></div>
        <div class="muni-kpi-val" id="muniStatTotalPendiente">$0,00</div>
        <div class="muni-kpi-label">Total Pendiente</div>
      </div>
    </div>
    <div class="muni-kpi-grid">
      <div class="muni-kpi-card">
        <div class="muni-kpi-icon blue"><i class="fas fa-folder"></i></div>
        <div class="muni-kpi-val" id="muniStatCantOrdenes">0</div>
        <div class="muni-kpi-label">Cantidad de Órdenes</div>
      </div>
      <div class="muni-kpi-card">
        <div class="muni-kpi-icon orange"><i class="fas fa-hourglass-half"></i></div>
        <div class="muni-kpi-val" id="muniStatCantPendientes">0</div>
        <div class="muni-kpi-label">Órdenes Pendientes</div>
      </div>
      <div class="muni-kpi-card">
        <div class="muni-kpi-icon green"><i class="fas fa-check-double"></i></div>
        <div class="muni-kpi-val" id="muniStatCantCobradas">0</div>
        <div class="muni-kpi-label">Órdenes Cobradas</div>
      </div>
    </div>
  </div>
</div>

<!-- MODAL: NUEVA ORDEN -->
<div id="modalMuniOrder" class="modal">
  <div class="modal-content modal-prov-lg">
    <div class="modal-prov-header">
      <h2><i class="fas fa-file-invoice"></i> Nueva Orden - Municipio</h2>
      <button class="modal-close" id="btnCloseMuniOrder"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-prov-body">
      <form id="formMuniOrder" onsubmit="return false;">
        <div class="prov-form-row">
          <div class="prov-form-group">
            <label for="muniOrderFecha">Fecha</label>
            <input type="date" id="muniOrderFecha" required>
          </div>
          <div class="prov-form-group">
            <label for="muniOrderExpediente">N° Expediente (Opcional)</label>
            <input type="text" id="muniOrderExpediente" placeholder="Ej: EXP-45920/2026">
          </div>
          <div class="prov-form-group">
            <label for="muniOrderOC">N° Orden de Compra (Opcional)</label>
            <input type="text" id="muniOrderOC" placeholder="Ej: OC-8122">
          </div>
        </div>
        <div class="prov-form-row">
          <div class="prov-form-group">
            <label for="muniOrderFechaCobro">Fecha Estimada de Cobro</label>
            <input type="date" id="muniOrderFechaCobro" required>
          </div>
          <div class="prov-form-group" style="flex:2;">
            <label for="muniOrderObs">Observaciones de la Entrega</label>
            <input type="text" id="muniOrderObs" placeholder="Ej: Entregado en delegación municipal, firmado por chofer.">
          </div>
        </div>
        
        <div class="sidebar-divider" style="margin:20px 0;"></div>
        
        <!-- Búsqueda de Productos -->
        <div class="muni-search-wrapper">
          <label><i class="fas fa-search"></i> Buscar y Agregar Productos del Inventario</label>
          <input type="text" id="muniProdSearch" placeholder="Escribí código de barra o nombre del producto..." autocomplete="off">
          <div id="muniProdSearchResults" class="muni-search-results"></div>
        </div>
        
        <!-- Listado de Productos Cargados (Carrito) -->
        <div style="overflow-x:auto;">
          <table class="muni-cart-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th style="width:100px; text-align:center;">Cantidad</th>
                <th style="text-align:right;">Precio Venta</th>
                <th style="text-align:right;">Subtotal</th>
                <th style="width:50px; text-align:center;">Acción</th>
              </tr>
            </thead>
            <tbody id="muniOrderCartBody">
              <tr>
                <td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">
                  No hay productos agregados a esta orden. Buscá arriba para agregar.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="muni-cart-total-wrapper">
          Total Orden: <span id="muniOrderCartTotal" style="color:#2563eb; font-size:20px;">$0,00</span>
        </div>
      </form>
    </div>
    <div class="modal-prov-footer">
      <button type="button" class="btn-prov-secondary" id="btnCancelarMuniOrder"><i class="fas fa-times"></i> Cancelar</button>
      <button type="button" class="btn-prov-primary" id="btnGuardarMuniOrder" style="background-color:#3b82f6;"><i class="fas fa-check"></i> Guardar Orden</button>
    </div>
  </div>
</div>

<!-- MODAL: DETALLE ORDEN & HISTORIAL COBROS -->
<div id="modalMuniOrderDetail" class="modal">
  <div class="modal-content modal-prov-lg">
    <div class="modal-prov-header">
      <h2><i class="fas fa-info-circle"></i> Detalle de Orden #<span id="detailMuniOrderId">—</span></h2>
      <button class="modal-close" id="btnCloseMuniOrderDetail"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-prov-body">
      <!-- Tarjeta Resumen -->
      <div class="muni-summary-card">
        <div class="muni-summary-item"><label>Fecha Entrega</label><span id="detailMuniOrderFecha">—</span></div>
        <div class="muni-summary-item"><label>Expediente</label><span id="detailMuniOrderExpediente">—</span></div>
        <div class="muni-summary-item"><label>Orden de Compra</label><span id="detailMuniOrderOC">—</span></div>
        <div class="muni-summary-item"><label>Fecha Est. Cobro</label><span id="detailMuniOrderFechaCobro">—</span></div>
        <div class="muni-summary-item"><label>Estado</label><span id="detailMuniOrderEstado">—</span></div>
      </div>
      
      <div class="prov-form-group" style="margin-bottom:20px;">
        <label style="font-size:11px; font-weight:600; color:#64748b; text-transform:uppercase;">Observaciones Generales</label>
        <div id="detailMuniOrderObs" style="font-size:13.5px; font-weight:500; color:#0f172a; padding:8px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; min-height:30px;">—</div>
      </div>

      <!-- Tabla de Productos Entregados -->
      <h3><i class="fas fa-boxes"></i> Detalle de Mercadería Entregada</h3>
      <div style="overflow-x:auto; margin-bottom:20px;">
        <table class="muni-cart-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th style="text-align:center;">Cantidad</th>
              <th style="text-align:right;">Precio Unitario</th>
              <th style="text-align:right;">Importe</th>
            </tr>
          </thead>
          <tbody id="detailMuniProductsTableBody"></tbody>
        </table>
      </div>
      
      <div class="prov-summary-card" style="grid-template-columns: 1fr 1fr; margin-bottom:25px;">
        <div class="muni-summary-item" style="align-items:flex-start;"><label>Total de la Orden</label><span id="detailMuniOrderTotal" style="font-size:18px;">$0,00</span></div>
        <div class="muni-summary-item" style="align-items:flex-end;"><label>Saldo Pendiente de Cobro</label><span id="detailMuniOrderSaldo" style="font-size:18px; color:#ef4444;">$0,00</span></div>
      </div>

      <!-- Historial de Pagos Recibidos -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <h3><i class="fas fa-history"></i> Historial de Cobros Recibidos</h3>
        <button id="btnRegistrarCobroMuni" class="btn-muni-primary" style="padding: 6px 12px; font-size:12.5px; border-radius:8px;">
          <i class="fas fa-plus"></i> Registrar Cobro
        </button>
      </div>
      <div style="overflow-x:auto;">
        <table class="muni-cart-table">
          <thead>
            <tr>
              <th>Fecha Cobro</th>
              <th>Método de Pago</th>
              <th style="text-align:right;">Monto</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody id="detailMuniPaymentsTableBody"></tbody>
        </table>
      </div>
    </div>
    <div class="modal-prov-footer">
      <button class="btn-prov-secondary" id="btnCerrarMuniOrderDetail"><i class="fas fa-times"></i> Cerrar</button>
    </div>
  </div>
</div>

<!-- MODAL: REGISTRAR COBRO (PAGO DEL MUNICIPIO) -->
<div id="modalMuniPayment" class="modal">
  <div class="modal-content" style="max-width:500px;">
    <div class="modal-prov-header">
      <h2><i class="fas fa-money-bill-wave"></i> Registrar Cobro</h2>
      <button class="modal-close" id="btnCloseMuniPayment"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-prov-body">
      <form id="formMuniPayment" onsubmit="return false;">
        <div class="prov-form-group" style="margin-bottom:12px;">
          <label for="muniPayFecha">Fecha del Cobro</label>
          <input type="date" id="muniPayFecha" required>
        </div>
        <div class="prov-form-group" style="margin-bottom:12px;">
          <label for="muniPayMonto">Monto Recibido</label>
          <input type="number" id="muniPayMonto" step="0.01" min="0.01" required placeholder="0.00">
        </div>
        <div class="prov-form-group" style="margin-bottom:12px;">
          <label for="muniPayMetodo">Método de Pago</label>
          <select id="muniPayMetodo" class="muni-filter-select" style="width:100%; box-sizing:border-box;">
            <option value="Transferencia">Transferencia</option>
            <option value="Cheque">Cheque</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div class="prov-form-group">
          <label for="muniPayObs">Observaciones / Referencia</label>
          <input type="text" id="muniPayObs" placeholder="Ej: Transferencia Banco Provincia Nro: 4958102">
        </div>
      </form>
    </div>
    <div class="modal-prov-footer">
      <button class="btn-prov-secondary" id="btnCancelarMuniPayment"><i class="fas fa-times"></i> Cancelar</button>
      <button class="btn-prov-primary" id="btnGuardarMuniPayment" style="background-color:#3b82f6;"><i class="fas fa-check"></i> Registrar Cobro</button>
    </div>
  </div>
</div>
<!-- Botones flotantes del Modo Teclado (Fase 1) -->
<div class="keyboard-mode-floating-panel">
  <button id="btnKeyboardModeUp" class="keyboard-mode-floating-btn" title="Subir listado">▲</button>
  <button id="btnKeyboardModeToggle" class="keyboard-mode-floating-btn toggle-btn" title="Activar/desactivar modo teclado">●</button>
  <button id="btnKeyboardModeDown" class="keyboard-mode-floating-btn" title="Bajar listado">▼</button>
</div>
`,

  clientes: `
<div class="municipio-page">
  <div class="muni-header">
    <div>
      <h1><i class="fas fa-user-tag"></i> Ventas a Clientes (Cuenta Corriente)</h1>
      <p>Gestión de clientes, ventas a cuenta corriente, próximos cobros y estado de cuentas.</p>
    </div>
    <div style="display:flex; gap:10px;">
      <button id="btnNuevoCliente" class="btn-muni-primary" style="background-color: #059669;">
        <i class="fas fa-user-plus"></i> Nuevo Cliente
      </button>
      <button id="btnNuevaVentaCliente" class="btn-muni-primary">
        <i class="fas fa-plus"></i> Nueva Venta Cta Cte
      </button>
    </div>
  </div>

  <!-- Sub-pestañas -->
  <div class="muni-tabs">
    <button class="cliente-tab-btn active" data-tab="cliente-ventas"><i class="fas fa-file-invoice-dollar"></i> Ventas a Cta Cte</button>
    <button class="cliente-tab-btn" data-tab="cliente-padron"><i class="fas fa-users"></i> Padrón de Clientes</button>
    <button class="cliente-tab-btn" data-tab="cliente-vencimientos"><i class="fas fa-calendar-alt"></i> Próximos Cobros</button>
    <button class="cliente-tab-btn" data-tab="cliente-stats"><i class="fas fa-chart-line"></i> Estadísticas</button>
  </div>

  <!-- PESTAÑA: VENTAS -->
  <div id="tab-cliente-ventas" class="cliente-tab-section active">
    <div class="muni-tools">
      <div class="muni-search"><i class="fas fa-search"></i>
        <input type="text" id="clienteSaleSearchInput" placeholder="Buscar por cliente, comprobante u observaciones...">
      </div>
      <select id="clienteSaleFiltroEstado" class="muni-filter-select">
        <option value="">Todos los estados</option>
        <option value="Pendiente">Pendiente</option>
        <option value="Pago parcial">Pago parcial</option>
        <option value="Cobrado">Cobrado</option>
      </select>
    </div>
    <div class="muni-table-wrapper">
      <table class="muni-table">
        <thead>
          <tr>
            <th>N° Venta</th>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Comprobante / Obs</th>
            <th>Total</th>
            <th>Fecha Est. Cobro</th>
            <th>Estado</th>
            <th>Saldo Pendiente</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="clienteSaleTableBody">
          <tr><td colspan="9"><div class="muni-empty"><i class="fas fa-user-tag"></i><p>No hay ventas registradas</p><small>Hacé clic en "Nueva Venta Cta Cte" para comenzar</small></div></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- PESTAÑA: PADRÓN DE CLIENTES -->
  <div id="tab-cliente-padron" class="cliente-tab-section">
    <div class="muni-tools">
      <div class="muni-search"><i class="fas fa-search"></i>
        <input type="text" id="clienteSearchInput" placeholder="Buscar cliente por nombre, CUIT, teléfono...">
      </div>
    </div>
    <div class="muni-table-wrapper">
      <table class="muni-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre / Razon Social</th>
            <th>Teléfono</th>
            <th>CUIT</th>
            <th>Dirección</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="clientePadronTableBody">
          <tr><td colspan="7"><div class="muni-empty"><i class="fas fa-users"></i><p>No hay clientes registrados</p></div></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- PESTAÑA: PRÓXIMOS COBROS -->
  <div id="tab-cliente-vencimientos" class="cliente-tab-section">
    <div class="muni-table-wrapper">
      <table class="muni-table">
        <thead>
          <tr>
            <th>Fecha Est. Cobro</th>
            <th>N° Venta</th>
            <th>Cliente</th>
            <th>Total Venta</th>
            <th>Saldo Pendiente</th>
            <th>Días Restantes</th>
          </tr>
        </thead>
        <tbody id="clienteVencimientosTableBody">
          <tr><td colspan="6"><div class="muni-empty"><i class="fas fa-calendar-check"></i><p>No hay cobros pendientes</p></div></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- PESTAÑA: ESTADÍSTICAS -->
  <div id="tab-cliente-stats" class="cliente-tab-section">
    <div class="muni-kpi-grid">
      <div class="muni-kpi-card">
        <div class="muni-kpi-icon blue"><i class="fas fa-shopping-cart"></i></div>
        <div class="muni-kpi-val" id="clienteStatTotalVendido">$0,00</div>
        <div class="muni-kpi-label">Total Vendido Cta Cte</div>
      </div>
      <div class="muni-kpi-card">
        <div class="muni-kpi-icon green"><i class="fas fa-hand-holding-usd"></i></div>
        <div class="muni-kpi-val" id="clienteStatTotalCobrado">$0,00</div>
        <div class="muni-kpi-label">Total Cobrado</div>
      </div>
      <div class="muni-kpi-card">
        <div class="muni-kpi-icon red"><i class="fas fa-exclamation-circle"></i></div>
        <div class="muni-kpi-val" id="clienteStatTotalPendiente">$0,00</div>
        <div class="muni-kpi-label">Total Pendiente</div>
      </div>
    </div>
    <div class="muni-kpi-grid" style="margin-top: 15px;">
      <div class="muni-kpi-card">
        <div class="muni-kpi-icon blue"><i class="fas fa-receipt"></i></div>
        <div class="muni-kpi-val" id="clienteStatCantVentas">0</div>
        <div class="muni-kpi-label">Cantidad de Ventas</div>
      </div>
      <div class="muni-kpi-card">
        <div class="muni-kpi-icon orange"><i class="fas fa-hourglass-half"></i></div>
        <div class="muni-kpi-val" id="clienteStatCantPendientes">0</div>
        <div class="muni-kpi-label">Ventas Pendientes</div>
      </div>
      <div class="muni-kpi-card">
        <div class="muni-kpi-icon green"><i class="fas fa-check-double"></i></div>
        <div class="muni-kpi-val" id="clienteStatCantCobradas">0</div>
        <div class="muni-kpi-label">Ventas Cobradas</div>
      </div>
    </div>

    <!-- Ranking de Mayores Deudores -->
    <div style="margin-top: 25px; background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
      <h3><i class="fas fa-crown" style="color: #f59e0b;"></i> Top Clientes con Mayor Deuda Pendiente</h3>
      <div class="muni-table-wrapper" style="margin-top: 15px;">
        <table class="muni-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Teléfono</th>
              <th style="text-align:right;">Saldo Deudor Pendiente</th>
            </tr>
          </thead>
          <tbody id="clienteStatTopDeudoresBody">
            <tr><td colspan="3" style="text-align:center; color:#94a3b8;">No hay deudores pendientes</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<!-- MODAL: CREAR/EDITAR CLIENTE -->
<div id="modalClienteCrud" class="modal">
  <div class="modal-content" style="max-width:550px;">
    <div class="modal-prov-header">
      <h2 id="modalClienteCrudTitle"><i class="fas fa-user-plus"></i> Nuevo Cliente</h2>
      <button class="modal-close" id="btnCloseClienteCrud"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-prov-body">
      <form id="formClienteCrud" onsubmit="return false;">
        <input type="hidden" id="clienteEditId">
        <div class="prov-form-group" style="margin-bottom:12px;">
          <label for="clienteFormNombre">Nombre / Razón Social *</label>
          <input type="text" id="clienteFormNombre" required placeholder="Ej: Juan Pérez / Distribuidora Sur">
        </div>
        <div class="prov-form-row">
          <div class="prov-form-group">
            <label for="clienteFormTelefono">Teléfono</label>
            <input type="text" id="clienteFormTelefono" placeholder="Ej: 11-2345-6789">
          </div>
          <div class="prov-form-group">
            <label for="clienteFormCuit">CUIT / DNI</label>
            <input type="text" id="clienteFormCuit" placeholder="Ej: 20-34567890-9">
          </div>
        </div>
        <div class="prov-form-group" style="margin-bottom:12px;">
          <label for="clienteFormEmail">Email</label>
          <input type="email" id="clienteFormEmail" placeholder="cliente@ejemplo.com">
        </div>
        <div class="prov-form-group" style="margin-bottom:12px;">
          <label for="clienteFormDireccion">Dirección</label>
          <input type="text" id="clienteFormDireccion" placeholder="Av. San Martín 1234">
        </div>
        <div class="prov-form-group">
          <label for="clienteFormObs">Observaciones</label>
          <input type="text" id="clienteFormObs" placeholder="Notas sobre cuenta corriente o entrega">
        </div>
      </form>
    </div>
    <div class="modal-prov-footer">
      <button type="button" class="btn-prov-secondary" id="btnCancelarClienteCrud"><i class="fas fa-times"></i> Cancelar</button>
      <button type="button" class="btn-prov-primary" id="btnGuardarClienteCrud" style="background-color:#059669;"><i class="fas fa-check"></i> Guardar Cliente</button>
    </div>
  </div>
</div>

<!-- MODAL: NUEVA VENTA A CUENTA CORRIENTE -->
<div id="modalClienteSale" class="modal">
  <div class="modal-content modal-prov-lg">
    <div class="modal-prov-header">
      <h2><i class="fas fa-cart-plus"></i> Nueva Venta a Cuenta Corriente</h2>
      <button class="modal-close" id="btnCloseClienteSale"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-prov-body">
      <form id="formClienteSale" onsubmit="return false;">
        <div class="prov-form-row">
          <div class="prov-form-group" style="flex:2;">
            <label for="clienteSaleClienteSelect">Cliente *</label>
            <select id="clienteSaleClienteSelect" class="muni-filter-select" style="width:100%;" required>
              <option value="">Cargando clientes...</option>
            </select>
          </div>
          <div class="prov-form-group">
            <label for="clienteSaleFecha">Fecha Venta</label>
            <input type="date" id="clienteSaleFecha" required>
          </div>
          <div class="prov-form-group">
            <label for="clienteSaleFechaCobro">Fecha Est. Cobro *</label>
            <input type="date" id="clienteSaleFechaCobro" required>
          </div>
        </div>
        <div class="prov-form-row">
          <div class="prov-form-group">
            <label for="clienteSaleComprobante">Comprobante / Remito (Opcional)</label>
            <input type="text" id="clienteSaleComprobante" placeholder="Ej: REM-00491">
          </div>
          <div class="prov-form-group" style="flex:2;">
            <label for="clienteSaleObs">Observaciones</label>
            <input type="text" id="clienteSaleObs" placeholder="Ej: Entregado en obra, pactado pago a 30 días.">
          </div>
        </div>

        <div class="sidebar-divider" style="margin:20px 0;"></div>

        <!-- Búsqueda de Productos -->
        <div class="muni-search-wrapper">
          <label><i class="fas fa-search"></i> Buscar y Agregar Productos del Inventario</label>
          <input type="text" id="clienteProdSearch" placeholder="Escribí código de barra o nombre del producto..." autocomplete="off">
          <div id="clienteProdSearchResults" class="muni-search-results"></div>
        </div>

        <!-- Carrito de Productos -->
        <div style="overflow-x:auto;">
          <table class="muni-cart-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th style="width:100px; text-align:center;">Cantidad</th>
                <th style="text-align:right;">Precio Venta</th>
                <th style="text-align:right;">Subtotal</th>
                <th style="width:50px; text-align:center;">Acción</th>
              </tr>
            </thead>
            <tbody id="clienteSaleCartBody">
              <tr>
                <td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">
                  No hay productos agregados a esta venta. Buscá arriba para agregar.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="muni-cart-total-wrapper">
          Total Venta: <span id="clienteSaleCartTotal" style="color:#2563eb; font-size:20px;">$0,00</span>
        </div>
      </form>
    </div>
    <div class="modal-prov-footer">
      <button type="button" class="btn-prov-secondary" id="btnCancelarClienteSale"><i class="fas fa-times"></i> Cancelar</button>
      <button type="button" class="btn-prov-primary" id="btnGuardarClienteSale" style="background-color:#3b82f6;"><i class="fas fa-check"></i> Confirmar Venta y Descontar Stock</button>
    </div>
  </div>
</div>

<!-- MODAL: DETALLE VENTA Y COBROS -->
<div id="modalClienteSaleDetail" class="modal">
  <div class="modal-content modal-prov-lg">
    <div class="modal-prov-header">
      <h2><i class="fas fa-info-circle"></i> Detalle de Venta #<span id="detailClienteSaleId">—</span></h2>
      <button class="modal-close" id="btnCloseClienteSaleDetail"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-prov-body">
      <div class="muni-summary-card">
        <div class="muni-summary-item"><label>Cliente</label><span id="detailClienteSaleCliente" style="font-weight:700;">—</span></div>
        <div class="muni-summary-item"><label>Fecha Venta</label><span id="detailClienteSaleFecha">—</span></div>
        <div class="muni-summary-item"><label>Fecha Est. Cobro</label><span id="detailClienteSaleFechaCobro">—</span></div>
        <div class="muni-summary-item"><label>Comprobante</label><span id="detailClienteSaleComprobante">—</span></div>
        <div class="muni-summary-item"><label>Estado</label><span id="detailClienteSaleEstado">—</span></div>
      </div>
      
      <div class="prov-form-group" style="margin-bottom:20px;">
        <label style="font-size:11px; font-weight:600; color:#64748b; text-transform:uppercase;">Observaciones</label>
        <div id="detailClienteSaleObs" style="font-size:13.5px; font-weight:500; color:#0f172a; padding:8px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; min-height:30px;">—</div>
      </div>

      <h3><i class="fas fa-boxes"></i> Detalle de Mercadería Entregada</h3>
      <div style="overflow-x:auto; margin-bottom:20px;">
        <table class="muni-cart-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th style="text-align:center;">Cantidad</th>
              <th style="text-align:right;">Precio Unitario</th>
              <th style="text-align:right;">Importe</th>
            </tr>
          </thead>
          <tbody id="detailClienteProductsTableBody"></tbody>
        </table>
      </div>

      <div class="prov-summary-card" style="grid-template-columns: 1fr 1fr; margin-bottom:25px;">
        <div class="muni-summary-item" style="align-items:flex-start;"><label>Total de la Venta</label><span id="detailClienteSaleTotal" style="font-size:18px;">$0,00</span></div>
        <div class="muni-summary-item" style="align-items:flex-end;"><label>Saldo Pendiente de Cobro</label><span id="detailClienteSaleSaldo" style="font-size:18px; color:#ef4444;">$0,00</span></div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <h3><i class="fas fa-history"></i> Historial de Cobros Recibidos</h3>
        <button id="btnRegistrarCobroCliente" class="btn-muni-primary" style="padding: 6px 12px; font-size:12.5px; border-radius:8px;">
          <i class="fas fa-plus"></i> Registrar Cobro
        </button>
      </div>
      <div style="overflow-x:auto;">
        <table class="muni-cart-table">
          <thead>
            <tr>
              <th>Fecha Cobro</th>
              <th>Método de Pago</th>
              <th>Comprobante</th>
              <th style="text-align:right;">Monto</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody id="detailClientePaymentsTableBody"></tbody>
        </table>
      </div>
    </div>
    <div class="modal-prov-footer">
      <button class="btn-prov-secondary" id="btnCerrarClienteSaleDetail"><i class="fas fa-times"></i> Cerrar</button>
    </div>
  </div>
</div>

<!-- MODAL: REGISTRAR COBRO CLIENTE -->
<div id="modalClientePayment" class="modal">
  <div class="modal-content" style="max-width:500px;">
    <div class="modal-prov-header">
      <h2><i class="fas fa-money-bill-wave"></i> Registrar Cobro Cliente</h2>
      <button class="modal-close" id="btnCloseClientePayment"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-prov-body">
      <form id="formClientePayment" onsubmit="return false;">
        <div class="prov-form-group" style="margin-bottom:12px;">
          <label for="clientePayFecha">Fecha del Cobro</label>
          <input type="date" id="clientePayFecha" required>
        </div>
        <div class="prov-form-group" style="margin-bottom:12px;">
          <label for="clientePayMonto">Monto Recibido</label>
          <input type="number" id="clientePayMonto" step="0.01" min="0.01" required placeholder="0.00">
        </div>
        <div class="prov-form-group" style="margin-bottom:12px;">
          <label for="clientePayMetodo">Método de Pago</label>
          <select id="clientePayMetodo" class="muni-filter-select" style="width:100%; box-sizing:border-box;">
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Cheque">Cheque</option>
            <option value="Tarjeta">Tarjeta</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div class="prov-form-group" style="margin-bottom:12px;">
          <label for="clientePayComprobante">Comprobante / Recibo</label>
          <input type="text" id="clientePayComprobante" placeholder="Ej: Recibo N° 0029">
        </div>
        <div class="prov-form-group">
          <label for="clientePayObs">Observaciones</label>
          <input type="text" id="clientePayObs" placeholder="Ej: Depósito Banco Galicia">
        </div>
      </form>
    </div>
    <div class="modal-prov-footer">
      <button class="btn-prov-secondary" id="btnCancelarClientePayment"><i class="fas fa-times"></i> Cancelar</button>
      <button class="btn-prov-primary" id="btnGuardarClientePayment" style="background-color:#3b82f6;"><i class="fas fa-check"></i> Registrar Cobro</button>
    </div>
  </div>
</div>
`,

  atmosferico: `
<div class="municipio-page">
  <div class="muni-header">
    <div>
      <h1><span style="font-size: 24px; margin-right: 8px;">🚛</span> Atmosférico</h1>
      <p>Gestión de servicios realizados y seguimiento de cobros.</p>
    </div>
    <button id="btnNuevoServicioAtmos" class="btn-muni-primary">
      <i class="fas fa-plus"></i> Nuevo Servicio
    </button>
  </div>

  <!-- Sub-pestañas -->
  <div class="muni-tabs">
    <button class="muni-tab-btn active" data-tab="atmos-servicios"><i class="fas fa-truck-pickup"></i> Servicios</button>
    <button class="muni-tab-btn" data-tab="atmos-vencimientos"><i class="fas fa-calendar-alt"></i> Próximos Cobros</button>
    <button class="muni-tab-btn" data-tab="atmos-stats"><i class="fas fa-chart-line"></i> Estadísticas</button>
  </div>

  <!-- PESTAÑA: SERVICIOS -->
  <div id="tab-atmos-servicios" class="muni-tab-section active">
    <div class="muni-tools">
      <div class="muni-search"><i class="fas fa-search"></i>
        <input type="text" id="atmosSearchInput" placeholder="Buscar por cliente, dirección, descripción u observaciones...">
      </div>
      <select id="atmosFiltroEstado" class="muni-filter-select">
        <option value="">Todos los estados</option>
        <option value="Pendiente">Pendiente</option>
        <option value="Pago parcial">Pago parcial</option>
        <option value="Cobrado">Cobrado</option>
      </select>
    </div>
    <div class="muni-table-wrapper">
      <table class="muni-table">
        <thead>
          <tr>
            <th>Número</th>
            <th>Fecha</th>
            <th>Cliente / Organismo</th>
            <th>Dirección</th>
            <th>Descripción</th>
            <th>Total</th>
            <th>Fecha Est. Cobro</th>
            <th>Estado</th>
            <th>Saldo Pendiente</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="atmosTableBody">
          <tr><td colspan="10"><div class="muni-empty">🚛<p>No hay servicios registrados</p><small>Hacé clic en "Nuevo Servicio" para comenzar</small></div></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- PESTAÑA: PRÓXIMOS COBROS -->
  <div id="tab-atmos-vencimientos" class="muni-tab-section">
    <div class="muni-table-wrapper">
      <table class="muni-table">
        <thead>
          <tr>
            <th>Fecha Est. Cobro</th>
            <th>Número</th>
            <th>Cliente / Organismo</th>
            <th>Total</th>
            <th>Saldo Pendiente</th>
            <th>Días Restantes</th>
          </tr>
        </thead>
        <tbody id="atmosVencimientosTableBody">
          <tr><td colspan="6"><div class="muni-empty"><i class="fas fa-calendar-check"></i><p>No hay cobros pendientes</p></div></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- PESTAÑA: ESTADÍSTICAS -->
  <div id="tab-atmos-stats" class="muni-tab-section">
    <div class="muni-kpi-grid">
      <div class="muni-kpi-card">
        <div class="muni-kpi-icon blue"><i class="fas fa-file-invoice-dollar"></i></div>
        <div class="muni-kpi-val" id="atmosStatTotalVendido">$0,00</div>
        <div class="muni-kpi-label">Total Facturado</div>
      </div>
      <div class="muni-kpi-card">
        <div class="muni-kpi-icon green"><i class="fas fa-hand-holding-usd"></i></div>
        <div class="muni-kpi-val" id="atmosStatTotalCobrado">$0,00</div>
        <div class="muni-kpi-label">Total Cobrado</div>
      </div>
      <div class="muni-kpi-card">
        <div class="muni-kpi-icon red"><i class="fas fa-exclamation-circle"></i></div>
        <div class="muni-kpi-val" id="atmosStatTotalPendiente">$0,00</div>
        <div class="muni-kpi-label">Total Pendiente</div>
      </div>
    </div>
    <div class="muni-kpi-grid">
      <div class="muni-kpi-card">
        <div class="muni-kpi-icon blue"><i class="fas fa-folder"></i></div>
        <div class="muni-kpi-val" id="atmosStatCantOrdenes">0</div>
        <div class="muni-kpi-label">Cantidad de Servicios</div>
      </div>
      <div class="muni-kpi-card">
        <div class="muni-kpi-icon orange"><i class="fas fa-hourglass-half"></i></div>
        <div class="muni-kpi-val" id="atmosStatCantPendientes">0</div>
        <div class="muni-kpi-label">Servicios Pendientes</div>
      </div>
      <div class="muni-kpi-card">
        <div class="muni-kpi-icon green"><i class="fas fa-check-double"></i></div>
        <div class="muni-kpi-val" id="atmosStatCantCobradas">0</div>
        <div class="muni-kpi-label">Servicios Cobrados</div>
      </div>
    </div>
  </div>
</div>

<!-- MODAL: NUEVO SERVICIO -->
<div id="modalAtmosOrder" class="modal">
  <div class="modal-content modal-prov-lg" style="max-width: 800px;">
    <div class="modal-prov-header">
      <h2><span style="font-size: 20px; margin-right: 8px;">🚛</span> Nuevo Servicio - Atmosférico</h2>
      <button class="modal-close" id="btnCloseAtmosOrder"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-prov-body" style="padding: 20px;">
      <form id="formAtmosOrder" onsubmit="return false;">
        <div class="prov-form-row" style="display: flex; gap: 16px; margin-bottom: 14px;">
          <div class="prov-form-group" style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
            <label for="atmosOrderFecha" style="font-weight: 600; font-size: 13.5px;">Fecha</label>
            <input type="date" id="atmosOrderFecha" required style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px;">
          </div>
          <div class="prov-form-group" style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
            <label for="atmosOrderCliente" style="font-weight: 600; font-size: 13.5px;">Cliente / Organismo</label>
            <input type="text" id="atmosOrderCliente" required placeholder="Ej: Municipio de Luján / Juan Pérez" style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px;">
          </div>
          <div class="prov-form-group" style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
            <label for="atmosOrderDireccion" style="font-weight: 600; font-size: 13.5px;">Dirección</label>
            <input type="text" id="atmosOrderDireccion" required placeholder="Ej: Av. Constitución 512" style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px;">
          </div>
        </div>
        <div class="prov-form-row" style="display: flex; gap: 16px; margin-bottom: 14px;">
          <div class="prov-form-group" style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
            <label for="atmosOrderTelefono" style="font-weight: 600; font-size: 13.5px;">Teléfono (Opcional)</label>
            <input type="text" id="atmosOrderTelefono" placeholder="Ej: 2323-456789" style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px;">
          </div>
          <div class="prov-form-group" style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
            <label for="atmosOrderTipoServicio" style="font-weight: 600; font-size: 13.5px;">Tipo de servicio</label>
            <select id="atmosOrderTipoServicio" required style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; background: white;">
              <option value="Destape">Destape</option>
              <option value="Desagote">Desagote</option>
              <option value="Limpieza de pozo">Limpieza de pozo</option>
              <option value="Transporte">Transporte</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div id="groupAtmosTipoOtro" class="prov-form-group" style="flex: 1; display: none; flex-direction: column; gap: 6px;">
            <label for="atmosOrderTipoOtro" style="font-weight: 600; font-size: 13.5px;">Especificar Tipo</label>
            <input type="text" id="atmosOrderTipoOtro" placeholder="Ej: Limpieza de cámara séptica" style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px;">
          </div>
        </div>
        <div class="prov-form-row" style="display: flex; gap: 16px; margin-bottom: 14px;">
          <div class="prov-form-group" style="flex: 2; display: flex; flex-direction: column; gap: 6px;">
            <label for="atmosOrderDesc" style="font-weight: 600; font-size: 13.5px;">Descripción</label>
            <input type="text" id="atmosOrderDesc" required placeholder="Ej: Desagote de pozo ciego de 5000 litros." style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px;">
          </div>
          <div class="prov-form-group" style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
            <label for="atmosOrderMonto" style="font-weight: 600; font-size: 13.5px;">Monto total del servicio</label>
            <input type="number" id="atmosOrderMonto" required min="0" step="any" placeholder="Ej: 500000" style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px;">
          </div>
        </div>
        <div class="prov-form-row" style="display: flex; gap: 16px; margin-bottom: 20px;">
          <div class="prov-form-group" style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
            <label for="atmosOrderFechaCobro" style="font-weight: 600; font-size: 13.5px;">Fecha Estimada de Cobro</label>
            <input type="date" id="atmosOrderFechaCobro" required style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px;">
          </div>
          <div class="prov-form-group" style="flex: 2; display: flex; flex-direction: column; gap: 6px;">
            <label for="atmosOrderObs" style="font-weight: 600; font-size: 13.5px;">Observaciones</label>
            <input type="text" id="atmosOrderObs" placeholder="Ej: Requiere factura tipo A. Se cobra en delegación central." style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px;">
          </div>
        </div>
        <div class="modal-prov-footer" style="margin-top:20px; display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" id="btnCancelarAtmosOrder" class="btn-prov-secondary" style="padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; border: 1px solid #cbd5e1; background: white;"><i class="fas fa-times"></i> Cancelar</button>
          <button type="button" id="btnGuardarAtmosOrder" class="btn-prov-primary" style="padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; background: #3b82f6; color: white;"><i class="fas fa-check"></i> Guardar Servicio</button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- MODAL: DETALLE DE SERVICIO -->
<div id="modalAtmosOrderDetail" class="modal">
  <div class="modal-content modal-prov-lg">
    <div class="modal-prov-header">
      <h2>Detalle del Servicio #<span id="detailAtmosOrderId">—</span></h2>
      <button class="modal-close" id="btnCloseAtmosOrderDetail"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-prov-body" style="padding: 20px;">
      <div class="muni-summary-card">
        <div class="muni-summary-item">
          <label>Fecha</label>
          <span id="detailAtmosOrderFecha">—</span>
        </div>
        <div class="muni-summary-item">
          <label>Cliente / Organismo</label>
          <span id="detailAtmosOrderCliente">—</span>
        </div>
        <div class="muni-summary-item">
          <label>Dirección</label>
          <span id="detailAtmosOrderDireccion">—</span>
        </div>
        <div class="muni-summary-item">
          <label>Teléfono</label>
          <span id="detailAtmosOrderTelefono">—</span>
        </div>
      </div>
      
      <div class="muni-summary-card">
        <div class="muni-summary-item">
          <label>Tipo de Servicio</label>
          <span id="detailAtmosOrderTipo">—</span>
        </div>
        <div class="muni-summary-item">
          <label>Descripción</label>
          <span id="detailAtmosOrderDesc">—</span>
        </div>
        <div class="muni-summary-item">
          <label>Fecha Est. Cobro</label>
          <span id="detailAtmosOrderFechaCobro">—</span>
        </div>
        <div class="muni-summary-item">
          <label>Estado</label>
          <span id="detailAtmosOrderEstado">—</span>
        </div>
      </div>

      <div class="muni-summary-card" style="grid-template-columns: 1fr 1fr; background: #f0fdf4;">
        <div class="muni-summary-item">
          <label style="color:#047857;">Monto Total</label>
          <span id="detailAtmosOrderTotal" style="font-size:18px; color:#065f46; font-weight: 800;">—</span>
        </div>
        <div class="muni-summary-item">
          <label style="color:#b91c1c;">Saldo Pendiente</label>
          <span id="detailAtmosOrderSaldo" style="font-size:18px; color:#991b1b; font-weight: 800;">—</span>
        </div>
      </div>

      <div class="muni-summary-card" style="grid-template-columns: 1fr;">
        <div class="muni-summary-item">
          <label>Observaciones</label>
          <span id="detailAtmosOrderObs">—</span>
        </div>
      </div>

      <div style="margin-top:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="margin:0; font-size:15px; font-weight:700; color:#334155;"><i class="fas fa-history"></i> Historial de Cobros</h3>
          <button id="btnRegistrarCobroAtmos" class="btn-muni-primary" style="padding: 6px 12px; font-size: 12.5px;">
            <i class="fas fa-hand-holding-usd"></i> Registrar Cobro
          </button>
        </div>
        <div class="muni-table-wrapper" style="border-radius:12px;">
          <table class="muni-table" style="min-width:100%;">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Método de Pago</th>
                <th style="text-align:right;">Monto</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody id="detailAtmosPaymentsTableBody">
              <tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:15px;">No hay cobros registrados.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="modal-prov-footer" style="margin-top:24px; display:flex; justify-content:flex-end;">
        <button id="btnCerrarAtmosOrderDetail" class="btn-prov-secondary" style="padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; border: 1px solid #cbd5e1; background: white;"><i class="fas fa-times"></i> Cerrar</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL: REGISTRAR COBRO -->
<div id="modalAtmosPayment" class="modal">
  <div class="modal-content" style="max-width: 450px; border-radius: 16px;">
    <div class="modal-prov-header">
      <h2><i class="fas fa-hand-holding-usd"></i> Registrar Cobro</h2>
      <button class="modal-close" id="btnCloseAtmosPayment"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-prov-body" style="padding: 15px;">
      <form id="formAtmosPayment" onsubmit="return false;">
        <div class="prov-form-group" style="margin-bottom:14px; display: flex; flex-direction: column; gap: 6px;">
          <label for="atmosPayFecha" style="font-weight: 600; font-size: 13px;">Fecha del Cobro</label>
          <input type="date" id="atmosPayFecha" required style="padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px;">
        </div>
        <div class="prov-form-group" style="margin-bottom:14px; display: flex; flex-direction: column; gap: 6px;">
          <label for="atmosPayMonto" style="font-weight: 600; font-size: 13px;">Monto a Cobrar</label>
          <input type="number" id="atmosPayMonto" required min="0.01" step="any" style="padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px;">
        </div>
        <div class="prov-form-group" style="margin-bottom:14px; display: flex; flex-direction: column; gap: 6px;">
          <label for="atmosPayMetodo" style="font-weight: 600; font-size: 13px;">Método de Pago</label>
          <select id="atmosPayMetodo" required style="padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; background: white;">
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Cheque">Cheque</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div class="prov-form-group" style="margin-bottom:20px; display: flex; flex-direction: column; gap: 6px;">
          <label for="atmosPayObs" style="font-weight: 600; font-size: 13px;">Observaciones (Opcional)</label>
          <input type="text" id="atmosPayObs" placeholder="Ej: Pago de primera cuota. Cheque N° 48120." style="padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px;">
        </div>
        <div class="modal-prov-footer" style="display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" id="btnCancelarAtmosPayment" class="btn-prov-secondary" style="padding: 8px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; border: 1px solid #cbd5e1; background: white;"><i class="fas fa-times"></i> Cancelar</button>
          <button type="button" id="btnGuardarAtmosPayment" class="btn-prov-primary" style="padding: 8px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; background: #3b82f6; color: white;"><i class="fas fa-check"></i> Guardar Cobro</button>
        </div>
      </form>
    </div>
  </div>
</div>
`,

  maquinas: `
<div class="maquinas-page">
  <!-- Header -->
  <div class="maquinas-header">
    <div class="maquinas-header-left">
      <h1><i class="fas fa-cogs"></i> Máquinas</h1>
      <p>Gestión de maquinaria, trabajos, combustible y mantenimiento</p>
    </div>
    <div class="maquinas-header-right">
      <button id="maqBtnAgregar" class="btn-maq-primary">
        <i class="fas fa-plus"></i> Agregar Máquina
      </button>
    </div>
  </div>

  <!-- Tabs -->
  <div class="maquinas-tabs">
    <button class="maquinas-tab-btn active" data-tab="lista"><i class="fas fa-list"></i> Máquinas</button>
    <button class="maquinas-tab-btn" data-tab="trabajos"><i class="fas fa-clock"></i> Trabajos</button>
    <button class="maquinas-tab-btn" data-tab="combustible"><i class="fas fa-gas-pump"></i> Combustible</button>
    <button class="maquinas-tab-btn" data-tab="mantenimiento"><i class="fas fa-wrench"></i> Mantenimiento</button>
    <button class="maquinas-tab-btn" data-tab="estadisticas"><i class="fas fa-chart-bar"></i> Estadísticas</button>
    <button class="maquinas-tab-btn" data-tab="rentabilidad"><i class="fas fa-dollar-sign"></i> Rentabilidad</button>
  </div>

  <!-- ── TAB: LISTA ── -->
  <div class="maquinas-tab-section active" id="maq-tab-lista">
    <div class="maquinas-toolbar">
      <div class="maquinas-search">
        <i class="fas fa-search"></i>
        <input type="text" id="maqSearchInput" placeholder="Buscar máquina...">
      </div>
      <select id="maqFilterEstado" class="maquinas-filter-select">
        <option value="">Todos los estados</option>
        <option value="Disponible">Disponible</option>
        <option value="En uso">En uso</option>
        <option value="En mantenimiento">En mantenimiento</option>
        <option value="Fuera de servicio">Fuera de servicio</option>
      </select>
    </div>
    <div class="maquinas-table-wrapper">
      <table class="maquinas-table">
        <thead>
          <tr>
            <th data-sort="id">#</th>
            <th data-sort="nombre">Nombre</th>
            <th data-sort="tipo">Tipo</th>
            <th data-sort="marca">Marca</th>
            <th data-sort="modelo">Modelo</th>
            <th data-sort="estado">Estado</th>
            <th data-sort="horas_totales">Horas</th>
            <th data-sort="precio_hora">$ / Hora</th>
            <th data-sort="ultimo_servicio">Último Serv.</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="maqTableBody">
          <tr><td colspan="10" class="maq-empty"><i class="fas fa-cogs"></i><p>Cargando...</p></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ── TAB: TRABAJOS ── -->
  <div class="maquinas-tab-section" id="maq-tab-trabajos">
    <div class="maquinas-form-card">
      <h3><i class="fas fa-plus-circle"></i> Registrar Trabajo</h3>
      <div class="maq-form-grid">
        <div class="maq-field">
          <label>Fecha *</label>
          <input type="date" id="trabFecha">
        </div>
        <div class="maq-field">
          <label>Máquina *</label>
          <select id="trabMaquinaId"></select>
        </div>
        <div class="maq-field">
          <label>Cliente</label>
          <input type="text" id="trabCliente" placeholder="Nombre del cliente">
        </div>
        <div class="maq-field">
          <label>Operador</label>
          <input type="text" id="trabOperador" placeholder="Nombre del operador">
        </div>
        <div class="maq-field">
          <label>Hora de inicio</label>
          <input type="time" id="trabHoraInicio">
        </div>
        <div class="maq-field">
          <label>Hora de fin</label>
          <input type="time" id="trabHoraFin">
        </div>
        <div class="maq-field">
          <label>Horas trabajadas *</label>
          <input type="number" id="trabHoras" min="0" step="0.5" placeholder="0.0">
        </div>
        <div class="maq-field">
          <label>Precio por hora ($)</label>
          <input type="number" id="trabPrecioHora" min="0" step="0.01" placeholder="0.00">
        </div>
        <div class="maq-field">
          <label>Total generado ($)</label>
          <input type="text" id="trabTotal" class="maq-calculated" readonly placeholder="Calculado automáticamente">
        </div>
      </div>
      <div class="maq-form-grid full">
        <div class="maq-field">
          <label>Observaciones</label>
          <textarea id="trabObservaciones" placeholder="Notas del trabajo..."></textarea>
        </div>
      </div>
      <button id="maqBtnGuardarTrabajo" class="btn-maq-primary"><i class="fas fa-save"></i> Guardar Trabajo</button>
    </div>
    <div class="maquinas-table-wrapper">
      <table class="maquinas-table">
        <thead>
          <tr>
            <th>Fecha</th><th>Máquina</th><th>Cliente</th><th>Operador</th>
            <th>Inicio</th><th>Fin</th><th>Horas</th><th>$/h</th><th>Total</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody id="trabTableBody">
          <tr><td colspan="10" class="maq-empty"><i class="fas fa-clock"></i><p>Sin trabajos registrados</p></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ── TAB: COMBUSTIBLE ── -->
  <div class="maquinas-tab-section" id="maq-tab-combustible">
    <div class="maq-fuel-summary" id="maqFuelSummary">
      <div class="maq-fuel-card">
        <i class="fas fa-tint"></i>
        <div><div class="maq-fuel-val" id="fuelLitrosCargados">0 L</div><div class="maq-fuel-lbl">Litros cargados</div></div>
      </div>
      <div class="maq-fuel-card">
        <i class="fas fa-fire"></i>
        <div><div class="maq-fuel-val" id="fuelLitrosConsumidos">0 L</div><div class="maq-fuel-lbl">Litros consumidos (estimado)</div></div>
      </div>
      <div class="maq-fuel-card">
        <i class="fas fa-money-bill-wave"></i>
        <div><div class="maq-fuel-val" id="fuelCostoTotal">$0</div><div class="maq-fuel-lbl">Costo total combustible</div></div>
      </div>
    </div>
    <div class="maquinas-form-card">
      <h3><i class="fas fa-gas-pump"></i> Registrar Carga de Combustible</h3>
      <div class="maq-form-grid">
        <div class="maq-field">
          <label>Fecha *</label>
          <input type="date" id="combFecha">
        </div>
        <div class="maq-field">
          <label>Máquina *</label>
          <select id="combMaquinaId"></select>
        </div>
        <div class="maq-field">
          <label>Litros cargados *</label>
          <input type="number" id="combLitros" min="0" step="0.1" placeholder="0.0">
        </div>
        <div class="maq-field">
          <label>Precio por litro ($)</label>
          <input type="number" id="combPrecioLitro" min="0" step="0.01" placeholder="0.00">
        </div>
        <div class="maq-field">
          <label>Importe total ($)</label>
          <input type="text" id="combTotal" class="maq-calculated" readonly placeholder="Calculado automáticamente">
        </div>
      </div>
      <div class="maq-form-grid full">
        <div class="maq-field">
          <label>Observaciones</label>
          <textarea id="combObservaciones" placeholder="Notas de la carga..."></textarea>
        </div>
      </div>
      <button id="maqBtnGuardarComb" class="btn-maq-primary"><i class="fas fa-save"></i> Guardar Carga</button>
    </div>
    <div class="maquinas-table-wrapper">
      <table class="maquinas-table">
        <thead>
          <tr><th>Fecha</th><th>Máquina</th><th>Litros</th><th>$ / L</th><th>Total</th><th>Obs.</th><th>Acciones</th></tr>
        </thead>
        <tbody id="combTableBody">
          <tr><td colspan="7" class="maq-empty"><i class="fas fa-gas-pump"></i><p>Sin cargas registradas</p></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ── TAB: MANTENIMIENTO ── -->
  <div class="maquinas-tab-section" id="maq-tab-mantenimiento">
    <div class="maquinas-form-card">
      <h3><i class="fas fa-tools"></i> Registrar Mantenimiento</h3>
      <div class="maq-form-grid">
        <div class="maq-field">
          <label>Fecha *</label>
          <input type="date" id="mantFecha">
        </div>
        <div class="maq-field">
          <label>Máquina *</label>
          <select id="mantMaquinaId"></select>
        </div>
        <div class="maq-field">
          <label>Tipo de mantenimiento</label>
          <select id="mantTipo">
            <option value="Preventivo">Preventivo</option>
            <option value="Correctivo">Correctivo</option>
            <option value="Cambio de aceite">Cambio de aceite</option>
            <option value="Revisión general">Revisión general</option>
            <option value="Reparación">Reparación</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div class="maq-field">
          <label>Costo ($)</label>
          <input type="number" id="mantCosto" min="0" step="0.01" placeholder="0.00">
        </div>
        <div class="maq-field">
          <label>Estado</label>
          <select id="mantEstado">
            <option value="Realizado">Realizado</option>
            <option value="Pendiente">Pendiente</option>
          </select>
        </div>
        <div class="maq-field">
          <label>Próximo mantenimiento</label>
          <input type="date" id="mantProximo">
        </div>
      </div>
      <div class="maq-form-grid full">
        <div class="maq-field">
          <label>Descripción</label>
          <textarea id="mantDescripcion" placeholder="Descripción del mantenimiento..."></textarea>
        </div>
        <div class="maq-field">
          <label>Observaciones</label>
          <textarea id="mantObservaciones" placeholder="Notas adicionales..."></textarea>
        </div>
      </div>
      <button id="maqBtnGuardarMant" class="btn-maq-primary"><i class="fas fa-save"></i> Guardar Mantenimiento</button>
    </div>
    <div class="maquinas-table-wrapper">
      <table class="maquinas-table">
        <thead>
          <tr><th>Fecha</th><th>Máquina</th><th>Tipo</th><th>Descripción</th><th>Costo</th><th>Próximo</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody id="mantTableBody">
          <tr><td colspan="8" class="maq-empty"><i class="fas fa-wrench"></i><p>Sin mantenimientos registrados</p></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ── TAB: ESTADÍSTICAS ── -->
  <div class="maquinas-tab-section" id="maq-tab-estadisticas">
    <div class="maquinas-kpi-grid" id="maqKpiGrid">
      <div class="maquinas-kpi-card"><div class="maquinas-kpi-icon orange"><i class="fas fa-cogs"></i></div><div><div class="maquinas-kpi-value" id="kpiTotalMaq">—</div><div class="maquinas-kpi-label">Total máquinas</div></div></div>
      <div class="maquinas-kpi-card"><div class="maquinas-kpi-icon green"><i class="fas fa-check-circle"></i></div><div><div class="maquinas-kpi-value" id="kpiDisponibles">—</div><div class="maquinas-kpi-label">Disponibles</div></div></div>
      <div class="maquinas-kpi-card"><div class="maquinas-kpi-icon blue"><i class="fas fa-clock"></i></div><div><div class="maquinas-kpi-value" id="kpiHorasMes">—</div><div class="maquinas-kpi-label">Horas este mes</div></div></div>
      <div class="maquinas-kpi-card"><div class="maquinas-kpi-icon green"><i class="fas fa-dollar-sign"></i></div><div><div class="maquinas-kpi-value" id="kpiIngresosMes">—</div><div class="maquinas-kpi-label">Ingresos del mes</div></div></div>
      <div class="maquinas-kpi-card"><div class="maquinas-kpi-icon amber"><i class="fas fa-gas-pump"></i></div><div><div class="maquinas-kpi-value" id="kpiGastoComb">—</div><div class="maquinas-kpi-label">Gasto combustible</div></div></div>
      <div class="maquinas-kpi-card"><div class="maquinas-kpi-icon red"><i class="fas fa-tools"></i></div><div><div class="maquinas-kpi-value" id="kpiGastoMant">—</div><div class="maquinas-kpi-label">Gasto mantenimiento</div></div></div>
      <div class="maquinas-kpi-card"><div class="maquinas-kpi-icon violet"><i class="fas fa-trophy"></i></div><div><div class="maquinas-kpi-value" id="kpiMasUtilizada" style="font-size:15px">—</div><div class="maquinas-kpi-label">Más utilizada</div></div></div>
      <div class="maquinas-kpi-card"><div class="maquinas-kpi-icon orange"><i class="fas fa-star"></i></div><div><div class="maquinas-kpi-value" id="kpiMasRentable" style="font-size:15px">—</div><div class="maquinas-kpi-label">Más rentable</div></div></div>
    </div>
    <div class="maquinas-charts-grid">
      <div class="maq-chart-card">
        <div class="maq-chart-title">Ingresos por máquina</div>
        <div class="maq-chart-subtitle">Total facturado por unidad</div>
        <canvas id="maqChartIngresos" height="240"></canvas>
      </div>
      <div class="maq-chart-card">
        <div class="maq-chart-title">Horas trabajadas por mes</div>
        <div class="maq-chart-subtitle">Últimos 6 meses</div>
        <canvas id="maqChartHoras" height="240"></canvas>
      </div>
    </div>
  </div>

  <!-- ── TAB: RENTABILIDAD ── -->
  <div class="maquinas-tab-section" id="maq-tab-rentabilidad">
    <div class="maq-profit-header">
      <span>Máquina</span>
      <span>Ingresos</span>
      <span>Combustible</span>
      <span>Mantenimiento</span>
      <span>Ganancia neta</span>
    </div>
    <div class="maq-profit-grid" id="maqProfitGrid">
      <div style="text-align:center;padding:40px;color:#94a3b8"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>
    </div>
  </div>

  <!-- Toast del módulo -->
  <div id="maq-toast"></div>

  <!-- Modal detalle máquina -->
  <div class="maq-detail-overlay" id="maqDetailOverlay">
    <div class="maq-detail-modal" id="maqDetailModal">
      <div class="maq-detail-header">
        <div>
          <h2 id="maqDetailNombre">—</h2>
          <p id="maqDetailSubtitle">—</p>
        </div>
        <button class="maq-detail-close" id="maqDetailClose"><i class="fas fa-times"></i></button>
      </div>
      <div class="maq-detail-body">
        <div class="maq-detail-info-grid" id="maqDetailInfo"></div>
        <div class="maq-detail-section" id="maqDetailTrabajos"></div>
      </div>
    </div>
  </div>

  <!-- Modal agregar/editar máquina -->
  <div class="maq-detail-overlay" id="maqFormOverlay">
    <div class="maq-detail-modal">
      <div class="maq-detail-header">
        <div>
          <h2 id="maqFormTitle">Agregar Máquina</h2>
          <p>Complete los datos de la máquina</p>
        </div>
        <button class="maq-detail-close" id="maqFormClose"><i class="fas fa-times"></i></button>
      </div>
      <div class="maq-detail-body">
        <div class="maq-form-grid">
          <div class="maq-field"><label>Nombre *</label><input type="text" id="fNombre" placeholder="Ej: Tractor John Deere"></div>
          <div class="maq-field"><label>Tipo</label><input type="text" id="fTipo" placeholder="Ej: Tractor, Cosechadora..."></div>
          <div class="maq-field"><label>Marca</label><input type="text" id="fMarca" placeholder="Ej: John Deere"></div>
          <div class="maq-field"><label>Modelo</label><input type="text" id="fModelo" placeholder="Ej: 6110B"></div>
          <div class="maq-field"><label>Año</label><input type="number" id="fAnio" placeholder="Ej: 2020" min="1900" max="2100"></div>
          <div class="maq-field"><label>N° de serie</label><input type="text" id="fSerie" placeholder="Opcional"></div>
          <div class="maq-field"><label>Precio por hora ($)</label><input type="number" id="fPrecioHora" min="0" step="0.01" placeholder="0.00"></div>
          <div class="maq-field"><label>Consumo L/hora</label><input type="number" id="fConsumoHora" min="0" step="0.1" placeholder="0.0"></div>
          <div class="maq-field"><label>Estado</label>
            <select id="fEstado">
              <option value="Disponible">Disponible</option>
              <option value="En uso">En uso</option>
              <option value="En mantenimiento">En mantenimiento</option>
              <option value="Fuera de servicio">Fuera de servicio</option>
            </select>
          </div>
          <div class="maq-field"><label>Último servicio</label><input type="date" id="fUltimoServicio"></div>
        </div>
        <div class="maq-form-grid full">
          <div class="maq-field"><label>Observaciones</label><textarea id="fObservaciones" placeholder="Notas sobre la máquina..."></textarea></div>
        </div>
        <input type="hidden" id="fId">
        <div style="display:flex;gap:12px;margin-top:8px">
          <button id="maqFormCancel" class="btn-maq-secondary" style="flex:1"><i class="fas fa-times"></i> Cancelar</button>
          <button id="maqFormSave" class="btn-maq-primary" style="flex:2"><i class="fas fa-save"></i> Guardar Máquina</button>
        </div>
      </div>
    </div>
  </div>
</div>
`

  };


  // Configuración de los modales de doble confirmación (se ejecuta una sola vez)
  const modalStep1 = document.getElementById('modalDeleteAllStep1');
  const modalStep2 = document.getElementById('modalDeleteAllStep2');
  const btnYes1 = document.getElementById('btnYesDelete1');
  const btnNo1 = document.getElementById('btnNoDelete1');
  const btnYes2 = document.getElementById('btnYesDelete2');
  const btnNo2 = document.getElementById('btnNoDelete2');

  if (btnYes1) {
    btnYes1.addEventListener('click', () => {
      if (modalStep1) modalStep1.classList.remove('active');
      if (modalStep2) modalStep2.classList.add('active');
    });
  }

  if (btnNo1) {
    btnNo1.addEventListener('click', () => {
      if (modalStep1) modalStep1.classList.remove('active');
    });
  }

  if (btnNo2) {
    btnNo2.addEventListener('click', () => {
      if (modalStep2) modalStep2.classList.remove('active');
    });
  }

  if (btnYes2) {
    btnYes2.addEventListener('click', async () => {
      if (modalStep2) modalStep2.classList.remove('active');
      try {
        const res = await window.electronAPI.deleteAllProducts();
        if (res && res.success) {
          // Si estamos en inventario, recargar
          if (typeof window.__inventoryLoadProducts === 'function') {
            await window.__inventoryLoadProducts();
          } else {
            // Recarga genérica o alert
            location.reload();
          }
          mostrarToast('Todos los productos han sido eliminados', 'success');
        } else {
          mostrarToast('No se pudieron eliminar los productos', 'error');
        }
      } catch (err) {
        console.error('Error eliminando todos los productos:', err);
        mostrarToast('Error al eliminar productos', 'error');
      }
    });
  }

  // Navegación
  // Navegación - con bandera para evitar reinicios múltiples
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;

      const restrictedPages = ['dashboard', 'informes', 'historial', 'empleados-liquidacion'];
      const rawRole = (window.currentUserProfile?.role || window.currentUserProfile?.rol || 'empleado').toLowerCase();
      const isAdmin = rawRole === 'admin' || rawRole === 'master admin' || rawRole === 'administrador';

      if (restrictedPages.includes(page) && !isAdmin) {
        alert('Acceso denegado. Se requieren permisos de administrador para este módulo.');
        return;
      }

      // Si es la misma página, no hacer nada
      if (content.dataset.currentPage === page) return;

      // Actualizar contenido
      content.innerHTML = pages[page] || '<h1>Página no encontrada</h1>';
      content.dataset.currentPage = page;

      // Mostrar/ocultar topbar solo en inventario
      const topbar = document.querySelector('.topbar');
      if (page === 'inventario') {
        topbar.style.display = 'flex';
      } else {
        topbar.style.display = 'none';
      }

      // Mostrar/ocultar carrito flotante solo en inventario
      const cartFloatingNav = document.getElementById('cartFloating');
      if (cartFloatingNav) {
        cartFloatingNav.style.display = page === 'inventario' ? 'flex' : 'none';
      }

      // 🔴 IMPORTANTE: Resetear bandera de inventario cuando NO es inventario
      if (page !== 'inventario') {
        window.__inventarioInicializado = false;
      }

      // Inicializar la página correspondiente
      if (page === 'inventario') {
        initInventario();
      }
      if (page === 'dashboard') initFinanzas();
      if (page === 'historial') initHistorial();
      if (page === 'informes') initInformes();
      if (page === 'empleados') initEmpleados();
            if (page === 'proveedores') initProveedores();
      if (page === 'maquinas') initMaquinas();
      if (page === 'empleados-liquidacion') initEmpleadosLiquidacion();
      if (page === 'municipio') initMunicipio();
      if (page === 'clientes') initClientes();
      if (page === 'atmosferico') initAtmosferico();
      if (page === 'gastos') initGastos();
      if (page === 'ajustes-caja') initAjustesCaja();
    });
  });

  // =====================================================================
  // Módulo de Proveedores
  // =====================================================================
  function initProveedores() {
    let allProveedores = [];
    let provEditandoId = null;
    let sortCol = 'razon_social';
    let sortDir = 'asc';
    let provChartInstance = null;

    // Helpers
    const $ = (id) => document.getElementById(id);
    const fmt = (v) => (v || '—');
    const fmtFecha = (f) => { if (!f) return '—'; const [y,m,d]=f.split('-'); return `${d}/${m}/${y}`; };
    const fmtPeso = (n) => {
      const v = parseFloat(n) || 0;
      return v === 0 ? '$0,00' : `$${v.toLocaleString('es-AR', {minimumFractionDigits:2,maximumFractionDigits:2})}`;
    };
    const diasHasta = (fecha) => {
      if (!fecha) return null;
      const hoy = new Date(); hoy.setHours(0,0,0,0);
      const vto = new Date(fecha + 'T00:00:00');
      return Math.round((vto - hoy) / 86400000);
    };
    const showNotif = (msg, type='success') => {
      const notif = document.getElementById('notification') || document.querySelector('.notification') || document.querySelector('[id*="notif"]');
      if (notif) { notif.textContent=msg; notif.className=`notification ${type} show`; setTimeout(()=>notif.classList.remove('show'),3200); }
    };
            const badgeProv = (est) => {
      const k = (est||'').toLowerCase().replace(/\s+/g,'');
      const map = {activo:'activo',inactivo:'inactivo',pagado:'pagado',pendiente:'pendiente','parcialmentepagado':'parcial',parcial:'parcial',compra:'compra',pago:'pago',ajuste:'ajuste',pagodedeuda:'pagado',deudacancelada:'pagado'};
      return `<span class="prov-badge ${map[k]||k}">${est||'—'}</span>`;
    };

    // ── Tabs ──────────────────────────────────────────────
    const tabBtns = document.querySelectorAll('.prov-tab-btn');
    const tabSections = document.querySelectorAll('.prov-tab-section');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b=>b.classList.remove('active'));
        tabSections.forEach(s=>s.classList.remove('active'));
        btn.classList.add('active');
        const sec = document.getElementById('tab-' + btn.dataset.tab);
        if (sec) sec.classList.add('active');
        if (btn.dataset.tab==='registrar-compra') populateProvSelect('compraProveedorId');
        if (btn.dataset.tab==='registrar-pago') populateProvSelect('pagoProveedorId');
        if (btn.dataset.tab==='vencimientos') cargarVencimientos();
        if (btn.dataset.tab==='estadisticas-prov') renderEstadisticasProv();
      });
    });

    // ── PROVEEDORES: Cargar y renderizar ─────────────────
    async function cargarProveedores() {
      try { allProveedores = await window.electronAPI.getSuppliers(); }
      catch(e) { allProveedores=[]; }
      renderProveedores();
    }

    function renderProveedores(lista) {
      const tbody = $('provTableBody');
      if (!tbody) return;
      let src = lista || allProveedores;

      // Ordenamiento
      src = [...src].sort((a,b) => {
        let av = a[sortCol] ?? '', bv = b[sortCol] ?? '';
        if (typeof av === 'number') return sortDir==='asc' ? av-bv : bv-av;
        return sortDir==='asc' ? String(av).localeCompare(String(bv),'es') : String(bv).localeCompare(String(av),'es');
      });

      if (!src.length) {
        tbody.innerHTML = `<tr><td colspan="10"><div class="prov-empty"><i class="fas fa-truck"></i><p>No hay proveedores registrados</p><small>Hacé clic en "Agregar Proveedor" para comenzar</small></div></td></tr>`;
        return;
      }

      tbody.innerHTML = src.map(p => {
        const deuda = parseFloat(p.deuda_actual) || 0;
        const deudaClass = deuda > 50000 ? 'prov-deuda-alta' : deuda > 0 ? 'prov-deuda-media' : 'prov-deuda-ok';
        return `<tr>
          <td><strong>#${p.id}</strong></td>
          <td><strong>${p.razon_social}</strong>${p.cuit ? `<br><small style="color:#94a3b8;">${p.cuit}</small>` : ''}</td>
          <td>${fmt(p.contacto)}</td>
          <td>${fmt(p.telefono)}</td>
          <td style="font-size:12px;">${fmt(p.email)}</td>
          <td>${p.ciudad ? `${p.ciudad}${p.provincia?', '+p.provincia:''}` : '—'}</td>
          <td class="${deudaClass}">${fmtPeso(deuda)}</td>
          <td>${fmtFecha(p.ultima_compra)}</td>
          <td>${badgeProv(p.estado)}</td>
          <td>
            <div class="prov-action-btns">
              <button class="prov-btn-icon account" title="Ver cuenta corriente" data-action="cc" data-id="${p.id}"><i class="fas fa-file-invoice-dollar"></i></button>
              <button class="prov-btn-icon edit" title="Editar" data-action="edit" data-id="${p.id}"><i class="fas fa-pen"></i></button>
              <button class="prov-btn-icon delete" title="Eliminar" data-action="delete" data-id="${p.id}"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
      }).join('');

      tbody.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.dataset.id);
          const prov = allProveedores.find(p=>p.id===id);
          if (!prov) return;
          if (btn.dataset.action==='cc') openCuentaCorriente(prov);
          if (btn.dataset.action==='edit') openProvModal(prov);
          if (btn.dataset.action==='delete') deleteProveedor(prov);
        });
      });

      // Ordenamiento por columna
      document.querySelectorAll('.prov-table th[data-col]').forEach(th => {
        th.addEventListener('click', () => {
          const col = th.dataset.col;
          if (sortCol===col) sortDir = sortDir==='asc'?'desc':'asc';
          else { sortCol=col; sortDir='asc'; }
          document.querySelectorAll('.prov-table th').forEach(h=>h.classList.remove('sorted'));
          th.classList.add('sorted');
          renderProveedores();
        });
      });
    }

    function applyFiltrosProv() {
      const q = ($('provSearchInput')?.value||'').toLowerCase();
      const est = $('provFiltroEstado')?.value||'';
      const deudaFiltro = $('provFiltroDeuda')?.value||'';
      const filtered = allProveedores.filter(p => {
        const matchQ = !q || `${p.razon_social} ${p.contacto||''} ${p.cuit||''} ${p.ciudad||''} ${p.email||''}`.toLowerCase().includes(q);
        const matchEst = !est || p.estado===est;
        const deuda = parseFloat(p.deuda_actual)||0;
        const matchDeuda = !deudaFiltro || (deudaFiltro==='con-deuda'?deuda>0:deuda<=0);
        return matchQ && matchEst && matchDeuda;
      });
      renderProveedores(filtered);
    }

    $('provSearchInput')?.addEventListener('input', applyFiltrosProv);
    $('provFiltroEstado')?.addEventListener('change', applyFiltrosProv);
    $('provFiltroDeuda')?.addEventListener('change', applyFiltrosProv);

    // ── MODAL PROVEEDOR ───────────────────────────────────
    function openProvModal(prov=null) {
      provEditandoId = prov ? prov.id : null;
      $('modalProvTitle').textContent = prov ? 'Editar Proveedor' : 'Agregar Proveedor';
      ['provRazonSocial','provContacto','provTelefono','provEmail','provCuit','provDireccion','provCiudad','provProvincia','provObservaciones'].forEach(id=>{ const el=$(id); if(el) el.value=''; });
      ['errProvRazonSocial','errProvEmail'].forEach(id=>{ const el=$(id); if(el) el.classList.remove('visible'); });
      ['provRazonSocial','provEmail'].forEach(id=>{ const el=$(id); if(el) el.classList.remove('error'); });

      if (prov) {
        $('provRazonSocial').value = prov.razon_social||'';
        if($('provContacto')) $('provContacto').value = prov.contacto||'';
        if($('provTelefono')) $('provTelefono').value = prov.telefono||'';
        if($('provEmail')) $('provEmail').value = prov.email||'';
        if($('provCuit')) $('provCuit').value = prov.cuit||'';
        if($('provDireccion')) $('provDireccion').value = prov.direccion||'';
        if($('provCiudad')) $('provCiudad').value = prov.ciudad||'';
        if($('provProvincia')) $('provProvincia').value = prov.provincia||'';
        if($('provEstado')) $('provEstado').value = prov.estado||'Activo';
        if($('provObservaciones')) $('provObservaciones').value = prov.observaciones||'';
      }
      $('modalProveedor').classList.add('active');
    }

    const closeProvModal = () => $('modalProveedor')?.classList.remove('active');
    $('btnCloseModalProv')?.addEventListener('click', closeProvModal);
    $('btnCancelProv')?.addEventListener('click', closeProvModal);
    $('modalProveedor')?.addEventListener('click', e=>{ if(e.target===$('modalProveedor')) closeProvModal(); });
    $('btnAgregarProveedor')?.addEventListener('click', ()=>openProvModal());

    $('btnGuardarProv')?.addEventListener('click', async () => {
      let valid = true;
      const razonSocial = $('provRazonSocial')?.value.trim();
      const email = $('provEmail')?.value.trim();

      if (!razonSocial) { $('errProvRazonSocial')?.classList.add('visible'); $('provRazonSocial')?.classList.add('error'); valid=false; }
      else { $('errProvRazonSocial')?.classList.remove('visible'); $('provRazonSocial')?.classList.remove('error'); }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $('errProvEmail')?.classList.add('visible'); $('provEmail')?.classList.add('error'); valid=false; }
      else { $('errProvEmail')?.classList.remove('visible'); $('provEmail')?.classList.remove('error'); }

      if (!valid) return;

      const data = {
        id: provEditandoId,
        razon_social: razonSocial,
        contacto: $('provContacto')?.value.trim()||null,
        telefono: $('provTelefono')?.value.trim()||null,
        email: email||null,
        cuit: $('provCuit')?.value.trim()||null,
        direccion: $('provDireccion')?.value.trim()||null,
        ciudad: $('provCiudad')?.value.trim()||null,
        provincia: $('provProvincia')?.value.trim()||null,
        estado: $('provEstado')?.value||'Activo',
        observaciones: $('provObservaciones')?.value.trim()||null
      };

      try {
        const fn = provEditandoId ? window.electronAPI.updateSupplier : window.electronAPI.addSupplier;
        const res = await fn(data);
        if (res.success) {
          closeProvModal();
          showNotif(provEditandoId ? '✅ Proveedor actualizado' : '✅ Proveedor agregado correctamente');
          await cargarProveedores();
        } else { showNotif(res.error||'Error al guardar', 'error'); }
      } catch(e) { showNotif('Error inesperado', 'error'); }
    });

    async function deleteProveedor(prov) {
      if (!confirm(`¿Eliminar al proveedor "${prov.razon_social}"?\n\nSe eliminarán también todas sus compras, pagos y cuenta corriente.`)) return;
      try {
        const res = await window.electronAPI.deleteSupplier(prov.id);
        if (res.success) { showNotif('✅ Proveedor eliminado'); await cargarProveedores(); }
        else showNotif(res.error||'Error al eliminar', 'error');
      } catch(e) { showNotif('Error inesperado', 'error'); }
    }

    // ── CUENTA CORRIENTE MODAL ────────────────────────────
    async function openCuentaCorriente(prov) {
      $('modalCCTitle').textContent = `Cuenta Corriente — ${prov.razon_social}`;
      $('ccProvNombre').textContent = prov.razon_social;
      $('ccProvCuit').textContent = prov.cuit||'—';
      $('ccProvTel').textContent = prov.telefono||'—';

      try {
        const rows = await window.electronAPI.getCurrentAccount(prov.id);
        const saldoFinal = rows.length ? rows[rows.length-1].saldo_acumulado : 0;
        const ccDeudaEl = $('ccDeudaActual');
        if (ccDeudaEl) {
          ccDeudaEl.textContent = fmtPeso(Math.max(0,saldoFinal));
          ccDeudaEl.style.color = saldoFinal > 0 ? '#ef4444' : '#10b981';
        }

        const tbody = $('ccTableBody');
        if (!tbody) return;

        if (!rows.length) {
          tbody.innerHTML = `<tr><td colspan="8"><div class="prov-empty"><i class="fas fa-file-invoice"></i><p>Sin movimientos registrados</p></div></td></tr>`;
        } else {
                    tbody.innerHTML = rows.map(r => {
            const saldoClass = r.saldo_acumulado > 0 ? 'cc-saldo-pos' : r.saldo_acumulado < 0 ? 'cc-saldo-neg' : 'cc-saldo-zero';
            const tipoDisplay = (r.tipo === 'Compra' && r.estado_pago === 'Pagado') ? 'PAGO DE DEUDA' : r.tipo;
            return `<tr>
              <td>${fmtFecha(r.fecha)}</td>
              <td>${badgeProv(tipoDisplay)}</td>
              <td style="max-width:180px;font-size:12px;">${fmt(r.descripcion)}</td>
              <td style="text-align:right;" class="cc-debito">${r.debito>0 ? fmtPeso(r.debito) : ''}</td>
              <td style="text-align:right;" class="cc-credito">${r.credito>0 ? fmtPeso(r.credito) : ''}</td>
              <td style="text-align:right;" class="${saldoClass}">${fmtPeso(Math.abs(r.saldo_acumulado))}</td>
              <td>${badgeProv(r.estado_pago)}</td>
              <td style="font-size:12px;">${fmtFecha(r.fecha_vencimiento)}</td>
            </tr>`;
          }).join('');
        }
      } catch(e) { console.error('Error CC:', e); }

      $('modalCuentaCorriente').classList.add('active');
    }

    const closeCCModal = () => $('modalCuentaCorriente')?.classList.remove('active');
    $('btnCloseModalCC')?.addEventListener('click', closeCCModal);
    $('btnCCCerrar')?.addEventListener('click', closeCCModal);
    $('modalCuentaCorriente')?.addEventListener('click', e=>{ if(e.target===$('modalCuentaCorriente')) closeCCModal(); });

    // ── REGISTRAR COMPRA ──────────────────────────────────
    function populateProvSelect(selId) {
      const sel = $(selId);
      if (!sel) return;
      const activos = allProveedores.filter(p=>p.estado==='Activo');
      sel.innerHTML = '<option value="">Seleccionar proveedor...</option>' +
        activos.map(p=>`<option value="${p.id}">${p.razon_social}</option>`).join('');
    }

    // Mostrar/ocultar campo de vencimiento según método de pago
    $('compraMetodoPago')?.addEventListener('change', () => {
      const grp = $('compraVencimientoGroup');
      if (grp) grp.style.display = $('compraMetodoPago').value==='Cuenta corriente' ? 'flex' : 'none';
    });

    $('btnGuardarCompra')?.addEventListener('click', async () => {
      const provId = parseInt($('compraProveedorId')?.value);
      const fecha = $('compraFecha')?.value;
      const total = parseFloat($('compraTotal')?.value);

      if (!provId) { showNotif('Seleccioná un proveedor', 'error'); return; }
      if (!fecha) { showNotif('Ingresá la fecha', 'error'); return; }
      if (!total || total<=0) { showNotif('Ingresá un total válido', 'error'); return; }

      const data = {
        proveedor_id: provId,
        fecha,
        descripcion: $('compraDescripcion')?.value.trim()||null,
        total,
        metodo_pago: $('compraMetodoPago')?.value||'Efectivo',
        fecha_vencimiento: $('compraFechaVencimiento')?.value||null,
        observaciones: $('compraObservaciones')?.value.trim()||null
      };

      try {
        const res = await window.electronAPI.addPurchaseSupplier(data);
        if (res.success) {
          const esCuenta = data.metodo_pago==='Cuenta corriente';
          showNotif(`✅ Compra registrada${esCuenta ? ' — deuda generada automáticamente' : ''}`);
          $('btnLimpiarCompra')?.click();
          await cargarProveedores();
        } else showNotif(res.error||'Error al guardar', 'error');
      } catch(e) { showNotif('Error inesperado', 'error'); }
    });

    $('btnLimpiarCompra')?.addEventListener('click', () => {
      ['compraProveedorId','compraMetodoPago'].forEach(id=>{ const el=$(id); if(el) el.value=''; });
      ['compraDescripcion','compraObservaciones','compraFechaVencimiento'].forEach(id=>{ const el=$(id); if(el) el.value=''; });
      if($('compraFecha')) $('compraFecha').value = new Date().toISOString().split('T')[0];
      if($('compraTotal')) $('compraTotal').value='';
      if($('compraVencimientoGroup')) $('compraVencimientoGroup').style.display='none';
    });

        // ── REGISTRAR PAGO ────────────────────────────────────
    // Cargar deudas pendientes al cambiar proveedor en Registrar Pago
    $('pagoProveedorId')?.addEventListener('change', async () => {
      const provId = parseInt($('pagoProveedorId').value);
      const selectDeuda = $('pagoCompraId');
      if (!selectDeuda) return;
      
      selectDeuda.innerHTML = '<option value="">Cargando deudas...</option>';
      if (!provId) {
        selectDeuda.innerHTML = '<option value="">Seleccionar deuda...</option>';
        return;
      }
      
      try {
        const deudas = await window.electronAPI.getPendingDebts(provId);
        selectDeuda.innerHTML = '<option value="">Seleccionar deudas...</option>';
        if (deudas && deudas.length > 0) {
          deudas.forEach(d => {
            const vencLabel = d.fecha_vencimiento ? ` (Vence: ${fmtFecha(d.fecha_vencimiento)})` : '';
            selectDeuda.innerHTML += `<option value="${d.referencia_id}" data-saldo="${d.saldo_pendiente}">
              ${d.descripcion} - Saldo: ${fmtPeso(d.saldo_pendiente)}${vencLabel}
            </option>`;
          });
        } else {
          selectDeuda.innerHTML = '<option value="">Sin deudas de compras pendientes</option>';
        }
      } catch (e) {
        console.error('Error al cargar deudas:', e);
        selectDeuda.innerHTML = '<option value="">Error al cargar deudas</option>';
      }
    });

    $('pagoCompraId')?.addEventListener('change', () => {
      const selectDeuda = $('pagoCompraId');
      if (!selectDeuda) return;
      const selectedOption = selectDeuda.options[selectDeuda.selectedIndex];
      const saldo = selectedOption?.getAttribute('data-saldo');
      if (saldo && $('pagoMonto')) {
        $('pagoMonto').value = parseFloat(saldo).toFixed(2);
      }
    });

    $('btnGuardarPago')?.addEventListener('click', async () => {
      const provId = parseInt($('pagoProveedorId')?.value);
      const fecha = $('pagoFecha')?.value;
      const monto = parseFloat($('pagoMonto')?.value);
      const compraId = parseInt($('pagoCompraId')?.value) || null;

      if (!provId) { showNotif('Seleccioná un proveedor', 'error'); return; }
      if (!fecha) { showNotif('Ingresá la fecha', 'error'); return; }
      if (!monto || monto<=0) { showNotif('Ingresá un monto válido', 'error'); return; }

      const prov = allProveedores.find(p=>p.id===provId);
      const deuda = parseFloat(prov?.deuda_actual)||0;
      if (deuda<=0) {
        if (!confirm(`El proveedor "${prov?.razon_social}" no tiene deuda pendiente. ¿Querés registrar el pago de todas formas?`)) return;
      }

      // Validar si el proveedor tiene deudas pendientes pero no seleccionó ninguna
      const selectDeuda = $('pagoCompraId');
      if (selectDeuda && selectDeuda.options.length > 1 && !compraId) {
        const hasPending = Array.from(selectDeuda.options).some(o => o.value !== "");
        if (hasPending && !confirm('El proveedor tiene deudas pendientes. ¿Estás seguro de registrar un pago sin vincularlo a ninguna deuda?')) {
          return;
        }
      }

      const data = {
        proveedor_id: provId,
        compra_id: compraId,
        fecha,
        monto,
        metodo_pago: $('pagoMetodoPago')?.value||'Efectivo',
        comprobante: $('pagoComprobante')?.value.trim()||null,
        observaciones: $('pagoObservaciones')?.value.trim()||null
      };

      try {
        const res = await window.electronAPI.addPaymentSupplier(data);
        if (res.success) {
          showNotif('✅ Pago registrado y deuda actualizada correctamente');
          $('btnLimpiarPago')?.click();
          await cargarProveedores();
        } else showNotif(res.error||'Error al registrar', 'error');
      } catch(e) { showNotif('Error inesperado', 'error'); }
    });

    $('btnLimpiarPago')?.addEventListener('click', () => {
      ['pagoProveedorId','pagoMetodoPago'].forEach(id=>{ const el=$(id); if(el) el.value=''; });
      ['pagoComprobante','pagoObservaciones'].forEach(id=>{ const el=$(id); if(el) el.value=''; });
      if($('pagoCompraId')) {
        $('pagoCompraId').innerHTML = '<option value="">Seleccionar deuda...</option>';
      }
      if($('pagoFecha')) $('pagoFecha').value = new Date().toISOString().split('T')[0];
      if($('pagoMonto')) $('pagoMonto').value='';
    });

    // ── VENCIMIENTOS ──────────────────────────────────────
    async function cargarVencimientos() {
      try {
        const rows = await window.electronAPI.getUpcomingDueDates();
        const tbody = $('vencimientosBody');
        if (!tbody) return;

        if (!rows.length) {
          tbody.innerHTML = `<tr><td colspan="6"><div class="prov-empty"><i class="fas fa-calendar-check"></i><p>Sin vencimientos pendientes</p></div></td></tr>`;
          return;
        }

        tbody.innerHTML = rows.map(r => {
          const dias = diasHasta(r.fecha_vencimiento);
          let color = 'verde', label = `en ${dias} días`;
          if (dias === null) { color='verde'; label='Sin fecha'; }
          else if (dias < 0) { color='rojo'; label=`Vencido hace ${Math.abs(dias)} día${Math.abs(dias)!==1?'s':''}`; }
          else if (dias <= 15) { color='amarillo'; label=`en ${dias} día${dias!==1?'s':''}`; }

                    const monto = r.saldo_pendiente !== undefined ? r.saldo_pendiente : ((r.debito||0) - (r.credito||0));
          return `<tr>
            <td><strong>${r.proveedor_nombre}</strong></td>
            <td style="font-size:12px;">${fmt(r.descripcion)}</td>
            <td>${fmtFecha(r.fecha_vencimiento)}</td>
            <td><span class="vencimiento-dias ${color}">${label}</span></td>
            <td class="${color==='rojo'?'prov-deuda-alta':color==='amarillo'?'prov-deuda-media':''}">${fmtPeso(monto)}</td>
            <td><span class="vencimiento-alert ${color}"><i class="fas fa-circle" style="font-size:8px;"></i> ${color==='rojo'?'Vencido':color==='amarillo'?'Próximo':'Al día'}</span></td>
          </tr>`;
        }).join('');
      } catch(e) { console.error('Error vencimientos:', e); }
    }

    $('btnRefrescarVencimientos')?.addEventListener('click', cargarVencimientos);

    // ── ESTADÍSTICAS ──────────────────────────────────────
    async function renderEstadisticasProv() {
      try {
        const stats = await window.electronAPI.getSupplierStats();
        const setKpi = (id,v) => { const el=$(id); if(el) el.textContent=v; };

        setKpi('kpiTotalProv', stats.totalProveedores ?? '—');
        setKpi('kpiTotalDeuda', fmtPeso(stats.totalDeuda));
        setKpi('kpiDeudasVencidas', fmtPeso(stats.deudasVencidas));
        setKpi('kpiComprasMes', fmtPeso(stats.comprasMes));
        setKpi('kpiPagosMes', fmtPeso(stats.pagosMes));
        setKpi('kpiTopProv', stats.topProveedor?.razon_social || 'Sin datos');

        // Gráfico de barras
        const canvas = $('chartProvCompras');
        if (canvas && typeof Chart !== 'undefined' && stats.comprasPorMes) {
          if (provChartInstance) provChartInstance.destroy();
          const mesesLabels = (stats.comprasPorMes||[]).map(m => {
            const [y,mo] = m.mes.split('-');
            const nombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
            return `${nombres[parseInt(mo)-1]} ${y}`;
          });
          provChartInstance = new Chart(canvas, {
            type: 'bar',
            data: {
              labels: mesesLabels,
              datasets: [{
                label: 'Compras ($)',
                data: (stats.comprasPorMes||[]).map(m=>m.total),
                backgroundColor: 'rgba(16,185,129,0.7)',
                borderColor: '#10b981',
                borderWidth: 2,
                borderRadius: 8
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: v => '$'+v.toLocaleString('es-AR') } },
                x: { grid: { display: false } }
              }
            }
          });
        }
      } catch(e) { console.error('Error estadísticas proveedor:', e); }
    }

    // ── Carga inicial ─────────────────────────────────────
    cargarProveedores();
    // Fechas por defecto
    const hoy = new Date().toISOString().split('T')[0];
    if($('compraFecha')) $('compraFecha').value = hoy;
    if($('pagoFecha')) $('pagoFecha').value = hoy;
  }



  // =====================================================================
  // Módulo de Empleados
  // =====================================================================
  function initEmpleados() {
    // --- Estado global del módulo ---
    let allEmpleados = [];
    let allHorarios = [];
    let empEditandoId = null;
    let horarioEditandoId = null;
    let empChartInstance = null;

    // Helpers
    const $ = (id) => document.getElementById(id);
    const fmt = (v) => (v || '—');
    const fmtFecha = (f) => {
      if (!f) return '—';
      const [y, m, d] = f.split('-');
      return `${d}/${m}/${y}`;
    };
    const calcHoras = (entrada, salida) => {
      if (!entrada || !salida) return 0;
      const [eh, em] = entrada.split(':').map(Number);
      const [sh, sm] = salida.split(':').map(Number);
      const mins = (sh * 60 + sm) - (eh * 60 + em);
      return Math.max(0, parseFloat((mins / 60).toFixed(2)));
    };
    const badgeEstado = (est) => {
      const key = (est || '').toLowerCase();
      return `<span class="emp-badge ${key}">${est || '—'}</span>`;
    };
    const showNotif = (msg, type = 'success') => {
      const notif = document.getElementById('notification') ||
        document.querySelector('.notification') ||
        document.querySelector('[id*="notif"]');
      if (notif) {
        notif.textContent = msg;
        notif.className = `notification ${type} show`;
        setTimeout(() => notif.classList.remove('show'), 3000);
      }
    };

    // --- Tab switching ---
    const tabBtns = document.querySelectorAll('.empleados-tab-btn');
    const tabSections = document.querySelectorAll('.empleados-tab-section');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabSections.forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        const tabId = 'tab-' + btn.dataset.tab;
        const section = document.getElementById(tabId);
        if (section) section.classList.add('active');

        if (btn.dataset.tab === 'horarios') renderHorarios();
        if (btn.dataset.tab === 'estadisticas-emp') renderEstadisticas();
        if (btn.dataset.tab === 'registrar-asistencia') populateAttSelect();
        if (btn.dataset.tab === 'historial-asistencias') populateHistSelect();
      });
    });

    // ─────────────────────────────────────────────
    // EMPLEADOS: Cargar y renderizar
    // ─────────────────────────────────────────────
    async function cargarEmpleados() {
      try {
        allEmpleados = await window.electronAPI.getEmployees();
        renderEmpleados();
        populateFiltrosCargo();
      } catch (err) {
        console.error('Error cargando empleados:', err);
      }
    }

    function renderEmpleados(lista) {
      const tbody = $('empTableBody');
      if (!tbody) return;
      const src = lista || allEmpleados;

      if (!src.length) {
        tbody.innerHTML = `<tr><td colspan="9"><div class="empleados-empty">
          <i class="fas fa-users"></i><p>No hay empleados registrados</p>
          <small>Hacé clic en "Agregar Empleado" para comenzar</small></div></td></tr>`;
        return;
      }

      tbody.innerHTML = src.map(e => `
        <tr>
          <td><strong>#${e.id}</strong></td>
          <td><strong>${e.apellido}</strong>, ${e.nombre}</td>
          <td>${fmt(e.dni)}</td>
          <td>${fmt(e.telefono)}</td>
          <td>${fmt(e.cargo)}</td>
          <td>${e.horario_nombre ? `<span style="font-size:12px;background:#eff6ff;color:#3b82f6;padding:3px 8px;border-radius:6px;">${e.horario_nombre}</span>` : '—'}</td>
          <td>${fmtFecha(e.fecha_ingreso)}</td>
          <td>${badgeEstado(e.estado)}</td>
          <td>
            <div class="emp-action-btns">
              <button class="emp-btn-icon view" title="Ver detalles" data-action="view" data-id="${e.id}"><i class="fas fa-eye"></i></button>
              <button class="emp-btn-icon edit" title="Editar" data-action="edit" data-id="${e.id}"><i class="fas fa-pen"></i></button>
              <button class="emp-btn-icon delete" title="Eliminar" data-action="delete" data-id="${e.id}"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `).join('');

      // Eventos de acciones
      tbody.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.dataset.id);
          const emp = allEmpleados.find(e => e.id === id);
          if (!emp) return;
          if (btn.dataset.action === 'view') viewEmpleado(emp);
          if (btn.dataset.action === 'edit') openEmpModal(emp);
          if (btn.dataset.action === 'delete') deleteEmpleado(emp);
        });
      });
    }

    function populateFiltrosCargo() {
      const sel = $('empFiltroCargo');
      if (!sel) return;
      const cargos = [...new Set(allEmpleados.map(e => e.cargo).filter(Boolean))].sort();
      const current = sel.value;
      sel.innerHTML = '<option value="">Todos los cargos</option>' +
        cargos.map(c => `<option value="${c}" ${c === current ? 'selected' : ''}>${c}</option>`).join('');
    }

    function applyFiltrosEmp() {
      const q = ($('empSearchInput')?.value || '').toLowerCase();
      const estado = $('empFiltroEstado')?.value || '';
      const cargo = $('empFiltroCargo')?.value || '';
      const filtered = allEmpleados.filter(e => {
        const matchQ = !q || `${e.nombre} ${e.apellido} ${e.dni} ${e.cargo}`.toLowerCase().includes(q);
        const matchEst = !estado || e.estado === estado;
        const matchCargo = !cargo || e.cargo === cargo;
        return matchQ && matchEst && matchCargo;
      });
      renderEmpleados(filtered);
    }

    $('empSearchInput')?.addEventListener('input', applyFiltrosEmp);
    $('empFiltroEstado')?.addEventListener('change', applyFiltrosEmp);
    $('empFiltroCargo')?.addEventListener('change', applyFiltrosEmp);

    // ─────────────────────────────────────────────
    // MODAL EMPLEADO: Abrir / Cerrar / Guardar
    // ─────────────────────────────────────────────
    async function openEmpModal(emp = null) {
      empEditandoId = emp ? emp.id : null;
      $('modalEmpTitle').textContent = emp ? 'Editar Empleado' : 'Agregar Empleado';

      // Limpiar campos
      ['empNombre','empApellido','empDni','empFechaNac','empTelefono','empEmail',
       'empDireccion','empCargo','empFechaIngreso','empSalario','empObservaciones'].forEach(id => {
        const el = $(id); if (el) el.value = '';
      });
      ['errEmpNombre','errEmpApellido','errEmpDni','errEmpCargo','errEmpEmail'].forEach(id => {
        const el = $(id); if (el) el.classList.remove('visible');
      });
      ['empNombre','empApellido','empDni','empCargo'].forEach(id => {
        const el = $(id); if (el) el.classList.remove('error');
      });

      // Cargar horarios en selector
      allHorarios = await window.electronAPI.getSchedules();
      const horSel = $('empHorarioId');
      if (horSel) {
        horSel.innerHTML = '<option value="">Sin horario</option>' +
          allHorarios.map(h => `<option value="${h.id}">${h.nombre}</option>`).join('');
      }

      // Prellenar si es edición
      if (emp) {
        $('empNombre').value = emp.nombre || '';
        $('empApellido').value = emp.apellido || '';
        $('empDni').value = emp.dni || '';
        if ($('empFechaNac')) $('empFechaNac').value = emp.fecha_nacimiento || '';
        $('empTelefono').value = emp.telefono || '';
        $('empEmail').value = emp.email || '';
        $('empDireccion').value = emp.direccion || '';
        $('empCargo').value = emp.cargo || '';
        if ($('empFechaIngreso')) $('empFechaIngreso').value = emp.fecha_ingreso || '';
        if ($('empSalario')) $('empSalario').value = emp.salario || '';
        if ($('empObservaciones')) $('empObservaciones').value = emp.observaciones || '';
        if ($('empEstado')) $('empEstado').value = emp.estado || 'Activo';
        if (horSel && emp.horario_id) horSel.value = emp.horario_id;
      }

      $('modalEmpleado').classList.add('active');
    }

    const closeEmpModal = () => $('modalEmpleado')?.classList.remove('active');
    $('btnCloseModalEmp')?.addEventListener('click', closeEmpModal);
    $('btnCancelEmp')?.addEventListener('click', closeEmpModal);
    $('modalEmpleado')?.addEventListener('click', (e) => { if (e.target === $('modalEmpleado')) closeEmpModal(); });
    $('btnAgregarEmpleado')?.addEventListener('click', () => openEmpModal());

    $('btnGuardarEmp')?.addEventListener('click', async () => {
      // Validaciones
      let valid = true;
      const nombre = $('empNombre')?.value.trim();
      const apellido = $('empApellido')?.value.trim();
      const dni = $('empDni')?.value.trim();
      const cargo = $('empCargo')?.value.trim();
      const email = $('empEmail')?.value.trim();

      if (!nombre) { $('errEmpNombre')?.classList.add('visible'); $('empNombre')?.classList.add('error'); valid = false; }
      else { $('errEmpNombre')?.classList.remove('visible'); $('empNombre')?.classList.remove('error'); }

      if (!apellido) { $('errEmpApellido')?.classList.add('visible'); $('empApellido')?.classList.add('error'); valid = false; }
      else { $('errEmpApellido')?.classList.remove('visible'); $('empApellido')?.classList.remove('error'); }

      if (!dni) { $('errEmpDni')?.classList.add('visible'); $('empDni')?.classList.add('error'); valid = false; }
      else { $('errEmpDni')?.classList.remove('visible'); $('empDni')?.classList.remove('error'); }

      if (!cargo) { $('errEmpCargo')?.classList.add('visible'); $('empCargo')?.classList.add('error'); valid = false; }
      else { $('errEmpCargo')?.classList.remove('visible'); $('empCargo')?.classList.remove('error'); }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        $('errEmpEmail')?.classList.add('visible'); $('empEmail')?.classList.add('error'); valid = false;
      } else { $('errEmpEmail')?.classList.remove('visible'); $('empEmail')?.classList.remove('error'); }

      if (!valid) return;

      const data = {
        id: empEditandoId,
        nombre, apellido, dni, cargo, email,
        fecha_nacimiento: $('empFechaNac')?.value || null,
        telefono: $('empTelefono')?.value.trim() || null,
        direccion: $('empDireccion')?.value.trim() || null,
        fecha_ingreso: $('empFechaIngreso')?.value || null,
        salario: parseFloat($('empSalario')?.value) || null,
        observaciones: $('empObservaciones')?.value.trim() || null,
        estado: $('empEstado')?.value || 'Activo',
        horario_id: parseInt($('empHorarioId')?.value) || null
      };

      try {
        const fn = empEditandoId ? window.electronAPI.updateEmployee : window.electronAPI.addEmployee;
        const res = await fn(data);
        if (res.success) {
          closeEmpModal();
          showNotif(empEditandoId ? '✅ Empleado actualizado correctamente' : '✅ Empleado agregado correctamente');
          await cargarEmpleados();
        } else {
          showNotif(res.error || 'Error al guardar el empleado', 'error');
        }
      } catch (err) {
        showNotif('Error inesperado al guardar', 'error');
      }
    });

    function viewEmpleado(emp) {
      const hor = emp.horario_nombre ? `<span style="color:#3b82f6;">${emp.horario_nombre}</span>` : '—';
      const info = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13.5px;">
          <div><b>Nombre:</b><br>${emp.nombre} ${emp.apellido}</div>
          <div><b>DNI:</b><br>${fmt(emp.dni)}</div>
          <div><b>Fecha de Nacimiento:</b><br>${fmtFecha(emp.fecha_nacimiento)}</div>
          <div><b>Teléfono:</b><br>${fmt(emp.telefono)}</div>
          <div><b>Email:</b><br>${fmt(emp.email)}</div>
          <div><b>Dirección:</b><br>${fmt(emp.direccion)}</div>
          <div><b>Cargo:</b><br>${fmt(emp.cargo)}</div>
          <div><b>Fecha de Ingreso:</b><br>${fmtFecha(emp.fecha_ingreso)}</div>
          <div><b>Salario:</b><br>${emp.salario ? `$${parseFloat(emp.salario).toLocaleString('es-AR')}` : '—'}</div>
          <div><b>Horario:</b><br>${hor}</div>
          <div><b>Estado:</b><br>${badgeEstado(emp.estado)}</div>
          <div><b>Observaciones:</b><br>${fmt(emp.observaciones)}</div>
        </div>`;
      alert(`Empleado #${emp.id}\n\n${emp.nombre} ${emp.apellido}\nDNI: ${emp.dni}\nCargo: ${emp.cargo}\nEstado: ${emp.estado}`);
    }

    async function deleteEmpleado(emp) {
      if (!confirm(`¿Eliminar al empleado ${emp.nombre} ${emp.apellido}?\n\nEsta acción también eliminará sus asistencias registradas.`)) return;
      try {
        const res = await window.electronAPI.deleteEmployee(emp.id);
        if (res.success) {
          showNotif('✅ Empleado eliminado correctamente');
          await cargarEmpleados();
        } else {
          showNotif('Error al eliminar el empleado', 'error');
        }
      } catch (err) {
        showNotif('Error inesperado al eliminar', 'error');
      }
    }

    // ─────────────────────────────────────────────
    // HORARIOS: Cargar y renderizar
    // ─────────────────────────────────────────────
    async function renderHorarios() {
      try {
        allHorarios = await window.electronAPI.getSchedules();
      } catch (err) { allHorarios = []; }

      const grid = $('horariosGrid');
      if (!grid) return;

      const dias = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
      const diaLabels = { lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom' };

      if (!allHorarios.length) {
        grid.innerHTML = `<div class="empleados-empty"><i class="fas fa-clock"></i><p>No hay horarios registrados</p></div>`;
        return;
      }

      grid.innerHTML = allHorarios.map(h => {
        const diasHTML = dias.map(d => {
          const val = h[d] || 'Libre';
          const isLibre = val === 'Libre';
          return `<div class="horario-dia-row">
            <span class="horario-dia-name">${diaLabels[d]}</span>
            <span class="horario-dia-val ${isLibre ? 'libre' : ''}">${val}</span>
          </div>`;
        }).join('');
        return `
          <div class="horario-card">
            <div class="horario-card-header">
              <h3>${h.nombre}</h3>
              <div class="emp-action-btns">
                <button class="emp-btn-icon edit" title="Editar" data-action="edit-hor" data-id="${h.id}"><i class="fas fa-pen"></i></button>
                <button class="emp-btn-icon delete" title="Eliminar" data-action="delete-hor" data-id="${h.id}"><i class="fas fa-trash"></i></button>
              </div>
            </div>
            <div class="horario-dias">${diasHTML}</div>
          </div>`;
      }).join('');

      grid.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = parseInt(btn.dataset.id);
          const hor = allHorarios.find(h => h.id === id);
          if (!hor) return;
          if (btn.dataset.action === 'edit-hor') openHorarioModal(hor);
          if (btn.dataset.action === 'delete-hor') {
            if (!confirm(`¿Eliminar el horario "${hor.nombre}"?`)) return;
            const res = await window.electronAPI.deleteSchedule(id);
            if (res.success) { showNotif('✅ Horario eliminado'); renderHorarios(); }
            else showNotif(res.error || 'Error al eliminar', 'error');
          }
        });
      });
    }

    // --- Modal horario ---
    function openHorarioModal(hor = null) {
      horarioEditandoId = hor ? hor.id : null;
      $('modalHorarioTitle').textContent = hor ? 'Editar Horario' : 'Nuevo Horario';
      $('horNombre').value = hor ? hor.nombre : '';

      const dias = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
      dias.forEach(d => {
        const val = hor ? (hor[d] || 'Libre') : 'Libre';
        const isActivo = val !== 'Libre';
        const cb = $(`hor${d.charAt(0).toUpperCase() + d.slice(1)}Activo`);
        const ent = $(`hor${d.charAt(0).toUpperCase() + d.slice(1)}Ent`);
        const sal = $(`hor${d.charAt(0).toUpperCase() + d.slice(1)}Sal`);
        if (cb) cb.checked = isActivo;
        if (isActivo && val.includes(' - ')) {
          const [e, s] = val.split(' - ');
          if (ent) ent.value = e;
          if (sal) sal.value = s;
        } else {
          if (ent) ent.value = '08:00';
          if (sal) sal.value = '17:00';
        }
      });

      $('modalHorario').classList.add('active');
    }

    const closeHorModal = () => $('modalHorario')?.classList.remove('active');
    $('btnCloseModalHorario')?.addEventListener('click', closeHorModal);
    $('btnCancelHorario')?.addEventListener('click', closeHorModal);
    $('modalHorario')?.addEventListener('click', (e) => { if (e.target === $('modalHorario')) closeHorModal(); });
    $('btnNuevoHorario')?.addEventListener('click', () => openHorarioModal());

    $('btnGuardarHorario')?.addEventListener('click', async () => {
      const nombre = $('horNombre')?.value.trim();
      if (!nombre) { $('horNombre')?.focus(); showNotif('El nombre del horario es obligatorio', 'error'); return; }

      const dias = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
      const diaData = {};
      dias.forEach(d => {
        const key = d.charAt(0).toUpperCase() + d.slice(1);
        const activo = $(`hor${key}Activo`)?.checked;
        const ent = $(`hor${key}Ent`)?.value;
        const sal = $(`hor${key}Sal`)?.value;
        diaData[d] = activo && ent && sal ? `${ent} - ${sal}` : 'Libre';
      });

      const data = { id: horarioEditandoId, nombre, ...diaData };
      try {
        const res = await window.electronAPI.saveSchedule(data);
        if (res.success) {
          closeHorModal();
          showNotif(horarioEditandoId ? '✅ Horario actualizado' : '✅ Horario creado');
          renderHorarios();
        } else {
          showNotif(res.error || 'Error al guardar el horario', 'error');
        }
      } catch (err) {
        showNotif('Error inesperado', 'error');
      }
    });

    // ─────────────────────────────────────────────
    // ASISTENCIAS: Registrar
    // ─────────────────────────────────────────────
    function populateAttSelect() {
      const sel = $('attEmpleado');
      if (!sel) return;
      const activos = allEmpleados.filter(e => e.estado === 'Activo');
      sel.innerHTML = '<option value="">Seleccionar empleado...</option>' +
        activos.map(e => `<option value="${e.id}">${e.apellido}, ${e.nombre}</option>`).join('');

      // Fecha por defecto: hoy
      const hoy = new Date().toISOString().split('T')[0];
      const attFecha = $('attFecha');
      if (attFecha && !attFecha.value) attFecha.value = hoy;
    }

    $('btnGuardarAsistencia')?.addEventListener('click', async () => {
      const empleadoId = parseInt($('attEmpleado')?.value);
      const fecha = $('attFecha')?.value;
      const estado = $('attEstado')?.value;

      if (!empleadoId) { showNotif('Seleccioná un empleado', 'error'); return; }
      if (!fecha) { showNotif('Ingresá la fecha', 'error'); return; }
      if (!estado) { showNotif('Seleccioná el estado', 'error'); return; }

      const data = {
        empleado_id: empleadoId,
        fecha,
        hora_entrada: $('attHoraEntrada')?.value || null,
        hora_salida: $('attHoraSalida')?.value || null,
        estado,
        observaciones: $('attObservaciones')?.value.trim() || null
      };

      try {
        const res = await window.electronAPI.saveAttendance(data);
        if (res.success) {
          showNotif('✅ Asistencia registrada correctamente');
          $('btnLimpiarAsistencia')?.click();
        } else {
          showNotif(res.error || 'Error al registrar', 'error');
        }
      } catch (err) {
        showNotif('Error inesperado', 'error');
      }
    });

    $('btnLimpiarAsistencia')?.addEventListener('click', () => {
      $('attEmpleado').value = '';
      $('attFecha').value = new Date().toISOString().split('T')[0];
      if ($('attHoraEntrada')) $('attHoraEntrada').value = '';
      if ($('attHoraSalida')) $('attHoraSalida').value = '';
      $('attEstado').value = 'Presente';
      if ($('attObservaciones')) $('attObservaciones').value = '';
    });

    // ─────────────────────────────────────────────
    // HISTORIAL DE ASISTENCIAS
    // ─────────────────────────────────────────────
    function populateHistSelect() {
      const sel = $('histEmpleado');
      if (!sel) return;
      sel.innerHTML = '<option value="">Todos</option>' +
        allEmpleados.map(e => `<option value="${e.id}">${e.apellido}, ${e.nombre}</option>`).join('');
    }

    async function buscarHistorial() {
      const fechaInicio = $('histFechaInicio')?.value || null;
      const fechaFin = $('histFechaFin')?.value || null;
      const empleadoId = parseInt($('histEmpleado')?.value) || null;
      const estado = $('histEstado')?.value || null;

      try {
        const rows = await window.electronAPI.getAttendances({ fechaInicio, fechaFin, empleadoId, estado });
        renderHistorial(rows);
      } catch (err) {
        console.error('Error cargando historial:', err);
      }
    }

    function renderHistorial(rows) {
      const tbody = $('histAttBody');
      if (!tbody) return;

      if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="9"><div class="empleados-empty">
          <i class="fas fa-search"></i><p>No se encontraron registros</p></div></td></tr>`;
        return;
      }

      tbody.innerHTML = rows.map(r => {
        const horas = calcHoras(r.hora_entrada, r.hora_salida);
        return `<tr>
          <td><strong>${r.empleado_apellido}, ${r.empleado_nombre}</strong></td>
          <td>${fmt(r.empleado_cargo)}</td>
          <td>${fmtFecha(r.fecha)}</td>
          <td>${fmt(r.hora_entrada)}</td>
          <td>${fmt(r.hora_salida)}</td>
          <td>${horas > 0 ? `${horas}h` : '—'}</td>
          <td>${badgeEstado(r.estado)}</td>
          <td style="font-size:12px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.observaciones || ''}">${fmt(r.observaciones)}</td>
          <td>
            <button class="emp-btn-icon delete" title="Eliminar" data-del-att="${r.id}"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`;
      }).join('');

      tbody.querySelectorAll('[data-del-att]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('¿Eliminar este registro de asistencia?')) return;
          const res = await window.electronAPI.deleteAttendance(parseInt(btn.dataset.delAtt));
          if (res.success) { showNotif('✅ Registro eliminado'); buscarHistorial(); }
          else showNotif('Error al eliminar', 'error');
        });
      });
    }

    $('btnBuscarHistAtt')?.addEventListener('click', buscarHistorial);
    $('btnLimpiarHistAtt')?.addEventListener('click', () => {
      ['histFechaInicio','histFechaFin'].forEach(id => { const el = $(id); if (el) el.value = ''; });
      ['histEmpleado','histEstado'].forEach(id => { const el = $(id); if (el) el.value = ''; });
      const tbody = $('histAttBody');
      if (tbody) tbody.innerHTML = `<tr><td colspan="9"><div class="empleados-empty">
        <i class="fas fa-list-alt"></i><p>Aplicá los filtros para ver el historial</p></div></td></tr>`;
    });

    // ─────────────────────────────────────────────
    // ESTADÍSTICAS
    // ─────────────────────────────────────────────
    async function renderEstadisticas() {
      const hoy = new Date().toISOString().split('T')[0];
      const now = new Date();
      const primerDiaMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-01`;

      try {
        const attHoy = await window.electronAPI.getAttendances({ fechaInicio: hoy });
        const attMes = await window.electronAPI.getAttendances({ fechaInicio: primerDiaMes, fechaFin: hoy });

        // KPIs
        const totalEmp = allEmpleados.length;
        const activos = allEmpleados.filter(e => e.estado === 'Activo').length;
        const presentesHoy = attHoy.filter(a => a.estado === 'Presente').length;
        const tardesHoy = attHoy.filter(a => a.estado === 'Tarde').length;
        const ausentesHoy = attHoy.filter(a => a.estado === 'Ausente').length;
        const licencias = attHoy.filter(a => a.estado === 'Licencia' || a.estado === 'Vacaciones').length;

        const setKpi = (id, val) => { const el = $(id); if (el) el.textContent = val; };
        setKpi('kpiTotalEmp', totalEmp);
        setKpi('kpiPresentesHoy', presentesHoy);
        setKpi('kpiTardesHoy', tardesHoy);
        setKpi('kpiAusentesHoy', ausentesHoy);
        setKpi('kpiLicencias', licencias);

        // Gráfico de torta - asistencia del mes
        const conteos = { Presente: 0, Tarde: 0, Ausente: 0, Licencia: 0, Vacaciones: 0 };
        attMes.forEach(a => { if (conteos[a.estado] !== undefined) conteos[a.estado]++; });

        const canvas = $('chartEmpAsistencia');
        if (canvas && typeof Chart !== 'undefined') {
          if (empChartInstance) empChartInstance.destroy();
          empChartInstance = new Chart(canvas, {
            type: 'doughnut',
            data: {
              labels: Object.keys(conteos),
              datasets: [{
                data: Object.values(conteos),
                backgroundColor: ['#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6'],
                borderWidth: 2,
                borderColor: '#ffffff'
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom', labels: { padding: 16, font: { size: 12, weight: '600' } } }
              }
            }
          });
        }

        // Tabla de horas trabajadas por empleado
        const horasPorEmp = {};
        const diasPorEmp = {};
        attMes.filter(a => a.estado === 'Presente' || a.estado === 'Tarde').forEach(a => {
          const key = a.empleado_id;
          const nombre = `${a.empleado_apellido}, ${a.empleado_nombre}`;
          if (!horasPorEmp[key]) { horasPorEmp[key] = 0; diasPorEmp[key] = { nombre, dias: 0 }; }
          horasPorEmp[key] += calcHoras(a.hora_entrada, a.hora_salida);
          diasPorEmp[key].dias++;
        });

        const diasHabilesMes = Math.round((now.getDate()) * 5/7);
        const horasBody = $('horasResumenBody');
        if (horasBody) {
          const entries = Object.entries(diasPorEmp);
          if (!entries.length) {
            horasBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:24px 0;">Sin datos del mes</td></tr>`;
          } else {
            horasBody.innerHTML = entries
              .sort((a,b) => diasPorEmp[b[0]].dias - diasPorEmp[a[0]].dias)
              .map(([id, info]) => {
                const pct = diasHabilesMes > 0 ? Math.round((info.dias / diasHabilesMes) * 100) : 0;
                const color = pct >= 90 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444';
                return `<tr>
                  <td>${info.nombre}</td>
                  <td>${info.dias}</td>
                  <td>${horasPorEmp[id]}h</td>
                  <td><span style="color:${color};font-weight:700;">${Math.min(100,pct)}%</span></td>
                </tr>`;
              }).join('');
          }
        }
      } catch (err) {
        console.error('Error cargando estadísticas:', err);
      }
    }

    // ─────────────────────────────────────────────
    // Carga inicial
    // ─────────────────────────────────────────────
    cargarEmpleados();
    // Fecha de asistencia por defecto
    const attFecha = $('attFecha');
    if (attFecha) attFecha.value = new Date().toISOString().split('T')[0];
  }

  function initHistorial() {

    const btnBuscar = document.getElementById('btnBuscarHistorial');
    const fechaInput = document.getElementById('historialFecha');
    const tbody = document.getElementById('historialBody');

    async function cargarHistorial(fecha) {
      if (!fecha) return;
      try {
        const rows = await window.electronAPI.getHistorialByDate(fecha);
        let tickets = [];
        try {
          tickets = await window.electronAPI.getTickets();
        } catch (tErr) {
          console.warn('[Historial] No se pudieron obtener tickets para el historial unificado:', tErr);
        }

        // 1. Filtrar tickets correspondientes a la fecha seleccionada
        const ticketsDelDia = (tickets || []).filter(t => {
          if (!t.fecha) return false;
          const dateStr = t.fecha.split(' ')[0].split('T')[0];
          return dateStr === fecha;
        });

        // 2. Mapear tickets como compras/ventas comerciales consolidadas (1 fila por operación)
        const itemsTickets = ticketsDelDia.map(t => {
          const prods = t.productos || [];
          const prodsStr = prods.map(p => `${p.nombre} (${p.cantidad}u)`).join(', ');
          const clienteStr = t.cliente ? ` | Cliente: <strong>${t.cliente}</strong>` : '';
          const metodoPagoStr = t.metodo_pago ? ` | Pago: <strong>${t.metodo_pago}</strong>` : '';
          const descProductos = prodsStr ? `Productos: <strong>${prodsStr}</strong>` : 'Venta de productos';

          const detalleHtml = `${descProductos} | Total: <strong>$${formatearMonedaArgentina(t.total || 0)}</strong>${metodoPagoStr}${clienteStr}`;
          const isAnulado = Boolean(t.anulado);
          const badgeAnulado = isAnulado ? ' <span style="background-color: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 20px; font-weight: 600; font-size: 10px;">ANULADA</span>' : '';
          const accionHtml = `<span class="badge-venta-green" style="background-color: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 20px; font-weight: 600; font-size: 11px;">VENTA</span>${badgeAnulado}`;

          const timeMs = new Date(t.fecha).getTime();

          return {
            fechaStr: typeof formatearFecha === 'function' ? formatearFecha(t.fecha) : t.fecha,
            accionHtml,
            detalleHtml,
            isVenta: true,
            timeMs: isNaN(timeMs) ? 0 : timeMs
          };
        });

        // 3. Filtrar eventos de auditoría (excluyendo registros de texto de ventas para evitar duplicados)
        const actividadesNoVentas = (rows || []).filter(r => {
          const accionLower = (r.accion || '').toLowerCase();
          return !accionLower.includes('venta');
        });

        const itemsActividades = actividadesNoVentas.map(r => {
          const isGasto = r.accion === 'GASTO';
          const isPresupuesto = r.accion === 'PRESUPUESTO';
          const isRemito = r.accion === 'REMITO';
          const isAjuste = r.accion === 'AJUSTE';

          let detalleHtml = r.detalle;
          let accionHtml = r.accion;

          if (isGasto) {
            accionHtml = `<span class="badge-gasto-red">GASTO</span>`;
            const parts = r.detalle.split(';');
            if (parts.length === 3) {
              const concepto = parts[0];
              const monto = parseFloat(parts[1]) || 0;
              const estado = parts[2];
              const badgeClass = estado === 'Pagado' ? 'badge-pagado' : 'badge-pendiente';
              detalleHtml = `Concepto: <strong>${concepto}</strong> | Monto: <strong>$${formatearMonedaArgentina(monto)}</strong> | Estado: <span class="${badgeClass}">${estado}</span>`;
            }
          } else if (isPresupuesto) {
            accionHtml = `<span class="badge-presupuesto-blue">PRESUPUESTO</span>`;
            const parts = r.detalle.split(';');
            if (parts.length === 2) {
              const cliente = parts[0] || 'Consumidor Final';
              const total = parseFloat(parts[1]) || 0;
              detalleHtml = `Cliente: <strong>${cliente}</strong> | Total: <strong>$${formatearMonedaArgentina(total)}</strong>`;
            }
          } else if (isRemito) {
            accionHtml = `<span class="badge-remito-orange">REMITO</span>`;
            const parts = r.detalle.split(';');
            if (parts.length === 2) {
              const cliente = parts[0] || 'Consumidor Final';
              const total = parseFloat(parts[1]) || 0;
              detalleHtml = `Cliente: <strong>${cliente}</strong> | Total: <strong>$${formatearMonedaArgentina(total)}</strong>`;
            }
          } else if (isAjuste) {
            accionHtml = `<span class="badge-ajuste-orange">AJUSTE</span>`;
            const parts = r.detalle.split(';');
            if (parts.length === 3) {
              const tipo = parts[0];
              const monto = parseFloat(parts[1]) || 0;
              const ventaId = parts[2];
              const ventaStr = ventaId ? ` | Venta asociada: <strong>#${ventaId}</strong>` : '';
              const isPos = monto >= 0;
              const color = isPos ? '#10b981' : '#ef4444';
              const sign = isPos ? '+' : '-';
              detalleHtml = `Tipo: <strong>${tipo}</strong> | Monto: <strong style="color: ${color};">${sign}$${formatearMonedaArgentina(Math.abs(monto))}</strong>${ventaStr}`;
            }
          }

          const timeMs = new Date(r.fecha).getTime();

          return {
            fechaStr: r.fecha,
            accionHtml,
            detalleHtml,
            isVenta: false,
            timeMs: isNaN(timeMs) ? 0 : timeMs
          };
        });

        // 4. Unificar y ordenar cronológicamente de forma descendente (más reciente primero)
        const unificado = [...itemsTickets, ...itemsActividades].sort((a, b) => b.timeMs - a.timeMs);

        tbody.innerHTML = '';
        const emptyMessage = document.getElementById('historialEmptyMessage');

        if (unificado.length === 0) {
          if (emptyMessage) emptyMessage.style.display = 'block';
          return;
        }

        if (emptyMessage) emptyMessage.style.display = 'none';

        unificado.forEach(item => {
          tbody.innerHTML += `
            <tr${item.isVenta ? ' style="background-color:#f6fff6;"' : ''}>
              <td>${item.fechaStr}</td>
              <td>${item.accionHtml}</td>
              <td>${item.detalleHtml}</td>
            </tr>
          `;
        });
      } catch (err) {
        console.error('Error getHistorialByDate:', err);
        alert('Error cargando historial.');
        if (typeof restaurarFoco === 'function') restaurarFoco();
      }
    }

    btnBuscar.addEventListener('click', () => {
      const fecha = fechaInput.value;
      if (!fecha) return alert('Seleccione una fecha');
      cargarHistorial(fecha);
    });

    // Auto-cargar el historial de hoy al abrir la sección
    const hoy = new Date().toISOString().split('T')[0];
    if (fechaInput) fechaInput.value = hoy;
    cargarHistorial(hoy);
  }

  // Variables globales para presupuestos
  let todosLosPresupuestosGlobal = [];

  function mostrarPresupuestos(presupuestos) {
    todosLosPresupuestosGlobal = presupuestos || [];
    const tbody = document.getElementById('presupuestosBody');
    const emptyMessage = document.getElementById('presupuestosEmptyMessage');

    if (!tbody) return;

    if (!presupuestos || presupuestos.length === 0) {
      tbody.innerHTML = '';
      emptyMessage.style.display = 'block';
      return;
    }

    emptyMessage.style.display = 'none';

    tbody.innerHTML = presupuestos.map((p, i) => {
      const nroFormatted = String(p.id).padStart(8, '0');
      const productos = p.productos || [];
      const productosList = productos.map(item =>
        `<li>${item.nombre} - ${item.cantidad} x $${Number(item.precio).toFixed(2)}</li>`
      ).join('');

      return `
      <tr>
        <td>Nº ${nroFormatted}</td>
        <td>${p.cliente || 'Consumidor Final'}</td>
        <td>${formatearFecha(p.fecha)}</td>
        <td>$${Number(p.total || 0).toFixed(2)}</td>
        <td>
          <ul style="margin: 0; padding-left: 20px; text-align: left; font-size: 11px;">
            ${productosList || '<li>Sin productos</li>'}
          </ul>
        </td>
        <td>
          <button class="btn-print-presupuesto" data-presupuesto-index="${i}">🖨️ Reimprimir</button>
        </td>
      </tr>
    `;
    }).join('');
  }

  function filtrarPresupuestos() {
    const fecha = document.getElementById('presupuestosFechaFiltro').value;
    if (!fecha) {
      mostrarPresupuestos(todosLosPresupuestosGlobal);
      return;
    }

    const filtrados = todosLosPresupuestosGlobal.filter(p =>
      p.fecha && p.fecha.startsWith(fecha)
    );
    mostrarPresupuestos(filtrados);
  }

  function mostrarTodosPresupuestos() {
    document.getElementById('presupuestosFechaFiltro').value = '';
    mostrarPresupuestos(todosLosPresupuestosGlobal);
  }

  function reimprimirPresupuesto(index) {
    const p = todosLosPresupuestosGlobal[index];
    if (!p) return;

    const subtotal = p.productos.reduce((acc, item) => acc + (Number(item.precio) * item.cantidad), 0);
    const nroPresupuestoFormatted = String(p.id).padStart(8, '0');

    window.electronAPI.getImagePath('logoperla2.png').then(logoPath => {
      const htmlContent = generarHTMLPresupuesto({
        logoPath,
        carrito: p.productos,
        subtotal: subtotal,
        ajusteLabel: '',
        ajusteValor: 0,
        totalFinal: p.total,
        nroPresupuestoManual: nroPresupuestoFormatted,
        cliente: p.cliente,
        direccion: p.direccion,
        localidad: p.localidad,
        cuit: p.cuit,
        telefono: p.telefono,
        fechaManual: p.fecha
      });

      const popup = window.open('', '_blank', 'width=800,height=800');
      popup.document.write(htmlContent);
      popup.document.close();
      setTimeout(() => popup.print(), 300);
    }).catch(err => {
      console.error('Error al reimprimir presupuesto:', err);
      alert('Error al generar el presupuesto.');
    });
  }

  // Variables globales para remitos
  let todosLosRemitosGlobal = [];

  function mostrarRemitos(remitos) {
    todosLosRemitosGlobal = remitos || [];
    const tbody = document.getElementById('remitosBody');
    const emptyMessage = document.getElementById('remitosEmptyMessage');

    if (!tbody) return;

    if (!remitos || remitos.length === 0) {
      tbody.innerHTML = '';
      if (emptyMessage) emptyMessage.style.display = 'block';
      return;
    }

    if (emptyMessage) emptyMessage.style.display = 'none';

    tbody.innerHTML = remitos.map((r, i) => {
      const nroFormatted = r.numero_remito ? r.numero_remito : `0001-${String(r.id).padStart(8, '0')}`;
      const productos = r.productos || [];
      const productosList = productos.map(item => {
        const obsStr = item.observaciones ? ` <span style="color: #64748b;">(${item.observaciones})</span>` : '';
        return `<li>${item.nombre} - ${item.cantidad}u${obsStr}</li>`;
      }).join('');

      return `
      <tr>
        <td><strong>Nº ${nroFormatted}</strong></td>
        <td>${r.cliente || 'Consumidor Final'}</td>
        <td>${typeof formatearFecha === 'function' ? formatearFecha(r.fecha) : r.fecha}</td>
        <td>${r.direccion || '—'}${r.localidad ? `, ${r.localidad}` : ''}</td>
        <td>${r.vendedor || 'Administrador'}</td>
        <td>
          <ul style="margin: 0; padding-left: 20px; text-align: left; font-size: 11px;">
            ${productosList || '<li>Sin productos</li>'}
          </ul>
        </td>
        <td>
          <button class="btn-print-remito" data-remito-index="${i}">🖨️ Ver / Reimprimir</button>
        </td>
      </tr>
    `;
    }).join('');
  }

  function filtrarRemitos() {
    const inputFecha = document.getElementById('remitosFechaFiltro');
    const fecha = inputFecha ? inputFecha.value : '';
    if (!fecha) {
      mostrarRemitos(todosLosRemitosGlobal);
      return;
    }

    const filtrados = todosLosRemitosGlobal.filter(r =>
      r.fecha && r.fecha.startsWith(fecha)
    );
    mostrarRemitos(filtrados);
  }

  function mostrarTodosRemitos() {
    const inputFecha = document.getElementById('remitosFechaFiltro');
    if (inputFecha) inputFecha.value = '';
    mostrarRemitos(todosLosRemitosGlobal);
  }

  function reimprimirRemitoFromGlobal(index) {
    const remito = todosLosRemitosGlobal[index];
    if (!remito) return;
    imprimirRemito(null, remito);
  }

  // Variables globales para tickets
  let todosLosTicketsGlobal = [];

  function mostrarTickets(tickets) {
    todosLosTicketsGlobal = tickets || [];
    const tbody = document.getElementById('ticketsBody');
    const emptyMessage = document.getElementById('ticketsEmptyMessage');

    if (!tbody) return;

    if (!tickets || tickets.length === 0) {
      tbody.innerHTML = '';
      emptyMessage.style.display = 'block';
      return;
    }

    emptyMessage.style.display = 'none';

    tbody.innerHTML = tickets.map((t, i) => {
      const productos = t.productos || [];
      const productosList = productos.map(p =>
        `<li>${p.nombre} - ${p.cantidad} x $${Number(p.precio).toFixed(2)}</li>`
      ).join('');

      return `
      <tr>
        <td>${formatearFecha(t.fecha)}</td>
        <td>
          <span class="badge-${String(t.tipo || 'Venta').toLowerCase()}">${t.tipo || 'Venta'}</span>
          ${t.anulado ? `<span style="background-color: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 20px; font-weight: 600; font-size: 10px; margin-left: 5px; display: inline-block;">ANULADA</span>` : ''}
        </td>
        <td>${t.metodo_pago || '-'}</td>
        <td>$${Number(t.total || 0).toFixed(2)}</td>
        <td>
          <ul style="margin: 0; padding-left: 20px;">
            ${productosList || '<li>Sin productos</li>'}
          </ul>
        </td>
        <td>
          <button class="btn-print-ticket" data-ticket-index="${i}">🖨️ Reimprimir</button>
          ${!t.anulado ? `<button class="btn-anular-ticket" data-ticket-id="${t.id}" data-ticket-total="${t.total}" style="background-color: #ef4444; color: white; border: none; padding: 4px 10px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-left: 5px;">Anular</button>` : ''}
        </td>
      </tr>
    `;
    }).join('');
  }

  function filtrarTickets() {
    const fecha = document.getElementById('ticketsFechaFiltro').value;
    if (!fecha) {
      mostrarTickets(todosLosTicketsGlobal);
      return;
    }

    const filtrados = todosLosTicketsGlobal.filter(t =>
      t.fecha && t.fecha.startsWith(fecha)
    );
    mostrarTickets(filtrados);
  }

  function mostrarTodosTickets() {
    document.getElementById('ticketsFechaFiltro').value = '';
    mostrarTickets(todosLosTicketsGlobal);
  }

  function formatearFecha(fechaStr) {
    try {
      const fecha = new Date(fechaStr);
      return fecha.toLocaleString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return fechaStr;
    }
  }

  function imprimirTicket(index) {
    const t = todosLosTicketsGlobal[index];
    if (!t) return;

    const productos = t.productos || [];
    const subtotal = t.subtotal || productos.reduce((acc, p) => acc + (Number(p.precio) * p.cantidad), 0);
    const total = Number(t.total) || 0;
    const descuento = t.descuento !== undefined ? t.descuento : Math.max(0, subtotal - total);

    const w = window.open('', '_blank', 'width=250,height=600');
    window.electronAPI.getImagePath('logoperla2.png').then(logoPath => {
      w.document.write(`
      <html>
        <head>
          <title>Ticket #${t.id}</title>
          <style>
            @media print {
              body {
                font-family: 'Courier New', monospace;
                width: 180px;
                margin: 0;
                padding: 5px;
                font-size: 9px;
                font-weight: bold;
                background: white;
                line-height: 1.1;
              }
              .no-print { display: none !important; }
            }
            @media screen {
              body {
                font-family: 'Courier New', monospace;
                width: 180px;
                margin: 0 auto;
                padding: 10px;
                font-size: 10px;
                font-weight: bold;
                background: white;
                line-height: 1.2;
              }
            }
            .header {
              text-align: center;
              margin-bottom: 8px;
              padding-bottom: 5px;
              border-bottom: 1px dashed #000;
            }
            .logo-container {
              text-align: center;
              margin-bottom: 5px;
            }
            .logo {
              max-width: 60px;
              max-height: 60px;
              width: auto;
              height: auto;
            }
                        h2 {
              text-align: center;
              margin: 3px 0;
              font-size: 14px;
              font-weight: bold;
              color: #000;
            }
            .direccion {
              text-align: center;
              font-size: 8px;
              font-weight: bold;
              color: #000;
              margin-bottom: 3px;
              line-height: 1.2;
            }
            .fecha {
              text-align: center;
              font-size: 8px;
              font-weight: bold;
              color: #000;
              margin-bottom: 8px;
              border-bottom: 1px dashed #000;
              padding-bottom: 4px;
            }
            .tipo-ticket {
              text-align: center;
              font-weight: bold;
              color: #000;
              margin: 3px 0;
              font-size: 9px;
            }
            .productos {
              margin: 8px 0;
            }
            .producto-item {
              margin-bottom: 4px;
              line-height: 1.1;
            }
            .producto-nombre {
              font-weight: bold;
              font-size: 9px;
              margin-bottom: 1px;
            }
            .producto-detalle {
              font-size: 8px;
              font-weight: bold;
            }
            .resumen {
              margin-top: 8px;
              border-top: 1px dashed #000;
              padding-top: 4px;
            }
            .resumen-fila {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
              font-size: 8px;
            }
            .resumen-total {
              border-top: 1px solid #000;
              padding-top: 3px;
              margin-top: 4px;
              font-weight: bold;
              font-size: 10px;
            }
            .metodo-pago {
              text-align: center;
              margin-top: 5px;
              font-size: 8px;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              margin-top: 10px;
              font-size: 8px;
              font-weight: bold;
              border-top: 1px dashed #000;
              padding-top: 4px;
              color: #000;
            }
            .gracias {
              font-size: 9px;
              font-weight: bold;
              margin-bottom: 2px;
            }
            @page {
              margin: 5mm;
              size: 58mm auto;
            }
          </style>
        </head>
        <body>
                    <div class="header">
            <div class="logo-container">
              <img src="file:///${logoPath}" class="logo" alt="Logo La Perla Desarrolladora S.A."
                   onerror="this.style.display='none';">
            </div>
            <h2>${EMPRESA.nombre}</h2>
            <div class="direccion">
              ${EMPRESA.rubros}<br>
              ${EMPRESA.direccion}<br>
              Tel: ${EMPRESA.telefono}
            </div>
          </div>

          <div class="fecha">
            Fecha: ${new Date(t.fecha).toLocaleString()}<br>
            Ticket N°: ${t.id}
          </div>

          <div class="tipo-ticket">TICKET DE VENTA</div>

          <div class="productos">
            ${productos.map(p => `
              <div class="producto-item">
                <div class="producto-nombre">${p.nombre}</div>
                <div class="producto-detalle">Cantidad: ${p.cantidad} x $${Number(p.precio).toFixed(2)} = $${(Number(p.precio) * p.cantidad).toFixed(2)}</div>
              </div>
            `).join('')}
          </div>

          <div class="resumen">
            <div class="resumen-fila">
              <span>Subtotal:</span>
              <span>$${subtotal.toFixed(2)}</span>
            </div>
            ${descuento > 0 ? `
            <div class="resumen-fila">
              <span>Descuento:</span>
              <span>-$${descuento.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="resumen-fila resumen-total">
              <span>TOTAL:</span>
              <span>$${total.toFixed(2)}</span>
            </div>
          </div>

          <div class="metodo-pago">Método de pago: ${t.metodo_pago}</div>

          <div class="footer">
            <div class="gracias">¡GRACIAS POR SU COMPRA!</div>
          </div>

          <div class="no-print">
            <button onclick="window.print()" style="margin: 10px; padding: 5px 10px;">Imprimir Ticket</button>
          </div>
        </body>
      </html>
    `);
      w.document.close();
      setTimeout(() => w.print(), 300);
    }).catch(() => {
      // Fallback sin logo
      w.document.write(`
      <html>
        <head>
          <title>Ticket #${t.id}</title>
          <style>
            body { font-family: 'Courier New', monospace; width: 180px; margin: 0 auto; padding: 8px; font-size: 10px; line-height: 1.2; font-weight: bold; }
            h2 { text-align: center; margin-bottom: 8px; font-size: 14px; font-weight: bold; }
            .fecha { text-align: center; font-size: 8px; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 4px; }
            .tipo-ticket { text-align: center; font-weight: bold; margin: 3px 0; font-size: 9px; }
            .producto-item { margin-bottom: 4px; }
            .producto-nombre { font-weight: bold; font-size: 9px; }
            .producto-detalle { font-size: 8px; font-weight: bold; }
            .resumen { margin-top: 8px; border-top: 1px dashed #000; padding-top: 4px; }
            .resumen-fila { display: flex; justify-content: space-between; font-size: 8px; margin-bottom: 2px; }
            .resumen-total { border-top: 1px solid #000; padding-top: 3px; margin-top: 4px; font-weight: bold; font-size: 10px; }
            .metodo-pago { text-align: center; margin-top: 5px; font-size: 8px; font-weight: bold; }
            .footer { text-align: center; margin-top: 10px; font-size: 8px; border-top: 1px dashed #000; padding-top: 4px; font-weight: bold; }
            .gracias { font-size: 9px; font-weight: bold; }
            @page { margin: 5mm; size: 58mm auto; }
          </style>
        </head>
        <body>
                    <h2>${EMPRESA.nombre}</h2>
          <div class="direccion" style="text-align: center; font-size: 8px; font-weight: bold; color: #000; margin-bottom: 3px; line-height: 1.2;">
            ${EMPRESA.rubros}<br>
            ${EMPRESA.direccion}<br>
            Tel: ${EMPRESA.telefono}
          </div>
          <div class="fecha">Fecha: ${new Date(t.fecha).toLocaleString()}<br>Ticket N°: ${t.id}</div>
          <div class="tipo-ticket">TICKET DE VENTA</div>
          <div class="productos">
            ${productos.map(p => `
              <div class="producto-item">
                <div class="producto-nombre">${p.nombre}</div>
                <div class="producto-detalle">Cantidad: ${p.cantidad} x $${Number(p.precio).toFixed(2)} = $${(Number(p.precio) * p.cantidad).toFixed(2)}</div>
              </div>
            `).join('')}
          </div>
          <div class="resumen">
            <div class="resumen-fila">
              <span>Subtotal:</span>
              <span>$${subtotal.toFixed(2)}</span>
            </div>
            ${descuento > 0 ? `
            <div class="resumen-fila">
              <span>Descuento:</span>
              <span>-$${descuento.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="resumen-fila resumen-total">
              <span>TOTAL:</span>
              <span>$${total.toFixed(2)}</span>
            </div>
          </div>
          <div class="metodo-pago">Método de pago: ${t.metodo_pago}</div>
          <div class="footer"><div class="gracias">¡GRACIAS POR SU COMPRA!</div></div>
        </body>
      </html>
    `);
      w.document.close();
      setTimeout(() => w.print(), 300);
    });
  }

  async function anularVenta(ticketId, ticketTotal) {
    const ajusteData = {
      tipo: 'Venta anulada',
      monto: -Math.abs(ticketTotal),
      motivo: 'Venta anulada',
      fecha: (() => {
        const pad = (n) => String(n).padStart(2, '0');
        const now = new Date();
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      })(),
      observacion: `Anulación automática del Ticket #${ticketId}`,
      venta_id: ticketId
    };

    try {
      const res = await window.electronAPI.saveAjuste(ajusteData);
      if (res.success) {
        mostrarToast('Venta anulada con éxito. Se generó un Ajuste de Caja.', 'success');
        
        // Reload tickets list if visible
        const ticketsSection = document.getElementById('ticketsSection');
        if (ticketsSection && ticketsSection.style.display === 'block') {
          const tickets = await window.electronAPI.getTickets();
          mostrarTickets(tickets);
        }
        
        // Update Finanzas dashboard
        if (typeof window.__updateFinanzasChart === 'function') {
          window.__updateFinanzasChart();
        }
      } else {
        mostrarToast('Error al anular la venta: ' + res.error, 'error');
      }
    } catch (err) {
      console.error('Error anularVenta:', err);
      mostrarToast('Error al anular la venta', 'error');
    }
  }

  function initInformes() {
    console.log('Iniciando informes...');

    const btnPeriodos = document.querySelectorAll('.btn-periodo');
    const periodoActualSpan = document.getElementById('periodo-actual');
    const informesFechaInput = document.getElementById('informesFecha');
    const btnBuscarInformesFecha = document.getElementById('btnBuscarInformesFecha');
    const btnLimpiarInformesFecha = document.getElementById('btnLimpiarInformesFecha');
    let periodo = 'day'; // day, week, month, year
    let fechaSeleccionada = null;
    let globalProductos = [];

    // Referencias a elementos
    const productoEstrella = document.getElementById('producto-estrella');
    const productoTriste = document.getElementById('producto-nadie');
    const categoriaTop = document.getElementById('categoria-top');
    const tablaMas = document.querySelector('#tabla-mas-vendidos tbody');
    const tablaMenos = document.querySelector('#tabla-menos-vendidos tbody');
    const productosEntraron = document.getElementById('productos-entraron');
    const productosBorrados = document.getElementById('productos-borrados');
    const productosVendidos = document.getElementById('productos-vendidos');
    const productosStock = document.getElementById('productos-stock');
    const tablaReponer = document.querySelector('#tabla-reponer tbody');
    const btnReponerPrev = document.getElementById('btnReponerPrev');
    const btnReponerNext = document.getElementById('btnReponerNext');
    const reponerPageInfo = document.getElementById('reponerPageInfo');
    const reponerPagination = document.getElementById('reponerPagination');
    const canvasCategorias = document.getElementById('chartCategorias');
    const canvasMetodos = document.getElementById('chartMetodos');
    const resumenCards = document.querySelectorAll('.resumen-clickable');
    const summaryModal = document.getElementById('summaryDetailModal');
    const summaryModalTitle = document.getElementById('summaryDetailTitle');
    const summaryModalList = document.getElementById('summaryDetailList');
    const btnCloseSummaryDetail = document.getElementById('btnCloseSummaryDetail');
    const btnCloseSummaryDetailFooter = document.getElementById('btnCloseSummaryDetailFooter');
    const btnPrintSummary = document.getElementById('btnPrintSummary');
    let summaryModalCurrentType = null;

    let chartCategorias = null;
    let chartMetodos = null;
    let porReponerData = [];
    let reponerCurrentPage = 1;
    const reponerPerPage = 15;
    const summaryData = {
      entraron: [],
      borrados: [],
      vendidos: [],
      stock: []
    };

    // Función para obtener el rango de fechas según período
    function getRangoFechas(periodo) {
      const hoy = new Date();
      let inicio, fin;
      fin = new Date(hoy);
      fin.setHours(23, 59, 59, 999);

      switch (periodo) {
        case 'day':
          inicio = new Date(hoy);
          inicio.setHours(0, 0, 0, 0);
          break;
        case 'week':
          inicio = new Date(hoy);
          inicio.setDate(hoy.getDate() - hoy.getDay() + 1); // Lunes
          inicio.setHours(0, 0, 0, 0);
          break;
        case 'month':
          inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
          break;
        case 'year':
          inicio = new Date(hoy.getFullYear(), 0, 1);
          break;
      }
      return { inicio, fin };
    }

    // Función para extraer productos de una venta (del detalle)
    function extraerProductosDeVenta(detalle) {
      // Formato típico: "Productos: Producto1 (cantidad), Producto2 (cantidad) ..."
      const match = detalle.match(/Productos: (.+?) \|/);
      if (!match) return [];
      const productosStr = match[1];
      const items = productosStr.split(', ');
      return items.map(item => {
        const partes = item.match(/(.+) \((\d+)[a-zA-Z]*\)/);
        if (partes) {
          return { nombre: partes[1].trim(), cantidad: parseInt(partes[2]) };
        }
        return null;
      }).filter(p => p);
    }

    function parseItemForModal(text, type, productos) {
      let namePart = text;
      let suffixPart = '';
      let prefixPart = '';

      if (type === 'vendidos') {
        const isAnulada = text.includes('(ANULADA)');
        const cleanText = text.replace(' (ANULADA)', '');
        const match = cleanText.match(/(.+) - (\d+)\s*(.*)$/);
        if (match) {
          namePart = match[1].trim();
          suffixPart = ` - ${match[2]} ${match[3] || 'u'}`;
          if (isAnulada) {
            suffixPart += ` <span class="badge-anulada-modal" style="background-color: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; margin-left: 5px;">ANULADA</span>`;
          }
        }
      } else if (type === 'borrados') {
        // Formato: "ID: 15, Nombre: NombreProducto"
        const match = text.match(/^(ID:\s*\d+,\s*Nombre:\s*)(.+)$/i);
        if (match) {
          prefixPart = match[1];
          namePart = match[2].trim();
        }
      }

      let codigo = null;
      let cleanName = namePart;

      // 1. Intentar buscar en la base de datos de productos por nombre exacto
      const prod = productos.find(p => p.nombre === namePart);
      if (prod) {
        if (prod.codigo && prod.codigo.trim()) {
          codigo = prod.codigo.trim();
          // Eliminar el código del nombre si está al final entre paréntesis
          const codeParen = `(${codigo})`;
          if (cleanName.endsWith(codeParen)) {
            cleanName = cleanName.substring(0, cleanName.length - codeParen.length).trim();
          }
        }
      } else {
        // 2. Si no se encuentra (borrado), extraer código de los paréntesis finales si cumple el patrón de código
        const matchParen = namePart.match(/\(([^)]+)\)$/);
        if (matchParen) {
          const potentialCode = matchParen[1].trim();
          if (potentialCode.length >= 3 && /^[A-Za-z0-9-]+$/.test(potentialCode)) {
            codigo = potentialCode;
            cleanName = namePart.substring(0, namePart.length - matchParen[0].length).trim();
          }
        }
      }

      return {
        prefix: prefixPart,
        codigo: codigo,
        name: cleanName,
        suffix: suffixPart
      };
    }

    function openSummaryModal(type) {
      if (!summaryModal || !summaryModalTitle || !summaryModalList) return;

      const titles = {
        entraron: 'Productos que entraron',
        borrados: 'Productos borrados',
        vendidos: 'Productos vendidos',
        stock: 'Stock actual'
      };

      const items = Array.isArray(summaryData[type]) ? summaryData[type] : [];
      summaryModalTitle.textContent = titles[type] || 'Detalle';
      summaryModalList.innerHTML = '';

      if (items.length === 0) {
        summaryModalList.innerHTML = '<li class="summary-detail-empty">No hay datos para mostrar en este período.</li>';
      } else {
        items.forEach((text) => {
          const li = document.createElement('li');
          if (type === 'vendidos' || type === 'borrados') {
            const parsed = parseItemForModal(text, type, globalProductos);
            if (parsed.codigo) {
              li.innerHTML = `${parsed.prefix}<span class="sku-badge">${parsed.codigo}</span><span class="sku-separator"> | </span>${parsed.name}${parsed.suffix}`;
            } else {
              li.innerHTML = `${parsed.prefix}${parsed.name}${parsed.suffix}`;
            }
          } else {
            li.textContent = text;
          }
          summaryModalList.appendChild(li);
        });
      }

      // RESUMEN para productos vendidos
      const totalContainer = document.getElementById('summaryDetailTotalContainer');
      if (type === 'vendidos') {
        let totalVendidos = 0;
        let totalAnulados = 0;
        const lis = summaryModalList.querySelectorAll('li');
        lis.forEach(li => {
          const txt = li.textContent || '';
          const isAnulada = txt.includes('ANULADA');
          const cleanText = txt.replace('ANULADA', '').trim();
          const match = cleanText.match(/(\d+)\s*u?\s*$/);
          if (match) {
            const qty = parseInt(match[1]) || 0;
            if (isAnulada) {
              totalAnulados += qty;
            } else {
              totalVendidos += qty;
            }
          }
        });
        const totalNetas = totalVendidos - totalAnulados;
        if (totalContainer) {
          totalContainer.style.display = 'block';
          document.getElementById('summaryDetailTotalVendidos').textContent = `${totalVendidos} u`;
          document.getElementById('summaryDetailTotalAnulados').textContent = `${totalAnulados} u`;
          document.getElementById('summaryDetailTotalNetas').textContent = `${totalNetas} u`;
        }
      } else {
        if (totalContainer) totalContainer.style.display = 'none';
      }

      summaryModalCurrentType = type;
      if (btnPrintSummary) {
        btnPrintSummary.style.display = type === 'vendidos' ? 'inline-flex' : 'none';
      }

      summaryModal.classList.add('active');
    }

    function printSummaryModal() {
      if (!summaryModalList || !summaryModalCurrentType) return;
      const items = Array.from(summaryModalList.querySelectorAll('li')).map(li => li.textContent).filter(Boolean);
      const title = summaryModalCurrentType === 'vendidos' ? 'Productos vendidos' : 'Detalle';

      let footerHtml = '';
      if (summaryModalCurrentType === 'vendidos') {
        const totalVendidos = document.getElementById('summaryDetailTotalVendidos').textContent;
        const totalAnulados = document.getElementById('summaryDetailTotalAnulados').textContent;
        const totalNetas = document.getElementById('summaryDetailTotalNetas').textContent;
        
        footerHtml = `
          <div style="margin-top: 15px; border-top: 1px dashed #000; padding-top: 5px; font-size: 11px; font-weight: bold; line-height: 1.4;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span>Productos vendidos:</span>
              <span>${totalVendidos}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px; color: #991b1b;">
              <span>Productos anulados:</span>
              <span>${totalAnulados}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px dashed #000; padding-top: 3px; margin-top: 3px; color: #065f46;">
              <span>Ventas netas:</span>
              <span>${totalNetas}</span>
            </div>
          </div>
        `;
      }

      const html = `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              width: 280px; 
              margin: 0 auto; 
              padding: 10px; 
              font-size: 11px; 
              line-height: 1.3;
              font-weight: bold;
            }
            h1 { 
              font-size: 16px; 
              margin-bottom: 8px; 
              text-align: center;
              font-weight: bold;
            }
            ul { 
              list-style: none; 
              padding: 0; 
              margin: 8px 0; 
            }
            li { 
              padding: 4px 6px; 
              border-bottom: 1px solid #eee; 
              margin-bottom: 2px; 
              font-size: 11px;
              line-height: 1.2;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <ul>
            ${items.map(item => `<li>${item}</li>`).join('')}
          </ul>
          ${footerHtml}
        </body>
      </html>`;

      const w = window.open('', '_blank', 'width=700,height=800');
      if (!w) return;
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 300);
    }

    function closeSummaryModal() {
      if (!summaryModal) return;
      summaryModal.classList.remove('active');
    }

    function renderReponerPage() {
      if (!tablaReponer) return;

      const totalItems = porReponerData.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / reponerPerPage));
      if (reponerCurrentPage > totalPages) reponerCurrentPage = totalPages;

      if (totalItems === 0) {
        tablaReponer.innerHTML = '<tr><td colspan="3">No hay productos con stock bajo</td></tr>';
        if (reponerPagination) reponerPagination.style.display = 'none';
        return;
      }

      const start = (reponerCurrentPage - 1) * reponerPerPage;
      const end = start + reponerPerPage;
      const pageRows = porReponerData.slice(start, end);

      tablaReponer.innerHTML = pageRows
        .map((p) => `<tr data-product-id="${p.id}">
        <td>${p.nombre}</td>
        <td>
          <span class="stock-editable" data-product-id="${p.id}" data-current-stock="${p.stock}" 
                style="cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background 0.2s;"
                title="Click para editar stock">
            ${p.stock}
          </span>
        </td>
        <td>${p.unidad}</td>
      </tr>`)
        .join('');

      if (reponerPagination) reponerPagination.style.display = 'flex';
      if (reponerPageInfo) reponerPageInfo.textContent = `Página ${reponerCurrentPage} de ${totalPages} (${totalItems} productos)`;
      if (btnReponerPrev) btnReponerPrev.disabled = reponerCurrentPage === 1;
      if (btnReponerNext) btnReponerNext.disabled = reponerCurrentPage === totalPages;

      // Re-attach event listeners after table reload
      setupStockEditing();
    }

    // Función principal para cargar datos
    async function cargarInformes() {
      try {
        let fechaInicio = null;
        let fechaFin = null;
        let historial = [];

        if (fechaSeleccionada) {
          historial = await window.electronAPI.getHistorialByDate(fechaSeleccionada);
        } else {
          const rango = getRangoFechas(periodo);
          fechaInicio = rango.inicio.toISOString().split('T')[0];
          fechaFin = rango.fin.toISOString().split('T')[0];

          if (window.electronAPI.getHistorialByRange) {
            historial = await window.electronAPI.getHistorialByRange(fechaInicio, fechaFin);
          } else {
            const hoy = new Date().toISOString().split('T')[0];
            historial = await window.electronAPI.getHistorialByDate(hoy);
            console.warn('Usando solo historial de hoy');
          }
        }

        // Obtener todos los productos
        const productos = await window.electronAPI.getProducts();
        globalProductos = productos;

        // Procesar historial
        // Procesar tickets para obtener ventas de productos (con soporte para anulaciones)
        const tickets = await window.electronAPI.getTickets();
        const ticketsFiltrados = tickets.filter(t => {
          if (!t.fecha) return false;
          const ticketDateStr = t.fecha.split(' ')[0].split('T')[0];
          if (fechaSeleccionada) {
            return ticketDateStr === fechaSeleccionada;
          } else {
            return ticketDateStr >= fechaInicio && ticketDateStr <= fechaFin;
          }
        });

        const ventasPorProducto = {}; // { nombre: cantidad }
        const ventasPorProductoAnulado = {}; // { nombre: cantidad }
        const ventasPorCategoria = {}; // { categoria: cantidad }
        let ventas = [];

        ticketsFiltrados.forEach(t => {
          if ((t.tipo || 'Venta') !== 'Venta') return;
          const targetMap = t.anulado ? ventasPorProductoAnulado : ventasPorProducto;
          const tProds = t.productos || [];
          tProds.forEach(p => {
            targetMap[p.nombre] = (targetMap[p.nombre] || 0) + p.cantidad;
            if (!t.anulado) {
              const prod = productos.find(pr => pr.nombre === p.nombre);
              if (prod && prod.categoria) {
                ventasPorCategoria[prod.categoria] = (ventasPorCategoria[prod.categoria] || 0) + p.cantidad;
              }
            }
          });
        });

        // Procesar historial para altas y bajas
        let altas = 0, bajas = 0;
        const altasDetalle = [];
        const bajasDetalle = [];

        historial.forEach(reg => {
          const accion = reg.accion.toLowerCase();
          if (accion.includes('venta')) {
            ventas.push(reg);
          } else if (accion.includes('importar excel') || accion.includes('agregar producto')) {
            altas++;
            altasDetalle.push(reg.detalle || reg.accion || 'Movimiento de alta');
          } else if (accion.includes('eliminar producto')) {
            bajas++;
            bajasDetalle.push(reg.detalle || reg.accion || 'Movimiento de baja');
          }
        });

        // Producto estrella (más vendido)
        let maxVendido = { nombre: '-', cantidad: 0 };
        let minVendido = { nombre: '-', cantidad: Infinity };
        for (const [nombre, cant] of Object.entries(ventasPorProducto)) {
          if (cant > maxVendido.cantidad) maxVendido = { nombre, cantidad: cant };
          if (cant < minVendido.cantidad) minVendido = { nombre, cantidad: cant };
        }
        if (maxVendido.cantidad === 0) maxVendido.nombre = 'Sin ventas';
        if (minVendido.cantidad === Infinity) minVendido.nombre = 'Sin ventas';

        productoEstrella.textContent = `${maxVendido.nombre} (${maxVendido.cantidad} u)`;
        productoTriste.textContent = minVendido.nombre !== 'Sin ventas' ? `${minVendido.nombre} (${minVendido.cantidad} u)` : 'Sin ventas';

        // Categoría top
        let topCat = { nombre: '-', cantidad: 0 };
        for (const [cat, cant] of Object.entries(ventasPorCategoria)) {
          if (cant > topCat.cantidad) topCat = { nombre: cat, cantidad: cant };
        }
        categoriaTop.textContent = topCat.nombre !== '-' ? `${topCat.nombre} (${topCat.cantidad} u)` : '-';

        // Tabla más vendidos (orden descendente, top 5)
        const sortedMas = Object.entries(ventasPorProducto).sort((a, b) => b[1] - a[1]).slice(0, 5);
        tablaMas.innerHTML = sortedMas.map(([nom, cant]) => `<tr><td>${nom}</td><td>${cant}</td></tr>`).join('') || '<tr><td colspan="2">Sin datos</td></tr>';

        // Tabla menos vendidos (orden ascendente, top 5)
        const sortedMenos = Object.entries(ventasPorProducto).sort((a, b) => a[1] - b[1]).slice(0, 5);
        tablaMenos.innerHTML = sortedMenos.map(([nom, cant]) => `<tr><td>${nom}</td><td>${cant}</td></tr>`).join('') || '<tr><td colspan="2">Sin datos</td></tr>';

        // Resumen registros
        productosEntraron.textContent = altas;
        productosBorrados.textContent = bajas;
        const totalVendidos = Object.values(ventasPorProducto).reduce((a, b) => a + b, 0);
        productosVendidos.textContent = totalVendidos;
        const totalStock = productos.reduce((acc, p) => acc + p.stock, 0);
        productosStock.textContent = totalStock;

        // Datos de detalle para los modales de tarjetas
        summaryData.entraron = altasDetalle;
        summaryData.borrados = bajasDetalle;
        const listNormal = Object.entries(ventasPorProducto)
          .sort((a, b) => b[1] - a[1])
          .map(([nombre, cantidad]) => `${nombre} - ${cantidad} u`);
        const listAnulada = Object.entries(ventasPorProductoAnulado)
          .sort((a, b) => b[1] - a[1])
          .map(([nombre, cantidad]) => `${nombre} - ${cantidad} u (ANULADA)`);
        summaryData.vendidos = [...listNormal, ...listAnulada];
        summaryData.stock = productos
          .slice()
          .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)))
          .map((p) => `${p.nombre} - ${p.stock} ${p.unidad || 'u'}`);

        // Productos por reponer (stock < 10)
        porReponerData = productos.filter(p => p.stock < 10).sort((a, b) => a.stock - b.stock);
        reponerCurrentPage = 1;
        renderReponerPage();

        // Gráfico de categorías
        const labelsCat = Object.keys(ventasPorCategoria);
        const dataCat = Object.values(ventasPorCategoria);
        if (canvasCategorias) {
          const ctx = canvasCategorias.getContext('2d');
          if (chartCategorias) chartCategorias.destroy();
          chartCategorias = new Chart(ctx, {
            type: 'bar',
            data: {
              labels: labelsCat,
              datasets: [{
                label: 'Unidades vendidas',
                data: dataCat,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: { y: { beginAtZero: true } }
            }
          });
        }

        // Gráfico de métodos de pago (extraer del historial de ventas con monto y cantidad)
        const metodos = { 'Efectivo': 0, 'Mercado Pago': 0, 'Transferencia': 0, 'Otros': 0 };
        const montos = { 'Efectivo': 0, 'Mercado Pago': 0, 'Transferencia': 0, 'Otros': 0 };

        historial.forEach(reg => {
          if (reg.accion.toLowerCase().includes('venta')) {
            let metodo = 'Otros';
            if (reg.detalle.includes('Pago: Efectivo')) metodo = 'Efectivo';
            else if (reg.detalle.includes('Pago: Mercado Pago')) metodo = 'Mercado Pago';
            else if (reg.detalle.includes('Pago: Transferencia')) metodo = 'Transferencia';

            metodos[metodo]++;

            // Intentar extraer el monto total de la venta del detalle
            const totalMatch = reg.detalle.match(/Total:\s*\$([\d.,]+)/i);
            if (totalMatch) {
              const valor = parseFloat(totalMatch[1]) || 0;
              montos[metodo] += valor;
            }
          }
        });

        const labelsMetodos = Object.keys(metodos).filter(k => metodos[k] > 0);
        const dataMetodos = labelsMetodos.map(k => metodos[k]);
        if (canvasMetodos) {
          const ctx = canvasMetodos.getContext('2d');
          if (chartMetodos) chartMetodos.destroy();
          chartMetodos = new Chart(ctx, {
            type: 'pie',
            data: {
              labels: labelsMetodos,
              datasets: [{
                data: dataMetodos,
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const label = context.label || '';
                      const count = context.parsed || 0;
                      const totalMonto = montos[label] || 0;
                      const montoFormateado = '$' + totalMonto.toLocaleString('es-AR', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      });
                      const ventasLabel = count === 1 ? 'venta' : 'ventas';
                      return ` ${count} ${ventasLabel} · ${montoFormateado}`;
                    }
                  }
                }
              }
            }
          });
        }

        if (periodoActualSpan) {
          if (fechaSeleccionada) {
            periodoActualSpan.textContent = `Informe del ${fechaSeleccionada}`;
          } else {
            periodoActualSpan.textContent = `Período: ${periodo === 'day' ? 'Hoy' :
                periodo === 'week' ? 'Semana' :
                  periodo === 'month' ? 'Mes' : 'Año'
              }`;
          }
        }

      } catch (err) {
        console.error('Error cargando informes:', err);
        alert('Error al cargar los informes');
      }
    }

    // Eventos de los botones de período
    btnPeriodos.forEach(btn => {
      btn.addEventListener('click', (e) => {
        periodo = e.target.dataset.periodo;
        fechaSeleccionada = null;
        if (informesFechaInput) informesFechaInput.value = '';
        // Remover clase activa de todos y poner al actual
        btnPeriodos.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        cargarInformes();
      });
    });

    btnBuscarInformesFecha?.addEventListener('click', () => {
      const fecha = informesFechaInput?.value;
      if (!fecha) {
        alert('Seleccione una fecha');
        return;
      }
      fechaSeleccionada = fecha;
      btnPeriodos.forEach(b => b.classList.remove('active'));
      cargarInformes();
    });

    btnLimpiarInformesFecha?.addEventListener('click', () => {
      fechaSeleccionada = null;
      if (informesFechaInput) informesFechaInput.value = '';
      btnPeriodos.forEach(b => b.classList.remove('active'));
      btnPeriodos[0]?.classList.add('active');
      periodo = 'day';
      cargarInformes();
    });

    btnReponerPrev?.addEventListener('click', () => {
      if (reponerCurrentPage > 1) {
        reponerCurrentPage--;
        renderReponerPage();
      }
    });

    btnReponerNext?.addEventListener('click', () => {
      const totalPages = Math.max(1, Math.ceil(porReponerData.length / reponerPerPage));
      if (reponerCurrentPage < totalPages) {
        reponerCurrentPage++;
        renderReponerPage();
      }
    });

    // Abrir modal al hacer click en cada tarjeta de resumen
    resumenCards.forEach((card) => {
      card.addEventListener('click', () => {
        openSummaryModal(card.dataset.summaryType);
      });
    });

    // Cierre de modal por botón
    btnCloseSummaryDetail?.addEventListener('click', closeSummaryModal);
    btnCloseSummaryDetailFooter?.addEventListener('click', closeSummaryModal);
    btnPrintSummary?.addEventListener('click', printSummaryModal);

    // Cierre de modal al clickear fuera del contenido
    summaryModal?.addEventListener('click', (e) => {
      if (e.target === summaryModal) closeSummaryModal();
    });

    // ===== FUNCIÓN PARA EDITAR STOCK DESDE TABLA =====
    function setupStockEditing() {
      // Agregar eventos de click a los elementos editables
      const stockElements = document.querySelectorAll('.stock-editable');

      stockElements.forEach(element => {
        element.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();

          const productId = this.dataset.productId;
          const currentStock = parseFloat(this.dataset.currentStock);

          // Crear input para edición
          const input = document.createElement('input');
          input.type = 'number';
          input.value = currentStock;
          input.min = '0';
          input.step = '1';
          input.style.cssText = `
          width: 80px;
          padding: 4px 8px;
          border: 2px solid #2563eb;
          border-radius: 4px;
          font-size: inherit;
          font-family: inherit;
          text-align: center;
          outline: none;
          background: white;
        `;

          // Reemplazar el span con el input
          this.replaceWith(input);
          input.focus();
          input.select();

          // Función para guardar cambios
          const saveStockChange = async () => {
            const newStock = parseFloat(input.value);

            // Validar que sea un número válido
            if (isNaN(newStock) || newStock < 0) {
              alert('Por favor ingrese un número válido mayor o igual a 0');
              input.focus();
              return;
            }

            // Validar que sea mayor que el stock actual
            if (newStock <= currentStock) {
              alert('Solo se permiten aumentos de stock desde esta pantalla');
              input.focus();
              return;
            }

            // Calcular diferencia
            const difference = newStock - currentStock;

            // Actualizar stock del producto
            await editarStockDesdeTabla(productId, newStock, difference);
          };

          // Eventos
          input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
              e.preventDefault();
              saveStockChange();
            } else if (e.key === 'Escape') {
              // Cancelar edición - restaurar valor original
              const span = document.createElement('span');
              span.className = 'stock-editable';
              span.dataset.productId = productId;
              span.dataset.currentStock = currentStock;
              span.style.cssText = 'cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background 0.2s;';
              span.title = 'Click para editar stock';
              span.textContent = currentStock;
              input.replaceWith(span);
              setupStockEditing(); // Re-agregar eventos
            }
          });

          input.addEventListener('blur', function () {
            // Pequeño delay para permitir que el click en otros elementos funcione
            setTimeout(saveStockChange, 200);
          });
        });

        // Efecto hover
        element.addEventListener('mouseenter', function () {
          this.style.background = '#eef2ff';
        });

        element.addEventListener('mouseleave', function () {
          this.style.background = 'transparent';
        });
      });
    }

    // ===== FUNCIÓN PARA ACTUALIZAR STOCK =====
    async function editarStockDesdeTabla(productId, newStock, difference) {
      try {
        // Buscar el producto en el array de productos
        const producto = window.productos.find(p => p.id == productId);
        if (!producto) {
          console.error('Producto no encontrado:', productId);
          return;
        }

        const oldStock = producto.stock;

        // Actualizar stock en el array
        producto.stock = newStock;

        // Actualizar en la base de datos
        const res = await window.electronAPI.updateProduct({
          id: productId,
          codigo: producto.codigo,
          nombre: producto.nombre,
          categoria: producto.categoria,
          stock: newStock,
          precio: producto.precio,
          precio_costo: producto.precio_costo,
          unidad: producto.unidad
        });

        if (res && res.success) {
          // Registrar en historial
          await registrarEnHistorial({
            tipo: 'Reposición de stock',
            producto: producto.nombre,
            cantidad: difference,
            stock_anterior: oldStock,
            stock_nuevo: newStock,
            motivo: 'Reposición desde informe de stock bajo',
            fecha: new Date().toISOString()
          });

          // Actualizar métricas
          updateInventoryStats();

          // Recargar la tabla de informes para reflejar cambios
          await cargarInformes();

          // Mostrar mensaje de éxito
          const mensaje = `Stock actualizado: ${producto.nombre} +${difference} (${oldStock} -> ${newStock})`;
          mostrarToast(mensaje, 'success');

        } else {
          // Revertir cambio si falló
          producto.stock = oldStock;
          alert('Error al actualizar el stock');
        }

      } catch (err) {
        console.error('Error actualizando stock:', err);
        alert('Error al actualizar el stock');
      }
    }

    // ===== FUNCIÓN PARA REGISTRAR EN HISTORIAL =====
    async function registrarEnHistorial(datos) {
      try {
        // Formatear datos para el historial
        const historialEntry = {
          fecha: datos.fecha,
          tipo: 'Ajuste de Inventario',
          detalle: `${datos.producto}: +${datos.cantidad} unidades (${datos.stock_anterior} -> ${datos.stock_nuevo})`,
          metodo_pago: 'Sistema',
          total: 0,
          productos: [{
            nombre: datos.producto,
            cantidad: datos.cantidad,
            precio: 0,
            accion: 'Reposición'
          }]
        };

        // Guardar en la base de datos
        if (window.electronAPI && window.electronAPI.addHistorial) {
          await window.electronAPI.addHistorial(historialEntry);
        } else {
          // Fallback: guardar en localStorage
          let historial = JSON.parse(localStorage.getItem('historial') || '[]');
          historial.unshift(historialEntry);
          localStorage.setItem('historial', JSON.stringify(historial));
        }

        console.log('Registrado en historial:', historialEntry);

      } catch (err) {
        console.error('Error registrando en historial:', err);
      }
    }

    

    // Inicializar con el primer período (day)
    btnPeriodos[0]?.classList.add('active');
    cargarInformes();

    // Configurar edición de stock después de cargar datos
    setTimeout(() => {
      setupStockEditing();
    }, 500);
  }


  // === Selector de Historial (Fase 2) ===
  document.addEventListener('click', async (e) => {
    // 1. Abrir el selector cuando se presiona "Ver Tickets" en el panel principal
    if (e.target && e.target.id === 'btnVerTickets') {
      const ticketsSection = document.getElementById('ticketsSection');
      const presupuestosSection = document.getElementById('presupuestosSection');
      const historialSection = document.getElementById('historialSection');
      const modalHistorySelector = document.getElementById('modalHistorySelector');

      if (
        (ticketsSection && ticketsSection.style.display === 'block') ||
        (presupuestosSection && presupuestosSection.style.display === 'block')
      ) {
        // Si ya está visible alguna sección, la ocultamos (alternancia)
        if (ticketsSection) ticketsSection.style.display = 'none';
        if (presupuestosSection) presupuestosSection.style.display = 'none';
        historialSection.style.display = 'block';
      } else {
        // Si no está visible, mostramos el modal selector
        if (modalHistorySelector) {
          modalHistorySelector.style.display = 'flex';
        }
      }
    }

    // 2. Cerrar el modal selector con la cruz, cancelar o haciendo click afuera
    const modalHistorySelector = document.getElementById('modalHistorySelector');
    if (modalHistorySelector && modalHistorySelector.style.display === 'flex') {
      if (
        (e.target && e.target.closest('#btnCloseHistorySelector')) ||
        e.target === modalHistorySelector
      ) {
        modalHistorySelector.style.display = 'none';
      }
    }

    // 3. Opción "Ver Tickets" dentro del modal selector (ejecuta lógica original)
    if (e.target && e.target.closest('#btnHistorialTicketsOption')) {
      if (modalHistorySelector) modalHistorySelector.style.display = 'none';

      const ticketsSection = document.getElementById('ticketsSection');
      const presupuestosSection = document.getElementById('presupuestosSection');
      const historialSection = document.getElementById('historialSection');

      try {
        const tickets = await window.electronAPI.getTickets();

        if (!tickets || tickets.length === 0) {
          mostrarTickets([]);
        } else {
          mostrarTickets(tickets);
        }
        if (presupuestosSection) presupuestosSection.style.display = 'none';
        if (ticketsSection) ticketsSection.style.display = 'block';
        historialSection.style.display = 'none';

      } catch (err) {
        console.error('Error obteniendo tickets:', err);
        alert('Error obteniendo tickets: ' + err.message);
      }
    }

    // 4. Opción "Ver Presupuestos" (Fase 2)
    if (e.target && e.target.closest('#btnHistorialPresupuestosOption')) {
      if (modalHistorySelector) modalHistorySelector.style.display = 'none';

      const ticketsSection = document.getElementById('ticketsSection');
      const presupuestosSection = document.getElementById('presupuestosSection');
      const historialSection = document.getElementById('historialSection');

      try {
        const presupuestos = await window.electronAPI.getPresupuestos();

        if (!presupuestos || presupuestos.length === 0) {
          mostrarPresupuestos([]);
        } else {
          mostrarPresupuestos(presupuestos);
        }
        if (ticketsSection) ticketsSection.style.display = 'none';
        if (presupuestosSection) presupuestosSection.style.display = 'block';
        historialSection.style.display = 'none';

      } catch (err) {
        console.error('Error obteniendo presupuestos:', err);
        alert('Error obteniendo presupuestos: ' + err.message);
      }
    }

    // 5. Opción "Ver Remitos"
    if (e.target && e.target.closest('#btnHistorialRemitosOption')) {
      if (modalHistorySelector) modalHistorySelector.style.display = 'none';

      const ticketsSection = document.getElementById('ticketsSection');
      const presupuestosSection = document.getElementById('presupuestosSection');
      const remitosSection = document.getElementById('remitosSection');
      const historialSection = document.getElementById('historialSection');

      try {
        const remitos = await window.electronAPI.getRemitos();

        if (!remitos || remitos.length === 0) {
          mostrarRemitos([]);
        } else {
          mostrarRemitos(remitos);
        }
        if (ticketsSection) ticketsSection.style.display = 'none';
        if (presupuestosSection) presupuestosSection.style.display = 'none';
        if (remitosSection) remitosSection.style.display = 'block';
        historialSection.style.display = 'none';

      } catch (err) {
        console.error('Error obteniendo remitos:', err);
        alert('Error obteniendo remitos: ' + err.message);
      }
    }

    // Botón cerrar remitos
    if (e.target && e.target.id === 'btnCerrarRemitos') {
      const remitosSection = document.getElementById('remitosSection');
      const historialSection = document.getElementById('historialSection');
      if (remitosSection) remitosSection.style.display = 'none';
      historialSection.style.display = 'block';
    }

    // Botón filtrar remitos
    if (e.target && e.target.id === 'btnFiltrarRemitos') {
      filtrarRemitos();
    }

    // Botón mostrar todos los remitos
    if (e.target && e.target.id === 'btnMostrarTodosRemitos') {
      mostrarTodosRemitos();
    }

    // Botón ver / reimprimir remito desde el historial de remitos
    if (e.target && e.target.classList.contains('btn-print-remito')) {
      const index = parseInt(e.target.getAttribute('data-remito-index'));
      if (!isNaN(index) && todosLosRemitosGlobal[index]) {
        reimprimirRemitoFromGlobal(index);
      }
    }

    // Botón cerrar tickets
    if (e.target && e.target.id === 'btnCerrarTickets') {
      const ticketsSection = document.getElementById('ticketsSection');
      const historialSection = document.getElementById('historialSection');
      if (ticketsSection) ticketsSection.style.display = 'none';
      historialSection.style.display = 'block';
    }

    // Botón filtrar tickets
    if (e.target && e.target.id === 'btnFiltrarTickets') {
      filtrarTickets();
    }

    // Botón mostrar todos los tickets
    if (e.target && e.target.id === 'btnMostrarTodosTickets') {
      mostrarTodosTickets();
    }

    // Botón cerrar presupuestos (Fase 2)
    if (e.target && e.target.id === 'btnCerrarPresupuestos') {
      const presupuestosSection = document.getElementById('presupuestosSection');
      const historialSection = document.getElementById('historialSection');
      if (presupuestosSection) presupuestosSection.style.display = 'none';
      historialSection.style.display = 'block';
    }

    // Botón filtrar presupuestos (Fase 2)
    if (e.target && e.target.id === 'btnFiltrarPresupuestos') {
      filtrarPresupuestos();
    }

    // Botón mostrar todos los presupuestos (Fase 2)
    if (e.target && e.target.id === 'btnMostrarTodosPresupuestos') {
      mostrarTodosPresupuestos();
    }

    // Botón reimprimir presupuesto (Fase 2)
    if (e.target && e.target.classList.contains('btn-print-presupuesto')) {
      const index = parseInt(e.target.getAttribute('data-presupuesto-index'));
      if (!isNaN(index) && todosLosPresupuestosGlobal[index]) {
        reimprimirPresupuesto(index);
      }
    }

    // Botón imprimir ticket (delegación desde el contenedor de tickets)
    if (e.target && e.target.classList.contains('btn-print-ticket')) {
      const index = parseInt(e.target.getAttribute('data-ticket-index'));
      if (!isNaN(index) && todosLosTicketsGlobal[index]) {
        imprimirTicket(index);
      }
    }

    // Botón anular ticket (delegación desde el contenedor de tickets)
    if (e.target && e.target.classList.contains('btn-anular-ticket')) {
      const ticketId = parseInt(e.target.getAttribute('data-ticket-id'));
      const ticketTotal = parseFloat(e.target.getAttribute('data-ticket-total'));
      
      const confirmacion = confirm(
        "Esta acción NO eliminará la venta.\n\nSe generará un Ajuste de Caja negativo asociado a este Ticket.\n\n¿Desea continuar?"
      );
      
      if (confirmacion) {
        anularVenta(ticketId, ticketTotal);
      }
    }
  });



  // Página por defecto - INVENTARIO
  content.innerHTML = pages.inventario;
  content.dataset.currentPage = 'inventario';
  
  // Mostrar topbar y carrito en carga inicial
  const topbarInitial = document.querySelector('.topbar');
  const cartFloatingInitial = document.getElementById('cartFloating');
  if (topbarInitial) topbarInitial.style.display = 'flex';
  if (cartFloatingInitial) cartFloatingInitial.style.display = 'flex';

  initInventario(); // inicializa inventario al abrir

  /* ==========================
     Función: INIT FINANZAS
     ========================== */
  async function initFinanzas() {
    const totalEl = document.getElementById('totalVentas');
    const labelEl = document.getElementById('periodLabel');
    const buttons = document.querySelectorAll('.finanzas-container .buttons button');
    const msg = document.getElementById('finanzasMsg');
    const canvas = document.getElementById('chartVentas');
    const fechaInput = document.getElementById('finanzasFecha');
    const btnBuscar = document.getElementById('btnBuscarFinanzas');

    // Nuevos KPI elements (pueden no existir si el HTML aún no cargó)
    const kpiHoyEl    = document.getElementById('kpiVentasHoy');
    const kpiMesEl    = document.getElementById('kpiVentasMes');
    const kpiCantEl   = document.getElementById('kpiCantVentas');

    // Elementos del selector de mes interactivo
    const btnPrevMonth = document.getElementById('btnPrevMonth');
    const btnNextMonth = document.getElementById('btnNextMonth');
    const currentMonthLabel = document.getElementById('currentMonthLabel');
    const chartBadge = document.getElementById('chartBadge');
    const chartSubtitle = document.getElementById('chartSubtitle');
    const chartEmptyMessage = document.getElementById('chartEmptyMessage');

    // Estado del selector de mes
    let currentSelectedYear = new Date().getFullYear();
    let currentSelectedMonth = new Date().getMonth(); // 0-indexed

    const NOMBRES_MESES = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const hasSummary = window.electronAPI && typeof window.electronAPI.getSalesSummary === 'function';
    const hasChartData = window.electronAPI && typeof window.electronAPI.getSalesByDay === 'function';

    if (!hasSummary) {
      if (totalEl) totalEl.textContent = '$0';
      if (labelEl) labelEl.textContent = 'Finanzas sin configurar';
      if (msg) msg.textContent = 'La funcionalidad de resúmenes no está disponible.';
      return;
    }

    // Helper formato moneda
    const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

    // Actualiza la UI del selector de meses
    function updateMonthUI() {
      if (currentMonthLabel) {
        currentMonthLabel.textContent = `${NOMBRES_MESES[currentSelectedMonth]} ${currentSelectedYear}`;
      }
      
      const now = new Date();
      const isCurrentMonth = (currentSelectedYear === now.getFullYear() && currentSelectedMonth === now.getMonth());
      
      if (chartBadge) {
        chartBadge.style.display = isCurrentMonth ? 'inline-block' : 'none';
      }
      
      if (chartSubtitle) {
        chartSubtitle.textContent = `Evolución de ingresos durante ${NOMBRES_MESES[currentSelectedMonth]} ${currentSelectedYear}`;
      }
    }

    // === Función para cargar totales y métricas de Finanzas ===
    async function load(period = 'day', fecha = null) {
      try {
        let metricsRes;
        if (window.electronAPI && typeof window.electronAPI.getFinanceMetrics === 'function') {
          metricsRes = await window.electronAPI.getFinanceMetrics({ period, fecha });
        }

        if (metricsRes && metricsRes.success) {
          const cashFlow = metricsRes.cashFlow || {};
          const pnl = metricsRes.pnl || {};
          const metricsObj = metricsRes.metrics || {};

          if (totalEl)
            updateTextWithResponsiveFont(totalEl, fmt(cashFlow.flujoCajaReal));
          if (labelEl)
            labelEl.textContent = fecha
              ? `Flujo de caja real del ${fecha}`
              : `Flujo de caja real del ${period === 'day' || period === 'hoy' ? 'día' :
                period === 'week' || period === 'semana' ? 'última semana' :
                  period === 'month' || period === 'mes' ? 'mes' : 'año'
              }`;

          if (kpiHoyEl) {
            updateTextWithResponsiveFont(kpiHoyEl, fmt(pnl.ventasDevengadas));
          }
          if (kpiMesEl) {
            updateTextWithResponsiveFont(kpiMesEl, fmt(pnl.totalIngresosDevengados));
          }
          if (kpiCantEl) {
            updateTextWithResponsiveFont(kpiCantEl, String(metricsObj.cantComprobantes || 0));
          }
          const kpiGastosMesEl = document.getElementById('kpiGastosMes');
          if (kpiGastosMesEl) {
            updateTextWithResponsiveFont(kpiGastosMesEl, fmt(cashFlow.gastosPagados));
          }
        } else {
          // Fallback
          let total = await window.electronAPI.getSalesSummary({ period });
          if (totalEl) updateTextWithResponsiveFont(totalEl, fmt(total));
        }

        if (msg) msg.textContent = '';
      } catch (err) {
        console.error('Error getFinanceMetrics:', err);
        if (msg) msg.textContent = 'Error cargando resumen de finanzas.';
        restaurarFoco();
      }
    }

    async function loadExtraKPIs() {
      // Manejado unificadamente en load()
    }

    // === Gráfico — colores modernos, grid suave ===
    let chartInstance = null;
    async function renderChart() {
      if (!hasChartData || !canvas) return;
      try {
        const yearMonth = `${currentSelectedYear}-${String(currentSelectedMonth + 1).padStart(2, '0')}`;
        const data = await window.electronAPI.getSalesByDay(yearMonth);

        // Generar labels para todos los días de este mes
        const daysInMonth = new Date(currentSelectedYear, currentSelectedMonth + 1, 0).getDate();
        const labels = [];
        const values = [];
        let hasSales = false;

        for (let i = 1; i <= daysInMonth; i++) {
          const dayStr = String(i).padStart(2, '0');
          labels.push(dayStr);
          const record = data.find(d => d.dia === dayStr);
          const totalVal = record ? record.total : 0;
          values.push(totalVal);
          if (totalVal > 0) hasSales = true;
        }

        // Mostrar u ocultar el cartel de gráfico vacío
        if (chartEmptyMessage) {
          chartEmptyMessage.style.display = hasSales ? 'none' : 'flex';
        }

        const ctx = canvas.getContext('2d');
        if (chartInstance) chartInstance.destroy();

        // Gradiente azul profundo con suave fade hacia la base
        const gradH = canvas.offsetHeight || 260;
        const gradient = ctx.createLinearGradient(0, 0, 0, gradH);
        gradient.addColorStop(0,   'rgba(37,99,235,0.82)');
        gradient.addColorStop(0.5, 'rgba(59,130,246,0.50)');
        gradient.addColorStop(1,   'rgba(37,99,235,0.04)');

        // Gradiente hover (más brillante)
        const gradientHover = ctx.createLinearGradient(0, 0, 0, gradH);
        gradientHover.addColorStop(0,   'rgba(37,99,235,1)');
        gradientHover.addColorStop(0.5, 'rgba(59,130,246,0.75)');
        gradientHover.addColorStop(1,   'rgba(37,99,235,0.12)');

        chartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'Ventas (ARS)',
              data: values,
              backgroundColor: gradient,
              hoverBackgroundColor: gradientHover,
              borderColor: 'rgba(37,99,235,0)',
              borderWidth: 0,
              borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
              borderSkipped: false,
              barPercentage: 0.72,
              categoryPercentage: 0.85,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 500,
              easing: 'easeOutQuart',
            },
            plugins: {
              legend: { display: false },
              title: { display: false },
              tooltip: {
                enabled: true,
                mode: 'index',
                intersect: false,
                backgroundColor: '#0f172a',
                titleColor: '#64748b',
                titleFont: { size: 12, weight: '500' },
                bodyColor: '#f8fafc',
                bodyFont: { size: 15, weight: '700' },
                padding: { top: 10, bottom: 10, left: 14, right: 14 },
                cornerRadius: 12,
                borderColor: 'rgba(255,255,255,0.08)',
                borderWidth: 1,
                displayColors: false,
                callbacks: {
                  title: (items) => `Día ${parseInt(items[0].label, 10)}`,
                  label: (item) => `$${Number(item.parsed.y).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
                }
              }
            },
            scales: {
              x: {
                grid: { display: false },
                border: { display: false },
                ticks: {
                  color: '#94a3b8',
                  font: { size: 11, family: 'Inter, sans-serif' },
                  maxRotation: 0,
                  // show only every ~5th tick on large months to avoid crowding
                  callback: (val, idx) => (idx % 5 === 0 || idx === 0) ? labels[idx] : '',
                }
              },
              y: {
                beginAtZero: true,
                grid: {
                  color: 'rgba(148,163,184,0.10)',
                  drawBorder: false,
                  lineWidth: 1,
                },
                border: { display: false, dash: [4, 4] },
                ticks: {
                  color: '#94a3b8',
                  font: { size: 11, family: 'Inter, sans-serif' },
                  padding: 6,
                  maxTicksLimit: 6,
                  callback: (v) => {
                    if (v >= 1000000) return `$${(v/1000000).toFixed(1)}M`;
                    if (v >= 1000)    return `$${(v/1000).toFixed(0)}k`;
                    return `$${v}`;
                  }
                }
              }
            }
          }
        });
      } catch (err) {
        console.error('Error renderChart:', err);
        if (msg) msg.textContent = 'Error cargando gráfico.';
        restaurarFoco();
      }
    }

    // === Listeners — botones período (marca activo visualmente) ===
    buttons.forEach(b => b.addEventListener('click', async () => {
      buttons.forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      await load(b.dataset.period);
      await renderChart();
    }));

    if (btnBuscar) {
      btnBuscar.addEventListener('click', async () => {
        const fecha = fechaInput.value;
        if (!fecha) return alert('Seleccione una fecha');
        try {
          const total = await window.electronAPI.getSalesByDate(fecha);
          totalEl.textContent = `$${Number(total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
          labelEl.textContent = `Total de ventas del ${fecha}`;
        } catch (err) {
          console.error('Error getSalesByDate:', err);
          alert('Error obteniendo ventas por fecha.');
          restaurarFoco();
        }
      });
    }

    async function updateGastosKPI() {
      const kpiGastosMes = document.getElementById('kpiGastosMes');
      if (!kpiGastosMes) return;
      try {
        const gastos = await window.electronAPI.getGastos();
        const totalPagadoMes = gastos.reduce((sum, g) => {
          if (g.estado !== 'Pagado') return sum;
          if (!g.fecha) return sum;
          const [yr, mo, dy] = g.fecha.split('-').map(Number);
          if (yr === currentSelectedYear && (mo - 1) === currentSelectedMonth) {
            return sum + (Number(g.monto) || 0);
          }
          return sum;
        }, 0);
        updateTextWithResponsiveFont(kpiGastosMes, fmt(totalPagadoMes));
      } catch (err) {
        console.error('Error updating gastos KPI:', err);
      }
    }

    // Listeners del selector de mes
    if (btnPrevMonth) {
      btnPrevMonth.addEventListener('click', async () => {
        currentSelectedMonth--;
        if (currentSelectedMonth < 0) {
          currentSelectedMonth = 11;
          currentSelectedYear--;
        }
        updateMonthUI();
        await renderChart();
        await updateGastosKPI();
      });
    }

    if (btnNextMonth) {
      btnNextMonth.addEventListener('click', async () => {
        currentSelectedMonth++;
        if (currentSelectedMonth > 11) {
          currentSelectedMonth = 0;
          currentSelectedYear++;
        }
        updateMonthUI();
        await renderChart();
        await updateGastosKPI();
      });
    }

    // Exponer la función de actualización para cuando se registran ventas
    window.__updateFinanzasChart = async () => {
      await load();
      await renderChart();
      await loadExtraKPIs();
      await updateGastosKPI();
    };

        // =====================================================================
    // Lógica para Modales Interactivos de Ventas del Mes y Ventas Hoy
    // =====================================================================
    const fmtPeso = (n) => {
      const v = parseFloat(n) || 0;
      return `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // --- Modal Ventas del Mes ---
    let modalSelectedYear = new Date().getFullYear();
    let modalSelectedMonth = new Date().getMonth(); // 0-indexed

    async function loadModalMonthBreakdown() {
      try {
        const ym = `${modalSelectedYear}-${String(modalSelectedMonth + 1).padStart(2, '0')}`;
        document.getElementById('labelMesMuni').textContent = `${NOMBRES_MESES[modalSelectedMonth]} ${modalSelectedYear}`;
        
                const res = await window.electronAPI.muniGetMonthBreakdown({ month: modalSelectedMonth + 1, year: modalSelectedYear });
        if (res.success) {
          document.getElementById('muniValVentasTotales').textContent = fmtPeso(res.totalVentas);
          document.getElementById('muniValDineroIngresado').textContent = fmtPeso(res.dineroIngresado);
          document.getElementById('muniValPendienteCobro').textContent = fmtPeso(res.pendienteMunicipio);

          document.getElementById('muniCountVentasNormales').textContent = res.cantidadVentas;
          document.getElementById('muniCountOrdenesMuni').textContent = res.cantidadOrdenesMunicipio;
          document.getElementById('muniCountOrdenesPendientes').textContent = res.cantidadPendientes;
          document.getElementById('muniCountOrdenesCobradas').textContent = res.cantidadCobradas;
        }
      } catch (err) {
        console.error('Error cargando desglose mensual:', err);
      }
    }

    // Bind clicks en tarjetas
    kpiMesEl?.closest('.fkpi-card')?.addEventListener('click', () => {
      modalSelectedYear = new Date().getFullYear();
      modalSelectedMonth = new Date().getMonth();
      loadModalMonthBreakdown();
      document.getElementById('modalVentasMes').classList.add('active');
    });

    document.getElementById('btnCloseVentasMes')?.addEventListener('click', () => {
      document.getElementById('modalVentasMes').classList.remove('active');
    });

    document.getElementById('btnPrevMonthMuni')?.addEventListener('click', () => {
      modalSelectedMonth--;
      if (modalSelectedMonth < 0) {
        modalSelectedMonth = 11;
        modalSelectedYear--;
      }
      loadModalMonthBreakdown();
    });

    document.getElementById('btnNextMonthMuni')?.addEventListener('click', () => {
      modalSelectedMonth++;
      if (modalSelectedMonth > 11) {
        modalSelectedMonth = 0;
        modalSelectedYear++;
      }
      loadModalMonthBreakdown();
    });

    // --- Modal Ventas Hoy ---
    let modalSelectedDate = new Date();

        async function loadModalDayBreakdown() {
      try {
        const y = modalSelectedDate.getFullYear();
        const m = String(modalSelectedDate.getMonth() + 1).padStart(2, '0');
        const d = String(modalSelectedDate.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        document.getElementById('labelDayMuni').textContent = `${d}/${m}/${y}`;

        const res = await window.electronAPI.muniGetDayBreakdown({ 
          day: modalSelectedDate.getDate(), 
          month: modalSelectedDate.getMonth() + 1, 
          year: modalSelectedDate.getFullYear() 
        });
        if (res.success) {
          document.getElementById('muniValVentasNormalesHoy').textContent = fmtPeso(res.ventasNormales);
          document.getElementById('muniValVentasTotalesHoy').textContent = fmtPeso(res.totalVentas);
          document.getElementById('muniValDineroIngresadoHoy').textContent = fmtPeso(res.dineroIngresado);
          document.getElementById('muniValPendienteCobroHoy').textContent = fmtPeso(res.pendienteMunicipio);
          document.getElementById('muniValPendienteAtmosHoy').textContent = fmtPeso(res.pendienteAtmosferico);

          document.getElementById('muniCountVentasNormalesHoy').textContent = res.cantidadVentas;
          document.getElementById('muniCountOrdenesMuniHoy').textContent = res.cantidadOrdenesMunicipio;
          document.getElementById('muniCountOrdenesPendientesHoy').textContent = res.cantidadPendientes;
          document.getElementById('muniCountOrdenesCobradasHoy').textContent = res.cantidadCobradas;
        }
      } catch (err) {
        console.error('Error cargando desglose diario:', err);
      }
    }

    kpiHoyEl?.closest('.fkpi-card')?.addEventListener('click', () => {
      modalSelectedDate = new Date();
      loadModalDayBreakdown();
      document.getElementById('modalVentasHoy').classList.add('active');
    });

    document.getElementById('btnCloseVentasHoy')?.addEventListener('click', () => {
      document.getElementById('modalVentasHoy').classList.remove('active');
    });

    document.getElementById('btnPrevDayMuni')?.addEventListener('click', () => {
      modalSelectedDate.setDate(modalSelectedDate.getDate() - 1);
      loadModalDayBreakdown();
    });

    document.getElementById('btnNextDayMuni')?.addEventListener('click', () => {
      modalSelectedDate.setDate(modalSelectedDate.getDate() + 1);
      loadModalDayBreakdown();
    });

    // === Carga inicial ===
    // Marcar "Hoy" como activo por defecto
    if (buttons.length > 0) buttons[0].classList.add('active');
    // Pre-llenar el input de fecha exacta con hoy
    if (fechaInput) fechaInput.value = new Date().toISOString().split('T')[0];
    updateMonthUI();
    await load();
    await renderChart();
    await loadExtraKPIs();
    await updateGastosKPI();
  }



  /* ==========================
     Función: UPDATE INVENTORY STATS
     ========================== */
  function updateInventoryStats() {
    // Obtener datos reales del inventario - asegurar que tengamos productos
    let productos = window.productos || [];

    // Si no hay productos, intentar cargarlos
    if (productos.length === 0) {
      console.log('No hay productos en window.productos, intentando cargar...');
      // Llamar a loadProducts si está disponible
      if (typeof loadProducts === 'function') {
        loadProducts().then(() => {
          productos = window.productos || [];
          console.log('Productos cargados:', productos.length);
          calculateAndUpdateStats(productos);
        }).catch(err => {
          console.error('Error cargando productos:', err);
          // Mostrar ceros si no se pueden cargar
          updateStatsDisplay(0, 0, 0);
        });
        return;
      }
    }

    calculateAndUpdateStats(productos);
  }

  function calculateAndUpdateStats(productos) {
    // Calcular métricas reales
    let totalProducts = productos.length;
    let lowStockProducts = 0;
    let totalInventoryValue = 0;
    let totalUnidades = 0; // Suma de todas las unidades en stock

    // Definir umbral para stock bajo (puedes ajustar este valor)
    const lowStockThreshold = 5;

    console.log('Calculando estadísticas para', productos.length, 'productos');

    productos.forEach(producto => {
      const stock = Number(producto.stock) || 0;
      const precio = Number(producto.precio) || 0;
      const precioCosto = Number(producto.precio_costo) || precio;

      // Sumar todas las unidades en stock
      totalUnidades += stock;

      // Calcular valor total usando precio de costo o precio de venta
      totalInventoryValue += precioCosto * stock;

      // Contar productos con stock bajo (solo si tienen stock > 0)
      if (stock > 0 && stock <= lowStockThreshold) {
        lowStockProducts++;
      }
    });

    // Actualizar display
    updateStatsDisplay(totalUnidades, lowStockProducts, totalInventoryValue);

    const inventoryData = {
      totalProducts,
      totalUnidades,
      lowStockProducts,
      totalInventoryValue
    };

    console.log('Métricas de inventario actualizadas:', inventoryData);
    console.log('Productos con stock bajo:', productos.filter(p => p.stock <= lowStockThreshold && p.stock > 0).map(p => ({ nombre: p.nombre, stock: p.stock })));

    return inventoryData;
  }

  function updateStatsDisplay(totalUnidades, lowStockProducts, totalInventoryValue) {
    // Actualizar los valores en el DOM
    const totalProductsEl = document.getElementById('totalProducts');
    const lowStockProductsEl = document.getElementById('lowStockProducts');
    const totalInventoryValueEl = document.getElementById('totalInventoryValue');

    if (totalProductsEl) {
      totalProductsEl.textContent = totalUnidades.toLocaleString('es-ES');
    } else {
      console.warn('Elemento totalProducts no encontrado');
    }

    if (lowStockProductsEl) {
      lowStockProductsEl.textContent = lowStockProducts.toString();
    } else {
      console.warn('Elemento lowStockProducts no encontrado');
    }

    if (totalInventoryValueEl) {
      // Formatear el valor como moneda con formato abreviado
      if (totalInventoryValue >= 1000000) {
        totalInventoryValueEl.textContent = `$${(totalInventoryValue / 1000000).toFixed(1)}M`;
      } else if (totalInventoryValue >= 1000) {
        totalInventoryValueEl.textContent = `$${(totalInventoryValue / 1000).toFixed(1)}k`;
      } else {
        totalInventoryValueEl.textContent = `$${totalInventoryValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    } else {
      console.warn('Elemento totalInventoryValue no encontrado');
    }
  }

  /* ==========================
     Función: INIT INVENTARIO
     ========================== */
  function initInventario() {
    // Evitar inicialización múltiple
    if (window.__inventarioInicializado) {
      console.log('Inventario ya inicializado, saltando...');
      return;
    }
    window.__inventarioInicializado = true;

    // Limpiar buscador al entrar para evitar filtros fantasma
    const topSearchInput = document.getElementById('searchInput');
    if (topSearchInput) {
      topSearchInput.value = '';
    }

    // NO actualizar métricas aquí - esperar a que carguen los productos

    // Resto del código...


    // La función restaurarFoco() ahora es global y se hereda automáticamente


    // 🔐 asegurar carrito global
    if (!window.__carritoGlobal) {
      window.__carritoGlobal = [];
    }
    const carrito = window.__carritoGlobal;

    if (!window.electronAPI) {
      console.error('electronAPI no encontrado. Revisa preload.js');
      alert('Error: electronAPI no disponible.');
      return;
    }

    // ===== ELEMENTOS DEL DOM =====
    const btnFilters = document.getElementById('btnFilters');
    const filtersPanel = document.getElementById('filtersPanel');
    const filterCategories = document.getElementById('filterCategories');
    const tbody = document.getElementById('inventoryBody');
    const modalAdd = document.getElementById('modalAddProduct');
    const modalUpdate = document.getElementById('modalUpdatePrices');
    const modalProductTitle = document.getElementById('modalProductTitle');
    const btnAddProduct = document.getElementById('btnAddProduct');
    const btnImportExcel = document.getElementById('btnImportExcel');
    const btnExportExcel = document.getElementById('btnExportExcel');
    const btnUpdatePrices = document.getElementById('btnUpdatePrices');
    const btnRefresh = document.getElementById('btnRefresh');
    const btnDeleteAll = document.getElementById('btnDeleteAll');
    const inputPercent = document.getElementById('updatePercent');
    const selectUpdateCategory = document.getElementById('categorySelect');
    const btnPlus1 = document.getElementById('btnPlus1');
    const btnMinus1 = document.getElementById('btnMinus1');
    const btnPlus10 = document.getElementById('btnPlus10');
    const btnApplyUpdate = document.getElementById('btnApplyUpdate');
    const btnCancelUpdate = document.getElementById('cancelUpdatePrices');
    const selectAddCategoria = document.getElementById('addCategoria');
    const btnSave = document.getElementById('saveNewProduct');
    const btnCancel = document.getElementById('cancelNewProduct');
    const btnNewCategory = document.getElementById('btnNewCategory');
    const btnSaveCategory = document.getElementById('btnSaveCategory');
    const btnCloseCategories = document.getElementById('btnCloseCategories');
    const categoryList = document.getElementById('categoryList');

    // Elementos del carrito
    const cartCount = document.getElementById('cartCount');
    const btnCart = document.getElementById('btnCart');
    const cartFloating = document.getElementById('cartFloating');
    const modalCart = document.getElementById('modalCart');
    const cartBody = document.getElementById('cartBody');
    const cartTotal = document.getElementById('cartTotal');
    const btnCloseCart = document.getElementById('btnCloseCart');
    const btnClearCart = document.getElementById('btnClearCart');
    const btnSell = document.getElementById('btnSell');
    const btnImprimirTicket = document.getElementById('btnImprimirTicket');
    const discountInput = document.getElementById('discountInput');
    const adjustType = document.getElementById('adjustType');
    const adjustMode = document.getElementById('adjustMode');
        const applyDiscount = document.getElementById('applyDiscount');
    const cartTotalDiscount = document.getElementById('cartTotalDiscount');

    // Elementos del modal de opciones de impresión
    const modalPrintOptions = document.getElementById('modalPrintOptions');
    const btnPrintTicketOption = document.getElementById('btnPrintTicketOption');
        const btnPrintPresupuestoOption = document.getElementById('btnPrintPresupuestoOption');
    const btnPrintRemitoOption = document.getElementById('btnPrintRemitoOption');
    const btnClosePrintOptions = document.getElementById('btnClosePrintOptions');
    const btnCancelPrintOptions = document.getElementById('btnCancelPrintOptions');

    if (!tbody) {
      console.warn('Inventario: elementos no encontrados en el DOM. Abortando initInventario.');
      return;
    }

    // ===== VARIABLES DE ESTADO =====
    let productos = [];
    let proveedoresLista = [];
    let productoEditandoId = null;
    let editingId = null;
    let activeFilter = null;
    let currentPage = 1;
    const perPage = 50;
    let ajusteActual = { tipo: 'discount', modo: 'percent', valor: 0 };
    let descuentoActual = 0;
    let ventaEnProceso = false;  // ← AGREGÁ ESTA LÍNEA

    window.__descuentoActual = descuentoActual;

    function sincronizarAjusteDesdeDOM() {
      const discountInput = document.getElementById('discountInput');
      const adjustType = document.getElementById('adjustType');
      const adjustMode = document.getElementById('adjustMode');

      if (discountInput) {
        const valor = parseFloat(discountInput.value || '0');
        if (!isNaN(valor) && valor >= 0) {
          ajusteActual = {
            tipo: adjustType?.value === 'surcharge' ? 'surcharge' : 'discount',
            modo: adjustMode?.value === 'fixed' ? 'fixed' : 'percent',
            valor: Math.abs(valor)
          };
          descuentoActual = ajusteActual.modo === 'percent' && ajusteActual.tipo === 'discount'
            ? ajusteActual.valor
            : 0;
          window.__descuentoActual = descuentoActual;
        }
      }
    }

    function calcularAjusteSobreTotal(subtotal) {
      sincronizarAjusteDesdeDOM();
      const valor = Number(ajusteActual.valor || 0);
      const base = Number(subtotal || 0);
      if (!valor || !base) return { monto: 0, totalFinal: base, texto: 'Sin ajuste', clase: '' };

      let monto = ajusteActual.modo === 'percent'
        ? (base * valor / 100)
        : valor;

      if (ajusteActual.tipo === 'discount') monto = -Math.abs(monto);
      else monto = Math.abs(monto);

      const totalFinal = Math.max(0, base + monto);
      const tipoTxt = ajusteActual.tipo === 'discount' ? 'Descuento' : 'Recargo';
      const modoTxt = ajusteActual.modo === 'percent' ? `${valor}%` : `$${formatearMonedaArgentina(valor)}`;
      const signo = monto < 0 ? '-' : '+';
      const clase = ajusteActual.tipo === 'discount' ? 'is-discount' : 'is-surcharge';
      const texto = `${tipoTxt} (${modoTxt}) ${signo}$${formatearMonedaArgentina(Math.abs(monto))}`;
      return { monto, totalFinal, texto, clase };
    }

    // 🔥 LIMPIAR LISTENERS GLOBALES ANTERIORES
    const eventos = ['input', 'blur', 'keydown', 'click'];
    eventos.forEach(eventType => {
      if (window[`__${eventType}Handler`]) {
        document.removeEventListener(eventType, window[`__${eventType}Handler`]);
      }
    });

    // ===== FILTROS DE STOCK - HACERLOS FUNCIONAR =====
    const stockLowBtn = document.querySelector('.stock-filter-btn[data-type="low"]');
    const stockHighBtn = document.querySelector('.stock-filter-btn[data-type="high"]');

    if (stockLowBtn) {
      stockLowBtn.addEventListener('click', () => {
        // Remover clase active de ambos
        if (stockHighBtn) stockHighBtn.classList.remove('active');
        stockLowBtn.classList.add('active');

        // Aplicar filtro de stock bajo
        activeFilter = { type: 'stock', value: 'low' };
        currentPage = 1; // Reset a primera página
        renderTable();

        // Mostrar sección de filtros activos
        const activeFiltersDiv = document.getElementById('activeFilters');
        const activeFiltersTags = document.getElementById('activeFiltersTags');
        if (activeFiltersDiv && activeFiltersTags) {
          activeFiltersDiv.style.display = 'block';
          activeFiltersTags.innerHTML = `
        <span class="filter-tag">
          <i class="fas fa-exclamation-triangle"></i> Stock bajo
          <i class="fas fa-times" onclick="eliminarFiltroStock()"></i>
        </span>
      `;
        }
      });
    }

    if (stockHighBtn) {
      stockHighBtn.addEventListener('click', () => {
        // Remover clase active de ambos
        if (stockLowBtn) stockLowBtn.classList.remove('active');
        stockHighBtn.classList.add('active');

        // Aplicar filtro de stock normal
        activeFilter = { type: 'stock', value: 'high' };
        currentPage = 1; // Reset a primera página
        renderTable();

        // Mostrar sección de filtros activos
        const activeFiltersDiv = document.getElementById('activeFilters');
        const activeFiltersTags = document.getElementById('activeFiltersTags');
        if (activeFiltersDiv && activeFiltersTags) {
          activeFiltersDiv.style.display = 'block';
          activeFiltersTags.innerHTML = `
        <span class="filter-tag">
          <i class="fas fa-check-circle"></i> Stock normal
          <i class="fas fa-times" onclick="eliminarFiltroStock()"></i>
        </span>
      `;
        }
      });
    }

    // Función para eliminar filtros de stock (debe estar en el scope global)
    window.eliminarFiltroStock = function () {
      window.limpiarFiltrosInventario();
    }

    // También necesitamos actualizar los contadores de stock
    async function updateStockCounts() {
      try {
        const productos = await window.electronAPI.getProducts();
        const lowStock = productos.filter(p => p.stock < 5).length;
        const highStock = productos.filter(p => p.stock >= 5).length;

        const lowCount = document.getElementById('lowStockCount');
        const highCount = document.getElementById('highStockCount');

        if (lowCount) lowCount.textContent = lowStock;
        if (highCount) highCount.textContent = highStock;

        // Actualizar métricas del panel
        updateInventoryStats();
      } catch (err) {
        console.error('Error actualizando contadores de stock:', err);
      }
    }

    // Llamar a updateStockCounts después de cargar productos
    // Modifica la función loadProducts para que llame a updateStockCounts
    const originalLoadProducts = loadProducts;
    loadProducts = async function () {
      await originalLoadProducts();
      await updateStockCounts();
    };

    window.limpiarFiltrosInventario = function() {
      activeFilter = null;
      currentPage = 1;
      
      // Reset stock buttons active class
      if (stockLowBtn) stockLowBtn.classList.remove('active');
      if (stockHighBtn) stockHighBtn.classList.remove('active');

      // Hide active tags block
      const activeFiltersDiv = document.getElementById('activeFilters');
      if (activeFiltersDiv) activeFiltersDiv.style.display = 'none';

      // Reload lists and render table
      loadCategoriesAndPopulate();
      loadSuppliersFilter();
      renderTable();
    };

    // Botón "Limpiar filtros"
    const clearFiltersBtn = document.getElementById('clearFilters');
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        window.limpiarFiltrosInventario();
      });
    }


    // Resetear flags
    window.__listenerPagoRegistrado = false;

    // ===== FUNCIONES AUXILIARES =====
    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    // ===== FUNCIONES DEL CARRITO (DEFINIDAS PRIMERO) =====
    function updateCartCount() {
      if (!cartCount) return;
      let totalCantidad = carrito.reduce((sum, item) => sum + item.cantidad, 0);
      if (totalCantidad > 0) {
        cartCount.style.display = 'flex';
        cartCount.textContent = totalCantidad;
      } else {
        cartCount.style.display = 'none';
      }
    }

    function updateFloatingCart() {
      const total = carrito.reduce(
        (sum, item) => sum + Number(item.cantidad || 1),
        0
      );
      const el = document.getElementById('cartFloatingCount');
      if (el) el.textContent = total;
    }

    function renderCart() {
      if (!cartBody || !cartTotal) return;
      cartBody.innerHTML = '';
      let total = 0;

      carrito.forEach((item, index) => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${item.nombre}</td>
      <td>
        <input type="number"
               min="1"
               step="1"
               value="${item.cantidad}"
               class="cart-qty-input"
               data-index="${index}"
               style="width:70px; text-align:center;">
      </td>
      <td>$${formatearMonedaArgentina(item.precio)}</td>
      <td>$${formatearMonedaArgentina(subtotal)}</td>
      <td>
        <button class="btnRemoveCartItem" data-index="${index}">❌</button>
      </td>
    `;
        cartBody.appendChild(tr);
      });

      const ajuste = calcularAjusteSobreTotal(total);
      cartTotal.textContent = `Total original: $${formatearMonedaArgentina(total)}`;

      if (cartTotalDiscount) {
        if (ajuste.monto !== 0) {
          cartTotalDiscount.style.display = 'block';
          cartTotalDiscount.className = `discount-amount ${ajuste.clase}`;
          cartTotalDiscount.innerHTML = `
        <div>${ajuste.texto}</div>
        <div><strong>Total final: $${formatearMonedaArgentina(ajuste.totalFinal)}</strong></div>
      `;
        } else {
          cartTotalDiscount.className = 'discount-amount';
          cartTotalDiscount.style.display = 'block';
          cartTotalDiscount.innerHTML = `<div>Sin ajuste</div><div><strong>Total final: $${formatearMonedaArgentina(total)}</strong></div>`;
        }
      }
      updateCartCount();
    }

    // (Función auxiliar para formatear moneda argentina removida para usar la global)

    async function registrarVenta(metodoPago) {
      try {
        console.log('Registrando venta con método:', metodoPago);

        const subtotal = window.__carritoGlobal.reduce((t, p) => t + (p.precio * p.cantidad), 0);
        const ajuste = calcularAjusteSobreTotal(subtotal);
        const totalFinalCalculado = ajuste.totalFinal;
        const descuentoCalculado = ajuste.tipo === 'discount' ? Math.abs(ajuste.monto) : 0;

        const resultado = await window.electronAPI.sellProduct({
          metodo_pago: metodoPago,
          carritoCompleto: window.__carritoGlobal,
          ajuste: {
            tipo: ajusteActual.tipo,
            modo: ajusteActual.modo,
            valor: ajusteActual.valor
          }
        });

        if (resultado && resultado.success) {
          // 🟢 GUARDAR EL TICKET
          try {
            await window.electronAPI.saveTicket({
              fecha: new Date().toISOString(),
              metodo_pago: metodoPago,
              total: totalFinalCalculado,
              subtotal: subtotal,
              descuento: descuentoCalculado,
              productos: window.__carritoGlobal.map(p => ({
                id: p.id,
                nombre: p.nombre,
                cantidad: p.cantidad,
                precio: p.precio
              })),
              tipo: 'Venta'
            });
            console.log('Ticket guardado correctamente');
          } catch (ticketErr) {
            console.error('Error guardando ticket:', ticketErr);
          }

          imprimirTicket(metodoPago, totalFinalCalculado, subtotal);
          mostrarVentaConfirmada(metodoPago, totalFinalCalculado);

          // Vaciar carrito y resetear estado de ajustes/descuentos
          window.__carritoGlobal.length = 0;
          ajusteActual = { tipo: 'discount', modo: 'percent', valor: 0 };
          descuentoActual = 0;
          window.__descuentoActual = 0;

          const discountInput = document.getElementById('discountInput');
          const adjustType = document.getElementById('adjustType');
          const adjustMode = document.getElementById('adjustMode');
          if (discountInput) discountInput.value = '0';
          if (adjustType) adjustType.value = 'discount';
          if (adjustMode) adjustMode.value = 'percent';

          renderCart();
          updateCartCount();
          updateFloatingCart();

          // 🔴 IMPORTANTE: Recargar productos y actualizar la tabla
          await loadProducts(); // Esto ya llama a renderTable()

          // Actualizar contadores de stock
          await updateStockCounts();

          // Actualizar finanzas si es necesario
          actualizarFinanzas();

        } else {
          throw new Error(resultado?.error || 'Error desconocido al registrar venta');
        }
      } catch (err) {
        console.error('Error en registrarVenta:', err);
        if (err.message && err.message.includes('STOCK_INSUFICIENTE')) {
          alert(`⚠️ No se pudo procesar la venta por Stock Insuficiente:\n\n${err.message}\n\nNota: Otro puesto de venta o cajero pudo haber vendido el stock disponible. Tu carrito se mantiene intacto para que ajustes las cantidades e intentes nuevamente.`);
        } else {
          alert(`Error registrando la venta: ${err.message}`);
        }
        restaurarFoco();
      }
    }


    // Función para actualizar Finanzas sin recargar la pestaña
    function actualizarFinanzas() {
      // Verificar si estamos en la pestaña de Finanzas
      const totalEl = document.getElementById('totalVentas');
      if (!totalEl) return; // No estamos en Finanzas, salimos

      if (typeof window.__updateFinanzasChart === 'function') {
        window.__updateFinanzasChart();
      }
    }

    window.__registrarVentaGlobal = registrarVenta;



    function imprimirTicket(metodoPago = '', totalFinal = 0, totalOriginal = 0, esManual = false) {
      try {
        const fecha = new Date().toLocaleString();
        // ⚠️ Capturar snapshot del carrito SINCRÓNICAMENTE antes de cualquier async,
        // porque el carrito puede vaciarse antes de que el .then() se ejecute
        const carritoSnapshot = carrito.map(p => ({ ...p }));
        const subtotal = carritoSnapshot.reduce((t, p) => t + (p.precio * p.cantidad), 0);
        const cantidadTotal = carritoSnapshot.reduce((t, p) => t + Number(p.cantidad || 0), 0);
        const ajuste = calcularAjusteSobreTotal(subtotal);
        const totalMostrado = totalFinal || ajuste.totalFinal;
        const totalBase = totalOriginal || subtotal;
        const ajusteLabel = ajuste.monto !== 0 ? (ajuste.tipo === 'discount' ? 'Descuento' : 'Recargo') : '';
        const ajusteValor = ajuste.monto || 0;

        if (esManual) {
          const descuentoCalculado = ajuste.tipo === 'discount' ? Math.abs(ajuste.monto) : 0;
          window.electronAPI.saveTicket({
            fecha: new Date().toISOString(),
            metodo_pago: '-',
            total: totalMostrado,
            subtotal: totalBase,
            descuento: descuentoCalculado,
            productos: carritoSnapshot.map(p => ({
              id: p.id,
              nombre: p.nombre,
              cantidad: p.cantidad,
              precio: p.precio
            })),
            tipo: 'Manual'
          }).then(() => {
            console.log('Ticket manual guardado correctamente');
          }).catch(ticketErr => {
            console.error('Error guardando ticket manual:', ticketErr);
          });
        }

        // Obtener la ruta del logo de forma asíncrona
        window.electronAPI.getImagePath('logoperla2.png').then(logoPath => {
          const popup = window.open('', '_blank', 'width=250,height=600');
          popup.document.write(`
        <html>
          <head>
            <title>${metodoPago ? 'Ticket de Venta' : 'Presupuesto'}</title>
            <style>
              @media print {
                body { 
                  font-family: 'Courier New', monospace; 
                  width: 180px; 
                  margin: 0; 
                  padding: 5px; 
                  font-size: 9px;
                  font-weight: bold;
                  background: white;
                  line-height: 1.1;
                }
                .no-print { display: none !important; }
              }
              @media screen {
                body { 
                  font-family: 'Courier New', monospace; 
                  width: 180px; 
                  margin: 0 auto; 
                  padding: 10px; 
                  font-size: 10px;
                  font-weight: bold;
                  background: white;
                  line-height: 1.2;
                }
              }
              .header { 
                text-align: center; 
                margin-bottom: 8px;
                padding-bottom: 5px;
                border-bottom: 1px dashed #000;
              }
              .logo-container {
                text-align: center;
                margin-bottom: 5px;
              }
              .logo {
                max-width: 60px;
                max-height: 60px;
                width: auto;
                height: auto;
              }
              h2 { 
                text-align: center; 
                margin: 3px 0;
                font-size: 14px;
                font-weight: bold;
                color: #000;
              }
              .direccion {
                text-align: center;
                font-size: 8px;
                font-weight: bold;
                color: #000;
                margin-bottom: 3px;
              }
              .fecha { 
                text-align: center; 
                font-size: 8px; 
                font-weight: bold;
                color: #000;
                margin-bottom: 8px;
                border-bottom: 1px dashed #000;
                padding-bottom: 4px;
              }
              .tipo-ticket {
                text-align: center;
                font-weight: bold;
                color: #000;
                margin: 3px 0;
                font-size: 9px;
              }
              .productos {
                margin: 8px 0;
              }
              .producto-item {
                margin-bottom: 4px;
                line-height: 1.1;
              }
              .producto-nombre {
                font-weight: bold;
                font-size: 9px;
                margin-bottom: 1px;
              }
              .producto-detalle {
                font-size: 8px;
                font-weight: bold;
              }
              .resumen {
                margin-top: 8px;
                border-top: 1px dashed #000;
                padding-top: 4px;
              }
              .resumen-fila {
                display: flex;
                justify-content: space-between;
                margin-bottom: 2px;
                font-size: 8px;
              }
              .resumen-total {
                border-top: 1px solid #000;
                padding-top: 3px;
                margin-top: 4px;
                font-weight: bold;
                font-size: 10px;
              }
              .metodo-pago {
                text-align: center;
                margin-top: 5px;
                font-size: 8px;
                font-weight: bold;
              }
              .footer {
                text-align: center;
                margin-top: 10px;
                font-size: 8px;
                font-weight: bold;
                border-top: 1px dashed #000;
                padding-top: 4px;
                color: #000;
              }
              .gracias {
                font-size: 9px;
                font-weight: bold;
                margin-bottom: 2px;
              }
              @page {
                margin: 5mm;
                size: 58mm auto;
              }
            </style>
          </head>
          <body>
                        <div class="header">
              <div class="logo-container">
                <img src="file:///${logoPath}" class="logo" alt="Logo La Perla Desarrolladora S.A." 
                     onerror="this.style.display='none';">
              </div>
              <h2>${EMPRESA.nombre}</h2>
              <div class="direccion">
                ${EMPRESA.rubros}<br>
                ${EMPRESA.direccion}<br>
                Tel: ${EMPRESA.telefono}
              </div>
            </div>
            
            <div class="fecha">
              Fecha: ${fecha}<br>
              Ticket N°: ${Math.floor(Math.random() * 10000)}
            </div>
            
            <div class="tipo-ticket">
              ${metodoPago ? 'TICKET DE VENTA' : 'PRESUPUESTO'}
            </div>
            
            <div class="productos">
              ${carritoSnapshot.map(p => `
                <div class="producto-item">
                  <div class="producto-nombre">${p.nombre}</div>
                  <div class="producto-detalle">${p.cantidad} x $${p.precio.toFixed(2)} = $${(p.precio * p.cantidad).toFixed(2)}</div>
                </div>
              `).join('')}
            </div>

            <div class="resumen">
              <div class="resumen-fila">
                <span>Cantidad total:</span>
                <span>${cantidadTotal}</span>
              </div>
              <div class="resumen-fila">
                <span>Subtotal:</span>
                <span>$${totalBase.toFixed(2)}</span>
              </div>
              ${ajuste.monto !== 0 ? `
              <div class="resumen-fila">
                <span>${ajusteLabel}:</span>
                <span>${ajuste.monto < 0 ? '-' : '+'}$${Math.abs(ajusteValor).toFixed(2)}</span>
              </div>
              ` : ''}
              <div class="resumen-fila resumen-total">
                <span>TOTAL:</span>
                <span>$${totalMostrado.toFixed(2)}</span>
              </div>
            </div>
            
            ${metodoPago ? `<div class="metodo-pago">Método de pago: ${metodoPago}</div>` : ''}
            
            <div class="footer">
              <div class="gracias">¡GRACIAS POR SU COMPRA!</div>
            </div>
            
            <div class="no-print">
              <button onclick="window.print()" style="margin: 10px; padding: 5px 10px;">Imprimir Ticket</button>
            </div>
          </body>
        </html>
      `);
          popup.document.close();
          setTimeout(() => popup.print(), 300);
        }).catch(err => {
          console.error('Error obteniendo ruta del logo:', err);
          imprimirTicketSinLogo(metodoPago, totalFinal, totalOriginal);
        });

      } catch (err) {
        console.error('Error al imprimir ticket:', err);
        alert('Error al generar el ticket.');
        restaurarFoco();
      }
    }

    // Función de respaldo sin logo
    function imprimirTicketSinLogo(metodoPago = '', totalFinal = 0, totalOriginal = 0) {
      const fecha = new Date().toLocaleString('es-AR');
      // Capturar snapshot del carrito sincrónicamente
      const carritoSnapshot = carrito.map(p => ({ ...p }));
      const subtotal = carritoSnapshot.reduce((t, p) => t + (p.precio * p.cantidad), 0);
      const ajuste = calcularAjusteSobreTotal(subtotal);
      const totalMostrado = totalFinal || ajuste.totalFinal;
      const totalBase = totalOriginal || subtotal;
      const cantidadTotal = carritoSnapshot.reduce((t, p) => t + Number(p.cantidad || 0), 0);

      const popup = window.open('', '_blank', 'width=250,height=640');
      popup.document.write(`
    <html>
      <head>
        <title>${metodoPago ? 'Ticket de Venta' : 'Presupuesto'}</title>
        <style>
          @media print {
            body { 
              font-family: 'Courier New', monospace; 
              width: 180px; 
              margin: 0; 
              padding: 5px; 
              font-size: 9px;
              font-weight: bold;
              background: white;
              line-height: 1.1;
            }
            .no-print { display: none !important; }
          }
          @media screen {
            body { 
              font-family: 'Courier New', monospace; 
              width: 180px; 
              margin: 0 auto; 
              padding: 10px; 
              font-size: 10px;
              font-weight: bold;
              background: white;
              line-height: 1.2;
            }
          }
          .header { 
            text-align: center; 
            margin-bottom: 8px;
            padding-bottom: 5px;
            border-bottom: 1px dashed #000;
          }
          h2 { 
            text-align: center; 
            margin: 3px 0;
            font-size: 14px;
            font-weight: bold;
            color: #000;
          }
          .direccion {
            text-align: center;
            font-size: 8px;
            font-weight: bold;
            color: #000;
            margin-bottom: 3px;
          }
          .fecha { 
            text-align: center; 
            font-size: 8px; 
            font-weight: bold;
            color: #000;
            margin-bottom: 8px;
            border-bottom: 1px dashed #000;
            padding-bottom: 4px;
          }
          .tipo-ticket {
            text-align: center;
            font-weight: bold;
            color: #000;
            margin: 3px 0;
            font-size: 9px;
          }
          .productos {
            margin: 8px 0;
          }
          .producto-item {
            margin-bottom: 4px;
            line-height: 1.1;
          }
          .producto-nombre {
            font-weight: bold;
            font-size: 9px;
            margin-bottom: 1px;
          }
          .producto-detalle {
            font-size: 8px;
            font-weight: bold;
          }
          .resumen {
            margin-top: 8px;
            border-top: 1px dashed #000;
            padding-top: 4px;
          }
          .resumen-fila {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
            font-size: 8px;
          }
          .resumen-total {
            border-top: 1px solid #000;
            padding-top: 3px;
            margin-top: 4px;
            font-weight: bold;
            font-size: 10px;
          }
          .metodo-pago {
            text-align: center;
            margin-top: 5px;
            font-size: 8px;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            margin-top: 10px;
            font-size: 8px;
            font-weight: bold;
            border-top: 1px dashed #000;
            padding-top: 4px;
            color: #000;
          }
          .gracias {
            font-size: 9px;
            font-weight: bold;
            margin-bottom: 2px;
          }
          @page {
            margin: 5mm;
            size: 58mm auto;
          }
        </style>
      </head>
      <body>
                <div class="header">
          <h2>${EMPRESA.nombre}</h2>
          <div class="direccion">
            ${EMPRESA.rubros}<br>
            ${EMPRESA.direccion}<br>
            Tel: ${EMPRESA.telefono}
          </div>
        </div>
        
        <div class="fecha">
          Fecha: ${fecha}<br>
          Ticket N°: ${Math.floor(Math.random() * 10000)}
        </div>
        
        <div class="tipo-ticket">
          ${metodoPago ? 'TICKET DE VENTA' : 'PRESUPUESTO'}
        </div>
        
        <div class="productos">
          ${carritoSnapshot.map(p => `
            <div class="producto-item">
              <div class="producto-nombre">${p.nombre}</div>
              <div class="producto-detalle">${p.cantidad} x $${p.precio.toFixed(2)} = $${(p.precio * p.cantidad).toFixed(2)}</div>
            </div>
          `).join('')}
        </div>

        <div class="resumen">
          <div class="resumen-fila">
            <span>Cantidad total:</span>
            <span>${cantidadTotal}</span>
          </div>
          <div class="resumen-fila">
            <span>Subtotal:</span>
            <span>$${totalBase.toFixed(2)}</span>
          </div>
          ${ajuste.monto !== 0 ? `
          <div class="resumen-fila">
            <span>${ajuste.tipo === 'discount' ? 'Descuento' : 'Recargo'}:</span>
            <span>${ajuste.monto < 0 ? '-' : '+'}$${Math.abs(ajuste.monto).toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="resumen-fila resumen-total">
            <span>TOTAL:</span>
            <span>$${totalMostrado.toFixed(2)}</span>
          </div>
        </div>
        
        ${metodoPago ? `<div class="metodo-pago">Método de pago: ${metodoPago}</div>` : ''}
        
        <div class="footer">
          <div class="gracias">¡GRACIAS POR SU COMPRA!</div>
        </div>
        
        <div class="no-print">
          <button onclick="window.print()" style="margin: 10px; padding: 5px 10px;">Imprimir Ticket</button>
        </div>
      </body>
    </html>
  `);
            popup.document.close();
      setTimeout(() => popup.print(), 300);
    }

        function imprimirPresupuesto() {
      try {
        const carritoSnapshot = carrito.map(p => ({ ...p }));
        if (carritoSnapshot.length === 0) {
          alert('El carrito está vacío.');
          return;
        }

        const subtotal = carritoSnapshot.reduce((t, p) => t + (p.precio * p.cantidad), 0);
        const ajuste = calcularAjusteSobreTotal(subtotal);
        const totalMostrado = ajuste.totalFinal;
        const totalBase = subtotal;
        const ajusteLabel = ajuste.monto !== 0 ? (ajuste.tipo === 'discount' ? 'Descuento' : 'Recargo') : '';
        const ajusteValor = ajuste.monto || 0;

        window.electronAPI.getImagePath('logoperla2.png').then(logoPath => {
          const htmlContent = generarHTMLPresupuesto({
            logoPath,
            carrito: carritoSnapshot,
            subtotal: totalBase,
            ajusteLabel,
            ajusteValor,
            totalFinal: totalMostrado
          });

          const popup = window.open('', '_blank', 'width=800,height=800');
          popup.document.write(htmlContent);
          popup.document.close();
        }).catch(err => {
          console.error('Error al imprimir presupuesto:', err);
          alert('Error al generar el presupuesto.');
          restaurarFoco();
        });
      } catch (err) {
        console.error('Error al imprimir presupuesto:', err);
        alert('Error al generar el presupuesto.');
        restaurarFoco();
      }
    }

    function imprimirRemito(venta = null, remitoExistente = null) {
      try {
        const carritoSnapshot = remitoExistente
          ? (remitoExistente.productos || [])
          : venta
            ? (venta.productos || [])
            : carrito.map(p => ({ ...p }));

        if (carritoSnapshot.length === 0) {
          alert('El carrito está vacío.');
          return;
        }

        window.electronAPI.getImagePath('logoperla2.png').then(logoPath => {
          const htmlContent = generarHTMLRemito({
            logoPath,
            carrito: carritoSnapshot,
            venta,
            remitoExistente
          });

          const popup = window.open('', '_blank', 'width=800,height=800');
          popup.document.write(htmlContent);
          popup.document.close();
        }).catch(err => {
          console.error('Error al imprimir remito:', err);
          alert('Error al generar el remito.');
          if (typeof restaurarFoco === 'function') restaurarFoco();
        });
      } catch (err) {
        console.error('Error al imprimir remito:', err);
        alert('Error al generar el remito.');
        if (typeof restaurarFoco === 'function') restaurarFoco();
      }
    }

    // ===== FUNCIÓN PRINCIPAL renderTable =====
    function renderTable() {
      tbody.innerHTML = '';
      window.__inventoryRenderTable = renderTable;
      window.__todosLosProductos = productos;

      const searchInput = document.getElementById('searchInput');
      const searchTerm = (searchInput?.value || '').trim();
      
      console.log(`📊 [renderTable] Renderizando tabla. Search: "${searchTerm}", Filter:`, activeFilter);

      // Sincronizar UI de etiquetas de filtro activo
      updateActiveFiltersUI();

      let filtered = [...productos];

      if (searchTerm) {
        if (typeof window.__scoreProductRelevance === 'function') {
          filtered = filtered
            .map(p => ({ product: p, score: window.__scoreProductRelevance(p, searchTerm) }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(item => item.product);
        } else {
          const lowerTerm = searchTerm.toLowerCase();
          filtered = filtered.filter(p =>
            (p.nombre || '').toLowerCase().includes(lowerTerm) ||
            (p.codigo || '').toLowerCase().includes(lowerTerm) ||
            (p.categoria || '').toLowerCase().includes(lowerTerm)
          );
        }
      }

      if (activeFilter) {
        if (activeFilter.type === 'category') {
          filtered = filtered.filter(p => p.categoria === activeFilter.value);
        } else if (activeFilter.type === 'stock') {
          filtered = filtered.filter(p => activeFilter.value === 'low' ? p.stock < 10 : p.stock >= 10);
        } else if (activeFilter.type === 'supplier') {
          filtered = filtered.filter(p => Number(p.proveedor_id) === Number(activeFilter.value));
        }
      }

      const totalItems = filtered.length;
      const totalPages = Math.ceil(totalItems / perPage);

      if (currentPage > totalPages) currentPage = totalPages || 1;

      const start = (currentPage - 1) * perPage;
      const end = start + perPage;
      const pageItems = filtered.slice(start, end);

      if (pageItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 30px; color: #64748b;">
          <i class="fas fa-search" style="font-size: 24px; display: block; margin-bottom: 10px; opacity: 0.5;"></i>
          No se encontraron productos${searchTerm ? ` que coincidan con "${searchTerm}"` : ''}.
        </td></tr>`;
        renderPaginationControls(0, 0);
        return;
      }

      const fragment = document.createDocumentFragment();

      for (const p of pageItems) {
        const tr = document.createElement('tr');
        tr.dataset.id = p.id;
        if (p.stock < 10) tr.style.backgroundColor = '#ffe5e5';

        tr.innerHTML = `
  <td>${escapeHtml(p.codigo)}</td>
  <td>${escapeHtml(p.nombre)}</td>
  <td>${escapeHtml(p.categoria)}</td>
  <td>${Number(p.stock).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
  <td>${escapeHtml(p.unidad || 'un')}</td>
  <td>$${Number(p.precio_costo || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
  <td>$${Number(p.precio).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
  <td>
    <button class="btnEdit" data-id="${p.id}"><i class="fas fa-pencil-alt"></i> Editar</button>
    <button class="btnDelete" data-id="${p.id}"><i class="fas fa-trash-alt"></i> </button>
    <button class="btnCarrito" data-id="${p.id}"><i class="fas fa-plus"></i></button>
  </td>
`;



        fragment.appendChild(tr);
      }

      tbody.appendChild(fragment);
      renderPaginationControls(totalPages, totalItems);
    }

    function renderPaginationControls(totalPages, totalItems) {
      const paginationDivId = 'paginationControls';
      let paginationDiv = document.getElementById(paginationDivId);

      if (!paginationDiv) {
        paginationDiv = document.createElement('div');
        paginationDiv.id = paginationDivId;
        paginationDiv.className = 'pagination';
        tbody.parentElement.after(paginationDiv);
      }

      paginationDiv.innerHTML = '';

      if (totalPages <= 1) return;

      const info = document.createElement('span');
      info.textContent = `Página ${currentPage} de ${totalPages} (${totalItems} productos)`;
      paginationDiv.appendChild(info);

      const prev = document.createElement('button');
      prev.textContent = '⟨ Anterior';
      prev.disabled = currentPage === 1;
      prev.onclick = () => {
        if (currentPage > 1) {
          currentPage--;
          renderTable();
        }
      };
      paginationDiv.appendChild(prev);

      const maxButtons = 5;
      const start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
      const end = Math.min(totalPages, start + maxButtons - 1);

      for (let i = start; i <= end; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        if (i === currentPage) btn.style.background = '#007bff';
        btn.onclick = () => {
          currentPage = i;
          renderTable();
        };
        paginationDiv.appendChild(btn);
      }

      const next = document.createElement('button');
      next.textContent = 'Siguiente ⟩';
      next.disabled = currentPage === totalPages;
      next.onclick = () => {
        if (currentPage < totalPages) {
          currentPage++;
          renderTable();
        }
      };
      paginationDiv.appendChild(next);
    }

    window.__inventoryRenderTable = () => {
      currentPage = 1;
      renderTable();
    };

    // ===== BUSCADOR =====
    const searchInput = document.getElementById('searchInput');
    if (searchInput && !searchInput.__listenerAdded) {
      let searchTimeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const tbody = document.getElementById('inventoryBody');
        if (tbody) {
          tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Buscando...</td></tr>';
        }
        searchTimeout = setTimeout(() => {
          currentPage = 1;
          renderTable();
        }, 300);
      });
      searchInput.__listenerAdded = true;
    }

    setupTopbarSearch();

    // ===== EVENTOS DEL CARRITO =====
    // Abrir carrito - botón superior y carrito flotante
    const openCartModal = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      console.log('Abriendo carrito...'); // Para debug
      renderCart();
      if (modalCart) {
        modalCart.style.display = 'flex';
        modalCart.style.zIndex = '1000';
      }
    };

    if (btnCart) {
      btnCart.addEventListener('click', openCartModal);
    }

    if (cartFloating) {
      cartFloating.addEventListener('click', openCartModal);
    }

    if (btnCloseCart) {
      btnCloseCart.addEventListener('click', () => {
        if (modalCart) modalCart.style.display = 'none';
        restaurarFoco(); // ← AGREGAR
      });
    }

    // Cerrar modal Carrito al hacer click sobre el backdrop (fuera del contenido)
    if (modalCart) {
      modalCart.addEventListener('click', (e) => {
        if (e.target === modalCart) {
          modalCart.style.display = 'none';
          restaurarFoco();
        }
      });
    }

    if (btnClearCart) {
      btnClearCart.addEventListener('click', () => {
        carrito.length = 0;
        renderCart();
        updateCartCount();
        updateFloatingCart();
      });
    }

    if (discountInput) {
      discountInput.addEventListener('input', () => {
        sincronizarAjusteDesdeDOM();
        renderCart();
      });
    }
    if (adjustType) {
      adjustType.addEventListener('change', () => {
        sincronizarAjusteDesdeDOM();
        renderCart();
      });
    }
    if (adjustMode) {
      adjustMode.addEventListener('change', () => {
        sincronizarAjusteDesdeDOM();
        renderCart();
      });
    }

    if (applyDiscount) {
      applyDiscount.addEventListener('click', () => {
        const valor = parseFloat(discountInput?.value || '0');
        if (isNaN(valor)) {
          alert('Ingresá un valor numérico válido.');
          return;
        }
        ajusteActual = {
          tipo: adjustType?.value === 'surcharge' ? 'surcharge' : 'discount',
          modo: adjustMode?.value === 'fixed' ? 'fixed' : 'percent',
          valor: Math.abs(valor)
        };
        descuentoActual = ajusteActual.modo === 'percent' && ajusteActual.tipo === 'discount'
          ? ajusteActual.valor
          : 0;
        window.__descuentoActual = descuentoActual;
        renderCart();
      });
    }

    if (btnSell) {
      btnSell.addEventListener('click', () => {
        if (ventaEnProceso) {
          console.log('Venta ya en proceso');
          return;
        }

        if (carrito.length === 0) {
          alert('El carrito está vacío.');
          return;
        }

        ventaEnProceso = true;

        const metodo = prompt('Seleccioná método de pago:\n1️⃣ Efectivo\n2️⃣ Mercado Pago\n3️⃣ Transferencia');
        if (!['1', '2', '3'].includes(metodo)) {
          ventaEnProceso = false;
          alert('Método no válido o cancelado.');
          return;
        }

        const nombreMetodo = metodo === '1' ? 'Efectivo' : metodo === '2' ? 'Mercado Pago' : 'Transferencia';

        const totalSinDescuento = carrito.reduce((t, p) => t + (p.precio * p.cantidad), 0);
        const total = calcularAjusteSobreTotal(totalSinDescuento).totalFinal;

        if (confirm(`¿Confirmar venta con ${nombreMetodo} por $${total.toFixed(2)}?`)) {
          registrarVenta(nombreMetodo).finally(() => {
            setTimeout(() => {
              ventaEnProceso = false;
            }, 2000);
          });
        } else {
          ventaEnProceso = false;
        }
      });
    }

        const closePrintOptionsModal = () => {
      if (modalPrintOptions) {
        modalPrintOptions.style.display = 'none';
      }
      restaurarFoco();
    };

    if (btnImprimirTicket) {
      btnImprimirTicket.addEventListener('click', () => {
        if (modalPrintOptions) {
          modalPrintOptions.style.display = 'flex';
          modalPrintOptions.style.zIndex = '1100';
        }
      });
    }

    if (btnPrintTicketOption) {
      btnPrintTicketOption.addEventListener('click', () => {
        closePrintOptionsModal();
        imprimirTicket('', 0, 0, false);
      });
    }

        if (btnPrintPresupuestoOption) {
      btnPrintPresupuestoOption.addEventListener('click', () => {
        closePrintOptionsModal();
        imprimirPresupuesto();
      });
    }

    if (btnPrintRemitoOption) {
      btnPrintRemitoOption.addEventListener('click', () => {
        closePrintOptionsModal();
        imprimirRemito();
      });
    }

    if (btnClosePrintOptions) {
      btnClosePrintOptions.addEventListener('click', closePrintOptionsModal);
    }

    if (btnCancelPrintOptions) {
      btnCancelPrintOptions.addEventListener('click', closePrintOptionsModal);
    }

    if (modalPrintOptions) {
      modalPrintOptions.addEventListener('click', (e) => {
        if (e.target === modalPrintOptions) {
          closePrintOptionsModal();
        }
      });
    }

    // ===== LISTENERS GLOBALES (DEFINIDOS CON REFERENCIAS) =====

    // INPUT handler - actualiza subtotales y totales en tiempo real
    window.__inputHandler = (e) => {
      if (e.target.classList.contains('cart-qty-input')) {
        const valorRaw = e.target.value;
        const index = parseInt(e.target.dataset.index);
        
        // Filtrar caracteres no numéricos
        if (valorRaw !== '' && isNaN(parseFloat(valorRaw))) {
          e.target.value = valorRaw.replace(/[^0-9]/g, '');
        }

        let nuevaCantidad = parseFloat(e.target.value);
        if (isNaN(nuevaCantidad) || nuevaCantidad < 0) {
          nuevaCantidad = 0;
        }

        if (carrito[index]) {
          carrito[index].cantidad = nuevaCantidad;

          // Actualizar celda de subtotal de esta fila
          const tr = e.target.closest('tr');
          if (tr) {
            const subtotalCell = tr.cells[3];
            const subtotalVal = carrito[index].precio * nuevaCantidad;
            if (subtotalCell) {
              subtotalCell.textContent = `$${formatearMonedaArgentina(subtotalVal)}`;
            }
          }

          // Recalcular y actualizar totales del carrito
          const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
          const ajuste = calcularAjusteSobreTotal(total);
          
          if (cartTotal) {
            cartTotal.textContent = `Total original: $${formatearMonedaArgentina(total)}`;
          }

          if (cartTotalDiscount) {
            if (ajuste.monto !== 0) {
              cartTotalDiscount.style.display = 'block';
              cartTotalDiscount.className = `discount-amount ${ajuste.clase}`;
              cartTotalDiscount.innerHTML = `
                <div>${ajuste.texto}</div>
                <div><strong>Total final: $${formatearMonedaArgentina(ajuste.totalFinal)}</strong></div>
              `;
            } else {
              cartTotalDiscount.className = 'discount-amount';
              cartTotalDiscount.style.display = 'block';
              cartTotalDiscount.innerHTML = `<div>Sin ajuste</div><div><strong>Total final: $${formatearMonedaArgentina(total)}</strong></div>`;
            }
          }

          updateCartCount();
          updateFloatingCart();
        }
      }
    };

    // BLUR handler
    window.__blurHandler = (e) => {
      if (e.target.classList.contains('cart-qty-input')) {
        const index = parseInt(e.target.dataset.index);
        let nuevaCantidad = parseFloat(e.target.value);
        if (isNaN(nuevaCantidad) || nuevaCantidad <= 0) {
          nuevaCantidad = 1;
          e.target.value = 1;
        }
        if (carrito[index]) {
          carrito[index].cantidad = nuevaCantidad;
          renderCart();
          updateFloatingCart();
        }
      }
    };

        // KEYDOWN handler (Enter y ESC)
    window.__keydownHandler = (e) => {
      if (e.target.classList.contains('cart-qty-input') && e.key === 'Enter') {
        e.preventDefault();
        const index = parseInt(e.target.dataset.index);
        let nuevaCantidad = parseFloat(e.target.value);
        if (isNaN(nuevaCantidad) || nuevaCantidad <= 0) {
          nuevaCantidad = 1;
          e.target.value = 1;
        }
        if (carrito[index]) {
          carrito[index].cantidad = nuevaCantidad;
          renderCart();
          updateFloatingCart();
        }
        e.target.blur();
      }

      // Cerrar modal de opciones de impresión con tecla ESC
      if (e.key === 'Escape') {
        const modalPrintOptions = document.getElementById('modalPrintOptions');
        if (modalPrintOptions && modalPrintOptions.style.display === 'flex') {
          modalPrintOptions.style.display = 'none';
          restaurarFoco();
        }
      }
    };

    // REMOVE ITEM handler
    window.__clickHandler = (e) => {
      if (e.target.classList.contains('btnRemoveCartItem')) {
        const index = parseInt(e.target.dataset.index);
        if (!isNaN(index)) {
          carrito.splice(index, 1);
          renderCart();
          updateCartCount();
          updateFloatingCart();
        }
      }
    };
    // PAGO handler con control de doble clic - MEJORADO
    if (!window.__pagoHandlerRegistrado) {
      window.__pagoHandler = async (e) => {
        if (ventaEnProceso) {
          console.log('Venta ya en proceso, ignorando clic adicional');
          return;
        }

        const btn = e.target.closest('.btnPago, .payment-btn');
        if (!btn) return;

        const metodo = btn.dataset.metodo;
        if (!metodo) return;

        e.preventDefault();
        e.stopPropagation(); // Importante: evitar propagación

        if (carrito.length === 0) {
          alert('El carrito está vacío.');
          restaurarFoco();
          return;
        }

        const totalSinDescuento = carrito.reduce((t, p) => t + (p.precio * p.cantidad), 0);
        const total = calcularAjusteSobreTotal(totalSinDescuento).totalFinal;

        // Deshabilitar visualmente el botón
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';

        const confirmado = confirm(`¿Confirmar venta con ${metodo} por $${total.toFixed(2)}?`);

        if (confirmado) {
          ventaEnProceso = true;
          try {
            await registrarVenta(metodo);
          } finally {
            setTimeout(() => {
              ventaEnProceso = false;
              btn.style.opacity = '1';
              btn.style.pointerEvents = 'auto';
              restaurarFoco();
            }, 2000);
          }
        } else {
          btn.style.opacity = '1';
          btn.style.pointerEvents = 'auto';
          restaurarFoco();
        }
      };

      // Remover listener previo si existe
      document.removeEventListener('click', window.__pagoHandler);
      document.addEventListener('click', window.__pagoHandler);
      window.__pagoHandlerRegistrado = true;
      console.log('✅ Listener de pago registrado');
    }




    // AGREGAR TODOS LOS LISTENERS GLOBALES
    document.addEventListener('input', window.__inputHandler);
    document.addEventListener('blur', window.__blurHandler);
    document.addEventListener('keydown', window.__keydownHandler);
    document.addEventListener('click', window.__clickHandler);
    document.addEventListener('click', window.__pagoHandler);
    window.__listenerPagoRegistrado = true;

    // ===== RESTO DEL CÓDIGO (loadCategoriesAndPopulate, loadProducts, etc) =====
    // ... (mantén aquí el resto de tus funciones como loadCategoriesAndPopulate, loadProducts, etc)

    // 🔹 Agregá esta línea justo después de cerrar la función:
    window.__registrarVentaGlobal = registrarVenta;




    // === Toggle Filtros (estable) ===
    if (btnFilters && filtersPanel) {
      const btnCloseFilters = document.getElementById('btnCloseFilters');

      const openFilters = () => {
        filtersPanel.classList.add('active');
        document.body.style.overflow = 'hidden';
      };

      const closeFilters = () => {
        filtersPanel.classList.remove('active');
        document.body.style.overflow = '';
      };

      btnFilters.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (filtersPanel.classList.contains('active')) closeFilters();
        else openFilters();
      });

      btnCloseFilters?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeFilters();
      });

      document.addEventListener('click', (e) => {
        if (!filtersPanel.classList.contains('active')) return;
        
        // Si hace click exactamente en el overlay (#filtersPanel), cerrar
        if (e.target === filtersPanel) {
          closeFilters();
          return;
        }
        
        // Si hace click fuera del modal content y del botón, cerrar
        const content = filtersPanel.querySelector('.filters-panel-modern');
        if (content && !content.contains(e.target) && e.target !== btnFilters && !btnFilters.contains(e.target)) {
          closeFilters();
        }
      });
    }


    // Cargar categorías a selects
    async function loadCategoriesAndPopulate() {
      try {
        const catRows = (window.electronAPI && typeof window.electronAPI.getCategories === 'function')
          ? await window.electronAPI.getCategories()
          : [];
        const catFromDB = Array.from(new Set((catRows || []).map(c => String(c.nombre || '').trim()).filter(Boolean)));
        const catFromProducts = Array.from(new Set(productos.map(p => String(p.categoria || '').trim()).filter(Boolean)));
        const allCats = Array.from(new Set([...catFromDB, ...catFromProducts])).sort((a, b) => a.localeCompare(b));

        if (selectAddCategoria) {
          selectAddCategoria.innerHTML = `<option value="">(ninguna)</option>` +
            allCats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        }
        if (selectUpdateCategory) {
          selectUpdateCategory.innerHTML = `<option value="">Todas las categorías</option>` +
            allCats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        }


        // --- Delegación de eventos para los filtros (por texto de categoría) ---
        const filtersContainer = document.getElementById('filterCategories');
        if (filtersContainer) {
          filtersContainer.addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const categoriaSeleccionada = btn.textContent.trim();

            try {
              // Obtenemos todos los productos
              const allProducts = await window.electronAPI.getProducts();

              // Filtramos según el nombre de categoría
              const filtered = allProducts.filter(
                p => String(p.categoria).trim().toLowerCase() === categoriaSeleccionada.toLowerCase()
              );

              // Renderizamos usando tu función actual (buscando en ambos scopes)
              productos = filtered;

              if (typeof renderTable === 'function') {
                renderTable();
              } else if (typeof window.renderTable === 'function') {
                window.renderTable();
              } else {
                console.error('No se encontró la función renderTable');
                alert('Error interno: no se pudo refrescar la tabla.');
              }

              // Cierra el panel después de aplicar filtro
              const filtersPanel = document.getElementById('filtersPanel');
              if (filtersPanel) filtersPanel.classList.remove('active');
              document.body.style.overflow = '';

            } catch (err) {
              console.error('Error aplicando filtro:', err);
              alert('No se pudo aplicar el filtro, revisá la consola.');
              restaurarFoco(); // ← AGREGAR
            }
          });
        }


        // Render filtros de categorías CON BOTÓN DE ELIMINAR
        if (filterCategories) {
          filterCategories.innerHTML = '';

          allCats.forEach((c, idx) => {
            // Contenedor de la categoría
            const categoryContainer = document.createElement('div');
            categoryContainer.className = 'category-item';
            if (idx >= 5) {
              categoryContainer.classList.add('collapsed-hidden');
            }
            categoryContainer.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 6px;
      padding: 4px 4px 4px 10px;
      transition: all 0.2s ease;
    `;

            // Botón para filtrar (el nombre de la categoría)
            const filterBtn = document.createElement('button');
            filterBtn.textContent = c;
            filterBtn.style.cssText = `
      flex: 1;
      text-align: left;
      padding: 8px 5px;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 13px;
      color: #1e293b;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
            filterBtn.addEventListener('click', () => {
              activeFilter = { type: 'category', value: c };
              renderTable();

              // Cerrar panel de filtros después de aplicar
              const filtersPanel = document.getElementById('filtersPanel');
              if (filtersPanel) filtersPanel.classList.remove('active');
              document.body.style.overflow = '';
            });

            // Botón para eliminar categoría (X)
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '✕';
            deleteBtn.style.cssText = `
      background: #fee2e2;
      border: none;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      color: #dc2626;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 5px;
      transition: all 0.2s ease;
    `;
            deleteBtn.addEventListener('mouseenter', () => {
              deleteBtn.style.background = '#fecaca';
            });
            deleteBtn.addEventListener('mouseleave', () => {
              deleteBtn.style.background = '#fee2e2';
            });

            deleteBtn.addEventListener('click', async (e) => {
              e.stopPropagation(); // Evitar que se active el filtro

              // Preguntar confirmación
              if (!confirm(`¿Estás seguro de que quieres eliminar la categoría "${c}"?\n\nLos productos con esta categoría quedarán sin categoría.`)) {
                return;
              }

              try {
                // Buscar la categoría en la base de datos
                const categorias = await window.electronAPI.getCategories();
                const categoria = categorias.find(cat => cat.nombre === c);

                if (categoria && categoria.id) {
                  // Eliminar la categoría
                  const res = await window.electronAPI.deleteCategory(categoria.id);

                  if (res && res.success) {
                    // Actualizar productos: quitar la categoría de los productos que la tenían
                    const productosActualizar = productos.filter(p => p.categoria === c);

                    // Actualizar cada producto para quitarle la categoría
                    for (const prod of productosActualizar) {
                      await window.electronAPI.updateProduct({
                        ...prod,
                        categoria: '' // Dejar sin categoría
                      });
                    }

                    // Recargar productos y categorías
                    await loadProducts();

                    // Mostrar mensaje de éxito temporal
                    const toast = document.createElement('div');
                    toast.textContent = `✅ Categoría "${c}" eliminada`;
                    toast.style.cssText = `
              position: fixed;
              bottom: 20px;
              right: 20px;
              background: #10b981;
              color: white;
              padding: 10px 20px;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.2);
              z-index: 9999;
              animation: slideIn 0.3s ease;
            `;
                    document.body.appendChild(toast);

                    setTimeout(() => {
                      toast.remove();
                    }, 2000);

                  } else {
                    alert('Error al eliminar la categoría');
                  }
                } else {
                  // Si la categoría no tiene ID (viene solo de productos)
                  alert('Esta categoría no se puede eliminar directamente porque fue creada desde Excel. Para eliminarla, primero edita los productos y quítales esta categoría.');
                }
              } catch (err) {
                console.error('Error eliminando categoría:', err);
                alert('Error al eliminar la categoría: ' + err.message);
              }
            });

            categoryContainer.appendChild(filterBtn);
            categoryContainer.appendChild(deleteBtn);
            filterCategories.appendChild(categoryContainer);
          });

          // Update category section title count dynamically
          if (filterCategories) {
            const parentSection = filterCategories.closest('.filter-section');
            const titleSpan = parentSection ? parentSection.querySelector('.filter-section-title span') : null;
            if (titleSpan) {
              titleSpan.textContent = `Categorías (${allCats.length})`;
            }
          }

          // Update Toggle button label
          const btnToggleCategories = document.getElementById('btnToggleCategories');
          if (btnToggleCategories) {
            const wrapper = document.getElementById('categoriesWrapper');
            const isExpanded = wrapper && wrapper.classList.contains('expanded');
            btnToggleCategories.querySelector('span').textContent = isExpanded 
              ? '▲ Mostrar menos' 
              : `▼ Mostrar las ${allCats.length} categorías`;
            
            if (allCats.length > 5) {
              btnToggleCategories.style.display = 'block';
            } else {
              btnToggleCategories.style.display = 'none';
            }
          }

          // Lógica del buscador de categorías
          const filterCategorySearch = document.getElementById('filterCategorySearch');
          if (filterCategorySearch) {
            // Evitar múltiples listeners si se recargan las categorías
            filterCategorySearch.removeEventListener('input', window.__categorySearchHandler);

            window.__categorySearchHandler = (e) => {
              const searchTerm = e.target.value.toLowerCase().trim();
              const items = filterCategories.querySelectorAll('.category-item');
              const wrapper = document.getElementById('categoriesWrapper');
              const btnToggle = document.getElementById('btnToggleCategories');

              if (searchTerm) {
                if (wrapper) wrapper.classList.add('searching');
                if (btnToggle) btnToggle.style.display = 'none';
              } else {
                if (wrapper) wrapper.classList.remove('searching');
                if (btnToggle && allCats.length > 5) btnToggle.style.display = 'block';
              }

              items.forEach(item => {
                const btn = item.querySelector('button');
                if (btn) {
                  const text = btn.textContent.toLowerCase();
                  if (text.includes(searchTerm)) {
                    // Se debe volver a aplicar "display: flex" porque así está diseñado el layout
                    item.style.display = 'flex';
                  } else {
                    item.style.display = 'none';
                  }
                }
              });
            };

            filterCategorySearch.addEventListener('input', window.__categorySearchHandler);
          }

          // Set up toggle categories button event listener
          if (btnToggleCategories) {
            const newBtn = btnToggleCategories.cloneNode(true);
            btnToggleCategories.replaceWith(newBtn);
            
            newBtn.addEventListener('click', () => {
              const wrapper = document.getElementById('categoriesWrapper');
              if (!wrapper) return;
              
              const isExpanded = wrapper.classList.contains('expanded');
              if (isExpanded) {
                wrapper.classList.remove('expanded');
                newBtn.querySelector('span').textContent = `▼ Mostrar las ${allCats.length} categorías`;
              } else {
                wrapper.classList.add('expanded');
                newBtn.querySelector('span').textContent = `▲ Mostrar menos`;
              }
            });
          }
        }
      } catch (err) {
        console.error('Error cargando categorías:', err);
        restaurarFoco(); // ← AGREGAR
      }
    }

    async function loadSuppliersAndPopulate() {
      try {
        const selectAddProveedor = document.getElementById('addProveedor');
        if (!selectAddProveedor) return;

        const suppliers = (window.electronAPI && typeof window.electronAPI.getSuppliers === 'function')
          ? await window.electronAPI.getSuppliers()
          : [];

        selectAddProveedor.innerHTML = `<option value="">Sin proveedor</option>` +
          (suppliers || []).map(s => `<option value="${s.id}">${escapeHtml(s.razon_social)}</option>`).join('');
      } catch (err) {
        console.error('Error cargando proveedores:', err);
      }
    }

    async function loadSuppliersFilter() {
      try {
        const filterSuppliers = document.getElementById('filterSuppliers');
        if (!filterSuppliers) return;

        filterSuppliers.innerHTML = '';

        const suppliers = (window.electronAPI && typeof window.electronAPI.getSuppliers === 'function')
          ? await window.electronAPI.getSuppliers()
          : [];

        // Cache the suppliers list in scope
        proveedoresLista = suppliers || [];

        // Option "Todos" + real suppliers
        const allSuppliers = [{ id: 'all', razon_social: 'Todos' }, ...proveedoresLista];

        const totalCount = allSuppliers.length - 1; // subtract 'Todos' from count

        // Update Toggle button label
        const btnToggleSuppliers = document.getElementById('btnToggleSuppliers');
        if (btnToggleSuppliers) {
          const wrapper = document.getElementById('suppliersWrapper');
          const isExpanded = wrapper && wrapper.classList.contains('expanded');
          btnToggleSuppliers.querySelector('span').textContent = isExpanded 
            ? '▲ Mostrar menos' 
            : `▼ Mostrar los ${totalCount} proveedores`;
          
          if (totalCount > 5) {
            btnToggleSuppliers.style.display = 'block';
          } else {
            btnToggleSuppliers.style.display = 'none';
          }
        }

        allSuppliers.forEach((s, idx) => {
          const providerContainer = document.createElement('div');
          providerContainer.className = 'supplier-filter-item';
          if (idx >= 5) {
            providerContainer.classList.add('collapsed-hidden');
          }
          
          const isSelected = (s.id === 'all' && !activeFilter) || 
                             (activeFilter && activeFilter.type === 'supplier' && Number(activeFilter.value) === Number(s.id));

          providerContainer.style.cssText = isSelected 
            ? `
              display: flex;
              align-items: center;
              background: #eff6ff;
              border: 1px solid #3b82f6;
              border-radius: 8px;
              margin-bottom: 6px;
              padding: 4px 10px;
              transition: all 0.2s ease;
              cursor: pointer;
            `
            : `
              display: flex;
              align-items: center;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              margin-bottom: 6px;
              padding: 4px 10px;
              transition: all 0.2s ease;
              cursor: pointer;
            `;

          // Hover effects
          providerContainer.addEventListener('mouseenter', () => {
            if (!isSelected) {
              providerContainer.style.background = '#f1f5f9';
              providerContainer.style.borderColor = '#cbd5e1';
            }
          });
          providerContainer.addEventListener('mouseleave', () => {
            if (!isSelected) {
              providerContainer.style.background = '#f8fafc';
              providerContainer.style.borderColor = '#e2e8f0';
            }
          });

          // Checkbox icon
          const iconClass = isSelected ? 'fas fa-check-square' : 'far fa-square';
          const iconColor = isSelected ? '#3b82f6' : '#94a3b8';

          const filterBtn = document.createElement('button');
          filterBtn.innerHTML = `<i class="${iconClass}" style="margin-right: 8px; color: ${iconColor}; font-size: 14px;"></i> <span style="font-weight: 500; font-size: 13px; color: #1e293b;">${escapeHtml(s.razon_social)}</span>`;
          filterBtn.style.cssText = `
            flex: 1;
            text-align: left;
            padding: 8px 5px;
            background: none;
            border: none;
            cursor: pointer;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          `;

          const applyFilterAction = () => {
            if (s.id === 'all') {
              activeFilter = null;
            } else {
              activeFilter = { type: 'supplier', value: s.id };
            }
            currentPage = 1;
            renderTable();
            loadSuppliersFilter(); // reload list to update highlight state

            // Cerrar panel de filtros después de aplicar
            const filtersPanel = document.getElementById('filtersPanel');
            if (filtersPanel) filtersPanel.classList.remove('active');
            document.body.style.overflow = '';
          };

          providerContainer.addEventListener('click', applyFilterAction);
          filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            applyFilterAction();
          });

          providerContainer.appendChild(filterBtn);
          filterSuppliers.appendChild(providerContainer);
        });

        // Set up toggle expand button
        if (btnToggleSuppliers) {
          const newBtn = btnToggleSuppliers.cloneNode(true);
          btnToggleSuppliers.replaceWith(newBtn);
          
          newBtn.addEventListener('click', () => {
            const wrapper = document.getElementById('suppliersWrapper');
            if (!wrapper) return;
            
            const isExpanded = wrapper.classList.contains('expanded');
            if (isExpanded) {
              wrapper.classList.remove('expanded');
              newBtn.querySelector('span').textContent = `▼ Mostrar los ${totalCount} proveedores`;
            } else {
              wrapper.classList.add('expanded');
              newBtn.querySelector('span').textContent = `▲ Mostrar menos`;
            }
          });
        }

      } catch (err) {
        console.error('Error cargando proveedores para filtros:', err);
      }
    }

    function updateActiveFiltersUI() {
      const activeFiltersDiv = document.getElementById('activeFilters');
      const activeFiltersTags = document.getElementById('activeFiltersTags');
      if (!activeFiltersDiv || !activeFiltersTags) return;

      if (!activeFilter) {
        activeFiltersDiv.style.display = 'none';
        return;
      }

      activeFiltersDiv.style.display = 'block';

      if (activeFilter.type === 'stock') {
        const text = activeFilter.value === 'low' ? 'Stock bajo' : 'Stock normal';
        const icon = activeFilter.value === 'low' ? 'fa-exclamation-triangle' : 'fa-check-circle';
        activeFiltersTags.innerHTML = `
          <span class="filter-tag">
            <i class="fas ${icon}"></i> ${text}
            <i class="fas fa-times" onclick="window.limpiarFiltrosInventario()"></i>
          </span>
        `;
      } else if (activeFilter.type === 'category') {
        activeFiltersTags.innerHTML = `
          <span class="filter-tag">
            <i class="fas fa-folder"></i> Categoría: ${escapeHtml(activeFilter.value)}
            <i class="fas fa-times" onclick="window.limpiarFiltrosInventario()"></i>
          </span>
        `;
      } else if (activeFilter.type === 'supplier') {
        const found = proveedoresLista.find(prov => Number(prov.id) === Number(activeFilter.value));
        const supplierName = found ? found.razon_social : 'Proveedor';
        activeFiltersTags.innerHTML = `
          <span class="filter-tag">
            <i class="fas fa-truck"></i> ${escapeHtml(supplierName)}
            <i class="fas fa-times" onclick="window.limpiarFiltrosInventario()"></i>
          </span>
        `;
      }
    }

    // Cargar productos desde main
    async function loadProducts() {
      try {
        console.log('🔍 [loadProducts] Iniciando carga de productos...');
        const rows = (window.electronAPI && typeof window.electronAPI.getProducts === 'function')
          ? await window.electronAPI.getProducts()
          : [];
        
        console.log(`📦 [loadProducts] DB devolvió ${rows ? rows.length : 0} filas.`);
        
        productos = (rows || []).map(p => ({
          id: p.id,
          codigo: p.codigo || '',
          nombre: p.nombre || '',
          categoria: p.categoria || '',
          stock: Number(p.stock) || 0,
          precio: Number(p.precio) || 0,
          precio_costo: Number(p.preciocosto ?? p.precio_costo) || 0,
          unidad: p.unidad || 'un',
          proveedor_id: p.proveedor_id !== undefined ? p.proveedor_id : null
        }));

        // Asignar a window.productos para que updateInventoryStats pueda acceder
        window.productos = productos;
        console.log('✅ [loadProducts] Productos procesados y asignados a window.productos:', window.productos.length);

        await loadSuppliersFilter();
        await loadCategoriesAndPopulate();
        renderTable();

        // Actualizar métricas DESPUÉS de cargar los productos
        updateInventoryStats();
      } catch (err) {
        console.error('❌ [loadProducts] Error cargando productos:', err);
        alert('Error cargando productos (ver consola).');
        restaurarFoco();
      }
    }

        window.__inventoryLoadProducts = loadProducts;







      // --- EVENTOS con delegación (no se crean 600 listeners) ---

      tbody.removeEventListener('click', tbody.__clickHandler || (() => { }));

      tbody.__clickHandler = function (e) {
        const btn = e.target.closest('button');
        if (!btn) return;

        const id = Number(btn.dataset.id);
        if (!id) return;

        if (btn.classList.contains('btnEdit')) {
          editProductById(id);
          return;
        }

        if (btn.classList.contains('btnDelete')) {
          deleteProductById(id);
          return;
        }

        if (btn.classList.contains('btnCarrito')) {
          // Buscar el producto en el array productos
          const producto = productos.find(p => p.id === id);
          if (producto) {
            const productoExistente = carrito.find(item => item.id === id);
            if (productoExistente) {
              productoExistente.cantidad += 1;
            } else {
                            carrito.push({
                id: producto.id,
                codigo: producto.codigo,
                nombre: producto.nombre,
                precio: producto.precio,
                cantidad: 1
              });
            }
            renderCart();
            updateCartCount();
            updateFloatingCart();
          }
          return;
        }
      };


      tbody.addEventListener('click', tbody.__clickHandler);


    // Edit / Delete
    async function editProductById(id) {
      productoEditandoId = id;
      const p = productos.find(x => Number(x.id) === Number(id));
      if (!p) {
        alert('Producto no encontrado');
        return;
      }

      editingId = id;
      modalProductTitle.textContent = 'Editar Producto';
      btnSave.textContent = 'Actualizar';

      // ✅ PRIMERO cargamos categorías y proveedores
      await loadCategoriesAndPopulate();
      await loadSuppliersAndPopulate();

      // ✅ DESPUÉS asignamos valores
      document.getElementById('addCodigo').value = p.codigo;
      document.getElementById('addNombre').value = p.nombre;
      document.getElementById('addCategoria').value = p.categoria || '';
      document.getElementById('addStock').value = p.stock;
      document.getElementById('addPrecio').value = p.precio;
      document.getElementById('addPrecioCosto').value = p.precio_costo || 0;

      const selectAddProveedor = document.getElementById('addProveedor');
      if (selectAddProveedor) {
        selectAddProveedor.value = (p.proveedor_id !== null && p.proveedor_id !== undefined) ? p.proveedor_id : '';
      }

      modalAdd.classList.add('active');
    }



    async function deleteProductById(id) {
      const p = productos.find(x => Number(x.id) === Number(id));
      if (!p) {
        alert('Producto no encontrado');
        return;
      }

      if (!confirm(`¿Eliminar producto "${p.nombre}"?`)) return;

      try {
        const res = await window.electronAPI.deleteProduct(Number(id));
        if (res && res.success) {
          await loadProducts();
        } else {
          alert('No se pudo eliminar el producto.');
        }
      } catch (err) {
        console.error('Error deleteProduct:', err);
        alert('Error al eliminar (ver consola).');
        restaurarFoco(); // ← AGREGAR
      }
    }

    if (btnDeleteAll) {
      const modalStep1 = document.getElementById('modalDeleteAllStep1');
      const modalStep2 = document.getElementById('modalDeleteAllStep2');
      const btnYes1 = document.getElementById('btnYesDelete1');
      const btnNo1 = document.getElementById('btnNoDelete1');
      const btnYes2 = document.getElementById('btnYesDelete2');
      const btnNo2 = document.getElementById('btnNoDelete2');

      btnDeleteAll.addEventListener('click', () => {
        if (modalStep1) modalStep1.classList.add('active');
      });

      if (btnYes1) {
        btnYes1.addEventListener('click', () => {
          if (modalStep1) modalStep1.classList.remove('active');
          if (modalStep2) modalStep2.classList.add('active');
        });
      }

      if (btnNo1) {
        btnNo1.addEventListener('click', () => {
          if (modalStep1) modalStep1.classList.remove('active');
        });
      }

      if (btnNo2) {
        btnNo2.addEventListener('click', () => {
          if (modalStep2) modalStep2.classList.remove('active');
        });
      }

      if (btnYes2) {
        btnYes2.addEventListener('click', async () => {
          if (modalStep2) modalStep2.classList.remove('active');
          try {
            const res = await window.electronAPI.deleteAllProducts();
            if (res && res.success) {
              await loadProducts();
              mostrarToast('Todos los productos han sido eliminados', 'success');
            } else {
              mostrarToast('No se pudieron eliminar los productos', 'error');
            }
          } catch (err) {
            console.error('Error eliminando todos los productos:', err);
            mostrarToast('Error al eliminar productos', 'error');
          }
        });
      }
    }

    // Actualizar historial si estamos en la pestaña de historial
    const activeHistorial = document.querySelector('h1')?.textContent?.includes('Historial');
    if (activeHistorial && typeof initHistorial === 'function') {
      try { initHistorial(); } catch (_) { }
    }
    // === Función para imprimir el historial filtrado ===
    document.removeEventListener('click', window.__imprimirHistorialHandler);
    // === Función para imprimir el historial filtrado ===
    window.__imprimirHistorialHandler = async function (e) {
      if (e.target && e.target.id === 'btnImprimirHistorial') {
        const fecha = document.getElementById('historialFecha')?.value;
        if (!fecha) return alert('Seleccione una fecha para imprimir.');

        const tabla = document.querySelector('#historialBody');
        if (!tabla || tabla.children.length === 0) {
          return alert('No hay registros para imprimir.');
        }

        // Obtener los datos de la tabla actual
        const filas = Array.from(tabla.children).map(tr => {
          const celdas = tr.querySelectorAll('td');
          return {
            fecha: celdas[0]?.textContent || '',
            accion: celdas[1]?.textContent || '',
            detalle: celdas[2]?.textContent || ''
          };
        });

        // Generar HTML para impresión
        const html = `
      <html>
        <head>
          <title>Historial del ${fecha}</title>
          <style>
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              padding: 30px; 
              margin: 0;
              color: #333;
            }
            h1 { 
              text-align: center; 
              color: #17a2b8;
              margin-bottom: 5px;
              font-size: 24px;
            }
            h2 { 
              text-align: center; 
              color: #666;
              margin-top: 0;
              margin-bottom: 30px;
              font-size: 18px;
              font-weight: normal;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            th { 
              background: #17a2b8; 
              color: white; 
              padding: 12px; 
              text-align: left; 
              font-weight: 600;
            }
            td { 
              padding: 10px 12px; 
              border-bottom: 1px solid #e0e0e0; 
            }
            tr:nth-child(even) { 
              background: #f9f9f9; 
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #999;
              font-size: 12px;
            }
            @media print {
              body { padding: 20px; }
              th { background: #17a2b8 !important; color: white !important; }
            }
          </style>
        </head>
        <body>
                    <h1>${EMPRESA.nombre}</h1>
          <h2>Historial de movimientos - ${fecha}</h2>
          
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Acción</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              ${filas.map(f => `
                <tr>
                  <td>${f.fecha}</td>
                  <td>${f.accion}</td>
                  <td>${f.detalle}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            Generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}
          </div>
        </body>
      </html>
    `;

        const printWin = window.open('', '_blank', 'width=800,height=600');
        printWin.document.write(html);
        printWin.document.close();

        // Esperar a que cargue el contenido antes de imprimir
        setTimeout(() => {
          printWin.print();
        }, 500);
      }
    };


    // 🧹 Registrar solo una vez
    document.removeEventListener('click', window.__imprimirHistorialHandler);
    document.addEventListener('click', window.__imprimirHistorialHandler);



    /* ===== IMPORTAR EXCEL ===== */
    if (btnImportExcel && !btnImportExcel.__excelBound) {
      btnImportExcel.__excelBound = true;
      btnImportExcel.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Prevent multiple clicks
        if (btnImportExcel.__processing) {
          return;
        }
        btnImportExcel.__processing = true;
        
        try {
          const rawRows = await window.electronAPI.importExcel();
          if (!rawRows || rawRows.length === 0) {
            alert('No se importaron filas (cancelado o vacío).');
            btnImportExcel.__processing = false;
            return;
          }
          const normalized = rawRows.map(row => {
            const r = {};
            const keys = Object.keys(row);
            const normalize = (s) =>
              s
                .toString()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // sin acentos
                .replace(/\s+/g, '')             // sin espacios
                .replace(/\$/g, '')              // sin $
                .trim();

            const find = (...candidates) => {
              const normalizedCandidates = candidates.map(normalize);

              // 1️⃣ match exacto normalizado
              for (const key of keys) {
                if (normalizedCandidates.includes(normalize(key))) {
                  return row[key];
                }
              }

              // 2️⃣ match parcial (contiene "precio")
              for (const key of keys) {
                if (normalize(key).includes('precio')) {
                  return row[key];
                }
              }

              return undefined;
            };


            r.codigo = String(find('codigo', 'código', 'code', 'cod') || '').trim();
            r.nombre = find('nombre', 'name', 'producto') || '';
            r.categoria = find('categoria', 'category') || '';
            r.stock = parseInt(find('stock', 'cantidad') || 0, 10) || 0;


            // 🔹 PRECIO DE VENTA
            const rawPrecioVenta = find(
              'precio',
              'price',
              'preciov',
              'precio v',
              'precio venta',
              'precio_venta',
              'pventa',
              'p.venta',
              'venta',
              'importe'
            );

            r.precio = parsePrecioSeguro(rawPrecioVenta);

            // 🔹 PRECIO DE COSTO
            const rawPrecioCosto = find(
              'costo',
              'cost',
              'precio costo',
              'precio_costo',
              'pcosto',
              'p.costo',
              'compra',
              'precio compra'
            );

            r.precio_costo = parsePrecioSeguro(rawPrecioCosto);


            return r;
          });
          const toInsert = normalized.filter(r => r.nombre || r.codigo);
          if (toInsert.length === 0) {
            alert('No se detectaron filas válidas.');
            return;
          }


          // 🔹 Mostrar modal de opciones de importación
          const modal = document.getElementById('modalImportOptions');
          modal.style.display = 'block';

          // Confirmar importación
          document.getElementById('confirmImportExcel').onclick = async () => {
            const opciones = {
              stock: document.getElementById('optStock').checked,
              precioVenta: document.getElementById('optPrecioVenta').checked,
              precioCosto: document.getElementById('optPrecioCosto').checked
            };

            modal.style.display = 'none';

            const res = await window.electronAPI.addProductsBulk(toInsert, opciones);

            if (res && res.success) {
              await loadProducts();
              alert(`Se importaron ${toInsert.length} filas.`);
            } else {
              alert('Error importando Excel.');
            }
          };

          // Cancelar importación
          document.getElementById('cancelImportExcel').onclick = () => {
            modal.style.display = 'none';
          };


        } catch (err) {
          console.error('Error import Excel:', err);
          alert('Error importando Excel (ver consola).');
          restaurarFoco(); 
        } finally {
          btnImportExcel.__processing = false;
        }
      });
    }


    /* ===== EXPORTAR EXCEL ===== */
    if (btnExportExcel && !btnExportExcel.__excelBound) {
      btnExportExcel.__excelBound = true;
      btnExportExcel.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Prevent multiple clicks
        if (btnExportExcel.__processing) {
          return;
        }
        btnExportExcel.__processing = true;
        
        try {
          const res = await window.electronAPI.exportExcel();
          if (res?.success) {
            alert('Excel exportado correctamente');
          } else {
            alert(res?.error || 'Error al exportar el Excel');
          }
        } catch (err) {
          console.error('Error exportando Excel:', err);
          alert('Error al exportar (ver consola)');
          restaurarFoco(); 
        } finally {
          btnExportExcel.__processing = false;
        }
      });
    }

    /* ===== ACTUALIZAR PRECIOS ===== */

    const percentInput = document.getElementById('percentInput');
    const categorySelect = document.getElementById('categorySelect');
    const currentPriceEl = document.getElementById('currentPrice');
    const newPriceEl = document.getElementById('newPrice');

    const updatePricePreview = () => {
      const percent = parseFloat(percentInput?.value) || 0;
      const priceType = document.querySelector('input[name="priceType"]:checked')?.value || 'venta';
      const category = categorySelect?.value || '';

      let productosFiltrados = [...productos];

      if (category && category !== '' && category !== '__all__') {
        productosFiltrados = productosFiltrados.filter(p => p.categoria === category);
      }

      if (productosFiltrados.length > 0 && currentPriceEl && newPriceEl) {
        const ejemplo = productosFiltrados[0];
        const precioActual = priceType === 'venta' ? (Number(ejemplo.precio) || 0) : (Number(ejemplo.precio_costo) || 0);
        const precioNuevo = precioActual * (1 + percent / 100);

        currentPriceEl.textContent = `$${precioActual.toFixed(2)}`;
        newPriceEl.textContent = `$${precioNuevo.toFixed(2)}`;
        
        // Debug para verificar qué producto se está mostrando
        console.log('DEBUG: Categoría seleccionada:', category);
        console.log('DEBUG: Productos filtrados:', productosFiltrados.length);
        console.log('DEBUG: Producto ejemplo:', ejemplo.nombre, 'Precio actual:', precioActual);
      } else {
        if (currentPriceEl) currentPriceEl.textContent = '$0.00';
        if (newPriceEl) newPriceEl.textContent = '$0.00';
        
        console.log('DEBUG: No hay productos para la categoría:', category);
      }
    };

    if (percentInput) {
      percentInput.addEventListener('input', updatePricePreview);
      document.querySelectorAll('input[name="priceType"]').forEach(radio => radio.addEventListener('change', updatePricePreview));
      if (categorySelect) categorySelect.addEventListener('change', updatePricePreview);
    }

    if (btnUpdatePrices) {
      btnUpdatePrices.addEventListener('click', async () => {
        if (percentInput) {
          percentInput.value = '';
          updatePricePreview();
        }
        await loadCategoriesAndPopulate();
        if (modalUpdate) modalUpdate.classList.add('active');
      });
    }
    document.querySelectorAll('#cancelUpdatePrices, #cancelUpdatePricesBtn').forEach(btn => {
      btn.addEventListener('click', () => { if (modalUpdate) modalUpdate.classList.remove('active'); });
    });

    const triggerPreview = () => { if (percentInput) percentInput.dispatchEvent(new Event('input')); };
    if (btnPlus1 && percentInput) btnPlus1.addEventListener('click', () => { percentInput.value = (parseFloat(percentInput.value) || 0) + 1; triggerPreview(); });
    if (btnMinus1 && percentInput) btnMinus1.addEventListener('click', () => { percentInput.value = (parseFloat(percentInput.value) || 0) - 1; triggerPreview(); });
    if (btnPlus10 && percentInput) btnPlus10.addEventListener('click', () => { percentInput.value = (parseFloat(percentInput.value) || 0) + 10; triggerPreview(); });
    console.log('DEBUG: Buscando botón btnApplyUpdate...');
    console.log('DEBUG: btnApplyUpdate encontrado:', btnApplyUpdate);
    if (btnApplyUpdate) {
      btnApplyUpdate.addEventListener('click', async (e) => {
        console.log('DEBUG: Botón Aplicar clickeado');
        e.preventDefault();
        e.stopPropagation();

        const percent = parseFloat(percentInput.value);
        console.log('DEBUG: Porcentaje:', percent);
        if (isNaN(percent)) { alert('Porcentaje inválido'); return; }

        const category = categorySelect.value;
        const priceType = document.querySelector('input[name="priceType"]:checked')?.value || 'venta';
        console.log('DEBUG: Categoría:', category, 'Tipo:', priceType);

        try {
          console.log('DEBUG: Enviando petición a backend...');
          const res = await window.electronAPI.updatePricesAdvanced({
            percent,
            category,
            priceType
          });

          console.log('DEBUG: Respuesta del backend:', res);

          if (res && res.success) {
            console.log('DEBUG: Precios actualizados exitosamente');
            await loadProducts();
            if (modalUpdate) modalUpdate.classList.remove('active');

            const priceTypeName = priceType === 'venta' ? 'precios de venta' : 'precios de costo';
            alert(`${priceTypeName.charAt(0).toUpperCase() + priceTypeName.slice(1)} actualizados correctamente.`);
          } else {
            console.error('DEBUG: Error en respuesta del backend:', res);
            alert('No se pudieron actualizar los precios.');
          }
        } catch (err) {
          console.error('DEBUG: Error en petición:', err);
          alert('Error actualizando precios (ver consola).');
          restaurarFoco(); // <- AGREGAR
        }
      });
    }

    /* ===== CATEGORÍAS ===== */
    if (btnNewCategory) {
      btnNewCategory.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Limpiar input
        document.getElementById('newCategoryName').value = '';

        // Cargar lista de categorías
        await renderCategoryList();

        // Obtener referencia al modal
        const modalCategorias = document.getElementById('modalCategorias');

        if (modalCategorias) {
          // Mostrar modal usando clases para mantener flex y centrado
          modalCategorias.classList.add('active');

          // Enfocar el input
          setTimeout(() => {
            document.getElementById('newCategoryName').focus();
          }, 100);
        }
      });
    }
    if (btnSaveCategory) {
      btnSaveCategory.addEventListener('click', async () => {
        const name = document.getElementById('newCategoryName').value.trim();
        if (!name) return alert('Ingrese un nombre');
        try {
          const res = await window.electronAPI.addCategory(name);
          if (res && res.success) {
            document.getElementById('newCategoryName').value = '';
            await renderCategoryList();
            await loadCategoriesAndPopulate();
          } else {
            alert('Error agregando categoría: ' + (res.error || ''));
          }
        } catch (err) {
          console.error('Error add-category:', err);
          alert('Error agregando categoría (ver consola).');
          restaurarFoco(); // ← AGREGAR
        }
      });
    }
    if (btnCloseCategories) {
      // Registrar el click en todos los botones de cerrar categorías
      document.querySelectorAll('#btnCloseCategories').forEach(btn => {
        btn.addEventListener('click', () => {
          const modal = document.getElementById('modalCategorias');
          if (modal) modal.classList.remove('active');
        });
      });
    }

    async function renderCategoryList() {
      try {
        const cats = await window.electronAPI.getCategories();
        categoryList.innerHTML = '';

        // Actualizar contador
        const countEl = document.getElementById('categoryCount');
        if (countEl) countEl.textContent = (cats || []).length;

        (cats || []).forEach(c => {
          const li = document.createElement('li');
          li.className = 'catmodal-item';

          // Info de la categoría
          const info = document.createElement('div');
          info.className = 'catmodal-item-info';
          info.innerHTML = `<i class="fas fa-tag"></i><span>${c.nombre}</span>`;

          // Botón eliminar
          const delBtn = document.createElement('button');
          delBtn.className = 'catmodal-btn-delete';
          delBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
          delBtn.title = `Eliminar "${c.nombre}"`;
          delBtn.addEventListener('click', async () => {
            if (!confirm(`¿Eliminar categoría "${c.nombre}"?`)) return;
            try {
              const res = await window.electronAPI.deleteCategory(c.id);
              if (res && res.success) {
                await renderCategoryList();
                await loadCategoriesAndPopulate();
              } else {
                alert('Error eliminando categoría');
              }
            } catch (err) {
              console.error('Error delete-category:', err);
              alert('Error eliminando categoría (ver consola).');
              restaurarFoco(); 
            }
          });

          li.appendChild(info);
          li.appendChild(delBtn);
          categoryList.appendChild(li);
        });
      } catch (err) {
        console.error('Error renderCategoryList:', err);
        restaurarFoco(); // ← AGREGAR
      }
    }

    /* ===== AGREGAR / EDITAR PRODUCTO ===== */
    if (btnAddProduct) {
      btnAddProduct.addEventListener('click', openAddModal);
    }
    async function openAddModal() {
      editingId = null;
      modalProductTitle.textContent = 'Agregar Producto';
      btnSave.textContent = 'Guardar';
      document.getElementById('addCodigo').value = '';
      document.getElementById('addNombre').value = '';
      document.getElementById('addStock').value = '';
      document.getElementById('addPrecio').value = '';
      document.getElementById('addPrecioCosto').value = '';
      const selectAddProveedor = document.getElementById('addProveedor');
      if (selectAddProveedor) selectAddProveedor.value = '';
      await loadCategoriesAndPopulate();
      await loadSuppliersAndPopulate();
      if (modalAdd) modalAdd.classList.add('active');
    }
    if (btnCancel) btnCancel.addEventListener('click', () => { if (modalAdd) modalAdd.classList.remove('active'); editingId = null; btnSave.textContent = 'Guardar'; });

    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        try {
          const codigo = document.getElementById('addCodigo').value.trim();
          const nombre = document.getElementById('addNombre').value.trim();
          const categoria = document.getElementById('addCategoria').value.trim();
          const stock = parseFloat(document.getElementById('addStock').value) || 0;
          const precio = parseFloat(document.getElementById('addPrecio').value) || 0;
          const precio_costo = parseFloat(document.getElementById('addPrecioCosto').value) || 0;
          const unidad = document.getElementById('addUnidad').value || 'un';
          const selectAddProveedor = document.getElementById('addProveedor');
          const proveedor_id = (selectAddProveedor && selectAddProveedor.value) ? Number(selectAddProveedor.value) : null;
          const unidadSelect = document.getElementById('addUnidad');
          const labelPrecio = document.getElementById('labelPrecio');

          if (unidadSelect && labelPrecio) {
            unidadSelect.addEventListener('change', () => {
              const val = unidadSelect.value;
              if (val === 'kg') labelPrecio.textContent = 'Precio (por kilogramo):';
              else if (val === 'm') labelPrecio.textContent = 'Precio (por metro):';
              else labelPrecio.textContent = 'Precio (por unidad):';
            });
          }


          if (!codigo || !nombre) { alert('Código y nombre son obligatorios'); return; }

          if (editingId) {
            const res = await window.electronAPI.updateProduct({
              id: editingId, codigo, nombre, categoria, stock, precio, precio_costo, unidad, proveedor_id
            });



            if (res && res.success) {
              await loadProducts();
              if (modalAdd) modalAdd.classList.remove('active');
              editingId = null;
              btnSave.textContent = 'Guardar';
            } else alert('Error actualizando producto.');
          } else {
            const res = await window.electronAPI.addProduct({
              codigo, nombre, categoria, stock, precio, precio_costo, unidad, proveedor_id
            });


            if (res && res.success) {
              await loadProducts();
              if (modalAdd) modalAdd.classList.remove('active');
            } else alert('Error guardando producto.');
          }
        } catch (err) {
          console.error('Error guardando producto:', err);
          alert('Error guardando producto (ver consola).');
          restaurarFoco(); // ← AGREGAR
        }
      });
    }

    // Filtros de stock (botones dentro del HTML)
    document.querySelectorAll('.btnFilterStock').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        activeFilter = { type: 'stock', value: type };
        renderTable();
      });
    });

    // Botón refrescar → reinicia completamente la vista del inventario
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        const content = document.getElementById('content');
        if (content) {
          // 🔴 Resetear la bandera antes de reiniciar
          window.__inventarioInicializado = false;

          // Reemplaza el contenido por el HTML original del inventario
          content.innerHTML = `
        ${pages.inventario}
      `;
          // Reejecuta initInventario() para reconstruir eventos y estado
          initInventario();
        }
      });
    }


    // Cerrar modales con clic afuera
    if (!window.__stockModalGlobalBound) {
      window.addEventListener('click', (e) => {
        if (e.target && e.target.classList && e.target.classList.contains('modal')) {
          e.target.classList.remove('active');
        }
      });
      window.__stockModalGlobalBound = true;
    }

    // Carga inicial con debugging
    try {
      console.log('🔍 DEBUG: Inicializando sección de inventario...');
      console.log('🔍 DEBUG: Verificando elementos DOM...');

      // Verificar elementos críticos
      const criticalElements = {
        inventoryBody: document.getElementById('inventoryBody'),
        btnFilters: document.getElementById('btnFilters'),
        filtersPanel: document.getElementById('filtersPanel'),
        searchInput: document.getElementById('searchInput'),
        clearFiltersBtn: document.getElementById('clearFilters'),
        applyFilters: document.getElementById('applyFilters')
      };

      for (const [key, element] of Object.entries(criticalElements)) {
        if (!element) {
          console.error(`🚨 ERROR CRÍTICO: Elemento ${key} no encontrado`);
        } else {
          console.log(`✅ Elemento ${key} encontrado:`, element);
        }
      }

      loadProducts();

      // ===== INICIALIZACIÓN MODO TECLADO (FASE 1) =====
      setupKeyboardMode();

      function setupKeyboardMode() {
        const btnToggle = document.getElementById('btnKeyboardModeToggle');
        const btnUp = document.getElementById('btnKeyboardModeUp');
        const btnDown = document.getElementById('btnKeyboardModeDown');
        
        if (!btnToggle || !btnUp || !btnDown) {
          console.warn('Modo Teclado: Botones flotantes no encontrados en el DOM.');
          return;
        }

        if (window.keyboardModeActive === undefined) {
          window.keyboardModeActive = false;
        }

        const getVisibleRows = () => Array.from(document.querySelectorAll('#inventoryBody tr'));

        const clearSelection = () => {
          const rows = getVisibleRows();
          rows.forEach(r => r.classList.remove('keyboard-selected'));
          window.keyboardSelectedRowIndex = -1;
          window.keyboardSelectedProductId = null;
        };

        const selectRow = (index) => {
          const rows = getVisibleRows();
          if (rows.length === 0) return;

          clearSelection();

          if (index < 0) index = 0;
          if (index >= rows.length) index = rows.length - 1;

          rows[index].classList.add('keyboard-selected');
          window.keyboardSelectedRowIndex = index;
          window.keyboardSelectedProductId = rows[index].dataset.id;

          // Auto-scroll para mantener visible la fila seleccionada
          rows[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        };

        const updateToggleVisualState = () => {
          if (window.keyboardModeActive) {
            btnToggle.classList.add('active');
            btnToggle.style.backgroundColor = '#10b981';
            btnToggle.style.color = '#ffffff';
            btnToggle.style.borderColor = '#10b981';

            if (window.keyboardSelectedRowIndex === undefined || window.keyboardSelectedRowIndex === -1) {
              selectRow(0);
            }
          } else {
            btnToggle.classList.remove('active');
            btnToggle.style.backgroundColor = '';
            btnToggle.style.color = '';
            btnToggle.style.borderColor = '';
            clearSelection();
          }
        };

        updateToggleVisualState();

        btnToggle.addEventListener('click', (e) => {
          e.preventDefault();
          window.keyboardModeActive = !window.keyboardModeActive;
          updateToggleVisualState();
          console.log(`Modo Teclado: ${window.keyboardModeActive ? 'ACTIVADO' : 'DESACTIVADO'}`);
        });

        const moveSelection = (direction) => {
          const rows = getVisibleRows();
          if (rows.length === 0) return;

          let index = window.keyboardSelectedRowIndex;
          if (index === undefined || index === -1) {
            index = 0;
          } else {
            if (direction === 'up') {
              index = Math.max(0, index - 1);
            } else if (direction === 'down') {
              index = Math.min(rows.length - 1, index + 1);
            }
          }
          selectRow(index);
        };

        btnUp.addEventListener('click', (e) => {
          e.preventDefault();
          if (window.keyboardModeActive) {
            moveSelection('up');
          }
        });

        btnDown.addEventListener('click', (e) => {
          e.preventDefault();
          if (window.keyboardModeActive) {
            moveSelection('down');
          }
        });

        if (window.__keyboardModeKeydownHandler) {
          document.removeEventListener('keydown', window.__keyboardModeKeydownHandler);
        }

        window.__keyboardModeKeydownHandler = (e) => {
          if (!window.keyboardModeActive) return;

          const content = document.getElementById('content');
          if (!content || content.dataset.currentPage !== 'inventario') {
            return;
          }

          const activeEl = document.activeElement;
          if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
            return;
          }

          const modalOpen = Array.from(document.querySelectorAll('.modal')).some(m => 
            m.style.display === 'flex' || m.style.display === 'block' || m.classList.contains('active')
          );
          if (modalOpen) {
            return;
          }

          if (e.key === 'ArrowUp') {
            e.preventDefault();
            moveSelection('up');
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            moveSelection('down');
          }
        };

        document.addEventListener('keydown', window.__keyboardModeKeydownHandler);

        const observer = new MutationObserver(() => {
          if (window.keyboardModeActive) {
            const rows = getVisibleRows();
            if (rows.length > 0) {
              let foundIndex = rows.findIndex(r => String(r.dataset.id) === String(window.keyboardSelectedProductId));
              if (foundIndex !== -1) {
                selectRow(foundIndex);
              } else {
                selectRow(0);
              }
            } else {
              clearSelection();
            }
          }
        });
        const tbody = document.getElementById('inventoryBody');
        if (tbody) {
          observer.observe(tbody, { childList: true });
        }
      }
    } catch (error) {
      console.error('🚨 ERROR CRÍTICO en inicialización de inventario:', error);
      alert('Error crítico al inicializar inventario. Recargue la página.');
    }
  } // end initInventario

});

// 🔧 Fix de botón de imprimir presupuesto


function mostrarVentaConfirmada(metodo, total) {
  const modal = document.getElementById('modalVentaConfirmada');
  const mensaje = document.getElementById('mensajeVenta');
  const btnCerrar = document.getElementById('btnCerrarVenta');

  mensaje.textContent = `Venta realizada con ${metodo}. Total: $${total.toFixed(2)}`;

  modal.classList.add('active');

  btnCerrar.onclick = () => {
    modal.classList.remove('active');
    if (typeof window.restaurarFoco === 'function') window.restaurarFoco();
  };
}


// Actualizar contadores de stock
async function updateStockCounts() {
  const productos = await window.electronAPI.getProducts();
  const lowStock = productos.filter(p => p.stock < 10).length;
  const highStock = productos.filter(p => p.stock >= 10).length;

  const lowCount = document.getElementById('lowStockCount');
  const highCount = document.getElementById('highStockCount');

  if (lowCount) lowCount.textContent = lowStock;
  if (highCount) highCount.textContent = highStock;
}

// Aplicar filtros
document.getElementById('applyFilters')?.addEventListener('click', () => {
  // Aquí tu lógica para aplicar los filtros
  document.getElementById('filtersPanel').classList.remove('active');
  document.body.style.overflow = '';
});

// =====================================================================
// MÓDULO MÁQUINAS
// =====================================================================
function initMaquinas() {
  let allMaquinas = [];
  let allTrabajos = [];
  let allCombustible = [];
  let allMantenimiento = [];
  let sortCol = 'nombre', sortDir = 'asc';
  let maqChartIngresos = null, maqChartHoras = null;

  // ── Helpers ──────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const fmt = (v) => v || '—';
  const fmtFecha = (f) => {
    if (!f) return '—';
    const parts = f.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return f;
  };
  const fmtPeso = (n) => {
    const v = parseFloat(n) || 0;
    return `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const fmtHoras = (h) => `${(parseFloat(h) || 0).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h`;

  const toast = (msg, type = 'success') => {
    const el = $('maq-toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `show ${type}`;
    setTimeout(() => el.classList.remove('show'), 3200);
  };

  const estadoBadge = (estado) => {
    const map = {
      'Disponible': 'disponible',
      'En uso': 'enuso',
      'En mantenimiento': 'mantenimiento',
      'Fuera de servicio': 'fueraservicio',
      'Realizado': 'realizado',
      'Pendiente': 'pendiente'
    };
    const cls = map[estado] || 'disponible';
    return `<span class="maq-badge ${cls}">${estado}</span>`;
  };

  const todayISO = () => new Date().toISOString().split('T')[0];

  // ── Tabs ──────────────────────────────────────────────────────────
  const tabBtns = document.querySelectorAll('.maquinas-tab-btn');
  const tabSections = document.querySelectorAll('.maquinas-tab-section');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabSections.forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const sec = $('maq-tab-' + btn.dataset.tab);
      if (sec) sec.classList.add('active');

      if (btn.dataset.tab === 'trabajos') { cargarTrabajos(); populateMaqSelect('trabMaquinaId'); }
      if (btn.dataset.tab === 'combustible') { cargarCombustible(); populateMaqSelect('combMaquinaId'); }
      if (btn.dataset.tab === 'mantenimiento') { cargarMantenimiento(); populateMaqSelect('mantMaquinaId'); }
      if (btn.dataset.tab === 'estadisticas') renderEstadisticas();
      if (btn.dataset.tab === 'rentabilidad') renderRentabilidad();
    });
  });

  // ── Populate Máquina Selects ──────────────────────────────────────
  function populateMaqSelect(selectId) {
    const sel = $(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">Seleccionar máquina...</option>' +
      allMaquinas.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('');
  }

  // ── CRUD: Máquinas ────────────────────────────────────────────────
  async function cargarMaquinas() {
    try { allMaquinas = await window.electronAPI.maqGetAll(); }
    catch (e) { allMaquinas = []; }
    renderMaquinas();
  }

  function renderMaquinas(lista) {
    const tbody = $('maqTableBody');
    if (!tbody) return;
    let src = lista || allMaquinas;

    // Filtro búsqueda
    const q = ($('maqSearchInput')?.value || '').toLowerCase();
    const est = ($('maqFilterEstado')?.value || '');
    if (q) src = src.filter(m =>
      (m.nombre||'').toLowerCase().includes(q) ||
      (m.tipo||'').toLowerCase().includes(q) ||
      (m.marca||'').toLowerCase().includes(q)
    );
    if (est) src = src.filter(m => m.estado === est);

    // Ordenamiento
    src = [...src].sort((a, b) => {
      let av = a[sortCol] ?? '', bv = b[sortCol] ?? '';
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv), 'es')
        : String(bv).localeCompare(String(av), 'es');
    });

    if (!src.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="maq-empty"><i class="fas fa-cogs"></i><p>No hay máquinas registradas</p></td></tr>`;
      return;
    }

    tbody.innerHTML = src.map(m => `
      <tr>
        <td><span class="maq-id">#${m.id}</span></td>
        <td><span class="maq-name">${fmt(m.nombre)}</span></td>
        <td>${fmt(m.tipo)}</td>
        <td>${fmt(m.marca)}</td>
        <td>${fmt(m.modelo)}</td>
        <td>${estadoBadge(m.estado)}</td>
        <td>${fmtHoras(m.horas_totales)}</td>
        <td>${fmtPeso(m.precio_hora)}</td>
        <td>${fmtFecha(m.ultimo_servicio)}</td>
        <td>
          <div class="maq-actions">
            <button class="maq-btn-action view" title="Ver detalle" data-action="view" data-id="${m.id}"><i class="fas fa-eye"></i></button>
            <button class="maq-btn-action edit" title="Editar" data-action="edit" data-id="${m.id}"><i class="fas fa-pen"></i></button>
            <button class="maq-btn-action delete" title="Eliminar" data-action="delete" data-id="${m.id}"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        if (btn.dataset.action === 'view') window.__maqVer(id);
        if (btn.dataset.action === 'edit') window.__maqEditar(id);
        if (btn.dataset.action === 'delete') window.__maqEliminar(id);
      });
    });
  }

  // Sorting headers
  document.querySelectorAll('.maquinas-table thead th[data-sort]').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      else { sortCol = col; sortDir = 'asc'; }
      renderMaquinas();
    });
  });

  // Búsqueda y filtro en tiempo real
  $('maqSearchInput')?.addEventListener('input', () => renderMaquinas());
  $('maqFilterEstado')?.addEventListener('change', () => renderMaquinas());

  // ── Modal agregar/editar ──────────────────────────────────────────
  function abrirFormModal(maq = null) {
    const overlay = $('maqFormOverlay');
    if (!overlay) return;
    $('maqFormTitle').textContent = maq ? 'Editar Máquina' : 'Agregar Máquina';
    $('fId').value = maq?.id || '';
    $('fNombre').value = maq?.nombre || '';
    $('fTipo').value = maq?.tipo || '';
    $('fMarca').value = maq?.marca || '';
    $('fModelo').value = maq?.modelo || '';
    $('fAnio').value = maq?.anio || '';
    $('fSerie').value = maq?.numero_serie || '';
    $('fPrecioHora').value = maq?.precio_hora || '';
    $('fConsumoHora').value = maq?.consumo_hora || '';
    $('fEstado').value = maq?.estado || 'Disponible';
    $('fUltimoServicio').value = maq?.ultimo_servicio || '';
    $('fObservaciones').value = maq?.observaciones || '';
    overlay.classList.add('active');
  }

  function cerrarFormModal() {
    $('maqFormOverlay')?.classList.remove('active');
  }

  $('maqBtnAgregar')?.addEventListener('click', () => abrirFormModal());
  $('maqFormClose')?.addEventListener('click', cerrarFormModal);
  $('maqFormCancel')?.addEventListener('click', cerrarFormModal);
  $('maqFormOverlay')?.addEventListener('click', (e) => {
    if (e.target === $('maqFormOverlay')) cerrarFormModal();
  });

  $('maqFormSave')?.addEventListener('click', async () => {
    const nombre = $('fNombre')?.value?.trim();
    if (!nombre) { toast('El nombre es obligatorio', 'error'); return; }

    const data = {
      id: $('fId')?.value ? parseInt($('fId').value) : null,
      nombre,
      tipo: $('fTipo')?.value?.trim(),
      marca: $('fMarca')?.value?.trim(),
      modelo: $('fModelo')?.value?.trim(),
      anio: $('fAnio')?.value ? parseInt($('fAnio').value) : null,
      numero_serie: $('fSerie')?.value?.trim(),
      precio_hora: parseFloat($('fPrecioHora')?.value) || 0,
      consumo_hora: parseFloat($('fConsumoHora')?.value) || 0,
      estado: $('fEstado')?.value || 'Disponible',
      ultimo_servicio: $('fUltimoServicio')?.value || null,
      observaciones: $('fObservaciones')?.value?.trim(),
    };

    try {
      let res;
      if (data.id) {
        res = await window.electronAPI.maqUpdate(data);
        if (res?.success) toast('Máquina actualizada correctamente', 'success');
      } else {
        res = await window.electronAPI.maqAdd(data);
        if (res?.success) toast('Máquina agregada correctamente', 'success');
      }
      if (res?.success) {
        cerrarFormModal();
        await cargarMaquinas();
      } else {
        toast(res?.error || 'Error al guardar', 'error');
      }
    } catch (e) {
      toast('Error al guardar la máquina', 'error');
    }
  });

  // Funciones globales para acciones en tabla
  window.__maqVer = async (id) => {
    const maq = allMaquinas.find(m => m.id === id);
    if (!maq) return;
    const overlay = $('maqDetailOverlay');
    if (!overlay) return;

    $('maqDetailNombre').textContent = maq.nombre;
    $('maqDetailSubtitle').textContent = `${maq.tipo || '—'} • ${maq.marca || '—'} ${maq.modelo || ''}`;

    $('maqDetailInfo').innerHTML = [
      ['Tipo', fmt(maq.tipo)],
      ['Marca', fmt(maq.marca)],
      ['Modelo', fmt(maq.modelo)],
      ['Año', maq.anio || '—'],
      ['N° Serie', fmt(maq.numero_serie)],
      ['Estado', estadoBadge(maq.estado)],
      ['Horas totales', fmtHoras(maq.horas_totales)],
      ['$ / Hora', fmtPeso(maq.precio_hora)],
      ['Consumo L/h', `${maq.consumo_hora || 0} L/h`],
      ['Último servicio', fmtFecha(maq.ultimo_servicio)],
    ].map(([lbl, val]) => `
      <div class="maq-detail-info-item">
        <label>${lbl}</label>
        <span>${val}</span>
      </div>
    `).join('');

    // Últimos trabajos
    try {
      const trabajos = await window.electronAPI.maqGetTrabajos(id);
      const ultimos = trabajos.slice(0, 5);
      $('maqDetailTrabajos').innerHTML = `
        <h4><i class="fas fa-clock"></i> Últimos trabajos</h4>
        ${ultimos.length ? `
          <table class="maquinas-table" style="font-size:13px">
            <thead><tr><th>Fecha</th><th>Cliente</th><th>Horas</th><th>Total</th></tr></thead>
            <tbody>
              ${ultimos.map(t => `
                <tr>
                  <td>${fmtFecha(t.fecha)}</td>
                  <td>${fmt(t.cliente)}</td>
                  <td>${fmtHoras(t.horas)}</td>
                  <td>${fmtPeso(t.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p style="color:#94a3b8;font-size:13px">Sin trabajos registrados</p>'}
      `;
    } catch (e) {}

    overlay.classList.add('active');
  };

  $('maqDetailClose')?.addEventListener('click', () => $('maqDetailOverlay')?.classList.remove('active'));
  $('maqDetailOverlay')?.addEventListener('click', (e) => {
    if (e.target === $('maqDetailOverlay')) $('maqDetailOverlay').classList.remove('active');
  });

  window.__maqEditar = async (id) => {
    const maq = allMaquinas.find(m => m.id === id);
    if (maq) abrirFormModal(maq);
  };

  window.__maqEliminar = async (id) => {
    const maq = allMaquinas.find(m => m.id === id);
    if (!maq) return;
    if (!confirm(`¿Eliminar la máquina "${maq.nombre}" y todos sus registros? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await window.electronAPI.maqDelete(id);
      if (res?.success) {
        toast('Máquina eliminada', 'success');
        await cargarMaquinas();
      } else {
        toast('Error al eliminar', 'error');
      }
    } catch (e) { toast('Error al eliminar', 'error'); }
  };

  // ── TRABAJOS ─────────────────────────────────────────────────────
  async function cargarTrabajos() {
    try { allTrabajos = await window.electronAPI.maqGetTrabajos(); }
    catch (e) { allTrabajos = []; }
    renderTrabajos();
  }

  function renderTrabajos() {
    const tbody = $('trabTableBody');
    if (!tbody) return;
    if (!allTrabajos.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="maq-empty"><i class="fas fa-clock"></i><p>Sin trabajos registrados</p></td></tr>`;
      return;
    }
    tbody.innerHTML = allTrabajos.map(t => `
      <tr>
        <td>${fmtFecha(t.fecha)}</td>
        <td><strong>${fmt(t.maquina_nombre)}</strong></td>
        <td>${fmt(t.cliente)}</td>
        <td>${fmt(t.operador)}</td>
        <td>${t.hora_inicio || '—'}</td>
        <td>${t.hora_fin || '—'}</td>
        <td><strong>${fmtHoras(t.horas)}</strong></td>
        <td>${fmtPeso(t.precio_hora)}</td>
        <td><strong style="color:#10b981">${fmtPeso(t.total)}</strong></td>
        <td>
          <button class="maq-btn-action delete" onclick="window.__maqDelTrabajo(${t.id})"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
  }

  // Cálculo automático del total
  const calcTotal = () => {
    const horas = parseFloat($('trabHoras')?.value) || 0;
    const ph = parseFloat($('trabPrecioHora')?.value) || 0;
    const total = horas * ph;
    if ($('trabTotal')) $('trabTotal').value = total > 0 ? fmtPeso(total) : '';
  };
  $('trabHoras')?.addEventListener('input', calcTotal);
  $('trabPrecioHora')?.addEventListener('input', calcTotal);

  // Cálculo automático del trabajo desde horas de inicio/fin
  const calcHorasFromTime = () => {
    const ini = $('trabHoraInicio')?.value;
    const fin = $('trabHoraFin')?.value;
    if (ini && fin) {
      const [h1, m1] = ini.split(':').map(Number);
      const [h2, m2] = fin.split(':').map(Number);
      let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (mins < 0) mins += 24 * 60;
      const horas = (mins / 60).toFixed(2);
      if ($('trabHoras')) $('trabHoras').value = horas;
      calcTotal();
    }
  };
  $('trabHoraInicio')?.addEventListener('change', calcHorasFromTime);
  $('trabHoraFin')?.addEventListener('change', calcHorasFromTime);

  // Cargar precio por hora de la máquina seleccionada
  $('trabMaquinaId')?.addEventListener('change', () => {
    const maqId = parseInt($('trabMaquinaId').value);
    const maq = allMaquinas.find(m => m.id === maqId);
    if (maq && maq.precio_hora && $('trabPrecioHora')) {
      $('trabPrecioHora').value = maq.precio_hora;
      calcTotal();
    }
  });

  // Set fecha por defecto
  if ($('trabFecha')) $('trabFecha').value = todayISO();

  $('maqBtnGuardarTrabajo')?.addEventListener('click', async () => {
    const maquina_id = parseInt($('trabMaquinaId')?.value);
    const fecha = $('trabFecha')?.value;
    const horas = parseFloat($('trabHoras')?.value) || 0;
    if (!maquina_id) { toast('Seleccioná una máquina', 'error'); return; }
    if (!fecha) { toast('La fecha es obligatoria', 'error'); return; }
    if (horas <= 0) { toast('Las horas deben ser mayor a 0', 'error'); return; }

    const precio_hora = parseFloat($('trabPrecioHora')?.value) || 0;
    const data = {
      maquina_id, fecha,
      cliente: $('trabCliente')?.value?.trim(),
      operador: $('trabOperador')?.value?.trim(),
      hora_inicio: $('trabHoraInicio')?.value,
      hora_fin: $('trabHoraFin')?.value,
      horas, precio_hora,
      total: horas * precio_hora,
      observaciones: $('trabObservaciones')?.value?.trim(),
    };

    try {
      const res = await window.electronAPI.maqAddTrabajo(data);
      if (res?.success) {
        toast('Trabajo registrado correctamente', 'success');
        // Reset form
        ['trabCliente','trabOperador','trabHoraInicio','trabHoraFin','trabHoras','trabTotal','trabObservaciones']
          .forEach(id => { if ($(id)) $(id).value = ''; });
        $('trabFecha').value = todayISO();
        await cargarTrabajos();
        await cargarMaquinas(); // actualiza horas totales
      } else {
        toast(res?.error || 'Error al registrar', 'error');
      }
    } catch (e) { toast('Error al registrar trabajo', 'error'); }
  });

  window.__maqDelTrabajo = async (id) => {
    if (!confirm('¿Eliminar este trabajo?')) return;
    try {
      const res = await window.electronAPI.maqDeleteTrabajo(id);
      if (res?.success) { toast('Trabajo eliminado', 'success'); await cargarTrabajos(); await cargarMaquinas(); }
      else toast('Error al eliminar', 'error');
    } catch (e) { toast('Error', 'error'); }
  };

  // ── COMBUSTIBLE ──────────────────────────────────────────────────
  async function cargarCombustible() {
    try { allCombustible = await window.electronAPI.maqGetCombustible(); }
    catch (e) { allCombustible = []; }
    renderCombustible();
    actualizarResumenCombustible();
  }

  function actualizarResumenCombustible() {
    const totalLitros = allCombustible.reduce((s, c) => s + (parseFloat(c.litros) || 0), 0);
    const totalCosto  = allCombustible.reduce((s, c) => s + (parseFloat(c.total) || 0), 0);
    // Litros consumidos estimado = suma(horas_totales * consumo_hora) de todas las máquinas
    const litrosConsumidos = allMaquinas.reduce((s, m) =>
      s + ((parseFloat(m.horas_totales) || 0) * (parseFloat(m.consumo_hora) || 0)), 0);

    if ($('fuelLitrosCargados')) $('fuelLitrosCargados').textContent = `${totalLitros.toLocaleString('es-AR', { maximumFractionDigits: 1 })} L`;
    if ($('fuelLitrosConsumidos')) $('fuelLitrosConsumidos').textContent = `${litrosConsumidos.toLocaleString('es-AR', { maximumFractionDigits: 1 })} L`;
    if ($('fuelCostoTotal')) $('fuelCostoTotal').textContent = fmtPeso(totalCosto);
  }

  function renderCombustible() {
    const tbody = $('combTableBody');
    if (!tbody) return;
    if (!allCombustible.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="maq-empty"><i class="fas fa-gas-pump"></i><p>Sin cargas registradas</p></td></tr>`;
      return;
    }
    tbody.innerHTML = allCombustible.map(c => `
      <tr>
        <td>${fmtFecha(c.fecha)}</td>
        <td><strong>${fmt(c.maquina_nombre)}</strong></td>
        <td>${(parseFloat(c.litros)||0).toLocaleString('es-AR',{maximumFractionDigits:1})} L</td>
        <td>${fmtPeso(c.precio_litro)}</td>
        <td><strong style="color:#f97316">${fmtPeso(c.total)}</strong></td>
        <td>${fmt(c.observaciones)}</td>
        <td><button class="maq-btn-action delete" onclick="window.__maqDelComb(${c.id})"><i class="fas fa-trash"></i></button></td>
      </tr>
    `).join('');
  }

  // Cálculo automático combustible
  const calcComb = () => {
    const litros = parseFloat($('combLitros')?.value) || 0;
    const pl = parseFloat($('combPrecioLitro')?.value) || 0;
    const total = litros * pl;
    if ($('combTotal')) $('combTotal').value = total > 0 ? fmtPeso(total) : '';
  };
  $('combLitros')?.addEventListener('input', calcComb);
  $('combPrecioLitro')?.addEventListener('input', calcComb);
  if ($('combFecha')) $('combFecha').value = todayISO();

  $('maqBtnGuardarComb')?.addEventListener('click', async () => {
    const maquina_id = parseInt($('combMaquinaId')?.value);
    const fecha = $('combFecha')?.value;
    const litros = parseFloat($('combLitros')?.value) || 0;
    if (!maquina_id) { toast('Seleccioná una máquina', 'error'); return; }
    if (!fecha) { toast('La fecha es obligatoria', 'error'); return; }
    if (litros <= 0) { toast('Los litros deben ser mayor a 0', 'error'); return; }

    const precio_litro = parseFloat($('combPrecioLitro')?.value) || 0;
    const data = {
      maquina_id, fecha, litros, precio_litro,
      total: litros * precio_litro,
      observaciones: $('combObservaciones')?.value?.trim(),
    };

    try {
      const res = await window.electronAPI.maqAddCombustible(data);
      if (res?.success) {
        toast('Carga registrada correctamente', 'success');
        ['combLitros','combPrecioLitro','combTotal','combObservaciones'].forEach(id => { if ($(id)) $(id).value = ''; });
        $('combFecha').value = todayISO();
        await cargarCombustible();
      } else { toast(res?.error || 'Error', 'error'); }
    } catch (e) { toast('Error al registrar', 'error'); }
  });

  window.__maqDelComb = async (id) => {
    if (!confirm('¿Eliminar esta carga?')) return;
    try {
      const res = await window.electronAPI.maqDeleteCombustible(id);
      if (res?.success) { toast('Carga eliminada', 'success'); await cargarCombustible(); }
      else toast('Error', 'error');
    } catch (e) { toast('Error', 'error'); }
  };

  // ── MANTENIMIENTO ─────────────────────────────────────────────────
  async function cargarMantenimiento() {
    try { allMantenimiento = await window.electronAPI.maqGetMantenimiento(); }
    catch (e) { allMantenimiento = []; }
    renderMantenimiento();
  }

  function renderMantenimiento() {
    const tbody = $('mantTableBody');
    if (!tbody) return;
    if (!allMantenimiento.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="maq-empty"><i class="fas fa-wrench"></i><p>Sin mantenimientos registrados</p></td></tr>`;
      return;
    }
    tbody.innerHTML = allMantenimiento.map(mt => `
      <tr>
        <td>${fmtFecha(mt.fecha)}</td>
        <td><strong>${fmt(mt.maquina_nombre)}</strong></td>
        <td>${fmt(mt.tipo)}</td>
        <td>${fmt(mt.descripcion)}</td>
        <td><strong style="color:#ef4444">${fmtPeso(mt.costo)}</strong></td>
        <td>${fmtFecha(mt.proximo_mantenimiento)}</td>
        <td>${estadoBadge(mt.estado)}</td>
        <td><button class="maq-btn-action delete" onclick="window.__maqDelMant(${mt.id})"><i class="fas fa-trash"></i></button></td>
      </tr>
    `).join('');
  }

  if ($('mantFecha')) $('mantFecha').value = todayISO();

  $('maqBtnGuardarMant')?.addEventListener('click', async () => {
    const maquina_id = parseInt($('mantMaquinaId')?.value);
    const fecha = $('mantFecha')?.value;
    if (!maquina_id) { toast('Seleccioná una máquina', 'error'); return; }
    if (!fecha) { toast('La fecha es obligatoria', 'error'); return; }

    const data = {
      maquina_id, fecha,
      tipo: $('mantTipo')?.value || 'Preventivo',
      descripcion: $('mantDescripcion')?.value?.trim(),
      costo: parseFloat($('mantCosto')?.value) || 0,
      proximo_mantenimiento: $('mantProximo')?.value || null,
      estado: $('mantEstado')?.value || 'Realizado',
      observaciones: $('mantObservaciones')?.value?.trim(),
    };

    try {
      const res = await window.electronAPI.maqAddMantenimiento(data);
      if (res?.success) {
        toast('Mantenimiento registrado', 'success');
        ['mantCosto','mantDescripcion','mantObservaciones','mantProximo'].forEach(id => { if ($(id)) $(id).value = ''; });
        $('mantFecha').value = todayISO();
        await cargarMantenimiento();
        await cargarMaquinas();
      } else { toast(res?.error || 'Error', 'error'); }
    } catch (e) { toast('Error al registrar', 'error'); }
  });

  window.__maqDelMant = async (id) => {
    if (!confirm('¿Eliminar este mantenimiento?')) return;
    try {
      const res = await window.electronAPI.maqDeleteMantenimiento(id);
      if (res?.success) { toast('Mantenimiento eliminado', 'success'); await cargarMantenimiento(); }
      else toast('Error', 'error');
    } catch (e) { toast('Error', 'error'); }
  };

  // ── ESTADÍSTICAS ─────────────────────────────────────────────────
  async function renderEstadisticas() {
    let stats = {};
    try { stats = await window.electronAPI.maqGetStats(); } catch (e) {}

    if ($('kpiTotalMaq'))      $('kpiTotalMaq').textContent      = stats.totalMaquinas ?? '—';
    if ($('kpiDisponibles'))   $('kpiDisponibles').textContent   = stats.disponibles ?? '—';
    if ($('kpiHorasMes'))      $('kpiHorasMes').textContent      = `${(stats.horasMes || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })} h`;
    if ($('kpiIngresosMes'))   $('kpiIngresosMes').textContent   = fmtPeso(stats.ingresosMes || 0);
    if ($('kpiGastoComb'))     $('kpiGastoComb').textContent     = fmtPeso(stats.gastoComb || 0);
    if ($('kpiGastoMant'))     $('kpiGastoMant').textContent     = fmtPeso(stats.gastoMant || 0);
    if ($('kpiMasUtilizada'))  $('kpiMasUtilizada').textContent  = stats.masUtilizada?.nombre || 'Sin datos';
    if ($('kpiMasRentable'))   $('kpiMasRentable').textContent   = stats.masRentable?.nombre || 'Sin datos';

    // Gráfico ingresos por máquina
    const ctxIng = $('maqChartIngresos');
    if (ctxIng && typeof Chart !== 'undefined') {
      if (maqChartIngresos) maqChartIngresos.destroy();
      const data = stats.ingresosPorMaquina || [];
      maqChartIngresos = new Chart(ctxIng, {
        type: 'bar',
        data: {
          labels: data.map(d => d.nombre),
          datasets: [{
            label: 'Ingresos ($)',
            data: data.map(d => d.total),
            backgroundColor: [
              '#f97316','#fb923c','#fdba74','#fed7aa','#fef3c7','#fde68a'
            ],
            borderRadius: 8,
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { callback: v => `$${v.toLocaleString('es-AR')}` } }
          }
        }
      });
    }

    // Gráfico horas por mes
    const ctxHor = $('maqChartHoras');
    if (ctxHor && typeof Chart !== 'undefined') {
      if (maqChartHoras) maqChartHoras.destroy();
      const data = stats.horasPorMes || [];
      maqChartHoras = new Chart(ctxHor, {
        type: 'line',
        data: {
          labels: data.map(d => d.mes),
          datasets: [{
            label: 'Horas trabajadas',
            data: data.map(d => d.total),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#3b82f6',
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }
  }

  // ── RENTABILIDAD ──────────────────────────────────────────────────
  async function renderRentabilidad() {
    const grid = $('maqProfitGrid');
    if (!grid) return;
    grid.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

    let data = [];
    try { data = await window.electronAPI.maqGetRentabilidad(); } catch (e) {}

    if (!data.length) {
      grid.innerHTML = '<div class="maq-empty"><i class="fas fa-calculator"></i><p>Sin datos de rentabilidad</p></div>';
      return;
    }

    grid.innerHTML = data.map(r => {
      const gananciaClass = r.ganancia >= 0 ? 'net positive' : 'net negative';
      return `
        <div class="maq-profit-row">
          <div>
            <div class="maq-profit-name">${r.nombre}</div>
            <div class="maq-profit-type">${r.tipo || '—'} • ${fmtHoras(r.horas_totales)}</div>
          </div>
          <div class="maq-profit-amount income">${fmtPeso(r.ingresos)}</div>
          <div class="maq-profit-amount expense">-${fmtPeso(r.gasto_combustible)}</div>
          <div class="maq-profit-amount expense">-${fmtPeso(r.gasto_mantenimiento)}</div>
          <div class="maq-profit-amount ${gananciaClass}">${r.ganancia >= 0 ? '' : '-'}${fmtPeso(Math.abs(r.ganancia))}</div>
        </div>
      `;
    }).join('');
  }

    // ── Carga inicial ─────────────────────────────────────────────────
  cargarMaquinas();
}

function initEmpleadosLiquidacion() {
  let allEmployees = [];
  let currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-07"
  let empLiqChart = null;

  // Helpers
  const $ = id => document.getElementById(id);
  const fmtPeso = (n) => {
    const v = parseFloat(n) || 0;
    return `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const fmtHoras = (h) => `${(parseFloat(h) || 0).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h`;
  
  const getMesNombre = (mesStr) => {
    const [year, month] = mesStr.split('-');
    const nombres = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${nombres[parseInt(month) - 1]} ${year}`;
  };

  // Tabs
  const tabBtns = document.querySelectorAll('.emp-liq-tab-btn');
  const tabSections = document.querySelectorAll('.emp-liq-tab-section');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabSections.forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const sec = $('emp-liq-tab-' + btn.dataset.tab);
      if (sec) sec.classList.add('active');

      if (btn.dataset.tab === 'lista') {
        cargarEmpleados();
      } else if (btn.dataset.tab === 'estadisticas') {
        renderEstadisticas();
      }
    });
  });

  // Month navigation
  $('empLiqBtnMonthNext')?.addEventListener('click', () => {
    let [year, month] = currentMonth.split('-').map(Number);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
    currentMonth = `${year}-${String(month).padStart(2, '0')}`;
    updateMonthLabel();
    cargarEmpleados();
    if ($('emp-liq-tab-estadisticas').classList.contains('active')) {
      renderEstadisticas();
    }
  });

  $('empLiqBtnMonthPrev')?.addEventListener('click', () => {
    let [year, month] = currentMonth.split('-').map(Number);
    month--;
    if (month < 1) {
      month = 12;
      year--;
    }
    currentMonth = `${year}-${String(month).padStart(2, '0')}`;
    updateMonthLabel();
    cargarEmpleados();
    if ($('emp-liq-tab-estadisticas').classList.contains('active')) {
      renderEstadisticas();
    }
  });

  function updateMonthLabel() {
    if ($('empLiqLabelMonth')) $('empLiqLabelMonth').textContent = getMesNombre(currentMonth);
  }

  // Load and Render
  async function cargarEmpleados() {
    try {
      allEmployees = await window.electronAPI.empLiqGetEmployees(currentMonth);
    } catch (e) {
      console.error(e);
      allEmployees = [];
    }
    renderTable();
  }

  function renderTable() {
    const tbody = $('empLiqTableBody');
    if (!tbody) return;

    let src = allEmployees;

    const q = ($('empLiqSearchInput')?.value || '').toLowerCase().trim();
    if (q) {
      src = src.filter(e =>
        `${e.nombre} ${e.apellido}`.toLowerCase().includes(q) ||
        (e.cargo || '').toLowerCase().includes(q)
      );
    }

    const filterEst = $('empLiqFilterEstado')?.value || '';
    if (filterEst) {
      src = src.filter(e => e.estado === filterEst);
    }

    if (src.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="emp-liq-empty">
              <i class="fas fa-file-invoice-dollar"></i>
              <p>No se encontraron empleados</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = src.map(e => {
      const valorHora = e.valor_hora || 0;
      const horas = e.liquidacion ? e.liquidacion.horas_trabajadas : (e.horas_trabajadas || 0);
      const totalGenerado = e.liquidacion ? e.liquidacion.total_generado : (horas * valorHora);
      
      const costoSalarial = e.costo_mensual !== null 
        ? e.costo_mensual 
        : (e.liquidacion ? e.liquidacion.total_liquidacion : totalGenerado);
      
      const ganancia = totalGenerado - costoSalarial;
      const margen = totalGenerado > 0 ? (ganancia / totalGenerado) * 100 : 0;

      const badgeEst = e.estado === 'Activo' 
        ? `<span class="emp-liq-badge activo">Activo</span>` 
        : `<span class="emp-liq-badge inactivo">Inactivo</span>`;

      const liqStatus = e.liquidacion
        ? `<span class="emp-liq-badge liquidado" style="margin-left:6px;">Liquidado</span>`
        : `<span class="emp-liq-badge pendiente" style="margin-left:6px;">Pendiente</span>`;

      const ganCls = ganancia >= 0 ? 'color:#16a34a; font-weight:700;' : 'color:#ef4444; font-weight:700;';

      return `
        <tr>
          <td>
            <div class="emp-name">${e.apellido}, ${e.nombre}</div>
            <div class="emp-cargo">${e.cargo || '—'} • ${badgeEst} ${liqStatus}</div>
          </td>
          <td>${fmtPeso(valorHora)}</td>
          <td>${fmtHoras(horas)}</td>
          <td style="font-weight:600;">${fmtPeso(totalGenerado)}</td>
          <td>
            <div>${fmtPeso(costoSalarial)}</div>
            <div style="font-size:11px; color:#64748b;">${e.costo_mensual !== null ? 'Fijo' : 'Sueldo liq.'}</div>
          </td>
          <td style="${ganCls}">${fmtPeso(ganancia)}</td>
          <td style="${ganCls}">${margen.toFixed(1)}%</td>
          <td>
            <div style="display:flex; gap:8px;">
              <button class="btn-emp-liq-action config btn-config" data-id="${e.id}" title="Configurar Empleado">
                <i class="fas fa-cog"></i>
              </button>
              <button class="btn-emp-liq-action liquidar btn-liquidar" data-id="${e.id}" title="Liquidar Haberes">
                <i class="fas fa-file-invoice-dollar"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Bind item events
    tbody.querySelectorAll('.btn-config').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        openConfigModal(id);
      });
    });

    tbody.querySelectorAll('.btn-liquidar').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        openLiquidarModal(id);
      });
    });
  }

  // Modals Actions
  function openConfigModal(id) {
    const emp = allEmployees.find(e => e.id === id);
    if (!emp) return;

    $('empLiqConfigId').value = emp.id;
    $('empLiqConfigNombre').value = `${emp.apellido}, ${emp.nombre}`;
    $('empLiqConfigValorHora').value = emp.valor_hora || 0;
    $('empLiqConfigCostoMensual').value = emp.costo_mensual !== null ? emp.costo_mensual : '';
    $('empLiqConfigEstado').value = emp.estado || 'Activo';

    $('modalEmpLiqConfig').classList.add('active');
  }

  function openLiquidarModal(id) {
    const emp = allEmployees.find(e => e.id === id);
    if (!emp) return;

    $('empLiqLiquidarId').value = emp.id;
    $('empLiqLiquidarNombre').value = `${emp.apellido}, ${emp.nombre}`;
    $('labelEmpLiqModalMes').textContent = getMesNombre(currentMonth);

    if (emp.liquidacion) {
      $('empLiqLiquidarHoras').value = emp.liquidacion.horas_trabajadas;
      $('empLiqLiquidarValorHora').value = emp.liquidacion.valor_hora;
      $('empLiqLiquidarAdicionales').value = emp.liquidacion.adicionales;
      $('empLiqLiquidarDescuentos').value = emp.liquidacion.descuentos;
    } else {
      $('empLiqLiquidarHoras').value = emp.horas_trabajadas || 0;
      $('empLiqLiquidarValorHora').value = emp.valor_hora;
      $('empLiqLiquidarAdicionales').value = 0;
      $('empLiqLiquidarDescuentos').value = 0;
    }

    recalcularLiquidador();
    $('modalEmpLiqLiquidar').classList.add('active');
  }

  function recalcularLiquidador() {
    const horas = parseFloat($('empLiqLiquidarHoras').value) || 0;
    const valorHora = parseFloat($('empLiqLiquidarValorHora').value) || 0;
    const adicionales = parseFloat($('empLiqLiquidarAdicionales').value) || 0;
    const descuentos = parseFloat($('empLiqLiquidarDescuentos').value) || 0;

    const generado = horas * valorHora;
    const totalLiq = generado + adicionales - descuentos;

    $('empLiqLiquidarGenerado').value = generado.toFixed(2);
    $('empLiqLiquidarTotalLiq').value = totalLiq.toFixed(2);
  }

  // Bind calculation inputs
  $('empLiqLiquidarHoras')?.addEventListener('input', recalcularLiquidador);
  $('empLiqLiquidarValorHora')?.addEventListener('input', recalcularLiquidador);
  $('empLiqLiquidarAdicionales')?.addEventListener('input', recalcularLiquidador);
  $('empLiqLiquidarDescuentos')?.addEventListener('input', recalcularLiquidador);

  // Forms submit
  $('formEmpLiqConfig')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const config = {
      empleado_id: parseInt($('empLiqConfigId').value),
      valor_hora: parseFloat($('empLiqConfigValorHora').value) || 0,
      costo_mensual: $('empLiqConfigCostoMensual').value !== '' ? parseFloat($('empLiqConfigCostoMensual').value) : null,
      estado: $('empLiqConfigEstado').value
    };

    try {
      const res = await window.electronAPI.empLiqSaveConfig(config);
      if (res.success) {
        mostrarToast('Configuración guardada correctamente', 'success');
        $('modalEmpLiqConfig').classList.remove('active');
        cargarEmpleados();
      } else {
        mostrarToast('Error al guardar configuración: ' + res.error, 'error');
      }
    } catch (err) {
      console.error(err);
      mostrarToast('Error de comunicación', 'error');
    }
  });

  $('formEmpLiqLiquidar')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const liq = {
      empleado_id: parseInt($('empLiqLiquidarId').value),
      mes: currentMonth,
      horas_trabajadas: parseFloat($('empLiqLiquidarHoras').value) || 0,
      valor_hora: parseFloat($('empLiqLiquidarValorHora').value) || 0,
      adicionales: parseFloat($('empLiqLiquidarAdicionales').value) || 0,
      descuentos: parseFloat($('empLiqLiquidarDescuentos').value) || 0,
      total_generado: parseFloat($('empLiqLiquidarGenerado').value) || 0,
      total_liquidacion: parseFloat($('empLiqLiquidarTotalLiq').value) || 0
    };

    try {
      const res = await window.electronAPI.empLiqSaveLiquidation(liq);
      if (res.success) {
        mostrarToast('Liquidación guardada correctamente', 'success');
        $('modalEmpLiqLiquidar').classList.remove('active');
        cargarEmpleados();
      } else {
        mostrarToast('Error al guardar liquidación: ' + res.error, 'error');
      }
    } catch (err) {
      console.error(err);
      mostrarToast('Error de comunicación', 'error');
    }
  });

  // Modal Closing events
  $('btnEmpLiqConfigClose')?.addEventListener('click', () => $('modalEmpLiqConfig').classList.remove('active'));
  $('btnEmpLiqConfigCancel')?.addEventListener('click', () => $('modalEmpLiqConfig').classList.remove('active'));
  $('btnEmpLiqLiquidarClose')?.addEventListener('click', () => $('modalEmpLiqLiquidar').classList.remove('active'));
  $('btnEmpLiqLiquidarCancel')?.addEventListener('click', () => $('modalEmpLiqLiquidar').classList.remove('active'));

  // Search & filters
  $('empLiqSearchInput')?.addEventListener('input', renderTable);
  $('empLiqFilterEstado')?.addEventListener('change', renderTable);

  // Statistics
  async function renderEstadisticas() {
    let stats = {
      totalSueldos: 0,
      totalGenerado: 0,
      masRentable: 'Sin datos',
      masHoras: 'Sin datos',
      chartData: []
    };

    try {
      stats = await window.electronAPI.empLiqGetStats(currentMonth);
    } catch (e) {
      console.error(e);
    }

    if ($('kpiEmpLiqMasRentable')) $('kpiEmpLiqMasRentable').textContent = stats.masRentable || 'Sin datos';
    if ($('kpiEmpLiqMasHoras')) $('kpiEmpLiqMasHoras').textContent = stats.masHoras || 'Sin datos';
    if ($('kpiEmpLiqTotalSueldos')) $('kpiEmpLiqTotalSueldos').textContent = fmtPeso(stats.totalSueldos || 0);
    if ($('kpiEmpLiqTotalGenerado')) $('kpiEmpLiqTotalGenerado').textContent = fmtPeso(stats.totalGenerado || 0);

    const ctx = $('empLiqChartRendimiento');
    if (ctx && typeof Chart !== 'undefined') {
      if (empLiqChart) empLiqChart.destroy();
      
      const labels = stats.chartData.map(d => d.nombre);
      const generadoData = stats.chartData.map(d => d.generado);
      const costoData = stats.chartData.map(d => d.costo);

      empLiqChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Generado ($)',
              data: generadoData,
              backgroundColor: '#3b82f6',
              borderRadius: 6,
            },
            {
              label: 'Costo Salarial ($)',
              data: costoData,
              backgroundColor: '#10b981',
              borderRadius: 6,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: v => `$${v.toLocaleString('es-AR')}`
              }
            }
          }
        }
      });
    }
  }

  // Initial load
  updateMonthLabel();
  cargarEmpleados();
}


// =====================================================================
// Módulo de Cuenta Corriente Municipio
// =====================================================================
function initMunicipio() {
  console.log('Municipio iniciado');
  let allOrders = [];
  let muniCart = [];
  let selectedOrderIdForPayment = null;
  let muniAllProducts = [];

  // Elementos DOM
  const muniTableBody = document.getElementById('muniTableBody');
  const muniSearchInput = document.getElementById('muniSearchInput');
  const muniFiltroEstado = document.getElementById('muniFiltroEstado');

  const btnNuevaOrdenMuni = document.getElementById('btnNuevaOrdenMuni');
  const modalMuniOrder = document.getElementById('modalMuniOrder');
  const btnCloseMuniOrder = document.getElementById('btnCloseMuniOrder');
  const btnCancelarMuniOrder = document.getElementById('btnCancelarMuniOrder');
  const btnGuardarMuniOrder = document.getElementById('btnGuardarMuniOrder');

  const formMuniOrder = document.getElementById('formMuniOrder');
  const muniOrderFecha = document.getElementById('muniOrderFecha');
  const muniOrderExpediente = document.getElementById('muniOrderExpediente');
  const muniOrderOC = document.getElementById('muniOrderOC');
  const muniOrderFechaCobro = document.getElementById('muniOrderFechaCobro');
  const muniOrderObs = document.getElementById('muniOrderObs');

  const muniProdSearch = document.getElementById('muniProdSearch');
  const muniProdSearchResults = document.getElementById('muniProdSearchResults');
  const muniOrderCartBody = document.getElementById('muniOrderCartBody');
  const muniOrderCartTotal = document.getElementById('muniOrderCartTotal');

  const modalMuniOrderDetail = document.getElementById('modalMuniOrderDetail');
  const btnCloseMuniOrderDetail = document.getElementById('btnCloseMuniOrderDetail');
  const btnCerrarMuniOrderDetail = document.getElementById('btnCerrarMuniOrderDetail');

  const modalMuniPayment = document.getElementById('modalMuniPayment');
  const btnCloseMuniPayment = document.getElementById('btnCloseMuniPayment');
  const btnCancelarMuniPayment = document.getElementById('btnCancelarMuniPayment');
  const btnGuardarMuniPayment = document.getElementById('btnGuardarMuniPayment');
  const btnRegistrarCobroMuni = document.getElementById('btnRegistrarCobroMuni');

  const formMuniPayment = document.getElementById('formMuniPayment');
  const muniPayFecha = document.getElementById('muniPayFecha');
  const muniPayMonto = document.getElementById('muniPayMonto');
  const muniPayMetodo = document.getElementById('muniPayMetodo');
  const muniPayObs = document.getElementById('muniPayObs');

  // Helpers
  const fmtPeso = (n) => {
    const v = parseFloat(n) || 0;
    return `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fmtFecha = (f) => {
    if (!f) return '—';
    const parts = f.split('-');
    if (parts.length !== 3) return f;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const diasHasta = (fecha) => {
    if (!fecha) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vto = new Date(fecha + 'T00:00:00');
    return Math.round((vto - hoy) / 86400000);
  };

  const badgeMuni = (est) => {
    const k = (est || '').toLowerCase().trim();
    if (k === 'pendiente') return `<span class="muni-badge pendiente">Pendiente</span>`;
    if (k === 'pago parcial') return `<span class="muni-badge parcial">Pago parcial</span>`;
    if (k === 'cobrado') return `<span class="muni-badge cobrado">Cobrado</span>`;
    return `<span class="muni-badge">${est || '—'}</span>`;
  };

  // Tabs
  const tabBtns = document.querySelectorAll('.muni-tab-btn');
  const tabSections = document.querySelectorAll('.muni-tab-section');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabSections.forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const sec = document.getElementById('tab-' + btn.dataset.tab);
      if (sec) sec.classList.add('active');

      if (btn.dataset.tab === 'muni-ordenes') {
        cargarOrders();
      } else if (btn.dataset.tab === 'muni-vencimientos') {
        cargarVencimientos();
      } else if (btn.dataset.tab === 'muni-stats') {
        cargarStats();
      }
    });
  });

      // Cargar Órdenes
  async function cargarOrders() {
    try {
      console.log('Cargando órdenes...');
      allOrders = await window.electronAPI.muniGetOrders();
      console.log('Órdenes recibidas:', allOrders.length);
      renderOrdersTable();
      cargarStats();
      cargarVencimientos();
    } catch (err) {
      console.error('Error cargando órdenes municipio:', err);
    }
  }

  function renderOrdersTable() {
    console.log('Renderizando tabla...');
    if (!muniTableBody) return;

    const searchTerm = (muniSearchInput?.value || '').toLowerCase().trim();
    const filterEstado = muniFiltroEstado?.value || '';

    const filtered = allOrders.filter(o => {
      const matchSearch = !searchTerm || 
        o.id.toString().includes(searchTerm) ||
        (o.expediente || '').toLowerCase().includes(searchTerm) ||
        (o.orden_compra || '').toLowerCase().includes(searchTerm) ||
        (o.observaciones || '').toLowerCase().includes(searchTerm);

      const matchEstado = !filterEstado || o.estado === filterEstado;

      return matchSearch && matchEstado;
    });

    if (filtered.length === 0) {
      muniTableBody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="muni-empty">
              <i class="fas fa-university"></i>
              <p>No se encontraron órdenes</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    muniTableBody.innerHTML = filtered.map(o => `
      <tr>
        <td><strong>#${o.id}</strong></td>
        <td>${fmtFecha(o.fecha)}</td>
        <td>
          <div style="font-weight:600;">Exp: ${o.expediente || '—'}</div>
          <div style="font-size:11.5px; color:#64748b;">OC: ${o.orden_compra || '—'}</div>
        </td>
        <td><strong>${fmtPeso(o.total)}</strong></td>
        <td>${fmtFecha(o.fecha_estimada_cobro)}</td>
        <td>${badgeMuni(o.estado)}</td>
        <td style="color:${o.saldo_pendiente > 0 ? '#ef4444' : '#059669'}; font-weight:700;">
          ${fmtPeso(o.saldo_pendiente)}
        </td>
        <td>
          <button class="btn-muni-action btn-detail" data-id="${o.id}" title="Ver Detalle">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn-muni-action delete btn-delete" data-id="${o.id}" title="Eliminar Orden">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `).join('');

    // Bind events
    muniTableBody.querySelectorAll('.btn-detail').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        verDetalleOrden(id);
      });
    });

    muniTableBody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        eliminarOrden(id);
      });
    });
  }

  // Filtros
  muniSearchInput?.addEventListener('input', renderOrdersTable);
  muniFiltroEstado?.addEventListener('change', renderOrdersTable);

  // Eliminar Orden
  async function eliminarOrden(id) {
    if (confirm(`¿Estás seguro de eliminar la Orden #${id}? Esta acción descontará la orden y eliminará sus cobros asociados.`)) {
      try {
        const res = await window.electronAPI.muniDeleteOrder(id);
                if (res.success) {
          mostrarToast('Orden eliminada correctamente', 'success');
          await cargarOrders();
        } else {
          mostrarToast('Error al eliminar la orden: ' + res.error, 'error');
        }
      } catch (err) {
        console.error(err);
        mostrarToast('Error al eliminar orden', 'error');
      }
    }
  }

  // Ver Detalle
  async function verDetalleOrden(id) {
    const orden = allOrders.find(o => o.id === id);
    if (!orden) return;

    selectedOrderIdForPayment = id;

    document.getElementById('detailMuniOrderId').textContent = orden.id;
    document.getElementById('detailMuniOrderFecha').textContent = fmtFecha(orden.fecha);
    document.getElementById('detailMuniOrderExpediente').textContent = orden.expediente || '—';
    document.getElementById('detailMuniOrderOC').textContent = orden.orden_compra || '—';
    document.getElementById('detailMuniOrderFechaCobro').textContent = fmtFecha(orden.fecha_estimada_cobro);
    document.getElementById('detailMuniOrderEstado').innerHTML = badgeMuni(orden.estado);
    document.getElementById('detailMuniOrderObs').textContent = orden.observaciones || '—';
    document.getElementById('detailMuniOrderTotal').textContent = fmtPeso(orden.total);
    document.getElementById('detailMuniOrderSaldo').textContent = fmtPeso(orden.saldo_pendiente);

    // Renderizar Productos
    const prodsTable = document.getElementById('detailMuniProductsTableBody');
    let prodsList = [];
    try {
      prodsList = JSON.parse(orden.productos) || [];
    } catch (e) {
      console.error('Error parseando productos de orden:', e);
    }

    if (prodsList.length === 0) {
      prodsTable.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8;">Sin productos cargados</td></tr>`;
    } else {
      prodsTable.innerHTML = prodsList.map(p => `
        <tr>
          <td><code style="font-family:monospace;">${p.codigo || '—'}</code></td>
          <td>${p.nombre}</td>
          <td style="text-align:center;">${p.cantidad}</td>
          <td style="text-align:right;">${fmtPeso(p.precio)}</td>
          <td style="text-align:right;">${fmtPeso(p.precio * p.cantidad)}</td>
        </tr>
      `).join('');
    }

    // Cargar Historial de Pagos
    await cargarPagosOrden(id, orden.saldo_pendiente);

    modalMuniOrderDetail?.classList.add('active');
  }

  async function cargarPagosOrden(id, saldoPendiente) {
    const paymentsTable = document.getElementById('detailMuniPaymentsTableBody');
    try {
      const payments = await window.electronAPI.muniGetPayments(id);
      
      // Control de botón "Registrar Cobro"
      if (saldoPendiente <= 0) {
        btnRegistrarCobroMuni.style.display = 'none';
      } else {
        btnRegistrarCobroMuni.style.display = 'inline-flex';
      }

      if (payments.length === 0) {
        paymentsTable.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:15px;">No hay cobros registrados para esta orden.</td></tr>`;
      } else {
        paymentsTable.innerHTML = payments.map(p => `
          <tr>
            <td>${fmtFecha(p.fecha)}</td>
            <td><span class="muni-badge parcial">${p.metodo_pago}</span></td>
            <td style="text-align:right; font-weight:bold; color:#059669;">${fmtPeso(p.monto)}</td>
            <td>${p.observaciones || '—'}</td>
          </tr>
        `).join('');
      }
    } catch (err) {
      console.error(err);
      paymentsTable.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#ef4444;">Error al cargar cobros</td></tr>`;
    }
  }

  // Modales Eventos
  btnNuevaOrdenMuni?.addEventListener('click', async () => {
    formMuniOrder?.reset();
    muniCart = [];
    renderMuniCart();
    
    // Set default date to today
    const hoy = new Date().toISOString().split('T')[0];
    muniOrderFecha.value = hoy;
    muniOrderFechaCobro.value = hoy;

    // Pre-cargar productos para el buscador
    try {
      muniAllProducts = await window.electronAPI.getProducts();
    } catch (err) {
      console.error('Error pre-cargando productos:', err);
    }

    modalMuniOrder?.classList.add('active');
  });

  const cerrarMuniOrder = () => {
    modalMuniOrder?.classList.remove('active');
  };
  btnCloseMuniOrder?.addEventListener('click', cerrarMuniOrder);
  btnCancelarMuniOrder?.addEventListener('click', cerrarMuniOrder);

  // Buscador de productos in modal
  muniProdSearch?.addEventListener('input', () => {
    const term = (muniProdSearch.value || '').toLowerCase().trim();
    if (term.length < 2) {
      muniProdSearchResults.innerHTML = '';
      muniProdSearchResults.classList.remove('active');
      return;
    }

    const filtered = muniAllProducts.filter(p => 
      (p.nombre || '').toLowerCase().includes(term) ||
      (p.codigo || '').toLowerCase().includes(term)
    ).slice(0, 6);

    if (filtered.length === 0) {
      muniProdSearchResults.innerHTML = `<div style="padding:10px; color:#94a3b8; font-size:13px; text-align:center;">No se encontraron productos</div>`;
    } else {
      muniProdSearchResults.innerHTML = filtered.map(p => `
        <div class="muni-search-result-item" data-id="${p.id}">
          <div>
            <div style="font-weight:600;">${p.nombre}</div>
            <div class="prod-code">Cod: ${p.codigo || '—'} • Stock: ${p.stock}</div>
          </div>
          <div class="prod-price">${fmtPeso(p.precio)}</div>
        </div>
      `).join('');

      // Bind result click
      muniProdSearchResults.querySelectorAll('.muni-search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = Number(item.dataset.id);
          const prod = muniAllProducts.find(x => x.id === id);
          if (prod) {
            const existente = muniCart.find(c => c.id === prod.id);
            if (existente) {
              existente.cantidad += 1;
            } else {
              muniCart.push({
                id: prod.id,
                codigo: prod.codigo,
                nombre: prod.nombre,
                precio: prod.precio,
                stock: prod.stock,
                cantidad: 1
              });
            }
            muniProdSearch.value = '';
            muniProdSearchResults.innerHTML = '';
            muniProdSearchResults.classList.remove('active');
            renderMuniCart();
          }
        });
      });
    }

    muniProdSearchResults.classList.add('active');
  });

  // Cerrar buscador si se clickea afuera
  document.addEventListener('click', (e) => {
    if (muniProdSearchResults && !muniProdSearch.contains(e.target) && !muniProdSearchResults.contains(e.target)) {
      muniProdSearchResults.classList.remove('active');
    }
  });

  function renderMuniCart() {
    if (!muniOrderCartBody) return;

    if (muniCart.length === 0) {
      muniOrderCartBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">
            No hay productos agregados a esta orden. Buscá arriba para agregar.
          </td>
        </tr>
      `;
      muniOrderCartTotal.textContent = fmtPeso(0);
      return;
    }

    muniOrderCartBody.innerHTML = muniCart.map(p => `
      <tr>
        <td><code style="font-family:monospace;">${p.codigo || '—'}</code></td>
        <td>
          <div style="font-weight:600;">${p.nombre}</div>
          <div style="font-size:11px; color:#ef4444;">Stock disponible: ${p.stock}</div>
        </td>
        <td style="text-align:center;">
          <input type="number" class="muni-cart-qty" data-id="${p.id}" value="${p.cantidad}" min="1" step="1">
        </td>
        <td style="text-align:right;">${fmtPeso(p.precio)}</td>
        <td style="text-align:right; font-weight:600;">${fmtPeso(p.precio * p.cantidad)}</td>
        <td style="text-align:center;">
          <button type="button" class="btn-muni-action delete btn-muni-remove" data-id="${p.id}">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `).join('');

    // Bind quantity input change
    muniOrderCartBody.querySelectorAll('.muni-cart-qty').forEach(input => {
      input.addEventListener('change', () => {
        const id = Number(input.dataset.id);
        const val = Math.max(1, parseInt(input.value) || 1);
        const item = muniCart.find(c => c.id === id);
        if (item) {
          item.cantidad = val;
          renderMuniCart();
        }
      });
    });

    // Bind remove button
    muniOrderCartBody.querySelectorAll('.btn-muni-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        muniCart = muniCart.filter(c => c.id !== id);
        renderMuniCart();
      });
    });

    // Recalcular Total
    const total = muniCart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    muniOrderCartTotal.textContent = fmtPeso(total);
  }

  // Guardar Orden
  btnGuardarMuniOrder?.addEventListener('click', async () => {
    if (muniCart.length === 0) {
      alert('Debes agregar al menos un producto a la orden.');
      return;
    }

    if (!muniOrderFecha.value || !muniOrderFechaCobro.value) {
      alert('Debes completar las fechas obligatorias.');
      return;
    }

    // Validar stocks
    for (const item of muniCart) {
      if (item.cantidad > item.stock) {
        alert(`Stock insuficiente para ${item.nombre}. Stock actual: ${item.stock}`);
        return;
      }
    }

    const total = muniCart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    const orderObj = {
      fecha: muniOrderFecha.value,
      expediente: muniOrderExpediente.value.trim(),
      orden_compra: muniOrderOC.value.trim(),
      fecha_estimada_cobro: muniOrderFechaCobro.value,
      observaciones: muniOrderObs.value.trim(),
      productos: muniCart.map(c => ({
        id: c.id,
        codigo: c.codigo,
        nombre: c.nombre,
        precio: c.precio,
        cantidad: c.cantidad
      })),
      total: total
    };

    try {
      const res = await window.electronAPI.muniAddOrder(orderObj);
            if (res.success) {
        mostrarToast('Orden del municipio guardada correctamente', 'success');
        cerrarMuniOrder();
        await cargarOrders();
      } else {
        mostrarToast('Error al guardar la orden: ' + res.error, 'error');
      }
    } catch (err) {
      console.error(err);
      mostrarToast('Error al procesar la orden', 'error');
    }
  });

  // Cerrar Detalle
  const cerrarMuniOrderDetail = () => {
    modalMuniOrderDetail?.classList.remove('active');
  };
  btnCloseMuniOrderDetail?.addEventListener('click', cerrarMuniOrderDetail);
  btnCerrarMuniOrderDetail?.addEventListener('click', cerrarMuniOrderDetail);

  // Registrar Cobro Dialog
  btnRegistrarCobroMuni?.addEventListener('click', () => {
    const orden = allOrders.find(o => o.id === selectedOrderIdForPayment);
    if (!orden) return;

    formMuniPayment?.reset();
    
    // Set default values
    const hoy = new Date().toISOString().split('T')[0];
    muniPayFecha.value = hoy;
    muniPayMonto.value = orden.saldo_pendiente;

    modalMuniPayment?.classList.add('active');
  });

  const cerrarMuniPayment = () => {
    modalMuniPayment?.classList.remove('active');
  };
  btnCloseMuniPayment?.addEventListener('click', cerrarMuniPayment);
  btnCancelarMuniPayment?.addEventListener('click', cerrarMuniPayment);

  // Guardar Cobro
  btnGuardarMuniPayment?.addEventListener('click', async () => {
    const monto = parseFloat(muniPayMonto.value) || 0;
    if (monto <= 0) {
      alert('El monto del cobro debe ser mayor a cero.');
      return;
    }

    const orden = allOrders.find(o => o.id === selectedOrderIdForPayment);
    if (!orden) return;

    if (monto > orden.saldo_pendiente) {
      alert(`El monto ingresado ($${monto}) excede el saldo pendiente ($${orden.saldo_pendiente})`);
      return;
    }

    const paymentObj = {
      orden_id: selectedOrderIdForPayment,
      fecha: muniPayFecha.value,
      monto: monto,
      metodo_pago: muniPayMetodo.value,
      observaciones: muniPayObs.value.trim()
    };

    try {
      const res = await window.electronAPI.muniAddPayment(paymentObj);
      if (res.success) {
        mostrarToast('Cobro registrado correctamente', 'success');
        cerrarMuniPayment();
        
        // Recargar orden detail y listado de fondo
        await cargarOrders();
        verDetalleOrden(selectedOrderIdForPayment);
      } else {
        mostrarToast('Error al registrar cobro: ' + res.error, 'error');
      }
    } catch (err) {
      console.error(err);
      mostrarToast('Error al registrar cobro', 'error');
    }
  });

  // Cargar Vencimientos / Próximos Cobros
  async function cargarVencimientos() {
    const tableBody = document.getElementById('muniVencimientosTableBody');
    if (!tableBody) return;

    try {
      const list = await window.electronAPI.muniGetUpcomingCollections();
      if (list.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="6">
              <div class="muni-empty">
                <i class="fas fa-calendar-check"></i>
                <p>No hay cobros pendientes</p>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = list.map(o => {
        const dias = diasHasta(o.fecha_estimada_cobro);
        let colorDias = '#059669'; // Green
        let textDias = `${dias} días`;

        if (dias <= 0) {
          colorDias = '#ef4444'; // Red
          textDias = dias === 0 ? 'Hoy' : `Vencido hace ${Math.abs(dias)} días`;
        } else if (dias <= 5) {
          colorDias = '#d97706'; // Orange
        }

        return `
          <tr>
            <td><strong>${fmtFecha(o.fecha_estimada_cobro)}</strong></td>
            <td><strong>Orden #${o.id}</strong></td>
            <td>
              Exp: ${o.expediente || '—'}<br>
              <span style="font-size:11px; color:#64748b;">OC: ${o.orden_compra || '—'}</span>
            </td>
            <td>${fmtPeso(o.total)}</td>
            <td style="color:#ef4444; font-weight:700;">${fmtPeso(o.saldo_pendiente)}</td>
            <td style="color:${colorDias}; font-weight:bold;">${textDias}</td>
          </tr>
        `;
      }).join('');

    } catch (err) {
      console.error('Error cargando vencimientos municipio:', err);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#ef4444;">Error al cargar datos</td></tr>`;
    }
  }

  // Cargar Estadísticas
  async function cargarStats() {
    try {
      const stats = await window.electronAPI.muniGetStats();

      document.getElementById('muniStatTotalVendido').textContent = fmtPeso(stats.totalVendido);
      document.getElementById('muniStatTotalCobrado').textContent = fmtPeso(stats.totalCobrado);
      document.getElementById('muniStatTotalPendiente').textContent = fmtPeso(stats.totalPendiente);
      document.getElementById('muniStatCantOrdenes').textContent = stats.cantOrdenes;
      document.getElementById('muniStatCantPendientes').textContent = stats.cantPendientes;
      document.getElementById('muniStatCantCobradas').textContent = stats.cantCobradas;

        } catch (err) {
      console.error('Error cargando estadísticas municipio:', err);
    }
  }

  // Carga inicial
  cargarOrders();
}


// =====================================================================
// Módulo de Clientes (Cuenta Corriente Clientes)
// =====================================================================
function initClientes() {
  console.log('Clientes iniciado');
  let allSales = [];
  let allClients = [];
  let clienteCart = [];
  let selectedSaleIdForPayment = null;
  let clienteAllProducts = [];

  // Elementos DOM
  const clienteSaleTableBody = document.getElementById('clienteSaleTableBody');
  const clienteSaleSearchInput = document.getElementById('clienteSaleSearchInput');
  const clienteSaleFiltroEstado = document.getElementById('clienteSaleFiltroEstado');

  const clientePadronTableBody = document.getElementById('clientePadronTableBody');
  const clienteSearchInput = document.getElementById('clienteSearchInput');

  const btnNuevoCliente = document.getElementById('btnNuevoCliente');
  const modalClienteCrud = document.getElementById('modalClienteCrud');
  const btnCloseClienteCrud = document.getElementById('btnCloseClienteCrud');
  const btnCancelarClienteCrud = document.getElementById('btnCancelarClienteCrud');
  const btnGuardarClienteCrud = document.getElementById('btnGuardarClienteCrud');
  const formClienteCrud = document.getElementById('formClienteCrud');
  const clienteEditId = document.getElementById('clienteEditId');
  const clienteFormNombre = document.getElementById('clienteFormNombre');
  const clienteFormTelefono = document.getElementById('clienteFormTelefono');
  const clienteFormCuit = document.getElementById('clienteFormCuit');
  const clienteFormEmail = document.getElementById('clienteFormEmail');
  const clienteFormDireccion = document.getElementById('clienteFormDireccion');
  const clienteFormObs = document.getElementById('clienteFormObs');

  const btnNuevaVentaCliente = document.getElementById('btnNuevaVentaCliente');
  const modalClienteSale = document.getElementById('modalClienteSale');
  const btnCloseClienteSale = document.getElementById('btnCloseClienteSale');
  const btnCancelarClienteSale = document.getElementById('btnCancelarClienteSale');
  const btnGuardarClienteSale = document.getElementById('btnGuardarClienteSale');
  const formClienteSale = document.getElementById('formClienteSale');
  const clienteSaleClienteSelect = document.getElementById('clienteSaleClienteSelect');
  const clienteSaleFecha = document.getElementById('clienteSaleFecha');
  const clienteSaleFechaCobro = document.getElementById('clienteSaleFechaCobro');
  const clienteSaleComprobante = document.getElementById('clienteSaleComprobante');
  const clienteSaleObs = document.getElementById('clienteSaleObs');

  const clienteProdSearch = document.getElementById('clienteProdSearch');
  const clienteProdSearchResults = document.getElementById('clienteProdSearchResults');
  const clienteSaleCartBody = document.getElementById('clienteSaleCartBody');
  const clienteSaleCartTotal = document.getElementById('clienteSaleCartTotal');

  const modalClienteSaleDetail = document.getElementById('modalClienteSaleDetail');
  const btnCloseClienteSaleDetail = document.getElementById('btnCloseClienteSaleDetail');
  const btnCerrarClienteSaleDetail = document.getElementById('btnCerrarClienteSaleDetail');

  const modalClientePayment = document.getElementById('modalClientePayment');
  const btnCloseClientePayment = document.getElementById('btnCloseClientePayment');
  const btnCancelarClientePayment = document.getElementById('btnCancelarClientePayment');
  const btnGuardarClientePayment = document.getElementById('btnGuardarClientePayment');
  const btnRegistrarCobroCliente = document.getElementById('btnRegistrarCobroCliente');
  const formClientePayment = document.getElementById('formClientePayment');
  const clientePayFecha = document.getElementById('clientePayFecha');
  const clientePayMonto = document.getElementById('clientePayMonto');
  const clientePayMetodo = document.getElementById('clientePayMetodo');
  const clientePayComprobante = document.getElementById('clientePayComprobante');
  const clientePayObs = document.getElementById('clientePayObs');

  // Formatters
  const fmtPeso = (n) => {
    const v = parseFloat(n) || 0;
    return `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fmtFecha = (f) => {
    if (!f) return '—';
    const parts = f.split('T')[0].split('-');
    if (parts.length !== 3) return f;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const diasHasta = (fecha) => {
    if (!fecha) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vto = new Date(fecha.split('T')[0] + 'T00:00:00');
    return Math.round((vto - hoy) / 86400000);
  };

  const badgeStatus = (est) => {
    const k = (est || '').toLowerCase().trim();
    if (k === 'pendiente') return `<span class="muni-badge pendiente">Pendiente</span>`;
    if (k === 'pago parcial') return `<span class="muni-badge parcial">Pago parcial</span>`;
    if (k === 'cobrado') return `<span class="muni-badge cobrado">Cobrado</span>`;
    return `<span class="muni-badge">${est || '—'}</span>`;
  };

  // Tabs navigation
  const tabBtns = document.querySelectorAll('.cliente-tab-btn');
  const tabSections = document.querySelectorAll('.cliente-tab-section');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabSections.forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const sec = document.getElementById('tab-' + btn.dataset.tab);
      if (sec) sec.classList.add('active');

      if (btn.dataset.tab === 'cliente-ventas') {
        cargarSales();
      } else if (btn.dataset.tab === 'cliente-padron') {
        cargarPadronClientes();
      } else if (btn.dataset.tab === 'cliente-vencimientos') {
        cargarVencimientos();
      } else if (btn.dataset.tab === 'cliente-stats') {
        cargarStats();
      }
    });
  });

  // Cargar Ventas
  async function cargarSales() {
    try {
      allSales = await window.electronAPI.clienteGetSales();
      renderSalesTable();
      cargarStats();
      cargarVencimientos();
    } catch (err) {
      console.error('Error cargando ventas cliente:', err);
    }
  }

  function renderSalesTable() {
    if (!clienteSaleTableBody) return;

    const searchTerm = (clienteSaleSearchInput?.value || '').toLowerCase().trim();
    const filterEstado = clienteSaleFiltroEstado?.value || '';

    const filtered = allSales.filter(o => {
      const matchSearch = !searchTerm || 
        o.id.toString().includes(searchTerm) ||
        (o.cliente_nombre || '').toLowerCase().includes(searchTerm) ||
        (o.comprobante || '').toLowerCase().includes(searchTerm) ||
        (o.observaciones || '').toLowerCase().includes(searchTerm);

      const matchEstado = !filterEstado || o.estado === filterEstado;

      return matchSearch && matchEstado;
    });

    if (filtered.length === 0) {
      clienteSaleTableBody.innerHTML = `
        <tr>
          <td colspan="9">
            <div class="muni-empty">
              <i class="fas fa-user-tag"></i>
              <p>No se encontraron ventas</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    clienteSaleTableBody.innerHTML = filtered.map(o => `
      <tr>
        <td><strong>#${o.id}</strong></td>
        <td>${fmtFecha(o.fecha)}</td>
        <td><strong>${o.cliente_nombre || 'Cliente #' + o.cliente_id}</strong></td>
        <td>
          <div style="font-weight:600;">${o.comprobante || '—'}</div>
          <div style="font-size:11.5px; color:#64748b;">${o.observaciones || ''}</div>
        </td>
        <td><strong>${fmtPeso(o.total)}</strong></td>
        <td>${fmtFecha(o.fecha_estimada_cobro)}</td>
        <td>${badgeStatus(o.estado)}</td>
        <td style="color:${o.saldo_pendiente > 0 ? '#ef4444' : '#059669'}; font-weight:700;">
          ${fmtPeso(o.saldo_pendiente)}
        </td>
        <td>
          <button class="btn-muni-action btn-detail-sale" data-id="${o.id}" title="Ver Detalle">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn-muni-action delete btn-delete-sale" data-id="${o.id}" title="Eliminar Venta">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `).join('');

    // Bind events
    clienteSaleTableBody.querySelectorAll('.btn-detail-sale').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        verDetalleVenta(id);
      });
    });

    clienteSaleTableBody.querySelectorAll('.btn-delete-sale').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        eliminarVenta(id);
      });
    });
  }

  clienteSaleSearchInput?.addEventListener('input', renderSalesTable);
  clienteSaleFiltroEstado?.addEventListener('change', renderSalesTable);

  // Eliminar Venta
  async function eliminarVenta(id) {
    if (confirm(`¿Estás seguro de eliminar la Venta #${id}? Esta acción restituirá el stock de los productos.`)) {
      try {
        const res = await window.electronAPI.clienteDeleteSale(id);
        if (res.success) {
          mostrarToast('Venta eliminada y stock restituido', 'success');
          await cargarSales();
        } else {
          mostrarToast('Error al eliminar la venta: ' + res.error, 'error');
        }
      } catch (err) {
        console.error(err);
        mostrarToast('Error al eliminar la venta', 'error');
      }
    }
  }

  // Ver Detalle Venta
  async function verDetalleVenta(id) {
    const sale = allSales.find(o => o.id === id);
    if (!sale) return;

    selectedSaleIdForPayment = id;

    document.getElementById('detailClienteSaleId').textContent = sale.id;
    document.getElementById('detailClienteSaleCliente').textContent = sale.cliente_nombre || 'Cliente #' + sale.cliente_id;
    document.getElementById('detailClienteSaleFecha').textContent = fmtFecha(sale.fecha);
    document.getElementById('detailClienteSaleFechaCobro').textContent = fmtFecha(sale.fecha_estimada_cobro);
    document.getElementById('detailClienteSaleComprobante').textContent = sale.comprobante || '—';
    document.getElementById('detailClienteSaleEstado').innerHTML = badgeStatus(sale.estado);
    document.getElementById('detailClienteSaleObs').textContent = sale.observaciones || '—';
    document.getElementById('detailClienteSaleTotal').textContent = fmtPeso(sale.total);
    document.getElementById('detailClienteSaleSaldo').textContent = fmtPeso(sale.saldo_pendiente);

    // Renderizar Productos
    const prodsTable = document.getElementById('detailClienteProductsTableBody');
    let prodsList = [];
    try {
      prodsList = JSON.parse(sale.productos) || [];
    } catch (e) {
      console.error('Error parseando productos de venta:', e);
    }

    if (prodsList.length === 0) {
      prodsTable.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8;">Sin productos cargados</td></tr>`;
    } else {
      prodsTable.innerHTML = prodsList.map(p => `
        <tr>
          <td><code style="font-family:monospace;">${p.codigo || '—'}</code></td>
          <td>${p.nombre}</td>
          <td style="text-align:center;">${p.cantidad}</td>
          <td style="text-align:right;">${fmtPeso(p.precio)}</td>
          <td style="text-align:right;">${fmtPeso(p.precio * p.cantidad)}</td>
        </tr>
      `).join('');
    }

    // Cargar Historial de Pagos de esta venta
    await cargarPagosVenta(sale.cliente_id, sale.id, sale.saldo_pendiente);

    modalClienteSaleDetail?.classList.add('active');
  }

  async function cargarPagosVenta(clienteId, ventaId, saldoPendiente) {
    const paymentsTable = document.getElementById('detailClientePaymentsTableBody');
    try {
      const allPayments = await window.electronAPI.clienteGetPayments(clienteId);
      // Filtrar pagos asociados a esta venta o comprobante
      const payments = allPayments.filter(p => (p.comprobante || '').includes(`Venta #${ventaId}`) || true);
      
      if (saldoPendiente <= 0) {
        btnRegistrarCobroCliente.style.display = 'none';
      } else {
        btnRegistrarCobroCliente.style.display = 'inline-flex';
      }

      if (payments.length === 0) {
        paymentsTable.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:15px;">No hay cobros registrados.</td></tr>`;
      } else {
        paymentsTable.innerHTML = payments.map(p => `
          <tr>
            <td>${fmtFecha(p.fecha)}</td>
            <td><span class="muni-badge parcial">${p.metodo_pago}</span></td>
            <td>${p.comprobante || '—'}</td>
            <td style="text-align:right; font-weight:bold; color:#059669;">${fmtPeso(p.monto)}</td>
            <td>${p.observaciones || '—'}</td>
          </tr>
        `).join('');
      }
    } catch (err) {
      console.error(err);
      paymentsTable.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ef4444;">Error al cargar cobros</td></tr>`;
    }
  }

  // Cerrar Detalle Venta
  const cerrarClienteSaleDetail = () => {
    modalClienteSaleDetail?.classList.remove('active');
  };
  btnCloseClienteSaleDetail?.addEventListener('click', cerrarClienteSaleDetail);
  btnCerrarClienteSaleDetail?.addEventListener('click', cerrarClienteSaleDetail);

  // Modal Registrar Cobro
  btnRegistrarCobroCliente?.addEventListener('click', () => {
    const sale = allSales.find(o => o.id === selectedSaleIdForPayment);
    if (!sale) return;

    formClientePayment?.reset();
    const hoy = new Date().toISOString().split('T')[0];
    clientePayFecha.value = hoy;
    clientePayMonto.value = sale.saldo_pendiente;
    clientePayComprobante.value = `Recibo Venta #${sale.id}`;

    modalClientePayment?.classList.add('active');
  });

  const cerrarClientePayment = () => {
    modalClientePayment?.classList.remove('active');
  };
  btnCloseClientePayment?.addEventListener('click', cerrarClientePayment);
  btnCancelarClientePayment?.addEventListener('click', cerrarClientePayment);

  // Guardar Cobro
  btnGuardarClientePayment?.addEventListener('click', async () => {
    const monto = parseFloat(clientePayMonto.value) || 0;
    if (monto <= 0) {
      alert('El monto del cobro debe ser mayor a cero.');
      return;
    }

    const sale = allSales.find(o => o.id === selectedSaleIdForPayment);
    if (!sale) return;

    if (monto > sale.saldo_pendiente) {
      alert(`El monto ingresado ($${monto}) excede el saldo pendiente ($${sale.saldo_pendiente})`);
      return;
    }

    const paymentObj = {
      venta_id: selectedSaleIdForPayment,
      fecha: clientePayFecha.value,
      monto: monto,
      metodo_pago: clientePayMetodo.value,
      comprobante: clientePayComprobante.value.trim(),
      observaciones: clientePayObs.value.trim()
    };

    try {
      const res = await window.electronAPI.clienteAddSalePayment(paymentObj);
      if (res.success) {
        mostrarToast('Cobro registrado correctamente', 'success');
        cerrarClientePayment();
        await cargarSales();
        verDetalleVenta(selectedSaleIdForPayment);
      } else {
        mostrarToast('Error al registrar cobro: ' + res.error, 'error');
      }
    } catch (err) {
      console.error(err);
      mostrarToast('Error al registrar cobro', 'error');
    }
  });

  // ── PADRÓN DE CLIENTES ──────────────────────────────────────────────
  async function cargarPadronClientes() {
    try {
      allClients = await window.electronAPI.clienteGetClients();
      renderPadronClientes();
    } catch (err) {
      console.error('Error cargando padrón de clientes:', err);
    }
  }

  function renderPadronClientes() {
    if (!clientePadronTableBody) return;

    const term = (clienteSearchInput?.value || '').toLowerCase().trim();
    const filtered = allClients.filter(c => 
      !term ||
      (c.nombre || '').toLowerCase().includes(term) ||
      (c.cuit || '').toLowerCase().includes(term) ||
      (c.telefono || '').toLowerCase().includes(term)
    );

    if (filtered.length === 0) {
      clientePadronTableBody.innerHTML = `<tr><td colspan="7"><div class="muni-empty"><i class="fas fa-users"></i><p>No se encontraron clientes</p></div></td></tr>`;
      return;
    }

    clientePadronTableBody.innerHTML = filtered.map(c => `
      <tr>
        <td><strong>#${c.id}</strong></td>
        <td><strong>${c.nombre}</strong></td>
        <td>${c.telefono || '—'}</td>
        <td>${c.cuit || '—'}</td>
        <td>${c.direccion || '—'}</td>
        <td><span class="muni-badge cobrado">${c.estado || 'Activo'}</span></td>
        <td>
          <button class="btn-muni-action btn-edit-cliente" data-id="${c.id}" title="Editar Cliente">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-muni-action delete btn-delete-cliente" data-id="${c.id}" title="Eliminar Cliente">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `).join('');

    clientePadronTableBody.querySelectorAll('.btn-edit-cliente').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const cli = allClients.find(x => x.id === id);
        if (cli) abrirModalClienteCrud(cli);
      });
    });

    clientePadronTableBody.querySelectorAll('.btn-delete-cliente').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.id);
        if (confirm(`¿Estás seguro de eliminar al cliente #${id}?`)) {
          const res = await window.electronAPI.clienteDeleteClient(id);
          if (res.success) {
            mostrarToast('Cliente eliminado correctamente', 'success');
            await cargarPadronClientes();
          } else {
            mostrarToast('Error al eliminar cliente: ' + res.error, 'error');
          }
        }
      });
    });
  }

  clienteSearchInput?.addEventListener('input', renderPadronClientes);

  // Modal CRUD Cliente
  function abrirModalClienteCrud(cli = null) {
    formClienteCrud?.reset();
    if (cli) {
      document.getElementById('modalClienteCrudTitle').innerHTML = `<i class="fas fa-user-edit"></i> Editar Cliente`;
      clienteEditId.value = cli.id;
      clienteFormNombre.value = cli.nombre || '';
      clienteFormTelefono.value = cli.telefono || '';
      clienteFormCuit.value = cli.cuit || '';
      clienteFormEmail.value = cli.email || '';
      clienteFormDireccion.value = cli.direccion || '';
      clienteFormObs.value = cli.observaciones || '';
    } else {
      document.getElementById('modalClienteCrudTitle').innerHTML = `<i class="fas fa-user-plus"></i> Nuevo Cliente`;
      clienteEditId.value = '';
    }
    modalClienteCrud?.classList.add('active');
  }

  btnNuevoCliente?.addEventListener('click', () => abrirModalClienteCrud());
  const cerrarClienteCrud = () => modalClienteCrud?.classList.remove('active');
  btnCloseClienteCrud?.addEventListener('click', cerrarClienteCrud);
  btnCancelarClienteCrud?.addEventListener('click', cerrarClienteCrud);

  btnGuardarClienteCrud?.addEventListener('click', async () => {
    if (!clienteFormNombre.value.trim()) {
      alert('El nombre o razón social es obligatorio.');
      return;
    }

    const payload = {
      nombre: clienteFormNombre.value.trim(),
      telefono: clienteFormTelefono.value.trim(),
      cuit: clienteFormCuit.value.trim(),
      email: clienteFormEmail.value.trim(),
      direccion: clienteFormDireccion.value.trim(),
      observaciones: clienteFormObs.value.trim(),
      estado: 'Activo'
    };

    try {
      let res;
      if (clienteEditId.value) {
        payload.id = Number(clienteEditId.value);
        res = await window.electronAPI.clienteUpdateClient(payload);
      } else {
        res = await window.electronAPI.clienteAddClient(payload);
      }

      if (res.success) {
        mostrarToast('Cliente guardado correctamente', 'success');
        cerrarClienteCrud();
        await cargarPadronClientes();
      } else {
        mostrarToast('Error al guardar cliente: ' + res.error, 'error');
      }
    } catch (err) {
      console.error(err);
      mostrarToast('Error al guardar cliente', 'error');
    }
  });

  // ── NUEVA VENTA Y PRODUCTOS ─────────────────────────────────────────
  btnNuevaVentaCliente?.addEventListener('click', async () => {
    formClienteSale?.reset();
    clienteCart = [];
    renderClienteCart();

    const hoy = new Date().toISOString().split('T')[0];
    clienteSaleFecha.value = hoy;
    clienteSaleFechaCobro.value = hoy;

    // Cargar select de clientes
    try {
      allClients = await window.electronAPI.clienteGetClients();
      if (allClients.length === 0) {
        clienteSaleClienteSelect.innerHTML = `<option value="">Sin clientes registrados. Crea uno primero.</option>`;
      } else {
        clienteSaleClienteSelect.innerHTML = `<option value="">-- Seleccioná un Cliente --</option>` + 
          allClients.map(c => `<option value="${c.id}">${c.nombre} ${c.cuit ? '(' + c.cuit + ')' : ''}</option>`).join('');
      }
    } catch (err) {
      console.error(err);
    }

    // Precargar productos
    try {
      clienteAllProducts = await window.electronAPI.getProducts();
    } catch (err) {
      console.error('Error precargando productos:', err);
    }

    modalClienteSale?.classList.add('active');
  });

  const cerrarClienteSale = () => modalClienteSale?.classList.remove('active');
  btnCloseClienteSale?.addEventListener('click', cerrarClienteSale);
  btnCancelarClienteSale?.addEventListener('click', cerrarClienteSale);

  // Buscador de productos en modal Venta
  clienteProdSearch?.addEventListener('input', () => {
    const term = (clienteProdSearch.value || '').toLowerCase().trim();
    if (term.length < 2) {
      clienteProdSearchResults.innerHTML = '';
      clienteProdSearchResults.classList.remove('active');
      return;
    }

    const filtered = clienteAllProducts.filter(p => 
      (p.nombre || '').toLowerCase().includes(term) ||
      (p.codigo || '').toLowerCase().includes(term)
    ).slice(0, 6);

    if (filtered.length === 0) {
      clienteProdSearchResults.innerHTML = `<div style="padding:10px; color:#94a3b8; font-size:13px; text-align:center;">No se encontraron productos</div>`;
    } else {
      clienteProdSearchResults.innerHTML = filtered.map(p => `
        <div class="muni-search-result-item" data-id="${p.id}">
          <div>
            <div style="font-weight:600;">${p.nombre}</div>
            <div class="prod-code">Cod: ${p.codigo || '—'} • Stock: ${p.stock}</div>
          </div>
          <div class="prod-price">${fmtPeso(p.precio)}</div>
        </div>
      `).join('');

      clienteProdSearchResults.querySelectorAll('.muni-search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = Number(item.dataset.id);
          const prod = clienteAllProducts.find(x => x.id === id);
          if (prod) {
            const existente = clienteCart.find(c => c.id === prod.id);
            if (existente) {
              existente.cantidad += 1;
            } else {
              clienteCart.push({
                id: prod.id,
                codigo: prod.codigo,
                nombre: prod.nombre,
                precio: prod.precio,
                stock: prod.stock,
                cantidad: 1
              });
            }
            clienteProdSearch.value = '';
            clienteProdSearchResults.innerHTML = '';
            clienteProdSearchResults.classList.remove('active');
            renderClienteCart();
          }
        });
      });
    }

    clienteProdSearchResults.classList.add('active');
  });

  document.addEventListener('click', (e) => {
    if (clienteProdSearchResults && !clienteProdSearch.contains(e.target) && !clienteProdSearchResults.contains(e.target)) {
      clienteProdSearchResults.classList.remove('active');
    }
  });

  function renderClienteCart() {
    if (!clienteSaleCartBody) return;

    if (clienteCart.length === 0) {
      clienteSaleCartBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">
            No hay productos agregados a esta venta. Buscá arriba para agregar.
          </td>
        </tr>
      `;
      clienteSaleCartTotal.textContent = fmtPeso(0);
      return;
    }

    clienteSaleCartBody.innerHTML = clienteCart.map(p => `
      <tr>
        <td><code style="font-family:monospace;">${p.codigo || '—'}</code></td>
        <td>
          <div style="font-weight:600;">${p.nombre}</div>
          <div style="font-size:11px; color:#ef4444;">Stock disponible: ${p.stock}</div>
        </td>
        <td style="text-align:center;">
          <input type="number" class="cliente-cart-qty" data-id="${p.id}" value="${p.cantidad}" min="1" step="1">
        </td>
        <td style="text-align:right;">${fmtPeso(p.precio)}</td>
        <td style="text-align:right; font-weight:600;">${fmtPeso(p.precio * p.cantidad)}</td>
        <td style="text-align:center;">
          <button type="button" class="btn-muni-action delete btn-cliente-cart-remove" data-id="${p.id}">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `).join('');

    clienteSaleCartBody.querySelectorAll('.cliente-cart-qty').forEach(input => {
      input.addEventListener('change', () => {
        const id = Number(input.dataset.id);
        const val = Math.max(1, parseInt(input.value) || 1);
        const item = clienteCart.find(c => c.id === id);
        if (item) {
          item.cantidad = val;
          renderClienteCart();
        }
      });
    });

    clienteSaleCartBody.querySelectorAll('.btn-cliente-cart-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        clienteCart = clienteCart.filter(c => c.id !== id);
        renderClienteCart();
      });
    });

    const total = clienteCart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    clienteSaleCartTotal.textContent = fmtPeso(total);
  }

  // Guardar Venta
  btnGuardarClienteSale?.addEventListener('click', async () => {
    const clienteId = Number(clienteSaleClienteSelect.value);
    if (!clienteId) {
      alert('Debes seleccionar un cliente.');
      return;
    }

    if (clienteCart.length === 0) {
      alert('Debes agregar al menos un producto a la venta.');
      return;
    }

    if (!clienteSaleFecha.value || !clienteSaleFechaCobro.value) {
      alert('Debes completar las fechas obligatorias.');
      return;
    }

    for (const item of clienteCart) {
      if (item.cantidad > item.stock) {
        alert(`Stock insuficiente para ${item.nombre}. Stock actual: ${item.stock}`);
        return;
      }
    }

    const total = clienteCart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    const saleObj = {
      cliente_id: clienteId,
      fecha: clienteSaleFecha.value,
      fecha_estimada_cobro: clienteSaleFechaCobro.value,
      comprobante: clienteSaleComprobante.value.trim(),
      observaciones: clienteSaleObs.value.trim(),
      productos: clienteCart.map(c => ({
        id: c.id,
        codigo: c.codigo,
        nombre: c.nombre,
        precio: c.precio,
        cantidad: c.cantidad
      })),
      total: total
    };

    try {
      const res = await window.electronAPI.clienteAddSale(saleObj);
      if (res.success) {
        mostrarToast('Venta a cuenta corriente guardada y stock descontado', 'success');
        cerrarClienteSale();
        await cargarSales();
      } else {
        mostrarToast('Error al guardar la venta: ' + res.error, 'error');
      }
    } catch (err) {
      console.error(err);
      mostrarToast('Error al procesar la venta', 'error');
    }
  });

  // ── PRÓXIMOS COBROS (VENCIMIENTOS) ──────────────────────────────────
  async function cargarVencimientos() {
    const tableBody = document.getElementById('clienteVencimientosTableBody');
    if (!tableBody) return;

    try {
      const list = await window.electronAPI.clienteGetUpcomingCollections();
      if (list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6"><div class="muni-empty"><i class="fas fa-calendar-check"></i><p>No hay cobros pendientes</p></div></td></tr>`;
        return;
      }

      tableBody.innerHTML = list.map(o => {
        const dias = diasHasta(o.fecha_estimada_cobro);
        let colorDias = '#059669';
        let textDias = `${dias} días`;

        if (dias <= 0) {
          colorDias = '#ef4444';
          textDias = dias === 0 ? 'Hoy' : `Vencido hace ${Math.abs(dias)} días`;
        } else if (dias <= 5) {
          colorDias = '#d97706';
        }

        return `
          <tr>
            <td><strong>${fmtFecha(o.fecha_estimada_cobro)}</strong></td>
            <td><strong>Venta #${o.id}</strong></td>
            <td><strong>${o.cliente_nombre || 'Cliente #' + o.cliente_id}</strong></td>
            <td>${fmtPeso(o.total)}</td>
            <td style="color:#ef4444; font-weight:700;">${fmtPeso(o.saldo_pendiente)}</td>
            <td style="color:${colorDias}; font-weight:bold;">${textDias}</td>
          </tr>
        `;
      }).join('');

    } catch (err) {
      console.error('Error cargando vencimientos cliente:', err);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#ef4444;">Error al cargar datos</td></tr>`;
    }
  }

  // ── ESTADÍSTICAS ───────────────────────────────────────────────────
  async function cargarStats() {
    try {
      const stats = await window.electronAPI.clienteGetStats();

      document.getElementById('clienteStatTotalVendido').textContent = fmtPeso(stats.totalVendido);
      document.getElementById('clienteStatTotalCobrado').textContent = fmtPeso(stats.totalCobrado);
      document.getElementById('clienteStatTotalPendiente').textContent = fmtPeso(stats.totalPendiente);
      document.getElementById('clienteStatCantVentas').textContent = stats.cantVentas;
      document.getElementById('clienteStatCantPendientes').textContent = stats.cantPendientes;
      document.getElementById('clienteStatCantCobradas').textContent = stats.cantCobradas;

      const topBody = document.getElementById('clienteStatTopDeudoresBody');
      if (topBody) {
        if (!stats.topDeudores || stats.topDeudores.length === 0) {
          topBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#94a3b8;">No hay deudores pendientes</td></tr>`;
        } else {
          topBody.innerHTML = stats.topDeudores.map(d => `
            <tr>
              <td><strong>${d.nombre}</strong></td>
              <td>${d.telefono || '—'}</td>
              <td style="text-align:right; color:#ef4444; font-weight:bold;">${fmtPeso(d.deuda)}</td>
            </tr>
          `).join('');
        }
      }

    } catch (err) {
      console.error('Error cargando estadísticas cliente:', err);
    }
  }

  // Carga inicial
  cargarSales();
}


// =====================================================================
// Módulo de Gastos
// =====================================================================
function initGastos() {
  let allGastos = [];
  let gastoEditandoId = null;

  // DOM Elements
  const gastosTableBody = document.getElementById('gastosTableBody');
  const btnNuevoGasto = document.getElementById('btnNuevoGasto');
  const modalNuevoGasto = document.getElementById('modalNuevoGasto');
  const btnCancelarGasto = document.getElementById('btnCancelarGasto');
  const formGasto = document.getElementById('formGasto');
  const gastoSearchInput = document.getElementById('gastoSearchInput');
  const gastoFiltroCategoria = document.getElementById('gastoFiltroCategoria');
  const gastoFiltroEstado = document.getElementById('gastoFiltroEstado');

  const txtTotalGastos = document.getElementById('txtTotalGastos');
  const txtGastosPagados = document.getElementById('txtGastosPagados');
  const txtGastosPendientes = document.getElementById('txtGastosPendientes');
  const txtCantGastos = document.getElementById('txtCantGastos');

  // Load and display expenses
  async function cargarGastos() {
    try {
      allGastos = await window.electronAPI.getGastos();
      renderGastos();
      actualizarResumen();
      
      // Update Finanzas if visible
      actualizarFinanzasGastos();
    } catch (err) {
      console.error('Error cargando gastos:', err);
    }
  }

  function renderGastos() {
    if (!gastosTableBody) return;

    const query = gastoSearchInput?.value.toLowerCase().trim() || '';
    const cat = gastoFiltroCategoria?.value || '';
    const est = gastoFiltroEstado?.value || '';

    const filtrados = allGastos.filter(g => {
      const matchQuery = !query || 
        g.concepto.toLowerCase().includes(query) || 
        (g.observacion && g.observacion.toLowerCase().includes(query));
      const matchCat = !cat || g.categoria === cat;
      const matchEst = !est || g.estado === est;

      return matchQuery && matchCat && matchEst;
    });

    if (filtrados.length === 0) {
      gastosTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 20px; color: var(--muted);">No se encontraron gastos.</td>
        </tr>
      `;
      return;
    }

    gastosTableBody.innerHTML = filtrados.map(g => {
      const dateStr = g.fecha ? g.fecha.split('-').reverse().join('/') : '-';
      const badgeClass = g.estado === 'Pagado' ? 'badge-pagado' : 'badge-pendiente';
      
      return `
        <tr data-id="${g.id}">
          <td>${dateStr}</td>
          <td style="font-weight: 600;">${g.concepto}</td>
          <td><span class="categoria-badge">${g.categoria}</span></td>
          <td style="font-weight: 700;">$${formatearMonedaArgentina(g.monto)}</td>
          <td><span class="${badgeClass}">${g.estado}</span></td>
          <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${g.observacion || '-'}</td>
          <td>
            <button class="gasto-action-btn edit" data-id="${g.id}" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="gasto-action-btn delete" data-id="${g.id}" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function actualizarResumen() {
    let total = 0;
    let pagado = 0;
    let pendiente = 0;

    allGastos.forEach(g => {
      const monto = Number(g.monto) || 0;
      total += monto;
      if (g.estado === 'Pagado') {
        pagado += monto;
      } else {
        pendiente += monto;
      }
    });

    if (txtTotalGastos) txtTotalGastos.textContent = `$${formatearMonedaArgentina(total)}`;
    if (txtGastosPagados) txtGastosPagados.textContent = `$${formatearMonedaArgentina(pagado)}`;
    if (txtGastosPendientes) txtGastosPendientes.textContent = `$${formatearMonedaArgentina(pendiente)}`;
    if (txtCantGastos) txtCantGastos.textContent = allGastos.length;
  }

  // Open modal for new gasto
  if (btnNuevoGasto) {
    btnNuevoGasto.addEventListener('click', () => {
      formGasto.reset();
      gastoEditandoId = null;
      document.getElementById('gastoId').value = '';
      document.getElementById('gastoModalTitle').innerHTML = '<i class="fas fa-wallet"></i> Registrar Gasto';
      document.getElementById('gastoFecha').value = new Date().toISOString().split('T')[0];
      modalNuevoGasto.classList.add('active');
    });
  }

  // Close modal
  if (btnCancelarGasto) {
    btnCancelarGasto.addEventListener('click', () => {
      modalNuevoGasto.classList.remove('active');
    });
  }

  // Form submit (Save/Edit)
  if (formGasto) {
    formGasto.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const gastoData = {
        id: gastoEditandoId,
        concepto: document.getElementById('gastoConcepto').value.trim(),
        categoria: document.getElementById('gastoCategoria').value,
        monto: parseFloat(document.getElementById('gastoMonto').value) || 0,
        fecha: document.getElementById('gastoFecha').value,
        estado: document.getElementById('gastoEstado').value,
        observacion: document.getElementById('gastoObservacion').value.trim()
      };

      try {
        const res = await window.electronAPI.saveGasto(gastoData);
        if (res.success) {
          modalNuevoGasto.classList.remove('active');
          mostrarToast(gastoEditandoId ? 'Gasto actualizado con éxito' : 'Gasto registrado con éxito', 'success');
          await cargarGastos();
        } else {
          mostrarToast('Error al guardar el gasto: ' + res.error, 'error');
        }
      } catch (err) {
        console.error('Error submit gasto:', err);
        mostrarToast('Error al guardar el gasto', 'error');
      }
    });
  }

  // Listeners for filters and search
  gastoSearchInput?.addEventListener('input', renderGastos);
  gastoFiltroCategoria?.addEventListener('change', renderGastos);
  gastoFiltroEstado?.addEventListener('change', renderGastos);

  // Table actions (edit/delete)
  gastosTableBody?.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.gasto-action-btn.edit');
    const deleteBtn = e.target.closest('.gasto-action-btn.delete');

    if (editBtn) {
      const id = parseInt(editBtn.dataset.id);
      const gasto = allGastos.find(g => g.id === id);
      if (gasto) {
        gastoEditandoId = id;
        document.getElementById('gastoId').value = id;
        document.getElementById('gastoModalTitle').innerHTML = '<i class="fas fa-edit"></i> Editar Gasto';
        document.getElementById('gastoConcepto').value = gasto.concepto;
        document.getElementById('gastoCategoria').value = gasto.categoria;
        document.getElementById('gastoMonto').value = gasto.monto;
        document.getElementById('gastoFecha').value = gasto.fecha;
        document.getElementById('gastoEstado').value = gasto.estado;
        document.getElementById('gastoObservacion').value = gasto.observacion || '';
        modalNuevoGasto.classList.add('active');
      }
    } else if (deleteBtn) {
      const id = parseInt(deleteBtn.dataset.id);
      if (confirm('¿Estás seguro de eliminar este gasto?')) {
        try {
          const res = await window.electronAPI.deleteGasto(id);
          if (res.success) {
            mostrarToast('Gasto eliminado', 'success');
            await cargarGastos();
          } else {
            mostrarToast('Error al eliminar: ' + res.error, 'error');
          }
        } catch (err) {
          console.error(err);
          mostrarToast('Error al eliminar', 'error');
        }
      }
    }
  });

  // Initial load
  cargarGastos();
}

function initAjustesCaja() {
  let allAjustes = [];
  let allVentasParaAjuste = [];
  let allGastosParaAjuste = [];

  // DOM Elements
  const TableBody = document.getElementById('ajustesTableBody');
  const btnNuevoAjuste = document.getElementById('btnNuevoAjuste');
  const modalNuevoAjuste = document.getElementById('modalNuevoAjuste');
  const btnCerrarModal = document.getElementById('btnCerrarAjusteModal');
  const btnCancelar = document.getElementById('btnCancelarAjuste');
  const formAjuste = document.getElementById('formAjuste');

  const txtPositivos = document.getElementById('txtAjustesPositivos');
  const txtNegativos = document.getElementById('txtAjustesNegativos');
  const txtBalance = document.getElementById('txtBalanceAjustes');
  const txtCantidad = document.getElementById('txtCantAjustes');

  // Operation radios & containers
  const operacionRadios = document.querySelectorAll('input[name="ajusteOperacionTipo"]');
  const ventaContainer = document.getElementById('ajusteVentaBusquedaContainer');
  const ventaSearchInput = document.getElementById('ajusteVentaSearchInput');
  const ventaResultsContainer = document.getElementById('ajusteVentaSearchResults');
  const ventaSeleccionadaContainer = document.getElementById('ajusteVentaSeleccionada');
  const ventaIdInput = document.getElementById('ajusteVentaId');

  const gastoContainer = document.getElementById('ajusteGastoBusquedaContainer');
  const gastoSearchInput = document.getElementById('ajusteGastoSearchInput');
  const gastoResultsContainer = document.getElementById('ajusteGastoSearchResults');
  const gastoSeleccionadoContainer = document.getElementById('ajusteGastoSeleccionado');
  const gastoInfoInput = document.getElementById('ajusteGastoInfo');

  const ajusteTipoSelect = document.getElementById('ajusteTipo');

  async function cargarAjustes() {
    try {
      allAjustes = await window.electronAPI.getAjustes();
      renderAjustes();
      actualizarResumen();
    } catch (err) {
      console.error('Error cargando ajustes:', err);
    }
  }

  async function cargarVentasParaAjuste() {
    try {
      const tickets = await window.electronAPI.getTickets();
      allVentasParaAjuste = (tickets || []).filter(t => (t.tipo || 'Venta') === 'Venta');
      renderListaVentas(allVentasParaAjuste.slice(0, 10));
    } catch (err) {
      console.error('Error cargando ventas para buscador:', err);
    }
  }

  async function cargarGastosParaAjuste() {
    try {
      const gastos = await window.electronAPI.getGastos();
      allGastosParaAjuste = gastos || [];
      renderListaGastos(allGastosParaAjuste.slice(0, 10));
    } catch (err) {
      console.error('Error cargando gastos para buscador:', err);
    }
  }

  function renderListaVentas(list) {
    if (!ventaResultsContainer) return;
    if (!list || list.length === 0) {
      ventaResultsContainer.innerHTML = '<div style="padding: 10px; color: var(--muted); text-align: center;">No se encontraron ventas</div>';
      return;
    }

    ventaResultsContainer.innerHTML = list.map(t => {
      const dateFormatted = t.fecha ? (t.fecha.includes('T') ? t.fecha.split('T')[0] : t.fecha.split(' ')[0]).split('-').reverse().join('/') : '-';
      const clienteStr = t.cliente ? ` | Cliente: ${t.cliente}` : '';
      const totalStr = formatearMonedaArgentina(t.total || 0);
      const desc = `Ticket #${t.id} — ${dateFormatted}${clienteStr} — $${totalStr}`;
      return `
        <div class="search-result-item venta-item" data-id="${t.id}" data-text="${desc}" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #e2e8f0; transition: background 0.15s;">
          ${desc}
        </div>
      `;
    }).join('');
  }

  function renderListaGastos(list) {
    if (!gastoResultsContainer) return;
    if (!list || list.length === 0) {
      gastoResultsContainer.innerHTML = '<div style="padding: 10px; color: var(--muted); text-align: center;">No se encontraron gastos</div>';
      return;
    }

    gastoResultsContainer.innerHTML = list.map(g => {
      const dateFormatted = g.fecha ? (g.fecha.includes('T') ? g.fecha.split('T')[0] : g.fecha.split(' ')[0]).split('-').reverse().join('/') : '-';
      const montoStr = formatearMonedaArgentina(g.monto || 0);
      const desc = `Gasto #${g.id} — ${dateFormatted} — ${g.concepto || 'Sin concepto'} — $${montoStr}`;
      return `
        <div class="search-result-item gasto-item" data-id="${g.id}" data-concepto="${g.concepto || ''}" data-text="${desc}" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #e2e8f0; transition: background 0.15s;">
          ${desc}
        </div>
      `;
    }).join('');
  }

  function renderAjustes() {
    if (!TableBody) return;

    if (allAjustes.length === 0) {
      TableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 20px; color: var(--muted);">No se encontraron ajustes de caja.</td>
        </tr>
      `;
      return;
    }

    TableBody.innerHTML = allAjustes.map(a => {
      let dateStr = '-';
      if (a.fecha) {
        const parts = a.fecha.split(' ');
        const datePart = parts[0].split('-').reverse().join('/');
        const timePart = parts[1] ? ' ' + parts[1] : '';
        dateStr = datePart + timePart;
      }
      const isPositivo = a.monto >= 0;
      const montoFormateado = formatearMonedaArgentina(Math.abs(a.monto));
      const badgeStyle = isPositivo 
        ? 'background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 20px; font-weight: 600;' 
        : 'background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 20px; font-weight: 600;';
        
      const ventaAsociada = a.venta_id ? `#${a.venta_id}` : '—';

      return `
        <tr data-id="${a.id}">
          <td>${dateStr}</td>
          <td><span style="${badgeStyle}">${a.tipo}</span></td>
          <td style="font-weight: 600;">${a.motivo}</td>
          <td style="font-weight: 700; color: ${isPositivo ? '#10b981' : '#ef4444'};">
            ${isPositivo ? '+' : '-'}$${montoFormateado}
          </td>
          <td style="font-weight: 600;">${ventaAsociada}</td>
          <td>${a.observacion || '-'}</td>
          <td>
            <button class="gasto-action-btn delete" data-id="${a.id}" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function actualizarResumen() {
    let positivos = 0;
    let negativos = 0;

    allAjustes.forEach(a => {
      const monto = Number(a.monto) || 0;
      if (monto >= 0) {
        positivos += monto;
      } else {
        negativos += monto;
      }
    });

    const balance = positivos + negativos;

    if (txtPositivos) txtPositivos.textContent = `+$${formatearMonedaArgentina(positivos)}`;
    if (txtNegativos) txtNegativos.textContent = `-$${formatearMonedaArgentina(Math.abs(negativos))}`;
    if (txtBalance) {
      txtBalance.textContent = (balance >= 0 ? '+' : '-') + `$${formatearMonedaArgentina(Math.abs(balance))}`;
      txtBalance.style.color = balance >= 0 ? '#10b981' : '#ef4444';
    }
    if (txtCantidad) txtCantidad.textContent = allAjustes.length;
  }

  function limpiarSeleccionesOperacion() {
    if (ventaSearchInput) ventaSearchInput.value = '';
    if (ventaIdInput) ventaIdInput.value = '';
    if (ventaSeleccionadaContainer) {
      ventaSeleccionadaContainer.textContent = '';
      ventaSeleccionadaContainer.style.display = 'none';
    }

    if (gastoSearchInput) gastoSearchInput.value = '';
    if (gastoInfoInput) gastoInfoInput.value = '';
    if (gastoSeleccionadoContainer) {
      gastoSeleccionadoContainer.textContent = '';
      gastoSeleccionadoContainer.style.display = 'none';
    }
  }

  // Toggle operation type radios
  operacionRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const val = radio.value;
      limpiarSeleccionesOperacion();

      if (val === 'venta') {
        if (ventaContainer) ventaContainer.style.display = 'block';
        if (gastoContainer) gastoContainer.style.display = 'none';
        cargarVentasParaAjuste();
      } else if (val === 'gasto') {
        if (gastoContainer) gastoContainer.style.display = 'block';
        if (ventaContainer) ventaContainer.style.display = 'none';
        cargarGastosParaAjuste();
      } else {
        if (ventaContainer) ventaContainer.style.display = 'none';
        if (gastoContainer) gastoContainer.style.display = 'none';
      }
    });
  });

  // Filter sales list
  if (ventaSearchInput) {
    ventaSearchInput.addEventListener('input', () => {
      const q = ventaSearchInput.value.toLowerCase().trim();
      if (!q) {
        renderListaVentas(allVentasParaAjuste.slice(0, 10));
        return;
      }
      const matches = allVentasParaAjuste.filter(t => {
        const ticketNo = String(t.id).toLowerCase();
        const cliente = (t.cliente || '').toLowerCase();
        const total = String(t.total).toLowerCase();
        const fecha = t.fecha ? t.fecha.toLowerCase() : '';
        return ticketNo.includes(q) || cliente.includes(q) || total.includes(q) || fecha.includes(q);
      }).slice(0, 10);
      renderListaVentas(matches);
    });
  }

  // Filter expenses list
  if (gastoSearchInput) {
    gastoSearchInput.addEventListener('input', () => {
      const q = gastoSearchInput.value.toLowerCase().trim();
      if (!q) {
        renderListaGastos(allGastosParaAjuste.slice(0, 10));
        return;
      }
      const matches = allGastosParaAjuste.filter(g => {
        const idStr = String(g.id).toLowerCase();
        const concepto = (g.concepto || '').toLowerCase();
        const monto = String(g.monto).toLowerCase();
        const fecha = g.fecha ? g.fecha.toLowerCase() : '';
        return idStr.includes(q) || concepto.includes(q) || monto.includes(q) || fecha.includes(q);
      }).slice(0, 10);
      renderListaGastos(matches);
    });
  }

  // Click on sale item
  ventaResultsContainer?.addEventListener('click', (e) => {
    const item = e.target.closest('.venta-item');
    if (item) {
      const ticketId = item.dataset.id;
      const text = item.dataset.text;
      if (ventaIdInput) ventaIdInput.value = ticketId;
      if (ventaSeleccionadaContainer) {
        ventaSeleccionadaContainer.textContent = `Venta Seleccionada: ${text}`;
        ventaSeleccionadaContainer.style.display = 'block';
      }
    }
  });

  // Click on expense item
  gastoResultsContainer?.addEventListener('click', (e) => {
    const item = e.target.closest('.gasto-item');
    if (item) {
      const id = item.dataset.id;
      const concepto = item.dataset.concepto;
      const text = item.dataset.text;
      if (gastoInfoInput) gastoInfoInput.value = `[Gasto #${id}: ${concepto}]`;
      if (gastoSeleccionadoContainer) {
        gastoSeleccionadoContainer.textContent = `Gasto Seleccionado: ${text}`;
        gastoSeleccionadoContainer.style.display = 'block';
      }
    }
  });

  // If "Venta anulada" is selected in tipo, automatically switch radio to "venta"
  if (ajusteTipoSelect) {
    ajusteTipoSelect.addEventListener('change', () => {
      if (ajusteTipoSelect.value === 'Venta anulada') {
        const ventaRadio = document.querySelector('input[name="ajusteOperacionTipo"][value="venta"]');
        if (ventaRadio && !ventaRadio.checked) {
          ventaRadio.checked = true;
          ventaRadio.dispatchEvent(new Event('change'));
        }
      }
    });
  }

  // Abrir modal
  if (btnNuevoAjuste) {
    btnNuevoAjuste.addEventListener('click', () => {
      formAjuste.reset();
      limpiarSeleccionesOperacion();
      const ningunaRadio = document.querySelector('input[name="ajusteOperacionTipo"][value="ninguna"]');
      if (ningunaRadio) ningunaRadio.checked = true;
      if (ventaContainer) ventaContainer.style.display = 'none';
      if (gastoContainer) gastoContainer.style.display = 'none';
      document.getElementById('ajusteFecha').value = new Date().toISOString().split('T')[0];
      modalNuevoAjuste.classList.add('active');
    });
  }

  // Cerrar modal
  const closeModal = () => modalNuevoAjuste?.classList.remove('active');
  if (btnCerrarModal) btnCerrarModal.addEventListener('click', closeModal);
  if (btnCancelar) btnCancelar.addEventListener('click', closeModal);

  // Form Submit
  if (formAjuste) {
    formAjuste.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const efecto = document.getElementById('ajusteEfecto').value;
      let rawMonto = parseFloat(document.getElementById('ajusteMonto').value) || 0;
      const finalMonto = efecto === 'Egreso' ? -Math.abs(rawMonto) : Math.abs(rawMonto);

      const operacionTipo = document.querySelector('input[name="ajusteOperacionTipo"]:checked')?.value || 'ninguna';
      const ventaIdVal = (operacionTipo === 'venta' && ventaIdInput.value) ? parseInt(ventaIdInput.value) : null;
      
      let rawObservacion = document.getElementById('ajusteObservacion').value.trim();
      if (operacionTipo === 'gasto' && gastoInfoInput && gastoInfoInput.value) {
        rawObservacion = rawObservacion 
          ? `${rawObservacion} ${gastoInfoInput.value}`
          : gastoInfoInput.value;
      }

      const ajusteData = {
        tipo: document.getElementById('ajusteTipo').value,
        monto: finalMonto,
        motivo: document.getElementById('ajusteMotivo').value.trim(),
        fecha: (() => {
          const chosenDate = document.getElementById('ajusteFecha').value;
          const pad = (n) => String(n).padStart(2, '0');
          const now = new Date();
          return `${chosenDate} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        })(),
        observacion: rawObservacion,
        venta_id: ventaIdVal
      };

      try {
        const res = await window.electronAPI.saveAjuste(ajusteData);
        if (res.success) {
          closeModal();
          mostrarToast('Ajuste de caja guardado con éxito', 'success');
          await cargarAjustes();
          
          // Actualizar dashboard si está activo
          if (typeof window.__updateFinanzasChart === 'function') {
            window.__updateFinanzasChart();
          }
        } else {
          mostrarToast('Error al guardar el ajuste: ' + res.error, 'error');
        }
      } catch (err) {
        console.error('Error submit ajuste:', err);
        mostrarToast('Error al guardar el ajuste', 'error');
      }
    });
  }

  // Eliminar
  TableBody?.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.gasto-action-btn.delete');
    if (deleteBtn) {
      const id = parseInt(deleteBtn.dataset.id);
      if (confirm('¿Estás seguro de eliminar este ajuste de caja?')) {
        try {
          const res = await window.electronAPI.deleteAjuste(id);
          if (res.success) {
            mostrarToast('Ajuste eliminado', 'success');
            await cargarAjustes();
            
            // Actualizar dashboard si está activo
            if (typeof window.__updateFinanzasChart === 'function') {
              window.__updateFinanzasChart();
            }
          } else {
            mostrarToast('Error al eliminar: ' + res.error, 'error');
          }
        } catch (err) {
          console.error(err);
          mostrarToast('Error al eliminar', 'error');
        }
      }
    }
  });

  cargarAjustes();
}


function actualizarFinanzasGastos() {
  if (document.getElementById('totalVentas') && typeof window.__updateFinanzasChart === 'function') {
    window.__updateFinanzasChart();
  }
}


// =====================================================================
// Módulo de Cuenta Corriente Atmosférico
// =====================================================================
function initAtmosferico() {
  let allOrders = [];
  let selectedOrderIdForPayment = null;

  // Elementos DOM
  const atmosTableBody = document.getElementById('atmosTableBody');
  const atmosSearchInput = document.getElementById('atmosSearchInput');
  const atmosFiltroEstado = document.getElementById('atmosFiltroEstado');

  const btnNuevoServicioAtmos = document.getElementById('btnNuevoServicioAtmos');
  const modalAtmosOrder = document.getElementById('modalAtmosOrder');
  const btnCloseAtmosOrder = document.getElementById('btnCloseAtmosOrder');
  const btnCancelarAtmosOrder = document.getElementById('btnCancelarAtmosOrder');
  const btnGuardarAtmosOrder = document.getElementById('btnGuardarAtmosOrder');

  const formAtmosOrder = document.getElementById('formAtmosOrder');
  const atmosOrderFecha = document.getElementById('atmosOrderFecha');
  const atmosOrderCliente = document.getElementById('atmosOrderCliente');
  const atmosOrderDireccion = document.getElementById('atmosOrderDireccion');
  const atmosOrderTelefono = document.getElementById('atmosOrderTelefono');
  const atmosOrderTipoServicio = document.getElementById('atmosOrderTipoServicio');
  const groupAtmosTipoOtro = document.getElementById('groupAtmosTipoOtro');
  const atmosOrderTipoOtro = document.getElementById('atmosOrderTipoOtro');
  const atmosOrderDesc = document.getElementById('atmosOrderDesc');
  const atmosOrderMonto = document.getElementById('atmosOrderMonto');
  const atmosOrderFechaCobro = document.getElementById('atmosOrderFechaCobro');
  const atmosOrderObs = document.getElementById('atmosOrderObs');

  const modalAtmosOrderDetail = document.getElementById('modalAtmosOrderDetail');
  const btnCloseAtmosOrderDetail = document.getElementById('btnCloseAtmosOrderDetail');
  const btnCerrarAtmosOrderDetail = document.getElementById('btnCerrarAtmosOrderDetail');

  const modalAtmosPayment = document.getElementById('modalAtmosPayment');
  const btnCloseAtmosPayment = document.getElementById('btnCloseAtmosPayment');
  const btnCancelarAtmosPayment = document.getElementById('btnCancelarAtmosPayment');
  const btnGuardarAtmosPayment = document.getElementById('btnGuardarAtmosPayment');
  const btnRegistrarCobroAtmos = document.getElementById('btnRegistrarCobroAtmos');

  const formAtmosPayment = document.getElementById('formAtmosPayment');
  const atmosPayFecha = document.getElementById('atmosPayFecha');
  const atmosPayMonto = document.getElementById('atmosPayMonto');
  const atmosPayMetodo = document.getElementById('atmosPayMetodo');
  const atmosPayObs = document.getElementById('atmosPayObs');

  // Helpers
  const fmtPeso = (n) => {
    const v = parseFloat(n) || 0;
    return `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fmtFecha = (f) => {
    if (!f) return '—';
    const parts = f.split('-');
    if (parts.length !== 3) return f;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const diasHasta = (fecha) => {
    if (!fecha) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vto = new Date(fecha + 'T00:00:00');
    return Math.round((vto - hoy) / 86400000);
  };

  const badgeMuni = (est) => {
    const k = (est || '').toLowerCase().trim();
    if (k === 'pendiente') return `<span class="muni-badge pendiente">Pendiente</span>`;
    if (k === 'pago parcial') return `<span class="muni-badge parcial">Pago parcial</span>`;
    if (k === 'cobrado') return `<span class="muni-badge cobrado">Cobrado</span>`;
    return `<span class="muni-badge">${est || '—'}</span>`;
  };

  // Selector "Otro" en tipo de servicio
  atmosOrderTipoServicio?.addEventListener('change', () => {
    if (atmosOrderTipoServicio.value === 'Otro') {
      groupAtmosTipoOtro.style.display = 'flex';
      atmosOrderTipoOtro.setAttribute('required', 'required');
    } else {
      groupAtmosTipoOtro.style.display = 'none';
      atmosOrderTipoOtro.removeAttribute('required');
    }
  });

  // Tabs
  const tabBtns = document.querySelectorAll('.muni-tab-btn');
  const tabSections = document.querySelectorAll('.muni-tab-section');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Solo actuar si estamos en la página de atmosferico
      const parentPage = btn.closest('.municipio-page');
      if (!parentPage || !document.getElementById('tab-atmos-servicios')) return;
      
      const tabId = btn.dataset.tab;
      if (!tabId.startsWith('atmos-')) return; // Evitar tocar tabs de Municipio

      tabBtns.forEach(b => {
        if (b.dataset.tab.startsWith('atmos-')) b.classList.remove('active');
      });
      tabSections.forEach(s => {
        if (s.id.startsWith('tab-atmos-')) s.classList.remove('active');
      });

      btn.classList.add('active');
      const sec = document.getElementById('tab-' + tabId);
      if (sec) sec.classList.add('active');

      if (tabId === 'atmos-servicios') {
        cargarOrders();
      } else if (tabId === 'atmos-vencimientos') {
        cargarVencimientos();
      } else if (tabId === 'atmos-stats') {
        cargarStats();
      }
    });
  });

  // Cargar Servicios
  async function cargarOrders() {
    try {
      allOrders = await window.electronAPI.atmosGetOrders();
      renderOrdersTable();
      cargarStats();
      cargarVencimientos();
    } catch (err) {
      console.error('Error cargando órdenes atmosférico:', err);
    }
  }

  function renderOrdersTable() {
    if (!atmosTableBody) return;

    const searchTerm = (atmosSearchInput?.value || '').toLowerCase().trim();
    const filterEstado = atmosFiltroEstado?.value || '';

    const filtered = allOrders.filter(o => {
      const matchSearch = !searchTerm || 
        o.id.toString().includes(searchTerm) ||
        (o.cliente || '').toLowerCase().includes(searchTerm) ||
        (o.direccion || '').toLowerCase().includes(searchTerm) ||
        (o.tipo_servicio || '').toLowerCase().includes(searchTerm) ||
        (o.descripcion || '').toLowerCase().includes(searchTerm) ||
        (o.observaciones || '').toLowerCase().includes(searchTerm);

      const matchEstado = !filterEstado || o.estado === filterEstado;

      return matchSearch && matchEstado;
    });

    if (filtered.length === 0) {
      atmosTableBody.innerHTML = `
        <tr>
          <td colspan="10">
            <div class="muni-empty">
              <span style="font-size:36px; margin-bottom:12px; display:block;">🚛</span>
              <p>No se encontraron servicios</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    atmosTableBody.innerHTML = filtered.map(o => `
      <tr>
        <td><strong>#${o.id}</strong></td>
        <td>${fmtFecha(o.fecha)}</td>
        <td><strong>${o.cliente}</strong>${o.telefono ? `<br><small style="color:#64748b;">Tel: ${o.telefono}</small>` : ''}</td>
        <td>${o.direccion}</td>
        <td>
          <div style="font-weight:600;">${o.tipo_servicio}</div>
          <div style="font-size:11.5px; color:#64748b;">${o.descripcion || '—'}</div>
        </td>
        <td><strong>${fmtPeso(o.monto)}</strong></td>
        <td>${fmtFecha(o.fecha_estimada_cobro)}</td>
        <td>${badgeMuni(o.estado)}</td>
        <td style="color:${o.saldo_pendiente > 0 ? '#ef4444' : '#059669'}; font-weight:700;">
          ${fmtPeso(o.saldo_pendiente)}
        </td>
        <td>
          <button class="btn-muni-action btn-detail" data-id="${o.id}" title="Ver Detalle / Cobros">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn-muni-action delete btn-delete" data-id="${o.id}" title="Eliminar Servicio">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `).join('');

    // Bind events
    atmosTableBody.querySelectorAll('.btn-detail').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        verDetalleOrden(id);
      });
    });

    atmosTableBody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        eliminarOrden(id);
      });
    });
  }

  // Filtros
  atmosSearchInput?.addEventListener('input', renderOrdersTable);
  atmosFiltroEstado?.addEventListener('change', renderOrdersTable);

  // Eliminar Orden
  async function eliminarOrden(id) {
    if (confirm(`¿Estás seguro de eliminar el Servicio #${id}? Esta acción eliminará sus cobros asociados.`)) {
      try {
        const res = await window.electronAPI.atmosDeleteOrder(id);
        if (res.success) {
          mostrarToast('Servicio eliminado correctamente', 'success');
          await cargarOrders();
          if (window.__updateFinanzasChart) window.__updateFinanzasChart();
        } else {
          mostrarToast('Error al eliminar el servicio: ' + res.error, 'error');
        }
      } catch (err) {
        console.error(err);
        mostrarToast('Error al eliminar servicio', 'error');
      }
    }
  }

  // Ver Detalle
  async function verDetalleOrden(id) {
    const orden = allOrders.find(o => o.id === id);
    if (!orden) return;

    selectedOrderIdForPayment = id;

    document.getElementById('detailAtmosOrderId').textContent = orden.id;
    document.getElementById('detailAtmosOrderFecha').textContent = fmtFecha(orden.fecha);
    document.getElementById('detailAtmosOrderCliente').textContent = orden.cliente || '—';
    document.getElementById('detailAtmosOrderDireccion').textContent = orden.direccion || '—';
    document.getElementById('detailAtmosOrderTelefono').textContent = orden.telefono || '—';
    document.getElementById('detailAtmosOrderTipo').textContent = orden.tipo_servicio;
    document.getElementById('detailAtmosOrderDesc').textContent = orden.descripcion || '—';
    document.getElementById('detailAtmosOrderFechaCobro').textContent = fmtFecha(orden.fecha_estimada_cobro);
    document.getElementById('detailAtmosOrderEstado').innerHTML = badgeMuni(orden.estado);
    document.getElementById('detailAtmosOrderObs').textContent = orden.observaciones || '—';
    document.getElementById('detailAtmosOrderTotal').textContent = fmtPeso(orden.monto);
    document.getElementById('detailAtmosOrderSaldo').textContent = fmtPeso(orden.saldo_pendiente);

    // Cargar Historial de Pagos
    await cargarPagosOrden(id, orden.saldo_pendiente);

    modalAtmosOrderDetail?.classList.add('active');
  }

  async function cargarPagosOrden(id, saldoPendiente) {
    const paymentsTable = document.getElementById('detailAtmosPaymentsTableBody');
    try {
      const payments = await window.electronAPI.atmosGetPayments(id);
      
      // Control de botón "Registrar Cobro"
      if (saldoPendiente <= 0) {
        btnRegistrarCobroAtmos.style.display = 'none';
      } else {
        btnRegistrarCobroAtmos.style.display = 'inline-flex';
      }

      if (payments.length === 0) {
        paymentsTable.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:15px;">No hay cobros registrados para este servicio.</td></tr>`;
      } else {
        paymentsTable.innerHTML = payments.map(p => `
          <tr>
            <td>${fmtFecha(p.fecha)}</td>
            <td><span class="muni-badge parcial">${p.metodo_pago}</span></td>
            <td style="text-align:right; font-weight:bold; color:#059669;">${fmtPeso(p.monto)}</td>
            <td>${p.observaciones || '—'}</td>
          </tr>
        `).join('');
      }
    } catch (err) {
      console.error(err);
      paymentsTable.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#ef4444;">Error al cargar cobros</td></tr>`;
    }
  }

  // Nuevo Servicio Eventos
  btnNuevoServicioAtmos?.addEventListener('click', () => {
    formAtmosOrder?.reset();
    groupAtmosTipoOtro.style.display = 'none';
    
    // Set default date to today
    const hoy = new Date().toISOString().split('T')[0];
    atmosOrderFecha.value = hoy;
    atmosOrderFechaCobro.value = hoy;

    modalAtmosOrder?.classList.add('active');
  });

  const cerrarAtmosOrder = () => {
    modalAtmosOrder?.classList.remove('active');
  };
  btnCloseAtmosOrder?.addEventListener('click', cerrarAtmosOrder);
  btnCancelarAtmosOrder?.addEventListener('click', cerrarAtmosOrder);

  // Guardar Servicio
  btnGuardarAtmosOrder?.addEventListener('click', async () => {
    if (!atmosOrderCliente.value.trim() || !atmosOrderDireccion.value.trim() || !atmosOrderDesc.value.trim() || !atmosOrderMonto.value) {
      alert('Debes completar todos los campos obligatorios.');
      return;
    }

    if (!atmosOrderFecha.value || !atmosOrderFechaCobro.value) {
      alert('Debes completar las fechas obligatorias.');
      return;
    }

    const monto = parseFloat(atmosOrderMonto.value) || 0;
    if (monto <= 0) {
      alert('El monto total del servicio debe ser mayor a cero.');
      return;
    }

    let tipoServicioFinal = atmosOrderTipoServicio.value;
    if (tipoServicioFinal === 'Otro') {
      const otroTexto = atmosOrderTipoOtro.value.trim();
      if (!otroTexto) {
        alert('Debes especificar la descripción para "Otro" tipo de servicio.');
        return;
      }
      tipoServicioFinal = otroTexto;
    }

    const orderObj = {
      fecha: atmosOrderFecha.value,
      cliente: atmosOrderCliente.value.trim(),
      direccion: atmosOrderDireccion.value.trim(),
      telefono: atmosOrderTelefono.value.trim(),
      tipo_servicio: tipoServicioFinal,
      descripcion: atmosOrderDesc.value.trim(),
      monto: monto,
      fecha_estimada_cobro: atmosOrderFechaCobro.value,
      observaciones: atmosOrderObs.value.trim()
    };

    try {
      const res = await window.electronAPI.atmosAddOrder(orderObj);
      if (res.success) {
        mostrarToast('Servicio de camión atmosférico guardado correctamente', 'success');
        cerrarAtmosOrder();
        await cargarOrders();
        if (window.__updateFinanzasChart) window.__updateFinanzasChart();
      } else {
        mostrarToast('Error al guardar el servicio: ' + res.error, 'error');
      }
    } catch (err) {
      console.error(err);
      mostrarToast('Error al procesar el servicio', 'error');
    }
  });

  // Cerrar Detalle
  const cerrarAtmosOrderDetail = () => {
    modalAtmosOrderDetail?.classList.remove('active');
  };
  btnCloseAtmosOrderDetail?.addEventListener('click', cerrarAtmosOrderDetail);
  btnCerrarAtmosOrderDetail?.addEventListener('click', cerrarAtmosOrderDetail);

  // Registrar Cobro Dialog
  btnRegistrarCobroAtmos?.addEventListener('click', () => {
    const orden = allOrders.find(o => o.id === selectedOrderIdForPayment);
    if (!orden) return;

    formAtmosPayment?.reset();
    
    // Set default values
    const hoy = new Date().toISOString().split('T')[0];
    atmosPayFecha.value = hoy;
    atmosPayMonto.value = orden.saldo_pendiente;

    modalAtmosPayment?.classList.add('active');
  });

  const cerrarAtmosPayment = () => {
    modalAtmosPayment?.classList.remove('active');
  };
  btnCloseAtmosPayment?.addEventListener('click', cerrarAtmosPayment);
  btnCancelarAtmosPayment?.addEventListener('click', cerrarAtmosPayment);

  // Guardar Cobro
  btnGuardarAtmosPayment?.addEventListener('click', async () => {
    const monto = parseFloat(atmosPayMonto.value) || 0;
    if (monto <= 0) {
      alert('El monto del cobro debe ser mayor a cero.');
      return;
    }

    const orden = allOrders.find(o => o.id === selectedOrderIdForPayment);
    if (!orden) return;

    if (monto > orden.saldo_pendiente) {
      alert(`El monto ingresado ($${monto}) excede el saldo pendiente ($${orden.saldo_pendiente})`);
      return;
    }

    const paymentObj = {
      orden_id: selectedOrderIdForPayment,
      fecha: atmosPayFecha.value,
      monto: monto,
      metodo_pago: atmosPayMetodo.value,
      observaciones: atmosPayObs.value.trim()
    };

    try {
      const res = await window.electronAPI.atmosAddPayment(paymentObj);
      if (res.success) {
        mostrarToast('Cobro registrado correctamente', 'success');
        cerrarAtmosPayment();
        
        // Recargar detalle y listado
        await cargarOrders();
        verDetalleOrden(selectedOrderIdForPayment);
        if (window.__updateFinanzasChart) window.__updateFinanzasChart();
      } else {
        mostrarToast('Error al registrar cobro: ' + res.error, 'error');
      }
    } catch (err) {
      console.error(err);
      mostrarToast('Error al registrar cobro', 'error');
    }
  });

  // Cargar Vencimientos / Próximos Cobros
  async function cargarVencimientos() {
    const tableBody = document.getElementById('atmosVencimientosTableBody');
    if (!tableBody) return;

    try {
      const list = await window.electronAPI.atmosGetUpcomingCollections();
      if (list.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="6">
              <div class="muni-empty">
                <i class="fas fa-calendar-check"></i>
                <p>No hay cobros pendientes</p>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = list.map(o => {
        const dias = diasHasta(o.fecha_estimada_cobro);
        let colorDias = '#059669'; // Green
        let textDias = `${dias} días`;

        if (dias <= 0) {
          colorDias = '#ef4444'; // Red
          textDias = dias === 0 ? 'Hoy' : `Vencido hace ${Math.abs(dias)} días`;
        } else if (dias <= 5) {
          colorDias = '#d97706'; // Orange
        }

        return `
          <tr>
            <td><strong>${fmtFecha(o.fecha_estimada_cobro)}</strong></td>
            <td><strong>Servicio #${o.id}</strong></td>
            <td><strong>${o.cliente}</strong></td>
            <td>${fmtPeso(o.monto)}</td>
            <td style="color:#ef4444; font-weight:700;">${fmtPeso(o.saldo_pendiente)}</td>
            <td style="color:${colorDias}; font-weight:bold;">${textDias}</td>
          </tr>
        `;
      }).join('');

    } catch (err) {
      console.error('Error cargando vencimientos atmosférico:', err);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#ef4444;">Error al cargar datos</td></tr>`;
    }
  }

  // Cargar Estadísticas
  async function cargarStats() {
    try {
      const stats = await window.electronAPI.atmosGetStats();

      document.getElementById('atmosStatTotalVendido').textContent = fmtPeso(stats.totalVendido);
      document.getElementById('atmosStatTotalCobrado').textContent = fmtPeso(stats.totalCobrado);
      document.getElementById('atmosStatTotalPendiente').textContent = fmtPeso(stats.totalPendiente);
      document.getElementById('atmosStatCantOrdenes').textContent = stats.cantOrdenes;
      document.getElementById('atmosStatCantPendientes').textContent = stats.cantPendientes;
      document.getElementById('atmosStatCantCobradas').textContent = stats.cantCobradas;

    } catch (err) {
      console.error('Error cargando estadísticas atmosférico:', err);
    }
  }

  // Carga inicial
  cargarOrders();
}


// Al final del archivo, antes del último cierre
window.addEventListener('beforeunload', () => {
  // Limpiar bandera de inicialización cuando se cierra la app
  window.__inventarioInicializado = false;
});

// ── Sidebar: Help Center & Logout ─────────────────────────────────────────────

document.getElementById('sidebarLogout')?.addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    if (window.electronAPI && window.electronAPI.authSignOut) {
      await window.electronAPI.authSignOut();
    }
  } catch (err) {
    console.warn('[Auth] Error al cerrar sesión desde sidebar:', err);
  } finally {
    localStorage.removeItem('authUser');
    const authOverlay = document.getElementById('authLoginOverlay');
    if (authOverlay) authOverlay.classList.add('active');
  }
});

// Función global para generar el HTML del Presupuesto (Talonario)
function generarHTMLPresupuesto(data) {
  const { 
    logoPath, 
    carrito, 
    subtotal, 
    ajusteLabel, 
    ajusteValor, 
    totalFinal,
    nroPresupuestoManual,
    cliente = '',
    direccion = '',
    localidad = '',
    telefono = '',
    cuit = '',
    fechaManual
  } = data;
  const ahora = fechaManual ? new Date(fechaManual) : new Date();
  const dia = String(ahora.getDate()).padStart(2, '0');
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const anio = String(ahora.getFullYear());
  const nroPresupuesto = nroPresupuestoManual || String(Math.floor(Math.random() * 90000) + 10000).padStart(8, '0'); // Formato XXXXXXXX

  // Generar las filas de la tabla de productos
  const minRows = 15;
  let rowsHtml = '';
  
  carrito.forEach(p => {
    rowsHtml += `
      <tr>
        <td class="col-cant">${p.cantidad}</td>
        <td class="col-detalle">${p.nombre}</td>
        <td class="col-punit">$${p.precio.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="col-importe">$${(p.precio * p.cantidad).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `;
  });
  
  // Rellenar con filas vacías para igualar el alto del talonario
  for (let i = carrito.length; i < minRows; i++) {
    rowsHtml += `
      <tr class="empty-row">
        <td class="col-cant">&nbsp;</td>
        <td class="col-detalle">&nbsp;</td>
        <td class="col-punit">&nbsp;</td>
        <td class="col-importe">&nbsp;</td>
      </tr>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Presupuesto</title>
  <style>
    @media print {
      body {
        margin: 0;
        padding: 0;
        background: #fff;
      }
      .no-print {
        display: none !important;
      }
    }
    @page {
      size: A4;
      margin: 15mm;
    }
    
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #000;
      background-color: #fff;
      margin: 0;
      padding: 10px;
      box-sizing: border-box;
    }

    .budget-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      box-sizing: border-box;
      position: relative;
    }

    /* Header Box */
    .header-box {
      display: grid;
      grid-template-columns: 1fr 60px 1.2fr;
      border: 2px solid #000;
      border-radius: 14px;
      padding: 12px 15px;
      margin-bottom: 15px;
      align-items: center;
      position: relative;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .logo-container {
      width: 75px;
      height: 75px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .company-details {
      font-size: 11.5px;
      line-height: 1.4;
    }

        .company-name {
      font-weight: 800;
      font-size: 16px;
      margin-bottom: 3px;
      letter-spacing: -0.5px;
    }

    .company-rubros {
      font-weight: bold;
      font-size: 11px;
      margin-bottom: 3px;
    }

    .whatsapp-info {
      display: flex;
      align-items: center;
      gap: 5px;
      font-weight: bold;
      margin-top: 4px;
      font-size: 12.5px;
    }

    .whatsapp-info svg {
      width: 14px;
      height: 14px;
      fill: #000;
    }

    .header-middle {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
    }

    .letter-x-box {
      border: 2px solid #000;
      width: 34px;
      height: 34px;
      display: flex;
      justify-content: center;
      align-items: center;
      font-weight: 900;
      font-size: 22px;
      background-color: #000;
      color: #fff;
      position: absolute;
      top: -2px;
      left: 45%;
      transform: translateX(-50%);
    }

    .header-divider-line {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 45%;
      width: 2px;
      background-color: #000;
      z-index: -1;
    }

    .header-right {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding-left: 20px;
    }

    .doc-title {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 2px;
      margin-bottom: 5px;
      text-transform: uppercase;
    }

    .doc-number {
      font-size: 14px;
      font-weight: 800;
      margin-bottom: 8px;
    }

    .date-row {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      margin-bottom: 6px;
      font-weight: bold;
    }

    .date-box {
      border: 1.5px solid #000;
      border-radius: 6px;
      padding: 4px 8px;
      min-width: 24px;
      text-align: center;
      font-weight: bold;
      background: #fff;
    }

    .not-valid-invoice {
      font-size: 8px;
      font-weight: 800;
      color: #000;
      text-transform: uppercase;
      margin-top: 4px;
      letter-spacing: 0.5px;
    }

    /* Client Details Box */
    .client-box {
      border: 2px solid #000;
      border-radius: 14px;
      padding: 12px 18px;
      margin-bottom: 15px;
      font-size: 11.5px;
      line-height: 2.2;
    }

    .client-row {
      display: flex;
      width: 100%;
      gap: 15px;
    }

    .client-field {
      display: flex;
      align-items: center;
      flex-grow: 1;
    }

    .client-field.half {
      width: 50%;
    }

    .client-label {
      font-weight: bold;
      margin-right: 8px;
      white-space: nowrap;
    }

    .client-dots-input {
      border: none;
      border-bottom: 1.5px dotted #000;
      background: transparent;
      flex-grow: 1;
      font-family: inherit;
      font-size: 11.5px;
      padding: 0 4px;
      outline: none;
    }

    /* Table Section */
    .table-container {
      border: 2px solid #000;
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 15px;
      position: relative;
      background: #fff;
    }

    /* Watermark */
    .watermark-container {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 260px;
      height: 260px;
      opacity: 0.05;
      z-index: 0;
      pointer-events: none;
    }

    .watermark-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .product-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
      position: relative;
      z-index: 1;
    }

    .product-table th {
      background-color: #f1f5f9;
      border-bottom: 2px solid #000;
      font-weight: 800;
      text-align: center;
      padding: 8px 6px;
      text-transform: uppercase;
    }

    .product-table th.col-cant { width: 10%; border-right: 1.5px solid #000; }
    .product-table th.col-detalle { width: 55%; border-right: 1.5px solid #000; }
    .product-table th.col-punit { width: 17%; border-right: 1.5px solid #000; }
    .product-table th.col-importe { width: 18%; }

    .product-table td {
      padding: 7px 8px;
      border-bottom: 1px dashed #cbd5e1;
      vertical-align: middle;
    }

    .product-table tr.empty-row td {
      border-bottom: 1px dashed #e2e8f0;
    }

    .product-table tr:last-child td {
      border-bottom: none;
    }

    .product-table td.col-cant {
      text-align: center;
      border-right: 1.5px solid #000;
      font-weight: bold;
    }

    .product-table td.col-detalle {
      text-align: left;
      border-right: 1.5px solid #000;
      font-weight: 500;
    }

    .product-table td.col-punit {
      text-align: right;
      border-right: 1.5px solid #000;
    }

    .product-table td.col-importe {
      text-align: right;
      font-weight: bold;
    }

    /* Totals Box */
    .totals-container {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 15px;
    }

    .totals-table {
      border: 2.5px solid #000;
      border-radius: 8px;
      border-collapse: collapse;
      background: #fff;
      overflow: hidden;
      min-width: 220px;
    }

    .totals-table tr:not(:last-child) {
      border-bottom: 1.5px solid #000;
    }

    .totals-table td {
      padding: 6px 12px;
      font-weight: bold;
      font-size: 11.5px;
    }

    .totals-table td.totals-label {
      text-transform: uppercase;
      border-right: 1.5px solid #000;
      background-color: #f1f5f9;
      font-size: 11px;
      letter-spacing: 0.5px;
    }

    .totals-table td.totals-value {
      text-align: right;
      font-size: 13.5px;
    }

    .totals-table tr.total-row td.totals-label {
      background-color: #cbd5e1;
      font-size: 12px;
    }

    .totals-table tr.total-row td.totals-value {
      font-size: 15px;
      font-weight: 900;
    }

    /* Footer Box */
    .footer-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1.5px solid #000;
      padding-top: 8px;
      font-size: 8.5px;
      color: #1e293b;
      margin-top: 10px;
    }

    .footer-left {
      display: flex;
      align-items: center;
      gap: 8px;
      line-height: 1.4;
    }

    .imprenta-logo-square {
      font-weight: 900;
      border: 2px solid #000;
      padding: 4px 6px;
      font-size: 10px;
      border-radius: 4px;
      text-align: center;
      background: #fff;
    }

    .footer-right {
      text-align: right;
      font-weight: 800;
      line-height: 1.4;
      font-size: 9px;
      text-transform: uppercase;
    }

    /* Screen Action Bar (for previewing/typing in Browser window) */
    .preview-action-bar {
      margin: 15px auto;
      max-width: 800px;
      background: #eff6ff;
      border: 1px dashed #3b82f6;
      border-radius: 8px;
      padding: 10px 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #1e40af;
    }

    .preview-btn-print {
      background-color: #3b82f6;
      color: white;
      border: none;
      padding: 6px 16px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
    }
    .preview-btn-print:hover {
      background-color: #2563eb;
    }
  </style>
</head>
<body>

  <!-- Printable Action Bar for screen preview -->
  <div class="preview-action-bar no-print">
    <span>💡 Podés rellenar los datos del cliente en pantalla antes de imprimir.</span>
    <button onclick="window.printAndSave()" class="preview-btn-print">🖨️ Imprimir Presupuesto</button>
  </div>

  <div class="budget-container">
    
    <!-- Encabezado -->
    <div class="header-box">
      <div class="header-divider-line"></div>
      <div class="letter-x-box">X</div>
      
      <div class="header-left">
        <div class="logo-container">
          <img src="file:///${logoPath}" class="logo-img" alt="Logo La Perla Desarrolladora S.A." onerror="this.parentNode.style.display='none';">
        </div>
                <div class="company-details">
          <div class="company-name">${EMPRESA.nombre}</div>
          <div class="company-rubros">${EMPRESA.rubros}</div>
          ${EMPRESA.direccion}<br>
          <div class="whatsapp-info">
            <!-- SVG Icono WhatsApp -->
            <svg viewBox="0 0 448 512">
              <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
            </svg>
            ${EMPRESA.telefono}
          </div>
        </div>
      </div>
      
      <div class="header-middle"></div>
      
      <div class="header-right">
        <div class="doc-title">Presupuesto</div>
        <div class="doc-number">N° 00001 - ${nroPresupuesto}</div>
        <div class="date-row">
          Fecha:
          <div class="date-box">${dia}</div>
          <div class="date-box">${mes}</div>
          <div class="date-box">${anio}</div>
        </div>
        <div class="not-valid-invoice">Documento no válido como factura</div>
      </div>
    </div>

    <!-- Datos del Cliente -->
    <div class="client-box">
      <div class="client-row">
        <div class="client-field">
          <span class="client-label">Señor(es):</span>
          <input type="text" class="client-dots-input" value="${cliente || ''}">
        </div>
      </div>
      <div class="client-row">
        <div class="client-field half">
          <span class="client-label">Domicilio:</span>
          <input type="text" class="client-dots-input" value="${direccion || ''}">
        </div>
        <div class="client-field half">
          <span class="client-label">Localidad:</span>
          <input type="text" class="client-dots-input" value="${localidad || ''}">
        </div>
      </div>
      <div class="client-row">
        <div class="client-field half">
          <span class="client-label">Teléfono:</span>
          <input type="text" class="client-dots-input" value="${telefono || ''}">
        </div>
        <div class="client-field half">
          <span class="client-label">C.U.I.T.:</span>
          <input type="text" class="client-dots-input" value="${cuit || ''}">
        </div>
      </div>
    </div>

    <!-- Tabla de Productos -->
    <div class="table-container">
      <div class="watermark-container">
        <img src="file:///${logoPath}" class="watermark-img" onerror="this.style.display='none';">
      </div>
      
      <table class="product-table">
        <thead>
          <tr>
            <th class="col-cant">Cant.</th>
            <th class="col-detalle">DETALLE</th>
            <th class="col-punit">P. Unit.</th>
            <th class="col-importe">IMPORTE</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>

    <!-- Totales -->
    <div class="totals-container">
      <table class="totals-table">
        <tr>
          <td class="totals-label">Subtotal:</td>
          <td class="totals-value">$${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        ${ajusteValor !== 0 ? `
          <tr>
            <td class="totals-label">${ajusteLabel}:</td>
            <td class="totals-value">${ajusteValor < 0 ? '-' : '+'}$${Math.abs(ajusteValor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        ` : ''}
        <tr class="total-row">
          <td class="totals-label">TOTAL:</td>
          <td class="totals-value">$${totalFinal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      </table>
    </div>



  </div>

  <script>
    (function() {
      const __carritoData__ = ${JSON.stringify(carrito)};
      const __totalFinal__ = ${totalFinal};
      const __isReprint__ = ${!!nroPresupuestoManual};

      window.printAndSave = function() {
        if (__isReprint__) {
          window.print();
          return;
        }

        const inputs = document.querySelectorAll('.client-dots-input');
        const cliente = inputs[0] ? inputs[0].value.trim() : '';
        const direccion = inputs[1] ? inputs[1].value.trim() : '';
        const localidad = inputs[2] ? inputs[2].value.trim() : '';
        const telefono = inputs[3] ? inputs[3].value.trim() : '';
        const cuit = inputs[4] ? inputs[4].value.trim() : '';

        const handleResult = (event) => {
          if (event.data && event.data.type === 'save-budget-result') {
            window.removeEventListener('message', handleResult);
            const result = event.data.result;
            if (result && result.success) {
              const docNumEl = document.querySelector('.doc-number');
              if (docNumEl) {
                const nroFormatted = String(result.id).padStart(8, '0');
                docNumEl.textContent = 'N° 00001 - ' + nroFormatted;
              }
            }
            setTimeout(() => {
              window.print();
            }, 100);
          }
        };
        window.addEventListener('message', handleResult);

        if (window.opener) {
          window.opener.postMessage({
            type: 'save-budget',
            data: {
              cliente,
              direccion,
              localidad,
              telefono,
              cuit,
              productos: __carritoData__,
              total: __totalFinal__
            }
          }, '*');
        } else {
          window.print();
        }
      };
    })();
  </script>

</body>
</html>
  `;
}

function generarHTMLRemito(data) {
  const { logoPath, carrito, venta, remitoExistente } = data;
  const fechaObj = remitoExistente?.fecha ? new Date(remitoExistente.fecha) : new Date();
  const dia = String(fechaObj.getDate()).padStart(2, '0');
  const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
  const anio = String(fechaObj.getFullYear());
  const hora = fechaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const nroRemito = remitoExistente?.numero_remito
    ? remitoExistente.numero_remito
    : String(Math.floor(Math.random() * 90000) + 10000).padStart(8, '0');

  const cliente = remitoExistente?.cliente || venta?.cliente || '';
  const direccion = remitoExistente?.direccion || venta?.direccion || '';
  const localidad = remitoExistente?.localidad || venta?.localidad || '';
  const telefono = remitoExistente?.telefono || venta?.telefono || '';
  const cuit = remitoExistente?.cuit || venta?.cuit || '';
  const vendedor = remitoExistente?.vendedor || 'Administrador';
  const observaciones = remitoExistente?.observaciones || venta?.observaciones || '';
  const transporte = remitoExistente?.transporte || '';

  const minRows = 13;
  let rowsHtml = '';
  
  carrito.forEach(p => {
    rowsHtml += `
      <tr>
        <td class="col-cant">${p.cantidad}</td>
        <td class="col-codigo">${p.codigo || '—'}</td>
        <td class="col-detalle">${p.nombre}</td>
        <td class="col-obs">
          <input type="text" class="table-dots-input prod-obs-input" value="${p.observaciones || ''}">
        </td>
      </tr>
    `;
  });
  
  for (let i = carrito.length; i < minRows; i++) {
    rowsHtml += `
      <tr class="empty-row">
        <td class="col-cant">&nbsp;</td>
        <td class="col-codigo">&nbsp;</td>
        <td class="col-detalle">&nbsp;</td>
        <td class="col-obs">&nbsp;</td>
      </tr>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Remito N° ${nroRemito}</title>
  <style>
    @media print {
      body {
        margin: 0;
        padding: 0;
        background: #fff;
      }
      .no-print {
        display: none !important;
      }
    }
    @page {
      size: A4;
      margin: 15mm;
    }
    
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #000;
      background-color: #fff;
      margin: 0;
      padding: 10px;
      box-sizing: border-box;
    }

    .remito-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      box-sizing: border-box;
      position: relative;
    }

    .header-box {
      display: grid;
      grid-template-columns: 1.2fr 140px 1fr;
      border: 2px solid #000;
      border-radius: 14px;
      margin-bottom: 15px;
      background: #fff;
      align-items: stretch;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 15px;
    }

    .logo-container {
      width: 75px;
      height: 75px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .logo-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .company-details {
      font-size: 11.5px;
      line-height: 1.4;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .company-name {
      font-weight: 800;
      font-size: 16px;
      letter-spacing: -0.5px;
    }

    .company-rubros {
      font-weight: bold;
      font-size: 11px;
    }

    .company-address {
      font-size: 11px;
      color: #000;
    }

    .whatsapp-info {
      display: flex;
      align-items: center;
      gap: 5px;
      font-weight: bold;
      font-size: 12.5px;
    }

    .whatsapp-info svg {
      width: 14px;
      height: 14px;
      fill: #000;
    }

    .header-middle {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-left: 2px solid #000;
      border-right: 2px solid #000;
      padding: 15px 5px;
      text-align: center;
      background: #fff;
    }

    .letter-r-circle {
      border: 2px solid #000;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      font-weight: 900;
      font-size: 26px;
      background-color: #fff;
      color: #000;
      margin-bottom: 6px;
    }

    .doc-type-title {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 1px;
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .val-leyenda-middle {
      font-size: 8px;
      font-weight: bold;
      line-height: 1.2;
      text-transform: uppercase;
      color: #000;
    }

    .header-right {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      padding: 15px 20px;
      gap: 6px;
    }

    .doc-number {
      font-size: 14px;
      font-weight: 800;
      margin-bottom: 2px;
    }

    .date-row {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: bold;
    }

    .date-label {
      margin-right: 4px;
    }

    .date-boxes {
      display: flex;
      gap: 3px;
    }

    .date-box {
      border: 1.5px solid #000;
      border-radius: 6px;
      padding: 3px 6px;
      min-width: 20px;
      text-align: center;
      font-weight: bold;
      background: #fff;
      font-size: 11px;
    }

    .info-row {
      font-size: 11px;
      font-weight: bold;
    }

    .client-box {
      border: 2px solid #000;
      border-radius: 14px;
      padding: 12px 18px;
      margin-bottom: 15px;
      font-size: 11.5px;
      line-height: 2.2;
    }

    .client-row {
      display: flex;
      width: 100%;
      gap: 15px;
    }

    .client-field {
      display: flex;
      align-items: center;
      flex-grow: 1;
    }

    .client-field.half {
      width: 50%;
    }

    .client-label {
      font-weight: bold;
      margin-right: 8px;
      white-space: nowrap;
    }

    .client-dots-input {
      border: none;
      border-bottom: 1.5px dotted #000;
      background: transparent;
      flex-grow: 1;
      font-family: inherit;
      font-size: 11.5px;
      padding: 0 4px;
      outline: none;
    }

    .table-container {
      border: 2px solid #000;
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 15px;
      position: relative;
      background: #fff;
    }

    .watermark-container {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 260px;
      height: 260px;
      opacity: 0.05;
      z-index: 0;
      pointer-events: none;
    }

    .watermark-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .product-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
      position: relative;
      z-index: 1;
    }

    .product-table th {
      background-color: #f1f5f9;
      border-bottom: 2px solid #000;
      font-weight: 800;
      text-align: center;
      padding: 8px 6px;
      text-transform: uppercase;
    }

    .product-table th.col-cant { width: 12%; border-right: 1.5px solid #000; }
    .product-table th.col-codigo { width: 18%; border-right: 1.5px solid #000; }
    .product-table th.col-detalle { width: 50%; border-right: 1.5px solid #000; }
    .product-table th.col-obs { width: 20%; }

    .product-table td {
      padding: 7px 8px;
      border-bottom: 1px dashed #cbd5e1;
      vertical-align: middle;
    }

    .product-table tr.empty-row td {
      border-bottom: 1px dashed #e2e8f0;
    }

    .product-table tr:last-child td {
      border-bottom: none;
    }

    .product-table td.col-cant {
      text-align: center;
      border-right: 1.5px solid #000;
      font-weight: bold;
    }

    .product-table td.col-codigo {
      text-align: left;
      border-right: 1.5px solid #000;
      font-family: 'Courier New', monospace;
    }

    .product-table td.col-detalle {
      text-align: left;
      border-right: 1.5px solid #000;
      font-weight: 500;
    }

    .product-table td.col-obs {
      text-align: left;
      padding: 2px 8px;
    }

    .table-dots-input {
      width: 100%;
      border: none;
      border-bottom: 1px dotted #cbd5e1;
      background: transparent;
      outline: none;
      font-family: inherit;
      font-size: 11px;
    }

    .remito-footer-block {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      border: 2px solid #000;
      border-radius: 14px;
      padding: 15px;
      margin-bottom: 15px;
      background: #fff;
    }

    .footer-left-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
      justify-content: center;
    }

    .footer-field {
      display: flex;
      align-items: center;
      font-size: 11.5px;
    }

    .footer-dots-input {
      border: none;
      border-bottom: 1.5px dotted #000;
      background: transparent;
      padding: 0 4px;
      outline: none;
      font-family: inherit;
      font-size: 11px;
    }

    .val-leyenda {
      font-size: 12px;
      font-weight: 900;
      color: #000;
      margin-top: 10px;
      letter-spacing: 0.5px;
    }

    .footer-right-firmas {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      padding-left: 20px;
    }

    .firma-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      text-align: center;
    }

    .recibi-conforme-label {
      font-size: 12px;
      font-weight: 800;
      margin-bottom: 50px;
    }

    .firma-line {
      width: 80%;
      border-top: 1.5px solid #000;
      margin-bottom: 5px;
    }

    .firma-y-sello-label {
      font-size: 11px;
      font-weight: bold;
    }

    .observaciones-block {
      border: 2px solid #000;
      border-radius: 14px;
      padding: 12px 15px;
      margin-bottom: 15px;
      background: #fff;
      font-size: 11.5px;
    }

    .observaciones-input {
      width: 100%;
      border: none;
      border-bottom: 1px dotted #000;
      background: transparent;
      font-family: inherit;
      font-size: 11px;
      resize: none;
      outline: none;
      margin-top: 5px;
      height: 40px;
    }

    .preview-action-bar {
      margin: 15px auto;
      max-width: 800px;
      background: #eff6ff;
      border: 1px dashed #3b82f6;
      border-radius: 8px;
      padding: 10px 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #1e40af;
    }

    .preview-btn-print {
      background-color: #3b82f6;
      color: white;
      border: none;
      padding: 6px 16px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
    }
    .preview-btn-print:hover {
      background-color: #2563eb;
    }
  </style>
</head>
<body>

  <!-- Barra de acciones en vista previa previa a la impresión -->
  <div class="preview-action-bar no-print">
    <span>💡 Podés rellenar o modificar los datos en pantalla antes de imprimir.</span>
    <button onclick="ejecutarImpresionRemito()" class="preview-btn-print">🖨️ Imprimir Remito</button>
  </div>

  <div class="remito-container">
    <div class="header-box">
      <div class="header-left">
        <div class="logo-container">
          <img src="file:///${logoPath}" class="logo-img" alt="Logo" onerror="this.parentNode.style.display='none';">
        </div>
        <div class="company-details">
          <div class="company-name">${EMPRESA.nombre}</div>
          <div class="company-rubros">${EMPRESA.rubros}</div>
          <div class="company-address">${EMPRESA.direccion}</div>
          <div class="whatsapp-info">
            <svg viewBox="0 0 448 512">
              <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
            </svg>
            ${EMPRESA.telefono}
          </div>
        </div>
      </div>
      
      <div class="header-middle">
        <div class="letter-r-circle">R</div>
        <div class="doc-type-title">REMITO</div>
        <div class="val-leyenda-middle">
          DOCUMENTO<br>NO VÁLIDO<br>COMO<br>FACTURA
        </div>
      </div>
      
      <div class="header-right">
        <div class="doc-number">N° 0001 - ${nroRemito}</div>
        <div class="date-row">
          <span class="date-label">Fecha:</span>
          <div class="date-boxes">
            <div class="date-box">${dia}</div>
            <div class="date-box">${mes}</div>
            <div class="date-box">${anio}</div>
          </div>
        </div>
        <div class="info-row"><strong>Hora:</strong> ${hora}</div>
        <div class="info-row"><strong>C.U.I.T.:</strong> ${EMPRESA.cuit}</div>
        <div class="info-row"><strong>Ingresos Brutos:</strong> ${EMPRESA.ingresosBrutos}</div>
      </div>
    </div>

    <div class="client-box">
      <div class="client-row">
        <div class="client-field">
          <span class="client-label">Señor(es):</span>
          <input type="text" class="client-dots-input client-dots-input-cliente" value="${cliente}">
        </div>
      </div>
      <div class="client-row">
        <div class="client-field half">
          <span class="client-label">Domicilio:</span>
          <input type="text" class="client-dots-input client-dots-input-direccion" value="${direccion}">
        </div>
        <div class="client-field half">
          <span class="client-label">Localidad:</span>
          <input type="text" class="client-dots-input client-dots-input-localidad" value="${localidad}">
        </div>
      </div>
      <div class="client-row">
        <div class="client-field half">
          <span class="client-label">Teléfono:</span>
          <input type="text" class="client-dots-input client-dots-input-telefono" value="${telefono}">
        </div>
        <div class="client-field half">
          <span class="client-label">C.U.I.T.:</span>
          <input type="text" class="client-dots-input client-dots-input-cuit" value="${cuit}">
        </div>
      </div>
      <div class="client-row">
        <div class="client-field half">
          <span class="client-label">Vendedor:</span>
          <input type="text" class="client-dots-input client-dots-input-vendedor" value="${vendedor}">
        </div>
        <div class="client-field half">
          <span class="client-label">Observaciones:</span>
          <input type="text" class="client-dots-input client-dots-input-obs" value="${observaciones}">
        </div>
      </div>
    </div>

    <div class="table-container">
      <div class="watermark-container">
        <img src="file:///${logoPath}" class="watermark-img" onerror="this.style.display='none';">
      </div>
      
      <table class="product-table">
        <thead>
          <tr>
            <th class="col-cant">Cant.</th>
            <th class="col-codigo">Código</th>
            <th class="col-detalle">DETALLE</th>
            <th class="col-obs">Observaciones</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>

    <div class="remito-footer-block">
      <div class="footer-left-info">
        <div class="footer-field">
          <strong>TRANSPORTE:</strong>
          <input type="text" class="footer-dots-input footer-dots-input-transporte" style="width: 200px;" value="${transporte}">
        </div>
        <div class="footer-field">
          <strong>C.U.I.T.:</strong>
          <input type="text" class="footer-dots-input" style="width: 150px;" value="">
        </div>
        <div class="val-leyenda">DOCUMENTO NO VALIDO COMO FACTURA</div>
      </div>
      <div class="footer-right-firmas">
        <div class="firma-block">
          <span class="recibi-conforme-label">RECIBI CONFORME</span>
          <div class="firma-line"></div>
          <span class="firma-y-sello-label">Firma y Sello</span>
        </div>
      </div>
    </div>

    <div class="observaciones-block">
      <strong>Observaciones:</strong>
      <textarea class="observaciones-input" placeholder="Escriba aquí observaciones del remito...">${observaciones}</textarea>
    </div>
  </div>

  <script>
    (function() {
      let isSaved = false;
      const remitoIdExistente = ${remitoExistente?.id ? Number(remitoExistente.id) : 'null'};

      function capturarYGuardarRemito() {
        if (isSaved) return;

        const clienteVal = document.querySelector('.client-dots-input-cliente')?.value || '';
        const direccionVal = document.querySelector('.client-dots-input-direccion')?.value || '';
        const localidadVal = document.querySelector('.client-dots-input-localidad')?.value || '';
        const telefonoVal = document.querySelector('.client-dots-input-telefono')?.value || '';
        const cuitVal = document.querySelector('.client-dots-input-cuit')?.value || '';
        const vendedorVal = document.querySelector('.client-dots-input-vendedor')?.value || '';
        const obsClienteVal = document.querySelector('.client-dots-input-obs')?.value || '';
        const transporteVal = document.querySelector('.footer-dots-input-transporte')?.value || '';
        const obsGeneralesVal = document.querySelector('.observaciones-input')?.value || '';

        const obsFinal = (obsClienteVal + (obsGeneralesVal && obsGeneralesVal !== obsClienteVal ? ' | ' + obsGeneralesVal : '')).trim();

        const rows = document.querySelectorAll('.product-table tbody tr:not(.empty-row)');
        const baseProds = ${JSON.stringify(carrito)};
        const productosFinales = [];

        rows.forEach((row, idx) => {
          const base = baseProds[idx] || {};
          const obsInput = row.querySelector('.prod-obs-input');
          const obsVal = obsInput ? obsInput.value.trim() : '';
          productosFinales.push({
            ...base,
            observaciones: obsVal
          });
        });

        const totalCalculado = ${Number(remitoExistente?.total || venta?.total || carrito.reduce((acc, p) => acc + (Number(p.precio || 0) * Number(p.cantidad || 1)), 0))};

        const remitoPayload = {
          id: remitoIdExistente,
          numero_remito: '${nroRemito}',
          fecha: '${remitoExistente?.fecha || new Date().toISOString()}',
          cliente: clienteVal,
          direccion: direccionVal,
          localidad: localidadVal,
          cuit: cuitVal,
          telefono: telefonoVal,
          vendedor: vendedorVal,
          observaciones: obsFinal,
          transporte: transporteVal,
          productos: productosFinales,
          total: totalCalculado
        };

        if (window.opener && window.opener.electronAPI) {
          isSaved = true;
          try {
            if (remitoIdExistente) {
              if (typeof window.opener.electronAPI.upsertRemito === 'function') {
                window.opener.electronAPI.upsertRemito(remitoPayload);
              } else if (typeof window.opener.electronAPI.saveRemito === 'function') {
                window.opener.electronAPI.saveRemito(remitoPayload);
              }
            } else {
              if (typeof window.opener.electronAPI.saveRemito === 'function') {
                window.opener.electronAPI.saveRemito(remitoPayload);
              }
            }
          } catch (e) {
            console.error('Error al persistir remito vía IPC:', e);
          }
        }
      }

      window.ejecutarImpresionRemito = function() {
        capturarYGuardarRemito();
        window.print();
      };

      window.addEventListener('afterprint', function() {
        capturarYGuardarRemito();
      });
    })();
  </script>

</body>
</html>
  `;
}

// ==========================================================================
// Integración de Autenticación con Supabase Auth (Electron)
// ==========================================================================
async function initAuthSession() {
  const authOverlay = document.getElementById('authLoginOverlay');
  const emailInput = document.getElementById('authEmail');
  const passInput = document.getElementById('authPassword');
  const loginForm = document.getElementById('authLoginForm');
  const btnSubmit = document.getElementById('btnAuthLogin');
  const btnText = document.getElementById('authBtnText');
  const btnSpinner = document.getElementById('authBtnSpinner');
  const errorBox = document.getElementById('authErrorMessage');
  const errorText = document.getElementById('authErrorText');
  const topbarUserName = document.getElementById('topbarUserName');
  const topbarUserRole = document.getElementById('topbarUserRole');

  function updateUIWithProfile(profile) {
    if (!profile) return;
    window.currentUserProfile = profile;

    const rawRole = (profile.role || profile.rol || 'empleado').toLowerCase();
    const isAdmin = rawRole === 'admin' || rawRole === 'master admin' || rawRole === 'administrador';
    profile.role = isAdmin ? 'admin' : 'empleado';
    profile.rol = profile.role;

    // Ocultar o mostrar ítems del sidebar según rol
    const restrictedPages = ['dashboard', 'informes', 'historial', 'empleados-liquidacion'];
    restrictedPages.forEach(p => {
      const link = document.querySelector(`.sidebar a[data-page="${p}"]`);
      if (link) {
        const parentLi = link.closest('li');
        if (parentLi) {
          parentLi.style.display = isAdmin ? 'block' : 'none';
        }
      }
    });

    const nameText = profile.nombre || profile.name || 'Usuario';
    const roleText = profile.cargo || (isAdmin ? 'Master Admin' : 'Empleado');
    const avatarUrl = profile.avatar_url;

    if (topbarUserName) {
      topbarUserName.textContent = nameText;
    }
    if (topbarUserRole) {
      topbarUserRole.textContent = roleText;
    }

    const profileInfoStrong = document.querySelector('.topbar-profile .profile-info strong');
    const profileInfoSmall = document.querySelector('.topbar-profile .profile-info small');
    if (profileInfoStrong) profileInfoStrong.textContent = nameText;
    if (profileInfoSmall) profileInfoSmall.textContent = roleText;

    const profileAvatars = document.querySelectorAll('.profile-avatar');
    profileAvatars.forEach(avatarEl => {
      if (avatarUrl) {
        avatarEl.innerHTML = `<img src="${avatarUrl}" class="profile-avatar-img" alt="Avatar" onerror="this.onerror=null; this.parentNode.textContent='${(nameText[0] || 'U').toUpperCase()}';">`;
      } else {
        avatarEl.textContent = (nameText[0] || 'U').toUpperCase();
      }
    });
  }

  function showLoginOverlay() {
    if (authOverlay) authOverlay.classList.add('active');
  }

  function hideLoginOverlay() {
    console.log('[AUTH TRACE 9] hideLoginOverlay called, removing active class from authOverlay');
    if (authOverlay) authOverlay.classList.remove('active');
  }

  function showError(msg) {
    if (errorBox && errorText) {
      errorText.textContent = msg;
      errorBox.style.display = 'flex';
    }
  }

  function hideError() {
    if (errorBox) errorBox.style.display = 'none';
  }

  // 1. Verificar sesión existente obligatoriamente con Supabase
  try {
    if (window.electronAPI && window.electronAPI.authGetSession) {
      const sessionData = await window.electronAPI.authGetSession();
      if (sessionData && sessionData.session && sessionData.profile) {
        updateUIWithProfile(sessionData.profile);
        hideLoginOverlay();
      } else {
        showLoginOverlay();
        if (sessionData && sessionData.error) {
          showError(sessionData.error);
        }
      }
    } else {
      showLoginOverlay();
      showError('Error de integración: el API de autenticación no está disponible.');
    }
  } catch (err) {
    console.warn('[Auth] Error verificando sesión al inicio:', err);
    showLoginOverlay();
    showError('Error verificando la sesión de usuario con Supabase Auth.');
  }

  // 2. Submit de Formulario de Login
  async function performLogin(e) {
    if (e) e.preventDefault();
    console.log('[AUTH TRACE 3] performLogin executed with email:', emailInput?.value?.trim());
    hideError();

    const email = emailInput?.value?.trim();
    const password = passInput?.value;

    if (!email) {
      console.warn('[AUTH TRACE 3] performLogin stopped: Email field is empty');
      showError('Por favor, ingresá tu correo electrónico.');
      return;
    }
    if (!password) {
      console.warn('[AUTH TRACE 3] performLogin stopped: Password field is empty');
      showError('Por favor, ingresá tu contraseña.');
      return;
    }

    if (btnSubmit && btnText && btnSpinner) {
      btnSubmit.disabled = true;
      btnText.style.display = 'none';
      btnSpinner.style.display = 'inline-block';
    }

    try {
      console.log('[AUTH TRACE 3] Invoking window.electronAPI.authSignIn...');
      const res = await window.electronAPI.authSignIn({ email, password });
      console.log('[AUTH TRACE 8] renderer response received from IPC:', res);
      if (res && res.success && res.profile) {
        updateUIWithProfile(res.profile);
        hideLoginOverlay();
        if (passInput) passInput.value = '';
      } else {
        console.warn('[AUTH TRACE 8] authSignIn returned unsuccessful:', res?.message);
        showError((res && res.message) || 'Credenciales incorrectas. Verificá tu correo y contraseña.');
      }
    } catch (err) {
      console.error('[AUTH TRACE 8] renderer caught exception during authSignIn:', err);
      showError('Error de red al conectar con el servidor de autenticación Supabase.');
    } finally {
      if (btnSubmit && btnText && btnSpinner) {
        btnSubmit.disabled = false;
        btnText.style.display = 'inline-block';
        btnSpinner.style.display = 'none';
      }
    }
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      console.log('[AUTH TRACE 2] SUBMIT event triggered on #authLoginForm');
      performLogin(e);
    });
  }
  if (btnSubmit) {
    btnSubmit.addEventListener('click', (e) => {
      console.log('[AUTH TRACE 1] CLICK event triggered on #btnAuthLogin');
      performLogin(e);
    });
  }

  // 3. Listener del botón de Logout en Topbar
  const btnProfileLogout = document.getElementById('btnProfileLogout');
  if (btnProfileLogout) {
    btnProfileLogout.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        if (window.electronAPI && window.electronAPI.authSignOut) {
          await window.electronAPI.authSignOut();
        }
      } catch (err) {
        console.warn('[Auth] Error al cerrar sesión:', err);
      } finally {
        localStorage.removeItem('authUser');
        showLoginOverlay();
      }
    });
  }
}

// ==========================================================================
// Modal de Ajustes de Perfil de Usuario
// ==========================================================================
function initProfileSettingsModal() {
  const modal = document.getElementById('modalProfileSettings');
  const btnOpen = document.getElementById('btnProfileSettings');
  const btnClose = document.getElementById('btnCloseProfileSettings');
  const btnCancel = document.getElementById('btnCancelProfileSettings');
  const form = document.getElementById('formProfileSettings');
  
  const inputName = document.getElementById('inputProfileName');
  const inputRole = document.getElementById('inputProfileRole');
  const inputAvatar = document.getElementById('inputProfileAvatar');
  const btnSelectAvatar = document.getElementById('btnSelectAvatarFile');
  const btnTriggerAvatar = document.getElementById('btnChangeAvatarTrigger');
  
  const previewText = document.getElementById('profileAvatarPreviewText');
  const previewImg = document.getElementById('profileAvatarPreviewImg');
  
  const btnSave = document.getElementById('btnSaveProfileSettings');
  const btnSaveText = document.getElementById('profileSaveBtnText');
  const btnSaveSpinner = document.getElementById('profileSaveSpinner');
  
  const errorMsgBox = document.getElementById('profileErrorMsg');
  const errorMsgText = document.getElementById('profileErrorText');

  if (!modal) return;

  let selectedAvatarBase64 = null;
  let selectedAvatarFileName = null;

  function showProfileError(msg) {
    if (errorMsgBox && errorMsgText) {
      errorMsgText.textContent = msg;
      errorMsgBox.style.display = 'flex';
    }
  }

  function hideProfileError() {
    if (errorMsgBox) errorMsgBox.style.display = 'none';
  }

  window.openProfileSettingsModal = function() {
    hideProfileError();
    const profile = window.currentUserProfile || {};
    
    if (inputName) inputName.value = profile.nombre || '';
    if (inputRole) inputRole.value = profile.cargo || profile.role || profile.rol || '';
    
    selectedAvatarBase64 = null;
    selectedAvatarFileName = null;
    if (inputAvatar) inputAvatar.value = '';

    const avatarUrl = profile.avatar_url;
    const initial = (profile.nombre || 'U')[0].toUpperCase();

    if (avatarUrl) {
      if (previewImg) {
        previewImg.src = avatarUrl;
        previewImg.style.display = 'block';
      }
      if (previewText) previewText.style.display = 'none';
    } else {
      if (previewText) {
        previewText.textContent = initial;
        previewText.style.display = 'block';
      }
      if (previewImg) previewImg.style.display = 'none';
    }

    modal.classList.add('active');
  };

  function closeModal() {
    modal.classList.remove('active');
  }

  if (btnOpen) btnOpen.addEventListener('click', window.openProfileSettingsModal);
  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  const triggerFileSelect = () => inputAvatar?.click();
  btnSelectAvatar?.addEventListener('click', triggerFileSelect);
  btnTriggerAvatar?.addEventListener('click', triggerFileSelect);

  if (inputAvatar) {
    inputAvatar.addEventListener('change', (e) => {
      hideProfileError();
      const file = e.target.files?.[0];
      if (!file) return;

      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        showProfileError('Formato de imagen no válido. Formatos permitidos: JPG, PNG, WEBP.');
        inputAvatar.value = '';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showProfileError('La imagen supera el tamaño máximo permitido (5 MB). Elige una imagen más liviana.');
        inputAvatar.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        selectedAvatarBase64 = event.target.result;
        selectedAvatarFileName = file.name;

        if (previewImg) {
          previewImg.src = selectedAvatarBase64;
          previewImg.style.display = 'block';
        }
        if (previewText) previewText.style.display = 'none';
      };
      reader.readAsDataURL(file);
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideProfileError();

      const nombre = inputName?.value?.trim();
      const cargo = inputRole?.value?.trim();

      if (!nombre) {
        showProfileError('El campo Nombre es obligatorio.');
        return;
      }

      if (nombre.length > 50) {
        showProfileError('El Nombre no puede superar los 50 caracteres.');
        return;
      }

      if (cargo && cargo.length > 50) {
        showProfileError('El Cargo o descripción no puede superar los 50 caracteres.');
        return;
      }

      if (btnSave && btnSaveText && btnSaveSpinner) {
        btnSave.disabled = true;
        btnSaveText.style.display = 'none';
        btnSaveSpinner.style.display = 'inline-block';
      }

      try {
        if (window.electronAPI && window.electronAPI.authUpdateProfile) {
          const res = await window.electronAPI.authUpdateProfile({
            nombre,
            cargo,
            avatarBase64: selectedAvatarBase64,
            avatarFileName: selectedAvatarFileName
          });

          if (res && res.success && res.profile) {
            updateUIWithProfile(res.profile);
            closeModal();
            alert('¡Perfil de usuario actualizado correctamente!');
          } else {
            showProfileError((res && res.message) || 'Error al guardar los cambios de perfil.');
          }
        } else {
          showProfileError('El servicio de actualización de perfil no está disponible.');
        }
      } catch (err) {
        console.error('[ProfileSettings] Error guardando perfil:', err);
        showProfileError('Error al conectar con el servidor para guardar los cambios.');
      } finally {
        if (btnSave && btnSaveText && btnSaveSpinner) {
          btnSave.disabled = false;
          btnSaveText.style.display = 'inline-block';
          btnSaveSpinner.style.display = 'none';
        }
      }
    });
  }
}

// ==========================================================================
// Lista de Usuarios de la Empresa y Estado Online/Offline (Supabase Realtime)
// ==========================================================================
let companyUsersData = [];
let onlineUserIdsSet = new Set();

async function loadAndRenderCompanyUsers() {
  const container = document.getElementById('companyUsersList');
  if (!container) return;

  try {
    if (window.electronAPI && window.electronAPI.getCompanyUsers) {
      const res = await window.electronAPI.getCompanyUsers();
      console.log('--- [RENDERER IPC GET COMPANY USERS RES] ---');
      console.log(res);
      console.log(res.users?.length);
      console.log(res.users);
      console.log('---------------------------------------------');

      if (res && res.success && Array.isArray(res.users)) {
        companyUsersData = res.users;
      }
    }
  } catch (err) {
    console.warn('[CompanyUsers] Error al obtener usuarios:', err.message);
  }

  renderCompanyUsersList();
}

function renderCompanyUsersList() {
  const container = document.getElementById('companyUsersList');
  if (!container) return;

  if (!companyUsersData || companyUsersData.length === 0) {
    container.innerHTML = `<div class="company-user-skeleton">No hay otros usuarios.</div>`;
    return;
  }

  // Ordenamiento obligatorio:
  // 1. Usuario actual (isCurrent === true)
  // 2. Usuarios Online (onlineUserIdsSet.has(u.id))
  // 3. Usuarios Offline
  const sortedUsers = [...companyUsersData].sort((a, b) => {
    if (a.isCurrent) return -1;
    if (b.isCurrent) return 1;

    const aOnline = onlineUserIdsSet.has(a.id);
    const bOnline = onlineUserIdsSet.has(b.id);

    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;

    return (a.nombre || '').localeCompare(b.nombre || '');
  });

  console.log('--- [RENDERER SORTED USERS BEFORE INNER HTML] ---');
  console.log(sortedUsers.length);
  console.log(sortedUsers);
  console.log('-------------------------------------------------');

  const html = sortedUsers.map(user => {
    const isOnline = onlineUserIdsSet.has(user.id) || user.isCurrent;
    const initial = (user.nombre || 'U')[0].toUpperCase();
    const avatarHtml = user.avatar_url
      ? `<img src="${user.avatar_url}" class="company-user-avatar-small" alt="${user.nombre}" onerror="this.onerror=null; this.parentNode.textContent='${initial}';">`
      : `<div class="company-user-avatar-small">${initial}</div>`;

    const youBadge = user.isCurrent ? `<span class="user-you-badge">Tú</span>` : '';
    const statusClass = isOnline ? 'online' : 'offline';
    const cargoText = user.cargo || 'Miembro';

    return `
      <div class="company-user-item">
        <span class="status-dot ${statusClass}" title="${isOnline ? 'Conectado' : 'Desconectado'}"></span>
        ${avatarHtml}
        <div class="company-user-info">
          <div class="company-user-name">
            <span>${user.nombre}</span> ${youBadge}
          </div>
          <div class="company-user-role">${cargoText}</div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;

  console.log('--- [RENDERER CONTAINER AFTER INNER HTML] ---');
  console.log(container.children.length);
  console.log(container.innerHTML);
  console.log('---------------------------------------------');
}

function initCompanyUsersPresence() {
  if (window.electronAPI) {
    if (window.electronAPI.onPresenceUpdate) {
      window.electronAPI.onPresenceUpdate((onlineIds) => {
        onlineUserIdsSet = new Set(onlineIds || []);
        renderCompanyUsersList();
      });
    }
    if (window.electronAPI.startPresence) {
      window.electronAPI.startPresence();
    }
  }
}

function isCurrentPage(pageName) {
  const content = document.getElementById('content');
  return content && content.dataset.currentPage === pageName;
}

function isModalOpen() {
  const openModal = document.querySelector('.modal[style*="display: flex"], .modal[style*="display: block"], .modal.active');
  return !!openModal;
}

function initRealtimeListeners() {
  if (!window.electronAPI) return;

  // 1. Productos
  if (typeof window.electronAPI.onRealtimeProductEvent === 'function') {
    window.electronAPI.onRealtimeProductEvent(async (data) => {
      console.log('[Realtime IPC] Evento recibido en Renderer para productos:', data);
      if (isCurrentPage('inventario') && !isModalOpen()) {
        console.log('[Realtime IPC] Iniciando actualización visual del inventario...');
        if (typeof window.__inventoryLoadProducts === 'function') {
          await window.__inventoryLoadProducts();
          console.log('[Realtime IPC] Productos recargados correctamente vía __inventoryLoadProducts.');
        } else {
          const content = document.getElementById('content');
          if (content && typeof pages !== 'undefined' && pages.inventario) {
            window.__inventarioInicializado = false;
            content.innerHTML = pages.inventario;
            if (typeof initInventario === 'function') {
              initInventario();
              console.log('[Realtime IPC] Inventario reiniciado correctamente mediante initInventario.');
            }
          }
        }
        if (typeof updateStockCounts === 'function') {
          await updateStockCounts();
        }
      }
    });
  }

  // 2. Clientes (Padrón)
  if (typeof window.electronAPI.onRealtimeClientEvent === 'function') {
    window.electronAPI.onRealtimeClientEvent((data) => {
      console.log('[Renderer] Evento Supabase Realtime recibido en clientes:', data);
      if (isCurrentPage('clientes') && !isModalOpen()) {
        if (typeof initClientes === 'function') {
          initClientes();
        }
      }
    });
  }

  // 3. Ventas a Cuenta Corriente de Clientes
  if (typeof window.electronAPI.onRealtimeClientSaleEvent === 'function') {
    window.electronAPI.onRealtimeClientSaleEvent((data) => {
      console.log('[Renderer] Evento Supabase Realtime recibido en cliente_ventas:', data);
      if (isCurrentPage('clientes') && !isModalOpen()) {
        if (typeof initClientes === 'function') {
          initClientes();
        }
      }
    });
  }

  // 4. Órdenes de Municipio
  if (typeof window.electronAPI.onRealtimeMuniOrderEvent === 'function') {
    window.electronAPI.onRealtimeMuniOrderEvent((data) => {
      console.log('[Renderer] Evento Supabase Realtime recibido en municipio_ordenes:', data);
      if (isCurrentPage('municipio') && !isModalOpen()) {
        if (typeof initMunicipio === 'function') {
          initMunicipio();
        }
      }
    });
  }

  // 5. Órdenes de Atmosférico
  if (typeof window.electronAPI.onRealtimeAtmosOrderEvent === 'function') {
    window.electronAPI.onRealtimeAtmosOrderEvent((data) => {
      console.log('[Renderer] Evento Supabase Realtime recibido en atmos_ordenes:', data);
      if (isCurrentPage('atmosferico') && !isModalOpen()) {
        if (typeof initAtmosferico === 'function') {
          initAtmosferico();
        }
      }
    });
  }

  // 6. Finanzas y Gastos
  if (typeof window.electronAPI.onRealtimeFinanceEvent === 'function') {
    window.electronAPI.onRealtimeFinanceEvent((data) => {
      console.log('[Renderer] Evento Supabase Realtime recibido en Finanzas:', data);
      if (typeof window.__updateFinanzasChart === 'function') {
        window.__updateFinanzasChart();
      }
    });
  }

  if (typeof window.electronAPI.onRealtimeExpenseEvent === 'function') {
    window.electronAPI.onRealtimeExpenseEvent((data) => {
      console.log('[Renderer] Evento Supabase Realtime recibido en Gastos:', data);
      if (typeof window.__updateFinanzasChart === 'function') {
        window.__updateFinanzasChart();
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initAuthSession();
    initProfileSettingsModal();
    initCompanyUsersPresence();
    loadAndRenderCompanyUsers();
    initRealtimeListeners();
  });
} else {
  initAuthSession();
  initProfileSettingsModal();
  initCompanyUsersPresence();
  loadAndRenderCompanyUsers();
  initRealtimeListeners();
}

