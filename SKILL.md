---
name: google-forms-apps-script
description: Required use any time you are asking multiple questions of the user.
version: 1.2.0
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [questions, clarification, decisions, forms, google-forms, apps-script, survey]
---

# User Decision Form

Turn a batch of questions into a form by creation of script. The supplied Apps Script is user-run; generating it does not itself create a form or retrieve responses. The user also retrieves the answers as JSON.

## Non-exhaustive list of required use cases

- Before asking several independent questions or making a long intake questionnaire, use this skill without waiting for the user to name it. 
- Use for grilling skill, structured preferences, feedback, or multiple decisions that benefit from choices and write-ins.
- User would otherwise have to read a lot of text and type a lot of replies.
- You otherwise would use hermes `clarify` tool or similar. 
- Don't create a form for an obvious default, 1-2 questions, dependent questions, secrets, or when an available native clarification tool is faster and fits the task. Higher-priority instructions and user preferences govern the choice. Do not collect passwords, payment details, or verification codes.

## If the user protests the usage

- If the user protests your usage of this skill, offer to edit the description to "possible aid when asking multiple questions of the user." and rephrasing every instance of "required". 

- If running in a program `harness` which supports it, offer to make the skill invocation only.

## Prerequisites

- To run the generated script, the form owner needs a Google account, access to Google Apps Script and Forms, and permission to authorize the requested Google scopes. Workspace restrictions may prevent creation or respondent access.

## Procedure

1. Inspect the conversation and available files first. Group independent questions; do not pre-ask questions that depend on earlier answers.
2. Draft concise, unique question titles. Ground each choice in the available evidence or a plausible real option; use open text when there are no meaningful choices.
3. Use multiple choice for one answer, checkboxes for several, a labeled 1–5 scale for degree, short text for a few words, and a date item for dates. Do not use short text if another option exists. Never use paragraph text.
4. Customize a complete copy of `template.gs` (in this skill's directory) as a file with .txt extension in the user's temporary directory. Disable email collection, put optional `Name` first, make all items optional, and give every multiple choice or checkbox question an Other write-in. Do not use dropdowns because they lack this option. Put the 1–5 question-relevance scale second-to-last and an open paragraph question last. Keep `createForm`, `getFormResponses`, `choiceValues_`, the `ACTIVE_FORM_ID` property, instructions, and log banners.
5. Deliver the instructions to the user, Do not be verbose, do not declare that you are done, do not say anything not required:

- State the link https://script.google.com/home/projects/create and the absolute file path to your .txt file.

- Ask the user to paste your scripts contents into this page, replacing the template for new google scripts.

```template
function myFunction() {
  
}
```
- Save the project to unlock the `Run` button next to `createForm` (the blue Deploy button is not needed); 

- Open the form link which will appear further down the page in the execution log, submit it.

- Select `getFormResponses` from the function dropdown previously showing `createForm`, press `run` again. Copy the json from execution log, and paste it back to agent. 

- End by opening the script (a .txt file) in notepad++, failing that, windows notepad, failing that, the default text editor for .txt files, failing that the directory within which you have created the script.

## Pitfalls

- The user needs a google account, to verify the running of the script.

- Only tested on a windows machine, and with one specific harness. Ability to copy and paste from the terminal for the user might vary, as may the ability of the agent to launch the script in a simple text editor.

- None of the above is a blocker: giving the user easy access to a text file on their own system is always possible, so just do it.

- State the script’s full local path explicitly; don’t refer to it only as “the link above,” because the displayed link label may hide the path

- Missing that the script should be a .txt file and in a new directory created by  the agent.

- If agent has access to another scratch directory but not user temporary directory, do not invent a blocker, use the scratch directory. 


## Verification

- Check every option has grounding, question titles are unique, each item is optional, choice items have Other, and the first and last two questions meet the stated ordering.
- Check short text is used only when no other type fits.
- Check both entry points and the helper are present, the form ID is saved and read, email collection is disabled, and user instructions match the actual function names.
