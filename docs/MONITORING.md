# Monitoring

## Stack
Defined in [docker-compose.monitoring.yml](docker-compose.monitoring.yml):
- Prometheus
- Grafana
- Loki
- Alertmanager

## Prometheus scrape
- Backend: `http://backend-api:4000/v1/metrics`

Note: [docker-compose.monitoring.yml](docker-compose.monitoring.yml) attaches to the external `rapidroads_internal` network.
Start the production stack at least once so that network exists.

## Grafana
Provisioned datasources for Prometheus + Loki.
A minimal dashboard is included.
