<template>
  <div class="terminal-view-container">
    <div id="session-controls">
      <span>{{ connectionInfo.username }}@{{ connectionInfo.host }}</span>
      <button @click="onDisconnect">연결 끊기</button>
    </div>
    <div id="terminal-container" ref="terminalContainer"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, defineProps, defineEmits, defineExpose } from 'vue';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const props = defineProps<{
  tabId: number;
  connectionInfo: { host: string, username: string };
}>();

const emit = defineEmits(['disconnect']);

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

  term.onResize(({ cols, rows }) => {
    window.ssh.resize(props.tabId, { cols, rows });
  });
});

onBeforeUnmount(() => {
  if (resizeObserver && terminalContainer.value) {
    resizeObserver.unobserve(terminalContainer.value);
  }
  term.dispose();
});

function onDisconnect() {
  emit('disconnect');
}

function write(data: string) {
  term.write(data);
}

function updateFont(fontFamily: string, fontSize: number) {
  if (term) {
    term.options.fontFamily = fontFamily;
    term.options.fontSize = fontSize;
    fitAddon.fit();
  }
}

// Expose the write method to the parent component
defineExpose({ write, updateFont });

</script>

<style scoped>
.terminal-view-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}

#session-controls {
  padding: 10px;
  background-color: #333;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

#session-controls button {
   padding: 5px 10px;
   border-radius: 4px;
   border: none;
   background-color: #cc3e00;
   color: white;
   cursor: pointer;
}
#session-controls button:hover {
  background-color: #9e3000;
}

#terminal-container {
  flex-grow: 1;
  padding: 10px;
  overflow: hidden;
}

.xterm .xterm-viewport {
    width: 100% !important;
}
</style>
