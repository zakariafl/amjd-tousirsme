-- ÉTAPE 5 : Migration incrémentale, à exécuter dans la base existante.
-- Conserver schema.sql, seed.sql, 04_auth.sql et toutes les données déjà présentes.
USE amjd_tourisme;

CREATE TABLE IF NOT EXISTS departures (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  voyage_id INT UNSIGNED NOT NULL,
  departure_date DATE NOT NULL,
  capacity SMALLINT UNSIGNED NOT NULL,
  seats_available SMALLINT UNSIGNED NOT NULL,
  status ENUM('open','closed') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_departure_voyage_date (voyage_id, departure_date),
  KEY ix_departures_open (status, departure_date),
  CONSTRAINT fk_departures_voyage FOREIGN KEY (voyage_id)
    REFERENCES voyages(id) ON DELETE RESTRICT,
  CONSTRAINT ck_departures_capacity CHECK (capacity > 0),
  CONSTRAINT ck_departures_stock CHECK (seats_available <= capacity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reservations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference VARCHAR(30) NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  departure_id INT UNSIGNED NOT NULL,
  people SMALLINT UNSIGNED NOT NULL,
  unit_price_eur DECIMAL(10,2) NOT NULL,
  total_price_eur DECIMAL(12,2) NOT NULL,
  status ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
  request_key VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  cancelled_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_booking_reference (reference),
  UNIQUE KEY uq_booking_request (user_id, request_key),
  KEY ix_bookings_user (user_id, created_at),
  KEY ix_bookings_departure (departure_id, status),
  CONSTRAINT fk_reservations_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_reservations_departure FOREIGN KEY (departure_id)
    REFERENCES departures(id) ON DELETE RESTRICT,
  CONSTRAINT ck_bookings_people CHECK (people BETWEEN 1 AND 6),
  CONSTRAINT ck_bookings_price CHECK (unit_price_eur >= 0 AND total_price_eur >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Départs entièrement fictifs, exprimés relativement à la date d'importation.
-- Exécutez ce fichier une seule fois, pas chaque jour.
INSERT IGNORE INTO departures (voyage_id, departure_date, capacity, seats_available)
SELECT v.id, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 12, 12 FROM voyages v WHERE v.published = 1;
INSERT IGNORE INTO departures (voyage_id, departure_date, capacity, seats_available)
SELECT v.id, DATE_ADD(CURDATE(), INTERVAL 60 DAY), 16, 16 FROM voyages v WHERE v.published = 1;
