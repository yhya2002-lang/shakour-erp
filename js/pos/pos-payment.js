// pos-payment.js - نظام الدفع وطرق الدفع

// ===== عرض نافذة الدفع =====
POS.showPaymentModal = function() {
    if (this.cart.length === 0) {
        alert('⚠️ السلة فارغة!');
        return;
    }

    if (!state.settings || !state.settings.shiftOpen) {
        alert('⚠️ افتح الوردية أولاً!');
        return;
    }

    const subTotal = this.cart.reduce((a, b) => a + ((b.price || 0) * (b.qty || 0)), 0);
    const discountInput = document.getElementById('pos-discount');
    const discount = discountInput ? parseFloat(discountInput.value) || 0 : 0;
    const total = Math.max(0, subTotal - discount);
    const taxRate = state.settings.taxRate || 0.15;
    const taxAmount = total * taxRate;
    const finalTotal = total + taxAmount;

    const paymentMethods = DB.getPaymentMethods().filter(m => m.enabled !== false);
    
    const html = `
        <div style="max-height: 500px; overflow-y: auto;">
            <div style="text-align:center;margin-bottom:15px;">
                <h3>💰 طريقة الدفع</h3>
                <div style="font-size:0.9rem;color:var(--text-secondary);">
                    الإجمالي: <strong style="color:var(--accent);font-size:1.2rem;">${finalTotal.toFixed(2)} ₪</strong>
                    ${this.isWholesale ? ' (جملة)' : ' (بيع عادي)'}
                </div>
                ${this.isWholesale ? `
                    <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px;">
                        العميل: ${this.selectedPerson ? this.selectedPerson.name : 'غير محدد'}
                        ${this.selectedPerson ? `(الرصيد الحالي: ${(this.selectedPerson.balance || 0).toFixed(2)} ₪)` : ''}
                    </div>
                ` : ''}
            </div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:15px;">
                ${paymentMethods.map(p => `
                    <button onclick="POS.selectPaymentMethod('${p.id}')" style="
                        padding: 12px 8px;
                        border: 2px solid var(--border);
                        border-radius: 10px;
                        background: var(--bg);
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 4px;
                        font-size: 0.85rem;
                    " onmouseover="this.style.borderColor='${p.color}'" onmouseout="this.style.borderColor='var(--border)'">
                        <i class="fas ${p.icon}" style="color: ${p.color}; font-size: 1.5rem;"></i>
                        <span style="font-weight: bold;">${p.name}</span>
                        <span style="font-size: 0.65rem; color: var(--text-secondary);">
                            ${p.status === 'paid' ? '✅ مدفوعة' : p.status === 'unpaid' ? '❌ غير مدفوعة' : '⏳ قيد الانتظار'}
                        </span>
                        ${p.requirePerson ? '<span style="font-size:0.6rem;color:var(--warning);">👤 يتطلب اختيار شخص</span>' : ''}
                    </button>
                `).join('')}
            </div>
            
            <hr>
            <div style="display: flex; gap: 10px; margin-top: 10px;">
                <button onclick="UI.closeModal()" class="btn-primary" style="flex:1; padding: 10px; background: var(--text-secondary); border: none; border-radius: 6px; cursor: pointer; color: white;">
                    ✕ إلغاء
                </button>
            </div>
        </div>
    `;
    
    UI.showModal('💳 اختيار طريقة الدفع', html);
};

// ===== اختيار طريقة الدفع =====
POS.selectPaymentMethod = function(methodId) {
    const method = DB.getPaymentMethod(methodId);
    if (!method) {
        UI.showToast('⚠️ طريقة الدفع غير موجودة', 'warning');
        return;
    }

    if (method.requirePerson) {
        UI.closeModal();
        this.selectedPaymentMethod = methodId;
        this.showPersonSelectorForPayment();
        return;
    }

    this.completePayment(methodId);
};

// ===== إكمال عملية الدفع =====
POS.completePayment = function(methodId) {
    console.log('💳 completePayment() - طريقة الدفع:', methodId);
    
    const method = DB.getPaymentMethod(methodId);
    if (!method) {
        UI.showToast('⚠️ طريقة الدفع غير موجودة', 'warning');
        return;
    }

    const subTotal = this.cart.reduce((a, b) => a + ((b.price || 0) * (b.qty || 0)), 0);
    const discountInput = document.getElementById('pos-discount');
    const discount = discountInput ? parseFloat(discountInput.value) || 0 : 0;
    const total = Math.max(0, subTotal - discount);

    if (total === 0) {
        if (!confirm('⚠️ الإجمالي صفر. هل تريد إكمال العملية؟')) return;
    }

    const unavailable = this.cart.filter(item => {
        const product = state.products.find(p => p.id === item.id);
        return !product || (product.stock || 0) < (item.qty || 0);
    });

    if (unavailable.length > 0) {
        alert(`⚠️ بعض الأصناف غير متوفرة: ${unavailable.map(i => i.name).join(', ')}`);
        return;
    }

    this.cart.forEach(item => {
        const p = state.products.find(x => x.id === item.id);
        if (p) {
            p.stock = (p.stock || 0) - (item.qty || 0);
        }
    });
    // نحفظ خصم المخزون فوراً هنا. الدوال التالية (processRegularPayment /
    // processWholesalePayment) تستخدم DB.updatePersonBalance و DB.addInvoice
    // والتي تقرأ نسخة جديدة من قاعدة البيانات وتحفظها مباشرة؛ لو تركنا
    // الحفظ إلى updateState() لاحقاً فقط، فسيقوم بالكتابة فوق تلك التغييرات
    // بنسخة state القديمة المخزنة في الذاكرة ويُفقد تحديث رصيد العميل.
    updateState();

    UI.closeModal();

    if (this.isWholesale) {
        this.processWholesalePayment(method, subTotal, discount, total);
    } else {
        this.processRegularPayment(method, subTotal, discount, total);
    }

    this.cart = [];
    const discountInput2 = document.getElementById('pos-discount');
    if (discountInput2) discountInput2.value = '0';
    this.updateUI();
    this.init();
    this.updateSuspendedCount();
    
    if (this.selectedPerson && this.selectedPerson.id) {
        const refreshedPerson = DB.getPerson(this.selectedPerson.id);
        if (refreshedPerson) {
            this.selectedPerson = refreshedPerson;
        }
    }
};

// ===== معالجة الدفع بالجملة =====
POS.processWholesalePayment = function(method, subTotal, discount, total) {
    const customerName = document.getElementById('wholesale-customer')?.value || 'عميل جملة';
    const customerPhone = document.getElementById('wholesale-phone')?.value || '';
    const customerAddress = document.getElementById('wholesale-address')?.value || '';
    const commercialRegister = document.getElementById('wholesale-cr')?.value || '';
    
    const taxRate = state.settings.taxRate || 0.15;
    const taxAmount = total * taxRate;
    const finalTotal = total + taxAmount;
    
    let personId = null;
    let personName = null;
    let oldBalance = 0;
    let newBalance = 0;
    
    console.log('👤 الشخص المختار للدفع:', this.selectedPerson);
    console.log('💰 المبلغ الإجمالي:', finalTotal);
    
    if (this.selectedPerson && this.selectedPerson.id) {
        personId = this.selectedPerson.id;
        personName = this.selectedPerson.name;
        
        if (personName === 'عميل نقدي') {
            alert('⚠️ لا يمكن إضافة ديون على العميل النقدي');
            return;
        }
        
        const currentPerson = DB.getPerson(personId);
        console.log('📊 الشخص من قاعدة البيانات:', currentPerson);
        
        if (currentPerson) {
            oldBalance = currentPerson.balance || 0;
            newBalance = oldBalance + finalTotal;
            
            console.log(`📊 الرصيد السابق: ${oldBalance.toFixed(2)}`);
            console.log(`📊 الرصيد الجديد: ${newBalance.toFixed(2)}`);
            
            const updateResult = DB.updatePersonBalance(personId, finalTotal);
            console.log('✅ نتيجة التحديث:', updateResult);
            
            if (updateResult) {
                this.selectedPerson = updateResult;
                const customerInput = document.getElementById('wholesale-customer');
                if (customerInput) {
                    customerInput.value = updateResult.name;
                }
            }
        }
    } else if (method.requirePerson) {
        // العميل إجباري فقط لطرق الدفع التي تتطلب شخصاً (مثل "آجل")
        console.warn('⚠️ لا يوجد شخص مختار للدفع الآجل');
        alert('⚠️ يجب اختيار عميل للدفع الآجل');
        return;
    }
    // طرق الدفع التي لا تتطلب شخصاً (نقدي، بطاقة ائتمان...) تُكمل الفاتورة
    // بدون عميل مرتبط، تماماً مثل سلوك البيع العادي
    
    const grossProfit = this.cart.reduce((sum, item) => sum + (((item.price || 0) - (item.cost || 0)) * (item.qty || 0)), 0);
    const discountRatio = subTotal > 0 ? discount / subTotal : 0;
    const profit = grossProfit * (1 - discountRatio);

    const invoice = {
        invoiceNumber: state.settings.nextInvoiceNumber || 1001,
        customerName: customerName,
        customerPhone: customerPhone,
        customerAddress: customerAddress,
        commercialRegister: commercialRegister,
        items: JSON.parse(JSON.stringify(this.cart)),
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
    App.auditLog(`📄 فاتورة جملة #${invoice.invoiceNumber} - ${customerName} - ${invoice.total.toFixed(2)} ₪`);
    
    let message = `✅ تم إصدار فاتورة الجملة #${invoice.invoiceNumber}\n`;
    message += `💰 المبلغ: ${invoice.total.toFixed(2)} ₪\n`;
    message += `💳 طريقة الدفع: ${method.name}\n`;
    if (personName) {
        message += `👤 العميل: ${personName}\n`;
        message += `📊 الرصيد السابق: ${oldBalance.toFixed(2)} ₪\n`;
        message += `📊 الرصيد الجديد: ${newBalance.toFixed(2)} ₪`;
    }

    this.showFinalInvoiceModal(invoice, true);

    setTimeout(() => {
        const updatedPersons = DB.getPersons();
        console.log('✅ تم تحديث قائمة الأشخاص:', updatedPersons.length);
        if (personId) {
            const refreshed = DB.getPerson(personId);
            if (refreshed) {
                this.selectedPerson = refreshed;
                console.log('✅ تم تحديث الشخص المختار:', refreshed);
            }
        }
        this.init();
    }, 500);
};

// ===== معالجة الدفع العادي =====
POS.processRegularPayment = function(method, subTotal, discount, total) {
    let personId = null;
    let personName = null;
    let oldBalance = 0;
    let newBalance = 0;

    // طرق الدفع مثل "آجل" تتطلب اختيار شخص وتقييد المبلغ على حسابه
    if (method.requirePerson) {
        if (!this.selectedPerson || !this.selectedPerson.id) {
            alert('⚠️ يجب اختيار شخص لهذه الطريقة من الدفع');
            return;
        }
        if (this.selectedPerson.name === 'عميل نقدي') {
            alert('⚠️ لا يمكن إضافة ديون على العميل النقدي');
            return;
        }

        personId = this.selectedPerson.id;
        personName = this.selectedPerson.name;

        const currentPerson = DB.getPerson(personId);
        if (currentPerson) {
            oldBalance = currentPerson.balance || 0;
            newBalance = oldBalance + total;

            const updateResult = DB.updatePersonBalance(personId, total);
            console.log('✅ تم تقييد المبلغ على حساب الشخص:', updateResult);
            if (updateResult) {
                this.selectedPerson = updateResult;
            }
        }
    }

    // أعد تحميل state من التخزين بعد DB.updatePersonBalance حتى لا تُفقد
    // نسخته الطازجة (الرصيد الجديد) عند استدعاء updateState() بالأسفل
    if (personId) {
        state = DB.load();
    }

    // حساب الربح: (سعر البيع - سعر التكلفة) لكل صنف، بنفس نسبة الخصم على السعر
    // الإجمالي. هذا الحقل تعتمد عليه صفحتا "المحاسبة" و"التقارير" لعرض صافي الربح
    const grossProfit = this.cart.reduce((sum, item) => sum + (((item.price || 0) - (item.cost || 0)) * (item.qty || 0)), 0);
    const discountRatio = subTotal > 0 ? discount / subTotal : 0;
    const profit = grossProfit * (1 - discountRatio);

    const sale = {
        id: Date.now(),
        items: JSON.parse(JSON.stringify(this.cart)),
        total: total,
        discount: discount,
        subTotal: subTotal,
        profit: profit,
        date: new Date().toISOString(),
        storeName: state.settings ? state.settings.storeName || 'متجر شكور' : 'متجر شكور',
        isWholesale: false,
        paymentMethod: method.name,
        paymentMethodId: method.id,
        personId: personId,
        personName: personName,
        oldBalance: oldBalance,
        newBalance: newBalance,
        status: method.status,
        cashierName: Auth.currentUser ? Auth.currentUser.name : 'النظام'
    };
    state.sales.push(sale);
    updateState();

    let message = `✅ تمت عملية البيع بنجاح\nالمبلغ: ${total.toFixed(2)} ₪\nطريقة الدفع: ${method.name}`;
    if (personName) {
        message += `\n👤 العميل: ${personName}`;
        message += `\n📊 الرصيد السابق: ${oldBalance.toFixed(2)} ₪`;
        message += `\n📊 الرصيد الجديد: ${newBalance.toFixed(2)} ₪`;
        App.auditLog(`💳 بيع آجل - ${personName} - ${total.toFixed(2)} ₪`);
    }

    // إعادة تعيين الشخص المختار حتى لا يُستخدم بالخطأ في عملية بيع نقدي تالية
    if (personId) {
        this.selectedPerson = null;
        this.selectedPersonId = null;
    }

    this.showFinalInvoiceModal(sale, false);
};

// ===== نافذة الفاتورة النهائية بعد الدفع (طباعة أو عودة للكاشير) =====
POS.showFinalInvoiceModal = function(saleOrInvoice, isWholesale, returnPage) {
    returnPage = returnPage || 'pos';
    const total = saleOrInvoice.total || 0;
    const itemsCount = (saleOrInvoice.items || []).length;
    const personName = saleOrInvoice.personName || saleOrInvoice.customerName || null;
    const invoiceNo = isWholesale ? saleOrInvoice.invoiceNumber : saleOrInvoice.id;
    const paymentName = saleOrInvoice.paymentMethodName || saleOrInvoice.paymentMethod || '';

    const html = `
        <div style="text-align:center;">
            <div style="width:70px;height:70px;border-radius:50%;background:var(--success-soft, rgba(16,185,129,0.1));display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                <i class="fas fa-check" style="font-size:2rem;color:var(--success);"></i>
            </div>
            <h3 style="margin-bottom:4px;">تمت العملية بنجاح</h3>
            <div style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:15px;">
                ${isWholesale ? 'فاتورة جملة' : 'فاتورة بيع'} #${invoiceNo}
            </div>

            <div style="background:var(--bg);border-radius:10px;padding:14px;text-align:right;margin-bottom:15px;">
                <div style="display:flex;justify-content:space-between;padding:5px 0;">
                    <span style="color:var(--text-secondary);">عدد الأصناف</span>
                    <span style="font-weight:bold;">${itemsCount}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:5px 0;">
                    <span style="color:var(--text-secondary);">طريقة الدفع</span>
                    <span style="font-weight:bold;">${paymentName}</span>
                </div>
                ${personName ? `
                <div style="display:flex;justify-content:space-between;padding:5px 0;">
                    <span style="color:var(--text-secondary);">العميل</span>
                    <span style="font-weight:bold;">${personName}</span>
                </div>
                ` : ''}
                <div style="display:flex;justify-content:space-between;padding:8px 0 0;border-top:1px solid var(--border);margin-top:6px;font-size:1.15rem;">
                    <span style="font-weight:bold;">الإجمالي</span>
                    <span style="font-weight:800;color:var(--accent);">${total.toFixed(2)} ₪</span>
                </div>
            </div>

            <div style="display:flex;gap:10px;">
                <button onclick="POS.printFromModal(${isWholesale})" class="btn-primary" style="flex:1;padding:12px;border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                    <i class="fas fa-print"></i> طباعة
                </button>
                <button onclick="POS.backToCashierFromModal('${returnPage}')" class="btn-danger" style="flex:1;padding:12px;border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                    <i class="fas fa-xmark"></i> إلغاء والعودة${returnPage === 'wholesale' ? '' : ' للكاشير'}
                </button>
            </div>
        </div>
    `;

    this._lastSaleOrInvoice = saleOrInvoice;
    this._lastSaleWasWholesale = isWholesale;

    UI.showModal('🧾 الفاتورة', html);
};

// ===== طباعة من نافذة الفاتورة النهائية =====
POS.printFromModal = function(isWholesale) {
    if (!this._lastSaleOrInvoice) return;
    if (isWholesale) {
        this.printWholesaleInvoice(this._lastSaleOrInvoice);
    } else {
        this.printInvoice(this._lastSaleOrInvoice);
    }
};

// ===== إلغاء نافذة الفاتورة والعودة لشاشة الكاشير (أو أي صفحة أخرى) =====
POS.backToCashierFromModal = function(returnPage) {
    UI.closeModal();
    this._lastSaleOrInvoice = null;
    App.switchPage(returnPage || 'pos');
};

// ===== طباعة فاتورة الجملة =====
POS.printWholesaleInvoice = function(invoice) {
    console.log('🖨️ printWholesaleInvoice() تم استدعاؤها');
    
    const printWindow = window.open('', '_blank', 'width=500,height=700');
    if (!printWindow) {
        alert('⚠️ الرجاء السماح للنوافذ المنبثقة');
        return;
    }

    const itemsHTML = invoice.items.map(i => `
        <tr>
            <td style="text-align:right;padding:6px 4px;">${i.name || 'بدون اسم'}</td>
            <td style="text-align:center;padding:6px 4px;">${i.qty || 0}</td>
            <td style="text-align:center;padding:6px 4px;">${(i.price || 0).toFixed(2)}</td>
            <td style="text-align:left;padding:6px 4px;">${((i.price || 0) * (i.qty || 0)).toFixed(2)} ₪</td>
        </tr>
    `).join('');

    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>فاتورة جملة #${invoice.invoiceNumber}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    padding: 30px;
                    max-width: 450px;
                    margin: 0 auto;
                    background: white;
                    color: #1e293b;
                    font-size: 13px;
                }
                .header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px; }
                .header h1 { color: #3b82f6; font-size: 1.5rem; margin: 0; }
                .header small { color: #666; font-size: 0.8rem; }
                .invoice-title { background: #3b82f6; color: white; padding: 8px; text-align: center; border-radius: 6px; font-weight: bold; margin-bottom: 15px; }
                .customer-info { background: #f1f5f9; padding: 12px; border-radius: 8px; margin-bottom: 15px; font-size: 0.85rem; }
                .customer-info div { padding: 2px 0; }
                .customer-info strong { color: #1e293b; }
                .details { display: flex; justify-content: space-between; font-size: 0.8rem; color: #555; margin-bottom: 15px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th, td { padding: 6px 4px; border-bottom: 1px solid #e2e8f0; text-align: right; }
                th { background: #f1f5f9; font-weight: 600; font-size: 0.7rem; text-transform: uppercase; color: #64748b; }
                .totals { margin-top: 15px; border-top: 2px solid #1e293b; padding-top: 10px; }
                .totals .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.9rem; }
                .totals .grand-total { font-size: 1.2rem; font-weight: bold; color: #3b82f6; border-top: 2px solid #3b82f6; padding-top: 8px; margin-top: 5px; }
                .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: bold; }
                .status.paid { background: #d1fae5; color: #065f46; }
                .status.unpaid { background: #fee2e2; color: #b91c1c; }
                .status.partial { background: #fef3c7; color: #92400e; }
                .status.pending { background: #fef3c7; color: #92400e; }
                .footer { text-align: center; margin-top: 20px; font-size: 0.8rem; color: #888; border-top: 1px solid #e2e8f0; padding-top: 15px; }
                .signature { display: flex; justify-content: space-between; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0; }
                .signature div { text-align: center; font-size: 0.8rem; color: #64748b; }
                .signature .line { width: 120px; border-bottom: 1px solid #1e293b; margin-top: 5px; }
                .no-print { display: none; }
                @media print { body { padding: 15px; } .no-print { display: none !important; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🏪 ${state.settings.storeName || 'متجر شكور'}</h1>
                <small>فاتورة بيع بالجملة</small>
            </div>
            
            <div class="invoice-title">📄 فاتورة جملة #${invoice.invoiceNumber}</div>
            
            <div class="customer-info">
                <div><strong>👤 العميل:</strong> ${invoice.customerName || 'عميل جملة'}</div>
                ${invoice.customerPhone ? `<div><strong>📱 الهاتف:</strong> ${invoice.customerPhone}</div>` : ''}
                ${invoice.customerAddress ? `<div><strong>📍 العنوان:</strong> ${invoice.customerAddress}</div>` : ''}
                ${invoice.commercialRegister ? `<div><strong>🏢 السجل التجاري:</strong> ${invoice.commercialRegister}</div>` : ''}
                <div><strong>💰 طريقة الدفع:</strong> ${invoice.paymentMethodName || invoice.paymentMethod}</div>
                ${invoice.personName ? `<div><strong>👤 الشخص المسؤول:</strong> ${invoice.personName}</div>` : ''}
                ${invoice.oldBalance !== undefined ? `<div><strong>📊 الرصيد السابق:</strong> ${(invoice.oldBalance || 0).toFixed(2)} ₪</div>` : ''}
                ${invoice.newBalance !== undefined ? `<div><strong>📊 الرصيد الجديد:</strong> ${(invoice.newBalance || 0).toFixed(2)} ₪</div>` : ''}
            </div>
            
            <div class="details">
                <span>📅 ${new Date(invoice.createdAt).toLocaleDateString('ar-SA')}</span>
                <span>🕐 ${new Date(invoice.createdAt).toLocaleTimeString('ar-SA')}</span>
                <span>👤 ${invoice.createdBy || 'النظام'}</span>
            </div>
            
            <table>
                <thead><tr><th style="text-align:right;">الصنف</th><th style="text-align:center;">الكمية</th><th style="text-align:center;">السعر</th><th style="text-align:left;">الإجمالي</th></tr></thead>
                <tbody>${itemsHTML}</tbody>
            </table>
            
            <div class="totals">
                <div class="row"><span>المجموع الفرعي</span><span>${invoice.subtotal.toFixed(2)} ₪</span></div>
                ${invoice.discount > 0 ? `<div class="row" style="color:#ef4444;"><span>الخصم</span><span>- ${invoice.discount.toFixed(2)} ₪</span></div>` : ''}
                <div class="row"><span>الضريبة (${(state.settings.taxRate || 0.15) * 100}%)</span><span>${invoice.tax.toFixed(2)} ₪</span></div>
                <div class="row grand-total"><span>الإجمالي النهائي</span><span>${invoice.total.toFixed(2)} ₪</span></div>
            </div>
            
            <div style="text-align:center;margin-top:10px;">
                <span class="status ${invoice.status}">
                    ${invoice.status === 'paid' ? '✅ مدفوعة' : invoice.status === 'partial' ? '⏳ مدفوعة جزئياً' : invoice.status === 'pending' ? '⏳ قيد الانتظار' : '❌ غير مدفوعة'}
                </span>
            </div>
            
            <div class="signature">
                <div><div>توقيع البائع</div><div class="line"></div></div>
                <div><div>توقيع العميل</div><div class="line"></div></div>
            </div>
            
            <div class="footer">
                ${state.settings.receiptFooter || 'شكراً لثقتكم بنا'} <br>
                <small>هذه فاتورة رسمية معتمدة</small>
            </div>
            
            <button onclick="window.print()" class="no-print" style="width:100%; padding:12px; background:#3b82f6; color:white; border:none; border-radius:8px; font-size:1rem; cursor:pointer; margin-top:15px;">
                🖨️ طباعة
            </button>
            <button onclick="window.close()" class="no-print" style="width:100%; padding:10px; background:#ef4444; color:white; border:none; border-radius:8px; font-size:1rem; cursor:pointer; margin-top:5px;">
                ✕ إغلاق
            </button>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    
    setTimeout(() => {
        try { printWindow.print(); } catch (e) {}
    }, 1000);
};

// ===== طباعة فاتورة عادية =====
POS.printInvoice = function(sale) {
    console.log('🖨️ POS.printInvoice() تم استدعاؤها');
    
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
        alert('⚠️ الرجاء السماح للنوافذ المنبثقة');
        return;
    }

    const itemsHTML = sale.items.map(i => `
        <tr>
            <td style="text-align:right;">${i.name || 'بدون اسم'}</td>
            <td style="text-align:center;">${i.qty || 0}</td>
            <td style="text-align:left;">${((i.price || 0) * (i.qty || 0)).toFixed(2)} ₪</td>
        </tr>
    `).join('');

    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>فاتورة #${sale.id}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 350px; margin: 0 auto; background: white; color: #1e293b; font-size: 14px; }
                .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 15px; }
                .header h2 { color: #3b82f6; margin: 0; }
                .header small { color: #666; }
                .details { display: flex; justify-content: space-between; font-size: 0.8rem; color: #555; margin-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th, td { padding: 6px 4px; border-bottom: 1px solid #e2e8f0; text-align: right; }
                th { background: #f1f5f9; font-weight: 600; font-size: 0.75rem; }
                .total { font-size: 1.2rem; font-weight: bold; border-top: 2px solid #1e293b; padding-top: 10px; margin-top: 10px; display: flex; justify-content: space-between; }
                .barcode { text-align: center; font-family: 'Courier New', monospace; font-size: 1rem; letter-spacing: 2px; margin: 10px 0; color: #333; }
                .footer { text-align: center; margin-top: 15px; font-size: 0.8rem; color: #888; border-top: 1px solid #e2e8f0; padding-top: 10px; }
                .thank-you { text-align: center; font-size: 1rem; color: #3b82f6; margin: 10px 0; }
                .no-print { display: none; }
                @media print { body { padding: 10px; } .no-print { display: none !important; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>🏪 ${sale.storeName || 'متجر شكور'}</h2>
                <small>فاتورة بيع</small>
            </div>
            
            <div class="details">
                <span>#${sale.id}</span>
                <span>${new Date(sale.date).toLocaleString('ar-SA')}</span>
            </div>
            
            <table>
                <thead><tr><th style="text-align:right;">الصنف</th><th style="text-align:center;">الكمية</th><th style="text-align:left;">الإجمالي</th></tr></thead>
                <tbody>${itemsHTML}</tbody>
            </table>
            
            ${sale.discount > 0 ? `<div style="display:flex;justify-content:space-between;color:#ef4444;font-size:0.9rem;"><span>الخصم</span><span>- ${sale.discount.toFixed(2)} ₪</span></div>` : ''}
            
            <div class="total">
                <span>الإجمالي</span>
                <span>${sale.total.toFixed(2)} ₪</span>
            </div>
            
            <div class="barcode">${'|'.repeat(sale.id.toString().length * 3)}</div>
            
            <div class="thank-you">🌟 شكراً لزيارتكم</div>
            
            <div class="footer">
                ${sale.storeName || 'متجر شكور'} © ${new Date().getFullYear()}
                <br><small>فاتورة إلكترونية معتمدة</small>
            </div>
            
            <button onclick="window.print()" class="no-print" style="width:100%; padding:12px; background:#3b82f6; color:white; border:none; border-radius:8px; font-size:1rem; cursor:pointer; margin-top:15px;">
                🖨️ طباعة
            </button>
            <button onclick="window.close()" class="no-print" style="width:100%; padding:10px; background:#ef4444; color:white; border:none; border-radius:8px; font-size:1rem; cursor:pointer; margin-top:5px;">
                ✕ إغلاق
            </button>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    
    setTimeout(() => {
        try { printWindow.print(); } catch (e) {}
    }, 1000);
};

console.log('📁 تم تحميل POS Payment');