/**
 * ==========================================================================================
 * V3.0 REFERENCE IMPLEMENTATION: ANTI-BIAS ARCHITECTURAL TRADE-OFF & DECISION FORM
 * ==========================================================================================
 * Skill: google-form-apps-script (v3.0)
 * Validation Status: Passes `node scripts/validate_form_script.js` with 0 errors.
 *
 * Features Demonstrated:
 *   - Zero GCP dependency (100% native FormApp, ContentService, UrlFetchApp, PropertiesService).
 *   - Core Invariants 1-7 enforced (Email off, Q1 Name, all optional, explicit context, final open box).
 *   - Bipolar Linear Scales (addScaleItem) balancing opposing engineering tensions.
 *   - Multi-Dimensional Constraint Grids (addGridItem) with named row-key JSON serialization.
 *   - Failure-Mode Checkboxes (addCheckboxItem) framed strictly by maintenance/failure costs.
 *   - Scalar Invariant Text Inputs (addTextItem) for hard numeric limits.
 *   - Annotated Factual Enum (// @allow-enum-mc) for target environment selection.
 *   - Unified Profile A (HTTP GET JSON Web App), Profile B (Webhook Push), and Profile C (Log).
 * ==========================================================================================
 */

const OPTIONAL_WEBHOOK_URL = ""; // Leave empty for Profile A/C, or set URL and run attachWebhookTrigger()

/**
 * Creates the Anti-Bias Decision Form and stores ACTIVE_FORM_ID in ScriptProperties.
 */
function createAntiBiasDecisionForm() {
  const form = FormApp.create("Autonomous Agent Runtime & Persistence Architecture Intake");

  // ----------------------------------------------------------------------------------------
  // INVARIANT 4: Explicit Context Description
  // ----------------------------------------------------------------------------------------
  form.setDescription(
    "WHY THIS FORM EXISTS: This asynchronous intake resolves architectural trade-offs for the " +
    "multi-agent execution harness without biased multiple-choice prompts or lengthy chat threads. " +
    "Your responses are serialized directly into a structured JSON payload consumed by the build " +
    "pipeline. Estimated completion time: 2 to 3 minutes. Every question is strictly optional."
  );

  form.setConfirmationMessage(
    "Decision parameters recorded. You can now close this tab or query the Web App JSON endpoint."
  );
  form.setAllowResponseEdits(true);
  form.setShowLinkToRespondAgain(false);

  // ----------------------------------------------------------------------------------------
  // INVARIANT 1: Email Collection Disabled
  // ----------------------------------------------------------------------------------------
  form.setCollectEmail(false);

  // ----------------------------------------------------------------------------------------
  // INVARIANT 2 & 3: Question 1 is ALWAYS Name (Optional)
  // ----------------------------------------------------------------------------------------
  form.addTextItem()
    .setTitle("Name")
    .setHelpText("Please enter your name, handle, or operator ID (optional)")
    .setRequired(false);

  // ----------------------------------------------------------------------------------------
  // ANTI-BIAS RULE 1: Bipolar Linear Scales for Opposing Priorities
  // ----------------------------------------------------------------------------------------
  form.addScaleItem()
    .setTitle("Trade-Off 1: Sub-Agent Dispatch Latency vs. Contract Verification Depth")
    .setHelpText("Set the balance between raw execution speed and pre/post-condition schema auditing.")
    .setBounds(1, 5)
    .setLabels(
      "Immediate dispatch (zero intermediate schema checks)",
      "Strict contract verification (validate every payload & state transition)"
    )
    .setRequired(false);

  form.addScaleItem()
    .setTitle("Trade-Off 2: State Persistence Durability vs. Ephemeral Sandbox Isolation")
    .setHelpText("Set the balance between crash-recoverable state history and clean stateless runs.")
    .setBounds(1, 5)
    .setLabels(
      "Purely ephemeral in-memory runs (wipe state on exit)",
      "Full append-only audit log and transactional checkpointing"
    )
    .setRequired(false);

  form.addScaleItem()
    .setTitle("Trade-Off 3: Dependency Footprint vs. Native Implementation Effort")
    .setHelpText("Set the balance between adopting third-party libraries and maintaining custom stdlib code.")
    .setBounds(1, 5)
    .setLabels(
      "Zero external packages (POSIX shell + standard library only)",
      "External specialized libraries allowed to reduce custom code"
    )
    .setRequired(false);

  // ----------------------------------------------------------------------------------------
  // ANTI-BIAS RULE 2: Constraint Tolerance Grid
  // ----------------------------------------------------------------------------------------
  form.addGridItem()
    .setTitle("System Resource & Operational Constraint Matrix")
    .setHelpText("Classify how strictly the architecture must enforce each operational dimension.")
    .setRows([
      "Idle RAM Consumption (Resident Set Size)",
      "Outbound Network Egress & Open Ports",
      "Cold-Start Provisioning Time",
      "API Token / Upstream Inference Spend",
      "Unprivileged POSIX User Isolation Boundaries"
    ])
    .setColumns([
      "Strict / Zero Tolerance",
      "Flexible / Negotiable",
      "Irrelevant / Ignore"
    ])
    .setRequired(false);

  // ----------------------------------------------------------------------------------------
  // ANTI-BIAS RULE 3: Failure-Mode & Maintenance Burden Checkboxes
  // ----------------------------------------------------------------------------------------
  form.addCheckboxItem()
    .setTitle("Acceptable Failure Modes & Ongoing Maintenance Costs")
    .setHelpText("Check ONLY the failure modes and operational burdens you are willing to tolerate.")
    .setChoiceValues([
      "SQLite WAL lock contention if parallel workers write simultaneously",
      "Systemd user-linger daemon supervision and zombie process cleanup",
      "Tailscale / WireGuard tunnel drop stalling remote webhook callbacks",
      "Manual schema migration scripts required whenever agent state changes",
      "Disk space exhaustion from unrotated JSONL execution trace logs",
      "Cron / timer drift delaying scheduled background reconciliation"
    ])
    .showOtherOption(true)
    .setRequired(false);

  // ----------------------------------------------------------------------------------------
  // ANTI-BIAS RULE 4: Scalar Boundaries & Hard Invariants (Short Text)
  // ----------------------------------------------------------------------------------------
  form.addTextItem()
    .setTitle("Hard Memory & Timeout Ceiling")
    .setHelpText("Specify exact scalar limits per worker (e.g., 'Max 512MB RAM, 60s hard kill timeout').")
    .setRequired(false);

  form.addTextItem()
    .setTitle("Forbidden Packages, Commands, or Network Paths")
    .setHelpText("Specify any hard negative invariants (e.g., 'No Docker daemon, no root SSH, no public 0.0.0.0 binds').")
    .setRequired(false);

  // ----------------------------------------------------------------------------------------
  // ANTI-BIAS RULE 5: Annotated Factual Enum (Strictly Mutually Exclusive Target)
  // ----------------------------------------------------------------------------------------
  // @allow-enum-mc
  form.addMultipleChoiceItem()
    .setTitle("Primary Target Execution Host")
    .setHelpText("Select the mutually exclusive target environment for initial deployment.")
    .setChoiceValues([
      "Local WSL2 Workstation (Ubuntu 24.04)",
      "Single Remote Cloud VPS (4 vCPU / 8GB RAM)",
      "Hybrid Local + Remote VPS over Tailscale"
    ])
    .setRequired(false);

  // ----------------------------------------------------------------------------------------
  // INVARIANT 5: Final Question is ALWAYS an Unconstrained Freeform Text Area
  // ----------------------------------------------------------------------------------------
  form.addParagraphTextItem()
    .setTitle("Unconstrained Architectural Overrides & Raw Notes")
    .setHelpText("Write any overrides, edge cases, or exact instructions in whatever format you prefer.")
    .setRequired(false);

  // ----------------------------------------------------------------------------------------
  // INVARIANT 7: Persist ACTIVE_FORM_ID
  // ----------------------------------------------------------------------------------------
  const formId = form.getId();
  PropertiesService.getScriptProperties().setProperty("ACTIVE_FORM_ID", formId);

  if (OPTIONAL_WEBHOOK_URL && OPTIONAL_WEBHOOK_URL.indexOf("http") === 0) {
    attachWebhookTrigger(form);
  }

  Logger.log("====================================================================");
  Logger.log("ANTI-BIAS DECISION FORM INITIALIZED (V3.0)");
  Logger.log("LIVE FORM URL: " + form.getPublishedUrl());
  Logger.log("EDIT FORM URL: " + form.getEditUrl());
  Logger.log("FORM ID:       " + formId);
  Logger.log("====================================================================");

  return formId;
}

/**
 * Profile A: HTTP GET JSON API Endpoint
 * Supports:
 *   ?action=all     (default) All serialized submissions
 *   ?action=latest  Most recent submission only
 *   ?action=summary Metadata and response count
 */
function doGet(e) {
  try {
    const formId = PropertiesService.getScriptProperties().getProperty("ACTIVE_FORM_ID");
    if (!formId) {
      return createJsonOutput({
        status: "error",
        message: "No ACTIVE_FORM_ID configured. Run createAntiBiasDecisionForm() first."
      });
    }

    const form = FormApp.openById(formId);
    const responses = form.getResponses();
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "all";

    if (action === "summary") {
      return createJsonOutput({
        status: "success",
        schemaVersion: "3.0",
        formId: formId,
        formTitle: form.getTitle(),
        publishedUrl: form.getPublishedUrl(),
        totalSubmissions: responses.length,
        isAcceptingResponses: form.isAcceptingResponses()
      });
    }

    const serializedList = responses.map((resp, idx) => serializeFormResponse(resp, idx + 1));

    if (action === "latest") {
      return createJsonOutput({
        status: "success",
        schemaVersion: "3.0",
        formId: formId,
        totalSubmissions: serializedList.length,
        latestSubmission: serializedList.length > 0 ? serializedList[serializedList.length - 1] : null
      });
    }

    return createJsonOutput({
      status: "success",
      schemaVersion: "3.0",
      formId: formId,
      totalSubmissions: serializedList.length,
      submissions: serializedList
    });
  } catch (err) {
    return createJsonOutput({
      status: "error",
      message: err.toString()
    });
  }
}

/**
 * Serializes a FormResponse into clean key-value JSON, automatically converting
 * Grid item positional arrays into named { rowDimension: selectedColumnTier } maps.
 */
function serializeFormResponse(formResponse, submissionIndex) {
  const answers = {};
  const itemResponses = formResponse.getItemResponses();

  itemResponses.forEach(itemResp => {
    const item = itemResp.getItem();
    const title = item.getTitle();
    const type = item.getType();
    const rawValue = itemResp.getResponse();

    if (type === FormApp.ItemType.GRID) {
      const rows = item.asGridItem().getRows();
      const mappedGrid = {};
      rows.forEach((rowName, idx) => {
        mappedGrid[rowName] = (rawValue && rawValue[idx] !== null && rawValue[idx] !== undefined)
          ? rawValue[idx]
          : "Unanswered";
      });
      answers[title] = mappedGrid;
    } else if (type === FormApp.ItemType.CHECKBOX_GRID) {
      const rows = item.asCheckboxGridItem().getRows();
      const mappedCheckGrid = {};
      rows.forEach((rowName, idx) => {
        mappedCheckGrid[rowName] = (rawValue && rawValue[idx]) ? rawValue[idx] : [];
      });
      answers[title] = mappedCheckGrid;
    } else if (type === FormApp.ItemType.SCALE) {
      const scaleItem = item.asScaleItem();
      answers[title] = {
        score: rawValue,
        bounds: [scaleItem.getLowerBound(), scaleItem.getUpperBound()],
        poles: {
          left: scaleItem.getLeftLabel(),
          right: scaleItem.getRightLabel()
        }
      };
    } else {
      answers[title] = rawValue;
    }
  });

  return {
    submission: submissionIndex,
    responseId: formResponse.getId(),
    timestampIso: formResponse.getTimestamp().toISOString(),
    respondentEmail: formResponse.getRespondentEmail() || "Anonymous (Collection Disabled)",
    answers: answers
  };
}

function createJsonOutput(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Profile B: Optional Outbound Webhook Installer & Event Handler
 */
function attachWebhookTrigger(formInstance) {
  const formId = PropertiesService.getScriptProperties().getProperty("ACTIVE_FORM_ID");
  const form = formInstance || FormApp.openById(formId);

  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === "handleFormSubmit") {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger("handleFormSubmit")
    .forForm(form)
    .onFormSubmit()
    .create();
}

function handleFormSubmit(e) {
  try {
    if (!e || !e.response || !OPTIONAL_WEBHOOK_URL) return;

    const payload = {
      event: "anti_bias_form_submission",
      schemaVersion: "3.0",
      formTitle: e.source ? e.source.getTitle() : "Decision Intake",
      formId: e.source ? e.source.getId() : null,
      data: serializeFormResponse(e.response, 1)
    };

    UrlFetchApp.fetch(OPTIONAL_WEBHOOK_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log("Webhook dispatch failed: " + err.toString());
  }
}

/**
 * Profile C: Manual Execution Log JSON Dumper
 */
function getFormResponses() {
  const formId = PropertiesService.getScriptProperties().getProperty("ACTIVE_FORM_ID");
  if (!formId) {
    Logger.log("Error: Run createAntiBiasDecisionForm() first.");
    return;
  }
  const form = FormApp.openById(formId);
  const output = form.getResponses().map((resp, idx) => serializeFormResponse(resp, idx + 1));
  Logger.log("\n" + JSON.stringify(output, null, 2) + "\n");
}
