# ReTask – Regen mission control

A single web page (`index.html`). It connects to the Supabase project **Hafizul Hub** (organisation Spartan, Tokyo region) for:

- username and password logins
- the database
- private file storage
- live updates between everyone using it

## 1. First use: create your admin account

Open `index.html` in Chrome or Edge, on your laptop or phone.

The first time, it asks you to **create the admin account**. Choose your name, a username and a password. This screen appears only once.

**Login rules**
- Username: 3–20 letters or numbers, no spaces. Capitals don't matter (`Hafizul` and `hafizul` are the same login).
- Password: at least 5 letters, at least 1 capital letter and at least 1 number, e.g. `Regen1`.

## 2. Add colleagues

Go to **System → Team & logins → Add a colleague** and enter their:

- full name
- username
- a temporary password (same rules, e.g. `Regen1`)
- role:

| Role   | Can do                                         |
|--------|------------------------------------------------|
| Admin  | Everything, plus create and remove logins      |
| Editor | Add and change tasks, people, documents, files |
| Viewer | Read only                                      |

When you create a login, ReTask copies the login details for you, so you can paste them into WhatsApp. Each colleague changes their own password from the **top-right menu → Change my password**.

## 3. Live link

ReTask is live at **https://hafizulworkingtask.vercel.app**. It is deployed by Vercel from the GitHub repository `hafizuldefectheroes-jpg/hafizulworkingtask`. Every change pushed to the `main` branch goes live automatically.

### Alternative: GitHub Pages (free)

1. Create a free GitHub account and a **public** repository, e.g. `retask`.
2. Upload `index.html` to it with **Add file → Upload files**.
3. Go to **Settings → Pages**. Under **Source**, choose **Deploy from a branch**, then branch `main`, folder `/root`, and **Save**.
4. After about a minute, your link is `https://<your-github-name>.github.io/retask/`. Share that link with your team.

The page holds no passwords or secret keys. The key inside it is Supabase's public key, which is safe to publish. All data is protected by the login and the role rules on the server.

## Regen AI (free, via Vercel AI Gateway)

1. In Vercel, open **AI Gateway → API Keys** and create a key. Every Vercel account gets $5 of free AI Gateway usage every 30 days (free-tier models only, rate limited).
2. In Supabase, go to **Project Hafizul Hub → Edge Functions → Secrets** and add `AI_GATEWAY_API_KEY` = that key.
3. The server tries these models in order and keeps the first one the free tier allows: `anthropic/claude-haiku-5.5`, `deepseek/deepseek-v4.1-flash`, `google/gemini-2.5-flash-lite`, `openai/gpt-5-nano`, `nvidia/nemotron-3.5-lightning-free`. Override with a `RETASK_AI_MODELS` secret (comma separated).
4. Paid alternative: add `ANTHROPIC_API_KEY` instead (used only when no gateway key is set).

Everything else in ReTask works without AI.

## Free-plan limits to know

The Supabase Free plan **pauses a project after 7 days with no activity**. Opening ReTask counts as activity, so daily use keeps it awake. If it ever pauses, restore it from the Supabase dashboard; no data is lost.

Use **System → Copy full backup** weekly and keep the file on the Regen pendrive.

## Personal workspaces

Every login has its own private workspace. A new colleague starts empty and only sees their own tasks, people, documents, research and files. Admins can open any colleague's workspace from the selector in the header (or **Open workspace** in the Team panel); a yellow banner shows whose workspace you're in, and **Back to my workspace** returns you. This is enforced in the database (row-level security on `owner_id`), not just hidden in the app.
