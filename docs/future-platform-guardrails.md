# Future Platform Guardrails

LaCucina starts as a private personal cookbook. Public platform features stay out of the MVP unless a later decision explicitly changes that scope.

## Resolved MVP Boundaries

- Product direction: private personal cookbook.
- Public publishing: not in MVP.
- Sharing: text export or native share sheet only if sharing is needed.
- Recipe media: one local photo per recipe is allowed in MVP.
- Calories and macros: out of MVP.
- Freak Mode: future concept only.
- Accounts: no account; local owner only.
- Storage: local-only device/browser storage.

## Publishing

The MVP must not include public recipe publishing, public cookbook pages, creator profiles, followers, social feeds, public search, marketplace discovery, or subscriptions.

Any future publishing gap must define:

- which recipes are private, link-shared, or public;
- what author ownership means for a recipe;
- how copied or adapted recipes are represented;
- how users remove published content;
- what failure state appears when publishing is unavailable.

## Ownership and Copyright

Ownership and copyright rules are deferred until public publishing is actively selected. Until then, LaCucina treats recipes as private user-managed content stored locally.

Before public content exists, the project needs a new decision or gap covering at least:

- user attestation for recipes they publish;
- handling copied, adapted, or third-party recipes;
- takedown or report expectations;
- whether cookbook exports include attribution fields.

## Moderation

No moderation tooling is required while there are no public surfaces. A future public platform must define moderation before launch, including report intake, admin review, content removal, and user appeal expectations.

## Media

MVP media is limited to one local photo per recipe. Do not add cloud upload, galleries, short video, camera capture, public media pages, or feed-ready media processing in the MVP.

If the implementation target requires browser or platform permission prompts for photo selection, the user benefit and denied-permission behavior must be documented before implementation.

## Monetization and Marketplace

Subscriptions, paid cookbook access, marketplace listings, payment flows, creator analytics, and revenue reporting are future concepts only. They require separate product decisions, account/auth scope, backend scope, privacy review, and release planning.
