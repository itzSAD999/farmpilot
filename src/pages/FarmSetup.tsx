import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { createFarm } from "../api/farms";
import { useAuth } from "../hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { GhanaMap } from "../components/domain/GhanaMap";

const farmSetupSchema = z.object({
  name: z.string().min(2, "Please enter a name for your farm."),
  region: z.string().min(2, "Please select a region."),
  district: z.string().min(2, "Please enter your district."),
  total_area_acres: z
    .number({
      message: "Please enter a valid number greater than zero.",
    })
    .positive("Farm area must be greater than zero acres."),
  check_in_day: z.string().min(2, "Please select a day."),
});

type FarmSetupFormData = z.infer<typeof farmSetupSchema>;

import { GHANA_DISTRICTS } from "../lib/districts";

export function FarmSetup() {
  const [step, setStep] = useState(1);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    sessionStorage.setItem("farm-setup-in-progress", "1");
    return () => {
      // Keep the flag while they are filling the form, even across remounts.
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    trigger,
    watch,
    setValue,
  } = useForm<FarmSetupFormData>({
    resolver: zodResolver(farmSetupSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      region: "",
      district: "",
      check_in_day: "Monday",
    },
  });

  const watchRegion = watch("region");
  const watchDistrict = watch("district");

  const handleNext = async () => {
    let fieldsToValidate: (keyof FarmSetupFormData)[] = [];
    if (step === 1) fieldsToValidate = ["name"];
    if (step === 2) fieldsToValidate = ["region", "district"];
    if (step === 3) fieldsToValidate = ["total_area_acres"];

    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(1, s - 1));
  };

  const onSubmit = async (data: FarmSetupFormData) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      await createFarm(user!.id, data);
      await queryClient.invalidateQueries({ queryKey: ["farm", user?.id] });
      sessionStorage.removeItem("farm-setup-in-progress");
      setStep(5); // Success step
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 2000);
    } catch (err: any) {
      if (err.message?.includes("session has expired")) {
        // Let the UI handle the error; do not forcibly redirect.
      } else {
        setServerError(err.message);
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-white/5 rounded-3xl relative overflow-visible">
      {/* Progress Indicator */}
      {step < 5 && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex space-x-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-500 ${
                i === step
                  ? "w-12 bg-emerald-600"
                  : i < step
                    ? "w-4 bg-emerald-200 dark:bg-emerald-900"
                    : "w-4 bg-gray-200 dark:bg-white/20"
              }`}
            />
          ))}
        </div>
      )}

      <div className="max-w-xl w-full">
        {serverError && (
          <div className="mb-8 p-4 rounded-2xl bg-red-50 text-red-700 text-sm font-medium border border-red-100 animate-fade-in">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* STEP 1: WELCOME & NAME */}
          {step === 1 && (
            <div className="animate-fade-in-up space-y-10">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-full mb-4">
                  <span className="text-4xl">👋</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                  Let's set up your farm
                </h1>
                <p className="text-xl text-gray-500 dark:text-gray-400 font-medium">
                  What do you call your land?
                </p>
              </div>

              <div>
                <label htmlFor="name" className="sr-only">
                  Farm Name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="e.g. Mensah Family Farm"
                  aria-invalid={errors.name ? "true" : "false"}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  className="w-full text-center text-4xl md:text-5xl font-light text-gray-900 dark:text-gray-100 bg-transparent border-b-2 border-gray-200 dark:border-white/20 pb-4 focus:outline-none focus:border-[#1B5E20] transition-colors placeholder:text-gray-300 dark:placeholder:text-gray-600"
                  {...register("name")}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleNext();
                    }
                  }}
                />
                {errors.name && (
                  <p
                    id="name-error"
                    className="mt-4 text-center text-base text-red-500 font-medium"
                  >
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: LOCATION */}
          {step === 2 && (
            <div className="animate-fade-in-up space-y-10">
              <div className="text-center space-y-2">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                  Where is it located?
                </h2>
                <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">
                  Tap a region on the map, then choose your district from the
                  list.
                </p>
              </div>

              <GhanaMap
                selectedRegion={watchRegion || ""}
                onSelect={(r) => {
                  const changed = r !== watchRegion;
                  setValue("region", r, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                  if (changed)
                    setValue("district", "", { shouldValidate: false });
                }}
              />

              <div className="relative z-[80] max-w-sm mx-auto space-y-4 isolate">
                <label htmlFor="region" className="sr-only">
                  Region
                </label>
                <div className="relative">
                  <select
                    id="region"
                    value={watchRegion || ""}
                    onChange={(e) => {
                      setValue("region", e.target.value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                      setValue("district", "", { shouldValidate: false });
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
                <input type="hidden" {...register("region")} />

                <label htmlFor="district" className="sr-only">
                  District
                </label>
                <div className="relative">
                  <select
                    id="district"
                    value={watchDistrict || ""}
                    disabled={!watchRegion}
                    onChange={(e) =>
                      setValue("district", e.target.value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    className="w-full appearance-none text-center text-lg font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/15 rounded-2xl px-10 py-3.5 focus:outline-none focus:border-[#1B5E20] focus:ring-2 focus:ring-emerald-500/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {watchRegion
                        ? "Select district"
                        : "Select a region first"}
                    </option>
                    {(GHANA_DISTRICTS[watchRegion] || []).map((district) => (
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
                <input type="hidden" {...register("district")} />
              </div>
              {errors.region && (
                <p className="text-center text-base text-red-500 font-medium">
                  {errors.region.message}
                </p>
              )}
              {errors.district && (
                <p
                  id="district-error"
                  className="text-center text-base text-red-500 font-medium"
                >
                  {errors.district.message}
                </p>
              )}
            </div>
          )}

          {/* STEP 3: SIZE */}
          {step === 3 && (
            <div className="animate-fade-in-up space-y-10">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-full mb-4">
                  <svg
                    className="w-10 h-10 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    />
                  </svg>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                  How large is your farm?
                </h2>
                <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">
                  Enter the total land area in acres.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="relative flex items-baseline justify-center">
                  <label htmlFor="total_area_acres" className="sr-only">
                    Total Area in Acres
                  </label>
                  <input
                    id="total_area_acres"
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="0.0"
                    aria-invalid={errors.total_area_acres ? "true" : "false"}
                    aria-describedby={
                      errors.total_area_acres ? "area-error" : undefined
                    }
                    className="w-40 text-center text-6xl font-light text-gray-900 dark:text-gray-100 bg-transparent border-b-2 border-gray-200 dark:border-white/20 pb-4 focus:outline-none focus:border-[#1B5E20] transition-colors placeholder:text-gray-300 dark:placeholder:text-gray-600"
                    {...register("total_area_acres", { valueAsNumber: true })}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleNext();
                      }
                    }}
                  />
                  <span className="ml-4 text-3xl font-light text-gray-500 dark:text-gray-400">
                    acres
                  </span>
                </div>
                {errors.total_area_acres && (
                  <p
                    id="area-error"
                    className="mt-4 text-base text-red-500 font-medium"
                  >
                    {errors.total_area_acres.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: CHECK-IN DAY */}
          {step === 4 && (
            <div className="animate-fade-in-up space-y-10">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-full mb-4">
                  <svg
                    className="w-10 h-10 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                  Weekly Check-in
                </h2>
                <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">
                  Which day of the week would you like to track your expenses?
                </p>
              </div>

              <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                <label htmlFor="check_in_day" className="sr-only">
                  Check-in Day
                </label>
                <div className="relative w-full">
                  <select
                    id="check_in_day"
                    className="w-full appearance-none text-center text-xl font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/15 rounded-2xl px-10 py-4 focus:outline-none focus:border-[#1B5E20] focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
                    {...register("check_in_day")}
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                  <svg
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400"
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
                {errors.check_in_day && (
                  <p
                    id="check_in_day-error"
                    className="mt-4 text-base text-red-500 font-medium"
                  >
                    {errors.check_in_day.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: SUCCESS */}
          {step === 5 && (
            <div className="animate-fade-in-up flex flex-col items-center justify-center space-y-6 py-12">
              <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center animate-bounce">
                <svg
                  className="w-12 h-12 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Farm Created!
              </h2>
              <p className="text-emerald-600 font-medium">
                Preparing your dashboard...
              </p>
            </div>
          )}

          {/* Navigation Buttons */}
          {step < 5 && (
            <div className="pt-12 flex items-center justify-between animate-fade-in">
              <button
                type="button"
                onClick={handleBack}
                className={`px-8 py-4 text-gray-500 dark:text-gray-400 font-bold hover:text-gray-900 dark:hover:text-gray-100 transition-colors ${step === 1 ? "invisible" : ""}`}
              >
                Back
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-12 py-4 bg-[#1B5E20] text-white rounded-full font-bold text-lg hover:bg-[#144718] transition-all active:scale-[0.98] shadow-lg shadow-emerald-900/20"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  className="px-12 py-4 bg-[#1B5E20] text-white rounded-full font-bold text-lg hover:bg-[#144718] transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-emerald-900/20 flex items-center"
                >
                  {isSubmitting ? "Saving..." : "Finish Setup"}
                  {!isSubmitting && (
                    <svg
                      className="w-5 h-5 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
