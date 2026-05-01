import Swal from 'sweetalert2';

const swalService = {
    success: (title, text) => {
        return Swal.fire({
            icon: 'success',
            title: title || 'Success!',
            text: text || '',
            timer: 2000,
            showConfirmButton: false,
            iconColor: '#10b981',
            padding: '2em',
            customClass: {
                popup: 'rounded-2xl',
            }
        });
    },

    // تنبيه الخطأ المعدل ليدعم النص والـ HTML تلقائياً
    error: (title, content) => {
        // فحص ما إذا كان المحتوى نصاً يحتوي على وسم HTML
        const isHtml = typeof content === 'string' && content.trim().startsWith('<');

        return Swal.fire({
            icon: 'error',
            title: title || 'Error!',
            // استخدام الخاصية المناسبة بناءً على نوع المحتوى
            [isHtml ? 'html' : 'text']: content || 'Something went wrong.',
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Try Again',
            // زيادة العرض فقط في حالة عرض جدول التعارضات ليكون مريحاً للعين
            width: isHtml ? '600px' : 'auto',
            customClass: {
                popup: 'rounded-2xl',
            }
        });
    },

    confirm: async (title, text, confirmText = 'Yes, I confirm!') => {
        return Swal.fire({
            title: title || 'Are you sure?',
            text: text || "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var( --primary-blue-color)',
            cancelButtonColor: '#186F8F',
            confirmButtonText: confirmText,
            cancelButtonText: 'Cancel',
            reverseButtons: true,
            customClass: {
                popup: 'rounded-2xl',
            }
        });
    },

    showLoading: (title = 'Processing...') => {
        Swal.fire({
            title: title,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
            customClass: {
                popup: 'rounded-2xl',
            }
        });
    },

    close: () => {
        Swal.close();
    }
};

export default swalService;