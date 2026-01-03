# TripBuddy

Plan trips together, travel smarter.

---

## 🚀 Overview

TripBuddy is a collaborative, mobile-first travel planning app. It centralizes itineraries, expenses, documents, and real-time collaboration—solving the chaos of spreadsheets, group chats, and scattered booking apps. Powered by AI and designed for seamless teamwork, TripBuddy is your single source of truth for solo and group adventures.

---

## ✨ Features

- **Collaborative Trip Planning:** Real-time editing, invite friends, assign roles.
- **Multiple Itinerary Views:** Timeline, Map, and List for flexible planning.
- **Expense Tracking & Auto-Split:** Log, split, and settle expenses with ease.
- **Document Upload & Offline Access:** Store tickets, IDs, and access plans offline.
- **AI-Powered Suggestions:** Get smart itinerary ideas and route optimization (Gemini/OpenAI).
- **Push Notifications:** Stay updated on trip changes and invites.
- **Subscription Plans:** Free, Pro, and Teams with feature gating and usage tracking.

---

## 🛠️ Tech Stack

- **Frontend:** React Native (Expo, TypeScript)
- **Backend:** Node.js/Express.js (planned/optional), Prisma ORM, PostgreSQL
- **Auth & Storage:** Firebase (Auth, Firestore, Storage, Messaging)
- **Maps:** Google Maps SDK & Places API
- **AI:** Gemini/OpenAI API
- **Payments:** Stripe, Google Pay

---

## 📁 Folder Structure

```
app/           # Screens & navigation
components/    # Reusable UI & logic components
hooks/         # Custom React hooks
services/      # API & business logic (auth, firestore, notifications, AI)
types/         # TypeScript types & interfaces
utils/         # Utility functions
assets/images/ # App icons, screenshots, illustrations
```

---

## 🏁 Getting Started

1. **Install dependencies:**

```sh
npm install
```

2. **Start the app:**

```sh
npx expo start --clear
```

3. **Platform-specific:**

```sh
npm run android   # Android
npm run ios       # iOS
npm run web       # Web
```

---

## 🔑 Subscription Plans & Feature Gating

| Feature           | Free Plan  | Pro ($4.99/mo)         | Teams ($99/yr)   |
| ----------------- | ---------- | ---------------------- | ---------------- |
| Collaborators     | Max 2      | Unlimited              | Up to 10 Members |
| Expenses          | 10 Entries | Unlimited + Auto-split | Unlimited        |
| Docs              | 5 Uploads  | Unlimited + Scanning   | Unlimited        |
| AI                | None       | Itinerary Suggestions  | Shared Templates |
| Offline           | Read-Only  | Full Sync              | Full Sync        |
| Team Dashboard    | No         | No                     | Yes              |
| Role-based Access | No         | No                     | Yes              |
| Priority Support  | No         | Yes                    | Yes              |

Features like auto-split, AI suggestions, unlimited uploads, and advanced exports are gated by plan. Upgrade in-app for more power.

---

## 🤖 AI Integration

- **Gemini/OpenAI:** Get smart itinerary suggestions, route optimization, and travel highlights.

---

## 🌐 Offline Support

- Access itineraries, documents, and maps in read-only mode when offline.

---

## 🖼️ Screenshots

Below are screenshots of the main app screens (Version 01):

<div align="center">
  <img src="assets/images/trips_screen.jpg" alt="Trips Screen" width="200" />
  <img src="assets/images/itenary_screen.jpg" alt="Itinerary Screen" width="200" />
  <img src="assets/images/expenses_screen.jpg" alt="Expenses Screen" width="200" />
  <img src="assets/images/documents_screen.jpg" alt="Documents Screen" width="200" />
</div>

<div align="center">
  <img src="assets/images/maps_screen.jpg" alt="Maps Screen" width="200" />
  <img src="assets/images/notifications_screen.jpg" alt="Notifications Screen" width="200" />
  <img src="assets/images/profile_screen.jpg" alt="Profile Screen" width="200" />
  <img src="assets/images/subscription_screen.jpg" alt="Subscription Screen" width="200" />
  <img src="assets/images/trip_members_screen.jpg" alt="Trip Members Screen" width="200" />
</div>

