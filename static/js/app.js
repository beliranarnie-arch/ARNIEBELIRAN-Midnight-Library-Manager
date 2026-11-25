
"use strict";

/* =====================================================
   THE WILLOW LIBRARY
   FINALIZED FRONTEND JAVASCRIPT
   Flask + Firebase Firestore
===================================================== */

const API = "/api";

const $ = id => document.getElementById(id);

let books = [];
let members = [];
let borrowings = [];
let summary = {};

let currentPage = "dashboard";
let currentResource = "";
let editingId = null;

let bookView = localStorage.getItem("willowView") === "table"
    ? "table"
    : "shelf";

let reportData = [];
let reportColumns = [];

let confirmationResolver = null;

let busy = false;
let dataReady = false;
let previousFocus = null;

/* =====================================================
   GENERAL HELPERS
===================================================== */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function today() {
    const date = new Date();

    return new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
    ).toISOString().slice(0, 10);
}

function futureDate(days) {
    const date = new Date();

    date.setDate(date.getDate() + days);

    return new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
    ).toISOString().slice(0, 10);
}

function formatDate(value) {
    if (!value) return "—";

    const text = String(value);

    const date = /^\d{4}-\d{2}-\d{2}$/.test(text)
        ? new Date(text + "T00:00:00")
        : new Date(text);

    if (Number.isNaN(date.getTime())) return text;

    return date.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function matches(record, search, fields) {
    const term = String(search || "").trim().toLowerCase();

    return !term || fields.some(field =>
        String(record[field] ?? "")
            .toLowerCase()
            .includes(term)
    );
}

function isOverdue(record) {
    return record.status === "Borrowed" &&
        Boolean(record.due_date) &&
        record.due_date < today();
}

function displayStatus(record) {
    return isOverdue(record)
        ? "Overdue"
        : record.status || "Unknown";
}

function badge(status) {
    const allowed = [
        "Active", "Inactive", "Available",
        "Unavailable", "Borrowed", "Returned", "Overdue"
    ];

    const css = allowed.includes(status)
        ? status.toLowerCase()
        : "inactive";

    return `
        <span class="status status-${css}">
            ${escapeHTML(status || "Unknown")}
        </span>
    `;
}

/* =====================================================
   API CONNECTION
===================================================== */

async function requestAPI(path, options = {}) {

    const response = await fetch(path, {
        ...options,

        headers: {
            "Accept": "application/json",

            ...(options.body
                ? {"Content-Type": "application/json"}
                : {}),

            ...(options.headers || {})
        },

        cache: "no-store"
    });

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error(
            "Invalid server response. Check your Flask terminal."
        );
    }

    if (!response.ok || result.success !== true) {
        throw new Error(
            result.message || "Database operation failed."
        );
    }

    return result;
}

async function checkFirestore() {

    $("connection").className = "connection";

    $("connectionText").textContent =
        "Connecting to Firestore...";

    try {

        const result = await requestAPI("/test-firestore");

        if (result.data?.connected !== true) {
            throw new Error("Connection not confirmed.");
        }

        $("connection").classList.add("online");

        $("connectionText").textContent =
            "Firestore connected";

        return true;

    } catch (error) {

        $("connection").classList.add("offline");

        $("connectionText").textContent =
            "Firestore unavailable";

        return false;
    }
}

/* =====================================================
   LOADING AND TOASTS
===================================================== */

function showLoading(message = "Loading your library...") {
    $("loadingText").textContent = message;
    $("loadingOverlay").hidden = false;
}

function hideLoading() {
    $("loadingOverlay").hidden = true;
}

function showToast(message, type = "success") {

    const toast = document.createElement("div");

    toast.className = `toast ${type}`;

    const icon = document.createElement("i");

    icon.className = type === "error"
        ? "fa-solid fa-circle-exclamation"
        : "fa-solid fa-circle-check";

    const text = document.createElement("span");

    text.textContent = message;

    toast.append(icon, text);

    $("toastContainer").appendChild(toast);

    setTimeout(() => toast.remove(), 4500);
}

/* =====================================================
   LOAD ACTUAL FIRESTORE RECORDS
===================================================== */

async function loadAllData() {

    const results = await Promise.all([

        requestAPI(`${API}/books`),

        requestAPI(`${API}/members`),

        requestAPI(`${API}/borrowings`),

        requestAPI(`${API}/summary`)

    ]);

    const [bookResult, memberResult, loanResult, statsResult] =
        results;

    if (
        !Array.isArray(bookResult.data) ||
        !Array.isArray(memberResult.data) ||
        !Array.isArray(loanResult.data) ||
        !statsResult.data
    ) {
        throw new Error("Unexpected API response structure.");
    }

    books = bookResult.data;

    members = memberResult.data;

    borrowings = loanResult.data;

    summary = statsResult.data;

    dataReady = true;

    updateGenreFilter();

    renderCurrentPage();
}

async function refreshData(notify = false) {

    if (busy) return;

    busy = true;

    $("refreshButton").disabled = true;

    showLoading("Retrieving your Firestore records...");

    try {

        await checkFirestore();

        await loadAllData();

        if (notify) {
            showToast("Library records refreshed.");
        }

    } catch (error) {

        dataReady = false;

        renderCurrentPage();

        showToast(error.message, "error");

    } finally {

        busy = false;

        $("refreshButton").disabled = false;

        hideLoading();
    }
}

/* =====================================================
   NAVIGATION
===================================================== */

const pageTitles = {
    dashboard: "Library Overview",
    books: "Book Collection",
    members: "Library Members",
    borrowings: "Book Borrowings",
    returns: "Return Desk",
    reports: "Library Reports"
};

function navigate(page) {

    if (!Object.prototype.hasOwnProperty.call(pageTitles, page)) {
        return;
    }

    currentPage = page;

    document.querySelectorAll(".page").forEach(section => {
        section.classList.toggle(
            "active",
            section.id === `page-${page}`
        );
    });

    document.querySelectorAll(".nav-btn").forEach(button => {

        const active = button.dataset.page === page;

        button.classList.toggle("active", active);

        if (active) {
            button.setAttribute("aria-current", "page");
        } else {
            button.removeAttribute("aria-current");
        }
    });

    $("pageTitle").textContent = pageTitles[page];

    closeSidebar();

    renderCurrentPage();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function renderCurrentPage() {

    const renderers = {
        dashboard: renderDashboard,
        books: renderBooks,
        members: renderMembers,
        borrowings: renderBorrowings,
        returns: renderReturns,
        reports: renderReports
    };

    renderers[currentPage]();
}

function closeSidebar() {
    $("sidebar").classList.remove("open");
    $("mobileOverlay").classList.remove("active");
}

/* =====================================================
   DARK / LIGHT MODE
===================================================== */

function initializeTheme() {

    document.body.classList.toggle(
        "dark-mode",
        localStorage.getItem("willowTheme") === "dark"
    );

    updateThemeIcon();
}

function updateThemeIcon() {

    const dark = document.body.classList.contains("dark-mode");

    $("themeButton").innerHTML = dark

        ? '<i class="fa-solid fa-sun"></i>'

        : '<i class="fa-solid fa-moon"></i>';

    $("themeButton").title = dark
        ? "Switch to light mode"
        : "Switch to dark mode";

    $("themeButton").setAttribute(
        "aria-label",
        $("themeButton").title
    );
}

function toggleTheme() {

    document.body.classList.toggle("dark-mode");

    localStorage.setItem(
        "willowTheme",
        document.body.classList.contains("dark-mode")
            ? "dark"
            : "light"
    );

    updateThemeIcon();
}

/* =====================================================
   RIPPLE BUTTON EFFECT
===================================================== */

document.addEventListener("click", event => {

    const button = event.target.closest("button");

    if (!button || button.disabled) return;

    const rect = button.getBoundingClientRect();

    const size = Math.max(rect.width, rect.height) * 2;

    const ripple = document.createElement("span");

    ripple.className = "ripple";

    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;

    const x = event.detail
        ? event.clientX - rect.left
        : rect.width / 2;

    const y = event.detail
        ? event.clientY - rect.top
        : rect.height / 2;

    ripple.style.left = `${x - size / 2}px`;
    ripple.style.top = `${y - size / 2}px`;

    button.appendChild(ripple);

    setTimeout(() => ripple.remove(), 650);
});

/* =====================================================
   ANIMATED EMPTY STATE
===================================================== */

function emptyState(
    title = "Nothing on this shelf yet",
    message = "Your records will appear here."
) {

    if (!dataReady) {
        title = "Library records unavailable";
        message = "Connect to Firestore and refresh your records.";
    }

    return `
        <div class="empty-state">

            <svg viewBox="0 0 180 130" aria-hidden="true">

                <ellipse cx="90" cy="119" rx="70" ry="6"
                         fill="#a4b897" opacity=".2"/>

                <rect x="22" y="20" width="112" height="92"
                      rx="6" fill="#ad8968"/>

                <rect x="30" y="28" width="96" height="76"
                      rx="3" fill="#eee3ca"/>

                <path d="M30 65H126"
                      stroke="#ad8968" stroke-width="6"/>

                <rect x="36" y="75" width="19" height="29"
                      rx="2" fill="#91a982"/>

                <rect x="58" y="81" width="17" height="23"
                      rx="2" fill="#bf947d"/>

                <path d="M151 103Q140 73 153 48"
                      stroke="#77936c" stroke-width="3" fill="none"/>

                <path d="M150 83Q128 76 135 58Q150 63 150 83"
                      fill="#a4b897"/>

                <path d="M151 69Q173 56 165 42Q150 49 151 69"
                      fill="#77936c"/>

                <path d="M137 94H165L160 115H142Z"
                      fill="#bf947d"/>

            </svg>

            <h3>${escapeHTML(title)}</h3>

            <p>${escapeHTML(message)}</p>

        </div>
    `;
}

/* =====================================================
   ANIMATED STATISTICS
===================================================== */

function statCard(label, value, icon, color) {

    return `
        <article class="stat-card">

            <div class="stat-icon ${color}">
                <i class="${icon}"></i>
            </div>

            <strong class="stat-number"
                    data-count="${escapeHTML(dataReady ? value ?? "" : "")}">

                ${dataReady && value != null ? "0" : "—"}

            </strong>

            <span class="stat-label">
                ${escapeHTML(label)}
            </span>

        </article>
    `;
}

function animateStats(container) {

    const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    container.querySelectorAll("[data-count]").forEach(element => {

        if (element.dataset.count === "") return;

        const target = Number(element.dataset.count);

        if (!Number.isFinite(target)) return;

        if (reduced) {
            element.textContent = target.toLocaleString();
            return;
        }

        const start = performance.now();

        function frame(now) {

            if (!element.isConnected) return;

            const progress = Math.min((now - start) / 750, 1);

            const eased = 1 - Math.pow(1 - progress, 3);

            element.textContent = Math.round(
                target * eased
            ).toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(frame);
            }
        }

        requestAnimationFrame(frame);
    });
}

/* =====================================================
   DASHBOARD
===================================================== */

function renderDashboard() {

    $("statsGrid").innerHTML = [

        statCard(
            "Total Book Titles",
            summary.total_books,
            "fa-solid fa-book-open",
            "green"
        ),

        statCard(
            "Registered Members",
            summary.total_members,
            "fa-solid fa-users",
            "blue"
        ),

        statCard(
            "Active Borrowings",
            summary.active_borrowings,
            "fa-solid fa-arrow-right-arrow-left",
            "gold"
        ),

        statCard(
            "Available Copies",
            summary.available_copies,
            "fa-solid fa-book-bookmark",
            "pink"
        )

    ].join("");

    animateStats($("statsGrid"));

    $("dashboardBooks").innerHTML =
        dataReady && books.length

            ? books.slice(0, 3)
                .map(book => bookCard(book, true))
                .join("")

            : emptyState(
                "Your bookshelf awaits",
                "Add your first book to begin your collection."
            );

    $("recentBorrowings").innerHTML =
        dataReady && borrowings.length

            ? borrowings.slice(0, 5).map(record => `

                <div class="activity">

                    <div class="activity-icon">
                        <i class="fa-solid fa-book"></i>
                    </div>

                    <div class="activity-text">

                        <strong>
                            ${escapeHTML(record.book_title)}
                        </strong>

                        <small>
                            ${escapeHTML(record.member_name)}
                            · ${escapeHTML(formatDate(record.borrow_date))}
                        </small>

                    </div>

                    ${badge(displayStatus(record))}

                </div>

            `).join("")

            : emptyState(
                "A quiet reading day",
                "Borrowing activity will appear here."
            );
}

/* =====================================================
   DECORATIVE BOOK COVERS
===================================================== */

const coverColors = [
    "#71896a",
    "#a97879",
    "#9e8655",
    "#68818c",
    "#8a7968",
    "#7f7594",
    "#557b70",
    "#aa8064"
];

function coverColor(book) {

    const key = String(book.id || book.title || "");

    let hash = 0;

    for (const char of key) {
        hash = (hash + char.charCodeAt(0)) % coverColors.length;
    }

    return coverColors[hash];
}

function bookCard(book, compact = false) {

    const available = Number(book.available_copies || 0);

    return `

        <article class="book-card">

            <div class="book-display">

                <div class="book-cover"
                     style="--cover:${coverColor(book)}">

                    <i class="fa-solid fa-leaf"></i>

                    <strong>${escapeHTML(book.title)}</strong>

                    <small>${escapeHTML(book.author)}</small>

                </div>

            </div>

            <div class="book-info">

                <h4>${escapeHTML(book.title)}</h4>

                <p class="book-author">
                    ${escapeHTML(book.author)}
                </p>

                <div class="book-meta">

                    <span class="genre-tag">
                        ${escapeHTML(book.genre || "Uncategorized")}
                    </span>

                    ${badge(
                        available > 0 ? "Available" : "Unavailable"
                    )}

                </div>

                <p class="availability">
                    ${available} of
                    ${Number(book.quantity || 0)}
                    copies available
                </p>

                ${compact

                    ? actionButton("view", "books", book.id, "View")

                    : actionButtons("books", book)
                }

            </div>

        </article>
    `;
}

/* =====================================================
   CRUD BUTTONS
===================================================== */

function actionButton(action, resource, id, label) {

    const icons = {
        view: "fa-eye",
        edit: "fa-pen",
        delete: "fa-trash",
        return: "fa-rotate-left"
    };

    return `
        <button class="btn ${action} small-btn"
                data-action="${action}"
                data-resource="${resource}"
                data-id="${escapeHTML(id)}">

            <i class="fa-solid ${icons[action]}"></i>

            ${escapeHTML(label)}

        </button>
    `;
}

function actionButtons(resource, record) {

    const canEdit = resource !== "borrowings" ||
        record.status === "Borrowed";

    return `
        <div class="actions">

            ${actionButton("view", resource, record.id, "View")}

            ${canEdit
                ? actionButton("edit", resource, record.id, "Edit")
                : ""
            }

            ${actionButton("delete", resource, record.id, "Delete")}

            ${resource === "borrowings" &&
              record.status === "Borrowed"

                ? actionButton("return", resource, record.id, "Return")

                : ""
            }

        </div>
    `;
}

/* =====================================================
   REUSABLE TABLE
===================================================== */

function table(headers, rows) {

    if (!dataReady || !rows.length) {
        return emptyState(
            "No matching records",
            "Try another search or add a new record."
        );
    }

    return `
        <div class="table-wrapper">

            <table>

                <thead>
                    <tr>
                        ${headers.map(header =>
                            `<th>${escapeHTML(header)}</th>`
                        ).join("")}
                    </tr>
                </thead>

                <tbody>

                    ${rows.map(row => `
                        <tr>
                            ${row.map(cell =>
                                `<td>${cell}</td>`
                            ).join("")}
                        </tr>
                    `).join("")}

                </tbody>

            </table>

        </div>
    `;
}

/* =====================================================
   BOOK COLLECTION
===================================================== */

function updateGenreFilter() {

    const select = $("genreFilter");

    const previous = select.value;

    const genres = [...new Set(
        books.map(book => book.genre).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    select.replaceChildren(
        new Option("All Genres", "")
    );

    genres.forEach(genre => {
        select.add(new Option(genre, genre));
    });

    select.value = genres.includes(previous)
        ? previous
        : "";
}

function renderBooks() {

    const search = $("bookSearch").value;

    const genre = $("genreFilter").value;

    const records = dataReady ? books.filter(book =>

        matches(book, search, [
            "book_id",
            "title",
            "author",
            "isbn",
            "genre",
            "publisher"
        ]) &&

        (!genre || book.genre === genre)

    ) : [];

    $("bookCount").textContent = dataReady
        ? `${records.length} of ${books.length} book titles`
        : "Records unavailable";

    $("shelfView").classList.toggle(
        "selected", bookView === "shelf"
    );

    $("tableView").classList.toggle(
        "selected", bookView === "table"
    );

    $("shelfView").setAttribute(
        "aria-pressed", String(bookView === "shelf")
    );

    $("tableView").setAttribute(
        "aria-pressed", String(bookView === "table")
    );

    if (!records.length) {

        $("booksContainer").innerHTML = emptyState(
            "Your shelf is quiet",
            "No books match your search."
        );

        return;
    }

    if (bookView === "shelf") {

        $("booksContainer").innerHTML = `
            <div class="bookshelf">
                ${records.map(book => bookCard(book)).join("")}
            </div>
        `;

        return;
    }

    $("booksContainer").innerHTML = table(

        [
            "Book ID",
            "Title / Author",
            "Genre",
            "ISBN",
            "Publisher",
            "Year",
            "Quantity",
            "Available",
            "Actions"
        ],

        records.map(book => [

            escapeHTML(book.book_id || book.id),

            `<div class="table-title">
                ${escapeHTML(book.title)}
             </div>
             <div class="table-subtitle">
                ${escapeHTML(book.author)}
             </div>`,

            escapeHTML(book.genre),

            escapeHTML(book.isbn),

            escapeHTML(book.publisher || "—"),

            escapeHTML(book.year_published ?? "—"),

            escapeHTML(book.quantity),

            escapeHTML(book.available_copies),

            actionButtons("books", book)

        ])
    );
}

/* =====================================================
   MEMBERS
===================================================== */

function renderMembers() {

    const search = $("memberSearch").value;

    const type = $("membershipFilter").value;

    const records = dataReady ? members.filter(member =>

        matches(member, search, [
            "member_id",
            "full_name",
            "email",
            "phone",
            "address",
            "membership_type"
        ]) &&

        (!type || member.membership_type === type)

    ) : [];

    $("memberCount").textContent = dataReady
        ? `${records.length} of ${members.length} members`
        : "Records unavailable";

    $("membersContainer").innerHTML = table(

        [
            "Member ID",
            "Full Name",
            "Email",
            "Phone",
            "Membership",
            "Registered",
            "Status",
            "Actions"
        ],

        records.map(member => [

            escapeHTML(member.member_id || member.id),

            escapeHTML(member.full_name),

            escapeHTML(member.email),

            escapeHTML(member.phone),

            escapeHTML(member.membership_type),

            escapeHTML(formatDate(member.registration_date)),

            badge(member.status),

            actionButtons("members", member)

        ])
    );
}

/* =====================================================
   BORROWINGS
===================================================== */

function renderBorrowings() {

    const search = $("borrowingSearch").value;

    const status = $("borrowingFilter").value;

    const records = dataReady ? borrowings.filter(record =>

        matches(record, search, [
            "borrowing_id",
            "book_title",
            "member_name",
            "book_id",
            "member_id",
            "status"
        ]) &&

        (
            !status ||
            (
                status === "Overdue"
                    ? isOverdue(record)
                    : record.status === status
            )
        )

    ) : [];

    $("borrowingCount").textContent = dataReady
        ? `${records.length} of ${borrowings.length} borrowings`
        : "Records unavailable";

    $("borrowingsContainer").innerHTML = table(

        [
            "Borrowing ID",
            "Book",
            "Member",
            "Borrow Date",
            "Due Date",
            "Return Date",
            "Status",
            "Actions"
        ],

        records.map(record => [

            escapeHTML(record.borrowing_id || record.id),

            escapeHTML(record.book_title),

            escapeHTML(record.member_name),

            escapeHTML(formatDate(record.borrow_date)),

            escapeHTML(formatDate(record.due_date)),

            escapeHTML(formatDate(record.return_date)),

            badge(displayStatus(record)),

            actionButtons("borrowings", record)

        ])
    );
}

/* =====================================================
   RETURNS
===================================================== */

function renderReturns() {

    const search = $("returnSearch").value;

    const status = $("returnFilter").value;

    const records = dataReady ? borrowings.filter(record =>

        matches(record, search, [
            "borrowing_id",
            "book_title",
            "member_name",
            "status"
        ]) &&

        (!status || record.status === status)

    ) : [];

    $("returnCount").textContent = dataReady
        ? `${records.length} matching records`
        : "Records unavailable";

    $("returnsContainer").innerHTML = table(

        [
            "Borrowing ID",
            "Book",
            "Member",
            "Due Date",
            "Returned On",
            "Status",
            "Actions"
        ],

        records.map(record => [

            escapeHTML(record.borrowing_id || record.id),

            escapeHTML(record.book_title),

            escapeHTML(record.member_name),

            escapeHTML(formatDate(record.due_date)),

            escapeHTML(formatDate(record.return_date)),

            badge(displayStatus(record)),

            `<div class="actions">

                ${actionButton(
                    "view", "borrowings", record.id, "View"
                )}

                ${record.status === "Borrowed"

                    ? actionButton(
                        "return", "borrowings", record.id, "Return Book"
                    )

                    : '<span class="table-subtitle">Completed</span>'
                }

            </div>`

        ])
    );
}

/* =====================================================
   MODALS
===================================================== */

function openModal(id) {

    previousFocus = document.activeElement;

    $(id).hidden = false;

    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {

        $(id).querySelector(
            "input:not([readonly]), select, textarea, button"
        )?.focus();

    });
}

function closeModal(id) {

    $(id).hidden = true;

    document.body.style.overflow = "";

    if (previousFocus?.isConnected) {
        previousFocus.focus();
    }
}

document.addEventListener("keydown", event => {

    const modal = document.querySelector(
        ".modal-backdrop:not([hidden])"
    );

    if (!modal) return;

    if (event.key === "Escape" && !busy) {

        if (modal.id === "confirmModal") {
            resolveConfirmation(false);
        } else {
            closeModal(modal.id);
        }
    }

    if (event.key === "Tab") {

        const elements = [...modal.querySelectorAll(
            "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])"
        )].filter(element => element.getClientRects().length);

        if (!elements.length) return;

        const first = elements[0];

        const last = elements[elements.length - 1];

        if (event.shiftKey && document.activeElement === first) {

            event.preventDefault();

            last.focus();

        } else if (!event.shiftKey &&
                   document.activeElement === last) {

            event.preventDefault();

            first.focus();
        }
    }
});

/* =====================================================
   FORM FIELD GENERATORS
===================================================== */

function inputField(
    name,
    label,
    value = "",
    type = "text",
    required = true,
    extra = "",
    full = false
) {

    return `
        <div class="form-field ${full ? "full" : ""}">

            <label for="field-${name}">

                ${escapeHTML(label)}

                ${required
                    ? '<span class="required">*</span>'
                    : ""
                }

            </label>

            <input id="field-${name}"
                   name="${name}"
                   type="${type}"
                   value="${escapeHTML(value)}"
                   ${required ? "required" : ""}
                   ${extra}>

        </div>
    `;
}

function selectField(name, label, options, selected = "") {

    return `
        <div class="form-field">

            <label for="field-${name}">
                ${escapeHTML(label)}
                <span class="required">*</span>
            </label>

            <select id="field-${name}" name="${name}" required>

                <option value="">Select ${escapeHTML(label)}</option>

                ${options.map(option => {

                    const item = typeof option === "string"

                        ? {value: option, label: option}

                        : option;

                    return `
                        <option value="${escapeHTML(item.value)}"
                            ${String(item.value) === String(selected)
                                ? "selected"
                                : ""
                            }>

                            ${escapeHTML(item.label)}

                        </option>
                    `;

                }).join("")}

            </select>

        </div>
    `;
}

function textareaField(name, label, value = "") {

    return `
        <div class="form-field full">

            <label for="field-${name}">
                ${escapeHTML(label)}
            </label>

            <textarea id="field-${name}"
                      name="${name}">${escapeHTML(value)}</textarea>

        </div>
    `;
}

/* =====================================================
   ADD AND EDIT FORMS
===================================================== */

async function openRecordForm(resource, id = null) {

    if (busy || !dataReady) return;

    busy = true;

    currentResource = resource;

    editingId = id;

    $("recordForm").reset();

    $("formError").hidden = true;

    let record = {};

    try {

        if (id) {

            showLoading("Opening record...");

            const result = await requestAPI(
                `${API}/${resource}/${encodeURIComponent(id)}`
            );

            record = result.data;
        }

        let fields = "";

        if (resource === "books") {

            $("modalTitle").textContent = id
                ? "Edit Book"
                : "Add New Book";

            fields = [

                inputField(
                    "title", "Book Title", record.title,
                    "text", true, "", true
                ),

                inputField(
                    "author", "Author", record.author
                ),

                inputField(
                    "genre", "Genre", record.genre
                ),

                inputField(
                    "isbn", "ISBN", record.isbn,
                    "text", true, 'maxlength="32"'
                ),

                inputField(
                    "publisher", "Publisher", record.publisher,
                    "text", false
                ),

                inputField(
                    "year_published",
                    "Publication Year",
                    record.year_published ?? "",
                    "number",
                    false,
                    `min="1000" max="${new Date().getFullYear() + 1}" step="1"`
                ),

                inputField(
                    "quantity",
                    "Total Quantity",
                    record.quantity ?? 1,
                    "number",
                    true,
                    'min="0" step="1"'
                )

            ].join("");
        }

        if (resource === "members") {

            $("modalTitle").textContent = id
                ? "Edit Member"
                : "Register Member";

            fields = [

                inputField(
                    "full_name", "Full Name", record.full_name,
                    "text", true, "", true
                ),

                inputField(
                    "email", "Email Address", record.email, "email"
                ),

                inputField(
                    "phone", "Phone Number", record.phone, "tel"
                ),

                selectField(
                    "membership_type",
                    "Membership Type",
                    ["Student", "Faculty", "Staff", "Other"],
                    record.membership_type || "Student"
                ),

                textareaField(
                    "address", "Address", record.address
                )

            ].join("");
        }

        if (resource === "borrowings") {

            $("modalTitle").textContent = id
                ? "Edit Borrowing Dates"
                : "Borrow a Book";

            if (id && record.status !== "Borrowed") {
                throw new Error(
                    "Only active borrowings can be edited."
                );
            }

            if (!id) {

                const availableBooks = books.filter(book =>
                    Number(book.available_copies) > 0
                );

                const activeMembers = members.filter(member =>
                    member.status === "Active"
                );

                if (!availableBooks.length) {
                    throw new Error("No available books to borrow.");
                }

                if (!activeMembers.length) {
                    throw new Error("Register an active member first.");
                }

                fields += selectField(

                    "book_id",

                    "Book",

                    availableBooks.map(book => ({
                        value: book.id,
                        label: `${book.title} (${book.available_copies} available)`
                    }))

                );

                fields += selectField(

                    "member_id",

                    "Member",

                    activeMembers.map(member => ({
                        value: member.id,
                        label: `${member.full_name} — ${member.member_id || member.id}`
                    }))

                );

            } else {

                fields += inputField(
                    "book_display",
                    "Book",
                    record.book_title,
                    "text",
                    false,
                    "readonly"
                );

                fields += inputField(
                    "member_display",
                    "Member",
                    record.member_name,
                    "text",
                    false,
                    "readonly"
                );
            }

            fields += inputField(
                "borrow_date",
                "Borrow Date",
                record.borrow_date || today(),
                "date"
            );

            fields += inputField(
                "due_date",
                "Due Date",
                record.due_date || futureDate(7),
                "date"
            );
        }

        $("formFields").innerHTML = fields;

        $("saveButton").innerHTML = `
            <i class="fa-solid fa-check"></i>
            ${id ? "Save Changes" : "Save Record"}
        `;

        openModal("recordModal");

    } catch (error) {

        showToast(error.message, "error");

    } finally {

        busy = false;

        hideLoading();
    }
}

/* =====================================================
   FORM VALIDATION
===================================================== */

function validatePayload(resource, data) {

    function requireFields(fields) {

        fields.forEach(field => {

            if (!String(data[field] ?? "").trim()) {

                throw new Error(
                    `${field.replaceAll("_", " ")} is required.`
                );
            }
        });
    }

    if (resource === "books") {

        requireFields([
            "title", "author", "genre", "isbn", "quantity"
        ]);

        const quantity = Number(data.quantity);

        if (!Number.isInteger(quantity) || quantity < 0) {
            throw new Error(
                "Quantity must be a non-negative whole number."
            );
        }

        data.quantity = quantity;

        if (data.isbn.length > 32) {
            throw new Error("ISBN must not exceed 32 characters.");
        }

        if (data.year_published !== "") {

            const year = Number(data.year_published);

            if (
                !Number.isInteger(year) ||
                year < 1000 ||
                year > new Date().getFullYear() + 1
            ) {
                throw new Error("Enter a valid publication year.");
            }

            data.year_published = year;
        }
    }

    if (resource === "members") {

        requireFields([
            "full_name",
            "email",
            "phone",
            "membership_type"
        ]);

        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
            throw new Error("Enter a valid email address.");
        }

        if (!["Student", "Faculty", "Staff", "Other"]
            .includes(data.membership_type)) {

            throw new Error("Invalid membership type.");
        }
    }

    if (resource === "borrowings") {

        requireFields(["borrow_date", "due_date"]);

        if (!editingId) {
            requireFields(["book_id", "member_id"]);
        }

        if (data.due_date < data.borrow_date) {
            throw new Error(
                "Due date cannot be earlier than borrow date."
            );
        }

        delete data.book_display;

        delete data.member_display;
    }

    return data;
}

/* =====================================================
   SAVE RECORDS
===================================================== */

$("recordForm").addEventListener("submit", async event => {

    event.preventDefault();

    if (busy) return;

    const form = event.currentTarget;

    if (!form.reportValidity()) return;

    $("formError").hidden = true;

    const data = Object.fromEntries(new FormData(form));

    Object.keys(data).forEach(key => {

        if (typeof data[key] === "string") {
            data[key] = data[key].trim();
        }
    });

    try {

        validatePayload(currentResource, data);

    } catch (error) {

        $("formError").textContent = error.message;

        $("formError").hidden = false;

        return;
    }

    busy = true;

    $("saveButton").disabled = true;

    $("saveButton").innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Saving...
    `;

    const path = editingId

        ? `${API}/${currentResource}/${encodeURIComponent(editingId)}`

        : `${API}/${currentResource}`;

    try {

        const result = await requestAPI(path, {

            method: editingId ? "PUT" : "POST",

            body: JSON.stringify(data)

        });

        closeModal("recordModal");

        showToast(result.message || "Record saved successfully.");

        try {

            await loadAllData();

        } catch (error) {

            dataReady = false;

            renderCurrentPage();

            showToast(
                "Record saved, but refresh failed. Please refresh.",
                "error"
            );
        }

    } catch (error) {

        $("formError").textContent = error.message;

        $("formError").hidden = false;

    } finally {

        busy = false;

        $("saveButton").disabled = false;

        $("saveButton").innerHTML = `
            <i class="fa-solid fa-check"></i>
            ${editingId ? "Save Changes" : "Save Record"}
        `;
    }
});

/* =====================================================
   VIEW DETAILS
===================================================== */

const detailFields = {

    books: [

        ["book_id", "Book ID"],
        ["title", "Book Title"],
        ["author", "Author"],
        ["genre", "Genre"],
        ["isbn", "ISBN"],
        ["publisher", "Publisher"],
        ["year_published", "Publication Year"],
        ["quantity", "Total Quantity"],
        ["available_copies", "Available Copies"],
        ["created_at", "Created"],
        ["updated_at", "Last Updated"]

    ],

    members: [

        ["member_id", "Member ID"],
        ["full_name", "Full Name"],
        ["email", "Email"],
        ["phone", "Phone"],
        ["address", "Address"],
        ["membership_type", "Membership Type"],
        ["registration_date", "Registration Date"],
        ["status", "Status"],
        ["created_at", "Created"],
        ["updated_at", "Last Updated"]

    ],

    borrowings: [

        ["borrowing_id", "Borrowing ID"],
        ["book_id", "Book Reference"],
        ["book_title", "Book Title"],
        ["member_id", "Member Reference"],
        ["member_name", "Member Name"],
        ["borrow_date", "Borrow Date"],
        ["due_date", "Due Date"],
        ["return_date", "Return Date"],
        ["status", "Status"],
        ["created_at", "Created"],
        ["updated_at", "Last Updated"]

    ]
};

async function viewRecord(resource, id) {

    if (busy) return;

    busy = true;

    showLoading("Opening record details...");

    try {

        const result = await requestAPI(
            `${API}/${resource}/${encodeURIComponent(id)}`
        );

        const record = result.data;

        $("detailTitle").textContent = {

            books: "Book Details",

            members: "Member Details",

            borrowings: "Borrowing Details"

        }[resource];

        $("detailContent").innerHTML = `

            <div class="detail-grid">

                ${detailFields[resource].map(([field, label]) => {

                    let value = record[field];

                    if (
                        field.endsWith("_date") ||
                        field.endsWith("_at")
                    ) {
                        value = formatDate(value);
                    }

                    if (field === "status") {
                        value = displayStatus(record);
                    }

                    return `
                        <div class="detail-item">

                            <small>${escapeHTML(label)}</small>

                            <strong>
                                ${escapeHTML(value ?? "—")}
                            </strong>

                        </div>
                    `;

                }).join("")}

            </div>
        `;

        openModal("detailModal");

    } catch (error) {

        showToast(error.message, "error");

    } finally {

        busy = false;

        hideLoading();
    }
}

/* =====================================================
   CONFIRMATION DIALOG
===================================================== */

function confirmAction(title, message, label, type = "delete") {

    if (confirmationResolver) {
        resolveConfirmation(false);
    }

    $("confirmTitle").textContent = title;

    $("confirmMessage").textContent = message;

    $("confirmButton").textContent = label;

    $("confirmButton").className = `btn ${type}`;

    $("confirmIcon").className = type === "return"

        ? "confirm-icon green-icon"

        : "confirm-icon";

    $("confirmIcon").innerHTML = type === "return"

        ? '<i class="fa-solid fa-book-bookmark"></i>'

        : '<i class="fa-solid fa-trash"></i>';

    openModal("confirmModal");

    return new Promise(resolve => {
        confirmationResolver = resolve;
    });
}

function resolveConfirmation(value) {

    closeModal("confirmModal");

    const resolver = confirmationResolver;

    confirmationResolver = null;

    resolver?.(value);
}

$("cancelConfirm").addEventListener("click", () => {
    resolveConfirmation(false);
});

$("confirmButton").addEventListener("click", () => {
    resolveConfirmation(true);
});

/* =====================================================
   DELETE RECORDS
===================================================== */

async function deleteRecord(resource, id) {

    if (busy || !dataReady) return;

    const collection = {books, members, borrowings}[resource];

    const record = collection.find(item => item.id === id);

    if (!record) {
        showToast("Record not found. Refresh your records.", "error");
        return;
    }

    const name = record.title ||
        record.full_name ||
        record.book_title ||
        id;

    const message = resource === "borrowings" &&
        record.status === "Borrowed"

        ? `Delete the borrowing for "${name}"? Its available copy will be restored if the linked book exists.`

        : `Permanently delete "${name}"? This action cannot be undone.`;

    const confirmed = await confirmAction(

        "Delete this record?",

        message,

        "Yes, Delete"

    );

    if (!confirmed || busy) return;

    busy = true;

    showLoading("Deleting record...");

    try {

        const result = await requestAPI(

            `${API}/${resource}/${encodeURIComponent(id)}`,

            {method: "DELETE"}

        );

        showToast(result.message || "Record deleted successfully.");

        try {

            await loadAllData();

        } catch {

            dataReady = false;

            renderCurrentPage();

            showToast("Record deleted. Please refresh the records.", "error");
        }

    } catch (error) {

        showToast(error.message, "error");

    } finally {

        busy = false;

        hideLoading();
    }
}

/* =====================================================
   RETURN BOOK
===================================================== */

async function returnBook(id) {

    if (busy || !dataReady) return;

    const record = borrowings.find(item => item.id === id);

    if (!record || record.status !== "Borrowed") {

        showToast("This borrowing is no longer active.", "error");

        return;
    }

    const confirmed = await confirmAction(

        "Welcome this book home",

        `Return "${record.book_title}" borrowed by ${record.member_name}? Its available copy will be restored.`,

        "Confirm Return",

        "return"

    );

    if (!confirmed || busy) return;

    busy = true;

    showLoading("Processing book return...");

    try {

        const result = await requestAPI(

            `${API}/returns/${encodeURIComponent(id)}`,

            {method: "POST"}

        );

        showToast(result.message || "Book returned successfully.");

        try {

            await loadAllData();

        } catch {

            dataReady = false;

            renderCurrentPage();

            showToast("Return completed. Please refresh the records.", "error");
        }

    } catch (error) {

        showToast(error.message, "error");

    } finally {

        busy = false;

        hideLoading();
    }
}

/* =====================================================
   REPORT DEFINITIONS
===================================================== */

const reportDefinitions = {

    books: {

        dateField: "created_at",

        columns: [

            ["book_id", "Book ID"],
            ["title", "Title"],
            ["author", "Author"],
            ["genre", "Genre"],
            ["isbn", "ISBN"],
            ["publisher", "Publisher"],
            ["year_published", "Year"],
            ["quantity", "Quantity"],
            ["available_copies", "Available Copies"]

        ]
    },

    members: {

        dateField: "registration_date",

        columns: [

            ["member_id", "Member ID"],
            ["full_name", "Full Name"],
            ["email", "Email"],
            ["phone", "Phone"],
            ["address", "Address"],
            ["membership_type", "Membership"],
            ["registration_date", "Registration Date"],
            ["status", "Status"]

        ]
    },

    borrowings: {

        dateField: "borrow_date",

        columns: [

            ["borrowing_id", "Borrowing ID"],
            ["book_id", "Book ID"],
            ["book_title", "Book Title"],
            ["member_id", "Member ID"],
            ["member_name", "Member"],
            ["borrow_date", "Borrow Date"],
            ["due_date", "Due Date"],
            ["return_date", "Return Date"],
            ["status", "Status"]

        ]
    },

    returns: {

        dateField: "return_date",

        columns: [

            ["borrowing_id", "Borrowing ID"],
            ["book_title", "Book Title"],
            ["member_name", "Member"],
            ["borrow_date", "Borrow Date"],
            ["due_date", "Due Date"],
            ["return_date", "Return Date"],
            ["status", "Status"]

        ]
    }
};

/* =====================================================
   REPORT STATISTICS
===================================================== */

function renderReports() {

    $("reportStats").innerHTML = [

        statCard(
            "Total Book Titles",
            summary.total_books,
            "fa-solid fa-book",
            "green"
        ),

        statCard(
            "Total Copies",
            summary.total_copies,
            "fa-solid fa-layer-group",
            "blue"
        ),

        statCard(
            "Available Copies",
            summary.available_copies,
            "fa-solid fa-book-open",
            "green"
        ),

        statCard(
            "Total Members",
            summary.total_members,
            "fa-solid fa-users",
            "blue"
        ),

        statCard(
            "Total Borrowings",
            summary.total_borrowings,
            "fa-solid fa-arrow-right-arrow-left",
            "gold"
        ),

        statCard(
            "Active Borrowings",
            summary.active_borrowings,
            "fa-solid fa-bookmark",
            "gold"
        ),

        statCard(
            "Returned Books",
            summary.returned_books,
            "fa-solid fa-circle-check",
            "green"
        ),

        statCard(
            "Overdue Borrowings",
            borrowings.filter(isOverdue).length,
            "fa-solid fa-clock",
            "pink"
        )

    ].join("");

    animateStats($("reportStats"));

    renderGenreChart();

    renderReportTable();
}

/* =====================================================
   GENRE CHART
===================================================== */

function renderGenreChart() {

    const counts = new Map();

    if (dataReady) {

        books.forEach(book => {

            const genre = book.genre || "Uncategorized";

            counts.set(genre, (counts.get(genre) || 0) + 1);
        });
    }

    const genres = [...counts.entries()]
        .sort((a, b) => b[1] - a[1]);

    if (!genres.length) {

        $("genreChart").innerHTML = emptyState(
            "No collection statistics",
            "Add books to generate genre statistics."
        );

        return;
    }

    const maximum = Math.max(...genres.map(item => item[1]));

    $("genreChart").innerHTML = genres.map(([genre, count]) => `

        <div class="genre-row">

            <span>${escapeHTML(genre)}</span>

            <div class="genre-track">

                <div class="genre-bar"
                     style="width:${count / maximum * 100}%">

                </div>

            </div>

            <strong>${count}</strong>

        </div>

    `).join("");
}

/* =====================================================
   REPORT TABLE AND DATE FILTERS
===================================================== */

function renderReportTable() {

    const type = $("reportType").value;

    const search = $("reportSearch").value;

    const from = $("reportFrom").value;

    const to = $("reportTo").value;

    const definition = reportDefinitions[type];

    reportColumns = definition.columns;

    if (!dataReady) {

        reportData = [];

        $("reportCount").textContent = "Records unavailable";

        $("reportContainer").innerHTML = emptyState();

        return;
    }

    const collection = {

        books,

        members,

        borrowings,

        returns: borrowings.filter(record =>
            record.status === "Returned"
        )

    }[type];

    if (from && to && from > to) {

        reportData = [];

        $("reportCount").textContent = "Invalid date range";

        $("reportContainer").innerHTML = emptyState(
            "Check your dates",
            "The ending date must not precede the starting date."
        );

        return;
    }

    reportData = collection.filter(record => {

        const date = String(
            record[definition.dateField] || ""
        ).slice(0, 10);

        if ((from || to) && !date) return false;

        if (from && date < from) return false;

        if (to && date > to) return false;

        return matches(
            record,
            search,
            reportColumns.map(column => column[0])
        );
    });

    $("reportCount").textContent =
        `${reportData.length} records in this report`;

    $("reportContainer").innerHTML = table(

        reportColumns.map(column => column[1]),

        reportData.map(record =>

            reportColumns.map(([field]) => {

                if (field === "status") {
                    return badge(displayStatus(record));
                }

                if (field.endsWith("_date")) {
                    return escapeHTML(formatDate(record[field]));
                }

                return escapeHTML(record[field] ?? "—");
            })
        )
    );
}

/* =====================================================
   CSV EXPORT
===================================================== */

function csvCell(value) {

    let text = String(value ?? "");

    // Protect against spreadsheet formula injection.

    if (/^\s*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) {
        text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
}

function exportCSV() {

    renderReportTable();

    if (!reportData.length) {

        showToast("No matching records to export.", "error");

        return;
    }

    const rows = [

        reportColumns.map(column =>
            csvCell(column[1])
        ).join(","),

        ...reportData.map(record =>

            reportColumns.map(([field]) =>

                csvCell(
                    field === "status"
                        ? displayStatus(record)
                        : record[field]
                )

            ).join(",")
        )
    ];

    const blob = new Blob(

        ["\uFEFF" + rows.join("\r\n")],

        {type: "text/csv;charset=utf-8;"}

    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download =
        `willow-library-${$("reportType").value}-${today()}.csv`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showToast("CSV report exported successfully.");
}

/* =====================================================
   EVENT DELEGATION
===================================================== */

document.addEventListener("click", event => {

    const button = event.target.closest("button");

    if (!button || button.disabled) return;

    if (button.dataset.page) {

        navigate(button.dataset.page);

        return;
    }

    if (button.dataset.go) {

        navigate(button.dataset.go);

        return;
    }

    if (button.dataset.close) {

        if (!busy) {
            closeModal(button.dataset.close);
        }

        return;
    }

    if (button.dataset.add) {

        if (!dataReady) {

            showToast(
                "Connect to Firestore and refresh first.",
                "error"
            );

            return;
        }

        openRecordForm(button.dataset.add);

        return;
    }

    const {action, resource, id} = button.dataset;

    if (!action || !resource || !id || busy) return;

    if (!["books", "members", "borrowings"].includes(resource)) {
        return;
    }

    switch (action) {

        case "view":
            viewRecord(resource, id);
            break;

        case "edit":
            openRecordForm(resource, id);
            break;

        case "delete":
            deleteRecord(resource, id);
            break;

        case "return":
            returnBook(id);
            break;
    }
});

/* =====================================================
   SEARCH AND FILTER EVENTS
===================================================== */

$("bookSearch").addEventListener("input", renderBooks);

$("genreFilter").addEventListener("change", renderBooks);

$("memberSearch").addEventListener("input", renderMembers);

$("membershipFilter").addEventListener("change", renderMembers);

$("borrowingSearch").addEventListener("input", renderBorrowings);

$("borrowingFilter").addEventListener("change", renderBorrowings);

$("returnSearch").addEventListener("input", renderReturns);

$("returnFilter").addEventListener("change", renderReturns);

$("reportSearch").addEventListener("input", renderReportTable);

$("reportType").addEventListener("change", renderReportTable);

$("reportFrom").addEventListener("change", renderReportTable);

$("reportTo").addEventListener("change", renderReportTable);

/* =====================================================
   BOOKSHELF AND TABLE VIEWS
===================================================== */

$("shelfView").addEventListener("click", () => {

    bookView = "shelf";

    localStorage.setItem("willowView", bookView);

    renderBooks();
});

$("tableView").addEventListener("click", () => {

    bookView = "table";

    localStorage.setItem("willowView", bookView);

    renderBooks();
});

/* =====================================================
   OTHER INTERFACE EVENTS
===================================================== */

$("themeButton").addEventListener("click", toggleTheme);

$("refreshButton").addEventListener("click", () => {
    refreshData(true);
});

$("menuButton").addEventListener("click", () => {

    $("sidebar").classList.toggle("open");

    $("mobileOverlay").classList.toggle("active");
});

$("mobileOverlay").addEventListener("click", closeSidebar);

$("exportButton").addEventListener("click", exportCSV);

$("printButton").addEventListener("click", () => {

    renderReportTable();

    if (!reportData.length) {

        showToast("No matching records to print.", "error");

        return;
    }

    window.print();
});

document.querySelectorAll(".modal-backdrop").forEach(modal => {

    modal.addEventListener("click", event => {

        if (event.target !== modal || busy) return;

        if (modal.id === "confirmModal") {

            resolveConfirmation(false);

        } else {

            closeModal(modal.id);
        }
    });
});

/* =====================================================
   INITIALIZE APPLICATION
===================================================== */

async function initialize() {

    initializeTheme();

    $("currentDate").textContent =
        new Date().toLocaleDateString("en-PH", {

            weekday: "short",

            month: "long",

            day: "numeric",

            year: "numeric"

        });

    navigate("dashboard");

    await refreshData();
}

initialize();
