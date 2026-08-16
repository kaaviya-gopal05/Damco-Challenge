import toast from 'react-hot-toast';

export const notify = {
  success: (message: string) =>
    toast.success(message, {
      style: {
        borderRadius: '12px',
        background: '#1e1e27',
        color: '#fff',
        fontSize: '14px',
      },
      iconTheme: { primary: '#17b39d', secondary: '#fff' },
    }),
  error: (message: string) =>
    toast.error(message, {
      style: {
        borderRadius: '12px',
        background: '#1e1e27',
        color: '#fff',
        fontSize: '14px',
      },
      iconTheme: { primary: '#e11d48', secondary: '#fff' },
    }),
  info: (message: string) =>
    toast(message, {
      style: {
        borderRadius: '12px',
        background: '#1e1e27',
        color: '#fff',
        fontSize: '14px',
      },
    }),
};
