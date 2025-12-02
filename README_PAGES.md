# Hướng dẫn Deploy lên GitHub Pages

## Cách bật GitHub Pages

1. Vào repository trên GitHub: https://github.com/tuannguyen8888/MyTimeline
2. Vào **Settings** → **Pages**
3. Trong phần **Source**, chọn:
   - **Source**: `Deploy from a branch`
   - **Branch**: `gh-pages` (nếu dùng branch) hoặc để GitHub Actions tự động deploy
4. Nếu dùng GitHub Actions (đã được cấu hình):
   - Vào **Settings** → **Pages**
   - **Source**: `GitHub Actions`
   - Workflow sẽ tự động chạy khi push code lên branch `main`

## Truy cập

Sau khi deploy thành công, trang sẽ có sẵn tại:

- `https://tuannguyen8888.github.io/MyTimeline/`

## Lưu ý

- File `public/index.html` sẽ được serve tại root URL
- File `public/data/timeline.json` sẽ có sẵn tại `/data/timeline.json`
- File `public/images/` sẽ có sẵn tại `/images/`
