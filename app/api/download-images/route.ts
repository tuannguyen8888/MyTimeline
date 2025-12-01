import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

// POST - Tạo file zip chứa các ảnh của sự kiện
export async function POST(request: NextRequest) {
  try {
    const { images, eventTitle, eventDate } = await request.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'Không có ảnh nào để download' },
        { status: 400 }
      );
    }

    // Tạo tên file zip an toàn
    const safeTitle = (eventTitle || 'event')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    const safeDate = (eventDate || 'unknown')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 20);
    const zipFileName = `${safeDate}_${safeTitle}.zip`;

    // Tạo stream để ghi zip
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Compression level
    });

    // Thêm từng ảnh vào zip
    let addedCount = 0;
    for (const img of images) {
      if (!img.path) continue;

      const imagePath = path.join(process.cwd(), 'public', img.path);
      
      try {
        if (await fs.pathExists(imagePath)) {
          // Lấy tên file gốc hoặc tạo tên mới
          const fileName = img.name || path.basename(img.path);
          archive.file(imagePath, { name: fileName });
          addedCount++;
        }
      } catch (error) {
        console.error(`Error adding image ${img.path} to zip:`, error);
      }
    }

    if (addedCount === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy ảnh nào để download' },
        { status: 404 }
      );
    }

    // Tạo response với stream
    const chunks: Buffer[] = [];
    
    archive.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    // Chờ archive hoàn thành
    await new Promise<void>((resolve, reject) => {
      archive.on('end', () => resolve());
      archive.on('error', (err) => reject(err));
      archive.finalize();
    });

    const zipBuffer = Buffer.concat(chunks);

    // Trả về file zip
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error creating zip file:', error);
    return NextResponse.json(
      { error: `Không thể tạo file zip: ${error.message}` },
      { status: 500 }
    );
  }
}

