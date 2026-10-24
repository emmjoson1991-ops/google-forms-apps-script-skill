/**
 * ==========================================================================================
 * V2 REFERENCE IMPLEMENTATION: PROFILE A - WEB APP HTTP JSON API
 * ==========================================================================================
 * Skill: google-form-apps-script (v2.0)
 * Requirements Adhered To:
 *   1. Zero GCP Registration: Works 100% inside script.google.com and standard Google Drive.
 *   2. Rule 1: Email collection is DISABLED by default (form.setCollectEmail(false)).
 *   3. Rule 2: Question 1 is ALWAYS "Name" (addTextItem, optional).
 *   4. Rule 3: NEVER require any response (setRequired(false) on ALL items).
 *   5. Rule 4: Form description provides explicit context on why it exists.
 *   6. Rule 5: Final question is ALWAYS an unconstrained freeform text area.
 *   7. HTTP GET Endpoint: doGet(e) returns clean JSON to curl / external LLMs.
 * ==========================================================================================
 */

/**
 * Run this function in the Google Apps Script editor to create the form.
 */
function createProjectIntakeForm() {
  const form = FormApp.create("Autonomous Agent Task & Project Intake");

  // ----------------------------------------------------------------------------------------
  // MANDATORY RULE 4: Explicit Context (Why this form exists)
  // ----------------------------------------------------------------------------------------
  form.setDescription(
    "WHY THIS FORM EXISTS: This intake form collects requirements, technical constraints, " +
    "and deliverables for autonomous software tasks. The submitted responses are ingested " +
    "directly by our development agents to configure the project workspace. " +
    "All fields are completely optional — answer whatever is relevant to your task."
  );
  
  form.setConfirmationMessage(
    "Requirements submitted! The project agent has received your input. You may close this tab."
  );
  form.setAllowResponseEdits(true);
  form.setShowLinkToRespondAgain(false);

  // ----------------------------------------------------------------------------------------
  // MANDATORY RULE 1: Email collection disabled
  // ----------------------------------------------------------------------------------------
  form.setCollectEmail(false);

  // ----------------------------------------------------------------------------------------
  // MANDATORY RULE 2 & 3: Question 1 is ALWAYS Name (optional)
  // ----------------------------------------------------------------------------------------
  form.addTextItem()
    .setTitle("Name")
    .setHelpText("Lead developer or project requester (optional)")
    .setRequired(false);

  // ----------------------------------------------------------------------------------------
  // PROJECT SPECIFIC QUESTIONS (All optional per Rule 3)
  // ----------------------------------------------------------------------------------------
  form.addTextItem()
    .setTitle("Project or Repository Name")
    .setHelpText("e.g., auth-service-v2, analytics-dashboard")
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle("Primary Language / Runtime")
    .setChoiceValues(["TypeScript / Node.js", "Python", "Go", "Rust", "Java / Kotlin"])
    .showOtherOption(true)
    .setRequired(false);

  form.addCheckboxItem()
    .setTitle("Key Deliverables Needed")
    .setChoiceValues([
      "API Architecture & Endpoints",
      "Database Schema & Migrations",
      "Comprehensive Unit & Integration Tests",
      "CI/CD Pipeline Configuration",
      "Documentation & OpenAPI Specs"
    ])
    .showOtherOption(true)
    .setRequired(false);

  form.addScaleItem()
    .setTitle("Estimated Priority / Urgency")
    .setBounds(1, 5)
    .setLabels("1 = Backlog / Low", "5 = Immediate Critical")
    .setRequired(false);

  // ----------------------------------------------------------------------------------------
  // MANDATORY RULE 5: Final question is ALWAYS an unconstrained freeform text area
  // ----------------------------------------------------------------------------------------
  form.addParagraphTextItem()
    .setTitle("Open Thoughts, Requirements & Notes")
    .setHelpText("Please write any additional requirements, architectural thoughts, or edge cases in whatever format you please.")
    .setRequired(false);

  // Persist Form ID
  const formId = form.getId();
  PropertiesService.getScriptProperties().setProperty("ACTIVE_FORM_ID", formId);

  Logger.log("\n====================================================================");
  Logger.log("🎉 FORM CREATED SUCCESSFULLY!");
  Logger.log("👉 LIVE FORM URL: " + form.getPublishedUrl());
  Logger.log("🛠️ EDIT FORM URL: " + form.getEditUrl());
  Logger.log("📋 ACTIVE FORM ID: " + formId);
  Logger.log("====================================================================");
  Logger.log("TO ENABLE HTTP GET JSON API:");
  Logger.log("1. Click Deploy > New deployment (top right).");
  Logger.log("2. Select type: 'Web app'.");
  Logger.log("3. Execute as: 'Me', Who has access: 'Anyone'.");
  Logger.log("4. Copy the Web App URL — you or your agent can query it with curl/fetch!");
  Logger.log("====================================================================\n");

  return formId;
}

/**
 * ------------------------------------------------------------------------------------------
 * HTTP GET WEB APP ENDPOINT
 * ------------------------------------------------------------------------------------------
 * Query parameters:
 *   GET /exec                -> Returns all submissions as JSON
 *   GET /exec?action=latest  -> Returns only the latest submission
 *   GET /exec?action=summary -> Returns count, title, and acceptance status
 */
function doGet(e) {
  try {
    const formId = PropertiesService.getScriptProperties().getProperty("ACTIVE_FORM_ID");
    if (!formId) {
      return createJsonResponse({
        status: "error",
        message: "ACTIVE_FORM_ID not found. Run createProjectIntakeForm first."
      });
    }

    const form = FormApp.openById(formId);
    const responses = form.getResponses();
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "all";

    if (action === "summary") {
      return createJsonResponse({
        status: "success",
        formId: formId,
        formTitle: form.getTitle(),
        totalSubmissions: responses.length,
        isAcceptingResponses: form.isAcceptingResponses(),
        publishedUrl: form.getPublishedUrl()
      });
    }

    const parsedSubmissions = responses.map((resp, index) => {
      const answers = {};
      resp.getItemResponses().forEach(item => {
        answers[item.getItem().getTitle()] = item.getResponse();
      });
      return {
        submissionIndex: index + 1,
        responseId: resp.getId(),
        timestampIso: resp.getTimestamp().toISOString(),
        respondentEmail: resp.getRespondentEmail() || "Anonymous",
        answers: answers
      };
    });

    if (action === "latest") {
      return createJsonResponse({
        status: "success",
        totalSubmissions: parsedSubmissions.length,
        latestSubmission: parsedSubmissions.length > 0 ? parsedSubmissions[parsedSubmissions.length - 1] : null
      });
    }

    return createJsonResponse({
      status: "success",
      totalSubmissions: parsedSubmissions.length,
      submissions: parsedSubmissions
    });

  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

/**
 * Helper to serialize objects into JSON ContentService outputs.
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Fallback local logger for console users.
 */
function getFormResponses() {
  const formId = PropertiesService.getScriptProperties().getProperty("ACTIVE_FORM_ID");
  if (!formId) return Logger.log("Run createProjectIntakeForm first.");
  const form = FormApp.openById(formId);
  const data = form.getResponses().map((r, i) => {
    const answers = {};
    r.getItemResponses().forEach(item => { answers[item.getItem().getTitle()] = item.getResponse(); });
    return { submission: i + 1, timestamp: r.getTimestamp().toISOString(), answers };
  });
  Logger.log("\n" + JSON.stringify(data, null, 2) + "\n");
}
