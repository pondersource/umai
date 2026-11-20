<template>
    <AppModal v-slot="{ close }" :title="$t('menu.logIn')">
        <p>Choose remoteStorage, Dropbox, Google Drive, or Solid to sync your recipes.</p>
        <CoreButton class="mt-4" @click="connect(close)">
            Connect storage
        </CoreButton>
    </AppModal>
</template>

<script setup lang="ts">
function connect(close: () => void) {
    close();
    window.ponderStorage.open();
}
</script>
