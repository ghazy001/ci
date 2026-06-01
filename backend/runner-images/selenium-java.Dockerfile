FROM selenium/standalone-chromium:latest

USER root

ARG MAVEN_VERSION=3.9.9

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    curl \
    wget \
    tar \
    ca-certificates \
    openjdk-17-jdk \
  && wget -q https://archive.apache.org/dist/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz -O /tmp/maven.tar.gz \
  && tar -xzf /tmp/maven.tar.gz -C /opt \
  && ln -s /opt/apache-maven-${MAVEN_VERSION}/bin/mvn /usr/local/bin/mvn \
  && rm -f /tmp/maven.tar.gz \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /runner

ENV CHROME_BIN=/usr/bin/chromium
ENV CHROMEDRIVER_BIN=/usr/bin/chromedriver
ENV BROWSER=chromium
ENV MAVEN_OPTS="-Dmaven.repo.local=/runner/.m2/repository"

ENTRYPOINT []

CMD ["mvn", "--version"]