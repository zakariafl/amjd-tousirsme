<?php
declare(strict_types=1);

// Utilisable UNIQUEMENT en CLI, hors de public/. Ne jamais exposer sur le Web.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/config/database.php';

$email = strtolower(trim((string) ($argv[1] ?? '')));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "Usage: php tools/promote_admin.php email@example.com\n");
    exit(1);
}

try {
    $sql = "UPDATE users SET role = 'admin' WHERE email = :email AND role = 'client'";
    $statement = database()->prepare($sql);
    $statement->execute([':email' => $email]);
    if ($statement->rowCount() === 1) {
        echo "Le compte existant {$email} est maintenant administrateur.\n";
    } else {
        echo "Aucun compte client correspondant (ou compte déjà administrateur).\n";
    }
} catch (Throwable $exception) {
    fwrite(STDERR, "Échec : vérifiez MySQL et .env\n");
    exit(1);
}
