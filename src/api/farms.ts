import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";

export type Farm = Database["public"]["Tables"]["farms"]["Row"];

export interface CreateFarmInput {
  name: string;
  district?: string | null;
  region?: string | null;
  total_area_acres: number;
  check_in_day?: string | null;
}

export type UpdateFarmInput = Partial<CreateFarmInput>;

/**
 * Maps Supabase farm-related errors to farmer-friendly messages.
 */
function handleFarmError(error: any): Error {
  const msg = error.message || String(error);

  if (
    msg.toLowerCase().includes("fetch") ||
    msg.toLowerCase().includes("network")
  ) {
    return new Error(
      "Cannot connect to the network. Please check your internet connection and try again.",
    );
  }

  if (
    msg.toLowerCase().includes("jwt") ||
    msg.toLowerCase().includes("expired") ||
    error.code === "PGRST301"
  ) {
    return new Error(
      "Your session has expired. Any unsaved changes were lost. Please sign in again.",
    );
  }

  if (msg.toLowerCase().includes("not found") || error.code === "PGRST116") {
    return new Error(
      "This farm was not found, has been deleted, or you do not have permission to view it.",
    );
  }

  // Handle the Postgres CHECK constraint for area
  if (
    msg.toLowerCase().includes("total_area_acres") &&
    msg.toLowerCase().includes("check")
  ) {
    return new Error("Farm area must be greater than zero acres.");
  }

  if (msg.toLowerCase().includes("numeric field overflow") || error.code === "22003") {
    return new Error("That farm size is too large to store. Please enter a realistic number of acres.");
  }

  if (msg.toLowerCase().includes("null value") && msg.toLowerCase().includes("total_area_acres")) {
    return new Error("Please enter a valid farm size before continuing.");
  }

  // Fall back to whatever Postgres/PostgREST actually said (details/hint
  // included) rather than a fully generic message — a silently-swallowed
  // real cause is what made an earlier "something went wrong" 400 here
  // unreproducible when investigated after the fact.
  const detail = [error.details, error.hint].filter(Boolean).join(' — ');
  return new Error(
    `Something went wrong saving your farm${msg ? `: ${msg}` : ''}${detail ? ` (${detail})` : ''}. Please try again.`
  );
}

/**
 * Fetches the current user's farm.
 * Returns null if the user hasn't set up a farm yet.
 */
export async function getFarm(userId: string): Promise<Farm | null> {
  // RLS restricts to owned rows, so no explicit user_id filter is strictly needed,
  // but we add it anyway as a second line of defence against policy misconfiguration.
  const { data, error } = await supabase
    .from("farms")
    .select("*")
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw handleFarmError(error);
  }

  return data;
}

/**
 * Creates a new farm for the current user.
 */
export async function createFarm(input: CreateFarmInput): Promise<Farm> {
  // Client-side validation for area. Guards against NaN specifically —
  // JSON.stringify silently turns NaN into null, which would otherwise
  // reach a NOT NULL column as a clean-looking but unexplained 400.
  if (!Number.isFinite(input.total_area_acres) || input.total_area_acres <= 0) {
    throw new Error("Please enter a valid farm size greater than zero acres.");
  }
  if (input.total_area_acres > 999999) {
    throw new Error("That farm size is too large. Please enter a realistic number of acres.");
  }

  // Force the client to verify and refresh the session with the server 
  // immediately before the PostgREST call to prevent 401 Unauthorized errors.
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Your session has expired. Please refresh the page and sign in again.');
  }

  const { data, error } = await supabase
    .from("farms")
    .insert({
      ...input,
      user_id: user.id // Always use the guaranteed authenticated user ID
    })
    .select()
    .single();

  if (error) {
    throw handleFarmError(error);
  }

  return data;
}

/**
 * Updates an existing farm's details.
 */
export async function updateFarm(
  userId: string,
  id: string | number,
  input: UpdateFarmInput,
): Promise<Farm> {

  if (input.total_area_acres !== undefined && input.total_area_acres <= 0) {
    throw new Error("Farm area must be greater than zero acres.");
  }

  const { data, error } = await supabase
    .from("farms")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId) // Second line of defence
    .select()
    .single();

  if (error) {
    throw handleFarmError(error);
  }

  return data;
}
