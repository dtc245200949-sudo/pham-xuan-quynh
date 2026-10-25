FROM node:18-alpine

WORKDIR /app
COPY docker-container-exporter.js ./
USER node
EXPOSE 9105
CMD ["node", "docker-container-exporter.js"]