import { useState, useEffect } from 'react';

// Extend window object for PWA install event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string
  }>;
  prompt(): Promise<void>;
}

export function PwaInstallPrompt() {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if dismissed before
    const hasDismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (hasDismissed) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
      // Show the install prompt
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPromptEvent) return;

    // Show the install prompt
    installPromptEvent.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await installPromptEvent.userChoice;
    
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    
    // Clear the saved prompt since it can't be used again
    setInstallPromptEvent(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="print-hide fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 p-4 z-50 animate-fade-in-up md:max-w-md md:left-auto md:right-4 md:bottom-4">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-[24px] p-5 shadow-[0_8px_40px_rgb(0,0,0,0.12)] border border-gray-100 dark:border-white/10 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-[#1B5E20] rounded-xl flex items-center justify-center mr-3 shadow-sm">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <div>
              <h3 className="text-gray-900 dark:text-gray-100 font-bold">Install FarmPilot</h3>
              <p className="text-gray-500 text-xs font-medium">Add to home screen for offline access</p>
            </div>
          </div>
          <button 
            onClick={handleDismiss}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-900 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <button 
          onClick={handleInstall}
          className="w-full py-3 bg-[#1B5E20] text-white font-bold rounded-xl hover:bg-[#144718] transition-colors"
        >
          Install App
        </button>
      </div>
    </div>
  );
}
