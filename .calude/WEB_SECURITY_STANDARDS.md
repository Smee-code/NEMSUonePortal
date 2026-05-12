# Web Application Security Standards
> Based on OWASP Top 10:2025 — Internal Development Reference

**Version:** 1.0  
**Standard:** OWASP Top 10:2025  
**Scope:** All web applications and APIs developed by this team  
**Enforcement:** Required on all new features, reviewed on all PRs  

---

## Table of Contents

1. [A01 — Broken Access Control](#a01--broken-access-control)
2. [A02 — Security Misconfiguration](#a02--security-misconfiguration)
3. [A03 — Software Supply Chain Failures](#a03--software-supply-chain-failures)
4. [A04 — Cryptographic Failures](#a04--cryptographic-failures)
5. [A05 — Injection](#a05--injection)
6. [A06 — Insecure Design](#a06--insecure-design)
7. [A07 — Authentication Failures](#a07--authentication-failures)
8. [A08 — Software or Data Integrity Failures](#a08--software-or-data-integrity-failures)
9. [A09 — Security Logging and Alerting Failures](#a09--security-logging-and-alerting-failures)
10. [A10 — Mishandling of Exceptional Conditions](#a10--mishandling-of-exceptional-conditions)
11. [General Development Rules](#general-development-rules)
12. [Security Checklist (PR Review)](#security-checklist-pr-review)

---

## A01 — Broken Access Control

**Severity:** 🔴 Critical | Found in ~94% of applications tested

### What It Means
Access control ensures users can only perform actions and access data within their permitted scope. Failures lead to unauthorized data access, privilege escalation, and unauthorized operations.

### Rules

- **Deny by default.** All routes and resources must require explicit permission grants. No route should be accessible unless permission is intentionally granted.
- **Server-side only.** Never rely on client-side checks (hidden buttons, disabled inputs) as the sole enforcement of access control. All authorization logic must live on the server.
- **Enforce ownership checks.** When a user accesses a resource by ID, verify they own or are permitted to access that specific record — not just that they are authenticated.
- **Separate admin functions.** Admin panels and privileged routes must be isolated and restricted at the server/infrastructure level, not just hidden in the UI.
- **Use RBAC or ABAC.** Implement role-based (RBAC) or attribute-based (ABAC) access control consistently across the application. Do not invent ad-hoc permission checks per route.
- **Disable directory listing.** Web servers must never expose directory listings.
- **Protect static files.** Files stored on disk (uploads, exports) must not be served from a publicly guessable path without an authorization check.

### Code Standards

```js
// ❌ BAD — trusting a user-supplied ID without verifying ownership
app.get('/document/:id', async (req, res) => {
  const doc = await Document.findById(req.params.id);
  res.json(doc);
});

// ✅ GOOD — verifying the document belongs to the requesting user
app.get('/document/:id', authenticate, async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, owner: req.user.id });
  if (!doc) return res.status(403).json({ error: 'Forbidden' });
  res.json(doc);
});
```

```python
# ❌ BAD — role check only on the frontend
# ✅ GOOD — decorator-enforced role check on every protected route
@app.route('/admin/users')
@require_role('admin')
def admin_users():
    return get_all_users()
```

### Log & Alert
Log every access control failure with the user ID, requested resource, and timestamp. Alert on repeated failures from the same user or IP.

---

## A02 — Security Misconfiguration

**Severity:** 🔴 Critical | Most commonly seen issue in production

### What It Means
Insecure defaults, unnecessary features left enabled, default credentials, and missing security headers all fall under this category. Any deviation from a hardened configuration is a risk.

### Rules

- **No default credentials.** Default usernames and passwords (admin/admin, root/root) must be changed before any deployment — including staging and QA environments.
- **Disable unused features.** Turn off any service, port, endpoint, or framework feature not actively used. This includes debug modes, admin consoles, and sample applications.
- **Environment-specific configuration.** Debug mode, verbose logging, and stack traces must be disabled in staging and production. Use environment variables or secrets managers — never hardcode configuration.
- **Required HTTP security headers.** Every response must include the following headers:

| Header | Required Value |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Content-Security-Policy` | Defined per-app (no `unsafe-inline`) |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` or `SAMEORIGIN` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Restrict unused browser APIs |

- **Cloud storage is private by default.** S3 buckets, GCS buckets, and equivalent cloud storage must be private unless there is an explicit, documented reason to make them public.
- **Run automated configuration scans.** Use tools such as Mozilla Observatory, SecurityHeaders.com, or a DAST scanner against every deployed environment at least once per release cycle.
- **Review configurations during dependency updates.** When updating a framework or library, re-audit any configuration changes the new version introduces.

### Environment Variable Standards

```bash
# ❌ BAD — hardcoded secrets in source code
DB_PASSWORD="supersecret123"
API_KEY="sk-live-abc123"

# ✅ GOOD — secrets loaded from environment or secrets manager
DB_PASSWORD=${DB_PASSWORD}      # from .env (local) or Vault/AWS Secrets Manager (prod)
API_KEY=${API_KEY}
```

```
# .gitignore — always exclude
.env
.env.local
.env.production
*.key
*.pem
secrets/
```

---

## A03 — Software Supply Chain Failures

**Severity:** 🔴 Critical | New in OWASP 2025

### What It Means
Every third-party package, library, and tool you depend on is a potential attack vector. Supply chain attacks compromise a dependency upstream, silently impacting all consumers.

### Rules

- **Audit dependencies regularly.** Run dependency audits on every build and before every release. Use automated tools:
  - JavaScript/Node.js: `npm audit` or Snyk
  - Python: `pip-audit` or Safety
  - Java: OWASP Dependency-Check
  - PHP: `composer audit`

- **Pin dependency versions.** Use exact version pinning (not `^` or `~`) in production. Use lock files (`package-lock.json`, `poetry.lock`, `Pipfile.lock`) and commit them to source control.

- **Verify package integrity.** Enable checksum verification. For npm, do not disable the `package-lock.json`. For Python, use `--require-hashes` in `pip`.

- **Use trusted registries only.** Only pull packages from official, well-known registries (npmjs.com, pypi.org, Maven Central). Do not install packages from git URLs or arbitrary URLs in production dependencies.

- **Typosquatting awareness.** Before installing any package, verify the exact name matches the official package. Attackers register misspelled versions of popular libraries.

- **Subresource Integrity (SRI) for CDN assets.** Any external script or stylesheet loaded from a CDN must include an `integrity` attribute.

```html
<!-- ❌ BAD — no integrity check -->
<script src="https://cdn.example.com/lib.min.js"></script>

<!-- ✅ GOOD — SRI hash prevents loading a tampered file -->
<script
  src="https://cdn.example.com/lib.min.js"
  integrity="sha384-abc123..."
  crossorigin="anonymous">
</script>
```

- **Maintain a Software Bill of Materials (SBOM).** Generate and store an SBOM for every release so the full dependency tree is auditable.

- **Monitor for new CVEs.** Subscribe to security advisories for your critical dependencies. Set up Dependabot or Renovate with auto-PR for security patches.

---

## A04 — Cryptographic Failures

**Severity:** 🟠 High | Previously "Sensitive Data Exposure"

### What It Means
Sensitive data must be protected at rest and in transit using modern cryptographic standards. Failures include transmitting data over HTTP, using deprecated algorithms, poor key management, and storing secrets in plain text.

### Rules

- **HTTPS everywhere.** All traffic must use HTTPS with TLS 1.2 or higher. Redirect all HTTP requests to HTTPS. Never disable certificate validation in any environment.

- **Forbidden algorithms.** The following must never be used for security-sensitive operations:

| Algorithm | Status | Replace With |
|---|---|---|
| MD5 | ❌ Forbidden | SHA-256 or SHA-3 |
| SHA-1 | ❌ Forbidden | SHA-256 or SHA-3 |
| DES / 3DES | ❌ Forbidden | AES-256-GCM |
| RC4 | ❌ Forbidden | ChaCha20-Poly1305 |
| RSA < 2048-bit | ❌ Forbidden | RSA-2048+ or ECDSA |

- **Password hashing.** Passwords must never be stored as plain text or with reversible encryption. Use a purpose-built password hashing algorithm:
  - **Preferred:** `argon2id`
  - **Acceptable:** `bcrypt` (cost factor ≥ 12) or `scrypt`
  - **Never use:** SHA-256/512 alone (even with salt) for passwords

```python
# ❌ BAD — MD5 password hash (crackable in seconds)
import hashlib
hashed = hashlib.md5(password.encode()).hexdigest()

# ✅ GOOD — argon2id with automatic salting
from argon2 import PasswordHasher
ph = PasswordHasher()
hashed = ph.hash(password)
verified = ph.verify(hashed, password)
```

- **Classify and minimize sensitive data.** Identify all sensitive data (PII, financial, health, credentials). Only store what is necessary. Delete it when no longer needed.

- **Encrypt data at rest.** Databases containing sensitive data must use encryption at rest. Sensitive fields (SSNs, payment info) should use field-level encryption in addition to disk encryption.

- **Key management.** Encryption keys must be stored separately from the data they protect. Use a dedicated secrets manager (AWS KMS, HashiCorp Vault, Azure Key Vault). Rotate keys on a defined schedule.

- **No sensitive data in URLs.** Tokens, session IDs, and passwords must never appear in query strings (they end up in server logs and browser history).

---

## A05 — Injection

**Severity:** 🔴 Critical | #1 risk for over a decade

### What It Means
Injection occurs when user-supplied input is interpreted as a command or query. SQL injection, NoSQL injection, OS command injection, LDAP injection, and XSS (cross-site scripting) all fall here.

### Rules

- **Parameterized queries always.** Never concatenate user input into SQL or any other query language. Use prepared statements or parameterized queries in every database interaction.

```js
// ❌ BAD — SQL injection vulnerability
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ GOOD — parameterized query
const query = 'SELECT * FROM users WHERE email = $1';
const result = await db.query(query, [email]);
```

```python
# ❌ BAD
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")

# ✅ GOOD
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```

- **Use an ORM where possible.** ORMs (Sequelize, SQLAlchemy, Hibernate, Eloquent) abstract query building and reduce injection risk. Review any raw query usage in code reviews.

- **Escape output for context.** All dynamic content rendered to HTML must be escaped for the correct context:
  - HTML body → HTML entity encoding
  - HTML attribute → Attribute encoding
  - JavaScript context → JavaScript encoding
  - URL parameter → URL encoding
  - Never use `innerHTML` or `dangerouslySetInnerHTML` with untrusted input

- **Content Security Policy (CSP).** A strict CSP must be configured to block inline script execution and restrict script sources to trusted origins.

- **Whitelist input validation.** Validate all user input against an expected format (type, length, pattern) on the server side. Reject or sanitize anything that doesn't conform — do not rely on blacklisting.

- **OS command calls.** Avoid passing user input to OS commands. If unavoidable, use allow-listed arguments and never pass raw strings to shell interpreters.

```js
// ❌ BAD — OS command injection risk
const { exec } = require('child_process');
exec(`convert ${req.body.filename} output.png`);

// ✅ GOOD — use library APIs, or whitelist/sanitize strictly
const allowedFile = /^[a-zA-Z0-9_-]+\.(jpg|png|pdf)$/.test(filename);
if (!allowedFile) return res.status(400).send('Invalid filename');
```

---

## A06 — Insecure Design

**Severity:** 🟠 High | Architecture and design flaws

### What It Means
Insecure design refers to missing or ineffective security controls at the architecture and design level — not bugs in implementation, but fundamental flaws in how a system is conceived. These cannot be patched after the fact without redesign.

### Rules

- **Threat model every feature.** Before development begins on any significant feature, conduct a lightweight threat model. Ask: What could go wrong? Who might abuse this? What data is at risk? Document the outcome.

- **Apply least privilege at the design level.** Each component, service, and user role should have the minimum permissions needed to function. Design this explicitly — do not add permissions reactively.

- **Rate limit all sensitive operations.** Login, registration, password reset, email verification, OTP entry, and any resource-intensive operation must have rate limits designed in from the start.

- **Limit resource consumption per user.** Any feature that consumes server resources (file uploads, exports, bulk operations, API calls) must have per-user caps designed in. Example: max 10 active exports per user.

- **Segregate tenant data at the architecture level.** In multi-tenant systems, tenant isolation must be enforced structurally (separate schemas, separate databases, or row-level security with verified tenant IDs) — not just by filtering queries.

- **Validate business logic flows.** Define the expected flow for critical business processes (checkout, payment, approval). Ensure the system cannot be manipulated to skip steps, replay steps, or reverse completed steps.

- **Design for auditability.** Systems handling sensitive data or financial transactions must log every state change with actor, timestamp, and previous/new state — by design, not as an afterthought.

### Threat Modeling Template (per feature)

```
Feature: [Name]
Data involved: [List sensitive data touched]
Trust boundaries: [Who calls this? From where?]
Threats:
  - Spoofing: Can an attacker impersonate another user?
  - Tampering: Can data be modified in transit or at rest?
  - Repudiation: Can actions be denied without a log trail?
  - Info Disclosure: What happens if this fails open?
  - DoS: Can an attacker exhaust resources?
  - Privilege Escalation: Can a user gain more access than intended?
Mitigations: [Controls applied for each threat]
```

---

## A07 — Authentication Failures

**Severity:** 🔴 Critical | Formerly "Broken Authentication"

### What It Means
Authentication verifies who a user is. Failures here allow attackers to assume other users' identities through credential stuffing, session theft, brute force, or exploiting weak password/session management.

### Rules

- **Multi-factor authentication (MFA).** MFA must be supported for all user accounts and required for admin accounts. Use TOTP (e.g., Google Authenticator) or hardware keys — not SMS alone.

- **Password strength requirements.** Enforce a minimum length of 12 characters. Check passwords against known breach lists (e.g., HaveIBeenPwned API or a local copy of common passwords). Do not impose arbitrary complexity rules that encourage weak passwords.

- **No default or hardcoded credentials.** No application may ship with default credentials. Any initial credentials must be random, unique, and forced to change on first login.

- **Brute force protection.** Implement account lockout or exponential back-off after repeated failed attempts. Use CAPTCHA or proof-of-work challenges after a threshold. Alert the user and team on repeated failures.

- **Session management standards:**
  - Generate new session IDs after every successful login (session fixation prevention)
  - Session IDs must be at least 128 bits of entropy
  - Set cookies with `HttpOnly`, `Secure`, and `SameSite=Strict` (or `Lax`)
  - Never expose session IDs in URLs or logs
  - Invalidate sessions completely on logout — both client-side and server-side
  - Set appropriate session timeouts (idle: 15–30 min for sensitive apps)

```js
// ✅ GOOD — secure cookie configuration
res.cookie('sessionId', token, {
  httpOnly: true,
  secure: true,         // HTTPS only
  sameSite: 'strict',   // CSRF protection
  maxAge: 30 * 60 * 1000 // 30 minutes
});
```

- **JWT standards (if used):**
  - Use `RS256` or `ES256` — never `none` or `HS256` with a weak secret
  - Validate `iss`, `aud`, `exp`, and `nbf` claims on every request
  - Keep JWTs short-lived (15 min access, 7 day refresh)
  - Maintain a server-side revocation list or use short expiry with refresh rotation

---

## A08 — Software or Data Integrity Failures

**Severity:** 🟠 High | CI/CD and serialization risks

### What It Means
Integrity failures occur when software or data is assumed to be unmodified without verification. This covers insecure deserialization, insecure auto-update mechanisms, and CI/CD pipelines that can be subverted.

### Rules

- **Verify all downloaded artifacts.** Any file downloaded as part of a build, deployment, or update process must have its checksum or signature verified before use.

- **Secure the CI/CD pipeline:**
  - All pipeline configuration files must be stored in source control and reviewed like code
  - Secrets must be injected from a secrets manager — never hardcoded in pipeline configs
  - Pipeline jobs must run with the minimum permissions needed
  - Separate build, test, and deploy stages; require approval gates for production deployments
  - Audit all pipeline changes — unauthorized pipeline modifications must trigger alerts

- **No deserialization of untrusted data.** Do not deserialize objects received from untrusted sources (HTTP requests, message queues fed by external parties) in languages where deserialization can trigger code execution (Java, PHP, Python pickle, Ruby Marshal).

```python
# ❌ BAD — pickle deserialization of user-supplied data (remote code execution risk)
import pickle
data = pickle.loads(request.body)

# ✅ GOOD — use a safe format like JSON with schema validation
import json
from jsonschema import validate
data = json.loads(request.body)
validate(instance=data, schema=expected_schema)
```

- **Digital signatures for software releases.** All production builds must be signed. Verify signatures before deployment. Unsigned builds must not be deployed to production.

- **Integrity checks for update mechanisms.** Any auto-update feature must:
  - Download updates over HTTPS
  - Verify a cryptographic signature from a trusted key before executing
  - Fail closed — if verification fails, do not apply the update

---

## A09 — Security Logging and Alerting Failures

**Severity:** 🔵 Medium | Detection and response capability

### What It Means
Without sufficient logging and monitoring, breaches go undetected. The average time to detect a breach exceeds 200 days. Logging enables forensics, detection, and incident response.

### What Must Be Logged

Every log entry for security events must include: **timestamp (UTC), event type, user ID (if applicable), IP address, resource accessed, and outcome (success/failure).**

| Event Category | Must Log |
|---|---|
| Authentication | Every login attempt (success + failure), logout, MFA events |
| Access control | All authorization failures |
| Input validation | Server-side validation failures on sensitive endpoints |
| Privilege changes | Role assignments, permission grants/revocations |
| Data access | Access to sensitive records (PII, financial data) |
| Admin actions | All actions performed by admin users |
| Errors | All 5xx errors with context |

### Rules

- **Never log sensitive data.** Passwords, API keys, tokens, full credit card numbers, and SSNs must never appear in logs. Mask or truncate where partial values are needed.

```js
// ❌ BAD — logging the password
logger.info(`Login attempt: user=${email} password=${password}`);

// ✅ GOOD — logging the event without the secret
logger.info({ event: 'login_attempt', email, success: false, ip: req.ip });
```

- **Log in a structured format.** Use JSON-formatted logs so they can be ingested by SIEM tools without parsing. Include consistent field names across all services.

- **Centralize logs.** Send all logs to a centralized, tamper-evident store (e.g., CloudWatch, Elastic, Datadog, Splunk). Application servers should not be the sole log store.

- **Protect log integrity.** Logs must be append-only. Application users must not have the ability to delete or overwrite log entries.

- **Set up alerts.** The following must trigger immediate alerts:
  - More than 5 consecutive failed logins from the same IP or account
  - Any access control failure on an admin or sensitive endpoint
  - Any detected injection pattern in request payloads
  - Unexpected spikes in 5xx error rates
  - New admin account creation

- **Retention policy.** Security logs must be retained for a minimum of 90 days (accessible) and 1 year (archived), or per applicable regulatory requirements.

---

## A10 — Mishandling of Exceptional Conditions

**Severity:** 🔵 Medium | New in OWASP 2025

### What It Means
How an application behaves when something goes wrong is itself a security concern. Unhandled exceptions can crash services, leak internal information, expose stack traces, or be exploited to bypass security controls.

### Rules

- **Never expose stack traces to users.** All unhandled exceptions must be caught by a global error handler. Users must receive a generic error message. Full details must go to server-side logs only.

```js
// ❌ BAD — stack trace returned to client
app.get('/data', async (req, res) => {
  const result = await db.query(sql); // throws on error, crashes with stack trace
  res.json(result);
});

// ✅ GOOD — global error handler with safe response
app.get('/data', async (req, res, next) => {
  try {
    const result = await db.query(sql);
    res.json(result);
  } catch (err) {
    next(err); // passed to global handler
  }
});

app.use((err, req, res, next) => {
  logger.error({ err, path: req.path, user: req.user?.id }); // full detail in logs
  res.status(500).json({ error: 'An unexpected error occurred.' }); // generic to client
});
```

- **No empty catch blocks.** Swallowing exceptions silently hides failures and makes debugging and detection impossible. Every catch block must at minimum log the error.

```python
# ❌ BAD — silent failure
try:
    process_payment(data)
except Exception:
    pass

# ✅ GOOD — log and handle appropriately
try:
    process_payment(data)
except PaymentException as e:
    logger.error("Payment failed", exc_info=e, extra={"user_id": user.id})
    raise
```

- **Use meaningful HTTP status codes.** Return appropriate status codes (400, 401, 403, 404, 500) without leaking implementation details in response bodies.

- **Handle all edge cases explicitly.** Test null inputs, empty arrays, extreme numeric values, concurrent requests, and unexpected data types. Do not assume the happy path.

- **Validate third-party error handling.** Review how third-party libraries surface errors to your application. Ensure their exceptions do not propagate raw to HTTP responses.

- **Graceful degradation.** Critical services that fail should degrade gracefully — disable the failing feature rather than crashing the entire application.

---

## General Development Rules

These rules apply universally, regardless of the specific OWASP category.

### Secrets Management

- All secrets (API keys, database credentials, signing keys) must be stored in a secrets manager or environment variables — never in source code or configuration files committed to version control.
- Rotate secrets on a defined schedule and immediately upon suspected compromise.
- Use separate credentials for each environment (dev, staging, prod).

### Dependency Management

- Keep all dependencies up to date. Subscribe to security advisories for critical libraries.
- Remove unused dependencies promptly.
- Review the full dependency tree before adding any new package.

### Code Review Security Checklist

Every pull request must be reviewed with the following questions:

- Does this code handle user input safely (injection, validation)?
- Does this code enforce authorization on every data access?
- Does this code expose any sensitive data in responses, logs, or errors?
- Does this code use approved cryptographic algorithms and libraries?
- Does this code log appropriate security events?
- Does this code handle errors gracefully without leaking internals?

### Infrastructure Security

- Apply the principle of least privilege to all cloud IAM roles, database users, and service accounts.
- Use network segmentation — databases must not be publicly accessible.
- Enable encryption at rest for all databases and object storage.
- Conduct regular vulnerability scans and penetration tests (minimum once per year, or after major releases).

### Security Training

- All developers must complete security awareness training annually.
- Developers working on authentication, payment, or PII-handling systems must have additional focused training on those topics.

---

## Security Checklist (PR Review)

Copy this checklist into any pull request that touches security-sensitive code.

```markdown
## Security Review Checklist

### Access Control
- [ ] All new routes require authentication unless explicitly public
- [ ] All data access verifies ownership/permission, not just authentication
- [ ] No authorization logic relies solely on client-side checks

### Input / Output
- [ ] All user input is validated on the server side
- [ ] All database queries use parameterized statements or an ORM
- [ ] All dynamic HTML output is escaped for the correct context
- [ ] No use of `innerHTML`, `eval()`, or `dangerouslySetInnerHTML` with user data

### Cryptography
- [ ] No forbidden algorithms (MD5, SHA-1, DES, RC4) used
- [ ] Passwords hashed with argon2id or bcrypt (cost ≥ 12)
- [ ] All sensitive data transmitted over HTTPS only
- [ ] No secrets hardcoded in source code

### Authentication & Sessions
- [ ] Session cookies set with HttpOnly, Secure, SameSite
- [ ] New session ID generated after login
- [ ] Sessions invalidated completely on logout

### Error Handling
- [ ] Global error handler in place — no raw stack traces to client
- [ ] No empty catch blocks
- [ ] All caught exceptions are logged with context

### Logging
- [ ] Security events are logged (auth, access failures, admin actions)
- [ ] No sensitive data (passwords, tokens, PII) in logs
- [ ] Logs include: timestamp, event type, user ID, IP, outcome

### Dependencies
- [ ] No new dependency added without review
- [ ] `npm audit` / `pip-audit` / equivalent passes with no critical issues
- [ ] SRI hashes added for any new CDN-loaded resources

### Configuration
- [ ] No debug mode enabled in staging/production config
- [ ] Required security headers present
- [ ] No sensitive config values committed to source control
```

---

## References

- [OWASP Top 10:2025](https://owasp.org/Top10/2025/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [NIST Secure Software Development Framework (SSDF)](https://csrc.nist.gov/Projects/ssdf)
- [CWE/SANS Top 25 Most Dangerous Software Weaknesses](https://cwe.mitre.org/top25/)

---

*This document is a living standard. It must be reviewed and updated whenever the OWASP Top 10 is revised or when new threats emerge relevant to our stack. Last reviewed: 2025.*
