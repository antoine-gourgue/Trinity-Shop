FROM node:20 AS base

WORKDIR /app

FROM base AS build

COPY package*.json ./
RUN npm install

FROM base

COPY --from=build /app/node_modules /app/node_modules
COPY . .

RUN npm rebuild bcrypt --build-from-source

CMD ["npm", "run", "dev"]