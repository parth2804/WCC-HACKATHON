// ==========================================
// ADMIN.JS
// Supabase Admin Dashboard & Real-Time Sync
// Strictly isolated per event — no generalization
// ==========================================

import { supabase } from "./supabase.js";
import { fetchAllEvents, getEventById, getEventByParticipantId, MASTER_ADMIN_PASSCODE } from "./events.js";

// ==========================================
// DETECT EVENT CONTEXT
// ==========================================

const urlParams = new URLSearchParams(window.location.search);
const detectedEventId = window.CURRENT_ADMIN_EVENT_ID || urlParams.get("event") || urlParams.get("eventId") || "innovex-hackathon-2026";

// Ensure Supabase events are loaded before we do anything
await fetchAllEvents();

export const currentAdminEvent = getEventById(detectedEventId);
window.CURRENT_ADMIN_EVENT = currentAdminEvent;

console.log("🛡️ Initializing Admin Dashboard for:", currentAdminEvent.title, "| Event Prefix:", currentAdminEvent.prefix);

// Dynamic storage key so logins are completely separate per event
const AUTH_STORAGE_KEY = `admin_auth_${currentAdminEvent.id}`;

// ==========================================
// GLOBAL DATA (SCOPED TO THIS EVENT ONLY)
// ==========================================

let allEventParticipants = [];

// ==========================================
// GET HTML ELEMENTS
// ==========================================

const totalCount = document.getElementById("totalCount");
const attendedCount = document.getElementById("attendedCount");
const remainingCount = document.getElementById("remainingCount");
const participantTable = document.getElementById("participantTable");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const recentCheckinsContainer = document.getElementById("recentCheckins");

// Apply event branding to admin page headers and labels
document.title = `${currentAdminEvent.title} | Admin Gate Command`;

const adminEventTitle = document.getElementById("adminEventTitle");
const adminEventSub = document.getElementById("adminEventSub");
const adminGateBadge = document.getElementById("adminGateBadge");
const adminLoginTitle = document.getElementById("adminLoginTitle");
const adminLoginDesc = document.getElementById("adminLoginDesc");
const adminPasscodeHint = document.getElementById("adminPasscodeHint");
const adminHeroTitle = document.getElementById("adminHeroTitle");
const adminHeroMeta = document.getElementById("adminHeroMeta");
const adminHeroPrefix = document.getElementById("adminHeroPrefix");
const adminHeroBadge = document.getElementById("adminHeroBadge");
const adminHeroBanner = document.getElementById("adminHeroBanner");
const adminTableHeading = document.getElementById("adminTableHeading");
const adminRecentHeading = document.getElementById("adminRecentHeading");
const adminBackPortalBtn = document.getElementById("adminBackPortalBtn");
const adminRegisterLink = document.getElementById("adminRegisterLink");
const adminLoginCard = document.getElementById("adminLoginCard");

if (adminEventTitle) adminEventTitle.textContent = currentAdminEvent.title;
if (adminEventSub) adminEventSub.textContent = `Gate Admin • ${currentAdminEvent.venue}`;
if (adminGateBadge) adminGateBadge.innerHTML = `<span class="pulse-dot"></span> ${currentAdminEvent.category.toUpperCase()} • GATE CLEARANCE`;
if (adminLoginTitle) adminLoginTitle.textContent = `${currentAdminEvent.title} Admin Login`;
if (adminLoginDesc) adminLoginDesc.textContent = `Enter the administrator passcode for ${currentAdminEvent.title} to access gate QR scanning & attendance.`;
if (adminPasscodeHint) adminPasscodeHint.innerHTML = `Default passcode: <code>${currentAdminEvent.adminPasscode}</code>`;

if (adminHeroTitle) adminHeroTitle.textContent = currentAdminEvent.title;
if (adminHeroMeta) adminHeroMeta.textContent = `${currentAdminEvent.venue} • ${currentAdminEvent.date} • ${currentAdminEvent.capacity}`;
if (adminHeroPrefix) adminHeroPrefix.textContent = `${currentAdminEvent.prefix}-xxx`;
if (adminHeroBadge) adminHeroBadge.innerHTML = `${currentAdminEvent.icon || "🛡️"} ${currentAdminEvent.category.toUpperCase()} GATE ACTIVE`;

if (adminTableHeading) adminTableHeading.textContent = `${currentAdminEvent.title} Attendees`;
if (adminRecentHeading) adminRecentHeading.textContent = `Recent ${currentAdminEvent.title} Check-Ins`;

if (adminBackPortalBtn) adminBackPortalBtn.href = `portal.html?eventId=${encodeURIComponent(currentAdminEvent.id)}`;
if (adminRegisterLink) adminRegisterLink.href = `register.html?event=${encodeURIComponent(currentAdminEvent.id)}`;

if (adminLoginCard && currentAdminEvent.borderColor) {
    adminLoginCard.style.borderColor = currentAdminEvent.borderColor;
}
if (adminHeroBanner) {
    adminHeroBanner.style.borderColor = currentAdminEvent.borderColor || "var(--color-blue)";
    adminHeroBanner.style.background = currentAdminEvent.bgTint || "rgba(63, 102, 181, 0.08)";
}

// ==========================================
// AUTHENTICATION LOGIC & STATE
// ==========================================

const adminLoginSection = document.getElementById("adminLoginSection");
const adminDashboardContent = document.getElementById("adminDashboardContent");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminPassword = document.getElementById("adminPassword");
const togglePasswordBtn = document.getElementById("togglePasswordBtn");
const rememberAdmin = document.getElementById("rememberAdmin");
const loginErrorBox = document.getElementById("loginErrorBox");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");

function isUserAuthenticated() {
    return (
        sessionStorage.getItem(AUTH_STORAGE_KEY) === "true" ||
        localStorage.getItem(AUTH_STORAGE_KEY) === "true"
    );
}

function unlockDashboard() {
    if (adminLoginSection) adminLoginSection.style.display = "none";
    if (adminDashboardContent) adminDashboardContent.style.display = "block";
    if (adminLogoutBtn) adminLogoutBtn.style.display = "inline-flex";
    if (loginErrorBox) {
        loginErrorBox.style.display = "none";
        loginErrorBox.textContent = "";
    }

    fetchParticipants();
    setupRealtimeSubscription();
}

function lockDashboard() {
    if (adminLoginSection) adminLoginSection.style.display = "block";
    if (adminDashboardContent) adminDashboardContent.style.display = "none";
    if (adminLogoutBtn) adminLogoutBtn.style.display = "none";
    if (adminPassword) {
        adminPassword.value = "";
    }
}

// Handle Admin Passcode Submission
if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const entered = adminPassword ? adminPassword.value.trim() : "";
        const expectedPasscode = currentAdminEvent.adminPasscode || "admin2026";

        if (entered === expectedPasscode || entered === MASTER_ADMIN_PASSCODE) {
            if (rememberAdmin && rememberAdmin.checked) {
                localStorage.setItem(AUTH_STORAGE_KEY, "true");
            } else {
                sessionStorage.setItem(AUTH_STORAGE_KEY, "true");
            }
            unlockDashboard();
            showMessage(`✅ Access granted! Welcome to ${currentAdminEvent.title} Admin Command.`, "success");
        } else {
            if (loginErrorBox) {
                loginErrorBox.textContent = `❌ Incorrect passcode for ${currentAdminEvent.title}. Please check with event organizers.`;
                loginErrorBox.style.display = "block";
            }
            if (adminPassword) {
                adminPassword.select();
                adminPassword.focus();
            }
        }
    });
}

// Toggle Show/Hide Passcode
if (togglePasswordBtn && adminPassword) {
    togglePasswordBtn.addEventListener("click", () => {
        const isPassword = adminPassword.type === "password";
        adminPassword.type = isPassword ? "text" : "password";
        togglePasswordBtn.textContent = isPassword ? "🙈" : "👁️";
        togglePasswordBtn.setAttribute(
            "aria-label",
            isPassword ? "Hide password" : "Show password"
        );
    });
}

// Admin Logout
if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener("click", () => {
        if (confirm(`Log out of ${currentAdminEvent.title} Admin Dashboard?`)) {
            sessionStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem(AUTH_STORAGE_KEY);

            if (typeof window.stopScanner === "function") {
                window.stopScanner();
            }

            lockDashboard();
            showMessage("Logged out successfully.", "info");
        }
    });
}

// ==========================================
// DATA FETCHING & REAL-TIME (SCOPED TO THIS EVENT)
// ==========================================

export function isParticipantForCurrentEvent(p) {
    if (!p) return false;
    const pid = String(p.participantId || "").toUpperCase();
    const prefix = currentAdminEvent.prefix;

    if (pid.startsWith(prefix + "-")) return true;
    if (currentAdminEvent.legacyPrefixes && currentAdminEvent.legacyPrefixes.some(lp => pid.startsWith(lp + "-"))) {
        return true;
    }
    if (p.eventName && p.eventName.toLowerCase().includes(currentAdminEvent.category.toLowerCase())) {
        return true;
    }
    return false;
}

async function fetchParticipants() {
    try {
        const { data, error } = await supabase
            .from("participants")
            .select("*")
            .order("id", { ascending: false });

        if (error) {
            console.error("❌ Supabase fetch error:", error);
            showMessage("Database error: " + error.message, "error");
            return;
        }

        const rawParticipants = data || [];
        // Strictly filter participants for THIS specific event only
        allEventParticipants = rawParticipants.filter(p => isParticipantForCurrentEvent(p));

        console.log(`🔥 Supabase data loaded: ${allEventParticipants.length} participants for ${currentAdminEvent.title}`);

        updateDashboard();
        displayParticipants();
        displayRecentCheckins();
    } catch (err) {
        console.error("❌ Fetch error:", err);
    }
}

// Setup Supabase Real-Time Listener
let realtimeChannel = null;
function setupRealtimeSubscription() {
    if (realtimeChannel) return;

    realtimeChannel = supabase
        .channel(`public:participants:${currentAdminEvent.id}`)
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "participants" },
            (payload) => {
                console.log("⚡ Real-time database update:", payload);
                if (isUserAuthenticated()) {
                    fetchParticipants();
                }
            }
        )
        .subscribe((status) => {
            console.log("Realtime subscription status:", status);
        });
}

// Check auth status on load
if (isUserAuthenticated()) {
    unlockDashboard();
} else {
    lockDashboard();
}

// ==========================================
// UPDATE DASHBOARD COUNTERS (EVENT-SPECIFIC)
// ==========================================

function updateDashboard() {
    const total = allEventParticipants.length;
    const attended = allEventParticipants.filter(p => p.attended === true).length;
    const remaining = total - attended;

    if (totalCount) totalCount.textContent = total;
    if (attendedCount) attendedCount.textContent = attended;
    if (remainingCount) remainingCount.textContent = remaining;
}

// ==========================================
// DISPLAY PARTICIPANTS TABLE
// ==========================================

function displayParticipants() {
    if (!participantTable) return;

    const search = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const filter = statusFilter ? statusFilter.value : "all";

    const filtered = allEventParticipants.filter((participant) => {
        const name = String(participant.name || "").toLowerCase();
        const email = String(participant.email || "").toLowerCase();
        const rollNumber = String(participant.rollNumber || "").toLowerCase();
        const participantId = String(participant.participantId || "").toLowerCase();

        const matchesSearch =
            name.includes(search) ||
            email.includes(search) ||
            rollNumber.includes(search) ||
            participantId.includes(search);

        let matchesStatus = true;
        if (filter === "attended") {
            matchesStatus = participant.attended === true;
        } else if (filter === "waiting" || filter === "pending") {
            matchesStatus = participant.attended === false;
        }

        return matchesSearch && matchesStatus;
    });

    participantTable.innerHTML = "";

    if (filtered.length === 0) {
        participantTable.innerHTML = `
            <tr>
                <td colspan="6" class="empty-message">
                    No participants found for ${escapeHTML(currentAdminEvent.title)}.
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach((participant) => {
        const row = document.createElement("tr");

        const statusHTML = participant.attended
            ? `<span class="status attended">✓ Attended</span>`
            : `<span class="status waiting">Waiting</span>`;

        const actionHTML = participant.attended
            ? `<button class="view-btn" onclick="viewParticipant('${participant.participantId}')">View</button>`
            : `<button class="checkin-btn" onclick="manualCheckIn('${participant.participantId}')">Check In</button>`;

        row.innerHTML = `
            <td>
                <strong>${escapeHTML(participant.name || "-")}</strong>
                <small>${escapeHTML(participant.participantId || "-")}</small>
            </td>
            <td>${escapeHTML(participant.rollNumber || "-")}</td>
            <td>${escapeHTML(participant.role || "-")}</td>
            <td>${statusHTML}</td>
            <td>${participant.checkInTime ? escapeHTML(String(participant.checkInTime)) : "-"}</td>
            <td>${actionHTML}</td>
        `;

        participantTable.appendChild(row);
    });
}

// Search and Filter Listeners
if (searchInput) {
    searchInput.addEventListener("input", displayParticipants);
}

if (statusFilter) {
    statusFilter.addEventListener("change", displayParticipants);
}

// ==========================================
// QR CODE PROCESSING & STRICT EVENT VALIDATION
// ==========================================
// QR CODE PROCESSING & STRICT EVENT VALIDATION
// ==========================================

let isScanningLocked = false;

async function processQRCode(decodedText) {
    if (isScanningLocked) {
        console.log("⏳ Scanner debouncing, ignoring frame...");
        return { success: false, debounced: true };
    }

    console.log("📷 Auto Gate Check-In initiated for:", decodedText);
    let rawText = String(decodedText || "").trim();

    if (!rawText) {
        showMessage("Invalid QR pass scanned.", "error");
        return { success: false, error: "Empty QR code" };
    }

    // Try extracting structured ID if encoded in JSON or URL
    let scannedId = rawText;
    if (rawText.startsWith("{") && rawText.endsWith("}")) {
        try {
            const parsed = JSON.parse(rawText);
            scannedId = parsed.participantId || parsed.id || rawText;
        } catch (e) {}
    }

    // Match standard pattern PREFIX-NUMBER (e.g. HACK-001, AISUM-002, EVT-001, ORGY-002)
    const match = scannedId.match(/([A-Za-z0-9]+-\d+)/i);
    if (match) {
        scannedId = match[1].toUpperCase();
    } else {
        scannedId = scannedId.toUpperCase();
    }

    console.log("🔍 Cleaned Participant ID to verify:", scannedId);

    // Lock scanning temporarily so rapid video frames don't trigger duplicates
    isScanningLocked = true;
    setTimeout(() => {
        isScanningLocked = false;
    }, 2800);

    // 1. Identify which event this ticket belongs to
    const ticketEvent = getEventByParticipantId(scannedId);

    // 2. Cross-Event Protection:
    // Only reject if ticket is definitively for a DIFFERENT active event with a different prefix
    if (ticketEvent && 
        ticketEvent.id !== currentAdminEvent.id && 
        ticketEvent.prefix !== currentAdminEvent.prefix) {
        const alertMsg = `⛔ WRONG EVENT TICKET!\nTicket (${scannedId}) is for "${ticketEvent.title}".\nThis gate is ONLY for "${currentAdminEvent.title}". Admission Denied!`;
        console.warn(alertMsg);
        playFeedbackSound("error");
        showMessage(`⛔ WRONG EVENT: This ticket is for "${ticketEvent.title}", NOT this event!`, "error");
        alert(alertMsg);
        return { success: false, error: `Wrong event: ticket is for ${ticketEvent.title}` };
    }

    // 3. Find participant in this event's list (case-insensitive + normalized)
    let participant = allEventParticipants.find((p) => {
        const pid = String(p.participantId || "").toUpperCase().trim();
        return pid === scannedId || pid.replace(/[^A-Z0-9]/g, "") === scannedId.replace(/[^A-Z0-9]/g, "");
    });

    // If not in local cache, query Supabase directly to be 100% sure
    if (!participant) {
        try {
            const { data } = await supabase
                .from("participants")
                .select("*")
                .ilike("participantId", scannedId)
                .maybeSingle();

            if (data) {
                participant = data;
                // Add to local list if not already present
                if (!allEventParticipants.some(p => p.id === data.id)) {
                    allEventParticipants.unshift(data);
                }
            }
        } catch (e) {
            console.error("Direct fetch check error:", e);
        }
    }

    if (!participant) {
        console.error("Participant not found for this event:", scannedId);
        playFeedbackSound("error");
        showMessage(`❌ Not registered: ${scannedId}`, "error");
        return { success: false, error: `Ticket ${scannedId} not registered` };
    }

    if (participant.attended === true) {
        playFeedbackSound("warning");
        showMessage(`⚠️ ${participant.name} is ALREADY CHECKED IN (${participant.checkInTime || "Previously"}).`, "warning");
        return { success: false, alreadyAttended: true, participant };
    }

    // AUTOMATIC ATTENDANCE UPDATE!
    await markAttendance(participant);
    return { success: true, participant };
}

// ==========================================
// MARK ATTENDANCE (OPTIMISTIC UI + PRIMARY KEY DB UPDATE)
// ==========================================

async function markAttendance(participant) {
    if (!participant) return;

    const checkInTime = new Date().toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
    });

    // 1. Instant Optimistic UI Update (immediate feedback, 0ms lag)
    participant.attended = true;
    participant.checkInTime = checkInTime;

    updateDashboard();
    displayParticipants();
    displayRecentCheckins();

    // 2. Visual & Audio Confirmation
    playFeedbackSound("success");
    showMessage(`✅ ${participant.name} (${participant.participantId}) checked in successfully!`, "success");

    // Also update scanner overlay text if camera is running
    const overlayStatus = document.getElementById("scanOverlayStatus");
    if (overlayStatus) {
        overlayStatus.innerHTML = `<span style="color:#4afe78;font-size:0.95rem;font-weight:700;">✅ ${escapeHTML(participant.name)} Checked In!</span>`;
    }

    // 3. Persist to Supabase Database (by Primary Key ID — completely immune to case-sensitivity mismatches)
    try {
        let updateQuery = supabase
            .from("participants")
            .update({
                attended: true,
                checkInTime: checkInTime
            });

        if (participant.id) {
            updateQuery = updateQuery.eq("id", participant.id);
        } else {
            updateQuery = updateQuery.ilike("participantId", participant.participantId);
        }

        const { data, error } = await updateQuery;

        if (error) {
            console.error("❌ Attendance DB update error:", error);
            // Fallback retry using exact uppercase participantId
            await supabase
                .from("participants")
                .update({ attended: true, checkInTime: checkInTime })
                .eq("participantId", String(participant.participantId || "").toUpperCase());
        } else {
            console.log(`✅ Supabase attendance confirmed for ${participant.name} (${participant.participantId})`);
        }
    } catch (error) {
        console.error("❌ Attendance update exception:", error);
    }
}

// ==========================================
// MANUAL CHECK-IN
// ==========================================

async function manualCheckIn(participantId) {
    const cleanId = String(participantId || "").toUpperCase().trim();
    const participant = allEventParticipants.find((p) => {
        const pid = String(p.participantId || "").toUpperCase().trim();
        return pid === cleanId || p.participantId === participantId;
    });

    if (!participant) {
        showMessage("Participant not found for this event.", "error");
        return;
    }

    if (participant.attended === true) {
        showMessage(`${participant.name} is already checked in.`, "warning");
        return;
    }

    await markAttendance(participant);
}

// ==========================================
// VIEW PARTICIPANT DETAILS
// ==========================================

function viewParticipant(participantId) {
    const participant = allEventParticipants.find((p) => p.participantId === participantId);

    if (!participant) {
        showMessage("Participant not found.", "error");
        return;
    }

    alert(
        `PARTICIPANT DETAILS — ${currentAdminEvent.title}\n\n` +
        "Name: " + (participant.name || "-") +
        "\nParticipant ID: " + (participant.participantId || "-") +
        "\nRoll Number: " + (participant.rollNumber || "-") +
        "\nEmail: " + (participant.email || "-") +
        "\nCollege: " + (participant.college || "-") +
        "\nRole: " + (participant.role || "-") +
        "\nEvent: " + currentAdminEvent.title +
        "\nStatus: " + (participant.attended ? "✓ Attended" : "Waiting") +
        "\nCheck-In Time: " + (participant.checkInTime || "-")
    );
}

// ==========================================
// DISPLAY RECENT CHECK-INS (EVENT-SPECIFIC)
// ==========================================

function displayRecentCheckins() {
    const container = recentCheckinsContainer || document.getElementById("recentCheckins");
    if (!container) return;

    const checkedIn = allEventParticipants
        .filter((p) => p.attended === true)
        .sort((a, b) => String(b.checkInTime || "").localeCompare(String(a.checkInTime || "")))
        .slice(0, 5);

    if (checkedIn.length === 0) {
        container.innerHTML = `<p class="empty-message">No check-ins yet for ${escapeHTML(currentAdminEvent.title)}.</p>`;
        return;
    }

    container.innerHTML = "";

    checkedIn.forEach((participant) => {
        const item = document.createElement("div");
        item.className = "recent-checkin";

        item.innerHTML = `
            <strong>${escapeHTML(participant.name || "-")}</strong>
            <span>${escapeHTML(participant.participantId || "-")}</span>
            <small>${escapeHTML(String(participant.checkInTime || "-"))}</small>
        `;

        container.appendChild(item);
    });
}

// ==========================================
// SOUND FEEDBACK UTILITY (WEB AUDIO API)
// ==========================================

function playFeedbackSound(type) {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === "success") {
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18); // A5
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
        } else if (type === "warning") {
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.setValueAtTime(370, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } else {
            // error
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.35);
            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        }
    } catch (e) {
        // audio context not allowed without prior interaction or unsupported
    }
}

// ==========================================
// NOTIFICATION MESSAGE BOX
// ==========================================

function showMessage(message, type = "info") {
    const box = document.getElementById("messageBox");
    if (!box) {
        alert(message);
        return;
    }

    box.textContent = message;
    box.className = `message ${type}`;
    box.style.display = "block";

    setTimeout(() => {
        box.style.display = "none";
    }, 4500);
}

// ==========================================
// ESCAPE HTML UTILITY
// ==========================================

function escapeHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==========================================
// EXPOSE FUNCTIONS TO WINDOW FOR HTML EVENT HANDLERS
// ==========================================

window.processQRCode = processQRCode;
window.manualCheckIn = manualCheckIn;
window.viewParticipant = viewParticipant;

console.log(`🔥 Event Admin initialized for ${currentAdminEvent.title}`);
