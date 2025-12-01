import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'timeline.json');

// Đảm bảo thư mục data tồn tại
async function ensureDataDir() {
  const dataDir = path.dirname(DATA_FILE);
  await fs.ensureDir(dataDir);
}

// GET - Lấy tất cả timeline events
export async function GET() {
  try {
    await ensureDataDir();
    
    if (await fs.pathExists(DATA_FILE)) {
      const data = await fs.readJson(DATA_FILE);
      return NextResponse.json(data);
    } else {
      // Tạo file mới nếu chưa có
      const initialData = {
        timelineEvents: [],
        lastSaved: new Date().toISOString(),
        version: '1.0'
      };
      await fs.writeJson(DATA_FILE, initialData, { spaces: 2 });
      return NextResponse.json(initialData);
    }
  } catch (error) {
    console.error('Error reading timeline data:', error);
    return NextResponse.json(
      { error: 'Không thể đọc dữ liệu' },
      { status: 500 }
    );
  }
}

// POST - Lưu timeline events
export async function POST(request: NextRequest) {
  try {
    await ensureDataDir();
    
    const body = await request.json();
    const { timelineEvents } = body;
    
    if (!Array.isArray(timelineEvents)) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }
    
    const data = {
      timelineEvents,
      lastSaved: new Date().toISOString(),
      version: '1.0'
    };
    
    await fs.writeJson(DATA_FILE, data, { spaces: 2 });
    
    return NextResponse.json({ 
      success: true,
      message: 'Đã lưu thành công',
      lastSaved: data.lastSaved
    });
  } catch (error) {
    console.error('Error saving timeline data:', error);
    return NextResponse.json(
      { error: 'Không thể lưu dữ liệu' },
      { status: 500 }
    );
  }
}

