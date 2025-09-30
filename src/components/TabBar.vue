<template>
  <div class="tab-bar">
    <div class="tabs">
      <div 
        v-for="tab in tabs" 
        :key="tab.id"
        class="tab-item"
        :class="{ active: tab.id === activeTabId }"
        @click="$emit('switch-tab', tab.id)"
      >
        <span>{{ tab.name }}</span>
        <button class="close-tab-btn" @click.stop="$emit('close-tab', tab.id)">×</button>
      </div>
    </div>
    <button class="new-tab-btn" @click="$emit('duplicate-tab')">❐</button>
    <button class="new-tab-btn" @click="$emit('new-tab')">+</button>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';

interface Tab {
  id: number;
  name: string;
}

defineProps({
  tabs: {
    type: Array as PropType<Tab[]>,
    required: true,
  },
  activeTabId: {
    type: Number,
    required: true,
  },
});

defineEmits(['switch-tab', 'close-tab', 'new-tab', 'duplicate-tab']);
</script>

<style scoped>
.tab-bar {
  display: flex;
  align-items: center;
  background-color: #282c34;
  padding: 5px 10px;
  flex-shrink: 0;
}

.tabs {
  display: flex;
  flex-grow: 1;
}

.tab-item {
  display: flex;
  align-items: center;
  padding: 8px 15px;
  margin-right: 5px;
  background-color: #3a3f4b;
  color: #abb2bf;
  border-radius: 5px 5px 0 0;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

.tab-item.active {
  background-color: #1e1e1e;
  color: white;
}

.tab-item:hover {
  background-color: #4f5666;
}

.tab-item.active:hover {
  background-color: #1e1e1e;
}

.close-tab-btn {
  background: none;
  border: none;
  color: #abb2bf;
  margin-left: 10px;
  cursor: pointer;
  font-size: 1.2em;
  padding: 0 5px;
}

.close-tab-btn:hover {
  color: white;
  background-color: #5c6370;
  border-radius: 50%;
}

.new-tab-btn {
  background-color: #3a3f4b;
  border: none;
  color: white;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 1.5em;
  line-height: 28px;
  text-align: center;
  cursor: pointer;
  margin-left: 10px;
}

.new-tab-btn:hover {
  background-color: #4f5666;
}
</style>
