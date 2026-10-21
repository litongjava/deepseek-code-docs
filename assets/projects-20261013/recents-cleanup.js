async () => {
  const api = await import("/src/api.ts");
  const {useWorkspaceModeStore: store} = await import("/src/stores/useWorkspaceModeStore.ts");
  const ids = JSON.parse(sessionStorage.getItem("recents-test-created-ids") || "[]");
  const conversations = await api.getConversations();
  for (const id of ids) {
    const c = conversations.find(c => c.id === id);
    if (!c || !c.title?.startsWith("Recents verification ")) throw new Error("Unexpected cleanup target");
    await api.deleteConversation(id);
  }
  const original = JSON.parse(sessionStorage.getItem("recents-test-original-mode"));
  if (original) store.setState(original);
  const remaining = await api.getConversations();
  if (remaining.some(c => ids.includes(c.id))) throw new Error("Cleanup incomplete");
  sessionStorage.removeItem("recents-test-created-ids");
  sessionStorage.removeItem("recents-test-original-mode");
  return {cleaned: ids.length, settingsRestored: true};
}
