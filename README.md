# ReTask – Regen mission control

A single web page (`index.html`). It connects to the free Supabase project **retask** (Singapore region) for:

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

### One-time server update for the new password rule

The login server still runs the older rule (at least 8 characters). Until it is updated, short passwords like `Regen1` are refused when you create an account.

You can update it in either of two ways:

- **Ask Claude:** reconnect the Supabase connector in claude.ai Settings → Connectors, then ask Claude to "deploy the ReTask admin-users function".
- **Do it yourself:**
  1. In the Supabase dashboard, open **Project retask → Edge Functions → admin-users → Code**.
  2. Replace the code with the contents of `supabase-functions/admin-users.ts`.
  3. Click **Deploy**.

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

## 3. Put it online free (GitHub Pages)

1. Create a free GitHub account and a **public** repository, e.g. `retask`.
2. Upload `index.html` to it with **Add file → Upload files**.
3. Go to **Settings → Pages**. Under **Source**, choose **Deploy from a branch**, then branch `main`, folder `/root`, and **Save**.
4. After about a minute, your link is `https://<your-github-name>.github.io/retask/`. Share that link with your team.

The page holds no passwords or secret keys. The key inside it is Supabase's public key, which is safe to publish. All data is protected by the login and the role rules on the server.

## 4. Optional: turn on Regen AI (paid per use)

1. Create an API key at console.anthropic.com.
2. In Supabase, go to **Project retask → Edge Functions → Secrets** and add `ANTHROPIC_API_KEY` = your key.
3. Optionally add `RETASK_AI_MODEL` to choose the model. The default is `claude-haiku-5-5`, the cheapest.

Everything else in ReTask works without AI.

## Free-plan limits to know

The Supabase Free plan **pauses a project after 7 days with no activity**. Opening ReTask counts as activity, so daily use keeps it awake. If it ever pauses, restore it from the Supabase dashboard; no data is lost.

Use **System → Copy full backup** weekly and keep the file on the Regen pendrive.
