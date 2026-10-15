/**
 * CSV Question Parser & Validator
 *
 * Expected columns:
 * topic,question_text,option_a,option_b,option_c,option_d,correct_option,explanation
 */

export interface ParsedQuestionRow {
  topic: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  status: 'pending';
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ParseResult {
  success: boolean;
  questions: ParsedQuestionRow[];
  errors: ValidationError[];
  totalRows: number;
}

/**
 * Parses a simple CSV string handling quoted strings with commas and escaped quotes.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export function parseAndValidateQuestionsCsv(csvContent: string): ParseResult {
  const rawLines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rawLines.length === 0) {
    return {
      success: false,
      questions: [],
      errors: [{ row: 0, field: 'file', message: 'CSV file is empty.' }],
      totalRows: 0,
    };
  }

  // 1. Validate Header
  const expectedHeaders = [
    'topic',
    'question_text',
    'option_a',
    'option_b',
    'option_c',
    'option_d',
    'correct_option',
    'explanation',
  ];

  const headerCells = parseCSVLine(rawLines[0]).map((h) => h.trim().toLowerCase());
  const headerMatch =
    headerCells.length === expectedHeaders.length &&
    expectedHeaders.every((h, idx) => headerCells[idx] === h);

  if (!headerMatch) {
    return {
      success: false,
      questions: [],
      errors: [
        {
          row: 1,
          field: 'header',
          message: `Invalid CSV header. Expected: ${expectedHeaders.join(',')}. Found: ${headerCells.join(',')}`,
        },
      ],
      totalRows: 0,
    };
  }

  const questions: ParsedQuestionRow[] = [];
  const errors: ValidationError[] = [];

  // 2. Validate Data Rows (1-indexed based on file line number, row 1 is header)
  for (let i = 1; i < rawLines.length; i++) {
    const lineNum = i + 1;
    const cells = parseCSVLine(rawLines[i]).map((c) => c.trim());

    if (cells.length !== 8) {
      errors.push({
        row: lineNum,
        field: 'row',
        message: `Expected 8 columns but found ${cells.length}.`,
      });
      continue;
    }

    const [
      topic,
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      raw_correct,
      explanation,
    ] = cells;

    // Check for empty fields
    if (!topic) errors.push({ row: lineNum, field: 'topic', message: 'Topic is required.' });
    if (!question_text) errors.push({ row: lineNum, field: 'question_text', message: 'Question text is required.' });
    if (!option_a) errors.push({ row: lineNum, field: 'option_a', message: 'Option A is required.' });
    if (!option_b) errors.push({ row: lineNum, field: 'option_b', message: 'Option B is required.' });
    if (!option_c) errors.push({ row: lineNum, field: 'option_c', message: 'Option C is required.' });
    if (!option_d) errors.push({ row: lineNum, field: 'option_d', message: 'Option D is required.' });
    if (!explanation) errors.push({ row: lineNum, field: 'explanation', message: 'Explanation is required.' });

    // Check distinct options
    const options = [option_a, option_b, option_c, option_d].filter(Boolean);
    const uniqueOptions = new Set(options.map((o) => o.toLowerCase()));
    if (options.length === 4 && uniqueOptions.size !== 4) {
      errors.push({
        row: lineNum,
        field: 'options',
        message: 'All four answer options must be distinct from each other.',
      });
    }

    // Check correct option
    const normCorrect = raw_correct ? raw_correct.toUpperCase() : '';
    if (!['A', 'B', 'C', 'D'].includes(normCorrect)) {
      errors.push({
        row: lineNum,
        field: 'correct_option',
        message: `Correct option must be A, B, C, or D (received "${raw_correct}").`,
      });
    }

    if (errors.filter((e) => e.row === lineNum).length === 0) {
      questions.push({
        topic,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option: normCorrect as 'A' | 'B' | 'C' | 'D',
        explanation,
        status: 'pending',
      });
    }
  }

  return {
    success: errors.length === 0,
    questions,
    errors,
    totalRows: rawLines.length - 1,
  };
}
