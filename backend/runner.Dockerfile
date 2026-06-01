FROM mcr.microsoft.com/playwright:v1.60.0-jammy

WORKDIR /runner

COPY runner-workspace/package*.json ./

RUN npm install

RUN npx playwright install --with-deps

ENV NODE_ENV=test

CMD ["./node_modules/.bin/playwright", "--version"]