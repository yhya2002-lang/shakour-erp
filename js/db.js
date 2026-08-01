// db.js - إدارة قاعدة البيانات مع دمج العملاء والموردين والموظفين في persons

const DB = {
    key: 'shakour_erp_mobile',

    init() {
        let data = localStorage.getItem(this.key);
        if (!data) {
            const schema = {
                users: [
                    { id: 1, name: 'المدير العام', username: 'admin', pass: '84e43d72d2d4907caa6c55c491810cc6563f1631250f0f1e6949074d292f8aca', salt: 'a1s2a3d4', role: 'manager', created: new Date().toISOString(), lastLogin: null, active: true, pages: [], canEditCartPrice: true },
                    { id: 2, name: 'موظف المبيعات', username: 'employee', pass: '3548612c03e9968068ee1a665253bbe28de98e4b7dda454967e666558f6ae408', salt: 'e5m6p7l8', role: 'employee', created: new Date().toISOString(), lastLogin: null, active: true, pages: ['dashboard', 'pos', 'inventory'], canEditCartPrice: false }
                ],
                products: [
                    { id: 101, name: 'هاتف ذكي', barcode: '123456', price: 1500, cost: 1200, stock: 10, minStock: 3, category: 'إلكترونيات', wholesalePrice: 1200, wholesaleMin: 5 },
                    { id: 102, name: 'سماعة لاسلكية', barcode: '789012', price: 250, cost: 180, stock: 25, minStock: 5, category: 'إلكترونيات', wholesalePrice: 200, wholesaleMin: 10 },
                    { id: 103, name: 'شاحن سريع', barcode: '345678', price: 80, cost: 50, stock: 40, minStock: 8, category: 'إلكترونيات', wholesalePrice: 60, wholesaleMin: 15 }
                ],
                customers: [
                    { id: 1, name: 'عميل نقدي', balance: 0, phone: '', address: '', type: 'cash', commercialRegister: '', created: new Date().toISOString(), totalPurchases: 0, lastPurchase: null },
                    { id: 2, name: 'شركة التقنية المتقدمة', balance: 500, phone: '0501234567', address: 'الرياض', type: 'credit', commercialRegister: '123456789', created: new Date().toISOString(), totalPurchases: 0, lastPurchase: null },
                    { id: 3, name: 'مؤسسة الصفا التجارية', balance: 250, phone: '0559876543', address: 'جدة', type: 'credit', commercialRegister: '987654321', created: new Date().toISOString(), totalPurchases: 0, lastPurchase: null },
                    { id: 4, name: 'شركة الاتصالات السعودية', balance: 750, phone: '0587654321', address: 'الدمام', type: 'credit', commercialRegister: '456789123', created: new Date().toISOString(), totalPurchases: 0, lastPurchase: null }
                ],
                suppliers: [
                    { id: 1, name: 'مستودعات التقنية العالمية', balance: 0, phone: '0512345678', address: 'الدمام', commercialRegister: '789123456', created: new Date().toISOString(), totalPurchases: 0, lastPurchase: null },
                    { id: 2, name: 'شركة الإكسسوارات الحديثة', balance: 0, phone: '0523456789', address: 'الرياض', commercialRegister: '456789123', created: new Date().toISOString(), totalPurchases: 0, lastPurchase: null }
                ],
                employees: [
                    { id: 1, name: 'أحمد محمد', position: 'مدير مبيعات', phone: '0501112222', email: 'ahmed@example.com', salary: 8000, hireDate: '2023-01-15', status: 'active', notes: '', created: new Date().toISOString() },
                    { id: 2, name: 'سارة خالد', position: 'محاسب', phone: '0503334444', email: 'sara@example.com', salary: 6000, hireDate: '2023-03-01', status: 'active', notes: '', created: new Date().toISOString() },
                    { id: 3, name: 'محمد علي', position: 'مندوب مبيعات', phone: '0505556666', email: 'mohammed@example.com', salary: 4500, hireDate: '2023-06-01', status: 'active', notes: '', created: new Date().toISOString() }
                ],
                persons: [],
                sales: [],
                purchases: [],
                suspendedSales: [],
                invoices: [],
                vouchers: [],
                invoiceCounter: 0,
                auditLog: [
                    `[${new Date().toLocaleDateString('ar-SA')} ${new Date().toLocaleTimeString('ar-SA')}] - النظام - تهيئة نظام شكور`
                ],
                paymentMethods: [
                    { id: 'cash', name: 'نقدي', icon: 'fa-money-bill-wave', color: '#10b981', status: 'paid', requirePerson: false, enabled: true },
                    { id: 'credit', name: 'آجل', icon: 'fa-handshake', color: '#ef4444', status: 'unpaid', requirePerson: true, enabled: true },
                    { id: 'bank_transfer', name: 'تحويل بنكي', icon: 'fa-building-columns', color: '#f59e0b', status: 'unpaid', requirePerson: false, enabled: true },
                    { id: 'credit_card', name: 'بطاقة ائتمان', icon: 'fa-credit-card', color: '#3b82f6', status: 'paid', requirePerson: false, enabled: true },
                    { id: 'check', name: 'شيك', icon: 'fa-file-invoice', color: '#8b5cf6', status: 'pending', requirePerson: false, enabled: true },
                    { id: 'digital_wallet', name: 'محفظة رقمية', icon: 'fa-mobile-screen', color: '#06b6d4', status: 'paid', requirePerson: false, enabled: true }
                ],
                settings: { 
                    shiftOpen: false, 
                    darkMode: false, 
                    currency: '₪', 
                    storeName: 'متجر شكور', 
                    openingBalance: 0,
                    taxRate: 0.15,
                    discountEnabled: true,
                    printReceipt: true,
                    receiptFooter: 'شكراً لزيارتكم',
                    wholesaleEnabled: true,
                    nextInvoiceNumber: 1001
                },
                categories: ['إلكترونيات', 'إكسسوارات', 'ملابس', 'أدوات منزلية', 'أخرى'],
                units: ['قطعة', 'كرتون', 'كيلوجرام', 'جرام', 'لتر', 'علبة', 'دزينة', 'متر'],
                backup: {
                    lastBackup: null,
                    version: '2.0'
                }
            };
            this.save(schema);
            this.syncPersons();
            console.log('✅ تم إنشاء قاعدة بيانات جديدة مع دمج الأشخاص');
        } else {
            this.syncPersons();
            // ترقية بيانات قديمة لا تحتوي على الحقول الجديدة
            const existing = this.load();
            let changed = false;
            if (!existing.vouchers) { existing.vouchers = []; changed = true; }
            if (!existing.settings.nextVoucherNumber) { existing.settings.nextVoucherNumber = 1; changed = true; }
            (existing.users || []).forEach(u => {
                if (u.pages === undefined) {
                    // موظف من نسخة سابقة لم يكن فيها نظام صلاحيات مرن؛ نمنحه
                    // كل الصفحات كما كان يحدث فعلياً قبل هذا التحديث (hasPermission
                    // القديمة كانت تسمح بمعظم الصفحات افتراضياً لأي موظف)
                    u.pages = ['dashboard', 'pos', 'wholesale', 'inventory', 'crm', 'purchases', 'accounting', 'reports'];
                    changed = true;
                }
                if (u.canEditCartPrice === undefined) {
                    u.canEditCartPrice = true;
                    changed = true;
                }
            });
            if (changed) this.save(existing);
        }
    },

    load() {
        return JSON.parse(localStorage.getItem(this.key));
    },

    save(data) {
        localStorage.setItem(this.key, JSON.stringify(data));
    },

    // ===== مزامنة الأشخاص =====
    syncPersons() {
        const data = this.load();
        const customers = data.customers || [];
        const suppliers = data.suppliers || [];
        const employees = data.employees || [];
        
        const newPersons = [];
        
        customers.forEach(c => {
            newPersons.push({
                id: 'customer-' + c.id,
                rawId: c.id,
                name: c.name,
                type: 'customer',
                phone: c.phone || '',
                balance: c.balance || 0,
                address: c.address || '',
                commercialRegister: c.commercialRegister || '',
                source: 'customer'
            });
        });
        
        suppliers.forEach(s => {
            newPersons.push({
                id: 'supplier-' + s.id,
                rawId: s.id,
                name: s.name,
                type: 'supplier',
                phone: s.phone || '',
                balance: s.balance || 0,
                address: s.address || '',
                commercialRegister: s.commercialRegister || '',
                source: 'supplier'
            });
        });
        
        employees.forEach(e => {
            newPersons.push({
                id: 'employee-' + e.id,
                rawId: e.id,
                name: e.name,
                type: 'employee',
                phone: e.phone || '',
                balance: 0,
                address: '',
                commercialRegister: '',
                source: 'employee',
                position: e.position || '',
                salary: e.salary || 0
            });
        });
        
        const managers = data.users?.filter(u => u.role === 'manager') || [];
        managers.forEach(m => {
            const managerId = 'manager-' + m.id;
            if (!newPersons.find(p => p.id === managerId)) {
                newPersons.push({
                    id: managerId,
                    rawId: m.id,
                    name: m.name,
                    type: 'manager',
                    phone: '',
                    balance: 0,
                    address: '',
                    commercialRegister: '',
                    source: 'user'
                });
            }
        });
        
        data.persons = newPersons;
        this.save(data);
        console.log('✅ تم مزامنة الأشخاص:', newPersons.length);
    },

    // ===== العملاء =====
    getCustomers() {
        const data = this.load();
        return data.customers || [];
    },

    getCustomer(id) {
        const data = this.load();
        return data.customers?.find(c => c.id === id) || null;
    },

    addCustomer(customer) {
        const data = this.load();
        if (!data.customers) data.customers = [];
        customer.id = Date.now();
        customer.created = new Date().toISOString();
        // الرصيد الافتتاحي (من نموذج الإضافة) أو رصيد مُمرَّر مباشرة (من نداءات قديمة)
        customer.balance = (customer.openingBalance !== undefined ? customer.openingBalance : customer.balance) || 0;
        customer.totalPurchases = 0;
        customer.lastPurchase = null;
        data.customers.push(customer);
        this.save(data);
        this.syncPersons();
        this.addAuditLog(`➕ إضافة عميل: ${customer.name}${customer.balance ? ` (رصيد افتتاحي: ${customer.balance} ₪)` : ''}`);
        return customer;
    },

    updateCustomer(id, updates) {
        const data = this.load();
        const customer = data.customers?.find(c => c.id === id);
        if (!customer) return null;
        Object.assign(customer, updates);
        this.save(data);
        this.syncPersons();
        this.addAuditLog(`✏️ تحديث عميل: ${customer.name}`);
        return customer;
    },

    deleteCustomer(id) {
        const data = this.load();
        const customer = data.customers?.find(c => c.id === id);
        if (customer && customer.id === 1) {
            UI.showToast('⚠️ لا يمكن حذف العميل النقدي', 'warning');
            return false;
        }
        data.customers = data.customers?.filter(c => c.id !== id) || [];
        this.save(data);
        this.syncPersons();
        this.addAuditLog(`🗑️ حذف عميل: ${customer?.name}`);
        return true;
    },

    // ===== الموردين =====
    getSuppliers() {
        const data = this.load();
        return data.suppliers || [];
    },

    getSupplier(id) {
        const data = this.load();
        return data.suppliers?.find(s => s.id === id) || null;
    },

    addSupplier(supplier) {
        const data = this.load();
        if (!data.suppliers) data.suppliers = [];
        supplier.id = Date.now();
        supplier.created = new Date().toISOString();
        // الرصيد الافتتاحي (من نموذج الإضافة) أو رصيد مُمرَّر مباشرة (من نداءات قديمة)
        supplier.balance = (supplier.openingBalance !== undefined ? supplier.openingBalance : supplier.balance) || 0;
        supplier.totalPurchases = 0;
        supplier.lastPurchase = null;
        data.suppliers.push(supplier);
        this.save(data);
        this.syncPersons();
        this.addAuditLog(`➕ إضافة مورد: ${supplier.name}${supplier.balance ? ` (رصيد افتتاحي: ${supplier.balance} ₪)` : ''}`);
        return supplier;
    },

    updateSupplier(id, updates) {
        const data = this.load();
        const supplier = data.suppliers?.find(s => s.id === id);
        if (!supplier) return null;
        Object.assign(supplier, updates);
        this.save(data);
        this.syncPersons();
        this.addAuditLog(`✏️ تحديث مورد: ${supplier.name}`);
        return supplier;
    },

    deleteSupplier(id) {
        const data = this.load();
        const supplier = data.suppliers?.find(s => s.id === id);
        data.suppliers = data.suppliers?.filter(s => s.id !== id) || [];
        this.save(data);
        this.syncPersons();
        this.addAuditLog(`🗑️ حذف مورد: ${supplier?.name}`);
        return true;
    },

    // ===== الموظفين =====
    getEmployees() {
        const data = this.load();
        return data.employees || [];
    },

    getEmployee(id) {
        const data = this.load();
        return data.employees?.find(e => e.id === id) || null;
    },

    addEmployee(employee) {
        const data = this.load();
        if (!data.employees) data.employees = [];
        employee.id = Date.now();
        employee.created = new Date().toISOString();
        data.employees.push(employee);
        this.save(data);
        this.syncPersons();
        this.addAuditLog(`➕ إضافة موظف: ${employee.name}`);
        return employee;
    },

    updateEmployee(id, updates) {
        const data = this.load();
        const employee = data.employees?.find(e => e.id === id);
        if (!employee) return null;
        Object.assign(employee, updates);
        this.save(data);
        this.syncPersons();
        this.addAuditLog(`✏️ تحديث موظف: ${employee.name}`);
        return employee;
    },

    deleteEmployee(id) {
        const data = this.load();
        const employee = data.employees?.find(e => e.id === id);
        data.employees = data.employees?.filter(e => e.id !== id) || [];
        this.save(data);
        this.syncPersons();
        this.addAuditLog(`🗑️ حذف موظف: ${employee?.name}`);
        return true;
    },

    // ===== الأشخاص الموحدون =====
    getPersons() {
        const data = this.load();
        if (!data.persons || data.persons.length === 0) {
            this.syncPersons();
            return this.load().persons || [];
        }
        return data.persons || [];
    },

    // ===== وحدات القياس =====
    defaultUnits: ['قطعة', 'كرتون', 'كيلوجرام', 'جرام', 'لتر', 'علبة', 'دزينة', 'متر'],

    getUnits() {
        const data = this.load();
        return (data.units && data.units.length > 0) ? data.units : this.defaultUnits;
    },

    addUnit(name) {
        name = (name || '').trim();
        if (!name) return this.getUnits();
        const data = this.load();
        if (!data.units || data.units.length === 0) {
            data.units = [...this.defaultUnits];
        }
        if (!data.units.includes(name)) {
            data.units.push(name);
            this.save(data);
        }
        return data.units;
    },

    getPerson(id) {
        const data = this.load();
        return data.persons?.find(p => p.id === id) || null;
    },

    addPerson(person) {
        const data = this.load();
        if (!data.persons) data.persons = [];
        person.id = Date.now();
        data.persons.push(person);
        this.save(data);
        this.addAuditLog(`➕ إضافة شخص: ${person.name} (${person.type})`);
        return person;
    },

    // ===== تحديث شخص (مع تحديث المصادر) =====
    updatePerson(id, updates) {
        console.log('🔄 updatePerson() - ID:', id, 'التحديثات:', updates);
        
        const data = this.load();
        const person = data.persons?.find(p => p.id === id);
        if (!person) {
            console.error('❌ الشخص غير موجود:', id);
            return null;
        }
        
        // تحديث في persons
        Object.assign(person, updates);
        console.log('✅ تم تحديث person:', person);
        
        // تحديث في المصدر الأصلي (customer, supplier, employee)
        if (person.source === 'customer') {
            const customer = data.customers?.find(c => c.id === id);
            if (customer) {
                if (updates.balance !== undefined) {
                    customer.balance = updates.balance;
                    customer.totalPurchases = (customer.totalPurchases || 0) + Math.abs(updates.balance - (person.balance || 0));
                    customer.lastPurchase = new Date().toISOString();
                }
                if (updates.phone !== undefined) customer.phone = updates.phone;
                if (updates.address !== undefined) customer.address = updates.address;
                console.log('✅ تم تحديث customer:', customer);
            }
        } else if (person.source === 'supplier') {
            const supplier = data.suppliers?.find(s => s.id === id);
            if (supplier) {
                if (updates.balance !== undefined) supplier.balance = updates.balance;
                if (updates.phone !== undefined) supplier.phone = updates.phone;
                if (updates.address !== undefined) supplier.address = updates.address;
                console.log('✅ تم تحديث supplier:', supplier);
            }
        } else if (person.source === 'employee') {
            const employee = data.employees?.find(e => e.id === id);
            if (employee) {
                if (updates.phone !== undefined) employee.phone = updates.phone;
                console.log('✅ تم تحديث employee:', employee);
            }
        }
        
        this.save(data);
        this.addAuditLog(`💰 تحديث رصيد ${person.name}: ${person.balance} ₪`);
        console.log('✅ تم حفظ التغييرات في قاعدة البيانات');
        return person;
    },

    // ===== تحديث رصيد الشخص =====
    updatePersonBalance(id, amount) {
        console.log('💰 updatePersonBalance() - ID:', id, 'المبلغ:', amount);
        
        const data = this.load();
        const person = data.persons?.find(p => p.id === id);
        if (!person) {
            console.error('❌ الشخص غير موجود:', id);
            return null;
        }
        
        const oldBalance = person.balance || 0;
        const newBalance = oldBalance + amount;
        person.balance = newBalance;
        console.log(`📊 الرصيد: ${oldBalance} -> ${newBalance}`);
        
        // تحديث في المصدر الأصلي
        if (person.source === 'customer') {
            const customer = data.customers?.find(c => c.id === person.rawId);
            if (customer) {
                customer.balance = newBalance;
                customer.totalPurchases = (customer.totalPurchases || 0) + Math.abs(amount);
                customer.lastPurchase = new Date().toISOString();
                console.log('✅ تم تحديث customer:', customer);
            }
        } else if (person.source === 'supplier') {
            const supplier = data.suppliers?.find(s => s.id === person.rawId);
            if (supplier) {
                supplier.balance = newBalance;
                supplier.totalPurchases = (supplier.totalPurchases || 0) + Math.abs(amount);
                supplier.lastPurchase = new Date().toISOString();
                console.log('✅ تم تحديث supplier:', supplier);
            }
        }
        
        this.save(data);
        this.addAuditLog(`💰 تحديث رصيد ${person.name}: ${oldBalance} -> ${newBalance} ₪`);
        console.log('✅ تم حفظ التغييرات في قاعدة البيانات');
        return person;
    },

    deletePerson(id) {
        const data = this.load();
        data.persons = data.persons?.filter(p => p.id !== id) || [];
        this.save(data);
        this.addAuditLog(`🗑️ حذف شخص`);
        return true;
    },

    getPersonsByType(type) {
        const data = this.load();
        return data.persons?.filter(p => p.type === type) || [];
    },

    // ===== طرق الدفع =====
    getPaymentMethods() {
        const data = this.load();
        return data.paymentMethods || [];
    },

    getPaymentMethod(id) {
        const data = this.load();
        return data.paymentMethods?.find(p => p.id === id) || null;
    },

    addPaymentMethod(method) {
        const data = this.load();
        if (!data.paymentMethods) data.paymentMethods = [];
        method.id = method.id || method.name.toLowerCase().replace(/\s/g, '_');
        data.paymentMethods.push(method);
        this.save(data);
        this.addAuditLog(`➕ إضافة طريقة دفع: ${method.name}`);
        return method;
    },

    updatePaymentMethod(id, updates) {
        const data = this.load();
        const method = data.paymentMethods?.find(p => p.id === id);
        if (!method) return null;
        Object.assign(method, updates);
        this.save(data);
        this.addAuditLog(`✏️ تحديث طريقة دفع: ${method.name}`);
        return method;
    },

    deletePaymentMethod(id) {
        const data = this.load();
        const basicMethods = ['cash', 'credit', 'bank_transfer', 'credit_card', 'check', 'digital_wallet'];
        if (basicMethods.includes(id)) {
            UI.showToast('⚠️ لا يمكن حذف طرق الدفع الأساسية', 'warning');
            return false;
        }
        data.paymentMethods = data.paymentMethods?.filter(p => p.id !== id) || [];
        this.save(data);
        this.addAuditLog(`🗑️ حذف طريقة دفع`);
        return true;
    },

    // ===== توليد رقم فاتورة جديد =====
    generateInvoiceNumber() {
        const data = this.load();
        data.settings.nextInvoiceNumber = (data.settings.nextInvoiceNumber || 1001) + 1;
        this.save(data);
        return data.settings.nextInvoiceNumber - 1;
    },

    // ===== سندات الصرف =====
    // سند صرف عام (مصاريف) أو تسديد لمورد (يُنقص من رصيد المورد المستحق له)
    getVouchers() {
        const data = this.load();
        return data.vouchers || [];
    },

    generateVoucherNumber() {
        const data = this.load();
        if (!data.settings.nextVoucherNumber) data.settings.nextVoucherNumber = 1;
        const num = data.settings.nextVoucherNumber;
        data.settings.nextVoucherNumber = num + 1;
        this.save(data);
        return num;
    },

    addVoucher(voucher) {
        const data = this.load();
        if (!data.vouchers) data.vouchers = [];
        voucher.id = Date.now();
        voucher.voucherNumber = this.generateVoucherNumber();
        voucher.createdAt = new Date().toISOString();
        voucher.createdBy = Auth.currentUser ? Auth.currentUser.name : 'النظام';
        data.vouchers.push(voucher);

        // إذا كان السند مرتبطاً بتسديد مورد، انقص المبلغ من رصيد المورد
        if (voucher.personId) {
            const person = data.persons?.find(p => p.id === voucher.personId);
            if (person) {
                const oldBalance = person.balance || 0;
                const newBalance = oldBalance - voucher.amount;
                person.balance = newBalance;
                voucher.oldBalance = oldBalance;
                voucher.newBalance = newBalance;

                if (person.source === 'supplier') {
                    const supplier = data.suppliers?.find(s => s.id === person.rawId);
                    if (supplier) supplier.balance = newBalance;
                } else if (person.source === 'customer') {
                    const customer = data.customers?.find(c => c.id === person.rawId);
                    if (customer) customer.balance = newBalance;
                }
            }
        }

        this.save(data);
        this.addAuditLog(`🧾 سند صرف #${voucher.voucherNumber} - ${voucher.reason || voucher.personName || ''} - ${voucher.amount.toFixed(2)} ₪`);
        return voucher;
    },

    deleteVoucher(id) {
        const data = this.load();
        const voucher = data.vouchers?.find(v => v.id === id);
        if (!voucher) return false;

        // عكس تأثير السند على رصيد الشخص المرتبط به إن وجد
        if (voucher.personId) {
            const person = data.persons?.find(p => p.id === voucher.personId);
            if (person) {
                person.balance = (person.balance || 0) + voucher.amount;
                if (person.source === 'supplier') {
                    const supplier = data.suppliers?.find(s => s.id === person.rawId);
                    if (supplier) supplier.balance = person.balance;
                } else if (person.source === 'customer') {
                    const customer = data.customers?.find(c => c.id === person.rawId);
                    if (customer) customer.balance = person.balance;
                }
            }
        }

        data.vouchers = data.vouchers.filter(v => v.id !== id);
        this.save(data);
        this.addAuditLog(`🗑️ حذف سند صرف #${voucher.voucherNumber}`);
        return true;
    },

    // ===== النسخ الاحتياطي التلقائي (أرشيف متعدد النقاط) =====
    // يُنشئ نسخة تلقائية عند كل فتح للتطبيق (مرة واحدة يومياً كحد أقصى حتى
    // لا يمتلئ التخزين المحلي بنسخ متطابقة عند إعادة الفتح المتكررة في
    // نفس اليوم)، ويحتفظ بآخر 10 نسخ فقط، محذوفاً الأقدم تلقائياً.
    AUTO_BACKUP_KEY: 'shakour_erp_auto_backups',
    MAX_AUTO_BACKUPS: 10,

    getAutoBackups() {
        try {
            const raw = localStorage.getItem(this.AUTO_BACKUP_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    },

    // يُستدعى عند بدء تشغيل التطبيق (App.init). يأخذ لقطة جديدة فقط إذا لم
    // تُؤخذ لقطة اليوم من قبل على هذا الجهاز.
    maybeCreateAutoBackup() {
        try {
            const backups = this.getAutoBackups();
            const today = new Date().toISOString().slice(0, 10);
            const alreadyToday = backups.some(b => b.date === today);
            if (alreadyToday) return;

            const snapshot = {
                date: today,
                timestamp: new Date().toISOString(),
                data: this.load()
            };
            backups.push(snapshot);

            // الاحتفاظ بآخر MAX_AUTO_BACKUPS نسخة فقط (الأقدم يُحذف أولاً)
            while (backups.length > this.MAX_AUTO_BACKUPS) {
                backups.shift();
            }

            localStorage.setItem(this.AUTO_BACKUP_KEY, JSON.stringify(backups));
            console.log(`✅ تم إنشاء نسخة احتياطية تلقائية (${today}) - إجمالي النسخ: ${backups.length}`);
        } catch (e) {
            // التخزين المحلي قد يكون ممتلئاً؛ لا نُفشل تشغيل التطبيق بسبب هذا
            console.warn('⚠️ تعذّر إنشاء نسخة احتياطية تلقائية:', e);
        }
    },

    restoreAutoBackup(timestamp) {
        try {
            const backups = this.getAutoBackups();
            const backup = backups.find(b => b.timestamp === timestamp);
            if (!backup) {
                UI.showToast('⚠️ النسخة الاحتياطية غير موجودة', 'warning');
                return { success: false };
            }
            this.save(backup.data);
            this.syncPersons();
            this.addAuditLog(`↩️ استعادة نسخة احتياطية تلقائية بتاريخ ${backup.date}`);
            return { success: true };
        } catch (e) {
            console.error(e);
            return { success: false };
        }
    },

    // ===== إضافة فاتورة جديدة =====
    addInvoice(invoice) {
        const data = this.load();
        if (!data.invoices) data.invoices = [];
        invoice.id = this.generateInvoiceNumber();
        invoice.createdAt = new Date().toISOString();
        data.invoices.push(invoice);
        this.save(data);
        return invoice;
    },

    // ===== إضافة سجل تدقيق =====
    addAuditLog(message) {
        const data = this.load();
        if (!data.auditLog) data.auditLog = [];
        const time = new Date().toLocaleTimeString('ar-SA');
        const date = new Date().toLocaleDateString('ar-SA');
        const user = Auth.currentUser ? Auth.currentUser.name : 'النظام';
        const entry = `[${date} ${time}] - ${user} - ${message}`;
        data.auditLog.unshift(entry);
        if (data.auditLog.length > 200) data.auditLog.pop();
        this.save(data);
        return entry;
    },

    // ===== كل عمليات البيع موحّدة (بيع عادي + بيع جملة) =====
    // المبيعات العادية تُخزَّن في data.sales والجملة في data.invoices بشكلين
    // مختلفين قليلاً؛ هذه الدالة تُرجع مصفوفة موحدة الشكل تعتمد عليها كل
    // شاشات التقارير والمحاسبة حتى لا تُغفل أي مبيعات جملة من الحسابات.
    getAllSales() {
        const data = this.load();
        const regular = (data.sales || []).map(s => ({
            id: s.id,
            date: s.date,
            items: s.items || [],
            total: s.total || 0,
            discount: s.discount || 0,
            profit: s.profit || 0,
            isWholesale: false,
            personId: s.personId || null,
            personName: s.personName || null,
            paymentMethodName: s.paymentMethod || '',
            status: s.status || 'paid',
            cashierName: s.cashierName || null
        }));
        const wholesale = (data.invoices || []).map(inv => ({
            id: inv.id,
            date: inv.createdAt,
            items: inv.items || [],
            total: inv.total || 0,
            discount: inv.discount || 0,
            profit: inv.profit || 0,
            isWholesale: true,
            personId: inv.personId || null,
            personName: inv.personName || inv.customerName || null,
            paymentMethodName: inv.paymentMethodName || '',
            status: inv.status || 'unpaid',
            cashierName: inv.cashierName || inv.createdBy || null
        }));
        return regular.concat(wholesale).sort((a, b) => new Date(a.date) - new Date(b.date));
    },

    // ===== مبيعات موظف/كاشير معين (تُستخدم في تقرير الموظف) =====
    getSalesByCashier(cashierName) {
        if (!cashierName) return [];
        return this.getAllSales().filter(s => s.cashierName === cashierName);
    },

    // ===== إحصائيات سريعة =====
    getStats() {
        const data = this.load();
        const allSales = this.getAllSales();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todaySales = allSales.filter(s => {
            const d = new Date(s.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === today.getTime();
        });
        
        return {
            totalUsers: data.users?.length || 0,
            totalProducts: data.products?.length || 0,
            totalCustomers: data.customers?.length || 0,
            totalSuppliers: data.suppliers?.length || 0,
            totalEmployees: data.employees?.length || 0,
            totalSales: allSales.length,
            totalPurchases: data.purchases?.length || 0,
            todaySales: todaySales.length,
            todayRevenue: todaySales.reduce((sum, s) => sum + s.total, 0),
            totalRevenue: allSales.reduce((sum, s) => sum + s.total, 0),
            totalProfit: allSales.reduce((sum, s) => sum + (s.profit || 0), 0),
            totalDebt: data.customers?.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0) || 0,
            shiftOpen: data.settings?.shiftOpen || false,
            lowStockItems: data.products?.filter(p => p.stock < (p.minStock || 5)).length || 0,
            auditLogCount: data.auditLog?.length || 0,
            personsCount: data.persons?.length || 0,
            paymentMethodsCount: data.paymentMethods?.length || 0
        };
    },

    // ===== البحث عن منتج =====
    searchProduct(query) {
        const data = this.load();
        if (!data.products) return [];
        const q = query.toString().toLowerCase().trim();
        return data.products.filter(p => 
            p.name.toLowerCase().includes(q) ||
            (p.barcode && p.barcode.includes(q)) ||
            (p.category && p.category.toLowerCase().includes(q))
        );
    },

    // ===== الحصول على منتج بالباركود =====
    getProductByBarcode(barcode) {
        const data = this.load();
        return data.products?.find(p => p.barcode === barcode) || null;
    },

    // ===== تصدير البيانات =====
    exportData() {
        const data = this.load();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shakour_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.addAuditLog('📤 تصدير نسخة احتياطية');
        UI.showToast('✅ تم تصدير البيانات بنجاح', 'success');
        return jsonString;
    },

    // ===== استيراد البيانات =====
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.users && data.products) {
                const backup = this.load();
                localStorage.setItem(this.key + '_backup', JSON.stringify(backup));
                this.save(data);
                this.syncPersons();
                this.addAuditLog('📥 استيراد نسخة احتياطية');
                UI.showToast('✅ تم استيراد البيانات بنجاح', 'success');
                return { success: true, message: 'تم استيراد البيانات بنجاح' };
            }
            return { success: false, message: 'ملف غير صالح' };
        } catch (error) {
            console.error('خطأ في الاستيراد:', error);
            UI.showToast('❌ خطأ في قراءة الملف', 'error');
            return { success: false, message: 'خطأ في قراءة الملف' };
        }
    },

    // ===== مسح جميع البيانات =====
    clearAll() {
        const backup = this.load();
        localStorage.setItem(this.key + '_backup', JSON.stringify(backup));
        localStorage.removeItem(this.key);
        this.init();
        this.addAuditLog('🔄 إعادة تعيين النظام');
        UI.showToast('🔄 تم إعادة تعيين النظام', 'warning');
        setTimeout(() => location.reload(), 1500);
    },

    // ===== استعادة نسخة احتياطية =====
    restoreBackup() {
        try {
            const backup = localStorage.getItem(this.key + '_backup');
            if (backup) {
                const data = JSON.parse(backup);
                this.save(data);
                this.syncPersons();
                this.addAuditLog('↩️ استعادة نسخة احتياطية');
                UI.showToast('✅ تم استعادة النسخة الاحتياطية', 'success');
                return { success: true, message: 'تم استعادة النسخة الاحتياطية' };
            }
            UI.showToast('⚠️ لا توجد نسخة احتياطية', 'warning');
            return { success: false, message: 'لا توجد نسخة احتياطية' };
        } catch (error) {
            console.error('خطأ في الاستعادة:', error);
            UI.showToast('❌ خطأ في استعادة النسخة', 'error');
            return { success: false, message: 'خطأ في استعادة النسخة' };
        }
    }
};

// ===== المتغيرات العامة =====
let state = DB.load();

function updateState() {
    DB.save(state);
}

// ===== مزامنة الأشخاص عند التحميل =====
DB.syncPersons();
state = DB.load();

console.log('📁 تم تحميل DB.js مع دمج الأشخاص وطرق الدفع');
console.log('👤 عدد الأشخاص:', state.persons ? state.persons.length : 0);
console.log('💳 عدد طرق الدفع:', state.paymentMethods ? state.paymentMethods.length : 0);