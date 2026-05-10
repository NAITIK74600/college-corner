# Project Name: College Corner
**Project Type:** Hyperlocal Quick-Commerce & Smart Print SaaS Web Application
**Project Owner:** Naitik Raj

## 1. System Architecture Overview
The system will NOT use any pre-built AI templates. It must be a custom-coded, highly scalable platform with a premium UI (Figma-ready standard). The architecture consists of 3 main components:
1. **Frontend (User Portal):** For students to order items and upload print documents.
2. **Backend & Admin Cloud:** Centralized API, DB, and intelligent print queue logic.
3. **Local Print Client (Hardware Bridge):** A lightweight background service running on the shopkeeper's PC to route cloud queues to physical printers.

## 2. Tech Stack (Suggested)
* **Frontend:** Next.js (React) with Tailwind CSS (Custom components, no generic UI kits).
* **Backend:** Node.js (Express) or Python (FastAPI) for high-performance queue management.
* **Database:** PostgreSQL (Relational integrity for orders and payments) or MongoDB.
* **Storage:** AWS S3 or Firebase Storage (for temporary storage of user-uploaded PDFs/Images).
* **Local Print Client:** Python script (using `win32print` or `CUPS`) running as a daemon on the local PC.

## 3. Core Database Models (High-Level)
* **Users:** User details, role (admin/customer), wallet balance.
* **Products:** Stationery/Items, stock count, price, category.
* **Print_Jobs:** Job_ID, file_url, config (B&W/Color, A4/A3, etc.), total_pages, amount, status (Pending, Processing, Printed, Ready).
* **Printers:** Printer_ID, Name, capabilities_tag (B&W/Color), status (Active/Inactive).
* **Orders:** Combined cart (Products + Print_Jobs), delivery_type (pickup/delivery), payment_status.

## 4. The Smart Multi-Printer Logic
* Cloud backend will maintain a queue of `Print_Jobs`.
* Local Client constantly polls the cloud API for new 'Paid' & 'Approved' jobs.
* **Routing Logic:** If a job requires B&W, the backend checks the `Printers` table for Active B&W printers. It uses Round-Robin to assign the job to the least busy Active printer.
* Color jobs strictly go to the Active Color-tagged printer.