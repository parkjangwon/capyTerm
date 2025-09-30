<template>
  <div class="terminal-tab-content">
    <ConnectionForm v-if="!connected" :default-options="connectionOptions" @connect="(options) => $emit('connect', options)" />
    <TerminalView 
      v-else 
      ref="terminalViewRef"
      :tab-id="tabId"
      :connection-info="connectionOptions" 
      @disconnect="$emit('disconnect')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, defineExpose } from 'vue';
import ConnectionForm from './ConnectionForm.vue';
import TerminalView from './TerminalView.vue';

const terminalViewRef = ref<InstanceType<typeof TerminalView> | null>(null);

defineProps<{
  tabId: number;
  connected: boolean;
  connectionOptions: { host: string, username: string };
}>();

defineEmits(['connect', 'disconnect']);

function write(data: string) {
  terminalViewRef.value?.write(data);
}

function updateFont(fontFamily: string, fontSize: number) {
  terminalViewRef.value?.updateFont(fontFamily, fontSize);
}

defineExpose({ write, updateFont });

</script>

<style scoped>
.terminal-tab-content {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}
</style>
