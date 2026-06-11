    # Campus Notification Platform — Interview Script

This script is designed to help you guide an interviewer through the architecture, technical decisions, and algorithms used in the Campus Notification Platform.

---

## 1. The Elevator Pitch (Introduction)
**Interviewer:** *"Can you walk me through the campus notification platform you built?"*

**You:**
> "Sure. I built a full-stack real-time campus notification platform using **Next.js** for the frontend and **Node.js/Express** for the backend. 
> 
> The core goal was to securely fetch, filter, and prioritize notifications from the Affordmed evaluation API. Instead of connecting the frontend directly to the external API, I built the Express backend to act as a **secure proxy**. This allowed me to abstract away token management, securely route logs without exposing credentials to the browser, and implement an efficient priority sorting algorithm on the server."

---

## 2. Security & Architecture (The "Why")
**Interviewer:** *"Why did you use a Node.js backend instead of just calling the Affordmed API directly from Next.js?"*

**You:**
> "I took a **Zero-Trust approach** to the frontend. If I called the Affordmed API directly from the browser, I would have to expose the client ID and secret in the frontend bundle. 
>
> By putting an Express backend in the middle:
> 1. Credentials stay strictly on the server.
> 2. The frontend doesn't need to worry about OAuth or token expiration.
> 3. I could implement a `/api/log` endpoint on my backend. The frontend POSTs its logs there, and the backend attaches the secure Bearer token before forwarding it to the Affordmed logging service. This ensures end-to-end logging without compromising security."

---

## 3. Token Lifecycle Management
**Interviewer:** *"How did you handle authentication with the external API?"*

**You:**
> "I built an `authService` in the backend that handles the token lifecycle automatically. 
> 
> Instead of refreshing the token only *after* a request fails with a 401 Unauthorized, I implemented a **preemptive refresh strategy**. Every time a service requests the token, the `authService` checks the expiration time. If the token expires within the next **5 minutes**, it fetches a fresh token in the background before returning it. 
> 
> This guarantees that in-flight requests never fail due to token expiration, and keeps the rest of the application completely decoupled from auth logic."

---

## 4. The Priority Algorithm (Stage 6)
**Interviewer:** *"Can you explain how the Priority Inbox works?"*

**You:**
> "The priority inbox ranks notifications by combining their inherent importance with their recency. 
> 
> I used the formula: `Score = Weight / (Age_in_hours + 1)`. 
> I assigned weights: Placement = 3, Result = 2, and Event = 1. The `+1` in the denominator prevents division by zero for brand new notifications. This naturally causes a high-priority Placement notification to decay over time, allowing a fresh Result notification to eventually overtake it.
>
> **For the data structure:** If I'm fetching a batch of historical data, a simple `O(M log M)` sort works fine. But for the real-time streaming requirement, re-sorting the entire array for every new notification is inefficient. 
> Instead, I built a `PriorityInbox` class that maintains exactly the top `N` items (e.g., top 10). When a new notification streams in, I calculate its score and compare it to the *minimum* score in the current top 10. If it beats the minimum, I drop the lowest item, insert the new one, and re-sort just those 10 items. This gives an **O(N) insertion time**, where N is the inbox capacity, not the total number of notifications."

---

## 5. Frontend Optimization (Read Tracking)
**Interviewer:** *"How are you tracking whether a user has viewed a notification?"*

**You:**
> "Since I needed this state to persist across page reloads without adding a database overhead for every single click, I utilized the browser's `localStorage`.
>
> Inside my `useViewedNotifications` custom React hook, I store the viewed notification IDs. Crucially, I load these IDs into a **JavaScript `Set`**. 
> 
> When rendering the UI, the frontend needs to check if *each* notification is read to display the 'New' badge. If I used an array, `array.includes(id)` would be an `O(K)` operation for every notification, resulting in `O(N * K)` overall. By using a `Set`, `set.has(id)` is an **O(1) constant-time lookup**, making the render cycle highly performant regardless of how many notifications the user has seen."

---

## Closing Strong
**You:**
> "Overall, I treated this not just as a coding test, but as a production system. I implemented fail-fast environment variable validation on server startup, strictly typed API boundaries with TypeScript, and ensured the frontend and backend architectures mirrored each other logically."
