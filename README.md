# QR Code Event Check-In & Attendance Management System

A streamlined, modern web-based event check-in and attendance tracking application powered by dynamic QR codes and Supabase.

## Features

- **Participant Registration**: Fast registration with automatic participant ID assignment.
- **Dynamic QR Code Generation**: Instant client-side QR generation unique to each registrant.
- **Live Camera Scanner**: Integrated camera-based QR scanner for rapid gate attendance verification.
- **Real-Time Database**: Instant cloud synchronization using Supabase Real-Time WebSocket channels.
- **Admin Dashboard**: Live attendee counter, participant directory, search, role filters, and manual check-in controls.
- **Duplicate Prevention**: Safeguards to ensure single check-in per participant ID.

## Tech Stack

- **Frontend**: HTML5, Modern CSS3 (Dark Theme & Responsive Grid), Vanilla JavaScript (ES Modules)
- **Database**: Supabase (PostgreSQL with Realtime WebSockets)
- **Libraries**:
  - `@supabase/supabase-js` (Database & Real-time channel)
  - `QRCode.js` (Client-side QR generation)
  - `html5-qrcode` (Browser camera QR code scanner)

## Project Architecture

```
├── index.html        # Events discovery home page (listing of upcoming events & category filters)
├── portal.html       # Event access portal (choose Participant Registration or Admin Dashboard)
├── register.html     # Participant registration & dynamic QR code generation
├── admin.html        # Administrative dashboard, live camera QR scanner & event filter
├── css/
│   └── style.css     # Muted Memphis design system styling & responsive layout
└── js/
    ├── events.js     # Shared events data model & catalog
    ├── supabase.js   # Supabase client configuration & credentials
    ├── register.js   # Registration logic & QR generation handlers
    └── admin.js      # Dashboard state, Supabase live listeners & check-in logic
```

## How It Works

1. **Register**: The participant submits their details (Name, Email, Roll Number, College, Role).
2. **Generate**: The system creates a unique ID and renders a downloadable QR code.
3. **Scan & Check In**: The event coordinator starts the live camera scanner on the admin dashboard and scans the participant's QR code.
4. **Real-time Attendance**: The record is instantly marked as attended with timestamp and synced across active screens.

## Getting Started

1. Clone or download the repository into your local workspace.
2. Open `index.html` or `register.html` in any modern web browser or serve via a local HTTP server (e.g., Live Server or `npx serve`).
3. Access the Admin Dashboard via `admin.html` to monitor participants and scan badges.
