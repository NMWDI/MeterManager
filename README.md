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

### Tech Stack

| Layer         | Technology           |
|---------------|----------------------|
| **Frontend**  | React + TypeScript   |
| **Backend**   | FastAPI (Python)     |
| **Database**  | PostgreSQL + PostGIS |
| **Container** | Docker Compose       |
| **CI/CD**     | GitHub Actions       |
