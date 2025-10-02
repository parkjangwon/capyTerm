<template>
  <div class="screensaver-overlay" v-if="active">
    <div class="capybara-container">
      <img src="./assets/capybara.png" alt="Capybara" class="capybara" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  active: boolean;
}>();
</script>

<style scoped>
.screensaver-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.capybara-container {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.capybara {
  position: absolute;
  width: 100px; /* Adjust size as needed */
  height: auto;
  animation: floatAcross 20s linear infinite;
}

@keyframes floatAcross {
  0% {
    transform: translateX(-100px) translateY(20%);
  }
  25% {
    transform: translateX(calc(100vw - 100px)) translateY(80%);
  }
  50% {
    transform: translateX(-100px) translateY(50%);
  }
  75% {
    transform: translateX(calc(100vw - 100px)) translateY(10%);
  }
  100% {
    transform: translateX(-100px) translateY(20%);
  }
}
</style>
