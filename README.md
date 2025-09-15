# 📗 PDTS Web (Vite + React + TS)

> **TR note:** README is English. Set `VITE_API_URL` to your backend and add screenshots under `docs/screens`.

![Vite](https://img.shields.io/badge/Vite-React-646CFF) ![TypeScript](https://img.shields.io/badge/TypeScript-Yes-3178C6)

Modern dashboard for the **Personnel Daily Tracking System**.  
Live timeline (staff + visitors), gate IN/OUT strings (building • floor • door), lunch events, charts, profiles, reports and admin tools.

---

## Highlights
- **Daily Timeline** (merged events)
  - Check-in (late badge after 09:30), Lunch out/in, Check-out
  - Gate strings: `A1 • Floor 5 • Door 3` (IN) / `A2 • Floor 2 • Door 7` (OUT)
  - Visitor IN/OUT with host, company, purpose
 <img width="1826" height="905" alt="home page" src="https://github.com/user-attachments/assets/f27d97a1-25fc-4934-84e1-9803ea03a3cc" />

- **Charts**
  - Line: `OWN_CARD`, `TEMP_CARD`, `VISITOR` cumulative entries by hour
  - Pie: `At Work`, `At Lunch`, `Offsite`
  - <img width="1452" height="725" alt="A-2" src="https://github.com/user-attachments/assets/1c7fd527-237a-4a4d-ae52-a227ccb4e498" />
  <img width="1496" height="747" alt="a-7" src="https://github.com/user-attachments/assets/1fbb976c-805a-4747-9545-d86eb2ac5c5a" />
  <img width="1483" height="756" alt="a-9" src="https://github.com/user-attachments/assets/2475629d-ba75-4387-872c-d7eb1c625b3f" />
<img width="1489" height="756" alt="a-8" src="https://github.com/user-attachments/assets/bc5eb836-a819-49e8-bd01-007e73551de0" />



    
- **Profiles**
  - Daily/Monthly/Yearly tabs, totals (late/early/lunch), detailed logs
  <img width="1494" height="731" alt="a-11" src="https://github.com/user-attachments/assets/150350e1-76eb-4475-880e-afaf129f342e" />
  <img width="1509" height="753" alt="a-12" src="https://github.com/user-attachments/assets/61551af1-5bc9-4d47-b8b8-fec08259d1af" />


- **Visitors**
  - Live visitors (checked in, not checked out) and full history (not available)
  <img width="1492" height="377" alt="a-10" src="https://github.com/user-attachments/assets/0399dc7c-0cb4-42ab-9d34-67b2c315d145" />

- **Admin**
  - Add/Edit Staff, Add Visitor
    <img width="596" height="446" alt="A-4" src="https://github.com/user-attachments/assets/c7cba23f-d14c-47fc-8bd3-083bb893fa0a" />
    <img width="1489" height="759" alt="A-5" src="https://github.com/user-attachments/assets/b09b00b8-e56c-4153-b485-5e48d55c7598" />
    <img width="938" height="636" alt="A-6" src="https://github.com/user-attachments/assets/ba08ce63-9017-4013-bfcf-0c1935a8a124" />



---

##  Quick Start
```bash
npm install
# set backend base URL in .env
# VITE_API_URL=http://localhost:8080
npm run dev
```
Open `http://localhost:5173`.

### Demo Login
```
Email:    admin@botas.gov.tr
Password: Admin123!
```

---

##  Environment
Create `.env` in repo root:
```
VITE_API_URL=http://localhost:8080
```
Ensure backend has CORS enabled for this origin.

---

##  API Contracts (used by the UI)
- `GET /api/staff`
- `GET /api/attendance?from&to&staffId`
- `GET /api/visitors`
- Admin actions: `POST /api/staff`, `PATCH /api/staff/{id}`, `POST /api/visitors`

The UI expects attendance objects to include:
- `entryType`, `checkIn`, `lunchOut`, `lunchIn`, `checkOut`
- **IN**: `inBuilding`, `inFloor`, `inDoor`
- **OUT**: `outBuilding`, `outFloor`, `outDoor`

Visitors include:
- `name`, `company`, `purpose`, `date`, `checkIn`, `checkOut`, `hostStaffId`



##  Structure (high level)
```
src/
  App.tsx
  pages/ (Home, Profiles, Visitors, Reports, Admin)
  hooks/ (useStaff, useAttendance, useVisitors)
  components/ (icons, chips)
public/
  botas-logo.png
docs/
  screens/
```

---

##  Scripts
```bash
npm run dev
npm run build
npm run preview
```

---

##  Troubleshooting
- **Empty UI** → Start backend with `--ptds.seed=true` at least once.
- **Visitors not visible** → Verify `/api/visitors` returns data; add via Admin → Add Visitor.
- **All Offsite** → Confirm today’s attendance exists (date/time OK).
- **CORS** → Allow `http://localhost:5173` in backend.
