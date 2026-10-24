/**
 * ==========================================================================================
 * REFERENCE IMPLEMENTATION: HOTEL GUEST EXPERIENCE SURVEY
 * ==========================================================================================
 * Skill: google-form-apps-script
 * Purpose: Comprehensive showcase of FormApp capabilities, enforcing all core skill rules:
 *   1. form.setCollectEmail(false) [No unsolicited email collection]
 *   2. Question 1 is ALWAYS "Name" [addTextItem, optional]
 *   3. NEVER require any specific response [all questions setRequired(false)]
 *   4. Form MUST give context explaining WHY it exists [form.setDescription]
 *   5. Final question is ALWAYS an open text area for user to write text any way she pleases
 *   6. Demonstrates full question variety (Text, Date, Dropdown, Scale, Grid, Checkboxes)
 *   7. Demonstrates conditional page branching / skip logic (Restaurant visit routing)
 *   8. Automatic Form ID persistence via PropertiesService
 *   9. Paired response retrieval function converting submissions into structured JSON
 * ==========================================================================================
 */

/**
 * ------------------------------------------------------------------------------------------
 * PART 1: FORM GENERATOR FUNCTION
 * ------------------------------------------------------------------------------------------
 * Run this function first in Google Apps Script (script.google.com).
 * It programmatically constructs the form, sets all routing, and outputs the live link.
 */
function createHotelGuestSurvey() {
  // Step 1: Create the form with a descriptive title
  const form = FormApp.create("The Grand Luminary Hotel - Guest Experience Survey");

  // ----------------------------------------------------------------------------------------
  // MANDATORY RULE 4: Form must give clear context (explain WHY it exists)
  // ----------------------------------------------------------------------------------------
  form.setDescription(
    "WHY THIS FORM EXISTS: Thank you for staying at The Grand Luminary Hotel. This survey " +
    "allows our hospitality and executive teams to review guest feedback from recent stays, " +
    "measure department performance, and identify areas to enhance our amenities and dining. " +
    "Your responses directly guide our seasonal staff training and future guest programs. " +
    "All questions are completely optional — feel free to answer only what you wish."
  );
  
  // Custom confirmation message shown after the guest clicks 'Submit'
  form.setConfirmationMessage(
    "Thank you for sharing your experience! We look forward to welcoming you back to The Grand Luminary."
  );
  
  // Allow respondents to edit their answers after submitting if needed
  form.setAllowResponseEdits(true);
  
  // Disable the 'Submit another response' link for cleaner single-entry workflows
  form.setShowLinkToRespondAgain(false);

  // ----------------------------------------------------------------------------------------
  // MANDATORY RULE 1: Email collection must default to OFF
  // ----------------------------------------------------------------------------------------
  form.setCollectEmail(false);

  // ----------------------------------------------------------------------------------------
  // MANDATORY RULE 2: Question 1 MUST ALWAYS be "Name"
  // MANDATORY RULE 3: NEVER require any specific response (setRequired is false)
  // ----------------------------------------------------------------------------------------
  form.addTextItem()
    .setTitle("Name")
    .setHelpText("Please enter your primary guest name (First and Last) - optional")
    .setRequired(false);

  // ========================================================================================
  // SECTION 1: STAY DETAILS & BASIC INFORMATION (All optional per Rule 3)
  // ========================================================================================

  // [Type: Short Text] Room number identifier
  form.addTextItem()
    .setTitle("Room Number")
    .setHelpText("e.g., 412, Penthouse B")
    .setRequired(false);

  // [Type: Date] Check-in date picker
  form.addDateItem()
    .setTitle("Check-In Date")
    .setHelpText("Select the first day of your stay")
    .setIncludesYear(true)
    .setRequired(false);

  // [Type: Dropdown List] Select room category from predetermined choices
  form.addListItem()
    .setTitle("Room Category Booked")
    .setChoiceValues([
      "Standard Deluxe King",
      "Executive Ocean View Suite",
      "Grand Terrace Suite",
      "Presidential Penthouse"
    ])
    .setRequired(false);

  // [Type: Linear Scale] 1 to 5 overall stay rating
  form.addScaleItem()
    .setTitle("Overall Stay Experience")
    .setBounds(1, 5)
    .setLabels("1 = Below Expectations", "5 = Outstanding")
    .setRequired(false);

  // [Type: Grid / Matrix] Multi-criteria evaluation in a single table
  // Each row represents an amenity; each column represents a rating grade
  form.addGridItem()
    .setTitle("Amenity & Department Ratings")
    .setHelpText("Rate your experience across each touchpoint during your stay")
    .setRows([
      "Front Desk & Valet Service",
      "Room Cleanliness & Housekeeping",
      "High-Speed Wi-Fi & Entertainment",
      "Fitness Center & Spa Facilities"
    ])
    .setColumns([
      "Needs Improvement",
      "Acceptable",
      "Very Good",
      "Exemplary"
    ])
    .setRequired(false);

  // ========================================================================================
  // SECTION 2: CONDITIONAL BRANCHING (SKIP LOGIC)
  // Scenario: If the guest dined at the hotel restaurant, take them to Section 3 (Dining).
  //           If NOT, skip directly to Section 4 (Final Feedback & Checkout).
  // ========================================================================================

  // Step 2A: Pre-define the target destination pages so we can route to them
  const diningPage = form.addPageBreakItem().setTitle("Dining Experience: The Luminary Bistro");
  const finalFeedbackPage = form.addPageBreakItem().setTitle("Overall Impressions & Departure");

  // Step 2B: Go back and insert the branching decision question BEFORE the page break
  // In FormApp, createChoice(label, destinationPage) creates smart skip logic!
  const diningRouter = form.addMultipleChoiceItem();
  diningRouter.setTitle("Did you dine at 'The Luminary Bistro' or order Room Service during your stay?")
    .setHelpText("Select Yes to provide feedback on our culinary services, or No to skip to the end.")
    .setChoices([
      diningRouter.createChoice("Yes, I dined with you", diningPage),
      diningRouter.createChoice("No, I did not dine on-property", finalFeedbackPage)
    ])
    .setRequired(false);

  // ========================================================================================
  // SECTION 3: CONDITIONAL DINING FEEDBACK (Only seen if guest answered 'Yes')
  // ========================================================================================

  // [Type: Checkbox - Multi-Select] Allow guest to pick multiple meals they had
  form.addCheckboxItem()
    .setTitle("Which dining services did you enjoy?")
    .setChoiceValues([
      "Artisan Breakfast Buffet",
      "Lunch / Poolside Bites",
      "Evening Dinner at The Luminary Bistro",
      "Late-Night In-Room Dining"
    ])
    .showOtherOption(true) // Adds a write-in "Other" option
    .setRequired(false);

  // [Type: Linear Scale] Food quality rating
  form.addScaleItem()
    .setTitle("Culinary & Beverage Quality Rating")
    .setBounds(1, 5)
    .setLabels("1 = Disappointing", "5 = World-Class")
    .setRequired(false);

  // [Type: Paragraph / Long Text] Open-ended culinary comments
  form.addParagraphTextItem()
    .setTitle("Any favorite dishes or culinary staff you would like to mention?")
    .setHelpText("Optional: Let our Head Chef know what you loved or how we can improve.")
    .setRequired(false);

  // IMPORTANT SKIP LOGIC: When the guest finishes the dining section, route them to
  // the Final Impressions page rather than showing them duplicate questions.
  diningPage.setGoToPage(finalFeedbackPage);

  // ========================================================================================
  // SECTION 4: FINAL IMPRESSIONS & RECOMMENDATION (Universal closing section)
  // ========================================================================================

  // [Type: Linear Scale] Net Promoter Score (NPS) standard 1-10 scale
  form.addScaleItem()
    .setTitle("How likely are you to recommend The Grand Luminary to colleagues or friends?")
    .setBounds(1, 10)
    .setLabels("1 = Very Unlikely", "10 = Definitely Recommend")
    .setRequired(false);

  // [Type: Multiple Choice] Primary purpose of visit
  form.addMultipleChoiceItem()
    .setTitle("What was the primary purpose of this trip?")
    .setChoiceValues([
      "Leisure / Vacation",
      "Corporate / Business Travel",
      "Special Event / Wedding / Celebration",
      "Staycation"
    ])
    .showOtherOption(true)
    .setRequired(false);

  // ----------------------------------------------------------------------------------------
  // MANDATORY RULE 5: The final question is ALWAYS an open text area for the user to write
  // text in any way she pleases (unconstrained freeform input)
  // ----------------------------------------------------------------------------------------
  form.addParagraphTextItem()
    .setTitle("Open Thoughts, Stories & Notes")
    .setHelpText("Please feel free to share any feedback, context, or notes in whatever way you please.")
    .setRequired(false);

  // ========================================================================================
  // STEP 3: PERSIST FORM METADATA & LOG ACCESS URLS
  // ========================================================================================
  
  // Persist the Form ID to script properties so getFormResponses() can read it without
  // requiring the user to manually copy and paste IDs.
  const formId = form.getId();
  PropertiesService.getScriptProperties().setProperty("ACTIVE_FORM_ID", formId);

  const publishedUrl = form.getPublishedUrl();
  const editUrl = form.getEditUrl();

  Logger.log("\n====================================================================");
  Logger.log("🏨 THE GRAND LUMINARY HOTEL SURVEY GENERATED SUCCESSFULLY!");
  Logger.log("====================================================================");
  Logger.log("👉 LIVE GUEST FORM URL (Share or click to test):");
  Logger.log(publishedUrl);
  Logger.log("--------------------------------------------------------------------");
  Logger.log("🛠️ EDIT & MANAGEMENT URL (Form owner view):");
  Logger.log(editUrl);
  Logger.log("--------------------------------------------------------------------");
  Logger.log("📋 FORM ID (Saved automatically for retrieval): " + formId);
  Logger.log("====================================================================\n");

  return { formId: formId, publishedUrl: publishedUrl, editUrl: editUrl };
}


/**
 * ------------------------------------------------------------------------------------------
 * PART 2: RESPONSE RETRIEVAL FUNCTION
 * ------------------------------------------------------------------------------------------
 * Run this function after guest(s) have submitted responses.
 * It reads from ACTIVE_FORM_ID, parses all submissions (including grids, checkboxes,
 * and text fields), and logs a clean, structured JSON object ready for LLM consumption.
 */
function getFormResponses() {
  // Step 1: Read the persisted Form ID from Script Properties
  const formId = PropertiesService.getScriptProperties().getProperty("ACTIVE_FORM_ID");

  if (!formId) {
    Logger.log("❌ Error: No Active Form ID found. Run createHotelGuestSurvey first.");
    return;
  }

  // Step 2: Open the target form
  const form = FormApp.openById(formId);
  const responses = form.getResponses();

  if (responses.length === 0) {
    Logger.log("⚠️ No guest submissions received yet. Please submit the form first.");
    return;
  }

  // Step 3: Iterate through each submission and compile answer map
  const structuredData = responses.map((response, index) => {
    const itemResponses = response.getItemResponses();
    const guestAnswers = {};

    itemResponses.forEach(itemResp => {
      const questionTitle = itemResp.getItem().getTitle();
      const answerValue = itemResp.getResponse();
      
      // Note:
      // - Text / Scale / Multiple Choice answers are string/number primitives.
      // - Checkbox answers are returned as arrays of strings.
      // - Grid items return arrays of strings (one entry per row).
      guestAnswers[questionTitle] = answerValue;
    });

    return {
      submissionId: index + 1,
      responseTimestampUtc: response.getTimestamp().toISOString(),
      respondentEmail: response.getRespondentEmail() || "Anonymous (Email Collection Disabled)",
      answers: guestAnswers
    };
  });

  // Step 4: Serialize to indented JSON
  const jsonOutput = JSON.stringify(structuredData, null, 2);

  Logger.log("\n=================== GUEST RESPONSES JSON ===================");
  Logger.log(jsonOutput);
  Logger.log("============================================================\n");
  Logger.log("👉 Copy everything between the lines above and paste it back into your LLM chat.");

  return jsonOutput;
}
