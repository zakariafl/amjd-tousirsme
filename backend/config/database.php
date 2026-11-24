<?php
declare(strict_types=1);

/**
 * Local XAMPP: backend/.env. Docker: DB_* environment variables take precedence.
 * Credentials are never hardcoded in PHP or committed to Git.
 */
function envConfig(): array
{
    $path = dirname(__DIR__) . '/.env';
    $config = [];
    if (is_file($path)) {
        $parsed = parse_ini_file($path, false, INI_SCANNER_RAW);
        if ($parsed === false) {
            throw new RuntimeException('Impossible de lire backend/.env.');
        }
        $config = $parsed;
    }
    $keys = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    foreach ($keys as $key) {
        $fromEnv = getenv($key);
        if ($fromEnv !== false) {
            $config[$key] = $fromEnv;
        }
        if (!array_key_exists($key, $config)) {
            throw new RuntimeException('Configuration manquante : ' . $key . '. Utilisez backend/.env ou DB_*');
        }
    }
    return $config;
}

function database(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $config = envConfig();
    $host = (string) $config['DB_HOST'];
    $port = (string) $config['DB_PORT'];
    $name = (string) $config['DB_NAME'];
    $user = (string) $config['DB_USER'];
    $password = (string) $config['DB_PASSWORD'];
    if (!ctype_digit($port)) {
        throw new RuntimeException('DB_PORT invalide.');
    }
    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name);
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}
