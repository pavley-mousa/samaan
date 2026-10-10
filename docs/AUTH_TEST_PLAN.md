# Authentication acceptance tests

Run these after dependencies are installed and the local PostgreSQL database is available.

1. Register with valid customer data; verify that the new row has `role=CUSTOMER` and `status=PENDING_VERIFICATION`.
2. Confirm the registration DTO rejects extra fields such as `role=ADMIN` because validation uses `forbidNonWhitelisted`.
3. Verify a correct unexpired email token; the user becomes active and receives an HttpOnly `store_session` cookie.
4. Confirm expired, unknown, and reused verification tokens are rejected.
5. Confirm login with a wrong password is rejected, and login before email verification is rejected.
6. Confirm the session cookie is HttpOnly; in production it must also be Secure.
7. Confirm `GET /api/auth/me` returns the current role from the database.
8. Confirm a customer receives 403 from `GET /api/admin/summary`, even if they manually visit `/admin`.
9. Confirm an admin can call `GET /api/admin/summary`; the storefront shows the admin dashboard link on the shared store page.
10. Confirm an invalid browser Origin receives 403 and login/register requests are rate-limited.
11. Confirm a customer cannot become an admin by changing frontend state, request JSON, or local storage.
12. Confirm a suspended account cannot use its old cookie after the next API request.

The current milestone implements these routes and controls but has not been runtime integration-tested in this environment because npm package downloads could not complete. Run the tests against local services before deployment.
