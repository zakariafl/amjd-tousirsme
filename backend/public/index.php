<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/src/VoyageRepository.php';
require_once dirname(__DIR__) . '/src/Auth.php';
require_once dirname(__DIR__) . '/src/ReservationRepository.php';
require_once dirname(__DIR__) . '/src/AdminRepository.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function reply(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $path = rtrim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/', '/');
    if ($path === '') {
        $path = '/';
    }

    // Étape 4 : routes d'authentification (avant la restriction GET des voyages).
    $authRoutes = [
        '/api/auth/csrf' => 'GET',
        '/api/auth/me' => 'GET',
        '/api/auth/register' => 'POST',
        '/api/auth/login' => 'POST',
        '/api/auth/logout' => 'POST',
        '/api/admin/stats' => 'GET',
    ];

    if (isset($authRoutes[$path])) {
        $allowed = $authRoutes[$path];
        if ($method !== $allowed) {
            header('Allow: ' . $allowed);
            reply(405, ['success' => false, 'error' => 'Méthode non autorisée']);
        }
        startAuthSession();

        if ($path === '/api/auth/csrf') {
            reply(200, ['success' => true, 'data' => ['csrf_token' => csrfToken()]]);
        }
        if ($path === '/api/auth/me') {
            // Visiteur: 200 avec data=null, plutôt qu'un échec de chargement de la page.
            $account = isset($_SESSION['user_id']) ? currentUser(database()) : null;
            reply(200, ['success' => true, 'data' => $account]);
        }
        if ($path === '/api/admin/stats') {
            if (!isset($_SESSION['user_id'])) {
                reply(401, ['success' => false, 'error' => 'Connexion requise.']);
            }
            requireAdmin(database());
            reply(200, ['success' => true, 'data' => adminStats(database())]);
        }

        checkCsrf();
        $data = $path === '/api/auth/logout' ? [] : parseJsonInput();
        if ($path === '/api/auth/register') {
            $account = registerUser(database(), $data);
            reply(201, ['success' => true, 'data' => $account]);
        }
        if ($path === '/api/auth/login') {
            $account = loginUser(database(), $data);
            reply(200, ['success' => true, 'data' => $account]);
        }
        if ($path === '/api/auth/logout') {
            logoutUser();
            reply(200, ['success' => true, 'data' => ['message' => 'Déconnexion effectuée.']]);
        }
    }

    // Étape 5 : départs disponibles, réservations clients et suivi administrateur.
    if (preg_match('#^/api/voyages/([1-9][0-9]*)/departures$#', $path, $matches)) {
        if ($method !== 'GET') {
            header('Allow: GET');
            reply(405, ['success' => false, 'error' => 'Méthode non autorisée']);
        }
        $voyageId = filter_var($matches[1], FILTER_VALIDATE_INT);
        if ($voyageId === false || findVoyage(database(), $voyageId) === null) {
            reply(404, ['success' => false, 'error' => 'Voyage introuvable.']);
        }
        reply(200, ['success' => true, 'data' => listDepartures(database(), $voyageId)]);
    }

    if ($path === '/api/reservations' || $path === '/api/admin/reservations'
        || preg_match('#^/api/reservations/([1-9][0-9]*)/cancel$#', $path, $cancelMatch)
        || preg_match('#^/api/admin/reservations/([1-9][0-9]*)/confirm$#', $path, $confirmMatch)) {
        $adminRoute = str_starts_with($path, '/api/admin/');
        $allowed = ($path === '/api/reservations' || $path === '/api/admin/reservations') ? 'GET, POST' : 'POST';
        if (!in_array($method, explode(', ', $allowed), true)
            || ($adminRoute && $path === '/api/admin/reservations' && $method !== 'GET')) {
            header('Allow: ' . ($adminRoute && $path === '/api/admin/reservations' ? 'GET' : $allowed));
            reply(405, ['success' => false, 'error' => 'Méthode non autorisée']);
        }
        startAuthSession();
        $user = $adminRoute ? requireAdmin(database()) : requireUser(database());
        if ($method === 'GET' && $path === '/api/reservations') {
            reply(200, ['success' => true, 'data' => listMyReservations(database(), $user['id'])]);
        }
        if ($method === 'GET' && $path === '/api/admin/reservations') {
            reply(200, ['success' => true, 'data' => listAdminReservations(database())]);
        }

        checkCsrf();
        if ($path === '/api/reservations') {
            $reservation = createReservation(database(), $user['id'], parseJsonInput());
            reply(201, ['success' => true, 'data' => $reservation]);
        }
        if (!empty($cancelMatch[1])) {
            $id = filter_var($cancelMatch[1], FILTER_VALIDATE_INT);
            if ($id === false) reply(400, ['success' => false, 'error' => 'Identifiant invalide.']);
            reply(200, ['success' => true, 'data' => cancelReservation(database(), $user['id'], $id)]);
        }
        if (!empty($confirmMatch[1])) {
            $id = filter_var($confirmMatch[1], FILTER_VALIDATE_INT);
            if ($id === false) reply(400, ['success' => false, 'error' => 'Identifiant invalide.']);
            reply(200, ['success' => true, 'data' => confirmAdminReservation(database(), $id)]);
        }
    }

    // Étape 6 : analytics et catalogue administrateur (contrôle du rôle côté serveur).
    if ($path === '/api/admin/dashboard' || $path === '/api/admin/voyages'
        || $path === '/api/admin/destinations'
        || preg_match('#^/api/admin/voyages/([1-9][0-9]*)$#', $path, $tripMatch)
        || preg_match('#^/api/admin/voyages/([1-9][0-9]*)/published$#', $path, $publishMatch)
        || preg_match('#^/api/admin/voyages/([1-9][0-9]*)/departures$#', $path, $departureMatch)) {
        $methods = 'GET';
        if ($path === '/api/admin/voyages' || $path === '/api/admin/destinations') $methods = 'GET, POST';
        if (!empty($tripMatch[1])) $methods = 'PUT';
        if (!empty($publishMatch[1])) $methods = 'PATCH';
        if (!empty($departureMatch[1])) $methods = 'GET, POST';
        if (!in_array($method, explode(', ', $methods), true)) {
            header('Allow: ' . $methods);
            reply(405, ['success' => false, 'error' => 'Méthode non autorisée.']);
        }
        startAuthSession();
        requireAdmin(database());
        if ($method === 'GET') {
            if ($path === '/api/admin/dashboard') reply(200, ['success' => true, 'data' => adminDashboard(database())]);
            if ($path === '/api/admin/voyages') reply(200, ['success' => true, 'data' => adminTrips(database())]);
            if ($path === '/api/admin/destinations') reply(200, ['success' => true, 'data' => adminDestinations(database())]);
            if (!empty($departureMatch[1])) reply(200, ['success' => true, 'data' => adminDepartureList(database(), (int) $departureMatch[1])]);
        }
        checkCsrf();
        $input = parseJsonInput();
        if ($method === 'POST' && $path === '/api/admin/destinations') {
            reply(201, ['success' => true, 'data' => adminAddDestination(database(), $input)]);
        }
        if ($method === 'POST' && $path === '/api/admin/voyages') {
            reply(201, ['success' => true, 'data' => adminSaveTrip(database(), $input)]);
        }
        if ($method === 'PUT' && !empty($tripMatch[1])) {
            reply(200, ['success' => true, 'data' => adminSaveTrip(database(), $input, (int) $tripMatch[1])]);
        }
        if ($method === 'PATCH' && !empty($publishMatch[1])) {
            reply(200, ['success' => true, 'data' => adminSetTripPublished(database(), (int) $publishMatch[1], $input)]);
        }
        if ($method === 'POST' && !empty($departureMatch[1])) {
            reply(201, ['success' => true, 'data' => adminAddDeparture(database(), (int) $departureMatch[1], $input)]);
        }
    }

    if ($method !== 'GET') {
        header('Allow: GET');
        reply(405, ['success' => false, 'error' => 'Méthode non autorisée']);
    }

    if ($path === '/api/health') {
        database()->query('SELECT 1');
        reply(200, ['success' => true, 'data' => ['database' => 'connected']]);
    }

    if ($path === '/api/voyages') {
        $q = trim((string) ($_GET['q'] ?? ''));
        $pays = trim((string) ($_GET['pays'] ?? ''));
        $maxPrice = null;
        $limit = 30;

        if (strlen($q) > 100 || strlen($pays) > 100) {
            reply(400, ['success' => false, 'error' => 'Filtre trop long']);
        }

        if (array_key_exists('max_price', $_GET)) {
            $value = filter_var($_GET['max_price'], FILTER_VALIDATE_FLOAT);
            if ($value === false || $value < 0 || $value > 1000000) {
                reply(400, ['success' => false, 'error' => 'max_price doit être un nombre positif']);
            }
            $maxPrice = $value;
        }

        if (array_key_exists('limit', $_GET)) {
            $value = filter_var($_GET['limit'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 50]]);
            if ($value === false) {
                reply(400, ['success' => false, 'error' => 'limit doit être compris entre 1 et 50']);
            }
            $limit = $value;
        }

        $voyages = findVoyages(database(), [
            'q' => $q,
            'pays' => $pays,
            'max_price' => $maxPrice,
            'limit' => $limit,
        ]);
        reply(200, ['success' => true, 'count' => count($voyages), 'data' => $voyages]);
    }

    if (preg_match('#^/api/voyages/([1-9][0-9]*)$#', $path, $matches)) {
        $id = filter_var($matches[1], FILTER_VALIDATE_INT);
        if ($id === false) {
            reply(400, ['success' => false, 'error' => 'Identifiant invalide']);
        }
        $voyage = findVoyage(database(), $id);
        if ($voyage === null) {
            reply(404, ['success' => false, 'error' => 'Voyage introuvable']);
        }
        reply(200, ['success' => true, 'data' => $voyage]);
    }

    reply(404, ['success' => false, 'error' => 'Route introuvable']);
} catch (Throwable $error) {
    error_log('[AMJD API] ' . $error->getMessage());
    reply(500, ['success' => false, 'error' => 'Erreur serveur : vérifiez la connexion MySQL et le fichier .env']);
}
