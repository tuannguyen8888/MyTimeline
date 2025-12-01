#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script để import sự kiện từ Facebook export vào Timeline
Phân tích ngữ cảnh để chỉ chọn sự kiện thực sự liên quan đến mối quan hệ
"""

import json
import os
import re
from datetime import datetime
from pathlib import Path

# Đường dẫn thư mục Facebook export
FACEBOOK_DIR = "/Users/tuannguyen8888/Downloads/facebook-tuannguyen8888-30_11_2025-BPwDyk9R"

# Tên vợ để nhận diện
WIFE_NAMES = ["nương nương", "nuong nuong", "nuongnuong", "vợ yêu", "vo yeu", "em yêu", "em yeu"]

# Tên con để nhận diện
CHILDREN_NAMES = ["bee", "sam", "con trai", "con gái", "con gai", "son", "daughter"]

# Từ khóa loại trừ (spam, quảng cáo)
EXCLUDE_KEYWORDS = [
    "vnreview", "lenovo", "vibe", "vob", "lvs", "ls", "lvx",  # Quảng cáo điện thoại
    "đăng ký", "dang ky", "đăng ký thành công", "mã số", "ma so",  # Spam
    "kết quả trúng thưởng", "ket qua trung thuong",  # Quảng cáo
    "nhận quà", "nhan qua", "chương trình", "chuong trinh",  # Marketing
    "voucher", "nhommua", "affiliate",  # Quảng cáo
    "đề xuất", "de xuat",  # Facebook suggestions
]

# Từ khóa loại trừ người khác
EXCLUDE_PEOPLE = [
    "em trai", "em gái", "em gai", "em trai", "anh trai", "chị gái", "chi gai",
    "brother", "sister", "bạn", "ban", "friend"
]

def parse_timestamp(ts):
    """Chuyển timestamp thành datetime"""
    try:
        return datetime.fromtimestamp(ts)
    except:
        return None

def fix_encoding(text):
    """Sửa lỗi encoding Unicode"""
    if not text:
        return ""
    try:
        if isinstance(text, str):
            return text.encode('latin1').decode('utf-8')
    except:
        pass
    return text

def extract_text_from_post(post_data):
    """Trích xuất text từ post"""
    text_parts = []
    
    # Lấy title
    if post_data.get("title"):
        title = fix_encoding(post_data["title"])
        text_parts.append(title)
    
    # Lấy post content
    if post_data.get("data"):
        for item in post_data["data"]:
            if isinstance(item, dict):
                if item.get("post"):
                    post_text = fix_encoding(item["post"])
                    text_parts.append(post_text)
    
    # Lấy description từ media
    if post_data.get("attachments"):
        for attachment in post_data["attachments"]:
            if attachment.get("data"):
                for data_item in attachment["data"]:
                    if isinstance(data_item, dict) and data_item.get("media"):
                        desc = data_item["media"].get("description")
                        if desc:
                            text_parts.append(fix_encoding(desc))
    
    return " ".join(text_parts)

def extract_tags(post_data):
    """Trích xuất tags từ post"""
    tags = []
    if post_data.get("tags"):
        for tag in post_data["tags"]:
            if isinstance(tag, dict) and tag.get("name"):
                tags.append(fix_encoding(tag["name"]).lower())
    return tags

def extract_media_from_post(post_data, base_dir):
    """Trích xuất đường dẫn ảnh từ post"""
    media_paths = []
    
    if post_data.get("attachments"):
        for attachment in post_data["attachments"]:
            if attachment.get("data"):
                for data_item in attachment["data"]:
                    if isinstance(data_item, dict) and data_item.get("media"):
                        media_uri = data_item["media"].get("uri")
                        if media_uri:
                            full_path = os.path.join(base_dir, media_uri)
                            if os.path.exists(full_path):
                                media_paths.append(full_path)
    
    return media_paths

def is_spam_or_advertisement(text):
    """Kiểm tra xem post có phải spam/quảng cáo không"""
    if not text:
        return False
    text_lower = text.lower()
    
    # Kiểm tra từ khóa loại trừ
    for keyword in EXCLUDE_KEYWORDS:
        if keyword in text_lower:
            return True
    
    # Kiểm tra có link quảng cáo không
    if "http" in text_lower or "www." in text_lower:
        # Nếu có link + từ khóa quảng cáo thì là spam
        ad_indicators = ["đăng ký", "mã số", "trúng thưởng", "nhận quà"]
        if any(indicator in text_lower for indicator in ad_indicators):
            return True
    
    return False

def is_about_other_people(text):
    """Kiểm tra xem post có về người khác (không phải vợ) không"""
    if not text:
        return False
    text_lower = text.lower()
    
    # Kiểm tra từ khóa về người khác
    for keyword in EXCLUDE_PEOPLE:
        if keyword in text_lower:
            # Nhưng nếu có mention vợ cùng lúc thì vẫn OK
            if not any(wife_name in text_lower for wife_name in WIFE_NAMES):
                return True
    
    return False

def is_about_wife(text, tags):
    """Kiểm tra xem post có về vợ không"""
    if not text:
        return False
    
    text_lower = text.lower()
    
    # Kiểm tra tags trước (chính xác nhất)
    for tag in tags:
        if any(wife_name in tag for wife_name in WIFE_NAMES):
            return True
    
    # Kiểm tra trong text
    # Pattern 1: "vợ yêu", "em yêu", "Nương Nương"
    wife_patterns = [
        r"vợ\s+yêu", r"vo\s+yeu",
        r"em\s+yêu", r"em\s+yeu",
        r"nương\s+nương", r"nuong\s+nuong",
        r"cùng\s+với\s+nương", r"cung\s+voi\s+nuong",
        r"với\s+nương", r"voi\s+nuong",
        r"vợ\s+@", r"vo\s+@",
    ]
    
    for pattern in wife_patterns:
        if re.search(pattern, text_lower):
            return True
    
    # Pattern 2: "chúc mừng sinh nhật vợ", "happy birthday vợ"
    birthday_patterns = [
        r"chúc\s+mừng\s+sinh\s+nhật\s+vợ", r"chuc\s+munng\s+sinh\s+nhat\s+vo",
        r"happy\s+birthday\s+.*vợ", r"happy\s+birthday\s+.*vo",
        r"sinh\s+nhật\s+vợ", r"sinh\s+nhat\s+vo",
    ]
    
    for pattern in birthday_patterns:
        if re.search(pattern, text_lower):
            return True
    
    # Pattern 3: "cùng vợ", "với vợ", "ăn tối cùng vợ"
    together_patterns = [
        r"cùng\s+vợ", r"cung\s+vo",
        r"với\s+vợ", r"voi\s+vo",
        r"ăn\s+tối\s+cùng\s+vợ", r"an\s+toi\s+cung\s+vo",
        r"đi\s+chơi\s+với\s+vợ", r"di\s+choi\s+voi\s+vo",
    ]
    
    for pattern in together_patterns:
        if re.search(pattern, text_lower):
            return True
    
    return False

def is_about_children(text, tags):
    """Kiểm tra xem post có về con (Bee, Sam) không"""
    if not text:
        return False
    
    text_lower = text.lower()
    
    # Kiểm tra tags trước
    for tag in tags:
        tag_lower = tag.lower()
        if any(child_name in tag_lower for child_name in CHILDREN_NAMES):
            return True
    
    # Kiểm tra trong text - tìm "Bee", "Sam", "con trai", "con gái"
    children_patterns = [
        r"\bbee\b",
        r"\bsam\b",
        r"con\s+trai",
        r"con\s+gái", r"con\s+gai",
        r"ku\s+bee", r"ku\s+sam",
        r"bé\s+bee", r"bé\s+sam",
    ]
    
    for pattern in children_patterns:
        if re.search(pattern, text_lower):
            return True
    
    return False

def is_significant_event(text):
    """Đánh giá xem đây có phải sự kiện quan trọng không"""
    if not text:
        return False
    
    text_lower = text.lower()
    
    # Các từ khóa chỉ sự kiện quan trọng
    significant_keywords = [
        "cưới", "cuoi", "wedding", "kết hôn", "ket hon",
        "đính hôn", "dinh hon", "engagement",
        "sinh", "birth", "mang thai", "pregnancy",
        "kỷ niệm", "ky niem", "anniversary",
        "du lịch", "du lich", "travel", "trip",
        "chúc mừng sinh nhật", "happy birthday",
        "đầy tháng", "day thang", "tròn 1 tháng", "tron 1 thang", "full month",
        "tạm biệt", "tam biet", "goodbye",
        "ăn tối", "an toi", "dinner",
        "check in", "checkin",
    ]
    
    return any(keyword in text_lower for keyword in significant_keywords)

def determine_event_type(text, tags):
    """Xác định loại sự kiện dựa trên nội dung"""
    text_lower = text.lower()
    
    # Kiểm tra sự kiện về con trước (đầy tháng, sinh nhật con)
    if any(word in text_lower for word in ["đầy tháng", "day thang", "tròn 1 tháng", "tron 1 thang", "full month", "tròn 1 thang"]):
        # Nếu có mention con (Bee, Sam) thì là family-event
        if is_about_children(text, tags):
            return "family-event"
        return "birth"  # Nếu không rõ thì để birth
    
    if any(word in text_lower for word in ["cưới", "cuoi", "wedding", "kết hôn", "ket hon"]):
        return "wedding"
    elif any(word in text_lower for word in ["đính hôn", "dinh hon", "engagement"]):
        return "engagement"
    elif any(word in text_lower for word in ["sinh", "birth"]):
        return "birth"
    elif any(word in text_lower for word in ["mang thai", "pregnancy"]):
        return "pregnancy"
    elif any(word in text_lower for word in ["du lịch", "du lich", "travel", "trip", "đi chơi"]):
        return "travel"
    elif any(word in text_lower for word in ["kỷ niệm", "ky niem", "anniversary"]):
        return "anniversary"
    elif any(word in text_lower for word in ["chúc mừng sinh nhật", "happy birthday", "sinh nhật"]):
        return "birth"
    elif any(word in text_lower for word in ["nhận lời yêu", "nhan loi yeu", "chấp nhận yêu", "chap nhan yeu", "đồng ý yêu", "dong y yeu"]):
        return "confess-love"
    elif any(word in text_lower for word in ["ăn tối", "an toi", "dinner", "check in"]):
        return "dating"
    elif any(word in text_lower for word in ["hẹn hò", "hen ho", "dating"]):
        return "dating"
    elif any(word in text_lower for word in ["gặp", "gap", "meet", "lần đầu"]):
        return "first-meet"
    else:
        return "other"

def process_posts_file(file_path):
    """Xử lý file posts JSON với phân tích ngữ cảnh"""
    events = []
    
    print(f"Đang đọc file: {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Xử lý cả array và object
        if isinstance(data, list):
            posts = data
        elif isinstance(data, dict):
            posts = data.get("posts", data.get("data", []))
            if not isinstance(posts, list):
                posts = [data]
        else:
            posts = []
        
        print(f"Tìm thấy {len(posts)} posts")
        
        for post in posts:
            if not isinstance(post, dict):
                continue
            
            # Lấy timestamp
            timestamp = post.get("timestamp")
            if not timestamp:
                continue
            
            dt = parse_timestamp(timestamp)
            if not dt:
                continue
            
            # Chỉ lấy từ 2015 đến hiện tại
            if dt.year < 2015:
                continue
            
            # Trích xuất text và tags
            text = extract_text_from_post(post)
            tags = extract_tags(post)
            
            # BƯỚC 1: Loại bỏ spam/quảng cáo
            if is_spam_or_advertisement(text):
                continue
            
            # BƯỚC 2: Kiểm tra có về vợ HOẶC về con (Bee, Sam) không
            is_wife_related = is_about_wife(text, tags)
            is_children_related = is_about_children(text, tags)
            
            if not is_wife_related and not is_children_related:
                continue
            
            # BƯỚC 3: Loại bỏ posts về người khác
            if is_about_other_people(text):
                continue
            
            # BƯỚC 4: Ưu tiên sự kiện quan trọng hoặc có ảnh
            media_paths = extract_media_from_post(post, FACEBOOK_DIR)
            has_media = len(media_paths) > 0
            
            # Nếu không phải sự kiện quan trọng và không có ảnh, có thể bỏ qua
            if not is_significant_event(text) and not has_media:
                # Chỉ giữ lại nếu có tag "Nương Nương" (chắc chắn liên quan) hoặc về con
                if not any("nuong" in tag for tag in tags) and not is_children_related:
                    continue
            
            # Xác định loại sự kiện
            event_type = determine_event_type(text, tags)
            
            # Tạo title ngắn gọn và có ý nghĩa từ nội dung
            title = text[:200] if text else ""
            
            # Loại bỏ các phần không cần thiết
            title = re.sub(r"Võ Tuấn Nguyên đã.*?\.", "", title, flags=re.IGNORECASE)
            title = re.sub(r"đã thêm.*?ảnh", "", title, flags=re.IGNORECASE)
            title = re.sub(r"đã chia sẻ.*?\.", "", title, flags=re.IGNORECASE)
            title = re.sub(r"đã đăng.*?\.", "", title, flags=re.IGNORECASE)
            title = re.sub(r"đang.*?\.", "", title, flags=re.IGNORECASE)
            
            # Nếu là sự kiện về con (đầy tháng, sinh nhật), tạo title rõ ràng hơn
            if is_children_related:
                desc_lower = text.lower()
                if "đầy tháng" in desc_lower or "day thang" in desc_lower or "tròn 1 tháng" in desc_lower or "tron 1 thang" in desc_lower:
                    if "bee" in desc_lower:
                        title = "Đầy tháng con trai (Bee)"
                    elif "sam" in desc_lower:
                        title = "Đầy tháng con gái (Sam)"
                    else:
                        title = "Đầy tháng con"
                elif "sinh nhật" in desc_lower or "birthday" in desc_lower:
                    if "bee" in desc_lower:
                        title = "Sinh nhật con trai (Bee)"
                    elif "sam" in desc_lower:
                        title = "Sinh nhật con gái (Sam)"
                    else:
                        title = "Sinh nhật con"
            title = title.strip()
            
            # Nếu title quá ngắn hoặc không có ý nghĩa, tạo từ description
            if len(title) < 10 or title.lower() in ["checkin", "check in", "sự kiện"]:
                # Tìm phần quan trọng trong description
                desc_lower = text.lower()
                
                # Kiểm tra sự kiện về con trước
                if is_children_related:
                    if "đầy tháng" in desc_lower or "day thang" in desc_lower or "tròn 1 tháng" in desc_lower or "tron 1 thang" in desc_lower:
                        if "bee" in desc_lower:
                            title = "Đầy tháng con trai (Bee)"
                        elif "sam" in desc_lower:
                            title = "Đầy tháng con gái (Sam)"
                        else:
                            title = "Đầy tháng con"
                    elif "sinh nhật" in desc_lower or "birthday" in desc_lower:
                        if "bee" in desc_lower:
                            title = "Sinh nhật con trai (Bee)"
                        elif "sam" in desc_lower:
                            title = "Sinh nhật con gái (Sam)"
                        else:
                            title = "Sinh nhật con"
                    else:
                        # Lấy câu đầu tiên có mention Bee/Sam
                        sentences = re.split(r'[.!?\n]', text)
                        for sentence in sentences:
                            sentence = sentence.strip()
                            if len(sentence) > 10 and any(child_name in sentence.lower() for child_name in CHILDREN_NAMES):
                                title = sentence[:80]
                                break
                # Kiểm tra sự kiện về vợ
                elif "chúc mừng sinh nhật" in desc_lower or "happy birthday" in desc_lower:
                    title = "Chúc mừng sinh nhật vợ yêu"
                elif "cùng" in desc_lower and "vợ" in desc_lower:
                    title = "Cùng vợ đi chơi"
                elif "ăn tối" in desc_lower:
                    title = "Ăn tối cùng vợ"
                elif "du lịch" in desc_lower or "travel" in desc_lower:
                    title = "Du lịch cùng vợ"
                elif "kỷ niệm" in desc_lower or "anniversary" in desc_lower:
                    title = "Kỷ niệm với vợ"
                else:
                    # Lấy câu đầu tiên có ý nghĩa
                    sentences = re.split(r'[.!?\n]', text)
                    for sentence in sentences:
                        sentence = sentence.strip()
                        if len(sentence) > 15 and any(wife_name in sentence.lower() for wife_name in WIFE_NAMES):
                            title = sentence[:80]
                            break
                    
                    if not title or len(title) < 10:
                        if is_children_related:
                            title = f"Sự kiện về con - {format_date_for_timeline(dt)}"
                        else:
                            title = f"Sự kiện với vợ - {format_date_for_timeline(dt)}"
            
            # Giới hạn độ dài
            if len(title) > 100:
                title = title[:97] + "..."
            
            # Tạo event
            event = {
                "id": int(timestamp * 1000),
                "date": format_date_for_timeline(dt),
                "dateParsed": {
                    "original": format_date_for_timeline(dt),
                    "date": dt.isoformat(),
                    "year": dt.year,
                    "month": dt.month,
                    "day": dt.day,
                    "format": "DD/MM/YYYY"
                },
                "type": event_type,
                "title": title[:100],
                "description": text,
                "location": "",
                "witnesses": "",
                "documents": "",
                "images": []
            }
            
            # Thêm ảnh nếu có (sẽ copy sau)
            for i, media_path in enumerate(media_paths[:10]):
                event["images"].append({
                    "id": int(timestamp * 1000) + i,
                    "name": os.path.basename(media_path),
                    "path": media_path,  # Đường dẫn gốc, sẽ copy sau
                    "type": "image/jpeg"
                })
            
            events.append(event)
            print(f"  ✓ {format_date_for_timeline(dt)} - {event_type} - {title[:50]}...")
    
    except Exception as e:
        print(f"Lỗi khi đọc file {file_path}: {e}")
        import traceback
        traceback.print_exc()
    
    return events

def format_date_for_timeline(dt):
    """Format date cho timeline (DD/MM/YYYY)"""
    if not dt:
        return None
    return dt.strftime("%d/%m/%Y")

def copy_image_to_public(source_path, event_date, event_type, base_dir):
    """Copy ảnh vào public/images theo định dạng YYYY-MM-DD-eventType/"""
    try:
        if not os.path.exists(source_path):
            return None
        
        # Parse date để tạo folder name
        date_str = event_date.split('T')[0] if 'T' in event_date else event_date
        # Nếu date là DD/MM/YYYY, convert sang YYYY-MM-DD
        if '/' in date_str:
            parts = date_str.split('/')
            if len(parts) == 3:
                date_str = f"{parts[2]}-{parts[1]}-{parts[0]}"
        
        folder_name = f"{date_str}-{event_type or 'other'}"
        
        # Tạo thư mục đích
        public_images_dir = os.path.join(base_dir, "public", "images", folder_name)
        os.makedirs(public_images_dir, exist_ok=True)
        
        # Copy file với tên unique
        timestamp = int(datetime.now().timestamp() * 1000)
        original_name = os.path.basename(source_path)
        file_name = f"{timestamp}-{original_name}"
        dest_path = os.path.join(public_images_dir, file_name)
        
        import shutil
        shutil.copy2(source_path, dest_path)
        
        # Trả về đường dẫn tương đối từ public
        return f"/images/{folder_name}/{file_name}"
    except Exception as e:
        print(f"Lỗi khi copy ảnh {source_path}: {e}")
        return None

def scan_all_posts():
    """Quét tất cả file posts"""
    all_events = []
    
    posts_dir = os.path.join(FACEBOOK_DIR, "your_facebook_activity", "posts")
    
    # Các file posts cần quét
    post_files = [
        "your_posts__check_ins__photos_and_videos_1.json",
        "shared_memories.json",
        "birthday_media.json"
    ]
    
    # Quét các file posts
    for filename in post_files:
        file_path = os.path.join(posts_dir, filename)
        if os.path.exists(file_path):
            events = process_posts_file(file_path)
            all_events.extend(events)
    
    # Quét thư mục album
    album_dir = os.path.join(posts_dir, "album")
    if os.path.exists(album_dir):
        for album_file in os.listdir(album_dir):
            if album_file.endswith(".json"):
                file_path = os.path.join(album_dir, album_file)
                events = process_posts_file(file_path)
                all_events.extend(events)
    
    return all_events

def main():
    print("=" * 60)
    print("Bắt đầu quét và phân tích dữ liệu Facebook...")
    print("Chỉ chọn sự kiện thực sự liên quan đến mối quan hệ")
    print("=" * 60)
    
    # Đường dẫn file timeline.json
    base_dir = os.path.dirname(__file__)
    timeline_file = os.path.join(base_dir, "data", "timeline.json")
    
    # Đọc timeline hiện tại
    existing_events = []
    existing_ids = set()
    if os.path.exists(timeline_file):
        try:
            with open(timeline_file, 'r', encoding='utf-8') as f:
                timeline_data = json.load(f)
                existing_events = timeline_data.get("timelineEvents", [])
                existing_ids = {e.get("id") for e in existing_events}
                # Cũng check theo date + title
                existing_keys = {
                    f"{e.get('date')}-{e.get('title', '')[:50]}".lower()
                    for e in existing_events
                }
            print(f"Đã tìm thấy {len(existing_events)} sự kiện hiện có trong timeline")
        except Exception as e:
            print(f"Lỗi khi đọc timeline.json: {e}")
            existing_events = []
            existing_ids = set()
            existing_keys = set()
    else:
        existing_keys = set()
        # Tạo thư mục data nếu chưa có
        os.makedirs(os.path.dirname(timeline_file), exist_ok=True)
    
    # Quét tất cả posts
    new_events = scan_all_posts()
    
    # Lọc bỏ các sự kiện đã có
    filtered_events = []
    for event in new_events:
        event_id = event.get("id")
        event_key = f"{event.get('date')}-{event.get('title', '')[:50]}".lower()
        
        # Bỏ qua nếu trùng ID hoặc trùng date+title
        if event_id in existing_ids or event_key in existing_keys:
            continue
        
        filtered_events.append(event)
    
    print(f"\nTìm thấy {len(filtered_events)} sự kiện mới (sau khi loại bỏ trùng lặp)")
    
    # Copy ảnh vào public/images
    print("\nĐang copy ảnh vào public/images...")
    for event in filtered_events:
        if event.get("images"):
            updated_images = []
            for img in event["images"]:
                source_path = img.get("path")
                if source_path and os.path.exists(source_path):
                    # Copy ảnh vào public/images
                    relative_path = copy_image_to_public(
                        source_path,
                        event["dateParsed"]["date"],
                        event["type"],
                        base_dir
                    )
                    if relative_path:
                        updated_images.append({
                            "id": img.get("id"),
                            "name": img.get("name"),
                            "path": relative_path,
                            "type": img.get("type", "image/jpeg")
                        })
                        print(f"  ✓ Đã copy: {os.path.basename(source_path)}")
            event["images"] = updated_images
    
    # Merge với events hiện có
    all_events = existing_events + filtered_events
    
    # Sắp xếp theo ngày
    all_events.sort(key=lambda x: x["dateParsed"]["date"])
    
    print("\n" + "=" * 60)
    print(f"Tổng cộng: {len(all_events)} sự kiện (cũ: {len(existing_events)}, mới: {len(filtered_events)})")
    print("=" * 60)
    
    # Lưu vào timeline.json
    timeline_data = {
        "timelineEvents": all_events,
        "lastSaved": datetime.now().isoformat(),
        "version": "1.0"
    }
    
    with open(timeline_file, 'w', encoding='utf-8') as f:
        json.dump(timeline_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ Đã lưu vào: {timeline_file}")
    
    # Hiển thị một số sự kiện mới
    if filtered_events:
        print("\nCác sự kiện mới được thêm:")
        for i, event in enumerate(filtered_events[:10], 1):
            print(f"{i}. {event['date']} - {event['type']} - {event['title'][:60]}...")
        if len(filtered_events) > 10:
            print(f"... và {len(filtered_events) - 10} sự kiện khác")

if __name__ == "__main__":
    main()
