// app.js - المحرك الرئيسي للتطبيق مع النسخ الاحتياطي وسجل التدقيق وإعدادات الدفع

const App = {
    currentPageId: null,
    _historyStarted: false,
    _suppressPopState: false,

    init() {
        UI.init();
        DB.maybeCreateAutoBackup();
        this.switchPage('dashboard');
        this.setupBackNavigation();
        this.auditLog('🚀 بدء جلسة عمل جديدة');
        this.maybeRemindExport();
    },

    // ===== تذكير دوري بأخذ نسخة احتياطية يدوية (تصدير) =====
    // النسخ التلقائي المحلي جيد لكنه محصور بهذا الجهاز/المتصفح فقط، لذا
    // يبقى التصدير اليدوي (أو رفعه على Google Drive) هو الضمان الحقيقي
    // ضد فقدان الجهاز أو مسح بيانات المتصفح بالكامل.
    maybeRemindExport() {
        if (!Auth.currentUser || Auth.currentUser.role !== 'manager') return;

        const last = state.settings.lastManualExport;
        const daysSince = last ? (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24) : Infinity;

        if (daysSince >= 14) {
            setTimeout(() => {
                UI.showToast('📦 نصيحة: لم تُصدَّر نسخة احتياطية منذ فترة طويلة، يفضل أخذ نسخة من "إدارة النظام"', 'warning');
            }, 2000);
        }
    },

    // ===== دعم زر/سحبة الرجوع بالمتصفح =====
    // بما أن التطبيق صفحة واحدة (SPA) لا يستخدم روابط حقيقية، سحبة الرجوع
    // لا "تعرف" شيئاً عن التنقل الداخلي إلا إذا سجّلناه بأنفسنا في history.
    setupBackNavigation() {
        window.addEventListener('popstate', (e) => {
            if (this._suppressPopState) {
                this._suppressPopState = false;
                return;
            }

            // أغلق القائمة الجانبية دائماً كخطوة أولى ضمن أي "رجوع"
            UI.closeSidebar(true);

            // لو كانت هناك نافذة منبثقة (مودال) مفتوحة، أغلقها فقط ولا تنتقل
            // بين الصفحات بنفس خطوة الرجوع (مطابق لسلوك التطبيقات المعتادة)
            const modal = document.getElementById('modal-container');
            if (modal && modal.style.display === 'flex') {
                UI.closeModal(true);
                return;
            }

            const page = (e.state && e.state.page) || 'dashboard';
            this.switchPage(page, true);
        });
    },

    // يُستخدم لإزالة خطوة من سجل history برمجياً (مثلاً عند إغلاق مودال
    // بالضغط على زر داخله) دون أن يتسبب ذلك بتنقل غير مقصود
    consumeHistoryEntry() {
        this._suppressPopState = true;
        history.back();
    },

    auditLog(message) {
        DB.addAuditLog(message);
    },

    switchPage(id, isPopState = false) {
        const area = document.getElementById('content-area');
        if (!area) return;

        // التحقق من الصلاحية لكل الصفحات المحمية (ماعدا لوحة التحكم، متاحة للجميع)
        const protectedPages = ['pos', 'wholesale', 'inventory', 'crm', 'purchases', 'accounting', 'reports'];
        if (protectedPages.includes(id) && !Auth.canAccessPage(id)) {
            UI.showToast('⚠️ لا تملك صلاحية الوصول إلى هذه الصفحة', 'warning');
            if (!isPopState) return;
            // في حالة رجوع المتصفح لصفحة ممنوعة، أعده للوحة التحكم بدل رفض التنقل بصمت
            id = 'dashboard';
        }

        const isSamePage = this.currentPageId === id;

        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('active');
            document.getElementById('sidebar-overlay').style.display = 'none';
        }

        try {
            switch(id) {
                case 'dashboard':
                    area.innerHTML = this.tplDashboard();
                    break;
                case 'pos':
                    area.innerHTML = POS.render();
                    setTimeout(() => POS.init(), 100);
                    break;
                case 'inventory':
                    area.innerHTML = Inventory.render();
                    break;
                case 'purchases':
                    Purchases.renderPage(area);
                    break;
                case 'wholesale':
                    Wholesale.renderPage(area);
                    break;
                case 'accounting':
                    Accounting.renderPage(area);
                    break;
                case 'crm':
                    area.innerHTML = CRM.render();
                    break;
                case 'reports':
                    Reports.renderPage(area);
                    break;
                default:
                    area.innerHTML = `<div class="card"><h3>قيد التطوير</h3></div>`;
            }
        } catch (error) {
            console.error('Error loading page:', error);
            area.innerHTML = `
                <div class="card" style="border-right: 5px solid var(--danger);">
                    <h3 style="color: var(--danger);">⚠️ حدث خطأ في تحميل الصفحة</h3>
                    <p>${error.message}</p>
                </div>
            `;
            UI.showToast('❌ حدث خطأ في تحميل الصفحة', 'error');
        }

        const navItem = document.querySelector(`li[onclick*="'${id}'"]`);
        if (navItem) {
            navItem.classList.add('active');
            document.getElementById('page-title').innerText = navItem.innerText.trim();
        }

        this.currentPageId = id;

        if (!isPopState) {
            if (!this._historyStarted) {
                history.replaceState({ page: id }, '', '#' + id);
                this._historyStarted = true;
            } else if (isSamePage) {
                // مجرد تحديث لنفس الصفحة (بعد حفظ بيانات مثلاً) - لا نضيف خطوة
                // تنقل جديدة، وإلا احتاج المستخدم سحبات رجوع كثيرة لا معنى لها
                history.replaceState({ page: id }, '', '#' + id);
            } else {
                history.pushState({ page: id }, '', '#' + id);
            }
        }

        if (!isSamePage || isPopState) {
            this.auditLog(`📄 فتح صفحة: ${id}`);
        }
    },

    tplDashboard() {
        const stats = DB.getStats();
        const todaySales = stats.todayRevenue;
        const totalSales = stats.totalRevenue;
        const lowStock = stats.lowStockItems;
        const totalDebt = stats.totalDebt;
        const customerStats = stats.customerStats || { totalCustomers: 0, totalDebt: 0 };
        const supplierStats = stats.supplierStats || { totalSuppliers: 0, totalPurchases: 0 };
        const employeeStats = stats.employeeStats || { totalEmployees: 0, activeEmployees: 0 };

        return `
            <div class="stats-grid">
                <div class="card" style="border-right: 5px solid var(--success);">
                    <small>💰 مبيعات اليوم</small>
                    <h2 style="color: var(--success);">${todaySales.toFixed(2)} ₪</h2>
                    <small style="font-size:0.7rem;color:var(--text-secondary);">${stats.todaySales} فاتورة</small>
                </div>
                <div class="card" style="border-right: 5px solid var(--accent);">
                    <small>📊 إجمالي المبيعات</small>
                    <h2>${totalSales.toFixed(2)} ₪</h2>
                </div>
                <div class="card" style="border-right: 5px solid var(--danger);">
                    <small>⚠️ نواقص المخزون</small>
                    <h2 style="color: ${lowStock > 0 ? 'var(--danger)' : 'var(--success)'};">${lowStock}</h2>
                </div>
                <div class="card" style="border-right: 5px solid var(--warning);">
                    <small>💳 الديون (لنا)</small>
                    <h2 style="color: var(--warning);">${totalDebt.toFixed(2)} ₪</h2>
                </div>
                <div class="card" style="border-right: 5px solid var(--accent);">
                    <small>👥 العملاء</small>
                    <h2>${customerStats.totalCustomers}</h2>
                    <small style="font-size:0.7rem;color:var(--text-secondary);">إجمالي الديون: ${customerStats.totalDebt.toFixed(2)} ₪</small>
                </div>
                <div class="card" style="border-right: 5px solid var(--success);">
                    <small>👨‍💼 الموظفين</small>
                    <h2>${employeeStats.totalEmployees}</h2>
                    <small style="font-size:0.7rem;color:var(--text-secondary);">نشط: ${employeeStats.activeEmployees}</small>
                </div>
                <div class="card" style="border-right: 5px solid var(--primary);">
                    <small>🔄 الوردية</small>
                    <button onclick="App.toggleShift()" class="btn-primary" style="margin-top:5px;background:${state.settings.shiftOpen ? 'var(--danger)' : 'var(--success)'};">
                        ${state.settings.shiftOpen ? '🔴 إغلاق' : '🟢 فتح'}
                    </button>
                </div>
                <div class="card" style="border-right: 5px solid var(--accent); grid-column: span 1;">
                    <small>👥 المستخدمين</small>
                    <h2>${stats.totalUsers}</h2>
                </div>
            </div>
            
            <div class="card">
                <h3>🏪 مرحباً في نظام شكور</h3>
                <p style="color:var(--text-secondary);">
                    استخدم القائمة الجانبية للتنقل بين الأقسام المختلفة.
                    ${state.settings.shiftOpen ? '✅ الوردية مفتوحة، يمكنك البدء بالبيع.' : '⚠️ الوردية مغلقة، افتح الوردية أولاً.'}
                </p>
                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;">
                    <button onclick="App.switchPage('pos')" class="btn-success" style="padding:10px 20px;border:none;border-radius:6px;cursor:pointer;">
                        🛒 فتح الكاشير
                    </button>
                    <button onclick="App.switchPage('inventory')" class="btn-primary" style="padding:10px 20px;border:none;border-radius:6px;cursor:pointer;">
                        📦 إدارة المخزون
                    </button>
                    <button onclick="App.switchPage('crm')" class="btn-primary" style="padding:10px 20px;border:none;border-radius:6px;cursor:pointer;background:var(--success);">
                        👥 العملاء والموردين
                    </button>
                    <button onclick="App.showSystemMenu()" class="btn-primary" style="padding:10px 20px;background:var(--warning);border:none;border-radius:6px;cursor:pointer;">
                        ⚙️ إدارة النظام
                    </button>
                    <button onclick="App.showPaymentSettings()" class="btn-primary" style="padding:10px 20px;background:var(--accent);border:none;border-radius:6px;cursor:pointer;">
                        💳 إعدادات الدفع
                    </button>
                </div>
            </div>
            
            <div class="card">
                <h4>📋 آخر النشاطات</h4>
                <div style="max-height: 150px; overflow-y: auto; font-size: 0.85rem;">
                    ${(state.auditLog || []).slice(0, 5).map(log => `
                        <div style="padding:4px 0;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:center;">
                            <i class="fas fa-circle" style="font-size:6px;color:var(--accent);"></i>
                            <span>${log}</span>
                        </div>
                    `).join('')}
                    ${(!state.auditLog || state.auditLog.length === 0) ? `
                        <div style="text-align:center;color:var(--text-secondary);padding:10px;">لا توجد سجلات</div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    toggleShift() {
        state.settings.shiftOpen = !state.settings.shiftOpen;
        if (state.settings.shiftOpen) {
            state.settings.openingBalance = parseFloat(prompt('💰 أدخل مبلغ العهدة الافتتاحية:', '0')) || 0;
            state.settings.shiftStartTime = new Date().toISOString();
            this.auditLog(`🟢 فتح وردية - العهدة: ${state.settings.openingBalance} ₪`);
            UI.showToast(`✅ تم فتح الوردية بالعهدة: ${state.settings.openingBalance} ₪`, 'success');
        } else {
            const shiftStart = state.settings.shiftStartTime ? new Date(state.settings.shiftStartTime) : new Date(0);
            const shiftSales = DB.getAllSales().filter(s => new Date(s.date) >= shiftStart);
            const totalSales = shiftSales.reduce((a, b) => a + b.total, 0);
            state.settings.shiftEndTime = new Date().toISOString();
            this.auditLog(`🔴 إغلاق وردية - إجمالي مبيعات الوردية: ${totalSales.toFixed(2)} ₪ (${shiftSales.length} عملية)`);
            UI.showToast(`✅ تم إغلاق الوردية\nإجمالي مبيعات الوردية: ${totalSales.toFixed(2)} ₪`, 'success');
        }
        updateState();
        UI.updateShiftBadge();
        this.switchPage('dashboard');
    },

    // ===== إعدادات طرق الدفع =====
    showPaymentSettings() {
        if (!Auth.hasPermission('manage_payment')) {
            UI.showToast('⚠️ لا تملك صلاحية إدارة طرق الدفع', 'warning');
            return;
        }

        const paymentMethods = DB.getPaymentMethods();
        const persons = DB.getPersons();
        
        const html = `
            <div style="max-height: 400px; overflow-y: auto;">
                <h4 style="margin-bottom:10px;">💳 طرق الدفع</h4>
                ${paymentMethods.map(m => `
                    <div style="background: var(--bg); padding: 10px 15px; margin-bottom: 6px; border-radius: 8px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: bold;">
                                <i class="fas ${m.icon}" style="color: ${m.color};"></i>
                                ${m.name}
                                ${m.requirePerson ? ' 👤' : ''}
                            </div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">
                                الحالة: ${m.status === 'paid' ? '✅ مدفوعة' : m.status === 'unpaid' ? '❌ غير مدفوعة' : '⏳ قيد الانتظار'}
                                ${m.enabled ? '🟢 مفعل' : '🔴 معطل'}
                            </div>
                        </div>
                        <div>
                            <button onclick="App.togglePaymentMethod('${m.id}')" class="btn-${m.enabled ? 'warning' : 'success'}" style="padding:4px 10px;font-size:0.7rem;border:none;border-radius:4px;cursor:pointer;background:${m.enabled ? 'var(--warning)' : 'var(--success)'};color:white;">
                                ${m.enabled ? 'تعطيل' : 'تفعيل'}
                            </button>
                            ${!['cash','credit','bank_transfer','credit_card','check','digital_wallet'].includes(m.id) ? `
                                <button onclick="App.deletePaymentMethod('${m.id}')" class="btn-danger" style="padding:4px 10px;font-size:0.7rem;border:none;border-radius:4px;cursor:pointer;">
                                    ✕
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
                
                <hr>
                <button onclick="App.showAddPaymentForm()" class="btn-success" style="width:100%; padding: 10px; margin-bottom: 10px;border:none;border-radius:6px;cursor:pointer;">
                    <i class="fas fa-plus"></i> إضافة طريقة دفع جديدة
                </button>
                
                <h4 style="margin:15px 0 10px;">👤 الأشخاص (للدفع الآجل)</h4>
                ${persons.map(p => `
                    <div style="background: var(--bg); padding: 8px 12px; margin-bottom: 4px; border-radius: 6px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; font-size:0.85rem;">
                        <span>${p.name} <small style="color:var(--text-secondary);">(${p.type})</small></span>
                        <span style="color: ${p.balance > 0 ? 'var(--danger)' : 'var(--success)'};">${p.balance ? `${p.balance.toFixed(2)} ₪` : '0.00 ₪'}</span>
                    </div>
                `).join('')}
                <button onclick="App.showAddPersonForm()" class="btn-primary" style="width:100%; padding: 8px; margin-top: 8px;border:none;border-radius:6px;cursor:pointer;">
                    <i class="fas fa-user-plus"></i> إضافة شخص جديد
                </button>
            </div>
            <hr>
            <button onclick="UI.closeModal()" class="btn-primary" style="width:100%; padding: 10px; background: var(--text-secondary);border:none;border-radius:6px;cursor:pointer;color:white;">
                ✕ إغلاق
            </button>
        `;
        
        UI.showModal('⚙️ إعدادات الدفع', html);
    },

    showAddPaymentForm() {
        const html = `
            <label>🏷️ اسم طريقة الدفع</label>
            <input type="text" id="new-payment-name" class="form-control" placeholder="مثل: باي بال">
            
            <label>🎨 لون (Hex)</label>
            <input type="text" id="new-payment-color" class="form-control" placeholder="#3b82f6" value="#3b82f6">
            
            <label>🖼️ أيقونة (Font Awesome)</label>
            <input type="text" id="new-payment-icon" class="form-control" placeholder="fa-credit-card" value="fa-credit-card">
            
            <label>📊 حالة الدفع</label>
            <select id="new-payment-status" class="form-control">
                <option value="paid">✅ مدفوعة</option>
                <option value="unpaid">❌ غير مدفوعة</option>
                <option value="pending">⏳ قيد الانتظار</option>
            </select>
            
            <label>👤 يتطلب اختيار شخص</label>
            <select id="new-payment-require" class="form-control">
                <option value="false">لا</option>
                <option value="true">نعم</option>
            </select>
            
            <button onclick="App.savePaymentMethod()" class="btn-success" style="width:100%; margin-top:15px; padding: 12px;border:none;border-radius:6px;cursor:pointer;">
                <i class="fas fa-save"></i> حفظ طريقة الدفع
            </button>
        `;
        UI.showModal('➕ إضافة طريقة دفع جديدة', html);
    },

    savePaymentMethod() {
        const name = document.getElementById('new-payment-name').value.trim();
        const color = document.getElementById('new-payment-color').value.trim() || '#3b82f6';
        const icon = document.getElementById('new-payment-icon').value.trim() || 'fa-credit-card';
        const status = document.getElementById('new-payment-status').value;
        const requirePerson = document.getElementById('new-payment-require').value === 'true';
        
        if (!name) {
            UI.showToast('⚠️ يرجى إدخال اسم طريقة الدفع', 'warning');
            return;
        }
        
        const method = {
            id: name.toLowerCase().replace(/\s/g, '_'),
            name: name,
            icon: icon,
            color: color,
            status: status,
            requirePerson: requirePerson,
            enabled: true
        };
        
        DB.addPaymentMethod(method);
        UI.closeModal();
        UI.showToast(`✅ تم إضافة طريقة الدفع: ${name}`, 'success');
        this.showPaymentSettings();
    },

    togglePaymentMethod(id) {
        const method = DB.getPaymentMethod(id);
        if (!method) {
            UI.showToast('⚠️ طريقة الدفع غير موجودة', 'warning');
            return;
        }
        
        method.enabled = !method.enabled;
        DB.updatePaymentMethod(id, { enabled: method.enabled });
        UI.showToast(`${method.enabled ? '✅ تم تفعيل' : '⛔ تم تعطيل'} ${method.name}`, 'info');
        this.showPaymentSettings();
    },

    deletePaymentMethod(id) {
        if (!confirm('هل أنت متأكد من حذف طريقة الدفع هذه؟')) return;
        DB.deletePaymentMethod(id);
        UI.showToast('✅ تم حذف طريقة الدفع', 'success');
        this.showPaymentSettings();
    },

    showAddPersonForm() {
        const html = `
            <label>👤 الاسم الكامل</label>
            <input type="text" id="new-person-name" class="form-control" placeholder="أدخل الاسم">
            
            <label>📱 رقم الهاتف</label>
            <input type="text" id="new-person-phone" class="form-control" placeholder="أدخل رقم الهاتف">
            
            <label>🏷️ النوع</label>
            <select id="new-person-type" class="form-control">
                <option value="customer">👤 عميل</option>
                <option value="supplier">🏢 مورد</option>
                <option value="employee">👨‍💼 موظف</option>
                <option value="manager">👑 مدير</option>
            </select>
            
            <label>📍 العنوان (اختياري)</label>
            <input type="text" id="new-person-address" class="form-control" placeholder="أدخل العنوان">
            
            <button onclick="App.saveNewPerson()" class="btn-success" style="width:100%; margin-top:15px; padding: 12px;border:none;border-radius:6px;cursor:pointer;">
                <i class="fas fa-save"></i> حفظ وإضافة
            </button>
        `;
        UI.showModal('➕ إضافة شخص جديد', html);
    },

    saveNewPerson() {
        const name = document.getElementById('new-person-name').value.trim();
        const phone = document.getElementById('new-person-phone').value.trim();
        const type = document.getElementById('new-person-type').value;
        
        if (!name) {
            UI.showToast('⚠️ يرجى إدخال الاسم', 'warning');
            return;
        }
        
        Auth.addPerson(name, type, phone, 0);
        UI.closeModal();
        UI.showToast(`✅ تم إضافة ${name} بنجاح`, 'success');
        this.showPaymentSettings();
    },

    // ===== قائمة إدارة النظام =====
    showSystemMenu() {
        const isManager = Auth.currentUser && Auth.currentUser.role === 'manager';
        if (!Auth.canAccessPage('system')) {
            UI.showToast('⚠️ لا تملك صلاحية الوصول إلى إدارة النظام', 'warning');
            return;
        }

        const html = `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${isManager ? `
                    <button onclick="Auth.showUserManager()" class="btn-primary" style="padding: 12px; width: 100%;border:none;border-radius:6px;cursor:pointer;">
                        <i class="fas fa-users"></i> إدارة المستخدمين والصلاحيات
                    </button>
                ` : ''}
                <button onclick="App.exportData()" class="btn-success" style="padding: 12px; width: 100%;border:none;border-radius:6px;cursor:pointer;">
                    <i class="fas fa-download"></i> تصدير نسخة احتياطية
                </button>
                <button onclick="App.importData()" class="btn-primary" style="padding: 12px; width: 100%;border:none;border-radius:6px;cursor:pointer;">
                    <i class="fas fa-upload"></i> استيراد نسخة احتياطية
                </button>
                <button onclick="App.showAutoBackups()" class="btn-primary" style="padding: 12px; width: 100%; background: var(--warning);border:none;border-radius:6px;cursor:pointer;">
                    <i class="fas fa-clock-rotate-left"></i> النسخ الاحتياطية التلقائية
                </button>
                <hr>
                <div style="text-align:center;font-weight:500;">☁️ المزامنة بين الأجهزة (Google Drive)</div>
                ${GDrive.isConnected() ? `
                    <div style="text-align:center;font-size:0.85rem;color:var(--text-secondary);">
                        متصل: ${state.settings.gdriveEmail || '...'}
                        ${state.settings.lastGDriveSync ? `<br>آخر مزامنة: ${new Date(state.settings.lastGDriveSync).toLocaleString('ar-SA')}` : ''}
                    </div>
                    <button onclick="GDrive.upload()" class="btn-success" style="padding: 12px; width: 100%;border:none;border-radius:6px;cursor:pointer;">
                        <i class="fas fa-cloud-upload-alt"></i> ⬆️ رفع نسخة هذا الجهاز
                    </button>
                    <button onclick="GDrive.download()" class="btn-primary" style="padding: 12px; width: 100%;border:none;border-radius:6px;cursor:pointer;">
                        <i class="fas fa-cloud-download-alt"></i> ⬇️ تنزيل آخر نسخة محفوظة
                    </button>
                    <button onclick="GDrive.disconnect(); App.showSystemMenu();" class="btn-danger" style="padding: 10px; width: 100%;border:none;border-radius:6px;cursor:pointer;">
                        🔌 قطع الاتصال
                    </button>
                ` : `
                    <button onclick="GDrive.connect(() => App.showSystemMenu())" class="btn-primary" style="padding: 12px; width: 100%;border:none;border-radius:6px;cursor:pointer;">
                        <i class="fab fa-google"></i> ربط حساب Google Drive
                    </button>
                `}
                ${isManager ? `
                    <hr>
                    <button onclick="App.resetSystem()" class="btn-danger" style="padding: 12px; width: 100%;border:none;border-radius:6px;cursor:pointer;">
                        <i class="fas fa-trash"></i> إعادة تعيين النظام
                    </button>
                ` : ''}
                <hr>
                <button onclick="UI.closeModal()" class="btn-primary" style="padding: 12px; width: 100%; background: var(--text-secondary);border:none;border-radius:6px;cursor:pointer;color:white;">
                    ✕ إغلاق
                </button>
            </div>
        `;

        UI.showModal('⚙️ إدارة النظام', html);
    },

    // ===== تصدير البيانات =====
    exportData() {
        DB.exportData();
        state.settings.lastManualExport = new Date().toISOString();
        updateState();
    },

    // ===== استيراد البيانات =====
    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const result = DB.importData(event.target.result);
                    if (result.success) {
                        UI.showToast('✅ تم استيراد البيانات بنجاح', 'success');
                        setTimeout(() => location.reload(), 1500);
                    } else {
                        UI.showToast(`❌ ${result.message}`, 'error');
                    }
                } catch (error) {
                    UI.showToast('❌ خطأ في قراءة الملف', 'error');
                    console.error(error);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    },

    // ===== استعادة النسخة الاحتياطية اليدوية القديمة (نسخة واحدة فقط) =====
    restoreBackup() {
        const result = DB.restoreBackup();
        if (result.success) {
            setTimeout(() => location.reload(), 1500);
        }
    },

    // ===== عرض النسخ الاحتياطية التلقائية (أرشيف متعدد النقاط) =====
    showAutoBackups() {
        const backups = DB.getAutoBackups().slice().reverse();

        const html = `
            <div style="max-height: 400px; overflow-y: auto;">
                <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:12px;">
                    يأخذ التطبيق نسخة احتياطية تلقائياً على هذا الجهاز عند أول فتح كل يوم،
                    ويحتفظ بآخر ${DB.MAX_AUTO_BACKUPS} نسخ. هذه النسخ محلية فقط (لا تُرفع لأي مكان)
                    وتُفقد إذا تم مسح بيانات المتصفح.
                </p>
                ${backups.length === 0 ? `
                    <div style="text-align:center;color:var(--text-secondary);padding:20px;">لا توجد نسخ تلقائية بعد</div>
                ` : ''}
                ${backups.map(b => `
                    <div style="background: var(--bg); padding: 12px 15px; margin-bottom: 8px; border-radius: 10px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <div>
                            <div style="font-weight: bold;">${new Date(b.timestamp).toLocaleDateString('ar-SA')}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">${new Date(b.timestamp).toLocaleTimeString('ar-SA')}</div>
                        </div>
                        <button onclick="App.restoreAutoBackup('${b.timestamp}')" class="btn-primary" style="padding: 6px 14px; font-size: 0.8rem;">
                            <i class="fas fa-clock-rotate-left"></i> استعادة
                        </button>
                    </div>
                `).join('')}
            </div>
            <hr>
            <button onclick="UI.closeModal()" class="btn-primary" style="width:100%; padding: 10px; background: var(--text-secondary);">✕ إغلاق</button>
        `;
        UI.showModal('🕐 النسخ الاحتياطية التلقائية', html);
    },

    restoreAutoBackup(timestamp) {
        UI.confirmAction(
            '⚠️ سيتم استبدال كل بيانات هذا الجهاز الحالية بهذه النسخة. هل أنت متأكد؟',
            function() {
                const result = DB.restoreAutoBackup(timestamp);
                if (result.success) {
                    UI.showToast('✅ تم استعادة النسخة، سيُعاد تحميل التطبيق الآن', 'success');
                    setTimeout(() => location.reload(), 1500);
                } else {
                    UI.showToast('❌ فشل استعادة النسخة', 'error');
                }
            }
        );
    },

    // ===== إعادة تعيين النظام =====
    resetSystem() {
        UI.confirmAction(
            '⚠️ تحذير: سيتم حذف جميع البيانات بشكل نهائي. هل أنت متأكد؟',
            function() {
                UI.confirmAction(
                    '⚠️ تأكيد نهائي: هل تريد مسح كل شيء؟',
                    function() {
                        DB.clearAll();
                    }
                );
            }
        );
    },

    // ===== مسح الباركود =====
    // targetId: (اختياري) id لحقل إدخال يوضع فيه النص الممسوح
    // onScan: (اختياري) دالة تُستدعى بالنص الممسوح بدلاً من تعبئة حقل إدخال
    startScanner(targetId = null, onScan = null) {
        const overlay = document.getElementById('scanner-overlay');
        if (!overlay) {
            UI.showToast('❌ عنصر الكاميرا غير موجود', 'error');
            return;
        }

        // إن كانت هناك كاميرا مفتوحة مسبقاً، أغلقها أولاً لتحرير الجهاز
        if (POS.scanner) {
            this.stopScanner();
        }

        overlay.style.display = 'flex';
        overlay.classList.add('active');

        const readerElement = document.getElementById('reader');
        if (!readerElement) {
            UI.showToast('❌ عنصر القارئ غير موجود', 'error');
            overlay.style.display = 'none';
            overlay.classList.remove('active');
            return;
        }

        readerElement.innerHTML = '';

        if (typeof Html5Qrcode === 'undefined') {
            UI.showToast('❌ مكتبة المسح غير محملة', 'error');
            overlay.style.display = 'none';
            overlay.classList.remove('active');
            return;
        }

        try {
            const scanner = new Html5Qrcode("reader");
            POS.scanner = scanner;

            // صندوق مسح مستطيل (أعرض من ارتفاعه) لأنه أنسب لقراءة باركودات
            // خط 1D مثل EAN/UPC/CODE128 مقارنة بالصندوق المربع
            const config = {
                fps: 10,
                qrbox: { width: 300, height: 150 },
                aspectRatio: 1.777,
                disableFlip: false
            };

            if (typeof Html5QrcodeSupportedFormats !== 'undefined') {
                config.formatsToSupport = [
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.CODABAR,
                    Html5QrcodeSupportedFormats.ITF
                ];
                config.experimentalFeatures = { useBarCodeDetectorIfSupported: true };
            }

            scanner.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    UI.showToast(`✅ تم مسح الباركود: ${decodedText}`, 'success');
                    if (navigator.vibrate) navigator.vibrate(100);

                    if (typeof onScan === 'function') {
                        onScan(decodedText);
                    } else if (targetId) {
                        const input = document.getElementById(targetId);
                        if (input) {
                            input.value = decodedText;
                            input.dispatchEvent(new Event('change'));
                        }
                    }

                    App.stopScanner();
                },
                (errorMessage) => {
                    console.debug('Scanning...', errorMessage);
                }
            ).then(() => {
                console.log('✅ الكاميرا تعمل');
                if (POS.flashOn) {
                    try {
                        const videoElement = document.querySelector('#reader video');
                        if (videoElement && videoElement.srcObject) {
                            const track = videoElement.srcObject.getVideoTracks()[0];
                            if (track && track.getCapabilities && track.getCapabilities().torch) {
                                track.applyConstraints({
                                    advanced: [{ torch: true }]
                                });
                            }
                        }
                    } catch (e) {}
                }
            }).catch(err => {
                console.error('Scanner error:', err);
                UI.showToast('❌ فشل في تشغيل الكاميرا، تأكد من السماح بالوصول لها', 'error');
                POS.scanner = null;
                overlay.style.display = 'none';
                overlay.classList.remove('active');
                readerElement.innerHTML = '';
            });
        } catch (error) {
            console.error('Scanner initialization error:', error);
            UI.showToast('❌ حدث خطأ في تهيئة الكاميرا', 'error');
            POS.scanner = null;
            overlay.style.display = 'none';
            overlay.classList.remove('active');
            readerElement.innerHTML = '';
        }
    },

    stopScanner() {
        const overlay = document.getElementById('scanner-overlay');
        const readerElement = document.getElementById('reader');
        const scanner = POS.scanner;

        const finishClose = () => {
            if (overlay) {
                overlay.style.display = 'none';
                overlay.classList.remove('active');
            }
            if (readerElement) {
                readerElement.innerHTML = '';
            }
            POS.scanner = null;
        };

        if (scanner) {
            // إيقاف البث فعلياً حتى تنطفئ الكاميرا (وليس فقط إخفاء العنصر)
            scanner.stop().then(() => {
                try { scanner.clear(); } catch (e) {}
                finishClose();
            }).catch(() => {
                finishClose();
            });
        } else {
            finishClose();
        }
    }
};