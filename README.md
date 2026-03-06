# HDDBAR - HDD Serial number barcode scanner 
*Have you ever destroyed a lot of disks that needed to have serial numbers written on them?*

**Use a barcode scanner for work, place the cursor in the area "Click hire" click to put a carriage.**

A Flask-based web application for managing hard drive serial numbers, tracking erase events, and generating reports.   
The system supports multiple operators and allows clearing the displayed table **only for the current operator session**, without deleting any data from the database.

---

## 🔧 Features

### ✔ Upload Serial Numbers
An operator can upload SNs in two ways:
- upload a text file (.txt, one SN per line)
- enter the list manually in a textarea

Duplicate serial numbers are automatically skipped.

### ✔ Disk Scanning
When a serial number is scanned:
- if the SN exists in the database — it is marked as erased
- if the SN is missing — the system returns `not_found`
- if the SN was already erased — the system returns `duplicate`

### ✔ Operator Sessions
Each operator logs in with their name.  
All erase events are tied to that operator.

### ✔ UI Reset (Session‑Only)
The `/reset` feature:
- **DELETE anything from the database**
- clears only the displayed table **for the current operator session**
- allows starting a new batch without losing historical data

### ✔ Exportable Reports
Reports can be generated in three formats:
- CSV
- XLSX
- PDF (with automatic pagination)

---

## 📦 Installation

### 1. Clone the repository

```git clone https://github.com/your/repo.git```

### 2. Install the dependencies
```pip install -r requirements.txt```

### 3. Start the server
```python app.py```

Default access: 

```http:127.0.0.1:5000```

## 🗄 Database Structure

### `Disk` table
- `id`
- `serial_number`

### `EraseEvent` table
- `id`
- `serial_number`
- `operator`
- `method`
- `erase_date`

---

## 🔗 Main Routes

| Route | Description |
|-------|-------------|
| `/login` | Operator login |
| `/upload` | Upload serial numbers |
| `/scan` | Scan and record erase event |
| `/reset` | Clear the visible table for the operator session |
| `/report/csv` | Export CSV report |
| `/report/xlsx` | Export XLSX report |
| `/report/pdf` | Export PDF report |

---

## 📘 Example Workflow

1. The operator logs in.
2. Uploads a list of serial numbers (file or text).
3. Scans erased disks; the system marks them accordingly.
4. Uses `/reset` at any time to clear the current view (database remains unchanged).
5. Generates summary reports.

---

## 📄 License
MIT License.


