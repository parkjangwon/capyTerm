<template>
  <div class="modal-backdrop" @click.self="$emit('cancel')">
    <div class="modal small">
      <header class="modal-header">
        <h3>{{ title || $t('settings.groupAddTitle') }}</h3>
      </header>
      <section class="modal-body">
        <div class="row add-row">
          <input v-model="folderName" :placeholder="$t('settings.groupName')" />
          <select v-model="parentId">
            <option :value="undefined">{{ $t('settings.parentNone') }}</option>
            <option v-for="pf in availableParents" :key="pf.id" :value="pf.id">상위: {{ pf.name }}</option>
          </select>
        </div>
      </section>
      <footer class="modal-footer">
        <button @click="handleSave">{{ $t('app.confirm') }}</button>
        <button class="danger" @click="$emit('cancel')">{{ $t('app.cancel') }}</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  title?: string
  initialName?: string
  initialParentId?: string
  availableParents: Array<{ id: string, name: string }>
}>()

const emit = defineEmits<{
  save: [data: { name: string, parentId?: string }]
  cancel: []
}>()

const folderName = ref(props.initialName || '')
const parentId = ref<string | undefined>(props.initialParentId)

watch(() => props.initialName, (val) => { folderName.value = val || '' })
watch(() => props.initialParentId, (val) => { parentId.value = val })

function handleSave() {
  if (!folderName.value.trim()) return
  emit('save', { name: folderName.value.trim(), parentId: parentId.value })
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  width: 900px;
  max-width: 95vw;
  max-height: 90vh;
  overflow: auto;
  background: var(--bg);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.4);
}
.modal.small { width: 520px; }
.modal-header, .modal-footer {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.modal-footer { border-top: 1px solid var(--border); border-bottom: none; text-align: right; }
.modal-body { padding: 16px; }
.row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.add-row input { width: 180px; }
input, select { background: var(--input-bg); color: var(--fg); border: 1px solid var(--border); border-radius: 4px; padding: 6px 8px; }
button { background: var(--btn-bg); color: var(--btn-fg); border: 1px solid var(--border); border-radius: 4px; padding: 6px 10px; cursor: pointer; }
button.danger { background: #a33; color: white; border-color: #a33; }
</style>
