/**
 * Automated Rule Validator for Google Forms Apps Script Code
 * Usage: node validate_form_script.js <path-to-script.gs>
 * 
 * Verifies the 5 non-negotiable rules:
 *   Rule 1: form.setCollectEmail(false) is present
 *   Rule 2: First question is "Name" and optional
 *   Rule 3: No questions use setRequired(true)
 *   Rule 4: form.setDescription(...) provides meaningful context
 *   Rule 5: Final question is an open paragraph text item (optional)
 */

const fs = require('fs');
const path = require('path');

function validateScript(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const errors = [];
  const warnings = [];

  // Rule 1: Email collection off by default
  if (!content.includes('form.setCollectEmail(false)')) {
    errors.push('Rule 1 Violation: Missing "form.setCollectEmail(false)". Email collection must default to OFF.');
  }

  // Rule 2: Question 1 is Name
  const firstQuestionRegex = /form\.addTextItem\(\)[\s\S]*?\.setTitle\(["']Name["']\)[\s\S]*?\.setRequired\(false\)/;
  if (!firstQuestionRegex.test(content)) {
    errors.push('Rule 2 Violation: Question 1 must be "Name" (addTextItem) with .setRequired(false).');
  }

  // Rule 3: Never require any specific response
  if (content.includes('.setRequired(true)')) {
    errors.push('Rule 3 Violation: Found ".setRequired(true)". All questions must remain optional (.setRequired(false)).');
  }

  // Rule 4: Explicit context
  const descMatch = content.match(/form\.setDescription\(([\s\S]*?)\);/);
  if (!descMatch || descMatch[1].trim().length < 25) {
    errors.push('Rule 4 Violation: form.setDescription(...) must provide meaningful context explaining why the form exists.');
  }

  // Rule 5: Final question is open freeform text area
  const paragraphMatches = [...content.matchAll(/form\.addParagraphTextItem\(\)/g)];
  if (paragraphMatches.length === 0) {
    errors.push('Rule 5 Violation: Missing unconstrained final paragraph text item (form.addParagraphTextItem()).');
  }

  // Check Form ID persistence
  if (!content.includes('PropertiesService.getScriptProperties().setProperty("ACTIVE_FORM_ID"')) {
    warnings.push('Warning: Did not detect PropertiesService persistence for ACTIVE_FORM_ID.');
  }

  console.log(`\n==================================================`);
  console.log(`🔍 VALIDATING: ${path.basename(filePath)}`);
  console.log(`==================================================`);

  if (errors.length === 0) {
    console.log('✅ ALL 5 NON-NEGOTIABLE RULES SATISFIED!');
    if (warnings.length > 0) {
      warnings.forEach(w => console.log(`⚠️ ${w}`));
    }
    console.log(`==================================================\n`);
    return true;
  } else {
    console.log(`❌ FAILED RULE AUDIT (${errors.length} errors found):`);
    errors.forEach(e => console.log(`   - ${e}`));
    console.log(`==================================================\n`);
    return false;
  }
}

// If run directly via CLI
if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.log('Usage: node validate_form_script.js <path-to-script.gs>');
    process.exit(1);
  }
  const passed = validateScript(path.resolve(process.cwd(), target));
  process.exit(passed ? 0 : 1);
}

module.exports = { validateScript };
