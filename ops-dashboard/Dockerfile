FROM node:22-alpine
WORKDIR /app
COPY server.js ./server.js
ENV NODE_ENV=production
ENV PORT=8090
EXPOSE 8090
CMD ["node", "server.js"]
