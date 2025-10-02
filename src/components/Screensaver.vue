<template>
  <div class="screensaver-overlay" v-if="active">
    <img 
      v-for="capy in capybaras"
      :key="capy.id"
      src="/capybara-screen-saver.png" 
      alt="Capybara"
      class="capybara"
      :style="capy.style"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  active: boolean;
}>();

const capybaras = ref<any[]>([]);
const NUM_CAPYBARAS = 15; // Reduced number to minimize overlapping

function generateCapybaras() {
  const newCapybaras = [];
  for (let i = 0; i < NUM_CAPYBARAS; i++) {
    const duration = Math.random() * 30 + 20; // 20-50 seconds (slower)
    const delay = Math.random() * -50; // Start at different times
    const top = Math.random() * 90; // Keep them within the viewport vertically
    const direction = Math.random() > 0.5 ? 'normal' : 'reverse';
    const scale = Math.random() * 0.4 + 0.3; // 0.3 - 0.7 scale (smaller)

    newCapybaras.push({
      id: i,
      style: {
        top: `${top}%`,
        transform: `scale(${scale})`,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        animationDirection: direction,
      },
    });
  }
  capybaras.value = newCapybaras;
}

watch(() => props.active, (isActive) => {
  if (isActive) {
    generateCapybaras();
  } else {
    capybaras.value = [];
  }
});

</script>

<style scoped>
.screensaver-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #000;
  overflow: hidden;
  z-index: 1000;
}

.capybara {
  position: absolute;
  width: 45px;
  height: auto;
  left: -100px; /* Start off-screen */
  animation-name: floatAcross;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@keyframes floatAcross {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(calc(100vw + 100px));
  }
}
</style>
