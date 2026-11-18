let mutationTail = Promise.resolve();
const activeContexts = new WeakSet();

export function runStorageMutation(operation) {
  const execute = async () => {
    const context = {};
    activeContexts.add(context);
    try {
      return await operation(context);
    } finally {
      activeContexts.delete(context);
    }
  };
  const result = mutationTail.then(execute, execute);
  mutationTail = result.then(() => undefined, () => undefined);
  return result;
}

export function coordinateStorageMutation(context, operation) {
  if (context && activeContexts.has(context)) return operation(context);
  return runStorageMutation((activeContext) => operation(activeContext));
}
