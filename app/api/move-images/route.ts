import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';

// POST - Di chuyển ảnh từ thư mục cũ sang thư mục mới
export async function POST(request: NextRequest) {
  try {
    const { images, oldDate, oldType, newDate, newType } = await request.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Không có ảnh nào cần di chuyển',
        movedImages: [],
      });
    }

    // Tạo tên thư mục cũ và mới
    const formatDateForFolder = (dateStr: string) => {
      if (!dateStr) return '';
      // Nếu date là DD/MM/YYYY, convert sang YYYY-MM-DD
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      // Nếu đã là YYYY-MM-DD hoặc ISO format
      if (dateStr.includes('-')) {
        return dateStr.split('T')[0].split(' ')[0];
      }
      return dateStr;
    };

    const oldDateFormatted = formatDateForFolder(oldDate);
    const newDateFormatted = formatDateForFolder(newDate);

    const oldFolderName = `${oldDateFormatted}-${oldType || 'other'}`;
    const newFolderName = `${newDateFormatted}-${newType || 'other'}`;

    const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');
    const oldDir = path.join(IMAGES_DIR, oldFolderName);
    const newDir = path.join(IMAGES_DIR, newFolderName);

    // Nếu thư mục cũ và mới giống nhau, không cần di chuyển
    if (oldFolderName === newFolderName) {
      return NextResponse.json({
        success: true,
        message: 'Thư mục không thay đổi',
        movedImages: images,
      });
    }

    // Tạo thư mục mới nếu chưa có
    await fs.ensureDir(newDir);

    const movedImages = [];

    // Di chuyển từng ảnh
    for (const img of images) {
      if (!img.path) continue;

      // Lấy tên file từ đường dẫn cũ
      const fileName = path.basename(img.path);
      const oldFilePath = path.join(IMAGES_DIR, img.path.replace('/images/', ''));
      const newFilePath = path.join(newDir, fileName);

      try {
        // Kiểm tra file cũ có tồn tại không
        if (await fs.pathExists(oldFilePath)) {
          // Di chuyển file
          await fs.move(oldFilePath, newFilePath, { overwrite: true });
          
          // Cập nhật đường dẫn
          movedImages.push({
            ...img,
            path: `/images/${newFolderName}/${fileName}`,
          });
        } else {
          // Nếu file không tồn tại, giữ nguyên đường dẫn
          movedImages.push(img);
        }
      } catch (error: any) {
        console.error(`Error moving image ${fileName}:`, error);
        // Nếu lỗi, giữ nguyên đường dẫn
        movedImages.push(img);
      }
    }

    // Xóa thư mục cũ nếu rỗng
    try {
      const files = await fs.readdir(oldDir);
      if (files.length === 0) {
        await fs.remove(oldDir);
      }
    } catch (error) {
      // Thư mục không tồn tại hoặc không thể xóa, bỏ qua
    }

    return NextResponse.json({
      success: true,
      message: `Đã di chuyển ${movedImages.length} ảnh sang thư mục mới`,
      movedImages,
    });
  } catch (error: any) {
    console.error('Error moving images:', error);
    return NextResponse.json(
      { error: `Không thể di chuyển ảnh: ${error.message}` },
      { status: 500 }
    );
  }
}

