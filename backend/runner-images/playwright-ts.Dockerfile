# runner-images/playwright-ts.Dockerfile

FROM mcr.microsoft.com/playwright:v1.60.0-jammy

WORKDIR /runner

RUN npm init -y
RUN npm install -D @playwright/test@1.60.0 playwright@1.60.0 typescript ts-node
RUN npx playwright install --with-deps

ENV NODE_ENV=test

CMD ["./node_modules/.bin/playwright", "--version"]