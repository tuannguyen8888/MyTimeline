'use client';

import { useState, useEffect, useRef } from 'react';
import MergeEventsModal from './components/MergeEventsModal';

interface TimelineEvent {
  id: number;
  date: string;
  dateParsed?: {
    original: string;
    date: string;
    year: number;
    month?: number;
    day?: number;
    format: string;
  };
  endDate?: string; // Ngày kết thúc (tùy chọn)
  endDateParsed?: {
    original: string;
    date: string;
    year: number;
    month?: number;
    day?: number;
    format: string;
  };
  type: string;
  title: string;
  description: string;
  location: string;
  witnesses: string;
  documents: string;
  images: Array<{
    id: number;
    name: string;
    path?: string;
    type: string;
  }>;
}

const EVENT_TYPES = [
  { value: 'first-meet', label: 'Lần đầu gặp mặt' },
  { value: 'confess-love', label: 'Nhận lời yêu nhau' },
  { value: 'dating', label: 'Bắt đầu hẹn hò' },
  { value: 'engagement', label: 'Đính hôn' },
  { value: 'wedding', label: 'Kết hôn' },
  { value: 'honeymoon', label: 'Tuần trăng mật' },
  { value: 'pregnancy', label: 'Mang thai' },
  { value: 'birth', label: 'Sinh con' },
  { value: 'anniversary', label: 'Kỷ niệm' },
  { value: 'travel', label: 'Du lịch cùng nhau' },
  { value: 'family-event', label: 'Sự kiện gia đình' },
  { value: 'document', label: 'Giấy tờ pháp lý' },
  { value: 'other', label: 'Khác' },
];

export default function Home() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [formData, setFormData] = useState({
    date: '',
    endDate: '', // Ngày kết thúc
    type: '',
    title: '',
    description: '',
    location: '',
    witnesses: '',
    documents: '',
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<
    Array<{
      id: number;
      name: string;
      path?: string;
      type: string;
    }>
  >([]); // Ảnh đã có trong sự kiện (khi edit)
  const [imageModal, setImageModal] = useState<{
    src: string;
    name: string;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<number>>(
    new Set()
  );
  const [showMergeModal, setShowMergeModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load events từ server
  useEffect(() => {
    loadEvents();

    // Tự động import Facebook events khi trang load lần đầu
    const autoImportFacebook = async () => {
      try {
        // Kiểm tra xem đã import chưa bằng cách check localStorage
        // Chỉ import tự động 1 lần duy nhất
        const hasImported = localStorage.getItem('facebook_imported');
        if (!hasImported) {
          // Kiểm tra xem có file Facebook export không
          const checkResponse = await fetch('/api/import-facebook?check=true');
          if (checkResponse.ok) {
            const checkResult = await checkResponse.json();
            if (checkResult.hasData) {
              // Tự động import (không hỏi confirm) - chỉ lần đầu
              setImporting(true);
              const response = await fetch('/api/import-facebook', {
                method: 'POST',
              });
              const result = await response.json();

              if (result.success) {
                // Đánh dấu đã import để không import lại tự động
                localStorage.setItem('facebook_imported', 'true');
                localStorage.setItem(
                  'facebook_import_date',
                  new Date().toISOString()
                );
                setSaveStatus({
                  message: `Đã tự động import ${result.imported} sự kiện từ Facebook! (Lần đầu tiên)`,
                  type: 'success',
                });
                await loadEvents();
                setTimeout(() => setSaveStatus(null), 5000);
              } else if (result.imported === 0) {
                // Nếu không có sự kiện mới, vẫn đánh dấu đã check
                localStorage.setItem('facebook_imported', 'true');
                localStorage.setItem(
                  'facebook_import_date',
                  new Date().toISOString()
                );
              }
              setImporting(false);
            }
          }
        } else {
          // Đã import rồi, có thể hiển thị thông tin
          const importDate = localStorage.getItem('facebook_import_date');
          if (importDate) {
            console.log(
              `Đã import Facebook lần trước: ${new Date(
                importDate
              ).toLocaleString('vi-VN')}`
            );
          }
        }
      } catch (error) {
        // Lỗi không quan trọng, chỉ log
        console.log('Auto-import check failed:', error);
      }
    };

    // Chạy auto-import sau 1 giây để không làm chậm trang load
    const timer = setTimeout(autoImportFacebook, 1000);
    return () => clearTimeout(timer);
  }, []);

  const loadEvents = async () => {
    try {
      const response = await fetch('/api/timeline');
      const data = await response.json();
      if (data.timelineEvents) {
        setEvents(data.timelineEvents);
        setSaveStatus({
          message: 'Đã tải dữ liệu thành công',
          type: 'success',
        });
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setSaveStatus({ message: 'Không thể tải dữ liệu', type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const saveEvents = async (eventsToSave: TimelineEvent[]) => {
    try {
      const response = await fetch('/api/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timelineEvents: eventsToSave }),
      });
      const result = await response.json();
      if (result.success) {
        setSaveStatus({ message: 'Đã lưu thành công', type: 'success' });
        setTimeout(() => setSaveStatus(null), 2000);
        return true;
      }
    } catch (error) {
      console.error('Error saving events:', error);
      setSaveStatus({ message: 'Không thể lưu dữ liệu', type: 'error' });
      setTimeout(() => setSaveStatus(null), 3000);
      return false;
    }
  };

  const parseDate = (dateString: string) => {
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
          date: new Date(year, month - 1, day).toISOString(),
          year,
          month,
          day,
          format: 'DD/MM/YYYY',
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
          date: new Date(year, month - 1, 1).toISOString(),
          year,
          month,
          day: null,
          format: 'MM/YYYY',
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
          date: new Date(year, 0, 1).toISOString(),
          year,
          month: null,
          day: null,
          format: 'YYYY',
        };
      }
    }

    return null;
  };

  const formatDate = (dateParsed: TimelineEvent['dateParsed']) => {
    if (!dateParsed) return '';
    return dateParsed.original;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedImages(files);

    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const removeImagePreview = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    setImagePreviews(newPreviews);
    URL.revokeObjectURL(imagePreviews[index]);
  };

  const uploadImages = async (eventDate: string, eventType: string) => {
    if (selectedImages.length === 0) return [];

    const formData = new FormData();
    selectedImages.forEach((file) => {
      formData.append('images', file);
    });
    formData.append('eventDate', eventDate);
    formData.append('eventType', eventType);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        return result.files;
      }
    } catch (error) {
      console.error('Error uploading images:', error);
    }
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dateParsed = parseDate(formData.date);
    if (!dateParsed) {
      setSaveStatus({ message: 'Định dạng ngày không hợp lệ', type: 'error' });
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }

    // Parse endDate nếu có
    let endDateParsed = null;
    if (formData.endDate && formData.endDate.trim()) {
      endDateParsed = parseDate(formData.endDate);
      if (!endDateParsed) {
        setSaveStatus({
          message: 'Định dạng ngày kết thúc không hợp lệ',
          type: 'error',
        });
        setTimeout(() => setSaveStatus(null), 3000);
        return;
      }
    }

    // Kiểm tra xem ngày hoặc type có thay đổi không (khi edit)
    let imagesToUse = existingImages;
    if (editingEvent) {
      // So sánh ngày dựa trên dateParsed để chính xác hơn
      const oldDateStr = editingEvent.dateParsed?.date || editingEvent.date;
      const newDateStr = dateParsed.date;
      const dateChanged = oldDateStr !== newDateStr;
      const typeChanged = editingEvent.type !== formData.type;

      // Nếu ngày hoặc type thay đổi, di chuyển ảnh sang thư mục mới
      if ((dateChanged || typeChanged) && existingImages.length > 0) {
        try {
          setSaveStatus({
            message: `Đang di chuyển ${existingImages.length} ảnh sang thư mục mới...`,
            type: 'info',
          });

          const moveResponse = await fetch('/api/move-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              images: existingImages,
              oldDate: oldDateStr,
              oldType: editingEvent.type,
              newDate: newDateStr,
              newType: formData.type,
            }),
          });

          const moveResult = await moveResponse.json();
          if (moveResult.success && moveResult.movedImages) {
            imagesToUse = moveResult.movedImages;
            // Cập nhật existingImages để hiển thị đúng trong popup
            setExistingImages(moveResult.movedImages);
            setSaveStatus({
              message: `Đã di chuyển ${moveResult.movedImages.length} ảnh sang thư mục mới`,
              type: 'success',
            });
            setTimeout(() => setSaveStatus(null), 3000);
          } else {
            console.error('Error moving images:', moveResult.error);
            setSaveStatus({
              message: moveResult.error || 'Không thể di chuyển ảnh',
              type: 'warning',
            });
            setTimeout(() => setSaveStatus(null), 3000);
            // Vẫn tiếp tục với ảnh cũ nếu không di chuyển được
          }
        } catch (error) {
          console.error('Error moving images:', error);
          setSaveStatus({
            message: 'Lỗi khi di chuyển ảnh, vẫn giữ nguyên thư mục cũ',
            type: 'warning',
          });
          setTimeout(() => setSaveStatus(null), 3000);
          // Vẫn tiếp tục với ảnh cũ nếu có lỗi
        }
      }
    }

    // Upload images mới (nếu có chọn ảnh mới)
    const uploadedImages = await uploadImages(formData.date, formData.type);

    // Merge ảnh đã di chuyển (nếu có) với ảnh mới
    const allImages = editingEvent
      ? [...imagesToUse, ...uploadedImages] // Ảnh đã di chuyển (nếu có) + ảnh mới
      : uploadedImages; // Sự kiện mới chỉ có ảnh mới (nếu có)

    const newEvent: TimelineEvent = {
      id: editingEvent?.id || Date.now(),
      date: formData.date,
      dateParsed,
      ...(formData.endDate && formData.endDate.trim()
        ? {
            endDate: formData.endDate,
            endDateParsed: endDateParsed,
          }
        : {}),
      type: formData.type,
      title: formData.title,
      description: formData.description,
      location: formData.location,
      witnesses: formData.witnesses,
      documents: formData.documents,
      images: allImages,
    };

    let updatedEvents: TimelineEvent[];
    if (editingEvent) {
      updatedEvents = events.map((e) =>
        e.id === editingEvent.id ? newEvent : e
      );
    } else {
      updatedEvents = [...events, newEvent];
    }

    // Sort by date
    updatedEvents.sort((a, b) => {
      const dateA = a.dateParsed?.date || '';
      const dateB = b.dateParsed?.date || '';
      return dateA.localeCompare(dateB);
    });

    setEvents(updatedEvents);
    await saveEvents(updatedEvents);

    // Reset form
    setFormData({
      date: '',
      endDate: '',
      type: '',
      title: '',
      description: '',
      location: '',
      witnesses: '',
      documents: '',
    });
    setSelectedImages([]);
    setImagePreviews([]);
    setExistingImages([]);
    setEditingEvent(null);
    setShowModal(false);
  };

  const handleEdit = (event: TimelineEvent) => {
    setEditingEvent(event);
    setFormData({
      date: event.date,
      endDate: event.endDate || '',
      type: event.type,
      title: event.title,
      description: event.description,
      location: event.location,
      witnesses: event.witnesses,
      documents: event.documents,
    });
    // Lưu ảnh hiện có của sự kiện
    setExistingImages(event.images || []);
    setSelectedImages([]);
    setImagePreviews([]);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    const event = events.find((e) => e.id === id);
    if (!event) return;

    const imageCount = event.images?.length || 0;
    const confirmMessage =
      imageCount > 0
        ? `Bạn có chắc chắn muốn xóa sự kiện:\n\n"${event.title}"\n\nSự kiện này có ${imageCount} ảnh. Tất cả ảnh sẽ bị xóa vĩnh viễn!\n\nHành động này không thể hoàn tác!`
        : `Bạn có chắc chắn muốn xóa sự kiện:\n\n"${event.title}"\n\nHành động này không thể hoàn tác!`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Xóa tất cả ảnh của sự kiện trước
      if (event.images && event.images.length > 0) {
        setSaveStatus({
          message: `Đang xóa ${event.images.length} ảnh...`,
          type: 'info',
        });

        // Xóa từng ảnh
        const deletePromises = event.images.map(async (img) => {
          if (img.path) {
            try {
              const response = await fetch(
                `/api/delete-image?path=${encodeURIComponent(img.path)}`,
                { method: 'DELETE' }
              );
              const result = await response.json();
              if (!result.success) {
                console.error(`Lỗi khi xóa ảnh ${img.path}:`, result.error);
              }
            } catch (error) {
              console.error(`Lỗi khi xóa ảnh ${img.path}:`, error);
            }
          }
        });

        await Promise.all(deletePromises);
      }

      // Xóa sự kiện khỏi timeline
      const updatedEvents = events.filter((e) => e.id !== id);
      setEvents(updatedEvents);
      await saveEvents(updatedEvents);

      setSaveStatus({
        message: `Đã xóa sự kiện "${event.title}" và ${imageCount} ảnh liên quan`,
        type: 'success',
      });
      setTimeout(() => setSaveStatus(null), 5000);
    } catch (error) {
      console.error('Error deleting event:', error);
      setSaveStatus({
        message: 'Lỗi khi xóa sự kiện',
        type: 'error',
      });
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const openImageModal = (src: string, name: string) => {
    setImageModal({ src, name });
  };

  const toggleEventSelection = (eventId: number) => {
    setSelectedEventIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const handleMergeEvents = () => {
    if (selectedEventIds.size < 2) {
      setSaveStatus({
        message: 'Vui lòng chọn ít nhất 2 sự kiện để gộp',
        type: 'warning',
      });
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }

    // Mở modal gộp sự kiện
    setShowMergeModal(true);
  };

  const handleConfirmMerge = async (mergeData: {
    date: string;
    dateParsed: any;
    endDate?: string;
    endDateParsed?: any;
    type: string;
    title: string;
    description: string;
    location: string;
    witnesses: string;
    documents: string;
  }) => {
    try {
      const eventsToMerge = events.filter((e) => selectedEventIds.has(e.id));

      if (eventsToMerge.length < 2) {
        setSaveStatus({
          message: 'Không đủ sự kiện để gộp',
          type: 'error',
        });
        setTimeout(() => setSaveStatus(null), 3000);
        return;
      }

      // Gộp tất cả ảnh từ các sự kiện
      const allImages: Array<{
        id: number;
        name: string;
        path?: string;
        type: string;
      }> = [];
      const imageIdSet = new Set<number>();

      for (const event of eventsToMerge) {
        if (event.images) {
          for (const img of event.images) {
            // Tránh trùng lặp ảnh
            if (!imageIdSet.has(img.id)) {
              allImages.push(img);
              imageIdSet.add(img.id);
            }
          }
        }
      }

      // Di chuyển tất cả ảnh sang thư mục mới nếu ngày/type thay đổi
      let finalImages = allImages;
      if (allImages.length > 0) {
        // Lấy ngày và type của sự kiện đầu tiên để so sánh
        const firstEvent = eventsToMerge[0];
        const oldDateStr = firstEvent.dateParsed?.date || firstEvent.date;
        const oldType = firstEvent.type;
        const newDateStr = mergeData.dateParsed.date;
        const newType = mergeData.type;

        const dateChanged = oldDateStr !== newDateStr;
        const typeChanged = oldType !== newType;

        if (dateChanged || typeChanged) {
          try {
            const moveResponse = await fetch('/api/move-images', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                images: allImages,
                oldDate: oldDateStr,
                oldType: oldType,
                newDate: newDateStr,
                newType: newType,
              }),
            });

            const moveResult = await moveResponse.json();
            if (moveResult.success && moveResult.movedImages) {
              finalImages = moveResult.movedImages;
            }
          } catch (error) {
            console.error('Error moving images during merge:', error);
          }
        }
      }

      // Tạo sự kiện mới từ dữ liệu gộp
      const mergedEvent: TimelineEvent = {
        id: Date.now(),
        date: mergeData.date,
        dateParsed: mergeData.dateParsed,
        ...(mergeData.endDate && mergeData.endDateParsed
          ? {
              endDate: mergeData.endDate,
              endDateParsed: mergeData.endDateParsed,
            }
          : {}),
        type: mergeData.type,
        title: mergeData.title,
        description: mergeData.description,
        location: mergeData.location,
        witnesses: mergeData.witnesses,
        documents: mergeData.documents,
        images: finalImages,
      };

      // Xóa các sự kiện cũ và thêm sự kiện mới
      const updatedEvents = events.filter((e) => !selectedEventIds.has(e.id));
      updatedEvents.push(mergedEvent);

      // Sắp xếp theo ngày
      updatedEvents.sort((a, b) => {
        const dateA = a.dateParsed?.date || '';
        const dateB = b.dateParsed?.date || '';
        return dateA.localeCompare(dateB);
      });

      setEvents(updatedEvents);
      await saveEvents(updatedEvents);

      // Reset
      setSelectedEventIds(new Set());
      setShowMergeModal(false);

      setSaveStatus({
        message: `Đã gộp ${eventsToMerge.length} sự kiện thành công!`,
        type: 'success',
      });
      setTimeout(() => setSaveStatus(null), 5000);
    } catch (error) {
      console.error('Error merging events:', error);
      setSaveStatus({
        message: 'Lỗi khi gộp sự kiện',
        type: 'error',
      });
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const handleDownloadImages = async (event: TimelineEvent) => {
    if (!event.images || event.images.length === 0) {
      setSaveStatus({
        message: 'Sự kiện này không có ảnh để download',
        type: 'warning',
      });
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }

    try {
      setSaveStatus({
        message: `Đang download ${event.images.length} ảnh...`,
        type: 'info',
      });

      // Format ngày thành YYYY-MM-DD
      let dateStr = '';
      if (event.dateParsed?.date) {
        const date = new Date(event.dateParsed.date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      } else {
        // Fallback nếu không có dateParsed
        const dateParts = event.date.split('/');
        if (dateParts.length === 3) {
          // DD/MM/YYYY
          dateStr = `${dateParts[2]}-${dateParts[1].padStart(
            2,
            '0'
          )}-${dateParts[0].padStart(2, '0')}`;
        } else if (dateParts.length === 2) {
          // MM/YYYY
          dateStr = `${dateParts[1]}-${dateParts[0].padStart(2, '0')}-01`;
        } else {
          // YYYY
          dateStr = `${dateParts[0]}-01-01`;
        }
      }

      // Lấy type của sự kiện
      const eventType = event.type || 'other';

      // Download từng ảnh một cách tuần tự với delay nhỏ để tránh browser block
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < event.images.length; i++) {
        const img = event.images[i];
        if (!img.path) {
          failCount++;
          continue;
        }

        try {
          // Fetch ảnh từ server
          const response = await fetch(img.path);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const blob = await response.blob();

          // Tạo URL và download
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;

          // Tạo tên file theo format: {YYYY-MM-DD}-{type}-{count}
          const count = String(i + 1).padStart(3, '0'); // 001, 002, 003...
          // Lấy extension từ tên file gốc hoặc từ path
          const originalName = img.name || img.path || '';
          const extension = originalName.includes('.')
            ? originalName.split('.').pop()?.toLowerCase() || 'jpg'
            : 'jpg';
          a.download = `${dateStr}-${eventType}-${count}.${extension}`;

          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          // Delay nhỏ giữa các lần download để tránh browser block
          await new Promise((resolve) => setTimeout(resolve, 200));

          window.URL.revokeObjectURL(url);
          successCount++;
        } catch (error) {
          console.error(`Error downloading image ${img.name}:`, error);
          failCount++;
        }
      }

      // Hiển thị kết quả
      if (successCount > 0) {
        setSaveStatus({
          message: `Đã download ${successCount} ảnh thành công${
            failCount > 0 ? ` (${failCount} lỗi)` : ''
          }!`,
          type: 'success',
        });
      } else {
        setSaveStatus({
          message: `Không thể download ảnh (${failCount} lỗi)`,
          type: 'error',
        });
      }
      setTimeout(() => setSaveStatus(null), 5000);
    } catch (error: any) {
      console.error('Error downloading images:', error);
      setSaveStatus({
        message: `Lỗi khi download ảnh: ${error.message}`,
        type: 'error',
      });
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const handleDeleteExistingImage = async (
    imageId: number,
    imagePath: string
  ) => {
    console.log('handleDeleteExistingImage called:', { imageId, imagePath });

    if (
      !confirm(
        'Bạn có chắc chắn muốn xóa ảnh này?\n\nẢnh sẽ bị xóa vĩnh viễn khỏi sự kiện và thư mục.'
      )
    ) {
      console.log('User cancelled deletion');
      return;
    }

    try {
      setSaveStatus({
        message: 'Đang xóa ảnh...',
        type: 'info',
      });

      // Xóa file ảnh từ server
      if (imagePath) {
        console.log('Deleting image from server:', imagePath);
        const response = await fetch(
          `/api/delete-image?path=${encodeURIComponent(imagePath)}`,
          {
            method: 'DELETE',
          }
        );
        const result = await response.json();
        console.log('Delete API response:', result);

        if (!result.success) {
          console.error('Error deleting image file:', result.error);
          setSaveStatus({
            message: result.error || 'Không thể xóa file ảnh từ server',
            type: 'error',
          });
          setTimeout(() => setSaveStatus(null), 3000);
          // Vẫn tiếp tục xóa khỏi danh sách dù file không xóa được
        }
      }

      // Xóa ảnh khỏi danh sách existingImages (chỉ trong popup edit)
      setExistingImages((prev) => {
        const filtered = prev.filter((img) => img.id !== imageId);
        console.log(
          'Updated existingImages:',
          filtered.length,
          'images remaining'
        );
        return filtered;
      });

      // Nếu đang edit sự kiện, cập nhật luôn trong editingEvent
      if (editingEvent) {
        setEditingEvent({
          ...editingEvent,
          images: editingEvent.images.filter((img) => img.id !== imageId),
        });
        console.log('Updated editingEvent images');
      }

      setSaveStatus({
        message: 'Đã xóa ảnh thành công',
        type: 'success',
      });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Error deleting image:', error);
      setSaveStatus({
        message: `Lỗi khi xóa ảnh: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        type: 'error',
      });
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const handleImportFacebook = async (showConfirm = true) => {
    if (
      showConfirm &&
      !confirm(
        'Bạn có muốn import lại sự kiện từ Facebook?\n\n' +
          'Lưu ý: Chỉ import các sự kiện mới, không trùng lặp với dữ liệu hiện có.\n' +
          'Quá trình này có thể mất vài phút.'
      )
    ) {
      return;
    }

    setImporting(true);
    try {
      const response = await fetch('/api/import-facebook', {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success) {
        // Cập nhật thời gian import
        localStorage.setItem('facebook_imported', 'true');
        localStorage.setItem('facebook_import_date', new Date().toISOString());

        if (result.imported > 0) {
          setSaveStatus({
            message: `Đã import ${result.imported} sự kiện mới từ Facebook! (Tổng: ${result.total} sự kiện)`,
            type: 'success',
          });
        } else {
          setSaveStatus({
            message: `Không có sự kiện mới để import. (Tổng: ${result.total} sự kiện)`,
            type: 'info',
          });
        }
        // Reload events
        await loadEvents();
      } else {
        setSaveStatus({
          message: result.error || 'Không thể import từ Facebook',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error importing Facebook:', error);
      setSaveStatus({
        message: 'Lỗi khi import từ Facebook',
        type: 'error',
      });
    } finally {
      setImporting(false);
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className='container'>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='container'>
      <header>
        <h1>📅 Timeline Mối Quan Hệ</h1>
        <p className='subtitle'>Hồ sơ bảo lãnh vợ con định cư Mỹ</p>
      </header>

      <div className='main-content'>
        <div className='timeline-section'>
          <div className='timeline-header'>
            <div>
              <h2>Timeline Mối Quan Hệ</h2>
              {saveStatus && (
                <div className={`save-status ${saveStatus.type}`}>
                  {saveStatus.message}
                </div>
              )}
              <div className='event-count'>
                Tổng cộng: {events.length} sự kiện
                {selectedEventIds.size > 0 && (
                  <span className='selected-count'>
                    {' '}
                    ({selectedEventIds.size} đã chọn)
                  </span>
                )}
                {selectedEventIds.size > 0 && (
                  <button
                    className='btn-clear-selection'
                    onClick={() => setSelectedEventIds(new Set())}
                    title='Bỏ chọn tất cả'
                  >
                    ✕ Bỏ chọn
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className='timeline-container'>
            {events.length === 0 ? (
              <p className='empty-message'>
                Chưa có sự kiện nào. Hãy thêm sự kiện đầu tiên của bạn!
              </p>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className={`timeline-item ${
                    selectedEventIds.has(event.id) ? 'selected' : ''
                  }`}
                >
                  <div className='timeline-item-header'>
                    <div className='timeline-item-checkbox'>
                      <input
                        type='checkbox'
                        checked={selectedEventIds.has(event.id)}
                        onChange={() => toggleEventSelection(event.id)}
                        title='Chọn để gộp sự kiện'
                      />
                    </div>
                    <div className='timeline-item-content'>
                      <div className='timeline-item-date'>
                        {event.endDate && event.endDateParsed
                          ? `${formatDate(event.dateParsed)} - ${formatDate(
                              event.endDateParsed
                            )}`
                          : formatDate(event.dateParsed)}
                      </div>
                      <div className='timeline-item-type'>
                        {EVENT_TYPES.find((t) => t.value === event.type)
                          ?.label || event.type}
                      </div>
                      <div className='timeline-item-title'>{event.title}</div>
                      {event.description && (
                        <div className='timeline-item-description'>
                          {event.description}
                        </div>
                      )}
                      {(event.location ||
                        event.witnesses ||
                        event.documents) && (
                        <div className='timeline-item-details'>
                          {event.location && (
                            <div className='timeline-item-detail'>
                              <strong>Địa điểm:</strong>
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.witnesses && (
                            <div className='timeline-item-detail'>
                              <strong>Người chứng kiến:</strong>
                              <span>{event.witnesses}</span>
                            </div>
                          )}
                          {event.documents && (
                            <div className='timeline-item-detail'>
                              <strong>Tài liệu:</strong>
                              <span>{event.documents}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {event.images && event.images.length > 0 && (
                        <div className='timeline-images'>
                          <div className='timeline-images-header'>
                            <div className='timeline-images-title'>
                              Hình ảnh:
                            </div>
                            <button
                              className='btn-download-images'
                              onClick={() => handleDownloadImages(event)}
                              title={`Lưu ${event.images.length} ảnh nhanh`}
                            >
                              📥 Lưu ảnh nhanh ({event.images.length})
                            </button>
                          </div>
                          <div className='timeline-image-gallery'>
                            {event.images.map((img) => (
                              <div
                                key={img.id}
                                className='timeline-image-item'
                                onClick={() =>
                                  openImageModal(img.path || '', img.name)
                                }
                              >
                                <img src={img.path || ''} alt={img.name} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className='timeline-item-actions'>
                      <button
                        className='btn-edit'
                        onClick={() => handleEdit(event)}
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        className='btn-delete'
                        onClick={() => handleDelete(event.id)}
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className='modal active' style={{ display: 'flex' }}>
          <div className='modal-content'>
            <div className='modal-header'>
              <h2>{editingEvent ? '✏️ Sửa Sự Kiện' : '➕ Thêm Sự Kiện Mới'}</h2>
              <button
                className='modal-close'
                onClick={() => {
                  setExistingImages([]);
                  setShowModal(false);
                }}
              >
                &times;
              </button>
            </div>
            <div className='modal-body'>
              <form onSubmit={handleSubmit}>
                {/* Các field ngắn nằm trên cùng 1 hàng */}
                <div className='form-group-row'>
                  <div className='form-group'>
                    <label htmlFor='eventDate'>Ngày bắt đầu:</label>
                    <input
                      type='text'
                      id='eventDate'
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      placeholder='DD/MM/YYYY hoặc MM/YYYY hoặc YYYY'
                      required
                    />
                    <small className='form-hint'>Ví dụ: 15/03/2020</small>
                  </div>

                  <div className='form-group'>
                    <label htmlFor='eventEndDate'>
                      Ngày kết thúc (tùy chọn):
                    </label>
                    <input
                      type='text'
                      id='eventEndDate'
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                      placeholder='DD/MM/YYYY (để trống nếu 1 ngày)'
                    />
                    <small className='form-hint'>Để trống nếu chỉ 1 ngày</small>
                  </div>

                  <div className='form-group'>
                    <label htmlFor='eventType'>Loại sự kiện:</label>
                    <select
                      id='eventType'
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      required
                    >
                      <option value=''>-- Chọn loại --</option>
                      {EVENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className='form-group'>
                  <label htmlFor='eventTitle'>Tiêu đề sự kiện:</label>
                  <input
                    type='text'
                    id='eventTitle'
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder='Ví dụ: Lần đầu gặp mặt tại...'
                    required
                  />
                </div>

                <div className='form-group'>
                  <label htmlFor='eventDescription'>Mô tả chi tiết:</label>
                  <textarea
                    id='eventDescription'
                    rows={4}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder='Mô tả chi tiết về sự kiện, địa điểm, người tham gia, cảm xúc...'
                  />
                </div>

                {/* Các field ngắn khác nằm trên cùng 1 hàng */}
                <div className='form-group-row'>
                  <div className='form-group'>
                    <label htmlFor='eventLocation'>Địa điểm:</label>
                    <input
                      type='text'
                      id='eventLocation'
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      placeholder='Ví dụ: Hà Nội, Việt Nam'
                    />
                  </div>

                  <div className='form-group'>
                    <label htmlFor='eventWitnesses'>Người chứng kiến:</label>
                    <input
                      type='text'
                      id='eventWitnesses'
                      value={formData.witnesses}
                      onChange={(e) =>
                        setFormData({ ...formData, witnesses: e.target.value })
                      }
                      placeholder='Ví dụ: Gia đình, bạn bè...'
                    />
                  </div>

                  <div className='form-group'>
                    <label htmlFor='eventDocuments'>Tài liệu đính kèm:</label>
                    <input
                      type='text'
                      id='eventDocuments'
                      value={formData.documents}
                      onChange={(e) =>
                        setFormData({ ...formData, documents: e.target.value })
                      }
                      placeholder='Ví dụ: Giấy tờ, vé máy bay...'
                    />
                  </div>
                </div>

                {/* Hiển thị ảnh hiện có (khi edit) */}
                {editingEvent && existingImages.length > 0 && (
                  <div className='form-group'>
                    <label>Ảnh hiện có:</label>
                    <div className='image-preview-container'>
                      {existingImages.map((img) => (
                        <div key={img.id} className='image-preview-item'>
                          <img
                            src={img.path || ''}
                            alt={img.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                '/placeholder-image.png';
                            }}
                          />
                          <button
                            type='button'
                            className='remove-image'
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log(
                                'Delete button clicked for image:',
                                img.id,
                                img.path
                              );
                              handleDeleteExistingImage(img.id, img.path || '');
                            }}
                            title='Xóa ảnh (sẽ xóa file khỏi thư mục)'
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <small className='form-hint'>
                      Click × để xóa ảnh. Ảnh sẽ bị xóa vĩnh viễn khỏi thư mục.
                    </small>
                  </div>
                )}

                <div className='form-group'>
                  <label htmlFor='eventImages'>
                    {editingEvent
                      ? 'Thêm ảnh mới (tùy chọn):'
                      : 'Hình ảnh (có thể chọn nhiều):'}
                  </label>
                  <input
                    ref={fileInputRef}
                    type='file'
                    id='eventImages'
                    accept='image/*'
                    multiple
                    onChange={handleImageSelect}
                  />
                  {imagePreviews.length > 0 && (
                    <div className='image-preview-container'>
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className='image-preview-item'>
                          <img src={preview} alt={`Preview ${index}`} />
                          <button
                            type='button'
                            className='remove-image'
                            onClick={() => removeImagePreview(index)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className='modal-footer'>
                  <button
                    type='button'
                    className='btn-secondary'
                    onClick={() => {
                      setExistingImages([]);
                      setShowModal(false);
                    }}
                  >
                    Hủy
                  </button>
                  <button type='submit' className='btn-primary'>
                    {editingEvent ? 'Cập nhật' : 'Thêm Sự Kiện'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Merge Events Modal */}
      {showMergeModal && (
        <MergeEventsModal
          events={events.filter((e) => selectedEventIds.has(e.id))}
          onConfirm={handleConfirmMerge}
          onCancel={() => setShowMergeModal(false)}
        />
      )}

      {/* Image Modal */}
      {imageModal && (
        <div className='image-modal active' onClick={() => setImageModal(null)}>
          <div
            className='image-modal-content'
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className='image-modal-close'
              onClick={() => setImageModal(null)}
            >
              &times;
            </button>
            <img src={imageModal.src} alt={imageModal.name} />
          </div>
        </div>
      )}

      {/* Floating Add Button */}
      <button
        className='floating-add-btn'
        onClick={(e) => {
          e.preventDefault();
          setEditingEvent(null);
          setFormData({
            date: '',
            endDate: '',
            type: '',
            title: '',
            description: '',
            location: '',
            witnesses: '',
            documents: '',
          });
          setSelectedImages([]);
          setImagePreviews([]);
          setShowModal(true);
        }}
        title='Thêm sự kiện mới'
      >
        <span className='floating-add-icon'>➕</span>
      </button>

      {/* Floating Merge Button */}
      {selectedEventIds.size >= 2 && (
        <button
          className='floating-merge-btn'
          onClick={handleMergeEvents}
          title={`Gộp ${selectedEventIds.size} sự kiện đã chọn`}
        >
          🔗 {selectedEventIds.size}
        </button>
      )}
    </div>
  );
}
