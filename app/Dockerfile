FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Hardening: Chạy với user non-root để tăng bảo mật
USER node
EXPOSE 3000
CMD ["npm", "start"]