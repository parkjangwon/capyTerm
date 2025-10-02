<template>
  <div class="terminal-view-container" ref="terminalContainer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, defineProps, defineExpose } from 'vue';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const props = defineProps<{
  tabId: number;
}>();

const terminalContainer = ref<HTMLElement | null>(null);

let term: Terminal;
let fitAddon: FitAddon;
let resizeObserver: ResizeObserver;

onMounted(() => {
  term = new Terminal({
    cursorBlink: true,
    fontFamily: '"MesloLGS NF", monospace',
    fontSize: 14,
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
    }
  });
  fitAddon = new FitAddon();
  term.loadAddon(fitAddon);

  if (terminalContainer.value) {
    term.open(terminalContainer.value);
    fitAddon.fit();

    resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(terminalContainer.value);
  }
  
  term.onData(data => {
    window.ssh.sendData(props.tabId, data);
  });

  term.onResize((size) => {
    window.ssh.resize(props.tabId, size);
  });

  term.attachCustomKeyEventHandler((arg) => {
    if (arg.metaKey && arg.key === 'l' && arg.type === 'keydown') {
      term.clear();
      return false;
    }
    return true;
  });
});

onBeforeUnmount(() => {
  if (resizeObserver && terminalContainer.value) {
    resizeObserver.unobserve(terminalContainer.value);
  }
  term.dispose();
});

function write(data: string) {
  term.write(data);
}

defineExpose({ write });

</script>

<style scoped>
.terminal-view-container {
  height: 100%;
  width: 100%;
  padding: 10px;
  overflow: hidden;
  box-sizing: border-box;
}

.xterm .xterm-viewport {
    width: 100% !important;
}
</style>