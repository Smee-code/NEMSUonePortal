# NEMSUonePortal — Project Context for Claude

## Project Overview

**NEMSUonePortal** is a web-based online student portal for **North Eastern Mindanao State University – Cantilan Campus (NEMSU-Cantilan)**. It centralizes all core academic service transactions into a single secure platform, replacing manual, paper-based, and face-to-face processes.

- **Type:** Capstone Project — Bachelor of Science in Information Technology
- **Institution:** NEMSU-Cantilan Campus, Cantilan, Surigao del Sur, Philippines
- **Status:** In Development (May 2026)
- **Authors:** Alaba, Bulabog, Gumapac, Maquinano, Ranario

---

## System Purpose

Replace fragmented, manual academic workflows with a unified digital portal accessible via standard web browsers. The system eliminates the need for students to physically visit multiple campus offices for enrollment, grade checking, schedule viewing, document requests, and announcements.

---

## User Roles

| Role                     | Key Responsibilities                                                                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Student**              | Sign up/log in, enroll online, view grades, check schedules, request documents, view announcements                                                          |
| **Faculty**              | Log in, encode & submit grades, view teaching load, view announcements                                                                                      |
| **Registrar / Admin**    | Approve/reject enrollments, process document requests, upload academic data, view reports, add courses/subjects offered per program together with its units |
| **System Administrator** | Manage user accounts, configure system settings, view audit logs, view reports                                                                              |

All roles share a **Single Sign-On (SSO)** login. Access is governed by **Role-Based Access Control (RBAC)**.

---

## Core Modules

### 1. User Authentication & Role Management

- Secure registration with institutional email/ID validation
- JWT-based stateless authentication + session-based fallback
- Role-based dashboard routing on login
- Account lockout on repeated failed login attempts
- Credentials encrypted at rest

### 2. Online Enrollment

- Students submit enrollment requests digitally (subject selection, load confirmation)
- Admins approve, modify, or reject submissions
- Automated status notifications sent to students

### 3. Grade Viewing

- Students access official semester grades in real time
- Full grade history accessible across all previous terms
- Grades only appear after faculty encode and submit them

### 4. Class Schedule Management

- Personalized student schedule display (subject code, instructor, room, time slot)
- Faculty can view and manage their teaching load assignments

### 5. Announcements & Notifications

- Centralized bulletin board for school-wide and department-level announcements
- Automated real-time in-app and email notifications for all users

### 6. Document Request System

- Students submit online requests for: Certificate of Enrollment, Transcript of Records, Certificate of Grades
- Real-time status tracking at every stage (submitted → processing → ready for release)
- Registrar staff manage and update request statuses via admin dashboard
- Physical document release is still handled by the registrar's office (out of system scope)

---

## Tech Stack

### Frontend

- **Framework:** React.js
- **Build Tool:** Vite
- **Languages:** HTML, CSS, JavaScript (JSX)
- **Routing:** React Router DOM
- **HTTP client:** Axios (interceptors handle JWT refresh)
- **Charts:** Recharts
- **Icons/Fonts:** Tabler Icons + Google Fonts (Inter, Instrument Serif) — loaded via CDN
- **Design:** Responsive to all screen-sizes, component-based, mobile-accessible via browser

### Backend

- **Framework:** Python / Django
- **API:** Django REST Framework (DRF)
- **Responsibilities:** Business logic, API endpoints, authentication, enrollment processing, grade management

### Database

- **System:** SQLite (Django's `django.db.backends.sqlite3`)
- **Driver:** none required — `sqlite3` ships with the Python standard library
- **File:** `backend/db.sqlite3` (git-ignored; override the path with the `DB_NAME` env var)
- **PRAGMAs:** WAL journal mode, `synchronous=NORMAL`, `foreign_keys=ON`, `busy_timeout=5000`, `transaction_mode=IMMEDIATE`
- **Stores:** Student records, enrollments, grades, schedules, document requests, user accounts
- **Deployment note:** SQLite is a single file on disk. On Railway/Render the filesystem is
  ephemeral, so the database must live on a mounted persistent volume or it is wiped on every
  redeploy. Protect it with filesystem permissions rather than transport encryption.

### Authentication

- **Primary:** JWT (JSON Web Tokens) via `djangorestframework-simplejwt`
  - Access token: 30-minute expiry, stored in React memory only
  - Refresh token: 7-day expiry, stored in HttpOnly, Secure, SameSite=Strict cookie

### DevOps & Tools

- **IDE:** Visual Studio Code
- **Version Control:** Git + GitHub
- **Hosting:** Railway or Render (cloud deployment)
- **Development Method:** Agile (iterative sprints)

---

## Project Structure

```
NEMSUonePortal/
├── backend/                    # Django project root
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── nemsuoneportal/         # Main Django package
│   │   ├── settings/
│   │   │   ├── base.py         # Shared settings
│   │   │   ├── local.py        # Development overrides
│   │   │   └── production.py   # Production hardening
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   ├── asgi.py
│   │   ├── middleware.py       # SecurityHeadersMiddleware
│   │   └── exceptions.py      # Global DRF exception handler
│   ├── authentication/         # Custom User, AuditLog, JWT views, RBAC
│   ├── enrollment/             # Sprint 3
│   ├── grades/                 # Sprint 4
│   ├── schedules/              # Sprint 5
│   ├── announcements/          # Sprint 6
│   └── documents/              # Sprint 7
└── frontend/                   # React + Vite project
    ├── src/
    │   ├── context/AuthContext.jsx   # In-memory JWT, auth state
    │   ├── api/
    │   │   ├── axios.js              # Axios client with interceptors
    │   │   └── tokenStore.js         # Module-level access token store
    │   ├── components/
    │   │   └── RequireRole.jsx       # UI route guard (client-side only)
    │   └── pages/
    │       ├── Login.jsx
    │       ├── SignUp.jsx
    │       ├── student/StudentDashboard.jsx
    │       ├── faculty/FacultyDashboard.jsx
    │       ├── registrar/RegistrarDashboard.jsx
    │       └── admin/AdminDashboard.jsx
    └── vite.config.js
```

---

## RBAC Matrix

| Action                    | Student | Faculty           | Registrar    | Admin     |
| ------------------------- | ------- | ----------------- | ------------ | --------- |
| View own grades           | ✅      | ❌                | ✅           | ✅        |
| Encode/submit grades      | ❌      | ✅ (own subjects) | ❌           | ❌        |
| View all student grades   | ❌      | ❌                | ✅           | ✅        |
| Submit enrollment request | ✅      | ❌                | ❌           | ❌        |
| Approve/reject enrollment | ❌      | ❌                | ✅           | ❌        |
| Submit document request   | ✅      | ❌                | ❌           | ❌        |
| Process document request  | ❌      | ❌                | ✅           | ❌        |
| Post announcements        | ❌      | ❌                | ✅           | ✅        |
| Manage user accounts      | ❌      | ❌                | ❌           | ✅        |
| View audit logs           | ❌      | ❌                | ✅ (limited) | ✅ (full) |
| Configure system settings | ❌      | ❌                | ❌           | ✅        |

All access control enforcement is **server-side only**. Client-side guards (RequireRole) are UI convenience only.

---

## Security Standards

All code must comply with:

1. **`.claude/WEB_SECURITY_STANDARDS.md`** — OWASP Top 10:2025
2. **`.claude/agents/security-reviewer.md`** — Project-specific RBAC matrix and hardening checklist

Security review is required after every sprint before proceeding to the next.

---

## Sprint Roadmap

| Sprint    | Focus                                                                               | Status      |
| --------- | ----------------------------------------------------------------------------------- | ----------- |
| Sprint 1  | Project scaffold, custom user model, JWT auth, RBAC, audit log foundation           | ✅ Complete |
| Sprint 2  | Authentication module — sign-up, login, email verification, password reset, lockout | ✅ Complete |
| Sprint 3  | Enrollment module                                                                   | ✅ Complete |
| Sprint 4  | Grade module                                                                        | ✅ Complete |
| Sprint 5  | Class Schedule module                                                               | ✅ Complete |
| Sprint 6  | Announcements & Notifications                                                       | ✅ Complete |
| Sprint 7  | Document Request module                                                             | ✅ Complete |
| Sprint 8  | System Administrator panel                                                          | ✅ Complete |
| Sprint 9  | Integration testing, UAT preparation, full security audit                           | Pending     |
| Sprint 10 | Bug fixes, performance review, production deployment                                | Pending     |

---

## Key Terms

| Term              | Definition                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| **RBAC**          | Role-Based Access Control — restricts system access by user role                                        |
| **SSO**           | Single Sign-On — one login credential for all portal modules                                            |
| **JWT**           | JSON Web Token — secure stateless authentication method                                                 |
| **AuditLog**      | DB model recording every significant system event (user, role, action, resource, IP, timestamp, result) |
| **ISO/IEC 25010** | International software quality standard used to evaluate the system                                     |
| **RA 10173**      | Philippine Data Privacy Act of 2012 — governs PII handling                                              |
| **@require_role** | Custom Django decorator enforcing server-side role checks                                               |
| **RequireRole**   | React component for UI-layer route guarding (not a sole access gate)                                    |

---

## Research Locale

**North Eastern Mindanao State University – Cantilan Campus**  
Cantilan, Surigao del Sur, Philippines  
College of Information Technology Education — Department of Computer Studies
