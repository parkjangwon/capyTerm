<template>
  <div class="section">
    <h4>{{ $t('settings.theme') }}</h4>
    <div class="row">
      <label>
        <input type="radio" value="light" v-model="themeLocal" /> {{ $t('settings.light') }}
      </label>
      <label>
        <input type="radio" value="dark" v-model="themeLocal" /> {{ $t('settings.dark') }}
      </label>
    </div>
    <div class="row">
      <label>{{ $t('app.language') }}</label>
      <select v-model="languageLocal" @change="onChangeLanguage">
        <option value="ko">{{ $t('app.korean') }}</option>
        <option value="en">{{ $t('app.english') }}</option>
      </select>
    </div>
    <div class="row">
      <label>{{ $t('settings.font') }}</label>
      <input type="text" v-model="fontLocal" @input="onChangeFont" :placeholder="$t('settings.fontPlaceholder')" />
    </div>
    <div class="row">
      <label>{{ $t('settings.fontSize') }}</label>
      <input type="text" v-model="fontSizeLocal" @input="onChangeFontSize" :placeholder="$t('settings.fontSizePlaceholder')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import { useI18n } from 'vue-i18n'

const settings = useSettingsStore()
const { locale } = useI18n()

const themeLocal = ref(settings.theme)
const languageLocal = ref(settings.language)
const fontLocal = ref(settings.font)
const fontSizeLocal = ref(settings.fontSize)

watch(themeLocal, (v: string) => settings.setTheme(v as any))

function onChangeLanguage() {
  settings.setLanguage(languageLocal.value as any)
  locale.value = settings.language
}

function onChangeFont() {
  settings.setFont(fontLocal.value)
}

function onChangeFontSize() {
  settings.setFontSize(fontSizeLocal.value)
}

defineExpose({ themeLocal, languageLocal, fontLocal, fontSizeLocal })
</script>

<style scoped>
.section { margin-bottom: 20px; }
.row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
input, select { background: var(--input-bg); color: var(--fg); border: 1px solid var(--border); border-radius: 4px; padding: 6px 8px; }
</style>
