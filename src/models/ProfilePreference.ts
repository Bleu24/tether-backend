export type GenderPreference = "male" | "female" | "non-binary" | "any";

export type ProfilePreference = {
    user_id: number;
    min_age: number; // inclusive
    max_age: number; // inclusive
    distance: number; // in kilometers
    gender_preference: GenderPreference;
    interests: string[]; // list of interest keywords
    created_at?: string; // ISO
    updated_at?: string; // ISO
};
