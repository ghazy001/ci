FROM cypress/included:13.17.0

USER root

WORKDIR /runner

RUN npm init -y \
  && npm install -D \
    cypress@13.17.0 \
    typescript@^5.0.0 \
    ts-node@^10.9.0 \
    @types/node

ENV NODE_ENV=test
ENV CYPRESS_CACHE_FOLDER=/root/.cache/Cypress

RUN /runner/node_modules/.bin/cypress verify

ENTRYPOINT []

CMD ["/runner/node_modules/.bin/cypress", "--version"]