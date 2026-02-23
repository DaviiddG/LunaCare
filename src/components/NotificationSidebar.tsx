import { useEffect, useState } from 'react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
}

interface NotificationSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onUnreadChange?: (count: number) => void;
}

export function NotificationSidebar({ isOpen, onClose, onUnreadChange }: NotificationSidebarProps) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = async () => {
        if (!user) return;
        setLoading(true);
        const { data } = await dbHelpers.getNotifications(user.id);
        if (data) {
            setNotifications(data);
            const unreadCount = data.filter(n => !n.is_read).length;
            onUnreadChange?.(unreadCount);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen && user) {
            fetchNotifications();
        }
    }, [isOpen, user]);

    const markAsRead = async (id: string) => {
        await dbHelpers.markNotificationAsRead(id);
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
        const newUnreadCount = notifications.filter(n => n.id !== id ? !n.is_read : false).length;
        onUnreadChange?.(newUnreadCount);
    };

    const markAllAsRead = async () => {
        if (!user) return;
        await dbHelpers.markAllNotificationsAsRead(user.id);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        onUnreadChange?.(0);
    };

    const clearAll = async () => {
        if (!user) return;
        if (!window.confirm('¿Borrar todas las notificaciones?')) return;
        await dbHelpers.deleteAllNotifications(user.id);
        setNotifications([]);
        onUnreadChange?.(0);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'success': return 'check_circle';
            case 'warning': return 'warning';
            case 'error': return 'error';
            default: return 'info';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'success': return 'text-green-500 bg-green-50 dark:bg-green-500/10';
            case 'warning': return 'text-amber-500 bg-amber-50 dark:bg-amber-500/10';
            case 'error': return 'text-red-500 bg-red-50 dark:bg-red-500/10';
            default: return 'text-primary bg-primary/10';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Sidebar */}
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="px-6 pt-12 pb-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notificaciones</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Tus avisos y actividad</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-3">
                            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                            <p className="text-sm text-slate-400">Cargando...</p>
                        </div>
                    ) : notifications.length > 0 ? (
                        notifications.map(n => (
                            <div
                                key={n.id}
                                onClick={() => !n.is_read && markAsRead(n.id)}
                                className={`relative flex gap-4 p-4 rounded-2xl border transition-all ${n.is_read
                                        ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-80'
                                        : 'bg-indigo-50/30 dark:bg-primary/5 border-primary/20 shadow-sm'
                                    } cursor-pointer active:scale-[0.98]`}
                            >
                                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${getTypeColor(n.type)}`}>
                                    <span className="material-symbols-rounded text-xl">{getTypeIcon(n.type)}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-sm font-bold mb-1 ${n.is_read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                                        {n.title}
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-2">
                                        {n.message}
                                    </p>
                                    <span className="text-[10px] font-medium text-slate-400 flex items-center">
                                        <span className="material-symbols-rounded text-[12px] mr-1">schedule</span>
                                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                                    </span>
                                </div>
                                {!n.is_read && (
                                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary animate-pulse" />
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                            <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
                                <span className="material-symbols-rounded text-slate-300 text-4xl">notifications_off</span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Sin notificaciones</h3>
                            <p className="text-xs text-slate-400 max-w-[200px]">Te avisaremos cuando haya algo nuevo para ti.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                    <div className="p-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
                        <button
                            onClick={markAllAsRead}
                            className="flex items-center justify-center px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Leer todas
                        </button>
                        <button
                            onClick={clearAll}
                            className="flex items-center justify-center px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                        >
                            Borrar todo
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
