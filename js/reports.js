// reports.js - نظام التقارير والتحليلات

const Reports = {
    renderPage(container) {
        const stats = DB.getStats();
        const allSales = DB.getAllSales();
        const totalSales = stats.totalRevenue;
        const totalProfit = stats.totalProfit;
        const avgOrder = stats.totalSales > 0 ? totalSales / stats.totalSales : 0;
        
        // أفضل المنتجات مبيعاً (تشمل البيع العادي وبيع الجملة معاً)
        const productCounts = {};
        allSales.forEach(sale => {
            sale.items.forEach(item => {
                const name = item.name;
                if (!productCounts[name]) productCounts[name] = 0;
                productCounts[name] += item.qty || 1;
            });
        });
        
        const topProducts = Object.entries(productCounts)
            .map(([name, qty]) => ({ name, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);
        
        // تقرير حسب طريقة الدفع
        const methodBreakdown = {};
        allSales.forEach(sale => {
            const method = sale.paymentMethodName || 'غير محدد';
            if (!methodBreakdown[method]) methodBreakdown[method] = { count: 0, total: 0 };
            methodBreakdown[method].count += 1;
            methodBreakdown[method].total += sale.total || 0;
        });
        const methodRows = Object.entries(methodBreakdown)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.total - a.total);
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="card" style="border-right: 5px solid var(--accent);">
                    <small>💰 إجمالي المبيعات</small>
                    <h2 style="color: var(--accent);">${totalSales.toFixed(2)} ₪</h2>
                </div>
                <div class="card" style="border-right: 5px solid var(--success);">
                    <small>📊 صافي الأرباح</small>
                    <h2 style="color: ${totalProfit >= 0 ? 'var(--success)' : 'var(--danger)'};">${totalProfit.toFixed(2)} ₪</h2>
                </div>
                <div class="card" style="border-right: 5px solid var(--warning);">
                    <small>📋 متوسط الفاتورة</small>
                    <h2 style="color: var(--warning);">${avgOrder.toFixed(2)} ₪</h2>
                </div>
                <div class="card" style="border-right: 5px solid var(--danger);">
                    <small>📦 عدد الفواتير</small>
                    <h2>${stats.totalSales}</h2>
                </div>
            </div>
            
            <div class="card">
                <h4>💳 المبيعات حسب طريقة الدفع</h4>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>طريقة الدفع</th>
                                <th>عدد العمليات</th>
                                <th>الإجمالي</th>
                                <th>النسبة</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${methodRows.length === 0 ? `
                                <tr><td colspan="4" style="text-align:center;color:var(--text-secondary);padding:20px;">لا توجد مبيعات مسجلة</td></tr>
                            ` : ''}
                            ${methodRows.map(m => `
                                <tr>
                                    <td><strong>${m.name}</strong></td>
                                    <td>${m.count}</td>
                                    <td style="color:var(--success);font-weight:bold;">${m.total.toFixed(2)} ₪</td>
                                    <td>${totalSales > 0 ? ((m.total / totalSales) * 100).toFixed(1) : '0'}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="pos-grid" style="grid-template-columns: 1fr 1fr;">
                <div class="card">
                    <h4>🏆 أفضل المنتجات مبيعاً</h4>
                    ${topProducts.length === 0 ? `
                        <p style="color: var(--text-secondary); text-align: center; padding: 20px;">لا توجد مبيعات مسجلة</p>
                    ` : `
                        ${topProducts.map((p, i) => `
                            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
                                <span>
                                    <span style="background:var(--accent);color:white;border-radius:50%;padding:2px 10px;margin-left:8px;font-size:0.8rem;">
                                        ${i + 1}
                                    </span>
                                    ${p.name}
                                </span>
                                <span style="font-weight:bold;color:var(--accent);">${p.qty} وحدة</span>
                            </div>
                        `).join('')}
                    `}
                </div>
                
                <div class="card">
                    <h4>📊 إحصائيات سريعة</h4>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
                        <div style="background:var(--bg);padding:12px;border-radius:8px;text-align:center;">
                            <small style="color:var(--text-secondary);">المنتجات</small>
                            <div style="font-size:1.2rem;font-weight:bold;">${stats.totalProducts}</div>
                        </div>
                        <div style="background:var(--bg);padding:12px;border-radius:8px;text-align:center;">
                            <small style="color:var(--text-secondary);">العملاء</small>
                            <div style="font-size:1.2rem;font-weight:bold;">${stats.totalCustomers}</div>
                        </div>
                        <div style="background:var(--bg);padding:12px;border-radius:8px;text-align:center;">
                            <small style="color:var(--text-secondary);">المشتريات</small>
                            <div style="font-size:1.2rem;font-weight:bold;">${stats.totalPurchases}</div>
                        </div>
                        <div style="background:var(--bg);padding:12px;border-radius:8px;text-align:center;">
                            <small style="color:var(--text-secondary);">الوردية</small>
                            <div style="font-size:1.2rem;font-weight:bold;color:${stats.shiftOpen ? 'var(--success)' : 'var(--danger)'};">
                                ${stats.shiftOpen ? '🟢 مفتوحة' : '🔴 مغلقة'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h4>📈 آخر المبيعات</h4>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>التاريخ</th>
                                <th>عدد الأصناف</th>
                                <th>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allSales.slice(-5).reverse().map((s, i) => `
                                <tr>
                                    <td>${allSales.length - i}</td>
                                    <td>${new Date(s.date).toLocaleDateString('ar-SA')}</td>
                                    <td>${s.items.length}${s.isWholesale ? ' 📦' : ''}</td>
                                    <td style="color:var(--success);font-weight:bold;">${s.total.toFixed(2)} ₪</td>
                                </tr>
                            `).join('')}
                            ${allSales.length === 0 ? `
                                <tr><td colspan="4" style="text-align:center;color:var(--text-secondary);padding:20px;">لا توجد مبيعات</td></tr>
                            ` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="card">
                <h4>📋 سجل التدقيق</h4>
                <div style="max-height: 200px; overflow-y: auto; font-size: 0.85rem;">
                    ${(state.auditLog || []).slice(0, 10).map(log => `
                        <div style="padding:6px 0;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:center;">
                            <i class="fas fa-circle" style="font-size:6px;color:var(--accent);"></i>
                            <span>${log}</span>
                        </div>
                    `).join('')}
                    ${(!state.auditLog || state.auditLog.length === 0) ? `
                        <div style="text-align:center;color:var(--text-secondary);padding:20px;">لا توجد سجلات</div>
                    ` : ''}
                </div>
            </div>
        `;
    },
};
