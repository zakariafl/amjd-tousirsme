<?php
declare(strict_types=1);

/**
 * Étape 5 : toutes les mutations de places sont faites dans des transactions.
 * Toutes les vues utilisateur sont limitées à son propre user_id.
 */
function reservationColumns(): string
{
    return 'r.id, r.reference, r.user_id, r.departure_id, r.people, '
        . 'r.unit_price_eur, r.total_price_eur, r.status, r.created_at, r.cancelled_at, '
        . 'd.departure_date, d.seats_available, '
        . 'v.title, v.id AS voyage_id, dest.city, dest.country';
}

function reservationJoins(): string
{
    return ' FROM reservations r '
        . 'JOIN departures d ON d.id = r.departure_id '
        . 'JOIN voyages v ON v.id = d.voyage_id '
        . 'JOIN destinations dest ON dest.id = v.destination_id ';
}

/** @return array<string, mixed> */
function serializeReservation(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'reference' => (string) $row['reference'],
        'user_id' => (int) $row['user_id'],
        'voyage_id' => (int) $row['voyage_id'],
        'voyage' => (string) $row['title'],
        'destination' => (string) $row['city'] . ', ' . (string) $row['country'],
        'departure_id' => (int) $row['departure_id'],
        'date_depart' => (string) $row['departure_date'],
        'personnes' => (int) $row['people'],
        'prix_unitaire' => (float) $row['unit_price_eur'],
        'total' => (float) $row['total_price_eur'],
        'statut' => (string) $row['status'],
        'date_creation' => (string) $row['created_at'],
        'date_annulation' => $row['cancelled_at'],
    ];
}

/** @return array<string, mixed>|null */
function reservationById(PDO $pdo, int $reservationId, ?int $userId = null): ?array
{
    $sql = 'SELECT ' . reservationColumns() . reservationJoins() . 'WHERE r.id = :id';
    if ($userId !== null) {
        $sql .= ' AND r.user_id = :uid';
    }
    $statement = $pdo->prepare($sql . ' LIMIT 1');
    $statement->bindValue(':id', $reservationId, PDO::PARAM_INT);
    if ($userId !== null) {
        $statement->bindValue(':uid', $userId, PDO::PARAM_INT);
    }
    $statement->execute();
    $row = $statement->fetch();
    return $row === false ? null : serializeReservation($row);
}

/** @return array<int, array<string, mixed>> */
function listDepartures(PDO $pdo, int $voyageId): array
{
    $statement = $pdo->prepare('SELECT d.id, d.departure_date, d.capacity, d.seats_available '
        . 'FROM departures d JOIN voyages v ON v.id = d.voyage_id '
        . "WHERE d.voyage_id = :id AND v.published = 1 AND d.status = 'open' "
        . 'AND d.departure_date > CURDATE() ORDER BY d.departure_date ASC LIMIT 24');
    $statement->execute([':id' => $voyageId]);
    return array_map(static fn (array $row): array => [
        'id' => (int) $row['id'],
        'date' => (string) $row['departure_date'],
        'capacite' => (int) $row['capacity'],
        'disponibles' => (int) $row['seats_available'],
    ], $statement->fetchAll());
}

/** @return array<int, array<string, mixed>> */
function listMyReservations(PDO $pdo, int $userId): array
{
    $statement = $pdo->prepare('SELECT ' . reservationColumns() . reservationJoins()
        . 'WHERE r.user_id = :uid ORDER BY r.created_at DESC, r.id DESC LIMIT 100');
    $statement->execute([':uid' => $userId]);
    return array_map('serializeReservation', $statement->fetchAll());
}

/** @return array<string, mixed>|null */
function reservationByKey(PDO $pdo, int $userId, string $key): ?array
{
    $statement = $pdo->prepare('SELECT r.id FROM reservations r WHERE r.user_id = :uid AND r.request_key = :request_key LIMIT 1');
    $statement->execute([':uid' => $userId, ':request_key' => $key]);
    $id = $statement->fetchColumn();
    return $id === false ? null : reservationById($pdo, (int) $id, $userId);
}

/** @return array<string, mixed> */
function createReservation(PDO $pdo, int $userId, array $input): array
{
    // JSON doit contenir des entiers : ne pas accepter true, 1.5 ou une chaîne arbitraire.
    $departureId = $input['departure_id'] ?? null;
    $people = $input['people'] ?? null;
    $key = $input['request_key'] ?? null;
    if (!is_int($departureId) || $departureId < 1 || !is_int($people)
        || $people < 1 || $people > 6 || !is_string($key)
        || !preg_match('/^[A-Za-z0-9-]{12,64}$/D', $key)) {
        reply(422, ['success' => false, 'error' => 'Départ, participants ou identifiant de demande invalide.']);
    }

    // Une nouvelle tentative réseau avec la même clé ne crée pas de doublon.
    $existing = reservationByKey($pdo, $userId, $key);
    if ($existing !== null) {
        if ($existing['departure_id'] !== $departureId || $existing['personnes'] !== $people) {
            reply(409, ['success' => false, 'error' => 'Cet identifiant de demande est déjà utilisé.']);
        }
        return $existing;
    }

    $pdo->beginTransaction();
    try {
        // Verrouiller le départ AVANT de décompter les places pour éviter la survente.
        $statement = $pdo->prepare('SELECT d.id, d.departure_date, d.seats_available, d.status, '
            . 'v.published, v.price_eur FROM departures d '
            . 'JOIN voyages v ON v.id = d.voyage_id WHERE d.id = :id FOR UPDATE');
        $statement->execute([':id' => $departureId]);
        $departure = $statement->fetch();
        if (!$departure || $departure['status'] !== 'open' || (int) $departure['published'] !== 1
            || $departure['departure_date'] <= date('Y-m-d') || (int) $departure['seats_available'] < $people) {
            $pdo->rollBack();
            reply(409, ['success' => false, 'error' => 'Ce départ n’est plus disponible pour ce nombre de personnes.']);
        }

        $stock = $pdo->prepare('UPDATE departures SET seats_available = seats_available - :people '
            . "WHERE id = :id AND status = 'open' AND seats_available >= :people_check");
        $stock->execute([':people' => $people, ':id' => $departureId, ':people_check' => $people]);
        if ($stock->rowCount() !== 1) {
            throw new RuntimeException('Stock modifié durant la réservation.');
        }

        // Les montants proviennent exclusivement du serveur et sont enregistrés au moment de la réservation.
        $priceCents = (int) round(((float) $departure['price_eur']) * 100);
        $unitPrice = number_format($priceCents / 100, 2, '.', '');
        $totalPrice = number_format(($priceCents * $people) / 100, 2, '.', '');
        $reference = 'AMJD-' . strtoupper(bin2hex(random_bytes(8)));
        $insert = $pdo->prepare('INSERT INTO reservations '
            . '(reference, user_id, departure_id, people, unit_price_eur, total_price_eur, status, request_key) '
            . "VALUES (:ref, :uid, :did, :people, :unit, :total, 'pending', :request_key)");
        $insert->execute([
            ':ref' => $reference, ':uid' => $userId, ':did' => $departureId, ':people' => $people,
            ':unit' => $unitPrice, ':total' => $totalPrice, ':request_key' => $key,
        ]);
        $reservationId = (int) $pdo->lastInsertId();
        $pdo->commit();
        return reservationById($pdo, $reservationId, $userId);
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if ($error instanceof PDOException && $error->getCode() === '23000') {
            $existing = reservationByKey($pdo, $userId, $key);
            if ($existing !== null && $existing['departure_id'] === $departureId && $existing['personnes'] === $people) {
                return $existing;
            }
        }
        throw $error;
    }
}

/** @return array<string, mixed> */
function cancelReservation(PDO $pdo, int $userId, int $reservationId): array
{
    // Lire l'identifiant du départ sans verrou pour respecter l'ordre de verrouillage global :
    // 1. départ, 2. réservation (pour éviter les interblocages avec la création).
    $query = $pdo->prepare('SELECT departure_id FROM reservations WHERE id = :id AND user_id = :uid');
    $query->execute([':id' => $reservationId, ':uid' => $userId]);
    $departureId = $query->fetchColumn();
    if ($departureId === false) {
        reply(404, ['success' => false, 'error' => 'Réservation introuvable.']);
    }

    $pdo->beginTransaction();
    try {
        $lock = $pdo->prepare('SELECT id FROM departures WHERE id = :id FOR UPDATE');
        $lock->execute([':id' => (int) $departureId]);
        if ($lock->fetch() === false) {
            throw new RuntimeException('Départ introuvable.');
        }
        $lockBooking = $pdo->prepare('SELECT r.people, r.status, d.departure_date FROM reservations r '
            . 'JOIN departures d ON d.id = r.departure_id WHERE r.id = :id AND r.user_id = :uid FOR UPDATE');
        $lockBooking->execute([':id' => $reservationId, ':uid' => $userId]);
        $booking = $lockBooking->fetch();
        if ($booking === false) {
            $pdo->rollBack();
            reply(404, ['success' => false, 'error' => 'Réservation introuvable.']);
        }
        if ($booking['status'] === 'cancelled') {
            $pdo->rollBack();
            reply(409, ['success' => false, 'error' => 'Réservation déjà annulée.']);
        }
        if ($booking['departure_date'] <= date('Y-m-d')) {
            $pdo->rollBack();
            reply(409, ['success' => false, 'error' => 'Annulation impossible après la date de départ.']);
        }
        $update = $pdo->prepare("UPDATE reservations SET status = 'cancelled', cancelled_at = NOW() WHERE id = :id");
        $update->execute([':id' => $reservationId]);
        $restore = $pdo->prepare('UPDATE departures SET seats_available = seats_available + :people '
            . 'WHERE id = :id AND seats_available + :people_check <= capacity');
        $restore->execute([':people' => (int) $booking['people'], ':people_check' => (int) $booking['people'], ':id' => (int) $departureId]);
        if ($restore->rowCount() !== 1) {
            throw new RuntimeException('Stock incohérent lors de l’annulation.');
        }
        $pdo->commit();
        return reservationById($pdo, $reservationId, $userId);
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
}

/** @return array<int, array<string, mixed>> */
function listAdminReservations(PDO $pdo): array
{
    $sql = 'SELECT ' . reservationColumns() . ', u.name AS customer_name, u.email AS customer_email '
        . reservationJoins() . 'JOIN users u ON u.id = r.user_id '
        . 'ORDER BY r.created_at DESC, r.id DESC LIMIT 100';
    $rows = $pdo->query($sql)->fetchAll();
    return array_map(static function (array $row): array {
        $result = serializeReservation($row);
        $result['client_nom'] = (string) $row['customer_name'];
        $result['client_email'] = (string) $row['customer_email'];
        return $result;
    }, $rows);
}

/** @return array<string, mixed> */
function confirmAdminReservation(PDO $pdo, int $id): array
{
    $pdo->beginTransaction();
    try {
        $select = $pdo->prepare('SELECT status, departure_id FROM reservations WHERE id = :id FOR UPDATE');
        $select->execute([':id' => $id]);
        $booking = $select->fetch();
        if ($booking === false) {
            $pdo->rollBack();
            reply(404, ['success' => false, 'error' => 'Réservation introuvable.']);
        }
        $departure = $pdo->prepare('SELECT departure_date FROM departures WHERE id = :id');
        $departure->execute([':id' => $booking['departure_id']]);
        $date = $departure->fetchColumn();
        if ($booking['status'] !== 'pending' || $date === false || $date <= date('Y-m-d')) {
            $pdo->rollBack();
            reply(409, ['success' => false, 'error' => 'Seules les demandes en attente avant départ peuvent être confirmées.']);
        }
        $update = $pdo->prepare("UPDATE reservations SET status = 'confirmed' WHERE id = :id");
        $update->execute([':id' => $id]);
        $pdo->commit();
        return reservationById($pdo, $id);
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
}
