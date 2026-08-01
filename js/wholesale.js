// wholesale.js - فاتورة بيع جملة مستقلة خارج شاشة الكاشير الرئيسية
// تُنشئ فاتورة جملة كاملة (عميل + أصناف + دفع) بدون المرور بسلة الكاشير،
// وتستخدم نفس منطق DB.addInvoice / DB.updatePersonBalance / طباعة POS
// حتى تبقى فاتورة الجملة موحدة الشكل والبيانات في كل التطبيق.

const Wholesale = {
    temp: [],
    selectedCustomerId: null,

    renderPage(container) {
        this.temp = [];
        this.selectedCustomerId = null;
        const customers = DB.getPersonsByType('customer').filter(c => c.name !== 'عميل نقدي');

        container.innerHTML = `
            <div class="card">
                <h3>📦 فاتورة بيع جملة (خارج الكاشير)</h3>

                <label style="display:block;margin-top:10px;font-weight:500;">العميل</label>
                <div style="display:flex;gap:8px;">
                    <select id="ws-customer" class="form-control" onchange="Wholesale.onCustomerChange()">
                        <option value="">-- عميل جملة (بدون حساب) --</option>
                        ${customers.map(c => `<option value="${c.id}">${c.name} ${c.balance > 0 ? `(مستحق عليه: ${c.balance.toFixed(2)} ₪)` : ''}</option>`).join('')}
                    </select>
                    <button type="button" onclick="Wholesale.addNewCustomer()" class="btn-primary" style="width:auto;padding:8px 12px;" title="إضافة عميل جديد">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>

                <div id="ws-customer-fields" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
                    <input type="text" id="ws-customer-name" placeholder="👤 اسم العميل" class="form-control">
                    <input type="text" id="ws-customer-phone" placeholder="📱 رقم الهاتف" class="form-control">
                    <input type="text" id="ws-customer-address" placeholder="📍 العنوان" class="form-control">
                    <input type="text" id="ws-customer-cr" placeholder="🏢 السجل التجاري" class="form-control">
                </div>

                <hr style="margin:15px 0;">

                <label style="display:block;font-weight:500;">الصنف</label>
                <select id="ws-p" class="form-control" onchange="Wholesale.onProductChange()">
                    <option value="">-- اختر صنف --</option>
                    ${state.products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                </select>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
                    <div>
                        <label style="display:block;font-weight:500;font-size:0.85rem;">الوحدة</label>
                        <div style="display:flex;gap:6px;">
                            ${UI.unitSelectHTML('ws-unit', 'قطعة')}
                            <button type="button" onclick="UI.addNewUnit('ws-unit')" class="btn-primary" style="width:auto;padding:8px 10px;" title="إضافة وحدة">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label style="display:block;font-weight:500;font-size:0.85rem;">الكمية (أو عدد الكراتين إذا اخترت "كرتون")</label>
                        <input type="number" id="ws-q" placeholder="الكمية" class="form-control">
                    </div>
                    <div>
                        <label style="display:block;font-weight:500;font-size:0.85rem;">سعر الوحدة (جملة)</label>
                        <input type="number" id="ws-price" placeholder="سعر البيع" class="form-control">
                    </div>
                </div>

                <button class="btn-primary" onclick="Wholesale.add()" style="margin-top:10px;width:100%;padding:10px;">
                    ➕ إضافة للفاتورة
                </button>

                <div class="table-responsive" style="margin-top:15px;">
                    <table>
                        <thead>
                            <tr>
                                <th>الصنف</th>
                                <th>الوحدة</th>
                                <th>الكمية</th>
                                <th>السعر</th>
                                <th>الإجمالي</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="ws-list-ui">
                            <tr><td colspan="6" style="text-align:center;color:var(--text-secondary);padding:15px;">لم تُضف أصناف بعد</td></tr>
                        </tbody>
                    </table>
                </div>

                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
                    <span>خصم (₪)</span>
                    <input type="number" id="ws-discount" value="0" min="0" class="form-control" style="width:100px;" oninput="Wholesale.renderList()">
                </div>

                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:1.1rem;font-weight:bold;">
                    <span>الإجمالي:</span>
                    <span id="ws-total">0.00 ₪</span>
                </div>

                <label style="display:block;margin-top:15px;font-weight:500;">طريقة الدفع</label>
                <select id="ws-payment-method" class="form-control">
                    ${DB.getPaymentMethods().filter(m => m.enabled !== false).map(m => `<option value="${m.id}">${m.name}${m.requirePerson ? ' (يتطلب اختيار عميل)' : ''}</option>`).join('')}
                </select>

                <button class="btn-success" onclick="Wholesale.save()" style="width:100%;margin-top:15px;padding:12px;">
                    💾 حفظ الفاتورة وإتمام البيع
                </button>
            </div>
        `;
    },

    onCustomerChange() {
        const id = document.getElementById('ws-customer').value || null;
        this.selectedCustomerId = id;
        const fields = document.getElementById('ws-customer-fields');
        if (!id) {
            fields.style.display = 'grid';
            document.getElementById('ws-customer-name').value = '';
            document.getElementById('ws-customer-phone').value = '';
            document.getElementById('ws-customer-address').value = '';
            return;
        }
        const person = DB.getPerson(id);
        if (person) {
            fields.style.display = 'grid';
            document.getElementById('ws-customer-name').value = person.name || '';
            document.getElementById('ws-customer-phone').value = person.phone || '';
            document.getElementById('ws-customer-address').value = person.address || '';
        }
    },

    addNewCustomer() {
        const name = prompt('👤 اسم العميل الجديد:');
        if (!name || !name.trim()) return;
        const phone = prompt('📞 رقم الهاتف (اختياري):') || '';
        const openingBalanceStr = prompt('💰 الرصيد الافتتاحي (اختياري):', '0') || '0';
        const openingBalance = parseFloat(openingBalanceStr) || 0;

        const customer = DB.addCustomer({ name: name.trim(), phone: phone.trim(), address: '', type: 'credit', openingBalance });
        if (!customer) return;

        UI.showToast(`✅ تم إضافة العميل ${name.trim()}`, 'success');

        const customers = DB.getPersonsByType('customer').filter(c => c.name !== 'عميل نقدي');
        const newPerson = customers.find(p => p.rawId === customer.id) || null;

        const select = document.getElementById('ws-customer');
        if (select) {
            select.innerHTML = `
                <option value="">-- عميل جملة (بدون حساب) --</option>
                ${customers.map(c => `<option value="${c.id}">${c.name} ${c.balance > 0 ? `(مستحق عليه: ${c.balance.toFixed(2)} ₪)` : ''}</option>`).join('')}
            `;
            if (newPerson) {
                select.value = newPerson.id;
                this.onCustomerChange();
            }
        }
    },

    onProductChange() {
        const id = document.getElementById('ws-p').value;
        if (!id) return;
        const p = state.products.find(x => x.id == id);
        if (p) {
            document.getElementById('ws-price').value = p.wholesalePrice || p.price || '';
            const unitSelect = document.getElementById('ws-unit');
            if (unitSelect) unitSelect.value = p.unit || 'قطعة';
        }
    },

    add() {
        const productSelect = document.getElementById('ws-p');
        const id = productSelect.value;
        if (!id) {
            UI.showToast('⚠️ اختر صنفاً', 'warning');
            return;
        }

        const unit = document.getElementById('ws-unit').value;
        let q = parseFloat(document.getElementById('ws-q').value);
        const price = parseFloat(document.getElementById('ws-price').value);

        if (!q || q <= 0 || isNaN(price) || price < 0) {
            UI.showToast('⚠️ أكمل الكمية والسعر بشكل صحيح', 'warning');
            return;
        }

        const p = state.products.find(x => x.id == id);
        if (!p) return;

        let cartonNote = '';
        if (unit === 'كرتون') {
            const unitsStr = prompt('📦 كم عدد الوحدات داخل الكرتونة الواحدة؟', '12');
            if (unitsStr === null) return;
            const unitsPerCarton = parseInt(unitsStr);
            if (isNaN(unitsPerCarton) || unitsPerCarton <= 0) {
                UI.showToast('⚠️ عدد وحدات غير صحيح', 'warning');
                return;
            }
            cartonNote = ` (${q} كرتون × ${unitsPerCarton} وحدة)`;
            q = q * unitsPerCarton;
        }

        if (q > (p.stock || 0)) {
            UI.showToast(`⚠️ الكمية المطلوبة (${q}) أكبر من المخزون المتوفر (${p.stock || 0})`, 'warning');
            return;
        }

        this.temp.push({
            id: p.id,
            name: p.name + cartonNote,
            unit, qty: q, price, cost: p.cost || 0
        });

        this.renderList();

        document.getElementById('ws-q').value = '';
        document.getElementById('ws-price').value = '';
        productSelect.value = '';
    },

    removeItem(index) {
        this.temp.splice(index, 1);
        this.renderList();
    },

    renderList() {
        const body = document.getElementById('ws-list-ui');
        if (this.temp.length === 0) {
            body.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);padding:15px;">لم تُضف أصناف بعد</td></tr>`;
        } else {
            body.innerHTML = this.temp.map((i, idx) => `
                <tr>
                    <td>${i.name}</td>
                    <td>${i.unit}</td>
                    <td>${i.qty}</td>
                    <td>${i.price.toFixed(2)}</td>
                    <td>${(i.qty * i.price).toFixed(2)}</td>
                    <td><button onclick="Wholesale.removeItem(${idx})" class="btn-danger" style="padding:2px 8px;font-size:0.75rem;">✕</button></td>
                </tr>
            `).join('');
        }
        const subTotal = this.temp.reduce((a, b) => a + (b.qty * b.price), 0);
        const discountInput = document.getElementById('ws-discount');
        const discount = discountInput ? parseFloat(discountInput.value) || 0 : 0;
        const total = Math.max(0, subTotal - discount);
        const totalEl = document.getElementById('ws-total');
        if (totalEl) totalEl.textContent = `${total.toFixed(2)} ₪`;
    },

    save() {
        if (this.temp.length === 0) {
            UI.showToast('⚠️ الفاتورة فارغة!', 'warning');
            return;
        }

        const methodId = document.getElementById('ws-payment-method').value;
        const method = DB.getPaymentMethod(methodId);
        if (!method) {
            UI.showToast('⚠️ طريقة الدفع غير موجودة', 'warning');
            return;
        }

        const customerId = document.getElementById('ws-customer').value || null;

        if (method.requirePerson && !customerId) {
            UI.showToast('⚠️ يجب اختيار عميل لهذه الطريقة من الدفع', 'warning');
            return;
        }

        const unavailable = this.temp.filter(item => {
            const product = state.products.find(p => p.id === item.id);
            return !product || (product.stock || 0) < (item.qty || 0);
        });
        if (unavailable.length > 0) {
            UI.showToast(`⚠️ بعض الأصناف غير متوفرة: ${unavailable.map(i => i.name).join(', ')}`, 'warning');
            return;
        }

        // خصم المخزون
        this.temp.forEach(item => {
            const p = state.products.find(x => x.id === item.id);
            if (p) p.stock = (p.stock || 0) - (item.qty || 0);
        });
        updateState();

        const subTotal = this.temp.reduce((a, b) => a + (b.qty * b.price), 0);
        const discountInput = document.getElementById('ws-discount');
        const discount = discountInput ? parseFloat(discountInput.value) || 0 : 0;
        const total = Math.max(0, subTotal - discount);
        const taxRate = state.settings.taxRate || 0.15;
        const taxAmount = total * taxRate;
        const finalTotal = total + taxAmount;

        let personId = null;
        let personName = document.getElementById('ws-customer-name').value.trim() || 'عميل جملة';
        let oldBalance = 0;
        let newBalance = 0;

        if (customerId) {
            const customer = DB.getPerson(customerId);
            if (customer) {
                personId = customer.id;
                personName = customer.name;
                oldBalance = customer.balance || 0;
                newBalance = oldBalance + finalTotal;
                DB.updatePersonBalance(customerId, finalTotal);
                state = DB.load();
            }
        }

        const grossProfit = this.temp.reduce((sum, item) => sum + ((item.price - (item.cost || 0)) * item.qty), 0);
        const discountRatio = subTotal > 0 ? discount / subTotal : 0;
        const profit = grossProfit * (1 - discountRatio);

        const invoice = {
            invoiceNumber: state.settings.nextInvoiceNumber || 1001,
            customerName: personName,
            customerPhone: document.getElementById('ws-customer-phone').value.trim(),
            customerAddress: document.getElementById('ws-customer-address').value.trim(),
            commercialRegister: document.getElementById('ws-customer-cr')?.value.trim() || '',
            items: JSON.parse(JSON.stringify(this.temp)).map(i => ({ ...i, name: i.name })),
            subtotal: subTotal,
            discount: discount,
            tax: taxAmount,
            total: finalTotal,
            profit: profit,
            paymentMethod: method.id,
            paymentMethodName: method.name,
            paymentStatus: method.status,
            personId: personId,
            personName: personName,
            oldBalance: oldBalance,
            newBalance: newBalance,
            status: method.status === 'paid' ? 'paid' : (method.status === 'pending' ? 'pending' : 'unpaid'),
            paidAmount: method.status === 'paid' ? finalTotal : 0,
            createdBy: Auth.currentUser ? Auth.currentUser.name : 'النظام',
            cashierName: Auth.currentUser ? Auth.currentUser.name : 'النظام'
        };

        DB.addInvoice(invoice);
        App.auditLog(`📦 فاتورة جملة (خارج الكاشير) #${invoice.invoiceNumber} - ${personName} - ${invoice.total.toFixed(2)} ₪`);

        this.temp = [];

        // نستخدم نفس نافذة الفاتورة النهائية المستخدمة في الكاشير (طباعة/عودة)
        if (typeof POS !== 'undefined' && POS.showFinalInvoiceModal) {
            POS.showFinalInvoiceModal(invoice, true, 'wholesale');
        } else {
            UI.showToast(`✅ تم إصدار فاتورة الجملة #${invoice.invoiceNumber}`, 'success');
            App.switchPage('wholesale');
        }
    }
};

console.log('📁 تم تحميل Wholesale.js - فاتورة بيع جملة مستقلة');
