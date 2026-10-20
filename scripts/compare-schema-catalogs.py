#!/usr/bin/env python3
"""Compare private JSON captures from supabase/tests/schema_catalog.sql."""
import json
import sys

REPLAY_VERSIONS = {'0035', '0135', '0245', '20261004000000'}


def normalize(value, key=''):
    if isinstance(value, dict):
        return {k: normalize(v, k) for k, v in sorted(value.items())
                if k != 'table_catalog'}
    if key == 'acl' and isinstance(value, str):
        return sorted(value.strip('{}').split(','))
    if key == 'default' and value == 'extensions.uuid_generate_v4()':
        return 'uuid_generate_v4()'
    if isinstance(value, list):
        values = [normalize(v) for v in value]
        if key == 'default_acl':
            # Platform-admin creation defaults are managed configuration. A
            # schema-level owner-only supplement adds no effective privilege.
            values = [v for v in values if v['owner'] != 'supabase_admin'
                      and not (v['schema'] is not None and all(
                          entry.split('=', 1)[0] == v['owner'] for entry in v['acl']))]
        if key == 'versions':
            values = [v for v in values if v not in REPLAY_VERSIONS]
        # Enum declaration order is meaningful; catalog row/column order is not.
        return values if key == 'values' else sorted(values, key=lambda v: json.dumps(v, sort_keys=True))
    return value


def main():
    if len(sys.argv) != 3:
        raise SystemExit('Usage: compare-schema-catalogs.py fresh.json upgrade.json')
    with open(sys.argv[1]) as source:
        fresh = normalize(json.load(source))
    with open(sys.argv[2]) as source:
        upgrade = normalize(json.load(source))
    # Hosted extensions are platform configuration, checked separately by advisors.
    excluded = {'extensions'}
    different = [key for key in fresh.keys() | upgrade.keys()
                 if key not in excluded and fresh.get(key) != upgrade.get(key)]
    print(json.dumps({'equal': not different, 'different_sections': sorted(different),
                      'excluded_sections': sorted(excluded),
                      'normalized_fields': ['table_catalog', 'catalog row and column order',
                                            'ACL order', 'extensions.uuid_generate_v4 qualification',
                                            'redundant schema owner default privileges'],
                      'managed_defaults_checked_separately': ['supabase_admin'],
                      'excluded_replay_versions': sorted(REPLAY_VERSIONS)}))
    return bool(different)


if __name__ == '__main__':
    raise SystemExit(main())
