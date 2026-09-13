// accounting.js - إدارة المحاسبة والتقارير المالية وسندات الصرف والحسابات البنكية/المحافظ

const Accounting = {
    renderPage(container) {
        const allSales = DB.getAllSales();
        const totalSales = allSales.reduce((a, b) => a + b.total, 0);
        const totalPurchases = state.purchases.reduce((a, b) => a + (b.total || 0), 0);
        const totalProfit = allSales.reduce((a, b) => a + (b.profit || 0), 0);
        const vouchers = DB.getVouchers();
        const totalVouchers = vouchers.reduce((a, b) => a + (b.amount || 0), 0);
        const accounts = DB.getFinancialAccounts();
        const totalAccountsBalance = accounts.reduce((a, b) => a + (b.balance || 0), 0);
        const isManager = Auth.currentUser && Auth.currentUser.role === 'manager';
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="card" style="border-right: 5px solid var(--success);">
                    <small>💰 إجمالي المبيعات</small>
                    <h2 style="color: var(--success);">${totalSales.toFixed(2)} ₪</h2>
                </div>
                <div class="card" style="border-right: 5px solid var(--danger);">
                    <small>📦 إجمالي المشتريات</small>
                    <h2 style="color: var(--danger);">${totalPurchases.toFixed(2)} ₪</h2>
                </div>
                <div class="card" style="border-right: 5px solid var(--accent);">
                    <small>📊 صافي الأرباح</small>
                    <h2 style="color: ${totalProfit >= 0 ? 'var(--success)' : 'var(--danger)'};">
                        ${totalProfit.toFixed(2)} ₪
                    </h2>
                </div>
                <div class="card" style="border-right: 5px solid var(--warning);">
                    <small>🧾 إجمالي سندات الصرف</small>
                    <h2 style="color: var(--warning);">${totalVouchers.toFixed(2)} ₪</h2>
                </div>
            </div>

            <div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                <h4 style="margin:0;">🏦 البنوك والمحافظ الإلكترونية</h4>
                ${isManager ? `
                    <button class="btn-success" onclick="Accounting.showAddAccount()" style="padding:8px 16px;">
                        <i class="fas fa-plus"></i> إضافة حساب
                    </button>
                ` : ''}
            </div>

            <div class="card">
                <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:2px solid var(--border);margin-bottom:8px;">
                    <span style="font-weight:700;">إجمالي أرصدة الحسابات</span>
                    <span style="font-weight:800;color:var(--info);">${totalAccountsBalance.toFixed(2)} ₪</span>
                </div>
                ${accounts.length === 0 ? `
                    <div style="text-align:center;color:var(--text-secondary);padding:20px;">
                        لا توجد حسابات بنكية أو محافظ إلكترونية مضافة بعد
                    </div>
                ` : ''}
                ${accounts.map(a => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <div style="width:38px;height:38px;border-radius:10px;background:${a.type === 'bank' ? 'var(--info-soft)' : 'var(--purple-soft)'};display:flex;align-items:center;justify-content:center;">
                                <i class="fas ${a.type === 'bank' ? 'fa-building-columns' : 'fa-mobile-screen'}" style="color:${a.type === 'bank' ? 'var(--info)' : 'var(--purple)'};"></i>
                            </div>
                            <div>
                                <div style="font-weight:600;">${a.name}</div>
                                <small style="color:var(--text-secondary);">${a.type === 'bank' ? 'حساب بنكي' : 'محفظة إلكترونية'}${a.accountNumber ? ` · ${a.accountNumber}` : ''}</small>
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-weight:800;">${(a.balance || 0).toFixed(2)} ₪</span>
                            ${isManager ? `
                                <button onclick="Accounting.showEditAccount(${a.id})" class="btn-primary" style="padding:4px 10px;font-size:0.75rem;">✏️</button>
                                <button onclick="Accounting.deleteAccount(${a.id})" class="btn-danger" style="padding:4px 10px;font-size:0.75rem;">✕</button>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                <h4 style="margin:0;">🧾 سندات الصرف</h4>
                <button class="btn-success" onclick="Accounting.showAddVoucher()" style="padding:8px 16px;">
                    <i class="fas fa-plus"></i> سند صرف جديد
                </button>
            </div>

            <div class="card table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>التاريخ</th>
                            <th>البيان</th>
                            <th>المرتبط بـ</th>
                            <th>المصدر</th>
                            <th>المبلغ</th>
                            <th>بواسطة</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${vouchers.length === 0 ? `
                            <tr><td colspan="8" style="text-align:center;color:var(--text-secondary);padding:20px;">لا توجد سندات صرف</td></tr>
                        ` : ''}
                        ${vouchers.slice().reverse().map(v => `
                            <tr>
                                <td>#${v.voucherNumber}</td>
                                <td>${new Date(v.createdAt).toLocaleDateString('ar-SA')}</td>
                                <td>${v.reason || '---'}</td>
                                <td>${v.personName || '---'}</td>
                                <td>${v.accountName || '💵 الصندوق النقدي'}</td>
                                <td style="color:var(--danger);font-weight:bold;">-${v.amount.toFixed(2)} ₪</td>
                                <td>${v.createdBy || '---'}</td>
                                <td><button onclick="Accounting.deleteVoucher(${v.id})" class="btn-danger" style="padding:4px 10px;font-size:0.75rem;">✕</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="card">
                <h4>📋 آخر العمليات</h4>
                <div style="max-height: 300px; overflow-y: auto;">
                    ${allSales.slice(-5).reverse().map(s => `
                        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border, #eee);">
                            <span>${s.isWholesale ? '📦 فاتورة جملة' : 'فاتورة'} #${s.id}${s.personName ? ` - ${s.personName}` : ''}</span>
                            <span style="color:var(--success);">+${s.total.toFixed(2)} ₪</span>
                        </div>
                    `).join('')}
                    ${state.purchases.slice(-3).reverse().map(p => `
                        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border, #eee);">
                            <span>فاتورة شراء #${p.id}</span>
                            <span style="color:var(--danger);">-${p.total.toFixed(2)} ₪</span>
                        </div>
                    `).join('')}
                    ${vouchers.slice(-3).reverse().map(v => `
                        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border, #eee);">
                            <span>🧾 سند صرف #${v.voucherNumber}${v.reason ? ` - ${v.reason}` : ''}</span>
                            <span style="color:var(--danger);">-${v.amount.toFixed(2)} ₪</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    // ===== إضافة حساب بنكي/محفظة جديدة (مدير فقط) =====
    showAddAccount() {
        if (!Auth.currentUser || Auth.currentUser.role !== 'manager') {
            UI.showToast('⚠️ إضافة الحسابات المالية مقصورة على المدير', 'warning');
            return;
        }

        const html = `
            <label style="display:block;font-weight:500;font-size:0.85rem;color:var(--text-secondary);">نوع الحساب</label>
            <select id="acc-type" class="form-control">
                <option value="bank">🏦 حساب بنكي</option>
                <option value="wallet">📱 محفظة إلكترونية</option>
            </select>

            <label style="display:block;margin-top:10px;font-weight:500;font-size:0.85rem;color:var(--text-secondary);">اسم الحساب</label>
            <input type="text" id="acc-name" class="form-control" placeholder="مثال: بنك الأهلي، فودافون كاش">

            <label style="display:block;margin-top:10px;font-weight:500;font-size:0.85rem;color:var(--text-secondary);">رقم الحساب / الهاتف (اختياري)</label>
            <input type="text" id="acc-number" class="form-control" placeholder="اختياري">

            <label style="display:block;margin-top:10px;font-weight:500;font-size:0.85rem;color:var(--text-secondary);">الرصيد الافتتاحي</label>
            <input type="number" id="acc-opening" class="form-control" placeholder="0.00" value="0">

            <button onclick="Accounting.saveNewAccount()" class="btn-success" style="width:100%;margin-top:15px;padding:12px;border:none;border-radius:6px;cursor:pointer;">
                <i class="fas fa-save"></i> حفظ الحساب
            </button>
        `;
        UI.showModal('🏦 إضافة حساب بنكي / محفظة', html);
    },

    saveNewAccount() {
        const type = document.getElementById('acc-type').value;
        const name = document.getElementById('acc-name').value.trim();
        const accountNumber = document.getElementById('acc-number').value.trim();
        const openingBalance = parseFloat(document.getElementById('acc-opening').value) || 0;

        if (!name) {
            UI.showToast('⚠️ يرجى إدخال اسم الحساب', 'warning');
            return;
        }

        DB.addFinancialAccount({ type, name, accountNumber, openingBalance });
        state = DB.load();
        UI.closeModal();
        UI.showToast('✅ تم إضافة الحساب بنجاح', 'success');
        App.switchPage('accounting');
    },

    // ===== تعديل حساب (الاسم/الرقم فقط، الرصيد لا يُعدَّل يدوياً) =====
    showEditAccount(id) {
        if (!Auth.currentUser || Auth.currentUser.role !== 'manager') {
            UI.showToast('⚠️ تعديل الحسابات المالية مقصور على المدير', 'warning');
            return;
        }

        const account = DB.getFinancialAccount(id);
        if (!account) return;

        const html = `
            <label style="display:block;font-weight:500;font-size:0.85rem;color:var(--text-secondary);">نوع الحساب</label>
            <select id="acc-edit-type" class="form-control">
                <option value="bank" ${account.type === 'bank' ? 'selected' : ''}>🏦 حساب بنكي</option>
                <option value="wallet" ${account.type === 'wallet' ? 'selected' : ''}>📱 محفظة إلكترونية</option>
            </select>

            <label style="display:block;margin-top:10px;font-weight:500;font-size:0.85rem;color:var(--text-secondary);">اسم الحساب</label>
            <input type="text" id="acc-edit-name" class="form-control" value="${account.name}">

            <label style="display:block;margin-top:10px;font-weight:500;font-size:0.85rem;color:var(--text-secondary);">رقم الحساب / الهاتف (اختياري)</label>
            <input type="text" id="acc-edit-number" class="form-control" value="${account.accountNumber || ''}">

            <div style="background:var(--bg);padding:10px;border-radius:8px;margin-top:12px;font-size:0.8rem;color:var(--text-secondary);">
                <i class="fas fa-circle-info"></i> الرصيد الحالي (${(account.balance || 0).toFixed(2)} ₪) يتحرك تلقائياً من عمليات البيع وسندات الصرف، ولا يمكن تعديله يدوياً هنا.
            </div>

            <button onclick="Accounting.saveEditAccount(${id})" class="btn-success" style="width:100%;margin-top:15px;padding:12px;border:none;border-radius:6px;cursor:pointer;">
                <i class="fas fa-save"></i> تحديث الحساب
            </button>
        `;
        UI.showModal('✏️ تعديل حساب', html);
    },

    saveEditAccount(id) {
        const type = document.getElementById('acc-edit-type').value;
        const name = document.getElementById('acc-edit-name').value.trim();
        const accountNumber = document.getElementById('acc-edit-number').value.trim();

        if (!name) {
            UI.showToast('⚠️ يرجى إدخال اسم الحساب', 'warning');
            return;
        }

        DB.updateFinancialAccount(id, { type, name, accountNumber });
        state = DB.load();
        UI.closeModal();
        UI.showToast('✅ تم تحديث الحساب', 'success');
        App.switchPage('accounting');
    },

    deleteAccount(id) {
        if (!Auth.currentUser || Auth.currentUser.role !== 'manager') {
            UI.showToast('⚠️ حذف الحسابات المالية مقصور على المدير', 'warning');
            return;
        }

        const account = DB.getFinancialAccount(id);
        if (!account) return;

        const balance = account.balance || 0;
        const message = balance !== 0
            ? `⚠️ هذا الحساب به رصيد ${balance.toFixed(2)} ₪. سيتم حذف الحساب مع فقدان تتبع هذا الرصيد. هل أنت متأكد؟`
            : `هل أنت متأكد من حذف حساب "${account.name}"؟`;

        UI.confirmAction(message, function() {
            DB.deleteFinancialAccount(id);
            state = DB.load();
            UI.showToast('✅ تم حذف الحساب', 'success');
            App.switchPage('accounting');
        });
    },

    // ===== نافذة إنشاء سند صرف جديد =====
    showAddVoucher() {
        const suppliers = DB.getPersonsByType('supplier');
        const accounts = DB.getFinancialAccounts();

        const html = `
            <label style="display:block;font-weight:500;font-size:0.85rem;color:var(--text-secondary);">نوع السند</label>
            <select id="v-type" class="form-control" onchange="Accounting.onVoucherTypeChange()">
                <option value="general">💵 مصروف عام (كهرباء، إيجار، صيانة...)</option>
                <option value="supplier">🏢 تسديد لمورد (خصم من رصيده المستحق)</option>
            </select>

            <div id="v-supplier-wrap" style="display:none;margin-top:10px;">
                <label style="display:block;font-weight:500;font-size:0.85rem;color:var(--text-secondary);">المورد</label>
                <select id="v-supplier" class="form-control">
                    <option value="">-- اختر المورد --</option>
                    ${suppliers.map(s => `<option value="${s.id}">${s.name} ${s.balance > 0 ? `(مستحق له: ${s.balance.toFixed(2)} ₪)` : ''}</option>`).join('')}
                </select>
            </div>

            <label style="display:block;margin-top:10px;font-weight:500;font-size:0.85rem;color:var(--text-secondary);">البيان / السبب</label>
            <input type="text" id="v-reason" class="form-control" placeholder="مثال: فاتورة كهرباء شهر...">

            <label style="display:block;margin-top:10px;font-weight:500;font-size:0.85rem;color:var(--text-secondary);">المبلغ</label>
            <input type="number" id="v-amount" class="form-control" placeholder="0.00">

            <label style="display:block;margin-top:10px;font-weight:500;font-size:0.85rem;color:var(--text-secondary);">الصرف من</label>
            <select id="v-account" class="form-control">
                <option value="">💵 الصندوق النقدي</option>
                ${accounts.map(a => `<option value="${a.id}">${a.type === 'bank' ? '🏦' : '📱'} ${a.name} (الرصيد: ${(a.balance || 0).toFixed(2)} ₪)</option>`).join('')}
            </select>

            <button onclick="Accounting.saveVoucher()" class="btn-success" style="width:100%;margin-top:15px;padding:12px;border:none;border-radius:6px;cursor:pointer;">
                <i class="fas fa-save"></i> حفظ السند
            </button>
        `;
        UI.showModal('🧾 سند صرف جديد', html);
    },

    onVoucherTypeChange() {
        const type = document.getElementById('v-type').value;
        const wrap = document.getElementById('v-supplier-wrap');
        wrap.style.display = type === 'supplier' ? 'block' : 'none';
    },

    saveVoucher() {
        const type = document.getElementById('v-type').value;
        const reason = document.getElementById('v-reason').value.trim();
        const amount = parseFloat(document.getElementById('v-amount').value);
        const accountId = document.getElementById('v-account').value ? parseInt(document.getElementById('v-account').value) : null;

        if (!amount || amount <= 0) {
            UI.showToast('⚠️ يرجى إدخال مبلغ صحيح', 'warning');
            return;
        }

        let personId = null;
        let personName = null;

        if (type === 'supplier') {
            personId = document.getElementById('v-supplier').value || null;
            if (!personId) {
                UI.showToast('⚠️ يرجى اختيار المورد', 'warning');
                return;
            }
            const person = DB.getPerson(personId);
            personName = person ? person.name : null;
        }

        if (!reason && type === 'general') {
            UI.showToast('⚠️ يرجى إدخال البيان', 'warning');
            return;
        }

        let accountName = null;
        if (accountId) {
            const account = DB.getFinancialAccount(accountId);
            if (!account) {
                UI.showToast('⚠️ الحساب المختار غير موجود', 'warning');
                return;
            }
            if ((account.balance || 0) < amount) {
                UI.showToast(`⚠️ رصيد "${account.name}" غير كافٍ (المتوفر: ${(account.balance || 0).toFixed(2)} ₪)`, 'warning');
                return;
            }
            accountName = account.name;
        }

        const voucher = DB.addVoucher({
            type: type,
            reason: reason,
            amount: amount,
            personId: personId,
            personName: personName,
            accountId: accountId,
            accountName: accountName
        });

        state = DB.load();
        UI.closeModal();
        UI.showToast(`✅ تم حفظ سند الصرف #${voucher.voucherNumber}`, 'success');
        App.switchPage('accounting');
    },

    deleteVoucher(id) {
        if (!confirm('هل أنت متأكد من حذف سند الصرف هذا؟ سيتم عكس تأثيره على رصيد المورد إن وجد.')) return;
        const success = DB.deleteVoucher(id);
        if (success) {
            state = DB.load();
            UI.showToast('✅ تم حذف سند الصرف', 'success');
            App.switchPage('accounting');
        }
    }
};
