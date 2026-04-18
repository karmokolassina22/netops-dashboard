FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && \
    apt-get install -y ansible openssh-client && \
    apt-get clean && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY playbooks/ ./playbooks/
COPY inventory/ ./inventory/
EXPOSE 5000
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1
CMD ["python", "backend/app.py"]