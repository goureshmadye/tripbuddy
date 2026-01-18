# Security Policy

TripBuddy is committed to ensuring the safety and security of our users' data. This document outlines our security practices, including how we mitigate OWASP Top 10 vulnerabilities, implement rate limiting, and follow preventive measures.

## 🛡️ OWASP Top 10 Mitigation Measures

We align our security practices with the OWASP Mobile Top 10 and Web Top 10 standards where applicable.

### 1. Broken Access Control

**Risk:** Unauthorized users accessing or modifying other users' data.
**Mitigation:**

- **Firestore Security Rules:** We adhere to the Principle of Least Privilege.
  - Users can only read/write their own profiles (`request.auth.uid == userId`).
  - Trip data is accessible only by the creator and explicitly added collaborators.
  - Review `firestore.rules` regularily to ensure no open access (`allow read, write: if true`) exists.

### 2. Cryptographic Failures (Sensitive Data Exposure)

**Risk:** Storing sensitive data like auth tokens or personal info in plain text.
**Mitigation:**

- **Secure Storage:** Avoid `AsyncStorage` for sensitive keys. Use `expo-secure-store` for storing authentication tokens and encryption keys on the device.
- **Transport Security:** All data in transit is encrypted via HTTPS/TLS (enforced by Firebase).

### 3. Injection

**Risk:** Malicious data being sent to the database to manipulate queries.
**Mitigation:**

- **Firestore Integrity:** Firestore's client SDKs automatically handle input sanitization, preventing traditional SQL injection.
- **Rule Validation:** We strictly validate incoming data types in `firestore.rules` (e.g., ensuring `amount` is a number).

### 4. Insecure Design (Rate Limiting)

**Risk:** Abuse of APIs causing denial of service or excessive costs.
**Mitigation:**

- **Firebase App Check:** (Recommended Implementation) Verify that requests originate from our authentic app preventing abuse from unverified clients.
- **Cost Limits:** Set quotas in Google Cloud Console to prevent runaway billing.

### 5. Security Misconfiguration

**Risk:** Default settings or unacknowledged errors leaving gaps.
**Mitigation:**

- **API Key Restrictions:** Restrict Google Maps and Firebase API keys in the Google Cloud Console to specific Android package names (`com.goureshmadye.tripbuddy`) and iOS bundle IDs.
- **Production Builds:** Disable debugging and logs in production builds.

### 6. Vulnerable and Outdated Components

**Risk:** Using libraries with known security flaws.
**Mitigation:**

- **Regular Audits:** Run `npm audit` frequently to identify and patch vulnerable dependencies.
- **Dependabot:** Enable GitHub Dependabot for automated security alerts.

### 7. Identification and Authentication Failures

**Mitigation:**

- **Firebase Auth:** We rely on Firebase Authentication which handles secure session management, password hashing (scrypt), and multi-factor authentication support.
- **Session Timeout:** Ensure tokens have appropriate expiration times.

---

## 🚦 Rate Limiting Strategy

To prevent abuse and control costs:

### 1. Application Layer (App Check)

Implement **Firebase App Check** with Play Integrity (Android) and DeviceCheck (iOS). This ensures only your actual app can access backend resources.

### 2. Database Limits

Firestore enforces generic limits. For high-frequency writes, consider efficient counting implementations (e.g., distributed counters) instead of frequent document updates.

### 3. API Quotas

Configure **Google Cloud Quotas**:

- **Maps API:** Set daily request limits per user or globally.
- **Cloud Functions:** Set `maxInstances` to prevent scaling attacks if backend functions are deployed.

---

## 🔒 Preventive Measures & Best Practices

### Input Validation

- Validate all user inputs on the client side (Formik/Zod) for UX.
- **Crucially**, enforce validation in `firestore.rules` (Server-Side) to ensure data integrity.

### Secure Session Management

- Do not hardcode secrets or API keys that grant administrative access in the app code.
- Use `expo-auth-session` for secure OAuth flows.

### Logging & Monitoring

- **Crashlytics:** Monitor for crashes that could indicate security probing.
- **Audit Logs:** Enable Cloud Audit Logs for Firestore to track administrative access patterns.

### Production Readiness Checklist

- [ ] Remove all `console.log` statements containing data.
- [ ] Verify `android:debuggable="false"` in Android Manifest.
- [ ] Obfuscate code using ProGuard/R8 (Android).
- [ ] Verify API Key restrictions in Google Cloud Console.

---

## 🐛 Reporting Vulnerabilities

If you discover a security vulnerability, please report it privately to the engineering team. Do not disclose it publicly until it has been resolved.
