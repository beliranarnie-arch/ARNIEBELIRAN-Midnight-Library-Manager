# Midnight Library Manager

Flask + Firebase Cloud Firestore web application for the Advance Database Final Practical Activity.

## Features
- Books: create, list, search/filter, view one record, update, delete
- Members: create, list, search/filter, view one record, update, delete
- Borrowings: create, list, search/filter, view one record, edit dates, delete
- Returns: process book returns and update available copies
- Dashboard statistics and reports with CSV export/print
- Server-side validation, error responses and Firestore transactions for inventory

## Requirements
Python 3.10 or newer. Firebase Cloud Firestore must be enabled for your project.

## Setup (PyCharm, Windows PowerShell)
1. Open the folder in PyCharm and configure a Python 3.10+ interpreter.
2. In the terminal run `py -m venv .venv`.
3. Install dependencies **without activating** PowerShell scripts: `.\.venv\Scripts\python.exe -m pip install -r requirements.txt` (use `.\.venv\Scripts\python.exe` if typing directly in PowerShell).
4. Place your newly generated Firebase service account JSON in this folder as `ServiceAccountKey.json`. **Do not commit it.**
5. Copy `.env.example` to `.env` and verify the credentials filename.
6. Run `.\.venv\Scripts\python.exe app.py`.
7. Open `http://127.0.0.1:5000` and test `http://127.0.0.1:5000/test-firestore`.

## Firestore collections
`books`, `members`, `borrowings`. Created automatically on first insert. All access goes through Flask; the browser does not connect directly to Firestore.

## API
- GET `/test-firestore`, `/api/summary`
- GET/POST `/api/books`, `/api/members`, `/api/borrowings`
- GET/PUT/DELETE `/api/<resource>/<document_id>`
- POST `/api/returns/<borrowing_id>`
- Optional GET filtering: `?search=term` or `?field=genre&value=Fiction`

## Security notes
- Never commit `.env` or service account keys. Rotate any previously shared service-account key.
- This is a local coursework prototype, not a production deployment. Add authentication, role authorization, CSRF protection, rate limiting and concurrency-safe unique-key reservations before exposing it publicly.

## Sample collection and interface
Click **Load sample collection** after Firestore connects. This explicitly inserts up to eight books, four fictional members and four related loans, without overwriting existing documents. Existing matching ISBNs and emails are skipped. Shelf/table view, filtered CSV and print are available. Publication years refer to original works; ISBNs identify editions. The service-account key is intentionally not included. Rotate the previously shared key before use.
