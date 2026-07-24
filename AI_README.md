# Movement Pass Portal - FXEC - AI Agent Development Guide

Welcome! This repository contains the project structure, configuration, and TypeScript skeleton stubs for the **Movement Pass Portal** frontend.

This document is specifically formatted to guide **AI agents** in implementing the remaining page logic and styling.

---

## 🚀 How to Run the Project

Follow these commands to install dependencies, run locally, or build the application:

### 1. Install Packages
If you have just cloned the repository, run this command in your terminal to install all dependencies:
```bash
npm install
```

### 2. Start the Development Server
To launch the hot-reloading development server locally:
```bash
npm run dev
```
Once run, open your browser and navigate to the address shown in the terminal (usually `http://localhost:5173`).

### 3. Check for Errors & Compile
To compile the TypeScript project and verify there are no syntax or type violations:
```bash
npm run build
```

---

## 🛠️ Tech Stack & Key Configs

* **React 19 + TypeScript**: Modern functional component architecture.
* **Vite**: Ultra-fast bundler.
* **Tailwind CSS v4**: Integrated directly via the Vite plugin `@tailwindcss/vite`.
  > [!IMPORTANT]
  > Because this project uses **Tailwind v4**, there is **NO `tailwind.config.js`** file. All Tailwind setup is compiled directly from the `@import "tailwindcss";` directive in `src/index.css`.
* **React Router DOM**: Configured in [AppRoutes.tsx](src/routes/AppRoutes.tsx) to manage pages.
* **React Icons**: Iconography library (`react-icons/fa`, `react-icons/md`, etc.).

---

## 📁 Project Folder Structure

The project has been scaffolded to align with the modular requirement guide:

```
src/
├── assets/          # Shared asset icons and branding graphics
├── components/      # Reusable components
│   ├── layout/      # Navbar (with Role Switcher), Sidebar
│   ├── dashboard/   # StatsCard, CalendarWidget, DepartmentCards, RecentActivity
│   ├── forms/       # ODForm (handles request inputs)
│   ├── tables/      # StudentTable, RequestsTable, MentorApprovalTable, HODApprovalTable
│   ├── cards/       # Component-specific cards
│   ├── modals/      # RejectionReasonModal
│   └── common/      # Reusable stubs (Button, Input, Select, TextArea, Badge, EmptyState)
├── context/         # AppContext.tsx (Simulated In-Memory Database)
├── layouts/         # MainLayout.tsx (Overall page wraps)
├── pages/           # Individual Page components
│   ├── Login/       # Landing authentication gate
│   ├── Dashboard/   # Universal statistics landing
│   ├── Student/     # ApplyOD, MyRequests, History
│   ├── Mentor/      # PendingApprovals, History
│   ├── HOD/         # HODPendingApprovals, ApprovedHistory
│   └── Profile/     # User identity card profile
├── routes/          # Router paths mapper
├── App.tsx          # Root provider setups
└── index.css        # Global CSS + Tailwind core imports
```

---

## 🔄 Local State Management (Mock Database)

We have built a fully functional local state context in [AppContext.tsx](src/context/AppContext.tsx) that persists data in `localStorage`. 

### Key Methods Available in Context:
- **`currentRole`**: `'STUDENT' | 'MENTOR' | 'HOD' | 'ADMIN'`
- **`requests`**: Array of all OD applications.
- **`addRequest(newReq)`**: Adds a new OD application with pending flags.
- **`updateMentorStatus(id, 'APPROVED' | 'REJECTED', reason?)`**: Updates mentor review logs.
- **`updateHODStatus(id, 'APPROVED' | 'REJECTED', reason?)`**: Updates HOD review logs.
- **`bulkHODApprove(ids[])`**: Multi-select approvals (only active if Mentor approved).
- **`bulkHODReject(ids[], reason)`**: Multi-select rejections.

To hook up any component to this state:
```typescript
import { useApp } from '../context/AppContext';

const { requests, addRequest, currentRole } = useApp();
```

---

## 📝 Guidelines for AI Agents Writing Code

When you invoke an AI agent to build out or edit page layouts, instruct it with the following developer guidelines:

1. **Strict TypeScript Imports**:
   This project enforces `verbatimModuleSyntax` in `tsconfig.json`. Types must be imported using `import type`:
   - **Correct**: `import type { ODRequest } from '../../context/AppContext';`
   - **Incorrect**: `import { ODRequest } from '../../context/AppContext';`
2. **No Inline Styling**:
   Use Tailwind utility classes exclusively for all layout components and templates. Do not write custom css properties unless configuring special SVG vectors.
3. **Role Switcher Testing**:
   Ensure components display content dynamically based on the active role (`currentRole`) from `useApp()`. This allows a single user to test student submission, mentor approval, and HOD checkbox approval directly by switching roles in the Navbar dropdown.
4. **Interactive SVG Charts**:
   Use SVG grids and divs for chart placeholders in `/analytics` to avoid dependency compile errors. Refer to the existing example in `src/pages/Analytics/Analytics.tsx`.
