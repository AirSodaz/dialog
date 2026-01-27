## 2026-01-27 - [CRITICAL] Path Traversal in File I/O
**Vulnerability:** The Tauri backend exposed `write_json`, `read_json`, and other file operations that accepted arbitrary paths without validation, allowing a compromised frontend to read/write any file on the user's system (Path Traversal).
**Learning:** Even in desktop apps where the user "owns" the machine, the principle of least privilege applies. The frontend (rendering context) should not have unrestricted access to the file system, as it can be a vector for malicious content (XSS) to escalate privileges.
**Prevention:** Always validate paths against a safe root directory (like CWD or App Data) using `canonicalize` and `starts_with` checks before performing I/O.

## 2026-01-28 - [HIGH] CSP Trade-off for Extensibility
**Vulnerability:** Configuring a restrictive Content Security Policy (CSP) while allowing user-defined API endpoints requires a broad `connect-src https:` directive.
**Learning:** Strict CSPs can conflict with "Bring Your Own Key" features where users connect to arbitrary third-party services (e.g., custom AI providers).
**Prevention:** We allow `connect-src https:` to support extensibility but maintain strict `script-src 'self'` and `default-src 'self'` to prevent code execution from untrusted sources. This compromise isolates the risk to data exfiltration (which the user explicitly authorizes by providing keys) rather than arbitrary code execution.
