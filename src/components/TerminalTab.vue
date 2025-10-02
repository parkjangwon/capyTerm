<template>
  <div class="terminal-tab-content">
    <div v-if="!connected" class="connection-form-container">
      <form @submit.prevent="submitConnection" class="connection-form">
        <h3>New Connection</h3>
        <div class="form-group">
          <label for="connectionString">Connection</label>
          <input :id="`connectionString-${tabId}`" v-model="form.connectionString" type="text" placeholder="user@host" required />
        </div>
        <div class="form-group">
          <label for="port">Port</label>
          <input :id="`port-${tabId}`" v-model.number="form.port" type="number" required />
        </div>
        <div class="form-group">
          <label>Authentication</label>
          <div class="auth-method">
            <label><input type="radio" v-model="form.authMethod" value="password"> Password</label>
            <label><input type="radio" v-model="form.authMethod" value="key"> Key File</label>
          </div>
        </div>

        <div v-if="form.authMethod === 'password'" class="form-group">
          <label for="password">Password</label>
          <input :id="`password-${tabId}`" v-model="form.password" type="password" />
        </div>

        <div v-if="form.authMethod === 'key'">
          <div class="form-group">
            <label for="privateKeyPath">Private Key Path</label>
            <input :id="`privateKeyPath-${tabId}`" v-model="form.privateKeyPath" type="text" placeholder="e.g., ~/.ssh/id_rsa" />
          </div>
          <div class="form-group">
            <label for="passphrase">Passphrase (optional)</label>
            <input :id="`passphrase-${tabId}`" v-model="form.passphrase" type="password" />
          </div>
        </div>
        <div class="form-group">
          <label class="remember-me">
            <input type="checkbox" v-model="form.remember" />
            Remember me
          </label>
        </div>
        <button type="submit">Connect</button>
      </form>
    </div>
    <TerminalView 
      v-else 
      ref="terminalViewRef"
      :tab-id="tabId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, defineProps, defineEmits, defineExpose } from 'vue';
import TerminalView from './TerminalView.vue';

const props = defineProps<{
  tabId: number;
  connected: boolean;
}>();

const emit = defineEmits(['connect']);

const terminalViewRef = ref<InstanceType<typeof TerminalView> | null>(null);

const form = reactive({
  connectionString: '',
  port: 22,
  authMethod: 'password',
  password: '',
  privateKeyPath: '',
  passphrase: '',
  remember: false,
});

function submitConnection() {
  if (form.remember) {
    const { connectionString, port, authMethod, privateKeyPath } = form;
    localStorage.setItem('capyTerm.connection', JSON.stringify({ connectionString, port, authMethod, privateKeyPath }));
  } else {
    localStorage.removeItem('capyTerm.connection');
  }

  const [username, host] = form.connectionString.split('@');

  const options: any = {
    host: host || username,
    username: host ? username : undefined,
    port: form.port,
  };

  if (form.authMethod === 'key') {
    options.privateKeyPath = form.privateKeyPath;
    if (form.passphrase) {
      options.passphrase = form.passphrase;
    }
  } else {
    options.password = form.password;
  }
  
  emit('connect', options);
}

onMounted(() => {
  const savedConnection = localStorage.getItem('capyTerm.connection');
  if (savedConnection) {
    const saved = JSON.parse(savedConnection);
    form.connectionString = saved.connectionString || '';
    form.port = saved.port || 22;
    form.authMethod = saved.authMethod || 'password';
    form.privateKeyPath = saved.privateKeyPath || '';
    form.remember = true;
  }
});

function write(data: string) {
  terminalViewRef.value?.write(data);
}

defineExpose({ write });
</script>

<style scoped>
.terminal-tab-content {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: #1e1e1e;
}

.connection-form-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 20px;
}

.connection-form {
  width: 100%;
  max-width: 400px;
  padding: 20px;
  background-color: #2d2d2d;
  border-radius: 8px;
  color: #d4d4d4;
}

.connection-form h3 {
  text-align: center;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
}

.form-group input[type="text"],
.form-group input[type="password"],
.form-group input[type="number"] {
  width: 100%;
  padding: 8px;
  background-color: #3c3c3c;
  border: 1px solid #555;
  border-radius: 4px;
  color: #d4d4d4;
  box-sizing: border-box;
}

.auth-method {
  display: flex;
  gap: 20px;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
}

button {
  width: 100%;
  padding: 10px;
  background-color: #0e639c;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
}

button:hover {
  background-color: #1177bb;
}
</style>
