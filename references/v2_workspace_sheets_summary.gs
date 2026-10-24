/**
 * ==========================================================================================
 * V2 REFERENCE IMPLEMENTATION: PROFILE C - GOOGLE SHEETS SYNC & SUMMARY
 * ==========================================================================================
 * Skill: google-form-apps-script (v2.0)
 * Requirements Adhered To:
 *   1. Zero GCP Registration: Runs 100% inside standard Google Drive and Google Sheets.
 *   2. Rule 1: Email collection is DISABLED by default (form.setCollectEmail(false)).
 *   3. Rule 2: Question 1 is ALWAYS "Name" (addTextItem, optional).
 *   4. Rule 3: NEVER require any response (setRequired(false) on ALL items).
 *   5. Rule 4: Form description provides explicit context on why it exists.
 *   6. Rule 5: Final question is ALWAYS an unconstrained freeform text area.
 *   7. Sheets Pairing: Automatically links form to a newly created Google Sheet destination.
 *   8. Automated Analytics: Formulates summary metrics tab inside the Google Sheet.
 * ==========================================================================================
 */

/**
 * Creates the Google Form AND a paired Google Sheet that stores live rows.
 */
function createFormWithLinkedSheet() {
  // Step 1: Create the Form
  const form = FormApp.create("Sprint Retrospective & Team Intake");

  // ----------------------------------------------------------------------------------------
  // MANDATORY RULE 4: Explicit Context (Why this form exists)
  // ----------------------------------------------------------------------------------------
  form.setDescription(
    "WHY THIS FORM EXISTS: This retrospective form gathers team sentiments, process blockers, " +
    "and suggestions at the conclusion of each development cycle. Answers are synced directly to " +
    "a linked Google Sheet for sprint planning and review. All questions are completely optional."
  );
  
  form.setConfirmationMessage(
    "Retrospective thoughts submitted! Your response has been logged to the team sprint sheet."
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
    .setHelpText("Team member name (optional / anonymous)")
    .setRequired(false);

  // ----------------------------------------------------------------------------------------
  // RETRO QUESTIONS (All optional per Rule 3)
  // ----------------------------------------------------------------------------------------
  form.addScaleItem()
    .setTitle("Sprint Velocity Satisfaction")
    .setBounds(1, 5)
    .setLabels("1 = Blocked / Frustrated", "5 = Smooth / Highly Productive")
    .setRequired(false);

  form.addCheckboxItem()
    .setTitle("Areas with Greatest Friction")
    .setChoiceValues([
      "Unclear specifications / requirement churn",
      "CI/CD pipeline test flakiness",
      "PR review bottlenecks",
      "Third-party API dependencies",
      "Meeting overhead"
    ])
    .showOtherOption(true)
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle("What went well during this sprint?")
    .setHelpText("Highlight wins, achievements, or helpful teammates.")
    .setRequired(false);

  // ----------------------------------------------------------------------------------------
  // MANDATORY RULE 5: Final question is ALWAYS an unconstrained freeform text area
  // ----------------------------------------------------------------------------------------
  form.addParagraphTextItem()
    .setTitle("Open Thoughts, Radical Candor & Ideas")
    .setHelpText("Feel free to write any reflections, process proposals, or notes in whatever format you please.")
    .setRequired(false);

  // ----------------------------------------------------------------------------------------
  // STEP 2: CREATE & PAIR GOOGLE SHEET DESTINATION (100% Free / Zero GCP)
  // ----------------------------------------------------------------------------------------
  const spreadsheet = SpreadsheetApp.create("Sprint Retrospective Responses (Live Sync)");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());

  // Setup an Analytics Summary tab inside the newly created Google Sheet
  const summarySheet = spreadsheet.insertSheet("Summary Metrics");
  summarySheet.appendRow(["Metric", "Calculation / Formula"]);
  summarySheet.appendRow(["Total Submissions Received", "=COUNTA('Form Responses 1'!A2:A)"]);
  summarySheet.appendRow(["Average Sprint Satisfaction", "=AVERAGE('Form Responses 1'!C2:C)"]);
  summarySheet.getRange("A1:B1").setFontWeight("bold").setBackground("#e8f0fe");

  // Save metadata
  const formId = form.getId();
  const sheetUrl = spreadsheet.getUrl();
  PropertiesService.getScriptProperties().setProperty("ACTIVE_FORM_ID", formId);
  PropertiesService.getScriptProperties().setProperty("ACTIVE_SHEET_URL", sheetUrl);

  Logger.log("\n====================================================================");
  Logger.log("📊 FORM & LINKED SPREADSHEET CREATED!");
  Logger.log("👉 LIVE FORM URL: " + form.getPublishedUrl());
  Logger.log("📈 LIVE GOOGLE SHEET URL: " + sheetUrl);
  Logger.log("🛠️ EDIT FORM URL: " + form.getEditUrl());
  Logger.log("📋 FORM ID: " + formId);
  Logger.log("====================================================================\n");

  return { formId: formId, sheetUrl: sheetUrl };
}
