#!/usr/bin/env node
/**
 * ============================================================================
 * Automated Static Analyzer & Anti-Bias Validator for Google Forms Apps Script
 * Skill: google-form-apps-script (v3.0)
 * Usage: node scripts/validate_form_script.js <path-to-script.gs>
 * ============================================================================
 * Enforces:
 *   Invariant 1: form.setCollectEmail(false) must be invoked
 *   Invariant 2: First question must be "Name" (addTextItem) and optional
 *   Invariant 3: Zero occurrences of .setRequired(true); all items .setRequired(false)
 *   Invariant 4: form.setDescription(...) provides substantive context (>= 40 chars)
 *   Invariant 5: Final question must be an open paragraph text item (addParagraphTextItem)
 *   Invariant 6: PropertiesService stores ACTIVE_FORM_ID
 *   Anti-Bias 1: Unauthorized addMultipleChoiceItem() calls are blocked unless annotated
 *                with // @allow-enum-mc and free of biased framing words
 *   Anti-Bias 2: All addScaleItem() calls must define substantive bipolar .setLabels(a, b)
 *   Anti-Bias 3: All addGridItem() calls must define .setRows([...]) and tolerance .setColumns([...])
 *   Anti-Bias 4: All addCheckboxItem() choices must avoid positive marketing/bias spin
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const QUESTION_ADDERS = [
  'addTextItem',
  'addParagraphTextItem',
  'addMultipleChoiceItem',
  'addCheckboxItem',
  'addListItem',
  'addScaleItem',
  'addDateItem',
  'addTimeItem',
  'addDateTimeItem',
  'addDurationItem',
  'addGridItem',
  'addCheckboxGridItem'
];

const WEAK_SCALE_LABELS = new Set([
  'min', 'max', 'minimum', 'maximum',
  'low', 'high', 'lowest', 'highest',
  'bad', 'good', 'worst', 'best',
  'disagree', 'agree', ' strongly disagree', 'strongly agree',
  'none', 'all', 'weak', 'strong', '1', '5', '10'
]);

const MARKETING_BIAS_REGEX = /\b(recommended|best practice|optimal|ideal|seamless|effortless|easy|fastest and best|preferred|no downsides|zero overhead)\b/i;
const TOLERANCE_COLUMN_REGEX = /\b(strict|flexible|irrelevant|ignore|negotiable|zero tolerance|hard limit|soft limit|unconstrained)\b/i;

function extractItemBlocks(source) {
  const blocks = [];
  const regex = new RegExp(`form\\.(${QUESTION_ADDERS.join('|')})\\(\\)`, 'g');
  let match;

  while ((match = regex.exec(source)) !== null) {
    const method = match[1];
    const startIdx = match.index;

    // Look back up to 200 chars for preceding comments (such as // @allow-enum-mc)
    const lookbackStart = Math.max(0, startIdx - 200);
    const precedingText = source.slice(lookbackStart, startIdx);

    // Find end of statement (semicolon outside of strings/arrays/parens)
    let depth = 0;
    let inString = false;
    let stringChar = '';
    let endIdx = source.length;

    for (let i = startIdx; i < source.length; i++) {
      const ch = source[i];
      const prev = i > 0 ? source[i - 1] : '';

      if (inString) {
        if (ch === stringChar && prev !== '\\') {
          inString = false;
        }
      } else {
        if (ch === '"' || ch === "'" || ch === '`') {
          inString = true;
          stringChar = ch;
        } else if (ch === '(' || ch === '[' || ch === '{') {
          depth++;
        } else if (ch === ')' || ch === ']' || ch === '}') {
          depth = Math.max(0, depth - 1);
        } else if (ch === ';' && depth === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }

    const lineNumber = source.slice(0, startIdx).split('\n').length;
    blocks.push({
      method,
      lineNumber,
      precedingText,
      statement: source.slice(startIdx, endIdx)
    });
  }

  return blocks;
}

function validateScript(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const errors = [];
  const warnings = [];

  // -------------------------------------------------------------------------
  // INVARIANT 1: Email collection off by default
  // -------------------------------------------------------------------------
  if (!/form\.setCollectEmail\(\s*false\s*\)/.test(content)) {
    errors.push(
      'Invariant 1 Violation: Missing "form.setCollectEmail(false)". Email collection must be explicitly disabled.'
    );
  }
  if (/form\.setCollectEmail\(\s*true\s*\)/.test(content)) {
    errors.push(
      'Invariant 1 Violation: Found "form.setCollectEmail(true)". Email collection must be disabled by default.'
    );
  }

  // -------------------------------------------------------------------------
  // INVARIANT 3: Never require any response
  // -------------------------------------------------------------------------
  if (/\.setRequired\(\s*true\s*\)/.test(content)) {
    errors.push(
      'Invariant 3 Violation: Found ".setRequired(true)". Every question item must remain strictly optional (.setRequired(false)).'
    );
  }

  // -------------------------------------------------------------------------
  // INVARIANT 4: Explicit context in form.setDescription(...)
  // -------------------------------------------------------------------------
  const descMatch = content.match(/form\.setDescription\(([\s\S]*?)\);/);
  if (!descMatch) {
    errors.push(
      'Invariant 4 Violation: Missing "form.setDescription(...)". The form must explain why it exists and how responses are used.'
    );
  } else {
    const cleanedDesc = descMatch[1].replace(/["'+`\s\n\r]/g, '');
    if (cleanedDesc.length < 40) {
      errors.push(
        'Invariant 4 Violation: "form.setDescription(...)" is too short. Provide explicit context, background, and time commitment.'
      );
    }
  }

  // -------------------------------------------------------------------------
  // INVARIANT 6: PropertiesService ACTIVE_FORM_ID persistence
  // -------------------------------------------------------------------------
  if (!/PropertiesService\.getScriptProperties\(\)\.setProperty\(\s*["']ACTIVE_FORM_ID["']/.test(content)) {
    warnings.push(
      'Invariant 6 Warning: Missing PropertiesService.getScriptProperties().setProperty("ACTIVE_FORM_ID", formId).'
    );
  }

  // -------------------------------------------------------------------------
  // PARSE ORDERED QUESTION ITEMS FOR INVARIANTS 2, 3, 5 & ANTI-BIAS CHECKS
  // -------------------------------------------------------------------------
  const itemBlocks = extractItemBlocks(content);

  if (itemBlocks.length < 2) {
    errors.push(
      `Structure Violation: Expected at least 2 question items (Name + Final Paragraph), found ${itemBlocks.length}.`
    );
  } else {
    // INVARIANT 2: First question must be "Name" (addTextItem)
    const firstItem = itemBlocks[0];
    const hasNameTitle = /\.setTitle\(\s*["']Name["']\s*\)/.test(firstItem.statement);
    if (firstItem.method !== 'addTextItem' || !hasNameTitle) {
      errors.push(
        `Invariant 2 Violation (Line ${firstItem.lineNumber}): Question 1 must be form.addTextItem().setTitle("Name"), found ${firstItem.method}.`
      );
    }

    // INVARIANT 5: Final question must be open freeform paragraph text
    const lastItem = itemBlocks[itemBlocks.length - 1];
    if (lastItem.method !== 'addParagraphTextItem') {
      errors.push(
        `Invariant 5 Violation (Line ${lastItem.lineNumber}): Final question must be form.addParagraphTextItem(), found ${lastItem.method}.`
      );
    }
  }

  // Inspect every item block individually
  itemBlocks.forEach((block, index) => {
    const { method, lineNumber, precedingText, statement } = block;
    const titleMatch = statement.match(/\.setTitle\(\s*["'`]([^"'`]+)["'`]\s*\)/);
    const labelTitle = titleMatch ? `"${titleMatch[1]}"` : `(Item #${index + 1})`;

    // Check explicit .setRequired(false) on every question item
    if (!/\.setRequired\(\s*false\s*\)/.test(statement)) {
      errors.push(
        `Invariant 3 Violation (Line ${lineNumber}, ${method} ${labelTitle}): Missing explicit ".setRequired(false)".`
      );
    }

    // -----------------------------------------------------------------------
    // ANTI-BIAS RULE 1: Multiple-Choice Ban (unless // @allow-enum-mc)
    // -----------------------------------------------------------------------
    if (method === 'addMultipleChoiceItem' || method === 'addListItem') {
      const hasEnumAnnotation = /\/\/\s*@allow-enum-mc/.test(precedingText);
      if (!hasEnumAnnotation) {
        errors.push(
          `Anti-Bias Violation (Line ${lineNumber}, ${method} ${labelTitle}): Unannotated multiple-choice/dropdown item detected. ` +
          `Use addScaleItem() for trade-offs, addGridItem() for constraints, or addCheckboxItem() for failure modes. ` +
          `If this is a strictly factual mutually exclusive enum, add "// @allow-enum-mc" directly above the item.`
        );
      }
      if (MARKETING_BIAS_REGEX.test(statement)) {
        errors.push(
          `Anti-Bias Violation (Line ${lineNumber}, ${method} ${labelTitle}): Choice values contain biased or leading language.`
        );
      }
    }

    // -----------------------------------------------------------------------
    // ANTI-BIAS RULE 2: Bipolar Linear Scale Validation
    // -----------------------------------------------------------------------
    if (method === 'addScaleItem') {
      const boundsMatch = statement.match(/\.setBounds\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
      if (!boundsMatch) {
        errors.push(
          `Anti-Bias Scale Violation (Line ${lineNumber}, ${labelTitle}): Missing ".setBounds(1, 5)".`
        );
      }

      const labelsMatch = statement.match(/\.setLabels\(\s*["'`]([^"'`]+)["'`]\s*,\s*["'`]([^"'`]+)["'`]\s*\)/);
      if (!labelsMatch) {
        errors.push(
          `Anti-Bias Scale Violation (Line ${lineNumber}, ${labelTitle}): Missing ".setLabels(leftPole, rightPole)". Bipolar scales must explicitly label both competing extremes.`
        );
      } else {
        const leftPole = labelsMatch[1].trim();
        const rightPole = labelsMatch[2].trim();

        if (
          leftPole.length < 8 ||
          rightPole.length < 8 ||
          WEAK_SCALE_LABELS.has(leftPole.toLowerCase()) ||
          WEAK_SCALE_LABELS.has(rightPole.toLowerCase())
        ) {
          errors.push(
            `Anti-Bias Scale Violation (Line ${lineNumber}, ${labelTitle}): Scale labels ("${leftPole}" vs. "${rightPole}") are generic or non-bipolar. Both endpoints must describe concrete, valid competing priorities.`
          );
        }

        if (leftPole.toLowerCase() === rightPole.toLowerCase()) {
          errors.push(
            `Anti-Bias Scale Violation (Line ${lineNumber}, ${labelTitle}): Scale endpoints cannot be identical.`
          );
        }
      }
    }

    // -----------------------------------------------------------------------
    // ANTI-BIAS RULE 3: Constraint Tolerance Grid Validation
    // -----------------------------------------------------------------------
    if (method === 'addGridItem' || method === 'addCheckboxGridItem') {
      const rowsMatch = statement.match(/\.setRows\(\s*\[([\s\S]*?)\]\s*\)/);
      const colsMatch = statement.match(/\.setColumns\(\s*\[([\s\S]*?)\]\s*\)/);

      if (!rowsMatch || rowsMatch[1].trim().length === 0) {
        errors.push(
          `Anti-Bias Grid Violation (Line ${lineNumber}, ${labelTitle}): Grid item must define constraint dimensions via ".setRows([...])".`
        );
      }
      if (!colsMatch || colsMatch[1].trim().length === 0) {
        errors.push(
          `Anti-Bias Grid Violation (Line ${lineNumber}, ${labelTitle}): Grid item must define tolerance tiers via ".setColumns([...])".`
        );
      } else if (!TOLERANCE_COLUMN_REGEX.test(colsMatch[1])) {
        errors.push(
          `Anti-Bias Grid Violation (Line ${lineNumber}, ${labelTitle}): Grid columns must represent uniform tolerance levels (e.g., "Strict", "Flexible", "Irrelevant"). Found: [${colsMatch[1].trim()}].`
        );
      }
    }

    // -----------------------------------------------------------------------
    // ANTI-BIAS RULE 4: Failure-Mode / Downside Checkbox Validation
    // -----------------------------------------------------------------------
    if (method === 'addCheckboxItem') {
      const choicesMatch = statement.match(/\.setChoiceValues\(\s*\[([\s\S]*?)\]\s*\)/);
      if (!choicesMatch || choicesMatch[1].trim().length === 0) {
        errors.push(
          `Anti-Bias Checkbox Violation (Line ${lineNumber}, ${labelTitle}): Missing ".setChoiceValues([...])".`
        );
      } else {
        const choicesRaw = choicesMatch[1];
        if (MARKETING_BIAS_REGEX.test(choicesRaw)) {
          errors.push(
            `Anti-Bias Checkbox Violation (Line ${lineNumber}, ${labelTitle}): Checkbox options contain positive marketing/bias terms. Every option must be phrased strictly as its maintenance cost, dependency overhead, or failure mode.`
          );
        }
      }
    }
  });

  // -------------------------------------------------------------------------
  // OUTPUT REPORT
  // -------------------------------------------------------------------------
  console.log('====================================================================');
  console.log(`STATIC ANALYSIS & ANTI-BIAS AUDIT: ${path.basename(filePath)}`);
  console.log(`Detected Question Items: ${itemBlocks.length}`);
  console.log('====================================================================');

  if (errors.length === 0) {
    console.log('PASS: All 6 Core Invariants and 4 Anti-Bias Routing Rules satisfied.');
    if (warnings.length > 0) {
      warnings.forEach(w => console.log(`WARN: ${w}`));
    }
    console.log('====================================================================\n');
    return true;
  } else {
    console.log(`FAIL: ${errors.length} rule violation(s) detected:`);
    errors.forEach((err, i) => console.log(`  [${i + 1}] ${err}`));
    if (warnings.length > 0) {
      warnings.forEach(w => console.log(`  [WARN] ${w}`));
    }
    console.log('====================================================================\n');
    return false;
  }
}

if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node scripts/validate_form_script.js <path-to-script.gs>');
    process.exit(1);
  }
  const passed = validateScript(path.resolve(process.cwd(), target));
  process.exit(passed ? 0 : 1);
}

module.exports = { validateScript };
