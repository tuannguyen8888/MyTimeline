// Lưu trữ timeline events
let timelineEvents = [];
let currentImages = []; // Lưu tạm hình ảnh đang chọn (chứa File object)
let fileHandle = null; // File handle cho File System Access API
let imagesDirHandle = null; // Directory handle cho thư mục images

// Load dữ liệu khi trang được tải
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOMContentLoaded - Bắt đầu load dữ liệu');
    console.log('Current URL:', window.location.href);
    console.log('Protocol:', window.location.protocol);
    
    // Kiểm tra nếu đang mở từ file:// (CORS sẽ block)
    if (window.location.protocol === 'file:') {
        const container = document.getElementById('timelineContainer');
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #856404; margin-bottom: 20px;">⚠️ Không thể load dữ liệu từ file://</h3>
                <p style="color: #856404; margin-bottom: 15px;">
                    Trình duyệt không cho phép load file JSON khi mở trực tiếp từ file system (file://).
                </p>
                <p style="color: #856404; margin-bottom: 20px;">
                    <strong>Vui lòng mở qua web server:</strong>
                </p>
                <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p style="margin: 10px 0;"><strong>Option 1:</strong> Mở qua Next.js server:</p>
                    <code style="background: #f5f5f5; padding: 8px 12px; border-radius: 4px; display: inline-block;">
                        http://localhost:3000/index.html
                    </code>
                </div>
                <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p style="margin: 10px 0;"><strong>Option 2:</strong> Chạy simple HTTP server:</p>
                    <code style="background: #f5f5f5; padding: 8px 12px; border-radius: 4px; display: block; margin: 5px 0;">
                        cd public && python3 -m http.server 8000
                    </code>
                    <p style="margin-top: 10px; font-size: 0.9em;">Sau đó mở: <code>http://localhost:8000/index.html</code></p>
                </div>
            </div>
        `;
        showSaveStatus('Vui lòng mở qua web server để load dữ liệu', 'error');
        return;
    }
    
    // Load từ file data/timeline.json (file tĩnh, độc lập với Next.js)
    const loadedFromFile = await loadFromDataJson();
    
    console.log('Loaded from file:', loadedFromFile);
    console.log('Timeline events count:', timelineEvents.length);
    
    // Chỉ load từ file, không load từ localStorage
    
    renderTimeline();
    updateEventCount();
    
    if (loadedFromFile && timelineEvents.length > 0) {
        showSaveStatus(`Đã tải ${timelineEvents.length} sự kiện từ data/timeline.json`, 'success');
    } else {
        showSaveStatus('Không tìm thấy dữ liệu hoặc file rỗng', 'error');
        console.error('Không load được dữ liệu. Timeline events:', timelineEvents);
    }
    
    // Xử lý các nút (chỉ giữ nút In)
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', printTimeline);
    }
});

// Xử lý chọn hình ảnh
function handleImageSelect(event) {
    const files = Array.from(event.target.files);
    
    files.forEach((file, index) => {
        if (file.type.startsWith('image/')) {
            const imageData = {
                id: Date.now() + index + Math.random(),
                name: file.name,
                file: file, // Lưu File object thay vì base64
                type: file.type,
                preview: null // Sẽ được tạo khi preview
            };
            
            // Tạo preview từ File object
            const reader = new FileReader();
            reader.onload = function(e) {
                imageData.preview = e.target.result; // base64 chỉ để preview
                currentImages.push(imageData);
                displayImagePreview(imageData);
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Reset input để có thể chọn lại file cùng tên
    event.target.value = '';
}

// Hiển thị preview hình ảnh
function displayImagePreview(imageData) {
    const previewContainer = document.getElementById('imagePreview');
    const div = document.createElement('div');
    div.className = 'image-preview-item';
    div.setAttribute('data-image-id', imageData.id);
    
    div.innerHTML = `
        <img src="${imageData.preview || imageData.data || ''}" alt="${imageData.name}">
        <button class="remove-image" onclick="removeImagePreview(${imageData.id})">×</button>
    `;
    
    previewContainer.appendChild(div);
}

// Xóa preview hình ảnh
function removeImagePreview(imageId) {
    currentImages = currentImages.filter(img => img.id !== imageId);
    const previewItem = document.querySelector(`[data-image-id="${imageId}"]`);
    if (previewItem) {
        previewItem.remove();
    }
}

// Parse và validate ngày tháng
function parseDate(dateString) {
    if (!dateString || !dateString.trim()) {
        return null;
    }
    
    const trimmed = dateString.trim();
    
    // DD/MM/YYYY
    const fullDateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (fullDateMatch) {
        const day = parseInt(fullDateMatch[1], 10);
        const month = parseInt(fullDateMatch[2], 10);
        const year = parseInt(fullDateMatch[3], 10);
        
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
            return {
                original: trimmed,
                date: new Date(year, month - 1, day),
                year: year,
                month: month,
                day: day,
                format: 'DD/MM/YYYY'
            };
        }
    }
    
    // MM/YYYY
    const monthYearMatch = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
    if (monthYearMatch) {
        const month = parseInt(monthYearMatch[1], 10);
        const year = parseInt(monthYearMatch[2], 10);
        
        if (month >= 1 && month <= 12) {
            return {
                original: trimmed,
                date: new Date(year, month - 1, 1),
                year: year,
                month: month,
                day: null,
                format: 'MM/YYYY'
            };
        }
    }
    
    // YYYY
    const yearMatch = trimmed.match(/^(\d{4})$/);
    if (yearMatch) {
        const year = parseInt(yearMatch[1], 10);
        if (year >= 1900 && year <= 2100) {
            return {
                original: trimmed,
                date: new Date(year, 0, 1),
                year: year,
                month: null,
                day: null,
                format: 'YYYY'
            };
        }
    }
    
    return null;
}

// Validate ngày tháng
function validateDate(dateString) {
    const parsed = parseDate(dateString);
    if (!parsed) {
        return {
            valid: false,
            message: 'Định dạng không hợp lệ. Vui lòng nhập DD/MM/YYYY, MM/YYYY hoặc YYYY'
        };
    }
    return { valid: true, parsed: parsed };
}

// Format ngày thành YYYY-MM-DD
function formatDateForPath(dateParsed) {
    if (!dateParsed) return 'unknown';
    
    const year = dateParsed.year || new Date().getFullYear();
    const month = dateParsed.month || 1;
    const day = dateParsed.day || 1;
    
    // Đảm bảo 2 chữ số cho tháng và ngày
    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    
    return `${year}-${monthStr}-${dayStr}`;
}

// Lưu ảnh vào thư mục và trả về đường dẫn tương đối
async function saveImageToFile(imageData, dateParsed, eventType) {
    // Nếu đã có đường dẫn (đã lưu rồi), trả về luôn
    if (imageData.path) {
        return imageData.path;
    }
    
    // Nếu không có File object (backward compatibility với base64)
    if (!imageData.file && imageData.data) {
        // Giữ nguyên base64 cho backward compatibility
        return imageData;
    }
    
    // Tạo đường dẫn tương đối theo format: images/{YYYY-MM-DD}-{type}/{filename}
    const dateStr = formatDateForPath(dateParsed);
    const typeStr = eventType || 'other';
    const eventDir = `images/${dateStr}-${typeStr}`;
    const fileName = imageData.name || `image-${imageData.id}.jpg`;
    const relativePath = `${eventDir}/${fileName}`;
    
    // Thử lưu vào file system nếu có quyền
    if ('showDirectoryPicker' in window) {
        try {
            // Lấy hoặc tạo thư mục images
            if (!imagesDirHandle) {
                // Yêu cầu user chọn thư mục images (chỉ lần đầu)
                try {
                    imagesDirHandle = await window.showDirectoryPicker({
                        mode: 'readwrite'
                    });
                } catch (e) {
                    console.warn('Không thể truy cập thư mục, sẽ dùng base64:', e);
                    return imageData; // Fallback về base64
                }
            }
            
            // Tạo thư mục event theo format {YYYY-MM-DD}-{type} nếu chưa có
            let eventDirHandle;
            const dirName = `${dateStr}-${typeStr}`;
            try {
                eventDirHandle = await imagesDirHandle.getDirectoryHandle(dirName, { create: true });
            } catch (e) {
                console.error('Không thể tạo thư mục event:', e);
                return imageData; // Fallback về base64
            }
            
            // Lưu file ảnh
            const fileHandle = await eventDirHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(imageData.file);
            await writable.close();
            
            // Trả về object với đường dẫn
            return {
                id: imageData.id,
                name: imageData.name,
                path: relativePath,
                type: imageData.type
            };
        } catch (e) {
            console.warn('Lỗi khi lưu ảnh vào file, dùng base64:', e);
            return imageData; // Fallback về base64
        }
    } else {
        // Không hỗ trợ File System Access API, giữ nguyên base64
        return imageData;
    }
}

// Thêm sự kiện mới
async function addEvent() {
    try {
        const dateInput = document.getElementById('eventDate').value.trim();
        if (!dateInput) {
            alert('Vui lòng nhập ngày tháng!');
            document.getElementById('eventDate').focus();
            return;
        }
        
        const dateValidation = validateDate(dateInput);
        
        if (!dateValidation.valid) {
            alert(dateValidation.message);
            document.getElementById('eventDate').focus();
            return;
        }
        
        const eventType = document.getElementById('eventType').value;
        if (!eventType) {
            alert('Vui lòng chọn loại sự kiện!');
            document.getElementById('eventType').focus();
            return;
        }
        
        const eventTitle = document.getElementById('eventTitle').value.trim();
        if (!eventTitle) {
            alert('Vui lòng nhập tiêu đề sự kiện!');
            document.getElementById('eventTitle').focus();
            return;
        }
        
        // Lưu ảnh vào file và lấy đường dẫn
        let savedImages = [];
        const eventId = editingEventId || Date.now();
        
        for (const img of currentImages) {
            const saved = await saveImageToFile(img, dateValidation.parsed, eventType);
            savedImages.push(saved);
        }
        
        if (editingEventId) {
            // Chế độ chỉnh sửa
            const eventIndex = timelineEvents.findIndex(e => e.id === editingEventId);
            if (eventIndex === -1) {
                alert('Không tìm thấy sự kiện để chỉnh sửa!');
                closeEventModal();
                return;
            }
            
            timelineEvents[eventIndex] = {
                ...timelineEvents[eventIndex],
                date: dateInput,
                dateParsed: dateValidation.parsed,
                type: eventType,
                title: eventTitle,
                description: document.getElementById('eventDescription').value.trim(),
                location: document.getElementById('eventLocation').value.trim(),
                witnesses: document.getElementById('eventWitnesses').value.trim(),
                documents: document.getElementById('eventDocuments').value.trim(),
                images: savedImages
            };
            
            // Sắp xếp lại sau khi chỉnh sửa
            timelineEvents.sort((a, b) => {
                const dateA = a.dateParsed ? a.dateParsed.date : new Date(0);
                const dateB = b.dateParsed ? b.dateParsed.date : new Date(0);
                return dateA - dateB;
            });
            
            const savedId = editingEventId;
            saveTimeline();
            renderTimeline();
            updateEventCount();
            showSaveStatus('Đã cập nhật sự kiện thành công!', 'success');
            closeEventModal();
            
            // Scroll đến sự kiện vừa chỉnh sửa
            setTimeout(() => {
                const editedEvent = document.querySelector(`[data-id="${savedId}"]`);
                if (editedEvent) {
                    editedEvent.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    editedEvent.style.animation = 'highlight 1s ease';
                }
            }, 100);
        } else {
            // Chế độ thêm mới
            const event = {
                id: eventId,
                date: dateInput,
                dateParsed: dateValidation.parsed,
                type: eventType,
                title: eventTitle,
                description: document.getElementById('eventDescription').value.trim(),
                location: document.getElementById('eventLocation').value.trim(),
                witnesses: document.getElementById('eventWitnesses').value.trim(),
                documents: document.getElementById('eventDocuments').value.trim(),
                images: savedImages
            };
            
            timelineEvents.push(event);
            timelineEvents.sort((a, b) => {
                const dateA = a.dateParsed ? a.dateParsed.date : new Date(0);
                const dateB = b.dateParsed ? b.dateParsed.date : new Date(0);
                return dateA - dateB;
            });
            
            const newEventId = event.id;
            saveTimeline();
            renderTimeline();
            updateEventCount();
            showSaveStatus('Đã lưu sự kiện thành công!', 'success');
            closeEventModal();
            
            // Scroll đến sự kiện vừa thêm
            setTimeout(() => {
                const newEvent = document.querySelector(`[data-id="${newEventId}"]`);
                if (newEvent) {
                    newEvent.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    newEvent.style.animation = 'highlight 1s ease';
                }
            }, 100);
        }
    } catch (error) {
        console.error('Lỗi khi thêm/cập nhật sự kiện:', error);
        alert('Có lỗi xảy ra: ' + error.message);
    }
}

// Biến để lưu ID sự kiện đang chỉnh sửa
let editingEventId = null;

// Mở modal thêm sự kiện
function openEventModal(eventId = null) {
    const modal = document.getElementById('eventModal');
    const form = document.getElementById('timelineForm');
    const modalTitle = modal.querySelector('.modal-header h2');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Kiểm tra rõ ràng: nếu eventId được truyền vào và là số hợp lệ
    if (eventId !== null && eventId !== undefined && typeof eventId === 'number') {
        // Chế độ chỉnh sửa
        editingEventId = eventId;
        modalTitle.textContent = '✏️ Chỉnh Sửa Sự Kiện';
        submitBtn.textContent = 'Cập Nhật Sự Kiện';
        
        // Tìm sự kiện và điền form
        const event = timelineEvents.find(e => e.id === eventId);
        if (event) {
            document.getElementById('eventDate').value = event.date || '';
            document.getElementById('eventType').value = event.type || '';
            document.getElementById('eventTitle').value = event.title || '';
            document.getElementById('eventDescription').value = event.description || '';
            document.getElementById('eventLocation').value = event.location || '';
            document.getElementById('eventWitnesses').value = event.witnesses || '';
            document.getElementById('eventDocuments').value = event.documents || '';
            
            // Load hình ảnh
            currentImages = event.images ? [...event.images] : [];
            const previewContainer = document.getElementById('imagePreview');
            previewContainer.innerHTML = '';
            currentImages.forEach(img => {
                displayImagePreview(img);
            });
        } else {
            alert('Không tìm thấy sự kiện để chỉnh sửa!');
            editingEventId = null;
            return;
        }
    } else {
        // Chế độ thêm mới - đảm bảo editingEventId là null
        editingEventId = null;
        modalTitle.textContent = '➕ Thêm Sự Kiện Mới';
        submitBtn.textContent = 'Thêm Sự Kiện';
        form.reset();
        currentImages = [];
        document.getElementById('imagePreview').innerHTML = '';
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Ngăn scroll body khi modal mở
}

// Đóng modal thêm sự kiện
function closeEventModal() {
    const modal = document.getElementById('eventModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto'; // Cho phép scroll body khi modal đóng
    // Reset form
    document.getElementById('timelineForm').reset();
    currentImages = [];
    document.getElementById('imagePreview').innerHTML = '';
    editingEventId = null;
}

// Chỉnh sửa sự kiện
function editEvent(eventId) {
    openEventModal(eventId);
}

// Xóa sự kiện
function deleteEvent(id) {
    const event = timelineEvents.find(e => e.id === id);
    if (!event) {
        alert('Không tìm thấy sự kiện để xóa!');
        return;
    }
    
    const eventTitle = event.title || 'Sự kiện này';
    const confirmMessage = `Bạn có chắc chắn muốn xóa sự kiện:\n\n"${eventTitle}"\n\nHành động này không thể hoàn tác!`;
    
    if (confirm(confirmMessage)) {
        timelineEvents = timelineEvents.filter(event => event.id !== id);
        saveTimeline();
        renderTimeline();
        updateEventCount();
        showSaveStatus('Đã xóa và lưu thành công!', 'success');
    }
}

// Render timeline
function renderTimeline() {
    const container = document.getElementById('timelineContainer');
    console.log('renderTimeline - Số lượng sự kiện:', timelineEvents.length);
    
    if (timelineEvents.length === 0) {
        container.innerHTML = '<p class="empty-message">Chưa có sự kiện nào. Hãy thêm sự kiện đầu tiên của bạn!</p>';
        console.warn('Không có sự kiện để render');
        return;
    }
    
    container.innerHTML = '';
    console.log('Bắt đầu render', timelineEvents.length, 'sự kiện');
    
    timelineEvents.forEach((event, index) => {
        try {
            const eventElement = createEventElement(event);
            container.appendChild(eventElement);
            if (index < 3) {
                console.log('Đã render sự kiện', index + 1, ':', event.title);
            }
        } catch (e) {
            console.error('Lỗi khi render sự kiện', index, ':', e);
        }
    });
    
    console.log('Hoàn thành render timeline');
}

// Tạo element cho một sự kiện
function createEventElement(event) {
    const div = document.createElement('div');
    div.className = 'timeline-item';
    div.setAttribute('data-id', event.id);
    
    const date = formatDate(event.date, event.dateParsed);
    const typeLabel = getTypeLabel(event.type);
    
    div.innerHTML = `
        <div class="timeline-item-header">
            <div class="timeline-header-left">
                <span class="timeline-date">${date}</span>
                <span class="timeline-type">${typeLabel}</span>
            </div>
        </div>
        <div class="timeline-title">${escapeHtml(event.title)}</div>
        ${event.description ? `<div class="timeline-description">${escapeHtml(event.description)}</div>` : ''}
        <div class="timeline-details">
            ${event.location ? `
                <div class="timeline-detail-item">
                    <strong>📍 Địa điểm:</strong>
                    ${escapeHtml(event.location)}
                </div>
            ` : ''}
            ${event.witnesses ? `
                <div class="timeline-detail-item">
                    <strong>👥 Người tham gia:</strong>
                    ${escapeHtml(event.witnesses)}
                </div>
            ` : ''}
            ${event.documents ? `
                <div class="timeline-detail-item">
                    <strong>📄 Tài liệu:</strong>
                    ${escapeHtml(event.documents)}
                </div>
            ` : ''}
        </div>
        ${event.images && event.images.length > 0 ? `
            <div class="timeline-images">
                <div class="timeline-images-title" style="display: flex; align-items: center; gap: 10px;">
                    <span>📷 Hình ảnh (${event.images.length})</span>
                    <button class="btn-download-images" onclick="downloadEventImages(${event.id})" title="Lưu tất cả ảnh của sự kiện này">
                        📥 Lưu ảnh nhanh
                    </button>
                </div>
                <div class="timeline-image-gallery">
                    ${event.images.map((img, idx) => {
                        // Xử lý cả đường dẫn và base64 (backward compatibility)
                        const imageName = img.name || 'Image';
                        const escapedName = escapeHtml(imageName).replace(/'/g, "\\'");
                        
                        // Xác định đường dẫn ảnh (hoạt động cả file:// và web server)
                        const isFileProtocol = window.location.protocol === 'file:';
                        let imageUrl;
                        if (img.path) {
                            // Path format: images/{YYYY-MM-DD}-{type}/{filename}
                            const pathParts = img.path.split('/');
                            const relativePath = pathParts.slice(-2).join('/'); // Lấy 2 phần cuối
                            imageUrl = isFileProtocol ? `./images/${relativePath}` : `/images/${relativePath}`;
                        } else if (img.data) {
                            // Base64 data
                            imageUrl = img.data;
                        } else {
                            imageUrl = '';
                        }
                        const escapedUrl = imageUrl.replace(/'/g, "\\'");
                        
                        return `
                        <div class="timeline-image-item" onclick="openImageModal('${escapedUrl}', '${escapedName}', false)">
                            <img src="${imageUrl}" alt="${escapeHtml(imageName)}" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'200\\'%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\'%3EKhông tải được ảnh%3C/text%3E%3C/svg%3E';">
                        </div>
                    `;
                    }).join('')}
                </div>
            </div>
        ` : ''}
    `;
    
    return div;
}

// Format ngày tháng để hiển thị
function formatDate(dateString, dateParsed) {
    if (!dateString) return '';
    
    // Nếu có dateParsed, sử dụng nó
    if (dateParsed) {
        if (dateParsed.format === 'DD/MM/YYYY') {
            const months = [
                'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
                'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
            ];
            return `${dateParsed.day} ${months[dateParsed.month - 1]}, ${dateParsed.year}`;
        } else if (dateParsed.format === 'MM/YYYY') {
            const months = [
                'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
                'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
            ];
            return `${months[dateParsed.month - 1]}, ${dateParsed.year}`;
        } else if (dateParsed.format === 'YYYY') {
            return `Năm ${dateParsed.year}`;
        }
    }
    
    // Fallback: hiển thị nguyên định dạng người dùng nhập
    return dateString;
}

// Lấy nhãn cho loại sự kiện
function getTypeLabel(type) {
    const labels = {
        'first-meet': '💑 Lần đầu gặp mặt',
        'dating': '💕 Bắt đầu hẹn hò',
        'engagement': '💍 Đính hôn',
        'wedding': '💒 Kết hôn',
        'honeymoon': '🌴 Tuần trăng mật',
        'pregnancy': '🤰 Mang thai',
        'birth': '👶 Sinh con',
        'anniversary': '🎉 Kỷ niệm',
        'travel': '✈️ Du lịch',
        'family-event': '👨‍👩‍👧‍👦 Sự kiện gia đình',
        'document': '📋 Giấy tờ pháp lý',
        'other': '📌 Khác'
    };
    
    return labels[type] || type;
}

// Escape HTML để tránh XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Chỉ đọc dữ liệu, không lưu


// Load timeline từ file data/timeline.json (file tĩnh)
async function loadFromDataJson() {
    try {
        // Xác định đường dẫn phù hợp (hoạt động cả file:// và web server)
        const isFileProtocol = window.location.protocol === 'file:';
        const currentPath = window.location.pathname;
        const isInPublicFolder = currentPath.includes('/public/') || currentPath.endsWith('/index.html');
        
        let dataPath;
        // Xác định đường dẫn phù hợp
        if (isFileProtocol) {
            // Mở trực tiếp từ file system - dùng đường dẫn tương đối
            dataPath = './data/timeline.json';
        } else {
            // Chạy qua web server (Next.js hoặc GitHub Pages)
            // Xác định base path từ URL hiện tại
            const basePath = currentPath.replace(/\/index\.html$/, '').replace(/\/$/, '') || '';
            // Dùng đường dẫn tương đối từ base path
            dataPath = basePath ? `${basePath}/data/timeline.json` : './data/timeline.json';
        }
        
        console.log('Đang load từ:', dataPath);
        console.log('Current pathname:', currentPath);
        console.log('Base path:', currentPath.replace(/\/index\.html$/, '').replace(/\/$/, '') || '');
        
        const response = await fetch(dataPath);
        console.log('Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            console.error('Fetch failed:', response.status, response.statusText);
            // Thử đường dẫn khác
            const altPath = isFileProtocol ? './data/timeline.json' : './data/timeline.json';
            if (altPath !== dataPath) {
                console.log('Thử đường dẫn khác:', altPath);
                const altResponse = await fetch(altPath);
                if (altResponse.ok) {
                    const data = await altResponse.json();
                    return processTimelineData(data);
                }
            }
            return false;
        }
        
        const data = await response.json();
        console.log('Đã load dữ liệu, có timelineEvents:', !!data.timelineEvents);
        return processTimelineData(data);
        
    } catch (e) {
        // File không tồn tại hoặc không thể đọc - không phải lỗi nghiêm trọng
        console.error('Lỗi khi load data/timeline.json:', e);
        console.error('Error details:', e.message, e.stack);
        return false;
    }
}

// Xử lý dữ liệu timeline
function processTimelineData(data) {
    try {
        if (data.timelineEvents && Array.isArray(data.timelineEvents)) {
            timelineEvents = data.timelineEvents;
            console.log('Số lượng sự kiện:', timelineEvents.length);
            
            if (timelineEvents.length === 0) {
                console.warn('Mảng timelineEvents rỗng');
                return false;
            }
            
            // Re-parse dates cho các sự kiện cũ không có dateParsed
            timelineEvents.forEach(event => {
                if (!event.dateParsed && event.date) {
                    const parsed = parseDate(event.date);
                    if (parsed) {
                        event.dateParsed = parsed;
                    }
                }
            });
            
            timelineEvents.sort((a, b) => {
                const dateA = a.dateParsed ? a.dateParsed.date : new Date(0);
                const dateB = b.dateParsed ? b.dateParsed.date : new Date(0);
                return dateA - dateB;
            });
            
            console.log('Đã xử lý và sắp xếp', timelineEvents.length, 'sự kiện');
            return true;
        } else {
            console.warn('Dữ liệu không có timelineEvents hoặc không phải array');
            console.warn('Data structure:', Object.keys(data));
            return false;
        }
    } catch (e) {
        console.error('Lỗi khi xử lý dữ liệu:', e);
        return false;
    }
}


// Cập nhật số lượng sự kiện
function updateEventCount() {
    const countElement = document.getElementById('eventCount');
    if (countElement) {
        const count = timelineEvents.length;
        if (count > 0) {
            countElement.textContent = `📊 Tổng cộng: ${count} sự kiện`;
            countElement.style.display = 'block';
        } else {
            countElement.style.display = 'none';
        }
    }
}

// Hiển thị trạng thái lưu
function showSaveStatus(message, type = 'success') {
    const statusElement = document.getElementById('saveStatus');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `save-status ${type}`;
        statusElement.style.display = 'block';
        
        // Ẩn thông báo sau 3 giây
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 3000);
    }
}

// Export dữ liệu ra file JSON
// Hàm làm sạch dữ liệu: loại bỏ base64, chỉ giữ đường dẫn
function cleanEventData(events) {
    return events.map(event => {
        const cleanedEvent = { ...event };
        if (cleanedEvent.images && Array.isArray(cleanedEvent.images)) {
            cleanedEvent.images = cleanedEvent.images.map(img => {
                const cleanedImg = {
                    id: img.id,
                    name: img.name,
                    type: img.type
                };
                // Chỉ giữ lại path nếu có, loại bỏ data, preview, file
                if (img.path) {
                    cleanedImg.path = img.path;
                }
                return cleanedImg;
            });
        }
        return cleanedEvent;
    });
}

async function exportToJSON() {
    if (timelineEvents.length === 0) {
        alert('Chưa có dữ liệu để xuất!');
        return;
    }
    
    // Đảm bảo đã lưu trước khi export
    await saveTimeline();
    
    // Làm sạch dữ liệu: loại bỏ base64, chỉ giữ đường dẫn
    const cleanedEvents = cleanEventData(timelineEvents);
    
    const data = {
        timelineEvents: cleanedEvents,
        lastSaved: new Date().toISOString(),
        version: '1.0'
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showSaveStatus('Đã xuất file data.json thành công!', 'success');
}

// Import dữ liệu từ file JSON
async function importFromJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Hỗ trợ cả format mới (có timelineEvents) và format cũ (array trực tiếp)
            let importedEvents = [];
            if (data.timelineEvents && Array.isArray(data.timelineEvents)) {
                importedEvents = data.timelineEvents;
            } else if (Array.isArray(data)) {
                importedEvents = data;
            } else {
                throw new Error('File không đúng định dạng');
            }
            
            if (confirm(`Bạn muốn:\n- Thêm vào dữ liệu hiện tại (${timelineEvents.length} sự kiện)?\n- Hoặc thay thế toàn bộ?`)) {
                // Thêm vào
                timelineEvents = [...timelineEvents, ...importedEvents];
            } else {
                // Thay thế
                timelineEvents = importedEvents;
            }
            
            // Loại bỏ trùng lặp theo ID và re-parse dates
            const uniqueEvents = [];
            const seenIds = new Set();
            timelineEvents.forEach(event => {
                if (!seenIds.has(event.id)) {
                    seenIds.add(event.id);
                    // Re-parse date nếu chưa có
                    if (!event.dateParsed && event.date) {
                        const parsed = parseDate(event.date);
                        if (parsed) {
                            event.dateParsed = parsed;
                        }
                    }
                    uniqueEvents.push(event);
                }
            });
            timelineEvents = uniqueEvents;
            
            timelineEvents.sort((a, b) => {
                const dateA = a.dateParsed ? a.dateParsed.date : new Date(0);
                const dateB = b.dateParsed ? b.dateParsed.date : new Date(0);
                return dateA - dateB;
            });
            
            await saveTimeline();
            renderTimeline();
            updateEventCount();
            showSaveStatus(`Đã nhập ${importedEvents.length} sự kiện thành công!`, 'success');
        } catch (error) {
            alert('Lỗi khi đọc file: ' + error.message);
            showSaveStatus('Lỗi khi nhập file!', 'error');
        }
    };
    reader.readAsText(file);
    
    // Reset input để có thể chọn lại file cùng tên
    event.target.value = '';
}

// Export to PDF (sử dụng window.print)
function exportToPDF() {
    window.print();
}

// Print timeline
function printTimeline() {
    window.print();
}

// Download tất cả ảnh của một sự kiện
async function downloadEventImages(eventId) {
    const event = timelineEvents.find(e => e.id === eventId);
    if (!event || !event.images || event.images.length === 0) {
        alert('Sự kiện này không có ảnh nào!');
        return;
    }
    
    // Format ngày thành YYYY-MM-DD
    function formatDateForFilename(dateParsed) {
        if (!dateParsed) return 'unknown';
        const year = dateParsed.year || new Date().getFullYear();
        const month = String(dateParsed.month || 1).padStart(2, '0');
        const day = String(dateParsed.day || 1).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    const dateStr = formatDateForFilename(event.dateParsed);
    const typeStr = event.type || 'other';
    
    showSaveStatus(`Đang tải ${event.images.length} ảnh...`, 'success');
    
    // Download từng ảnh với delay để tránh browser block
    for (let i = 0; i < event.images.length; i++) {
        const img = event.images[i];
        try {
            let imageUrl;
            const isFileProtocol = window.location.protocol === 'file:';
            
            if (img.path) {
                // Path format: images/{YYYY-MM-DD}-{type}/{filename}
                const pathParts = img.path.split('/');
                const relativePath = pathParts.slice(-2).join('/');
                imageUrl = isFileProtocol ? `./images/${relativePath}` : `/images/${relativePath}`;
            } else if (img.data) {
                // Base64 data
                imageUrl = img.data;
            } else {
                console.warn('Ảnh không có path hoặc data:', img);
                continue;
            }
            
            // Fetch ảnh
            const response = await fetch(imageUrl);
            if (!response.ok) {
                console.error(`Không thể tải ảnh ${i + 1}:`, response.status);
                continue;
            }
            
            const blob = await response.blob();
            
            // Tạo tên file: {YYYY-MM-DD}-{event_type}-{count}.{extension}
            const originalName = img.name || 'image';
            const extension = originalName.split('.').pop() || 'jpg';
            const fileName = `${dateStr}-${typeStr}-${i + 1}.${extension}`;
            
            // Tạo URL và download
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            // Delay giữa các lần download để tránh browser block
            if (i < event.images.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        } catch (error) {
            console.error(`Lỗi khi tải ảnh ${i + 1}:`, error);
        }
    }
    
    showSaveStatus(`Đã tải ${event.images.length} ảnh thành công!`, 'success');
}

// Xóa tất cả
function clearAll() {
    if (confirm('Bạn có chắc chắn muốn xóa TẤT CẢ các sự kiện? Hành động này không thể hoàn tác!')) {
        timelineEvents = [];
        saveTimeline();
        renderTimeline();
        updateEventCount();
        showSaveStatus('Đã xóa tất cả sự kiện!', 'success');
    }
}

// Mở modal xem hình ảnh lớn
async function openImageModal(imageSrc, imageName, isPath = false) {
    let modal = document.getElementById('imageModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'imageModal';
        modal.className = 'image-modal';
        modal.innerHTML = `
            <div class="image-modal-content">
                <span class="image-modal-close" onclick="closeImageModal()">&times;</span>
                <img src="" alt="" id="modalImage">
            </div>
        `;
        document.body.appendChild(modal);
        
        // Đóng khi click bên ngoài
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeImageModal();
            }
        });
    }
    
    const modalImage = document.getElementById('modalImage');
    // Load ảnh trực tiếp từ URL (đã được xử lý trong createEventElement)
    modalImage.src = imageSrc;
    
    modalImage.alt = imageName || 'Image';
    modal.classList.add('active');
}

// Đóng modal
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Export tất cả hình ảnh
function exportAllImages() {
    if (timelineEvents.length === 0) {
        alert('Chưa có dữ liệu để xuất!');
        return;
    }
    
    let imageCount = 0;
    timelineEvents.forEach(event => {
        if (event.images && event.images.length > 0) {
            imageCount += event.images.length;
        }
    });
    
    if (imageCount === 0) {
        alert('Không có hình ảnh nào để xuất!');
        return;
    }
    
    // Tạo thư mục ảo và tải từng hình ảnh
    const dateStr = new Date().toISOString().split('T')[0];
    let downloaded = 0;
    
    timelineEvents.forEach((event, eventIndex) => {
        if (event.images && event.images.length > 0) {
            event.images.forEach((img, imgIndex) => {
                // Tạo tên file: event-title_image-index_original-name
                const safeTitle = event.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
                const fileName = `${eventIndex + 1}_${safeTitle}_${imgIndex + 1}_${img.name}`;
                
                // Chuyển base64 thành blob
                const byteCharacters = atob(img.data.split(',')[1]);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: img.type });
                
                // Tải xuống
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                
                // Delay để tránh browser block multiple downloads
                setTimeout(() => {
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    downloaded++;
                    
                    if (downloaded === imageCount) {
                        showSaveStatus(`Đã xuất ${imageCount} hình ảnh thành công!`, 'success');
                    }
                }, downloaded * 200);
            });
        }
    });
    
    showSaveStatus(`Đang xuất ${imageCount} hình ảnh...`, 'success');
}

// Thêm CSS animation cho highlight
const style = document.createElement('style');
style.textContent = `
    @keyframes highlight {
        0% { background-color: #fff3cd; }
        100% { background-color: #f8f9fa; }
    }
`;
document.head.appendChild(style);

