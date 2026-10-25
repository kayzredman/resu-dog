# Resu-Dog — Tech stack recommendation

## Is the stack a burden?

**For your users:** no. There's no account: upload, about a minute's wait, done.
**For you (the builder):** it's heavier than it needs to be. Here's how to make it lighter.

## Recommended setup: the least to run and maintain

| Piece | Use | Why |
| --- | --- | --- |
| App and API | **One Next.js app on Vercel** (already built) | One codebase for the website and the API. Free tier to start. |
| Storage and rate limits | **Upstash Redis** (already wired in) | Serverless, nothing to manage, free tier. |
| AI | **OpenAI**, but **2–3 calls per resume instead of 6** | Halves the wait and the cost, with fewer failure points. |
| Phone experience (now) | **Make the website an installable PWA** | People "install" it from their browser. One interface to maintain, no app-store fees or reviews. |
| Phone apps (later) | **The Expo app in `mobile/`** | Already built against the same API. Ship it to the stores once people are asking for it. |
| Payments (when needed) | **Lemon Squeezy or Paddle** ("merchant of record") | They handle global sales tax and VAT for you. **Paystack** if you're selling mainly in Africa. |
| Accounts (when needed) | **Clerk or Supabase Auth** | Only once you add saved history or paid plans. |

## Remove
- **The old FastAPI `backend/` folder.** It duplicates the Next.js API and is already out of date. That's one less thing to host and update.

## Order of work
1. Delete `backend/`, put the project in git, and deploy `frontend/` to Vercel.
2. Merge the AI pipeline into fewer calls.
3. Make the website an installable PWA.
4. Launch, and learn from real users.
5. Then: payments, accounts, and the app-store versions.
