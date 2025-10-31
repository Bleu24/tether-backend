TiDB Cloud TLS Certificate

- Download the CA certificate (ca.pem) from your TiDB Cloud cluster connection page.
- Place it in this folder as `ca.pem`.
- Then enable it in your .env by setting:

DB_SSL=true
DB_SSL_CA=certs/ca.pem

Notes
- On Windows, use forward slashes in paths inside .env (e.g., `certs/ca.pem`).
- If you omit DB_SSL_CA, the app will still try TLS using the system trust store.
