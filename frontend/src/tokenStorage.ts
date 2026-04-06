export function storeToken(tok: any): void {
  try {
    localStorage.setItem("token_data", JSON.stringify(tok));
  } catch (e) {
    console.log(e);
  }
} 

export function retrieveToken(): any {
  try {
    const tokenData = localStorage.getItem("token_data");
    if (!tokenData) return null;

    const parsed = JSON.parse(tokenData);
    // Backward compatible: support both { accessToken } and raw string storage.
    if (typeof parsed === "string") return parsed;
    return parsed?.accessToken || "";
  } catch (e) {
    console.log(e);
    return null;
  }
}

export function getAccessToken(): string {
  try {
    const tokenData = localStorage.getItem("token_data");
    if (!tokenData) return "";

    const parsed = JSON.parse(tokenData);
    if (typeof parsed === "string") return parsed;
    return parsed.accessToken || "";
  } catch (e) {
    console.log(e);
    return "";
  }
}

export function removeToken(): void {
  try {
    localStorage.removeItem("token_data");
  } catch (e) {
    console.log(e);
  }
}