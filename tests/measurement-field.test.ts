import { render } from '@testing-library/vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MeasurementField from '@/components/MeasurementField.vue';
import { getMeasurementDefinition } from '@/data/measurementCatalog';
import { parseControlledNumericInput } from '@/lib/forms/numericInput';
import type { MeasurementKey, MeasurementRecord } from '@/types/domain';

function createRecord(key: MeasurementKey, unit: MeasurementRecord['unit']): MeasurementRecord {
  const definition = getMeasurementDefinition(key);
  if (!definition) {
    throw new Error(`Missing definition for ${key}`);
  }

  return {
    key,
    label: definition.label,
    unit,
    method: '',
    instrument: '',
    notes: ''
  };
}

describe('MeasurementField', () => {
  it('converts metric placeholders into inch placeholders for imperial fields', () => {
    const definition = getMeasurementDefinition('nominalShaftSize');
    if (!definition) {
      throw new Error('Missing nominal shaft size definition');
    }

    const { getByLabelText } = render(MeasurementField, {
      props: {
        definition,
        modelValue: createRecord('nominalShaftSize', 'in'),
        required: true,
        unitSystem: 'imperial'
      }
    });

    expect(getByLabelText('Value').getAttribute('placeholder')).toBe('1');
  });

  it('keeps the metric placeholder for metric fields', () => {
    const definition = getMeasurementDefinition('nominalShaftSize');
    if (!definition) {
      throw new Error('Missing nominal shaft size definition');
    }

    const { getByLabelText } = render(MeasurementField, {
      props: {
        definition,
        modelValue: createRecord('nominalShaftSize', 'mm'),
        required: true,
        unitSystem: 'metric'
      }
    });

    expect(getByLabelText('Value').getAttribute('placeholder')).toBe('25.4');
  });

  it('hides evidence inputs until the evidence toggle is opened', () => {
    const definition = getMeasurementDefinition('nominalShaftSize');
    if (!definition) {
      throw new Error('Missing nominal shaft size definition');
    }

    const { queryByLabelText, getByRole } = render(MeasurementField, {
      props: {
        definition,
        modelValue: createRecord('nominalShaftSize', 'mm'),
        required: true,
        unitSystem: 'metric'
      }
    });

    expect(queryByLabelText('Method')).toBeNull();
    expect(getByRole('button', { name: 'Evidence' })).toBeTruthy();
  });

  it('parses decimal and comma-decimal values correctly', () => {
    expect(parseControlledNumericInput('1.25')).toMatchObject({ status: 'parsed', value: 1.25 });
    expect(parseControlledNumericInput('.125')).toMatchObject({ status: 'parsed', value: 0.125 });
    expect(parseControlledNumericInput('0.')).toMatchObject({ status: 'parsed', value: 0 });
    expect(parseControlledNumericInput('1,25')).toMatchObject({ status: 'parsed', value: 1.25 });
  });

  it.each([
    ['faceWidth', 'mm'],
    ['moduleMetric', 'mm'],
    ['rackLinearPitch', 'mm'],
    ['runoutFrMeasured', 'mm'],
    ['mountingFaceRunout', 'mm'],
    ['boreDiameterMeasured', 'mm'],
    ['shaftDiameterMeasured', 'mm'],
    ['pitchDiameterKnown', 'mm']
  ] as const)('commits decimal input for %s', async (key, unit) => {
    const definition = getMeasurementDefinition(key);
    if (!definition) {
      throw new Error(`Missing definition for ${key}`);
    }

    const wrapper = mount(MeasurementField, {
      props: {
        definition,
        modelValue: createRecord(key, unit),
        required: true,
        unitSystem: 'metric'
      }
    });

    const valueInput = wrapper.find('input');

    await valueInput.setValue('1.25');
    await valueInput.trigger('blur');

    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect(emitted?.some(([payload]) => payload.value === 1.25)).toBe(true);
  });
});
