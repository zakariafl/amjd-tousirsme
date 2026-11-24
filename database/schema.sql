-- ÉTAPE 3 - MySQL 8 / MariaDB compatible. À importer une seule fois.
CREATE DATABASE IF NOT EXISTS amjd_tourisme
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE amjd_tourisme;

CREATE TABLE IF NOT EXISTS destinations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  city VARCHAR(120) NOT NULL,
  country VARCHAR(120) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_city_country (city, country)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS voyages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  destination_id INT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  duration_days TINYINT UNSIGNED NOT NULL,
  price_eur DECIMAL(10, 2) NOT NULL,
  rating DECIMAL(2, 1) NOT NULL DEFAULT 0.0,
  reviews_count INT UNSIGNED NOT NULL DEFAULT 0,
  category VARCHAR(80) NOT NULL,
  badge VARCHAR(80) DEFAULT NULL,
  image_url VARCHAR(1024) NOT NULL,
  description TEXT NOT NULL,
  included_services JSON NOT NULL,
  published TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_voyages_price (price_eur),
  KEY ix_voyages_destination (destination_id),
  CONSTRAINT fk_voyages_destination FOREIGN KEY (destination_id)
    REFERENCES destinations (id) ON DELETE RESTRICT,
  CONSTRAINT ck_voyages_duration CHECK (duration_days >= 1),
  CONSTRAINT ck_voyages_price CHECK (price_eur >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
