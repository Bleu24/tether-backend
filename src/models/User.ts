import type { ProfilePreference } from "./ProfilePreference";

export type SubscriptionTier = "free" | "plus" | "gold" | "premium";
export type Gender = "male" | "female" | "non-binary" | "other";

export type User = {
    id: number;
    name: string;
    email: string;
    created_at: string; // ISO date
    // password_hash is stored in DB but never exposed via API model
    birthdate?: string | null; // YYYY-MM-DD
    age?: number | null; // computed from birthdate
    gender?: Gender | null;
    location?: string | null; // city or region string
    latitude?: number | null;
    longitude?: number | null;
    last_seen?: string | null; // ISO datetime
    bio?: string | null;
    photos?: string[] | null; // URLs
    subscription_tier?: SubscriptionTier | null;
    setup_complete?: boolean | null;
    is_deleted?: boolean | null;
    preferences?: ProfilePreference | null;
};
