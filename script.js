// 台灣稅法常數 (2025年)
const TAX_CONSTANTS = {
    SALARY_SPECIAL_DEDUCTION: 218000, // 薪資特別扣除額
    ARTICLE_9B_EXEMPTION: 180000, // 9B稿費免稅額
    ARTICLE_9B_EXPENSE_RATE: 0.30, // 9B稿費費用率
    SUPPLEMENTARY_HEALTH_RATE: 0.0211, // 二代健保補充保費率
    MIN_WAGE: 28590, // 基本工資 (2024年)
    
    // 扣繳率
    WITHHOLD_RATES: {
        LOCAL: {
            '50': { threshold: 88501, rate: 0.05 },
            '9A': { threshold: 20001, rate: 0.10 },
            '9B': { threshold: 20001, rate: 0.10 },
            '92': { threshold: Infinity, rate: 0 }
        },
        FOREIGN_UNDER_183: {
            '50': { threshold: 42885, lowRate: 0.06, highRate: 0.18 },
            '9A': { threshold: 0, rate: 0.20 },
            '9B': { threshold: 5000, rate: 0.20 },
            '92': { threshold: 0, rate: 0.20 }
        },
        FOREIGN_OVER_183: {
            // 視同本國人
            '50': { threshold: 88501, rate: 0.05 },
            '9A': { threshold: 20001, rate: 0.10 },
            '9B': { threshold: 20001, rate: 0.10 },
            '92': { threshold: Infinity, rate: 0 }
        }
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
    const calcTriggers = ['amount', 'incomeType', 'nationality', 'hasUnion', 'businessType'];
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

// 顯示/隱藏執行業務類別
function toggleBusinessType() {
    const incomeType = document.getElementById('incomeType').value;
    const businessTypeGroup = document.getElementById('businessTypeGroup');
    
    // if (incomeType === '9A') {
    //     businessTypeGroup.style.display = 'block';
    // } else {
    //     businessTypeGroup.style.display = 'none';
    // }
    
    calculateAmounts();
}

// 計算金額
function calculateAmounts() {
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const incomeType = document.getElementById('incomeType').value;
    const nationality = document.getElementById('nationality').value;
    const hasUnion = document.getElementById('hasUnion').value === 'yes';
    const businessType = document.getElementById('businessType').value;
    
    let totalIncome = amount;
    let withholdTax = 0;
    let healthFee = 0;
    
    // 計算扣繳稅額
    if (nationality === 'local' || nationality === 'foreign_over_183') {
        // 本國人或外國人滿183天
        const rates = TAX_CONSTANTS.WITHHOLD_RATES.LOCAL;
        
        switch(incomeType) {
            case '50': // 薪資所得
                if (amount >= rates['50'].threshold) {
                    withholdTax = amount * rates['50'].rate;
                }
                break;
            case '9A': // 執行業務所得
                if (amount >= rates['9A'].threshold) {
                    withholdTax = amount * rates['9A'].rate;
                }
                break;
            case '9B': // 稿費
                if (amount >= rates['9B'].threshold) {
                    withholdTax = amount * rates['9B'].rate;
                }
                break;
            case '92': // 其他所得
                // 不扣繳
                break;
        }
    } else if (nationality === 'foreign_under_183') {
        // 外國人未滿183天
        const rates = TAX_CONSTANTS.WITHHOLD_RATES.FOREIGN_UNDER_183;
        
        switch(incomeType) {
            case '50': // 薪資所得
                if (amount <= rates['50'].threshold) {
                    withholdTax = amount * rates['50'].lowRate;
                } else {
                    withholdTax = amount * rates['50'].highRate;
                }
                break;
            case '9A': // 執行業務所得
                withholdTax = amount * rates['9A'].rate;
                break;
            case '9B': // 稿費
                if (amount > rates['9B'].threshold) {
                    withholdTax = amount * rates['9B'].rate;
                }
                break;
            case '92': // 其他所得
                withholdTax = amount * rates['92'].rate;
                break;
        }
    }
    
    // 計算二代健保補充保費
    if (!hasUnion && incomeType !== '92') {
        if (incomeType === '50') {
            // 薪資所得：達基本工資才扣
            if (amount >= TAX_CONSTANTS.MIN_WAGE) {
                healthFee = amount * TAX_CONSTANTS.SUPPLEMENTARY_HEALTH_RATE;
            }
        } else if (incomeType === '9A' || incomeType === '9B') {
            // 執行業務或稿費：達20,000才扣
            if (amount >= 20000) {
                healthFee = amount * TAX_CONSTANTS.SUPPLEMENTARY_HEALTH_RATE;
            }
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

// 取得國籍文字
function getNationalityText(value) {
    const map = {
        'local': '本國籍',
        'foreign_under_183': '外國籍在台未滿 183 天',
        'foreign_over_183': '外國籍在台滿 183 天'
    };
    return map[value] || value;
}

// 取得申報類別說明
function getIncomeTypeDescription(incomeType, nationality) {
    const descriptions = {
        'local': {
            '50': '全數計入所得，但可扣除薪資特別扣除額(114年為21.8萬元)。達88,501元，須代扣所得稅5%。金額達基本工資(114年為28,590元)，須負擔2.11%補充保費。提供職業工會的健保加保證明，不須扣2.11%補充保費。',
            '9A': '無免稅額，扣除所屬類別費用率後計入個人所得。達20,001元，需代扣所得稅10%與扣繳2.11%補充保費。達20,000元，需扣繳2.11%補充保費。提供職業工會的健保加保證明，不須扣2.11%補充保費。',
            '9B': '可先扣18萬免稅額，再扣除30%費用後計入個人所得。達20,001元，需代扣所得稅10%與扣繳2.11%補充保費。達20,000元，需扣繳2.11%補充保費。提供職業工會的健保加保證明，不須扣2.11%補充保費。',
            '92': '不須扣繳、不須2.11%補充保費。'
        },
        'foreign': {
            '50': '114年薪資42,885元以下扣繳6%、逾42,885元扣繳18%。',
            '9A': '均須扣繳20%。',
            '9B': '領款金額不超過5,000元不須扣繳，逾5,000元須扣繳20%。',
            '92': '均須扣繳20%。'
        }
    };
    
    const category = (nationality === 'foreign_under_183') ? 'foreign' : 'local';
    return descriptions[category][incomeType] || '';
}

// 驗證表單
function validateForm() {
    const requiredFields = [
        'name', 'nationality', 'idNumber', 'address', 'phone',
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
async function generatePDF() {
    if (!validateForm()) {
        return;
    }
    
    // 取得表單數據
    const formData = {
        name: document.getElementById('name').value.trim(),
        nationality: document.getElementById('nationality').value,
        idNumber: document.getElementById('idNumber').value.trim(),
        hasHealthInsurance: document.getElementById('hasHealthInsurance').value,
        hasUnion: document.getElementById('hasUnion').value,
        address: document.getElementById('address').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        incomeType: document.getElementById('incomeType').value,
        businessType: document.getElementById('businessType').value,
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
    document.getElementById('pdfNationality').textContent = getNationalityText(data.nationality);
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
    const noteText = getIncomeTypeDescription(data.incomeType, data.nationality);
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
        document.getElementById('nationality').value = 'local';
        document.getElementById('hasHealthInsurance').value = 'no';
        document.getElementById('hasUnion').value = 'no';
        document.getElementById('incomeType').value = '9B';
        document.getElementById('paymentMethod').value = 'transfer';
        
        // 隱藏執行業務類別
        document.getElementById('businessTypeGroup').style.display = 'none';
        
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
    document.getElementById('nationality').value = 'local';
    document.getElementById('idNumber').value = 'A123456789';
    document.getElementById('hasHealthInsurance').value = 'no';
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
    
    document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
    document.getElementById('fillDate').value = today.toISOString().split('T')[0];
    document.getElementById('companyName').value = '域嘉有限公司';
    
    // 支付資料
    document.getElementById('paymentMethod').value = 'transfer';
    document.getElementById('bankName').value = '808 玉山銀行';
    document.getElementById('bankBranch').value = '營業部';
    document.getElementById('accountNumber').value = '1234567890123';
    document.getElementById('accountName').value = '王小明';
    
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
