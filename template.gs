/**
 * HOW TO USE
 * 1. Run createForm, then open the LIVE FORM URL from the Execution log and fill in the form.
 * 2. Run getFormResponses, then copy the JSON from the Execution log back into the chat.
 */

function createForm() {
  const form = FormApp.create("Blog setup: a few quick choices");

  // why the form exists, what happens with the answers, how long it takes.
  form.setDescription(
    "I'm setting up your blog repo and need a few decisions before I go on. " +
    "I'll use your answers to configure hosting and the first pages. About 2 minutes. " +
    "Everything is optional, so skip whatever you like."
  );
  form.setConfirmationMessage(
    "Thanks, your answers are saved! Next: go back to Apps Script, choose getFormResponses " +
    "in the function dropdown, click Run, and paste the JSON from the Execution log into the chat."
  );
  form.setAllowResponseEdits(true);
  form.setShowLinkToRespondAgain(false);
  form.setCollectEmail(false);  // 

  // Name comes first.
  form.addTextItem()
    .setTitle("Name")
    .setRequired(false);

  // --- YOUR QUESTIONS START HERE (example below) ---

  // Multiple choice: only one option can be true. Options come from the repo.
  form.addMultipleChoiceItem()
    .setTitle("Where should the blog be hosted?")
    .setChoiceValues([
      "Netlify (netlify.toml is already in the repo)",
      "GitHub Pages (the repo has a gh-pages branch)"
    ])
    .showOtherOption(true) // "Other:" write-in
    .setRequired(false);

  // Checkboxes: several options can be true.
  form.addCheckboxItem()
    .setTitle("Which pages should be in the first version?")
    .setChoiceValues(["Home", "About", "Post list", "RSS feed"])
    .showOtherOption(true) // "Other:" write-in
    .setRequired(false);

  // Linear scale: a degree, with both ends labeled.
  form.addScaleItem()
    .setTitle("How polished does the first version need to be?")
    .setBounds(1, 5)
    .setLabels("Rough is fine", "Ready to show people")
    .setRequired(false);

  // Short text: no real options to offer, so ask openly.
  form.addTextItem()
    .setTitle("Custom domain, if you have one")
    .setRequired(false);

  // Date.
  form.addDateItem()
    .setTitle("Launch date, if there is one")
    .setIncludesYear(true)
    .setRequired(false);

  // --- YOUR QUESTIONS END HERE ---

  // relevance rating, just before the final box.
  // Star rating is a Forms UI question type; this uses a 1-5 linear scale, which FormApp builds reliably.
  form.addScaleItem()
    .setTitle("How relevant were these questions to the topic?")
    .setBounds(1, 5)
    .setLabels("Off-topic", "Spot on")
    .setRequired(false);

  // open box, always last.
  form.addParagraphTextItem()
    .setTitle("Anything else?")
    .setHelpText("Anything the questions missed, in any form you like.")
    .setRequired(false);

  // save the ID so getFormResponses can find the form.
  const formId = form.getId();
  PropertiesService.getScriptProperties().setProperty("ACTIVE_FORM_ID", formId);

  const publishedUrl = form.getPublishedUrl();
  const editUrl = form.getEditUrl();

  Logger.log("\n=======================================================");
  Logger.log("🎉 FORM CREATED");
  Logger.log("=======================================================");
  Logger.log("👉 LIVE FORM URL (open this and fill it in):");
  Logger.log(publishedUrl);
  Logger.log("-------------------------------------------------------");
  Logger.log("🛠️ EDIT URL: " + editUrl);
  Logger.log("=======================================================");
  Logger.log("When you've submitted, choose getFormResponses in the dropdown and click Run.\n");

  return { formId: formId, publishedUrl: publishedUrl, editUrl: editUrl };
}

function getFormResponses() {
  const formId = PropertiesService.getScriptProperties().getProperty("ACTIVE_FORM_ID");
  if (!formId) {
    Logger.log("❌ No form found yet. Run createForm first.");
    return;
  }

  const form = FormApp.openById(formId);
  const responses = form.getResponses();
  if (responses.length === 0) {
    Logger.log("⚠️ No responses yet. Open the LIVE FORM URL, submit the form, then run getFormResponses again.");
    return;
  }

  // Only real questions (skip page breaks, section headers, images, videos).
  const nonQuestions = [
    FormApp.ItemType.PAGE_BREAK,
    FormApp.ItemType.SECTION_HEADER,
    FormApp.ItemType.IMAGE,
    FormApp.ItemType.VIDEO
  ];
  const questions = form.getItems()
    .filter(function (item) { return nonQuestions.indexOf(item.getType()) === -1; })
    .map(function (item) {
      return { item: item, key: item.getTitle() || "Untitled question", choices: choiceValues_(item) };
    });
  // Keep keys unique even if two questions share a title.
  const seen = {};
  questions.forEach(function (q) {
    if (seen[q.key]) q.key += " [" + q.item.getId() + "]";
    seen[q.key] = true;
  });

  const output = responses.map(function (response, index) {
    const answers = {};
    const writeIns = {};

    questions.forEach(function (q) {
      const itemResponse = response.getResponseForItem(q.item);
      const answer = itemResponse ? itemResponse.getResponse() : null;
      answers[q.key] = answer;

      // Answers that aren't one of the listed options were typed into "Other:".
      if (q.choices && answer !== null && answer !== "") {
        const typed = [].concat(answer).filter(function (v) { return q.choices.indexOf(v) === -1; });
        if (typed.length > 0) writeIns[q.key] = typed;
      }
    });

    return {
      submission: index + 1,
      timestamp: response.getTimestamp().toISOString(),
      answers: answers,
      writeIns: writeIns
    };
  });

  const json = JSON.stringify(output, null, 2);

  Logger.log("\n=================== FORM RESPONSES JSON ===================");
  Logger.log(json);
  Logger.log("===========================================================\n");
  Logger.log("👉 Copy everything between the lines above and paste it into the chat.");

  return json;
}

// Listed option values for multiple choice and checkbox questions; null for other types.
function choiceValues_(item) {
  const type = item.getType();
  let choices = null;
  if (type === FormApp.ItemType.MULTIPLE_CHOICE) choices = item.asMultipleChoiceItem().getChoices();
  if (type === FormApp.ItemType.CHECKBOX) choices = item.asCheckboxItem().getChoices();
  return choices ? choices.map(function (c) { return c.getValue(); }) : null;
}
