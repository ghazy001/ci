# runner-images/playwright-python.Dockerfile

FROM mcr.microsoft.com/playwright/python:v1.60.0-jammy

WORKDIR /runner

RUN pip install pytest pytest-playwright playwright
RUN playwright install --with-deps

ENV PYTHONUNBUFFERED=1

CMD ["python", "-m", "playwright", "--version"]