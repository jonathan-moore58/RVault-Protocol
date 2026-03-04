import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    type: ToastType;
    title: string;
    message?: string;
    exiting?: boolean;
}

interface ToastContextValue {
    toast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
    return useContext(ToastContext);
}

const icons: Record<ToastType, { path: string; color: string; bg: string }> = {
    success: {
        path: 'M5 13l4 4L19 7',
        color: '#00ffaa',
        bg: 'rgba(0,255,170,0.1)',
    },
    error: {
        path: 'M6 18L18 6M6 6l12 12',
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.1)',
    },
    info: {
        path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        color: '#00e5ff',
        bg: 'rgba(0,229,255,0.1)',
    },
};

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

    const removeToast = useCallback((id: number) => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 300);
    }, []);

    const toast = useCallback((type: ToastType, title: string, message?: string) => {
        const id = nextId++;
        setToasts((prev) => [...prev, { id, type, title, message }]);
        const timer = setTimeout(() => removeToast(id), 4000);
        timersRef.current.set(id, timer);
    }, [removeToast]);

    useEffect(() => {
        const timers = timersRef.current;
        return () => {
            timers.forEach((timer) => clearTimeout(timer));
        };
    }, []);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            {/* Toast container */}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3" style={{ maxWidth: 360 }}>
                {toasts.map((t) => {
                    const icon = icons[t.type];
                    return (
                        <div
                            key={t.id}
                            className={t.exiting ? 'toast-exit' : 'toast-enter'}
                            style={{
                                background: 'linear-gradient(135deg, rgba(5,10,14,0.95), rgba(10,17,24,0.95))',
                                border: `1px solid ${icon.color}25`,
                                backdropFilter: 'blur(20px)',
                                borderRadius: 14,
                                boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.04)`,
                            }}
                        >
                            {/* Top accent line */}
                            <div style={{
                                height: 2,
                                borderRadius: '14px 14px 0 0',
                                background: `linear-gradient(90deg, ${icon.color}60, ${icon.color}20, transparent)`,
                            }} />

                            <div className="flex items-start gap-3 px-4 py-3">
                                <div
                                    className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                                    style={{ background: icon.bg }}
                                >
                                    <svg className="h-3.5 w-3.5" style={{ color: icon.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d={icon.path} />
                                    </svg>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-semibold text-white">{t.title}</p>
                                    {t.message && (
                                        <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">{t.message}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => removeToast(t.id)}
                                    className="mt-0.5 flex-shrink-0 rounded-md p-1 text-gray-600 transition-colors hover:bg-white/5 hover:text-gray-400"
                                >
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}
