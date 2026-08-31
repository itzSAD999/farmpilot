import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="min-h-screen bg-[#F4F7F6] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 md:p-12 rounded-[32px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 text-center">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">404</h1>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Page Not Found</h2>
        <p className="text-gray-500 mb-8 font-medium leading-relaxed">
          The page you are looking for doesn't exist or has been moved. Let's get you back to the farm.
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center justify-center w-full min-h-[44px] bg-[#1B5E20] hover:bg-[#144718] text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-sm active:scale-95"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
