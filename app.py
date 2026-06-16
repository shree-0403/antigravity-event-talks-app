import os
import re
import time
import logging
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request, make_response

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Simple in-memory rate limiting (30 requests per minute per IP)
ip_requests = {}  # {ip: [timestamps]}
RATE_LIMIT_LIMIT = 30
RATE_LIMIT_PERIOD = 60

def is_rate_limited(ip):
    now = time.time()
    # Remove timestamps older than the rate limit period
    ip_requests[ip] = [t for t in ip_requests.get(ip, []) if now - t < RATE_LIMIT_PERIOD]
    if len(ip_requests[ip]) >= RATE_LIMIT_LIMIT:
        return True
    ip_requests[ip].append(now)
    return False

@app.after_request
def add_security_headers(response):
    # Security headers to mitigate XSS, Clickjacking, and MIME sniffing
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "connect-src 'self'; "
        "img-src 'self' data: https:;"
    )
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'no-referrer'
    response.headers['Cache-Control'] = 'no-store, max-age=0, must-revalidate'
    return response

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    ip = request.remote_addr
    if is_rate_limited(ip):
        logger.warning(f"Rate limit exceeded for IP: {ip}")
        return jsonify({"error": "Too many requests. Please try again in a minute."}), 429

    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    try:
        # Fetch the release notes feed with a timeout
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        xml_data = response.content
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch XML feed from Google Cloud: {e}")
        return jsonify({"error": "Failed to fetch release notes from Google Cloud feed."}), 502

    try:
        # Parse XML safely using standard ElementTree (safe in Python 3.x against XXE)
        root = ET.fromstring(xml_data)
        namespace = {'atom': 'http://www.w3.org/2005/Atom'}
        entries = []

        for entry in root.findall('atom:entry', namespace):
            title_el = entry.find('atom:title', namespace)
            date_str = title_el.text.strip() if title_el is not None else "Unknown Date"

            link_el = entry.find("atom:link[@rel='alternate']", namespace)
            link = link_el.attrib.get('href', '').strip() if link_el is not None else "https://cloud.google.com/bigquery/docs/release-notes"

            content_el = entry.find('atom:content', namespace)
            content_html = content_el.text if content_el is not None else ""

            # Split content_html by h3 tags to isolate individual updates within this entry
            # Example structure: <h3>Feature</h3><p>Description...</p>
            pattern = re.compile(r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)', re.DOTALL)
            matches = pattern.findall(content_html)

            if matches:
                for match_type, match_desc in matches:
                    entries.append({
                        "date": date_str,
                        "type": match_type.strip(),
                        "description": match_desc.strip(),
                        "link": link
                    })
            else:
                # Fallback if the structure doesn't match
                entries.append({
                    "date": date_str,
                    "type": "Update",
                    "description": content_html.strip(),
                    "link": link
                })

        return jsonify({"releases": entries})

    except ET.ParseError as e:
        logger.error(f"XML Parsing Error: {e}")
        return jsonify({"error": "Failed to parse release notes data."}), 500
    except Exception as e:
        logger.error(f"Unexpected error while processing feed: {e}")
        return jsonify({"error": "An internal server error occurred."}), 500

if __name__ == '__main__':
    # Flask app listens only on 127.0.0.1 for local testing
    app.run(host='127.0.0.1', port=5000, debug=True)
