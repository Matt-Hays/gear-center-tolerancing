<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { formatEditableNumber, parseControlledNumericInput } from '@/lib/forms/numericInput';
import { defaultLengthUnit, fromMillimeters } from '@/lib/units';
import type { MeasurementDefinition, MeasurementRecord, UnitSystem } from '@/types/domain';

const props = defineProps<{
  definition: MeasurementDefinition;
  modelValue: MeasurementRecord;
  required: boolean;
  unitSystem: UnitSystem;
  suggestable?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: MeasurementRecord];
  suggest: [];
}>();

const evidenceOpen = ref(false);
const valueText = ref(formatEditableNumber(props.modelValue.value));
const uncertaintyText = ref(formatEditableNumber(props.modelValue.uncertainty));
const valueInvalid = ref(false);
const uncertaintyInvalid = ref(false);
const valueEditing = ref(false);
const uncertaintyEditing = ref(false);

const placeholderUnit = computed(() =>
  props.definition.unit === 'mm' ? defaultLengthUnit(props.unitSystem) : props.definition.unit
);

const unitOptions = computed(() => {
  if (props.definition.key === 'moduleMetric') {
    return ['mm'];
  }

  if (props.definition.unit === 'mm') {
    const preferred = defaultLengthUnit(props.unitSystem);
    return preferred === 'mm' ? ['mm', 'in'] : ['in', 'mm'];
  }

  return [placeholderUnit.value];
});

const displayPlaceholder = computed(() => {
  if (!props.definition.placeholder) {
    return undefined;
  }

  if (props.definition.unit !== 'mm' || (props.modelValue.unit !== 'mm' && props.modelValue.unit !== 'in')) {
    return props.definition.placeholder;
  }

  const placeholderMm = Number(props.definition.placeholder);
  if (Number.isNaN(placeholderMm)) {
    return props.definition.placeholder;
  }

  if (props.modelValue.unit === 'mm') {
    return trimNumericPlaceholder(placeholderMm, 3);
  }

  return trimNumericPlaceholder(fromMillimeters(placeholderMm, 'in'), 4);
});

watch(
  () => [props.modelValue.value, props.modelValue.unit],
  () => {
    if (valueEditing.value) {
      return;
    }
    valueText.value = formatEditableNumber(props.modelValue.value);
    valueInvalid.value = false;
  }
);

watch(
  () => props.modelValue.uncertainty,
  () => {
    if (uncertaintyEditing.value) {
      return;
    }
    uncertaintyText.value = formatEditableNumber(props.modelValue.uncertainty);
    uncertaintyInvalid.value = false;
  }
);

function trimNumericPlaceholder(value: number, digits: number) {
  return value.toFixed(digits).replace(/\.?0+$/, '');
}

function updateField<K extends keyof MeasurementRecord>(key: K, value: MeasurementRecord[K]) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value
  });
}

function onValueInput(event: Event) {
  const next = (event.target as HTMLInputElement).value;
  valueText.value = next;
  const parsed = parseControlledNumericInput(next);

  if (parsed.status === 'empty') {
    updateField('value', undefined);
    valueInvalid.value = false;
  } else if (parsed.status === 'parsed') {
    updateField('value', parsed.value);
    valueInvalid.value = false;
  } else {
    valueInvalid.value = parsed.status === 'invalid';
  }
}

function onValueBlur() {
  valueEditing.value = false;
  const parsed = parseControlledNumericInput(valueText.value);
  if (parsed.status === 'empty') {
    valueText.value = '';
    updateField('value', undefined);
    valueInvalid.value = false;
    return;
  }

  if (parsed.status === 'parsed') {
    valueText.value = formatEditableNumber(parsed.value);
    updateField('value', parsed.value);
    valueInvalid.value = false;
    return;
  }

  valueText.value = formatEditableNumber(props.modelValue.value);
  valueInvalid.value = false;
}

function onUnitChange(event: Event) {
  updateField('unit', (event.target as HTMLSelectElement).value as MeasurementRecord['unit']);
}

function onTextFieldInput(key: 'method' | 'instrument', event: Event) {
  updateField(key, (event.target as HTMLInputElement).value);
}

function onUncertaintyInput(event: Event) {
  const next = (event.target as HTMLInputElement).value;
  uncertaintyText.value = next;
  const parsed = parseControlledNumericInput(next);

  if (parsed.status === 'empty') {
    updateField('uncertainty', undefined);
    uncertaintyInvalid.value = false;
  } else if (parsed.status === 'parsed') {
    updateField('uncertainty', parsed.value);
    uncertaintyInvalid.value = false;
  } else {
    uncertaintyInvalid.value = parsed.status === 'invalid';
  }
}

function onUncertaintyBlur() {
  uncertaintyEditing.value = false;
  const parsed = parseControlledNumericInput(uncertaintyText.value);
  if (parsed.status === 'empty') {
    uncertaintyText.value = '';
    updateField('uncertainty', undefined);
    uncertaintyInvalid.value = false;
    return;
  }

  if (parsed.status === 'parsed') {
    uncertaintyText.value = formatEditableNumber(parsed.value);
    updateField('uncertainty', parsed.value);
    uncertaintyInvalid.value = false;
    return;
  }

  uncertaintyText.value = formatEditableNumber(props.modelValue.uncertainty);
  uncertaintyInvalid.value = false;
}

function onNotesInput(event: Event) {
  updateField('notes', (event.target as HTMLTextAreaElement).value);
}
</script>

<template>
  <article class="field-card measurement-card">
    <div class="field-header">
      <div>
        <p class="eyebrow">{{ definition.step }}</p>
        <h3 class="field-title">
          {{ definition.label }}
          <span v-if="required" class="required-marker" aria-hidden="true">*</span>
        </h3>
        <p class="field-description">{{ definition.description }}</p>
      </div>
      <div class="button-row">
        <button
          v-if="suggestable"
          type="button"
          class="ghost-button"
          @click="$emit('suggest')"
        >
          Use suggested nominal
        </button>
        <button type="button" class="ghost-button" :aria-expanded="evidenceOpen ? 'true' : 'false'" @click="evidenceOpen = !evidenceOpen">
          {{ evidenceOpen ? 'Hide evidence' : 'Evidence' }}
        </button>
      </div>
    </div>

    <div class="field-grid">
      <label class="field-control">
        <span>Value</span>
        <input
          :value="valueText"
          type="text"
          inputmode="decimal"
          :placeholder="displayPlaceholder"
          class="field-input"
          :aria-invalid="valueInvalid ? 'true' : 'false'"
          @focus="valueEditing = true"
          @input="onValueInput"
          @blur="onValueBlur"
        />
      </label>

      <label class="field-control">
        <span>Unit</span>
        <select
          class="field-input"
          :value="modelValue.unit"
          :disabled="definition.unit === 'deg' || definition.unit === 'count' || definition.unit === 'ratio'"
          @change="onUnitChange"
        >
          <option v-for="unit in unitOptions" :key="unit" :value="unit">
            {{ unit }}
          </option>
        </select>
      </label>
    </div>

    <div v-if="evidenceOpen" class="details-content evidence-panel">
      <div class="field-grid">
      <label class="field-control">
        <span>Method</span>
        <input
          :value="modelValue.method"
          type="text"
          class="field-input"
          placeholder="Micrometer, comparator, gauge block..."
          @input="onTextFieldInput('method', $event)"
        />
      </label>

      <label class="field-control">
        <span>Instrument</span>
        <input
          :value="modelValue.instrument"
          type="text"
          class="field-input"
          placeholder="Calibrated shop tool"
          @input="onTextFieldInput('instrument', $event)"
        />
      </label>

      <label class="field-control">
        <span>Uncertainty</span>
        <input
          :value="uncertaintyText"
          type="text"
          inputmode="decimal"
          class="field-input"
          placeholder="Optional"
          :aria-invalid="uncertaintyInvalid ? 'true' : 'false'"
          @focus="uncertaintyEditing = true"
          @input="onUncertaintyInput"
          @blur="onUncertaintyBlur"
        />
      </label>

      <label class="field-control field-control-wide">
        <span>Notes</span>
        <textarea
          :value="modelValue.notes"
          rows="2"
          class="field-input field-textarea"
          placeholder="Surface condition, wear observations, or measurement context."
          @input="onNotesInput"
        />
      </label>
      </div>
    </div>
  </article>
</template>
