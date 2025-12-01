import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';

// DELETE - Xóa ảnh từ server
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imagePath = searchParams.get('path');

    if (!imagePath) {
      return NextResponse.json(
        { error: 'Thiếu đường dẫn ảnh' },
        { status: 400 }
      );
    }

    // Đảm bảo đường dẫn là relative và bắt đầu với /images/
    if (!imagePath.startsWith('/images/')) {
      return NextResponse.json(
        { error: 'Đường dẫn ảnh không hợp lệ' },
        { status: 400 }
      );
    }

    // Tạo đường dẫn đầy đủ đến file
    const fullPath = path.join(process.cwd(), 'public', imagePath);

    // Kiểm tra file có tồn tại không
    if (!(await fs.pathExists(fullPath))) {
      return NextResponse.json(
        { error: 'File ảnh không tồn tại' },
        { status: 404 }
      );
    }

    // Xóa file
    await fs.remove(fullPath);

    // Kiểm tra xem thư mục có còn file nào không, nếu không thì xóa thư mục
    const dirPath = path.dirname(fullPath);
    const files = await fs.readdir(dirPath);
    if (files.length === 0) {
      await fs.remove(dirPath);
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xóa ảnh thành công',
    });
  } catch (error: any) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: `Không thể xóa ảnh: ${error.message}` },
      { status: 500 }
    );
  }
}

