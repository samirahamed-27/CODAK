import { describe, it, expect } from 'vitest';
import { parseAndValidateQuestionsCsv } from '../src/lib/csv-questions';

describe('CSV Question Parser & Validator', () => {
  it('successfully parses valid CSV rows into pending questions', () => {
    const csv = `topic,question_text,option_a,option_b,option_c,option_d,correct_option,explanation
Python Basics,What is 2+2?,3,4,5,6,B,2+2 is 4
Conditionals,What keyword checks conditions?,if,when,case,switch,A,Python uses if for conditionals`;

    const res = parseAndValidateQuestionsCsv(csv);
    expect(res.success).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.questions).toHaveLength(2);
    expect(res.questions[0].topic).toBe('Python Basics');
    expect(res.questions[0].correct_option).toBe('B');
    expect(res.questions[0].status).toBe('pending');
    expect(res.questions[1].correct_option).toBe('A');
  });

  it('rejects CSV with invalid or missing headers', () => {
    const csv = `topic,question_text,option_1,option_2,option_3,option_4,answer,info
Math,What is 1+1?,1,2,3,4,B,Two`;

    const res = parseAndValidateQuestionsCsv(csv);
    expect(res.success).toBe(false);
    expect(res.errors[0].field).toBe('header');
  });

  it('flags row with duplicate answer options', () => {
    const csv = `topic,question_text,option_a,option_b,option_c,option_d,correct_option,explanation
Loops,How to exit a loop?,break,exit,quit,break,A,break exits the loop`;

    const res = parseAndValidateQuestionsCsv(csv);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.field === 'options' && e.message.includes('distinct'))).toBe(true);
  });

  it('flags row with invalid correct_option letter', () => {
    const csv = `topic,question_text,option_a,option_b,option_c,option_d,correct_option,explanation
Types,What is bool?,True or False,A string,A number,A list,Z,Boolean is True or False`;

    const res = parseAndValidateQuestionsCsv(csv);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.field === 'correct_option')).toBe(true);
  });

  it('handles quoted fields with internal commas correctly', () => {
    const csv = `topic,question_text,option_a,option_b,option_c,option_d,correct_option,explanation
"Data Structures","Which list is valid: [1, 2], or [1; 2]?","[1, 2]","[1; 2]","Neither","Both",A,"Python uses commas, not semicolons"`;

    const res = parseAndValidateQuestionsCsv(csv);
    expect(res.success).toBe(true);
    expect(res.questions[0].question_text).toBe('Which list is valid: [1, 2], or [1; 2]?');
    expect(res.questions[0].option_a).toBe('[1, 2]');
    expect(res.questions[0].explanation).toBe('Python uses commas, not semicolons');
  });

  it('reports missing required fields with exact line numbers', () => {
    const csv = `topic,question_text,option_a,option_b,option_c,option_d,correct_option,explanation
,,opt1,opt2,opt3,opt4,A,`;

    const res = parseAndValidateQuestionsCsv(csv);
    expect(res.success).toBe(false);
    expect(res.errors.some((e) => e.row === 2 && e.field === 'topic')).toBe(true);
    expect(res.errors.some((e) => e.row === 2 && e.field === 'question_text')).toBe(true);
    expect(res.errors.some((e) => e.row === 2 && e.field === 'explanation')).toBe(true);
  });
});
