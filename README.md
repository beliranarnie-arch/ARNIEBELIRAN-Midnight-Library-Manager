# Midnight Library – Library Book Management System

## Project Description

Midnight Library is a web-based Library Book Management System
developed using Python Flask and Firebase Cloud Firestore.

The system provides a centralized platform for managing books,
library members, borrowing transactions, book returns, and
library inventory.

It features a modern Midnight-themed dashboard that simplifies
library operations and improves record management.

## Website URL

Open the Midnight Library website using the following link:

[Library Book Manager Website](http://127.0.0.1:5001/)

Note: The Flask application must be running before accessing
the local website.

## System Features

- Interactive Library Dashboard
- Book Management
- Member Management
- Borrowing Management
- Book Return Management
- Library Reports
- Book Availability Monitoring
- Automatic Available Copies Calculation
- Search and Filter Records
- Create, Read, Update, and Delete Operations
- Input Validation
- Confirmation Dialogs
- Responsive Midnight-themed Interface
- Firebase Cloud Firestore Integration

## Technologies Used

| Technology | Purpose |
|------------|---------|
| Python | Backend Programming |
| Flask | Web Application Framework |
| HTML5 | Website Structure |
| CSS3 | Website Design |
| JavaScript | Interactive Functionality |
| Firebase Cloud Firestore | Cloud Database |
| PyCharm | Development Environment |
| GitHub | Source Code Repository |

## Database Collections

The system uses three connected Firebase Firestore collections.

### 1. Books

| Field | Description |
|-------|-------------|
| title | Book title |
| author | Book author |
| genre | Book genre |
| isbn | International Standard Book Number |
| publisher | Book publisher |
| year_published | Publication year |
| quantity | Total number of copies |
| available_copies | Available book copies |

### 2. Members

| Field | Description |
|-------|-------------|
| full_name | Member's full name |
| email | Email address |
| phone | Contact number |
| address | Residential address |
| membership_type | Student, Faculty, or Staff |
| status | Membership status |

### 3. Borrowings

| Field | Description |
|-------|-------------|
| book_id | Reference to the borrowed book |
| member_id | Reference to the library member |
| borrow_date | Borrowing date |
| due_date | Expected return date |
| return_date | Actual return date |
| status | Borrowed or Returned |

## Database Relationships

- One book can have multiple borrowing records.
- One member can borrow multiple books.
- Each borrowing record references an existing book and member.
- Borrowing a book decreases its available copies.
- Returning a book increases its available copies.
- Only active members can borrow available books.

## CRUD Operations

| Operation | Functionality |
|-----------|---------------|
| Create | Add books, members, and borrowing records |
| Read | View and search existing records |
| Update | Modify records and process book returns |
| Delete | Remove eligible records |

## Project Folder Structure

```text
LibraryBookManager/
│
├── app.py
├── firebase_config.py
├── requirements.txt
├── .env
├── .env.example
├── .gitignore
├── README.md
│
├── templates/
│   └── index.html
│
└── static/
    ├── css/
    │   └── style.css
    └── js/
        └── app.js
```

## Installation and Setup

### Step 1: Download the Project

Clone or download the GitHub repository and open the
LibraryBookManager project folder in PyCharm.

### Step 2: Install Dependencies

Open the PyCharm terminal and execute:

```powershell
py -m pip install -r requirements.txt
```

### Step 3: Configure Firebase

1. Visit https://console.firebase.google.com/
2. Create or select a Firebase project.
3. Enable Cloud Firestore.
4. Open Project Settings.
5. Select Service Accounts.
6. Generate a new private key.
7. Rename the downloaded file to ServiceAccountKey.json.
8. Place the JSON file inside the project folder.

### Step 4: Configure Environment Variables

Create a `.env` file inside the project folder.

```env
GOOGLE_APPLICATION_CREDENTIALS=ServiceAccountKey.json
FLASK_DEBUG=false
PORT=5001
```

Ensure that the credential filename matches the actual
Firebase service account JSON file.

### Step 5: Run the Application

Execute the following command:

```powershell
py app.py
```

The application will run at:

http://127.0.0.1:5001/

## Dashboard Summary

The dashboard displays the following library information:

- Total Books
- Registered Members
- Total Borrowings
- Available Book Copies
- Active Borrowings
- Returned Books

## Data Validation and Security

- Required field validation
- Email address validation
- Book quantity validation
- Publication year validation
- Borrowing and return date validation
- Book availability verification
- Active membership verification
- Firebase credential protection
- Environment variable configuration

## System Limitations

- Requires an internet connection to access Cloud Firestore.
- Requires valid Firebase credentials.
- The application runs using a local Flask server.
- The local website URL is not publicly accessible.

## GitHub Security Notice

Do not upload the following files to GitHub:

- ServiceAccountKey.json
- .env
- .venv/
- __pycache__/

Firebase service account credentials must remain private.

Use `.env.example` to provide sample environment variables
without exposing sensitive information.

## Academic Purpose

This project was developed as a Final Practical Activity
for the Advanced Database subject.

It demonstrates cloud database integration, CRUD operations,
database relationships, data validation, library management,
and web application development using Python Flask and
Firebase Cloud Firestore.

## Project Status

Developed for local execution and academic demonstration.

---

# Midnight Library

**Organize Books. Empower Readers. Simplify Management.**

Powered by Python Flask and Firebase Cloud Firestore.
