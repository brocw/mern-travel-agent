const isLikelyJwt = (token: string) => token.split('.').length === 3;

const extractToken = (tok: any): string => {
  if (typeof tok === 'string') {
    return tok;
  }

  if (tok && typeof tok === 'object') {
    if (typeof tok.accessToken === 'string') {
      return tok.accessToken;
    }

    if (typeof tok.jwtToken === 'string') {
      return tok.jwtToken;
    }
  }

  return '';
};

export function storeToken(tok: any): void {
  try {
    const token = extractToken(tok);
    if (!token || !isLikelyJwt(token)) {
      return;
    }

    localStorage.setItem('token_data', token);
  } catch (e) {
    console.log(e);
  }
}

export function retrieveToken(): string {
  try {
    const token = localStorage.getItem('token_data') || '';
    if (!token || !isLikelyJwt(token)) {
      localStorage.removeItem('token_data');
      return '';
    }

    return token;
  } catch (e) {
    console.log(e);
    return '';
  }
}
