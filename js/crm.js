// crm.js - إدارة العملاء والموردين والموظفين (نسخة مصححة)

const CRM = {
    currentTab: 'customers',
    searchQuery: '',

    render() {
        const customers = state.customers || [];
        const suppliers = state.suppliers || [];
        const employees = state.employees || [];
        
        return `
            <div style="margin-bottom: 15px;">
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;">
                    <button onclick="CRM.switchTab('customers')" class="${this.currentTab === 'customers' ? 'btn-primary' : 'btn-secondary'}" style="padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; ${this.currentTab === 'customers' ? 'background: var(--accent); color: white;' : 'background: var(--bg); color: var(--text);'}">
                        👤 العملاء (${customers.length})
                    </button>
                    <button onclick="CRM.switchTab('suppliers')" class="${this.currentTab === 'suppliers' ? 'btn-primary' : 'btn-secondary'}" style="padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; ${this.currentTab === 'suppliers' ? 'background: var(--accent); color: white;' : 'background: var(--bg); color: var(--text);'}">
                        🏢 الموردين (${suppliers.length})
                    </button>
                    <button onclick="CRM.switchTab('employees')" class="${this.currentTab === 'employees' ? 'btn-primary' : 'btn-secondary'}" style="padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; ${this.currentTab === 'employees' ? 'background: var(--accent); color: white;' : 'background: var(--bg); color: var(--text);'}">
                        👨‍💼 الموظفين (${employees.length})
                    </button>
                    <button onclick="CRM.showAddForm()" class="btn-success" style="padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; margin-right: auto;">
                        <i class="fas fa-plus"></i> إضافة جديد
                    </button>
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <input type="text" id="crm-search" placeholder="🔍 بحث..." class="form-control" style="flex: 1; min-width: 150px;" oninput="CRM.search(this.value)">
                    <button onclick="CRM.refresh()" class="btn-primary" style="padding: 8px 15px; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-sync"></i>
                    </button>
                </div>
            </div>
            <div id="crm-content">
                ${this.renderContent()}
            </div>
        `;
    },

    switchTab(tab) {
        this.currentTab = tab;
        this.searchQuery = '';
        const searchInput = document.getElementById('crm-search');
        if (searchInput) searchInput.value = '';
        this.refresh();
    },

    refresh() {
        // إعادة تحميل البيانات من localStorage
        state = DB.load();
        const content = document.getElementById('crm-content');
        if (content) {
            content.innerHTML = this.renderContent();
        }
        // تحديث الأعداد في الأزرار
        this.updateTabCounts();
    },

    updateTabCounts() {
        const customers = state.customers || [];
        const suppliers = state.suppliers || [];
        const employees = state.employees || [];
        
        const btns = document.querySelectorAll('.pos-grid .btn-primary, .pos-grid .btn-secondary');
        btns.forEach(btn => {
            const text = btn.innerText;
            if (text.includes('العملاء')) {
                btn.innerText = `👤 العملاء (${customers.length})`;
            } else if (text.includes('الموردين')) {
                btn.innerText = `🏢 الموردين (${suppliers.length})`;
            } else if (text.includes('الموظفين')) {
                btn.innerText = `👨‍💼 الموظفين (${employees.length})`;
            }
        });
    },

    search(query) {
        this.searchQuery = query.toLowerCase().trim();
        const content = document.getElementById('crm-content');
        if (content) {
            content.innerHTML = this.renderContent();
        }
    },

    renderContent() {
        const data = this.getData();
        const filtered = data.filter(item => {
            if (!this.searchQuery) return true;
            return (item.name || '').toLowerCase().includes(this.searchQuery) ||
                   (item.phone || '').includes(this.searchQuery) ||
                   (item.address || '').toLowerCase().includes(this.searchQuery) ||
                   (item.position || '').toLowerCase().includes(this.searchQuery) ||
                   (item.email || '').toLowerCase().includes(this.searchQuery);
        });

        if (filtered.length === 0) {
            const name = this.currentTab === 'customers' ? 'عملاء' : this.currentTab === 'suppliers' ? 'موردين' : 'موظفين';
            return `
                <div class="card" style="text-align:center;padding:40px;">
                    <i class="fas fa-users" style="font-size:3rem;color:var(--text-secondary);display:block;margin-bottom:15px;"></i>
                    <h4 style="color:var(--text-secondary);">لا توجد ${name}</h4>
                    <p style="color:var(--text-secondary);font-size:0.9rem;">اضغط على "إضافة جديد" لإضافة ${this.currentTab === 'customers' ? 'عميل' : this.currentTab === 'suppliers' ? 'مورد' : 'موظف'}</p>
                </div>
            `;
        }

        const headers = this.getHeaders();
        const rows = filtered.map((item, index) => this.renderRow(item, index)).join('');

        return `
            <div class="card table-responsive">
                <table>
                    <thead>
                        <tr>
                            ${headers.map(h => `<th>${h}</th>`).join('')}
                            <th style="text-align:center;">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    },

    getData() {
        switch(this.currentTab) {
            case 'customers': return state.customers || [];
            case 'suppliers': return state.suppliers || [];
            case 'employees': return state.employees || [];
            default: return [];
        }
    },

    getHeaders() {
        switch(this.currentTab) {
            case 'customers':
                return ['#', 'الاسم', 'الهاتف', 'العنوان', 'الرصيد', 'المشتريات'];
            case 'suppliers':
                return ['#', 'الاسم', 'الهاتف', 'العنوان', 'إجمالي المشتريات'];
            case 'employees':
                return ['#', 'الاسم', 'الوظيفة', 'الهاتف', 'البريد الإلكتروني', 'الراتب', 'الحالة'];
            default: return [];
        }
    },

    renderRow(item, index) {
        const idx = index + 1;
        switch(this.currentTab) {
            case 'customers':
                return `
                    <tr>
                        <td>${idx}</td>
                        <td><strong onclick="CRM.showDetail('customers', ${item.id})" style="cursor:pointer;color:var(--accent);text-decoration:underline;">${item.name || '---'}</strong></td>
                        <td>${item.phone || '---'}</td>
                        <td>${item.address || '---'}</td>
                        <td style="color: ${(item.balance || 0) > 0 ? 'var(--danger)' : 'var(--success)'};">${(item.balance || 0).toFixed(2)} ₪</td>
                        <td>${(item.totalPurchases || 0).toFixed(2)} ₪</td>
                        <td style="text-align:center;">
                            <button onclick="CRM.editItem(${item.id})" class="btn-primary" style="padding:4px 10px;font-size:0.7rem;border:none;border-radius:4px;cursor:pointer;">✏️</button>
                            <button onclick="CRM.deleteItem(${item.id})" class="btn-danger" style="padding:4px 10px;font-size:0.7rem;border:none;border-radius:4px;cursor:pointer;">🗑️</button>
                        </td>
                    </tr>
                `;
            case 'suppliers':
                return `
                    <tr>
                        <td>${idx}</td>
                        <td><strong onclick="CRM.showDetail('suppliers', ${item.id})" style="cursor:pointer;color:var(--accent);text-decoration:underline;">${item.name || '---'}</strong></td>
                        <td>${item.phone || '---'}</td>
                        <td>${item.address || '---'}</td>
                        <td>${(item.totalPurchases || 0).toFixed(2)} ₪</td>
                        <td style="text-align:center;">
                            <button onclick="CRM.editItem(${item.id})" class="btn-primary" style="padding:4px 10px;font-size:0.7rem;border:none;border-radius:4px;cursor:pointer;">✏️</button>
                            <button onclick="CRM.deleteItem(${item.id})" class="btn-danger" style="padding:4px 10px;font-size:0.7rem;border:none;border-radius:4px;cursor:pointer;">🗑️</button>
                        </td>
                    </tr>
                `;
            case 'employees':
                return `
                    <tr>
                        <td>${idx}</td>
                        <td><strong onclick="CRM.showDetail('employees', ${item.id})" style="cursor:pointer;color:var(--accent);text-decoration:underline;">${item.name || '---'}</strong></td>
                        <td>${item.position || '---'}</td>
                        <td>${item.phone || '---'}</td>
                        <td>${item.email || '---'}</td>
                        <td>${(item.salary || 0).toFixed(2)} ₪</td>
                        <td style="color: ${item.status === 'active' ? 'var(--success)' : 'var(--danger)'};">${item.status === 'active' ? '✅ نشط' : '❌ غير نشط'}</td>
                        <td style="text-align:center;">
                            <button onclick="CRM.editItem(${item.id})" class="btn-primary" style="padding:4px 10px;font-size:0.7rem;border:none;border-radius:4px;cursor:pointer;">✏️</button>
                            <button onclick="CRM.deleteItem(${item.id})" class="btn-danger" style="padding:4px 10px;font-size:0.7rem;border:none;border-radius:4px;cursor:pointer;">🗑️</button>
                        </td>
                    </tr>
                `;
            default: return '';
        }
    },

    // ===== تقرير كامل عند الضغط على اسم عميل/مورد/موظف =====
    showDetail(type, id) {
        const list = type === 'customers' ? (state.customers || []) :
                     type === 'suppliers' ? (state.suppliers || []) :
                     (state.employees || []);
        const item = list.find(i => i.id === id);
        if (!item) {
            UI.showToast('⚠️ العنصر غير موجود', 'warning');
            return;
        }

        let bodyHtml;

        if (type === 'employees') {
            const employeeSales = DB.getSalesByCashier(item.name);
            const totalEmployeeSales = employeeSales.reduce((sum, s) => sum + (s.total || 0), 0);

            bodyHtml = `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div style="background:var(--bg);padding:12px;border-radius:8px;">
                        <small style="color:var(--text-secondary);">💼 الوظيفة</small>
                        <div style="font-weight:bold;">${item.position || '---'}</div>
                    </div>
                    <div style="background:var(--bg);padding:12px;border-radius:8px;">
                        <small style="color:var(--text-secondary);">📞 الهاتف</small>
                        <div style="font-weight:bold;">${item.phone || '---'}</div>
                    </div>
                    <div style="background:var(--bg);padding:12px;border-radius:8px;">
                        <small style="color:var(--text-secondary);">📧 البريد الإلكتروني</small>
                        <div style="font-weight:bold;">${item.email || '---'}</div>
                    </div>
                    <div style="background:var(--bg);padding:12px;border-radius:8px;">
                        <small style="color:var(--text-secondary);">💵 الراتب</small>
                        <div style="font-weight:bold;">${(item.salary || 0).toFixed(2)} ₪</div>
                    </div>
                    <div style="background:var(--bg);padding:12px;border-radius:8px;">
                        <small style="color:var(--text-secondary);">🧾 عدد الفواتير المسجلة عليه</small>
                        <div style="font-weight:bold;color:var(--accent);">${employeeSales.length}</div>
                    </div>
                    <div style="background:var(--bg);padding:12px;border-radius:8px;">
                        <small style="color:var(--text-secondary);">💰 إجمالي مبيعاته</small>
                        <div style="font-weight:bold;color:var(--success);">${totalEmployeeSales.toFixed(2)} ₪</div>
                    </div>
                    <div style="background:var(--bg);padding:12px;border-radius:8px;grid-column:1/-1;">
                        <small style="color:var(--text-secondary);">📌 الحالة</small>
                        <div style="font-weight:bold;color:${item.status === 'active' ? 'var(--success)' : 'var(--danger)'};">
                            ${item.status === 'active' ? '✅ نشط' : '❌ غير نشط'}
                        </div>
                    </div>
                    ${item.notes ? `
                    <div style="background:var(--bg);padding:12px;border-radius:8px;grid-column:1/-1;">
                        <small style="color:var(--text-secondary);">📝 ملاحظات</small>
                        <div>${item.notes}</div>
                    </div>` : ''}
                </div>

                <h4 style="margin-top:15px;">🧾 سجل الفواتير المسجلة على هذا الموظف</h4>
                <div class="table-responsive" style="max-height:300px;overflow-y:auto;">
                    <table>
                        <thead>
                            <tr><th>التاريخ</th><th>عدد الأصناف</th><th>الإجمالي</th><th>طريقة الدفع</th></tr>
                        </thead>
                        <tbody>
                            ${employeeSales.length === 0 ? `
                                <tr><td colspan="4" style="text-align:center;color:var(--text-secondary);padding:20px;">لا توجد فواتير مسجلة على هذا الموظف</td></tr>
                            ` : ''}
                            ${employeeSales.slice().reverse().map(s => `
                                <tr>
                                    <td>${new Date(s.date).toLocaleDateString('ar-SA')}</td>
                                    <td>${(s.items || []).length}${s.isWholesale ? ' 📦' : ''}</td>
                                    <td style="font-weight:bold;">${(s.total || 0).toFixed(2)} ₪</td>
                                    <td>${s.paymentMethodName || '---'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            const personId = (type === 'customers' ? 'customer-' : 'supplier-') + item.id;
            const transactions = type === 'customers'
                ? DB.getAllSales().filter(s => s.personId === personId)
                : (state.purchases || []).filter(p => p.supplierId === personId);

            const totalAmount = transactions.reduce((sum, t) => sum + (t.total || 0), 0);

            bodyHtml = `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;">
                    <div style="background:var(--bg);padding:12px;border-radius:8px;">
                        <small style="color:var(--text-secondary);">📞 الهاتف</small>
                        <div style="font-weight:bold;">${item.phone || '---'}</div>
                    </div>
                    <div style="background:var(--bg);padding:12px;border-radius:8px;">
                        <small style="color:var(--text-secondary);">📍 العنوان</small>
                        <div style="font-weight:bold;">${item.address || '---'}</div>
                    </div>
                    <div style="background:var(--bg);padding:12px;border-radius:8px;">
                        <small style="color:var(--text-secondary);">${type === 'customers' ? '💰 الرصيد المستحق منه' : '💰 الرصيد المستحق له'}</small>
                        <div style="font-weight:bold;color:${(item.balance || 0) > 0 ? 'var(--danger)' : 'var(--success)'};">
                            ${(item.balance || 0).toFixed(2)} ₪
                        </div>
                    </div>
                    <div style="background:var(--bg);padding:12px;border-radius:8px;">
                        <small style="color:var(--text-secondary);">${type === 'customers' ? '🛒 إجمالي المبيعات له' : '📦 إجمالي التوريد منه'}</small>
                        <div style="font-weight:bold;">${totalAmount.toFixed(2)} ₪ (${transactions.length} عملية)</div>
                    </div>
                </div>

                <h4>${type === 'customers' ? '🧾 سجل المبيعات' : '🚚 سجل فواتير الشراء'}</h4>
                <div class="table-responsive" style="max-height:300px;overflow-y:auto;">
                    <table>
                        <thead>
                            <tr><th>التاريخ</th><th>عدد الأصناف</th><th>الإجمالي</th><th>طريقة الدفع</th></tr>
                        </thead>
                        <tbody>
                            ${transactions.length === 0 ? `
                                <tr><td colspan="4" style="text-align:center;color:var(--text-secondary);padding:20px;">لا توجد عمليات مسجلة</td></tr>
                            ` : ''}
                            ${transactions.slice().reverse().map(t => `
                                <tr>
                                    <td>${new Date(t.date).toLocaleDateString('ar-SA')}</td>
                                    <td>${(t.items || []).length}${t.isWholesale ? ' 📦' : ''}</td>
                                    <td style="font-weight:bold;">${(t.total || 0).toFixed(2)} ₪</td>
                                    <td>${t.paymentMethodName || t.paymentMethod || '---'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        UI.showModal(`📊 تقرير: ${item.name}`, bodyHtml);
    },

    editItem(id) {
        const item = this.getData().find(i => i.id === id);
        if (!item) {
            UI.showToast('⚠️ العنصر غير موجود', 'warning');
            return;
        }
        this.showEditForm(item);
    },

    deleteItem(id) {
        if (!confirm('هل أنت متأكد من حذف هذا العنصر؟')) return;

        let success = false;
        switch(this.currentTab) {
            case 'customers':
                success = DB.deleteCustomer(id);
                break;
            case 'suppliers':
                success = DB.deleteSupplier(id);
                break;
            case 'employees':
                success = DB.deleteEmployee(id);
                break;
        }

        if (success) {
            UI.showToast('✅ تم الحذف بنجاح', 'success');
            // إعادة تحميل البيانات
            state = DB.load();
            this.refresh();
        }
    },

    showAddForm() {
        const fields = this.getFields();
        const html = `
            <div style="max-height: 450px; overflow-y: auto;">
                ${fields.map(f => `
                    <label style="display:block;margin-top:10px;font-weight:500;font-size:0.85rem;color:var(--text-secondary);">${f.label}</label>
                    ${f.type === 'select' ? `
                        <select id="crm-${f.key}" class="form-control" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;margin-top:4px;">
                            ${f.options.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
                        </select>
                    ` : `
                        <input type="${f.type}" id="crm-${f.key}" class="form-control" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;margin-top:4px;" placeholder="${f.placeholder || ''}" ${f.value ? `value="${f.value}"` : ''}>
                    `}
                `).join('')}
                <button onclick="CRM.saveItem()" class="btn-success" style="width:100%;margin-top:15px;padding:12px;border:none;border-radius:6px;cursor:pointer;">
                    <i class="fas fa-save"></i> حفظ
                </button>
            </div>
        `;
        UI.showModal(`➕ إضافة ${this.currentTab === 'customers' ? 'عميل' : this.currentTab === 'suppliers' ? 'مورد' : 'موظف'} جديد`, html);
    },

    showEditForm(item) {
        const fields = this.getFields().filter(f => f.key !== 'openingBalance');
        const html = `
            <div style="max-height: 450px; overflow-y: auto;">
                ${fields.map(f => `
                    <label style="display:block;margin-top:10px;font-weight:500;font-size:0.85rem;color:var(--text-secondary);">${f.label}</label>
                    ${f.type === 'select' ? `
                        <select id="crm-${f.key}" class="form-control" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;margin-top:4px;">
                            ${f.options.map(o => `<option value="${o.value}" ${item[f.key] === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
                        </select>
                    ` : `
                        <input type="${f.type}" id="crm-${f.key}" class="form-control" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;margin-top:4px;" placeholder="${f.placeholder || ''}" value="${item[f.key] || ''}">
                    `}
                `).join('')}
                <button onclick="CRM.updateItem(${item.id})" class="btn-success" style="width:100%;margin-top:15px;padding:12px;border:none;border-radius:6px;cursor:pointer;">
                    <i class="fas fa-save"></i> تحديث
                </button>
            </div>
        `;
        UI.showModal(`✏️ تعديل ${this.currentTab === 'customers' ? 'عميل' : this.currentTab === 'suppliers' ? 'مورد' : 'موظف'}`, html);
    },

    getFields() {
        switch(this.currentTab) {
            case 'customers':
                return [
                    { key: 'name', label: '👤 الاسم', type: 'text', placeholder: 'أدخل اسم العميل' },
                    { key: 'phone', label: '📱 رقم الهاتف', type: 'text', placeholder: 'أدخل رقم الهاتف' },
                    { key: 'address', label: '📍 العنوان', type: 'text', placeholder: 'أدخل العنوان' },
                    { key: 'commercialRegister', label: '🏢 السجل التجاري', type: 'text', placeholder: 'أدخل السجل التجاري' },
                    { key: 'openingBalance', label: '💰 الرصيد الافتتاحي', type: 'number', placeholder: '0' },
                    { key: 'type', label: '💰 نوع الحساب', type: 'select', options: [
                        { value: 'cash', label: 'نقدي' },
                        { value: 'credit', label: 'آجل' }
                    ]}
                ];
            case 'suppliers':
                return [
                    { key: 'name', label: '🏢 اسم المورد', type: 'text', placeholder: 'أدخل اسم المورد' },
                    { key: 'phone', label: '📱 رقم الهاتف', type: 'text', placeholder: 'أدخل رقم الهاتف' },
                    { key: 'address', label: '📍 العنوان', type: 'text', placeholder: 'أدخل العنوان' },
                    { key: 'commercialRegister', label: '🏢 السجل التجاري', type: 'text', placeholder: 'أدخل السجل التجاري' },
                    { key: 'openingBalance', label: '💰 الرصيد الافتتاحي', type: 'number', placeholder: '0' }
                ];
            case 'employees':
                return [
                    { key: 'name', label: '👤 اسم الموظف', type: 'text', placeholder: 'أدخل اسم الموظف' },
                    { key: 'position', label: '💼 الوظيفة', type: 'text', placeholder: 'أدخل الوظيفة' },
                    { key: 'phone', label: '📱 رقم الهاتف', type: 'text', placeholder: 'أدخل رقم الهاتف' },
                    { key: 'email', label: '📧 البريد الإلكتروني', type: 'email', placeholder: 'أدخل البريد الإلكتروني' },
                    { key: 'salary', label: '💰 الراتب', type: 'number', placeholder: 'أدخل الراتب' },
                    { key: 'hireDate', label: '📅 تاريخ التعيين', type: 'date' },
                    { key: 'status', label: '📊 الحالة', type: 'select', options: [
                        { value: 'active', label: 'نشط' },
                        { value: 'inactive', label: 'غير نشط' }
                    ]}
                ];
            default: return [];
        }
    },

    saveItem() {
        const data = this.collectFormData();
        if (!data.name) {
            UI.showToast('⚠️ يرجى إدخال الاسم', 'warning');
            return;
        }

        let result;
        switch(this.currentTab) {
            case 'customers':
                result = DB.addCustomer(data);
                break;
            case 'suppliers':
                result = DB.addSupplier(data);
                break;
            case 'employees':
                result = DB.addEmployee(data);
                break;
        }

        if (result) {
            UI.closeModal();
            UI.showToast(`✅ تم إضافة ${data.name} بنجاح`, 'success');
            // إعادة تحميل البيانات
            state = DB.load();
            // تحديث واجهة CRM
            this.refresh();
            // تحديث لوحة التحكم
            App.switchPage('crm');
        }
    },

    updateItem(id) {
        const data = this.collectFormData();
        if (!data.name) {
            UI.showToast('⚠️ يرجى إدخال الاسم', 'warning');
            return;
        }

        let result;
        switch(this.currentTab) {
            case 'customers':
                result = DB.updateCustomer(id, data);
                break;
            case 'suppliers':
                result = DB.updateSupplier(id, data);
                break;
            case 'employees':
                result = DB.updateEmployee(id, data);
                break;
        }

        if (result) {
            UI.closeModal();
            UI.showToast(`✅ تم تحديث ${data.name} بنجاح`, 'success');
            // إعادة تحميل البيانات
            state = DB.load();
            this.refresh();
            App.switchPage('crm');
        }
    },

    collectFormData() {
        const fields = this.getFields();
        const data = {};
        fields.forEach(f => {
            const el = document.getElementById(`crm-${f.key}`);
            if (el) {
                if (f.type === 'number') {
                    data[f.key] = parseFloat(el.value) || 0;
                } else if (f.type === 'select') {
                    data[f.key] = el.value;
                } else {
                    data[f.key] = el.value.trim();
                }
            }
        });
        return data;
    }
};

console.log('📁 تم تحميل CRM.js بنجاح مع إدارة العملاء والموردين والموظفين');