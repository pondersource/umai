(function () {
  const sdk = new URL('atomic-sdk/index.mjs', document.currentScript.src);
  RemoteStorage.Atomic.loadSDK = () => import(sdk.href);
})();
