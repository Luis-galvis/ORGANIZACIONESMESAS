// main.js - Application Orchestrator & UI Binding for Fernando & Luisa Mesas 3D
import confetti from 'canvas-confetti';
import { RAW_CSV_DATA, parseCSV, expandGuests } from './data.js';
import { SeatingManager } from './seating.js';
import { WeddingScene } from './scene.js';
import { exportToExcel } from './export.js';
import { 
  generateShareableLink, 
  supabase, 
  setCloudStatusListener, 
  subscribeToCloudChanges 
} from './cloud.js';

class App {
  constructor() {
    this.rawGuests = [];
    this.guests = []; // Expanded confirmed individual entities
    this.seatingManager = null;
    this.scene = null;

    this.activeTab = 'unassigned'; // 'unassigned' | 'tables'
    this.activeFilter = 'all'; // 'all' | 'pareja' | 'familia' | 'individual'
    this.searchQuery = '';
    this.labelsVisible = true;

    // Modal state for seat assignment
    this.activeSeatModal = { tableId: null, seatIndex: null };
    this.editingTableId = null;

    this.init();
  }

  async init() {
    // 0. Synchronize mobile viewport height accurately against browser toolbars
    this.initMobileViewport();

    // 1. Load initial data
    this.loadGuestData(RAW_CSV_DATA);

    // 2. Initialize Seating Manager
    this.seatingManager = new SeatingManager(this.guests);

    // 2.1 Set up Supabase Cloud Status listener
    setCloudStatusListener((status, text) => this.updateCloudStatusUI(status, text));

    // Try loading cloud / shared link state if available
    await this.seatingManager.loadFromCloud();

    // 2.2 Subscribe to realtime multi-device sync
    subscribeToCloudChanges((newTables) => {
      this.seatingManager.updateTablesFromRealtime(newTables);
      this.syncAll();
      this.showToast('⚡ Distribución actualizada en vivo desde Supabase');
    });

    // 3. Initialize 3D Scene
    const container = document.getElementById('canvas-container');
    this.scene = new WeddingScene(
      container,
      (tableId, seatIdx, guest) => this.handleSeatClick(tableId, seatIdx, guest),
      (table) => this.handleTableClick(table)
    );

    // 4. Initial 3D Render & UI Sync
    this.syncAll();

    // 5. Bind DOM Events
    this.bindEvents();

    this.showToast('Bienvenido al Visualizador 3D de Mesas para la Boda de Fernando & Luisa 💍');
  }

  initMobileViewport() {
    const updateHeight = () => {
      const vh = window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${vh}px`);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateHeight);
    }
  }

  updateCloudStatusUI(status, text) {
    const pill = document.getElementById('cloud-status-pill');
    const label = document.getElementById('cloud-label');
    const modalDetail = document.getElementById('supabase-status-detail');

    if (!pill) return;
    pill.classList.remove('saving', 'offline', 'synced');

    if (status === 'synced') {
      pill.classList.add('synced');
      if (label) label.textContent = 'En la Nube';
      if (modalDetail) modalDetail.textContent = text || 'Conectado y sincronizado con Supabase';
    } else if (status === 'saving') {
      pill.classList.add('saving');
      if (label) label.textContent = 'Guardando...';
      if (modalDetail) modalDetail.textContent = text || 'Guardando cambios en Supabase...';
    } else if (status === 'needs_table') {
      pill.classList.add('offline');
      if (label) label.textContent = 'Crear Tabla';
      if (modalDetail) modalDetail.textContent = 'Falta crear la tabla "boda_mesas" en Supabase';
    } else if (status === 'connecting') {
      if (label) label.textContent = 'Conectando...';
      if (modalDetail) modalDetail.textContent = text || 'Conectando a Supabase...';
    } else {
      pill.classList.add('offline');
      if (label) label.textContent = 'Modo Local';
      if (modalDetail) modalDetail.textContent = text || 'Modo local (sin sincronización)';
    }
  }

  loadGuestData(csvText) {
    const rows = parseCSV(csvText);
    this.rawGuests = rows;
    this.guests = expandGuests(rows);
  }

  syncAll() {
    // Re-render 3D scene
    this.scene.renderTables(this.seatingManager.tables, this.guests);

    // Update Header Counters
    this.updateCounters();

    // Render horizontal table quick navigator
    this.renderTableNavigator();

    // Update Sidebar content
    this.renderSidebar();
  }

  renderTableNavigator() {
    const navBar = document.getElementById('table-navigator-bar');
    if (!navBar) return;
    navBar.innerHTML = '';

    this.seatingManager.tables.forEach(table => {
      const btn = document.createElement('button');
      const isNovios = Boolean(table.isNoviosTable);
      const occupied = table.seats.filter(s => s.guestId).length;

      btn.className = `nav-table-pill ${isNovios ? 'novios' : ''}`;
      btn.setAttribute('data-table-id', table.id);
      if (this.scene && this.scene.activeFocusedTableId === table.id) {
        btn.classList.add('active');
      }

      btn.innerHTML = `${isNovios ? '💒 Novios' : escapeHtml(table.name)} <span style="opacity:0.75; font-size:10px;">(${occupied}/${table.capacity})</span>`;

      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-table-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.scene.focusTable(table.id);
        this.showToast(`🔍 Enfocando ${table.name}`);
      });

      navBar.appendChild(btn);
    });
  }

  syncTableNavigatorActive(tableId) {
    document.querySelectorAll('.nav-table-pill').forEach(btn => {
      if (btn.getAttribute('data-table-id') === tableId) {
        btn.classList.add('active');
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } else {
        btn.classList.remove('active');
      }
    });
  }

  updateCounters() {
    const totalConfirmed = this.guests.length;
    const guestTables = this.seatingManager.tables.filter(t => !t.isNoviosTable);
    const seatedCount = guestTables.reduce(
      (sum, t) => sum + t.seats.filter(s => s.guestId).length,
      0
    );
    const pendingCount = totalConfirmed - seatedCount;
    const guestTableCount = guestTables.length;

    document.getElementById('stat-confirmed').textContent = totalConfirmed;
    document.getElementById('stat-assigned').textContent = seatedCount;
    document.getElementById('stat-pending').textContent = pendingCount;
    document.getElementById('stat-tables').textContent = `${guestTableCount} (+ Novios)`;

    document.getElementById('tab-count-unassigned').textContent = pendingCount;
    document.getElementById('tab-count-tables').textContent = `${guestTableCount}`;
    document.getElementById('badge-all').textContent = totalConfirmed;

    const mobileBadge = document.getElementById('mobile-badge-unassigned');
    if (mobileBadge) mobileBadge.textContent = pendingCount;
  }

  bindEvents() {
    // Header actions
    document.getElementById('btn-auto-assign').addEventListener('click', () => this.handleAutoAssign());
    document.getElementById('btn-export-excel').addEventListener('click', () => this.handleExportExcel());
    document.getElementById('btn-toggle-labels').addEventListener('click', () => this.handleToggleLabels());
    document.getElementById('btn-add-table').addEventListener('click', () => this.openAddTableModal());
    document.getElementById('btn-import-csv').addEventListener('click', () => this.openCsvModal());
    document.getElementById('btn-clear-all').addEventListener('click', () => this.handleClearAll());
    document.getElementById('btn-backup').addEventListener('click', () => this.openBackupModal());

    // Share link for WhatsApp / Mobile
    const btnShare = document.getElementById('btn-share-link');
    if (btnShare) {
      btnShare.addEventListener('click', () => {
        const link = generateShareableLink(this.seatingManager.tables);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(link).then(() => {
            this.showToast('🔗 ¡Enlace copiado! Puedes enviarlo por WhatsApp para abrirlo en celular');
          }).catch(() => {
            prompt('Copia este enlace para abrir en celular:', link);
          });
        } else {
          prompt('Copia este enlace para abrir en celular:', link);
        }
      });
    }

    // Touch Zoom buttons
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    if (btnZoomIn) btnZoomIn.addEventListener('click', () => this.scene.zoomIn());
    if (btnZoomOut) btnZoomOut.addEventListener('click', () => this.scene.zoomOut());

    // Lateral Pan, Continuous Glide, Table Stepping & Touch Mode
    const btnPanLeft = document.getElementById('btn-pan-left');
    const btnPanRight = document.getElementById('btn-pan-right');
    const btnPrevTable = document.getElementById('btn-prev-table');
    const btnNextTable = document.getElementById('btn-next-table');
    const btnTouchMode = document.getElementById('btn-touch-mode');

    if (btnPanLeft) {
      btnPanLeft.addEventListener('click', () => {
        this.scene.moveLateral(-1);
      });
      btnPanLeft.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.scene.startContinuousLateral(-1);
      });
      const stopLeft = () => this.scene.stopContinuousMovement();
      btnPanLeft.addEventListener('pointerup', stopLeft);
      btnPanLeft.addEventListener('pointerleave', stopLeft);
      btnPanLeft.addEventListener('pointercancel', stopLeft);
    }

    if (btnPanRight) {
      btnPanRight.addEventListener('click', () => {
        this.scene.moveLateral(1);
      });
      btnPanRight.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.scene.startContinuousLateral(1);
      });
      const stopRight = () => this.scene.stopContinuousMovement();
      btnPanRight.addEventListener('pointerup', stopRight);
      btnPanRight.addEventListener('pointerleave', stopRight);
      btnPanRight.addEventListener('pointercancel', stopRight);
    }

    if (btnPrevTable) {
      btnPrevTable.addEventListener('click', () => {
        const tableId = this.scene.stepTable(-1);
        if (tableId) this.syncTableNavigatorActive(tableId);
      });
    }

    if (btnNextTable) {
      btnNextTable.addEventListener('click', () => {
        const tableId = this.scene.stepTable(1);
        if (tableId) this.syncTableNavigatorActive(tableId);
      });
    }

    if (btnTouchMode) {
      btnTouchMode.addEventListener('click', () => {
        const nextMode = this.scene.toggleTouchMode();
        const icon = document.getElementById('touch-mode-icon');
        const text = document.getElementById('touch-mode-text');
        if (nextMode === 'pan') {
          if (icon) icon.textContent = '🖐️';
          if (text) text.textContent = 'Mover';
          btnTouchMode.classList.remove('active-rotate');
          this.showToast('🖐️ Modo de toque: Desplazar en lateral');
        } else {
          if (icon) icon.textContent = '🔄';
          if (text) text.textContent = 'Girar';
          btnTouchMode.classList.add('active-rotate');
          this.showToast('🔄 Modo de toque: Girar perspectiva 3D');
        }
      });
    }

    // Mobile Drawer Open / Close with Backdrop Overlay
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const btnMobile = document.getElementById('btn-mobile-drawer');
    const btnCloseMobile = document.getElementById('btn-close-sidebar-mobile');

    const openDrawer = () => {
      if (sidebar) sidebar.classList.add('mobile-open');
      if (backdrop) backdrop.classList.add('active');
      document.body.classList.add('drawer-open');
    };

    const closeDrawer = () => {
      if (sidebar) sidebar.classList.remove('mobile-open');
      if (backdrop) backdrop.classList.remove('active');
      document.body.classList.remove('drawer-open');
    };

    if (btnMobile) btnMobile.addEventListener('click', openDrawer);
    if (btnCloseMobile) btnCloseMobile.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    // Supabase Cloud Status pill opens Supabase Modal
    const cloudPill = document.getElementById('cloud-status-pill');
    if (cloudPill) {
      cloudPill.addEventListener('click', () => {
        this.openModal('supabase-modal');
      });
    }

    // Supabase Modal events
    const btnCloseSupabase = document.getElementById('btn-close-supabase');
    const btnCloseSupabaseModal = document.getElementById('btn-close-supabase-modal');
    const btnCopySql = document.getElementById('btn-copy-sql');
    const btnRetrySupabase = document.getElementById('btn-retry-supabase');

    if (btnCloseSupabase) btnCloseSupabase.addEventListener('click', () => this.closeModal('supabase-modal'));
    if (btnCloseSupabaseModal) btnCloseSupabaseModal.addEventListener('click', () => this.closeModal('supabase-modal'));
    
    if (btnCopySql) {
      btnCopySql.addEventListener('click', () => {
        const sqlEl = document.getElementById('supabase-sql-code');
        if (sqlEl) {
          navigator.clipboard.writeText(sqlEl.textContent).then(() => {
            this.showToast('📋 ¡Código SQL copiado! Pégalo en SQL Editor de Supabase');
          }).catch(() => {
            this.showToast('Copia el texto del recuadro SQL');
          });
        }
      });
    }

    if (btnRetrySupabase) {
      btnRetrySupabase.addEventListener('click', async () => {
        this.showToast('🔄 Verificando conexión con Supabase...');
        try {
          const { error } = await supabase.from('boda_mesas').select('id, updated_at').limit(1);
          if (!error) {
            this.showToast('✅ ¡Tabla boda_mesas conectada y lista en Supabase!');
            this.updateCloudStatusUI('synced', 'Base de datos conectada correctamente');
            await this.seatingManager.loadFromCloud();
            this.syncAll();
          } else {
            this.showToast(`⚠️ Supabase reporta: ${error.message}`);
            this.updateCloudStatusUI('needs_table', error.message);
          }
        } catch (err) {
          this.showToast(`Error de conexión: ${err.message}`);
        }
      });
    }

    // Close any modal by clicking on its backdrop
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal.id);
        }
      });
    });

    // Close mobile drawer on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDrawer();
        document.querySelectorAll('.modal-overlay.active').forEach(m => {
          this.closeModal(m.id);
        });
      }
    });

    // Camera preset buttons
    document.querySelectorAll('.cam-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const preset = btn.getAttribute('data-preset');
        this.scene.setCameraPreset(preset);
      });
    });

    // Sidebar tabs
    document.getElementById('tab-unassigned').addEventListener('click', () => {
      this.activeTab = 'unassigned';
      document.getElementById('tab-unassigned').classList.add('active');
      document.getElementById('tab-tables').classList.remove('active');
      this.renderSidebar();
    });

    document.getElementById('tab-tables').addEventListener('click', () => {
      this.activeTab = 'tables';
      document.getElementById('tab-tables').classList.add('active');
      document.getElementById('tab-unassigned').classList.remove('active');
      this.renderSidebar();
    });

    // Search input
    document.getElementById('guest-search').addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.renderSidebar();
    });

    // Filter pills
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeFilter = pill.getAttribute('data-filter');
        this.renderSidebar();
      });
    });

    // Seat Modal events
    document.getElementById('btn-close-seat-modal').addEventListener('click', () => this.closeModal('seat-modal'));
    document.getElementById('btn-cancel-seat').addEventListener('click', () => this.closeModal('seat-modal'));
    document.getElementById('btn-confirm-seat').addEventListener('click', () => this.confirmSeatAssignment());
    document.getElementById('btn-vacate-seat').addEventListener('click', () => this.vacateActiveSeat());

    // Table Modal events
    document.getElementById('btn-close-table-modal').addEventListener('click', () => this.closeModal('table-modal'));
    document.getElementById('btn-cancel-table').addEventListener('click', () => this.closeModal('table-modal'));
    document.getElementById('btn-save-table').addEventListener('click', () => this.saveTableConfig());

    // Quick Assign Modal events
    document.getElementById('btn-close-quick-assign-modal').addEventListener('click', () => this.closeModal('quick-assign-modal'));
    document.getElementById('btn-cancel-quick-assign').addEventListener('click', () => this.closeModal('quick-assign-modal'));

    // CSV Modal events
    document.getElementById('btn-close-csv-modal').addEventListener('click', () => this.closeModal('csv-modal'));
    document.getElementById('btn-cancel-csv').addEventListener('click', () => this.closeModal('csv-modal'));
    document.getElementById('input-csv-file').addEventListener('change', (e) => this.handleCustomCsvUpload(e));
    document.getElementById('btn-reload-default-csv').addEventListener('click', () => {
      this.loadGuestData(RAW_CSV_DATA);
      this.seatingManager.guests = this.guests;
      this.syncAll();
      this.closeModal('csv-modal');
      this.showToast('CSV original de Fernando & Luisa restaurado');
    });

    // Backup Modal events
    document.getElementById('btn-close-backup-modal').addEventListener('click', () => this.closeModal('backup-modal'));
    document.getElementById('btn-close-backup').addEventListener('click', () => this.closeModal('backup-modal'));
    document.getElementById('btn-copy-backup-json').addEventListener('click', () => {
      const area = document.getElementById('backup-json-area');
      navigator.clipboard.writeText(area.value);
      this.showToast('¡Copia JSON copiada al portapapeles!');
    });
    document.getElementById('btn-load-backup-json').addEventListener('click', () => {
      const jsonStr = document.getElementById('backup-json-area').value;
      if (this.seatingManager.importBackupJSON(jsonStr)) {
        this.syncAll();
        this.closeModal('backup-modal');
        this.showToast('¡Distribución cargada exitosamente desde JSON!');
      } else {
        alert('El JSON proporcionado no tiene el formato esperado.');
      }
    });
  }

  renderSidebar() {
    const container = document.getElementById('sidebar-content');
    container.innerHTML = '';

    if (this.activeTab === 'unassigned') {
      this.renderUnassignedTab(container);
    } else {
      this.renderTablesTab(container);
    }
  }

  renderUnassignedTab(container) {
    let unassigned = this.seatingManager.getUnassignedGuests();

    // Filter by type
    if (this.activeFilter !== 'all') {
      unassigned = unassigned.filter(g => g.type === this.activeFilter);
    }

    // Filter by search query
    if (this.searchQuery) {
      unassigned = unassigned.filter(g =>
        g.displayName.toLowerCase().includes(this.searchQuery) ||
        g.groupName.toLowerCase().includes(this.searchQuery) ||
        (g.phone && g.phone.includes(this.searchQuery))
      );
    }

    if (unassigned.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:var(--color-text-dim);">
          <div style="font-size:36px; margin-bottom:8px;">🎉</div>
          <div style="font-size:14px; font-weight:600; color:#ffffff;">No hay invitados pendientes</div>
          <div style="font-size:12px; margin-top:4px;">
            ${this.searchQuery ? 'Ningún invitado coincide con la búsqueda' : '¡Todos los invitados confirmados ya tienen mesa asignada!'}
          </div>
        </div>
      `;
      return;
    }

    unassigned.forEach(guest => {
      const card = document.createElement('div');
      card.className = 'guest-card';

      let typeBadge = '';
      if (guest.type === 'familia') {
        typeBadge = `<span class="badge-tag familia">Familia ${guest.displayBadge || ''}</span>`;
      } else if (guest.type === 'pareja') {
        typeBadge = `<span class="badge-tag pareja">Pareja</span>`;
      } else {
        typeBadge = `<span class="badge-tag individual">1 Pase</span>`;
      }

      card.innerHTML = `
        <div class="guest-card-info">
          <div class="guest-name-row">
            <span class="guest-card-name" title="${guest.displayName}">${escapeHtml(guest.displayName)}</span>
            ${typeBadge}
          </div>
          <div class="guest-card-meta">
            <span>Grupo: ${escapeHtml(guest.groupName)}</span>
            ${guest.phone ? `<span>• 📞 ${guest.phone}</span>` : ''}
          </div>
        </div>
        <button class="btn-assign-quick" data-guest-id="${guest.id}" title="Ubicar a este invitado en una mesa disponible">
          Asignar 🪑
        </button>
      `;

      card.querySelector('.btn-assign-quick').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openQuickAssignModal(guest);
      });

      container.appendChild(card);
    });
  }

  renderTablesTab(container) {
    this.seatingManager.tables.forEach((table, tIdx) => {
      const card = document.createElement('div');
      card.className = 'table-card';
      card.id = `sidebar-table-${table.id}`;

      const occupied = table.seats.filter(s => s.guestId).length;
      const isNovios = Boolean(table.isNoviosTable);

      let capacityControls = '';
      if (!isNovios) {
        capacityControls = `
          <button class="btn btn-secondary btn-icon btn-add-cap" style="width:24px; height:24px; font-size:11px;" title="Aumentar capacidad de esta mesa (+1 puesto, hasta 15)">
            ➕
          </button>
          <button class="btn btn-secondary btn-icon btn-remove-cap" style="width:24px; height:24px; font-size:11px;" title="Disminuir capacidad (-1 puesto)">
            ➖
          </button>
        `;
      }

      card.innerHTML = `
        <div class="table-card-head">
          <div class="table-card-title">
            <span>${isNovios ? '👑' : '🍽️'}</span>
            <span>${escapeHtml(table.name)}</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:11.5px; color:${occupied === table.capacity ? '#f59e0b' : 'var(--color-text-muted)'}; font-weight:700;">
              ${occupied}/${table.capacity}
            </span>
            ${capacityControls}
            <button class="btn btn-secondary btn-icon btn-edit-table" style="width:24px; height:24px; font-size:11px;" title="Editar nombre o capacidad">
              ✏️
            </button>
            <button class="btn btn-secondary btn-icon btn-focus-table" style="width:24px; height:24px; font-size:11px;" title="Ver mesa en 3D">
              🔍
            </button>
          </div>
        </div>
        <div class="table-seats-grid"></div>
      `;

      if (!isNovios) {
        // Increase capacity (+1)
        card.querySelector('.btn-add-cap').addEventListener('click', (e) => {
          e.stopPropagation();
          if (table.capacity >= 15) {
            this.showToast('Capacidad máxima de 15 puestos alcanzada para esta mesa');
            return;
          }
          this.seatingManager.adjustTableCapacity(table.id, 1);
          this.syncAll();
          this.showToast(`${table.name} ampliada a ${table.capacity} puestos`);
        });

        // Decrease capacity (-1)
        card.querySelector('.btn-remove-cap').addEventListener('click', (e) => {
          e.stopPropagation();
          if (table.capacity <= occupied) {
            this.showToast(`No puedes reducir la mesa por debajo de los ocupantes actuales (${occupied})`);
            return;
          }
          if (table.capacity <= 8) {
            this.showToast('Capacidad mínima alcanzada (8 puestos)');
            return;
          }
          this.seatingManager.adjustTableCapacity(table.id, -1);
          this.syncAll();
          this.showToast(`${table.name} reducida a ${table.capacity} puestos`);
        });
      }

      // Edit table button
      card.querySelector('.btn-edit-table').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openEditTableModal(table.id);
      });

      // Focus table in 3D
      card.querySelector('.btn-focus-table').addEventListener('click', (e) => {
        e.stopPropagation();
        this.scene.focusTable(table.id);
      });

      // Grid of seats
      const seatsGrid = card.querySelector('.table-seats-grid');
      table.seats.forEach((seat, sIdx) => {
        const slot = document.createElement('div');
        const guest = this.guests.find(g => g.id === seat.guestId);
        const isNovioSeat = Boolean(seat.customName || table.isNoviosTable);
        const displayName = seat.customName || (guest ? guest.displayName : '+ Libre');

        slot.className = `seat-slot ${isNovioSeat ? 'occupied novio' : (guest ? 'occupied' : 'empty')}`;
        slot.title = isNovioSeat ? `${seat.customName} (Mesa de Honor)` : (guest ? `${guest.displayName} (Clic para cambiar o liberar)` : `Asiento #${sIdx + 1} (Clic para asignar)`);

        slot.innerHTML = `
          <div class="seat-number">${isNovioSeat ? '👑' : `#${sIdx + 1}`}</div>
          <div class="seat-guest-name">
            ${escapeHtml(displayName)}
          </div>
        `;

        slot.addEventListener('click', () => {
          this.handleSeatClick(table.id, sIdx, guest);
        });

        seatsGrid.appendChild(slot);
      });

      container.appendChild(card);
    });
  }

  /**
   * Dedicated Quick Assign Modal with touch-safe scrolling and distinct table buttons.
   * Eliminates accidental clicks when scrolling on mobile!
   */
  openQuickAssignModal(guest) {
    document.getElementById('quick-assign-guest-name').textContent = guest.displayName;
    document.getElementById('quick-assign-guest-meta').textContent = `Grupo: ${guest.groupName} • Tipo: ${guest.type.toUpperCase()}`;

    const grid = document.getElementById('quick-assign-tables-grid');
    grid.innerHTML = '';

    const guestTables = this.seatingManager.tables.filter(t => !t.isNoviosTable);

    guestTables.forEach(table => {
      const occupied = table.seats.filter(s => s.guestId).length;
      const freeSeats = table.capacity - occupied;
      const isFull = freeSeats === 0;

      const card = document.createElement('div');
      card.className = 'quick-assign-card';
      card.style.cssText = `
        background: ${isFull ? 'rgba(30, 41, 59, 0.7)' : 'rgba(18, 22, 33, 0.95)'};
        border: 1.5px solid ${isFull ? 'rgba(245, 158, 11, 0.35)' : 'var(--color-border)'};
        border-radius: var(--radius-md);
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        user-select: none;
      `;

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-family:var(--font-serif); font-size:14.5px; color:${isFull ? '#fcd34d' : 'var(--color-gold-light)'};">
            🍽️ ${escapeHtml(table.name)}
          </strong>
          <span style="font-size:11.5px; font-weight:700; padding:3px 10px; border-radius:999px; background:${isFull ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}; color:${isFull ? '#f59e0b' : '#34d399'};">
            ${isFull ? `Llena (${table.capacity}/${table.capacity})` : `${freeSeats} puestos libres`}
          </span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:11.5px; color:var(--color-text-dim);">
          <span>Capacidad total: ${table.capacity} personas</span>
          <span style="color:${isFull ? '#f59e0b' : 'var(--color-gold-light)'}; font-weight:600;">
            ${isFull ? (table.capacity < 15 ? '➕ Ampliar y sentar' : 'Capacidad Máxima') : 'Espacio disponible'}
          </span>
        </div>
        <button type="button" class="btn ${isFull ? 'btn-secondary' : 'btn-gold'}" style="width:100%; font-size:12.5px; padding:8px 12px; justify-content:center; margin-top:4px; pointer-events:none;">
          ${isFull ? (table.capacity < 15 ? `➕ Ampliar a ${table.capacity + 1} y ubicar aquí` : 'Mesa llena al máximo (15)') : `Ubicar en ${table.name} 🪑`}
        </button>
      `;

      card.addEventListener('mouseenter', () => {
        card.style.borderColor = 'var(--color-gold-bright)';
        card.style.transform = 'translateY(-2px)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = isFull ? 'rgba(245, 158, 11, 0.35)' : 'var(--color-border)';
        card.style.transform = 'translateY(0)';
      });

      // Touch drag detection so scrolling NEVER triggers accidental assignments
      let touchStartY = 0;
      let isScrolling = false;

      card.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) {
          touchStartY = e.touches[0].clientY;
          isScrolling = false;
        }
      }, { passive: true });

      card.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) {
          if (Math.abs(e.touches[0].clientY - touchStartY) > 8) {
            isScrolling = true;
          }
        }
      }, { passive: true });

      const doAssign = () => {
        if (isScrolling) return; // Ignore if user was dragging to scroll!

        if (!isFull) {
          const emptySeatIdx = table.seats.findIndex(s => !s.guestId);
          if (emptySeatIdx !== -1) {
            this.seatingManager.assignGuest(table.id, emptySeatIdx, guest.id);
            this.syncAll();
            this.closeModal('quick-assign-modal');
            this.showToast(`✅ ${guest.displayName} asignado a ${table.name}`);
          }
        } else if (table.capacity < 15) {
          this.seatingManager.adjustTableCapacity(table.id, 1);
          const newSeatIdx = table.seats.length - 1;
          this.seatingManager.assignGuest(table.id, newSeatIdx, guest.id);
          this.syncAll();
          this.closeModal('quick-assign-modal');
          this.showToast(`✅ ${table.name} ampliada a ${table.capacity} y ${guest.displayName} asignado`);
        } else {
          alert('Esta mesa ya alcanzó la capacidad máxima permitida de 15 personas.');
        }
      };

      card.addEventListener('click', doAssign);

      grid.appendChild(card);
    });

    this.openModal('quick-assign-modal');
  }

  handleSeatClick(tableId, seatIndex, currentGuest) {
    const table = this.seatingManager.tables.find(t => t.id === tableId);
    if (!table) return;

    if (table.isNoviosTable) {
      this.showToast('💍 Esta es la Mesa de Honor exclusiva para los Novios (Fernando & Luisa). Los invitados se ubican en las 8 mesas del salón.');
      return;
    }

    this.activeSeatModal = { tableId, seatIndex };

    const modalTitle = document.getElementById('seat-modal-title');
    const modalInfo = document.getElementById('seat-modal-info');
    const currentOccupantDiv = document.getElementById('seat-current-occupant');
    const occupantName = document.getElementById('seat-occupant-name');
    const guestSelect = document.getElementById('select-guest-to-seat');

    modalTitle.textContent = `${table.name} • Asiento #${seatIndex + 1}`;
    modalInfo.textContent = `Configuración de asignación para la posición #${seatIndex + 1}`;

    if (currentGuest) {
      currentOccupantDiv.style.display = 'block';
      occupantName.textContent = `${currentGuest.displayName} (${currentGuest.groupName})`;
    } else {
      currentOccupantDiv.style.display = 'none';
    }

    // Populate select dropdown with unassigned guests
    guestSelect.innerHTML = '<option value="">-- Seleccionar invitado para sentar --</option>';
    const unassigned = this.seatingManager.getUnassignedGuests();
    unassigned.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = `${g.displayName} [${g.type.toUpperCase()}] - Grupo: ${g.groupName}`;
      guestSelect.appendChild(opt);
    });

    this.openModal('seat-modal');
  }

  confirmSeatAssignment() {
    const { tableId, seatIndex } = this.activeSeatModal;
    const guestSelect = document.getElementById('select-guest-to-seat');
    const guestId = guestSelect.value;

    if (!guestId) {
      this.closeModal('seat-modal');
      return;
    }

    this.seatingManager.assignGuest(tableId, seatIndex, guestId);
    this.syncAll();
    this.closeModal('seat-modal');
    this.showToast('Asiento asignado correctamente');
  }

  vacateActiveSeat() {
    const { tableId, seatIndex } = this.activeSeatModal;
    this.seatingManager.unassignSeat(tableId, seatIndex);
    this.syncAll();
    this.closeModal('seat-modal');
    this.showToast('Asiento liberado');
  }

  handleTableClick(table) {
    this.activeTab = 'tables';
    document.getElementById('tab-tables').classList.add('active');
    document.getElementById('tab-unassigned').classList.remove('active');
    this.renderSidebar();

    // Scroll table card into view in sidebar
    setTimeout(() => {
      const card = document.getElementById(`sidebar-table-${table.id}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.style.borderColor = 'var(--color-gold-bright)';
        setTimeout(() => { card.style.borderColor = ''; }, 1500);
      }
    }, 100);
  }

  handleAutoAssign() {
    this.seatingManager.autoAssignAll();
    this.syncAll();

    // Festive Confetti trigger!
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#d4af37', '#ffd700', '#ffffff', '#e0ac69']
    });

    this.showToast('✨ ¡81 invitados distribuidos exitosamente agrupando familias y parejas!');
  }

  handleExportExcel() {
    const filename = exportToExcel(this.seatingManager.tables, this.guests);

    // Confetti burst for report generation
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 }
    });

    this.showToast(`📊 Reporte Excel "${filename}" generado y descargado`);
  }

  handleToggleLabels() {
    this.labelsVisible = !this.labelsVisible;
    this.scene.toggleLabels(this.labelsVisible);

    const toggleText = document.getElementById('label-toggle-text');
    toggleText.textContent = this.labelsVisible ? 'Nombres 3D (ON)' : 'Nombres 3D (OFF)';
    this.showToast(this.labelsVisible ? 'Nombres flotantes 3D visibles' : 'Nombres 3D ocultos');
  }

  openAddTableModal() {
    this.editingTableId = null;
    document.getElementById('table-modal-title').textContent = 'Agregar Nueva Mesa';
    document.getElementById('input-table-name').value = `Mesa ${this.seatingManager.tables.length + 1}`;
    document.getElementById('input-table-capacity').value = '8';
    this.openModal('table-modal');
  }

  openEditTableModal(tableId) {
    this.editingTableId = tableId;
    const table = this.seatingManager.tables.find(t => t.id === tableId);
    if (!table) return;

    document.getElementById('table-modal-title').textContent = 'Editar Mesa';
    document.getElementById('input-table-name').value = table.name;
    document.getElementById('input-table-capacity').value = table.capacity;
    this.openModal('table-modal');
  }

  saveTableConfig() {
    const name = document.getElementById('input-table-name').value.trim();
    const capacity = parseInt(document.getElementById('input-table-capacity').value, 10);

    if (this.editingTableId) {
      this.seatingManager.updateTable(this.editingTableId, name, capacity);
      this.showToast(`Mesa "${name}" actualizada`);
    } else {
      this.seatingManager.addTable(name, capacity);
      this.showToast(`Nueva mesa "${name}" agregada`);
    }

    this.syncAll();
    this.closeModal('table-modal');
  }

  handleClearAll() {
    if (confirm('¿Estás seguro de que deseas vaciar todas las mesas? Los invitados volverán a la lista de pendientes.')) {
      this.seatingManager.resetAllAssignments();
      this.syncAll();
      this.showToast('Todas las asignaciones han sido vaciadas');
    }
  }

  openCsvModal() {
    this.openModal('csv-modal');
  }

  handleCustomCsvUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        this.loadGuestData(text);
        this.seatingManager.guests = this.guests;
        this.syncAll();
        this.closeModal('csv-modal');
        this.showToast(`CSV cargado con éxito: ${this.guests.length} invitados confirmados`);
      } catch (err) {
        alert('Error procesando archivo CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  openBackupModal() {
    const area = document.getElementById('backup-json-area');
    area.value = this.seatingManager.exportBackupJSON();
    this.openModal('backup-modal');
  }

  openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
  }

  closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toast-message');
    msg.textContent = message;
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3800);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Launch application on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
