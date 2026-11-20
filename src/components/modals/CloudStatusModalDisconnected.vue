<template>
    <AppModal title="Connect storage">
        <p>Choose remoteStorage, Dropbox, Google Drive or Solid in the storage widget.</p>
        <CoreButton @click="openStorage">
            Connect storage
        </CoreButton>
    </AppModal>
</template>
<script setup lang="ts">
function openStorage() {
    window.ponderStorage.open();
}
</script>
