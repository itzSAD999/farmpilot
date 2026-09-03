import { Link } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';

export function Notifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, isLoading } = useNotifications();

  return (
    <div className="max-w-2xl mx-auto py-8 px-6 lg:px-8 animate-fade-in pb-24">
      <Link to="/profile" className="text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors flex items-center mb-6 group w-max">
        <span className="w-8 h-8 rounded-full bg-white dark:bg-white/5 shadow-sm flex items-center justify-center mr-3 group-hover:bg-gray-50 dark:group-hover:bg-white/10 transition-colors border border-gray-100 dark:border-white/10">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </span>
        Back to Settings
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Notifications</h1>
        {unreadCount > 0 && (
          <button onClick={() => markAllAsRead()} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
            Mark all as read
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-white/5 rounded-[24px] border border-gray-100 dark:border-white/10 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400 text-sm">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">You're all caught up! Nothing here yet.</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">You'll see an alert here the moment a recorded cost comes in above the standard benchmark.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-white/5">
            {notifications.map((notif) => (
              <div key={notif.id} className={`p-5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors relative group ${!notif.is_read ? 'bg-blue-50/30 dark:bg-blue-500/5' : ''}`}>
                {!notif.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 cursor-pointer" onClick={() => !notif.is_read && markAsRead(notif.id)}>
                    <h4 className={`text-sm mb-1 ${!notif.is_read ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                      {notif.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2">{notif.message}</p>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteNotification(notif.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100"
                    title="Delete notification"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
