#!/usr/bin/env python3
import json
import sys

# Dữ liệu mới từ người dùng
new_events = [
    {
        "id": 1764479414449,
        "date": "16/02/2015",
        "dateParsed": {
            "original": "16/02/2015",
            "date": "2015-02-16T05:00:00.000Z",
            "year": 2015,
            "month": 2,
            "day": 16,
            "format": "DD/MM/YYYY"
        },
        "type": "first-meet",
        "title": "Lần đầu gặp mặt ở quê",
        "description": "Khi từ Sài Gòn về quê ăn tết âm lịch năm 2015, tôi dùng tính năng Quét quanh đây của ứng dụng chat Zalo và nhìn thấy Zalo của cô ấy với hình ảnh đại diện rất dễ thương, tôi muốn làm quen nên đã nhắn tin. Rất may cô ấy đã đồng ý kết bạn và trả lời tin nhắn. Sau đó chúng tôi gặp nhau tại một quán cafe ở thị trấn Núi Thành. Hôm sau chúng tôi lại hẹn gặp và từ đó giữ liên lạc nói chuyện với nhau.",
        "location": "Núi Thành, Quảng Nam",
        "witnesses": "Em gái và 2 người bạn của cô ấy",
        "documents": "",
        "images": []
    },
    {
        "id": 1764480368871,
        "date": "19/02/2015",
        "dateParsed": {
            "original": "19/02/2015",
            "date": "2015-02-19T05:00:00.000Z",
            "year": 2015,
            "month": 2,
            "day": 19,
            "format": "DD/MM/YYYY"
        },
        "type": "dating",
        "title": "Đi chơi tết cùng nhau",
        "description": "Những ngày tết âm lịch 2015, chúng tôi đi chơi cùng nhau. Tôi cũng qua nhà cô ấy nhiều lần và có chở cô ấy về nhà tôi.",
        "location": "Núi Thành, Quảng Nam",
        "witnesses": "Gia đình và bạn bè 2 bên",
        "documents": "",
        "images": []
    }
]

# Đọc dữ liệu từ stdin nếu có
if len(sys.argv) > 1 and sys.argv[1] == '--from-stdin':
    input_data = sys.stdin.read()
    try:
        new_events = json.loads(input_data)
    except json.JSONDecodeError as e:
        print(f"Lỗi parse JSON: {e}", file=sys.stderr)
        sys.exit(1)

# Tạo cấu trúc mới
new_data = {
    "timelineEvents": new_events,
    "lastSaved": None,
    "version": "1.0"
}

# Ghi vào file
with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(new_data, f, ensure_ascii=False, indent=2)

print("Đã cập nhật file data.json thành công!")

