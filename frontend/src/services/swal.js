import Swal from 'sweetalert2';

const swalService = {

    defaultWidth: '450px',

    success: (title, text) => {
        return Swal.fire({
            icon: 'success',
            title: title || 'Success!',
            text: text || '',
            timer: 2000,
            showConfirmButton: false,
            iconColor: '#10b981',
            padding: '2em',
            width: swalService.defaultWidth,
            customClass: {
                popup: 'rounded-2xl',
            }
        });
    },


    error: (title, content) => {

        const isHtml = typeof content === 'string' && content.trim().startsWith('<');

        return Swal.fire({
            icon: 'error',
            title: title || 'Error!',

            [isHtml ? 'html' : 'text']: content || 'Something went wrong.',
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Understood',

            width: isHtml ? '600px' : swalService.defaultWidth,
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
            width: swalService.defaultWidth,
            customClass: {
                popup: 'rounded-2xl',
            }
        });
    },

    showLoading: (title = 'Processing...') => {
        Swal.fire({
            title: title,
            allowOutsideClick: false,
            width: swalService.defaultWidth,
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