# change the X_POWERD_BY in both side next 
and express and we will add in the next poweredByHeader: false to avoid the fingerprint

# there is to lint diffrent 
api use oxlint
web use eslint 
and we need one global lint standard but i'am gonna decied when we use CI 
# test decision
maybe we will use jest insted of vitest
# delete
vercel.svg
next.svg
page.tsx

# for the pagination issue we will see it later 
if we send 10000 transaction or whatever in one shot we will have one created date and for stable pagination we will note stand only 
for this info we should think for other method

# where i could to add the email lowercase
maybe i'am thinking to add it in validation middlware to make every email with lowercase format !!

# using export module 
we use prisma module for only the module will read and write from the database 

# every request rejected 
mybe could be fully the logs when an attack could be happen mybe we will think to use rate limiting to prevent this kind of this attack 

# i' notice a suspisous incident
if the user try a route that not found the nestjs will generate a not found message without turning on the guard and for this we could the attacker know the route by trying to manupuliate guard and nestjs so for the solution i'am thinking alawys turning on the guard even the route not found we should'nt let's the work to nest js 
and also not overengneri thing thres is no problemme becauze our route not a secret and even this attacker know this route they could'nt use it if they don't have the right token 
so the descion we know "the route enumeration "

# keyset pagination and OFFset
offset when the data grow up will enhance the latency and keyset don't do that 
if the data change in offset we will face the problemme of duplication and miss some row so the best thing to do is the keyset pagination and in the keyset the postgres use the index in offset we will pass the whole data to found what we look in at 
# and to store data we will use creatMany()
i'know that postgres have COPY option but it's more complex and we don't need it rigth know
# and also there is some safety we should add a security guard inside this script
1. we wanna use the seed script only in. dev env so we shoud check first this things shoul'nt execute in pro env
2. even we are in dev env we should check that we are useing the right db_dev url and not the stg or prod DB
3. we should use turncat instead of DELETE because DELETE take a time but Turncate delete the whole data in oneshot and this what we need to do because when we try to run this script we should DELETE and CREATE not CREATE and CREATE
# quick reminder the postgreas use a statistics when decided to use index or do a full table scan and how expected number of rows to return 
the postgres use a process in the background name autovacuum this process is the responsible to update this statistics every time that we add a new data and this things happen later not directly so some latency is expected and we should take that in consideration i'am talking about EXPLAIN and postgres EXECUTION PLAN 
1 to solve this issue in the last of our script we should add ANALYSE and of course you will ask why we are use this 
the reason is pg read a small amount of the data that we add into the table and recalculate the statistics and update the information that the query planner use 
all this thing i'try to mention as reminder to not ask yourself why the index doasn't work of course this things won't work because it's base into the old statistcs !!!

# i'know that data will be random but we need a known data 
admin@<tenant-slug>.test
agent1@<tenant-slug>.test
viewer@<tenant-slug>.test
and every tenants use this format in dev and test

# notice should take in consideration 
i'saw that the requester depend on the user and we have only agent admin and viewer so my question where this requester  came from my be we should add another role "customer" but we should not take some fake assumption my be the requester in the same org my be the reviewer will be the real requester i'don't know !!! let's make that an open question "should the requester will be the viewer or indepndent role like customer"
# we decide to use vitest against jest because the vitest is now compatible with ESM but the jest still in expirment duration that mean not stable 

# Global rules
- Unknown parameter (?stauts=open) ==> 400
- Repeated parameter (?limit=1&limit=2) ==> 400, for every parameter
- Error format ==> 400, code VALIDATION_FAILED, details: { field, reason }

## Per Parameter

| Param | Accepted | Normalized to | Absent | Rejected (400) |
|-------|----------|---------------|--------|----------------|
| `status` | CSV of `open`, `pending`, `solved`, `closed` | **Deduplicated and ordered by enum**. Example: `pending,open,open` → `['open', 'pending']` | `['open', 'pending']` (default) | `status=` (empty), `open,,pending`, `Open`, `opne` |
| `priority` | CSV of `low`, `normal`, `high`, `urgent` | Deduplicated and ordered by enum | `null` (no filter) | Same validation rules as `status` |
| `assignee` | `me`, `unassigned`, or a valid UUID | Tagged object (`{ kind: 'me' }`, `{ kind: 'unassigned' }`, or `{ kind: 'user', userId }`); UUID normalized to lowercase | `null` (any assignee) | `ME`, `nobody`, `123`, malformed UUIDs |
| `sort` | `-createdAt`, `createdAt`, `-updatedAt` | Internal sort key (e.g. `'createdAt_desc'`) | `'createdAt_desc'` | Any other value, including `-createdat` |
| `limit` | Integer between **1–100**, digits only | `number` | `25` | `0`, `101`, `abc`, `1.5`, `10abc`, `+10`, ` 10`, `1e1`, `''` |
| `cursor` | Base64URL string, maximum **512 characters** | Same string (decoded later in **Step 4**) | `null` | Invalid characters or length greater than 512 |

# did viewer could use me option 
# if some use use assigne_id have an UUID for other org should we return an empthy list 