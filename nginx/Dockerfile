FROM nginx:alpine

RUN apk add --no-cache openssl

COPY --chmod=755 generate-dev-certificate.sh /docker-entrypoint.d/40-generate-dev-certificate.sh