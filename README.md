# BigQuery Release Explorer

A modern, responsive, and secure web application built with **Python Flask** and **Vanilla HTML, CSS, and JavaScript** that fetches, segments, and displays the latest Google Cloud BigQuery release notes.

The application allows you to search and filter updates by type (e.g., Features, Changes, Issues, Announcements) and features a **Select-to-Tweet** action bar that formats selected release notes into a 280-character Twitter Web Intent message for instant sharing.

---

## 🚀 Key Features

* **Granular Feed Segmentation**: Fetches Google's official Atom XML feed and splits daily logs into individual, bite-sized update cards.
* **Instant Filtering & Search**: Filter updates using category tags (chips) or search by keyword dynamically on the client side.
* **Select-to-Tweet Integration**: Selecting any card highlights it and slides up a floating action bar. Clicking "Tweet this Update" opens a pre-composed Twitter Web Intent in a new tab.
* **Premium Dark Theme**: Modern glassmorphic cards (`backdrop-filter`), CSS shimmer loading skeletons, and interactive transitions.
* **Security Hardened**:
  * **Rate Limiting**: Limits clients to 30 requests per minute to prevent DoS.
  * **HTTP Security Headers**: Enforces strict CSP (Content Security Policy), X-Frame-Options (Clickjacking protection), and X-Content-Type-Options.
  * **XSS Sanitizer**: Dynamically builds DOM elements using a recursive element-based allow-list, completely avoiding vulnerable `innerHTML` calls.

---

## 📁 Project Structure

```text
bq-release-notes/
│
├── app.py                # Flask server, rate limiting, and XML parser
├── .gitignore            # Git exclusion patterns
├── README.md             # Project documentation
│
├── static/
│   ├── css/
│   │   └── styles.css    # Premium glassmorphic stylesheet
│   └── js/
│       └── app.js        # Dynamic UI controller & XSS-safe DOM renderer
│
└── templates/
    └── index.html        # Semantic dashboard template
```

---

## 🛠️ Setup & Installation

### Prerequisites
* Python 3.12+ installed.

### 1. Clone & Navigate
```bash
git clone https://github.com/shree-0403/antigravity-event-talks-app.git
cd antigravity-event-talks-app
```

### 2. Setup Virtual Environment
If your system lacks `ensurepip`, construct the virtual environment without pip first, then install pip and packages:
```bash
# Create the environment
python3 -m venv --without-pip venv
source venv/bin/activate

# Install pip inside the environment
curl -sSL https://bootstrap.pypa.io/get-pip.py | python3

# Install dependencies
pip install flask requests
```

### 3. Run the Server
```bash
python3 app.py
```

Open your browser and navigate to **`http://127.0.0.1:5000`**.

---

## 🛡️ Security Architecture

* **Safe XML Parsing**: Built on `xml.etree.ElementTree`, which is immune to XML External Entity (XXE) attacks in modern Python versions.
* **DOM Sanitizer**: All RSS HTML content is sanitized in JavaScript via a custom parser (`renderSafeHTML` using `DOMParser`). Any unauthorized tags or protocols (such as `javascript:` links) are completely stripped.
* **Strict CSP Header**:
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data: https:;
  ```
