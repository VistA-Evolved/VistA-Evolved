FROM python:3.12-slim

WORKDIR /app

# Install sdc11073 and dependencies
RUN pip install --no-cache-dir sdc11073==2.0.0 requests lxml

COPY consumer.py .
COPY healthcheck.py .

CMD ["python", "-u", "consumer.py"]
