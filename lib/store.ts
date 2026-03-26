/**
 * lib/store.ts — Supabase-backed complaints persistence
 * All complaint data is stored in the `complaints` Supabase table.
 * NO local JSON file, NO seed data, NO fake entries.
 */
import { supabaseAdmin } from "./supabase-admin";

export interface ComplaintRecord {
    id: string;
    title: string;
    department: string;
    gravity: string;
    priority: "High" | "Medium" | "Low";
    problemType: string;
    status: "Filed" | "Under Review" | "Resolved";
    timestamp: string;
    location: string;
    lat: number;
    lng: number;
    userName: string;
    userEmail: string;
    description: string;
    originalLanguage?: string;
    originalText?: string;
}

// Map Supabase row → ComplaintRecord
function rowToRecord(row: Record<string, unknown>): ComplaintRecord {
    return {
        id: String(row.id ?? ""),
        title: String(row.title ?? ""),
        department: String(row.department ?? ""),
        gravity: String(row.gravity ?? "Low"),
        priority: (row.priority as "High" | "Medium" | "Low") ?? "Low",
        problemType: String(row.problem_type ?? ""),
        status: (row.status as "Filed" | "Under Review" | "Resolved") ?? "Filed",
        timestamp: String(row.created_at ?? new Date().toISOString()),
        location: String(row.location ?? ""),
        lat: Number(row.lat ?? 20.5937),
        lng: Number(row.lng ?? 78.9629),
        userName: String(row.user_name ?? ""),
        userEmail: String(row.user_email ?? ""),
        description: String(row.description ?? ""),
        originalLanguage: row.original_language ? String(row.original_language) : undefined,
        originalText: row.original_text ? String(row.original_text) : undefined,
    };
}

export async function loadComplaints(): Promise<ComplaintRecord[]> {
    const { data, error } = await supabaseAdmin
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Supabase loadComplaints error:", error.message);
        return [];
    }
    return (data ?? []).map(rowToRecord);
}

export async function addComplaint(complaint: ComplaintRecord): Promise<void> {
    const { error } = await supabaseAdmin.from("complaints").insert({
        id: complaint.id,
        title: complaint.title,
        department: complaint.department,
        gravity: complaint.gravity,
        priority: complaint.priority,
        problem_type: complaint.problemType,
        status: complaint.status,
        location: complaint.location,
        lat: complaint.lat,
        lng: complaint.lng,
        user_name: complaint.userName,
        user_email: complaint.userEmail,
        description: complaint.description,
        original_language: complaint.originalLanguage ?? null,
        original_text: complaint.originalText ?? null,
    });
    if (error) console.error("Supabase addComplaint error:", error.message);
}

export async function updateComplaintStatus(
    id: string,
    status: ComplaintRecord["status"]
): Promise<ComplaintRecord | null> {
    const { data, error } = await supabaseAdmin
        .from("complaints")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

    if (error || !data) {
        console.error("Supabase updateComplaintStatus error:", error?.message);
        return null;
    }
    return rowToRecord(data);
}

export async function nextComplaintId(): Promise<string> {
    const { data } = await supabaseAdmin
        .from("complaints")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (data?.id) {
        const n = parseInt(String(data.id).replace("R-", ""), 10);
        return `R-${isNaN(n) ? 8000 : n + 1}`;
    }
    return "R-8000";
}
