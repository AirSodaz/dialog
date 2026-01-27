## 2026-01-27 - [CRITICAL] Path Traversal in File I/O
**Vulnerability:** The Tauri backend exposed `write_json`, `read_json`, and other file operations that accepted arbitrary paths without validation, allowing a compromised frontend to read/write any file on the user's system (Path Traversal).
**Learning:** Even in desktop apps where the user "owns" the machine, the principle of least privilege applies. The frontend (rendering context) should not have unrestricted access to the file system, as it can be a vector for malicious content (XSS) to escalate privileges.
**Prevention:** Always validate paths against a safe root directory (like CWD or App Data) using `canonicalize` and `starts_with` checks before performing I/O.
