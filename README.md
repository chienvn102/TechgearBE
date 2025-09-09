# E-commerce Backend API

## Mô tả dự án

Backend API cho hệ thống E-commerce được xây dựng với Node.js, Express.js và MongoDB.

## Công nghệ sử dụng

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB Atlas
- **ODM**: Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Image Storage**: Cloudinary
- **Security**: bcryptjs, cors, helmet
- **Validation**: express-validator
- **File Upload**: multer

## Yêu cầu hệ thống

- Node.js 18.0 hoặc cao hơn
- MongoDB 5.0 hoặc cao hơn
- npm 8.0 hoặc cao hơn

## Cài đặt và chạy dự án

### 1. Clone repository
```bash
git clone <repository-url>
cd duan_backend
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình môi trường
Tạo file `.env` trong thư mục root:
```env
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1

# MongoDB Configuration
MONGODB_URI=mongodb+srv://chienvn102:chienvn102@sanshiliu.xdy1ogg.mongodb.net/?retryWrites=true&w=majority&appName=sanshiliu
DATABASE_NAME=ecommerce_system

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=dqpo9h5s2
CLOUDINARY_API_KEY=992736514345364
CLOUDINARY_API_SECRET=2k7t5_qpL3CQgJ0WS9AV4YL8j7Y

# Storage Configuration
STORAGE_METHOD=cloudinary
```

### 4. Chạy ứng dụng
```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server sẽ chạy tại: `http://localhost:3000`

## Cấu trúc Database

Hệ thống sử dụng 30 collections MongoDB:

### Core Collections
- `user_management` - Quản lý admin/staff users
- `user_customer` - Quản lý customer users  
- `customer` - Thông tin chi tiết khách hàng
- `role` - Phân quyền hệ thống
- `permission` - Quyền hạn chi tiết

### Product Management
- `product` - Sản phẩm
- `product_type` - Loại sản phẩm
- `brand` - Thương hiệu
- `category` - Danh mục
- `product_image` - Hình ảnh sản phẩm
- `player` - Người chơi/Influencer
- `product_player` - Liên kết sản phẩm-player

### Order Management
- `order` - Đơn hàng
- `product_order` - Chi tiết sản phẩm trong đơn hàng
- `order_info` - Thông tin đơn hàng
- `payment_method` - Phương thức thanh toán
- `payment_status` - Trạng thái thanh toán
- `order_payment_log` - Lịch sử thanh toán

### Customer Features
- `customer_address` - Địa chỉ khách hàng
- `customer_ranking` - Xếp hạng khách hàng
- `ranking` - Thông tin cấp bậc
- `voucher` - Mã giảm giá
- `voucher_usage` - Lịch sử sử dụng voucher
- `product_review` - Đánh giá sản phẩm

### System Features
- `notification` - Thông báo
- `banner` - Banner quảng cáo
- `post` - Bài viết
- `audit_trail` - Lịch sử thao tác
- `role_permission` - Phân quyền chi tiết
- `user_addresses` - Địa chỉ user admin

## Xác thực và Phân quyền

### JWT Authentication
- Access Token: 7 ngày
- Refresh Token: 30 ngày
- Hash Password: bcryptjs

### User Roles
- `ADMIN`: Quản trị viên cao cấp
- `MANAGER`: Quản lý cửa hàng
- `STAFF`: Nhân viên
- `USER`: Khách hàng thường

### Protected Routes
```javascript
// Chỉ admin
GET /api/v1/admin/*

// Admin và Manager
GET /api/v1/management/*

// Authenticated users
GET /api/v1/profile
PUT /api/v1/profile
```

## 📡 API Endpoints

### Base URL: `http://localhost:3000/api/v1`

### Authentication
```
POST   /auth/login              # Đăng nhập
POST   /auth/register           # Đăng ký khách hàng
POST   /auth/refresh            # Làm mới token
POST   /auth/logout             # Đăng xuất
```

### User Management (Admin)
```
GET    /user-management         # Danh sách users
POST   /user-management         # Tạo user mới
GET    /user-management/:id     # Chi tiết user
PUT    /user-management/:id     # Cập nhật user
DELETE /user-management/:id     # Xóa user
```

### Products
```
GET    /products                # Danh sách sản phẩm
POST   /products                # Tạo sản phẩm (Admin)
GET    /products/:id            # Chi tiết sản phẩm
PUT    /products/:id            # Cập nhật sản phẩm (Admin)
DELETE /products/:id            # Xóa sản phẩm (Admin)
GET    /products/search         # Tìm kiếm sản phẩm
```

### Categories
```
GET    /categories              # Danh sách danh mục
POST   /categories              # Tạo danh mục (Admin)
GET    /categories/:id          # Chi tiết danh mục
PUT    /categories/:id          # Cập nhật danh mục (Admin)
DELETE /categories/:id          # Xóa danh mục (Admin)
```

### Brands
```
GET    /brands                  # Danh sách thương hiệu
POST   /brands                  # Tạo thương hiệu (Admin)
GET    /brands/:id              # Chi tiết thương hiệu
PUT    /brands/:id              # Cập nhật thương hiệu (Admin)
DELETE /brands/:id              # Xóa thương hiệu (Admin)
```

### Product Types
```
GET    /product-types           # Danh sách loại sản phẩm
POST   /product-types           # Tạo loại sản phẩm (Admin)
GET    /product-types/:id       # Chi tiết loại sản phẩm
PUT    /product-types/:id       # Cập nhật loại sản phẩm (Admin)
DELETE /product-types/:id       # Xóa loại sản phẩm (Admin)
```

### Players
```
GET    /players                 # Danh sách players
POST   /players                 # Tạo player (Admin)
GET    /players/:id             # Chi tiết player
PUT    /players/:id             # Cập nhật player (Admin)
DELETE /players/:id             # Xóa player (Admin)
```

### Orders
```
GET    /orders                  # Danh sách đơn hàng
POST   /orders                  # Tạo đơn hàng
GET    /orders/:id              # Chi tiết đơn hàng
PUT    /orders/:id              # Cập nhật đơn hàng
DELETE /orders/:id              # Hủy đơn hàng
```

### Customers
```
GET    /customers               # Danh sách khách hàng (Admin)
POST   /customers               # Tạo khách hàng
GET    /customers/:id           # Chi tiết khách hàng
PUT    /customers/:id           # Cập nhật khách hàng
DELETE /customers/:id           # Xóa khách hàng (Admin)
```

### Vouchers
```
GET    /vouchers                # Danh sách voucher
POST   /vouchers                # Tạo voucher (Admin)
GET    /vouchers/:id            # Chi tiết voucher
PUT    /vouchers/:id            # Cập nhật voucher (Admin)
DELETE /vouchers/:id            # Xóa voucher (Admin)
```

### Image Upload (Cloudinary)
```
POST   /upload/brand/:id        # Upload ảnh thương hiệu
POST   /upload/player/:id       # Upload ảnh player
POST   /upload/product/:id      # Upload ảnh sản phẩm
POST   /upload/product-type/:id # Upload ảnh loại sản phẩm
DELETE /upload/:collection/:id  # Xóa ảnh
```

### System
```
GET    /health                  # Kiểm tra trạng thái hệ thống
GET    /info                    # Thông tin API
```

## Cấu trúc Project

```
duan_backend/
├── config/                  # Cấu hình hệ thống
│   ├── database.js         # MongoDB connection
│   ├── multer.config.js    # File upload config
│   └── index.js           # Tổng hợp config
├── controllers/            # Business logic controllers
├── middleware/             # Express middleware
│   ├── auth.js            # Authentication
│   ├── validation.js      # Input validation
│   └── errorHandler.js    # Error handling
├── models/                 # Mongoose schemas
├── routes/                 # API routes
├── services/               # Business services
│   ├── cloudinaryService.js
│   └── storageService.js
├── utils/                  # Utility functions
├── validators/             # Input validators
├── server.js              # Main server file
└── package.json           # Dependencies
```

## API Testing

### Sử dụng Postman

1. Import collection từ file `postman_collection.json`
2. Thiết lập environment variables:
   - `baseUrl`: `http://localhost:3000/api/v1`
   - `authToken`: JWT token sau khi login

### Test Authentication
```bash
# Login admin
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Test protected endpoint
curl -X GET http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Deployment

### Environment Variables Production
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-super-secure-production-jwt-secret
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

### Build và Deploy
```bash
# Install production dependencies
npm ci --production

# Start production server
npm start
```

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Success message"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    // Validation errors if any
  ]
}
```

### Pagination Response
```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

## 🛡 Security Features

- JWT Authentication
- Password hashing (bcryptjs)
- CORS protection
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection
- Security headers (helmet)


