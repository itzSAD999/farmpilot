import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProfile, updateProfile } from '../api/auth';
import { updateFarm } from '../api/farms';
import { useAuth } from '../hooks/useAuth';
import { useFarm } from '../hooks/useFarm';
import type { Profile as ProfileType } from '../api/auth';

export function Profile() {
  const { user } = useAuth();
  const { farm } = useFarm();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [language, setLanguage] = useState<'en' | 'tw' | 'ee' | 'gaa' | 'dag'>('en');
  
  const [farmName, setFarmName] = useState('');
  const [farmRegion, setFarmRegion] = useState('');
  const [farmDistrict, setFarmDistrict] = useState('');
  const [farmArea, setFarmArea] = useState<number>(0);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: getProfile,
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setLanguage((profile.preferred_language as 'en' | 'tw' | 'ee' | 'gaa' | 'dag') || 'en');
    }
    if (farm) {
      setFarmName(String(farm.name || ''));
      setFarmRegion(String(farm.region || ''));
      setFarmDistrict(String(farm.district || ''));
      setFarmArea(Number(farm.total_area_acres) || 0);
    }
  }, [profile, farm]);

  const profileMutation = useMutation({
    mutationFn: (updates: Partial<ProfileType>) => updateProfile(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  const farmMutation = useMutation({
    mutationFn: (updates: any) => updateFarm(farm!.id as string | number, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm', user?.id] });
    }
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await profileMutation.mutateAsync({
        full_name: fullName,
        preferred_language: language,
      });
      
      if (farm) {
        await farmMutation.mutateAsync({
          name: farmName,
          region: farmRegion,
          district: farmDistrict,
          total_area_acres: farmArea,
        });
      }
      setIsEditing(false);
    } catch (error) {
      // Mutations handle their own error state
    }
  };

  const getLanguageName = (code: string) => {
    const langs: Record<string, string> = {
      en: 'English',
      tw: 'Twi',
      ee: 'Ewe',
      gaa: 'Ga',
      dag: 'Dagbani'
    };
    return langs[code] || 'English';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B5E20]"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up pb-12 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Your Profile</h1>
          <p className="text-gray-500 font-medium text-sm mt-1">Manage your account settings and preferences.</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="bg-white border border-gray-200 text-gray-700 font-bold py-2.5 px-4 rounded-xl shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            Edit Profile
          </button>
        )}
      </div>

      <div className="bg-white rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden mb-8">
        {isEditing ? (
          <form onSubmit={handleSave} className="p-8 space-y-8">
            {(profileMutation.isError || farmMutation.isError) && (
              <div className="bg-red-50 text-red-900 p-4 rounded-xl text-sm font-medium border border-red-100">
                {(profileMutation.error as Error)?.message || (farmMutation.error as Error)?.message}
              </div>
            )}
            
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-2">Personal Details</h2>
            
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 block">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  placeholder="Enter your name"
                  required
                />
              </div>
            
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 block">Preferred Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors appearance-none"
                >
                  <option value="en">English</option>
                  <option value="tw">Twi</option>
                  <option value="ee">Ewe</option>
                  <option value="gaa">Ga</option>
                  <option value="dag">Dagbani</option>
                </select>
              </div>
            </div>
            
            {farm && (
              <div className="space-y-6 pt-4">
                <h2 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-2">Farm Details</h2>
                
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700 block">Farm Name</label>
                  <input
                    type="text"
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700 block">Region</label>
                    <input
                      type="text"
                      value={farmRegion}
                      onChange={(e) => setFarmRegion(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700 block">District</label>
                    <input
                      type="text"
                      value={farmDistrict}
                      onChange={(e) => setFarmDistrict(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700 block">Total Area (Acres)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={farmArea}
                    onChange={(e) => setFarmArea(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    required
                  />
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4 border-t border-gray-100 mt-8 pt-8">
              <button
                type="submit"
                disabled={profileMutation.isPending || farmMutation.isPending}
                className="flex-1 bg-[#1B5E20] text-white font-bold py-3 px-4 rounded-xl shadow-sm hover:bg-[#144718] transition-colors disabled:opacity-50"
              >
                {profileMutation.isPending || farmMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFullName(profile?.full_name || '');
                  setLanguage((profile?.preferred_language as any) || 'en');
                  if (farm) {
                    setFarmName(String(farm.name || ''));
                    setFarmRegion(String(farm.region || ''));
                    setFarmDistrict(String(farm.district || ''));
                    setFarmArea(Number(farm.total_area_acres) || 0);
                  }
                }}
                disabled={profileMutation.isPending || farmMutation.isPending}
                className="flex-1 bg-white border border-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Full Name</h3>
                  <p className="text-lg font-bold text-gray-900">{profile?.full_name || 'Not provided'}</p>
                </div>
                
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Preferred Language</h3>
                  <p className="text-lg font-bold text-gray-900">{getLanguageName(profile?.preferred_language || 'en')}</p>
                </div>
                
                {farm && (
                  <>
                    <hr className="border-gray-100" />
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Farm Name</h3>
                      <p className="text-lg font-bold text-gray-900">{String(farm.name)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Location</h3>
                        <p className="font-bold text-gray-900">{farm.district || farm.region ? `${String(farm.district)}, ${String(farm.region)}` : 'Not provided'}</p>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Acres</h3>
                        <p className="font-bold text-gray-900">{Number(farm.total_area_acres)}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <div className="space-y-6 bg-gray-50 p-6 rounded-2xl border border-gray-100 h-fit">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Sign In Method</h3>
                  <p className="text-sm font-bold text-gray-900 capitalize">{profile?.auth_method}</p>
                </div>
                
                {profile?.phone && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Phone Number</h3>
                    <p className="text-lg font-bold text-gray-900">{profile.phone}</p>
                  </div>
                )}
                
                {profile?.email && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Email</h3>
                    <p className="text-lg font-bold text-gray-900">{profile.email}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
