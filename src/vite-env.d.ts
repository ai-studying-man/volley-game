/// <reference types="vite/client" />

interface KakaoShareTextOptions {
  objectType: "text";
  text: string;
  link: {
    mobileWebUrl: string;
    webUrl: string;
  };
  buttonTitle?: string;
}

interface KakaoSdk {
  init(key: string): void;
  isInitialized(): boolean;
  Share?: {
    sendDefault(options: KakaoShareTextOptions): void;
  };
}

interface Window {
  Kakao?: KakaoSdk;
}
