FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
ENV PORT=3001
EXPOSE 3001
CMD ["node","src/server.js"]
