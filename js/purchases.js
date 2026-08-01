// purchases.js - فاتورة شراء حقيقية: مورد + أصناف (وحدة/كمية/سعر شراء/سعر بيع) + دفع نقدي/آجل

const Purchases = {
    temp: [],
    selectedSupplierId: null,

    renderPage(container) {
        this.temp = [];
        const suppliers = DB.getPersonsByType('supplier');

        container.innerHTML = `
            <div class="card">
                <h3>🚚 فاتورة شراء جديدة</h3>

                <label style="display:block;margin-top:10px;font-weight:500;">المورد</label>
                <div style="display:flex;gap:8px;">
                    <select id="buy-supplier" class="form-control" onchange="Purchases.onSupplierChange()">
                        <option value="">-- اختر المورد --</option>
                        ${suppliers.map(s => `<option value="${s.id}">${s.name} ${s.balance > 0 ? `(مستحق عليه: ${s.balance.toFixed(2)} ₪)` : ''}</option>`).join('')}
                    </select>
                    <button type="button" onclick="Purchases.addNewSupplier()" class="btn-primary" style="width:auto;padding:8px 12px;" title="إضافة مورد جديد">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>

                <hr style="margin:15px 0;">

                <label style="display:block;font-weight:500;">الصنف</label>
                <select id="buy-p" class="form-control" onchange="Purchases.onProductChange()">
                    <option value="">➕ صنف جديد (غير موجود بالمخزون)</option>
                    ${state.products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                </select>

                <div id="buy-new-name-wrap" style="display:block;margin-top:8px;">
                    <label style="display:block;font-weight:500;">اسم الصنف الجديد</label>
                    <input type="text" id="buy-new-name" class="form-control" placeholder="اسم الصنف الجديد">
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
                    <div>
                        <label style="display:block;font-weight:500;font-size:0.85rem;">الوحدة</label>
                        <div style="display:flex;gap:6px;">
                            ${UI.unitSelectHTML('buy-unit', 'قطعة')}
                            <button type="button" onclick="UI.addNewUnit('buy-unit')" class="btn-primary" style="width:auto;padding:8px 10px;" title="إضافة وحدة">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label style="display:block;font-weight:500;font-size:0.85rem;">الكمية (أو عدد الكراتين إذا اخترت وحدة "كرتون")</label>
                        <input type="number" id="buy-q" placeholder="الكمية" class="form-control">
                    </div>
                    <div>
                        <label style="display:block;font-weight:500;font-size:0.85rem;">سعر الشراء (للوحدة)</label>
                        <input type="number" id="buy-c" placeholder="سعر التكلفة" class="form-control">
                    </div>
                    <div>
                        <label style="display:block;font-weight:500;font-size:0.85rem;">سعر البيع (للوحدة)</label>
                        <input type="number" id="buy-price" placeholder="سعر البيع" class="form-control">
                    </div>
                </div>

                <button class="btn-primary" onclick="Purchases.add()" style="margin-top:10px;width:100%;padding:10px;">
                    ➕ إضافة للفاتورة
                </button>

                <div class="table-responsive" style="margin-top:15px;">
                    <table>
                        <thead>
                            <tr>
                                <th>الصنف</th>
                                <th>الوحدة</th>
                                <th>الكمية</th>
                                <th>سعر الشراء</th>
                                <th>سعر البيع</th>
                                <th>الإجمالي</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="buy-list-ui">
                            <tr><td colspan="7" style="text-align:center;color:var(--text-secondary);padding:15px;">لم تُضف أصناف بعد</td></tr>
                        </tbody>
                    </table>
                </div>

                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:1.1rem;font-weight:bold;">
                    <span>الإجمالي:</span>
                    <span id="buy-total">0.00 ₪</span>
                </div>

                <label style="display:block;margin-top:15px;font-weight:500;">طريقة الدفع</label>
                <select id="buy-payment-method" class="form-control">
                    <option value="cash">💵 نقدي</option>
                    <option value="credit">📝 آجل (يُقيَّد على حساب المورد)</option>
                </select>

                <button class="btn-success" onclick="Purchases.save()" style="width:100%;margin-top:15px;padding:12px;">
                    💾 حفظ الفاتورة
                </button>
            </div>
        `;
    },

    onSupplierChange() {
        this.selectedSupplierId = document.getElementById('buy-supplier').value || null;
    },

    addNewSupplier() {
        const name = prompt('🏢 اسم المورد الجديد:');
        if (!name || !name.trim()) return;
        const phone = prompt('📞 رقم الهاتف (اختياري):') || '';
        const supplier = Auth.addPerson(name.trim(), 'supplier', phone.trim(), 0);
        if (!supplier) return;

        UI.showToast(`✅ تم إضافة المورد ${name.trim()}`, 'success');

        const suppliers = DB.getPersonsByType('supplier');
        const newPerson = suppliers.find(p => p.rawId === supplier.id) || null;

        const select = document.getElementById('buy-supplier');
        if (select) {
            select.innerHTML = `
                <option value="">-- اختر المورد --</option>
                ${suppliers.map(s => `<option value="${s.id}">${s.name} ${s.balance > 0 ? `(مستحق عليه: ${s.balance.toFixed(2)} ₪)` : ''}</option>`).join('')}
            `;
            if (newPerson) {
                select.value = newPerson.id;
                this.selectedSupplierId = newPerson.id;
            }
        }
    },

    onProductChange() {
        const id = document.getElementById('buy-p').value;
        const newNameWrap = document.getElementById('buy-new-name-wrap');

        if (!id) {
            // صنف جديد
            newNameWrap.style.display = 'block';
            document.getElementById('buy-c').value = '';
            document.getElementById('buy-price').value = '';
            const unitSelect = document.getElementById('buy-unit');
            if (unitSelect) unitSelect.value = 'قطعة';
            return;
        }

        newNameWrap.style.display = 'none';
        const p = state.products.find(x => x.id == id);
        if (p) {
            document.getElementById('buy-c').value = p.cost || '';
            document.getElementById('buy-price').value = p.price || '';
            const unitSelect = document.getElementById('buy-unit');
            if (unitSelect) unitSelect.value = p.unit || 'قطعة';
        }
    },

    add() {
        const productSelect = document.getElementById('buy-p');
        const id = productSelect.value;
        const unit = document.getElementById('buy-unit').value;
        let q = parseFloat(document.getElementById('buy-q').value);
        const c = parseFloat(document.getElementById('buy-c').value);
        const price = parseFloat(document.getElementById('buy-price').value);

        if (!q || q <= 0 || isNaN(c) || c < 0 || isNaN(price) || price < 0) {
            UI.showToast('⚠️ أكمل الكمية وسعر الشراء وسعر البيع بشكل صحيح', 'warning');
            return;
        }

        let cartonNote = '';
        // إذا كانت الوحدة المختارة "كرتون"، نسأل عن عدد الوحدات داخل كل كرتونة
        // ونحوّل الكمية المدخلة (عدد الكراتين) إلى إجمالي عدد الوحدات الفعلي في المخزون
        if (unit === 'كرتون') {
            const unitsStr = prompt(`📦 كم عدد الوحدات داخل الكرتونة الواحدة؟`, '12');
            if (unitsStr === null) return;
            const unitsPerCarton = parseInt(unitsStr);
            if (isNaN(unitsPerCarton) || unitsPerCarton <= 0) {
                UI.showToast('⚠️ عدد وحدات غير صحيح', 'warning');
                return;
            }
            cartonNote = ` (${q} كرتون × ${unitsPerCarton} وحدة)`;
            q = q * unitsPerCarton;
        }

        let name;
        let isNew = false;

        if (!id) {
            name = document.getElementById('buy-new-name').value.trim();
            if (!name) {
                UI.showToast('⚠️ أدخل اسم الصنف الجديد', 'warning');
                return;
            }
            isNew = true;
        } else {
            const p = state.products.find(x => x.id == id);
            if (!p) return;
            name = p.name;
        }

        this.temp.push({
            productId: isNew ? null : parseInt(id),
            name: name + cartonNote, unit, qty: q, cost: c, price, isNew
        });

        this.renderList();

        document.getElementById('buy-q').value = '';
        document.getElementById('buy-c').value = '';
        document.getElementById('buy-price').value = '';
        document.getElementById('buy-new-name').value = '';
        productSelect.value = '';
        document.getElementById('buy-new-name-wrap').style.display = 'none';
    },

    removeItem(index) {
        this.temp.splice(index, 1);
        this.renderList();
    },

    renderList() {
        const body = document.getElementById('buy-list-ui');
        if (this.temp.length === 0) {
            body.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-secondary);padding:15px;">لم تُضف أصناف بعد</td></tr>`;
        } else {
            body.innerHTML = this.temp.map((i, idx) => `
                <tr>
                    <td>${i.name}${i.isNew ? ' 🆕' : ''}</td>
                    <td>${i.unit}</td>
                    <td>${i.qty}</td>
                    <td>${i.cost.toFixed(2)}</td>
                    <td>${i.price.toFixed(2)}</td>
                    <td>${(i.qty * i.cost).toFixed(2)}</td>
                    <td><button onclick="Purchases.removeItem(${idx})" class="btn-danger" style="padding:2px 8px;font-size:0.75rem;">✕</button></td>
                </tr>
            `).join('');
        }
        const total = this.temp.reduce((a, b) => a + (b.qty * b.cost), 0);
        document.getElementById('buy-total').textContent = `${total.toFixed(2)} ₪`;
    },

    save() {
        if (this.temp.length === 0) {
            UI.showToast('⚠️ الفاتورة فارغة!', 'warning');
            return;
        }

        const supplierId = document.getElementById('buy-supplier').value || null;
        const paymentMethod = document.getElementById('buy-payment-method').value;

        if (paymentMethod === 'credit' && !supplierId) {
            UI.showToast('⚠️ يجب اختيار مورد للدفع الآجل', 'warning');
            return;
        }

        const supplier = supplierId ? DB.getPerson(supplierId) : null;
        const supplierName = supplier ? supplier.name : 'مورد نقدي';

        // 1) تحديث المخزون: صنف موجود يُحدَّث (كمية + تكلفة + سعر بيع)، وصنف جديد يُضاف
        this.temp.forEach(i => {
            if (i.isNew) {
                const newProduct = {
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    name: i.name,
                    barcode: '',
                    price: i.price,
                    cost: i.cost,
                    unit: i.unit,
                    stock: i.qty,
                    minStock: 5,
                    category: 'أخرى'
                };
                state.products.push(newProduct);
                i.productId = newProduct.id;
            } else {
                const p = state.products.find(x => x.id === i.productId);
                if (p) {
                    p.stock = (p.stock || 0) + i.qty;
                    p.cost = i.cost;
                    p.price = i.price;
                    p.unit = i.unit;
                }
            }
        });

        // نحفظ تحديث المخزون فوراً قبل أي عملية تعتمد على تحميل جديد من التخزين
        // (نفس السبب الذي أصلحناه في شاشة الكاشير: تفادي فقد التحديث بسبب
        // الكتابة المتأخرة فوق نسخة state القديمة)
        updateState();

        const total = this.temp.reduce((a, b) => a + (b.qty * b.cost), 0);

        let oldBalance = 0;
        let newBalance = 0;

        if (paymentMethod === 'credit' && supplierId) {
            oldBalance = supplier.balance || 0;
            newBalance = oldBalance + total;
            DB.updatePersonBalance(supplierId, total);
            state = DB.load();
        }

        state.purchases.push({
            id: Date.now(),
            items: this.temp.map(i => ({
                productId: i.productId, name: i.name, unit: i.unit,
                qty: i.qty, cost: i.cost, price: i.price
            })),
            total: total,
            supplierId: supplierId,
            supplierName: supplierName,
            paymentMethod: paymentMethod,
            oldBalance: oldBalance,
            newBalance: newBalance,
            date: new Date().toISOString(),
            createdBy: Auth.currentUser ? Auth.currentUser.name : 'النظام'
        });
        updateState();

        App.auditLog(`🚚 فاتورة شراء - ${supplierName} - ${total.toFixed(2)} ₪ (${paymentMethod === 'credit' ? 'آجل' : 'نقدي'})`);

        let message = `✅ تم حفظ فاتورة الشراء\nالإجمالي: ${total.toFixed(2)} ₪\nطريقة الدفع: ${paymentMethod === 'credit' ? 'آجل' : 'نقدي'}`;
        if (paymentMethod === 'credit') {
            message += `\n👤 المورد: ${supplierName}\n📊 الرصيد السابق: ${oldBalance.toFixed(2)} ₪\n📊 الرصيد الجديد: ${newBalance.toFixed(2)} ₪`;
        }
        alert(message);

        this.temp = [];
        App.switchPage('inventory');
    }
};
