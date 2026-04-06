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
    return JSON.parse(tokenData);
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