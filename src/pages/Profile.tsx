import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile } from "../api/auth";
import { updateFarm } from "../api/farms";
import { useAuth } from "../hooks/useAuth";
import { useFarm } from "../hooks/useFarm";
import type { Profile as ProfileType } from "../api/auth";
import { useTheme } from "../hooks/useTheme";
import { useNavigate } from "react-router-dom";
import { GhanaMap } from "../components/domain/GhanaMap";
import { GHANA_DISTRICTS } from "../lib/districts";

export function Profile() {
  const { user, signOut } = useAuth();
  const { farm } = useFarm();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Individual Editing States
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDeleteModalOpen && deleteInputRef.current) {
      // Small timeout ensures it focuses after the modal animation starts
      setTimeout(() => deleteInputRef.current?.focus(), 100);
    }
  }, [isDeleteModalOpen]);

  // Form State
  const [formData, setFormData] = useState<any>({
    full_name: "",
    phone: "",
    language: "en",
    farm_name: "",
    farm_region: "",
    farm_district: "",
    farm_area: 0,
    farm_check_in_day: "Monday",
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: getProfile,
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile || farm) {
      setFormData({
        full_name: profile?.full_name || "",
        phone: profile?.phone || "",
        language: (profile?.preferred_language as any) || "en",
        farm_name: farm?.name || "",
        farm_region: farm?.region || "",
        farm_district: farm?.district || "",
        farm_area: farm?.total_area_acres || 0,
        farm_check_in_day: (farm as any)?.check_in_day || "Monday",
      });
    }
  }, [profile, farm]);

  const profileMutation = useMutation({
    mutationFn: (updates: Partial<ProfileType>) => updateProfile(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      setEditingField(null);
    },
  });

  const farmMutation = useMutation({
    mutationFn: (updates: any) =>
      updateFarm(user!.id, farm!.id as string | number, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm", user?.id] });
      setEditingField(null);
    },
  });

  const handleSaveProfile = async (field: keyof ProfileType) => {
    await profileMutation.mutateAsync({
      [field]:
        field === "preferred_language" ? formData.language : formData[field],
    });
  };

  const handleSaveFarm = async (field: string) => {
    if (field === "farm_location") {
      await farmMutation.mutateAsync({
        region: formData.farm_region,
        district: formData.farm_district,
      });
      setIsLocationModalOpen(false);
      return;
    }
    const apiFieldMap: any = {
      farm_name: "name",
      farm_area: "total_area_acres",
      farm_check_in_day: "check_in_day",
    };
    await farmMutation.mutateAsync({
      [apiFieldMap[field]]: formData[field],
    });
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "deletemyfarm" || isDeleting) return;

    setIsDeleting(true);
    try {
      if (user?.id) {
        // Attempt to call the RPC function that actually deletes the auth.users row
        const { error } = await supabase.rpc("delete_my_account");
        if (error) {
          // Fallback to manual deletion of profile and farm data if RPC fails/doesn't exist
          console.warn(
            "RPC delete failed, falling back to manual deletion:",
            error,
          );
          await supabase.from("profiles").delete().eq("id", user.id);
          await supabase.from("farms").delete().eq("user_id", user.id);
        }
      }
      setIsDeleteModalOpen(false);
      await signOut();
    } catch (e) {
      console.error("Failed to delete account data:", e);
      alert("Failed to delete account data. Please try again.");
      setIsDeleting(false);
    }
  };

  const getLanguageName = (code: string) => {
    const langs: Record<string, string> = {
      en: "English",
      tw: "Twi",
      ee: "Ewe",
      gaa: "Ga",
      dag: "Dagbani",
    };
    return langs[code] || "English";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const displayName = profile?.full_name || "Farmer";

  return (
    <div className="animate-fade-in-up pb-24 max-w-3xl mx-auto px-4 sm:px-0">
      <div className="mb-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">
              {displayName}
            </h1>
            <p className="text-emerald-100 text-sm font-medium mt-1">
              {profile?.phone || profile?.email || "Farmer"}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-white/90 uppercase tracking-wider backdrop-blur-sm">
                {profile?.auth_method || "Phone"} User
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
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 ml-1">
            Account Settings
          </h2>
          <div className="bg-white dark:bg-white/5 rounded-[24px] shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
            <SettingRow
              label="Full Name"
              value={profile?.full_name || "Not provided"}
              isEditing={editingField === "full_name"}
              onEdit={() => setEditingField("full_name")}
              onCancel={() => setEditingField(null)}
              onSave={() => handleSaveProfile("full_name")}
              isLoading={profileMutation.isPending}
            >
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                autoFocus
              />
            </SettingRow>

            <SettingRow
              label="Phone Number"
              value={profile?.phone || "Not provided"}
              isEditing={editingField === "phone"}
              onEdit={() => setEditingField("phone")}
              onCancel={() => setEditingField(null)}
              onSave={() => handleSaveProfile("phone")}
              isLoading={profileMutation.isPending}
            >
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                autoFocus
              />
            </SettingRow>

            <SettingRow
              label="Language"
              value={getLanguageName(profile?.preferred_language || "en")}
              isEditing={editingField === "language"}
              onEdit={() => setEditingField("language")}
              onCancel={() => setEditingField(null)}
              onSave={() => handleSaveProfile("preferred_language")}
              isLoading={profileMutation.isPending}
              isLast
            >
              <select
                value={formData.language}
                onChange={(e) =>
                  setFormData({ ...formData, language: e.target.value })
                }
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
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                  Appearance
                </p>
                <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                  {theme === "dark" ? "Dark Mode" : "Light Mode"}
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${theme === "dark" ? "bg-emerald-600" : "bg-gray-300 dark:bg-gray-700"}`}
              >
                <span
                  className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${theme === "dark" ? "translate-x-6" : "translate-x-0"}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section: Farm Details */}
        {farm && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 ml-1">
              Farm Details
            </h2>
            <div className="bg-white dark:bg-white/5 rounded-[24px] shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
              <SettingRow
                label="Farm Name"
                value={String(farm.name || "Not provided")}
                isEditing={editingField === "farm_name"}
                onEdit={() => setEditingField("farm_name")}
                onCancel={() => setEditingField(null)}
                onSave={() => handleSaveFarm("farm_name")}
                isLoading={farmMutation.isPending}
              >
                <input
                  type="text"
                  value={formData.farm_name}
                  onChange={(e) =>
                    setFormData({ ...formData, farm_name: e.target.value })
                  }
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  autoFocus
                />
              </SettingRow>

              <div className="p-5 sm:p-6 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors border-b border-gray-100 dark:border-white/10 group">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                      Location (Region & District)
                    </p>
                    <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                      {farm.region && farm.district
                        ? `${farm.district}, ${farm.region}`
                        : "Not set"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setFormData({
                        ...formData,
                        farm_region: farm?.region || "",
                        farm_district: farm?.district || "",
                      });
                      setIsLocationModalOpen(true);
                    }}
                    className="p-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-xl font-bold transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 sm:px-4 sm:py-2"
                  >
                    <span className="hidden sm:inline mr-2">Edit</span>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <SettingRow
                label="Total Area (Acres)"
                value={`${Number(farm.total_area_acres || 0)} acres`}
                isEditing={editingField === "farm_area"}
                onEdit={() => setEditingField("farm_area")}
                onCancel={() => setEditingField(null)}
                onSave={() => handleSaveFarm("farm_area")}
                isLoading={farmMutation.isPending}
                isLast
              >
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={formData.farm_area}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      farm_area: Number(e.target.value),
                    })
                  }
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  autoFocus
                />
              </SettingRow>

              <SettingRow
                label="Check-in Day"
                value={formData.farm_check_in_day || "Monday"}
                isEditing={editingField === "farm_check_in_day"}
                onEdit={() => setEditingField("farm_check_in_day")}
                onCancel={() => setEditingField(null)}
                onSave={() => handleSaveFarm("farm_check_in_day")}
                isLoading={farmMutation.isPending}
                isLast
              >
                <select
                  value={formData.farm_check_in_day}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      farm_check_in_day: e.target.value,
                    })
                  }
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors appearance-none"
                >
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
              </SettingRow>
            </div>
          </div>
        )}

        {/* Advanced Area */}
        <div className="pt-4 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 ml-1">
            Account Actions
          </h2>
          <div className="bg-white dark:bg-white/5 rounded-[24px] shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden p-2 space-y-2">
            <button
              type="button"
              className="w-full py-4 px-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 text-gray-900 dark:text-gray-100 rounded-2xl font-bold transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
                Reset Password
              </div>
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-full py-4 px-6 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl font-bold transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete Account & Farm
              </div>
            </button>
            <button
              type="button"
              onClick={signOut}
              className="w-full py-4 px-6 flex items-center gap-3 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-2xl font-bold transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign Out of FarmPilot
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsDeleteModalOpen(false)}
          ></div>
          <div className="relative w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-[32px] shadow-2xl p-8 animate-fade-in-up">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">
              Delete Everything?
            </h3>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
              This action cannot be undone. All your farm data, logged costs,
              and seasons will be permanently deleted.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Type{" "}
                <span className="text-red-600 dark:text-red-400 select-all">
                  deletemyfarm
                </span>{" "}
                to confirm
              </label>
              <input
                ref={deleteInputRef}
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="deletemyfarm"
                disabled={isDeleting}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all dark:text-white font-mono disabled:opacity-50"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmation("");
                }}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== "deletemyfarm" || isDeleting}
                className="flex-1 py-3 px-4 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
              >
                {isDeleting ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  "Delete All"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Selection Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#F4F7F6] dark:bg-[#0a0a0a] overflow-y-auto animate-fade-in">
          <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 px-4 h-16 flex items-center justify-between">
            <button
              onClick={() => setIsLocationModalOpen(false)}
              className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 font-bold flex items-center transition-colors"
            >
              <svg
                className="w-5 h-5 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Cancel
            </button>
            <button
              onClick={() => handleSaveFarm("farm_location")}
              disabled={
                !formData.farm_region ||
                !formData.farm_district ||
                farmMutation.isPending
              }
              className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {farmMutation.isPending ? "Saving..." : "Save Location"}
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
            <div className="text-center space-y-2 mb-10 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                Where is it located?
              </h2>
              <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">
                Tap a region on the map, then choose your district from the
                list.
              </p>
            </div>

            <div className="w-full max-w-lg mb-8">
              <GhanaMap
                selectedRegion={formData.farm_region}
                onSelect={(r) => {
                  const changed = r !== formData.farm_region;
                  setFormData({
                    ...formData,
                    farm_region: r,
                    ...(changed ? { farm_district: "" } : {}),
                  });
                }}
              />
            </div>

            <div className="relative z-10 w-full max-w-sm mx-auto space-y-4">
              <div className="relative">
                <select
                  value={formData.farm_region}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      farm_region: e.target.value,
                      farm_district: "",
                    });
                  }}
                  className="w-full appearance-none text-center text-lg font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/15 rounded-2xl px-10 py-3.5 focus:outline-none focus:border-[#1B5E20] focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
                >
                  <option value="">Select region</option>
                  {Object.keys(GHANA_DISTRICTS).map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>

              <div className="relative">
                <select
                  value={formData.farm_district}
                  onChange={(e) => {
                    setFormData({ ...formData, farm_district: e.target.value });
                  }}
                  disabled={!formData.farm_region}
                  className="w-full appearance-none text-center text-lg font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/15 rounded-2xl px-10 py-3.5 focus:outline-none focus:border-[#1B5E20] focus:ring-2 focus:ring-emerald-500/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {formData.farm_region
                      ? "Select district"
                      : "Select a region first"}
                  </option>
                  {(
                    GHANA_DISTRICTS[
                      formData.farm_region as keyof typeof GHANA_DISTRICTS
                    ] || []
                  ).map((district: string) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingRow({
  label,
  value,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  isLoading,
  isLast,
  children,
}: any) {
  return (
    <div
      className={`p-5 sm:p-6 ${!isLast ? "border-b border-gray-100 dark:border-white/10" : ""} transition-colors ${isEditing ? "bg-gray-50/50 dark:bg-white/5" : ""}`}
    >
      {isEditing ? (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">
              {label}
            </label>
            {children}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onSave}
              disabled={isLoading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors text-sm disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save"}
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
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
              {label}
            </p>
            <p className="text-base font-medium text-gray-900 dark:text-gray-100">
              {value}
            </p>
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
