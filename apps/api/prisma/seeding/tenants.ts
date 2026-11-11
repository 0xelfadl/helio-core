export interface TenantSpec {
    slug: string;
    name: string;
    tickets: number;
    agents: number;
    requesters: number;
}

/** order matters */
export const TENANTS: readonly TenantSpec[] = [
  { slug: 'acme',      name: 'Acme Support', tickets: 200_000, agents: 60, requesters: 2_000 },
  { slug: 'bluebird',  name: 'Bluebird',     tickets:  50_000, agents: 25, requesters:   800 },
  { slug: 'cedar',     name: 'Cedar Labs',   tickets:  20_000, agents: 12, requesters:   400 },
  { slug: 'delta',     name: 'Delta Freight',tickets:  10_000, agents:  8, requesters:   200 },
  { slug: 'evergreen', name: 'Evergreen',    tickets:   5_000, agents:  5, requesters:   120 },
  { slug: 'fjord',     name: 'Fjord',        tickets:   5_000, agents:  5, requesters:   120 },
  { slug: 'granite',   name: 'Granite',      tickets:   2_000, agents:  3, requesters:    60 },
  { slug: 'harbor',    name: 'Harbor',       tickets:   2_000, agents:  3, requesters:    60 },
  { slug: 'ion',       name: 'Ion',          tickets:   1_000, agents:  2, requesters:    40 },
  { slug: 'juniper',   name: 'Juniper',      tickets:   1_000, agents:  2, requesters:    40 },
  { slug: 'kite',      name: 'Kite',         tickets:     500, agents:  2, requesters:    20 },
  { slug: 'lumen',     name: 'Lumen',        tickets:     100, agents:  1, requesters:    10 },
  { slug: 'empty',     name: 'Empty Co',     tickets:       0, agents:  1, requesters:     1 },
];