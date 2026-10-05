FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs backup.mjs ./
COPY public ./public
ENV PORT=3000 DATA_DIR=/data NODE_ENV=production
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node","--no-warnings","server.mjs"]
