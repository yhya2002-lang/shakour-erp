// inventory.js - إدارة المخزون مع تنبيهات

const Inventory = {
    render() {
        // التحقق من تنبيهات المخزون
        const lowStockItems = state.products.filter(p => p.stock < (p.minStock || 5));
        
        return `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <h3 style="margin:0;">📦 إدارة المخزون</h3>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn-success" onclick="Inventory.showAdd()" style="padding:8px 15px;">
                        <i class="fas fa-plus"></i> صنف جديد
                    </button>
                    <button class="btn-primary" onclick="Inventory.checkLowStock()" style="padding:8px 15px; background: var(--warning);">
                        <i class="fas fa-bell"></i> تنبيهات (${lowStockItems.length})
                    </button>
                </div>
            </div>
            
            ${lowStockItems.length > 0 ? `
                <div class="card" style="border-right: 5px solid var(--warning); background: rgba(245, 158, 11, 0.05);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-exclamation-triangle" style="color: var(--warning); font-size: 1.5rem;"></i>
                        <div>
                            <strong>⚠️ تنبيه: ${lowStockItems.length} أصناف تحتاج إلى إعادة طلب</strong>
                            <br>
                            <small style="color: var(--text-secondary);">
                                ${lowStockItems.map(p => `${p.name} (${p.stock})`).join('، ')}
                            </small>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <div class="card table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>الاسم</th>
                            <th>الباركود</th>
                            <th>الوحدة</th>
                            <th>السعر</th>
                            <th>المخزون</th>
                            <th>الحد الأدنى</th>
                            <th>حذف</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.products.map(p => `
                            <tr>
                                <td><strong>${p.name}</strong></td>
                                <td><code>${p.barcode || '---'}</code></td>
                                <td>${p.unit || 'قطعة'}</td>
                                <td>${p.price} ₪</td>
                                <td style="color: ${p.stock < (p.minStock || 5) ? 'var(--danger)' : 'var(--success)'}; font-weight: bold;">
                                    ${p.stock}
                                    ${p.stock < (p.minStock || 5) ? ' ⚠️' : ''}
                                </td>
                                <td>${p.minStock || 5}</td>
                                <td>
                                    <button onclick="Inventory.delete(${p.id})" class="btn-danger" style="padding:4px 10px;font-size:0.8rem;">
                                        ✕
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    showAdd() {
        const html = `
            <label>اسم الصنف</label>
            <input type="text" id="in-name" class="form-control" placeholder="أدخل اسم الصنف">
            
            <label>الباركود</label>
            <div style="display: flex; gap: 8px;">
                <input type="text" id="in-barcode" class="form-control" placeholder="أدخل الباركود">
                <button onclick="App.startScanner('in-barcode')" class="btn-primary" style="width: auto; padding: 8px 15px;">
                    <i class="fas fa-camera"></i>
                </button>
            </div>
            
            <label>سعر البيع</label>
            <input type="number" id="in-price" class="form-control" placeholder="سعر البيع">
            
            <label>سعر التكلفة</label>
            <input type="number" id="in-cost" class="form-control" placeholder="سعر التكلفة">
            
            <label>الوحدة</label>
            <div style="display: flex; gap: 8px;">
                ${UI.unitSelectHTML('in-unit', 'قطعة')}
                <button type="button" onclick="UI.addNewUnit('in-unit')" class="btn-primary" style="width: auto; padding: 8px 12px;" title="إضافة وحدة جديدة">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            
            <label>الكمية</label>
            <input type="number" id="in-stock" class="form-control" placeholder="الكمية المتوفرة">
            
            <label>الحد الأدنى للتنبيه</label>
            <input type="number" id="in-minstock" class="form-control" placeholder="الحد الأدنى للمخزون" value="5">
            
            <label>التصنيف</label>
            <input type="text" id="in-category" class="form-control" placeholder="التصنيف">
            
            <button class="btn-success" onclick="Inventory.save()" style="width:100%;margin-top:15px;padding:12px;">
                <i class="fas fa-save"></i> حفظ الصنف
            </button>
        `;
        UI.showModal('➕ إضافة صنف جديد', html);
    },

    save() {
        const name = document.getElementById('in-name').value.trim();
        const price = parseFloat(document.getElementById('in-price').value);
        
        if (!name || isNaN(price)) {
            UI.showToast('⚠️ يرجى إدخال الاسم والسعر', 'warning');
            return;
        }
        
        state.products.push({
            id: Date.now(),
            name: name,
            barcode: document.getElementById('in-barcode').value.trim() || '',
            price: price,
            cost: parseFloat(document.getElementById('in-cost').value) || 0,
            unit: document.getElementById('in-unit')?.value || 'قطعة',
            stock: parseInt(document.getElementById('in-stock').value) || 0,
            minStock: parseInt(document.getElementById('in-minstock').value) || 5,
            category: document.getElementById('in-category').value.trim() || 'أخرى'
        });
        
        updateState();
        UI.closeModal();
        App.auditLog(`➕ إضافة منتج: ${name}`);
        UI.showToast(`✅ تم إضافة ${name} بنجاح`, 'success');
        App.switchPage('inventory');
    },

    delete(id) {
        const product = state.products.find(p => p.id === id);
        if (!product) return;
        
        if (confirm(`هل أنت متأكد من حذف "${product.name}"؟`)) {
            state.products = state.products.filter(p => p.id !== id);
            updateState();
            App.auditLog(`🗑️ حذف منتج: ${product.name}`);
            UI.showToast(`✅ تم حذف ${product.name}`, 'success');
            App.switchPage('inventory');
        }
    },

    checkLowStock() {
        const lowItems = state.products.filter(p => p.stock < (p.minStock || 5));
        
        if (lowItems.length === 0) {
            UI.showToast('✅ جميع الأصناف مخزونها كافٍ', 'success');
            return;
        }
        
        const html = `
            <div style="max-height: 400px; overflow-y: auto;">
                ${lowItems.map(p => `
                    <div style="
                        background: var(--bg);
                        padding: 12px 15px;
                        margin-bottom: 8px;
                        border-radius: 10px;
                        border: 1px solid var(--border);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        flex-wrap: wrap;
                        gap: 8px;
                    ">
                        <div>
                            <div style="font-weight: bold;">${p.name}</div>
                            <div style="font-size: 0.85rem;">
                                المخزون: <span style="color: var(--danger); font-weight: bold;">${p.stock}</span>
                                | الحد الأدنى: ${p.minStock || 5}
                            </div>
                        </div>
                        <div style="display: flex; gap: 5px;">
                            <button onclick="Inventory.quickAddStock(${p.id})" class="btn-success" style="padding: 4px 12px; font-size: 0.8rem;">
                                <i class="fas fa-plus"></i> توريد
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <hr>
            <button onclick="UI.closeModal()" class="btn-primary" style="width:100%; padding: 10px; background: var(--text-secondary);">
                ✕ إغلاق
            </button>
        `;
        
        UI.showModal('⚠️ تنبيهات المخزون', html);
    },

    quickAddStock(id) {
        const product = state.products.find(p => p.id === id);
        if (!product) return;
        
        const qty = prompt(`أدخل الكمية الإضافية لـ "${product.name}":`, '10');
        if (qty === null) return;
        
        const amount = parseInt(qty);
        if (isNaN(amount) || amount <= 0) {
            UI.showToast('⚠️ يرجى إدخال كمية صحيحة', 'warning');
            return;
        }
        
        product.stock += amount;
        updateState();
        App.auditLog(`📦 توريد ${amount} من ${product.name}`);
        UI.showToast(`✅ تم توريد ${amount} من ${product.name}`, 'success');
        UI.closeModal();
        App.switchPage('inventory');
    }
};