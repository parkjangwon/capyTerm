<template>
  <div id="connection-form">
    <h2>SSH 연결</h2>
    <div class="form-grid">
      <label>호스트:</label>
      <input v-model="options.host" placeholder="example.com" />
      
      <label>포트:</label>
      <input v-model.number="options.port" type="number" placeholder="22" />
      
      <label>사용자:</label>
      <input v-model="options.username" placeholder="user" />

      <label>인증 방식:</label>
      <div class="auth-method">
        <input type="radio" id="password" value="password" v-model="options.authMethod">
        <label for="password">비밀번호</label>
        <input type="radio" id="privatekey" value="privatekey" v-model="options.authMethod">
        <label for="privatekey">개인키</label>
      </div>

      <template v-if="options.authMethod === 'password'">
        <label>비밀번호:</label>
        <input v-model="options.password" type="password" @keyup.enter="onConnect" />
      </template>

      <template v-if="options.authMethod === 'privatekey'">
        <label>개인키:</label>
        <input type="file" @change="handleFileSelect" />
        <label>암호:</label>
        <input v-model="options.passphrase" type="password" placeholder="(선택 사항)" @keyup.enter="onConnect"/>
      </template>
    </div>
    <button @click="onConnect">연결</button>
    <p v-if="error" class="error-message">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';

import { defineProps } from 'vue';

const props = defineProps<{ defaultOptions?: any }>();
const emit = defineEmits(['connect']);

const options = reactive({
  host: '',
  port: 22,
  username: '',
  authMethod: 'password',
  password: '',
  privateKey: '' as string | ArrayBuffer | null,
  passphrase: '',
  ...props.defaultOptions,
});

const error = ref('');

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      options.privateKey = e.target?.result ?? null;
    };
    reader.readAsText(file);
  }
}

function onConnect() {
  error.value = '';
  if (!options.host || !options.username) {
    error.value = '호스트와 사용자 이름을 입력해주세요.';
    return;
  }

  const connectionOptions: any = {
    host: options.host,
    port: options.port,
    username: options.username,
  };

  if (options.authMethod === 'password') {
    connectionOptions.password = options.password;
  } else {
    if (!options.privateKey) {
      error.value = '개인키 파일을 선택해주세요.';
      return;
    }
    connectionOptions.privateKey = options.privateKey;
    if (options.passphrase) {
      connectionOptions.passphrase = options.passphrase;
    }
  }
  emit('connect', connectionOptions);
}
</script>

<style scoped>
#connection-form {
  padding: 20px;
  background-color: #333;
  color: white;
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 400px;
  margin: 40px auto;
  border-radius: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: center;
}

.form-grid label {
  text-align: right;
}

.auth-method {
  display: flex;
  gap: 15px;
  align-items: center;
}

input[type="text"],
input[type="number"],
input[type="password"],
input[type="file"] {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #555;
  background-color: #222;
  color: white;
}

button {
  padding: 10px;
  border-radius: 4px;
  border: none;
  background-color: #007acc;
  color: white;
  cursor: pointer;
  font-size: 1em;
}
button:hover {
  background-color: #005f9e;
}

.error-message {
  color: #ff4d4d;
  text-align: center;
  margin-top: 10px;
}
</style>
