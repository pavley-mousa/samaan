# Storefront — Authentication milestone

Arabic RTL storefront shell with registration, email verification, login/logout, account screen, and an admin-only dashboard button. All pages other than registration/login/email verification redirect unauthenticated users to `/login`.

The home page currently contains illustrative product cards only. Product editing, orders, inventory, tailoring, and wholesale flows are not implemented in this authentication milestone; dashboard modules are intentionally marked as coming next.

Set `NEXT_PUBLIC_API_URL=http://localhost:4000/api` in the environment if the API is not running on that default URL.
