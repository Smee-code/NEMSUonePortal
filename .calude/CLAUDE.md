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

| Role | Key Responsibilities |
|---|---|
| **Student** | Sign up/log in, enroll online, view grades, check schedules, request documents, view announcements |
| **Faculty** | Log in, encode & submit grades, view teaching load, post announcements |
| **Registrar / Admin** | Approve/reject enrollments, process document requests, upload academic data, view reports |
| **System Administrator** | Manage user accounts, configure system settings, view audit logs, view reports |

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
- **Framework:** React.js or Vue.js
- **Languages:** HTML, CSS, JavaScript
- **Design:** Responsive, component-based, mobile-accessible via browser

### Backend
- **Framework:** Python / Django
- **Responsibilities:** Business logic, API endpoints, authentication, enrollment processing, grade management

### Database
- **System:** PostgreSQL
- **Stores:** Student records, enrollments, grades, schedules, document requests, user accounts

### Authentication
- **Primary:** JWT (JSON Web Tokens) — stateless, token-based
- **Fallback:** Session-based authentication for browser contexts

### DevOps & Tools
- **IDE:** Visual Studio Code
- **Version Control:** Git + GitHub
- **Hosting:** Railway or Render (cloud deployment)
- **Development Method:** Agile (iterative sprints)

### System Architecture
- **Pattern:** Three-Tier Architecture
  - **Tier 1:** Responsive frontend interface layer
  - **Tier 2:** Secure backend business logic layer (Django)
  - **Tier 3:** Centralized relational database layer (PostgreSQL)

---

## Hardware Requirements (Development / Server)

| Component | Minimum Spec |
|---|---|
| Processor | Intel Core i5 or equivalent |
| RAM | 8 GB |
| Storage | 256 GB SSD |
| OS | Windows 10/11 Pro 64-bit |
| Internet | Stable broadband connection |

---

## Development Methodology

**Agile Software Development** with four phases:

1. **Requirements Planning** — Interviews with students, faculty, and registrar staff to define features and scope
2. **User Design Phase** — Wireframes and UI prototypes for all four role dashboards; feedback-driven revisions
3. **Construction Phase** — Incremental feature development and integration via Agile sprints
4. **Cut-Over Phase** — System testing, integration testing, UAT, deployment

---

## Quality Evaluation

The system is evaluated using **ISO/IEC 25010** via structured **User Acceptance Testing (UAT)** with all four user groups, using a 5-point Likert scale survey.

| Quality Characteristic | What It Measures |
|---|---|
| Functional Suitability | Does the system do what it's supposed to? |
| Performance Efficiency | Speed and resource usage under load |
| Compatibility | Works across browsers and devices |
| Usability | Ease of use, intuitive navigation |
| Reliability | Stability and fault tolerance |
| Security | Authentication, access control, data protection |
| Maintainability | Ease of updates and code management |
| Portability | Deployability across environments |

---

## Scope & Limitations

### In Scope
- NEMSU-Cantilan Campus only (single-campus system)
- Web application accessible via standard browsers
- Six core modules listed above
- Four user roles with RBAC

### Out of Scope (Future Development)
- Integration with other NEMSU campuses
- Online tuition fee payment and financial records
- Native mobile apps for iOS and Android
- Physical document printing or digital document issuance
- Offline/low-connectivity mode

### Known Constraints
- Requires a stable internet connection for full functionality
- Grade availability depends on timely faculty encoding
- Document request module tracks status only — physical release is manual

---

## Key Terms Quick Reference

| Term | Definition |
|---|---|
| **RBAC** | Role-Based Access Control — restricts system access by user role |
| **SSO** | Single Sign-On — one login credential for all portal modules |
| **JWT** | JSON Web Token — secure stateless authentication method |
| **Audit Log** | Record of all significant user actions for accountability and oversight |
| **ISO/IEC 25010** | International software quality standard used to evaluate the system |
| **Django** | Python web framework used for the backend |
| **PostgreSQL** | Relational database storing all academic data |
| **Three-Tier Architecture** | Frontend / Backend / Database separation pattern |

---

## Research Locale

**North Eastern Mindanao State University – Cantilan Campus**
Cantilan, Surigao del Sur, Philippines
College of Information Technology Education — Department of Computer Studies
