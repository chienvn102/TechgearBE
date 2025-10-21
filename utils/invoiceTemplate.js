// utils/invoiceTemplate.js
// HTML template for invoice PDF generation

const { numberToVietnamese } = require('./numberToVietnamese');

function generateInvoiceHTML(invoiceData) {
  const {
    order,
    orderInfo,
    customer,
    productOrders,
    voucher,
    paymentStatus,
    paymentMethod,
    company = {
      name: 'TECHGEAR STORE',
      address: '127 Phùng Khoang, Nam Từ Liêm, Hà Nội',
      phone: '0961108937',
      email: 'chienvn102@gmail.com',
      website: 'www.techgear.vn',
      taxCode: '0123456789'
    }
  } = invoiceData;

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate totals
  const subtotal = productOrders.reduce((sum, item) => sum + (item.po_price * item.po_quantity), 0);
  const vat = Math.round(subtotal * 0.1); // 10% VAT
  const discount = voucher ? (voucher.discount_amount || 0) : 0;
  const shippingFee = 0; // Free shipping
  const total = order.order_total;

  // Convert total to words
  const totalInWords = numberToVietnamese(total) + ' đồng chẵn';

  // Get invoice number
  const invoiceNumber = `INV-${order.od_id}`;
  const invoiceDate = formatDate(order.created_at || order.order_datetime);

  // Payment status color
  const getStatusColor = (statusName) => {
    const statusLower = (statusName || '').toLowerCase();
    if (statusLower.includes('đã thanh toán') || statusLower.includes('paid') || statusLower.includes('completed')) {
      return '#10b981'; // green
    } else if (statusLower.includes('chờ') || statusLower.includes('pending')) {
      return '#f59e0b'; // amber
    } else if (statusLower.includes('hủy') || statusLower.includes('failed')) {
      return '#ef4444'; // red
    }
    return '#6b7280'; // gray
  };

  const statusColor = paymentStatus?.color_code || getStatusColor(paymentStatus?.ps_name);

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hóa đơn ${invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: A4;
      margin: 10mm 12mm;
    }
    
    body {
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.4;
      color: #1f2937;
      background: white;
    }
    
    .container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 10px;
    }
    
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #3b82f6;
    }
    
    .company-info {
      flex: 1;
    }
    
    .company-logo {
      font-size: 18pt;
      font-weight: bold;
      color: #3b82f6;
      margin-bottom: 5px;
    }
    
    .company-details {
      font-size: 8pt;
      color: #6b7280;
      line-height: 1.5;
    }
    
    .invoice-info {
      text-align: right;
      flex: 1;
    }
    
    .invoice-title {
      font-size: 22pt;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 5px;
    }
    
    .invoice-number {
      font-size: 10pt;
      color: #3b82f6;
      font-weight: 600;
      margin-bottom: 3px;
    }
    
    .invoice-date {
      font-size: 8pt;
      color: #6b7280;
    }
    
    /* Parties Section */
    .parties {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      gap: 15px;
    }
    
    .party {
      flex: 1;
      padding: 10px;
      background: #f9fafb;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    
    .party-title {
      font-size: 9.5pt;
      font-weight: bold;
      color: #3b82f6;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    
    .party-details {
      font-size: 8.5pt;
      line-height: 1.6;
    }
    
    .party-details strong {
      color: #374151;
      font-weight: 600;
    }
    
    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 8.5pt;
    }
    
    thead {
      background: #3b82f6;
      color: white;
    }
    
    th {
      padding: 8px 5px;
      text-align: left;
      font-weight: 600;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    td {
      padding: 6px 5px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    .product-name {
      font-weight: 600;
      color: #1f2937;
    }
    
    .product-meta {
      font-size: 7.5pt;
      color: #6b7280;
      margin-top: 2px;
    }
    
    /* Summary Section */
    .summary {
      margin-left: auto;
      width: 350px;
      margin-bottom: 15px;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      border-bottom: 1px solid #e5e7eb;
      font-size: 8.5pt;
    }
    
    .summary-row.total {
      border-top: 2px solid #3b82f6;
      border-bottom: 2px solid #3b82f6;
      padding: 8px 0;
      margin-top: 5px;
      font-size: 11pt;
      font-weight: bold;
      color: #3b82f6;
    }
    
    .summary-label {
      color: #6b7280;
    }
    
    .summary-value {
      font-weight: 600;
      color: #1f2937;
    }
    
    .total-in-words {
      background: #f0f9ff;
      padding: 8px;
      border-radius: 6px;
      margin-bottom: 12px;
      font-size: 8.5pt;
      font-style: italic;
      color: #1e40af;
      border-left: 3px solid #3b82f6;
    }
    
    /* Notes */
    .notes {
      background: #fffbeb;
      padding: 10px;
      border-radius: 6px;
      margin-bottom: 12px;
      border-left: 3px solid #f59e0b;
    }
    
    .notes-title {
      font-weight: 600;
      color: #92400e;
      margin-bottom: 5px;
      font-size: 8.5pt;
    }
    
    .notes-content {
      color: #78350f;
      font-size: 8pt;
    }
    
    /* Footer */
    .footer {
      margin-top: 15px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      font-size: 7.5pt;
      color: #6b7280;
      text-align: center;
    }
    
    .footer-sections {
      display: flex;
      justify-content: space-between;
      margin-top: 15px;
      margin-bottom: 10px;
    }
    
    .signature-box {
      text-align: center;
      flex: 1;
    }
    
    .signature-title {
      font-weight: 600;
      color: #374151;
      margin-bottom: 40px;
      font-size: 8.5pt;
    }
    
    .signature-line {
      border-top: 1px solid #9ca3af;
      padding-top: 5px;
      font-style: italic;
      font-size: 7.5pt;
    }
    
    .terms {
      margin-top: 10px;
      padding: 8px;
      background: #f9fafb;
      border-radius: 6px;
      line-height: 1.5;
      font-size: 7.5pt;
    }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .container {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <div class="company-logo">${company.name}</div>
        <div class="company-details">
          <div><strong>Địa chỉ:</strong> ${company.address}</div>
          <div><strong>ĐT:</strong> ${company.phone} | <strong>Email:</strong> ${company.email}</div>
          ${company.taxCode ? `<div><strong>MST:</strong> ${company.taxCode}</div>` : ''}
        </div>
      </div>
      
      <div class="invoice-info">
        <div class="invoice-title">HÓA ĐƠN</div>
        <div class="invoice-number">${invoiceNumber}</div>
        <div class="invoice-date">Ngày: ${invoiceDate}</div>
      </div>
    </div>
    
    <!-- Parties -->
    <div class="parties">
      <!-- Seller -->
      <div class="party">
        <div class="party-title">Bên bán</div>
        <div class="party-details">
          <div><strong>Đơn vị:</strong> ${company.name}</div>
          ${company.taxCode ? `<div><strong>MST:</strong> ${company.taxCode}</div>` : ''}
          <div><strong>ĐT:</strong> ${company.phone}</div>
        </div>
      </div>
      
      <!-- Buyer -->
      <div class="party">
        <div class="party-title">Bên mua</div>
        <div class="party-details">
          <div><strong>Họ tên:</strong> ${customer?.name || order.customer_name || 'N/A'}</div>
          <div><strong>SĐT:</strong> ${customer?.phone_number || 'N/A'}</div>
          <div><strong>Địa chỉ:</strong> ${order.shipping_address || 'N/A'}</div>
        </div>
      </div>
    </div>
    
    <!-- Products Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 30px;">STT</th>
          <th>Tên sản phẩm</th>
          <th style="width: 100px;">SKU</th>
          <th style="width: 50px;" class="text-center">SL</th>
          <th style="width: 100px;" class="text-right">Đơn giá</th>
          <th style="width: 120px;" class="text-right">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        ${productOrders.map((item, index) => {
          const product = item.pd_id || {};
          const brand = product.br_id || {};
          const productType = product.pdt_id || {};
          
          const itemTotal = item.po_price * item.po_quantity;
          
          return `
            <tr>
              <td class="text-center">${index + 1}</td>
              <td>
                <div class="product-name">${product.pd_name || 'N/A'}</div>
                <div class="product-meta">
                  ${brand.br_name ? `${brand.br_name}` : ''}${brand.br_name && productType.pdt_name ? ' • ' : ''}${productType.pdt_name || ''}
                </div>
              </td>
              <td>${product.pd_id || 'N/A'}</td>
              <td class="text-center">${item.po_quantity}</td>
              <td class="text-right">${formatCurrency(item.po_price)}</td>
              <td class="text-right">${formatCurrency(itemTotal)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    
    <!-- Summary -->
    <div class="summary">
      <div class="summary-row">
        <span class="summary-label">Tạm tính:</span>
        <span class="summary-value">${formatCurrency(subtotal)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">VAT (10%):</span>
        <span class="summary-value">${formatCurrency(vat)}</span>
      </div>
      ${voucher ? `
        <div class="summary-row">
          <span class="summary-label">Giảm giá (${voucher.voucher_code}):</span>
          <span class="summary-value" style="color: #ef4444;">-${formatCurrency(discount)}</span>
        </div>
      ` : ''}
      <div class="summary-row">
        <span class="summary-label">Phí vận chuyển:</span>
        <span class="summary-value" style="color: #10b981;">Miễn phí</span>
      </div>
      <div class="summary-row total">
        <span>TỔNG CỘNG:</span>
        <span>${formatCurrency(total)}</span>
      </div>
    </div>
    
    <!-- Total in words -->
    <div class="total-in-words">
      <strong>Tổng tiền (bằng chữ):</strong> ${totalInWords}
    </div>
    
    <!-- Payment Method -->
    <div class="notes">
      <div class="notes-title">Phương thức thanh toán: ${paymentMethod?.pm_name || 'N/A'}</div>
      ${order.order_note ? `<div class="notes-content"><strong>Ghi chú:</strong> ${order.order_note}</div>` : ''}
    </div>
    
    <!-- Signatures -->
    <div class="footer-sections">
      <div class="signature-box">
        <div class="signature-title">Người mua hàng</div>
        <div class="signature-line">(Ký, ghi rõ họ tên)</div>
      </div>
      <div class="signature-box">
        <div class="signature-title">Người bán hàng</div>
        <div class="signature-line">(Ký, ghi rõ họ tên)</div>
      </div>
    </div>
    
    <!-- Footer Terms -->
    <div class="footer">
      <div class="terms">
        <strong>Chính sách đổi trả:</strong> Sản phẩm được đổi/trả trong 7 ngày. Phải còn nguyên tem, hộp, chưa qua sử dụng. Xuất trình hóa đơn khi đổi/trả.
      </div>
      <div style="margin-top: 8px; font-style: italic;">
        Cảm ơn quý khách! | Hotline: ${company.phone} | ${company.email}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

module.exports = { generateInvoiceHTML };
