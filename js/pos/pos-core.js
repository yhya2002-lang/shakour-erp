// pos-core.js - الدوال الأساسية لنظام نقاط البيع

const POS = {
    cart: [],
    scanner: null,
    flashOn: false,
    isWholesale: false,
    selectedPerson: null,
    selectedPersonId: null,
    showPaymentModal: false,
    selectedPaymentMethod: null,

    // ===== عرض واجهة الكاشير =====
    render() {
        const suspendedCount = state.suspendedSales ? state.suspendedSales.length : 0;
        
        return `
            <div class="pos-grid">
                <div class="card">
                    <div style="display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap;">
                        <input type="text" id="pos-search" placeholder="🔍 بحث عن منتج..." class="form-control" style="flex: 1;" oninput="POS.init()">
                        <button class="btn-primary" onclick="POS.scanBarcode()" style="padding: 8px 15px; width: auto;" title="مسح الباركود">
                            <i class="fas fa-camera"></i>
                        </button>
                        <button class="btn-primary" onclick="POS.toggleFlash()" id="flash-toggle-btn" style="padding: 8px 15px; width: auto; background: ${POS.flashOn ? 'var(--warning)' : 'var(--accent)'};" title="تشغيل/إيقاف الفلاش">
                            <i class="fas fa-bolt"></i>
                        </button>
                    </div>
                    <div style="display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap;">
                        <button class="${this.isWholesale ? 'btn-success' : 'btn-primary'}" onclick="POS.toggleMode()" style="padding: 6px 12px; font-size: 0.8rem; border: none; border-radius: 6px; cursor: pointer;">
                            ${this.isWholesale ? '🛒 بيع عادي' : '📦 جملة'}
                        </button>
                        ${this.isWholesale ? `
                            <span style="font-size: 0.7rem; color: var(--success); background: rgba(16,185,129,0.1); padding: 4px 10px; border-radius: 20px;">
                                سعر الجملة مفعل
                            </span>
                        ` : ''}
                    </div>
                    <div class="products-grid" id="pos-items" style="margin-top:10px;"></div>
                </div>
                <div class="card" style="display:flex;flex-direction:column;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <h4 style="margin:0;">🛒 السلة</h4>
                        <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                            <button class="btn-primary" onclick="POS.suspend()" style="padding: 4px 12px; font-size: 0.8rem; background: var(--warning); color: white; border: none; border-radius: 6px; cursor: pointer;">
                                ⏸️ تعليق
                            </button>
                            <button class="btn-primary" onclick="POS.showSuspended()" style="padding: 4px 12px; font-size: 0.8rem; background: var(--accent); color: white; border: none; border-radius: 6px; cursor: pointer;">
                                📋 المعلقة (${suspendedCount})
                            </button>
                            <button class="btn-danger" onclick="POS.clearCart()" style="padding: 4px 12px; font-size: 0.8rem; background: var(--danger); color: white; border: none; border-radius: 6px; cursor: pointer;">
                                🗑️
                            </button>
                        </div>
                    </div>
                    <div id="cart-list" style="flex:1;margin:10px 0;max-height:200px;overflow-y:auto;"></div>
                    <hr>
                    ${this.isWholesale ? `
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
                            <input type="text" id="wholesale-customer" placeholder="👤 اسم العميل" class="form-control" style="margin:0;" value="${this.selectedPerson ? this.selectedPerson.name : ''}">
                            <input type="text" id="wholesale-phone" placeholder="📱 رقم الهاتف" class="form-control" style="margin:0;" value="${this.selectedPerson ? this.selectedPerson.phone : ''}">
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
                            <input type="text" id="wholesale-address" placeholder="📍 العنوان" class="form-control" style="margin:0;" value="${this.selectedPerson ? this.selectedPerson.address : ''}">
                            <input type="text" id="wholesale-cr" placeholder="🏢 السجل التجاري" class="form-control" style="margin:0;">
                        </div>
                        ${this.selectedPerson ? `
                            <div style="background:rgba(59,130,246,0.1);padding:6px 10px;border-radius:6px;font-size:0.8rem;border:1px solid var(--accent);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
                                <span>👤 ${this.selectedPerson.name} (${this.selectedPerson.type}) - الرصيد: ${(this.selectedPerson.balance || 0).toFixed(2)} ₪</span>
                                <button onclick="POS.clearSelectedPerson()" style="background:none;border:none;cursor:pointer;color:var(--danger);font-size:1rem;">✕</button>
                            </div>
                        ` : ''}
                        <button onclick="POS.showPersonSelector()" class="btn-primary" style="width:100%;padding:6px;font-size:0.8rem;margin-bottom:8px;border:none;border-radius:6px;cursor:pointer;background:var(--accent);color:white;">
                            ${this.selectedPerson ? '🔄 تغيير العميل' : '👤 اختيار عميل (آجل)'}
                        </button>
                    ` : ''}
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                        <span style="font-size:0.85rem;">خصم (₪)</span>
                        <input type="number" id="pos-discount" value="0" min="0" style="width:80px;padding:5px;border:1px solid var(--border);border-radius:6px;text-align:center;background:var(--bg);color:var(--text);" oninput="POS.updateUI()">
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:1.3rem;font-weight:bold;margin-top:5px;">
                        <span>الإجمالي</span>
                        <span id="pos-total">0.00</span> ₪
                    </div>
                    <button class="btn-success" onclick="POS.showPaymentModal()" style="margin-top:10px;padding:12px;font-size:1rem;background:var(--success);color:white;border:none;border-radius:8px;cursor:pointer;">
                        💳 دفع وطباعة
                    </button>
                </div>
            </div>
        `;
    },

    // ===== تبديل وضع البيع =====
    toggleMode() {
        this.isWholesale = !this.isWholesale;
        if (this.isWholesale) {
            UI.showToast('📦 تم تفعيل وضع الجملة', 'info');
        } else {
            UI.showToast('🛒 تم تفعيل البيع العادي', 'info');
            this.selectedPerson = null;
            this.selectedPersonId = null;
        }
        this.init();
    },

    // ===== تهيئة الكاشير =====
    init() {
        console.log('🔄 POS.init() تم استدعاؤها');
        
        if (this.selectedPerson && this.selectedPerson.id) {
            const refreshed = DB.getPerson(this.selectedPerson.id);
            if (refreshed) {
                this.selectedPerson = refreshed;
            }
        }
        
        const searchInput = document.getElementById('pos-search');
        const grid = document.getElementById('pos-items');
        
        if (!grid) {
            console.error('❌ عنصر pos-items غير موجود');
            return;
        }
        
        if (!state.products || state.products.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 30px; color: var(--text-secondary);">
                    <i class="fas fa-box-open" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i>
                    لا توجد منتجات
                    <br>
                    <small>أضف منتجات من قسم المخزون</small>
                </div>
            `;
            this.updateUI();
            this.updateSuspendedCount();
            return;
        }
        
        const q = searchInput ? searchInput.value.toLowerCase() : '';
        
        const filtered = state.products.filter(p => 
            p.name && p.name.includes(q) || 
            (p.barcode && p.barcode.includes(q))
        );
        
        if (filtered.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 30px; color: var(--text-secondary);">
                    <i class="fas fa-search" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i>
                    لا توجد نتائج
                    <br>
                    <small>ابحث باسم المنتج أو الباركود</small>
                </div>
            `;
        } else {
            grid.innerHTML = filtered.map(p => {
                const price = this.isWholesale && p.wholesalePrice ? p.wholesalePrice : p.price;
                const minQty = this.isWholesale && p.wholesaleMin ? p.wholesaleMin : 1;
                return `
                    <div class="p-card" style="background: var(--bg); border: 1px solid var(--border); padding: 10px; border-radius: 10px; text-align: center; transition: all 0.3s ease;">
                        <div onclick="POS.add(${p.id})" style="cursor:pointer;">
                            <strong style="display: block; font-size: 0.85rem; margin-bottom: 4px;">${p.name || 'بدون اسم'}</strong>
                            <div style="font-weight: 700; color: var(--accent);">${price || 0} ₪</div>
                            ${this.isWholesale ? `<small style="font-size: 0.6rem; color: var(--warning);">الحد الأدنى: ${minQty}</small>` : ''}
                            <small style="color: ${(p.stock || 0) < (p.minStock || 5) ? 'var(--danger)' : 'var(--text-secondary)'}; font-size: 0.7rem; display: block; margin-top: 4px;">
                                المخزون: ${p.stock || 0}
                                ${p.barcode ? `<br>📷 ${p.barcode}` : ''}
                            </small>
                        </div>
                        <button onclick="event.stopPropagation(); POS.addByCarton(${p.id})" style="margin-top:6px;width:100%;padding:4px;font-size:0.65rem;border:1px dashed var(--accent);background:transparent;color:var(--accent);border-radius:6px;cursor:pointer;">
                            <i class="fas fa-box"></i> إضافة بالكرتونة
                        </button>
                    </div>
                `;
            }).join('');
        }
        
        this.updateUI();
        this.updateSuspendedCount();
    },

    // ===== إضافة منتج =====
    add(id) {
        console.log('🛒 POS.add() تم استدعاؤها للمنتج:', id);
        
        if (!state.settings || !state.settings.shiftOpen) {
            alert('⚠️ افتح الوردية أولاً!');
            return;
        }
        
        const p = state.products.find(x => x.id === id);
        if (!p) {
            alert('❌ المنتج غير موجود');
            return;
        }
        
        if (p.stock <= 0) {
            alert('⚠️ نفد المخزون!');
            return;
        }
        
        if (this.isWholesale && p.wholesaleMin) {
            const item = this.cart.find(x => x.id === id);
            const currentQty = item ? item.qty : 0;
            if (currentQty === 0 && p.wholesaleMin > 1) {
                const confirmAdd = confirm(`⚠️ هذا المنتج للجملة فقط (الحد الأدنى ${p.wholesaleMin}). هل تريد إضافته؟`);
                if (!confirmAdd) return;
            }
        }
        
        const item = this.cart.find(x => x.id === id);
        if (item) {
            if (item.qty >= p.stock) {
                alert('⚠️ لا يوجد مخزون كافٍ');
                return;
            }
            item.qty++;
        } else {
            const price = this.isWholesale && p.wholesalePrice ? p.wholesalePrice : p.price;
            this.cart.push({ ...p, price: price, qty: 1 });
        }
        
        this.updateUI();
        console.log('✅ تم إضافة المنتج، السلة:', this.cart.length);
    },

    // ===== إضافة بالكرتونة (يُدخل عدد الوحدات داخل الكرتونة يدوياً في كل مرة) =====
    addByCarton(id) {
        console.log('📦 POS.addByCarton() تم استدعاؤها للمنتج:', id);

        if (!state.settings || !state.settings.shiftOpen) {
            alert('⚠️ افتح الوردية أولاً!');
            return;
        }

        const p = state.products.find(x => x.id === id);
        if (!p) {
            alert('❌ المنتج غير موجود');
            return;
        }

        const unitsStr = prompt(`📦 كم عدد الوحدات داخل الكرتونة لصنف "${p.name}"؟`, '12');
        if (unitsStr === null) return;

        const unitsPerCarton = parseInt(unitsStr);
        if (isNaN(unitsPerCarton) || unitsPerCarton <= 0) {
            UI.showToast('⚠️ عدد وحدات غير صحيح', 'warning');
            return;
        }

        const cartonsStr = prompt(`📦 كم عدد الكراتين؟`, '1');
        if (cartonsStr === null) return;

        const cartons = parseInt(cartonsStr);
        if (isNaN(cartons) || cartons <= 0) {
            UI.showToast('⚠️ عدد كراتين غير صحيح', 'warning');
            return;
        }

        const totalQty = unitsPerCarton * cartons;

        if (totalQty > (p.stock || 0)) {
            alert(`⚠️ لا يوجد مخزون كافٍ (المطلوب: ${totalQty}, المتوفر: ${p.stock || 0})`);
            return;
        }

        const item = this.cart.find(x => x.id === id);
        const price = this.isWholesale && p.wholesalePrice ? p.wholesalePrice : p.price;

        if (item) {
            if ((item.qty + totalQty) > p.stock) {
                alert('⚠️ لا يوجد مخزون كافٍ');
                return;
            }
            item.qty += totalQty;
        } else {
            this.cart.push({ ...p, price: price, qty: totalQty });
        }

        this.updateUI();
        UI.showToast(`✅ تم إضافة ${cartons} كرتونة (${totalQty} وحدة) من "${p.name}"`, 'success');
    },

    // ===== إضافة عن طريق الباركود =====
    addByBarcode(barcode) {
        console.log('📷 POS.addByBarcode() تم استدعاؤها للباركود:', barcode);
        
        if (!barcode) {
            alert('⚠️ الباركود فارغ');
            return;
        }
        
        const p = state.products.find(x => x.barcode === barcode);
        if (!p) {
            alert(`⚠️ لا يوجد منتج بالباركود: ${barcode}`);
            return;
        }
        this.add(p.id);
    },

    // ===== تحديث واجهة المستخدم =====
    updateUI() {
        console.log('🔄 POS.updateUI() تم استدعاؤها، عدد العناصر في السلة:', this.cart.length);
        
        const list = document.getElementById('cart-list');
        if (!list) {
            console.error('❌ عنصر cart-list غير موجود');
            return;
        }
        
        if (this.cart.length === 0) {
            list.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    <i class="fas fa-shopping-cart" style="font-size: 1.5rem; display: block; margin-bottom: 10px;"></i>
                    السلة فارغة
                </div>
            `;
        } else {
            list.innerHTML = this.cart.map((i, idx) => {
                const canEditPrice = Auth.hasPermission('edit_cart_price');
                const priceLine = canEditPrice
                    ? `<small onclick="POS.editItemPrice(${idx})" style="cursor:pointer;color:var(--accent);text-decoration:underline dotted;font-size:0.75rem;" title="تعديل سعر هذا الصنف لهذه الفاتورة فقط">
                            <i class="fas fa-pen"></i> ${(i.price || 0).toFixed(2)} ₪ / وحدة
                        </small>`
                    : `<small style="font-size:0.75rem;color:var(--text-secondary);">${(i.price || 0).toFixed(2)} ₪ / وحدة</small>`;
                return `
                <div class="cart-row" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 0.9rem;">
                    <span style="flex:1; font-size:0.9rem;">
                        ${i.name || 'بدون اسم'}
                        <br>
                        ${priceLine}
                    </span>
                    <div style="display:flex;gap:5px;align-items:center;">
                        <button onclick="POS.changeQty(${idx}, -1)" class="qty-btn" style="width:28px;height:28px;border:1px solid var(--border);border-radius:6px;background:var(--bg);cursor:pointer;font-size:0.9rem;">-</button>
                        <span style="min-width:20px;text-align:center;font-weight:bold;">${i.qty || 0}</span>
                        <button onclick="POS.changeQty(${idx}, 1)" class="qty-btn" style="width:28px;height:28px;border:1px solid var(--border);border-radius:6px;background:var(--bg);cursor:pointer;font-size:0.9rem;">+</button>
                    </div>
                    <span style="min-width:60px;text-align:left;font-weight:bold;">${((i.price || 0) * (i.qty || 0)).toFixed(2)}</span>
                </div>
            `;
            }).join('');
        }
        
        const subTotal = this.cart.reduce((a, b) => a + ((b.price || 0) * (b.qty || 0)), 0);
        const discountInput = document.getElementById('pos-discount');
        const discount = discountInput ? parseFloat(discountInput.value) || 0 : 0;
        const total = Math.max(0, subTotal - discount);
        
        const totalEl = document.getElementById('pos-total');
        if (totalEl) {
            totalEl.innerText = total.toFixed(2);
        }
    },

    // ===== تعديل سعر صنف داخل السلة (لهذه الفاتورة فقط، لا يغيّر سعر الصنف الأصلي) =====
    editItemPrice(idx) {
        console.log('✏️ POS.editItemPrice() تم استدعاؤها، idx:', idx);

        if (!Auth.hasPermission('edit_cart_price')) {
            UI.showToast('⚠️ لا تملك صلاحية تعديل سعر الأصناف', 'warning');
            return;
        }

        const item = this.cart[idx];
        if (!item) return;

        const newPriceStr = prompt(`✏️ تعديل سعر "${item.name}" لهذه الفاتورة فقط (لن يتغير سعر الصنف في المخزون):`, item.price);
        if (newPriceStr === null) return;

        const newPrice = parseFloat(newPriceStr);
        if (isNaN(newPrice) || newPrice < 0) {
            UI.showToast('⚠️ سعر غير صحيح', 'warning');
            return;
        }

        item.price = newPrice;
        this.updateUI();
        UI.showToast(`✅ تم تعديل سعر "${item.name}" لهذه الفاتورة`, 'success');
    },

    // ===== تغيير الكمية =====
    changeQty(idx, val) {
        console.log('🔄 POS.changeQty() تم استدعاؤها، idx:', idx, 'val:', val);
        
        if (!this.cart[idx]) return;
        
        this.cart[idx].qty = (this.cart[idx].qty || 0) + val;
        if (this.cart[idx].qty <= 0) {
            this.cart.splice(idx, 1);
        }
        this.updateUI();
    },

    // ===== تفريغ السلة =====
    clearCart() {
        console.log('🗑️ POS.clearCart() تم استدعاؤها');
        
        if (this.cart.length === 0) {
            alert('السلة فارغة بالفعل');
            return;
        }
        if (confirm('هل أنت متأكد من تفريغ السلة؟')) {
            this.cart = [];
            this.updateUI();
            alert('✅ تم تفريغ السلة');
        }
    },

    // ===== إلغاء اختيار العميل =====
    clearSelectedPerson() {
        this.selectedPerson = null;
        this.selectedPersonId = null;
        const customerInput = document.getElementById('wholesale-customer');
        if (customerInput) customerInput.value = '';
        const phoneInput = document.getElementById('wholesale-phone');
        if (phoneInput) phoneInput.value = '';
        const addressInput = document.getElementById('wholesale-address');
        if (addressInput) addressInput.value = '';
        this.init();
        UI.showToast('✅ تم إلغاء اختيار العميل', 'info');
    },

    // ===== تحديث عدد الفواتير المعلقة =====
    updateSuspendedCount() {
        const count = state.suspendedSales ? state.suspendedSales.length : 0;
        const suspendBtn = document.querySelector('.pos-grid .btn-primary[onclick*="showSuspended"]');
        if (suspendBtn) {
            suspendBtn.innerHTML = `📋 المعلقة (${count})`;
        }
    },

    // ===== الفواتير المعلقة =====
    suspend() {
        console.log('⏸️ POS.suspend() تم استدعاؤها');
        
        if (this.cart.length === 0) {
            alert('⚠️ السلة فارغة، لا توجد فاتورة لتعليقها');
            return;
        }

        if (!state.settings || !state.settings.shiftOpen) {
            alert('⚠️ افتح الوردية أولاً!');
            return;
        }

        const note = prompt('📝 ملاحظة على الفاتورة (اختياري):', '') || '';
        
        const suspended = {
            id: Date.now(),
            items: JSON.parse(JSON.stringify(this.cart)),
            total: this.cart.reduce((a, b) => a + ((b.price || 0) * (b.qty || 0)), 0),
            date: new Date().toISOString(),
            note: note,
            isWholesale: this.isWholesale
        };

        if (!state.suspendedSales) state.suspendedSales = [];
        state.suspendedSales.push(suspended);
        updateState();

        this.cart = [];
        this.updateUI();
        this.init();

        alert(`✅ تم تعليق الفاتورة #${suspended.id}`);
        this.updateSuspendedCount();
    },

    // ===== عرض الفواتير المعلقة =====
    showSuspended() {
        console.log('📋 POS.showSuspended() تم استدعاؤها');
        
        if (!state.suspendedSales || state.suspendedSales.length === 0) {
            alert('📋 لا توجد فواتير معلقة');
            return;
        }

        const html = `
            <div style="max-height: 400px; overflow-y: auto;">
                ${state.suspendedSales.map((s, index) => `
                    <div style="background: var(--bg); padding: 12px 15px; margin-bottom: 10px; border-radius: 10px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                        <div style="flex:1; min-width: 120px;">
                            <div style="font-weight: bold; font-size: 0.95rem;">🧾 فاتورة #${s.id} ${s.isWholesale ? '📦' : ''}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">${new Date(s.date).toLocaleString('ar-SA')}</div>
                            <div style="font-size: 0.8rem; margin-top: 4px;">${s.items.length} أصناف ${s.note ? `📝 ${s.note}` : ''}</div>
                        </div>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                            <span style="font-weight: bold; color: var(--accent); font-size: 1.1rem;">${(s.total || 0).toFixed(2)} ₪</span>
                            <button onclick="POS.resume(${index})" class="btn-success" style="padding: 6px 14px; font-size: 0.8rem; background: var(--success); color: white; border: none; border-radius: 6px; cursor: pointer;">↩️ استرجاع</button>
                            <button onclick="POS.deleteSuspended(${index})" class="btn-danger" style="padding: 6px 10px; font-size: 0.8rem; background: var(--danger); color: white; border: none; border-radius: 6px; cursor: pointer;">✕</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <hr>
            <div style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
                <button onclick="POS.clearAllSuspended()" class="btn-danger" style="flex: 1; padding: 10px; min-width: 100px; background: var(--danger); color: white; border: none; border-radius: 6px; cursor: pointer;">🗑️ حذف الكل</button>
                <button onclick="UI.closeModal()" class="btn-primary" style="flex: 1; padding: 10px; min-width: 100px; background: var(--text-secondary); color: white; border: none; border-radius: 6px; cursor: pointer;">✕ إغلاق</button>
            </div>
        `;

        UI.showModal('📋 الفواتير المعلقة', html);
    },

    // ===== استرجاع فاتورة معلقة =====
    resume(index) {
        console.log('↩️ POS.resume() تم استدعاؤها، index:', index);
        
        if (!state.suspendedSales || !state.suspendedSales[index]) {
            alert('❌ الفاتورة غير موجودة');
            return;
        }

        const suspended = state.suspendedSales[index];

        const unavailable = suspended.items.filter(item => {
            const product = state.products.find(p => p.id === item.id);
            return !product || (product.stock || 0) < (item.qty || 0);
        });

        if (unavailable.length > 0) {
            alert(`⚠️ بعض الأصناف غير متوفرة: ${unavailable.map(i => i.name).join(', ')}`);
            return;
        }

        this.cart = JSON.parse(JSON.stringify(suspended.items));
        this.isWholesale = suspended.isWholesale || false;
        state.suspendedSales.splice(index, 1);
        updateState();

        this.updateUI();
        this.init();
        UI.closeModal();
        alert(`✅ تم استرجاع الفاتورة (${this.cart.length} أصناف)`);
        this.updateSuspendedCount();
    },

    // ===== حذف فاتورة معلقة =====
    deleteSuspended(index) {
        console.log('🗑️ POS.deleteSuspended() تم استدعاؤها، index:', index);
        
        if (!confirm('هل أنت متأكد من حذف هذه الفاتورة المعلقة؟')) return;
        
        const suspended = state.suspendedSales[index];
        state.suspendedSales.splice(index, 1);
        updateState();
        alert('✅ تم حذف الفاتورة المعلقة');
        this.updateSuspendedCount();
        this.showSuspended();
    },

    // ===== حذف جميع الفواتير المعلقة =====
    clearAllSuspended() {
        console.log('🗑️ POS.clearAllSuspended() تم استدعاؤها');
        
        if (!state.suspendedSales || state.suspendedSales.length === 0) {
            alert('📋 لا توجد فواتير معلقة');
            return;
        }

        if (!confirm(`⚠️ هل أنت متأكد من حذف جميع الفواتير المعلقة (${state.suspendedSales.length})؟`)) return;
        
        state.suspendedSales = [];
        updateState();
        alert('✅ تم حذف جميع الفواتير المعلقة');
        this.updateSuspendedCount();
        UI.closeModal();
    },

    // ===== فتح الكاميرا لمسح باركود وإضافته مباشرة للسلة =====
    scanBarcode() {
        console.log('📷 POS.scanBarcode() تم استدعاؤها');
        App.startScanner(null, (decodedText) => {
            this.addByBarcode(decodedText);
        });
    },

    // ===== تشغيل/إيقاف فلاش الكاميرا =====
    toggleFlash() {
        this.flashOn = !this.flashOn;
        console.log('🔦 POS.toggleFlash() - الحالة الجديدة:', this.flashOn);

        // إذا كانت الكاميرا مفتوحة حالياً، طبّق التغيير فوراً على البث الحالي
        const videoElement = document.querySelector('#reader video');
        if (videoElement && videoElement.srcObject) {
            try {
                const track = videoElement.srcObject.getVideoTracks()[0];
                if (track && track.getCapabilities && track.getCapabilities().torch) {
                    track.applyConstraints({ advanced: [{ torch: this.flashOn }] })
                        .catch(err => console.error('❌ خطأ في تشغيل الفلاش:', err));
                } else {
                    UI.showToast('⚠️ هذا الجهاز/المتصفح لا يدعم الفلاش', 'warning');
                }
            } catch (e) {
                console.error('❌ خطأ في الوصول لمسار الفيديو:', e);
            }
        }

        // تحديث شكل الأزرار
        const mainBtn = document.getElementById('flash-toggle-btn');
        if (mainBtn) mainBtn.style.background = this.flashOn ? 'var(--warning)' : 'var(--accent)';
        const overlayBtn = document.getElementById('flash-btn');
        if (overlayBtn) overlayBtn.style.background = this.flashOn ? 'var(--warning)' : '';
    },

    // ===== إغلاق الكاميرا (اسم بديل يستخدمه بعض عناصر الواجهة) =====
    stopScanner() {
        App.stopScanner();
    }
};

console.log('📁 تم تحميل POS Core');