# Timeline Ứng Dụng - Hồ Sơ Bảo Lãnh Định Cư Mỹ

Ứng dụng web quản lý timeline mối quan hệ cho hồ sơ bảo lãnh định cư Mỹ, được xây dựng với Next.js.

## Tính năng

- ✅ Thêm, sửa, xóa sự kiện timeline
- ✅ Upload và lưu hình ảnh trên server
- ✅ Tự động lưu dữ liệu vào file JSON trên server
- ✅ Hỗ trợ nhiều định dạng ngày tháng (DD/MM/YYYY, MM/YYYY, YYYY)
- ✅ Giao diện đẹp, responsive
- ✅ Xem ảnh full size

## Cài đặt

1. Cài đặt dependencies:
```bash
yarn install
```

2. Chạy ứng dụng ở chế độ development:
```bash
yarn dev
```

3. Mở trình duyệt và truy cập: [http://localhost:3000](http://localhost:3000)

## Cấu trúc dự án

```
timeline/
├── app/
│   ├── api/
│   │   ├── timeline/      # API endpoints cho timeline events
│   │   └── upload/        # API endpoint để upload images
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Trang chính
├── public/
│   └── images/            # Thư mục lưu hình ảnh (tự động tạo)
├── data/
│   └── timeline.json      # File lưu dữ liệu timeline (tự động tạo)
└── package.json
```

## API Endpoints

### GET /api/timeline
Lấy tất cả timeline events

### POST /api/timeline
Lưu timeline events
Body: `{ timelineEvents: [...] }`

### POST /api/upload
Upload hình ảnh
FormData: `images`, `eventDate`, `eventType`

## Production Build

```bash
yarn build
yarn start
```

## Lưu ý

- Dữ liệu được lưu trong `data/timeline.json`
- Hình ảnh được lưu trong `public/images/` theo cấu trúc: `{YYYY-MM-DD}-{eventType}/{filename}`
- Đảm bảo thư mục `data` và `public/images` có quyền ghi
