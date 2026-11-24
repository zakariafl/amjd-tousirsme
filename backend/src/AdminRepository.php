<?php
declare(strict_types=1);

/** Étape 6 : administration et analyses, strictement derrière requireAdmin(). */
function adminDashboard(PDO $pdo): array
{
    $base = [
        'clients' => (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'client'")->fetchColumn(),
        'voyages_publies' => (int) $pdo->query('SELECT COUNT(*) FROM voyages WHERE published = 1')->fetchColumn(),
        'departures_future' => (int) $pdo->query("SELECT COUNT(*) FROM departures WHERE status = 'open' AND departure_date > CURDATE()")->fetchColumn(),
    ];
    $statuses = ['pending' => ['nombre' => 0, 'montant' => 0.0],
        'confirmed' => ['nombre' => 0, 'montant' => 0.0],
        'cancelled' => ['nombre' => 0, 'montant' => 0.0]];
    $statusRows = $pdo->query('SELECT status, COUNT(*) AS nombre, COALESCE(SUM(total_price_eur), 0) AS montant '
        . 'FROM reservations GROUP BY status')->fetchAll();
    foreach ($statusRows as $row) {
        if (isset($statuses[$row['status']])) {
            $statuses[$row['status']] = ['nombre' => (int) $row['nombre'], 'montant' => (float) $row['montant']];
        }
    }
    $base['reservations'] = array_sum(array_column($statuses, 'nombre'));
    $base['statuts'] = $statuses;
    // Important : ceci représente une valeur de commandes confirmées, PAS de l'argent encaissé.
    $base['valeur_confirmee_eur'] = $statuses['confirmed']['montant'];
    $base['valeur_en_attente_eur'] = $statuses['pending']['montant'];

    $start = (new DateTimeImmutable('first day of this month'))->modify('-5 months');
    $sql = "SELECT DATE_FORMAT(created_at, '%Y-%m') AS mois, COUNT(*) AS demandes, "
        . "SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmees "
        . 'FROM reservations WHERE created_at >= :start GROUP BY mois ORDER BY mois';
    $statement = $pdo->prepare($sql);
    $statement->execute([':start' => $start->format('Y-m-d 00:00:00')]);
    $raw = [];
    foreach ($statement->fetchAll() as $row) {
        $raw[$row['mois']] = ['demandes' => (int) $row['demandes'], 'confirmees' => (int) $row['confirmees']];
    }
    $base['evolution_mensuelle'] = [];
    for ($i = 0; $i < 6; $i++) {
        $key = $start->modify('+' . $i . ' months')->format('Y-m');
        $base['evolution_mensuelle'][] = ['mois' => $key,
            'demandes' => $raw[$key]['demandes'] ?? 0,
            'confirmees' => $raw[$key]['confirmees'] ?? 0];
    }

    $sql = "SELECT dest.city, dest.country, COUNT(r.id) AS reservations, COALESCE(SUM(r.people), 0) AS voyageurs "
        . 'FROM reservations r JOIN departures dep ON dep.id = r.departure_id '
        . 'JOIN voyages v ON v.id = dep.voyage_id '
        . 'JOIN destinations dest ON dest.id = v.destination_id '
        . "WHERE r.status = 'confirmed' GROUP BY dest.id, dest.city, dest.country "
        . 'ORDER BY voyageurs DESC, reservations DESC LIMIT 5';
    $base['top_destinations'] = array_map(static fn (array $row): array => [
        'destination' => $row['city'] . ', ' . $row['country'],
        'reservations' => (int) $row['reservations'],
        'voyageurs' => (int) $row['voyageurs'],
    ], $pdo->query($sql)->fetchAll());
    return $base;
}

function adminDestinations(PDO $pdo): array
{
    $rows = $pdo->query('SELECT id, city, country FROM destinations ORDER BY country, city')->fetchAll();
    return array_map(static fn (array $row): array => [
        'id' => (int) $row['id'], 'city' => (string) $row['city'], 'country' => (string) $row['country'],
    ], $rows);
}

function adminAddDestination(PDO $pdo, array $input): array
{
    $city = trim((string) ($input['city'] ?? ''));
    $country = trim((string) ($input['country'] ?? ''));
    if (!preg_match("/^[\\p{L}0-9 .,'-]{2,120}$/u", $city)
        || !preg_match("/^[\\p{L}0-9 .,'-]{2,120}$/u", $country)) {
        reply(422, ['success' => false, 'error' => 'Ville ou pays invalide (2 à 120 caractères).']);
    }
    try {
        $stmt = $pdo->prepare('INSERT INTO destinations (city, country) VALUES (:city, :country)');
        $stmt->execute([':city' => $city, ':country' => $country]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') reply(409, ['success' => false, 'error' => 'Destination déjà existante.']);
        throw $e;
    }
    return ['id' => (int) $pdo->lastInsertId(), 'city' => $city, 'country' => $country];
}

function adminTripColumns(): string
{
    return 'v.id, v.destination_id, v.title, v.duration_days, v.price_eur, v.category, '
        . 'v.badge, v.image_url, v.description, v.included_services, v.published, '
        . 'dest.city, dest.country, COALESCE(dep.departures_count, 0) AS departures_count '
        . 'FROM voyages v JOIN destinations dest ON dest.id = v.destination_id '
        . 'LEFT JOIN (SELECT voyage_id, COUNT(*) AS departures_count FROM departures GROUP BY voyage_id) dep '
        . 'ON dep.voyage_id = v.id ';
}

function adminTripRow(array $row): array
{
    $services = json_decode((string) $row['included_services'], true);
    return [
        'id' => (int) $row['id'], 'destination_id' => (int) $row['destination_id'],
        'title' => (string) $row['title'], 'city' => (string) $row['city'],
        'country' => (string) $row['country'], 'duration_days' => (int) $row['duration_days'],
        'price_eur' => (float) $row['price_eur'], 'category' => (string) $row['category'],
        'badge' => (string) ($row['badge'] ?? ''), 'image_url' => (string) $row['image_url'],
        'description' => (string) $row['description'],
        'included_services' => is_array($services) ? $services : [],
        'published' => (bool) $row['published'], 'departures_count' => (int) $row['departures_count'],
    ];
}

function adminTrips(PDO $pdo): array
{
    $rows = $pdo->query('SELECT ' . adminTripColumns() . ' ORDER BY v.id DESC LIMIT 200')->fetchAll();
    return array_map('adminTripRow', $rows);
}

function adminTripById(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT ' . adminTripColumns() . ' WHERE v.id = :id');
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();
    return $row === false ? null : adminTripRow($row);
}

function adminTripInput(array $input): array
{
    $title = $input['title'] ?? null;
    $destinationId = $input['destination_id'] ?? null;
    $days = $input['duration_days'] ?? null;
    $price = $input['price_eur'] ?? null;
    $category = $input['category'] ?? null;
    $badge = $input['badge'] ?? '';
    $url = $input['image_url'] ?? null;
    $description = $input['description'] ?? null;
    $services = $input['included_services'] ?? null;
    if (!is_string($title) || strlen(trim($title)) < 4 || strlen($title) > 180
        || !is_int($destinationId) || $destinationId < 1
        || !is_int($days) || $days < 1 || $days > 90
        || !(is_float($price) || is_int($price)) || $price < 0 || $price > 100000
        || !is_string($category) || strlen(trim($category)) < 2 || strlen($category) > 80
        || !is_string($badge) || strlen($badge) > 80
        || !is_string($url) || strlen($url) > 1024 || !filter_var($url, FILTER_VALIDATE_URL)
        || strtolower((string) parse_url($url, PHP_URL_SCHEME)) !== 'https'
        || !is_string($description) || strlen(trim($description)) < 10 || strlen($description) > 1500
        || !is_array($services) || count($services) > 10) {
        reply(422, ['success' => false, 'error' => 'Champs du voyage invalides. Vérifiez titre, prix, durée, image HTTPS et description.']);
    }
    foreach ($services as $service) {
        if (!is_string($service) || trim($service) === '' || strlen($service) > 100) {
            reply(422, ['success' => false, 'error' => 'Liste des services incluse invalide.']);
        }
    }
    return [':destination_id' => $destinationId, ':title' => trim($title), ':duration_days' => $days,
        ':price_eur' => number_format((float) $price, 2, '.', ''), ':category' => trim($category),
        ':badge' => trim($badge) === '' ? null : trim($badge), ':image_url' => $url,
        ':description' => trim($description), ':included_services' => json_encode(array_values($services), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)];
}

function adminSaveTrip(PDO $pdo, array $input, ?int $id = null): array
{
    $data = adminTripInput($input);
    $destinationCheck = $pdo->prepare('SELECT id FROM destinations WHERE id = :id');
    $destinationCheck->execute([':id' => $data[':destination_id']]);
    if ($destinationCheck->fetchColumn() === false) reply(422, ['success' => false, 'error' => 'Destination inexistante.']);
    if ($id !== null && adminTripById($pdo, $id) === null) {
        reply(404, ['success' => false, 'error' => 'Voyage inexistant.']);
    }
    if ($id === null) {
        $sql = 'INSERT INTO voyages (destination_id, title, duration_days, price_eur, category, badge, '
            . 'image_url, description, included_services, published) VALUES '
            . '(:destination_id, :title, :duration_days, :price_eur, :category, :badge, '
            . ':image_url, :description, :included_services, 0)';
    } else {
        $sql = 'UPDATE voyages SET destination_id = :destination_id, title = :title, '
            . 'duration_days = :duration_days, price_eur = :price_eur, category = :category, '
            . 'badge = :badge, image_url = :image_url, description = :description, '
            . 'included_services = :included_services WHERE id = :id';
        $data[':id'] = $id;
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($data);
    $newId = $id ?? (int) $pdo->lastInsertId();
    return adminTripById($pdo, $newId);
}

function adminSetTripPublished(PDO $pdo, int $id, array $input): array
{
    $published = $input['published'] ?? null;
    if (!is_bool($published)) reply(422, ['success' => false, 'error' => 'published doit être un booléen.']);
    $stmt = $pdo->prepare('UPDATE voyages SET published = :published WHERE id = :id');
    $stmt->execute([':published' => $published ? 1 : 0, ':id' => $id]);
    $trip = adminTripById($pdo, $id);
    if ($trip === null) reply(404, ['success' => false, 'error' => 'Voyage inexistant.']);
    return $trip;
}

function adminDepartureList(PDO $pdo, int $voyageId): array
{
    if (adminTripById($pdo, $voyageId) === null) reply(404, ['success' => false, 'error' => 'Voyage inexistant.']);
    $stmt = $pdo->prepare('SELECT id, departure_date, capacity, seats_available, status '
        . 'FROM departures WHERE voyage_id = :id ORDER BY departure_date DESC LIMIT 100');
    $stmt->execute([':id' => $voyageId]);
    return array_map(static fn (array $row): array => [
        'id' => (int) $row['id'], 'date' => (string) $row['departure_date'],
        'capacity' => (int) $row['capacity'], 'available' => (int) $row['seats_available'],
        'status' => (string) $row['status'],
    ], $stmt->fetchAll());
}

function adminAddDeparture(PDO $pdo, int $voyageId, array $input): array
{
    if (adminTripById($pdo, $voyageId) === null) reply(404, ['success' => false, 'error' => 'Voyage inexistant.']);
    $date = $input['departure_date'] ?? null;
    $capacity = $input['capacity'] ?? null;
    $parsedDate = is_string($date) ? DateTimeImmutable::createFromFormat('!Y-m-d', $date) : false;
    if (!is_string($date) || !$parsedDate || $parsedDate->format('Y-m-d') !== $date
        || $date <= date('Y-m-d') || !is_int($capacity) || $capacity < 1 || $capacity > 200) {
        reply(422, ['success' => false, 'error' => 'Date future et capacité entre 1 et 200 requises.']);
    }
    try {
        $stmt = $pdo->prepare('INSERT INTO departures (voyage_id, departure_date, capacity, seats_available, status) '
            . "VALUES (:voyage_id, :departure_date, :capacity, :available, 'open')");
        $stmt->execute([':voyage_id' => $voyageId, ':departure_date' => $date,
            ':capacity' => $capacity, ':available' => $capacity]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') reply(409, ['success' => false, 'error' => 'Date déjà proposée pour ce voyage.']);
        throw $e;
    }
    return ['id' => (int) $pdo->lastInsertId(), 'date' => $date,
        'capacity' => $capacity, 'available' => $capacity, 'status' => 'open'];
}
