// accounting.js - إدارة المحاسبة والتقارير المالية وسندات الصرف

const Accounting = {
    renderPage(container) {
        const allSales = DB.getAllSales();
        const totalSales = allSales.reduce((a, b) => a + b.total, 0);
        const totalPurchases = state.purchases.reduce((a, b) => a + (b.total || 0), 0);
        const totalProfit = allSales.reduce((a, b) => a + (b.profit || 0), 0);
        const vouchers = DB.getVouchers();
        const totalVouchers = vouchers.reduce((a, b) => a + (b.amount || 0), 0);
        
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
                            <th>المبلغ</th>
                            <th>بواسطة</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${vouchers.length === 0 ? `
                            <tr><td colspan="7" style="text-align:center;color:var(--text-secondary);padding:20px;">لا توجد سندات صرف</td></tr>
                        ` : ''}
                        ${vouchers.slice().reverse().map(v => `
                            <tr>
                                <td>#${v.voucherNumber}</td>
                                <td>${new Date(v.createdAt).toLocaleDateString('ar-SA')}</td>
                                <td>${v.reason || '---'}</td>
                                <td>${v.personName || '---'}</td>
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

    // ===== نافذة إنشاء سند صرف جديد =====
    showAddVoucher() {
        const suppliers = DB.getPersonsByType('supplier');

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

        const voucher = DB.addVoucher({
            type: type,
            reason: reason,
            amount: amount,
            personId: personId,
            personName: personName
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