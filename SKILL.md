---
name: google-form-apps-script
description: >-
  Generate unbiased, asynchronous Google Forms programmatically using Google Apps Script (FormApp)
  and retrieve submitted responses as structured JSON. Eliminates LLM confirmation bias and
  conversational bloat via deterministic "If X, Then Y" question routing. Supports V3 Web App
  HTTP JSON APIs, outbound webhooks, and execution log dumpers with 100% ZERO Google Cloud
  Platform (GCP) registration.
metadata:
  version: v3.0
---

# Google Form Apps Script Skill (`google-form-apps-script`) - Version 3.0

This skill enables an AI agent or developer to replace verbose, biased back-and-forth interrogation with clean, asynchronous **Google Forms** built via **Google Apps Script** (`FormApp`, `ContentService`, `UrlFetchApp`).

> [!IMPORTANT]
> **Zero Google Cloud Platform (GCP) Registration Required**
> Everything in V3 operates 100% inside standard Google Drive and Google Apps Script (`script.google.com`). You do **NOT** need a Google Cloud account, project ID, billing account, OAuth consent screen, or service account keys. It works out of the box on any free `@gmail.com` or Google Workspace account.

---

## 1. Non-Negotiable Core Invariants

Every generated Google Form script MUST obey these seven structural invariants:

1. **Email Collection Disabled by Default**:
   Always invoke `form.setCollectEmail(false)` unless the user explicitly requests email collection.
2. **Question 1 is Always "Name"**:
   The very first question added to the form must always be:
   ```javascript
   form.addTextItem()
     .setTitle("Name")
     .setHelpText("Please enter your name or handle (optional)")
     .setRequired(false);
   ```
3. **Never Require Any Specific Response**:
   Every single question item on the form must explicitly invoke `.setRequired(false)`. Never use `.setRequired(true)` or block submission on any field.
4. **Explicit Context Description (Why This Form Exists)**:
   `form.setDescription(...)` must clearly state why the form was generated, what architectural or operational decision it unblocks, how the JSON output will be consumed, and the estimated completion time.
5. **Final Question is Always an Unconstrained Freeform Text Area**:
   The last question added to the form must always be an open `form.addParagraphTextItem()` with `.setRequired(false)` so the respondent can override assumptions or write arbitrary notes.
6. **Self-Contained Paste-Once Execution**:
   All generated `.gs` files must be 100% self-contained with zero placeholders or missing helper functions.
7. **State Persistence via `PropertiesService`**:
   Always store the generated form ID via `PropertiesService.getScriptProperties().setProperty("ACTIVE_FORM_ID", formId)` so HTTP endpoints and triggers locate the form dynamically.

---

## 2. Deterministic Anti-Bias Question Routing ("If X, Then Y")

AI agents suffer from severe confirmation bias when writing multiple-choice questions: they present one "happy path" option alongside two or three strawmen. V3 strictly prohibits subjective multiple-choice questions and enforces deterministic routing:

| Decision Context (If X...) | Required `FormApp` Method (...Then Use Y) | Structural Enforcement Rules |
|---|---|---|
| **Balancing two competing trade-offs** *(e.g., latency vs. verification depth, simplicity vs. throughput)* | `form.addScaleItem()` | **Bipolar Linear Scale (1 to 5):** Both endpoints must be labeled with valid, contrasting engineering priorities. Generic labels (`"Low"/"High"`, `"Min"/"Max"`, `"Bad"/"Good"`) are forbidden. |
| **Evaluating multi-dimensional system constraints** *(e.g., RAM, cost, cold-start, ops burden)* | `form.addGridItem()` | **Constraint Tolerance Matrix:** Rows must be the specific system dimensions. Columns must be uniform tolerance tiers: `["Strict / Zero Tolerance", "Flexible / Negotiable", "Irrelevant / Ignore"]`. |
| **Selecting non-exclusive components, features, or architecture modules** | `form.addCheckboxItem()` | **Failure-Mode / Downside Checkboxes:** Every choice value must be phrased strictly as its primary maintenance burden, resource cost, or failure mode. Positive marketing words (`"Seamless"`, `"Fast"`, `"Recommended"`, `"Optimal"`) are banned. |
| **Defining hard operational boundaries, numeric caps, or invariants** | `form.addTextItem()` | **Scalar / Invariant Input:** Ask for an exact numeric ceiling, timeout, path, or invariant string rather than pre-bucketed multiple-choice tiers. |
| **Selecting mutually exclusive factual enums** *(e.g., target OS, runtime environment)* | `form.addMultipleChoiceItem()` | **Restricted Enum Only:** Prohibited for subjective choices or strategy selection. Permitted *only* for factual enums and MUST be preceded by the comment `// @allow-enum-mc` to pass static validation. |

---

## 3. V3 Delivery Profiles Matrix

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   V3 DELIVERY PROFILES MATRIX                                     │
├─────────────────┬───────────────────────────────┬─────────────────────────┬───────────────────────┤
│ Profile         │ How Agent / User Gets JSON    │ Setup Effort            │ GCP Needed?           │
├─────────────────┼───────────────────────────────┼─────────────────────────┼───────────────────────┤
│ Profile A (API) │ HTTP GET /exec endpoint (JSON)│ 1-Click Deploy Web App  │ NO (100% Free Apps    │
│                 │ (curl / direct agent fetch)   │ or `clasp deploy`       │     Script Web App)   │
├─────────────────┼───────────────────────────────┼─────────────────────────┼───────────────────────┤
│ Profile B (Push)│ Instant HTTP POST to Webhook  │ Set TARGET_WEBHOOK_URL  │ NO (Native            │
│                 │ (Relay, local daemon, Slack)  │ & run setup function    │     UrlFetchApp)      │
├─────────────────┼───────────────────────────────┼─────────────────────────┼───────────────────────┤
│ Profile C (Log) │ Apps Script Execution Log JSON│ Zero setup (paste & run)│ NO                    │
│                 │ (`getFormResponses()`)        │                         │                       │
└─────────────────┴───────────────────────────────┴─────────────────────────┴───────────────────────┘
```

---

## 4. Profile A: Deployable Web App HTTP JSON API (`Code.gs`)

```javascript
/**
 * =========================================================================
 * PROFILE A: ANTI-BIAS FORM CREATOR & HTTP GET JSON ENDPOINT (V3.0)
 * =========================================================================
 * Setup:
 * 1. Paste into script.google.com and run 'createForm'.
 * 2. Click 'Deploy' > 'New deployment' > Select type: 'Web app'.
 * 3. Set 'Execute as: Me' and 'Who has access: Anyone'.
 * 4. Fetch structured JSON anytime via:
 *    curl -sL "[https://script.google.com/macros/s/](https://script.google.com/macros/s/){DEPLOYMENT_ID}/exec?action=latest"
 */

function createForm() {
  const form = FormApp.create("System Architecture & Constraint Alignment");

  // INVARIANT 4: Explicit context
  form.setDescription(
    "WHY THIS FORM EXISTS: This form resolves architectural trade-offs and operational boundaries " +
    "without conversational back-and-forth. Responses are serialized directly into structured JSON " +
    "for automated agent ingestion. Estimated time: 2 minutes. All fields are optional."
  );
  form.setConfirmationMessage("Responses recorded. The agent can now query the JSON endpoint.");
  form.setAllowResponseEdits(true);
  form.setShowLinkToRespondAgain(false);

  // INVARIANT 1: Email collection disabled
  form.setCollectEmail(false);

  // INVARIANT 2 & 3: Question 1 is ALWAYS Name and optional
  form.addTextItem()
    .setTitle("Name")
    .setHelpText("Please enter your name or handle (optional)")
    .setRequired(false);

  // ANTI-BIAS RULE 1: Bipolar Linear Scale for competing priorities
  form.addScaleItem()
    .setTitle("Execution Speed vs. Verification Rigor")
    .setHelpText("Select the operating balance point between fast execution and deep state checks.")
    .setBounds(1, 5)
    .setLabels("Minimum latency (skip non-critical checks)", "Maximum verification (strict schema & state audits)")
    .setRequired(false);

  // ANTI-BIAS RULE 2: Constraint Tolerance Grid
  form.addGridItem()
    .setTitle("System Constraint Tolerances")
    .setHelpText("Assign your enforcement posture for each operational dimension.")
    .setRows([
      "Memory Footprint (RAM ceiling)",
      "External Network Dependencies",
      "Cold-Start Initialization Time",
      "Third-Party API Token Spend"
    ])
    .setColumns([
      "Strict / Zero Tolerance",
      "Flexible / Negotiable",
      "Irrelevant / Ignore"
    ])
    .setRequired(false);

  // ANTI-BIAS RULE 3: Failure-Mode Checkboxes
  form.addCheckboxItem()
    .setTitle("Acceptable Architectural Failure Modes & Maintenance Costs")
    .setHelpText("Select only the operational burdens you are willing to accept and maintain.")
    .setChoiceValues([
      "SQLite write-lock contention under high concurrency",
      "Background worker daemon memory overhead (systemd linger)",
      "Webhook delivery failure risk during network partitions",
      "Manual migration scripts required on schema changes"
    ])
    .showOtherOption(true)
    .setRequired(false);

  // ANTI-BIAS RULE 4: Hard Boundary Scalar Input
  form.addTextItem()
    .setTitle("Hard Execution Timeout Ceiling (Seconds)")
    .setHelpText("Specify an exact numeric timeout limit or invariant (e.g., 30s, 120s).")
    .setRequired(false);

  // ANTI-BIAS RULE 5: Factual Enum Multiple Choice (Requires annotation)
  // @allow-enum-mc
  form.addMultipleChoiceItem()
    .setTitle("Target Runtime Environment")
    .setHelpText("Mutually exclusive deployment target.")
    .setChoiceValues(["Local Workstation", "Staging VPS", "Production VPS"])
    .setRequired(false);

  // INVARIANT 5: Final question is ALWAYS an unconstrained freeform text area
  form.addParagraphTextItem()
    .setTitle("Final Thoughts, Overrides & Open Notes")
    .setHelpText("Write any additional constraints, overrides, or raw thoughts in any format you please.")
    .setRequired(false);

  // INVARIANT 7: Persist Form ID
  const formId = form.getId();
  PropertiesService.getScriptProperties().setProperty("ACTIVE_FORM_ID", formId);

  Logger.log("=======================================================");
  Logger.log("FORM CREATED SUCCESSFULLY");
  Logger.log("LIVE FORM URL: " + form.getPublishedUrl());
  Logger.log("EDIT FORM URL: " + form.getEditUrl());
  Logger.log("FORM ID: " + formId);
  Logger.log("=======================================================");

  return formId;
}

/**
 * HTTP GET Web App Endpoint
 * Query Params:
 *   ?action=all     (default) Returns all submissions
 *   ?action=latest  Returns only the most recent submission
 *   ?action=summary Returns metadata and submission count
 */
function doGet(e) {
  try {
    const formId = PropertiesService.getScriptProperties().getProperty("ACTIVE_FORM_ID");
    if (!formId) {
      return respondJson({ status: "error", message: "No ACTIVE_FORM_ID found. Run createForm() first." });
    }

    const form = FormApp.openById(formId);
    const responses = form.getResponses();
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "all";

    if (action === "summary") {
      return respondJson({
        status: "success",
        formId: formId,
        formTitle: form.getTitle(),
        publishedUrl: form.getPublishedUrl(),
        totalSubmissions: responses.length,
        isAcceptingResponses: form.isAcceptingResponses()
      });
    }

    const formatted = responses.map((resp, index) => {
      return serializeResponse(resp, index + 1);
    });

    if (action === "latest") {
      return respondJson({
        status: "success",
        formId: formId,
        totalSubmissions: formatted.length,
        latestSubmission: formatted.length > 0 ? formatted[formatted.length - 1] : null
      });
    }

    return respondJson({
      status: "success",
      formId: formId,
      totalSubmissions: formatted.length,
      submissions: formatted
    });
  } catch (error) {
    return respondJson({ status: "error", message: error.toString() });
  }
}

function serializeResponse(resp, submissionNumber) {
  const answers = {};
  const itemResponses = resp.getItemResponses();

  itemResponses.forEach(itemResp => {
    const item = itemResp.getItem();
    const title = item.getTitle();
    const type = item.getType();
    const rawValue = itemResp.getResponse();

    if (type === FormApp.ItemType.GRID || type === FormApp.ItemType.CHECKBOX_GRID) {
      const rows = (type === FormApp.ItemType.GRID)
        ? item.asGridItem().getRows()
        : item.asCheckboxGridItem().getRows();
      const gridMap = {};
      rows.forEach((rowLabel, idx) => {
        gridMap[rowLabel] = (rawValue && rawValue[idx] !== null && rawValue[idx] !== undefined)
          ? rawValue[idx]
          : null;
      });
      answers[title] = gridMap;
    } else {
      answers[title] = rawValue;
    }
  });

  return {
    submission: submissionNumber,
    responseId: resp.getId(),
    timestamp: resp.getTimestamp().toISOString(),
    respondentEmail: resp.getRespondentEmail() || "Anonymous",
    answers: answers
  };
}

function respondJson(data) {
  return ContentService.createTextOutput(JSON.stringify(data, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

// Profile C Fallback: Dump JSON directly to Execution Log
function getFormResponses() {
  const formId = PropertiesService.getScriptProperties().getProperty("ACTIVE_FORM_ID");
  if (!formId) {
    Logger.log("Error: No ACTIVE_FORM_ID set.");
    return;
  }
  const form = FormApp.openById(formId);
  const formatted = form.getResponses().map((resp, idx) => serializeResponse(resp, idx + 1));
  Logger.log("\n" + JSON.stringify(formatted, null, 2) + "\n");
}
```

---

## 5. Profile B: Real-Time Outbound Webhook Push (`onFormSubmit`)

```javascript
/**
 * =========================================================================
 * PROFILE B: OUTBOUND REAL-TIME WEBHOOK DISPATCHER (V3.0)
 * =========================================================================
 * Automatically POSTs structured JSON (including mapped Grid objects) to
 * TARGET_WEBHOOK_URL the instant a respondent submits the form.
 */

const TARGET_WEBHOOK_URL = "[https://your-webhook-endpoint.example.com/api/form-intake](https://your-webhook-endpoint.example.com/api/form-intake)";

function setupWebhookForm() {
  const formId = createForm(); // Uses createForm() from Profile A
  const form = FormApp.openById(formId);

  // Deduplicate existing submit triggers
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === "handleFormSubmit") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger("handleFormSubmit")
    .forForm(form)
    .onFormSubmit()
    .create();

  Logger.log("Webhook trigger installed -> " + TARGET_WEBHOOK_URL);
}

function handleFormSubmit(e) {
  try {
    if (!e || !e.response) return;

    const serialized = serializeResponse(e.response, 1);
    const payload = {
      event: "google_form_submission",
      formTitle: e.source ? e.source.getTitle() : "Intake Form",
      formId: e.source ? e.source.getId() : null,
      submission: serialized
    };

    const res = UrlFetchApp.fetch(TARGET_WEBHOOK_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    Logger.log("Webhook HTTP Status: " + res.getResponseCode());
  } catch (err) {
    Logger.log("Webhook Dispatch Error: " + err.toString());
  }
}
```

---

## 6. Zero-GCP Terminal Workflow (`@google/clasp`)

1. Enable **Google Apps Script API** at `https://script.google.com/home/usersettings`.
2. Authenticate and deploy from your local shell:
   ```bash
   npm install -g @google/clasp
   clasp login
   clasp create --title "Agent Decision Intake" --type standalone
   node scripts/validate_form_script.js Code.gs
   clasp push
   clasp deploy --description "V3 Anti-Bias JSON Endpoint"
   ```
3. Fetch responses directly into your agent harness:
   ```bash
   curl -sL "[https://script.google.com/macros/s/](https://script.google.com/macros/s/){DEPLOYMENT_ID}/exec?action=latest"
   ```

---

## 7. Pre-Flight Checklist for the AI Agent

Before outputting any Google Apps Script form code, verify every item:
- [ ] **Rule 1 (No Email):** Is `form.setCollectEmail(false)` explicitly present?
- [ ] **Rule 2 (First Question Name):** Is Question 1 `"Name"` (`addTextItem`) with `.setRequired(false)`?
- [ ] **Rule 3 (Everything Optional):** Does every single question item call `.setRequired(false)` with zero instances of `.setRequired(true)`?
- [ ] **Rule 4 (Explicit Context):** Does `form.setDescription(...)` explain why the form exists, what decision it unblocks, and the time commitment?
- [ ] **Rule 5 (Open Final Question):** Is the final question `form.addParagraphTextItem()` with `.setRequired(false)`?
- [ ] **Rule 6 (Anti-Bias Scales):** Are all competing priorities modeled with `addScaleItem()` using contrasting, descriptive bipolar endpoint labels?
- [ ] **Rule 7 (Anti-Bias Grids):** Are multi-dimensional system constraints modeled with `addGridItem()` where rows are dimensions and columns are tolerance tiers?
- [ ] **Rule 8 (Downside Checkboxes):** Are all `addCheckboxItem()` choices written strictly in terms of maintenance cost, overhead, or failure modes without positive marketing spin?
- [ ] **Rule 9 (Multiple-Choice Ban):** Have all subjective `addMultipleChoiceItem()` calls been eliminated (or annotated with `// @allow-enum-mc` for strict factual enums)?
- [ ] **Rule 10 (Grid Serialization):** Does the response serializer map `GRID` row arrays back to named row-key objects so the resulting JSON is self-documenting?
