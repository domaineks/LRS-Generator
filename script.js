// 台灣稅法常數 (2026年)
const TAX_CONSTANTS = {
    SUPPLEMENTARY_HEALTH_RATE: 0.0211, // 二代健保補充保費率
    MIN_WAGE: 29500, // 基本工資 (2026年/115年)
    SUPPLEMENTARY_HEALTH_THRESHOLD: 20000, // 9A/9B 補充保費門檻

    // 115年度薪資所得扣繳稅額表估算基礎。
    // 官方扣繳表編製採：免稅額101,000 + 有配偶者標準扣除額272,000 + 薪資所得特別扣除額227,000 = 600,000。
    // 注意：這是「每月薪資扣繳表」估算基礎，不是單身年度綜所稅申報時的實際扣除額。
    SALARY_WITHHOLDING_YEARLY_DEDUCTION_BASE: 600000,
    SALARY_WITHHOLDING_DEPENDENT_DEDUCTION: 101000,
    SALARY_WITHHOLDING_DEPENDENTS: 0,

    // 扣繳率/門檻
    WITHHOLD_RATES: {
        LOCAL: {
            // 50 薪資所得改由 calculateSalaryWithholding2026() 依 115 年度薪資扣繳公式試算
            '50': { threshold: 90501, rate: null },
            '9A': { threshold: 20001, rate: 0.10 },
            '9B': { threshold: 20001, rate: 0.10 },
            '92': { threshold: Infinity, rate: 0 }
        },
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 設定今天的日期為預設填表日期
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fillDate').value = today;
    
    // 監聽申報類別變更
    document.getElementById('incomeType').addEventListener('change', toggleBusinessType);
    
    // 監聽金額輸入，即時計算
    const calcTriggers = ['amount', 'incomeType', 'hasUnion'];
    calcTriggers.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', calculateAmounts);
            element.addEventListener('input', calculateAmounts);
        }
    });
    
    // 監聽身分證影本上傳
    const idCardInput = document.getElementById('idCardImage');
    if (idCardInput) {
        idCardInput.addEventListener('change', handleIdCardUpload);
    }
    
    // 監聽身分證反面影本上傳
    const idCardBackInput = document.getElementById('idCardBackImage');
    if (idCardBackInput) {
        idCardBackInput.addEventListener('change', handleIdCardBackUpload);
    }
    
    // 初始計算
    calculateAmounts();
});

// 全域變數儲存身分證影本
let idCardImageData = null;
let idCardBackImageData = null;

// 處理身分證影本上傳 (正面)
function handleIdCardUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    
    // 檢查檔案類型
    if (!file.type.startsWith('image/')) {
        alert('請上傳圖片檔案');
        event.target.value = '';
        return;
    }
    
    // 檢查檔案大小 (限制 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('圖片檔案不能超過 5MB');
        event.target.value = '';
        return;
    }
    
    // 讀取圖片
    const reader = new FileReader();
    reader.onload = function(e) {
        idCardImageData = e.target.result;
        
        // 顯示預覽
        const preview = document.getElementById('idCardPreview');
        const previewImg = document.getElementById('idCardPreviewImg');
        previewImg.src = idCardImageData;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// 移除身分證影本
function removeIdCardImage() {
    idCardImageData = null;
    document.getElementById('idCardImage').value = '';
    document.getElementById('idCardPreview').style.display = 'none';
    document.getElementById('idCardPreviewImg').src = '';
}

// 處理身分證反面影本上傳
function handleIdCardBackUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    
    // 檢查檔案類型
    if (!file.type.startsWith('image/')) {
        alert('請上傳圖片檔案');
        event.target.value = '';
        return;
    }
    
    // 檢查檔案大小 (限制 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('圖片檔案不能超過 5MB');
        event.target.value = '';
        return;
    }
    
    // 讀取圖片
    const reader = new FileReader();
    reader.onload = function(e) {
        idCardBackImageData = e.target.result;
        
        // 顯示預覽
        const preview = document.getElementById('idCardBackPreview');
        const previewImg = document.getElementById('idCardBackPreviewImg');
        previewImg.src = idCardBackImageData;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// 移除身分證反面影本
function removeIdCardBackImage() {
    idCardBackImageData = null;
    document.getElementById('idCardBackImage').value = '';
    document.getElementById('idCardBackPreview').style.display = 'none';
    document.getElementById('idCardBackPreviewImg').src = '';
}

// 監聽申報類別變更
function toggleBusinessType() {
    calculateAmounts();
}

// 四捨五入到整數元
function roundCurrency(amount) {
    return Math.round(amount);
}

// 薪資扣繳稅額表採 10 元為單位；用無條件捨去到 10 元，較接近官方表格呈現。
function floorToTen(amount) {
    return Math.floor(amount / 10) * 10;
}

// 115年度綜合所得稅級距，用於 2026 年給付薪資之扣繳估算。
function calculateProgressiveTax2026(taxableIncome) {
    if (taxableIncome <= 0) return 0;

    const brackets = [
        { limit: 610000, rate: 0.05, deduction: 0 },
        { limit: 1380000, rate: 0.12, deduction: 42700 },
        { limit: 2770000, rate: 0.20, deduction: 153100 },
        { limit: 5190000, rate: 0.30, deduction: 430100 },
        { limit: Infinity, rate: 0.40, deduction: 949100 }
    ];

    const bracket = brackets.find(item => taxableIncome <= item.limit);
    return taxableIncome * bracket.rate - bracket.deduction;
}

// 將月薪對齊官方薪資扣繳表 500 元級距的下限，以貼近官方表格數字。
// 115 年度扣繳表：90,501～91,000、91,001～91,500 ...，各級距以下限計算。
function normalizeSalaryForWithholdingTable(monthlySalary) {
    const threshold = TAX_CONSTANTS.WITHHOLD_RATES.LOCAL['50'].threshold;
    if (monthlySalary < threshold) return monthlySalary;
    return threshold + Math.floor((monthlySalary - threshold) / 500) * 500;
}

// 50 薪資所得：依 115 年度薪資所得扣繳稅額表公式估算。
// 預設無配偶及受扶養親屬 0 人；若要精準處理扶養人數，建議再加 UI 欄位。
function calculateSalaryWithholding2026(monthlySalary) {
    if (monthlySalary <= 0) return 0;
    if (monthlySalary < TAX_CONSTANTS.WITHHOLD_RATES.LOCAL['50'].threshold) return 0;

    const deductionBase = TAX_CONSTANTS.SALARY_WITHHOLDING_YEARLY_DEDUCTION_BASE
        + (TAX_CONSTANTS.SALARY_WITHHOLDING_DEPENDENTS * TAX_CONSTANTS.SALARY_WITHHOLDING_DEPENDENT_DEDUCTION);

    const tableSalary = normalizeSalaryForWithholdingTable(monthlySalary);
    const estimatedAnnualSalary = tableSalary * 12;
    const estimatedTaxableIncome = Math.max(estimatedAnnualSalary - deductionBase, 0);
    const annualTax = calculateProgressiveTax2026(estimatedTaxableIncome);
    const monthlyWithholding = annualTax / 12;

    // 官方表格低於或等於 2,000 元者不列扣繳。
    if (monthlyWithholding <= 2000) return 0;

    return floorToTen(monthlyWithholding);
}

// 計算金額
function calculateAmounts() {
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const incomeType = document.getElementById('incomeType').value;
    const hasNhiExemption = document.getElementById('hasUnion').value === 'yes';
    
    let totalIncome = amount;
    let withholdTax = 0;
    let healthFee = 0;
    
    // 計算扣繳稅額
    const rates = TAX_CONSTANTS.WITHHOLD_RATES.LOCAL;
    
    switch(incomeType) {
        case '50': // 薪資所得
            withholdTax = calculateSalaryWithholding2026(amount);
            break;
        case '9A': // 執行業務所得
            if (amount >= rates['9A'].threshold) {
                withholdTax = roundCurrency(amount * rates['9A'].rate);
            }
            break;
        case '9B': // 稿費
            if (amount >= rates['9B'].threshold) {
                withholdTax = roundCurrency(amount * rates['9B'].rate);
            }
            break;
        case '92': // 其他所得
            // 不扣繳
            break;
    }
    
    // 計算二代健保補充保費
    // 這份表單的 50 薪資所得預設為固定薪資/一般薪資，不處理「非所屬投保單位兼職薪資」的補充保費。
    // 9A/9B 則依單次給付達 20,000 元時試算 2.11%。
    // 若個案符合免扣資格，則不扣補充保費。
    if (!hasNhiExemption && (incomeType === '9A' || incomeType === '9B')) {
        if (amount >= TAX_CONSTANTS.SUPPLEMENTARY_HEALTH_THRESHOLD) {
            healthFee = roundCurrency(amount * TAX_CONSTANTS.SUPPLEMENTARY_HEALTH_RATE);
        }
    }
    
    // 計算實際支付金額
    const netAmount = amount - withholdTax - healthFee;
    
    // 更新顯示
    document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
    document.getElementById('withholdTax').textContent = formatCurrency(withholdTax);
    document.getElementById('healthFee').textContent = formatCurrency(healthFee);
    document.getElementById('netAmount').textContent = formatCurrency(netAmount);
}

// 格式化金額
function formatCurrency(amount) {
    return new Intl.NumberFormat('zh-TW', {
        style: 'currency',
        currency: 'TWD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear() - 1911; // 民國年
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}年${month}月${day}日`;
}

// 取得申報類別說明
function getIncomeTypeDescription(incomeType) {
    const descriptions = {
        'local': {
            '50': '全數計入所得。2026年給付屬115年度所得，本工具依115年度薪資所得扣繳表公式試算，預設無配偶及受扶養親屬0人；薪資所得特別扣除額為22.7萬元。本工具的50薪資所得預設為固定薪資/一般薪資，不計算二代健保補充保費；若為非所屬投保單位給付的兼職薪資，請另行確認補充保費規則。',
            '9A': '執行業務所得。達20,001元，需代扣所得稅10%。單次給付達20,000元，需試算2.11%二代健保補充保費；若符合免扣資格，則不扣補充保費。個人年度申報時可依所屬類別費用率或相關規定計算。',
            '9B': '稿費、版稅、樂譜、作曲、編劇、漫畫及講演鐘點費等。個人年度合計18萬元內免稅，超過部分通常可再按30%費用率計算。達20,001元，需代扣所得稅10%；單次給付達20,000元，需試算2.11%二代健保補充保費；若符合免扣資格，則不扣補充保費。',
            '92': '其他所得。本工具預設不扣繳、不試算2.11%補充保費；實際仍應依所得性質確認。'
        }
    };

    return descriptions['local'][incomeType] || '';
}

// 驗證表單
function validateForm() {
    const requiredFields = [
        'name', 'idNumber', 'address', 'phone',
        'incomeType', 'amount', 'description', 'startDate', 'endDate',
        'fillDate', 'companyName'
    ];
    
    for (const fieldId of requiredFields) {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            alert(`請填寫：${field.previousElementSibling.textContent.replace(' *', '')}`);
            field.focus();
            return false;
        }
    }
    
    // 驗證身分證格式（簡單驗證）
    const idNumber = document.getElementById('idNumber').value.trim();
    if (!/^[A-Z][12]\d{8}$/.test(idNumber)) {
        alert('身分證字號格式不正確');
        document.getElementById('idNumber').focus();
        return false;
    }
    
    // 驗證日期邏輯
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);
    if (endDate < startDate) {
        alert('結束日期不能早於開始日期');
        document.getElementById('endDate').focus();
        return false;
    }
    
    return true;
}

// 生成 PDF
async function generatePDF(event) {
    if (!validateForm()) {
        return;
    }
    
    // 取得表單數據
    const formData = {
        name: document.getElementById('name').value.trim(),
        idNumber: document.getElementById('idNumber').value.trim(),
        hasUnion: document.getElementById('hasUnion').value,
        address: document.getElementById('address').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        incomeType: document.getElementById('incomeType').value,
        amount: parseFloat(document.getElementById('amount').value),
        description: document.getElementById('description').value.trim(),
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        fillDate: document.getElementById('fillDate').value,
        companyName: document.getElementById('companyName').value.trim(),
        paymentMethod: document.getElementById('paymentMethod').value,
        bankName: document.getElementById('bankName').value,
        bankBranch: document.getElementById('bankBranch').value.trim(),
        accountNumber: document.getElementById('accountNumber').value.trim(),
        accountName: document.getElementById('accountName').value.trim()
    };
    
    // 取得計算結果
    const calculations = {
        totalIncome: document.getElementById('totalIncome').textContent,
        withholdTax: document.getElementById('withholdTax').textContent,
        healthFee: document.getElementById('healthFee').textContent,
        netAmount: document.getElementById('netAmount').textContent
    };
    
    // 顯示載入狀態
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '生成中...';
    btn.classList.add('loading');
    btn.disabled = true;
    
    try {
        await createPDFDocument(formData, calculations);
        btn.textContent = originalText;
        btn.classList.remove('loading');
        btn.disabled = false;
    } catch (error) {
        console.error('PDF生成錯誤:', error);
        alert('PDF生成失敗，請稍後再試');
        btn.textContent = originalText;
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// 創建 PDF 文件
async function createPDFDocument(data, calculations) {
    // 填充 PDF 模板
    fillPDFTemplate(data, calculations);
    
    // 取得模板元素
    const template = document.getElementById('pdfTemplate');
    const pdfDocument = template.querySelector('.pdf-document');
    
    // 顯示模板（但在視窗外）
    template.style.display = 'block';
    template.style.position = 'fixed';
    template.style.left = '-9999px';
    template.style.top = '0';
    
    // 等待字體和樣式載入，以及圖片載入
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 使用 html2canvas 轉換為圖片
    const canvas = await html2canvas(pdfDocument, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
    });
    
    // 隱藏模板
    template.style.display = 'none';
    
    // 創建 PDF
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    // A4 尺寸 (mm)
    const pageWidth = 210;
    const pageHeight = 297;
    
    // 計算圖片尺寸
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // 將 canvas 轉為圖片
    const imgData = canvas.toDataURL('image/png');
    
    // 如果內容高度超過一頁，需要分頁
    if (imgHeight > pageHeight) {
        // 計算需要多少頁
        const totalPages = Math.ceil(imgHeight / pageHeight);
        
        // 計算每頁在 canvas 上的高度（像素）
        const pageHeightInPixels = (canvas.width * pageHeight) / pageWidth;
        
        for (let page = 0; page < totalPages; page++) {
            if (page > 0) {
                pdf.addPage();
            }
            
            // 創建臨時 canvas 來裁切當前頁
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            tempCanvas.width = canvas.width;
            tempCanvas.height = Math.min(pageHeightInPixels, canvas.height - (page * pageHeightInPixels));
            
            // 繪製當前頁的內容
            tempCtx.drawImage(
                canvas,
                0,
                page * pageHeightInPixels,
                canvas.width,
                tempCanvas.height,
                0,
                0,
                canvas.width,
                tempCanvas.height
            );
            
            // 轉換為圖片並加入 PDF
            const pageImgData = tempCanvas.toDataURL('image/png');
            const pageImgHeight = (tempCanvas.height * imgWidth) / canvas.width;
            
            pdf.addImage(pageImgData, 'PNG', 0, 0, imgWidth, pageImgHeight);
        }
    } else {
        // 內容在一頁內，直接加入
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    }
    
    // 儲存 PDF
    const fileName = `勞務報酬單_${data.name}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
}

// 填充 PDF 模板資料
function fillPDFTemplate(data, calculations) {
    // 基本資料
    document.getElementById('pdfCompanyName').textContent = data.companyName;
    document.getElementById('pdfFillDate').textContent = formatDate(data.fillDate);
    document.getElementById('pdfNhiExemption').textContent = data.hasUnion === 'yes' ? '是' : '否';
    document.getElementById('pdfName').textContent = data.name;
    document.getElementById('pdfIdNumber').textContent = data.idNumber;
    document.getElementById('pdfAddress').textContent = data.address;
    document.getElementById('pdfPhone').textContent = data.phone;
    
    // 身分證影本
    const idCardSection = document.getElementById('pdfIdCardSection');
    const idCardFrontField = document.getElementById('pdfIdCardFrontField');
    const idCardBackField = document.getElementById('pdfIdCardBackField');
    const idCardImage = document.getElementById('pdfIdCardImage');
    const idCardBackImage = document.getElementById('pdfIdCardBackImage');
    
    let hasIdCard = false;
    
    if (idCardImageData) {
        idCardImage.src = idCardImageData;
        idCardFrontField.style.display = 'block';
        hasIdCard = true;
    } else {
        idCardFrontField.style.display = 'none';
    }
    
    if (idCardBackImageData) {
        idCardBackImage.src = idCardBackImageData;
        idCardBackField.style.display = 'block';
        hasIdCard = true;
    } else {
        idCardBackField.style.display = 'none';
    }
    
    // 顯示或隱藏整個身分證影本區塊
    if (hasIdCard) {
        idCardSection.style.display = 'block';
    } else {
        idCardSection.style.display = 'none';
    }
    
    // 勞務內容
    document.getElementById('pdfDescription').textContent = data.description;
    document.getElementById('pdfStartDate').textContent = formatDate(data.startDate);
    document.getElementById('pdfEndDate').textContent = formatDate(data.endDate);
    
    // 所得類別
    const incomeTypeMap = {
        '50': '50 薪資所得',
        '9A': '9A 執行業務所得',
        '9B': '9B 稿費',
        '92': '92 其他所得'
    };
    document.getElementById('pdfIncomeType').textContent = incomeTypeMap[data.incomeType];
    
    // 注意事項
    const noteText = getIncomeTypeDescription(data.incomeType);
    const noteElement = document.getElementById('pdfNote');
    if (noteText) {
        noteElement.textContent = '注意事項：' + noteText;
        noteElement.style.display = 'block';
    } else {
        noteElement.style.display = 'none';
    }
    
    // 金額
    document.getElementById('pdfTotalIncome').textContent = calculations.totalIncome;
    document.getElementById('pdfWithholdTax').textContent = calculations.withholdTax;
    document.getElementById('pdfHealthFee').textContent = calculations.healthFee;
    document.getElementById('pdfNetAmount').textContent = calculations.netAmount;
    
    // 支付資料
    const paymentSection = document.getElementById('pdfPaymentSection');
    if (data.bankName || data.accountNumber) {
        paymentSection.style.display = 'block';
        document.getElementById('pdfBankName').textContent = data.bankName || '無';
        document.getElementById('pdfBankBranch').textContent = data.bankBranch || '無';
        document.getElementById('pdfAccountNumber').textContent = data.accountNumber || '無';
        document.getElementById('pdfAccountName').textContent = data.accountName || '無';
        
        const paymentMethodMap = {
            'transfer': '匯款',
            'cash': '現金',
            'check': '支票',
            'voucher': '禮券'
        };
        // document.getElementById('pdfPaymentMethod').textContent = paymentMethodMap[data.paymentMethod];
    } else {
        paymentSection.style.display = 'none';
    }
}

// 重設表單
function resetForm() {
    if (confirm('確定要重設表單嗎？所有已填寫的資料將會清除。')) {
        document.querySelectorAll('input, select, textarea').forEach(element => {
            if (element.type === 'checkbox' || element.type === 'radio') {
                element.checked = false;
            } else if (element.type === 'file') {
                element.value = '';
            } else {
                element.value = '';
            }
        });
        
        // 重設身分證影本
        removeIdCardImage();
        removeIdCardBackImage();
        
        // 重新設定預設值
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('fillDate').value = today;
        document.getElementById('hasUnion').value = 'no';
        document.getElementById('incomeType').value = '9A';
        document.getElementById('paymentMethod').value = 'transfer';
        
        // 重新計算
        calculateAmounts();
        
        // 滾動到頂部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// 載入範例資料
function loadSampleData() {
    // 基本資料
    document.getElementById('name').value = '王小明';
    document.getElementById('idNumber').value = 'A123456789';
    document.getElementById('hasUnion').value = 'no';
    document.getElementById('address').value = '台北市信義區信義路五段7號';
    document.getElementById('phone').value = '0912345678';
    
    // 勞報資料
    document.getElementById('incomeType').value = '9A';
    document.getElementById('amount').value = '10000';
    document.getElementById('description').value = 'Dominai Serve 功能開發 / 資安檢測 / 系統維護';
    
    // 設定日期
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 30);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() - 1);
    
    document.getElementById('startDate').value = '2026/05/05';
    document.getElementById('endDate').value = '2026/06/04';
    document.getElementById('fillDate').value = '2026/06/05';
    document.getElementById('companyName').value = '智桓科技有限公司';
    
    // 支付資料
    document.getElementById('paymentMethod').value = 'transfer';
    document.getElementById('bankName').value = '013 國泰世華';
    document.getElementById('bankBranch').value = '營業部';
    document.getElementById('accountNumber').value = '1234567890123';
    document.getElementById('accountName').value = '林小明';
    
    // 觸發執行業務類別顯示
    toggleBusinessType();
    
    // 重新計算
    calculateAmounts();
    
    // 滾動到頂部
    // window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // 顯示提示
    showNotification('已載入範例資料，您可以直接下載 PDF 查看效果');
}

// 顯示通知
function showNotification(message) {
    // 創建通知元素
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // 加入頁面
    document.body.appendChild(notification);
    
    // 觸發動畫
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // 3秒後移除
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}