import { Link } from 'react-router-dom';

export function Terms() {
  return (
    <div className="min-h-screen bg-[#F4F7F6] font-sans pt-12 pb-24">
      <div className="max-w-3xl mx-auto px-6">
        <Link to="/welcome" className="inline-flex items-center text-[#1B5E20] font-bold hover:underline mb-8">
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Home
        </Link>
        
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-8">Terms of Service</h1>
          
          <div className="space-y-6 text-gray-600 leading-relaxed">
            <p><strong>Last Updated:</strong> August 2026</p>
            
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
              <p>By accessing or using FarmPilot (the "Service"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you do not have permission to access the Service.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Description of Service</h2>
              <p>FarmPilot provides agricultural cost tracking and estimation tools specifically designed for smallholder farmers in Ghana. The platform allows users to log expenses, manage crop seasons, and receive benchmark-based estimations.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. User Accounts</h2>
              <p>To use certain features of the Service, you must register for an account using a valid phone number. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Data Accuracy and Estimations</h2>
              <p>While FarmPilot strives to provide accurate benchmarks and cost estimations based on data from the Ministry of Food and Agriculture (MoFA), these are <strong>estimates only</strong>. FarmPilot is not responsible for any financial losses or farming outcomes resulting from reliance on the application's calculations.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Offline Functionality</h2>
              <p>The Service includes features that function offline. You are responsible for ensuring your device periodically connects to the internet to synchronize data to our servers to prevent data loss in the event of device failure.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Modifications to Service</h2>
              <p>We reserve the right to modify or discontinue, temporarily or permanently, the Service with or without notice. We shall not be liable to you or to any third party for any modification, suspension, or discontinuance of the Service.</p>
            </section>
            
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Contact Information</h2>
              <p>For any questions regarding these Terms, please contact us at support@farmpilot.example.com.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
