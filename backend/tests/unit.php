<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/src/VoyageRepository.php';
require_once dirname(__DIR__) . '/src/ReservationRepository.php';
require_once dirname(__DIR__) . '/src/AdminRepository.php';

function expectSame(mixed $actual, mixed $expected, string $label): void
{
    if ($actual !== $expected) {
        fwrite(STDERR, "FAIL $label: expected " . var_export($expected, true)
            . ", got " . var_export($actual, true) . PHP_EOL);
        exit(1);
    }
    echo "PASS $label" . PHP_EOL;
}

$trip = formatVoyage([
    'id' => '4', 'title' => 'Paris', 'country' => 'France', 'city' => 'Paris',
    'duration_days' => '4', 'price_eur' => '530.00', 'rating' => '4.8',
    'reviews_count' => '3', 'category' => 'Ville', 'badge' => null,
    'image_url' => 'https://example.test/image.jpg', 'description' => 'Test',
    'included_services' => '["Petit-déjeuner", "Guide"]',
]);
expectSame($trip['duree'], '4 jours / 3 nuits', 'durée formatée');
expectSame($trip['prix'], 530.0, 'prix numérique');
expectSame($trip['inclus'][1], 'Guide', 'services JSON décodés');

$res = serializeReservation([
    'id' => '17', 'reference' => 'AMJD-TEST', 'user_id' => '2',
    'departure_id' => '4', 'people' => '3', 'unit_price_eur' => '530.00',
    'total_price_eur' => '1590.00', 'status' => 'pending',
    'created_at' => '2026-11-20 14:00:00', 'cancelled_at' => null,
    'departure_date' => '2027-02-10', 'seats_available' => '6',
    'title' => 'Paris', 'voyage_id' => '4', 'city' => 'Paris', 'country' => 'France',
]);
expectSame($res['personnes'], 3, 'réservation: participants');
expectSame($res['total'], 1590.0, 'réservation: total');
expectSame($res['statut'], 'pending', 'réservation: statut');

echo 'All unit tests passed.' . PHP_EOL;
