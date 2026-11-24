-- Étape 6 : requêtes SQL D'ANALYSE, sans migration ni écriture.
-- À exécuter facultativement dans phpMyAdmin, onglet SQL.
-- Ce script ne modifie aucune table et ne contient aucune donnée client réelle.
USE amjd_tourisme;

-- Réservations par statut.
SELECT status, COUNT(*) AS nombre,
       COALESCE(SUM(total_price_eur), 0) AS valeur_des_reservations_eur
FROM reservations GROUP BY status ORDER BY status;

-- Répartition mensuelle des demandes selon leur date de création.
SELECT DATE_FORMAT(created_at, '%Y-%m') AS mois,
       COUNT(*) AS demandes,
       SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmees
FROM reservations
WHERE created_at >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 5 MONTH), '%Y-%m-01')
GROUP BY DATE_FORMAT(created_at, '%Y-%m')
ORDER BY mois;

-- Top cinq destinations de réservations confirmées (nombre de voyageurs).
SELECT dest.city, dest.country, COUNT(r.id) AS reservations,
       SUM(r.people) AS voyageurs
FROM reservations r
JOIN departures dep ON dep.id = r.departure_id
JOIN voyages v ON v.id = dep.voyage_id
JOIN destinations dest ON dest.id = v.destination_id
WHERE r.status = 'confirmed'
GROUP BY dest.id, dest.city, dest.country
ORDER BY voyageurs DESC LIMIT 5;

-- Note : aucune table de paiements n'existe à l'étape 6.
-- La somme confirmée n'est donc PAS le chiffre d'affaires encaissé.
