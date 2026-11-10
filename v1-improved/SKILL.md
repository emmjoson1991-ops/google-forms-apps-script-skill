---
name: google-form-apps-script
description: >-
  Ask the user questions through a Google Form instead of chat, and get the answers back as JSON.
  Writes one Apps Script file (Code.gs) that builds the form and later prints the responses.
  Use when you need answers from the user and a form would be less effort than chat.
metadata:
  version: v1.1
---

# Google Form Apps Script (`google-form-apps-script`)

When you need several answers from the user, put the questions in a Google Form. Picking options and typing short notes takes less effort than a long chat. Write one `Code.gs`. The user runs it, fills in the form, and pastes the JSON answers back to you.

## Flow

1. Write one complete `Code.gs`, based on the template below.
2. The user pastes it into [script.google.com](https://script.google.com), runs `createForm`, and opens the **LIVE FORM URL** from the Execution log.
3. The user fills in the form and submits it. The confirmation message tells them what to do next.
4. The user picks `getFormResponses` in the function dropdown, clicks **Run**, and pastes the JSON from the Execution log into the chat.

When you send the script, add these four steps in plain words underneath it.

## Rules

1. **Ground every option.** Before you write an option list, collect evidence from what you already have: the conversation, the codebase, the files. Each option should be something you actually found, or have real reason to think is plausible. If you have no real options, ask an open text question instead. Leave out filler and strawman options. A short list of real options is better than a long one.
2. **Email collection off.** `form.setCollectEmail(false)`.
3. **Question 1 is "Name"**, a short text item.
4. **Everything is optional.** Every item gets `.setRequired(false)`.
5. **The description gives context.** Say why the form exists, what you will do with the answers, and roughly how long it takes. Keep it to two or three short sentences.
6. **Every choice question has a write-in.** Multiple choice and checkboxes always get `.showOtherOption(true)`, which adds an "Other:" box the user can type into. Dropdowns (`addListItem`) have no Other box, so use multiple choice instead.
7. **Second-to-last question: relevance rating.** A 1–5 rating of how relevant the questions were to the topic. This tells you whether you understood the goal.
8. **The last question is an open paragraph box**, so the user can add anything the questions missed. Nothing goes after it.
9. **One script, two functions.** `createForm()` builds the form, saves its ID as `ACTIVE_FORM_ID` in script properties, and logs the URLs. `getFormResponses()` reads that ID and logs the answers as JSON. Keep the confirmation message and the log banners, because they tell the user what to do next.

## Choosing a question type

| Type | Method | Use when |
|---|---|---|
| Multiple choice | `addMultipleChoiceItem()` + `showOtherOption(true)` | Picking one option rules out all the others. |
| Checkboxes | `addCheckboxItem()` + `showOtherOption(true)` | Several options can be true at once. |
| Linear scale | `addScaleItem().setBounds(1, 5).setLabels(low, high)` | You want a degree or an amount. Label both ends. |
| Short text | `addTextItem()` | A name, number, URL, or a few words. |
| Paragraph | `addParagraphTextItem()` | An open answer, or when you have no real options (rule 1). |
| Date | `addDateItem()` | You need a date. |

Writing tips:
- Ask one thing per question, in a short title. Help text is one line or nothing.
- Ask only what you need to move forward. Five good questions beat fifteen.
- Use labels that explain themselves, e.g. "Netlify (already set up in netlify.toml)" rather than "Option A".
- Give every question a different title, because titles become the JSON keys.

## Reading the answers

- Each submission becomes `{ submission, timestamp, answers, writeIns }`.
- `answers` has every question, keyed by title. Unanswered questions are `null`.
- Multiple choice gives a string, checkboxes give an array of strings, and scales give a string such as `"4"`.
- An "Other:" answer comes back as the text the user typed. `writeIns` lists those answers per question, so you can see where your options missed. Treat a write-in as the most accurate answer to that question.
- A low relevance rating means you should check your understanding of the goal before going on.

## Template `Code.gs`

The questions between the markers are an example: an agent setting up a blog repo. Each kind of question appears once. Replace them with your own and keep everything else.

```javascript
/**
 * HOW TO USE
 * 1. Run createForm, then open the LIVE FORM URL from the Execution log and fill in the form.
 * 2. Run getFormResponses, then copy the JSON from the Execution log back into the chat.
 */

function createForm() {
  const form = FormApp.create("Blog setup: a few quick choices");

  // Rule 5: why the form exists, what happens with the answers, how long it takes.
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
  form.setCollectEmail(false); // Rule 2

  // Rule 3: Name comes first.
  form.addTextItem()
    .setTitle("Name")
    .setRequired(false);

  // --- YOUR QUESTIONS START HERE (example below) ---

  // Multiple choice: only one option can be true. Options come from the repo (rule 1).
  form.addMultipleChoiceItem()
    .setTitle("Where should the blog be hosted?")
    .setChoiceValues([
      "Netlify (netlify.toml is already in the repo)",
      "GitHub Pages (the repo has a gh-pages branch)"
    ])
    .showOtherOption(true) // Rule 6: "Other:" write-in
    .setRequired(false);

  // Checkboxes: several options can be true.
  form.addCheckboxItem()
    .setTitle("Which pages should be in the first version?")
    .setChoiceValues(["Home", "About", "Post list", "RSS feed"])
    .showOtherOption(true) // Rule 6: "Other:" write-in
    .setRequired(false);

  // Linear scale: a degree, with both ends labeled.
  form.addScaleItem()
    .setTitle("How polished does the first version need to be?")
    .setBounds(1, 5)
    .setLabels("Rough is fine", "Ready to show people")
    .setRequired(false);

  // Short text: no real options to offer, so ask openly (rule 1).
  form.addTextItem()
    .setTitle("Custom domain, if you have one")
    .setRequired(false);

  // Date.
  form.addDateItem()
    .setTitle("Launch date, if there is one")
    .setIncludesYear(true)
    .setRequired(false);

  // --- YOUR QUESTIONS END HERE ---

  // Rule 7: relevance rating, just before the final box.
  // Star rating is a Forms UI question type; this uses a 1-5 linear scale, which FormApp builds reliably.
  form.addScaleItem()
    .setTitle("How relevant were these questions to the topic?")
    .setBounds(1, 5)
    .setLabels("Off-topic", "Spot on")
    .setRequired(false);

  // Rule 8: open box, always last.
  form.addParagraphTextItem()
    .setTitle("Anything else?")
    .setHelpText("Anything the questions missed, in any form you like.")
    .setRequired(false);

  // Rule 9: save the ID so getFormResponses can find the form.
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
```

## Before sending

- [ ] Every option list is grounded in evidence; open text where there was none (rule 1).
- [ ] Email off, "Name" first, every item optional (rules 2–4).
- [ ] The description says why, what for, and how long (rule 5).
- [ ] Every multiple choice and checkbox item has `.showOtherOption(true)`, and there are no dropdowns (rule 6).
- [ ] Relevance rating second-to-last, open paragraph box last (rules 7–8).
- [ ] Both functions present, `ACTIVE_FORM_ID` saved, confirmation message and log banners kept (rule 9).
- [ ] The four user steps are written under the script.
