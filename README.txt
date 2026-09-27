Cafe Acorn — Supabase Connected Edition

1) Open supabase-config.js.
2) Keep the existing project URL.
3) Replace only PASTE_YOUR_ANON_OR_PUBLISHABLE_KEY_HERE with the Supabase anon/publishable key.
4) Do NOT use sb_secret or service_role.
5) Open index.html for the customer menu.
6) Open admin.html for the owner panel and sign in with the Supabase Auth user created in the project.

Backend already prepared in the Supabase project:
- categories
- subcategories
- products
- cafe_settings
- admin_users + is_admin()
- product-images storage bucket
- admin write policies

The customer menu is read-only. No cart or online ordering is included.
