import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'images');

// Đảm bảo thư mục upload tồn tại
function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

// POST - Upload images
export async function POST(request: NextRequest) {
  try {
    ensureUploadDir();
    
    const formData = await request.formData();
    const files = formData.getAll('images') as File[];
    const eventDate = formData.get('eventDate') as string;
    const eventType = formData.get('eventType') as string;
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Không có file nào được upload' },
        { status: 400 }
      );
    }
    
    // Tạo tên thư mục dựa trên ngày và loại sự kiện
    // Format ngày từ DD/MM/YYYY hoặc MM/YYYY hoặc YYYY sang YYYY-MM-DD
    let dateStr: string;
    if (eventDate) {
      // Parse date string (có thể là DD/MM/YYYY, MM/YYYY, hoặc YYYY)
      const parts = eventDate.split('/');
      if (parts.length === 3) {
        // DD/MM/YYYY -> YYYY-MM-DD
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        dateStr = `${year}-${month}-${day}`;
      } else if (parts.length === 2) {
        // MM/YYYY -> YYYY-MM-01
        const month = parts[0].padStart(2, '0');
        const year = parts[1];
        dateStr = `${year}-${month}-01`;
      } else if (parts.length === 1 && parts[0].length === 4) {
        // YYYY -> YYYY-01-01
        dateStr = `${parts[0]}-01-01`;
      } else {
        // Fallback: dùng ngày hiện tại
        dateStr = new Date().toISOString().split('T')[0];
      }
    } else {
      dateStr = new Date().toISOString().split('T')[0];
    }
    const folderName = `${dateStr}-${eventType || 'other'}`;
    const eventDir = path.join(UPLOAD_DIR, folderName);
    
    if (!existsSync(eventDir)) {
      mkdirSync(eventDir, { recursive: true });
    }
    
    const uploadedFiles = [];
    
    for (const file of files) {
      if (file.size === 0) continue;
      
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Tạo tên file unique
      const timestamp = Date.now();
      const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}-${originalName}`;
      const filePath = path.join(eventDir, fileName);
      
      await writeFile(filePath, buffer);
      
      // Trả về đường dẫn tương đối từ public
      const relativePath = `/images/${folderName}/${fileName}`;
      
      uploadedFiles.push({
        id: timestamp + Math.random(),
        name: file.name,
        path: relativePath,
        type: file.type,
        size: file.size
      });
    }
    
    return NextResponse.json({
      success: true,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json(
      { error: 'Không thể upload file' },
      { status: 500 }
    );
  }
}

