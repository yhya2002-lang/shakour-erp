// pos-persons.js - إدارة الأشخاص في الكاشير

// ===== عرض نافذة اختيار الشخص للدفع =====
POS.showPersonSelectorForPayment = function() {
    let persons = DB.getPersons();
    console.log('👤 جميع الأشخاص المتاحين:', persons);
    
    if (!persons || persons.length === 0) {
        this.addDefaultPersons();
        persons = DB.getPersons();
        if (!persons || persons.length === 0) {
            UI.showToast('⚠️ لا يوجد أشخاص مسجلين. أضف شخصاً أولاً.', 'warning');
            return;
        }
    }

    if (!Array.isArray(persons)) {
        persons = [];
    }

    const filteredPersons = persons.filter(p => p.name !== 'عميل نقدي');

    if (!Array.isArray(filteredPersons) || filteredPersons.length === 0) {
        UI.showToast('⚠️ لا يوجد عملاء متاحين (باستثناء العميل النقدي)', 'warning');
        return;
    }

    const sortedPersons = [...filteredPersons].sort((a, b) => {
        const order = { customer: 0, supplier: 1, employee: 2, manager: 3 };
        return (order[a.type] || 4) - (order[b.type] || 4);
    });

    const html = `
        <div style="max-height: 450px; overflow-y: auto;">
            <div style="margin-bottom: 10px;">
                <button onclick="POS.showAddPersonFormForPayment()" class="btn-success" style="width:100%; padding: 10px; border: none; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-user-plus"></i> إضافة عميل جديد
                </button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:10px;">
                <button onclick="POS.filterPersonsForPayment('all')" class="btn-primary" style="padding:4px 6px;font-size:0.7rem;border:none;border-radius:4px;cursor:pointer;background:var(--accent);color:white;">👥 الكل</button>
                <button onclick="POS.filterPersonsForPayment('customer')" class="btn-primary" style="padding:4px 6px;font-size:0.7rem;border:none;border-radius:4px;cursor:pointer;background:var(--success);color:white;">👤 عملاء</button>
                <button onclick="POS.filterPersonsForPayment('supplier')" class="btn-primary" style="padding:4px 6px;font-size:0.7rem;border:none;border-radius:4px;cursor:pointer;background:var(--warning);color:white;">🏢 موردين</button>
                <button onclick="POS.filterPersonsForPayment('employee')" class="btn-primary" style="padding:4px 6px;font-size:0.7rem;border:none;border-radius:4px;cursor:pointer;background:var(--info);color:white;">👨‍💼 موظفين</button>
            </div>
            <div id="persons-list-payment">
                ${sortedPersons.map(p => `
                    <div onclick="POS.selectPersonForPayment('${p.id}')" style="background: var(--bg); padding: 10px 15px; margin-bottom: 6px; border-radius: 8px; border: 1px solid var(--border); cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
                        <div>
                            <div style="font-weight: bold; font-size: 1rem;">${p.name || 'بدون اسم'}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">
                                ${p.type === 'customer' ? '👤 عميل' : p.type === 'supplier' ? '🏢 مورد' : p.type === 'employee' ? '👨‍💼 موظف' : '👑 مدير'}
                                ${p.phone ? `📱 ${p.phone}` : ''}
                                ${p.position ? `💼 ${p.position}` : ''}
                            </div>
                        </div>
                        <div style="text-align: left;">
                            <div style="font-size: 0.85rem; color: ${(p.balance || 0) > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: bold;">
                                ${(p.balance || 0).toFixed(2)} ₪
                            </div>
                            <div style="font-size: 0.6rem; color: var(--text-secondary);">
                                ${p.source || p.type}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${sortedPersons.length === 0 ? `
                <div style="text-align:center;padding:20px;color:var(--text-secondary);">
                    <i class="fas fa-user-slash" style="font-size:2rem;display:block;margin-bottom:10px;"></i>
                    لا يوجد أشخاص مسجلين
                </div>
            ` : ''}
        </div>
        <hr>
        <button onclick="UI.closeModal()" class="btn-primary" style="width:100%; padding: 10px; background: var(--text-secondary); border: none; border-radius: 6px; cursor: pointer; color: white;">
            ✕ إلغاء
        </button>
    `;
    UI.showModal('👤 اختيار الشخص للدفع', html);
};

// ===== إضافة أشخاص افتراضيين =====
POS.addDefaultPersons = function() {
    const existing = DB.getPersons();
    if (existing && Array.isArray(existing) && existing.length > 0) return;
    
    const defaultPersons = [
        { name: 'المدير العام', type: 'manager', phone: '', balance: 0 },
        { name: 'موظف المبيعات', type: 'employee', phone: '', balance: 0 },
        { name: 'شركة التقنية', type: 'customer', phone: '0501234567', balance: 500 },
        { name: 'مستودعات التقنية', type: 'supplier', phone: '0512345678', balance: 0 }
    ];
    
    defaultPersons.forEach(p => {
        Auth.addPerson(p.name, p.type, p.phone, p.balance);
    });
    console.log('✅ تم إضافة أشخاص افتراضيين');
};

// ===== تصفية الأشخاص =====
POS.filterPersonsForPayment = function(type) {
    let persons = [];
    if (type === 'all') {
        persons = DB.getPersons().filter(p => p.name !== 'عميل نقدي');
    } else {
        persons = DB.getPersonsByType(type).filter(p => p.name !== 'عميل نقدي');
    }
    
    const list = document.getElementById('persons-list-payment');
    if (!list) return;
    
    if (!persons || !Array.isArray(persons) || persons.length === 0) {
        list.innerHTML = `
            <div style="text-align:center;padding:20px;color:var(--text-secondary);">
                <i class="fas fa-user-slash" style="font-size:2rem;display:block;margin-bottom:10px;"></i>
                لا يوجد أشخاص من هذا النوع
            </div>
        `;
        return;
    }
    
    const sorted = [...persons].sort((a, b) => a.name.localeCompare(b.name));
    
    list.innerHTML = sorted.map(p => `
        <div onclick="POS.selectPersonForPayment('${p.id}')" style="background: var(--bg); padding: 10px 15px; margin-bottom: 6px; border-radius: 8px; border: 1px solid var(--border); cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
            <div>
                <div style="font-weight: bold; font-size: 1rem;">${p.name || 'بدون اسم'}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">
                    ${p.type === 'customer' ? '👤 عميل' : p.type === 'supplier' ? '🏢 مورد' : p.type === 'employee' ? '👨‍💼 موظف' : '👑 مدير'}
                    ${p.phone ? `📱 ${p.phone}` : ''}
                </div>
            </div>
            <div style="text-align: left;">
                <div style="font-size: 0.85rem; color: ${(p.balance || 0) > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: bold;">
                    ${(p.balance || 0).toFixed(2)} ₪
                </div>
            </div>
        </div>
    `).join('');
};

// ===== اختيار شخص =====
POS.selectPersonForPayment = function(id) {
    console.log('🔄 selectPersonForPayment() - ID:', id);
    
    const person = DB.getPerson(id);
    console.log('👤 الشخص المختار:', person);
    
    if (!person) {
        UI.showToast('⚠️ الشخص غير موجود', 'warning');
        return;
    }
    
    if (person.name === 'عميل نقدي') {
        UI.showToast('⚠️ لا يمكن اختيار العميل النقدي للديون', 'warning');
        return;
    }
    
    this.selectedPerson = person;
    this.selectedPersonId = person.id;
    UI.closeModal();
    UI.showToast(`✅ تم اختيار: ${person.name} (الرصيد: ${(person.balance || 0).toFixed(2)} ₪)`, 'success');
    
    const customerInput = document.getElementById('wholesale-customer');
    if (customerInput) {
        customerInput.value = person.name;
    }
    const phoneInput = document.getElementById('wholesale-phone');
    if (phoneInput && person.phone) {
        phoneInput.value = person.phone;
    }
    const addressInput = document.getElementById('wholesale-address');
    if (addressInput && person.address) {
        addressInput.value = person.address;
    }
    
    this.init();
    
    if (this.selectedPaymentMethod) {
        setTimeout(() => {
            this.completePayment(this.selectedPaymentMethod);
            this.selectedPaymentMethod = null;
        }, 300);
    }
};

// ===== عرض نموذج إضافة شخص جديد =====
POS.showAddPersonFormForPayment = function() {
    const html = `
        <label style="display:block;margin-top:10px;font-weight:500;font-size:0.85rem;color:var(--text-secondary);">👤 الاسم الكامل</label>
        <input type="text" id="new-person-name-payment" class="form-control" placeholder="أدخل الاسم" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;margin-top:4px;">
        
        <label style="display:block;margin-top:10px;font-weight:500;font-size:0.85rem;color:var(--text-secondary);">📱 رقم الهاتف</label>
        <input type="text" id="new-person-phone-payment" class="form-control" placeholder="أدخل رقم الهاتف" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;margin-top:4px;">
        
        <label style="display:block;margin-top:10px;font-weight:500;font-size:0.85rem;color:var(--text-secondary);">🏷️ النوع</label>
        <select id="new-person-type-payment" class="form-control" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;margin-top:4px;">
            <option value="customer">👤 عميل</option>
            <option value="supplier">🏢 مورد</option>
            <option value="employee">👨‍💼 موظف</option>
            <option value="manager">👑 مدير</option>
        </select>
        
        <label style="display:block;margin-top:10px;font-weight:500;font-size:0.85rem;color:var(--text-secondary);">📍 العنوان (اختياري)</label>
        <input type="text" id="new-person-address-payment" class="form-control" placeholder="أدخل العنوان" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;margin-top:4px;">
        
        <button onclick="POS.saveNewPersonForPayment()" class="btn-success" style="width:100%; margin-top:15px; padding: 12px; border: none; border-radius: 6px; cursor: pointer;">
            <i class="fas fa-save"></i> حفظ وإضافة
        </button>
    `;
    UI.showModal('➕ إضافة شخص جديد', html);
};

// ===== حفظ شخص جديد =====
POS.saveNewPersonForPayment = function() {
    const name = document.getElementById('new-person-name-payment').value.trim();
    const phone = document.getElementById('new-person-phone-payment').value.trim();
    const type = document.getElementById('new-person-type-payment').value;
    const address = document.getElementById('new-person-address-payment')?.value.trim() || '';
    
    if (!name) {
        UI.showToast('⚠️ يرجى إدخال الاسم', 'warning');
        return;
    }
    
    const person = Auth.addPerson(name, type, phone, 0, address);
    if (!person) return;
    
    UI.closeModal();
    UI.showToast(`✅ تم إضافة ${name} بنجاح`, 'success');
    
    const persons = DB.getPersons();
    const newPerson = persons.find(p => p.name === name && p.phone === phone);
    if (newPerson) {
        this.selectPersonForPayment(newPerson.id);
    } else {
        this.showPersonSelectorForPayment();
    }
};

// ===== عرض نافذة اختيار العميل =====
POS.showPersonSelector = function() {
    this.showPersonSelectorForPayment();
};

console.log('📁 تم تحميل POS Persons');