export async function runButtonAction(button, operation, onError = () => {}) {
  button.disabled = true;
  try {
    return await operation();
  } catch (error) {
    onError(error);
    return undefined;
  } finally {
    button.disabled = false;
  }
}

export function startPeriodicReload(reload, setIntervalImpl = globalThis.setInterval) {
  return setIntervalImpl(() => { void reload(); }, 30_000);
}
