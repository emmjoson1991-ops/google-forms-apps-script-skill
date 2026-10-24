/**
 * ==========================================================================================
 * V2 REFERENCE IMPLEMENTATION: PROFILE B - REAL-TIME OUTBOUND WEBHOOK PUSH
 * ==========================================================================================
 * Skill: google-form-apps-script (v2.0)
 * Requirements Adhered To:
 *   1. Zero GCP Registration: Works 100% inside script.google.com and standard Google Drive.
 *   2. Rule 1: Email collection is DISABLED by default (form.setCollectEmail(false)).
 *   3. Rule 2: Question 1 is ALWAYS "Name" (addTextItem, optional).
 *   4. Rule 3: NEVER require any response (setRequired(false) on ALL items).
 *   5. Rule 4: Form description provides explicit context on why it exists.
 *   6. Rule 5: Final question is ALWAYS an unconstrained freeform text area.
 *   7. Webhook Trigger: Self-installs an onFormSubmit trigger using ScriptApp.
 *   8. Outbound Dispatch: Uses native UrlFetchApp to POST JSON payload instantly.
 * ==========================================================================================
 */

// Replace with your destination webhook URL (Slack, Discord, local webhook relay, server)
const DESTINATION_WEBHOOK_URL = "https://your-webhook-endpoint.com/api/form-responses";

/**
 * Run this function once in Apps Script to create the form and install the trigger.
 */
function setupWebhookForm() {
  const form = FormApp.create("Incident & System Feedback Dispatcher");

  // ----------------------------------------------------------------------------------------
  // MANDATORY RULE 4: Explicit Context (Why this form exists)
  // ----------------------------------------------------------------------------------------
  form.setDescription(
    "WHY THIS FORM EXISTS: This form enables team members and testers to submit feedback " +
    "or incident notes that are instantly dispatched via automated webhook to our monitoring " +
    "and engineering channels. All questions are completely optional — submit whatever details you have."
  );
  
  form.setConfirmationMessage(
    "Thank you! Your submission has been captured and dispatched to the engineering webhook."
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
    .setHelpText("Reporter name or pseudonym (optional)")
    .setRequired(false);

  // ----------------------------------------------------------------------------------------
  // QUESTIONS (All optional per Rule 3)
  // ----------------------------------------------------------------------------------------
  form.addTextItem()
    .setTitle("Component / System Name")
    .setHelpText("e.g., Billing Gateway, Authentication, Web UI")
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle("Severity Assessment")
    .setChoiceValues(["Low / Informational", "Medium / Degraded", "High / Blocked"])
    .setRequired(false);

  form.addCheckboxItem()
    .setTitle("Observed Symptoms")
    .setChoiceValues([
      "Slow response times / latency",
      "5xx Internal Server Errors",
      "UI visual regression",
      "Incorrect calculation / logic error",
      "Intermittent timeouts"
    ])
    .showOtherOption(true)
    .setRequired(false);

  // ----------------------------------------------------------------------------------------
  // MANDATORY RULE 5: Final question is ALWAYS an unconstrained freeform text area
  // ----------------------------------------------------------------------------------------
  form.addParagraphTextItem()
    .setTitle("Detailed Reproduction Notes & Open Comments")
    .setHelpText("Feel free to paste logs, stack traces, reproduction steps, or thoughts in any format you please.")
    .setRequired(false);

  const formId = form.getId();
  PropertiesService.getScriptProperties().setProperty("ACTIVE_FORM_ID", formId);

  // ----------------------------------------------------------------------------------------
  // AUTOMATIC INSTALLABLE TRIGGER ATTACHMENT
  // ----------------------------------------------------------------------------------------
  // Clean up any existing triggers for this project to prevent duplicates
  const existingTriggers = ScriptApp.getProjectTriggers();
  existingTriggers.forEach(t => {
    if (t.getHandlerFunction() === "handleFormSubmit") {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Attach a new onFormSubmit trigger directly to the created form
  ScriptApp.newTrigger("handleFormSubmit")
    .forForm(form)
    .onFormSubmit()
    .create();

  Logger.log("\n====================================================================");
  Logger.log("🚀 FORM & WEBHOOK TRIGGER INITIALIZED!");
  Logger.log("👉 LIVE FORM URL: " + form.getPublishedUrl());
  Logger.log("🛠️ EDIT FORM URL: " + form.getEditUrl());
  Logger.log("📋 FORM ID: " + formId);
  Logger.log("🎯 TARGET WEBHOOK: " + DESTINATION_WEBHOOK_URL);
  Logger.log("====================================================================\n");

  return formId;
}

/**
 * ------------------------------------------------------------------------------------------
 * REAL-TIME EVENT HANDLER
 * ------------------------------------------------------------------------------------------
 * Invoked by Google immediately whenever a respondent submits the form.
 * Serializes the response and pushes it via HTTP POST.
 */
function handleFormSubmit(e) {
  try {
    if (!e || !e.response) {
      Logger.log("⚠️ No response object detected in event parameter.");
      return;
    }

    const formResponse = e.response;
    const itemResponses = formResponse.getItemResponses();
    const answers = {};

    itemResponses.forEach(itemResp => {
      const title = itemResp.getItem().getTitle();
      const value = itemResp.getResponse();
      answers[title] = value;
    });

    const payload = {
      event: "google_form_submission",
      formTitle: e.source ? e.source.getTitle() : "Form Intake",
      responseId: formResponse.getId(),
      timestampIso: formResponse.getTimestamp().toISOString(),
      respondentEmail: formResponse.getRespondentEmail() || "Anonymous (Collection Disabled)",
      answers: answers
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    Logger.log("Dispatched payload to " + DESTINATION_WEBHOOK_URL);
    const response = UrlFetchApp.fetch(DESTINATION_WEBHOOK_URL, options);
    Logger.log("Destination response status: " + response.getResponseCode());

  } catch (error) {
    Logger.log("❌ Webhook dispatch failed: " + error.toString());
  }
}
