<?php
declare(strict_types=1);

/**
 * Authentification PHP en session (PHP 8.1+). Tout rôle est vérifié côté serveur.
 * Le proxy Vite /api -> PHP évite le CORS et permet des cookies de même origine.
 */
function startAuthSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_trans_sid', '0');
    session_name('amjd_session');

    // Local: HTTP => secure=false. Déploiement: HTTPS obligatoire => secure=true.
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
    header('Cache-Control: no-store');
}

function csrfToken(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return (string) $_SESSION['csrf_token'];
}

function checkCsrf(): void
{
    $given = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($given) || !hash_equals(csrfToken(), $given)) {
        reply(403, ['success' => false, 'error' => 'Jeton de sécurité invalide. Actualisez la page.']);
    }
}

/** @return array<string, mixed> */
function parseJsonInput(): array
{
    $contentType = (string) ($_SERVER['CONTENT_TYPE'] ?? '');
    if (stripos($contentType, 'application/json') !== 0) {
        reply(415, ['success' => false, 'error' => 'Le contenu doit être du JSON.']);
    }
    $length = filter_var($_SERVER['CONTENT_LENGTH'] ?? 0, FILTER_VALIDATE_INT);
    if ($length !== false && $length > 4096) {
        reply(413, ['success' => false, 'error' => 'Données trop volumineuses.']);
    }
    $body = file_get_contents('php://input', false, null, 0, 4097);
    if ($body === false || strlen($body) > 4096) {
        reply(413, ['success' => false, 'error' => 'Données trop volumineuses.']);
    }
    try {
        $data = json_decode($body, true, 16, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        reply(400, ['success' => false, 'error' => 'JSON invalide.']);
    }
    if (!is_array($data) || array_is_list($data)) {
        reply(400, ['success' => false, 'error' => 'Objet JSON attendu.']);
    }
    return $data;
}

/** @return array<string, mixed>|null */
function currentUser(PDO $pdo): ?array
{
    $userId = $_SESSION['user_id'] ?? null;
    if (!is_int($userId) || $userId < 1) {
        return null;
    }
    $query = $pdo->prepare('SELECT id, name, email, role, created_at FROM users WHERE id = :id LIMIT 1');
    $query->execute([':id' => $userId]);
    $row = $query->fetch();
    if ($row === false) {
        unset($_SESSION['user_id']);
        return null;
    }
    $row['id'] = (int) $row['id'];
    return $row;
}

/** @return array<string, mixed> */
function requireUser(PDO $pdo): array
{
    $user = currentUser($pdo);
    if ($user === null) {
        reply(401, ['success' => false, 'error' => 'Connexion requise.']);
    }
    return $user;
}

/** @return array<string, mixed> */
function requireAdmin(PDO $pdo): array
{
    $user = requireUser($pdo);
    if ($user['role'] !== 'admin') {
        reply(403, ['success' => false, 'error' => 'Accès réservé aux administrateurs.']);
    }
    return $user;
}

function validateEmailAndPassword(array $data): array
{
    $email = $data['email'] ?? null;
    $password = $data['password'] ?? null;
    if (!is_string($email) || !is_string($password)) {
        reply(422, ['success' => false, 'error' => 'Email et mot de passe requis.']);
    }
    $email = strtolower(trim($email));
    if (strlen($email) > 190 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        reply(422, ['success' => false, 'error' => 'Adresse email invalide.']);
    }
    if ($password === '' || strlen($password) > 72) {
        reply(422, ['success' => false, 'error' => 'Mot de passe invalide (72 octets maximum).']);
    }
    return [$email, $password];
}

/** @return array<string, mixed> */
function registerUser(PDO $pdo, array $data): array
{
    [$email, $password] = validateEmailAndPassword($data);
    $name = $data['name'] ?? null;
    if (!is_string($name)) {
        reply(422, ['success' => false, 'error' => 'Nom requis.']);
    }
    $name = trim($name);
    if (!preg_match('/^.{2,100}$/us', $name)) {
        reply(422, ['success' => false, 'error' => 'Le nom doit contenir de 2 à 100 caractères.']);
    }
    // PHP 8.1 / bcrypt: 72 octets max (pas 72 caractères).
    if (strlen($password) < 12 || strlen($password) > 72) {
        reply(422, ['success' => false, 'error' => 'Mot de passe : entre 12 et 72 octets.']);
    }
    $hash = password_hash($password, PASSWORD_DEFAULT);
    try {
        $statement = $pdo->prepare(
            'INSERT INTO users (name, email, password_hash, role) VALUES (:name, :email, :hash, :role)'
        );
        $statement->execute([':name' => $name, ':email' => $email, ':hash' => $hash, ':role' => 'client']);
    } catch (PDOException $error) {
        if ($error->getCode() === '23000') {
            reply(409, ['success' => false, 'error' => 'Cet email est déjà utilisé.']);
        }
        throw $error;
    }
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $pdo->lastInsertId();
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    return requireUser($pdo);
}

/** @return array<string, mixed> */
function loginUser(PDO $pdo, array $data): array
{
    [$email, $password] = validateEmailAndPassword($data);

    // Limitation simple par session de démonstration, PAS un rate limiter de production.
    $now = time();
    if ($now > (int) ($_SESSION['login_window'] ?? 0) + 600) {
        $_SESSION['login_window'] = $now;
        $_SESSION['login_failures'] = 0;
    }
    if ((int) ($_SESSION['login_failures'] ?? 0) >= 6) {
        reply(429, ['success' => false, 'error' => 'Trop de tentatives. Réessayez dans dix minutes.']);
    }

    $statement = $pdo->prepare('SELECT id, password_hash FROM users WHERE email = :email LIMIT 1');
    $statement->execute([':email' => $email]);
    $account = $statement->fetch();
    if ($account === false || !password_verify($password, (string) $account['password_hash'])) {
        $_SESSION['login_failures'] = (int) ($_SESSION['login_failures'] ?? 0) + 1;
        reply(401, ['success' => false, 'error' => 'Email ou mot de passe incorrect.']);
    }

    if (password_needs_rehash((string) $account['password_hash'], PASSWORD_DEFAULT)) {
        $update = $pdo->prepare('UPDATE users SET password_hash = :hash WHERE id = :id');
        $update->execute([':hash' => password_hash($password, PASSWORD_DEFAULT), ':id' => $account['id']]);
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $account['id'];
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    unset($_SESSION['login_window'], $_SESSION['login_failures']);
    return requireUser($pdo);
}

function logoutUser(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 3600,
            'path' => $params['path'],
            'secure' => $params['secure'],
            'httponly' => $params['httponly'],
            'samesite' => $params['samesite'] ?? 'Lax',
        ]);
    }
    session_destroy();
}

/** @return array<string, int> */
function adminStats(PDO $pdo): array
{
    return [
        'users' => (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn(),
        'voyages' => (int) $pdo->query('SELECT COUNT(*) FROM voyages')->fetchColumn(),
        'destinations' => (int) $pdo->query('SELECT COUNT(*) FROM destinations')->fetchColumn(),
    ];
}
