<template>
  <div 
    class="session-item"
    :class="{ selected: isSelected }"
    @click="$emit('select')"
  >
    <div class="session-icon">
      <span v-if="isFolder">📁</span>
      <span v-else>🖥️</span>
    </div>
    <div class="session-info">
      <div class="session-name">{{ displayName }}</div>
      <div v-if="!isFolder" class="session-details">{{ user }}@{{ host }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  displayName: string
  user?: string
  host?: string
  isFolder?: boolean
  isSelected?: boolean
}

defineProps<Props>()

defineEmits<{
  select: []
}>()
</script>

<style scoped>
.session-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.15s ease;
}

.session-item:hover {
  background: rgba(var(--fg-rgb, 0, 0, 0), 0.05);
}

.session-item.selected {
  background: rgba(25, 118, 210, 0.15);
  border-left: 3px solid #1976d2;
  padding-left: 13px;
}

.session-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--fg);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-details {
  font-size: 12px;
  color: rgba(var(--fg-rgb, 0, 0, 0), 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
}
</style>
