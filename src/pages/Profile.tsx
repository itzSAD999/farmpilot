import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProfile, updateProfile } from '../api/auth';
import { updateFarm } from '../api/farms';
import { useAuth } from '../hooks/useAuth';
import { useFarm } from '../hooks/useFarm';
import type { Profile as ProfileType } from '../api/auth';
import { useTheme } from '../hooks/useTheme';
import { useNavigate } from 'react-router-dom';

export function Profile() {
  const { user, signOut } = useAuth();
  const { farm } = useFarm();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Individual Editing States
  const [editingField, setEditingField] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<any>({
    full_name: '',
    phone: '',
    language: 'en',
    farm_name: '',
    farm_region: '',
    farm_district: '',
    farm_area: 0
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: getProfile,
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile || farm) {
      setFormData({
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        language: (profile?.preferred_language as any) || 'en',
        farm_name: farm?.name || '',
        farm_region: farm?.region || '',
        farm_district: farm?.district || '',
        farm_area: farm?.total_area_acres || 0
      });
    }
  }, [profile, farm, editingField]);

  const profileMutation = useMutation({
    mutationFn: (updates: Partial<ProfileType>) => updateProfile(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      setEditingField(null);
    },
  });

  const farmMutation = useMutation({
    mutationFn: (updates: any) => updateFarm(farm!.id as string | number, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm', user?.id] });
      setEditingField(null);
    }
  });

  const handleSaveProfile = async (field: keyof ProfileType) => {
    await profileMutation.mutateAsync({
      [field]: field === 'preferred_language' ? formData.language : formData[field]
    });
  };

  const handleSaveFarm = async (field: string) => {
    const apiFieldMap: any = {
      'farm_name': 'name',
      'farm_region': 'region',
      'farm_district': 'district',
      'farm_area': 'total_area_acres'
    };
    await farmMutation.mutateAsync({
      [apiFieldMap[field]]: formData[field]
    });
  };

  const getLanguageName = (code: string) => {
    const langs: Record<string, string> = { en: 'English', tw: 'Twi', ee: 'Ewe', gaa: 'Ga', dag: 'Dagbani' };
    return langs[code] || 'English';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const displayName = profile?.full_name || 'Farmer';

  return (
    <div className="animate-fade-in-up pb-24 max-w-3xl mx-auto px-4 sm:px-0">
      <div className="mb-6">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          Back to Dashboard
        </button>
      </div>

      {/* Hero Header Card */}
      <div className="bg-gradient-to-br from-[#1B5E20] to-[#0d3311] dark:from-[#1B5E20]/80 dark:to-[#0a1f0d] rounded-[24px] p-6 sm:p-8 mb-8 relative overflow-hidden shadow-xl">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full"></div>
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full"></div>

        <div className="relative flex items-center gap-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold text-3xl sm:text-4xl shadow-lg border-4 border-white/20 flex-shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">{displayName}</h1>
            <p className="text-emerald-100 text-sm font-medium mt-1">
              {profile?.phone || profile?.email || 'Farmer'}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-white/90 uppercase tracking-wider backdrop-blur-sm">
                {profile?.auth_method || 'Phone'} User
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-200 uppercase tracking-wider">
                Active Account
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">

        {/* Section: Account Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 ml-1">Account Settings</h2>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-[24px] shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
            
            <SettingRow
              label="Full Name"
              value={profile?.full_name || 'Not provided'}
              isEditing={editingField === 'full_name'}
              onEdit={() => setEditingField('full_name')}
              onCancel={() => setEditingField(null)}
              onSave={() => handleSaveProfile('full_name')}
              isLoading={profileMutation.isPending}
            >
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                autoFocus
              />
            </SettingRow>

            <SettingRow
              label="Phone Number"
              value={profile?.phone || 'Not provided'}
              isEditing={editingField === 'phone'}
              onEdit={() => setEditingField('phone')}
              onCancel={() => setEditingField(null)}
              onSave={() => handleSaveProfile('phone')}
              isLoading={profileMutation.isPending}
            >
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                autoFocus
              />
            </SettingRow>

            <SettingRow
              label="Language"
              value={getLanguageName(profile?.preferred_language || 'en')}
              isEditing={editingField === 'language'}
              onEdit={() => setEditingField('language')}
              onCancel={() => setEditingField(null)}
              onSave={() => handleSaveProfile('preferred_language')}
              isLoading={profileMutation.isPending}
              isLast
            >
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors appearance-none"
              >
                <option value="en">English</option>
                <option value="tw">Twi</option>
                <option value="ee">Ewe</option>
                <option value="gaa">Ga</option>
                <option value="dag">Dagbani</option>
              </select>
            </SettingRow>

            <div className="p-5 sm:p-6 transition-colors flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Appearance</p>
                <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${theme === 'dark' ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'}`}
              >
                <span className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

          </div>
        </div>

        {/* Section: Farm Details */}
        {farm && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 ml-1">Farm Details</h2>
            <div className="bg-white dark:bg-[#1a1a1a] rounded-[24px] shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
              
              <SettingRow
                label="Farm Name"
                value={String(farm.name || 'Not provided')}
                isEditing={editingField === 'farm_name'}
                onEdit={() => setEditingField('farm_name')}
                onCancel={() => setEditingField(null)}
                onSave={() => handleSaveFarm('farm_name')}
                isLoading={farmMutation.isPending}
              >
                <input
                  type="text"
                  value={formData.farm_name}
                  onChange={(e) => setFormData({ ...formData, farm_name: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  autoFocus
                />
              </SettingRow>

              <SettingRow
                label="Region"
                value={String(farm.region || 'Not set')}
                isEditing={editingField === 'farm_region'}
                onEdit={() => setEditingField('farm_region')}
                onCancel={() => setEditingField(null)}
                onSave={() => handleSaveFarm('farm_region')}
                isLoading={farmMutation.isPending}
              >
                <input
                  type="text"
                  value={formData.farm_region}
                  onChange={(e) => setFormData({ ...formData, farm_region: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  autoFocus
                />
              </SettingRow>

              <SettingRow
                label="District"
                value={String(farm.district || 'Not set')}
                isEditing={editingField === 'farm_district'}
                onEdit={() => setEditingField('farm_district')}
                onCancel={() => setEditingField(null)}
                onSave={() => handleSaveFarm('farm_district')}
                isLoading={farmMutation.isPending}
              >
                <input
                  type="text"
                  value={formData.farm_district}
                  onChange={(e) => setFormData({ ...formData, farm_district: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  autoFocus
                />
              </SettingRow>

              <SettingRow
                label="Total Area (Acres)"
                value={`${Number(farm.total_area_acres || 0)} acres`}
                isEditing={editingField === 'farm_area'}
                onEdit={() => setEditingField('farm_area')}
                onCancel={() => setEditingField(null)}
                onSave={() => handleSaveFarm('farm_area')}
                isLoading={farmMutation.isPending}
                isLast
              >
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={formData.farm_area}
                  onChange={(e) => setFormData({ ...formData, farm_area: Number(e.target.value) })}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  autoFocus
                />
              </SettingRow>

            </div>
          </div>
        )}

        {/* Advanced Area */}
        <div className="pt-4 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 ml-1">Account Actions</h2>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-[24px] shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden p-2 space-y-2">
            <button
              type="button"
              className="w-full py-4 px-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 text-gray-900 dark:text-gray-100 rounded-2xl font-bold transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                Reset Password
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <button
              type="button"
              className="w-full py-4 px-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 text-gray-900 dark:text-gray-100 rounded-2xl font-bold transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete Account
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <button
              type="button"
              onClick={signOut}
              className="w-full py-4 px-6 flex items-center gap-3 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-2xl font-bold transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out of FarmPilot
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function SettingRow({ label, value, isEditing, onEdit, onCancel, onSave, isLoading, isLast, children }: any) {
  return (
    <div className={`p-5 sm:p-6 ${!isLast ? 'border-b border-gray-100 dark:border-white/10' : ''} transition-colors ${isEditing ? 'bg-gray-50/50 dark:bg-white/5' : ''}`}>
      {isEditing ? (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">{label}</label>
            {children}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onSave}
              disabled={isLoading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors text-sm disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-6 py-2.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-300 font-bold rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-white/20 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-base font-medium text-gray-900 dark:text-gray-100">{value}</p>
          </div>
          <button
            onClick={onEdit}
            className="flex-shrink-0 px-4 py-2 bg-gray-50 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-gray-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400 font-bold text-sm rounded-xl transition-colors border border-gray-200 dark:border-white/10 hover:border-emerald-200 dark:hover:border-emerald-500/30"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}
