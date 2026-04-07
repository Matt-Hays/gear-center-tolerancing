import { computed, ref, watch } from 'vue';
import type { ThemePreference } from '@/types/domain';

const STORAGE_KEY = 'gear-bore-tolerancing:theme';
const preference = ref<ThemePreference>('system');
const media = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(value: ThemePreference) {
  const isDark = value === 'dark' || (value === 'system' && media.matches);
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
}

const persisted = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
if (persisted === 'light' || persisted === 'dark' || persisted === 'system') {
  preference.value = persisted;
}

applyTheme(preference.value);

media.addEventListener('change', () => {
  applyTheme(preference.value);
});

watch(preference, (value) => {
  localStorage.setItem(STORAGE_KEY, value);
  applyTheme(value);
});

export function useTheme() {
  const resolvedTheme = computed(() =>
    preference.value === 'system' ? (media.matches ? 'dark' : 'light') : preference.value
  );

  function setTheme(value: ThemePreference) {
    preference.value = value;
  }

  return {
    preference,
    resolvedTheme,
    setTheme
  };
}
