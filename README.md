# Nexo Clínico — Adaptive Security Architecture Prototype

Prototype of a security architecture for human validation of AI-assisted clinical documentation. This repository accompanies the research article:

> **Adaptive Security Architecture for Human Validation of AI-Assisted Clinical Documentation**
> Verástegui Castillo, C. E.; Flores Rodríguez, M. R.; Cabanillas Urbina, M. Á.; Mendoza de los Santos, A. C.
> *Ingeniería e Investigación* (under review).

---

## ⚠️ Important disclaimer

This is a **frontend prototype only**. The backend components described in the article (Keycloak, FastAPI, PostgreSQL, KMS, risk engine, audit store) are **simulated**, not implemented. All data are **fictitious**. No real clinical, biometric, or identifiable data are used.

The prototype demonstrates the **user experience and design coverage** of the proposed architecture; it does not provide production-grade security.

---

## 🎯 What the prototype demonstrates

The prototype covers the following security scenarios, as described in the article:

- Professional identity verification during onboarding (civil identity, professional registry, institutional link).
- Passkey/WebAuthn enrollment and step-up authentication for sensitive actions.
- Role-based access control (RBAC) combined with attribute-based access control (ABAC).
- Version-bound approval: every approval is tied to a document version and its content hashes.
- Immutable versioning: approved versions cannot be overwritten; corrections create a new pending version.
- Break-glass (emergency) access with mandatory justification and reauthentication.
- Protected audit trail showing ALLOW / DENY / REVIEW events.
- Risk engine that triggers step-up authentication when anomalous activity is detected.
- Degraded operation when the AI service or the risk engine is unavailable.
- Role separation: physician, digitizer, administrator, auditor.

---

## 🛠️ Tech stack

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript 5.7**
- **Tailwind CSS v4**
- **lucide-react** (icons)

---

## ⚙️ Requirements

- Node.js 20 or higher
- npm (comes with Node.js)

---

## 🚀 Installation and usage

Clone the repository and install dependencies:

```bash
git clone https://github.com/miguelangep1p/Security-of-Information.git
cd Security-of-Information
npm install