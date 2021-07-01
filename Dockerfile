FROM ubuntu:latest as aufero-tools

WORKDIR /aufero-tools

RUN apt-get update && apt-get install -y wget dos2unix


RUN wget https://storage.googleapis.com/sidecar_artifacts/dist/sidecar-release-latest-linux.tar.gz
RUN tar -xvf sidecar-release-latest-linux.tar.gz

COPY ./start.sh ./start.sh
RUN chmod +x ./start.sh && dos2unix ./start.sh

FROM node:14 as app

WORKDIR /app

COPY --from=aufero-tools /aufero-tools/sidecar /app
COPY --from=aufero-tools /aufero-tools/start.sh /app
COPY ./src /app

RUN npm install

EXPOSE 3000

CMD [ "./start.sh"]
