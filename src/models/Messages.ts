export type Message = {
    id: number;
    match_id: number;
    sender_id: number;
    content: string | null; // null when deleted for everyone
    is_deleted: 0 | 1;
    seen: 0 | 1; // basic seen flag (recipient)
    created_at: string; // ISO
    updated_at: string; // ISO
};

// Per-user soft delete mapping ("Delete for me")
export type MessageDeletion = {
    message_id: number;
    user_id: number;
    deleted_at: string; // ISO
};