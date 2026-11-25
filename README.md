# 🌙 Midnight Library – Library Book Management System

## Project Description

Midnight Library is a web-based Library Book Management System developed using Python Flask and Firebase Cloud Firestore.

The system provides a centralized platform for managing books, library members, borrowing transactions, book returns, and library inventory.

It features a modern Midnight-themed dashboard that simplifies library operations, improves record management, and provides an interactive and user-friendly experience.

## 🌐 Live Website

**Vercel Deployment:**

https://the-willow-silk.vercel.app/

**Local Website:**

http://127.0.0.1:5001/

Note: The Flask application must be running before accessing the local website. The Vercel deployment is intended for online access.

## Project Objectives

- Provide centralized management of library records.
- Simplify book borrowing and returning transactions.
- Automatically monitor available book copies.
- Maintain organized library member information.
- Implement CRUD operations using Firebase Cloud Firestore.
- Improve record accuracy through data validation.
- Provide an interactive and responsive library management interface.

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
|---|---|
| Python | Backend Programming |
| Flask | Web Application Framework |
| HTML5 | Website Structure |
| CSS3 | Website Design |
| JavaScript | Interactive Functionality |
| Firebase Cloud Firestore | Cloud Database |
| Firebase Admin SDK | Database Integration |
| Python-dotenv | Environment Configuration |
| PyCharm | Development Environment |
| GitHub | Source Code Repository |
| Vercel | Online Website Deployment |

## Database Collections

The system uses three interconnected Firebase Cloud Firestore collections.

### 1. Books Collection (`books`)

| Field | Description |
|---|---|
| title | Book title |
| author | Book author |
| genre | Book genre |
| isbn | International Standard Book Number |
| publisher | Book publisher |
| year_published | Publication year |
| quantity | Total number of copies |
| available_copies | Available book copies |

### 2. Members Collection (`members`)

| Field | Description |
|---|---|
| full_name | Member's full name |
| email | Email address |
| phone | Contact number |
| address | Residential address |
| membership_type | Student, Faculty, or Staff |
| status | Membership status |

### 3. Borrowings Collection (`borrowings`)

| Field | Description |
|---|---|
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
- Related records are protected against invalid deletion.

## CRUD Operations

| Operation | Functionality |
|---|---|
| Create | Add books, members, and borrowing records |
| Read | View, search, and filter existing records |
| Update | Modify records and process book returns |
| Delete | Remove eligible records |

## Dashboard Summary

The dashboard displays the following library information:

- Total Books
- Registered Members
- Total Borrowings
- Available Book Copies
- Active Borrowings
- Returned Books

## Project Folder Structure

    LibraryBookManager/
    │
    ├── app.py
    ├── firebase_config.py
    ├── requirements.txt
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

The `.env` and `ServiceAccountKey.json` files are required for the described local configuration but are excluded from the public GitHub repository for security purposes.

## Installation and Setup

### Step 1: Download the Project

Clone or download the GitHub repository and open the LibraryBookManager project folder in PyCharm.

### Step 2: Install Dependencies

Open the PyCharm terminal and execute:

    py -m pip install -r requirements.txt

### Step 3: Configure Firebase

1. Visit https://console.firebase.google.com/
2. Create or select a Firebase project.
3. Enable Cloud Firestore.
4. Open Project Settings.
5. Select Service Accounts.
6. Generate a new private key.
7. Rename the downloaded file to `ServiceAccountKey.json`.
8. Place the JSON file inside the local project folder.

### Step 4: Configure Environment Variables

Create a `.env` file inside the local project folder.

    GOOGLE_APPLICATION_CREDENTIALS=ServiceAccountKey.json
    FLASK_DEBUG=false
    PORT=5001

Ensure that the credential filename matches the actual Firebase service account JSON file.

### Step 5: Run the Application

Execute the following command:

    py app.py

Open the application in your browser:

http://127.0.0.1:5001/

## Online Deployment

Midnight Library has a Vercel deployment URL for online access.

**Website:** https://the-willow-silk.vercel.app/

Firebase credentials must be configured securely through the Vercel environment variables using a method supported by the application's Firebase configuration.

The Firebase service account private key must never be uploaded to a public GitHub repository.

## Data Validation and Security

- Required field validation
- Email address validation
- Book quantity validation
- Publication year validation
- Borrowing and return date validation
- Book availability verification
- Active membership verification
- Database relationship validation
- Firebase credential protection
- Environment variable configuration

## System Limitations

- Requires an internet connection to access Cloud Firestore.
- Requires valid Firebase credentials.
- Local execution requires Python and the necessary dependencies.
- Online database operations depend on correct Vercel and Firebase configuration.
- Authentication and role-based authorization are required before using the system with real library member information in a public production environment.

## GitHub Security Notice

Do not upload the following files and folders to GitHub:

- `.env`
- `ServiceAccountKey.json`
- `.venv/`
- `__pycache__/`

Firebase service account credentials must remain private.

Use `.env.example` to provide sample environment variables without exposing sensitive information.

## Academic Purpose

This project was developed as a Final Practical Activity for the Advanced Database subject.

It demonstrates the practical implementation of:

- Cloud Database Integration
- Create, Read, Update, and Delete Operations
- Database Collection Relationships
- Data Validation
- Inventory Management
- Web Application Development
- Version Control using GitHub
- Online Deployment using Vercel

## Project Status

- Application Development: Completed
- Database Platform: Firebase Cloud Firestore
- Source Code Repository: GitHub
- Deployment Platform: Vercel
- Project Purpose: Academic Demonstration

---

# 🌙 Midnight Library

**Organize Books. Empower Readers. Simplify Management.**

Powered by Python Flask, Firebase Cloud Firestore, and Vercel.
