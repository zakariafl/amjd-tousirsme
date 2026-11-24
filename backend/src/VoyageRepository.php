<?php
declare(strict_types=1);

/** @return array<string, mixed> */
function formatVoyage(array $row): array
{
    $jours = (int) $row['duration_days'];
    $services = json_decode((string) $row['included_services'], true);

    return [
        'id' => (int) $row['id'],
        'titre' => (string) $row['title'],
        'pays' => (string) $row['country'],
        'ville' => (string) $row['city'],
        'duree' => sprintf('%d jours / %d nuits', $jours, max(0, $jours - 1)),
        'prix' => (float) $row['price_eur'],
        'note' => (float) $row['rating'],
        'avis' => (int) $row['reviews_count'],
        'categorie' => (string) $row['category'],
        'badge' => (string) ($row['badge'] ?? ''),
        'image' => (string) $row['image_url'],
        'description' => (string) $row['description'],
        'inclus' => is_array($services) ? $services : [],
    ];
}

function voyageColumns(): string
{
    return 'v.id, v.title, d.country, d.city, v.duration_days, v.price_eur, '
        . 'v.rating, v.reviews_count, v.category, v.badge, v.image_url, '
        . 'v.description, v.included_services';
}

/** @return array<int, array<string, mixed>> */
function findVoyages(PDO $pdo, array $filters): array
{
    $where = ['v.published = 1'];
    $params = [];

    if ($filters['q'] !== '') {
        $where[] = '(v.title LIKE :qtitle OR d.city LIKE :qcity OR d.country LIKE :qcountry)';
        $needle = '%' . $filters['q'] . '%';
        $params[':qtitle'] = $needle;
        $params[':qcity'] = $needle;
        $params[':qcountry'] = $needle;
    }
    if ($filters['pays'] !== '') {
        $where[] = 'd.country = :pays';
        $params[':pays'] = $filters['pays'];
    }
    if ($filters['max_price'] !== null) {
        $where[] = 'v.price_eur <= :max_price';
        $params[':max_price'] = $filters['max_price'];
    }

    $sql = 'SELECT ' . voyageColumns() . ' FROM voyages v '
        . 'JOIN destinations d ON d.id = v.destination_id '
        . 'WHERE ' . implode(' AND ', $where) . ' ORDER BY v.id ASC LIMIT :limite';

    $statement = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $statement->bindValue($key, $value);
    }
    $statement->bindValue(':limite', $filters['limit'], PDO::PARAM_INT);
    $statement->execute();

    return array_map('formatVoyage', $statement->fetchAll());
}

/** @return array<string, mixed>|null */
function findVoyage(PDO $pdo, int $id): ?array
{
    $sql = 'SELECT ' . voyageColumns() . ' FROM voyages v '
        . 'JOIN destinations d ON d.id = v.destination_id '
        . 'WHERE v.id = :id AND v.published = 1';

    $statement = $pdo->prepare($sql);
    $statement->bindValue(':id', $id, PDO::PARAM_INT);
    $statement->execute();
    $row = $statement->fetch();
    return $row === false ? null : formatVoyage($row);
}
