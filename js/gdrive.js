// gdrive.js - مزامنة البيانات بين عدة أجهزة عبر حساب Google Drive
//
// الفكرة: كل جهاز يسجّل دخول بحساب Google الخاص به (مرة واحدة)، والتطبيق
// يرفع/يُنزّل ملف JSON واحد (نسخة كاملة من قاعدة البيانات المحلية) من
// وإلى Google Drive الخاص بهذا الحساب. هذه مزامنة "يدوية بسيطة" وليست
// مزامنة لحظية تلقائية: من يُريد نقل بيانات جهاز إلى آخر يضغط "⬆️ رفع"
// على الجهاز المصدر ثم "⬇️ تنزيل" على الجهاز الآخر.
//
// ⚠️ متطلب أساسي لا يمكن لأي كود تجاوزه: تحتاج Client ID من Google Cloud
// Console (مجاني). راجع تعليمات الإعداد التي أرسلتها لك.

const GDrive = {
    // 🔧 ضع هنا الـ Client ID الخاص بك من Google Cloud Console
    CLIENT_ID: 'ضع-الـ-CLIENT-ID-هنا.apps.googleusercontent.com',

    SCOPES: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
    FILE_NAME: 'shakour-erp-backup.json',

    tokenClient: null,
    accessToken: null,
    tokenExpiresAt: 0,

    isConfigured() {
        return this.CLIENT_ID && !this.CLIENT_ID.includes('ضع-الـ-CLIENT-ID-هنا');
    },

    isConnected() {
        return !!this.accessToken && Date.now() < this.tokenExpiresAt;
    },

    init() {
        if (!this.isConfigured()) return;
        if (!window.google || !google.accounts || !google.accounts.oauth2) {
            console.warn('⚠️ مكتبة Google Identity Services لم تُحمَّل بعد');
            return;
        }
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.CLIENT_ID,
            scope: this.SCOPES,
            callback: (resp) => {
                if (resp.error) {
                    UI.showToast('❌ فشل الاتصال بـ Google Drive: ' + resp.error, 'error');
                    return;
                }
                this.accessToken = resp.access_token;
                // مدة صلاحية التوكن بالثواني (عادة 3600) - نحتفظ بهامش أمان
                this.tokenExpiresAt = Date.now() + ((resp.expires_in || 3600) - 60) * 1000;
                UI.showToast('✅ تم الاتصال بـ Google Drive', 'success');

                this.fetchUserEmail().then(() => {
                    if (typeof App !== 'undefined') App.showSystemMenu();
                });

                this._afterConnectAction && this._afterConnectAction();
                this._afterConnectAction = null;
            }
        });
    },

    connect(afterConnectAction) {
        if (!this.isConfigured()) {
            alert('⚠️ ميزة المزامنة عبر Google Drive تحتاج إعداد Client ID أولاً من مطوّر التطبيق (راجع js/gdrive.js).');
            return;
        }
        if (!this.tokenClient) this.init();
        if (!this.tokenClient) {
            UI.showToast('⚠️ تعذّر تحميل خدمة Google، تأكد من اتصال الإنترنت وأعد المحاولة', 'error');
            return;
        }
        this._afterConnectAction = afterConnectAction || null;
        this.tokenClient.requestAccessToken({ prompt: this.accessToken ? '' : 'consent' });
    },

    disconnect() {
        if (this.accessToken) {
            try { google.accounts.oauth2.revoke(this.accessToken, () => {}); } catch (e) {}
        }
        this.accessToken = null;
        this.tokenExpiresAt = 0;
        state.settings.gdriveEmail = '';
        updateState();
        UI.showToast('🔌 تم قطع الاتصال بـ Google Drive', 'info');
    },

    async ensureConnected(action) {
        if (this.isConnected()) {
            action();
        } else {
            this.connect(action);
        }
    },

    async fetchUserEmail() {
        try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${this.accessToken}` }
            });
            if (!res.ok) return;
            const info = await res.json();
            state.settings.gdriveEmail = info.email || '';
            updateState();
        } catch (e) {
            console.warn('⚠️ تعذّر جلب بريد الحساب المتصل:', e);
        }
    },

    async findFile() {
        const res = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${this.FILE_NAME}' and trashed=false&fields=files(id,modifiedTime)&spaces=drive`,
            { headers: { Authorization: `Bearer ${this.accessToken}` } }
        );
        if (!res.ok) throw new Error('DRIVE_LIST_FAILED');
        const data = await res.json();
        return (data.files && data.files.length > 0) ? data.files[0] : null;
    },

    async upload() {
        if (!this.isConnected()) { this.connect(() => this.upload()); return; }

        UI.showToast('⏳ جاري الرفع إلى Google Drive...', 'info');
        try {
            const existing = await this.findFile();
            const content = JSON.stringify(DB.load());
            const metadata = { name: this.FILE_NAME, mimeType: 'application/json' };

            const boundary = 'shakour_erp_boundary_x1';
            const body =
                `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
                JSON.stringify(existing ? {} : metadata) +
                `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
                content +
                `\r\n--${boundary}--`;

            const url = existing
                ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`
                : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

            const res = await fetch(url, {
                method: existing ? 'PATCH' : 'POST',
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`
                },
                body
            });

            if (!res.ok) throw new Error('DRIVE_UPLOAD_FAILED');

            state.settings.lastGDriveSync = new Date().toISOString();
            state.settings.lastGDriveDirection = 'upload';
            updateState();
            UI.showToast('✅ تم رفع النسخة إلى Google Drive', 'success');
            if (typeof App !== 'undefined') App.showSystemMenu();
        } catch (e) {
            console.error(e);
            UI.showToast('❌ فشل رفع النسخة، تأكد من الاتصال بالإنترنت', 'error');
        }
    },

    async download() {
        if (!this.isConnected()) { this.connect(() => this.download()); return; }

        UI.showToast('⏳ جاري البحث عن نسخة على Google Drive...', 'info');
        try {
            const existing = await this.findFile();
            if (!existing) {
                UI.showToast('⚠️ لا توجد نسخة محفوظة على هذا الحساب بعد. ارفع نسخة من جهاز آخر أولاً', 'warning');
                return;
            }

            if (!confirm(
                `⚠️ سيتم استبدال كل بيانات هذا الجهاز بالنسخة المحفوظة على Google Drive\n` +
                `(آخر تحديث للنسخة السحابية: ${new Date(existing.modifiedTime).toLocaleString('ar-SA')})\n\n` +
                `تأكد أنك رفعت أي تعديلات جديدة على هذا الجهاز قبل المتابعة، وإلا ستُفقد.\nهل تريد المتابعة؟`
            )) return;

            const res = await fetch(`https://www.googleapis.com/drive/v3/files/${existing.id}?alt=media`, {
                headers: { Authorization: `Bearer ${this.accessToken}` }
            });
            if (!res.ok) throw new Error('DRIVE_DOWNLOAD_FAILED');
            const jsonText = await res.text();

            const result = DB.importData(jsonText);
            if (result.success) {
                state.settings = state.settings || {};
                UI.showToast('✅ تم تنزيل البيانات، سيُعاد تحميل التطبيق الآن', 'success');
                setTimeout(() => location.reload(), 1500);
            } else {
                UI.showToast(`❌ ${result.message}`, 'error');
            }
        } catch (e) {
            console.error(e);
            UI.showToast('❌ فشل تنزيل النسخة، تأكد من الاتصال بالإنترنت', 'error');
        }
    }
};
