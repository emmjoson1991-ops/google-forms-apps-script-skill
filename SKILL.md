---
name: google-form-apps-script
description: >-
  Generate Google Forms programmatically using Google Apps Script (FormApp) and retrieve
  submitted responses into structured JSON. Supports V1 execution logs, V2 Web App HTTP JSON APIs,
  and V2 outbound webhooks — all requiring 100% ZERO Google Cloud Platform (GCP) registration.
  Enforces strict defaults: no email collection, question 1 is Name (optional), never require responses,
  explicit context description, and unconstrained final text box.
metadata:
  version: v2
---

# Google Form Apps Script Skill (`google-form-apps-script`) - Version 2.0

This skill enables an LLM or developer to design, programmatically construct, manage, and extract data from **Google Forms** using **Google Apps Script** (`FormApp`, `ContentService`, `UrlFetchApp`, `SpreadsheetApp`).

> [!IMPORTANT]
> **Zero Google Cloud Platform (GCP) Registration Required**
> Everything in V2 operates entirely inside standard Google Drive and Google Apps Script (`script.google.com`). You do **NOT** need a Google Cloud account, project ID, billing account, or GCP credentials. It works on any free personal `@gmail.com` or Google Workspace account out of the box.

---

## 1. Non-Negotiable Core Rules

Whenever generating a Google Form via Google Apps Script:

1. **Email Collection Off by Default**:
   Always invoke `form.setCollectEmail(false)` unless explicitly instructed to collect emails.
2. **First Question is Always "Name"**:
   Question 1 must always be:
   ```javascript
   form.addTextItem()
     .setTitle("Name")
     .setHelpText("Please enter your name (optional)")
     .setRequired(false);
   ```
3. **Never Require Any Specific Response**:
   All questions must remain strictly optional (`.setRequired(false)`). Never block form submission by requiring any specific question, field, or response (including Name).
4. **Form Must Provide Explicit Context (Why It Exists)**:
   The form description (`form.setDescription(...)`) MUST clearly explain why the form exists, the background situation, how responses will be used, and the expected time commitment. Never leave it blank or generic.
5. **Final Question is Always an Open Freeform Text Area**:
   The very last question of every form must ALWAYS be a long paragraph text item (`form.addParagraphTextItem()`) where the user can write in any format or manner she pleases. Must also be `.setRequired(false)`.
6. **Dual-Function / Multi-Profile Integrity**:
   Always provide self-contained, runnable code. The user only ever has to paste once.
7. **On-Demand or Configured Webhook Only**:
   Do not attach unsolicited notification spam.

---

## 2. V2 Architecture & Delivery Profiles

V2 introduces three streamlined delivery profiles to match the user's workflow:

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   V2 DELIVERY PROFILES MATRIX                                     │
├─────────────────┬───────────────────────────────┬─────────────────────────┬───────────────────────┤
│ Profile         │ How LLM / User Gets Responses │ Setup Effort            │ GCP Needed?           │
├─────────────────┼───────────────────────────────┼─────────────────────────┼───────────────────────┤
│ Profile A (API) │ HTTP GET /exec endpoint (JSON)│ 1-Click Deploy Web App  │ NO (100% Free Apps    │
│                 │ (curl / direct agent fetch)   │                         │     Script Web App)   │
├─────────────────┼───────────────────────────────┼─────────────────────────┼───────────────────────┤
│ Profile B (Push)│ Instant HTTP POST to Webhook  │ Provide webhook URL     │ NO (Native            │
│                 │ (Relay, Slack, Discord, API)  │                         │     UrlFetchApp)      │
├─────────────────┼───────────────────────────────┼─────────────────────────┼───────────────────────┤
│ Profile C (V1)  │ Apps Script Execution Log JSON│ Zero setup (paste & run)│ NO                    │
│                 │ (Manual copy-paste into chat) │                         │                       │
└─────────────────┴───────────────────────────────┴─────────────────────────┴───────────────────────┘
```

---

## 3. Profile A: Deployable Web App HTTP JSON API (Recommended)

Profile A turns your Google Form and Apps Script project into a persistent REST-like JSON API. Once deployed, an LLM or local tool can fetch responses automatically via HTTP GET without opening Google Forms or checking logs.

### Complete Profile A Template (`Code.gs`)

```javascript
/**
 * =========================================================================
 * PROFILE A: FORM CREATOR & HTTP GET WEB APP ENDPOINT
 * =========================================================================
 * Setup:
 * 1. Paste into script.google.com and run 'createForm'.
 * 2. Click 'Deploy' > 'New deployment' > Select type: 'Web app'.
 * 3. Set 'Execute as: Me' and 'Who has access: Anyone'.
 * 4. Click 'Deploy'. Use the generated Web App URL to fetch JSON anytime!
 */

function createForm() {
  const form = FormApp.create("TASK_TITLE_HERE");

  // RULE 4: Explicit context
  form.setDescription(
    "WHY THIS FORM EXISTS: [Explain why this form was created, the background situation, " +
    "how responses will be used, and time commitment.]"
  );
  form.setConfirmationMessage("Responses recorded! You can safely close this window.");
  form.setAllowResponseEdits(true);
  form.setShowLinkToRespondAgain(false);
  
  // RULE 1: Default to NO email collection
  form.setCollectEmail(false);

  // RULE 2: Question 1 is ALWAYS Name
  // RULE 3: NEVER require any specific response
  form.addTextItem()
    .setTitle("Name")
    .setHelpText("Please enter your name (optional)")
    .setRequired(false);

  // --- CUSTOM QUESTIONS GO HERE ---
  // (All questions must use .setRequired(false))

  // RULE 5: Final question is ALWAYS an unconstrained freeform text area
  form.addParagraphTextItem()
    .setTitle("Final Thoughts & Open Notes")
    .setHelpText("Feel free to write anything else you'd like to share in any way you please.")
    .setRequired(false);

  // Save Form ID for the Web App endpoint
  const formId = form.getId();
  PropertiesService.getScriptProperties().setProperty("ACTIVE_FORM_ID", formId);

  Logger.log("\n=======================================================");
  Logger.log("🎉 FORM CREATED SUCCESSFULLY!");
  Logger.log("👉 LIVE FORM URL: " + form.getPublishedUrl());
  Logger.log("🛠️ EDIT FORM URL: " + form.getEditUrl());
  Logger.log("📋 FORM ID: " + formId);
  Logger.log("=======================================================\n");
  Logger.log("NEXT STEP: Click Deploy > New deployment > Web app to enable HTTP JSON retrieval.");

  return formId;
}

/**
 * Handles HTTP GET requests to the deployed Web App URL.
 * URL: https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec
 * Query Parameters:
 *   ?action=all       -> Returns all submissions (default)
 *   ?action=latest    -> Returns only the most recent submission
 *   ?action=summary   -> Returns submission count & status
 */
function doGet(e) {
  try {
    const formId = PropertiesService.getScriptProperties().getProperty("ACTIVE_FORM_ID");
    if (!formId) {
      return respondJson({ status: "error", message: "No form found. Run createForm first." });
    }

    const form = FormApp.openById(formId);
    const responses = form.getResponses();
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "all";

    if (action === "summary") {
      return respondJson({
        status: "success",
        formTitle: form.getTitle(),
        totalSubmissions: responses.length,
        isAcceptingResponses: form.isAcceptingResponses()
      });
    }

    const formatted = responses.map((resp, index) => {
      const answers = {};
      resp.getItemResponses().forEach(item => {
        answers[item.getItem().getTitle()] = item.getResponse();
      });
      return {
        submission: index + 1,
        timestamp: resp.getTimestamp().toISOString(),
        respondentEmail: resp.getRespondentEmail() || "Anonymous",
        answers: answers
      };
    });

    if (action === "latest") {
      return respondJson({
        status: "success",
        totalSubmissions: formatted.length,
        latestSubmission: formatted.length > 0 ? formatted[formatted.length - 1] : null
      });
    }

    return respondJson({
      status: "success",
      totalSubmissions: formatted.length,
      submissions: formatted
    });

  } catch (error) {
    return respondJson({ status: "error", message: error.toString() });
  }
}

function respondJson(data) {
  return ContentService.createTextOutput(JSON.stringify(data, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

// Fallback manual retrieval for V1 compatibility
function getFormResponses() {
  const formId = PropertiesService.getScriptProperties().getProperty("ACTIVE_FORM_ID");
  const form = FormApp.openById(formId);
  const data = form.getResponses().map((resp, i) => {
    const answers = {};
    resp.getItemResponses().forEach(item => { answers[item.getItem().getTitle()] = item.getResponse(); });
    return { submission: i + 1, timestamp: resp.getTimestamp().toISOString(), answers };
  });
  Logger.log("\n" + JSON.stringify(data, null, 2) + "\n");
}
```

---

## 4. Profile B: Outbound Webhook Push (`onFormSubmit`)

Profile B automatically notifies an external webhook (e.g. a local server, Slack channel, Discord webhook, or automation endpoint) the instant a respondent hits Submit.

### Complete Profile B Template (`Code.gs`)

```javascript
/**
 * =========================================================================
 * PROFILE B: OUTBOUND REAL-TIME WEBHOOK TRIGGER
 * =========================================================================
 * Submits form responses directly to an HTTP POST destination.
 * Zero GCP setup — uses native UrlFetchApp and ScriptApp triggers.
 */

const TARGET_WEBHOOK_URL = "https://your-webhook-endpoint.com/api/responses";

function createWebhookForm() {
  const form = FormApp.create("Intake Survey with Push Webhook");

  // RULE 4: Explicit context
  form.setDescription("WHY THIS FORM EXISTS: Intake survey with real-time automated dispatch.");
  form.setConfirmationMessage("Responses recorded and dispatched! Thank you.");
  
  // RULE 1: Default to NO email collection
  form.setCollectEmail(false);

  // RULE 2 & 3: Question 1 is Name (optional)
  form.addTextItem().setTitle("Name").setRequired(false);

  // Custom questions (all setRequired(false))
  form.addParagraphTextItem().setTitle("Project Scope & Requirements").setRequired(false);

  // RULE 5: Final question is freeform
  form.addParagraphTextItem()
    .setTitle("Final Thoughts & Open Notes")
    .setHelpText("Write anything else you'd like to share in any way you please.")
    .setRequired(false);

  const formId = form.getId();
  PropertiesService.getScriptProperties().setProperty("ACTIVE_FORM_ID", formId);

  // Automatically attach installable trigger (No manual trigger setup needed!)
  ScriptApp.newTrigger("handleFormSubmit")
    .forForm(form)
    .onFormSubmit()
    .create();

  Logger.log("🎉 Form and trigger created! Live URL: " + form.getPublishedUrl());
}

/**
 * Triggered automatically by Google whenever the form is submitted.
 */
function handleFormSubmit(e) {
  try {
    const formResponse = e.response;
    const answers = {};

    formResponse.getItemResponses().forEach(itemResp => {
      answers[itemResp.getItem().getTitle()] = itemResp.getResponse();
    });

    const payload = {
      event: "form_submission",
      formTitle: e.source.getTitle(),
      timestamp: formResponse.getTimestamp().toISOString(),
      respondentEmail: formResponse.getRespondentEmail() || "Anonymous",
      answers: answers
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const res = UrlFetchApp.fetch(TARGET_WEBHOOK_URL, options);
    Logger.log("Webhook response code: " + res.getResponseCode());
  } catch (err) {
    Logger.log("Error dispatching webhook: " + err.toString());
  }
}
```

---

## 5. Question Item Catalog (`FormApp` Methods)

Always enforce `.setRequired(false)` across all items:

| Question Type | Apps Script Method | Example Code |
|---|---|---|
| **Short Text** | `addTextItem()` | `.setTitle("Project Nickname").setRequired(false)` |
| **Long Text** | `addParagraphTextItem()` | `.setTitle("Description").setRequired(false)` |
| **Multiple Choice** | `addMultipleChoiceItem()` | `.setTitle("Track").setChoiceValues(["A", "B"]).setRequired(false)` |
| **Checkboxes** | `addCheckboxItem()` | `.setTitle("Skills").setChoiceValues(["JS", "Python"]).showOtherOption(true).setRequired(false)` |
| **Dropdown** | `addListItem()` | `.setTitle("Region").setChoiceValues(["US", "EU"]).setRequired(false)` |
| **Linear Scale** | `addScaleItem()` | `.setTitle("Rating").setBounds(1, 5).setLabels("Min", "Max").setRequired(false)` |
| **Date & Time** | `addDateItem()` / `addTimeItem()` | `.setTitle("Kickoff Date").setIncludesYear(true).setRequired(false)` |
| **Choice Grid** | `addGridItem()` | `.setTitle("Priority").setRows([...]).setColumns([...]).setRequired(false)` |
| **Checkbox Grid**| `addCheckboxGridItem()` | `.setTitle("Matrix").setRows([...]).setColumns([...]).setRequired(false)` |
| **Section Break**| `addPageBreakItem()` | `.setTitle("Section 2: Details")` |

---

## 6. Dynamic Page Branching (Skip Logic)

```javascript
// Branching with all optional inputs:
const pageA = form.addPageBreakItem().setTitle("Path A");
const pageB = form.addPageBreakItem().setTitle("Path B");
const finalPage = form.addPageBreakItem().setTitle("Final Overview");

const router = form.addMultipleChoiceItem();
router.setTitle("Choose your path")
  .setChoices([
    router.createChoice("Go to Path A", pageA),
    router.createChoice("Go to Path B", pageB)
  ])
  .setRequired(false);

pageA.setGoToPage(finalPage);
pageB.setGoToPage(finalPage);
```

---

## 7. Zero-GCP Terminal Tooling: `@google/clasp`

You can develop, push, and deploy scripts from your local terminal using Google's open-source CLI `@google/clasp` **without Google Cloud Platform registration**:

### One-Time Setup:
1. Open [script.google.com/home/usersettings](https://script.google.com/home/usersettings) in your browser.
2. Toggle **Google Apps Script API** to **ON**. (This is a 1-click Drive setting, NOT GCP).
3. In your terminal:
   ```bash
   npm install -g @google/clasp
   clasp login
   ```

### Daily Workflow:
```bash
# Create a new Apps Script project directly in your Google Drive:
clasp create --title "My Automated Google Form" --type standalone

# Push local Code.gs to Google:
clasp push

# Deploy as Web App directly from CLI:
clasp deploy --description "Production V2 Web App"
```

---

## 8. Reference Implementations

The following complete, tested reference files are provided in the skill:
- [`references/hotel_guest_experience_survey.gs`](./references/hotel_guest_experience_survey.gs) - Complete survey showcase with branching, grids, and all question types.
- [`references/v2_webapp_api_form.gs`](./references/v2_webapp_api_form.gs) - Complete Profile A implementation with `doGet(e)` JSON endpoints.
- [`references/v2_webhook_push_form.gs`](./references/v2_webhook_push_form.gs) - Complete Profile B implementation with automated `onFormSubmit` outbound push.
- [`references/v2_workspace_sheets_summary.gs`](./references/v2_workspace_sheets_summary.gs) - Linked Google Sheets sync and analytics.
- [`scripts/validate_form_script.js`](./scripts/validate_form_script.js) - Automated Node.js rule validator that verifies code against the 5 non-negotiable rules.
- [`templates/clasp_workflow.md`](./templates/clasp_workflow.md) - Zero-GCP terminal workflow using `@google/clasp`.

---

## 9. Checklist for the LLM

Before providing any script to the user:
- [ ] Is `form.setCollectEmail(false)` explicitly invoked?
- [ ] Is Question 1 **"Name"** (`addTextItem`) and marked optional (`.setRequired(false)`)?
- [ ] Does `form.setDescription(...)` provide explicit context explaining **why the form exists** and how answers will be used?
- [ ] Are ALL questions strictly optional (`.setRequired(false)`) so no specific response is ever required?
- [ ] Is the final question an open freeform paragraph text area (`addParagraphTextItem`) allowing the user to write text any way she pleases?
- [ ] Are all functions self-contained so the user copies once?
- [ ] Is `PropertiesService.getScriptProperties().setProperty("ACTIVE_FORM_ID", formId)` included?
