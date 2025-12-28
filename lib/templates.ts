export function fillTemplate(template: string, data: Record<string, string | null | undefined>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = data[key];
    return value ? String(value) : "";
  });
}
