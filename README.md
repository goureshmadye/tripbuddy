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
- **Global Pricing:** Automatic currency conversion and localized pricing for subscriptions.
- **Guest Mode:** Explore the app with limited features before signing up.

---

## 🛠️ Tech Stack

- **Frontend:** React Native (Expo, TypeScript)
- **Backend:** Node.js/Express.js.
- **Auth & Storage:** Firebase (Auth, Firestore, Storage, Messaging)
- **Maps:** Google Maps SDK & Places API
- **AI:** Gemini/OpenAI API
- **Payments:** Razorpay (Native SDK)

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

---

## 1\. Executive Summary

TripBuddy is a mobile-first application designed to streamline travel planning. It solves the fragmentation problem of using spreadsheets, group chats, and disparate booking apps. By centralizing itineraries, expenses, documents, and real-time collaboration, TripBuddy acts as a single source of truth for solo travelers and groups.

## **2\. Functional Specifications (MVP)**

### 2.1. Authentication & Onboarding

- **Methods:** Email/Password, Google OAuth (via Firebase).
- **Profile Setup:** Name, Profile Photo, Default Currency (USD default), Home Country.
- **Intro Walkthrough:** Carousel highlighting visual planning, expense splitting, and offline capabilities.

### 2.2. Trip Management

- **Creation:** Users can create trips with a Title, Dates, Transportation Mode, and Trip Type (Leisure, Business, Adventure).
- **Dashboard:** "My Trips" view showing upcoming, past, and drafted trips.

### 2.3. Collaborative Itinerary

- **Views:**
  - **Timeline:** Chronological list of activities.
  - **Map:** Geospatial view of daily pins.
  - **List:** Compact view.
- **Item Details:** Title, Location (Lat/Long), Time, Notes, Tags.
- **Collaboration:** Real-time editing by "Editors." Comments on specific itinerary items.

### 2.4. Expense Tracking & Splitting

- **Entry:** Record expenses with Amount, Payer, and Beneficiaries (who the cost is split with).
- **Settlement:** Calculate "Who owes whom."
- **Payment:** Integration with Google Pay/UPI for settling debts.

### 2.5. Documents & Offline Mode

- **Storage:** Upload tickets, hotel vouchers, and IDs.
- **Offline Sync:** Read-only access to itinerary and documents when no internet is available.

## 3\. System Architecture

### 3.1. External Integrations

| Service                      | Purpose                                                  |
| ---------------------------- | -------------------------------------------------------- |
| Google Maps SDK & Places API | Rendering maps, autocomplete search, routing.            |
| Razorpay                     | Native SDK for subscription payments and settlements.    |
| Gemini API                   | AI-powered itinerary suggestions and route optimization. |
| Firebase Cloud Messaging     | Real-time push notifications.                            |
| Nylas / MailboxLayer         | Email parsing for auto-importing bookings.               |

## 4\. Development Roadmap

### Phase 1: Foundation (Weeks 1-4)

### Phase 2: Core Experience (Weeks 5-8)

### Phase 3: Utility Features (Weeks 9-12)

### Phase 4: Polish & Pro (Weeks 13-16)
