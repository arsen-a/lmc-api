FROM node:22

WORKDIR /lmcapi

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "npm", "run", "start:dev" ]
