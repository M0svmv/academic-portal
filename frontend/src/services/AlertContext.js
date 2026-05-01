import React, { createContext, useContext } from 'react';
import Swal from 'sweetalert2';

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {

    const confirm = async ({ title, text, icon = 'warning' }) => {
        const result = await Swal.fire({
            title,
            text,
            icon,
            showCancelButton: true,
            confirmButtonColor: '#186F8F',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes',
            reverseButtons: true
        });
        return result.isConfirmed;
    };

    const showAlert = ({ title, text, icon = 'success' }) => {
        Swal.fire({
            title,
            text,
            icon,
            confirmButtonColor: '#186F8F',
        });
    };

    return (
        <AlertContext.Provider value={{ confirm, showAlert }}>
            {children}
        </AlertContext.Provider>
    );
};

// السطر ده هو اللي كان ناقص ومسبب الـ Error في الـ 9 ملفات
export const useAlert = () => useContext(AlertContext);