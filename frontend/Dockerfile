# stage1 - build react app first
FROM node:22-alpine as build
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
COPY ./package.json /app/
COPY ./package-lock.json /app/
RUN npm ci
COPY . /app
RUN npm run build


# stage 2 - build the final image and copy the react build files
FROM nginx:1.23.2-alpine
COPY --from=build /app/dist /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/conf.d
#EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
