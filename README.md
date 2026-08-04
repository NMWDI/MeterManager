# Meter Manager

### Purpose

**Meter Manager** is a web application designed to help **PVACD** manage its water data. It provides tools for spatial visualization, maintenance tracking, and regulatory reporting.

---

### Features

- 🗺️ Interactive map UI for meters and wells  
- 🔧 Meter activities, maintenance history, and preventive maintenance (PM) tracking  
- 📦 Inventory and part usage tracking  
- 📋 Work order and technician assignment system  
- 📑 OSE-compliant reporting endpoint  
- 🛠️ Admin features for editing, merging, and managing records  
- 👥 Role-based access control (techs, admins, etc.)  
- 🛰️ TRSS grid overlays for spatial reference  
- 💧 Continuous monitoring support for observation wells  

---

### Password Security

New and changed passwords must be at least 12 characters and include lowercase
letters, uppercase letters, numbers, and symbols. Passwords that include obvious
account identifiers such as the username, email, full name, or display name are
rejected.

Existing weak passwords do not block users from signing in. After a successful
sign-in, the application records the current password's last known strength
status so the Settings page can warn the user if their current password is weak.
The Settings password section also shows when the password was last changed.

When users type a new password, the UI shows strength feedback immediately. On
blur, the backend checks the candidate password against the Have I Been Pwned
Pwned Passwords range API using k-anonymity: only the first five characters of a
SHA-1 hash are sent, and the raw password is never sent to the third-party
service. Known compromised passwords are rejected when a password is changed.

---

### Tech Stack

| Layer         | Technology           |
|---------------|----------------------|
| **Frontend**  | React + TypeScript   |
| **Backend**   | FastAPI (Python)     |
| **Database**  | PostgreSQL + PostGIS |
| **Container** | Docker Compose       |
| **CI/CD**     | GitHub Actions       |
