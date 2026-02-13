### Stage 1: Build
FROM node:18-alpine AS build

WORKDIR /app

# 빌드 시 환경변수 주입
ARG VITE_API_BASE=""
ARG VITE_AZURE_CLIENT_ID=""
ARG VITE_AZURE_TENANT_ID=""
ARG VITE_AZURE_REDIRECT_URI=""

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

### Stage 2: Serve with nginx
FROM nginx:alpine

# nginx 설정
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드 결과물 복사
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
