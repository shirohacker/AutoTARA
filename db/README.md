# DB Info (Postgresql 17)
- USERNAME: sane
- PASSWORD: qhqnsvud2025
- DB NAME : tara_db

# DB Start
```bash
cd db
docker-compose up -d
```

# DB Dump
```bash
docker exec -it tara-pg17 bash
pg_dump -U sane -h localhost -Fc -f tara_db.dump tara_db
```