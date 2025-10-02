<template>
  <div class="kitty-tab-bar">
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
    type: Array as PropType<Tab[]|any[]|null>,
    required: true,
  },
  activeTabId: {
    type: Number as PropType<number | null>,
    required: true,
  },
});

defineEmits(['switch-tab', 'close-tab']);
</script>

<style scoped>
.kitty-tab-bar {
  display: flex;
  align-items: center;
  background-color: #1e1e1e; /* Same as terminal background */
  padding: 4px 8px;
  flex-shrink: 0;
}

.tabs {
  display: flex;
  flex-grow: 1;
}

.tab-item {
  display: flex;
  align-items: center;
  padding: 4px 12px;
  margin-right: 4px;
  color: #888;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.tab-item.active {
  color: #fff;
  background-color: #333;
}

.tab-item:hover {
  color: #fff;
}

.close-tab-btn {
  background: none;
  border: none;
  color: #888;
  margin-left: 8px;
  cursor: pointer;
  font-size: 1em;
  padding: 0 4px;
  visibility: hidden;
}

.tab-item:hover .close-tab-btn {
  visibility: visible;
}

.close-tab-btn:hover {
  color: #fff;
}
</style>