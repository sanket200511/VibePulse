```mermaid
architecture-beta
    group observer(cloud)[Developer Laptop]
    service ide(server)[IDE / Filesystem] in observer
    service daemon(server)[Node.js Daemon] in observer

    group backend(cloud)[VibePulse API Server]
    service api(server)[FastAPI Backend] in backend
    service db(database)[PostgreSQL] in backend

    group client(cloud)[Browser]
    service ui(server)[React Dashboard] in client

    ide:R --> L:daemon
    daemon:R --> L:api
    api:R --> L:db
    api:B --> T:ui
```
