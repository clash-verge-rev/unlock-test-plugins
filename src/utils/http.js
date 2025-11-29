export async function safeText(resp) {
  try {
    return await resp.text();
  } catch {
    return "";
  }
}

export async function safeJson(resp) {
  try {
    return await resp.json();
  } catch {
    return null;
  }
}
