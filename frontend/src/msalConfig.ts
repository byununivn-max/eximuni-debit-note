/**
 * Microsoft MSAL (Azure AD) 설정
 *
 * VITE_AZURE_CLIENT_ID / VITE_AZURE_TENANT_ID가 설정되면 MSAL SSO 활성화
 * 미설정 시 기존 username/password 로그인 사용
 */
import { Configuration, LogLevel } from '@azure/msal-browser';

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID || '';
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || '';
const redirectUri = import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin;

export const msalEnabled = !!(clientId && tenantId);

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      loggerCallback: (level, message, containsPii) => {
        if (!containsPii) {
          console.log(`[MSAL ${LogLevel[level]}] ${message}`);
        }
      },
    },
  },
};

export const loginRequest = {
  scopes: [`api://${clientId}/access_as_user`],
};

export const graphScopes = {
  scopes: ['User.Read'],
};
