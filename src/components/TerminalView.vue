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

    // 더블 클릭으로 복사
    terminalContainer.value.addEventListener('dblclick', handleDoubleClick);
    
    // 우클릭으로 붙여넣기
    terminalContainer.value.addEventListener('contextmenu', handleRightClick);

    // 키보드 단축키 처리
    terminalContainer.value.addEventListener('keydown', handleKeyDown);
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
  if (terminalContainer.value) {
    terminalContainer.value.removeEventListener('dblclick', handleDoubleClick);
    terminalContainer.value.removeEventListener('contextmenu', handleRightClick);
    terminalContainer.value.removeEventListener('keydown', handleKeyDown);
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

// 더블 클릭으로 선택된 텍스트 복사
async function handleDoubleClick() {
  const selection = term.getSelection();
  if (selection) {
    try {
      await navigator.clipboard.writeText(selection);
      console.log('텍스트 복사됨:', selection);
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
    }
  }
}

// 우클릭으로 붙여넣기
async function handleRightClick(event: MouseEvent) {
  event.preventDefault();
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      term.paste(text);
      console.log('텍스트 붙여넣기됨');
    }
  } catch (err) {
    console.error('클립보드 읽기 실패:', err);
  }
}

// 키보드 단축키 처리
async function handleKeyDown(event: KeyboardEvent) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  if (isMac) {
    // macOS: Cmd+C (복사), Cmd+V (붙여넣기)
    if (event.metaKey && event.key === 'c') {
      const selection = term.getSelection();
      if (selection) {
        event.preventDefault();
        try {
          await navigator.clipboard.writeText(selection);
          console.log('텍스트 복사됨 (Cmd+C)');
        } catch (err) {
          console.error('클립보드 복사 실패:', err);
        }
      }
    } else if (event.metaKey && event.key === 'v') {
      event.preventDefault();
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          term.paste(text);
          console.log('텍스트 붙여넣기됨 (Cmd+V)');
        }
      } catch (err) {
        console.error('클립보드 읽기 실패:', err);
      }
    }
  } else {
    // Windows/Linux: Ctrl+Insert (복사), Shift+Insert (붙여넣기)
    if (event.ctrlKey && event.key === 'Insert') {
      const selection = term.getSelection();
      if (selection) {
        event.preventDefault();
        try {
          await navigator.clipboard.writeText(selection);
          console.log('텍스트 복사됨 (Ctrl+Insert)');
        } catch (err) {
          console.error('클립보드 복사 실패:', err);
        }
      }
    } else if (event.shiftKey && event.key === 'Insert') {
      event.preventDefault();
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          term.paste(text);
          console.log('텍스트 붙여넣기됨 (Shift+Insert)');
        }
      } catch (err) {
        console.error('클립보드 읽기 실패:', err);
      }
    }
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
