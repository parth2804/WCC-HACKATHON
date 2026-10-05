// ==========================================================================
// EVENTS.JS — Supabase-backed event registry
// All events live in the `events` Supabase table.
// Fallback to hardcoded defaults if Supabase is unavailable.
// ==========================================================================

import { supabase } from "./supabase.js";

export const MASTER_ADMIN_PASSCODE = "admin2026";

// ─── In-memory cache (populated on first load) ───
let _eventsCache = null;

// ─── Map a Supabase row → app event object ───
function rowToEvent(row) {
    return {
        id:            row.id,
        prefix:        row.prefix,
        legacyPrefixes: row.legacy_prefixes || [],
        title:         row.title,
        category:      row.category || "Event",
        adminPasscode: row.admin_passcode || "admin2026",
        adminPage:     `admin.html?event=${row.id}`,
        registerPage:  `register.html?event=${row.id}`,
        date:          row.date         || "",
        time:          row.time         || "",
        venue:         row.venue        || "",
        capacity:      row.capacity     || "",
        description:   row.description  || "",
        accentColor:   row.accent_color  || "#3F66B5",
        bgTint:        row.bg_tint       || "rgba(63,102,181,0.08)",
        borderColor:   row.border_color  || "#3F66B5",
        icon:          row.icon          || "🎫",
        badgeColor:    row.badge_color   || "blue",
    };
}

// ─── Hardcoded fallback (used if Supabase is down / no network) ───
const FALLBACK_EVENTS = [
    {
        id: "innovex-hackathon-2026",
        prefix: "HACK",
        legacyPrefixes: ["EVT"],
        title: "INNOVEX Hackathon 2026",
        category: "Hackathon",
        adminPasscode: "hackathon2026",
        adminPage: "admin.html?event=innovex-hackathon-2026",
        registerPage: "register.html?event=innovex-hackathon-2026",
        date: "March 15-16, 2026",
        time: "09:00 AM IST",
        venue: "Tech Auditorium, Main Campus",
        capacity: "300 Participants",
        description: "36-hour sprint building breakthrough web, cloud, and open-source applications.",
        accentColor: "#3F66B5",
        bgTint: "rgba(63, 102, 181, 0.08)",
        borderColor: "#3F66B5",
        icon: "💻",
        badgeColor: "blue",
    },
    {
        id: "nextgen-ai-summit",
        prefix: "AISUM",
        legacyPrefixes: [],
        title: "NextGen AI & ML Summit",
        category: "Conference",
        adminPasscode: "aisummit2026",
        adminPage: "admin.html?event=nextgen-ai-summit",
        registerPage: "register.html?event=nextgen-ai-summit",
        date: "March 22, 2026",
        time: "10:30 AM IST",
        venue: "Grand Convention Center, Hall B",
        capacity: "250 Participants",
        description: "Explore the frontiers of deep learning, generative AI, and autonomous agent frameworks.",
        accentColor: "#2BA384",
        bgTint: "rgba(43, 163, 132, 0.08)",
        borderColor: "#2BA384",
        icon: "🧠",
        badgeColor: "sea-green",
    },
    {
        id: "cybershield-conclave",
        prefix: "CYBER",
        legacyPrefixes: [],
        title: "CyberShield Security Conclave",
        category: "Workshop",
        adminPasscode: "cybershield2026",
        adminPage: "admin.html?event=cybershield-conclave",
        registerPage: "register.html?event=cybershield-conclave",
        date: "April 05, 2026",
        time: "11:00 AM IST",
        venue: "Cyber Defense Lab",
        capacity: "150 Participants",
        description: "Ethical hacking, CTF challenges, and enterprise security frameworks.",
        accentColor: "#C93C5E",
        bgTint: "rgba(201, 60, 94, 0.08)",
        borderColor: "#C93C5E",
        icon: "🛡️",
        badgeColor: "raspberry",
    },
    {
        id: "pixelcraft-design-sprint",
        prefix: "PIXEL",
        legacyPrefixes: [],
        title: "PixelCraft UX/UI Design Sprint",
        category: "Design",
        adminPasscode: "pixelcraft2026",
        adminPage: "admin.html?event=pixelcraft-design-sprint",
        registerPage: "register.html?event=pixelcraft-design-sprint",
        date: "April 18, 2026",
        time: "10:00 AM IST",
        venue: "Innovation Hub, Studio 4",
        capacity: "100 Participants",
        description: "Rapid UI/UX design sprint — wireframing, prototyping, and design systems.",
        accentColor: "#E9B431",
        bgTint: "rgba(233, 180, 49, 0.08)",
        borderColor: "#E9B431",
        icon: "🎨",
        badgeColor: "gold",
    },
];

// ==========================================================================
// PUBLIC API
// ==========================================================================

/**
 * Fetch all active events from Supabase + localStorage.
 * Results are cached for the page lifetime.
 */
export async function fetchAllEvents() {
    if (_eventsCache) return _eventsCache;

    let baseEvents = [];

    try {
        const { data, error } = await supabase
            .from("events")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
            baseEvents = data.map(rowToEvent);
            console.log(`✅ Loaded ${baseEvents.length} events from Supabase.`);
        }
    } catch (err) {
        console.warn("⚠️ Supabase event fetch failed or table doesn't exist yet, using fallbacks:", err.message);
    }

    if (baseEvents.length === 0) {
        baseEvents = [...FALLBACK_EVENTS];
    }

    // Merge custom events stored in localStorage
    try {
        const localCustom = JSON.parse(localStorage.getItem("custom_events") || "[]");
        localCustom.forEach(customEv => {
            const existingIdx = baseEvents.findIndex(e => e.id === customEv.id);
            if (existingIdx >= 0) {
                baseEvents[existingIdx] = { ...baseEvents[existingIdx], ...customEv };
            } else {
                baseEvents.push(customEv);
            }
        });
    } catch (e) {
        console.warn("Error reading local custom events:", e);
    }

    _eventsCache = baseEvents;
    return _eventsCache;
}

/**
 * Synchronous lookup by event ID.
 * Looks up in Supabase cache, FALLBACK_EVENTS, and localStorage custom_events.
 * If not found, dynamically derives the event from the ID so custom events like "orgy-sex"
 * never accidentally fall back to Hackathon!
 */
export function getEventById(id) {
    const cleanId = String(id || "").toLowerCase().trim();
    if (!cleanId) return FALLBACK_EVENTS[0];

    const pool = _eventsCache || FALLBACK_EVENTS;
    let found = pool.find(e => e.id.toLowerCase() === cleanId || e.id.replace(/[^a-z0-9]/g, "") === cleanId.replace(/[^a-z0-9]/g, ""));
    if (found) return found;

    // Check localStorage custom_events
    try {
        const local = JSON.parse(localStorage.getItem("custom_events") || "[]");
        found = local.find(e => e.id.toLowerCase() === cleanId || e.id.replace(/[^a-z0-9]/g, "") === cleanId.replace(/[^a-z0-9]/g, ""));
        if (found) return found;
    } catch (e) {}

    // Dynamic generation: derives slug, title, and prefix from the requested event ID
    const words = cleanId.split(/[-_]+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1));
    const title = words.join(" ") || "Custom Event";
    const prefix = (words[0] || "EVT").toUpperCase().substring(0, 5);

    return {
        id: cleanId,
        prefix: prefix,
        legacyPrefixes: [],
        title: title,
        category: "Event",
        adminPasscode: "admin2026",
        adminPage: `admin.html?event=${cleanId}`,
        registerPage: `register.html?event=${cleanId}`,
        date: "2026",
        time: "Gate Check-In",
        venue: "Main Hall",
        capacity: "300 Participants",
        description: `${title} — Real-time attendance check-in.`,
        accentColor: "#3F66B5",
        bgTint: "rgba(63, 102, 181, 0.08)",
        borderColor: "#3F66B5",
        icon: "🎫",
        badgeColor: "blue",
    };
}

/**
 * Synchronous lookup: which event does a participant ID belong to?
 * Matches by prefix (e.g. "HACK-001" → innovex-hackathon-2026, "ORGY-002" → orgy-sex)
 */
export function getEventByParticipantId(participantId) {
    const pid = String(participantId || "").toUpperCase().trim();
    if (!pid) return null;

    const pool = _eventsCache || FALLBACK_EVENTS;
    let found = pool.find(ev => {
        const pfx = String(ev.prefix || "").toUpperCase();
        if (pid.startsWith(pfx + "-")) return true;
        if (ev.legacyPrefixes && ev.legacyPrefixes.some(lp => pid.startsWith(String(lp).toUpperCase() + "-"))) return true;
        return false;
    });
    if (found) return found;

    // Check localStorage
    try {
        const local = JSON.parse(localStorage.getItem("custom_events") || "[]");
        found = local.find(ev => {
            const pfx = String(ev.prefix || "").toUpperCase();
            return pid.startsWith(pfx + "-");
        });
        if (found) return found;
    } catch (e) {}

    // Extract prefix pattern: e.g. "ORGY-002" -> prefix "ORGY"
    const match = pid.match(/^([A-Z0-9]+)-/);
    if (match) {
        const pfx = match[1];
        return {
            id: pfx.toLowerCase(),
            prefix: pfx,
            legacyPrefixes: [],
            title: pfx + " Event",
            category: "Event",
            adminPasscode: "admin2026",
        };
    }

    return null;
}

/**
 * Save a new event to Supabase events table.
 * Called by the Add Event page.
 */
export async function saveEventToSupabase(eventObj) {
    const row = {
        id:            eventObj.id,
        prefix:        eventObj.prefix,
        title:         eventObj.title,
        category:      eventObj.category,
        admin_passcode: eventObj.adminPasscode,
        date:          eventObj.date,
        time:          eventObj.time,
        venue:         eventObj.venue,
        capacity:      eventObj.capacity,
        description:   eventObj.description,
        accent_color:  eventObj.accentColor,
        bg_tint:       eventObj.bgTint,
        border_color:  eventObj.borderColor,
        icon:          eventObj.icon,
        is_active:     true,
    };

    const { data, error } = await supabase
        .from("events")
        .upsert([row], { onConflict: "id" });

    if (error) throw error;

    // Bust cache so next fetch picks up the new event
    _eventsCache = null;
    return data;
}

/**
 * Save custom event to Supabase and localStorage.
 * Used by add-event.html
 */
export async function saveCustomEvent(eventObj) {
    // 1. Persist to localStorage
    try {
        const local = JSON.parse(localStorage.getItem("custom_events") || "[]");
        const idx = local.findIndex(e => e.id === eventObj.id);
        if (idx >= 0) local[idx] = eventObj;
        else local.push(eventObj);
        localStorage.setItem("custom_events", JSON.stringify(local));
    } catch (e) {
        console.error("Local storage save error:", e);
    }

    // 2. Persist to Supabase if available
    try {
        await saveEventToSupabase(eventObj);
    } catch (err) {
        console.warn("Could not save to Supabase events table (ensure table exists):", err.message);
    }

    // Invalidate cache
    _eventsCache = null;
}

/**
 * Legacy compat: synchronous getAllEvents() — returns cache or fallback.
 * Pages that haven't migrated to async fetchAllEvents() can use this.
 */
export function getAllEvents() {
    return _eventsCache || FALLBACK_EVENTS;
}

// Pre-warm the cache as soon as this module loads
fetchAllEvents().catch(() => {});

