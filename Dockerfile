# syntax=docker/dockerfile:1
# CI resolves and records an immutable Node 24 base digest before building.
ARG NODE_BASE
FROM ${NODE_BASE}
WORKDIR /opt/observatory
COPY --chown=0:0 package.json LICENSE COPYRIGHT ./
COPY --chown=0:0 src ./src
COPY --chown=0:0 schemas ./schemas
RUN mkdir -p /data /run/observatory && chown 1000:1000 /data && chmod 0700 /data && chmod -R a-w /opt/observatory
ENV NODE_ENV=production OBSERVATORY_API_CONFIG=/run/observatory/api.json OBSERVATORY_MCP_CONFIG=/run/observatory/mcp.json
LABEL org.opencontainers.image.title="Observatory Core" org.opencontainers.image.version="1.2.0" org.opencontainers.image.vendor="Osprey Strategic Holdings LLC"
USER 1000:1000
WORKDIR /data
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 CMD ["node","/opt/observatory/src/container/health.mjs"]
ENTRYPOINT ["node","/opt/observatory/src/container/start.mjs"]
CMD ["api"]
