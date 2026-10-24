# Zero-GCP Terminal Workflow with `@google/clasp`

This guide explains how to develop, push, and deploy Google Forms Apps Script projects directly from your terminal using Google's official `@google/clasp` CLI tool — **with 100% ZERO Google Cloud Platform (GCP) registration or billing**.

---

## 1. Prerequisites (1-Minute Zero-GCP Setup)

1. **Enable the Google Apps Script API in Drive Settings**:
   - Navigate to [script.google.com/home/usersettings](https://script.google.com/home/usersettings).
   - Toggle **Google Apps Script API** to **ON**.
   - *(Note: This is a user setting inside Google Drive/Apps Script. It does NOT require GCP, project IDs, or payment details).*

2. **Install Clasp Globally**:
   ```bash
   npm install -g @google/clasp
   ```

3. **Log In to Google**:
   ```bash
   clasp login
   ```
   A browser window will open asking you to authorize Clasp with your Google account. Click Allow.

---

## 2. Daily Development Workflow

### Step A: Initialize a Local Project
```bash
mkdir my-automated-form
cd my-automated-form

# Create a standalone Apps Script project on Google Drive:
clasp create --title "Automated Project Intake Form" --type standalone
```
This generates:
- `.clasp.json` (links local folder to the remote Apps Script project ID).
- `appsscript.json` (project manifest).

### Step B: Add Your Script Code
Create `Code.js` (or `Code.gs`) with the V2 Profile template:
- Enforce the 5 non-negotiable rules:
  1. `form.setCollectEmail(false)`
  2. Question 1 is "Name" (`setRequired(false)`)
  3. All questions optional (`setRequired(false)`)
  4. Explicit context in `form.setDescription(...)`
  5. Final question is an open text area (`addParagraphTextItem`)

### Step C: Push Local Files to Google
```bash
clasp push
```

### Step D: Open in Browser (Optional)
```bash
clasp open
```
This opens the project directly on `script.google.com` if you wish to run `createForm` from the GUI.

### Step E: Deploy Web App Directly from CLI (Profile A)
```bash
clasp deploy --description "Production V2 Web App Release"
```
Outputs the deployed Web App URL:
```text
Created version 1.
- AKfycbx... @1.
```
Your endpoint is live at:
`https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`

---

## 3. Querying Responses Programmatically

Once deployed with "Anyone" access, you or your AI agent can query responses without browser interaction:

```bash
# Query all submissions:
curl -L "https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?action=all"

# Query the latest submission:
curl -L "https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?action=latest"

# Query submission count & summary:
curl -L "https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?action=summary"
```
*(Note: Always use `-L` with curl to follow Google's 302 redirect).*
