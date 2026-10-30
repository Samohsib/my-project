// Playwright 불러오기: 이 폴더에 설치했으면(npm install) 그것을, 아니면 컴퓨터에 깔린 것을 쓴다.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const { chromium, devices } = require('playwright');
