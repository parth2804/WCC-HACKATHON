// ==========================================
// REGISTER.JS
// Supabase Event Registration + Unique QR Pass Generation
// Scoped strictly per event
// ==========================================

import { supabase } from "./supabase.js";
import { getEventById } from "./events.js";

// ==========================================
// DETECT CURRENT EVENT CONTEXT
// ==========================================

const urlParams = new URLSearchParams(window.location.search);
const detectedEventId = window.CURRENT_REGISTER_EVENT_ID || urlParams.get("event") || urlParams.get("eventId") || "innovex-hackathon-2026";
const currentEvent = getEventById(detectedEventId);
window.CURRENT_EVENT = currentEvent;

console.log("🎫 Registering for Event:", currentEvent.title, "| Prefix:", currentEvent.prefix);

// Update event header/badges on page if elements exist
const regEventTitle = document.getElementById("regEventTitle");
const regEventMeta = document.getElementById("regEventMeta");
const regEventBadge = document.getElementById("regEventBadge");
if (regEventTitle) regEventTitle.innerHTML = `<span class="gradient-text">${currentEvent.title}</span>`;
if (regEventBadge) regEventBadge.innerHTML = `<span class="pulse-dot"></span> ${currentEvent.category.toUpperCase()} • ATTENDEE REGISTRATION`;
if (regEventMeta) regEventMeta.textContent = `${currentEvent.date} • ${currentEvent.time} • ${currentEvent.venue}`;

// ==========================================
// HTML ELEMENTS
// ==========================================

const form = document.getElementById("registrationForm");
const successBox = document.getElementById("successBox");
const errorBox = document.getElementById("errorBox");
const qrContainer = document.getElementById("qrcode");
const participantIdElement = document.getElementById("participantId");
const downloadQRButton = document.getElementById("downloadQR");

if (!form) {
    console.error("❌ registrationForm not found");
}

// ==========================================
// REGISTRATION
// ==========================================

form?.addEventListener("submit", async function (event) {
    event.preventDefault();

    console.log("🟢 Registration started for:", currentEvent.title);

    // ======================================
    // GET FORM VALUES
    // ======================================

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const rollNumber = document.getElementById("rollNumber").value.trim();
    const college = document.getElementById("college").value.trim();
    const role = document.getElementById("role").value;

    // ======================================
    // VALIDATION
    // ======================================

    if (
        name === "" ||
        email === "" ||
        rollNumber === "" ||
        college === "" ||
        role === ""
    ) {
        showError("Please fill all fields.");
        return;
    }

    try {
        const submitBtn = form.querySelector("button[type='submit']");
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Generating Your Pass...";
        }

        // ==================================
        // GET ALL PARTICIPANTS TO CHECK DUPLICATES & CALC ID FOR THIS EVENT
        // ==================================

        const { data: allParticipants, error: fetchError } = await supabase
            .from("participants")
            .select("id, participantId, rollNumber, email");

        if (fetchError) {
            console.error("Fetch participants error:", fetchError);
        }

        const participantsList = allParticipants || [];
        const prefix = currentEvent.prefix;

        // Check if student with this roll number or email is already registered FOR THIS EVENT
        const isDuplicateForThisEvent = participantsList.some(p => {
            const pid = (p.participantId || "").toUpperCase();
            const belongsToThisEvent = pid.startsWith(prefix + "-") || 
                (prefix === "HACK" && pid.startsWith("EVT-"));
            
            return belongsToThisEvent && (
                p.rollNumber?.toLowerCase() === rollNumber.toLowerCase() ||
                p.email?.toLowerCase() === email.toLowerCase()
            );
        });

        if (isDuplicateForThisEvent) {
            showError(`This student (Roll: ${rollNumber}) is already registered for ${currentEvent.title}!`);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Generate QR Pass →";
            }
            return;
        }

        // Calculate highest number for this event prefix
        let highestNumber = 0;
        participantsList.forEach(row => {
            const pid = (row.participantId || "").toUpperCase();
            let num = NaN;
            if (pid.startsWith(prefix + "-")) {
                num = parseInt(pid.replace(prefix + "-", ""), 10);
            } else if (prefix === "HACK" && pid.startsWith("EVT-")) {
                num = parseInt(pid.replace("EVT-", ""), 10);
            }
            if (!isNaN(num) && num > highestNumber) {
                highestNumber = num;
            }
        });

        // ==================================
        // CREATE NEXT PARTICIPANT ID (e.g. HACK-001, AISUM-001)
        // ==================================

        const nextNumber = highestNumber + 1;
        const participantId = `${prefix}-${String(nextNumber).padStart(3, "0")}`;

        console.log("Generated Event-Specific Participant ID:", participantId);

        // ==================================
        // SAVE TO SUPABASE
        // ==================================

        const participantData = {
            participantId: participantId,
            name: name,
            email: email,
            rollNumber: rollNumber,
            college: college,
            role: role,
            attended: false,
            checkInTime: null
        };

        const { error: insertError } = await supabase
            .from("participants")
            .insert([participantData]);

        if (insertError) {
            throw insertError;
        }

        console.log("✅ SAVED TO SUPABASE for event:", currentEvent.title);

        // ==================================
        // GENERATE QR CODE
        // ==================================

        if (!qrContainer) {
            console.error("❌ qrcode element not found");
        } else {
            qrContainer.innerHTML = "";

            if (typeof QRCode === "undefined") {
                showError("QR Code library is not loaded.");
                return;
            }

            new QRCode(qrContainer, {
                text: participantId,
                width: 220,
                height: 220,
                correctLevel: QRCode.CorrectLevel.M
            });
        }

        // ==================================
        // SHOW PARTICIPANT ID & EVENT BADGE
        // ==================================

        if (participantIdElement) {
            participantIdElement.textContent = participantId;
        }

        const successEventBadge = document.getElementById("successEventBadge");
        if (successEventBadge) {
            successEventBadge.textContent = currentEvent.title;
        }

        // ==================================
        // SHOW SUCCESS
        // ==================================

        if (successBox) {
            successBox.style.display = "block";
            successBox.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        if (errorBox) {
            errorBox.style.display = "none";
        }

        form.style.display = "none";
        console.log("🎉 Registration successful for:", participantId);

    } catch (error) {
        console.error("❌ SUPABASE REGISTRATION ERROR:", error);
        showError("Registration failed: " + (error.message || error));
        const submitBtn = form.querySelector("button[type='submit']");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Generate QR Pass →";
        }
    }
});

// ==========================================
// DOWNLOAD QR
// ==========================================

if (downloadQRButton) {
    downloadQRButton.addEventListener("click", function () {
        const canvas = qrContainer?.querySelector("canvas");

        if (!canvas) {
            showError("QR code is not available.");
            return;
        }

        const link = document.createElement("a");
        link.download = `${currentEvent.prefix}-${participantIdElement?.textContent || "pass"}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
}

// ==========================================
// ERROR MESSAGE
// ==========================================

function showError(message) {
    if (!errorBox) {
        alert(message);
        return;
    }

    errorBox.textContent = message;
    errorBox.style.display = "block";

    if (successBox) {
        successBox.style.display = "none";
    }
}
