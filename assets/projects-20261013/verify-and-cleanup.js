async () => {
  if (location.origin !== "http://127.0.0.1:5200") throw new Error("Unexpected origin");
  const request = async (url, options = {}) => {
    const r = await fetch(url, { ...options, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };
  const { projects } = await request("/api/projects");
  const project = projects.find(p => p.name === "UI Verification 20261013" && p.folders?.length === 1 && p.folders[0].path.endsWith("claude-project-ui-2026101311\\source-a"));
  if (!project) throw new Error("Test project missing or unexpected folders");
  if (!project.folders[0].trusted) throw new Error("Trust was not persisted");
  const result = { id: project.id, folders: project.folders, persisted: true };
  await request(`/api/projects/${encodeURIComponent(project.id)}`, {method: "DELETE"});
  result.cleaned = !(await request("/api/projects")).projects.some(p => p.id === project.id);
  return result;
}
