<script setup lang="ts">
import { useTheme } from '@/composables/useTheme';
import type { ThemePreference } from '@/types/domain';

const { preference, setTheme } = useTheme();

const options: { label: string; value: ThemePreference }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' }
];
</script>

<template>
  <div class="toggle-group" aria-label="Theme preference" role="group">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="toggle-pill"
      :class="{ 'toggle-pill-active': preference === option.value }"
      @click="setTheme(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
