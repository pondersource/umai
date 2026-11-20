<template>
    <div class="flex flex-col items-center gap-4">
        <p>Choose remoteStorage, Dropbox, Google Drive, or Solid to sync your recipes.</p>
        <CoreButton @click="connect">
            Connect storage
        </CoreButton>
        <CoreLink class="text-sm" @click="$emit('cancel')">
            {{ $t('home.onboarding.back') }}
        </CoreLink>
    </div>
</template>

<script setup lang="ts">
defineEmits(['cancel']);
function connect() {
    window.ponderStorage.open();
}
</script>
