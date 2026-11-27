# Deploying NightWire to Render

NightWire runs as **one Render web service**: Express serves the REST API, Socket.io and the
built React app from the same origin. The database is MongoDB Atlas. Everything below fits in
free tiers.

```
Browser ──HTTPS / WSS──▶ Render web service (Node 22)
                           ├─ /api/*        Express REST API
                           ├─ /socket.io/*  real-time events
                           └─ /*            frontend/dist (React SPA)
                                   │
                                   ├──▶ MongoDB Atlas (data)
                                   ├──▶ Cloudinary (avatars, files)
                                   ├──▶ Resend (email, optional)
                                   └──▶ Arcjet (rate limiting, optional)
```

The deployment is described in [`render.yaml`](../render.yaml) (a Render Blueprint):

| Setting | Value |
| --- | --- |
| Build command | `npm run build`: installs backend prod deps, installs frontend deps, runs `vite build` |
| Start command | `npm start`: `node backend/server.js` |
| Health check | `GET /api/health` |
| Plan / region | Free / Frankfurt |

## 1. MongoDB Atlas

1. **Database Access → Add New Database User.** Create a user just for production (for example
   `nightwire-prod`) with a generated password and the built-in role
   *Read and write to any database*, or a custom role limited to the `nightwire` database.
2. **Network Access → Add IP Address → Allow access from anywhere (`0.0.0.0/0`).**
   Render's free plan has no static outbound IPs, so Atlas cannot whitelist them. Access is
   still protected by the user's password.
3. **Clusters → Connect → Drivers** and copy the connection string. Insert the password and the
   database name before the `?`:

   ```
   mongodb+srv://nightwire-prod:<password>@<cluster>.mongodb.net/nightwire?retryWrites=true&w=majority
   ```

   Use a separate database name (for example `nightwire-demo`) if you want to keep local
   development data apart from the public demo.

## 2. Third-party keys

| Service | Where | Variables | Required? |
| --- | --- | --- | --- |
| Cloudinary | Dashboard → *API Keys* | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | For avatars and file messages |
| Resend | *API Keys* → Create (permission: *Sending access*) | `RESEND_API_KEY`, `EMAIL_FROM` | Optional: without it emails are skipped |
| Arcjet | Create a site → copy the key | `ARCJET_KEY` | Optional: without it rate limiting is off |

> **Resend:** with the test sender `onboarding@resend.dev`, Resend only delivers to the email
> address of your own Resend account. To send verification codes to anyone, verify a domain in
> Resend and use an address on it as `EMAIL_FROM`. Email verification is optional in the app
> (Settings → Account), so the demo works without it.

> **Arcjet** runs in `LIVE` mode when `NODE_ENV=production` (20 requests / 10 s per IP, burst 50)
> and detects Render automatically to read the real client IP. Do not set `ARCJET_ENV` in
> production.

## 3. Render

1. Push the repository to GitHub.
2. Render dashboard → **New → Blueprint** → connect the GitHub repository → Render finds
   `render.yaml`.
3. Fill in the variables marked `sync: false`:

   | Variable | Value |
   | --- | --- |
   | `MONGO_URI` | connection string from step 1 |
   | `CLIENT_URL` | leave empty for now (see step 5) |
   | `RESEND_API_KEY`, `EMAIL_FROM` | from Resend, or leave empty |
   | `CLOUDINARY_*` | from Cloudinary |
   | `ARCJET_KEY` | from Arcjet, or leave empty |

   `NODE_ENV=production`, `EMAIL_FROM_NAME` and a random `JWT_SECRET` are set by the blueprint.
4. **Apply.** The first build takes a few minutes. Watch the logs for
   `[DB] Connected` and `[Server] NightWire running`.
5. Copy the service URL (for example `https://nightwire.onrender.com`), set it as `CLIENT_URL`
   in **Environment**, and save. Render redeploys automatically.
6. Open the URL and sign up. **The first account created becomes the app admin**, so create your
   own account before sharing the link.
7. Optionally load the demo data (see below).

Every push to `main` redeploys automatically (`autoDeploy: true`).

## Demo data

`npm run seed` creates a shared demo account for visitors, four demo contacts with 1:1
conversations (replies, reactions, an edited message, unread messages) and two groups:

| Login | Password |
| --- | --- |
| `demo@nightwire.demo` | `nightwire-demo` (override with `DEMO_PASSWORD`) |

```bash
cd backend
npm run seed          # uses MONGO_URI from backend/.env
```

- It only touches accounts on the `@nightwire.demo` domain. Each run deletes them, their
  messages and the groups they own, then recreates everything, so running it again resets the
  demo after visitors have played with it.
- It refuses to run on a database without an admin, so the admin role (first account) still
  goes to you.
- Seeded messages are not encrypted: a visitor's browser never has the demo account's private
  key, so encrypted history would be unreadable. To see E2E encryption, sign up with two
  accounts in two browsers.
- To seed production from your machine, put the production `MONGO_URI` in `backend/.env` (or
  run `MONGO_URI="..." npm run seed`).

## 4. Keep the demo awake

Free Render services sleep after 15 minutes without traffic and take about a minute to wake up.
A free uptime monitor avoids that cold start for visitors:

1. Create a free account on [UptimeRobot](https://uptimerobot.com) (or
   [cron-job.org](https://cron-job.org)).
2. **New monitor → HTTP(s)**, URL `https://<your-service>.onrender.com/api/health`,
   interval **5 minutes**.
3. Optionally enable email alerts. You also get downtime notifications.

One always-on service uses about 744 of the 750 free instance hours Render gives per month, so
keep only this one free service awake.

## 5. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Deploy fails with `[Config] Missing required environment variables` | Set `MONGO_URI` (and `JWT_SECRET` if you removed it from the blueprint). |
| `[DB] Connection failed … IP that isn't whitelisted` | Atlas Network Access must include `0.0.0.0/0`; check that the cluster is not paused. |
| Login works but the page shows you logged out | The cookie is `Secure` + `SameSite=Strict`: open the app via its `https://…onrender.com` URL, not through another domain or proxy. |
| Images / files fail to upload | Check the three `CLOUDINARY_*` variables. |
| No verification email | Expected without a verified Resend domain (see the Resend note). |
| Changing `JWT_SECRET` | Logs every user out; nothing else is affected. |

## Running the production build locally

```bash
npm run build                      # same as Render
cd backend && NODE_ENV=production node --env-file=.env server.js
# open http://localhost:3000 (UI, API and Socket.io on one port)
```

Note: `npm run build` installs backend dependencies with `--omit=dev`; run `npm install` in
`backend/` again before running the backend unit tests.
