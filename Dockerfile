FROM public.ecr.aws/amazonlinux/amazonlinux:2023 AS build

RUN dnf install -y nodejs npm \
    && dnf clean all \
    && rm -rf /var/cache/dnf

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build \
    && npm prune --omit=dev

FROM public.ecr.aws/amazonlinux/amazonlinux:2023

RUN dnf install -y nodejs shadow-utils \
    && dnf clean all \
    && rm -rf /var/cache/dnf \
    && useradd --system --create-home --uid 10001 retool-mcp

WORKDIR /app

COPY --from=build --chown=retool-mcp:retool-mcp /app/package.json ./
COPY --from=build --chown=retool-mcp:retool-mcp /app/node_modules ./node_modules
COPY --from=build --chown=retool-mcp:retool-mcp /app/dist ./dist

USER retool-mcp

ENTRYPOINT ["node", "dist/index.js"]
