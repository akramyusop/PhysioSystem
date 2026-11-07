# PhysioSystem — Rehabilitation & Physiotherapy Platform

A full-stack physiotherapy management and interactive rehabilitation platform built with a **Rust (Axum/SQLx) + TypeScript/React** architecture backed by a shared **SQLite** database.

---

## 👥 6-Module Team Assignments

To prevent merge conflicts, each member works exclusively in their assigned frontend module directory and backend Rust module file:

| Module | Name / Focus | Frontend Folder | Backend File | Primary Database Tables |
| :--- | :--- | :--- | :--- | :--- |
| **Module 1** | Identity, Auth & Patient Onboarding | `frontend/src/modules/auth/` | `backend/src/mod_auth.rs` | `users`, `patient_profiles` |
| **Module 2** | Doctor Prescription Planner | `frontend/src/modules/prescription/` | `backend/src/mod_prescription.rs` | `treatment_plans`, `prescribed_exercises` |
| **Module 3** | Patient Guidance & Video Library | `frontend/src/modules/library/` | `backend/src/mod_library.rs` | `exercises`, `media_assets` |
| **Module 4** | Gamified Rehabilitation Engine | `frontend/src/modules/game/` | `backend/src/mod_game.rs` | `game_sessions`, `high_scores` |
| **Module 5** | Nurse & Activity Logger | `frontend/src/modules/logger/` | `backend/src/mod_logger.rs` | `activity_logs`, `vital_notes` |
| **Module 6** | Recovery Dashboard & Analytics | `frontend/src/modules/analytics/` | `backend/src/mod_analytics.rs` | `view_patient_recovery_summary`, `view_patient_alerts` |

---

## 🚀 Quick Start for Team Members

### 1. Prerequisites
- **Node.js** (v18+) & **npm** / **pnpm**
- **Rust** & **Cargo** (1.75+)

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend interface will open at `http://localhost:3000`.

### 3. Backend Setup
```bash
cd backend
cargo run
```
The Axum backend will boot on `http://127.0.0.1:3001` and automatically apply:
1. `migrations/001_init.sql` (Creates all tables and views)
2. `migrations/002_seed.sql` (Inserts initial doctors, patients, exercises, and mock sessions)

---

## 🌿 Git Branching Rules for Team Members

1. Always pull latest `main` before starting:
   ```bash
   git checkout main
   git pull origin main
   ```
2. Create your isolated feature branch based on your assigned module:
   ```bash
   git checkout -b feat/mod1-auth          # Member 1
   git checkout -b feat/mod2-prescription  # Member 2
   git checkout -b feat/mod3-library       # Member 3
   git checkout -b feat/mod4-game          # Member 4
   git checkout -b feat/mod5-logger        # Member 5
   git checkout -b feat/mod6-analytics     # Member 6
   ```
3. **Database rule:** Do NOT modify `001_init.sql` directly. If your module needs a new column or table later, create a new numbered file: `migrations/003_xxx.sql`.
