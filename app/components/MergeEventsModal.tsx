'use client';

import { useState, useEffect } from 'react';
import { TimelineEvent } from '../page';

interface MergeEventsModalProps {
  events: TimelineEvent[];
  onConfirm: (mergeData: {
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
  }) => void;
  onCancel: () => void;
}

export default function MergeEventsModal({
  events,
  onConfirm,
  onCancel,
}: MergeEventsModalProps) {
  const [formData, setFormData] = useState({
    date: '',
    endDate: '',
    type: '',
    title: '',
    description: '',
    location: '',
    witnesses: '',
    documents: '',
  });

  useEffect(() => {
    if (events.length > 0) {
      // Lấy dữ liệu từ sự kiện đầu tiên làm mặc định
      const firstEvent = events[0];
      setFormData({
        date: firstEvent.date,
        endDate: firstEvent.endDate || '',
        type: firstEvent.type,
        title: firstEvent.title,
        description: events.map((e) => e.description).join('\n\n'),
        location: events
          .map((e) => e.location)
          .filter((l) => l)
          .join(', '),
        witnesses: events
          .map((e) => e.witnesses)
          .filter((w) => w)
          .join(', '),
        documents: events
          .map((e) => e.documents)
          .filter((d) => d)
          .join(', '),
      });
    }
  }, [events]);

  const parseDate = (dateStr: string) => {
    if (!dateStr) return null;
    const trimmed = dateStr.trim();

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const dateParsed = parseDate(formData.date);
    if (!dateParsed) {
      alert('Định dạng ngày không hợp lệ');
      return;
    }

    let endDateParsed = null;
    if (formData.endDate && formData.endDate.trim()) {
      endDateParsed = parseDate(formData.endDate);
      if (!endDateParsed) {
        alert('Định dạng ngày kết thúc không hợp lệ');
        return;
      }
    }

    onConfirm({
      date: formData.date,
      dateParsed,
      ...(formData.endDate && endDateParsed
        ? {
            endDate: formData.endDate,
            endDateParsed,
          }
        : {}),
      type: formData.type,
      title: formData.title,
      description: formData.description,
      location: formData.location,
      witnesses: formData.witnesses,
      documents: formData.documents,
    });
  };

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

  return (
    <div className='modal active' style={{ display: 'flex' }}>
      <div className='modal-content'>
        <div className='modal-header'>
          <h2>🔗 Gộp {events.length} Sự Kiện</h2>
          <button className='modal-close' onClick={onCancel}>
            &times;
          </button>
        </div>
        <div className='modal-body'>
          <div className='merge-info'>
            <p>
              <strong>Các sự kiện sẽ được gộp:</strong>
            </p>
            <ul>
              {events.map((event) => (
                <li key={event.id}>
                  {event.date} - {event.title}
                </li>
              ))}
            </ul>
            <p>
              <strong>Tổng số ảnh:</strong>{' '}
              {events.reduce((sum, e) => sum + (e.images?.length || 0), 0)}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className='form-group-row'>
              <div className='form-group'>
                <label htmlFor='mergeDate'>Ngày bắt đầu:</label>
                <input
                  type='text'
                  id='mergeDate'
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  placeholder='DD/MM/YYYY'
                  required
                />
              </div>

              <div className='form-group'>
                <label htmlFor='mergeEndDate'>Ngày kết thúc (tùy chọn):</label>
                <input
                  type='text'
                  id='mergeEndDate'
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  placeholder='DD/MM/YYYY'
                />
              </div>

              <div className='form-group'>
                <label htmlFor='mergeType'>Loại sự kiện:</label>
                <select
                  id='mergeType'
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
              <label htmlFor='mergeTitle'>Tiêu đề sự kiện:</label>
              <input
                type='text'
                id='mergeTitle'
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            <div className='form-group'>
              <label htmlFor='mergeDescription'>Mô tả chi tiết:</label>
              <textarea
                id='mergeDescription'
                rows={6}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className='form-group-row'>
              <div className='form-group'>
                <label htmlFor='mergeLocation'>Địa điểm:</label>
                <input
                  type='text'
                  id='mergeLocation'
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </div>

              <div className='form-group'>
                <label htmlFor='mergeWitnesses'>Người chứng kiến:</label>
                <input
                  type='text'
                  id='mergeWitnesses'
                  value={formData.witnesses}
                  onChange={(e) =>
                    setFormData({ ...formData, witnesses: e.target.value })
                  }
                />
              </div>

              <div className='form-group'>
                <label htmlFor='mergeDocuments'>Tài liệu:</label>
                <input
                  type='text'
                  id='mergeDocuments'
                  value={formData.documents}
                  onChange={(e) =>
                    setFormData({ ...formData, documents: e.target.value })
                  }
                />
              </div>
            </div>

            <div className='modal-footer'>
              <button
                type='button'
                className='btn-secondary'
                onClick={onCancel}
              >
                Hủy
              </button>
              <button type='submit' className='btn-primary'>
                Xác nhận gộp
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

