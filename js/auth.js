// auth.js - إدارة المصادقة والمستخدمين مع الصلاحيات والأشخاص

const Auth = {
    currentUser: null,

    // ===== تشفير كلمات المرور =====
    // لا نخزّن كلمات المرور كنص صريح؛ نخزّن SHA-256(salt:password) فقط.
    // ملاحظة: هذا تطبيق يعمل بالكامل من المتصفح بدون خادم، لذا هذا تحسين
    // حقيقي (لا تُقرأ كلمة المرور مباشرة من التخزين) لكنه ليس حماية كاملة
    // بمعايير الخوادم (لا يوجد سر خادم/rate limiting). يكفي لتطبيق محلي.
    generateSalt() {
        const bytes = new Uint8Array(8);
        crypto.getRandomValues(bytes);
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async hashPassword(password, salt) {
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error('NO_SUBTLE_CRYPTO');
        }
        const enc = new TextEncoder();
        const digest = await window.crypto.subtle.digest('SHA-256', enc.encode(salt + ':' + password));
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async login() {
        const u = document.getElementById('login-user').value.trim();
        const p = document.getElementById('login-pass').value.trim();
        
        if (!u || !p) {
            UI.showToast('⚠️ يرجى إدخال اسم المستخدم وكلمة المرور', 'warning');
            return;
        }
        
        const user = state.users.find(x => x.username === u);
        let ok = false;

        try {
            if (user && user.salt) {
                const hashed = await this.hashPassword(p, user.salt);
                ok = hashed === user.pass;
            } else if (user && user.pass === p) {
                // مستخدم قديم لم تُشفَّر كلمة مروره بعد (تثبيت سابق) - نقبله هذه
                // المرة ثم نشفّرها فوراً حتى لا تبقى نصاً صريحاً في التخزين
                ok = true;
                user.salt = this.generateSalt();
                user.pass = await this.hashPassword(p, user.salt);
            }
        } catch (e) {
            if (e.message === 'NO_SUBTLE_CRYPTO') {
                UI.showToast('⚠️ متصفحك لا يدعم ميزات الأمان المطلوبة، الرجاء استخدام متصفح حديث (Chrome/Edge/Safari)', 'error');
            } else {
                UI.showToast('❌ حدث خطأ أثناء تسجيل الدخول', 'error');
            }
            return;
        }

        if (ok && user) {
            this.currentUser = user;
            user.lastLogin = new Date().toISOString();
            updateState();
            
            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('u-name').innerText = user.name;
            document.getElementById('u-role').innerText = user.role === 'manager' ? 'مدير' : 'موظف';
            
            this.updateUIByRole(user.role);
            
            App.init();
            App.auditLog(`✅ تسجيل دخول: ${user.name} (${user.role})`);
            UI.showToast(`👋 مرحباً ${user.name}`, 'success');
        } else {
            UI.showToast('❌ اسم المستخدم أو كلمة المرور غير صحيحة!', 'error');
        }
    },

    logout() {
        if (confirm('هل تريد الخروج؟')) {
            if (this.currentUser) {
                App.auditLog(`🚪 تسجيل خروج: ${this.currentUser.name}`);
            }
            location.reload();
        }
    },

    updateUIByRole(role) {
        const isManager = role === 'manager';

        // نوحّد كل عناصر القائمة الجانبية على أساس data-page (يشمل "إدارة النظام"
        // التي كانت سابقاً تعتمد فقط على admin-only)
        document.querySelectorAll('.nav-item[data-page]').forEach(el => {
            const pageId = el.getAttribute('data-page');
            el.style.display = this.canAccessPage(pageId) ? 'flex' : 'none';
        });

        // أي عنصر admin-only آخر بدون data-page (لو أُضيف مستقبلاً) يبقى
        // مقتصراً على المدير فقط كسلوك افتراضي آمن
        document.querySelectorAll('.admin-only:not([data-page])').forEach(el => {
            el.style.display = isManager ? 'flex' : 'none';
        });
    },

    // ===== نظام الصلاحيات المرن =====
    // كل صفحة في القائمة الجانبية لها مفتاح صلاحية خاص بها (user.pages).
    // المدير (role === 'manager') يملك كل الصلاحيات دائماً بلا استثناء.
    // أي موظف آخر يُحدَّد لكل واحد منه بشكل مستقل أي صفحات يدخلها،
    // بالإضافة لصلاحية فرعية خاصة "تعديل سعر الصنف داخل السلة".
    PAGE_PERMISSIONS: [
        { key: 'dashboard', label: '📊 لوحة التحكم' },
        { key: 'pos', label: '💰 الكاشير (POS)' },
        { key: 'wholesale', label: '📦 فاتورة بيع جملة' },
        { key: 'inventory', label: '📋 المخزون' },
        { key: 'crm', label: '👥 العملاء والموردين' },
        { key: 'purchases', label: '🛒 المشتريات' },
        { key: 'accounting', label: '🧮 المحاسبة' },
        { key: 'reports', label: '📈 التقارير' },
        { key: 'system', label: '⚙️ إدارة النظام (المستخدمون والنسخ الاحتياطية)' }
    ],

    // صلاحية فرعية مستقلة عن صلاحيات الصفحات، لكنها لا تُعرض إلا إذا
    // كانت صلاحية صفحة "الكاشير" مفعّلة أصلاً (لا معنى لها بدونها)
    EDIT_CART_PRICE_KEY: 'edit_cart_price',

    hasPermission(permission) {
        if (!this.currentUser) return false;
        if (this.currentUser.role === 'manager') return true;

        // خرائط قديمة (view_reports, manage_users...) نحوّلها لمفاتيح الصفحات
        // الجديدة حتى لا ينكسر أي كود قديم مازال يستخدم الأسماء القديمة
        const legacyMap = {
            'view_dashboard': 'dashboard',
            'view_pos': 'pos',
            'view_inventory': 'inventory',
            'view_reports': 'reports',
            'manage_users': 'system',
            'manage_backup': 'system',
            'manage_payment': 'pos'
        };
        const key = legacyMap[permission] || permission;

        if (key === this.EDIT_CART_PRICE_KEY) {
            const pages = this.currentUser.pages || [];
            return pages.includes('pos') && !!this.currentUser.canEditCartPrice;
        }

        const pages = this.currentUser.pages || [];
        return pages.includes(key);
    },

    // هل يملك المستخدم الحالي صلاحية الدخول لصفحة معينة من القائمة الجانبية؟
    canAccessPage(pageId) {
        if (!this.currentUser) return false;
        if (this.currentUser.role === 'manager') return true;
        return (this.currentUser.pages || []).includes(pageId);
    },

    getUsers() {
        return state.users || [];
    },

    async addUser(name, username, password, role = 'employee') {
        if (state.users.find(u => u.username === username)) {
            UI.showToast('⚠️ اسم المستخدم موجود بالفعل!', 'warning');
            return false;
        }

        const salt = this.generateSalt();
        const hashed = await this.hashPassword(password, salt);

        state.users.push({
            id: Date.now(),
            name: name,
            username: username,
            pass: hashed,
            salt: salt,
            role: role,
            created: new Date().toISOString(),
            lastLogin: null,
            active: true
        });

        updateState();
        App.auditLog(`➕ إضافة مستخدم جديد: ${name} (${username})`);
        UI.showToast(`✅ تم إضافة المستخدم ${name} بنجاح`, 'success');
        return true;
    },

    deleteUser(id) {
        if (this.currentUser && this.currentUser.id === id) {
            UI.showToast('⚠️ لا يمكن حذف المستخدم الحالي!', 'warning');
            return false;
        }

        const managers = state.users.filter(u => u.role === 'manager');
        const target = state.users.find(u => u.id === id);
        if (target && target.role === 'manager' && managers.length <= 1) {
            UI.showToast('⚠️ لا يمكن حذف المدير الوحيد في النظام!', 'warning');
            return false;
        }

        const userName = target ? target.name : 'مستخدم';
        state.users = state.users.filter(u => u.id !== id);
        updateState();
        App.auditLog(`🗑️ حذف مستخدم: ${userName}`);
        UI.showToast('✅ تم حذف المستخدم بنجاح', 'success');
        return true;
    },

    updateUser(id, data) {
        const user = state.users.find(u => u.id === id);
        if (!user) {
            UI.showToast('⚠️ المستخدم غير موجود!', 'warning');
            return false;
        }

        Object.assign(user, data);
        updateState();
        App.auditLog(`✏️ تحديث بيانات المستخدم: ${user.name}`);
        UI.showToast('✅ تم تحديث بيانات المستخدم', 'success');
        return true;
    },

    async changePassword(id, newPassword) {
        const user = state.users.find(u => u.id === id);
        if (!user) {
            UI.showToast('⚠️ المستخدم غير موجود!', 'warning');
            return false;
        }

        user.salt = this.generateSalt();
        user.pass = await this.hashPassword(newPassword, user.salt);
        updateState();
        App.auditLog(`🔑 تغيير كلمة المرور للمستخدم: ${user.name}`);
        UI.showToast('✅ تم تغيير كلمة المرور بنجاح', 'success');
        return true;
    },

    // ===== إدارة الأشخاص =====
    // ملاحظة: الأشخاص (persons) قائمة مُشتقة تلقائياً من العملاء/الموردين/الموظفين
    // عبر DB.syncPersons()، وتُعاد بناؤها بالكامل من تلك الجداول عند كل تحميل
    // للصفحة وعند أي تعديل عليها. لذلك يجب أن تُضاف/تُعدَّل/تُحذف من مصدرها
    // الحقيقي (DB.addCustomer/addSupplier/addEmployee) وإلا سيتم فقدانها.
    getAllPersons() {
        return state.persons || [];
    },

    getPersonsByType(type) {
        return (state.persons || []).filter(p => p.type === type);
    },

    addPerson(name, type, phone = '', balance = 0, address = '') {
        let created = null;

        if (type === 'customer') {
            created = DB.addCustomer({ name, phone, balance, address });
        } else if (type === 'supplier') {
            created = DB.addSupplier({ name, phone, balance, address });
        } else if (type === 'employee') {
            created = DB.addEmployee({ name, phone, position: '', salary: 0, status: 'active', notes: '' });
        } else {
            UI.showToast('⚠️ لا يمكن إضافة مدير من هنا', 'warning');
            return null;
        }

        state = DB.load();
        App.auditLog(`➕ إضافة شخص: ${name} (${type})`);
        return created;
    },

    updatePerson(id, data) {
        const person = (state.persons || []).find(p => p.id === id);
        if (!person) return null;

        let updated = null;
        if (person.source === 'customer') {
            updated = DB.updateCustomer(person.rawId, data);
        } else if (person.source === 'supplier') {
            updated = DB.updateSupplier(person.rawId, data);
        } else if (person.source === 'employee') {
            updated = DB.updateEmployee(person.rawId, data);
        }

        state = DB.load();
        App.auditLog(`✏️ تحديث شخص: ${person.name}`);
        return updated;
    },

    deletePerson(id) {
        const person = (state.persons || []).find(p => p.id === id);
        if (!person) return false;

        if (person.source === 'customer') {
            DB.deleteCustomer(person.rawId);
        } else if (person.source === 'supplier') {
            DB.deleteSupplier(person.rawId);
        } else if (person.source === 'employee') {
            DB.deleteEmployee(person.rawId);
        }

        state = DB.load();
        App.auditLog(`🗑️ حذف شخص`);
        return true;
    },

    // ===== عرض نافذة إدارة المستخدمين =====
    showUserManager() {
        if (!this.hasPermission('manage_users')) {
            UI.showToast('⚠️ لا تملك صلاحية لإدارة المستخدمين', 'warning');
            return;
        }

        const users = this.getUsers();
        const html = `
            <div style="max-height: 400px; overflow-y: auto;">
                <div style="margin-bottom: 15px;">
                    <button onclick="Auth.showAddUserForm()" class="btn-success" style="width:100%; padding: 10px;">
                        <i class="fas fa-user-plus"></i> إضافة مستخدم جديد
                    </button>
                </div>
                ${users.map(u => `
                    <div style="background: var(--bg); padding: 12px 15px; margin-bottom: 8px; border-radius: 10px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <div>
                            <div style="font-weight: bold;">${u.name}</div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">
                                @${u.username} | ${u.role === 'manager' ? '👑 مدير (كل الصلاحيات)' : `👤 موظف (${(u.pages || []).length} صفحة متاحة)`}
                                ${u.id === this.currentUser?.id ? ' (أنت)' : ''}
                            </div>
                            <div style="font-size: 0.7rem; color: var(--text-secondary);">
                                ${u.lastLogin ? `آخر دخول: ${new Date(u.lastLogin).toLocaleString('ar-SA')}` : 'لم يسجل دخول بعد'}
                            </div>
                        </div>
                        <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                            <button onclick="Auth.showEditUserForm(${u.id})" class="btn-primary" style="padding: 4px 12px; font-size: 0.8rem;">✏️</button>
                            ${u.id !== this.currentUser?.id ? `<button onclick="Auth.deleteUser(${u.id})" class="btn-danger" style="padding: 4px 12px; font-size: 0.8rem;">🗑️</button>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            <hr>
            <button onclick="UI.closeModal()" class="btn-primary" style="width:100%; padding: 10px; background: var(--text-secondary);">✕ إغلاق</button>
        `;
        UI.showModal('👥 إدارة المستخدمين', html);
    },

    showAddUserForm() {
        const html = `
            <label>الاسم الكامل</label>
            <input type="text" id="new-user-name" class="form-control" placeholder="أدخل الاسم">
            <label>اسم المستخدم</label>
            <input type="text" id="new-user-username" class="form-control" placeholder="أدخل اسم المستخدم">
            <label>كلمة المرور</label>
            <input type="password" id="new-user-pass" class="form-control" placeholder="أدخل كلمة المرور">
            <label>الصلاحية العامة</label>
            <select id="new-user-role" class="form-control" onchange="Auth.togglePagesSection('new')">
                <option value="employee">موظف (صلاحيات محددة)</option>
                <option value="manager">مدير (كل الصلاحيات تلقائياً)</option>
            </select>

            <div id="new-user-pages-section" style="margin-top:12px;">
                ${this.renderPagesCheckboxes('new', [])}
            </div>

            <button onclick="Auth.saveNewUser()" class="btn-success" style="width:100%; margin-top:15px; padding: 12px;">
                <i class="fas fa-save"></i> حفظ المستخدم
            </button>
        `;
        UI.showModal('➕ إضافة مستخدم جديد', html);
    },

    // ===== توليد قائمة مربعات الصفحات (checkboxes) لنموذج إضافة/تعديل موظف =====
    renderPagesCheckboxes(prefix, selectedPages) {
        const hasPos = selectedPages.includes('pos');
        return `
            <label style="display:block;font-weight:600;margin-bottom:6px;">الصفحات المسموح بالوصول إليها</label>
            <div style="display:flex;flex-direction:column;gap:8px;background:var(--bg);padding:12px;border-radius:8px;border:1px solid var(--border);">
                ${this.PAGE_PERMISSIONS.map(p => `
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                        <input type="checkbox" class="${prefix}-page-checkbox" value="${p.key}"
                            ${selectedPages.includes(p.key) ? 'checked' : ''}
                            ${p.key === 'pos' ? `onchange="Auth.onPosCheckboxChange('${prefix}')"` : ''}>
                        <span>${p.label}</span>
                    </label>
                `).join('')}
            </div>
            <div id="${prefix}-cart-price-wrap" style="margin-top:10px;${hasPos ? '' : 'display:none;'}">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;background:var(--warning-soft, rgba(251,191,36,0.1));padding:10px;border-radius:8px;">
                    <input type="checkbox" id="${prefix}-edit-cart-price" ${selectedPages.includes('__canEditCartPrice') ? 'checked' : ''}>
                    <span>✏️ يسمح له بتعديل سعر الصنف داخل سلة الكاشير (لكل فاتورة على حدة)</span>
                </label>
            </div>
        `;
    },

    // إظهار/إخفاء قائمة الصلاحيات بالكامل حسب الدور العام (مدير = كل شيء تلقائياً)
    togglePagesSection(prefix) {
        const role = document.getElementById(`${prefix}-user-role`)?.value;
        const section = document.getElementById(`${prefix}-user-pages-section`);
        if (!section) return;
        section.style.display = role === 'manager' ? 'none' : 'block';
    },

    // إظهار/إخفاء مربع "تعديل سعر السلة" حسب حالة مربع "الكاشير"
    onPosCheckboxChange(prefix) {
        const posChecked = document.querySelector(`.${prefix}-page-checkbox[value="pos"]`)?.checked;
        const wrap = document.getElementById(`${prefix}-cart-price-wrap`);
        if (wrap) wrap.style.display = posChecked ? 'block' : 'none';
        if (!posChecked) {
            const cb = document.getElementById(`${prefix}-edit-cart-price`);
            if (cb) cb.checked = false;
        }
    },

    // قراءة الصفحات المحدَّدة من مربعات الاختيار
    collectSelectedPages(prefix) {
        const checkboxes = document.querySelectorAll(`.${prefix}-page-checkbox:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
    },

    async saveNewUser() {
        const name = document.getElementById('new-user-name').value.trim();
        const username = document.getElementById('new-user-username').value.trim();
        const password = document.getElementById('new-user-pass').value.trim();
        const role = document.getElementById('new-user-role').value;

        if (!name || !username || !password) {
            UI.showToast('⚠️ يرجى ملء جميع الحقول', 'warning');
            return;
        }

        const pages = role === 'manager' ? [] : this.collectSelectedPages('new');
        const canEditCartPrice = role === 'manager' ? true : !!document.getElementById('new-edit-cart-price')?.checked;

        const ok = await this.addUser(name, username, password, role);
        if (ok) {
            const created = state.users.find(u => u.username === username);
            if (created) {
                created.pages = pages;
                created.canEditCartPrice = canEditCartPrice;
                updateState();
            }
        }
        UI.closeModal();
        this.showUserManager();
    },

    showEditUserForm(id) {
        const user = state.users.find(u => u.id === id);
        if (!user) {
            UI.showToast('⚠️ المستخدم غير موجود', 'warning');
            return;
        }

        const selectedPages = (user.pages || []).slice();
        if (user.canEditCartPrice) selectedPages.push('__canEditCartPrice');

        const html = `
            <label>الاسم الكامل</label>
            <input type="text" id="edit-user-name" class="form-control" value="${user.name}">
            <label>اسم المستخدم</label>
            <input type="text" id="edit-user-username" class="form-control" value="${user.username}">
            <label>كلمة المرور (اترك فارغاً للتغيير)</label>
            <input type="password" id="edit-user-pass" class="form-control" placeholder="كلمة مرور جديدة">
            <label>الصلاحية العامة</label>
            <select id="edit-user-role" class="form-control" onchange="Auth.togglePagesSection('edit')">
                <option value="employee" ${user.role === 'employee' ? 'selected' : ''}>موظف (صلاحيات محددة)</option>
                <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>مدير (كل الصلاحيات تلقائياً)</option>
            </select>

            <div id="edit-user-pages-section" style="margin-top:12px;${user.role === 'manager' ? 'display:none;' : ''}">
                ${this.renderPagesCheckboxes('edit', selectedPages)}
            </div>

            <button onclick="Auth.saveEditUser(${id})" class="btn-success" style="width:100%; margin-top:15px; padding: 12px;">
                <i class="fas fa-save"></i> تحديث المستخدم
            </button>
        `;
        UI.showModal('✏️ تعديل مستخدم', html);
    },

    async saveEditUser(id) {
        const name = document.getElementById('edit-user-name').value.trim();
        const username = document.getElementById('edit-user-username').value.trim();
        const password = document.getElementById('edit-user-pass').value.trim();
        const role = document.getElementById('edit-user-role').value;

        if (!name || !username) {
            UI.showToast('⚠️ يرجى ملء الحقول المطلوبة', 'warning');
            return;
        }

        const pages = role === 'manager' ? [] : this.collectSelectedPages('edit');
        const canEditCartPrice = role === 'manager' ? true : !!document.getElementById('edit-edit-cart-price')?.checked;

        this.updateUser(id, { name, username, role, pages, canEditCartPrice });
        if (password) {
            await this.changePassword(id, password);
        }

        // إذا كان المستخدم يعدّل صلاحياته الخاصة، نحدّث واجهته فوراً
        if (this.currentUser && this.currentUser.id === id) {
            this.currentUser = state.users.find(u => u.id === id);
            this.updateUIByRole(this.currentUser.role);
        }

        UI.closeModal();
        this.showUserManager();
    }
};