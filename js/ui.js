// ui.js - واجهة المستخدم مع إشعارات Toast وإصلاح القائمة الجانبية

const UI = {
    toastTimeout: null,

    init() {
        if (state.settings.darkMode) {
            document.body.classList.add('dark-mode');
        }
        this.updateShiftBadge();
        this.updateUserUI();
        
        // التأكد من إغلاق القائمة عند تحميل الصفحة
        this.closeSidebar();
        
        console.log('✅ UI initialized');
    },

    // ===== القائمة الجانبية =====
    toggleSidebar() {
        console.log('🔄 toggleSidebar() تم استدعاؤها');
        
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        if (!sidebar) {
            console.error('❌ عنصر sidebar غير موجود!');
            return;
        }
        
        sidebar.classList.toggle('active');
        
        if (overlay) {
            overlay.classList.toggle('active');
        }
        
        console.log('📱 القائمة:', sidebar.classList.contains('active') ? 'مفتوحة' : 'مغلقة');
    },

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        if (sidebar) {
            sidebar.classList.remove('active');
        }
        if (overlay) {
            overlay.classList.remove('active');
        }
    },

    // ===== الوضع الليلي =====
    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        state.settings.darkMode = document.body.classList.contains('dark-mode');
        updateState();
        this.showToast(
            state.settings.darkMode ? '🌙 تم تفعيل الوضع الليلي' : '☀️ تم تفعيل الوضع النهاري',
            'info'
        );
    },

    // ===== النوافذ المنبثقة =====
    showModal(title, html) {
        const modal = document.getElementById('modal-container');
        const titleEl = document.getElementById('modal-title');
        const bodyEl = document.getElementById('modal-body');
        
        if (!modal || !titleEl || !bodyEl) {
            console.error('⚠️ عناصر المودال غير موجودة');
            return;
        }
        
        const wasOpen = modal.style.display === 'flex';
        titleEl.innerText = title;
        bodyEl.innerHTML = html;
        modal.style.display = 'flex';

        if (!wasOpen) {
            // نسجّل خطوة تنقل حتى تُغلق هذه النافذة عند سحبة/زر الرجوع
            history.pushState(Object.assign({}, history.state, { modal: true }), '', location.hash);
        }
    },

    // isPopState=true تعني أن الإغلاق جاء بسبب سحبة/زر الرجوع، فلا داعي
    // لسحب خطوة إضافية من history (هي أصلاً السبب في وصولنا هنا)
    closeModal(isPopState = false) {
        const modal = document.getElementById('modal-container');
        const wasOpen = modal && modal.style.display === 'flex';
        if (modal) {
            modal.style.display = 'none';
        }
        if (wasOpen && !isPopState && typeof App !== 'undefined') {
            App.consumeHistoryEntry();
        }
    },

    // ===== تحديث حالة الوردية =====
    updateShiftBadge() {
        const b = document.getElementById('shift-badge');
        if (!b) return;
        b.innerText = state.settings.shiftOpen ? '🟢 مفتوحة' : '🔴 مغلقة';
        b.className = 'status-badge ' + (state.settings.shiftOpen ? 'success' : 'danger');
    },

    // ===== تحديث معلومات المستخدم =====
    updateUserUI() {
        const user = Auth.currentUser;
        if (user) {
            const nameEl = document.getElementById('u-name');
            const roleEl = document.getElementById('u-role');
            if (nameEl) nameEl.innerText = user.name;
            if (roleEl) roleEl.innerText = user.role === 'manager' ? '👑 مدير' : '👤 موظف';
        }
    },

    // ===== قائمة اختيار الوحدة (تُستخدم في المخزون والمشتريات) =====
    unitSelectHTML(selectId, selectedUnit) {
        const units = DB.getUnits();
        return `
            <select id="${selectId}" class="form-control">
                ${units.map(u => `<option value="${u}" ${u === selectedUnit ? 'selected' : ''}>${u}</option>`).join('')}
            </select>
        `;
    },

    addNewUnit(selectId) {
        const name = prompt('📏 أدخل اسم الوحدة الجديدة (مثال: صندوق، برميل):');
        if (!name || !name.trim()) return;
        const units = DB.addUnit(name.trim());
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join('');
            select.value = name.trim();
        }
    },

    // ===== إشعارات Toast =====
    showToast(message, type = 'info', duration = 3500) {
        const oldToast = document.querySelector('.toast-notification');
        if (oldToast) {
            oldToast.remove();
            if (this.toastTimeout) {
                clearTimeout(this.toastTimeout);
                this.toastTimeout = null;
            }
        }

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };

        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: var(--card);
            color: var(--text);
            padding: 15px 25px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 99999;
            direction: rtl;
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            max-width: 90%;
            border-right: 5px solid ${colors[type]};
            font-size: 0.95rem;
            min-width: 200px;
        `;
        toast.innerHTML = `
            <i class="fas ${icons[type]}" style="color: ${colors[type]}; font-size: 1.3rem;"></i>
            <span style="flex: 1; line-height: 1.4;">${message}</span>
            <button onclick="this.parentElement.remove()" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#999;padding:0 5px;">×</button>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);

        this.toastTimeout = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(100px)';
            setTimeout(() => {
                if (toast.parentElement) toast.remove();
                this.toastTimeout = null;
            }, 400);
        }, duration);
    },

    showSuccess(message) { 
        this.showToast(message, 'success'); 
    },
    
    showError(message) { 
        this.showToast(message, 'error'); 
    },
    
    showWarning(message) { 
        this.showToast(message, 'warning'); 
    },
    
    showInfo(message) { 
        this.showToast(message, 'info'); 
    },

    // ===== تأكيد العملية =====
    confirmAction(message, onConfirm, onCancel) {
        const html = `
            <div style="text-align: center; padding: 10px;">
                <p style="margin-bottom: 20px; font-size: 1.05rem; line-height: 1.6;">${message}</p>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="UI.closeModal(); (${onConfirm.toString()})()" class="btn-success" style="padding: 10px 25px; min-width: 100px;">
                        <i class="fas fa-check"></i> تأكيد
                    </button>
                    <button onclick="UI.closeModal(); ${onCancel ? `(${onCancel.toString()})()` : ''}" class="btn-danger" style="padding: 10px 25px; min-width: 100px;">
                        <i class="fas fa-times"></i> إلغاء
                    </button>
                </div>
            </div>
        `;
        this.showModal('تأكيد العملية', html);
    },

    // ===== أدوات مساعدة =====
    formatCurrency(amount, currency = '₪') {
        return `${amount.toFixed(2)} ${currency}`;
    },

    formatDate(date, format = 'full') {
        const d = new Date(date);
        if (format === 'full') {
            return d.toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else if (format === 'short') {
            return d.toLocaleDateString('ar-SA', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } else {
            return d.toLocaleDateString('ar-SA');
        }
    },

    // ===== نسخ النص =====
    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => this.showSuccess('✅ تم نسخ النص إلى الحافظة'))
                .catch(() => this.fallbackCopy(text));
        } else {
            this.fallbackCopy(text);
        }
    },

    fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            this.showSuccess('✅ تم نسخ النص إلى الحافظة');
        } catch (e) {
            this.showError('❌ فشل في نسخ النص');
        }
        document.body.removeChild(textarea);
    },

    // ===== تحميل مؤقت =====
    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 200px; flex-direction: column; gap: 15px;">
                <div class="loader-spinner" style="width: 40px; height: 40px; border: 4px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                <p style="color: var(--text-secondary);">جاري التحميل...</p>
            </div>
        `;
    }
};

// إضافة Animation للـ Loader
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

console.log('📁 تم تحميل UI.js بنجاح');
console.log('📱 دوال القائمة: toggleSidebar(), closeSidebar()');