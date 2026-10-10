# Roadmap

## Milestone 0 — Requirements and architecture
- [x] Product scope, roles, and domain model documented.
- [x] Architecture and security requirements documented.

## Milestone 1 — Authentication and authorization
- [x] Customer registration with customer-only role assignment.
- [x] Email verification with expiring one-time token (SMTP or development-only token).
- [x] Login/logout with HttpOnly signed session cookie.
- [x] Current user endpoint and role loaded from database.
- [x] Admin-only endpoint and admin-only dashboard link.
- [x] Initial administrator bootstrap script.
- [ ] Forgot/reset password and resending email verification.
- [ ] Automated unit/integration tests and deployment-specific CSRF/origin review.

## Milestone 2 — Catalog
- [ ] Categories, products, variants, images, sizes, colors, SKU, and units.
- [ ] Admin create/update/archive product APIs and UI.
- [ ] Public-to-authenticated catalog browsing, filters, and search.
- [ ] Retail/wholesale price rules enforced by the API.

## Milestone 3 — Inventory and checkout
- [ ] Cart, addresses, checkout, order snapshots, shipping fees.
- [ ] Inventory reservations with database transactions.
- [ ] Admin order management and status history.

## Milestone 4 — Tailoring and wholesale
- [ ] Tailoring request forms, measurements, quote, approval, workflow history.
- [ ] Wholesale request, approval state, and tier pricing.

## Milestone 5 — Production readiness
- [ ] Payment and carrier integration.
- [ ] Audit logs, backups and restore tests, monitoring, security tests.
- [ ] Accessibility, SEO, and performance checks.
