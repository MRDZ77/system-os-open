export function filter(messages) {
  return messages.filter((m) => m.content && m.content.trim().length > 0);
}
