import { Link } from 'react-router-dom';

export function Privacy() {
  return (
    <div className="min-h-screen bg-[#F4F7F6] font-sans pt-12 pb-24">
      <div className="max-w-3xl mx-auto px-6">
        <Link to="/welcome" className="inline-flex items-center text-[#1B5E20] font-bold hover:underline mb-8">
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Home
        </Link>
        
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-8">Privacy Policy</h1>
          
          <div className="space-y-6 text-gray-600 leading-relaxed">
            <p><strong>Last Updated:</strong> August 2026</p>
            
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
              <p>When you use FarmPilot, we collect information that you provide to us directly, such as your phone number, name, and farm details. We also collect data related to your crops, seasons, and recorded expenses to provide accurate cost estimations and analytics.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li>Provide, maintain, and improve our services.</li>
                <li>Calculate crop estimates and benchmark your spending against agricultural standards.</li>
                <li>Communicate with you regarding your account and platform updates.</li>
                <li>Protect against fraud and unauthorized access.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Data Security and Offline Storage</h2>
              <p>FarmPilot is built to work offline. Your farm data is stored locally on your device using IndexedDB and is synchronized securely with our servers when an internet connection is available. We implement industry-standard encryption protocols to protect your data during transit and at rest.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Sharing of Information</h2>
              <p>We do not sell your personal data to third parties. We may share aggregated, non-personally identifiable data with agricultural research partners to improve farming benchmarks and policy recommendations for smallholder farmers in Ghana.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Your Rights</h2>
              <p>You have the right to access, correct, or delete your personal information. You can manage your profile settings directly within the FarmPilot dashboard or contact our support team for assistance.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Contact Us</h2>
              <p>If you have any questions or concerns about this Privacy Policy, please contact us at privacy@farmpilot.example.com.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
