import type { ProfilePreference } from "./ProfilePreference";

export type SubscriptionTier = "free" | "plus" | "gold" | "premium";
export type Gender = "male" | "female" | "non-binary" | "other";

export type User = {
    id: number;
    name: string;
    email: string;
    created_at: string; // ISO date
    gender?: Gender | null;
    location?: string | null; // city or region string
    bio?: string | null;
    photos?: string[] | null; // URLs
    subscription_tier?: SubscriptionTier | null;
    preferences?: ProfilePreference | null;
};
