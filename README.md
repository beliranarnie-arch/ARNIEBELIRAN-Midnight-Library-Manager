# 📚 Midnight Library Manager

**A Web-Based Library Book Management System**

Advance Database | Final Practical Activity | 2026

## 📖 Project Description

Midnight Library Manager is a web-based library management system developed using Python Flask and Firebase Cloud Firestore. It provides a centralized platform for managing books, library members, borrowing transactions, book returns, and reports.

The system features a modern midnight-themed dashboard with interactive navigation, search and filtering functionality, data validation, and CRUD operations connected to a cloud-based NoSQL database.

**Organize. Borrow. Discover.**

## 🌐 Application URL

- Local Website: http://127.0.0.1:5000/
- Firebase Connection Test: http://127.0.0.1:5000/test-firestore

Note: The application runs locally and requires the Flask server to be running.

## 🎯 Project Objectives

- Develop a functional cloud-based library management system.
- Implement complete CRUD operations using Firebase Cloud Firestore.
- Establish relationships between books, members, and borrowing records.
- Automate book availability and return transactions.
- Provide an organized, responsive, and user-friendly interface.
- Demonstrate the practical application of NoSQL database management.

## ✨ System Features

### Dashboard
- Total book titles
- Total book copies
- Available book copies
- Registered members
- Active borrowings
- Returned books
- Library statistics

### Book Management
- Add new books
- View book details
- Update book information
- Delete eligible book records
- Search and filter books
- Shelf and table views
- Automatic availability tracking

### Member Management
- Register new members
- View member profiles
- Update member information
- Delete eligible member records
- Search and filter members

### Borrowing Management
- Create borrowing transactions
- Select books and registered members
- Manage borrowing and due dates
- Update active borrowing records
- Delete borrowing transactions
- Automatically deduct available book copies

### Return Management
- Process book returns
- Record return dates
- Update borrowing status
- Automatically restore available book copies
- Prevent duplicate returns

### Reports
- Library transaction summaries
- Search and filtering
- CSV export
- Printable reports

## 💻 Technologies Used

| Technology | Description |
|---|---|
| Python | Backend programming language |
| Flask | Web application framework |
| Firebase Cloud Firestore | Cloud-based NoSQL database |
| Firebase Admin SDK | Firebase database integration |
| HTML5 | Website structure |
| CSS3 | User interface design |
| JavaScript | Interactive functionality |
| PyCharm | Development environment |
| GitHub | Source code management |

## 🗄️ Database Collections

The system uses three interconnected Firebase Cloud Firestore collections.

### 1. Books

| Field | Data Type |
|---|---|
| book_id | String |
| title | String |
| author | String |
| genre | String |
| isbn | String |
| publisher | String |
| year_published | Integer / Null |
| quantity | Integer |
| available_copies | Integer |
| created_at | Timestamp |
| updated_at | Timestamp |

### 2. Members

| Field | Data Type |
|---|---|
| member_id | String |
| full_name | String |
| email | String |
| phone | String |
| address | String |
| membership_type | String |
| registration_date | String |
| status | String |
| created_at | Timestamp |

### 3. Borrowings

| Field | Data Type |
|---|---|
| borrowing_id | String |
| book_id | String |
| member_id | String |
| book_title | String |
| member_name | String |
| borrow_date | String |
| due_date | String |
| return_date | String |
| status | String |
| created_at | Timestamp |

## 🔗 Database Relationships

- Books to Borrowings: One-to-Many
- Members to Borrowings: One-to-Many
- Each borrowing record references a book and a registered member.
- Book availability is updated automatically during borrowing and return transactions.

## 📂 Project Structure

```text
LibraryBookManager/
│
├── app.py
├── firebase_config.py
├── load_data.py
├── requirements.txt
├── README.md
├── .env.example
├── .gitignore
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

## ⚙️ System Requirements

- Python 3.10 or newer
- PyCharm or another Python IDE
- Firebase account
- Firebase Cloud Firestore database
- Internet connection
- Modern web browser

## 🚀 Installation and Setup

### Step 1: Download the Project

Clone or download this GitHub repository and open the project folder in PyCharm.

### Step 2: Create a Virtual Environment

```powershell
py -m venv .venv
```

### Step 3: Install Required Dependencies

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### Step 4: Configure Firebase

1. Visit https://console.firebase.google.com/.
2. Create or select a Firebase project.
3. Enable Cloud Firestore.
4. Navigate to Project Settings.
5. Select Service Accounts.
6. Generate a new private key.
7. Save the downloaded file as `ServiceAccountKey.json` inside the project folder.

### Step 5: Configure Environment Variables

Create a `.env` file using `.env.example` as a reference.

```env
GOOGLE_APPLICATION_CREDENTIALS=ServiceAccountKey.json
FLASK_DEBUG=false
PORT=5000
```

### Step 6: Load Sample Data

Run the following command:

```powershell
.\.venv\Scripts\python.exe load_data.py
```

The sample data loader automatically inserts sample books, fictional members, and borrowing transactions into Firebase Cloud Firestore without overwriting existing records.

### Step 7: Run the Application

```powershell
.\.venv\Scripts\python.exe app.py
```

### Step 8: Open the Website

Visit:

http://127.0.0.1:5000/

### Step 9: Verify Firebase Connection

Visit:

http://127.0.0.1:5000/test-firestore

A successful response confirms that the application can communicate with Firebase Cloud Firestore.

## 🔌 API Endpoints

| Method | Endpoint | Function |
|---|---|---|
| GET | /test-firestore | Test Firestore connection |
| GET | /api/summary | Retrieve dashboard statistics |
| GET | /api/books | Retrieve books |
| POST | /api/books | Add a book |
| GET | /api/members | Retrieve members |
| POST | /api/members | Register a member |
| GET | /api/borrowings | Retrieve borrowing records |
| POST | /api/borrowings | Create a borrowing transaction |
| GET | /api/resource/id | Retrieve a specific record |
| PUT | /api/resource/id | Update a record |
| DELETE | /api/resource/id | Delete an eligible record |
| POST | /api/returns/id | Process a book return |
| POST | /api/seed | Load sample data |

Replace `resource` with the corresponding collection name and `id` with the document ID.

## ✅ Functional Requirements

| Requirement | Implementation |
|---|---|
| Cloud-Based NoSQL Database | Firebase Cloud Firestore |
| Three Database Collections | Books, Members, Borrowings |
| Main Collection with at Least Five Fields | Books Collection |
| Create | Add new records |
| Read | Retrieve and display records |
| Update | Modify existing records |
| Delete | Remove eligible records |
| Search | Search database records |
| Filter | Filter records by supported fields |
| Single Record View | Retrieve individual records |
| Data Validation | Server-side validation |
| Database Relationships | Book and member references |
| Sample Data | Automatic sample data loader |
| User Interface | Midnight-themed dashboard |
| Documentation | README.md |
| Version Control | GitHub |

## 🛡️ Data Validation and Security

The system includes the following validation and database safeguards:

- Required field validation
- Email format validation
- Duplicate ISBN checks
- Duplicate member email checks
- Book quantity validation
- Publication year validation
- Borrowing and due date validation
- Book availability verification
- Active borrowing deletion restrictions
- Duplicate return prevention
- Firestore transactions for inventory consistency

Private Firebase credentials and environment configuration files must not be committed to the repository.

## 📌 System Scope and Limitations

Midnight Library Manager is developed for academic purposes and local demonstration. The application requires an active Firebase project and internet connectivity to perform database operations.

Additional authentication, authorization, security controls, and deployment configurations are required before using the system in a public production environment.

## 🏫 Academic Information

| Information | Details |
|---|---|
| Project Title | Midnight Library Manager |
| Subject | Advance Database |
| Activity | Final Practical Activity |
| Project Category | Library Book Management System |
| Database | Firebase Cloud Firestore |
| Backend | Python Flask |
| Development Environment | PyCharm |
| Academic Year | 2026–2027 |

## 📝 Conclusion

Midnight Library Manager demonstrates the practical implementation of a cloud-based NoSQL database through a functional web application. By integrating Python Flask with Firebase Cloud Firestore, the system provides an organized solution for managing library resources, member information, borrowing transactions, and book returns.

The project applies essential database concepts, including CRUD operations, data validation, collection relationships, search, filtering, and transactional data management.

---

### 📚 Midnight Library Manager

**Organize. Borrow. Discover.**

Developed for the Advance Database Final Practical Activity.

© 2026 Midnight Library Manager.
