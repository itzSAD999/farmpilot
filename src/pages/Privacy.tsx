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
            <p><strong>Last Updated:</strong> September 2026</p>

            <section>
              <p>FarmPilot is a mini project built for the Department of Computer Science, Kwame Nkrumah University of Science and Technology, and operated as a demonstration application rather than a commercial service. This policy describes what the running application actually does with your data, not a generic template.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
              <p>When you use FarmPilot, we collect information that you provide to us directly, such as your phone number or email, name, and farm details (region, district, total acreage). We also collect the crop seasons, per-category cost entries, and any figures you back-fill for previous years that you choose to record, so the app can generate estimates and detect overspending against the benchmark.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li>Provide, maintain, and improve our services.</li>
                <li>Calculate crop estimates and benchmark your spending against agricultural standards, including flagging categories that exceed the benchmark and suggesting a specific fix.</li>
                <li>Power the in-app Weekly Check-in prompt and the AI farm assistant, both of which read your own recorded and flagged data to answer your questions — this happens within the app itself and is not shared with any other user.</li>
                <li>Communicate with you regarding your account and platform updates.</li>
                <li>Protect against fraud and unauthorized access.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Data Security and Offline Storage</h2>
              <p>FarmPilot is built to work offline. Your farm data is cached locally on your device and is synchronized with our servers (hosted on Supabase, a PostgreSQL-based backend) when an internet connection is available. Access to your data is enforced by row-level security policies on the server, so only your own account can read or write your farm's records — this is a database-level guarantee, not just a check in the app.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Sharing of Information</h2>
              <p>We do not sell your personal data to third parties. As a mini project, FarmPilot does not currently share aggregated data with any external research partner — the benchmark figures the app compares you against come from published Ministry of Food and Agriculture (MoFA) statistics, not from other farmers' recorded data.</p>
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
