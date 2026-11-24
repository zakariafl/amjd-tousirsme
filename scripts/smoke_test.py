#!/usr/bin/env python3
"""API integration test against a DISPOSABLE Docker demo database.
No external Python dependencies. Creates a disposable user and booking.
Usage: python scripts/smoke_test.py [http://127.0.0.1:8000]
"""
import http.cookiejar
import json
import sys
import time
import uuid
from urllib.error import HTTPError, URLError
from urllib.request import HTTPCookieProcessor, Request, build_opener

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8000').rstrip('/')
CLIENT = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))


def api(path, method='GET', payload=None, csrf=None):
    headers = {'Accept': 'application/json'}
    data = None
    if payload is not None:
        headers['Content-Type'] = 'application/json'
        data = json.dumps(payload).encode('utf-8')
    if csrf:
        headers['X-CSRF-Token'] = csrf
    req = Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with CLIENT.open(req, timeout=10) as response:
            return response.status, json.load(response)
    except HTTPError as error:
        return error.code, json.load(error)


def check(condition, message):
    if not condition:
        raise AssertionError(message)
    print('PASS', message)


def wait_for_api():
    for _ in range(45):
        try:
            status, body = api('/api/health')
            if status == 200 and body.get('data', {}).get('database') == 'connected':
                return
        except (URLError, TimeoutError, ValueError):
            pass
        time.sleep(2)
    raise RuntimeError('API unavailable after 90 seconds: ' + BASE)


def main():
    wait_for_api()
    check(True, 'PHP + MySQL health')
    status, body = api('/api/voyages')
    check(status == 200 and len(body.get('data', [])) >= 6, 'catalogue voyages SQL')
    status, body = api('/api/voyages?max_price=-1')
    check(status == 400, 'invalid price rejected')
    status, _ = api('/api/admin/dashboard')
    check(status == 401, 'anonymous admin access refused')
    status, _ = api('/api/reservations')
    check(status == 401, 'anonymous booking access refused')

    status, csrf = api('/api/auth/csrf')
    token = csrf['data']['csrf_token']
    suffix = uuid.uuid4().hex
    status, body = api('/api/auth/register', 'POST', {
        'name': 'Portfolio Demo', 'email': 'amjd-test-' + suffix + '@example.test',
        'password': 'TestPassword!2026'
    }, csrf=token)
    check(status == 201 and body.get('data', {}).get('role') == 'client', 'client registration')
    status, body = api('/api/auth/me')
    check(status == 200 and body.get('data', {}).get('role') == 'client', 'authenticated session')
    status, _ = api('/api/admin/dashboard')
    check(status == 403, 'client admin access refused')

    status, departures = api('/api/voyages/1/departures')
    choices = [d for d in departures.get('data', []) if d.get('disponibles', 0) >= 2]
    check(status == 200 and bool(choices), 'future departures available')
    chosen = choices[0]
    initial = chosen['disponibles']
    status, csrf = api('/api/auth/csrf')
    token = csrf['data']['csrf_token']
    request = {'departure_id': chosen['id'], 'people': 2, 'request_key': uuid.uuid4().hex}
    status, created = api('/api/reservations', 'POST', request, csrf)
    check(status == 201 and created.get('data', {}).get('statut') == 'pending', 'reservation created')
    reservation_id = created['data']['id']

    status, after = api('/api/voyages/1/departures')
    seats = next(d['disponibles'] for d in after['data'] if d['id'] == chosen['id'])
    check(seats == initial - 2, 'inventory decremented transactionally')
    status, same = api('/api/reservations', 'POST', request, csrf)
    check(status == 201 and same['data']['id'] == reservation_id, 'idempotent retry')
    status, bookings = api('/api/reservations')
    check(status == 200 and any(b['id'] == reservation_id for b in bookings['data']), 'own bookings listed')

    status, cancelled = api(f'/api/reservations/{reservation_id}/cancel', 'POST', {}, csrf)
    check(status == 200 and cancelled['data']['statut'] == 'cancelled', 'booking cancellation')
    status, after = api('/api/voyages/1/departures')
    seats = next(d['disponibles'] for d in after['data'] if d['id'] == chosen['id'])
    check(seats == initial, 'inventory restored')
    status, _ = api('/api/auth/logout', 'POST', csrf=token)
    check(status == 200, 'logout')
    status, body = api('/api/auth/me')
    check(status == 200 and body.get('data') is None, 'session destroyed')
    print('\nALL API SMOKE TESTS PASSED')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print('SMOKE TEST FAILED:', exc, file=sys.stderr)
        sys.exit(1)
