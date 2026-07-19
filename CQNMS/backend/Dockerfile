# Pinned to Debian 12 (bookworm) - Microsoft's ODBC driver packages target
# specific Debian releases, and the floating "slim" tag can move ahead of them.
FROM python:3.11-slim-bookworm

# Set working directory
WORKDIR /app

# Microsoft's ODBC Driver 17 for SQL Server, so pyodbc can connect to SQL Server
# over TCP with a SQL login (Windows Authentication only works for local,
# same-machine connections, so it can't be used from inside this container).
RUN apt-get update && apt-get install -y --no-install-recommends curl gnupg2 \
    && curl -sSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql17 unixodbc \
    && apt-get purge -y curl gnupg2 \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file (Make sure it's named requirements.txt in your folder)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Expose port 8000 for FastAPI
EXPOSE 8000

# Start the backend server
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]