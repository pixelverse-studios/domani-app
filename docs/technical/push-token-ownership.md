# Device push token ownership

Current clients use `claim_current_user_push_token(expected_user_id, push_token)` and `unclaim_current_user_push_token(expected_user_id, push_token)` rather than directly updating profile token columns. Both RPCs require an authenticated caller whose UUID matches the captured expected account. They validate Expo token shape and length, expose no cross-account reads, and never log token values.

A claim takes a transaction advisory lock for the token and locks affected profiles in UUID order. It clears every previous owner of that token and sets the current profile's token/invalid flag in the same transaction. An unclaim clears only the matching token on the expected account, so a delayed signout cannot clear the token after it has transferred to another account or another installation replaced it. Ordinary profile ownership policies remain in place; the definer RPC has narrowly scoped authority to clear previous owners as part of the transfer.

The notification observer captures the account before native token lookup, retains that UUID across retries, and re-registers on account changes and same-account sign-in after signout. The backend rejects an account switch during native lookup or an in-flight request. Permission-grant registration uses the same path. Signout attempts to unclaim the current device before ending the session and checks the persisted account again after cleanup so an older operation cannot sign out a replacement account.

This app currently stores one token per account profile. Signing in on another device replaces that account's previous token. Multiple-device delivery would require a separate model and is outside this change.

During the compatibility phase, released clients retain their existing direct token writes and can bypass the new RPC's transfer serialization. The prepared final profile-column revocation removes that legacy write authority. The new client works with those token column grants revoked; do not add them back to the preference allowlist. Legacy-client impact remains part of the adoption/support gate.

Native token retrieval or server cleanup can fail offline. Local signout remains available; immediate server-side token revocation cannot be guaranteed without a successful network call. A subsequent successful claim on the device transfers ownership atomically. Device QA must cover offline signout, same-account sign-in, account switching, reinstall, and a stale in-flight registration before rollout; do not interpret SQL ownership tests as proof of notification-provider delivery behavior.

`supabase/tests/dev_1422_push_token_ownership_test.sh` runs isolated SQL role, ownership-transfer, stale-operation, final-column-grant, and concurrent-claim checks. Focused Jest tests cover captured identity during native lookup, retry identity, auth-change re-registration, signout cleanup, and replacement-account isolation.
