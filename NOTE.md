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