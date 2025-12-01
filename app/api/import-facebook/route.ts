import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const FACEBOOK_DIR =
  '/Users/tuannguyen8888/Downloads/facebook-tuannguyen8888-30_11_2025-BPwDyk9R';
const DATA_FILE = path.join(process.cwd(), 'data', 'timeline.json');
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

// GET - Kiểm tra xem có dữ liệu Facebook để import không
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkOnly = searchParams.get('check') === 'true';

    // Kiểm tra xem thư mục Facebook export có tồn tại không
    const hasFacebookData = await fs.pathExists(FACEBOOK_DIR);

    if (checkOnly) {
      return NextResponse.json({
        hasData: hasFacebookData,
      });
    }

    // Nếu không phải check only, trả về thông tin
    return NextResponse.json({
      hasData: hasFacebookData,
      facebookDir: FACEBOOK_DIR,
    });
  } catch (error: any) {
    return NextResponse.json({
      hasData: false,
      error: error.message,
    });
  }
}

// POST - Import events từ Facebook
export async function POST(request: NextRequest) {
  try {
    // Chạy script Python để parse Facebook data và ghi trực tiếp vào timeline.json
    const scriptPath = path.join(process.cwd(), 'import_facebook_events.py');

    const { stdout, stderr } = await execAsync(`python3 "${scriptPath}"`);

    // Log output để debug
    if (stdout) {
      console.log('Script output:', stdout);
    }
    if (stderr && !stderr.includes('Đang đọc')) {
      console.error('Script error:', stderr);
    }

    // Đọc timeline.json sau khi script đã cập nhật
    await fs.ensureDir(path.dirname(DATA_FILE));
    let currentData = { timelineEvents: [], lastSaved: null, version: '1.0' };

    if (await fs.pathExists(DATA_FILE)) {
      currentData = await fs.readJson(DATA_FILE);
    }

    // Đếm số sự kiện mới (so với trước khi chạy script)
    // Script đã tự merge và copy ảnh, nên chỉ cần trả về kết quả
    const totalEvents = currentData.timelineEvents?.length || 0;

    return NextResponse.json({
      success: true,
      message: `Đã import sự kiện từ Facebook vào timeline.json`,
      imported: totalEvents,
      total: totalEvents,
    });
  } catch (error: any) {
    console.error('Error importing Facebook events:', error);
    return NextResponse.json(
      { error: `Không thể import: ${error.message}` },
      { status: 500 }
    );
  }
}
