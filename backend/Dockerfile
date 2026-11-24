# Development image. Do NOT use PHP's built-in server for public production hosting.
FROM php:8.4-cli-bookworm
RUN docker-php-ext-install pdo_mysql
WORKDIR /app/backend
COPY . .
EXPOSE 8000
CMD ["php", "-S", "0.0.0.0:8000", "-t", "public", "public/index.php"]
