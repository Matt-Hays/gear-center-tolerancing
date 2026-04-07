import type { ControlledNumericParseResult } from '@/types/domain';

const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d*)?$/;

export function formatEditableNumber(value?: number) {
  return value === undefined ? '' : `${value}`;
}

export function parseControlledNumericInput(rawText: string): ControlledNumericParseResult {
  const normalizedText = rawText.trim().replace(/,/g, '.');

  if (normalizedText === '') {
    return {
      status: 'empty',
      rawText,
      normalizedText
    };
  }

  if (
    normalizedText === '-' ||
    normalizedText === '+' ||
    normalizedText === '.' ||
    normalizedText === '-.' ||
    normalizedText === '+.'
  ) {
    return {
      status: 'intermediate',
      rawText,
      normalizedText
    };
  }

  const parsedValue = Number(normalizedText);
  if (Number.isFinite(parsedValue) && DECIMAL_PATTERN.test(normalizedText)) {
    return {
      status: 'parsed',
      rawText,
      normalizedText,
      value: parsedValue
    };
  }

  if (DECIMAL_PATTERN.test(normalizedText)) {
    return {
      status: 'intermediate',
      rawText,
      normalizedText
    };
  }

  return {
    status: 'invalid',
    rawText,
    normalizedText
  };
}
